# OmniVault API Reference

Base URL: `http://localhost:8080` (development)

All endpoints that access user-specific resources require the `Authorization: Bearer <token>` header. The token is obtained via `/auth/login` or `/auth/register`.

---

## Authentication

### `POST /auth/register`

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

### `POST /auth/login`

Authenticates an existing user.

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

---

### `GET /documents`

Returns all documents belonging to the authenticated user, newest first.

**Headers**: `Authorization: Bearer <token>`

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{"documents": [{id, status, error_message, created_at}, ...]}` | List of documents |
| 401 | `{"error": "Unauthorized or invalid token"}` | Invalid token |

**Document status values**: `UPLOADED` | `PROCESSING` | `COMPLETED` | `FAILED`

---

### `GET /document/:id/status`

Polls the current processing status of a specific document.

**Headers**: `Authorization: Bearer <token>`

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{"status": "completed", "document_id": "..."}` | Current status |
| 200 | `{"status": "failed", "document_id": "...", "error_message": "..."}` | Failed with error |
| 400 | `{"error": "Missing document ID"}` | No ID in path |
| 401 | `{"error": "Unauthorized or invalid token"}` | Invalid token |
| 404 | `{"error": "Document not found"}` | Document doesn't exist or belongs to another user |

---

### `GET /document/:id/graph`

Retrieves the knowledge graph JSON for a completed document. The `full_content` field is stripped from each node before returning.

**Headers**: `Authorization: Bearer <token>`

**Responses**

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ "metadata": {...}, "nodes": [...], "edges": [...] }` | Graph data |
| 409 | `{"error": "Graph not ready. Current status: processing"}` | Document not yet completed |
| 404 | `{"error": "Document not found"}` | Not found |
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

---

## Chat (RAG over Knowledge Graph)

### `POST /document/:id/chat`

Streams an AI response using the document's knowledge graph as context. Uses Server-Sent Events (SSE) with `data:` messages.

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

`nodeContext` is optional. If provided, the graph is pruned to the selected node and its 1-hop neighbors before sending to Gemini.

**SSE Response Format**

```
data: Hello
data: ,
data: this
data: is
data: a
data: stream
data: ERROR: <error message>
event: error
```

**HTTP Responses**

| Status | Description |
|--------|-------------|
| 200 | SSE stream initiated (no `data: [DONE]` — stream terminates on error) |
| 400 | `{"error": "message is required"}` |
| 400 | `{"error": "No Gemini API key configured. Please add one in Settings."}` |
| 401 | Invalid token |
| 404 | Document not found |
| 409 | `{"error": "Document graph is not ready yet"}` |
| 501 | `{"error": "google-genai package is not installed"}` |

---

## User Settings

### `POST /user/api-key`

Stores the user's Gemini API key in the `users` table.

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**

```json
{
  "api_key": "AIza..."
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
| `id` | UUID | PRIMARY KEY | Supabase Auth user ID |
| `email` | TEXT | NOT NULL UNIQUE | User email |
| `password_hash` | TEXT | NOT NULL | Hash placeholder (Supabase handles auth) |
| `gemini_api_key` | TEXT | | User's Gemini API key (nullable) |

### `documents` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Document ID |
| `owner_id` | UUID | REFERENCES users(id) | Owner FK |
| `status` | TEXT | NOT NULL DEFAULT 'UPLOADED' | Processing status |
| `error_message` | TEXT | | Populated on FAILED |
| `graph_data` | JSONB | | Knowledge graph JSON (COMPLETED) |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT now() | Creation timestamp |
