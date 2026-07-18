from typing import List, Dict
import pandas as pd
from agents.analytics.core import compute_burn_rate, compute_runway, detect_anomalies
from agents.analytics.router import get_mock_transactions
from core.gemma_client import GemmaClient

gemma = GemmaClient()

def get_action_recommendations(org_id: int) -> List[Dict]:
    """
    Analyzes transaction metrics and generates priority-tiered recommendations.
    """
    df_tx = get_mock_transactions(org_id)
    burn_rate = compute_burn_rate(org_id, window_days=30, transactions_df=df_tx)
    runway = compute_runway(org_id, transactions_df=df_tx)
    anomalies = detect_anomalies(org_id, transactions_df=df_tx)
    
    # We construct a prompt for Gemma to organize these metrics into tiered structured recommendations
    metrics_summary = (
        f"Organization ID: {org_id}\n"
        f"Remaining Runway: {runway if runway is not None else 'Cash Flow Positive'} days\n"
        f"Daily Burn Rate: ${burn_rate:.2f}\n"
        f"Anomalies Count: {len(anomalies)}\n"
        f"Details: {[a['description'] for a in anomalies]}"
    )
    
    if gemma.mock_mode:
        # Structured mock recommendations
        recs = [
            {
                "priority": "High",
                "title": "Resolve Potential Duplicate Payments",
                "description": "Found duplicate payments to Landlord in transaction log ($500.00). Inquire immediately.",
                "metric_reference": "$500.00"
            }
        ]
        if runway is not None and runway < 90:
            recs.append({
                "priority": "High",
                "title": "Squeeze Runway Extension",
                "description": f"Remaining runway is {runway:.1f} days. Delay non-essential outflows to raise runway buffer.",
                "metric_reference": f"{runway:.1f} days"
            })
        else:
            recs.append({
                "priority": "Medium",
                "title": "Optimize Utility Contracts",
                "description": "Analyze recurring utility charges to identify constant drain patterns.",
                "metric_reference": "$120.00"
            })
        return recs

    prompt = (
        "You are an SME Financial Advisor. Based on the following metrics, formulate a priority-tiered checklist "
        "of recommendations (High, Medium, Low) for the business owner. Return a JSON array matching the structure:\n"
        "[{\"priority\": \"High|Medium|Low\", \"title\": \"Short Title\", \"description\": \"Actionable recommendation citing specific figures\", \"metric_reference\": \"Exact number/date cited\"}]\n"
        "Never invent figures. Return ONLY the raw JSON string.\n\n"
        f"Metrics:\n{metrics_summary}"
    )
    
    try:
        response = gemma.complete_text(prompt)
        # Parse the JSON string from response
        # Strip any formatting quotes if Gemma wrapped it in markdown
        cleaned_response = response.strip().strip("`").replace("json\n", "")
        import json
        return json.loads(cleaned_response)
    except Exception:
        # Fallback to standard mock
        return [
            {
                "priority": "High",
                "title": "Mitigate Cash Drain",
                "description": f"Trailing burn rate is currently ${burn_rate:.2f}/day. Audit expenses immediately.",
                "metric_reference": f"${burn_rate:.2f}/day"
            }
        ]
