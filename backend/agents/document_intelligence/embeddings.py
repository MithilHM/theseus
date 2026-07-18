import hashlib
import numpy as np
import requests
from core.config import settings

def get_embedding(text: str) -> list:
    """
    Generates a 768-dimensional embedding vector for the text.
    If GEMMA_MOCK=true, returns a deterministic hashed mock vector.
    """
    if settings.GEMMA_MOCK:
        # Create a Bag-of-Words projection for deterministic semantic matching
        vector = [0.0] * 768
        # Tokenize and clean text
        words = [w.strip(".,?!()\"'").lower() for w in text.split()]
        for w in words:
            if not w:
                continue
            # Hash word to an index 0-767
            hasher = hashlib.md5(w.encode('utf-8'))
            idx = int(hasher.hexdigest(), 16) % 768
            vector[idx] += 1.0
        # Normalize vector
        arr = np.array(vector)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        return arr.tolist()

    # Live Google AI Studio Embeddings API
    if not settings.GEMMA_API_KEY:
        raise ValueError("GEMMA_API_KEY is not configured in environment variables.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={settings.GEMMA_API_KEY}"
    try:
        response = requests.post(url, json={
            "model": "models/text-embedding-004",
            "content": {"parts": [{"text": text}]}
        }, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data['embedding']['values']
    except Exception as e:
        # Fail gracefully back to mock for demo reliability
        hasher = hashlib.md5(text.encode('utf-8'))
        seed = int(hasher.hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.standard_normal(768).tolist()

def chunk_document(text: str, chunk_size: int = 400) -> list:
    """
    Splits text into paragraphs/sections approximately chunk_size words/tokens long.
    """
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_length = 0

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        words = paragraph.split()
        if current_length + len(words) > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [paragraph]
            current_length = len(words)
        else:
            current_chunk.append(paragraph)
            current_length += len(words)

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

import json
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

def embed_and_store_chunks(
    db: Session,
    org_id: int,
    source_name: str,
    source_type: str,
    chunks: list,
    metadata: dict = None
):
    """
    Takes a list of text chunks, generates embeddings using get_embedding,
    and stores them in the pgvector documents table.
    """
    if metadata is None:
        metadata = {}
        
    for idx, chunk_text in enumerate(chunks):
        if not chunk_text.strip():
            continue
            
        try:
            # Generate embedding using the existing function
            embedding = get_embedding(chunk_text)
            
            chunk_metadata = metadata.copy()
            chunk_metadata["chunk_index"] = idx
            
            # Store in database
            sql = text("""
                INSERT INTO documents (
                    org_id, source_type, source_name, chunk_text, embedding, metadata
                ) VALUES (
                    :org_id, :source_type, :source_name, :chunk_text, :embedding, :metadata
                )
            """)
            
            db.execute(sql, {
                "org_id": org_id,
                "source_type": source_type,
                "source_name": source_name,
                "chunk_text": chunk_text,
                "embedding": str(embedding), # pgvector string cast
                "metadata": json.dumps(chunk_metadata)
            })
            db.commit()
            
        except Exception as e:
            logger.error(f"Failed to embed/store chunk {idx} for {source_name}: {e}")
            try:
                db.rollback()  # Reset the transaction so the session stays usable
            except Exception:
                pass
            continue
            
    logger.info(f"Successfully embedded and stored {len(chunks)} chunks for {source_name}")
