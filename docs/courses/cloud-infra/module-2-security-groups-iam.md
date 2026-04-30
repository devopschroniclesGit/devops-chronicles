---
title: Module 2 – Security Groups & IAM Strategy
sidebar_label: Module 2 – Security Groups & IAM
description: Designing access control that reduces blast radius. Security Groups, IAM policies, least privilege, and layered defence in AWS.
tags: [cloud-infra, aws, iam, security, intermediate]
sidebar_position: 2
---

# Module 2 – Security Groups & IAM Strategy

## Designing Access Control That Reduces Blast Radius

### Security Is Layered, Not Singular

Cloud security is not one control. It is multiple overlapping layers:

- Network segmentation — VPC design from Module 1
- Security Groups — instance-level firewall
- IAM policies — identity and API permissions
- Role separation
- Least privilege enforcement

If one layer fails, another must contain the damage. Security design determines
blast radius. The question is not whether a control will fail — it is how much
damage that failure causes when it does.

## 1. Security Groups

### The Instance-Level Firewall

Security Groups act as virtual firewalls attached directly to EC2 instances, RDS
databases, Lambda functions, and load balancers. They control:

- **Inbound traffic** — what can reach your resource
- **Outbound traffic** — what your resource can reach

They are **stateful** — if inbound traffic is allowed, the return traffic is
automatically permitted without a separate outbound rule. This is different from
NACLs (Network Access Control Lists), which are stateless and require explicit
rules in both directions.

### Inbound Rules

```
✓ Allow HTTP
    Port: 80
    Source: 0.0.0.0/0 (internet)

✓ Allow HTTPS
    Port: 443
    Source: 0.0.0.0/0 (internet)

✓ Allow SSH — restricted to your IP only
    Port: 22
    Source: 105.240.x.x/32 (your public IP)
```

:::danger Never do this
```
Port: 22
Source: 0.0.0.0/0
```
SSH open to the entire internet means your instance is under automated brute-force
attack within minutes of launch. This is the single most common misconfiguration
in AWS. Use your specific IP address (`/32`) or a bastion host.
:::

### Outbound Rules

By default, outbound is fully open — instances can call any external service. This
creates risk:

- Compromised instances can reach command-and-control servers
- Data exfiltration becomes trivial
- Malware can download additional payloads

In production, restrict outbound rules intentionally. Your application tier should
only need to reach the database tier and specific external APIs — not the entire
internet.

## 2. Security Group Design Strategy

Design security groups by **role**, not by instance. Create one security group
per architectural tier, then reference security groups in rules rather than
hardcoding IP addresses.

```
sg-loadbalancer
sg-app
sg-database
```

**Load Balancer (`sg-loadbalancer`):**

| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | HTTP | 80 | `0.0.0.0/0` |
| Inbound | HTTPS | 443 | `0.0.0.0/0` |
| Outbound | HTTP | 8080 | `sg-app` |

**Application Tier (`sg-app`):**

| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | HTTP | 8080 | `sg-loadbalancer` |
| Outbound | PostgreSQL | 5432 | `sg-database` |

**Database Tier (`sg-database`):**

| Direction | Protocol | Port | Source |
|---|---|---|---|
| Inbound | PostgreSQL | 5432 | `sg-app` |
| Outbound | — | — | None |

:::info Why reference security groups instead of IPs?
When you reference `sg-app` as a source, any instance assigned that security group
can connect — regardless of its IP address. This works automatically when Auto
Scaling launches new instances. If you hardcoded IP addresses, every new instance
would require a manual rule update.
:::

This design means the database tier has **no internet exposure**. An attacker who
compromises the load balancer must also compromise an application instance before
reaching the database. Each layer reduces the blast radius.

## 3. IAM — Identity and Access Management

### Controlling Who Can Do What

While Security Groups control network traffic, IAM controls **authority** — which
AWS API calls are permitted and by whom.

IAM defines:

- What a human user can do in the AWS console or via CLI
- What an EC2 instance can do — which AWS services it can call
- What a Lambda function, ECS task, or CodeBuild project can access
- Which API-level actions are permitted on which specific resources

**The critical distinction:** A Security Group can prevent network access to an
RDS database. IAM prevents an EC2 instance from calling `rds:DeleteDBInstance`
even if it has network access. Both layers must be present.

## 4. IAM Policies vs Roles

### Policy

A JSON document that defines permissions. Attached to identities.

```json title="Example — scoped S3 read access"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::devops-chronicles-bucket",
        "arn:aws:s3:::devops-chronicles-bucket/*"
      ]
    }
  ]
}
```

Policies define **what** is allowed. They do nothing on their own — they must be
attached to a role, user, or group.

### Role

An identity that assumes policies. Roles are assigned to:

- EC2 instances (via instance profiles)
- Lambda functions
- ECS tasks
- CI/CD pipelines (CodeBuild, CodePipeline, GitHub Actions)
- Other AWS accounts (cross-account access)

**Applications must use roles. Never embed static access keys in code.**

```bash title="Wrong — credentials in environment variables committed to git"
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

```bash title="Correct — EC2 instance role provides temporary credentials"
# No credentials needed in code
# AWS SDK automatically retrieves credentials from instance metadata
aws s3 cp s3://my-bucket/config.json /opt/app/config.json
```

Hardcoded credentials are an architectural failure. They get committed to git
repositories, discovered by automated scanners, and exploited — often within
hours. Instance roles provide temporary, automatically-rotated credentials with
no management overhead.

## 5. Least Privilege Principle

Grant only what is necessary. Nothing more.

**Bad design — wildcard permissions:**

```json
{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "*"
}
```

This gives full administrative access to the entire AWS account. If this role is
compromised, the blast radius is everything — every service, every region, every
resource.

**Correct design — specific and scoped:**

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject"
  ],
  "Resource": "arn:aws:s3:::devops-chronicles-bucket/*"
}
```

