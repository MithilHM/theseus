from typing import Dict, List
import pandas as pd
from datetime import datetime
from agents.course_of_action.recommendations import get_action_recommendations
from agents.course_of_action.drafting import draft_invoice_reminder
from agents.analytics.router import get_mock_invoices_payments

def generate_weekly_plan(org_id: int) -> Dict:
    """
    Generates a prioritized weekly action plan including recommendations and
    a pre-drafted reminder message for the highest risk invoice.
    """
    # 1. Fetch action recommendations
    recommendations = get_action_recommendations(org_id)
    
    # 2. Query invoices to find the highest-risk overdue invoice
    df_inv, _ = get_mock_invoices_payments(org_id)
    
    # Filter pending / unpaid invoices
    pending_invoices = df_inv[df_inv['status'].str.lower() == 'pending'].copy()
    
    highest_risk_invoice_id = None
    reminder_draft = None
    
    if not pending_invoices.empty:
        pending_invoices['due_date'] = pd.to_datetime(pending_invoices['due_date'])
        # Sort by oldest due date first (highest risk of delay) then by amount descending
        pending_invoices = pending_invoices.sort_values(by=['due_date', 'amount'], ascending=[True, False])
        
        highest_risk_invoice = pending_invoices.iloc[0]
        highest_risk_invoice_id = int(highest_risk_invoice['id'])
        
        # 3. Draft reminder for this invoice
        reminder_draft = draft_invoice_reminder(org_id, highest_risk_invoice_id, "English")
        
    return {
        "org_id": org_id,
        "week_start": datetime.now().strftime("%Y-%m-%d"),
        "recommendations": recommendations,
        "highest_risk_invoice_id": highest_risk_invoice_id,
        "primary_action_reminder_draft": reminder_draft
    }
