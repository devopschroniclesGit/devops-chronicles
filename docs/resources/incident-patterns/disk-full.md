---
title: "Incident: Disk Full"
description: What disk full actually looks like in production, why it happens more than it should, and how to recover without making it worse.
tags: [linux, incident, storage, troubleshooting]
---

# Incident: Disk Full

Disk full is one of the most common production incidents and one of the most predictable. It is almost never a surprise if you are watching the right metrics. This guide covers what it actually looks like when it happens, the recovery steps, and the common traps that turn a simple incident into a longer outage.

## What It Looks Like

The symptoms depend on what hit full first.

**Application errors:**
```
No space left on device
ENOSPC: no space left on device
ERROR: could not write to file: No space left on device
```

**Database won't start / crashes:**
```
FATAL: could not write to file "pg_wal/...": No space left on device
```

**Writes silently fail** — some applications catch `ENOSPC` and fail silently, logging nothing. The symptom is data that should have been written not appearing, or an application returning success but the file not existing.

**SSH still works but shell is broken** — you can log in but commands that write output fail. `vim` won't save. Logs won't write. The system feels corrupted but it is not.

---

## Immediate Diagnosis

Run these in order. Do not start deleting things yet.

**Step 1 — Confirm the problem and identify which filesystem**
```bash
df -h
```
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/xvda1       40G   40G     0 100% /
/dev/xvdf        20G  4.2G  15G  22% /data
tmpfs           1.9G     0  1.9G   0% /dev/shm
```

Note which mount point is full. It is not always `/`. Logs often go to `/var`, databases to `/data` or `/var/lib`.

**Step 2 — Find what is using the space**
```bash
# Top-level breakdown — find the biggest directories
du -sh /* 2>/dev/null | sort -rh | head -20

# Drill into the biggest offender
du -sh /var/* 2>/dev/null | sort -rh | head -10
du -sh /var/log/* 2>/dev/null | sort -rh | head -10
```

**Step 3 — Check for deleted files still held open**

This is the trap that catches most engineers. A process can delete a file but if another process has it open, the disk space is not freed until that process closes or is restarted. The file is gone from the directory listing but the inode is still allocated.

```bash
lsof +L1
```

This lists open file descriptors where the link count is 0 — deleted files still held open. If you see a 10GB log file listed here, restarting the process that holds it will free the space immediately.

```
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NLINK NODE NAME
nginx    1234 root   10w  REG  202,1  10737418    0 12345 /var/log/nginx/access.log (deleted)
```

**Step 4 — Check inode exhaustion**

You can run out of inodes before you run out of disk space. This happens with workloads that create millions of small files (mail queues, PHP session files, build artifacts).

```bash
df -i
```

```
Filesystem      Inodes  IUsed   IFree IUse% Mounted on
/dev/xvda1     2621440 2621440       0  100% /
```

If `IUse%` is 100% but `Use%` is 70%, you have an inode problem, not a capacity problem. Find the directory with millions of files:

```bash
find / -xdev -printf '%h\n' 2>/dev/null | sort | uniq -c | sort -rn | head -20
```

---

## Recovery

**The safe deletions — do these first:**

```bash
# Journal logs (can safely clear old entries)
sudo journalctl --vacuum-time=2d

# Clear old systemd journal
sudo journalctl --vacuum-size=100M

# Package manager cache
sudo apt clean          # Debian/Ubuntu
sudo dnf clean all      # RHEL/Fedora

# Docker — this is often the biggest offender
docker system prune -f                    # removes stopped containers, unused images
docker system prune -af --volumes         # more aggressive — removes everything unused
```

**If the culprit is application logs:**

```bash
# Truncate a log file without stopping the process (safe — preserves the file descriptor)
> /var/log/application/app.log

# Or use truncate
truncate -s 0 /var/log/application/app.log
```

Do NOT `rm` the log file if the application has it open — the space won't be freed and the application may crash when it tries to write. Truncate instead.

**If it is a database write-ahead log (Postgres WAL):**

Do not delete WAL files manually. This will corrupt your database. The correct approach:

```bash
# Connect to postgres and checkpoint to flush WAL
psql -U postgres -c "CHECKPOINT;"

# If replication slots are holding WAL — check for inactive slots
psql -U postgres -c "SELECT slot_name, active, restart_lsn FROM pg_replication_slots;"

# Drop an inactive replication slot that is holding WAL
psql -U postgres -c "SELECT pg_drop_replication_slot('slot_name');"
```

**Restart processes holding deleted files open:**

Once you have identified processes with `lsof +L1`:
```bash
sudo systemctl restart nginx
sudo systemctl restart application-name
```

---

## After Recovery — Extend the Volume

If recovery freed enough space temporarily, fix the root cause properly.

**On AWS — extend EBS volume without downtime:**

```bash
# 1. In AWS console or CLI, modify the volume size
aws ec2 modify-volume --volume-id vol-xxxxxxxx --size 80

# 2. On the instance, grow the partition (check your device name with lsblk)
sudo growpart /dev/xvda 1

# 3. Extend the filesystem (XFS)
sudo xfs_growfs /

# 3. Extend the filesystem (ext4)
sudo resize2fs /dev/xvda1
```

No reboot required on modern kernels (4.x+).

---

## Why This Keeps Happening

Disk full incidents in production usually have one of four root causes:

**1. No log rotation configured**
Application logs grow without bound. `logrotate` is installed on most Linux systems but application logs are often not configured in it.

```bash
# Check what is being rotated
ls /etc/logrotate.d/

# Add your application
cat > /etc/logrotate.d/myapp << EOF
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    sharedscripts
    postrotate
        systemctl reload myapp
    endscript
}
EOF
```

**2. Docker not pruned**
Docker accumulates stopped containers, dangling images, and unused volumes. On a busy build machine this can consume dozens of gigabytes per week. Schedule `docker system prune` as a cron job.

**3. No alerting on disk usage**
By the time a human notices the disk is full, the application has already been failing. Alert at 75% and 85%. At 85% you should be taking action, not waiting for 100%.

**4. tmpfs filling on containerised workloads**
Containers write to `/tmp` which maps to a `tmpfs` mount. Some workloads generate large temporary files that never get cleaned up.

---

## The Monitoring Fix

On CloudWatch:
```bash
# Check disk metrics are being sent (requires CloudWatch agent)
cat /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

Alert thresholds worth setting:
- **75%** — informational, investigate at next opportunity
- **85%** — action required, do not leave for tomorrow
- **95%** — incident, wake someone up
