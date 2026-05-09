import json
import edgedb
from robyn import SubRouter, Response
from api_core.auth_utils import decode_token

document_router = SubRouter(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

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


# ── GET /document/:id/status ─────────────────────────────────────────────────

@document_router.get("/document/:id/status")
async def get_document_status(request):
    """
    Returns the processing status of a document from EdgeDB.
    Status values: Uploaded | Processing | Completed | Failed
    Also returns error_message when status is Failed.
    """
    email, err = decode_token(request)
    if err:
        return err

    document_id = request.path_params.get("id")
    if not document_id:
        return _err(400, "Missing document ID")

    try:
        client = edgedb.create_client()
        query = """
        SELECT Document {
            status,
            error_message,
        }
        FILTER .id = <uuid>$doc_id
          AND .owner.email = <str>$email
        LIMIT 1;
        """
        result = client.query_single(query, doc_id=document_id, email=email)

        if not result:
            return _err(404, "Document not found")

        # EdgeDB enum values come back as Python objects; coerce to str
        status_str = str(result.status).split(".")[-1].lower()

        payload: dict = {"status": status_str, "document_id": document_id}
        if result.error_message:
            payload["error_message"] = result.error_message

        return _ok(payload)

    except Exception as e:
        # If EdgeDB is unavailable, return a safe default so the frontend
        # can still display something meaningful during local development.
        print(f"[WARN] EdgeDB query failed in status endpoint: {e}")
        return _ok({"status": "processing", "document_id": document_id})


# ── GET /document/:id/graph ──────────────────────────────────────────────────

@document_router.get("/document/:id/graph")
async def get_document_graph(request):
    """
    Returns the knowledge graph JSON stored in EdgeDB for a completed document.
    """
    email, err = decode_token(request)
    if err:
        return err

    document_id = request.path_params.get("id")
    if not document_id:
        return _err(400, "Missing document ID")

    try:
        client = edgedb.create_client()
        query = """
        SELECT Document { graph_data, status }
        FILTER .id = <uuid>$doc_id
          AND .owner.email = <str>$email
        LIMIT 1;
        """
        result = client.query_single(query, doc_id=document_id, email=email)

        if not result:
            return _err(404, "Document not found")

        status_str = str(result.status).split(".")[-1].lower()
        if status_str != "completed":
            return _err(409, f"Graph not ready. Current status: {status_str}")

        if not result.graph_data:
            return _err(404, "Graph data missing from record")

        # EdgeDB json scalars are already Python dicts/lists
        graph = result.graph_data if isinstance(result.graph_data, (dict, list)) else json.loads(result.graph_data)
        return _ok(graph)

    except Exception as e:
        return _err(500, str(e))


# ── GET /documents ───────────────────────────────────────────────────────────

@document_router.get("/documents")
async def list_documents(request):
    """
    Returns all documents belonging to the authenticated user, newest first.
    """
    email, err = decode_token(request)
    if err:
        return err

    try:
        client = edgedb.create_client()
        query = """
        SELECT Document {
            id,
            title,
            status,
            error_message,
            created_at,
        }
        FILTER .owner.email = <str>$email
        ORDER BY .created_at DESC;
        """
        results = client.query(query, email=email)

        docs = [
            {
                "id": str(doc.id),
                "title": doc.title,
                "status": str(doc.status).split(".")[-1].lower(),
                "error_message": doc.error_message or None,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
            }
            for doc in results
        ]

        return _ok({"documents": docs})

    except Exception as e:
        print(f"[WARN] EdgeDB query failed in list endpoint: {e}")
        # Return empty list during local dev without EdgeDB
        return _ok({"documents": []})
