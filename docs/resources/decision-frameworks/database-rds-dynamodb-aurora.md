---
title: RDS vs Aurora vs DynamoDB — AWS Database Decision Guide
description: Three AWS managed database services that overlap more than they should. A production framework for choosing correctly.
tags: [aws, architecture, database, decision-framework]
---

# RDS vs Aurora vs DynamoDB — AWS Database Decision Guide

AWS has three primary managed database offerings and the choice between them is one of the most consequential architectural decisions you will make. Getting it wrong means either rewriting your data access layer later or accepting years of operational pain.

## The Fundamental Split

Before the details, understand the core divide:

- **RDS and Aurora** are relational databases. Your data has a schema. You write SQL. Relationships between tables are enforced.
- **DynamoDB** is a NoSQL key-value and document store. No schema. No joins. Access patterns are defined at design time.

This is not a performance decision. It is a data model decision. If your data is relational, the answer is RDS or Aurora. If it is not, DynamoDB may fit. Choosing DynamoDB to "get performance" with relational data is one of the most expensive architectural mistakes in AWS.

---

## RDS — Managed Relational Database

RDS manages the operational overhead of running a relational database: backups, patching, failover, replicas. You still choose and configure the engine.

**Available engines:** PostgreSQL, MySQL, MariaDB, Oracle, SQL Server

**Choose RDS when:**

- Your data is structured with relationships between entities
- You need ACID transactions across multiple tables
- Your team knows SQL and your access patterns are query-flexible
- You want to start simple without committing to Aurora pricing
- You need a specific engine version or feature (e.g., PostGIS on PostgreSQL for geospatial data)

**RDS in production looks like:**
- A primary instance handling reads and writes
- One or more read replicas for read scaling
- Multi-AZ for automatic failover (synchronous standby in a second AZ)
- Automated backups with point-in-time recovery

**RDS limitations to understand:**
- Vertical scaling only for writes — you can increase instance size, but writes go to one primary
- Read replicas help read throughput but add replication lag
- Storage is provisioned EBS — you choose the size and IOPS upfront (or use gp3 auto-scaling)
- Maximum storage: 64TB

---

## Aurora — RDS with a Different Storage Engine

Aurora is AWS's own relational database engine, compatible with PostgreSQL and MySQL. It is not a different product category — it is still a relational database. The difference is the storage layer.

**What Aurora does differently:**

Aurora separates compute from storage. The storage layer is a distributed, self-healing system that replicates data across 6 copies in 3 AZs automatically. This changes the failure characteristics significantly — you can lose two full AZ copies and still have four remaining, with no data loss.

**Aurora-specific features that matter:**

- **Aurora Serverless v2** — scales compute capacity automatically from 0.5 to 128 ACUs. Scales in and out in seconds. Useful for workloads with highly variable traffic or dev environments where you want to minimise cost.
- **Aurora Global Database** — single primary region with read replicas in up to 5 other regions. Replication lag typically under 1 second. Useful for disaster recovery or serving reads closer to global users.
- **Aurora I/O-Optimised** — flat pricing for storage I/O instead of per-million request pricing. Better economics for I/O-heavy workloads.

**Choose Aurora (over RDS) when:**

- You need faster failover (Aurora typically recovers in under 30 seconds vs 60-120s for RDS Multi-AZ)
- You want storage to grow automatically without pre-provisioning
- You need global replication
- Your workload has variable traffic and Aurora Serverless v2 economics make sense
- You are already at scale where Aurora's performance advantages matter

**Choose RDS (over Aurora) when:**

- Cost is a constraint — Aurora is roughly 20% more expensive than equivalent RDS
- You need a specific engine feature Aurora does not support (certain PostgreSQL extensions, etc.)
- You are on SQL Server or Oracle — Aurora does not support these engines

---

## DynamoDB — When Your Access Patterns Are Fixed

DynamoDB is fundamentally different from RDS and Aurora. The correct mental model is not "a faster database" — it is "a different kind of database."

In DynamoDB, you design your table around how you will query it, not around your data model. Every query must use the partition key and optionally the sort key. There are no joins. There are no ad-hoc queries.

**Choose DynamoDB when:**

- Your access patterns are known, fixed, and key-based: "get all orders for customer X", "get session data for token Y"
- You need single-digit millisecond latency at any scale with no tuning
- Your workload has extreme traffic spikes and you need to scale instantly (DynamoDB has no connection limits, no instance sizing)
- You are building serverless architectures with Lambda — DynamoDB integrates natively with Lambda triggers via Streams
- Your data does not have complex relationships between entities

**DynamoDB in practice:**
```
Table: Orders
Partition Key: customerId
Sort Key: orderDate#orderId

Access pattern: "Get all orders for customer X in last 30 days"
Query: PK = customerId, SK BETWEEN 2026-01-01 AND 2026-04-30
```

**Where DynamoDB breaks in production:**

- **Reporting and analytics** — complex aggregations, multi-table joins, GROUP BY queries do not exist. Export to S3 + Athena or use DynamoDB zero-ETL to Redshift.
- **Evolving access patterns** — adding a new query type often requires a new Global Secondary Index (GSI) and potentially backfilling data
- **Items over 400KB** — hard limit. Store large payloads in S3 and reference from DynamoDB
- **Hot partitions** — if many requests hit the same partition key (e.g., a viral post's comment count), you will get throttled. Design partition keys for even distribution.

---

## Side-by-Side Reference

| | RDS | Aurora | DynamoDB |
|---|---|---|---|
| Data model | Relational | Relational | Key-value / Document |
| Query language | SQL | SQL | PartiQL / API |
| Joins | ✓ | ✓ | ✗ |
| ACID transactions | ✓ | ✓ | Limited (TransactWrite) |
| Automatic scaling | Storage only (gp3) | Storage + Serverless v2 | Fully automatic |
| Max storage | 64TB | 128TB | Unlimited |
| Failover time | 60-120s | ~30s | N/A (serverless) |
| Global replication | Read replicas | Global Database | Global Tables |
| Best for | Standard relational workloads | High availability / variable scale | High-throughput key lookups |

---

## The Decision

```
Do you need SQL / relational data model?
├── YES → How important is availability and automatic scaling?
│         ├── Cost-sensitive or simpler needs → RDS (PostgreSQL recommended)
│         └── High availability, variable traffic, global → Aurora
└── NO  → Are your access patterns fixed and key-based?
          ├── YES → DynamoDB
          └── NO  → Reconsider your data model, or use RDS with a flexible schema approach
```

**The default for most new workloads:** Aurora PostgreSQL Serverless v2. It starts cheap, scales automatically, and you get the full flexibility of PostgreSQL with Aurora's operational advantages. Move to provisioned Aurora or RDS if the Serverless pricing becomes unfavourable at sustained load.
