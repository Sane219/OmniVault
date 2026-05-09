import fitz
import json
from google import genai
from google.genai import types

def extract_document_structure(file_path: str) -> str:
    """Extract raw text and structure it hierarchically page-by-page."""
    doc = fitz.open(file_path)
    structured_text = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        structured_text.append(f"Page {page_num + 1}:\n{text}")
    return "\n\n".join(structured_text)

def generate_knowledge_graph(text: str, api_key: str) -> dict:
    """Generate a structured knowledge graph using Gemini with the user's API key."""
    client = genai.Client(api_key=api_key)
    
    system_instruction = (
        "You are an expert Data Engineer. "
        "Extract a strict JSON structural graph mapping entities/topics to exact page numbers. "
        "Do not include any summarization or explanation. Output ONLY the JSON."
    )
    
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
    )
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=text,
        config=config
    )
    
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        print(f"Error decoding JSON. Raw response: {response.text}")
        raise ValueError("Gemini did not return valid JSON")
