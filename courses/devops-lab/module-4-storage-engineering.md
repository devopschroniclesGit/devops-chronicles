---
title: Module 4 – Storage Engineering
sidebar_label: Module 4 – Storage Engineering
description: LVM, partitions, and capacity discipline. Engineer your storage layout — don't accept the default.
tags: [devops-lab, linux, lvm, storage, intermediate]
sidebar_position: 4
---

# Module 4 – Storage Engineering

## LVM, Partitions & Capacity Discipline

### Disks Are Not Infinite

Infrastructure does not fail because of Kubernetes. It fails because:

- Root partition fills up
- Logs grow uncontrollably
- Databases consume unexpected space
- Volumes cannot be extended without downtime
- Storage layout was never designed — just accepted

Storage must be engineered, not accepted as default.

## 1. Storage Architecture Overview

Modern enterprise Linux systems use a layered storage model:

```
Physical Disk (/dev/sda)
        ↓
  Partition (/dev/sda2)
        ↓
  Physical Volume (PV)
        ↓
   Volume Group (VG)
        ↓
   Logical Volume (LV)
        ↓
  Filesystem (ext4/xfs)
```

If you do not understand this chain, you cannot safely extend storage under pressure.
Each layer serves a purpose — skipping the understanding creates incidents.

## 2. Why LVM Matters

**Without LVM:**

- Partition sizes are fixed at install time
- Resizing requires unmounting and risks data loss
- Adding capacity requires planning downtime

**With LVM:**

- Logical volumes grow without unmounting
- Storage can be added dynamically from new disks
- Capacity planning becomes flexible and safe

LVM introduces an abstraction layer between physical disks and filesystems.
That abstraction is what enables production-grade storage operations without downtime.

## 3. Inspecting Your Current Storage

Before making any changes, understand what you have.

```bash title="Terminal"
# List all block devices and their relationships
lsblk

# Check filesystem usage
df -h

# Inspect LVM physical volumes
sudo pvs

# Inspect LVM volume groups
sudo vgs

# Inspect LVM logical volumes
sudo lvs
```

Do not proceed until you can answer:

- Which device holds the root filesystem?
- Is LVM currently in use?
- How much free space exists in the volume group?

## 4. Designing a Better Storage Layout

Default installations place everything under `/`. This is acceptable for basic
systems — not acceptable for engineered infrastructure.

**Recommended separation for a production-style system:**

| Mount Point | Purpose | Why separate? |
|---|---|---|
| `/` | System files, binaries | Core OS — must not fill up |
| `/var` | Logs, application data | Logs grow — isolate the growth |
| `/home` | User data | User files should not fill system |
| `/opt` | Custom software | Third-party installs stay isolated |
| `/data` | Application data | Dedicated volume, easily extended |

**Why separate `/var` specifically?**

Because logs grow. If `/var` shares the root filesystem and fills up, the entire system
becomes unstable — package installs fail, services crash, logging stops. Separating
`/var` means log growth is contained and cannot take down the OS.

## 5. Creating a New Logical Volume — Lab Simulation

**Step 0 — Add a second virtual disk in VirtualBox**

In VirtualBox: Settings → Storage → Add Hard Disk → Create new (5GB, dynamic).

After booting, verify the new disk is visible:

```bash title="Terminal"
lsblk
# You should see /dev/sdb listed
```

**Step 1 — Create a Physical Volume**

```bash title="Terminal"
sudo pvcreate /dev/sdb

# Verify
sudo pvs
```

**Step 2 — Extend the Volume Group**

First identify your VG name:

```bash title="Terminal"
sudo vgs
# Note the Name column — typically 'rl' or 'almalinux' or 'centos'
```

Add the new PV to the VG:

```bash title="Terminal"
sudo vgextend <your-vg-name> /dev/sdb

# Verify — check VFree column shows new space
sudo vgs
```

**Step 3 — Create a Logical Volume**

Create a 5GB volume for application data:

```bash title="Terminal"
sudo lvcreate -L 5G -n data_lv <your-vg-name>

# Verify
sudo lvs
```

**Step 4 — Format the Filesystem**

```bash title="Terminal"
# XFS is recommended for production Linux systems
sudo mkfs.xfs /dev/<vg-name>/data_lv
```

**Step 5 — Mount the Volume**

```bash title="Terminal"
# Create the mount point
sudo mkdir /data

# Mount it
sudo mount /dev/<vg-name>/data_lv /data

# Verify
df -h | grep /data
```

**Make the mount permanent** — add to `/etc/fstab`:

```bash title="Terminal"
# Get the UUID of the new volume
sudo blkid /dev/<vg-name>/data_lv
```

Add this line to `/etc/fstab`:

