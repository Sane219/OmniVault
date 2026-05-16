import json
from robyn import SubRouter, Response
from api_core.auth_utils import decode_token
from api_core.db import supabase

document_router = SubRouter(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ok(payload: dict) -> Response:
    return Response(
        status_code=200,
        headers={"Content-Type": "application/json"},
        description=json.dumps(payload),
    )


def _err(status: int, message: str) -> Response:
    return Response(
        status_code=status,
        headers={"Content-Type": "application/json"},
        description=json.dumps({"error": message}),
    )


# ── GET /document/:id/status ──────────────────────────────────────────────────

@document_router.get("/document/:id/status")
async def get_document_status(request):
    """
    Returns the processing status of a document from Supabase.
    Status values: UPLOADED | PROCESSING | COMPLETED | FAILED
    Also returns error_message when status is FAILED.
    """
    user_id = decode_token(request)
    if not user_id:
        return _err(401, "Unauthorized or invalid token")

    document_id = request.path_params.get("id")
    if not document_id:
        return _err(400, "Missing document ID")

    try:
        result = (
            supabase.table("documents")
            .select("status, error_message, file_path")
            .eq("id", document_id)
            .eq("owner_id", user_id)
            .limit(1)
            .execute()
        )

        if not result.data:
            return _err(404, "Document not found")

        doc = result.data[0]
        status_str = doc["status"].lower()

        payload: dict = {"status": status_str, "document_id": document_id}
        if doc.get("error_message"):
            payload["error_message"] = doc["error_message"]
        if doc.get("file_path"):
            payload["file_path"] = doc["file_path"]

        return _ok(payload)

    except Exception as e:
        print(f"[WARN] Supabase query failed in status endpoint: {e}")
        return _ok({"status": "processing", "document_id": document_id})


# ── GET /document/:id/graph ───────────────────────────────────────────────────

@document_router.get("/document/:id/graph")
async def get_document_graph(request):
    """
    Returns the knowledge graph JSON stored in Supabase for a completed document.
    STRIPPS full_content from nodes before returning to frontend (JSONB payload protection).
    Frontend only receives: id, title, level, page, content_summary, keywords, edges.
    """
    user_id = decode_token(request)
    if not user_id:
        return _err(401, "Unauthorized or invalid token")

    document_id = request.path_params.get("id")
    if not document_id:
        return _err(400, "Missing document ID")

    try:
        result = (
            supabase.table("documents")
            .select("status, graph_data")
            .eq("id", document_id)
            .eq("owner_id", user_id)
            .limit(1)
            .execute()
        )

        if not result.data:
            return _err(404, "Document not found")

        doc = result.data[0]
        status_str = doc["status"].lower()

        if status_str != "completed":
            return _err(409, f"Graph not ready. Current status: {status_str}")

        if not doc.get("graph_data"):
            return _err(404, "Graph data missing from record")

        graph = doc["graph_data"]
        if isinstance(graph, str):
            graph = json.loads(graph)

        for node in graph.get("nodes", []):
            node.pop("full_content", None)
        
        return _ok(graph)

    except Exception as e:
        return _err(500, str(e))


# ── GET /documents ────────────────────────────────────────────────────────────

@document_router.get("/documents")
async def list_documents(request):
    """
    Returns all documents belonging to the authenticated user, newest first.
    """
    user_id = decode_token(request)
    if not user_id:
        return _err(401, "Unauthorized or invalid token")

    try:
        result = (
            supabase.table("documents")
            .select("id, status, error_message, created_at")
            .eq("owner_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        docs = [
            {
                "id": doc["id"],
                "status": doc["status"].lower(),
                "error_message": doc.get("error_message"),
                "created_at": doc.get("created_at"),
            }
            for doc in (result.data or [])
        ]

        return _ok({"documents": docs})

    except Exception as e:
        print(f"[WARN] Supabase query failed in list endpoint: {e}")
        return _ok({"documents": []})
