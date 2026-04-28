---
title: Module 1 – Virtualization Architecture
sidebar_label: Module 1 – Virtualization Architecture
description: Engineering the foundation before installing tools. Build your lab from the hypervisor upward using VirtualBox.
tags: [devops-lab, virtualbox, virtualization, beginner]
sidebar_position: 1
---

# Module 1 – Virtualization Architecture

## Engineering the Foundation Before Installing Tools

Before Docker. Before Kubernetes. Before Terraform. You must engineer the machine
that will run them. Virtualisation architecture determines:

- Stability
- Resource limits
- Failure behavior
- Snapshot control
- Recovery speed

If this layer is weak, everything above it becomes unstable. This module builds your
lab from the hypervisor upward using VirtualBox.

## 1. Understanding the Virtualization Layer

Your stack looks like this:

```
Physical Machine (Host)
        ↓
VirtualBox Hypervisor
        ↓
  Virtual Machine
```

Your VM is not independent hardware. It shares:

- CPU
- RAM
- Disk I/O
- Network interface

Poor allocation decisions at this layer cause:

- Sluggish containers
- Random service crashes
- Disk bottlenecks
- Kernel instability

Infrastructure discipline begins here.

## 2. Resource Allocation Strategy

### CPU Planning

**Recommended minimum: 2 cores**

Why? Over-allocating CPU starves your host OS. Under-allocating limits container
workloads later. DevOps labs often run:

- Containers
- Monitoring tools
- Build processes

CPU planning must anticipate growth.

### Memory Planning

**Recommended minimum: 4GB RAM per primary VM**

Why?

- Docker consumes memory
- Monitoring tools consume memory
- Kernel buffers consume memory
- LVM cache uses memory

Do not allocate so much RAM that your host begins swapping. Swapping destroys lab
performance and distorts testing results.

### Disk Strategy

**Recommended: 40GB dynamic disk (minimum), VDI format**

Why dynamic? Saves host disk space initially — grows only when used.

:::info Trade-off
Dynamic disks slightly increase fragmentation risk. For lab purposes, dynamic is
acceptable.
:::

## 3. Disk Layout Philosophy

Do not rely blindly on default partitioning. Understand what is happening.

A Linux VM typically creates:

- `/boot`
- `/` (root)
- `swap`

If LVM is enabled (recommended), your root volume is logical. This matters later
when extending storage without downtime.

## 4. Snapshot Engineering Discipline

Snapshots are infrastructure checkpoints. They are not "undo buttons."

**Take snapshots:**
- After clean OS install
- After system update
- After base packages installed
- Before major installations

**Do NOT:**
- Take snapshots on unstable systems
- Keep dozens of unnamed snapshots
- Use names like "test1" or "snapshot2"

**Recommended naming convention:**

```
01-clean-install
02-base-updated
03-devtools-installed
```

Think of snapshots like Git commits for infrastructure. Controlled. Intentional.
Versioned.

## 5. Base Image Preparation

After installing Linux, run:

```bash title="Terminal"
sudo dnf update -y
sudo dnf install epel-release -y
sudo dnf groupinstall "Development Tools" -y
```

Verify:

```bash title="Terminal"
gcc --version
```

:::info Why install development tools early?
Many DevOps tools compile components during installation. Missing build tools cause
silent failures later that are difficult to trace back to a missing dependency.
:::

## 6. Network Adapter Planning

Full segmentation is covered in Module 2. For now, configure two adapters:

- **Adapter 1 → NAT** — internet access for package downloads
- **Adapter 2 → Host-only** — internal lab communication

This prepares your VM for multi-node expansion. Segmentation begins at the
virtualisation layer.

## 7. VM Naming Convention

Do not name VMs randomly. Use a consistent structure:

```
devops-node-01
devops-node-02
monitor-node-01
```

Naming discipline improves clarity when your lab scales to 5+ nodes.

## 8. Validation Checklist

Before moving to Module 2, confirm all of the following:

- [ ] VM boots cleanly
- [ ] System fully updated
- [ ] Development tools installed
- [ ] 2 CPUs allocated
- [ ] 4GB RAM allocated
- [ ] 40GB disk configured
- [ ] NAT adapter functional
- [ ] Snapshot taken: `02-base-updated`

Run these commands and understand what you see — do not proceed blindly:

```bash title="Terminal"
ip a        # verify network interfaces
free -h     # verify memory allocation
lsblk       # verify disk layout
```

## 9. Lab Assignment

1. Create a new Linux VM
2. Allocate 2 CPUs and 4GB RAM
3. Configure NAT + Host-only adapters
4. Update the system
5. Install development tools
6. Take snapshot: `02-base-updated`
7. Document your configuration decisions

**Deliverable:** A written explanation of:

- Why you chose your CPU allocation
- Why dynamic disk was used
- Why snapshots are versioned
- Why dual adapters are planned

If you cannot explain your architecture, you do not understand it.

## 10. Production Reflection

Consider these questions before moving on:

- What happens if you allocate too much RAM to the VM?
- What happens if you never take snapshots before a major change?
- What happens if you use only one network adapter?
- What happens when disk reaches 95% capacity?

Engineering is anticipation.

## Module Completion Criteria

You are ready for Module 2 when:

- You understand hypervisor resource constraints
- You can explain your disk allocation decisions
- You have a clean base snapshot named correctly
- Your VM boots and behaves predictably
- You can explain the output of `ip a`, `free -h`, and `lsblk`

---

**Next:** [Module 2 – Network Segmentation](./module-2-network-segmentation)
