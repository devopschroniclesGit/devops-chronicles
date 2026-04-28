---
title: DevOps Lab Engineering — Introduction
sidebar_label: Introduction
description: Build a production-grade home lab from scratch covering virtualisation, networking, storage, and observability.
---

# DevOps Lab Engineering

## What This Course Covers

This course teaches you to build and operate a production-grade home lab environment — the kind of environment where you can practice real DevOps skills without needing cloud credits or a corporate network.

By the end you will have a multi-node virtualised environment with network segmentation, hardened systems, distributed storage, and full observability. Every decision is made the way you would make it in production.

## Who This Is For

- Engineers learning DevOps who want hands-on lab experience
- Systems administrators moving into DevOps roles
- Anyone who wants to understand infrastructure from the ground up before working in the cloud

## What You Need

- A machine with at least 16GB RAM and 4 CPU cores (a used workstation or a modern laptop works)
- 500GB+ storage (an old HDD is fine for the lab)
- A spare network switch (optional but useful)
- Time and patience — labs break, and that is where the learning happens

## Course Modules

| Module | Topic | What You Build |
|---|---|---|
| 1 | Virtualisation Architecture | KVM hypervisor with multiple VMs |
| 2 | Network Segmentation | VLANs, pfSense firewall, isolated networks |
| 3 | System Hardening | SSH hardening, firewall rules, audit logging |
| 4 | Storage Engineering | LVM, NFS, and distributed storage with Ceph |
| 5 | Multi-Node Lab Design | Clustered workloads across multiple VMs |
| 6 | Observability Foundations | Prometheus, Grafana, and centralised logging |

---

# Module 1 — Virtualisation Architecture

## What Virtualisation Is

A hypervisor is software that creates and manages virtual machines. Each VM runs its own operating system and applications, isolated from other VMs on the same physical host. From the VM's perspective, it thinks it is running on real hardware.

There are two types:

**Type 1 (bare metal)** — runs directly on hardware. Examples: VMware ESXi, Proxmox, KVM on Linux. Better performance, used in production data centres.

**Type 2 (hosted)** — runs on top of an existing operating system. Examples: VirtualBox, VMware Workstation. Easier to set up, fine for a home lab.

For this course we use KVM (Kernel-based Virtual Machine) — a Type 1 hypervisor built into the Linux kernel. It is what AWS, GCP, and most cloud providers use under the hood.

## Installing KVM on Ubuntu

```bash
# Check your CPU supports virtualisation
grep -Ec '(vmx|svm)' /proc/cpuinfo
# Output should be > 0. If 0, enable virtualisation in your BIOS.

# Install KVM and management tools
sudo apt update
sudo apt install -y \
  qemu-kvm \
  libvirt-daemon-system \
  libvirt-clients \
  bridge-utils \
  virt-manager \
  virtinst

# Add your user to the libvirt group
sudo usermod -aG libvirt $USER
sudo usermod -aG kvm $USER

# Log out and back in, then verify
virsh list --all
```

## Understanding the KVM Stack

```
┌─────────────────────────────────────┐
│          Virtual Machines            │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ VM 1 │  │ VM 2 │  │ VM 3 │      │
│  └──────┘  └──────┘  └──────┘      │
├─────────────────────────────────────┤
│              QEMU                    │
│  (emulates hardware for each VM)    │
├─────────────────────────────────────┤
│         KVM Kernel Module            │
│  (handles CPU and memory directly)  │
├─────────────────────────────────────┤
│           Linux Kernel               │
├─────────────────────────────────────┤
│          Physical Hardware           │
└─────────────────────────────────────┘
```

**KVM** handles CPU and memory virtualisation using hardware extensions (Intel VT-x or AMD-V).
**QEMU** emulates the devices a VM sees — network cards, disk controllers, graphics.
**libvirt** is the management layer — it is what `virsh` and `virt-manager` talk to.

## Creating Your First VM

```bash
# Create a directory for VM disk images
sudo mkdir -p /var/lib/libvirt/images

# Download Ubuntu Server 22.04 ISO
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso \
  -O /var/lib/libvirt/images/ubuntu-22.04.iso

# Create a VM — 2 vCPUs, 2GB RAM, 20GB disk
sudo virt-install \
  --name ubuntu-lab-01 \
  --vcpus 2 \
  --memory 2048 \
  --disk path=/var/lib/libvirt/images/ubuntu-lab-01.qcow2,size=20,format=qcow2 \
  --cdrom /var/lib/libvirt/images/ubuntu-22.04.iso \
  --os-variant ubuntu22.04 \
  --network network=default \
  --graphics none \
  --console pty,target_type=serial \
  --extra-args 'console=ttyS0,115200n8 serial'
```

## Key VM Management Commands

```bash
# List all VMs
virsh list --all

# Start a VM
virsh start ubuntu-lab-01

# Connect to VM console
virsh console ubuntu-lab-01

# Gracefully shut down
virsh shutdown ubuntu-lab-01

# Force off (like pulling the power)
virsh destroy ubuntu-lab-01

# Delete a VM (does not delete the disk)
virsh undefine ubuntu-lab-01

# Get VM info
virsh dominfo ubuntu-lab-01

# Take a snapshot before making risky changes
virsh snapshot-create-as ubuntu-lab-01 \
  --name "before-hardening" \
  --description "Clean install before module 3"

# Restore a snapshot
virsh snapshot-revert ubuntu-lab-01 before-hardening
```

:::tip
Snapshots are your safety net in the lab. Before any module that makes significant system changes, take a snapshot. If something breaks badly, revert and start that section again — you learn more from fixing mistakes than from avoiding them.
:::

## Understanding QCOW2 Disk Images

VMs store their disks as files on the host filesystem. KVM uses QCOW2 format (QEMU Copy-On-Write version 2).

```bash
# Check actual disk usage vs allocated size
qemu-img info /var/lib/libvirt/images/ubuntu-lab-01.qcow2

# Output:
# image: ubuntu-lab-01.qcow2
# file format: qcow2
# virtual size: 20 GiB   ← what the VM thinks it has
# disk size: 3.2 GiB     ← actual space used on the host

# Resize a disk (then extend the filesystem inside the VM)
qemu-img resize /var/lib/libvirt/images/ubuntu-lab-01.qcow2 +10G
```

The virtual size is what the VM sees. The disk size is what it actually uses on your host — QCOW2 files grow on demand, which is why you can create many VMs without using all the space upfront.

## Lab Exercise

Before moving to Module 2:

1. Create three VMs: `lab-01`, `lab-02`, `lab-03` — each with 1 vCPU, 1GB RAM, 10GB disk
2. Install Ubuntu Server on each with SSH enabled
3. Take a snapshot of each after the clean install
4. SSH from the host into each VM using its IP address
5. Run `virsh list --all` and verify all three appear

The three VMs will form the cluster you build on throughout the rest of this course.
