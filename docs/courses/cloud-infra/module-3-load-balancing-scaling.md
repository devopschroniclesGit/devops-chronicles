---
title: Module 3 – Load Balancing & Scaling
sidebar_label: Module 3 – Load Balancing & Scaling
description: Scaling is architecture, not instinct. Design ALB, target groups, and Auto Scaling Groups that respond automatically to load and failure.
tags: [cloud-infra, aws, alb, auto-scaling, intermediate]
sidebar_position: 3
---

# Module 3 – Load Balancing & Scaling

## Scaling Is Architecture, Not Instinct

Adding more servers is not scaling.

Scaling means:

- Handling traffic spikes without manual intervention
- Replacing failed instances automatically
- Maintaining availability during partial failures
- Controlling cost growth — not just capacity growth

Elastic systems respond automatically. Manual scaling is operational debt — it means
someone has to be awake and paying attention for your system to survive a traffic spike.

## 1. Why Load Balancing Exists

Without a load balancer, your architecture has a single point of failure at every
level:

- Single instance failure = total outage
- Traffic is unevenly distributed — one instance overwhelmed while others idle
- Scaling requires DNS changes or manual traffic redirection
- SSL termination must be configured on every instance separately

A load balancer solves all of these simultaneously. It becomes the single front door
of your application — the one component that everything connects through, and the
component that abstracts the complexity of multiple backend instances from the client.

## 2. Application Load Balancer (ALB)

The ALB operates at **Layer 7** — the application layer. It understands HTTP and
HTTPS, which means it can make routing decisions based on the content of the request,
not just the destination IP.

**Responsibilities:**

- Distribute incoming traffic across healthy instances
- Perform health checks and remove unhealthy instances from rotation
- Terminate SSL — your instances receive plain HTTP internally
- Route based on URL path (`/api/*` → one target group, `/static/*` → another)
- Route based on hostname (`api.devopschronicles.com` vs `www.devopschronicles.com`)

### Traffic Flow

```
Internet
    ↓
Application Load Balancer  ← lives in PUBLIC subnets
    ↓
Target Group
    ↓
EC2 instances              ← live in PRIVATE subnets
```

:::warning
If your application instances are in public subnets, your segmentation is broken.
The ALB is your public-facing component. Everything behind it should be private —
unreachable directly from the internet.
:::

### ALB Listener Rules

Listeners define what the ALB does with incoming traffic:

```
Listener: HTTPS :443
  Rule 1: IF path = /api/*   → forward to target-group-api
  Rule 2: IF path = /admin/* → forward to target-group-admin
            AND source IP in [office CIDR]
  Rule 3: Default            → forward to target-group-web
```

This routing logic runs in the ALB — before a single request reaches your instances.

## 3. Target Groups

A target group is a logical grouping of instances (or IPs, or Lambda functions)
that the ALB can route traffic to. Each target group has its own health check.

**Key configuration:**

```
Target group: tg-app
  Protocol: HTTP
  Port: 8080
  Health check:
    Path: /health
    Interval: 30 seconds
    Healthy threshold: 2 consecutive successes
    Unhealthy threshold: 3 consecutive failures
    Timeout: 5 seconds
```

### How health checks protect you

When an instance fails its health check:

1. ALB marks it as unhealthy
2. No new requests are routed to it
3. In-flight requests complete
4. ASG detects the unhealthy instance and terminates it
5. ASG launches a replacement
6. Once the new instance passes health checks, it enters rotation

This entire process happens automatically. The user may see one or two failed
requests — not an extended outage.

:::info
The health check path must always return HTTP 200. If `/health` returns 404 or
500, the instance is marked unhealthy and removed — even if the application is
actually running fine. Test your health check endpoint explicitly.
:::

## 4. Horizontal vs Vertical Scaling

### Vertical Scaling (scaling up)

Increase the size of a single instance — more CPU, more RAM, faster disk.

```
t3.micro → t3.small → t3.medium → t3.large → ...
```

**Limitations:**
- Has a ceiling — the largest instance type available
- Requires downtime to resize (stop → resize → start)
- Single large instance is still a single point of failure
- Expensive at the top end

### Horizontal Scaling (scaling out)

Add more instances of the same size. Distribute load across them.

```
1x t3.small → 2x t3.small → 4x t3.small → 8x t3.small
```

**Advantages:**
- No theoretical ceiling — add as many instances as needed
- No downtime — add instances while existing ones keep running
- Failed instances are replaced, not resized
- Cost scales linearly with load

**The cloud-native approach is always horizontal scaling.** Design your application
to be stateless — no session data stored on the instance — so any instance can
handle any request, and instances can be terminated without losing user state.

## 5. Auto Scaling Groups (ASG)

An Auto Scaling Group manages a fleet of EC2 instances automatically. You define
the boundaries and the conditions; the ASG handles the rest.

**Core configuration:**

```
Desired capacity: 2    ← how many instances to run normally
Minimum capacity: 2    ← never go below this
Maximum capacity: 6    ← never go above this
```

### Scaling policies

**Target tracking** — the simplest and most reliable policy:

```
Policy: maintain average CPU at 60%
Action: add/remove instances as needed to keep CPU at target
```

AWS calculates how many instances are needed and adjusts automatically.

**Step scaling** — add different amounts based on severity:

```
CPU 60-70%: add 1 instance
CPU 70-80%: add 2 instances
CPU > 80%:  add 3 instances
```

**Scheduled scaling** — for predictable traffic patterns:

```
8:00 AM Monday-Friday: set desired capacity to 4
6:00 PM Monday-Friday: set desired capacity to 2
```

