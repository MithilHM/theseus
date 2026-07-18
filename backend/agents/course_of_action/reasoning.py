import json
import logging
from core.gemma_client import GemmaClient
from agents.course_of_action.tools import TOOL_SCHEMAS
from agents.course_of_action.compiler import DynamicContextCompiler

# Fallback implementations or routing for mock/testing
from agents.analytics.core import compute_runway, compute_reliability_score
from agents.analytics.router import get_mock_transactions, get_mock_invoices_payments
from agents.document_intelligence.router import ask_question, AskRequest

logger = logging.getLogger(__name__)
gemma = GemmaClient()

def execute_tool(name: str, args: dict) -> str:
    """
    Executes a matching local calculation/retrieval function based on LLM function-calling request.
    """
    org_id = args.get("org_id", 1)
    
    if name == "get_current_cash_balance":
        df_tx = get_mock_transactions(org_id)
        # return the final running balance from mock transactions
        from agents.analytics.core import compute_cash_flow
        cf = compute_cash_flow(org_id, "1970-01-01", "2099-12-31", transactions_df=df_tx)
        balance = cf['running_balance'].iloc[-1] if not cf.empty else 10000.0
        return json.dumps({"cash_balance": balance})
        
    elif name == "get_cash_runway":
        df_tx = get_mock_transactions(org_id)
        runway = compute_runway(org_id, transactions_df=df_tx)
        return json.dumps({"runway_days": runway if runway is not None else "Positive cash flow (no burn)"})
        
    elif name == "get_reliability_score":
        entity_id = args.get("entity_id", 101)
        entity_type = args.get("entity_type", "customer")
        df_inv, df_pay = get_mock_invoices_payments(org_id)
        score = compute_reliability_score(org_id, entity_id, entity_type, invoices_df=df_inv, payments_df=df_pay)
        return json.dumps({"reliability_score": score})
        
    elif name == "ask_document_intelligence":
        question = args.get("question", "")
        # Forward to Document Intelligence router method
        res = ask_question(AskRequest(org_id=org_id, question=question))
        return json.dumps({"answer": res.answer, "citations": [c.dict() for c in res.citations]})
        
    return json.dumps({"error": f"Tool '{name}' not found."})

compiler = DynamicContextCompiler(gemma)

def run_copilot_loop(org_id: int, question: str, language: str = "English", db = None) -> str:
    """
    Run the reasoning copilot loop utilizing the Dynamic Context Compiler.
    """
    return compiler.compile_and_run(org_id, question, language, db)
