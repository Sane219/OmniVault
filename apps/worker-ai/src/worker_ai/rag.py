import fitz
import json
import os
import tempfile
import urllib.request
from google import genai
from google.genai import types


def get_page_count(file_path: str) -> int:
    """Get the number of pages in a PDF."""
    content = None
    
    if file_path.startswith("http"):
        req = urllib.request.Request(file_path, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read()
    else:
        with open(file_path, "rb") as f:
            content = f.read()
    
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        doc = fitz.open(tmp_path)
        page_count = len(doc)
        doc.close()
        return page_count
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def extract_document_structure(file_path: str) -> str:
    """Extract raw text and structure it hierarchically page-by-page."""
    content = None
    
    print(f"[RAG] Checking file_path: {file_path[:50]}...")
    
    if file_path.startswith("http"):
        print("[RAG] Downloading file from URL...")
        try:
            req = urllib.request.Request(file_path, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as response:
                content = response.read()
            print(f"[RAG] Downloaded {len(content)} bytes")
        except Exception as e:
            raise ValueError(f"Failed to download file from URL: {e}")
    else:
        with open(file_path, "rb") as f:
            content = f.read()
    
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
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def generate_knowledge_graph(text: str, api_key: str) -> dict:
    """Generate a structured knowledge graph using Gemini with rich content."""
    page_count = text.count("Page ") + 1
    
    tier = "LARGE" if page_count >= 1000 else "MEDIUM" if page_count >= 200 else "SMALL" if page_count >= 50 else "TINY"
    print(f"[GEMINI] Document tier: {tier} ({page_count} pages, ~{page_count * 500} tokens)")
    
    char_limit = min(len(text), 1000000)  # ~500K chars - well under 2M token limit
    
    client = genai.Client(api_key=api_key)
    
    system_instruction = f"""You are an expert Data Engineer. Extract a hierarchical knowledge graph from the document.

DOCUMENT TIER: {tier} ({page_count} pages)

For each section/heading/subsection, extract:
1. "id": unique identifier (lowercase, underscores)
2. "title": section heading exactly as written
3. "level": 1 for major sections, 2 for subsections, 3 for details
4. "page": starting page number (integer)
5. "content_summary": 2-3 sentence summary of this section's content (for LARGE/MEDIUM tiers)
6. "full_content": complete text from this section (for TINY/SMALL tiers only)
7. "keywords": array of 3-5 important terms from this section

Output ONLY valid JSON. No explanations.

Example output format for {tier} tier:
{{
  "metadata": {{"tier": "{tier}", "page_count": {page_count}}},
  "nodes": [
    {{"id": "education", "title": "EDUCATION", "level": 1, "page": 2, "content_summary": "B.Tech in AI/DS from MAIT...", "keywords": ["B.Tech", "MAIT", "2022-2026"]}},
    {{"id": "skills", "title": "SKILLS", "level": 1, "page": 3, "content_summary": "ML, DL, NLP expertise...", "keywords": ["Machine Learning", "NLP", "Computer Vision"]}}
  ],
  "edges": [
    {{"id": "e1", "source": "education", "target": "skills"}}
  ]
}}"""
    
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
    )
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=text[:char_limit],
        config=config
    )
    
    try:
        response_text = response.text.strip()
        print(f"[GEMINI] Raw response: {response_text[:300]}...")
        
        try:
            raw_graph = json.loads(response_text)
        except json.JSONDecodeError:
            import ast
            raw_graph = ast.literal_eval(response_text)
        
        if isinstance(raw_graph, dict):
            if "graph" in raw_graph:
                raw_graph = raw_graph["graph"]
            if "metadata" not in raw_graph:
                raw_graph["metadata"] = {"tier": tier, "page_count": page_count}
        else:
            raise ValueError(f"Invalid response structure: {type(raw_graph)}")
            
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error decoding JSON. Raw response: {response.text if 'response' in locals() else e}")
        raise ValueError("Gemini did not return valid JSON")
    
    nodes = raw_graph.get("nodes", [])
    edges = raw_graph.get("edges", [])
    metadata = raw_graph.get("metadata", {"tier": tier, "page_count": page_count})
    
    for node in nodes:
        if "content_summary" not in node:
            node["content_summary"] = ""
        if "full_content" not in node:
            node["full_content"] = ""
        if "level" not in node:
            node["level"] = 1
    
    final_graph = {
        "metadata": metadata,
        "nodes": [{"id": "root", "title": "Document", "level": 0, "page": 0, "content_summary": "Root node"}] + nodes,
        "edges": edges
    }
    
    print(f"[GEMINI] Converted: {len(final_graph['nodes'])} nodes, {len(final_graph['edges'])} edges")
    return final_graph