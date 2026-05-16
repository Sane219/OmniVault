# OmniVault Architecture

## System Overview

OmniVault is a **polyglot monorepo** SaaS platform for multimodal document intelligence. It transforms unstructured PDFs into interactive knowledge graphs and enables conversational querying via RAG over graph data — no vector embeddings required.

### Architectural Pattern

The system follows a **three-tier event-driven architecture**:

- **Frontend**: Next.js 14 App Router with React, Tailwind CSS, and Zustand for state management
- **Backend API**: Robyn (Python async web framework) handling auth, document management, and chat
- **AI Worker**: Hatchet-powered async worker for PDF extraction and Gemini-powered graph generation
- **Database Layer**: Supabase (PostgreSQL + Auth + Storage) for persistence; Redis for job queuing

---

## System Component Diagram

```mermaid
flowchart TB
    subgraph Client["Browser"]
        UI[Next.js Frontend]
        RF[ReactFlow + Dagre]
        ZS[Zustand Store]
    end

    subgraph API["API Core — apps/api-core"]
        ROBYN[Robyn HTTP Server]
        AUTH_R[Auth Router<br/>/register · /login]
        UPLOAD_R[Upload Router<br/>/upload]
        DOC_R[Document Router<br/>/document/:id/*]
        CHAT_R[Chat Router<br/>/document/:id/chat]
        USER_R[User Router<br/>/user/api-key]
        AUTH_GUARD[decode_token]
        DB_CLIENT[Supabase Client]
        HATCHET_C[Hatchet Client]
    end

    subgraph Worker["AI Worker — apps/worker-ai"]
        H_LISTENER[Hatchet Event Listener]
        PYMUPDF[PyMuPDF Extractor]
        GEMINI[Gemini 2.5 Flash]
        KG_BUILDER[Knowledge Graph Builder]
    end

    subgraph Infra["Infrastructure"]
        SUPABASE[(Supabase<br/>PostgreSQL + Auth + Storage)]
        REDIS[(Redis)]
    end

    UI -->|HTTP REST| ROBYN
    UI --> RF
    UI --> ZS
    RF -->|node click| ZS
    ZS -->|selectedNode| UI

    ROBYN --> AUTH_R
    ROBYN --> UPLOAD_R
    ROBYN --> DOC_R
    ROBYN --> CHAT_R
    ROBYN --> USER_R

    AUTH_R --> DB_CLIENT
    UPLOAD_R --> AUTH_GUARD
    UPLOAD_R --> DB_CLIENT
    UPLOAD_R --> HATCHET_C
    DOC_R --> AUTH_GUARD
    DOC_R --> DB_CLIENT
    CHAT_R --> AUTH_GUARD
    CHAT_R --> DB_CLIENT
    USER_R --> AUTH_GUARD
    USER_R --> DB_CLIENT

    HATCHET_C -->|document:process event| H_LISTENER
    H_LISTENER --> PYMUPDF
    PYMUPDF --> GEMINI
    GEMINI --> KG_BUILDER
    KG_BUILDER -->|status + graph_data| DB_CLIENT

    DB_CLIENT <--> SUPABASE
    H_LISTENER <--> REDIS

    style Client fill:#1a1a2e,stroke:#475569,color:#e2e8f0
    style API fill:#16213e,stroke:#475569,color:#e2e8f0
    style Worker fill:#1a1a2e,stroke:#475569,color:#e2e8f0
    style Infra fill:#0f3460,stroke:#475569,color:#e2e8f0
```

---