### Scaling cooldown

After a scaling action, the ASG waits for a cooldown period before taking another
action. This prevents thrashing — rapidly adding and removing instances in response
to brief metric spikes.

```
Scale-out cooldown: 300 seconds
Scale-in cooldown: 300 seconds
```

**Scaling must be measured — not emotional.** If you set thresholds too aggressively,
you waste money. Too conservatively and you drop requests during spikes. Monitor
and tune based on actual traffic patterns.

## 6. Multi-AZ Scaling

Scaling within a single AZ is partial resilience — not full resilience.

A proper ASG configuration distributes instances across multiple AZs:

```
ASG subnets: private-app-az-a, private-app-az-b
Distribution: balanced across AZs

Normal state:
  AZ-A: 2 instances
  AZ-B: 2 instances

AZ-A failure:
  AZ-A: 0 instances (terminated)
  AZ-B: 4 instances (ASG compensates)
```

When an AZ fails, the ASG detects the unhealthy instances and launches replacements
in the remaining AZ. Combined with the ALB routing only to healthy targets, the
system degrades gracefully instead of failing completely.

## 7. Cost Awareness in Scaling

Scaling increases cost. Every additional instance adds compute, network, and
storage cost. Poor scaling policies lead to:

- **Overprovisioning** — running 8 instances at 3am when 2 would suffice
- **Budget shock** — unexpectedly large AWS bill after a traffic spike
- **Underutilized infrastructure** — paying for capacity that is never used

**Cost control mechanisms:**

```
Maximum capacity limit — hard ceiling on instance count
Scale-in aggressively — remove instances quickly after load drops
Instance type selection — right-size for the workload
Savings Plans — commit to baseline capacity for 40-60% discount
```

Monitor your AWS Cost Explorer after your first scaling event. Understand exactly
what the scaling event cost. Architecture must balance performance, availability,
and cost — not optimise for only one of them.

## 8. Failure Simulation

You do not know your scaling works until you test it deliberately.

### Scenario 1 — Instance failure

Terminate one instance manually in the EC2 console while watching:

```bash title="Terminal — watch from AWS CLI"
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names your-asg-name \
  --query 'AutoScalingGroups[0].Instances[*].{ID:InstanceId,Health:HealthStatus}'
```

Observe:
- ASG detects the terminated instance within 1-2 minutes
- A replacement instance launches automatically
- ALB removes the failed instance from rotation immediately
- Traffic continues to the remaining healthy instance

If traffic stops completely, your minimum capacity is set to 1 or your health
checks are misconfigured.

### Scenario 2 — Traffic spike simulation

Generate load against your ALB:

```bash title="Terminal — requires Apache Bench"
ab -n 10000 -c 100 http://your-alb-dns-name/

# Or using hey (more modern)
hey -n 10000 -c 100 http://your-alb-dns-name/
```

Watch in CloudWatch:
- `CPUUtilization` metric climbs on existing instances
- Scaling policy triggers when threshold is breached
- New instances launch and join the target group
- CPU returns to target threshold

Response time should stabilise as new instances enter rotation — not degrade
linearly with load.

## 9. Common Scaling Mistakes

| Mistake | Consequence |
|---|---|
| Scaling only vertically | Single point of failure remains |
| No health checks configured | Failed instances continue receiving traffic |
| Minimum 1 instance in ASG | Single instance failure = outage during replacement |
| Scale-in too aggressive | Instances terminate before long requests complete |
| No scale-in protection on draining instances | Connections dropped mid-request |
| Scaling threshold too low | Constant thrashing, excessive cost |
| No monitoring during scaling events | Cannot validate or tune the policy |

Scaling must be validated, not assumed. If you have not terminated an instance and
watched the ASG recover, you do not know that it works.

## 10. Lab Assignment

Deploy and test:

1. An Application Load Balancer in your public subnets
2. A target group with `/health` health check, 30s interval
3. An Auto Scaling Group with minimum 2 instances across two AZs
4. A target tracking scaling policy at 60% CPU

Then simulate:

1. Terminate one instance — record time to detection and replacement
2. Generate a traffic spike — observe scaling event in CloudWatch
3. Stop the traffic — observe scale-in after cooldown period

**Document:**

- How traffic is routed from the ALB to your instances
- How instance replacement occurs — what triggers it and what happens
- Which metric triggered your scaling event
- What cost impact the scaling event had — check the Cost Explorer

If you cannot trace the full scaling behavior from trigger to completion, you do
not control your elasticity.

## 11. Production Reflection

Consider these questions before moving on:

- What happens if your scaling threshold is set too low — scaling at 20% CPU?
- What happens if your health check path returns 500 for a non-fatal reason?
- How do you prevent scale-in from terminating instances during a traffic dip that
  immediately spikes again? (Hint: look at scale-in protection and cooldown)
- How do you protect your database when your application tier scales to 10 instances
  and suddenly generates 10x the database connections?

Scaling must coordinate across tiers. An application that scales without accounting
for database connection limits will scale itself into a database outage.

## Module Completion Criteria

You are ready for Module 4 when:

- [ ] Your ALB distributes traffic across instances in both AZs
- [ ] Your ASG automatically replaces a terminated instance
- [ ] Your scaling policy reacts predictably to CPU load
- [ ] You have observed a scaling event end-to-end in CloudWatch
- [ ] You understand the cost impact of a scaling event
- [ ] You can simulate controlled failure and document the recovery behavior

---

**Next:** [Module 4 – Infrastructure as Code with Terraform](./module-4-terraform)