```bash title="/etc/fstab"
UUID=<your-uuid>  /data  xfs  defaults  0  2
```

Test it:

```bash title="Terminal"
sudo umount /data
sudo mount -a    # mounts everything in fstab
df -h | grep /data    # should appear
```

:::warning
Always test `/etc/fstab` changes with `mount -a` before rebooting. A typo in fstab
can prevent your system from booting.
:::

## 6. Extending a Logical Volume

Simulate a scenario where your `/data` volume is running out of space.

Extend the volume by 2GB:

```bash title="Terminal"
sudo lvextend -L +2G /dev/<vg-name>/data_lv
```

Resize the filesystem to use the new space:

```bash title="Terminal"
# For XFS filesystems
sudo xfs_growfs /data

# For ext4 filesystems
sudo resize2fs /dev/<vg-name>/data_lv
```

Verify the new size:

```bash title="Terminal"
df -h
```

No service restart required. No unmounting. No downtime. This is the operational
value of LVM — storage grows while the system keeps running.

## 7. Simulating Disk Pressure

Understanding how systems behave when storage is nearly full prevents production
incidents. Simulate it deliberately in your lab.

```bash title="Terminal"
# Create a 2GB file to consume space
sudo fallocate -l 2G /data/testfile

# Check usage
df -h
```

Observe what happens as the volume fills:

- At **85%**: Standard warning threshold — alerts should fire
- At **95%**: Package installs begin to fail
- At **100%**: Logging stops, services crash, system becomes unstable

After testing, clean up:

```bash title="Terminal"
sudo rm /data/testfile
df -h    # space recovered
```

Storage discipline prevents production incidents. The engineers who have seen a
full disk in production never forget to monitor it.

## 8. Swap Considerations

Check current swap usage:

```bash title="Terminal"
free -h
```

Swap is not memory. It is emergency overflow — the OS moves inactive memory pages to
disk to free RAM for active processes. Swap access is orders of magnitude slower than RAM.

Consistent swap usage signals:

- Memory allocation is insufficient for the workload
- Application is leaking memory
- Resource planning failed at the design stage

Swap must be monitored — not ignored. A system using 50%+ of swap under normal load
needs more RAM, not more swap.

## 9. Capacity Planning Mindset

Before deploying any service, ask:

- How fast will logs grow? (Check current growth rate: `du -sh /var/log`)
- What writes heavily to disk? (Databases, container images, build artifacts)
- How much free space remains in the volume group? (`sudo vgs`)
- What is the alert threshold? (Set at 85%, act before 95%)

Infrastructure thinking means anticipating growth, not reacting to it.

## 10. Snapshot Before and After

Storage changes are high-risk operations. Always snapshot before and after.

```
Before modifying storage:
  Snapshot name: 04-before-storage-changes

After successful LVM setup and validation:
  Snapshot name: 05-storage-engineered
```

Version control applies to infrastructure state, not just code.

## 11. Lab Assignment

1. Add a new virtual disk to your VM in VirtualBox
2. Convert it to an LVM Physical Volume (`pvcreate`)
3. Extend your existing Volume Group (`vgextend`)
4. Create a dedicated logical volume (`lvcreate`)
5. Format it as XFS and mount it permanently via `/etc/fstab`
6. Extend the volume by 2GB without unmounting (`lvextend` + `xfs_growfs`)
7. Simulate disk pressure with `fallocate` and observe system behavior
8. Remove the test file and verify space is recovered

**Deliverable — explain in writing:**

- Why LVM is superior to static partitions for production systems
- What risks exist if `/var` fills up and shares the root filesystem
- How you would monitor disk usage across your multi-node lab
- How this maps to AWS EBS volumes and volume extension in the cloud

If you cannot explain your growth strategy, you do not control your infrastructure.

## 12. Production Reflection

Consider these questions before moving on:

- How does LVM logical volume extension map to AWS EBS volume resizing?
- What happens if disk I/O latency increases? How would you detect it?
- How do databases behave under storage pressure — which operations fail first?
- What would a runbook for "disk at 90%" look like for your lab?

Storage is not glamorous. But it breaks systems silently, and it breaks them at the
worst possible time — under production load.

## Module Completion Criteria

You are ready for Module 5 when:

- [ ] You understand the PV → VG → LV → filesystem chain
- [ ] You have extended a logical volume without downtime
- [ ] You have simulated disk pressure and observed system behavior
- [ ] Storage was engineered intentionally, not accepted as default
- [ ] Snapshots taken: `04-before-storage-changes` and `05-storage-engineered`

---

**Next:** [Module 5 – Multi-Node Lab Design](./module-5-multi-node-lab-design)
