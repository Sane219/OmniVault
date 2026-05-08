import os
import uuid
import json
from robyn import SubRouter, Response
from hatchet_sdk import Hatchet

upload_router = SubRouter(__name__)
hatchet = Hatchet()

LOCAL_STORAGE_DIR = "local_storage"
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)

@upload_router.post("/upload")
async def upload_file(request):
    try:
        files = request.files
        
        # In Robyn, file uploads are available via request.files (dict[str, bytes])
        if not files:
            body = request.body
            if body:
                filename = f"{uuid.uuid4()}.pdf"
                file_path = os.path.join(LOCAL_STORAGE_DIR, filename)
                with open(file_path, "wb") as f:
                    f.write(body)
                
                document_id = str(uuid.uuid4())
                hatchet.event.push(
                    "document:process",
                    {"document_id": document_id, "file_path": file_path}
                )
                return Response(
                    status_code=202,
                    headers={"Content-Type": "application/json"},
                    description=json.dumps({"message": "File uploaded and processing started", "document_id": document_id})
                )
            return Response(status_code=400, headers={"Content-Type": "application/json"}, description=json.dumps({"error": "No file uploaded"}))
        
        file_data = list(files.values())[0]
        file_content = file_data
        filename = f"{uuid.uuid4()}.pdf"
        file_path = os.path.join(LOCAL_STORAGE_DIR, filename)
        
        with open(file_path, "wb") as f:
            f.write(file_content)

        document_id = str(uuid.uuid4())
        
        hatchet.event.push(
            "document:process",
            {"document_id": document_id, "file_path": file_path}
        )

        return Response(
            status_code=202, 
            headers={"Content-Type": "application/json"}, 
            description=json.dumps({"message": "File uploaded and processing started", "document_id": document_id})
        )
    except Exception as e:
        return Response(status_code=500, headers={"Content-Type": "application/json"}, description=json.dumps({"error": str(e)}))
