---
id: module-4-infrastructure-as-code-terraform
title: Module 4 – Infrastructure as Code (Terraform)
sidebar_label: Module 4 – IaC (Terraform)
description: Learn how to define, manage, and reproduce cloud infrastructure using Terraform. Covers declarative configuration, state management, modular design, drift detection, and safe deployment workflows.
---

# Module 4 – Infrastructure as Code (Terraform)

## If You Cannot Recreate It, You Do Not Control It

Cloud consoles are convenient.

They are also dangerous.

Manual configuration leads to:

- Drift
- Inconsistent environments
- Hidden changes
- Audit difficulty
- Recovery delays

Infrastructure as Code (IaC) converts infrastructure into:

- Declarative configuration
- Version-controlled artifacts
- Reproducible environments

Terraform is the tool used in this module to enforce that discipline.

---

## 1. Declarative Infrastructure

### Desired State Engineering

Terraform works on a simple principle:

> You define desired state. Terraform ensures reality matches it.

Example conceptual resource:

```hcl
resource "aws_instance" "app" {
  instance_type = "t3.micro"
  subnet_id     = var.private_subnet_id
}
```

This is not a script. It is a declaration.

Terraform compares:

- **Desired state** — what the code describes
- **Current state** — what exists in the cloud environment

And reconciles any differences.

---

## 2. Providers and State Management

### Understanding Terraform's Brain

**Provider**

The provider connects Terraform to the cloud platform.

Examples:
- AWS provider
- Azure provider
- Google Cloud provider

The provider translates your code into API calls against the target platform.

**State File**

Terraform maintains a state file that tracks:

- Created resources
- Resource IDs
- Dependency relationships

Without state, Terraform does not know what exists.

**State discipline is critical.**

In production:

- State should be stored remotely (e.g., S3 + DynamoDB for AWS)
- State should be locked to prevent concurrent modifications
- State should never be manually edited

State corruption causes infrastructure instability.

---

## 3. Variable-Driven Architecture

### Designing for Reuse

Avoid hardcoding values.

Instead of:

```hcl
instance_type = "t3.micro"
```

Use:

```hcl
instance_type = var.instance_type
```

Variables allow:

- Environment separation (dev, staging, prod)
- Region flexibility
- Instance sizing adjustments
- CIDR block reusability

Parameterisation increases scalability and reduces duplication.

---

## 4. Modular Infrastructure Design

### Encapsulation for Maintainability

Large Terraform files become unmanageable quickly.

Use modules to isolate and encapsulate components.

Example module structure:

```
modules/
  vpc/
  security/
  compute/
  database/
```

Each module:

- Accepts defined inputs
- Produces defined outputs
- Is independently reusable

Modular design reduces:

- Code duplication
- Human error
- Long-term maintenance cost

---

## 5. Idempotency

### Safe Repeated Execution

Terraform is idempotent.

Running:

```bash
terraform apply
```

multiple times should always produce the same result — no duplicate resources, no unpredictable side effects.

Idempotency ensures infrastructure remains stable under repeated execution, which is essential in automated pipelines.

---

## 6. Drift Detection

### Detecting Manual Changes

Drift occurs when someone modifies infrastructure outside of Terraform — directly through the console or CLI.

Terraform detects drift via:

```bash
terraform plan
```

If the plan shows unexpected changes, a manual modification occurred outside of code.

**Drift breaks consistency.**

Infrastructure must be controlled through code — not consoles. A console change today is a mystery incident tomorrow.

---

## 7. End-to-End Architecture in Code

By this stage, your Terraform project should define the complete stack:

- VPC
- Public and private subnets
- Internet Gateway
- NAT Gateway
- Security groups
- Load balancer
- Auto Scaling group

All defined in code. This converts architecture into a versioned, auditable artifact.

---

## 8. Dependency Management

Terraform builds resources based on an automatically calculated dependency graph.

Example ordering:

- VPC must exist before subnets
- Subnets must exist before instances
- Instances must exist before Auto Scaling group attachments

Terraform resolves this order automatically. However, poor dependency modelling leads to:

- Race conditions
- Partial failures
- Inconsistent deployments

Be explicit when implicit ordering is ambiguous.

---

## 9. Safe Deployment Workflow

The recommended Terraform workflow:

```bash
terraform init
terraform plan
terraform apply
```

**Never apply without reviewing the plan.**

The plan stage reveals:

- What will be created
- What will be modified
- What will be destroyed

Blind apply is operational negligence.

---

## 10. Destroy Discipline

When testing environments:

```bash
terraform destroy
```

This destroys the entire environment cleanly.

Advantages:

- Cost control — no idle resources running overnight
- Clean test isolation
- No orphaned resources accumulating in the account

Destruction capability is part of engineering control.

> If you cannot destroy and recreate your infrastructure confidently, it is fragile.

---

## 11. Version Control Integration

Terraform code must live in Git.

Benefits:

- Full change history
- Code review before apply
- Rollback capability
- Audit trail for compliance

Infrastructure without version control is undocumented risk.

---

## 12. Lab Assignment

1. Create a Terraform project structure.
2. Define the following resources:
   - VPC
   - Public subnets
   - Private subnets
   - Security groups
   - Load balancer
3. Use variables for:
   - CIDR blocks
   - Instance types
   - Region
4. Run the full deployment workflow:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```
5. Destroy the environment after validation.
6. Recreate from scratch without referencing the console.

**Deliverable**

Be able to explain:

- Why state matters and what happens when it is lost
- How drift is detected and why it is dangerous
- Why modular design improves reliability
- Why console changes undermine infrastructure integrity

> If you cannot destroy and recreate your architecture in under 15 minutes, it is not production-ready.

---

## 13. Production Reflection

Consider the following before moving on:

- How do you secure state files from unauthorised access?
- What is your recovery plan if state is lost or corrupted?
- How do you handle secrets — are credentials hardcoded anywhere?
- How do you manage multiple environments (dev, staging, prod) cleanly?
- How do you prevent accidental deletion in production?

Infrastructure as Code increases control — but only if managed with discipline.

---

## Module Completion Criteria

You are ready for Module 5 when:

- ✅ Infrastructure is fully code-defined
- ✅ No manual changes exist in the environment
- ✅ State is managed properly (remote and locked)
- ✅ Modules are reusable and clearly scoped
- ✅ Environments are reproducible from a clean state

---

**Next:** [Module 5 – Failure Simulation](./module-5-failure-simulation)
