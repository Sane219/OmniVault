# OmniVault

OmniVault is an enterprise-grade multimodal AI SaaS platform. 

This repository is structured as a polyglot monorepo leveraging modern tools for optimal performance and developer experience.

## Tech Stack
- **Frontend**: Next.js (apps/web) managed by `pnpm`
- **Backend API**: Robyn (apps/api-core) managed by `uv`
- **Async Worker**: Hatchet (apps/worker-ai) managed by `uv`
- **Database**: EdgeDB (packages/database)
- **Git Hooks**: Lefthook

## Local Development Bootstrap

Follow these steps to spin up the local environment.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [pnpm](https://pnpm.io/installation)
- [uv](https://github.com/astral-sh/uv)
- [Lefthook](https://github.com/evilmartians/lefthook)

### 1. Install Dependencies

**Frontend:**
```bash
cd apps/web
pnpm install
```

**Python (Backend & Worker):**
Dependencies for Python projects are managed automatically when using `uv run`, or you can sync them:
```bash
cd apps/api-core && uv sync
cd ../worker-ai && uv sync
```

### 2. Setup Git Hooks

Install Lefthook to enable pre-commit (linting) and pre-push (testing) hooks.
```bash
lefthook install
```

### 3. Start Infrastructure

Start the local EdgeDB, Redis (Upstash simulator), API, and Worker containers:
```bash
docker compose up -d
```

To run the Next.js frontend locally:
```bash
cd apps/web
pnpm dev
```
