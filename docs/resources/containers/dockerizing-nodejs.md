---
title: Dockerizing Your Node.js Application
description: A step-by-step guide to containerising a Node.js application with Docker — from a basic Dockerfile to a production-ready multi-stage build.
tags: [docker, nodejs, containers, intermediate]
---

# Dockerizing Your Node.js Application

Containerising your Node.js app with Docker makes it run identically everywhere — your laptop, a colleague's machine, a CI runner, and production. No more "works on my machine."

This guide goes from a basic Dockerfile to a production-ready multi-stage build with a non-root user and a minimal image size.

## What We Are Building

A Node.js Express application containerised with Docker, progressing through three stages:

1. Basic Dockerfile — gets it working
2. Optimised Dockerfile — smaller image, layer caching
3. Production Dockerfile — multi-stage build, non-root user, security hardened

## The Application

```bash
mkdir node-docker-demo && cd node-docker-demo
npm init -y
npm install express
```

```js title="app.js"
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'DevOps Chronicles Node.js Demo' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

## Stage 1 — Basic Dockerfile

```dockerfile title="Dockerfile"
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "app.js"]
```

```bash
docker build -t node-demo:basic .
docker run -p 3000:3000 node-demo:basic
curl http://localhost:3000/health
```

This works, but check the image size:

```bash
docker images node-demo:basic
# REPOSITORY   TAG     SIZE
# node-demo    basic   1.1GB
```

Over 1GB for a simple Express app. The problem is `node:20` includes compilers, build tools, and everything Node needs to build native modules — none of which you need at runtime.

## Stage 2 — Optimised Dockerfile

Two improvements: use the slim base image, and copy `package.json` before the rest of the code so Docker can cache the `npm install` layer.

```dockerfile title="Dockerfile"
FROM node:20-slim

WORKDIR /app

# Copy package files first — if only app.js changes, this layer is cached
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

EXPOSE 3000
CMD ["node", "app.js"]
```

:::info
`npm ci` instead of `npm install` — it installs exactly what is in `package-lock.json`, fails if the lockfile is missing, and is faster in CI environments. Always use `npm ci` in Docker builds.
:::

```bash
docker build -t node-demo:optimised .
docker images node-demo:optimised
# REPOSITORY   TAG        SIZE
# node-demo    optimised  240MB
```

240MB — better, but we can go further.

## Stage 3 — Production Multi-Stage Build

A multi-stage build uses one image to install dependencies and compile assets, then copies only the result into a minimal final image.

```dockerfile title="Dockerfile.production"
# ── Stage 1: Dependencies ──────────────────────
FROM node:20-slim AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production image ──────────────────
FROM node:20-slim AS production

# Create a non-root user — never run apps as root in containers
RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy only the production node_modules from the dependencies stage
COPY --from=dependencies --chown=appuser:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=appuser:nodejs . .

# Switch to non-root user
USER appuser

# Document which port the app uses — does not actually publish it
EXPOSE 3000

# Use the full node path — more explicit, harder to accidentally override
CMD ["node", "app.js"]
```

```bash
docker build -f Dockerfile.production -t node-demo:production .
docker images node-demo:production
# REPOSITORY   TAG        SIZE
# node-demo    production 190MB
```

## Running in Production Mode

```bash
docker run \
  --name node-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --read-only \
  --tmpfs /tmp \
  node-demo:production
```

**Flags explained:**
- `--restart unless-stopped` — container restarts automatically if it crashes or if the server reboots
- `-e NODE_ENV=production` — tells Express and most npm packages to use production optimisations
- `--read-only` — the container filesystem is read-only — if the app tries to write anywhere unexpected, it fails loudly
- `--tmpfs /tmp` — mounts a temporary writable filesystem at `/tmp` for apps that need it

## Add a .dockerignore File

Without this, Docker copies your entire project into the build context including `node_modules`, `.git`, and logs.

```text title=".dockerignore"
node_modules
.git
.gitignore
*.log
.env
.env.*
npm-debug.log*
README.md
.DS_Store
```

## Docker Compose for Local Development

Running the container with long `docker run` commands gets tedious. Use Docker Compose:

```yaml title="docker-compose.yml"
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
    volumes:
      # Mount local code for hot reload during development
      - ./app.js:/app/app.js:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

```bash
# Start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Common Mistakes

**Running as root** — the default Node Docker image runs as root. If your app is compromised, the attacker has root access inside the container. Always create and use a non-root user.

**Copying node_modules into the image** — if your `.dockerignore` is missing or wrong, your local `node_modules` get copied in. These may have been compiled for a different OS. Always let `npm ci` install inside the container.

**Using `latest` tag** — `FROM node:latest` means your build is non-deterministic. A new Node release could break your build silently. Pin to a specific version: `FROM node:20.11.0-slim`.

**No health check** — Docker has no way to know if your app is actually healthy or just running. Define a `HEALTHCHECK` in your Dockerfile or in docker-compose.
