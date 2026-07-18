import pytest
import json
from unittest.mock import MagicMock
from agents.course_of_action.compiler import DynamicContextCompiler, CONVERSATION_HISTORY
from agents.course_of_action.reasoning import run_copilot_loop
from core.gemma_client import GemmaClient

def test_intent_classification_fallback():
    compiler = DynamicContextCompiler()
    
    # Financial metrics intent heuristics
    assert compiler.classify_intent("What is my current cash balance?") == "financial_metric"
    assert compiler.classify_intent("How much revenue did we make in June?") == "financial_metric"
    
    # Forecast intent heuristics
    assert compiler.classify_intent("What is our cash runway?") == "forecast"
    assert compiler.classify_intent("Will we run out of cash next month?") == "forecast"
    
    # Document intelligence heuristics
    assert compiler.classify_intent("What does section 4 of the loan contract say?") == "document"
    assert compiler.classify_intent("Show me the GST tax notice clause") == "document"
    
    # Recommendation heuristics
    assert compiler.classify_intent("Give me some recommendations for next week") == "recommendation"
    
    # Invoice drafting heuristics
    assert compiler.classify_intent("Draft a reminder email for invoice #123") == "invoice_drafting"

def test_context_gathering_mock():
    compiler = DynamicContextCompiler()
    
    # Financial metric context gathering
    context_fin = compiler.gather_context(1, "financial_metric", "What is my cash balance?", db=None)
    assert "current_balance" in context_fin
    assert "monthly_revenue" in context_fin
    assert "outstanding_invoices" in context_fin
    
    # Forecast context gathering
    context_fc = compiler.gather_context(1, "forecast", "What is my cash runway?", db=None)
    assert "burn_rate" in context_fc
    assert "runway_days" in context_fc
    assert "monte_carlo_30_day" in context_fc
    assert "p10" in context_fc["monte_carlo_30_day"]

def test_assemble_prompt_structure():
    compiler = DynamicContextCompiler()
    context = {
        "current_balance": 15000.0,
        "balance_date": "2026-07-18",
        "monthly_revenue": 5000.0,
        "outstanding_invoices": []
    }
    history = [{"role": "user", "content": "hello"}, {"role": "assistant", "content": "hi"}]
    
    prompt = compiler.assemble_prompt(
        question="What is the balance?",
        intent="financial_metric",
        context=context,
        history=history,
        language="Spanish"
    )
    
    # Assert critical grounding rules and math restrictions are present
    assert "You MUST NEVER perform financial calculations" in prompt
    assert "西班牙语" in prompt or "Spanish" in prompt
    assert "Current Balance: $15,000.00" in prompt
    assert "CONVERSATION HISTORY:" in prompt
    assert "hello" in prompt
    assert "What is the balance?" in prompt

def test_conversation_memory_history_updates():
    org_id = 999
    # Clear any past history
    if org_id in CONVERSATION_HISTORY:
        del CONVERSATION_HISTORY[org_id]
        
    compiler = DynamicContextCompiler()
    # Mock GemmaClient to avoid live API calls
    compiler.gemma = MagicMock(spec=GemmaClient)
    compiler.gemma.mock_mode = True
    
    # Run loop first time
    res1 = compiler.compile_and_run(org_id, "What is my current balance?", "English")
    assert org_id in CONVERSATION_HISTORY
    assert len(CONVERSATION_HISTORY[org_id]) == 2
    assert CONVERSATION_HISTORY[org_id][0]["content"] == "What is my current balance?"
    
    # Run loop second time
    res2 = compiler.compile_and_run(org_id, "How long will my runway last?", "English")
    assert len(CONVERSATION_HISTORY[org_id]) == 4
    assert CONVERSATION_HISTORY[org_id][2]["content"] == "How long will my runway last?"

def test_run_copilot_loop_compiler_integration():
    # Make sure run_copilot_loop correctly forwards calls to the compiler
    ans = run_copilot_loop(1, "What is my balance?")
    assert "deterministic SQL database records" in ans or "current cash balance" in ans
