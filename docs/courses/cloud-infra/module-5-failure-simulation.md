---
id: module-5-failure-simulation
title: Module 5 – Failure Simulation
sidebar_label: Module 5 – Failure Simulation
description: Learn how to validate infrastructure resilience through controlled failure scenarios. Covers instance failure, AZ loss, database interruption, resource exhaustion, network partitions, and recovery time measurement.
---

# Module 5 – Failure Simulation

## If You Don't Simulate Failure, Production Will

Infrastructure is not validated during deployment.

It is validated during failure.

Failure simulation reveals:

- Weak segmentation
- Poor scaling policy
- IAM overexposure
- Hidden coupling
- Inadequate redundancy

Resilience is not assumed. It is tested.

---

## 1. Failure Philosophy

A resilient system must be able to:

- Detect failure
- Contain failure
- Recover automatically
- Minimise user impact

If one component fails and the entire system collapses, the architecture is flawed — not just that component.

**Failure simulation is controlled chaos.** It exposes the gaps between what you designed and what actually holds under pressure.

---

## 2. Instance-Level Failure

### Testing Auto Scaling and Health Checks

**Scenario:** Terminate one application instance manually.

Observe:

- Load balancer health check marks the instance as unhealthy
- Auto Scaling Group launches a replacement instance
- Traffic continues flowing without manual intervention

**Questions to answer:**

- How long did recovery take?
- Did users experience any downtime?
- Did the scaling policy behave as expected?

If recovery required manual action, the scaling design is incomplete.

---

## 3. Availability Zone Failure

### Testing Multi-AZ Resilience

Simulate an AZ failure by disabling or terminating all instances in a single availability zone.

Observe the load balancer's response.

**Expected behaviour:**

- Traffic automatically routes to the surviving AZ
- The system remains available throughout

**If an outage occurs, investigate:**

- Whether instances are distributed across AZs
- Whether the load balancer is configured for multi-AZ
- Whether the Auto Scaling group is configured with the correct AZ settings

High availability must be validated — not assumed.

---

## 4. Database Interruption

### Testing Dependency Handling

Simulate a database failure using one of the following methods:

- Stop the database service
- Block the database security group inbound rule
- Remove the route to the database subnet temporarily

**Observe:**

- Application error messages — are they informative or generic?
- Retry behaviour — does the application retry gracefully or crash immediately?
- Log entries — is the failure visible and actionable?
- Alert triggers — did monitoring detect the failure?

If the application crashes entirely on database loss, dependency handling is weak.

Architecture must assume downstream failures and degrade gracefully rather than collapse.

---

## 5. Security Misconfiguration Testing

### Testing Blast Radius

Temporarily modify security configurations and observe the impact:

- Remove an inbound rule from the application security group
- Restrict IAM role permissions beyond what the application expects
- Deny database access from the application tier

**Observe:**

- What breaks — and what does not?
- How quickly is the failure visible?
- Are logs and alerts helpful in identifying the root cause?

Security failures often present as system failures. You must be able to differentiate between a network issue, a permissions issue, and an application bug — your observability stack needs to support that distinction.

---

## 6. Resource Exhaustion Simulation

### Testing Scaling and Alerting

**CPU Saturation**

Stress application instances by generating a traffic spike.

Observe scaling triggers and monitor CPU metrics.

Questions to answer:

- Did Auto Scaling trigger as expected?
- Was the scaling threshold set appropriately?
- Was the scaling response fast enough to prevent degradation?

**Memory Pressure**

Simulate memory exhaustion by deploying a memory-heavy workload.

Observe:

- Swap behaviour
- Instance degradation under pressure
- Whether the application crashes before scaling can respond

If the application crashes before scaling triggers, threshold tuning is incorrect.

**Storage Exhaustion**

Simulate disk fill by writing to the root or data volume until it approaches capacity.

**Expected behaviour:**

