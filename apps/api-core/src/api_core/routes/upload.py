import os
import uuid
import json
import edgedb
from robyn import SubRouter, Response
from hatchet_sdk import Hatchet
from api_core.auth_utils import decode_token

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


def _insert_document(email: str, title: str, file_url: str) -> str:
    """Inserts a Document record owned by the given user and returns its UUID string."""
    client = edgedb.create_client()
    query = """
    WITH user := (SELECT User FILTER .email = <str>$email LIMIT 1)
    INSERT Document {
        title := <str>$title,
        file_url := <str>$file_url,
        owner := user,
        status := DocumentStatus.Uploaded,
    };
    """
    result = client.query_single(query, email=email, title=title, file_url=file_url)
    return str(result.id)


@upload_router.post("/upload")
async def upload_file(request):
    # ── Auth ──────────────────────────────────────────────────────────────────
    email, err = decode_token(request)
    if err:
        return err

    try:
        files = request.files
        file_content: bytes | None = None
        original_name = "document.pdf"

        if files:
            first_key = list(files.keys())[0]
            file_content = files[first_key]
            original_name = first_key if first_key.endswith(".pdf") else f"{first_key}.pdf"
        elif request.body:
            file_content = request.body
        else:
            return Response(
                status_code=400,
                headers={"Content-Type": "application/json"},
                description=json.dumps({"error": "No file uploaded"}),
            )

        filename, file_path = _save_file(file_content)

        # ── Persist to EdgeDB ────────────────────────────────────────────────
        try:
            document_id = _insert_document(
                email=email,
                title=original_name,
                file_url=file_path,
            )
        except Exception as db_err:
            # EdgeDB may not be running in dev — fall back to a local UUID
            print(f"[WARN] EdgeDB insert failed, using local UUID: {db_err}")
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
