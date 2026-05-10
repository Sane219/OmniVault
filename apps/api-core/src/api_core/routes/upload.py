import os
import uuid
import json
from robyn import SubRouter, Response
from hatchet_sdk import Hatchet
from api_core.auth_utils import decode_token
from api_core.db import supabase

upload_router = SubRouter(__name__)
hatchet = Hatchet()

LOCAL_STORAGE_DIR = "local_storage"
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)


def _save_file(content: bytes) -> tuple[str, str]:
    """Writes file bytes to local_storage and returns (filename, file_path)."""
    filename = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(LOCAL_STORAGE_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(content)
    return filename, file_path


@upload_router.post("/upload")
async def upload_file(request):
    # ── Auth ──────────────────────────────────────────────────────────────────
    user_id = decode_token(request)
    if not user_id:
        return Response(status_code=401, headers={"Content-Type": "application/json"}, description='{"error": "Unauthorized or invalid token"}')

    try:
        files = request.files
        file_content: bytes | None = None

        if files:
            first_key = list(files.keys())[0]
            file_content = files[first_key]
        elif request.body:
            file_content = request.body
        else:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "No file uploaded"}),
            )

        filename, file_path = _save_file(file_content)

        # ── Persist to Supabase ──────────────────────────────────────────────
        result = (
            supabase.table("documents")
            .insert({"owner_id": user_id, "status": "UPLOADED"})
            .execute()
        )

        if result.data:
            document_id = result.data[0]["id"]
        else:
            # Fallback to a local UUID if Supabase is unreachable during dev
            print("[WARN] Supabase insert returned no data, using local UUID")
            document_id = str(uuid.uuid4())

        # ── Trigger AI Worker ────────────────────────────────────────────────
        hatchet.event.push(
            "document:process",
            {"document_id": document_id, "file_path": file_path},
        )

        return Response(
            status_code=202,
            headers={"Content-Type": "application/json"},
            description=json.dumps({
                "message": "File uploaded and processing started",
                "document_id": document_id,
            }),
        )
    except Exception as e:
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": str(e)}),
        )
