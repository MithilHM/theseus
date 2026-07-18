from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from agents.document_intelligence.embeddings import chunk_document, get_embedding
from agents.document_intelligence.retrieval import IN_MEMORY_DOCS, retrieve_context
from core.gemma_client import GemmaClient
from db.session import SessionLocal

router = APIRouter()
gemma = GemmaClient()

class AskRequest(BaseModel):
    org_id: int
    question: str

class Citation(BaseModel):
    source_name: str
    category: Optional[str] = None
    excerpt: str

class AskResponse(BaseModel):
    answer: str
    citations: List[Citation]

@router.post("/upload")
async def upload_document(
    org_id: int = Form(...),
    source_name: str = Form(...),
    category: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    try:
        content = await file.read()
        text = content.decode('utf-8', errors='ignore')
        
        chunks = chunk_document(text)
        for chunk in chunks:
            vector = get_embedding(chunk)
            # Save to in-memory fallback store
            IN_MEMORY_DOCS.append({
                "org_id": org_id,
                "source_name": source_name,
                "category": category,
                "chunk_text": chunk,
                "embedding": vector
            })
            
        return {"status": "success", "chunks_processed": len(chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest):
    db = SessionLocal()
    try:
        context_chunks = retrieve_context(request.org_id, request.question, k=3, db=db)
        
        if not context_chunks:
            return AskResponse(
                answer="I couldn't find this in your documents.",
                citations=[]
            )
            
        context_text = "\n\n".join([f"Source: {c['source_name']}\nContent: {c['chunk_text']}" for c in context_chunks])
        
        prompt = (
            "You are an assistant answering questions based solely on the provided context.\n"
            "If the answer is not supported by the context, respond exactly with: 'I couldn't find this in your documents.'\n"
            "Never invent facts.\n\n"
            f"Context:\n{context_text}\n\n"
            f"Question: {request.question}\n"
            "Answer:"
        )
        
        answer = gemma.complete_text(prompt)
        
        # If LLM says not found, return empty citations
        if "couldn't find" in answer.lower():
            citations = []
        else:
            citations = [
                Citation(
                    source_name=c['source_name'],
                    category=c.get('category'),
                    excerpt=c['chunk_text'][:200] + "..."
                )
                for c in context_chunks
            ]
            
        return AskResponse(answer=answer, citations=citations)
    finally:
        db.close()
