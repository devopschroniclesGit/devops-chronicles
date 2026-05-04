---
title: EC2 vs Lambda vs ECS — Choosing Your Compute
description: A production engineer's decision framework for AWS compute. Not what each service does — when to actually use it.
tags: [aws, architecture, compute, decision-framework]
---

# EC2 vs Lambda vs ECS — Choosing Your Compute

Certification prep teaches you what each service does. It rarely teaches you how to choose between them when you're staring at a real workload. This guide covers the decision, not the definition.

## The Core Question

Every compute decision comes down to three variables:

- **Runtime** — how long does your code run per invocation?
- **Shape** — is the workload stateless or stateful? Burst or steady?
- **Operational burden** — how much do you want to manage?

Get these three right and the service choice becomes obvious.

---

## EC2 — When You Need the Machine

EC2 is not a default. It is a deliberate choice that comes with real operational cost: patching, scaling configuration, AMI management, instance health monitoring. You choose EC2 when you specifically need what EC2 provides.

**Choose EC2 when:**

- Your application requires persistent local state (files, sockets, long-lived processes)
- You need predictable, sustained CPU/memory (ML inference, video encoding, heavy batch jobs)
- You are running software that cannot be containerised — legacy apps, licensed software tied to a host
- You need full OS control: kernel parameters, custom networking, hardware-level access
- Cost at scale favours reserved instances over per-request pricing

**Real example:** A Prometheus server. It needs persistent disk for TSDB storage, a stable network address for scrape targets to resolve, and long-lived connections. Lambda cannot do this. ECS can, but persistent storage for TSDB requires careful EFS or EBS attachment. EC2 with a large attached EBS volume is the straightforward answer.

**Warning signs you are choosing EC2 incorrectly:**
- Your instances are idle most of the time
- You are running one small process on a large instance
- You are managing EC2 to run containers — use ECS instead

---

## Lambda — When You Need a Function, Not a Server

Lambda's value is not cheapness. It is the elimination of idle cost and operational overhead for workloads that are event-driven and short-lived.

**Choose Lambda when:**

- Your code runs in response to an event (S3 upload, API call, SNS message, schedule)
- Each invocation is independent — no shared state between calls
- Execution time is under 15 minutes
- Traffic is spiky or unpredictable — Lambda scales to zero and back instantly
- You want zero infrastructure management

**Real example:** Image resizing triggered by S3 uploads. Every upload fires an event, Lambda runs for a few seconds, produces a thumbnail, writes it back to S3. No server needed, no idle cost, no scaling configuration. This is exactly what Lambda is for.

**Where Lambda breaks in production:**

- **Cold starts** — the first invocation after idle can take hundreds of milliseconds to several seconds. For latency-sensitive APIs this is a problem. Provisioned concurrency mitigates it at extra cost.
- **Duration limits** — 15 minutes maximum. Long-running jobs (ETL, video processing) do not fit.
- **Local state** — `/tmp` is available (512MB–10GB depending on config) but it is ephemeral and not shared between instances.
- **VPC cold starts** — Lambda inside a VPC has historically had longer cold starts. This has improved significantly with Hyperplane ENIs but is still a consideration.
- **Concurrency limits** — default 1,000 concurrent executions per region per account. At scale this becomes a hard constraint.

**Warning signs you are choosing Lambda incorrectly:**
- Your Lambda runs for 5+ minutes regularly — reconsider the architecture
- You are managing complex shared state between Lambda invocations
- You need consistent sub-10ms latency with no variance

---

## ECS — When You Need Containers Without Kubernetes

ECS is the middle path: more control than Lambda, less operational overhead than EC2. It runs containers. Your unit of deployment is a Docker image, not a machine.

ECS has two launch types:

**Fargate** — AWS manages the underlying compute. You define CPU and memory per task. No EC2 instances to patch or scale. Pay per task-second.

**EC2 launch type** — You manage a cluster of EC2 instances. ECS schedules containers onto them. More control, more ops work, better cost efficiency at scale with reserved instances.

**Choose ECS (Fargate) when:**

- You have a long-running service that needs to be containerised
- Your workload does not fit Lambda's constraints (runtime, state, concurrency)
- You do not want to manage EC2 instances
- You need sidecars (logging agents, service mesh proxies) alongside your application container
- You want port-level control and persistent connections

**Choose ECS (EC2 launch type) when:**

- You have consistent, high-volume workloads where EC2 reserved instances reduce cost significantly
- You need GPU instances or specific instance types not available in Fargate
- You need more control over networking at the host level

**Real example:** A Node.js API that handles WebSocket connections. Lambda cannot maintain persistent connections. EC2 works but you are managing machines for an app that should just be a container. ECS Fargate with an ALB in front — right-sized task definition, auto scaling on CPU/memory, no EC2 to manage. This is the correct choice.

---

## The Decision Tree

```
Is your workload event-driven and under 15 minutes?
├── YES → Can it tolerate cold starts?
│         ├── YES → Lambda
│         └── NO  → Lambda + Provisioned Concurrency, or ECS
└── NO  → Is it a containerised workload?
          ├── YES → Do you want to manage EC2 instances?
          │         ├── NO  → ECS Fargate
          │         └── YES → ECS EC2 (reserved instances at scale)
          └── NO  → Do you need full OS control or persistent state?
                    ├── YES → EC2
                    └── NO  → Consider containerising it first
```

---

## Cost Comparison Intuition

This is not a pricing table — those change. This is how to think about relative cost:

| Pattern | Cost Driver | Good for |
|---|---|---|
| Lambda | Per request + duration | Spiky, event-driven, low sustained volume |
| Fargate | Per task-second (CPU + memory) | Medium sustained workloads, no ops overhead |
| EC2 On-Demand | Per instance-hour (running or not) | Variable workloads, short-term |
| EC2 Reserved | Committed 1–3 year term | Predictable, sustained workloads |

Lambda becomes expensive when it runs constantly at high concurrency. EC2 becomes cheap when reserved and well-utilised. Fargate sits between them — more predictable than Lambda at volume, more flexible than EC2 for variable loads.

---

## What the Exam Tests vs What Production Teaches

**The exam tests:** Can you identify which service supports which feature? Max Lambda duration? ECS task definition structure?

**Production teaches:** The answer is almost never one service. A real system might use Lambda for event processing, ECS for the API layer, and EC2 for the database or stateful workload. The skill is knowing which workload belongs where — and being able to justify the operational trade-off you are accepting.