## Document Processing Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Next.js<br/>workspace/page.tsx
    participant API as API Core<br/>(Robyn)
    participant SB as Supabase<br/>Storage + DB
    participant H as Hatchet<br/>Event Bus
    participant W as AI Worker

    User->>FE: Upload PDF
    FE->>API: POST /upload<br/>(multipart/form-data)
    API->>SB: Upload file → documents bucket
    API->>SB: INSERT document (status=UPLOADED)
    API->>H: Push event "document:process"
    API-->>FE: 202 Accepted {document_id}
    FE->>FE: Start polling /document/:id/status

    H->>W: Trigger document:process workflow
    W->>W: _update_status(PROCESSING)
    W->>SB: Fetch document + user Gemini API key
    W->>W: extract_document_structure() via PyMuPDF
    W->>W: generate_knowledge_graph() via Gemini 2.5 Flash
    W->>SB: _update_status(COMPLETED, graph_data)

    loop Poll every 2s
        FE->>API: GET /document/:id/status
        API->>SB: SELECT status
        API-->>FE: {status: "processing"}
    end

    FE->>API: GET /document/:id/status
    API-->>FE: {status: "completed"}
    FE->>API: GET /document/:id/graph
    API->>SB: SELECT graph_data
    API-->>FE: graph JSON (nodes + edges, full_content stripped)
    FE->>FE: Render ReactFlow knowledge graph

    User->>FE: Click graph node + type question
    FE->>API: POST /document/:id/chat (SSE)
    API->>SB: SELECT graph_data + gemini_api_key
    API->>API: _prune_graph() based on selected node
    API->>W: Gemini streaming via google-genai
    W-->>API: Token stream
    API-->>FE: SSE data: stream
    FE->>FE: Render chat messages in real-time
```

---

## Authentication Flow

```mermaid
flowchart LR
    A[User<br/>registers/logs in] --> B[Supabase Auth]
    B --> C[JWT access_token]
    C --> D[Cookie<br/>omnivault_token]
    D --> E[decode_token()<br/>in protected routes]
    E --> F{Valid?}
    F -->|Yes| G[Request proceeds]
    F -->|No| H[401 Unauthorized]

    style A fill:#1a1a2e,stroke:#475569,color:#e2e8f0
    style F fill:#16213e,stroke:#475569,color:#e2e8f0
```

- `decode_token()` in `auth_utils.py` extracts the `Authorization: Bearer <token>` header and decodes the JWT
- The token is stored as a browser cookie (`omnivault_token`) after login so the Next.js frontend can forward it as a Bearer header
- Next.js middleware (`middleware.ts`) redirects unauthenticated users away from `/workspace` to `/login`

---

## Graph Pruning Strategy

The chat endpoint reduces the graph payload before sending to Gemini to stay within context limits:

```mermaid
flowchart TD
    A[Incoming chat request] --> B{Node selected?}
    B -->|Yes| C[Return ego subgraph<br/>selected node + 1-hop neighbors]
    B -->|No| D{Graph > 1000 nodes?}
    D -->|Yes| E[Return root nodes only<br/>nodes with no incoming edges]
    D -->|No| F[Return full graph]

    style C fill:#16213e,stroke:#22c55e,color:#e2e8f0
    style E fill:#16213e,stroke:#eab308,color:#e2e8f0
    style F fill:#16213e,stroke:#3b82f6,color:#e2e8f0
