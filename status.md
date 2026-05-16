# OmniVault - Product Strategy & Roadmap

> Last Updated: 2026-05-16 | Phase 2 In Progress — Weeks 1+2 Complete (Trust & Resilience)

---

## 🚀 Vision & Current Phase

**Phase: 1 - MVP & Stability** ✅ COMPLETE

**Product Summary**: Enterprise-grade multimodal AI SaaS platform that transforms PDF documents into interactive knowledge graphs with AI-powered chat.

**Core Stack**:
- **Frontend**: Next.js 14 + Tailwind + Zustand + Lucide Icons
- **Backend**: Robyn (Python async) + Hatchet (async worker)
- **Database**: PostgreSQL via Supabase
- **AI**: Gemini 2.5 Flash for graph extraction + chat

**Phase 1 Wins** (Implemented):
- ✅ **Supabase Auth** - Native auth (sign_in_with_password, sign_up)
- ✅ **Vectorless RAG** - Graph-based document processing
- ✅ **Tier System** - TINY(1-5) → SMALL(5-50) → MEDIUM(50-200) → LARGE(200+)
- ✅ **Rich Tree Structure** - content_summary + full_content in graph nodes
- ✅ **JSON Payload Protection** - full_content stripped before API response
- ✅ **Chat UX Fix** - Messages cleared on document switch
- ✅ **Architectural Simplicity** - Single `/document/:id/chat` endpoint for all RAG (no separate /query)

---

## 📈 The Horizon (Long-Term Roadmap)

### Phase 2: Scale & UX (Months 3-6) — IN PROGRESS
- [ ] Implement Redis caching for graph queries (reduce DB load)
- [x] **Add react-pdf viewer** — `PdfViewer.tsx` with dynamic import, PDF.js worker config
- [ ] Inter-document knowledge graph (cross-reference multiple PDFs)
- [x] **Skeleton loaders** — `Skeleton.tsx` with `DocumentListSkeleton`, `GraphSkeleton`, `ChatSkeleton`
- [x] **Error boundaries** — `ErrorBoundary.tsx` wrapping KnowledgeGraph + ChatPanel
- [x] **Mobile responsiveness** — drawer sidebar, bottom nav bar, responsive layout
- [x] **Extract auth.ts** — deduplicated `authHeaders()` utility
- [ ] WebSocket for real-time processing updates (Hatchet `ctx.put_stream()`)

### Phase 3: Advanced Intelligence (Months 6-12)
- [ ] **Ollama fallback** for privacy-sensitive local processing
- [ ] Multi-agent orchestration (extraction → graph → Q&A agents)
- [ ] Multi-graph RAG (entity + causal + semantic + temporal)
- [ ] NVIDIA Nemotron 3 Nano integration for complex documents
- [ ] Predictive UX (pre-fetch likely queries)

### Phase 4: Enterprise & Ecosystem (Months 12-18)
- [ ] Public API with rate limiting & API key management
- [ ] Team workspaces & document permissions
- [ ] Desktop app (Tauri/Electron wrapper)
- [ ] Plugin ecosystem (Notion, Slack, CRM integrations)
- [ ] Enterprise SSO (SAML/OIDC)

---

## 🎯 Immediate Next Steps (This Week)

### Priority 1: Security Hardening ✅ COMPLETE (2026-05-16)
- [x] **Supabase Auth** (implemented in Phase 1 via `auth.py`)
- [x] Enable JWT signature verification - `verify_signature: True` + `verify_exp: True` in `auth_utils.py`
- [x] Add file upload validation - 50MB limit + PDF extension check in `upload.py`
- [x] Implement rate limiting - 60 req/min general, 10 req/min for auth endpoints in `main.py`
- [x] Encrypt API key at rest - Fernet encryption with `ENCRYPTION_KEY` env var in `crypto_utils.py`

### Priority 2: Database & Infrastructure
- [ ] Clean up docker-compose to match actual Supabase usage (EdgeDB is unused)
- [ ] Add RLS policies for documents table
- [ ] Set up proper Supabase environment variables

### Priority 3: UX Polish
- [x] **Chat message clear on doc switch** (fixed in Phase 1)
- [ ] Add PDF viewer component (react-pdf)
- [ ] Implement error boundaries in Next.js
- [ ] Add loading skeletons for graph generation

---

## 🛡️ Security & UX Audit

### Critical Vulnerabilities 🟢 ALL FIXED (2026-05-16)

| Issue | Location | Severity | Status |
|-------|----------|----------|--------|
| JWT signature verification disabled | `auth_utils.py` | **CRITICAL** | ✅ Fixed |
| API key stored in plain text in DB | `users.gemini_api_key` column | **HIGH** | ✅ Fixed |
| No file upload validation | `upload.py` | **MEDIUM** | ✅ Fixed |
| CORS allows all origins (`origins=["*"]`) | `main.py` | **MEDIUM** | ✅ Fixed |
| No rate limiting | All endpoints | **MEDIUM** | ✅ Fixed |

