---
title: S3 vs EBS vs EFS — AWS Storage Decision Guide
description: Three storage services that seem to overlap but solve completely different problems. A production framework for choosing correctly.
tags: [aws, architecture, storage, decision-framework]
---

# S3 vs EBS vs EFS — AWS Storage Decision Guide

AWS has three primary storage services and they are frequently confused with each other — especially by engineers coming from on-premises where "storage" meant a file server or a SAN. Each one solves a different problem at a different layer.

## The Fundamental Distinction

Before comparing features:

- **S3** is object storage. You access it over HTTP. It is not a filesystem.
- **EBS** is a block device. It attaches to one EC2 instance like a hard drive.
- **EFS** is a network filesystem. Multiple instances mount it simultaneously over NFS.

These are not interchangeable. Choosing wrong is not a configuration problem — it is an architecture problem.

---

## S3 — Object Storage for Everything Else

S3 is the most versatile AWS storage service. It is not a filesystem and it does not behave like one — but for most workloads, you do not need a filesystem.

**What S3 actually is:** A key-value store where the key is a path-like string (`reports/2026/april/summary.csv`) and the value is the object content. There are no real directories. The slashes are cosmetic.

**Choose S3 when:**

- You are storing files that are uploaded, retrieved, or downloaded — not continuously read/written by a process
- You need to serve static assets (images, JS, CSS, video) directly or via CloudFront
- You are storing backups, logs, exports, or data lake files
- You need cross-region replication, versioning, or lifecycle policies
- Your data needs to be accessible by multiple services or accounts
- You are storing Lambda deployment packages, ECS container image layers, or CloudFormation templates

**S3 access patterns that work:**
```
# Upload a file
aws s3 cp report.csv s3://my-bucket/reports/2026/report.csv

# Download a file
aws s3 cp s3://my-bucket/reports/2026/report.csv ./report.csv

# Serve via pre-signed URL (time-limited access)
aws s3 presign s3://my-bucket/reports/2026/report.csv --expires-in 3600
```

**Where S3 breaks:**
- You cannot `tail -f` an S3 object — it is not a stream
- You cannot lock a file across multiple writers without external coordination
- Listing large buckets is slow and expensive at scale (LIST operations cost money)
- Eventual consistency for overwrite operations in some regions (though S3 is now strongly consistent for new objects)

**Warning sign:** You are downloading an S3 file to EC2 on every request to process it — your architecture likely needs rethinking. Either process it at upload time with Lambda, or cache it on EBS.

---

## EBS — Block Storage for Your Instance

EBS is a network-attached block device. From the operating system's perspective it looks like a local hard drive. It formats, partitions, and mounts like one. It is not local — it runs over the network — but the latency is low enough that for most workloads it feels local.

**Key constraint:** One EBS volume attaches to one EC2 instance at a time (with the exception of EBS Multi-Attach for io1/io2 volumes, which has significant limitations and is rarely the right answer).

**Choose EBS when:**

- Your application writes to a local filesystem path (`/var/lib/postgresql/data`, `/opt/app/uploads`)
- You need a database volume — RDS uses EBS under the hood
- You need fast, consistent IOPS for a single instance workload
- You are running stateful software that expects block-level access

**EBS volume types that matter in practice:**

| Type | Use case |
|---|---|
| gp3 | Default for most workloads. Better price/performance than gp2. |
| io2 | High-performance databases requiring guaranteed IOPS (Postgres, MySQL at scale) |
| st1 | Throughput-optimised for sequential reads — Kafka, Hadoop, log processing |
| sc1 | Cold storage. Lowest cost, lowest performance. Infrequently accessed data. |

```bash
# Check what volumes are attached to your instance
lsblk

# See how a volume is mounted and how full it is
df -h

# Extend a volume after resizing in console (no reboot needed for newer kernels)
sudo growpart /dev/xvda 1
sudo xfs_growfs /
```

**Where EBS breaks:**
- Multiple instances need the same data simultaneously — EBS cannot do this
- Your instance terminates and restarts on a different host — you must re-attach the volume
- You need storage that scales beyond a single volume (16TB max for gp3)

---

## EFS — Shared Filesystem Across Multiple Instances

EFS is a managed NFS filesystem. Multiple EC2 instances, ECS tasks, or Lambda functions can mount it simultaneously and all see the same files. It scales automatically — no provisioning required.

**Choose EFS when:**

- Multiple compute resources need access to the same files at the same time
- You are running a containerised application that needs shared persistent storage across ECS tasks
- You are running a CMS, a media processing pipeline, or any workload where instances share a working directory
- You need a POSIX-compliant filesystem (file locking, permissions, ownership)
- You want storage that grows and shrinks automatically without managing volume size

**Common EFS patterns:**

```bash
# Mount EFS on EC2 (requires amazon-efs-utils)
sudo mount -t efs fs-0abc1234:/ /mnt/efs

# Or via fstab for persistent mount
fs-0abc1234:/ /mnt/efs efs defaults,_netdev 0 0
```

In ECS task definitions:
```json
{
  "volumes": [{
    "name": "shared-data",
    "efsVolumeConfiguration": {
      "fileSystemId": "fs-0abc1234",
      "rootDirectory": "/app/uploads"
    }
  }]
}
```

**Where EFS breaks:**
- Performance-sensitive database workloads — NFS latency is higher than EBS. Do not run Postgres on EFS.
- Simple single-instance workloads — EFS costs more than EBS for the same data volume; there is no reason to use it if only one instance needs the data
- Windows workloads — EFS is NFS, which is a POSIX protocol. Use FSx for Windows instead.

**Cost warning:** EFS Standard charges per GB stored with no provisioning. This is convenient but can become expensive for large datasets. EFS Infrequent Access tier reduces cost for files not accessed frequently — enable lifecycle policies.

---

## Side-by-Side Decision Reference

| Question | S3 | EBS | EFS |
|---|---|---|---|
| Multiple instances need the same data? | ✓ (via API) | ✗ | ✓ (mounted) |
| Application writes to a local path? | ✗ | ✓ | ✓ |
| Need a filesystem (ls, chmod, tail)? | ✗ | ✓ | ✓ |
| Storing uploads / exports / backups? | ✓ | ✗ | ✗ |
| Database storage? | ✗ | ✓ | ✗ |
| Scales automatically? | ✓ | Manual resize | ✓ |
| Accessible over HTTP? | ✓ | ✗ | ✗ |
| POSIX compliant? | ✗ | ✓ | ✓ |

---

## The Pattern Most Production Systems Use

```
                    ┌─────────────────────┐
                    │    Application       │
                    └──────┬──────────────┘
                           │
          ┌────────────────┼──────────────────┐
          │                │                  │
          ▼                ▼                  ▼
    EBS Volume        EFS Mount           S3 Bucket
  /var/lib/db       /app/uploads       s3://backups/
  (database         (shared files      (exports,
   data)             between tasks)     archives)
```

Each storage layer is doing what it is designed for. The database gets block storage. The shared application uploads directory gets a network filesystem. Archives and exports go to object storage. This is not over-engineering — it is using each tool correctly.
