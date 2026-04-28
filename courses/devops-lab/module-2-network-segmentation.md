---
title: Module 2 – Network Segmentation
sidebar_label: Module 2 – Network Segmentation
description: Engineering isolation before exposure. Build intentional network layering using NAT, Bridged, and Host-Only adapters in VirtualBox.
tags: [devops-lab, networking, virtualbox, beginner]
sidebar_position: 2
---

# Module 2 – Network Segmentation

## Engineering Isolation Before Exposure

Network design determines:

- Who can reach your system
- What traffic is allowed
- How services communicate
- How attacks propagate
- How failures are contained

If your lab network is flat and unsegmented, you are not simulating production.

This module builds intentional network layering using:

- NAT
- Bridged Adapter
- Host-Only Adapter

## 1. Why Network Segmentation Matters

In production systems:

- Public-facing services are separated from internal services
- Database layers are isolated from application layers
- Management access is restricted to specific networks
- East-west traffic (server to server) is controlled

Your lab must reflect these realities. If everything shares one network, you are
building bad habits that will carry into production.

## 2. NAT – Outbound Access Layer

### What NAT Does

NAT (Network Address Translation) allows your VM to:

- Access the internet
- Download packages
- Pull container images
- Fetch updates

Without exposing it directly to your local network.

### Architecture Model

```
     Internet
        ↓
  Host Machine
        ↓
VirtualBox NAT Engine
        ↓
  VM (Private IP)
```

The VM receives a private internal IP from VirtualBox. It can reach out — nothing
external can reach in without explicit port forwarding.

### When to Use NAT

- Package installation
- Secure default configuration
- Outbound-only systems
- Controlled lab experiments

### Limitations of NAT

- Other devices on your LAN cannot directly access the VM
- Multi-node communication is limited without additional adapters
- Not realistic for simulating public-facing services

:::warning
NAT is safe, but incomplete. It is always Adapter 1 — never your only adapter
in a serious lab.
:::

## 3. Bridged Adapter – LAN Exposure Layer

### What Bridged Mode Does

Bridged networking makes your VM behave like a physical device on your network.
Your router assigns it an IP address directly.

### Architecture Model

```
         Router
        /  |   \
Host  VM  Other devices
```

Your VM is now directly reachable from your LAN.

### When to Use Bridged

- Testing web servers accessible from other machines
- SSH access from your iMac to the VM (your current setup)
- Simulating public-facing service exposure
- Realistic network testing

### Risks of Bridged Mode

- Misconfigured firewall exposes services to the entire LAN
- SSH brute-force exposure if port 22 is open
- Accidental database exposure
- Less isolation than host-only

:::danger
Bridged mode must be paired with proper firewall discipline. Never run an
unsecured database on a bridged interface.
:::

## 4. Host-Only Adapter – Internal Communication Layer

### What Host-Only Does

Host-only networking allows:

- VM-to-VM communication
- Host-to-VM communication
- **No internet access**

### Architecture Model

```
Host ↔ VM1 ↔ VM2

(No external access)
```

This simulates:

- A private subnet
- Internal service communication
- East-west traffic between application and database tiers

### When to Use Host-Only

- Multi-node clusters
- Database + Application server separation
- Internal-only services
- Kubernetes node communication

Host-only networking is critical for serious lab design. It is always your internal
communication layer.

## 5. Professional Lab Design – Dual Adapter Strategy

Your VM should have both adapters configured:

| Adapter | Type | Purpose |
|---|---|---|
| Adapter 1 | NAT | Internet access — package downloads, updates |
| Adapter 2 | Host-Only | Internal lab communication between nodes |

**Why both?** This mirrors production layering:

- External access layer (NAT → maps to internet gateway / NAT gateway in AWS)
- Internal service layer (Host-only → maps to private subnet in a VPC)

This prepares you for:

- VPC public/private subnet design in AWS
- Firewall segmentation
- Service isolation principles

## 6. Common Beginner Mistakes

- Using only NAT for everything — nodes cannot communicate with each other
- Using only Bridged for everything — everything is exposed, no isolation
- Not knowing which interface handles which traffic
- Forgetting to verify IP addresses after configuration

## 7. Identifying Network Interfaces

After configuring adapters, verify:

```bash title="Terminal"
ip a
```

You should see two interfaces with addresses:

```
enp0s3: 10.0.2.15       ← NAT interface (internet access)
enp0s8: 192.168.56.11   ← Host-only interface (internal lab)
```

Test outbound internet access:

```bash title="Terminal"
ping 8.8.8.8
```

Test internal node communication:

```bash title="Terminal"
ping 192.168.56.12    # the host-only IP of another node
```

Understand which interface is being used. Do not assume.

## 8. Simulating Segmentation in Practice

Example two-node design:

```
Node 1 (app-node):
  Adapter 1: NAT         → can reach internet
  Adapter 2: Host-only   → can reach Node 2 internally

Node 2 (db-node):
  Adapter 1: Host-only only → CANNOT reach internet
                           → can only communicate internally
```

Node 2 simulates a database server in a private subnet. It has no direct internet
access. It receives updates only through a controlled path via Node 1 (or a NAT
gateway in a real AWS environment).

This is how real systems are layered.

## 9. Firewall Integration

Network adapter choice is only step one. Segmentation is incomplete without
firewall rules.

Even in host-only mode:

- Restrict open ports explicitly
- Control which services accept connections
- Define SSH access by source IP

:::info Preview
Module 3 — System Hardening covers firewall configuration with `firewalld`.
Network adapter choice determines what traffic can arrive. Firewall rules determine
what is actually accepted.
:::

## 10. Lab Assignment

1. Configure dual adapters on your primary node:
   - Adapter 1 → NAT
   - Adapter 2 → Host-only

2. Create a second VM with host-only only

3. Verify:
   - Node 1 can access the internet (`ping 8.8.8.8`)
   - Node 2 cannot access the internet
   - Node 1 and Node 2 can ping each other internally

4. Document:
   - Which interface handles which traffic
   - What would happen if you removed NAT from Node 1
   - What risks exist if you used only Bridged on Node 2

**Deliverable:** Write a short architecture explanation of your segmented design.
If you cannot explain traffic flow, you do not understand your network.

## 11. Production Reflection

Consider these questions before moving on:

- What happens if an internal database server is placed on a Bridged adapter?
- What happens if all nodes share one flat network with no segmentation?
- How does this dual-adapter model map to AWS VPC public/private subnets?
- How would a firewall misconfiguration break this isolation model?

Segmentation is a mindset. Not a checkbox.

## Module Completion Criteria

You are ready for Module 3 when:

- [ ] You understand traffic flow for each adapter type
- [ ] You can explain when to use NAT vs Bridged vs Host-only
- [ ] You have at least two communicating nodes
- [ ] Node 2 cannot reach the internet but can ping Node 1
- [ ] You understand the exposure risks of each mode

---

**Next:** [Module 3 – System Hardening](./module-3-system-hardening)
