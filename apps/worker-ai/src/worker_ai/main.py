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

@document_workflow.task()
async def process_document(input, ctx: Context):
    input_dict = input.model_dump() if hasattr(input, 'model_dump') else dict(input)
    document_id = input_dict.get("document_id")
    file_path = input_dict.get("file_path")
    
    if not document_id or not file_path:
        raise ValueError("Missing document_id or file_path in event payload")

    print(f"Starting processing for Document ID: {document_id} located at {file_path}")
    
    # 1. Query EdgeDB for the user's gemini_api_key
    client = edgedb.create_client()
    query = """
    SELECT Document {
        workspace: {
            owner: {
                gemini_api_key
            }
        }
    } FILTER .id = <uuid>$doc_id;
    """
    try:
        result = client.query_single(query, doc_id=document_id)
        if not result or not result.workspace or not result.workspace.owner:
            raise ValueError("Document, workspace, or owner not found")
            
        api_key = result.workspace.owner.gemini_api_key
        if not api_key:
            raise ValueError("User has not provided an API key.")
    except Exception as e:
        print(f"Failed to fetch API key: {e}")
        return {"status": "error", "document_id": document_id, "error": str(e)}
    
    # 2. Extract Document Structure
    try:
        structured_text = extract_document_structure(file_path)
    except Exception as e:
        print(f"Failed to extract document structure: {e}")
        return {"status": "error", "document_id": document_id, "error": str(e)}
        
    # 3. Generate Knowledge Graph
    try:
        # Run synchronous GenAI call in a thread to avoid blocking asyncio loop
        graph = await asyncio.to_thread(generate_knowledge_graph, structured_text, api_key)
        
        output_path = f"graph_{document_id}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(graph, f, indent=2)
    except Exception as e:
        print(f"Failed to generate knowledge graph: {e}")
        return {"status": "error", "document_id": document_id, "error": str(e)}
    
    print(f"AI processing complete for Document ID: {document_id}. Graph saved to {output_path}")
    
    print(f"Updated status to Ready in EdgeDB for Document ID: {document_id}")
    
    return {"status": "success", "document_id": document_id, "file_path": file_path, "graph_file": output_path}

def main():
    worker = hatchet.worker("ai-worker", slots=4)
    worker.register_workflow(document_workflow)
    print("Worker is starting...")
    worker.start()

if __name__ == "__main__":
    main()