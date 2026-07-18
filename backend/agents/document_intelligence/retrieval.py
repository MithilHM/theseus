import numpy as np
from agents.document_intelligence.embeddings import get_embedding

# Simple in-memory fallback store for the hackathon / testing
IN_MEMORY_DOCS = []

def cosine_similarity(v1: list, v2: list) -> float:
    a = np.array(v1)
    b = np.array(v2)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

def retrieve_context(org_id: int, query: str, k: int = 5, db = None) -> list:
    """
    Retrieves the top-k chunks matching the query using cosine similarity.
    Falls back to the in-memory document list if db is not present.
    """
    query_vector = get_embedding(query)
    
    if db is None:
        # Fallback to in-memory store
        results = []
        for doc in IN_MEMORY_DOCS:
            if doc['org_id'] == org_id:
                sim = cosine_similarity(query_vector, doc['embedding'])
                results.append((sim, doc))
        
        # Sort by similarity descending
        results.sort(key=lambda x: x[0], reverse=True)
        return [res[1] for res in results[:k]]

    # PostgreSQL / pgvector query implementation
    try:
        # Utilizing pgvector cosine distance `<=>` operator (1 - similarity)
        # We order by distance ascending (meaning similarity descending)
        raw_results = db.execute(
            "SELECT chunk_text, source_name, section_label, page_number, (embedding <=> :query_vec) as distance "
            "FROM documents WHERE org_id = :org_id "
            "ORDER BY distance ASC LIMIT :limit",
            {
                "query_vec": str(query_vector),
                "org_id": org_id,
                "limit": k
            }
        ).fetchall()
        
        docs = []
        for row in raw_results:
            docs.append({
                "chunk_text": row[0],
                "source_name": row[1],
                "section_label": row[2],
                "page_number": row[3],
                "similarity": 1.0 - float(row[4])
            })
        return docs
    except Exception as e:
        # Fallback to in-memory on database error
        return retrieve_context(org_id, query, k, db=None)
