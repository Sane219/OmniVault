# OmniVault Architecture

## System Overview

OmniVault is a **polyglot monorepo** SaaS platform for multimodal document intelligence. It transforms unstructured PDFs into interactive knowledge graphs and enables conversational querying via RAG over graph data.

### Architectural Pattern

- **Backend**: Async Python API using [Robyn](https://github.com/sparckles/robyn) (event-driven web framework)
- **Frontend**: Next.js 14 App Router with React and Tailwind CSS
- **AI Worker**: Hatchet-powered async worker for CPU/GPU-intensive document processing and LLM calls
- **Database Layer**: Supabase (PostgreSQL + Auth + Storage) + Redis for job queues
- **State Management**: Zustand (frontend), in-memory polling (frontend↔backend sync)

---

## System Component Diagram

```mermaid
flowchart TB
    subgraph Frontend["Frontend (apps/web)"]
        WF1[Next.js App Router]
        WF2[Zustand Store]
        WF3[ReactFlow + Dagre]
        WF4[API Client]
    end

    subgraph Backend["API Core (apps/api-core)"]
        BR1[Robyn HTTP Server]
        BR2[Auth Router]
        BR3[Upload Router]
        BR4[Document Router]
        BR5[Chat Router]
        BR6[User Router]
        BR7[Supabase Client]
        BR8[Hatchet Client]
    end

    subgraph Infrastructure["Infrastructure"]
        SUP[(Supabase PostgreSQL + Auth + Storage)]
        REDIS[(Redis)]
        EDGEDB[(EdgeDB)]
    end

    subgraph Worker["AI Worker (apps/worker-ai)"]
        WR1[Hatchet Event Listener]
        WR2[PDF Extractor<br/>PyMuPDF]
        WR3[Gemini Client<br/>google-genai]
        WR4[Knowledge Graph Builder]
    end

    WF1 --> WF4
    WF4 -->|HTTP REST| BR1
    WF1 --> WF2
    WF1 --> WF3

    BR1 --> BR2
    BR1 --> BR3
    BR1 --> BR4
    BR1 --> BR5
    BR1 --> BR6

    BR3 --> BR7
    BR4 --> BR7
    BR5 --> BR7
    BR6 --> BR7

    BR3 --> BR8
    BR8 -->|document:process event| WR1

    WR1 --> WR2
    WR2 --> WR3
    WR3 --> WR4
    WR4 -->|status + graph_data| BR7
    WR4 --> WR1

    BR7 <--> SUP
    WR1 --> REDIS
    WR2 --> EDGEDB
```

---

## Document Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Next.js (workspace/page.tsx)
    participant API as API Core (Robyn)
    participant Supabase as Supabase Storage + DB
    participant Hatchet as Hatchet Event Bus
    participant Worker as AI Worker

    User->>Frontend: Upload PDF
    Frontend->>API: POST /upload (multipart/form-data)
    API->>Supabase: Upload file → documents bucket
    API->>Supabase: INSERT document (status=UPLOADED)
    API->>Hatchet: Push event "document:process"
    API-->>Frontend: 202 Accepted {document_id}
    Frontend->>Frontend: Start polling /document/:id/status

    Hatchet->>Worker: Trigger document:process workflow
    Worker->>Worker: _update_status(PROCESSING)
    Worker->>Supabase: Fetch document + user API key
    Worker->>Worker: extract_document_structure() via PyMuPDF
    Worker->>Worker: generate_knowledge_graph() via Gemini
    Worker->>Supabase: _update_status(COMPLETED, graph_data)

    loop every 2s
        Frontend->>API: GET /document/:id/status
        API->>Supabase: SELECT status
        API-->>Frontend: status object
    end

    alt status == completed
        Frontend->>API: GET /document/:id/graph
        API->>Supabase: SELECT graph_data
        API-->>Frontend: graph JSON (nodes + edges)
        Frontend->>Frontend: Render ReactFlow knowledge graph
    end

    User->>Frontend: Chat message
    Frontend->>API: POST /document/:id/chat (SSE)
    API->>Supabase: SELECT graph_data + gemini_api_key
    API->>Worker: Gemini streaming SSE
    Worker-->>API: token stream
    API-->>Frontend: SSE stream
    Frontend->>Frontend: Render chat messages
```

---

## Authentication Flow

```mermaid
flowchart LR
    A[User registers<br/>/login] --> B[Supabase Auth]
    B --> C[access_token JWT]
    C --> D[Cookie<br/>omnivault_token]
    D --> E[decode_token()<br/>in all protected routes]
    E --> F{Valid?}
    F -->|Yes| G[Request proceeds]
    F -->|No| H[401 Unauthorized]
```

- `decode_token()` in `apps/api-core/src/api_core/auth_utils.py` extracts the `Authorization: Bearer <token>` header and verifies it against Supabase Auth.
- The token is mirrored into a browser cookie (`omnivault_token`) after login so the Next.js frontend can forward it as a Bearer header.

---

## Directory Structure

```
OmniVault/
├── apps/
│   ├── api-core/                    # Robyn Python API server
│   │   ├── pyproject.toml
│   │   └── src/api_core/
│   │       ├── main.py              # Entry point, router registration
│   │       ├── auth_utils.py        # JWT decode helper
│   │       ├── db.py               # Supabase client singleton
│   │       └── routes/
│   │           ├── auth.py          # /register, /login
│   │           ├── upload.py       # /upload → Hatchet trigger
│   │           ├── document.py     # /document/:id/*, /documents
│   │           ├── chat.py         # /document/:id/chat (SSE RAG)
│   │           └── user.py         # /user/api-key
│   │
│   ├── web/                         # Next.js 14 frontend
│   │   ├── package.json
│   │   └── src/
│   │       ├── middleware.ts       # Route protection
│   │       ├── store/
│   │       │   └── useStore.ts      # Zustand state
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx         # Root redirect
│   │       │   ├── (auth)/
│   │       │   │   ├── login/
│   │       │   │   └── register/
│   │       │   └── workspace/
│   │       │       └── page.tsx     # Main dashboard
│   │       └── components/
│   │           ├── LoginForm.tsx
│   │           ├── RegisterForm.tsx
│   │           ├── ApiKeyModal.tsx
│   │           ├── KnowledgeGraph.tsx  # ReactFlow + Dagre
│   │           └── ChatPanel.tsx        # SSE chat
│   │
│   └── worker-ai/                   # Hatchet async AI worker
│       ├── pyproject.toml
│       └── src/worker_ai/
│           ├── main.py             # Workflow registration
│           └── rag.py             # PDF extraction + Gemini graph gen
│
├── packages/                        # (reserved for shared packages)
│
├── graphify-out/                   # AI-generated knowledge graph
│
├── schema.sql                      # Supabase PostgreSQL schema
├── pyproject.toml                  # Python workspace root (uv)
├── pnpm-workspace.yaml            # JS workspace root (pnpm)
├── package.json                    # Root (lefthook only)
├── docker-compose.yml             # Redis + EdgeDB for local dev
├── Dockerfile
└── README.md
```

---

## Key Abstractions

### `decode_token()` — Cross-cutting Auth Guard
Centralises JWT extraction across all protected routes. Any route handler that calls `decode_token()` before accessing user-specific data enforces authentication without repeating boilerplate.

### Hatchet Event Bus (`document:process`)
Decouples the upload HTTP response from heavy AI work. The API returns immediately (202 Accepted); the worker picks up the job asynchronously and updates the document status in Supabase when complete.

### Graph Pruning (`_prune_graph`)
The chat route in `apps/api-core/src/api_core/routes/chat.py` reduces the graph payload before sending to Gemini:
- **Node selected**: Returns ego-subgraph (1-hop neighbors only)
- **Large graph (>1000 nodes)**: Returns only root-level nodes
- **Small graph**: Sends full graph

### Tiered Gemini Prompts (`generate_knowledge_graph`)
Document complexity is auto-detected and prompts are adjusted:

| Tier | Pages | Prompt Adjustment |
|------|-------|-------------------|
| TINY | <50 | Full content preserved |
| SMALL | 50–199 | Content summary |
| MEDIUM | 200–999 | Content summary, truncated input |
| LARGE | ≥1000 | Root nodes only, heavy truncation |
