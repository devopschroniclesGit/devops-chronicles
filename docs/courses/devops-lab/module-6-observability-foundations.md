---
title: Module 6 – Observability Foundations
sidebar_label: Module 6 – Observability Foundations
description: If you cannot see it, you cannot operate it. Build foundational visibility into your lab before introducing monitoring stacks.
tags: [devops-lab, linux, observability, monitoring, intermediate]
sidebar_position: 6
---

# Module 6 – Observability Foundations

## If You Cannot See It, You Cannot Operate It

### Visibility Before Automation

Infrastructure fails quietly before it fails loudly.

CPU spikes. Disk fills. Memory fragments. Services restart. Connections timeout.

If you only notice failure after users complain, you are not operating — you are
reacting. There is a difference between an engineer who detects a problem before
it becomes an incident and one who learns about it from a user report.

Observability is the discipline of seeing system behavior in real time.

This module builds foundational operational awareness using tools that are already
on your system — before introducing Prometheus, Grafana, or any monitoring stack.
You need to understand raw system behavior first. Dashboards without that understanding
are misleading.

## 1. Observability vs Monitoring

These terms are often used interchangeably. They are not the same.

| | Monitoring | Observability |
|---|---|---|
| **Question** | Is the system up? | Why is the system behaving this way? |
| **Nature** | Binary — up or down | Diagnostic — cause and effect |
| **Output** | Alerts | Understanding |
| **Example** | CPU > 80% alarm | Which process is consuming CPU and why |

Monitoring tells you something is wrong. Observability tells you what to do about it.

You begin with system-native tools. No external dependencies. No dashboards. Just
the system telling you what it is doing.

## 2. System Resource Visibility

### CPU Monitoring

```bash title="Terminal"
top     # basic, always available
htop    # more readable, install with: sudo dnf install htop -y
```

What to observe:

- **Load average** (shown as three numbers: 1min, 5min, 15min averages)
- **CPU utilization per core**
- **Which processes consume the most CPU**

:::info Load average rule of thumb
Load average represents how many processes are waiting for CPU time.

- Load = number of CPU cores: system is fully utilised but not stressed
- Load > number of CPU cores: system is under pressure — processes are queuing
- Load > 2× CPU cores: system is stressed — investigate immediately
:::

### Memory Monitoring

```bash title="Terminal"
free -h
```

Example output:

```
              total        used        free      shared  buff/cache   available
Mem:          3.7Gi       1.2Gi       800Mi       124Mi       1.7Gi       2.3Gi
Swap:         2.0Gi        0Ki       2.0Gi
```

Read this as:

- **available** is what matters — not `free`. Available includes reclaimable cache.
- **Swap used > 0** under normal load means you need more RAM or have a memory leak.

### Disk Monitoring

```bash title="Terminal"
df -h
```

Monitor:

- Root filesystem (`/`) — should never exceed 85%
- `/var` — logs grow here; monitor actively
- Any custom logical volumes you created in Module 4

When a filesystem exceeds 85%, an alert should fire. When it exceeds 95%, services
begin to fail. At 100%, the system becomes unstable.

## 3. Log-Based Observability

Logs are your first diagnostic layer. They exist before any monitoring tool is
installed. They tell you what happened, when it happened, and which process was
involved.

```bash title="Terminal"
# Full system journal — all services, all time
sudo journalctl

# Last 100 lines
sudo journalctl -n 100

# Logs for a specific service
sudo journalctl -u nginx
sudo journalctl -u sshd
sudo journalctl -u mariadb

# Follow logs in real time (Ctrl+C to stop)
sudo journalctl -f

# Logs since the last boot
sudo journalctl -b

# Logs from the last hour
sudo journalctl --since "1 hour ago"
```

What to look for:

- `Failed` or `Error` entries under any service
- Repeated restart cycles (`start → fail → restart → fail`)
- SSH authentication failures — sign of brute force or misconfiguration
- Kernel messages about disk errors or hardware issues

If you do not read logs, you do not control the system. You only manage it when
nothing is going wrong.

## 4. Service Health Inspection

Do not wait for service crashes — check health proactively.

```bash title="Terminal"
# Full status of a service — includes recent log output
sudo systemctl status nginx
sudo systemctl status mariadb

# List all failed services across the system
sudo systemctl --failed
```

The `systemctl status` output shows:

- Whether the service is running, failed, or activating
- The PID and memory usage
- The last 10 log lines directly — fast triage without opening full logs

Make this part of your routine when logging into any system. If anything shows as
`failed`, investigate before doing anything else.

## 5. Network Observability

```bash title="Terminal"
# Check which services are listening on which ports
sudo ss -tulnp

# Show active connections
sudo ss -tn

# Show connections by state
sudo ss -s
```

Network inspection answers:

- Who is connected to this system right now?
- Which services are exposed — and on which interfaces?
- Is there unexpected outbound traffic?

Combine this with what you learned in Module 3: if `ss -tulnp` shows a port you
did not intentionally open, something is wrong.

## 6. Process Inspection

```bash title="Terminal"
# Top memory consumers
ps aux --sort=-%mem | head -20

# Top CPU consumers
ps aux --sort=-%cpu | head -20

# All processes in a tree view
pstree -p
```

During an incident, identifying which process is consuming resources is the first
step toward resolution. `ps aux` gives you the full picture in seconds.

## 7. Basic Alert Mindset

Even without a monitoring stack, you should define thresholds — the point at which
something is abnormal and requires attention.

