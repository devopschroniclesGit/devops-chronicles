# DevOps Chronicles

> Production-grade DevOps engineering — documented from real systems under real constraints.

**Live site:** http://www.devopschronicles.com/

---

## What is DevOps Chronicles?

DevOps Chronicles is a technical documentation and learning platform built by a
DevOps / Systems Engineer operating across Linux infrastructure, cloud platforms,
automation tooling, and production support environments.

Every article, module, and case study on this site comes from something that
actually happened — a misconfiguration that took down a service, a deployment
that failed silently, a scaling decision that looked right on paper and fell apart
in production.

This site exists to document the lessons, failures, and architectural thinking
developed while operating real systems under real constraints.

---

## What you will find here

### Courses

**DevOps Lab Engineering** — 6 modules building a production-style home lab from
scratch. Covers virtualisation architecture, network segmentation, system hardening,
storage engineering, multi-node lab design, and observability foundations.

**Cloud Infrastructure Engineering** — 5 modules covering production AWS
infrastructure design. VPC design principles, Security Groups and IAM strategy,
load balancing and auto scaling, Infrastructure as Code with Terraform, and
failure simulation.

### Projects

Real engineering projects with full documentation:

- **FinPay API** — production-style payment platform built with Node.js,
  PostgreSQL, and Redis. Implements Stripe-inspired idempotency, atomic money
  transfers, and multi-tier rate limiting.
- **AWS Elastic Beanstalk Deployment** — end-to-end deployment with auto scaling
  and zero-downtime deploys.
- **AWS CodeDeploy** — blue/green deployments with lifecycle hooks and automatic
  rollback.

### Resources

Reference guides and tutorials:

- Using an Amazon S3 trigger to invoke a Lambda function
- Understanding database types — SQL, NoSQL, key-value, time-series, graph
- CI/CD pipeline from scratch with GitHub Actions
- Microservices — designing highly scalable systems
- Dockerizing a Node.js application

---

## Tech stack

This site is built with:

- **[Docusaurus 3](https://docusaurus.io/)** — static site generator
- **GitHub Pages** — free hosting
- **GitHub Actions** — automated build and deploy on every push

---

## About the author

I am a DevOps / Systems Engineer operating across Linux infrastructure, cloud
platforms, automation tooling, and production support environments.

My experience spans mission-critical systems where uptime, cost control, security,
and operational clarity matter as much as feature delivery.

Every topic on this site is approached from a production mindset — not a
certification checklist.

---

## Note on source code

This repository contains the compiled output of the DevOps Chronicles site.
The source content is maintained in a private repository to protect the original
writing and course material.

---

*© DevOps Chronicles. Content may not be reproduced or redistributed without
permission.*
