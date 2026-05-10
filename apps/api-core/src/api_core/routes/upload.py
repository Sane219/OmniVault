import os
import uuid
import json
import sys
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
    sys.stderr.write("UPLOAD HIT\n")
    sys.stderr.flush()
    
    # ── Auth ──────────────────────────────────────────────────────────────────
    user_id = decode_token(request)
    if not user_id:
        return Response(status_code=401, headers={"Content-Type": "application/json"}, description='{"error": "Unauthorized"}')

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

        sys.stderr.write(f"UPLOAD: saving file for user {user_id}\n")
        sys.stderr.flush()
        
        filename, file_path = _save_file(file_content)

        # ── Persist to Supabase ──────────────────────────────────────────────
        sys.stderr.write("UPLOAD: inserting into documents table\n")
        sys.stderr.flush()
        
        result = (
            supabase.table("documents")
            .insert({"owner_id": user_id, "status": "UPLOADED"})
            .execute()
        )

        if result.data:
            document_id = result.data[0]["id"]
        else:
            sys.stderr.write("[WARN] Supabase insert returned no data, using local UUID\n")
            sys.stderr.flush()
            document_id = str(uuid.uuid4())

        sys.stderr.write(f"UPLOAD: triggering AI worker for doc {document_id}\n")
        sys.stderr.flush()

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
        sys.stderr.write(f"UPLOAD EXCEPTION: {e}\n")
        sys.stderr.flush()
        return Response(
            status_code=500,
            headers={"Content-Type": "application/json"},
            description=json.dumps({"error": str(e)}),
        )