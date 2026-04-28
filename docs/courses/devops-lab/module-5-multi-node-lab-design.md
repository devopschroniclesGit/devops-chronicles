---
title: Module 5 – Multi-Node Lab Design
sidebar_label: Module 5 – Multi-Node Lab Design
description: Engineering distributed systems in a local environment. Build a multi-node lab that mirrors real production topology.
tags: [devops-lab, linux, networking, distributed-systems, intermediate]
sidebar_position: 5
---

# Module 5 – Multi-Node Lab Design

## Engineering Distributed Systems in a Local Environment

### One Server Is Not a System

Production environments are not single machines. They are:

- Application nodes
- Database nodes
- Monitoring nodes
- Load balancers
- Bastion hosts

If your lab only has one VM, you are not learning distributed behavior. You are
learning how a single process runs — which is useful, but incomplete.

This module introduces controlled multi-node design inside your virtualized
environment.

## 1. Architecture Philosophy

We will build a three-node topology:

```
┌─────────────────┐    Host-Only Network    ┌─────────────────┐
│   app-node-01   │◄──────────────────────►│   db-node-01    │
│                 │    192.168.56.0/24      │                 │
│  NAT + Host-Only│                         │  Host-Only Only │
│  192.168.56.10  │                         │  192.168.56.11  │
└─────────────────┘                         └─────────────────┘
        │                                           │
        │ NAT (internet)                            │ No internet
        ▼                                           ✗
    Internet                                    Isolated
```

Each node has:

- A defined single responsibility
- Controlled network exposure
- Segmented communication paths

This mirrors real-world infrastructure. The database node is isolated — it cannot
reach the internet and is not reachable from outside the lab.

## 2. Network Design for Multi-Node Systems

You configured network segmentation in Module 2. Now you apply it across multiple
machines.

| Node | Adapter 1 | Adapter 2 | Internet Access |
|---|---|---|---|
| `app-node-01` | NAT | Host-Only | Yes |
| `db-node-01` | — | Host-Only only | No |
| `monitor-node-01` (optional) | NAT | Host-Only | Yes |

**Why does the database node have no internet access?**

Because it does not need it. A database server's job is to receive queries from
the application layer and return data. It does not download packages during runtime,
call external APIs, or need outbound internet connectivity. Giving it internet access
only expands the attack surface without any operational benefit.

This directly models AWS VPC private subnet design.

## 3. Node Role Separation

Define responsibilities clearly before building. Role confusion is how production
architectures fail silently.

### Application Node (`app-node-01`)

**Purpose:** Runs the web server or API that serves traffic

**Should:**
- Accept HTTP/HTTPS traffic from outside
- Connect internally to the database node on the database port only
- Be accessible via SSH from your management machine

**Should NOT:**
- Store persistent database files
- Have direct database port exposed externally

### Database Node (`db-node-01`)

**Purpose:** Stores and serves structured data to the application layer

**Should:**
- Accept database connections from `app-node-01` only
- Bind its service to the host-only IP — never the NAT interface

**Should NOT:**
- Be accessible from the internet
- Have a Bridged adapter
- Run application code

:::danger Database exposure is a common production mistake
A database bound to `0.0.0.0` and reachable from the internet is one of the most
common causes of data breaches. In your lab, enforce this correctly from the start —
database services bind to internal IPs only.
:::

### Monitoring Node (`monitor-node-01`) — Optional

**Purpose:** Collects metrics and logs from all other nodes

**Should:**
- Reach both app and database nodes internally
- Have internet access for pulling monitoring tools

Separating monitoring from application workloads increases operational clarity and
prevents resource contention during incidents.

## 4. VM Cloning Strategy

Do not reinstall the OS for each node — that introduces configuration drift.

Use the hardened snapshot from Module 3:

```
Snapshot: 03-hardened-base
```

Clone it in VirtualBox:

```
VirtualBox → Right-click VM → Clone
→ Clone type: Linked Clone (saves disk space in a lab)
→ Name: app-node-01
```

Repeat for `db-node-01`.

After cloning, update the hostname on each node:

```bash title="app-node-01"
sudo hostnamectl set-hostname app-node-01
```

```bash title="db-node-01"
sudo hostnamectl set-hostname db-node-01
```

Cloning ensures consistent base configuration across nodes. Consistency reduces
unpredictable behavior during troubleshooting.

## 5. Internal Communication Validation

After booting both nodes, verify they can reach each other.

On each node, check the host-only IP:

```bash title="Terminal — run on each node"
ip a | grep 192.168.56
```

Test internal connectivity:

```bash title="app-node-01"
ping 192.168.56.11    # db-node host-only IP
```

```bash title="db-node-01"
ping 192.168.56.10    # app-node host-only IP
```

:::warning
If nodes cannot communicate internally, stop here and fix the network before
continuing. Every subsequent step depends on internal connectivity working correctly.
:::

Check that `db-node-01` cannot reach the internet:

```bash title="db-node-01"
ping 8.8.8.8    # should fail — no NAT adapter
```

## 6. Simulating Real Service Flow

Install a web server on `app-node-01`:

```bash title="app-node-01"
sudo dnf install nginx -y
sudo systemctl enable --now nginx
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --reload
```

Install a database on `db-node-01`:

```bash title="db-node-01"
sudo dnf install mariadb-server -y
sudo systemctl enable --now mariadb
```

