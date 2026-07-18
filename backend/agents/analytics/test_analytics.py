import pytest
import pandas as pd
from datetime import datetime, timedelta
from agents.analytics.core import (
    compute_cash_flow,
    compute_burn_rate,
    compute_runway,
    forecast_30_60_90,
    compute_reliability_score,
    detect_anomalies
)

@pytest.fixture
def empty_transactions():
    return pd.DataFrame(columns=['id', 'org_id', 'amount', 'date', 'direction', 'category', 'counterparty_name'])

@pytest.fixture
def single_inflow_transaction():
    return pd.DataFrame([{
        'id': 1,
        'org_id': 1,
        'amount': 1000.0,
        'date': '2026-07-01',
        'direction': 'inflow',
        'category': 'revenue',
        'counterparty_name': 'Acme Corp'
    }])

@pytest.fixture
def single_outflow_transaction():
    return pd.DataFrame([{
        'id': 1,
        'org_id': 1,
        'amount': 500.0,
        'date': '2026-07-01',
        'direction': 'outflow',
        'category': 'rent',
        'counterparty_name': 'Landlord'
    }])

@pytest.fixture
def mixed_transactions():
    base_date = datetime(2026, 7, 1)
    rows = []
    # Create 40 days of transaction data
    for i in range(40):
        current_date = (base_date + timedelta(days=i)).strftime('%Y-%m-%d')
        # Inflows every 5 days
        if i % 5 == 0:
            rows.append({
                'id': i * 10,
                'org_id': 1,
                'amount': 2000.0,
                'date': current_date,
                'direction': 'inflow',
                'category': 'revenue',
                'counterparty_name': 'Client A'
            })
        # Outflows daily
        rows.append({
            'id': i * 10 + 1,
            'org_id': 1,
            'amount': 150.0,
            'date': current_date,
            'direction': 'outflow',
            'category': 'utilities',
            'counterparty_name': 'Power Co'
        })
    return pd.DataFrame(rows)

def test_cash_flow_empty(empty_transactions):
    res = compute_cash_flow(1, "2026-07-01", "2026-07-31", transactions_df=empty_transactions)
    assert res.empty
    assert list(res.columns) == ['date', 'inflow', 'outflow', 'net_flow', 'running_balance']

def test_cash_flow_single_inflow(single_inflow_transaction):
    res = compute_cash_flow(1, "2026-07-01", "2026-07-01", transactions_df=single_inflow_transaction)
    assert len(res) == 1
    assert res.iloc[0]['inflow'] == 1000.0
    assert res.iloc[0]['outflow'] == 0.0
    assert res.iloc[0]['net_flow'] == 1000.0
    assert res.iloc[0]['running_balance'] == 1000.0

def test_cash_flow_single_outflow(single_outflow_transaction):
    res = compute_cash_flow(1, "2026-07-01", "2026-07-01", transactions_df=single_outflow_transaction)
    assert len(res) == 1
    assert res.iloc[0]['inflow'] == 0.0
    assert res.iloc[0]['outflow'] == 500.0
    assert res.iloc[0]['net_flow'] == -500.0
    assert res.iloc[0]['running_balance'] == -500.0

def test_burn_rate_positive(mixed_transactions):
    # Daily burn rate should be calculated
    # Inflows: 2000 every 5 days (avg 400/day)
    # Outflows: 150 daily
    # Net flow is positive (400 - 150 = 250 inflow/day), so burn rate should be 0.0
    burn = compute_burn_rate(1, window_days=30, transactions_df=mixed_transactions)
    assert burn == 0.0

def test_burn_rate_negative():
    # Construct business with net outflow
    base_date = datetime(2026, 7, 1)
    rows = []
    for i in range(10):
        current_date = (base_date + timedelta(days=i)).strftime('%Y-%m-%d')
        rows.append({
            'org_id': 1,
            'amount': 200.0,
            'date': current_date,
            'direction': 'outflow',
            'category': 'payroll',
            'counterparty_name': 'Employees'
        })
    df = pd.DataFrame(rows)
    burn = compute_burn_rate(1, window_days=10, transactions_df=df)
    # Total outflow = 2000. Total inflow = 0. Burn = 2000 / 10 = 200.0
    assert burn == 200.0

def test_runway_positive_and_negative():
    # Cash flow positive scenario (burn rate = 0)
    df_pos = pd.DataFrame([{
        'org_id': 1,
        'amount': 5000.0,
        'date': '2026-07-01',
        'direction': 'inflow',
        'category': 'revenue',
        'counterparty_name': 'Client A'
    }])
    assert compute_runway(1, transactions_df=df_pos, current_balance=5000.0) is None
    
    # Burning cash scenario
    df_neg = pd.DataFrame([
        {
            'org_id': 1,
            'amount': 200.0,
            'date': (datetime(2026, 7, 1) + timedelta(days=i)).strftime('%Y-%m-%d'),
            'direction': 'outflow',
            'category': 'payroll',
            'counterparty_name': 'Employees'
        }
        for i in range(10)
    ])
    runway = compute_runway(1, transactions_df=df_neg, current_balance=2000.0, window_days=10)
    # burn rate = 200/day. Balance = 2000. Runway = 10 days.
    assert runway == 10.0

def test_forecast_30_60_90(mixed_transactions):
    fc = forecast_30_60_90(1, transactions_df=mixed_transactions)
    assert len(fc) == 90
    assert list(fc.columns) == ['ds', 'yhat', 'yhat_lower', 'yhat_upper']

def test_reliability_score():
    # Construct invoices & payments
    invoices = pd.DataFrame([
        {'id': 1, 'org_id': 1, 'customer_id': 100, 'amount': 1000.0, 'due_date': '2026-07-05', 'status': 'paid'},
        {'id': 2, 'org_id': 1, 'customer_id': 100, 'amount': 2000.0, 'due_date': '2026-07-15', 'status': 'paid'},
    ])
    
    # Paid 5 days late for first, on-time for second
    payments = pd.DataFrame([
        {'id': 10, 'org_id': 1, 'invoice_id': 1, 'amount': 1000.0, 'payment_date': '2026-07-10'},
        {'id': 11, 'org_id': 1, 'invoice_id': 2, 'amount': 2000.0, 'payment_date': '2026-07-15'},
    ])
    
    score = compute_reliability_score(1, 100, 'customer', invoices_df=invoices, payments_df=payments)
    assert 0 <= score <= 100
    
    # Verify default score for non-existent entities
    default_score = compute_reliability_score(1, 999, 'customer', invoices_df=invoices, payments_df=payments)
    assert default_score == 70.0

def test_anomaly_detection():
    # Create duplicate payments
    df_dup = pd.DataFrame([
        {'id': 1, 'org_id': 1, 'amount': 500.0, 'date': '2026-07-01', 'direction': 'outflow', 'category': 'rent', 'counterparty_name': 'Landlord'},
        {'id': 2, 'org_id': 1, 'amount': 500.0, 'date': '2026-07-02', 'direction': 'outflow', 'category': 'rent', 'counterparty_name': 'Landlord'},
    ])
    anomalies = detect_anomalies(1, transactions_df=df_dup)
    assert len(anomalies) > 0
    assert any(a['type'] == 'duplicate_payment' for a in anomalies)
