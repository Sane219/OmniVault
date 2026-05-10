import uuid
import json
import sys
from robyn import SubRouter, Response
from hatchet_sdk import Hatchet
from api_core.auth_utils import decode_token
from api_core.db import supabase

upload_router = SubRouter(__name__)
hatchet = Hatchet()

BUCKET_NAME = "documents"


def _ensure_bucket():
    """Ensure the documents bucket exists."""
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if BUCKET_NAME not in bucket_names:
            supabase.storage.create_bucket(BUCKET_NAME, options={"public": True})
            sys.stderr.write(f"Created bucket: {BUCKET_NAME}\n")
    except Exception as e:
        sys.stderr.write(f"Bucket check warning: {e}\n")


def _upload_to_storage(content: bytes, user_id: str) -> str:
    """Uploads file to Supabase Storage and returns the file path."""
    _ensure_bucket()
    
    filename = f"{user_id}/{uuid.uuid4()}.pdf"
    
    supabase.storage.from_(BUCKET_NAME).upload(filename, content, {"content_type": "application/pdf"})
    
    # Get public URL
    file_path = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
    return file_path


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

        sys.stderr.write("UPLOAD: uploading to Supabase Storage\n")
        sys.stderr.flush()
        
        # Upload to Supabase Storage (persistent)
        file_path = _upload_to_storage(file_content, user_id)
        
        sys.stderr.write("UPLOAD: inserting into documents table\n")
        sys.stderr.flush()
        
        result = (
            supabase.table("documents")
            .insert({"owner_id": user_id, "file_path": file_path, "status": "UPLOADED"})
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