# Contributing to OmniVault

Thank you for your interest in contributing to OmniVault! This guide covers everything you need to set up a local development environment, understand the codebase, and submit your first contribution.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Docker](https://docs.docker.com/get-docker/) | Latest | Local container runtime |
| [Docker Compose](https://docs.docker.com/compose/install/) | v2+ | Orchestrate local services |
| [pnpm](https://pnpm.io/installation) | 8+ | JavaScript/TypeScript package manager |
| [uv](https://github.com/astral-sh/uv) | Latest | Python package manager & runtime |
| [Lefthook](https://github.com/evilmartians/lefthook) | Latest | Git hooks (lint, test) |

---

## Repository Structure

OmniVault is a **polyglot monorepo** managed by both `pnpm` (workspace) and `uv` (workspace).

```
OmniVault/
├── apps/
│   ├── api-core/        # Robyn Python API (port 8080)
│   ├── web/             # Next.js frontend (port 3000)
│   └── worker-ai/       # Hatchet AI worker
├── packages/            # Reserved for shared libraries
├── docs/                # Architecture & API documentation
└── schema.sql           # Supabase PostgreSQL schema
```

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/<your-fork>/OmniVault.git
cd OmniVault
```

### 2. Install Git Hooks

```bash
lefthook install
```

This enables:
- **Pre-commit**: Ruff (Python lint + format) + ESLint (TypeScript)
- **Pre-push**: (placeholder — add test commands here)

### 3. Start Infrastructure Services

```bash
docker compose up -d
```

This starts:
- **EdgeDB** on `localhost:5656`
- **Redis** on `localhost:6379`

### 4. Configure Environment Variables

Create `.env` files for each app:

**`apps/api-core/.env`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
HOST=0.0.0.0
PORT=8080
```

**`apps/worker-ai/.env`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
HATCHET_CLIENT_TOKEN=your-hatchet-token
```

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

### 5. Set Up Supabase

1. Create a [Supabase](https://supabase.com) project (free tier works)
2. Run `schema.sql` in the Supabase SQL Editor to create `users` and `documents` tables
3. Enable **Email Auth** in Supabase Authentication settings
4. Create a **documents** storage bucket (public)

### 6. Install Dependencies

**Frontend:**
```bash
cd apps/web && pnpm install
```

**Backend & Worker:**
```bash
cd apps/api-core && uv sync
cd ../worker-ai && uv sync
```

---

## Running Locally

Start each service in a separate terminal:

```bash
# Terminal 1 — API Server
cd apps/api-core && uv run python -m api_core.main

# Terminal 2 — AI Worker
cd apps/worker-ai && uv run python -m worker_ai.main

# Terminal 3 — Frontend
cd apps/web && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — register an account, add your Gemini API key in Settings, and upload your first PDF.

---

## Code Conventions

### Python (api-core, worker-ai)

- **Linter**: Ruff — enforced via Lefthook pre-commit
- **Formatter**: `ruff format` (included in pre-commit)
- **Import sorting**: Ruff handles this automatically
- **Type annotations**: Required for function signatures
- **Error handling**: Use `_err()` helper in routes; log via `print()` or `sys.stderr.write()`
- **Async**: Use `asyncio.to_thread()` for blocking operations within async route handlers

### TypeScript / Next.js (web)

- **Linter**: ESLint — enforced via Lefthook pre-commit
- **Styling**: Tailwind CSS utility classes (no custom CSS files)
- **State**: Zustand via `useStore.ts`
- **API calls**: Fetch API with `authHeaders()` helper (reads token from cookie)
- **Components**: Functional components with `"use client"` directive where needed

---

## Git Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. Push and open a PR:
   ```bash
   git push origin feat/your-feature-name
   ```

---

## Architecture Notes

### Authentication

`decode_token()` in `apps/api-core/src/api_core/auth_utils.py` is the central auth guard. All document, chat, and user routes call this before accessing protected resources.

### Document Processing Pipeline

```
Upload → Supabase Storage → Hatchet "document:process" event
  → Worker extracts PDF text (PyMuPDF)
  → Worker calls Gemini → knowledge graph JSON
  → Worker updates document status to COMPLETED
  → Frontend polls /document/:id/status until ready
  → Frontend fetches /document/:id/graph and renders ReactFlow
```

### Chat (RAG)

The chat endpoint (`POST /document/:id/chat`) streams responses via SSE. The graph is pruned before sending to Gemini:
- **With node selected**: Ego subgraph (1-hop)
- **Large graph (>1000 nodes)**: Root nodes only
- **Small graph**: Full graph

### Updating the Knowledge Graph

If you modify any source files, run:

```bash
graphify update .
```

This keeps the graph at `graphify-out/` in sync with the current codebase (AST-only, no API cost).

---

## Reporting Issues

Open an issue with:

- A clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python version, Node version)

---

## Questions?

Feel free to open a Discussion or reach out to the maintainers.