```

---

## Tiered AI Intelligence

Documents are auto-classified by page count. The Gemini prompt adjusts complexity accordingly:

| Tier | Pages | Strategy |
|------|-------|----------|
| TINY | <50 | Full content preserved in nodes |
| SMALL | 50-199 | Content summaries generated |
| MEDIUM | 200-999 | Summaries + truncated input |
| LARGE | 1000+ | Root nodes only, heavy truncation |

---

## Directory Structure

```
OmniVault/
├── apps/
│   ├── api-core/                    # Robyn Python API server
│   │   ├── pyproject.toml           # Dependencies: robyn, PyJWT, supabase, hatchet-sdk
│   │   └── src/api_core/
│   │       ├── main.py              # Entry point, CORS, router registration
│   │       ├── auth_utils.py        # JWT decode helper (decode_token)
│   │       ├── db.py                # Supabase client singletons (anon + service role)
│   │       └── routes/
│   │           ├── auth.py          # POST /register, /login
│   │           ├── upload.py        # POST /upload → triggers Hatchet worker
│   │           ├── document.py      # GET /documents, /document/:id/status, /document/:id/graph
│   │           ├── chat.py          # POST /document/:id/chat (SSE streaming RAG)
│   │           └── user.py          # POST /user/api-key
│   │
│   ├── web/                         # Next.js 14 frontend
│   │   ├── package.json             # Dependencies: react, @xyflow/react, dagre, zustand, lucide-react
│   │   └── src/
│   │       ├── middleware.ts        # Route protection (cookie-based auth guard)
│   │       ├── store/
│   │       │   └── useStore.ts      # Zustand global state (document, selectedNode, chat)
│   │       ├── app/
│   │       │   ├── layout.tsx       # Root layout with dark theme
│   │       │   ├── page.tsx         # Redirects to /workspace
│   │       │   ├── (auth)/
│   │       │   │   ├── login/page.tsx
│   │       │   │   └── register/page.tsx
│   │       │   └── workspace/
│   │       │       └── page.tsx     # Main dashboard (upload, graph, chat)
│   │       └── components/
│   │           ├── LoginForm.tsx     # Email/password login form
│   │           ├── RegisterForm.tsx  # Registration form
│   │           ├── ApiKeyModal.tsx   # Gemini API key configuration
│   │           ├── KnowledgeGraph.tsx # ReactFlow + Dagre auto-layout
│   │           └── ChatPanel.tsx     # SSE streaming chat with node context
│   │
│   └── worker-ai/                   # Hatchet async AI worker
│       ├── pyproject.toml           # Dependencies: hatchet-sdk, google-genai, pymupdf
│       └── src/worker_ai/
│           ├── main.py              # Hatchet workflow registration + document processing
│           └── rag.py               # PDF extraction + Gemini knowledge graph generation
│
├── schema.sql                       # PostgreSQL schema (users + documents tables)
├── pyproject.toml                   # Python workspace root (uv)
├── pnpm-workspace.yaml             # JS workspace root (pnpm)
├── package.json                     # Root devDependencies (lefthook)
├── docker-compose.yml              # Local dev services (EdgeDB, Redis)
├── Dockerfile
├── lefthook.yml                     # Git hooks (Ruff + ESLint)
├── start.sh                         # Startup script
├── status.md                        # Product roadmap & status
├── docs/
│   ├── architecture.md              # This file
│   └── api-reference.md             # REST API documentation
├── CONTRIBUTING.md                  # Developer onboarding guide
├── CODE_OF_CONDUCT.md               # Contributor Covenant
└── README.md                        # Project landing page
```

---

## Key Abstractions

### `decode_token()` — Cross-cutting Auth Guard

Centralises JWT extraction across all protected routes. Any route handler that calls `decode_token()` before accessing user-specific data enforces authentication without repeating boilerplate. Returns the user's UUID on success, `None` on failure.

### Hatchet Event Bus (`document:process`)

Decouples the upload HTTP response from heavy AI work. The API returns immediately (202 Accepted); the Hatchet worker picks up the job asynchronously and updates the document status in Supabase when complete. This prevents request timeouts on large documents.

### Graph Pruning (`_prune_graph`)

The chat route reduces the graph payload before sending to Gemini:
- **Node selected**: Returns ego-subgraph (1-hop neighbors only)
- **Large graph (>1000 nodes)**: Returns only root-level nodes
- **Small graph**: Sends full graph

### Tiered Gemini Prompts (`generate_knowledge_graph`)

Document complexity is auto-detected by page count. Smaller documents get richer extraction (full content preserved); larger documents get summarised to stay within Gemini's context window.

### User-owned API Keys

Users provide their own Google Gemini API key via the Settings modal. The key is stored in the `users` table and fetched via a joined query when processing documents or chat. This eliminates centralized billing and vendor lock-in.