**Bind the database to the host-only interface only:**

```bash title="/etc/my.cnf.d/mariadb-server.cnf on db-node-01"
[mysqld]
bind-address = 192.168.56.11    # host-only IP only — never 0.0.0.0
```

```bash title="db-node-01"
sudo systemctl restart mariadb

# Verify it is only listening on the internal IP
sudo ss -tulnp | grep 3306
```

Open the database port only to the app node:

```bash title="db-node-01"
sudo firewall-cmd --add-rich-rule='rule family="ipv4" source address="192.168.56.10" port protocol="tcp" port="3306" accept' --permanent
sudo firewall-cmd --reload
```

The database is now only reachable from the application node.

## 7. DNS and Name Resolution

Instead of hardcoding IP addresses, configure `/etc/hosts` on each node to use
names. This simulates internal DNS and makes configuration more maintainable.

Add to `/etc/hosts` on **every node**:

```bash title="/etc/hosts — add to all nodes"
192.168.56.10   app-node-01
192.168.56.11   db-node-01
```

Verify name resolution works:

```bash title="Terminal"
ping app-node-01
ping db-node-01
```

Production systems use DNS, not `/etc/hosts`. But this simulates the same behavior
and teaches you why name resolution matters — if you change an IP, you update one
file instead of every config that references the IP.

## 8. Resource Planning Across Nodes

Multiple VMs stress your host system. Monitor your host machine's resources while
running the full lab.

On each node, check resource usage:

```bash title="Terminal"
free -h     # memory
htop        # CPU and process overview
df -h       # disk
```

If your host CPU spikes or your iMac fan runs constantly:

- Reduce VM core count from 2 to 1 for non-primary nodes
- Reduce RAM allocation for the database node if not under heavy load
- Use linked clones (they share base disk storage) instead of full clones

Multi-node design requires hardware awareness. Your lab is limited by the physical
machine running it.

## 9. Failure Simulation

Now test how failures propagate across your system — the core learning objective
of multi-node design.

```bash title="Simulate database failure — run on db-node-01"
sudo systemctl stop mariadb
```

Then on `app-node-01`, observe:

- What error does the application return when the database is down?
- How quickly does it fail?
- Does the web server crash, or does it return a 500 error?

```bash title="Simulate network isolation — run on db-node-01"
sudo ip link set enp0s8 down    # bring down host-only interface
```

Then from `app-node-01`:

- Can you still ping `db-node-01`?
- What happens to the application?

Restore connectivity:

```bash title="db-node-01"
sudo ip link set enp0s8 up
```

Distributed systems fail differently than single-node systems. Understanding failure
propagation is more valuable than preventing every failure — because you cannot
prevent every failure.

## 10. Security Reinforcement

Multi-node topology increases attack surface. Hardening must scale with the topology.

On each node, verify:

```bash title="Terminal"
# No unexpected open ports
sudo ss -tulnp

# Firewall is active
sudo firewall-cmd --list-all

# Database port not visible on the NAT interface
sudo ss -tulnp | grep 3306
```

SSH access should only be accepted on the management interface. Database ports should
only accept connections from specific source IPs.

## 11. Snapshot Strategy in Multi-Node Design

Each node must be snapshotted independently.

```
app-node-01 snapshots:
  app-node-01-base-clone
  app-node-01-configured

db-node-01 snapshots:
  db-node-01-base-clone
  db-node-01-configured
```

Take snapshots after each node is configured and validated. If one node fails
configuration, restore only that node — not the entire lab.

Infrastructure versioning must remain controlled and granular.

## 12. Lab Assignment

1. Clone `03-hardened-base` twice — create `app-node-01` and `db-node-01`
2. Configure network adapters correctly (app: NAT + Host-Only, db: Host-Only only)
3. Set hostnames and update `/etc/hosts` on both nodes
4. Install nginx on the app node
5. Install MariaDB on the db node, bound to the host-only IP only
6. Verify internal connectivity — both nodes ping each other
7. Verify database is not reachable from outside the lab
8. Simulate database failure — stop the service and observe the impact on the app
9. Document the failure behavior

**Deliverable — explain in writing:**

- Why the database node should not have a NAT adapter
- What happens if the database is exposed via a Bridged adapter
- How this two-node design maps to AWS public/private subnet architecture
- How you would introduce redundancy (a second database node) to this design

If you cannot explain role separation, you are not designing architecture — you
are following steps.

## 13. Production Reflection

Consider these questions before moving on:

- How does this compare to AWS public/private subnet design with an RDS instance?
- Where would a load balancer sit in this topology?
- What happens to your application under horizontal scaling — 3 app nodes, 1 db node?
- How would you introduce redundancy for the database without downtime?

Distributed systems require intentional topology. Every design decision has a
consequence — understand the consequences before the consequences find you.

## Module Completion Criteria

You are ready for Module 6 when:

- [ ] Both nodes communicate internally over the host-only network
- [ ] Roles are separated — app node and database node have different responsibilities
- [ ] Database service is not exposed via NAT or Bridged interfaces
- [ ] Failure propagation is observed and understood
- [ ] Snapshots are versioned per node separately
- [ ] You can explain the topology as if presenting it to a team

---

**Next:** [Module 6 – Observability Foundations](./module-6-observability-foundations)
