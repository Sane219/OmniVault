import asyncio
import json
import edgedb
from hatchet_sdk import Hatchet, Context
from dotenv import load_dotenv

from worker_ai.rag import extract_document_structure, generate_knowledge_graph
load_dotenv()
hatchet = Hatchet()

document_workflow = hatchet.workflow(
    name="document-processing",
    on_events=["document:process"],
)


def _update_status(document_id: str, status: str, *, error_message: str | None = None, graph_data: dict | None = None):
    """
    Synchronously updates a Document's status (and optional fields) in EdgeDB.
    status should be one of: 'Processing', 'Completed', 'Failed'
    """
    client = edgedb.create_client()

    if status == "Processing":
        query = """
        UPDATE Document
        FILTER .id = <uuid>$doc_id
        SET { status := DocumentStatus.Processing };
        """
        client.query(query, doc_id=document_id)

    elif status == "Failed":
        query = """
        UPDATE Document
        FILTER .id = <uuid>$doc_id
        SET {
            status := DocumentStatus.Failed,
            error_message := <str>$error_message,
        };
        """
        client.query(query, doc_id=document_id, error_message=error_message or "Unknown error")

    elif status == "Completed":
        query = """
        UPDATE Document
        FILTER .id = <uuid>$doc_id
        SET {
            status := DocumentStatus.Completed,
            graph_data := <json>$graph_data,
        };
        """
        client.query(query, doc_id=document_id, graph_data=json.dumps(graph_data))


@document_workflow.task()
async def process_document(input, ctx: Context):
    input_dict = input.model_dump() if hasattr(input, 'model_dump') else dict(input)
    document_id = input_dict.get("document_id")
    file_path = input_dict.get("file_path")

    if not document_id or not file_path:
        raise ValueError("Missing document_id or file_path in event payload")

    print(f"[Worker] Starting processing for Document ID: {document_id}, file: {file_path}")

    # ── Step 1: Mark as Processing ───────────────────────────────────────────
    try:
        await asyncio.to_thread(_update_status, document_id, "Processing")
    except Exception as e:
        print(f"[Worker][WARN] Could not set Processing status: {e}")
        # Non-fatal: continue processing even if EdgeDB is unavailable

    # ── Step 2: Fetch the user's Gemini API key from EdgeDB ─────────────────
    api_key: str | None = None
    try:
        client = edgedb.create_client()
        query = """
        SELECT Document {
            owner: { gemini_api_key }
        } FILTER .id = <uuid>$doc_id LIMIT 1;
        """
        result = client.query_single(query, doc_id=document_id)

        if not result or not result.owner:
            raise ValueError("Document or owner not found in EdgeDB")

        api_key = result.owner.gemini_api_key
        if not api_key:
            raise ValueError("User has not provided a Gemini API Key")

    except Exception as e:
        error_msg = "Invalid or missing Gemini API Key" if "api" in str(e).lower() or "key" in str(e).lower() else str(e)
        print(f"[Worker] Failed to fetch API key: {e}")
        try:
            await asyncio.to_thread(_update_status, document_id, "Failed", error_message=error_msg)
        except Exception as db_err:
            print(f"[Worker][WARN] Could not persist Failed status: {db_err}")
        return {"status": "error", "document_id": document_id, "error": error_msg}

    # ── Step 3: Extract document structure ───────────────────────────────────
    try:
        structured_text = extract_document_structure(file_path)
    except Exception as e:
        print(f"[Worker] Failed to extract document structure: {e}")
        try:
            await asyncio.to_thread(_update_status, document_id, "Failed", error_message=f"Document extraction failed: {e}")
        except Exception:
            pass
        return {"status": "error", "document_id": document_id, "error": str(e)}

    # ── Step 4: Generate knowledge graph via Gemini ──────────────────────────
    try:
        graph = await asyncio.to_thread(generate_knowledge_graph, structured_text, api_key)
    except Exception as e:
        error_msg = "Invalid or missing Gemini API Key" if "api" in str(e).lower() or "key" in str(e).lower() else f"AI generation failed: {e}"
        print(f"[Worker] Failed to generate knowledge graph: {e}")
        try:
            await asyncio.to_thread(_update_status, document_id, "Failed", error_message=error_msg)
        except Exception:
            pass
        return {"status": "error", "document_id": document_id, "error": error_msg}

    # ── Step 5: Persist Completed status + graph to EdgeDB ───────────────────
    try:
        await asyncio.to_thread(_update_status, document_id, "Completed", graph_data=graph)
        print(f"[Worker] Successfully saved graph for Document ID: {document_id}")
    except Exception as e:
        # Fallback: write to disk if EdgeDB is unavailable
        fallback_path = f"graph_{document_id}.json"
        print(f"[Worker][WARN] Could not persist graph to EdgeDB: {e}. Falling back to {fallback_path}")
        with open(fallback_path, "w", encoding="utf-8") as f:
            json.dump(graph, f, indent=2)

    return {"status": "success", "document_id": document_id}


def main():
    worker = hatchet.worker("ai-worker", slots=4)
    worker.register_workflow(document_workflow)
    print("[Worker] Starting OmniVault AI Worker...")
    worker.start()


if __name__ == "__main__":
    main()