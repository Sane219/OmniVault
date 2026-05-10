import fitz
import json
import os
import tempfile
import urllib.request
from google import genai
from google.genai import types


def extract_document_structure(file_path: str) -> str:
    """
    Extract raw text and structure it hierarchically page-by-page.
    Handles both local file paths and URLs.
    """
    content = None
    
    print(f"[RAG] Checking file_path: {file_path[:50]}...")
    
    if file_path.startswith("http"):
        # Download from URL (Supabase Storage)
        print("[RAG] Downloading file from URL...")
        try:
            req = urllib.request.Request(
                file_path,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                content = response.read()
            print(f"[RAG] Downloaded {len(content)} bytes")
        except Exception as e:
            raise ValueError(f"Failed to download file from URL: {e}")
    else:
        # Local file
        with open(file_path, "rb") as f:
            content = f.read()
    
    # Create a temporary file to process
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    
    print(f"[RAG] Processing temp file: {tmp_path}")
    
    try:
        doc = fitz.open(tmp_path)
        structured_text = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            structured_text.append(f"Page {page_num + 1}:\n{text}")
        doc.close()
        return "\n\n".join(structured_text)
    finally:
        # Clean up temporary file
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def generate_knowledge_graph(text: str, api_key: str) -> dict:
    """Generate a structured knowledge graph using Gemini with the user's API key."""
    print(f"[GEMINI] Input text length: {len(text)} chars")
    
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
        contents=text[:5000],  # Limit text to first 5000 chars
        config=config
    )
    
    print(f"[GEMINI] Raw response: {response.text[:200]}...")
    
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        print(f"Error decoding JSON. Raw response: {response.text}")
        raise ValueError("Gemini did not return valid JSON")