Define these for your lab:

| Metric | Warning threshold | Critical threshold |
|---|---|---|
| CPU load average | > number of cores | > 2× number of cores |
| Memory usage | > 80% of total | > 95% of total |
| Swap usage | > 10% | > 50% |
| Disk usage | > 85% | > 95% |
| Service restart count | > 2 in 10 minutes | > 5 in 10 minutes |

Observability begins with defining abnormal behavior before the incident. If you
only decide what "too high" means when CPU is already at 100%, you are too late.

## 8. Simulating Observability Scenarios

### CPU Stress Simulation

Install the stress tool:

```bash title="Terminal"
sudo dnf install stress -y
```

Run a 60-second CPU stress test:

```bash title="Terminal"
stress --cpu 2 --timeout 60
```

While it runs, open a second terminal and observe:

```bash title="Second terminal"
top       # watch load average climb
htop      # watch per-core utilisation
```

What you should see:

- Load average increases above your core count
- CPU columns show near 100% utilization
- Other processes slow down due to resource contention

After 60 seconds, load average returns to baseline. Note how quickly it recovers.

### Memory Pressure Simulation

```bash title="Terminal"
stress --vm 1 --vm-bytes 1G --timeout 30
```

Watch `free -h` in a second terminal. Observe:

- Available memory decreases
- If available memory drops below 200MB, the OOM (Out of Memory) killer may activate
- Swap usage may increase

### Disk Pressure Simulation

```bash title="Terminal"
# Create a 1GB file on your /data volume from Module 4
sudo fallocate -l 1G /data/fillfile

# Monitor
df -h

# Clean up
sudo rm /data/fillfile
```

Observe how quickly disk fills and verify that removing the file recovers the space
immediately.

## 9. Multi-Node Observability

With your two-node lab from Module 5, observe how failures on one node affect the
other.

**Scenario 1 — Database failure impact on application:**

```bash title="db-node-01"
sudo systemctl stop mariadb
```

On `app-node-01`:

- Does CPU increase as the application retries connections?
- Do application error logs appear in journalctl?
- Does the web server start logging errors?

**Scenario 2 — High CPU on database node:**

```bash title="db-node-01"
stress --cpu 2 --timeout 60
```

On `app-node-01`:

- Does query latency increase?
- Do connection timeouts appear in application logs?

This connects cause and effect across nodes — the core skill of distributed systems
operations.

## 10. Centralized Thinking — Preview

Right now your observability is manual: you SSH into each node and run commands.
In production, this does not scale.

The next layer introduces:

| Tool | Purpose |
|---|---|
| **Prometheus** | Scrapes and stores metrics from all nodes automatically |
| **Grafana** | Visualizes metrics on dashboards |
| **Loki** | Centralizes logs from all nodes |
| **Alertmanager** | Sends notifications when thresholds are breached |
| **node_exporter** | Exposes Linux system metrics to Prometheus |

But without understanding what `free -h`, `df -h`, and `journalctl` tell you,
dashboards are just colored numbers. The foundation comes first.

## 11. Snapshot After Baseline

Once you have run through the observability exercises and understand baseline
system behavior:

```
Snapshot name: 06-observability-baseline
```

This snapshot represents a stable, monitored, multi-node lab that you understand
from the hypervisor upward.

## 12. Lab Assignment

On both `app-node-01` and `db-node-01`:

1. Run `top`, `free -h`, and `df -h` — document the baseline numbers
2. Simulate CPU stress with `stress --cpu 2 --timeout 60` and observe the impact
3. Simulate disk pressure with `fallocate` and verify recovery after cleanup
4. Stop a service intentionally (`nginx` or `mariadb`)
5. Observe the logs immediately after stopping it
6. On `app-node-01`, observe what changes when `mariadb` on `db-node-01` is stopped

**Deliverable — write a short operational analysis of one simulated failure:**

- What happened (the event)
- What symptoms appeared first (the signal)
- What logs showed (the evidence)
- What an automated alert would have detected (the prevention)

If you cannot explain system behavior during stress, you cannot operate production
systems. Incidents happen during high load — not when everything is quiet.

## 13. Production Reflection

Consider these questions:

- What metrics matter most in production? (Hint: not all metrics are equal)
- What does "mean time to detect" (MTTD) mean and how does observability reduce it?
- How would you prevent alert fatigue — too many alerts that engineers start ignoring?
- What is the difference between a symptom (CPU high) and a cause (runaway process)?

Observability is not tool-driven. It is mindset-driven. The tools change. The
mindset — see it before it breaks, understand it before you fix it — does not.

## Module Completion Criteria

You have completed the **DevOps Lab Engineering** course when:

- [ ] Infrastructure is segmented — nodes have different network exposure by design
- [ ] Systems are hardened — SSH restricted, firewall configured, non-root operation
- [ ] Storage is engineered — LVM used, `/data` mounted, extension tested
- [ ] Nodes are distributed — app and database nodes running with role separation
- [ ] System behavior is observable — you can read CPU, memory, disk, and logs
- [ ] Snapshots are versioned at every major stage
- [ ] You can explain every configuration decision you made

You now have a controlled, production-style DevOps lab built from first principles.

---

**Course complete.** The next course — Cloud Infrastructure Engineering — takes
these concepts to AWS, where VPCs replace network adapters, Security Groups replace
firewall rules, EBS volumes replace LVM, and Auto Scaling Groups replace manual
node cloning.
