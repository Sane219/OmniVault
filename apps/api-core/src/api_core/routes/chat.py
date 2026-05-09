import json
import asyncio
from robyn import SubRouter, Response, SSEResponse, SSEMessage
from api_core.auth_utils import decode_token
from api_core.db import supabase

try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

chat_router = SubRouter(__name__)

SYSTEM_PROMPT = """You are OmniVault's AI Research Assistant — an expert at analysing structured knowledge graphs extracted from documents.

You will be given a JSON knowledge graph (nodes and edges) derived from a document that the user has uploaded. Use this structured data as your primary source of truth to answer the user's question. Be concise, precise, and cite specific node labels when relevant.

If the user has selected a specific node to focus on, prioritise information related to that node.
"""

# ── Context Pruning ───────────────────────────────────────────────────────────

def _prune_graph(graph_data: dict | list, node_context: dict | None) -> dict | list:
    """
    Reduce graph payload before sending to Gemini.

    - If a node is selected: return only that node + its immediate neighbors.
    - If no node selected but graph > 1000 nodes: return only top-level root nodes
      (nodes that have no incoming edges, i.e. true parents of the tree).
    - Otherwise: return graph as-is.
    """
    if not isinstance(graph_data, dict):
        return graph_data

    nodes: list = graph_data.get("nodes", [])
    edges: list = graph_data.get("edges", [])

    # ── Case 1: Node selected → ego subgraph ─────────────────────────────────
    if node_context and node_context.get("id"):
        focal_id = str(node_context["id"])

        neighbor_ids: set[str] = {focal_id}
        for e in edges:
            src, tgt = str(e.get("source", "")), str(e.get("target", ""))
            if src == focal_id:
                neighbor_ids.add(tgt)
            elif tgt == focal_id:
                neighbor_ids.add(src)

        pruned_nodes = [n for n in nodes if str(n.get("id", "")) in neighbor_ids]
        pruned_edges = [
            e for e in edges
            if str(e.get("source", "")) in neighbor_ids
            and str(e.get("target", "")) in neighbor_ids
        ]
        return {"nodes": pruned_nodes, "edges": pruned_edges}

    # ── Case 2: No selection, large graph → root nodes only ──────────────────
    if len(nodes) > 1000:
        target_ids: set[str] = {str(e.get("target", "")) for e in edges}
        root_nodes = [n for n in nodes if str(n.get("id", "")) not in target_ids]

        root_ids: set[str] = {str(n.get("id", "")) for n in root_nodes}
        root_edges = [
            e for e in edges
            if str(e.get("source", "")) in root_ids
            and str(e.get("target", "")) in root_ids
        ]
        return {"nodes": root_nodes, "edges": root_edges}

    # ── Case 3: Small graph — send everything ─────────────────────────────────
    return graph_data


def _build_prompt(graph_data: dict | list, message: str, node_context: dict | None) -> str:
    pruned = _prune_graph(graph_data, node_context)
    graph_json = json.dumps(pruned, separators=(',', ':'))

    node_section = ""
    if node_context:
        node_section = f"""
The user has selected a specific node from the graph to focus on:
Node ID: {node_context.get('id')}
Node Label: {node_context.get('label')}
Node Type: {node_context.get('type', 'N/A')}

Please prioritise this node when answering.
"""

    return f"""{SYSTEM_PROMPT}

--- KNOWLEDGE GRAPH ---
{graph_json}
--- END GRAPH ---
{node_section}
User Question: {message}

Answer:"""


def _err(status: int, message: str) -> Response:
    return Response(
        status_code=status,
        headers={"Content-Type": "application/json"},
        description=json.dumps({"error": message}),
    )


# ── Route ─────────────────────────────────────────────────────────────────────

@chat_router.post("/document/:id/chat")
async def chat_with_document(request):
    """
    Vectorless RAG chat with streaming SSE response.
    Fetches graph_data + gemini_api_key via a joined Supabase query.
    """
    # ── Auth ──────────────────────────────────────────────────────────────────
    user_id, err = decode_token(request)
    if err:
        return err

    document_id = request.path_params.get("id")
    if not document_id:
        return _err(400, "Missing document ID")

    # ── Parse body ────────────────────────────────────────────────────────────
    try:
        body = json.loads(request.body)
    except Exception:
        return _err(400, "Invalid JSON body")

    message = body.get("message", "").strip()
    if not message:
        return _err(400, "message is required")

    node_context = body.get("nodeContext")  # optional: {id, label, type}

    # ── Fetch document + owner's API key from Supabase (joined) ──────────────
    try:
        response = await asyncio.to_thread(
            lambda: supabase.table("documents")
            .select("*, users(gemini_api_key)")
            .eq("id", document_id)
            .eq("owner_id", user_id)
            .limit(1)
            .execute()
        )

        if not response.data:
            return _err(404, "Document not found")

        doc = response.data[0]

        if not doc.get("graph_data"):
            return _err(409, "Document graph is not ready yet")

        # Supabase returns the foreign-key join under the related table name
        owner_data = doc.get("users") or {}
        api_key = owner_data.get("gemini_api_key") if isinstance(owner_data, dict) else None

        if not api_key:
            return _err(400, "No Gemini API key configured. Please add one in Settings.")

        graph_data = doc["graph_data"]
        if isinstance(graph_data, str):
            graph_data = json.loads(graph_data)

    except Exception as e:
        return _err(500, f"Database error: {e}")

    if not GENAI_AVAILABLE:
        return _err(501, "google-genai package is not installed")

    # Build the prompt with pruned + compressed graph context
    prompt = _build_prompt(graph_data, message, node_context)

    # ── SSE Streaming Generator ───────────────────────────────────────────────
    async def generate():
        try:
            genai_client = genai.Client(api_key=api_key)

            async for chunk in await genai_client.aio.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt,
            ):
                text = getattr(chunk, "text", None)
                if text:
                    yield SSEMessage(data=text)

        except Exception as e:
            yield SSEMessage(data=f"ERROR: {e}", event="error")

    return SSEResponse(generate())