Apply conditions to restrict further:

```json
{
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::devops-chronicles-bucket/*",
  "Condition": {
    "StringEquals": {
      "aws:RequestedRegion": "af-south-1"
    }
  }
}
```

This permission only works from the `af-south-1` region. Even if the credentials
are stolen and used from another region, the call is denied.

## 6. Role Separation Strategy

Separate identities by function. Each function has its own role with only the
permissions it actually needs:

| Role | Purpose | Key permissions |
|---|---|---|
| `app-runtime-role` | Application reads S3, writes logs | `s3:GetObject`, `logs:PutLogEvents` |
| `deployment-role` | CI/CD deploys new versions | `ecs:UpdateService`, `ecr:GetAuthorizationToken` |
| `monitoring-role` | Observability tools read metrics | `cloudwatch:GetMetricData`, `ec2:DescribeInstances` |
| `admin-role` | Human administrators only | Full access — MFA required |

If your monitoring tool is compromised, it should not be able to modify IAM
policies or terminate EC2 instances. Blast radius must be limited by design,
not by hope.

## 7. Defense in Depth

Security Groups and IAM are complementary — not alternatives. Both must be
configured correctly.

**Attack scenario — instance compromised:**

```
Attacker gains shell access to EC2 instance
            │
            ├── Security Group prevents lateral movement
            │   App SG only allows outbound to DB SG on port 5432
            │   Cannot reach other instances or services on arbitrary ports
            │
            └── IAM role limits API blast radius
                App role can only read S3 and write CloudWatch logs
                Cannot call iam:*, ec2:*, or rds:DeleteDBInstance
```

Neither control alone is sufficient. A misconfigured Security Group with a
well-configured IAM role still allows network-based attacks. A correct Security
Group with a wildcard IAM role means a shell gives full AWS account access.

Both layers must hold independently.

## 8. Common Misconfigurations

| Misconfiguration | Risk level | Impact |
|---|---|---|
| SSH open from `0.0.0.0/0` | Critical | Automated brute force within minutes |
| `AdministratorAccess` on app role | Critical | Full account compromise on instance breach |
| Shared IAM users across team members | High | Cannot audit who did what, cannot rotate safely |
| Static credentials in application code | Critical | Credential leakage via git history |
| Default outbound `0.0.0.0/0` | Medium | Data exfiltration, C2 communication |
| Security groups with `0.0.0.0/0` on all ports | Critical | All services exposed |

Security debt accumulates silently. None of these misconfigurations cause immediate
visible failures — they only become catastrophic when something goes wrong.

## 9. Security Testing Exercise

Test your design by deliberately breaking it and observing what fails:

1. **Remove the ALB inbound rule** temporarily — does the application become
   unreachable from the internet while internal traffic still works?

2. **Restrict database inbound incorrectly** — remove the app tier source from
   `sg-database`. Does the application return database connection errors?

3. **Attempt an unauthorised API call** using the instance role:
   ```bash title="On EC2 instance — test IAM boundaries"
   # Try to list all S3 buckets (not in the role policy)
   aws s3 ls
   # Expected: AccessDenied error
   
   # Try the permitted action
   aws s3 cp s3://your-bucket/test.txt .
   # Expected: success
   ```

Understanding what is denied — and why — is as important as understanding what
is allowed. Read the error messages carefully. `AccessDenied` tells you the
request reached IAM. `Connection refused` or timeout tells you the Security Group
blocked it before IAM was involved.

## 10. Lab Assignment

**Design three security groups:**

- Load balancer group — inbound HTTP/HTTPS from internet, outbound to app group
- App tier group — inbound from load balancer group only, outbound to database group
- Database group — inbound from app group only, no outbound internet

**Create three IAM roles:**

- Application runtime role — minimum permissions for your app to function
- Deployment role — permissions needed by CodePipeline/CodeDeploy only
- Monitoring role — read-only CloudWatch and EC2 describe permissions

**Document for each role:**

- Every permission and why the application needs it
- What an attacker could do if this role was compromised
- What breaks if the role is removed entirely

**Deliverable:** A written blast radius analysis per tier. If the application
runtime role is compromised, what can an attacker access? What can they not access?

## 11. Production Reflection

Consider these questions before moving on:

- How would you detect that an IAM role has permissions it never actually uses?
  (Hint: IAM Access Analyzer and credential reports)
- How would you audit all policies for wildcard permissions across your account?
- How would you rotate static credentials safely if they were already in production
  and could not be immediately removed?
- What happens if one overprivileged IAM role is used by 50 EC2 instances and
  one of them is compromised?

Security is continuous governance — not one-time configuration.

## Module Completion Criteria

You are ready for Module 3 when:

- [ ] Security groups enforce segmentation between all three tiers
- [ ] No wildcard IAM permissions exist on any application role
- [ ] No static credentials are embedded anywhere in application code
- [ ] You have tested your security boundaries by attempting to violate them
- [ ] You can explain the blast radius for each tier if it were compromised
- [ ] You understand the difference between Security Group rules and IAM policies

---

**Next:** [Module 3 – Load Balancing & Scaling](./module-3-load-balancing-scaling)