### UX Friction Points 🟡

| Issue | Impact | Location | Status |
|-------|--------|----------|--------|
| No PDF viewer | Users can't verify document | `workspace/page.tsx:327` | Not fixed |
| Large graphs (>1000 nodes) cause lag | Performance on long docs | `chat.py:60` | Mitigated via pruning |
| Chat doesn't switch between documents | Must re-select doc | `ChatPanel.tsx` | **FIXED** |
| No mobile responsive layout | Can't use on tablet | All pages | Not fixed |
| No loading skeletons | Feels slow during processing | Graph + chat sections | Not fixed |

---

## 📝 Execution Log

| Date | Action | Details |
|------|--------|---------|
| 2026-05-10 | **Phase 1 Complete** | Two-Phase RAG + UX Fixes pushed |
| 2026-05-10 | Supabase Auth | Native auth with sign_in_with_password |
| 2026-05-10 | Vectorless RAG | Graph-based retrieval with tier system |
| 2026-05-10 | Rich Tree Structure | content_summary + full_content in nodes |
| 2026-05-10 | JSON Payload Protection | full_content stripped before API |
| 2026-05-10 | Chat UX Fix | Messages cleared on document switch |
| 2026-05-10 | Created status.md | Full strategic roadmap |
| 2026-05-10 | Codebase scan | Mapped 18 files across frontend/backend/worker |
| 2026-05-10 | Security audit | Found 5 critical/medium issues |
| 2026-05-09 | Graphify scan | 32 nodes, 3 communities, god nodes identified |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Login   │  │ Register │  │ Workspace │  │ KnowledgeGraph │  │
│  │  Page    │  │   Page   │  │   Page    │  │  Component   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   Zustand Store   │                        │
│                    └───────────────────┘                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP + SSE
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   SUPABASE    │   │ Robyn API Core  │   │  Hatchet Worker │
│  (PostgreSQL) │   │   (Python)      │   │   (Async AI)    │
│               │   │                 │   │                 │
│ - users       │   │ /auth/*        │   │ document:process│
│ - documents   │   │ /upload        │   │ → extract_pdf   │
│ - storage     │   │ /document/*    │   │ → generate_graph│
│ - auth        │   │ /chat (SSE)    │   └─────────────────┘
└───────────────┘   └─────────────────┘
```

### Key Files Reference

| Layer | File | Purpose |
|-------|------|---------|
| Frontend | `workspace/page.tsx` | Main UI orchestrator |
| Frontend | `ChatPanel.tsx` | SSE streaming chat |
| Frontend | `KnowledgeGraph.tsx` | D3.js visualization |
| Frontend | `useStore.ts` | Zustand state |
| Backend | `auth.py` | Supabase Auth + register/login |
| Backend | `upload.py` | File upload + Hatchet trigger |
| Backend | `chat.py` | RAG chat with graph pruning |
| Backend | `document.py` | Status + graph retrieval |
| Backend | `auth_utils.py` | JWT decode (signature disabled!) |
| Worker | `main.py` | Hatchet workflow |
| Worker | `rag.py` | PDF extraction + Gemini graph gen |

---

## 🔄 Strategy Notes

### Database Decision ✅
**Resolution**: Uses PostgreSQL/Supabase (not EdgeDB from docker-compose)
- Schema defined in `schema.sql`
- Supabase provides auth, storage, and database
- docker-compose EdgeDB is unused/dead code

### Security Posture ⚠️
The current JWT verification is **disabled** (`verify_signature: false`). This is a significant security gap that should be fixed immediately in Phase 1.

### AI Model Strategy
- **Current**: Gemini 2.5 Flash (excellent for document understanding)
- **Future**: Ollama for local/private deployments
- **Monitor**: NVIDIA Nemotron 3 Nano Omni for 100+ page docs

### Phase 1 Architecture Wins
- **Redundancy Avoidance**: Single `/document/:id/chat` endpoint handles all RAG (rejected separate `/query` endpoint)
- **Strict JSON Payload Stripping**: full_content never leaves backend, protects API key exposure
- **Tier-Adaptive Processing**: TINY stores full markdown → LARGE stores only summaries
- **Graph Pruning at Runtime**: Large docs (>1000 nodes) automatically pruned to root nodes only

### Competitor Differentiation
- **vs Notion AI/ChatDOC**: We show actual knowledge graph visualization
- **Roadmap**: Multi-document cross-referencing is unique

---

## 📋 Quick Reference

```bash
# Start frontend
cd apps/web && pnpm dev

# Start backend
cd apps/api-core && uv run python src/api_core/main.py

# Start worker
cd apps/worker-ai && uv run python src/worker_ai/main.py

# Database (Supabase - cloud)
# Env vars needed: SUPABASE_URL, SUPABASE_KEY, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
```