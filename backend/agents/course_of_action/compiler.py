import logging
import json
import re
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import pandas as pd

from core.gemma_client import GemmaClient
from agents.analytics.core import (
    compute_cash_flow,
    compute_burn_rate,
    compute_runway,
    compute_reliability_score,
    detect_anomalies
)
from agents.analytics.monte_carlo import compute_monte_carlo
from agents.analytics.router import get_mock_transactions, get_mock_invoices_payments
from agents.document_intelligence.retrieval import retrieve_context
from core import query_library

logger = logging.getLogger(__name__)

# Global thread-safe/in-memory store for conversation history per organization
CONVERSATION_HISTORY: Dict[int, List[Dict[str, str]]] = {}

class DynamicContextCompiler:
    def __init__(self, gemma: Optional[GemmaClient] = None):
        self.gemma = gemma or GemmaClient()

    def classify_intent(self, question: str) -> str:
        """
        Classifies the user query into one of the PRD-defined intents.
        Uses Gemma in live mode, regex-based heuristic in mock mode.
        """
        q_lower = question.lower()
        
        # Regex heuristics for fallback / mock mode / rapid classification
        if "draft" in q_lower or "email" in q_lower or "write a reminder" in q_lower or "invoice reminder" in q_lower:
            return "invoice_drafting"
        elif "scenario" in q_lower or "what if" in q_lower or "simulate" in q_lower:
            return "scenario_analysis"
        elif "upload" in q_lower or "statement uploaded" in q_lower or "parsed statement" in q_lower:
            return "upload_analysis"
        elif "voice" in q_lower or "audio" in q_lower or "record" in q_lower or "transcribe" in q_lower:
            return "voice_query"
        elif "forecast" in q_lower or "runway" in q_lower or "burn rate" in q_lower or "out of cash" in q_lower or "cash last" in q_lower:
            return "forecast"
        elif "recommend" in q_lower or "advice" in q_lower or "checklist" in q_lower or "action plan" in q_lower or "suggest" in q_lower:
            return "recommendation"
        elif "contract" in q_lower or "agreement" in q_lower or "gst" in q_lower or "clause" in q_lower or "documents" in q_lower or "policy" in q_lower or "legal" in q_lower or "loan" in q_lower or "repay" in q_lower or "terms" in q_lower:
            return "document"
        elif "balance" in q_lower or "revenue" in q_lower or "sales" in q_lower or "profit" in q_lower or "loss" in q_lower or "income" in q_lower or "invoice" in q_lower or "paid" in q_lower:
            return "financial_metric"
        
        if self.gemma.mock_mode:
            return "chat"
            
        # Live Gemma Intent Classification
        prompt = (
            "You are the THESEUS Intent Classifier. Classify the user question into exactly one of the following intents:\n"
            "- financial_metric (for queries about current/past cash balance, revenue, expenses, profit/loss, invoice status)\n"
            "- forecast (for queries about cash runway, burn rate, future forecast projections)\n"
            "- document (for queries about loan agreements, contracts, tax notices, or documents in RAG)\n"
            "- recommendation (for requests asking for recommendations, advice, or action plans)\n"
            "- chat (for generic greetings, pleasantries, or general conversations)\n"
            "- invoice_drafting (for requests to draft reminder emails or other payment reminders)\n"
            "- scenario_analysis (for what-if scenarios, e.g. simulating increased rent or decreased sales)\n"
            "- upload_analysis (for queries analyzing uploaded statements or files)\n"
            "- voice_query (for queries requesting voice note logging or transcription)\n\n"
            f"User Question: {question}\n\n"
            "Respond ONLY with the name of the intent class (e.g., 'financial_metric'). Do not write explanations or punctuation."
        )
        try:
            res = self.gemma.complete_text(prompt).strip().lower()
            res = re.sub(r'[^a-z_]', '', res)
            valid_intents = {
                "financial_metric", "forecast", "document", "recommendation", 
                "chat", "invoice_drafting", "scenario_analysis", "upload_analysis", "voice_query"
            }
            if res in valid_intents:
                return res
        except Exception as e:
            logger.error(f"Failed to classify intent using Gemma: {e}")
            
        return "chat"

    def gather_context(self, org_id: int, intent: str, question: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Gathers only the relevant context required for the classified intent.
        Strictly prioritizes deterministic computation over LLM generation.
        """
        context = {}
        
        if intent == "financial_metric":
            if db:
                try:
                    balance_data = query_library.get_current_cash_balance(db, org_id)
                    context["current_balance"] = balance_data.get("balance", 0.0)
                    context["balance_date"] = balance_data.get("date")
                    
                    today = datetime.now()
                    month_str = today.strftime("%Y-%m")
                    rev_data = query_library.get_monthly_revenue(db, org_id, month_str)
                    context["monthly_revenue"] = rev_data.get("total_revenue", 0.0)
                    context["revenue_month"] = month_str
                    
                    invoices = query_library.get_outstanding_invoices(db, org_id)
                    context["outstanding_invoices"] = invoices[:5]
                except Exception as e:
                    logger.error(f"Error querying db query library: {e}")
                    self._gather_mock_financial_metrics(org_id, context)
            else:
                self._gather_mock_financial_metrics(org_id, context)
                
        elif intent in ("forecast", "scenario_analysis"):
            if db:
                try:
                    balance_data = query_library.get_current_cash_balance(db, org_id)
                    initial_balance = balance_data.get("balance", 10000.0)
                    
                    forecast_res = query_library.get_cash_runway(db, org_id)
                    context["p10_p50_p90_forecasts"] = forecast_res.get("forecasts", [])
                    
                    df_tx = self._load_transactions_df_from_db(db, org_id)
                    if df_tx is not None and not df_tx.empty:
                        burn_rate = compute_burn_rate(org_id, window_days=30, transactions_df=df_tx)
                        runway = compute_runway(org_id, transactions_df=df_tx, current_balance=initial_balance)
                        mc_results = compute_monte_carlo(org_id, horizon_days=30, transactions_df=df_tx, initial_balance=initial_balance)
                    else:
                        df_tx = get_mock_transactions(org_id)
                        burn_rate = compute_burn_rate(org_id, window_days=30, transactions_df=df_tx)
                        runway = compute_runway(org_id, transactions_df=df_tx, current_balance=initial_balance)
                        mc_results = compute_monte_carlo(org_id, horizon_days=30, transactions_df=df_tx, initial_balance=initial_balance)
                    
                    context["burn_rate"] = burn_rate
                    context["runway_days"] = runway if runway is not None else "Positive cash flow (no burn)"
                    context["monte_carlo_30_day"] = mc_results
                except Exception as e:
                    logger.error(f"Error gathering forecast context from DB: {e}")
                    self._gather_mock_forecasts(org_id, context)
            else:
                self._gather_mock_forecasts(org_id, context)
                
        elif intent == "document":
            try:
                context_chunks = retrieve_context(org_id, question, k=3)
                context["rag_passages"] = [
                    {
                        "source": c["source_name"],
                        "section": c.get("section_label"),
                        "page": c.get("page_number"),
                        "text": c["chunk_text"]
                    }
                    for c in context_chunks
                ]
            except Exception as e:
                logger.error(f"Error querying document intelligence retrieval: {e}")
                context["rag_passages"] = []
                
        elif intent == "recommendation":
            df_tx = self._load_transactions_df_from_db(db, org_id) if db else None
            if df_tx is None or df_tx.empty:
                df_tx = get_mock_transactions(org_id)
                
            burn_rate = compute_burn_rate(org_id, window_days=30, transactions_df=df_tx)
            runway = compute_runway(org_id, transactions_df=df_tx)
            anomalies = detect_anomalies(org_id, transactions_df=df_tx)
            
            df_inv, df_pay = get_mock_invoices_payments(org_id)
            reliability_scores = []
            for cid in df_inv['customer_id'].unique():
                score = compute_reliability_score(org_id, int(cid), 'customer', invoices_df=df_inv, payments_df=df_pay)
                reliability_scores.append({"customer_id": int(cid), "reliability_score": score})
                
            context["burn_rate"] = burn_rate
            context["runway_days"] = runway if runway is not None else "Positive cash flow (no burn)"
            context["anomalies"] = [{"type": a["type"], "description": a["description"]} for a in anomalies]
            context["reliability_scores"] = reliability_scores
            
        elif intent == "invoice_drafting":
            df_inv, _ = get_mock_invoices_payments(org_id)
            inv_id_match = re.search(r'invoice\s*#?\s*(\d+)', question, re.IGNORECASE)
            if inv_id_match:
                inv_id = int(inv_id_match.group(1))
                match = df_inv[df_inv['id'] == inv_id]
                if not match.empty:
                    invoice = match.iloc[0]
                    context["invoice_details"] = {
                        "id": int(invoice["id"]),
                        "amount": float(invoice["amount"]),
                        "due_date": str(invoice["due_date"]),
                        "customer_id": int(invoice["customer_id"]),
                        "status": str(invoice["status"])
                    }
            if "invoice_details" not in context and not df_inv.empty:
                pending = df_inv[df_inv['status'].str.lower() == 'pending'].copy()
                if not pending.empty:
                    pending['due_date'] = pd.to_datetime(pending['due_date'])
                    pending = pending.sort_values(by='due_date', ascending=True)
                    invoice = pending.iloc[0]
                    context["invoice_details"] = {
                        "id": int(invoice["id"]),
                        "amount": float(invoice["amount"]),
                        "due_date": str(invoice["due_date"].strftime('%Y-%m-%d')),
                        "customer_id": int(invoice["customer_id"]),
                        "status": str(invoice["status"])
                    }
                    
        return context

    def _gather_mock_financial_metrics(self, org_id: int, context: dict):
        df_tx = get_mock_transactions(org_id)
        cf = compute_cash_flow(org_id, "1970-01-01", "2099-12-31", transactions_df=df_tx)
        balance = cf['running_balance'].iloc[-1] if not cf.empty else 10000.0
        context["current_balance"] = balance
        context["balance_date"] = str(datetime.now().strftime("%Y-%m-%d"))
        
        today = datetime.now()
        month_str = today.strftime("%Y-%m")
        df_tx['date'] = pd.to_datetime(df_tx['date'])
        month_tx = df_tx[(df_tx['date'].dt.strftime('%Y-%m') == month_str) & (df_tx['direction'] == 'inflow')]
        context["monthly_revenue"] = float(month_tx['amount'].sum()) if not month_tx.empty else 3500.0
        context["revenue_month"] = month_str
        
        df_inv, _ = get_mock_invoices_payments(org_id)
        pending = df_inv[df_inv['status'] == 'pending']
        context["outstanding_invoices"] = [
            {
                "id": int(r["id"]),
                "customer_id": int(r["customer_id"]),
                "amount": float(r["amount"]),
                "due_date": str(r["due_date"]),
                "status": str(r["status"])
            }
            for _, r in pending.iterrows()
        ]

    def _gather_mock_forecasts(self, org_id: int, context: dict):
        df_tx = get_mock_transactions(org_id)
        cf = compute_cash_flow(org_id, "1970-01-01", "2099-12-31", transactions_df=df_tx)
        initial_balance = cf['running_balance'].iloc[-1] if not cf.empty else 10000.0
        
        burn_rate = compute_burn_rate(org_id, window_days=30, transactions_df=df_tx)
        runway = compute_runway(org_id, transactions_df=df_tx, current_balance=initial_balance)
        mc_results = compute_monte_carlo(org_id, horizon_days=30, transactions_df=df_tx, initial_balance=initial_balance)
        
        context["burn_rate"] = burn_rate
        context["runway_days"] = runway if runway is not None else "Positive cash flow (no burn)"
        context["monte_carlo_30_day"] = mc_results

    def _load_transactions_df_from_db(self, db: Session, org_id: int) -> Optional[pd.DataFrame]:
        try:
            from db.models import Transaction
            records = db.query(Transaction).filter(Transaction.org_id == org_id).all()
            if not records:
                return None
            rows = []
            for r in records:
                rows.append({
                    "id": r.id,
                    "org_id": r.org_id,
                    "date": r.date.isoformat() if r.date else None,
                    "amount": float(r.amount),
                    "direction": r.direction,
                    "category": r.category,
                    "counterparty_name": r.counterparty_name,
                    "counterparty_type": r.counterparty_type,
                    "raw_description": r.raw_description,
                    "is_duplicate_flag": r.is_duplicate_flag
                })
            return pd.DataFrame(rows)
        except Exception as e:
            logger.error(f"Failed to load transactions from DB to DataFrame: {e}")
            return None

    def assemble_prompt(self, question: str, intent: str, context: Dict[str, Any], history: List[Dict[str, str]], language: str) -> str:
        """
        Assembles a structured prompt for Gemma enforcing strict math restrictions and language preferences.
        Applies token budgeting by truncating text context representation.
        """
        system_instructions = (
            "You are THESEUS, the AI-Powered SME Financial Copilot. Your role is orchestration, reasoning, "
            "explanation, drafting, and multilingual communication.\n"
            "CRITICAL CONSTRAINT: You MUST NEVER perform financial calculations or compute/approximate numbers yourself. "
            "All math is calculated by the Analytics Agent or queried from the SQL database deterministically. "
            "Use only the provided numbers as-is. If a specific figure is missing, state that it is not available. "
            "Never invent values, and never explain math formulas with custom calculated numbers.\n"
            "Always ground your response strictly in the provided Deterministic Context and SQL/RAG retrieval details.\n"
        )
        
        citation_instructions = (
            "CITATION INSTRUCTIONS:\n"
            "- If explaining document intelligence, cite the source name, section, and page number directly.\n"
            "- If quoting metrics, cite the SQL database or Analytics Agent output.\n"
        )
        
        pref_block = f"USER PREFERENCE:\n- Preferred Language: {language}\n- You must respond entirely in the preferred language.\n"
        
        context_str = "DETERMINISTIC CONTEXT:\n"
        if intent == "financial_metric":
            context_str += f"- Current Balance: ${context.get('current_balance', 0.0):,.2f} (as of {context.get('balance_date', 'N/A')})\n"
            context_str += f"- Monthly Revenue ({context.get('revenue_month', 'N/A')}): ${context.get('monthly_revenue', 0.0):,.2f}\n"
            if "outstanding_invoices" in context:
                context_str += "- Recent Outstanding Invoices:\n"
                for inv in context["outstanding_invoices"]:
                    context_str += f"  * Invoice #{inv['id']} - Customer ID: {inv['customer_id']}, Amount: ${inv['amount']:,.2f}, Due: {inv['due_date']}, Status: {inv['status']}\n"
                    
        elif intent in ("forecast", "scenario_analysis"):
            context_str += f"- Daily Burn Rate: ${context.get('burn_rate', 0.0):,.2f}/day\n"
            context_str += f"- Cash Runway: {context.get('runway_days', 'N/A')} days\n"
            if "monte_carlo_30_day" in context:
                mc = context["monte_carlo_30_day"]
                context_str += (
                    "- 30-Day Monte Carlo Projections:\n"
                    f"  * P10 Balance: ${mc.get('p10', 0.0):,.2f}\n"
                    f"  * P50 Balance: ${mc.get('p50', 0.0):,.2f}\n"
                    f"  * P90 Balance: ${mc.get('p90', 0.0):,.2f}\n"
                    f"  * Shortfall Risk (probability of hitting zero): {mc.get('shortfall_risk', 0.0)*100:.1f}%\n"
                    f"  * Forecast Confidence Volatility Spread: {mc.get('forecast_confidence_volatility', 0.0):.2f}\n"
                )
                
        elif intent == "document":
            if "rag_passages" in context and context["rag_passages"]:
                context_str += "- Retrieved Document Clauses:\n"
                for idx, chunk in enumerate(context["rag_passages"]):
                    text_snippet = chunk["text"][:1000]
                    context_str += f"  [{idx+1}] Source: {chunk['source']} (Section: {chunk['section']}, Page: {chunk['page']})\n"
                    context_str += f"      Excerpt: {text_snippet}\n"
            else:
                context_str += "- No relevant document clauses found.\n"
                
        elif intent == "recommendation":
            context_str += f"- Daily Burn Rate: ${context.get('burn_rate', 0.0):,.2f}/day\n"
            context_str += f"- Cash Runway: {context.get('runway_days', 'N/A')} days\n"
            if "anomalies" in context and context["anomalies"]:
                context_str += "- Detected Anomaly Risks:\n"
                for a in context["anomalies"]:
                    context_str += f"  * [{a['type']}] {a['description']}\n"
            if "reliability_scores" in context and context["reliability_scores"]:
                context_str += "- Customer Payment Reliability (0-100 score):\n"
                for r in context["reliability_scores"]:
                    context_str += f"  * Customer {r['customer_id']}: {r['reliability_score']}/100\n"
                    
        elif intent == "invoice_drafting":
            if "invoice_details" in context:
                inv = context["invoice_details"]
                context_str += (
                    "- Target Invoice Details:\n"
                    f"  * Invoice ID: {inv['id']}\n"
                    f"  * Customer ID: {inv['customer_id']}\n"
                    f"  * Amount Due: ${inv['amount']:,.2f}\n"
                    f"  * Due Date: {inv['due_date']}\n"
                    f"  * Status: {inv['status']}\n"
                )
            else:
                context_str += "- No unpaid invoice details found.\n"
                
        if len(context_str) > 6000:
            context_str = context_str[:6000] + "... [Context Truncated for Budgeting] ..."

        history_str = "CONVERSATION HISTORY:\n"
        for msg in history[-5:]:
            role = "User" if msg["role"] == "user" else "THESEUS"
            history_str += f"- {role}: {msg['content']}\n"
            
        full_prompt = (
            f"{system_instructions}\n"
            f"{citation_instructions}\n"
            f"{pref_block}\n"
            f"{context_str}\n"
            f"{history_str}\n"
            f"USER QUESTION: {question}\n\n"
            "ANSWER:"
        )
        return full_prompt

    def compile_and_run(self, org_id: int, question: str, language: str = "English", db: Optional[Session] = None) -> str:
        """
        Full Dynamic Context Compiler orchestration loop.
        """
        if org_id not in CONVERSATION_HISTORY:
            CONVERSATION_HISTORY[org_id] = []
        history = CONVERSATION_HISTORY[org_id]
        
        # 1. Intent classification
        intent = self.classify_intent(question)
        logger.info(f"DynamicContextCompiler classified query intent: {intent}")
        
        # 2. Gather context
        context = self.gather_context(org_id, intent, question, db)
        
        # 3. Assemble prompt
        prompt = self.assemble_prompt(question, intent, context, history, language)
        
        # 4. Invoke model
        if self.gemma.mock_mode:
            response = self._get_mock_response_for_intent(org_id, intent, question, context, language)
        else:
            response = self.gemma.complete_text(prompt)
            
        # 5. Update history
        history.append({"role": "user", "content": question})
        history.append({"role": "assistant", "content": response})
        if len(history) > 10:
            CONVERSATION_HISTORY[org_id] = history[-10:]
            
        return response

    def _get_mock_response_for_intent(self, org_id: int, intent: str, question: str, context: dict, language: str) -> str:
        lang_lower = language.lower()
        is_spanish = lang_lower in ("spanish", "es")
        
        if intent == "financial_metric":
            bal = context.get("current_balance", 10000.0)
            date = context.get("balance_date", "2026-07-18")
            rev = context.get("monthly_revenue", 3500.0)
            if is_spanish:
                return f"Según los datos financieros deterministas de SQL, su saldo de caja actual es ${bal:,.2f} al {date}. Los ingresos mensuales recaudados para este mes son de ${rev:,.2f}."
            return f"According to deterministic SQL database records, your current cash balance is ${bal:,.2f} as of {date}. Monthly revenue collected for this period is ${rev:,.2f}."
            
        elif intent == "forecast":
            burn = context.get("burn_rate", 0.0)
            runway = context.get("runway_days", "Positive cash flow")
            mc = context.get("monte_carlo_30_day", {})
            p50 = mc.get("p50", 10000.0)
            risk = mc.get("shortfall_risk", 0.0)
            if is_spanish:
                return f"Su tasa de consumo diaria promedio es de ${burn:,.2f}/día. El runway restante calculado es de {runway} días. La simulación de Monte Carlo a 30 días proyecta un saldo P50 de ${p50:,.2f} con un riesgo de déficit del {risk*100:.1f}%."
            return f"Your daily burn rate is ${burn:,.2f}/day. The computed remaining cash runway is {runway} days. The 30-day Monte Carlo simulation projects a P50 balance of ${p50:,.2f} with a shortfall risk of {risk*100:.1f}%."
            
        elif intent == "document":
            rag = context.get("rag_passages", [])
            if not rag:
                if is_spanish:
                    return "No pude encontrar esta información en sus documentos."
                return "I couldn't find this in your documents."
            best_chunk = rag[0]["text"]
            source = rag[0]["source"]
            if is_spanish:
                return f"Según {source}: '{best_chunk[:150]}...'. Esta información está grounded en sus documentos."
            return f"According to {source}: '{best_chunk[:150]}...'. This details are retrieved from your documents."
            
        elif intent == "recommendation":
            burn = context.get("burn_rate", 0.0)
            runway = context.get("runway_days", 0.0)
            anom_desc = context.get("anomalies", [{}])[0].get("description", "Potential duplicate payment.")
            if is_spanish:
                return f"Recomendación Priorizada:\n1. Alta Prioridad: Mitigar anomalías. {anom_desc}\n2. Media Prioridad: Optimizar la tasa de consumo de ${burn:,.2f}/día para extender el runway de {runway} días."
            return f"Prioritized Action Recommendations:\n1. High Priority: Mitigate detected anomaly risks. {anom_desc}\n2. Medium Priority: Optimize the burn rate of ${burn:,.2f}/day to extend the runway of {runway} days."
            
        elif intent == "invoice_drafting":
            inv = context.get("invoice_details", {})
            inv_id = inv.get("id", 1)
            cust_id = inv.get("customer_id", 101)
            amt = inv.get("amount", 0.0)
            due = inv.get("due_date", "2026-07-18")
            if is_spanish:
                return (
                    f"Estimado Cliente (ID: {cust_id}),\n\n"
                    f"Este es un recordatorio de que la factura #{inv_id} por un monto de ${amt:,.2f} vence el {due}. "
                    "Agradecemos su pronto pago.\n\n"
                    "Atentamente,\nEl Equipo de Finanzas"
                )
            return (
                f"Dear Customer (ID: {cust_id}),\n\n"
                f"This is a reminder that invoice #{inv_id} for ${amt:,.2f} is due on {due}. "
                "Please settle the payment at your earliest convenience.\n\n"
                "Best regards,\nThe Finance Team"
            )
            
        if is_spanish:
            return "Hola, soy THESEUS. ¿Cómo puedo ayudarle hoy con sus finanzas?"
        return "Hello, I am THESEUS. How can I help you manage your finances today?"
