from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
import pandas as pd
from datetime import datetime, timedelta
from agents.analytics.core import (
    compute_cash_flow,
    compute_burn_rate,
    compute_runway,
    compute_reliability_score,
    detect_anomalies
)
from agents.analytics.monte_carlo import compute_monte_carlo

router = APIRouter()

# Helper to generate mock data if DB is empty or not connected
def get_mock_transactions(org_id: int) -> pd.DataFrame:
    base_date = datetime.now() - timedelta(days=60)
    rows = []
    # 60 days of mock transaction data
    for i in range(60):
        date_str = (base_date + timedelta(days=i)).strftime('%Y-%m-%d')
        # Inflows (revenue)
        if i % 4 == 0:
            rows.append({
                "id": i * 2,
                "org_id": org_id,
                "amount": 3500.0,
                "date": date_str,
                "direction": "inflow",
                "category": "revenue",
                "counterparty_name": "Acme Corp"
            })
        # Outflows (rent, payroll, utilities)
        if i % 30 == 0:
            rows.append({
                "id": i * 2 + 1,
                "org_id": org_id,
                "amount": 2000.0,
                "date": date_str,
                "direction": "outflow",
                "category": "rent",
                "counterparty_name": "RealEstate Ltd"
            })
        rows.append({
            "id": i * 2 + 2,
            "org_id": org_id,
            "amount": 120.0,
            "date": date_str,
            "direction": "outflow",
            "category": "utilities",
            "counterparty_name": "Power Grid"
        })
    return pd.DataFrame(rows)

def get_mock_invoices_payments(org_id: int):
    invoices = pd.DataFrame([
        {"id": 1, "org_id": org_id, "customer_id": 101, "amount": 5000.0, "due_date": (datetime.now() - timedelta(days=10)).strftime('%Y-%m-%d'), "status": "paid"},
        {"id": 2, "org_id": org_id, "customer_id": 101, "amount": 4500.0, "due_date": (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d'), "status": "paid"},
        {"id": 3, "org_id": org_id, "customer_id": 102, "amount": 12000.0, "due_date": (datetime.now() + timedelta(days=15)).strftime('%Y-%m-%d'), "status": "pending"}
    ])
    payments = pd.DataFrame([
        {"id": 1, "org_id": org_id, "invoice_id": 1, "amount": 5000.0, "payment_date": (datetime.now() - timedelta(days=12)).strftime('%Y-%m-%d')}, # On-time
        {"id": 2, "org_id": org_id, "invoice_id": 2, "amount": 4500.0, "payment_date": (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')}  # Late by 4 days
    ])
    return invoices, payments

@router.get("/")
def get_analytics_status():
    return {"status": "healthy", "service": "analytics"}

@router.get("/forecast/{org_id}")
def get_forecast(org_id: int, horizon: int = Query(30, enum=[30, 60, 90])):
    """
    Returns the P10, P50, P90 forecast and simulation metrics for the requested horizon.
    """
    df_tx = get_mock_transactions(org_id)
    
    # Calculate starting balance
    cf = compute_cash_flow(org_id, "1970-01-01", "2099-12-31", transactions_df=df_tx)
    initial_balance = cf['running_balance'].iloc[-1] if not cf.empty else 10000.0
    
    results = compute_monte_carlo(
        org_id=org_id,
        horizon_days=horizon,
        transactions_df=df_tx,
        initial_balance=initial_balance,
        num_simulations=10000,
        threshold=0.0
    )
    return results

@router.get("/summary/{org_id}")
def get_summary(org_id: int):
    """
    Returns the Executive Summary block for the dashboard.
    """
    df_tx = get_mock_transactions(org_id)
    df_inv, df_pay = get_mock_invoices_payments(org_id)
    
    cf = compute_cash_flow(org_id, "1970-01-01", "2099-12-31", transactions_df=df_tx)
    cash_balance = float(cf['running_balance'].iloc[-1]) if not cf.empty else 10000.0
    net_cash_flow = float(cf['net_flow'].iloc[-1]) if not cf.empty else 0.0
    
    burn_rate = compute_burn_rate(org_id, window_days=30, transactions_df=df_tx)
    runway = compute_runway(org_id, transactions_df=df_tx, current_balance=cash_balance)
    
    # Compute average customer reliability score
    reliability_scores = []
    for cid in df_inv['customer_id'].unique():
        score = compute_reliability_score(org_id, cid, 'customer', invoices_df=df_inv, payments_df=df_pay)
        reliability_scores.append(score)
    avg_reliability = float(pd.Series(reliability_scores).mean()) if reliability_scores else 70.0
    
    # Risk Level mapping based on runway & anomalies
    anomalies = detect_anomalies(org_id, transactions_df=df_tx)
    if runway is None:
        risk_level = "Low"
    elif runway < 30 or len(anomalies) > 5:
        risk_level = "High"
    elif runway < 90 or len(anomalies) > 2:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "cash_balance": cash_balance,
        "net_cash_flow": net_cash_flow,
        "burn_rate": burn_rate,
        "runway_days": runway,
        "liquidity_score": avg_reliability,
        "risk_level": risk_level
    }
