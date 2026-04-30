---
title: Module 1 – VPC Design Principles
sidebar_label: Module 1 – VPC Design Principles
description: Network architecture before compute. Design a production-grade VPC with proper CIDR planning, subnet segmentation, and multi-AZ resilience.
tags: [cloud-infra, aws, vpc, networking, intermediate]
sidebar_position: 1
---

# Module 1 – VPC Design Principles

## Network Architecture Before Compute

Every cloud environment begins with a network.

Not with instances. Not with containers. Not with databases.

With networking.

If your VPC is poorly designed:

- Security boundaries collapse
- Scaling becomes chaotic
- Traffic flow becomes unpredictable
- Costs increase
- Failure domains expand

Cloud reliability begins with segmentation. Every architectural decision you make
after this module sits on top of the network you design here. Getting it wrong
means re-architecture later — which is expensive, risky, and disruptive.

## 1. CIDR Block Planning

### Designing for Growth, Not Today

Your VPC begins with a CIDR block. This is the IP address space your entire cloud
environment draws from. Choose it wrong and you hit walls during scaling.

```
10.0.0.0/16
```

A `/16` gives you 65,536 IP addresses. That sounds like a lot — but between
subnets, AWS reserved addresses, load balancers, RDS instances, Lambda ENIs, and
future growth, address space gets consumed faster than expected.

**Why not use something smaller like `/24`?**

Because production systems grow. Poor CIDR planning results in:

- Overlapping networks when connecting VPCs via peering
- Re-architecture during scaling — the most expensive kind of mistake
- VPN conflicts when connecting to on-premises networks
- Blocked expansion into new availability zones

### Recommended Subnet Design

```
VPC CIDR: 10.0.0.0/16

Public subnets (Load Balancers, Bastion hosts):
  10.0.1.0/24   AZ-A
  10.0.2.0/24   AZ-B

Private App subnets (Application servers):
  10.0.10.0/24  AZ-A
  10.0.20.0/24  AZ-B

Private DB subnets (Databases — isolated):
  10.0.100.0/24 AZ-A
  10.0.110.0/24 AZ-B
```

The numbering is deliberate. Public subnets use low numbers (1, 2). Private app
subnets use tens (10, 20). Database subnets use hundreds (100, 110). At a glance,
any engineer can read an IP address and know which tier it belongs to.

This creates logical separation. Segmentation is intentional, not accidental.

## 2. Public vs Private Subnet Segmentation

### Controlling Exposure

Not every resource should face the internet. The question is not "can this resource
reach the internet" — it is "should this resource be reachable from the internet."

### Public Subnet

A subnet is public when its route table has a route to an Internet Gateway:

```
Route table:
  10.0.0.0/16 → local
  0.0.0.0/0   → Internet Gateway
```

Used for:
- Application Load Balancers
- Bastion/jump hosts (SSH entry point)
- NAT Gateways

The public subnet is your controlled entry point. Everything behind it is hidden.

### Private Subnet

No direct route to the internet. Traffic out goes through a NAT Gateway.
Nothing from the internet can initiate a connection inbound.

Used for:
- Application servers (EC2, ECS tasks)
- Databases (RDS, ElastiCache)
- Internal microservices

### Production Traffic Flow

```
Internet
    ↓
Internet Gateway
    ↓
Public Subnet (Application Load Balancer)
    ↓
Private App Subnet (EC2 / ECS)
    ↓
Private DB Subnet (RDS)
```

:::danger
A database in a public subnet is a fundamental architectural flaw. It exposes your
data layer directly to the internet. If you see this in any environment — fix it
before doing anything else.
:::

## 3. Internet Gateway vs NAT Gateway

### Understanding Traffic Direction

These two components are frequently confused. They serve opposite purposes.

### Internet Gateway (IGW)

- Allows **inbound and outbound** traffic
- Attached to the VPC (one per VPC)
- Required for public subnets
- Stateless — handles both directions

If a subnet's route table contains `0.0.0.0/0 → IGW`, that subnet is public.
Resources in it can be reached from the internet if their security group allows it.

### NAT Gateway

- Allows **outbound traffic only**
- Deployed in a **public subnet**
- Used by **private subnets**
- Blocks inbound internet traffic by design

Private instances need to reach the internet — to download packages, pull container
images, call external APIs. They do this through the NAT Gateway. But the internet
cannot initiate a connection back to them. The NAT Gateway translates the source IP,
making the traffic appear to come from the NAT Gateway's public IP.

```
Private EC2 → NAT Gateway (public subnet) → Internet Gateway → Internet
Internet → Internet Gateway → BLOCKED (no route back to private subnet)
```

### Route Table Summary

| Subnet type | Destination | Target |
|---|---|---|
| Public | `0.0.0.0/0` | Internet Gateway |
| Private | `0.0.0.0/0` | NAT Gateway |
| Both | `10.0.0.0/16` | local |

:::info Traffic debugging tip
When connectivity fails, check the route table before checking security groups or
NACLs. The majority of AWS connectivity failures are routing misconfigurations —
missing routes, wrong targets, or routes in the wrong route table.
:::

