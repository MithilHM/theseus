import numpy as np
import pandas as pd
from datetime import datetime
import logging
from agents.analytics.core import forecast_30_60_90, compute_cash_flow

logger = logging.getLogger(__name__)

def compute_monte_carlo(
    org_id: int, 
    horizon_days: int = 30, 
    transactions_df: pd.DataFrame = None, 
    initial_balance: float = None, 
    num_simulations: int = 10000, 
    threshold: float = 0.0, 
    db = None
) -> dict:
    """
    Runs a NumPy-vectorized Monte Carlo simulation on top of the Prophet baseline forecast.
    
    Formula for Volatility Parameter:
        forecast_confidence_volatility = clip((P90 - P10) / (abs(P50) + abs(initial_balance) + 1.0), 0.0, 1.0)
        
    Formula for Shortfall Risk:
        shortfall_risk = Count(Any daily path balance < threshold) / Total Simulations (10,000)
    
    Returns:
        dict: {p10, p50, p90, forecast_confidence_volatility, shortfall_risk}
    """
    if transactions_df is None or transactions_df.empty:
        return {
            "p10": 0.0,
            "p50": 0.0,
            "p90": 0.0,
            "forecast_confidence_volatility": 0.5,
            "shortfall_risk": 0.5
        }

    # 1. Get initial balance if not provided
    if initial_balance is None:
        cf = compute_cash_flow(org_id, "1970-01-01", "2099-12-31", transactions_df=transactions_df)
        initial_balance = cf['running_balance'].iloc[-1] if not cf.empty else 0.0

    # 2. Get daily volatility from historic net cash flow series
    cf_history = compute_cash_flow(org_id, "1970-01-01", "2099-12-31", transactions_df=transactions_df)
    if len(cf_history) > 1:
        volatility = cf_history['net_flow'].std()
    else:
        volatility = 100.0 # Default fallback volatility

    # 3. Get Prophet forecast (returns up to 90 days of forecast)
    forecast_df = forecast_30_60_90(org_id, transactions_df=transactions_df)
    if forecast_df.empty:
        # Construct flat mock forecast
        yhat = np.zeros(horizon_days)
    else:
        # Limit to the requested horizon
        forecast_df = forecast_df.head(horizon_days)
        yhat = forecast_df['yhat'].values
        # Handle if forecast length is less than requested horizon
        if len(yhat) < horizon_days:
            padding = np.repeat(yhat[-1] if len(yhat) > 0 else 0.0, horizon_days - len(yhat))
            yhat = np.concatenate([yhat, padding])

    # 4. Vectorized simulation: shape (num_simulations, horizon_days)
    # Each day t has mean yhat[t] and variance derived from historical volatility
    random_shocks = np.random.normal(loc=0.0, scale=volatility, size=(num_simulations, horizon_days))
    
    # Broadcast yhat across all simulations
    daily_net_flows = random_shocks + yhat
    
    # Compound forward: Cumulative sum of net flows along the time axis
    cumulative_flows = np.cumsum(daily_net_flows, axis=1)
    
    # Cash balance path: initial_balance + cumulative flows
    paths = initial_balance + cumulative_flows

    # 5. Extract results at the end of the horizon
    final_balances = paths[:, -1]
    p10 = float(np.percentile(final_balances, 10))
    p50 = float(np.percentile(final_balances, 50))
    p90 = float(np.percentile(final_balances, 90))

    # 6. Calculate risk metrics
    # Shortfall risk: check if balance drops below threshold at any point during the simulation
    min_balances_per_path = np.min(paths, axis=1)
    shortfall_risk = float(np.mean(min_balances_per_path < threshold))

    # Volatility parameter: normalized spread between P10 and P90 relative to P50 + initial balance
    spread = p90 - p10
    norm_factor = abs(p50) + abs(initial_balance) + 1.0
    forecast_confidence_volatility = float(np.clip(spread / norm_factor, 0.0, 1.0))

    # 7. Write to forecast_data table if DB session is provided
    if db is not None:
        try:
            db.execute(
                "INSERT INTO forecast_data (org_id, horizon_days, p10, p50, p90, generated_at, model_version) "
                "VALUES (:org_id, :horizon, :p10, :p50, :p90, NOW(), :model_version)",
                {
                    "org_id": org_id,
                    "horizon": horizon_days,
                    "p10": p10,
                    "p50": p50,
                    "p90": p90,
                    "model_version": "prophet-monte-carlo-v1"
                }
            )
            db.commit()
        except Exception as e:
            logger.error(f"Failed to save Monte Carlo forecast to DB: {e}")
            db.rollback()

    return {
        "p10": p10,
        "p50": p50,
        "p90": p90,
        "forecast_confidence_volatility": forecast_confidence_volatility,
        "shortfall_risk": shortfall_risk
    }
