import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))


import os, time, hashlib
from pathlib import Path
import fitz  # PyMuPDF
from typing import Dict, Any, List, Optional
from pinecone import Pinecone
from utils.openai_client import get_embeddings
from ingest.text_utils import legal_text_splitter

# --- Pinecone client ---
PC = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
PINECONE_INDEX = os.getenv("PINECONE_INDEX")
INDEX = PC.Index(PINECONE_INDEX)

def pdf_to_text(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    texts = []
    for page in doc:
        texts.append(page.get_text("text"))
    return "\n".join(texts)

def sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

def extract_article_id(text: str) -> Optional[str]:
    import re
    m = re.search(r'\b(Article|Art)\.?\s+\d+(\(\d+\))?', text, re.IGNORECASE)
    return m.group(0) if m else None

def run_ingest(pdf_path: str, source_uri: str, source_version: str):
    raw = pdf_to_text(pdf_path)
    splitter = legal_text_splitter()
    chunks: List[str] = splitter.split_text(raw)

    emb = get_embeddings()
    doc_id = sha1(source_uri + ":" + source_version)

    vectors = []
    for i, text in enumerate(chunks):
        vec = emb.embed_query(text)
        vectors.append({
            "id": f"{doc_id}:{i}",
            "values": vec,
            "metadata": {
                "text": text,
                "article_id": extract_article_id(text) or "",
                "source_uri": source_uri,
                "source_version": source_version,
                "doc_id": doc_id,
                "chunk_id": f"{doc_id}:{i}"
            }
        })

    if vectors:
        BATCH = 100
        for s in range(0, len(vectors), BATCH):
            INDEX.upsert(vectors=vectors[s:s+BATCH])
        print(f"[ingest] upserted {len(vectors)} vectors into Pinecone index={PINECONE_INDEX} doc_id={doc_id}")
    else:
        print("[ingest] no chunks generated — check your PDF/path")

if __name__ == "__main__":
    pdf = "./EU_AI_doc.pdf"
    source_uri = "eurlex:eu_ai_act_official_journal"
    source_version = "OJ-2024-07-12"
    run_ingest(pdf, source_uri, source_version)
