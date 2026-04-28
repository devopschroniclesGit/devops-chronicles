---
title: Learn How to Set Up a CI/CD Pipeline from Scratch
description: Build a complete CI/CD pipeline for a Go application using GitHub Actions — covering build, test, and deploy stages with real configuration.
tags: [cicd, github-actions, go, automation, intermediate]
---

# Learn How to Set Up a CI/CD Pipeline from Scratch

A CI/CD pipeline automates the path from code commit to running application. Without one, every deployment is a manual process — inconsistent, error-prone, and slow. With one, pushing to `main` triggers a chain: code is built, tested, and deployed without anyone touching a server.

This tutorial builds a complete pipeline for a Go application using GitHub Actions.

## What We Are Building

```
Developer pushes to main
        │
        ▼
GitHub Actions triggers
        │
        ├── Stage 1: Build
        │     └── Compile the Go binary
        │
        ├── Stage 2: Test
        │     ├── Unit tests
        │     └── Linting
        │
        └── Stage 3: Deploy
              └── SSH to server, copy binary, restart service
```

## Prerequisites

- A Go application (we will create a minimal one)
- A GitHub repository
- A Linux server with SSH access (any VPS or EC2 instance)
- Basic understanding of GitHub

## Step 1 — The Application

Create a minimal Go application to work with:

```bash
mkdir go-cicd-demo && cd go-cicd-demo
go mod init github.com/your-username/go-cicd-demo
```

```go title="main.go"
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
)

type HealthResponse struct {
    Status  string `json:"status"`
    Version string `json:"version"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(HealthResponse{
        Status:  "healthy",
        Version: os.Getenv("APP_VERSION"),
    })
}

func main() {
    http.HandleFunc("/health", healthHandler)
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

```go title="main_test.go"
package main

import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestHealthHandler(t *testing.T) {
    req := httptest.NewRequest("GET", "/health", nil)
    rr := httptest.NewRecorder()

    healthHandler(rr, req)

    if rr.Code != http.StatusOK {
        t.Errorf("expected status 200 got %d", rr.Code)
    }
}
```

Verify it works locally:

```bash
go build -o app .
go test ./...
./app &
curl http://localhost:8080/health
```

## Step 2 — Prepare the Server

On your deployment server:

```bash
# Create a dedicated user for deployments
sudo useradd --no-create-home --shell /bin/false deploy

# Create the application directory
sudo mkdir -p /opt/go-cicd-demo
sudo chown deploy:deploy /opt/go-cicd-demo

# Create a systemd service
sudo tee /etc/systemd/system/go-cicd-demo.service << 'EOF'
[Unit]
Description=Go CI/CD Demo Application
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/go-cicd-demo
ExecStart=/opt/go-cicd-demo/app
Restart=always
RestartSec=5
Environment=APP_VERSION=unknown

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable go-cicd-demo
```

## Step 3 — Set Up SSH for GitHub Actions

GitHub Actions needs to SSH into your server without a password.

```bash
# On your local machine — generate a dedicated deploy key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""

# Copy the public key to your server
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub deploy@your-server-ip

# Verify it works
ssh -i ~/.ssh/github_actions_deploy deploy@your-server-ip "echo connected"
```

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret name | Value |
|---|---|
| `DEPLOY_HOST` | Your server IP |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_KEY` | Contents of `~/.ssh/github_actions_deploy` (private key) |

## Step 4 — The Pipeline

Create `.github/workflows/pipeline.yml`:

```yaml title=".github/workflows/pipeline.yml"
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  GO_VERSION: '1.22'
  APP_NAME: go-cicd-demo

jobs:
  # ── Stage 1: Build ──────────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Build binary
        run: |
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
            go build -ldflags="-X main.version=${{ github.sha }}" \
            -o ${{ env.APP_NAME }} .

      - name: Upload binary as artifact
        uses: actions/upload-artifact@v4
        with:
          name: binary
          path: ${{ env.APP_NAME }}
          retention-days: 1

  # ── Stage 2: Test ───────────────────────────────────
  test:
    name: Test
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Run unit tests
        run: go test ./... -v -race -coverprofile=coverage.out

      - name: Check test coverage
        run: |
          coverage=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%')
          echo "Coverage: ${coverage}%"
          if (( $(echo "$coverage < 60" | bc -l) )); then
            echo "Coverage below 60% — failing build"
            exit 1
          fi

      - name: Run linter
        uses: golangci/golangci-lint-action@v4
        with:
          version: latest

  # ── Stage 3: Deploy ─────────────────────────────────
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: [build, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: Download binary
        uses: actions/download-artifact@v4
        with:
          name: binary

      - name: Deploy to server
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          # Set up SSH
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts

          # Copy binary to server
          chmod +x ${{ env.APP_NAME }}
          scp -i ~/.ssh/deploy_key \
            ${{ env.APP_NAME }} \
            $DEPLOY_USER@$DEPLOY_HOST:/opt/${{ env.APP_NAME }}/app.new

          # Atomic swap and restart
          ssh -i ~/.ssh/deploy_key $DEPLOY_USER@$DEPLOY_HOST << 'ENDSSH'
            mv /opt/go-cicd-demo/app.new /opt/go-cicd-demo/app
            sudo systemctl restart go-cicd-demo
            sleep 5
            systemctl is-active go-cicd-demo || exit 1
            echo "Deployment successful"
          ENDSSH
```

## Understanding the Pipeline

**`needs`** — the deploy job only runs after both `build` and `test` succeed. If tests fail, deployment never happens.

**`if: github.ref == 'refs/heads/main'`** — the deploy stage only runs on pushes to `main`, not on pull requests. PRs only build and test.

**Atomic swap** — the new binary is uploaded as `app.new` and then renamed to `app` in a single `mv` command. This minimises the window where the old binary is gone but the new one is not yet in place.

**`systemctl is-active`** — after restarting, the script checks that the service actually came up. If it did not, `exit 1` fails the workflow and you know the deploy failed.

## Testing the Pipeline

```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin main
```

Go to your GitHub repository → **Actions** tab. Watch each stage run in sequence.

Break it deliberately — introduce a test failure and push:

```go
func TestHealthHandler(t *testing.T) {
    t.Fatal("intentional failure")
}
```

The test stage fails, the deploy stage is skipped. Fix the test, push again, deployment proceeds.

## What To Add Next

- **Slack notifications** on deploy success/failure
- **Staging environment** — deploy to staging first, run smoke tests, then promote to production
- **Rollback** — keep the previous binary and switch back if the health check fails post-deploy
- **Docker** — build a container image instead of a binary for more portable deployments
