import asyncio
import json
import os
from hatchet_sdk import Hatchet, Context
from dotenv import load_dotenv
from supabase import create_client, Client

from worker_ai.rag import extract_document_structure, generate_knowledge_graph
from worker_ai.crypto_utils import decrypt_value, is_encrypted

load_dotenv()

# ── Supabase client ────────────────────────────────────────────────────────────
_supabase_url: str = os.getenv("SUPABASE_URL", "")
_supabase_key: str = os.getenv("SUPABASE_KEY", "")
supabase: Client = create_client(_supabase_url, _supabase_key)

# ── Hatchet setup ──────────────────────────────────────────────────────────────
hatchet = Hatchet()

document_workflow = hatchet.workflow(
    name="document-processing",
    on_events=["document:process"],
)


def _update_status(
    document_id: str,
    status: str,
    *,
    error_message: str | None = None,
    graph_data: dict | None = None,
) -> None:
    """
    Synchronously updates a document's status (and optional fields) in Supabase.
    status should be one of: 'PROCESSING' | 'COMPLETED' | 'FAILED'
    """
    update_payload: dict = {"status": status}

    if status == "FAILED":
        update_payload["error_message"] = error_message or "Unknown error"

    if status == "COMPLETED" and graph_data is not None:
        # Supabase handles Python dict → JSONB conversion automatically
        update_payload["graph_data"] = graph_data

    supabase.table("documents").update(update_payload).eq("id", document_id).execute()


def _stream(ctx: Context, step: str, progress: int, message: str) -> None:
    """Send a progress event to the Hatchet stream."""
    try:
        ctx.put_stream(json.dumps({
            "step": step,
            "progress": progress,
            "message": message,
        }))
    except Exception as e:
        print(f"[Worker][WARN] Stream event failed: {e}")


@document_workflow.task()
async def process_document(input, ctx: Context):
    input_dict = input.model_dump() if hasattr(input, "model_dump") else dict(input)
    document_id = input_dict.get("document_id")
    file_path = input_dict.get("file_path")

    if not document_id or not file_path:
        raise ValueError("Missing document_id or file_path in event payload")

    print(f"[Worker] Starting processing for Document ID: {document_id}, file: {file_path}")

    # ── Step 1: Mark as PROCESSING ───────────────────────────────────────────
    _stream(ctx, "status", 5, "Starting document processing...")
    try:
        await asyncio.to_thread(_update_status, document_id, "PROCESSING")
    except Exception as e:
        print(f"[Worker][WARN] Could not set PROCESSING status: {e}")

    # ── Step 2: Fetch the user's Gemini API key (joined query) ──────────────
    _stream(ctx, "api_key", 10, "Fetching API key...")
    api_key: str | None = None
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("documents")
            .select("*, users(gemini_api_key)")
            .eq("id", document_id)
            .limit(1)
            .execute()
        )

        if not result.data:
            raise ValueError("Document not found in Supabase")

        doc = result.data[0]
        owner_data = doc.get("users") or {}
        api_key = owner_data.get("gemini_api_key") if isinstance(owner_data, dict) else None

        if not api_key:
            raise ValueError("User has not provided a Gemini API Key")

        # Decrypt API key if it's encrypted
        if is_encrypted(api_key):
            try:
                api_key = decrypt_value(api_key)
            except Exception as e:
                raise ValueError(f"Failed to decrypt API key: {e}")

    except Exception as e:
        error_msg = (
            "Invalid or missing Gemini API Key"
            if "api" in str(e).lower() or "key" in str(e).lower()
            else str(e)
        )
        print(f"[Worker] Failed to fetch API key: {e}")
        _stream(ctx, "error", 0, f"Failed: {error_msg}")
        try:
            await asyncio.to_thread(_update_status, document_id, "FAILED", error_message=error_msg)
        except Exception as db_err:
            print(f"[Worker][WARN] Could not persist FAILED status: {db_err}")
        return {"status": "error", "document_id": document_id, "error": error_msg}

    # ── Step 3: Extract document structure ───────────────────────────────────
    _stream(ctx, "extracting", 25, "Extracting text from PDF...")
    try:
        structured_text = await asyncio.to_thread(extract_document_structure, file_path)
        _stream(ctx, "extracting", 50, "Text extraction complete.")
    except Exception as e:
        print(f"[Worker] Failed to extract document structure: {e}")
        _stream(ctx, "error", 0, f"Extraction failed: {e}")
        try:
            await asyncio.to_thread(
                _update_status, document_id, "FAILED",
                error_message=f"Document extraction failed: {e}",
            )
        except Exception:
            pass
        return {"status": "error", "document_id": document_id, "error": str(e)}

    # ── Step 4: Generate knowledge graph via Gemini ──────────────────────────
    _stream(ctx, "generating", 60, "Generating knowledge graph with AI...")
    try:
        graph = await asyncio.to_thread(generate_knowledge_graph, structured_text, api_key)
        _stream(ctx, "generating", 90, "Knowledge graph generated.")
    except Exception as e:
        error_msg = (
            "Invalid or missing Gemini API Key"
            if "api" in str(e).lower() or "key" in str(e).lower()
            else f"AI generation failed: {e}"
        )
        print(f"[Worker] Failed to generate knowledge graph: {e}")
        _stream(ctx, "error", 0, f"Failed: {error_msg}")
        try:
            await asyncio.to_thread(_update_status, document_id, "FAILED", error_message=error_msg)
        except Exception:
            pass
        return {"status": "error", "document_id": document_id, "error": error_msg}

    # ── Step 5: Persist COMPLETED status + graph to Supabase ─────────────────
    _stream(ctx, "saving", 95, "Saving results...")
    try:
        await asyncio.to_thread(_update_status, document_id, "COMPLETED", graph_data=graph)
        print(f"[Worker] Successfully saved graph for Document ID: {document_id}")
    except Exception as e:
        fallback_path = f"graph_{document_id}.json"
        print(f"[Worker][WARN] Could not persist graph to Supabase: {e}. Falling back to {fallback_path}")
        with open(fallback_path, "w", encoding="utf-8") as f:
            json.dump(graph, f, indent=2)

    _stream(ctx, "completed", 100, "Processing complete!")
    return {"status": "success", "document_id": document_id}


def main():
    worker = hatchet.worker("ai-worker", slots=4)
    worker.register_workflow(document_workflow)
    print("[Worker] Starting OmniVault AI Worker...")
    worker.start()


if __name__ == "__main__":
    main()
