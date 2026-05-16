# OmniVault API Reference

Base URL: `http://localhost:8080` (development)

All endpoints that access user-specific resources require the `Authorization: Bearer <token>` header. The token is obtained via `/register` or `/login`.

---

## Authentication

### `POST /register`

Creates a new user account via Supabase Auth and syncs to the local `users` table.

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 201 | `{"access_token": "...", "user": {...}}` | Registration successful, session created |
| 201 | `{"message": "...", "user": {...}}` | Registration successful, email confirmation pending |
| 400 | `{"error": "Email and password required"}` | Missing fields |
| 409 | `{"error": "User already registered"}` | Duplicate email |
| 500 | `{"error": "..."}` | Server error |

---

### `POST /login`

Authenticates an existing user via Supabase Auth.

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{"access_token": "...", "user": {...}}` | Login successful |
| 400 | `{"error": "Email not confirmed. Please check your inbox."}` | Email unconfirmed |
| 401 | `{"error": "Invalid credentials"}` | Wrong email or password |

---

## Document Management

### `POST /upload`

Uploads a PDF file, stores it in Supabase Storage, creates a document record, and triggers the AI worker for processing.

**Request**: `multipart/form-data` or raw `application/octet-stream` binary

**Headers**: `Authorization: Bearer <token>`

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 202 | `{"message": "File uploaded and processing started", "document_id": "uuid"}` | Upload accepted, processing queued |
| 400 | `{"error": "No file uploaded"}` | No file data in request |
| 401 | `{"error": "Unauthorized"}` | Missing or invalid token |
| 500 | `{"error": "..."}` | Server error |

**Processing Pipeline**

After upload, the document goes through: `UPLOADED` → `PROCESSING` → `COMPLETED` | `FAILED`

The worker extracts text via PyMuPDF, generates a knowledge graph via Gemini 2.5 Flash, and stores the result in the `graph_data` JSONB column.

---

### `GET /documents`

Returns all documents belonging to the authenticated user, newest first.

**Headers**: `Authorization: Bearer <token>`

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{"documents": [{id, status, error_message, created_at}, ...]}` | List of documents |
| 401 | `{"error": "Unauthorized or invalid token"}` | Invalid token |

**Document status values**: `uploaded` | `processing` | `completed` | `failed`

---

### `GET /document/:id/status`

Polls the current processing status of a specific document.

**Headers**: `Authorization: Bearer <token>`

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{"status": "completed", "document_id": "..."}` | Current status |
| 200 | `{"status": "failed", "document_id": "...", "error_message": "..."}` | Failed with error message |
| 400 | `{"error": "Missing document ID"}` | No ID in path |
| 401 | `{"error": "Unauthorized or invalid token"}` | Invalid token |
| 404 | `{"error": "Document not found"}` | Document doesn't exist or belongs to another user |

---

### `GET /document/:id/graph`

Retrieves the knowledge graph JSON for a completed document. The `full_content` field is **stripped** from each node before returning (JSONB payload protection).

**Headers**: `Authorization: Bearer <token>`

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{"metadata": {...}, "nodes": [...], "edges": [...]}` | Graph data |
| 409 | `{"error": "Graph not ready. Current status: processing"}` | Document not yet completed |
| 404 | `{"error": "Document not found"}` | Not found or not owned by user |
| 401 | `{"error": "Unauthorized or invalid token"}` | Invalid token |

**Graph Node Shape** (after stripping):

```json
{
  "id": "string",
  "title": "string",
  "level": 0 | 1 | 2 | 3,
  "page": 0,
  "content_summary": "string",
  "keywords": ["string"]
}
```

**Graph Edge Shape**:

```json
{
  "id": "string",
  "source": "string",
  "target": "string"
}
```

**Graph Metadata**:

```json
{
  "tier": "TINY | SMALL | MEDIUM | LARGE",
  "page_count": 42
}
```

---

## Chat (RAG over Knowledge Graph)

### `POST /document/:id/chat`

Streams an AI response using the document's knowledge graph as context. Uses Server-Sent Events (SSE) with `data:` messages. The graph is pruned based on the selected node before sending to Gemini.

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**

```json
{
  "message": "What is the document about?",
  "nodeContext": {
    "id": "node-123",
    "label": "SKILLS",
    "type": "section"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `message` | Yes | The user's question |
| `nodeContext` | No | If provided, prunes graph to this node + 1-hop neighbors |

**SSE Response Format**

```
data: Hello
data: ,
data: this
data: is
data: a
data: stream
```

Error during streaming:

```
data: ERROR: Invalid API key
event: error
```

**HTTP Responses**

| Status | Body | Description |
|--------|------|-------------|
| 200 | SSE stream | Streaming response (connection closes when done) |
| 400 | `{"error": "message is required"}` | Empty message |
| 400 | `{"error": "No Gemini API key configured..."}` | User hasn't set API key |
| 401 | `{"error": "Unauthorized or invalid token"}` | Invalid token |
| 404 | `{"error": "Document not found"}` | Not found |
| 409 | `{"error": "Document graph is not ready yet"}` | Still processing |
| 501 | `{"error": "google-genai package is not installed"}` | Missing dependency |

**Graph Pruning Logic**

1. **Node selected**: Returns the selected node + its immediate neighbors (ego subgraph)
2. **No node, large graph (>1000 nodes)**: Returns only root nodes (no incoming edges)
3. **No node, small graph**: Returns the full graph

---

## User Settings

### `POST /user/api-key`

Stores the user's Gemini API key in the `users` table. Required for document processing and chat.

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**

```json
{
  "api_key": "AIzaSy..."
}
```

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{"message": "API key updated successfully"}` | Key saved |
| 400 | `{"error": "api_key is required"}` | Missing field |
| 401 | `{"error": "Unauthorized"}` | Invalid token |
| 500 | `{"error": "Internal server error"}` | Server error |

---

## Database Schema

### `users` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Supabase Auth user ID |
| `email` | TEXT | NOT NULL, UNIQUE | User email address |
| `password_hash` | TEXT | NOT NULL | Placeholder (Supabase handles actual auth) |
| `gemini_api_key` | TEXT | NULLABLE | User's Google Gemini API key |

### `documents` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Document ID |
| `owner_id` | UUID | REFERENCES users(id) ON DELETE CASCADE | Document owner |
| `status` | TEXT | NOT NULL, DEFAULT 'UPLOADED' | Processing lifecycle status |
| `error_message` | TEXT | NULLABLE | Error details when status = FAILED |
| `graph_data` | JSONB | NULLABLE | Knowledge graph JSON when status = COMPLETED |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes**: `documents_owner_id_idx` on `owner_id` for fast per-user document listing.

### Storage

Supabase Storage bucket: `documents` (public). Files are stored at `{user_id}/{uuid}.pdf`.
