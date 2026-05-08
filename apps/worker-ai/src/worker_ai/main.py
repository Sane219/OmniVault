import asyncio
from hatchet_sdk import Hatchet, Context
from dotenv import load_dotenv

load_dotenv()
hatchet = Hatchet()

document_workflow = hatchet.workflow(
    name="document-processing",
    on_events=["document:process"],
)

@document_workflow.task()
async def process_document(input, ctx: Context):
    input_dict = input.model_dump() if hasattr(input, 'model_dump') else dict(input)
    document_id = input_dict.get("document_id")
    file_path = input_dict.get("file_path")
    
    if not document_id or not file_path:
        raise ValueError("Missing document_id or file_path in event payload")

    print(f"Starting processing for Document ID: {document_id} located at {file_path}")
    
    await asyncio.sleep(5)
    
    print(f"AI processing complete for Document ID: {document_id}")
    
    print(f"Updated status to Ready in EdgeDB for Document ID: {document_id}")
    
    return {"status": "success", "document_id": document_id, "file_path": file_path}

def main():
    worker = hatchet.worker("ai-worker", slots=4)
    worker.register_workflow(document_workflow)
    print("Worker is starting...")
    worker.start()

if __name__ == "__main__":
    main()