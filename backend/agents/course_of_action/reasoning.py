import json
import logging
from core.gemma_client import GemmaClient
from agents.course_of_action.tools import TOOL_SCHEMAS

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

def run_copilot_loop(org_id: int, question: str) -> str:
    """
    Run the reasoning copilot loop.
    1. Ask Gemma which tool to call based on user question.
    2. Execute the tool.
    3. Feed findings back to Gemma to compile final response.
    
    Gemma NEVER does math itself — it must call the tools.
    """
    if gemma.mock_mode:
        # Mock logic mapping questions to tools directly
        q_lower = question.lower()
        if "balance" in q_lower or "money" in q_lower or "cash" in q_lower:
            tool_res = execute_tool("get_current_cash_balance", {"org_id": org_id})
            return f"According to your financial data, your current cash balance is {json.loads(tool_res)['cash_balance']}. Let me know if you want to model any scenarios!"
        elif "runway" in q_lower or "burn" in q_lower:
            tool_res = execute_tool("get_cash_runway", {"org_id": org_id})
            return f"Your business runway is computed as {json.loads(tool_res)['runway_days']} days based on your trailing 30-day burn rate."
        elif "reliability" in q_lower or "customer" in q_lower:
            tool_res = execute_tool("get_reliability_score", {"org_id": org_id, "entity_id": 101, "entity_type": "customer"})
            return f"Customer #101 has a payment reliability score of {json.loads(tool_res)['reliability_score']}/100."
        else:
            # Query document intelligence fallback
            tool_res = execute_tool("ask_document_intelligence", {"org_id": org_id, "question": question})
            return json.loads(tool_res)["answer"]

    # Live orchestration
    try:
        # Step 1: LLM Tool Selection
        prompt = (
            "You are the THESEUS Cash Flow Copilot. Analyze the user question and determine which tool to call.\n"
            "If no tool matches, return 'no_tool'.\n"
            f"User Question: {question}"
        )
        tool_call = gemma.complete_function_call(prompt, TOOL_SCHEMAS)
        
        if tool_call and "name" in tool_call:
            name = tool_call["name"]
            args = tool_call.get("arguments", {})
            args["org_id"] = org_id # enforce multi-tenant safety
            
            tool_output = execute_tool(name, args)
            
            # Step 2: Synthesis
            synthesis_prompt = (
                "You are the THESEUS Cash Flow Copilot. Answer the user question utilizing ONLY the quantitative data retrieved from the tool.\n"
                "Do not invent, approximate, or modify any numbers. Cite the tool outputs precisely.\n\n"
                f"Question: {question}\n"
                f"Tool Name: {name}\n"
                f"Tool Output: {tool_output}\n\n"
                "Answer:"
            )
            return gemma.complete_text(synthesis_prompt)
        else:
            # Fallback to document intelligence
            tool_output = execute_tool("ask_document_intelligence", {"org_id": org_id, "question": question})
            return json.loads(tool_output)["answer"]
    except Exception as e:
        logger.error(f"Error in reasoning loop: {e}")
        return "I encountered an error trying to process your request."
