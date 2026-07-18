import pytest
import pandas as pd
import time
from datetime import datetime, timedelta
from agents.analytics.monte_carlo import compute_monte_carlo

@pytest.fixture
def mock_transactions():
    base_date = datetime(2026, 7, 1)
    rows = []
    # Create 60 days of transaction data to build a decent volatility model
    for i in range(60):
        current_date = (base_date + timedelta(days=i)).strftime('%Y-%m-%d')
        # Inflow every 3 days
        if i % 3 == 0:
            rows.append({
                'org_id': 1,
                'amount': 3000.0,
                'date': current_date,
                'direction': 'inflow',
                'category': 'revenue',
                'counterparty_name': 'Client A'
            })
        # Outflow daily
        rows.append({
            'org_id': 1,
            'amount': 800.0,
            'date': current_date,
            'direction': 'outflow',
            'category': 'payroll',
            'counterparty_name': 'Staff'
        })
    return pd.DataFrame(rows)

def test_monte_carlo_structure(mock_transactions):
    results = compute_monte_carlo(1, horizon_days=30, transactions_df=mock_transactions)
    assert "p10" in results
    assert "p50" in results
    assert "p90" in results
    assert "forecast_confidence_volatility" in results
    assert "shortfall_risk" in results

def test_monte_carlo_percentile_ordering(mock_transactions):
    results = compute_monte_carlo(1, horizon_days=30, transactions_df=mock_transactions)
    # P10 <= P50 <= P90
    assert results['p10'] <= results['p50'] <= results['p90']

def test_monte_carlo_metrics_bounds(mock_transactions):
    results = compute_monte_carlo(1, horizon_days=30, transactions_df=mock_transactions)
    assert 0.0 <= results['forecast_confidence_volatility'] <= 1.0
    assert 0.0 <= results['shortfall_risk'] <= 1.0

def test_monte_carlo_performance(mock_transactions):
    start_time = time.time()
    results = compute_monte_carlo(1, horizon_days=90, transactions_df=mock_transactions, num_simulations=10000)
    duration = time.time() - start_time
    
    # Assert performance threshold: full 10,000-path simulation over 90 days in under 2 seconds
    assert duration < 2.0
    print(f"Monte Carlo execution time for 10k paths / 90 days: {duration:.4f}s")

def test_monte_carlo_empty():
    results = compute_monte_carlo(1, horizon_days=30, transactions_df=pd.DataFrame())
    assert results['p10'] == 0.0
    assert results['p50'] == 0.0
    assert results['p90'] == 0.0
    assert results['forecast_confidence_volatility'] == 0.5
    assert results['shortfall_risk'] == 0.5