## 4. Route Tables and Traffic Flow

Every subnet is associated with a route table. The route table determines where
traffic goes based on the destination IP.

**Public route table:**

```
Destination     Target
10.0.0.0/16     local           ← VPC-internal traffic
0.0.0.0/0       igw-xxxxx       ← everything else → internet
```

**Private route table:**

```
Destination     Target
10.0.0.0/16     local           ← VPC-internal traffic
0.0.0.0/0       nat-xxxxx       ← everything else → NAT Gateway
```

**Database route table (no internet):**

```
Destination     Target
10.0.0.0/16     local           ← VPC-internal only, nothing else
```

The database subnet has no `0.0.0.0/0` route at all. It literally cannot reach
the internet — not even for outbound traffic. This is intentional.

## 5. Availability Zones and High Availability

### Designing for Failure

Single-AZ deployment is not resilient. Hardware fails. Power fails. AZs fail.
AWS has documented AZ failures — they are rare, but they happen.

High availability requires resources distributed across at least two AZs:

```
AZ-A                          AZ-B
─────────────────────         ─────────────────────
Public Subnet (ALB node)      Public Subnet (ALB node)
Private App Subnet (EC2)      Private App Subnet (EC2)
Private DB Subnet (RDS)       Private DB Subnet (RDS standby)
```

The Application Load Balancer spans both AZs. When AZ-A has a failure:

- ALB stops routing to AZ-A targets automatically
- All traffic flows to AZ-B
- If ASG is configured correctly, new instances launch in AZ-B
- RDS fails over to the standby replica in AZ-B

The user sees degraded performance at most — not an outage.

**Redundancy must be deliberate.** It does not happen by accident.

## 6. Failure Domains

### Understanding Blast Radius

A failure domain is the scope of impact when something breaks.

**Poor design — everything in one subnet:**

```
All instances → single subnet → single AZ
Result: one hardware failure = total outage
```

**Proper design — segmented across AZs:**

```
Instances spread across AZ-A and AZ-B
Result: one AZ failure = 50% capacity reduction, zero outage
```

Proper segmentation limits blast radius. The goal is not to prevent failures —
it is to ensure failures have bounded, predictable impact.

## 7. Cost Awareness in Network Design

Network design has direct cost implications that are easy to overlook.

| Component | Cost consideration |
|---|---|
| NAT Gateway | ~$0.045/hour + $0.045/GB processed — runs 24/7 |
| Cross-AZ traffic | $0.01/GB each direction — adds up at scale |
| Internet Gateway | No hourly charge, only data transfer costs |
| VPC Peering | No charge for the peering itself, but cross-AZ traffic still billed |

**For your lab:** One NAT Gateway in one AZ costs ~$32/month. For cost savings,
use a single NAT Gateway during lab work. In production, use one NAT Gateway per
AZ for true resilience — but understand you are paying for that redundancy.

Architecture is trade-off. Security, resilience, and cost pull in different
directions. No design is free.

## 8. Lab Assignment

Design and document a VPC with:

1. `/16` CIDR block (`10.0.0.0/16`)
2. Two public subnets — one per AZ
3. Two private app subnets — one per AZ
4. Two private database subnets — one per AZ
5. Internet Gateway attached to the VPC
6. NAT Gateway in one public subnet
7. Three route tables — public, private app, private DB

**In the AWS console or via Terraform:**

Create the VPC. Create each subnet. Create the route tables. Associate each subnet
with the correct route table. Attach the IGW. Deploy the NAT Gateway.

**Document:**

- Why each subnet exists and what runs in it
- Why the database subnet has no `0.0.0.0/0` route
- What happens to private instances if the NAT Gateway fails
- How traffic flows from the internet to a database query and back

**Deliverable:** Architecture diagram with written traffic flow explanation.

If you cannot trace a packet from the internet to your database and explain every
hop, you do not understand your network.

## 9. Production Reflection

Consider these questions before moving on:

- What happens if the Internet Gateway is detached from the VPC?
- What happens if the NAT Gateway fails and private instances need to pull updates?
- How would you make NAT highly available? What does that cost?
- What is the cost trade-off of deploying a NAT Gateway per AZ vs a single NAT?
- How does VPC peering change your CIDR planning requirements?

Architecture is anticipating failure. The engineer who asks "what breaks if this
is removed" before deployment is more valuable than the one who finds out during
an incident.

## Module Completion Criteria

You are ready for Module 2 when:

- [ ] You understand CIDR planning and can explain why `/16` is preferred
- [ ] You can explain what makes a subnet public vs private
- [ ] You understand the difference between IGW and NAT Gateway
- [ ] You can read a route table and explain where traffic goes
- [ ] You can trace a packet from the internet to a private instance and back
- [ ] You understand AZ redundancy and can design a multi-AZ layout

---

**Next:** [Module 2 – Security Groups & IAM Strategy](courses/cloud-infra/module-2-security-groups-iam)
