import pytest
from agents.document_intelligence.embeddings import chunk_document, get_embedding
from agents.document_intelligence.retrieval import IN_MEMORY_DOCS, retrieve_context, cosine_similarity
from agents.course_of_action.reasoning import execute_tool, run_copilot_loop
from agents.course_of_action.recommendations import get_action_recommendations
from agents.course_of_action.drafting import draft_invoice_reminder

def test_document_chunking():
    long_text = "This is paragraph 1.\n\nThis is paragraph 2.\n\nThis is paragraph 3."
    chunks = chunk_document(long_text, chunk_size=2)
    # Since chunk_size is 2 words, it should split into 3 chunks
    assert len(chunks) == 3
    assert "paragraph 1" in chunks[0]
    assert "paragraph 2" in chunks[1]

def test_embeddings_and_retrieval_flow():
    # Insert mock chunks into IN_MEMORY_DOCS
    doc1 = "The interest rate on this credit line is 5.4%."
    doc2 = "Monthly utility payments are due on the 10th day."
    
    org_id = 99
    
    # Reset in-memory store
    IN_MEMORY_DOCS.clear()
    
    for idx, text in enumerate([doc1, doc2]):
        IN_MEMORY_DOCS.append({
            "org_id": org_id,
            "source_name": f"contract_{idx}.txt",
            "section_label": None,
            "page_number": None,
            "chunk_text": text,
            "embedding": get_embedding(text)
        })
        
    # Search for interest rate
    results = retrieve_context(org_id, "What is the interest rate?", k=1)
    assert len(results) == 1
    assert "5.4%" in results[0]["chunk_text"]

def test_copilot_tool_routing():
    # Test runway tool execution
    res = execute_tool("get_cash_runway", {"org_id": 1})
    assert "runway_days" in res
    
    # Test reliability score execution
    res_score = execute_tool("get_reliability_score", {"org_id": 1, "entity_id": 101, "entity_type": "customer"})
    assert "reliability_score" in res_score

def test_run_copilot_loop():
    answer_balance = run_copilot_loop(1, "What is my current cash balance?")
    assert "balance" in answer_balance.lower()
    
    answer_runway = run_copilot_loop(1, "How much runway do I have left?")
    assert "runway" in answer_runway.lower()

def test_get_action_recommendations():
    recs = get_action_recommendations(1)
    assert len(recs) > 0
    assert "priority" in recs[0]
    assert "title" in recs[0]

def test_draft_invoice_reminder():
    reminder = draft_invoice_reminder(1, 1, "Spanish")
    assert "estimado" in reminder.lower() or "factura" in reminder.lower()
