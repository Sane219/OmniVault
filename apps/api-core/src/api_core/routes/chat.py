import json
import asyncio
import edgedb
from robyn import SubRouter, Response, SSEResponse, SSEMessage
from api_core.auth_utils import decode_token

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

        # Collect IDs of direct neighbors (one hop in either direction)
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
        # Nodes that never appear as a target have no parents → they are roots
        target_ids: set[str] = {str(e.get("target", "")) for e in edges}
        root_nodes = [n for n in nodes if str(n.get("id", "")) not in target_ids]

        # Include edges between root nodes only
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
    # Prune first, then compress (no whitespace)
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
    Vectorless RAG chat — pruned graph context + SSE streaming via Gemini.
    """
    # ── Auth ──────────────────────────────────────────────────────────────────
    email, err = decode_token(request)
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

    # ── Fetch from EdgeDB ─────────────────────────────────────────────────────
    try:
        db = edgedb.create_client()
        query = """
        SELECT Document {
            graph_data,
            owner: { gemini_api_key }
        }
        FILTER .id = <uuid>$doc_id
          AND .owner.email = <str>$email
        LIMIT 1;
        """
        result = await asyncio.to_thread(
            db.query_single, query, doc_id=document_id, email=email
        )

        if not result:
            return _err(404, "Document not found")
        if not result.graph_data:
            return _err(409, "Document graph is not ready yet")

        api_key = result.owner.gemini_api_key if result.owner else None
        if not api_key:
            return _err(400, "No Gemini API key configured. Please add one in Settings.")

        graph_data = (
            result.graph_data
            if isinstance(result.graph_data, (dict, list))
            else json.loads(result.graph_data)
        )

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
            # Surface the error in-stream so the frontend can render it
            yield SSEMessage(data=f"ERROR: {e}", event="error")

    return SSEResponse(generate())