- An alert triggers before the volume reaches a critical threshold
- Scaling activity does not mask the underlying storage issue

Storage exhaustion often bypasses scaling protections entirely — it requires dedicated alerting.

---

## 7. Network Partition Simulation

### Testing Internal Communication

Simulate a network partition using one of the following methods:

- Remove a private subnet route
- Block an internal security group rule between tiers

**Observe:**

- Application-to-database communication failure
- Log clarity — can you identify the partition from logs alone?
- Monitoring response — how quickly did dashboards reflect the failure?

Network partitions expose hidden coupling between components. Distributed systems must be designed to tolerate partial isolation, not require full connectivity to remain operational.

---

## 8. Observability During Failure

During every simulation, actively monitor:

- CPU usage
- Memory usage
- Disk usage
- Application logs
- Auto Scaling activity
- Load balancer target health

**Failure simulation without monitoring is blind testing.** The value is not in breaking things — it is in understanding how your system behaves when things break.

---

## 9. Recovery Time Measurement

After each simulation, measure:

- **Detection time** — how long until the failure was identified
- **Recovery initiation time** — how long until corrective action began
- **Full recovery completion time** — how long until the system was fully restored

**Key metrics:**

- **MTTD** — Mean Time To Detect
- **MTTR** — Mean Time To Recover

Architecture must minimise both. Reducing MTTD means better observability. Reducing MTTR means better automation and runbook quality.

---

## 10. Cost Impact of Failure

Resilience has a cost. During simulation, observe:

- Did scaling events increase costs unexpectedly?
- Did replacement instances temporarily double usage?
- Did cross-AZ data transfer spike during failover?

Architecture must balance reliability and budget. Understand the cost profile of your resilience mechanisms before production traffic exposes it.

---

## 11. Failure Documentation Template

For each simulation, document the following:

| Field | Details |
|---|---|
| Scenario | What was simulated |
| Expected behaviour | What should have happened |
| Actual behaviour | What actually happened |
| Root cause | Why unexpected results occurred |
| Recovery time | MTTD and MTTR measurements |
| Lessons learned | Key takeaways |
| Design improvements | Architecture changes to address weaknesses |

Failure documentation builds operational maturity. An undocumented failure is a failure that will repeat.

---

## 12. Lab Assignment

Simulate all of the following:

1. Terminate one application instance and observe Auto Scaling recovery
2. Simulate AZ-level instance loss and observe traffic routing
3. Interrupt database connectivity and observe application behaviour
4. Remove a security group rule temporarily and observe blast radius
5. Generate a traffic spike to trigger Auto Scaling
6. Fill storage to 90% and observe alerting behaviour
7. Document recovery behaviour for each scenario

**Deliverable**

Produce a resilience report that includes:

- Recovery timelines (MTTD and MTTR for each scenario)
- Observed weaknesses in the current architecture
- Proposed architecture improvements
- Cost implications of the resilience mechanisms observed

> If you cannot explain how your system behaves under failure, you do not control it.

---

## 13. Production Reflection

Consider the following before signing off on this module:

- What single failure would cause a total outage in your current architecture?
- What would happen if the Terraform state file was lost?
- What happens if the NAT Gateway fails — can private instances still function?
- Is Auto Scaling masking deeper design flaws rather than solving them?
- How would you implement chaos engineering safely in a production environment?

Resilience is iterative. Each failure simulation should produce a concrete improvement to the architecture — not just a report.

---

## Course Completion Criteria

You have completed the Cloud Infrastructure Engineering course when:

- ✅ VPC is segmented intentionally, with clear traffic boundaries
- ✅ IAM is least-privilege enforced — no wildcard permissions in production
- ✅ Scaling is health-driven and validated under real load
- ✅ Infrastructure is fully code-defined with no console drift
- ✅ Failures are tested, documented, and understood
- ✅ Recovery time is measurable and within acceptable thresholds

You are no longer deploying cloud infrastructure.

