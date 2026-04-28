---
title: Security & Compliance
description: Secrets management, IAM design, and security hardening in production DevOps environments.
---

# Security & Compliance

Security in DevOps is not a phase at the end of a pipeline — it is a property of the system from the start. This section documents practical security implementations for real infrastructure.

---

## Secrets Management in CI/CD Pipelines

**Problem:** Environment variables containing database passwords, API keys, and tokens were stored in plaintext in `.env` files committed to the repository. Every developer had access to production secrets. There was no audit trail.

**Goal:** Remove secrets from code entirely, enforce least-privilege access, and create an audit trail for every secret access.

### The Wrong Way (What Not To Do)

```bash
# This is what was happening — never do this
DB_PASSWORD=mysecretpassword123
AWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE
JWT_SECRET=hardcoded-secret-in-repo
```

If this is in your `.env` file and it gets committed even once, consider it compromised — git history is permanent.

### Solution 1 — AWS Secrets Manager

Store secrets in AWS Secrets Manager and fetch them at runtime. The application never sees the secret in an environment variable — it fetches it from the API using an IAM role.

```python title="secrets.py"
import boto3
import json
from botocore.exceptions import ClientError

def get_secret(secret_name: str, region: str = "us-east-1") -> dict:
    client = boto3.client("secretsmanager", region_name=region)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        return json.loads(response["SecretString"])
    except ClientError as e:
        raise RuntimeError(f"Failed to fetch secret {secret_name}: {e}")

# Usage — no secrets in code, no secrets in environment variables
db_config = get_secret("production/myapp/database")
db_password = db_config["password"]
```

The IAM role attached to your EC2 instance or ECS task needs only this permission:

```json title="iam-policy.json"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:production/myapp/*"
    }
  ]
}
```

Note the `*` at the end scoped to `production/myapp/` — this role can only read secrets in that path, not anything else in Secrets Manager.

### Solution 2 — GitHub Actions Secrets

For CI/CD pipelines, use GitHub Actions encrypted secrets. These are never exposed in logs and are only available to the workflow run.

```yaml title=".github/workflows/deploy.yml"
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
```

:::info
Never echo secrets in workflow steps. GitHub will mask known secrets in logs, but if you manipulate the string (base64 encode, split it), the masking breaks and the value appears in plain text.
:::

### Solution 3 — HashiCorp Vault (Self-Hosted)

For environments where you cannot use AWS Secrets Manager, Vault provides a self-hosted secrets engine with fine-grained access control and full audit logging.

```bash
# Start Vault in dev mode (local testing only)
vault server -dev

# Store a secret
vault kv put secret/myapp/database \
  password="mysecretpassword" \
  username="appuser"

# Fetch a secret
vault kv get -field=password secret/myapp/database
```

Every secret read is logged. You can see exactly which service accessed which secret and when.

### Detecting Leaked Secrets

If you suspect a secret has been committed to git:

```bash
# Scan your entire git history for secrets
pip install trufflehog
trufflehog git file://. --only-verified

# If a secret is found in history, rotate it immediately
# Then remove it from history (this rewrites history — coordinate with your team)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

:::danger
Rotating the secret is more important than cleaning the history. Clean the history after the new secret is in production and the old one is revoked.
:::

### Lessons Learned

- Treat every secret that has ever touched a git repo as compromised, regardless of whether the repo is private
- Rotate secrets on a schedule — quarterly at minimum — not only when breached
- Use different secrets per environment — production, staging, and development should never share credentials
- An audit trail is not optional in production — you need to know who accessed what and when

---

## IAM Least-Privilege Design

The most common AWS security mistake is over-permissioned IAM roles. `AdministratorAccess` on an EC2 instance means that if the instance is compromised, the attacker has full control of your AWS account.

### The Principle

An IAM role should have exactly the permissions it needs to do its job — nothing more. Start with no permissions and add only what the application actually calls.

### How To Find What Permissions You Need

```bash
# Run your application with CloudTrail enabled
# Then check what API calls it actually made
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=my-app-role \
  --start-time 2026-01-01 \
  --output json | jq '.Events[].CloudTrailEvent' | jq -r '.eventName' | sort | uniq
```

Build your IAM policy from that list — not from guessing.

### Example — Scoped S3 Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadApplicationAssets",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-assets",
        "arn:aws:s3:::my-app-assets/*"
      ]
    },
    {
      "Sid": "WriteUploads",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-app-assets/uploads/*"
    }
  ]
}
```

This role can read anything in the bucket, but can only write or delete inside `uploads/`. It cannot delete the bucket, change its policy, or access any other bucket.
