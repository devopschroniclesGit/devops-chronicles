---
title: Case Studies
description: Real deployment projects with full documentation, architectural decisions, and lessons learned.
---

# Case Studies

Real projects built and documented from production experience. Each case study includes the problem statement, architecture decisions, implementation steps, what went wrong, and what was learned.

---

## Deploying a Web Application Using AWS Elastic Beanstalk

**Problem:** Deploy a Node.js web application to AWS with auto scaling, load balancing, and environment-specific configuration — without managing EC2 instances manually.

**What Elastic Beanstalk does:** It provisions and manages the underlying infrastructure — EC2 instances, an Application Load Balancer, an Auto Scaling Group, and CloudWatch monitoring — while you focus on deploying application code.

### Architecture

```
Internet
    │
    ▼
Application Load Balancer
    │
    ├── EC2 Instance (AZ-1a)  ← Auto Scaling Group
    └── EC2 Instance (AZ-1b)  ← minimum 2, maximum 6
            │
            ▼
    RDS (PostgreSQL) — Multi-AZ
```

### Step 1 — Initialise the Application

```bash
# Install the EB CLI
pip install awsebcli

# Initialise from your project root
eb init my-app --region us-east-1 --platform node.js-18
```

This creates `.elasticbeanstalk/config.yml`. Commit this file — it defines which platform and region your app targets.

### Step 2 — Create the Environment

```bash
eb create production-env \
  --instance-type t3.small \
  --min-instances 2 \
  --max-instances 6 \
  --elb-type application
```

:::warning
Do not use `t2.micro` in production. Burstable instances exhaust CPU credits under sustained load and throttle silently. Use `t3.small` as your minimum.
:::

### Step 3 — Configure Auto Scaling

Create `.ebextensions/autoscaling.config`:

```yaml
option_settings:
  aws:autoscaling:trigger:
    MeasureName: CPUUtilization
    Unit: Percent
    UpperThreshold: "70"
    LowerThreshold: "30"
    BreachDuration: "5"
    Period: "5"
  aws:autoscaling:asg:
    Cooldown: "300"
```

**What these values mean:**
- Scale out when CPU stays above 70% for 5 consecutive minutes
- Scale in when CPU drops below 30% for 5 consecutive minutes
- Wait 5 minutes (cooldown) between scaling actions to avoid thrashing

### Step 4 — Health Check Endpoint

Elastic Beanstalk needs a health check endpoint to know whether your app is running correctly. Without this, the load balancer has no way to detect a broken deployment.

```js title="app.js"
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

```yaml title=".ebextensions/healthcheck.config"
option_settings:
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /health
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckInterval: 30
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3
```

### Step 5 — Environment Variables

Never hardcode secrets or environment-specific values in your code.

```bash
eb setenv \
  NODE_ENV=production \
  DATABASE_URL=postgres://user:pass@host:5432/dbname \
  JWT_SECRET=your-secret-here
```

These are encrypted at rest by AWS and injected at runtime as environment variables.

### Step 6 — Deploy

```bash
eb deploy production-env --label "v1.0.0"

# Watch the deployment
eb events --follow

# Check instance health
eb health
```

### What Went Wrong

- **First deploy failed** because the health check path was `/` and the app returned a full HTML page with a 200 but the load balancer expected a fast JSON response. Changed to `/health` returning JSON in under 50ms.
- **Auto scaling thrashed** during initial load testing because the cooldown was set to 60 seconds. Increased to 300 seconds.
- **Environment variables disappeared** after an environment rebuild. Learned that `eb setenv` values are tied to the environment, not the application. Documented them in a `.env.example` file in the repo.

### Lessons Learned

- Always configure a dedicated `/health` endpoint — not just `/`
- Set auto scaling cooldowns to at least 5 minutes to prevent thrashing
- Treat `.ebextensions/` as infrastructure code — commit it and version it

---

## Streamlining Deployment with AWS CodeDeploy

**Problem:** Deployments to EC2 were manual SSH-based processes — error-prone, inconsistent, and impossible to audit. The goal was to automate deployments with rollback capability and deployment history.

**What CodeDeploy does:** Automates application deployments to EC2, on-premises servers, Lambda, or ECS. It supports in-place and blue/green deployment strategies.

### Architecture

```
GitHub repo (push to main)
    │
    ▼
GitHub Actions (CI — build + test)
    │
    ▼
S3 bucket (deployment artifact .zip)
    │
    ▼
CodeDeploy Application
    │
    ├── Deployment Group (production)
    │       │
    │       ├── EC2 Instance 1 (tagged: env=production)
    │       └── EC2 Instance 2 (tagged: env=production)
    │
    └── Deployment Strategy: Rolling — 50% at a time
```

### The AppSpec File

The `appspec.yml` file sits at the root of your repo and tells CodeDeploy exactly what to do at each stage of the deployment.

```yaml title="appspec.yml"
version: 0.0
os: linux
files:
  - source: /
    destination: /var/www/myapp
hooks:
  BeforeInstall:
    - location: scripts/stop_server.sh
      timeout: 60
      runas: root
  AfterInstall:
    - location: scripts/install_dependencies.sh
      timeout: 120
      runas: root
  ApplicationStart:
    - location: scripts/start_server.sh
      timeout: 60
      runas: root
  ValidateService:
    - location: scripts/validate.sh
      timeout: 30
      runas: root
```

### Deployment Scripts

```bash title="scripts/stop_server.sh"
#!/bin/bash
if systemctl is-active --quiet myapp; then
  systemctl stop myapp
fi
```

```bash title="scripts/start_server.sh"
#!/bin/bash
systemctl daemon-reload
systemctl start myapp
systemctl enable myapp
```

```bash title="scripts/validate.sh"
#!/bin/bash
# Give the app 10 seconds to start
sleep 10

# Check the health endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$response" != "200" ]; then
  echo "Health check failed — got HTTP $response"
  exit 1
fi

echo "Deployment validated — health check passed"
```

### GitHub Actions Integration

```yaml title=".github/workflows/deploy.yml"
name: Deploy to production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Package and upload to S3
        run: |
          zip -r deployment.zip . -x "*.git*"
          aws s3 cp deployment.zip s3://my-deployments-bucket/deployment.zip

      - name: Create CodeDeploy deployment
        run: |
          aws deploy create-deployment \
            --application-name my-app \
            --deployment-group-name production \
            --s3-location bucket=my-deployments-bucket,key=deployment.zip,bundleType=zip
```

### What Went Wrong

- **ValidateService hook timed out** — the app took 15 seconds to start but the validate script ran immediately after `ApplicationStart`. Fixed by adding `sleep 10` before the health check.
- **Rollback did not trigger automatically** — CodeDeploy only auto-rolls back if you configure it. Added `autoRollbackConfiguration` to the deployment group.
- **Wrong IAM permissions** — the EC2 instance role was missing `s3:GetObject` permission on the deployment bucket. Always test IAM permissions before your first real deployment.

### Lessons Learned

- The `ValidateService` hook is the most important one — it is your automated rollback trigger
- Tag EC2 instances consistently from day one — CodeDeploy uses tags to target instances
- Keep deployment scripts simple and idempotent — they must be safe to run multiple times
