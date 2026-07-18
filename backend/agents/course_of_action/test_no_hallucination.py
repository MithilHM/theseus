import pytest
from agents.course_of_action.reasoning import run_copilot_loop
from agents.document_intelligence.router import ask_question, AskRequest
from agents.document_intelligence.retrieval import IN_MEMORY_DOCS

def test_adversarial_financial_questions():
    # Ask questions asking for unsupported granularity
    # e.g., "What will my balance be in exactly 47 days?"
    # The reasoning loop should decline to guess or request tool query for 30/60/90 days.
    # In mock mode, it queries document intelligence, which should say not found or decline.
    response = run_copilot_loop(1, "What will my cash balance be in exactly 47 days?")
    
    # Assert that it either answers based on general terms or states it cannot verify
    # If it falls back to Document Intelligence, it should return not found.
    assert "47" not in response or "couldn't find" in response.lower() or "not found" in response.lower()

def test_document_intelligence_not_found():
    # Clear in-memory docs so nothing matches
    IN_MEMORY_DOCS.clear()
    
    # Ask a question that definitely has no source context
    res = ask_question(AskRequest(org_id=1, question="What are the details of the secret project contract?"))
    
    assert res.answer == "I couldn't find this in your documents."
    assert len(res.citations) == 0
