import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Try to import Prophet, fallback to statsmodels or simple linear trend if unavailable
try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False
    logger.warning("Prophet not installed or failed to import. Falling back to linear regression for forecasting.")

def compute_cash_flow(org_id: int, start_date: str, end_date: str, transactions_df: pd.DataFrame = None, db = None) -> pd.DataFrame:
    """
    Computes daily inflow, outflow, net cash flow, and running balance.
    
    Returns:
        pd.DataFrame: Columns ['date', 'inflow', 'outflow', 'net_flow', 'running_balance']
    """
    if transactions_df is None or transactions_df.empty:
        # Return empty df with expected structure
        return pd.DataFrame(columns=['date', 'inflow', 'outflow', 'net_flow', 'running_balance'])

    # Filter by org_id and date range
    df = transactions_df[transactions_df['org_id'] == org_id].copy()
    df['date'] = pd.to_datetime(df['date'])
    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)
    df = df[(df['date'] >= start_dt) & (df['date'] <= end_dt)]
    
    if df.empty:
        return pd.DataFrame(columns=['date', 'inflow', 'outflow', 'net_flow', 'running_balance'])

    # Separate inflow and outflow
    # Amount is assumed positive. Type/Direction specifies inflow/outflow.
    # We support either 'type' or 'direction' column.
    direction_col = 'direction' if 'direction' in df.columns else 'type'
    
    df['inflow'] = df.apply(lambda r: r['amount'] if str(r[direction_col]).lower() in ['inflow', 'income', 'in'] else 0.0, axis=1)
    df['outflow'] = df.apply(lambda r: r['amount'] if str(r[direction_col]).lower() in ['outflow', 'expense', 'out'] else 0.0, axis=1)
    
    # Group by date
    daily = df.groupby('date').agg({'inflow': 'sum', 'outflow': 'sum'}).reset_index()
    daily = daily.sort_values('date')
    
    daily['net_flow'] = daily['inflow'] - daily['outflow']
    daily['running_balance'] = daily['net_flow'].cumsum()
    
    return daily

def compute_burn_rate(org_id: int, window_days: int = 30, transactions_df: pd.DataFrame = None, db = None) -> float:
    """
    Computes average daily net outflow over the trailing window.
    Burn rate is positive if the company is spending more than it earns.
    If net cash flow is positive, burn rate is 0.0.
    """
    if transactions_df is None or transactions_df.empty:
        return 0.0
        
    df = transactions_df[transactions_df['org_id'] == org_id].copy()
    if df.empty:
        return 0.0
        
    df['date'] = pd.to_datetime(df['date'])
    latest_date = df['date'].max()
    start_date = latest_date - pd.Timedelta(days=window_days)
    
    # Filter window
    df_window = df[df['date'] > start_date].copy()
    if df_window.empty:
        return 0.0
        
    # Calculate daily net flow
    direction_col = 'direction' if 'direction' in df_window.columns else 'type'
    df_window['inflow'] = df_window.apply(lambda r: r['amount'] if str(r[direction_col]).lower() in ['inflow', 'income', 'in'] else 0.0, axis=1)
    df_window['outflow'] = df_window.apply(lambda r: r['amount'] if str(r[direction_col]).lower() in ['outflow', 'expense', 'out'] else 0.0, axis=1)
    
    total_inflow = df_window['inflow'].sum()
    total_outflow = df_window['outflow'].sum()
    
    net_outflow = total_outflow - total_inflow
    daily_burn = net_outflow / window_days
    
    return max(0.0, daily_burn)

def compute_runway(org_id: int, transactions_df: pd.DataFrame = None, current_balance: float = None, window_days: int = 30, db = None) -> float:
    """
    Computes current runway in days.
    If burn_rate <= 0, returns None (company is cash-flow positive).
    """
    if current_balance is None:
        if transactions_df is None or transactions_df.empty:
            return None
        # Estimate current balance from cumsum of all history
        cf = compute_cash_flow(org_id, "1970-01-01", "2099-12-31", transactions_df=transactions_df)
        if cf.empty:
            return None
        current_balance = cf['running_balance'].iloc[-1]
        
    burn_rate = compute_burn_rate(org_id, window_days=window_days, transactions_df=transactions_df)
    
    if burn_rate <= 0:
        return None
        
    runway_days = current_balance / burn_rate
    return float(runway_days)

def forecast_30_60_90(org_id: int, transactions_df: pd.DataFrame = None, db = None) -> pd.DataFrame:
    """
    Forecasts daily net cash flows for 90 days.
    Returns:
        pd.DataFrame: Columns ['ds', 'yhat', 'yhat_lower', 'yhat_upper']
    """
    if transactions_df is None or transactions_df.empty:
        # Return empty forecast structure
        return pd.DataFrame(columns=['ds', 'yhat', 'yhat_lower', 'yhat_upper'])
        
    # Get daily net flow history
    cf = compute_cash_flow(org_id, "1970-01-01", "2099-12-31", transactions_df=transactions_df)
    if cf.empty:
        return pd.DataFrame(columns=['ds', 'yhat', 'yhat_lower', 'yhat_upper'])
        
    df_prophet = cf[['date', 'net_flow']].rename(columns={'date': 'ds', 'net_flow': 'y'})
    
    if len(df_prophet) < 5:
        # Not enough history for complex models, use a simple rolling mean forecast
        mean_y = df_prophet['y'].mean() if not df_prophet.empty else 0.0
        std_y = df_prophet['y'].std() if len(df_prophet) > 1 else 0.0
        future_dates = [df_prophet['ds'].max() + pd.Timedelta(days=i) for i in range(1, 91)]
        return pd.DataFrame({
            'ds': future_dates,
            'yhat': [mean_y] * 90,
            'yhat_lower': [mean_y - 1.96 * std_y] * 90,
            'yhat_upper': [mean_y + 1.96 * std_y] * 90
        })

    if HAS_PROPHET:
        try:
            m = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
            m.fit(df_prophet)
            future = m.make_future_dataframe(periods=90)
            forecast = m.predict(future)
            # Filter only future dates
            forecast_future = forecast[forecast['ds'] > df_prophet['ds'].max()]
            return forecast_future[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        except Exception as e:
            logger.error(f"Prophet forecasting failed: {e}. Falling back to baseline model.")
            
    # Fallback/Baseline model: Simple linear regression trend + historic variance
    from sklearn.linear_model import LinearRegression
    X = np.arange(len(df_prophet)).reshape(-1, 1)
    y = df_prophet['y'].values
    model = LinearRegression().fit(X, y)
    
    future_X = np.arange(len(df_prophet), len(df_prophet) + 90).reshape(-1, 1)
    preds = model.predict(future_X)
    
    # Uncertainty bands based on historical residual standard deviation
    residuals = y - model.predict(X)
    residual_std = np.std(residuals) if len(residuals) > 1 else 1.0
    
    future_dates = [df_prophet['ds'].max() + pd.Timedelta(days=i) for i in range(1, 91)]
    return pd.DataFrame({
        'ds': future_dates,
        'yhat': preds,
        'yhat_lower': preds - 1.96 * residual_std,
        'yhat_upper': preds + 1.96 * residual_std
    })

def compute_reliability_score(org_id: int, entity_id: int, entity_type: str, invoices_df: pd.DataFrame = None, payments_df: pd.DataFrame = None, db = None) -> float:
    """
    Computes a score from 0 to 100 representing the reliability of a customer or vendor.
    
    Exact Formula:
        Reliability Score = (Base Score - Delay Penalty - Variance Penalty) * On-Time Rate Factor + Frequency Bonus
        
        Where:
        - Base Score = 80
        - Delay Penalty: Average payment delay days * 2.0 (capped at 40).
        - Variance Penalty: Std dev of payment delay days * 1.0 (capped at 20).
        - On-Time Rate Factor: Percentage of payments completed on or before the due date.
        - Frequency Bonus: Logarithmic scaling based on transaction frequency, min(log(frequency + 1) * 8, 20).
        - The final score is constrained strictly between 0 and 100.
    """
    if invoices_df is None or invoices_df.empty:
        return 70.0 # Default benchmark score
        
    # Filter invoices
    inv_col = 'customer_id' if entity_type == 'customer' else 'vendor_id'
    if inv_col not in invoices_df.columns:
        return 70.0
        
    ent_invoices = invoices_df[(invoices_df['org_id'] == org_id) & (invoices_df[inv_col] == entity_id)].copy()
    if ent_invoices.empty:
        return 70.0

    # Match payments
    delays = []
    on_time_count = 0
    total_paid = 0
    
    # If payments df is provided, evaluate payment delays
    if payments_df is not None and not payments_df.empty:
        # Link payments to invoices
        merged = pd.merge(ent_invoices, payments_df, left_on='id', right_on='invoice_id', suffixes=('_inv', '_pay'))
        if not merged.empty:
            merged['due_date'] = pd.to_datetime(merged['due_date'])
            merged['payment_date'] = pd.to_datetime(merged['payment_date'])
            merged['delay'] = (merged['payment_date'] - merged['due_date']).dt.days
            delays = merged['delay'].tolist()
            on_time_count = sum(1 for d in delays if d <= 0)
            total_paid = len(delays)
            
    # Compute metrics
    avg_delay = np.mean(delays) if delays else 0.0
    std_delay = np.std(delays) if len(delays) > 1 else 0.0
    on_time_rate = (on_time_count / total_paid) if total_paid > 0 else 1.0
    frequency = len(ent_invoices)
    
    # Calculate score component
    base_score = 80.0
    delay_penalty = min(max(0.0, avg_delay) * 2.0, 40.0)
    variance_penalty = min(std_delay * 1.0, 20.0)
    
    raw_score = (base_score - delay_penalty - variance_penalty) * on_time_rate
    frequency_bonus = min(np.log1p(frequency) * 8.0, 20.0)
    
    final_score = np.clip(raw_score + frequency_bonus, 0.0, 100.0)
    
    # Side-effect: Write to DB if db session is provided
    if db is not None:
        try:
            # Check if row exists
            db.execute(
                "INSERT INTO reliability_scores (org_id, entity_id, entity_type, score, avg_delay_days, consistency_rating, last_computed_at) "
                "VALUES (:org_id, :entity_id, :entity_type, :score, :avg_delay, :consistency, NOW()) "
                "ON CONFLICT (org_id, entity_id, entity_type) DO UPDATE SET "
                "score = EXCLUDED.score, avg_delay_days = EXCLUDED.avg_delay_days, "
                "consistency_rating = EXCLUDED.consistency_rating, last_computed_at = NOW()",
                {
                    "org_id": org_id,
                    "entity_id": entity_id,
                    "entity_type": entity_type,
                    "score": float(final_score),
                    "avg_delay": float(avg_delay),
                    "consistency": float(100.0 - variance_penalty * 5.0)
                }
            )
            db.commit()
        except Exception as e:
            logger.error(f"Failed to write reliability score to DB: {e}")
            db.rollback()
            
    return float(final_score)

def detect_anomalies(org_id: int, transactions_df: pd.DataFrame = None, db = None) -> list:
    """
    Scans transactions for anomalies:
    1. Duplicate payments (same amount, vendor, date within 2 days).
    2. Spending spikes (z-score > 2.5 on category-level daily spend).
    3. Missing expected payments (broken recurring pattern).
    4. Revenue drops (week-over-week decline > 30%).
    
    Returns:
        list of dicts representing detected anomalies.
    """
    anomalies = []
    if transactions_df is None or transactions_df.empty:
        return anomalies
        
    df = transactions_df[transactions_df['org_id'] == org_id].copy()
    if df.empty:
        return anomalies
        
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    # 1. Duplicate Payments
    # Sort and check sliding window of 2 days for identical amount and counterparty
    for i in range(len(df)):
        current = df.iloc[i]
        # Match candidates
        duplicates = df[
            (df.index != current.name) &
            (df['amount'] == current['amount']) &
            (df['counterparty_name'] == current['counterparty_name']) &
            (abs((df['date'] - current['date']).dt.days) <= 2)
        ]
        if not duplicates.empty:
            anomalies.append({
                "org_id": org_id,
                "type": "duplicate_payment",
                "severity": "Medium",
                "related_transaction_id": int(current['id']) if 'id' in current else None,
                "description": f"Potential duplicate payment of ${current['amount']} to {current['counterparty_name']} on {current['date'].strftime('%Y-%m-%d')}."
            })

    # 2. Spending Spikes
    # Group by category and date, calculate daily spend, then z-score
    direction_col = 'direction' if 'direction' in df.columns else 'type'
    outflows = df[df[direction_col].str.lower().isin(['outflow', 'expense', 'out'])].copy()
    if not outflows.empty:
        daily_cat = outflows.groupby(['category', 'date'])['amount'].sum().reset_index()
        for cat in daily_cat['category'].unique():
            cat_data = daily_cat[daily_cat['category'] == cat].copy()
            if len(cat_data) >= 5: # Need enough points for std dev
                mean_val = cat_data['amount'].mean()
                std_val = cat_data['amount'].std()
                if std_val > 0:
                    cat_data['z'] = (cat_data['amount'] - mean_val) / std_val
                    spikes = cat_data[cat_data['z'] > 2.5]
                    for _, row in spikes.iterrows():
                        anomalies.append({
                            "org_id": org_id,
                            "type": "spending_spike",
                            "severity": "High" if row['z'] > 4.0 else "Medium",
                            "related_transaction_id": None,
                            "description": f"Abnormal spending spike detected in category '{cat}' on {row['date'].strftime('%Y-%m-%d')} (Amount: ${row['amount']:.2f}, Z-Score: {row['z']:.2f})."
                        })

    # 3. Missing Expected Payments (Simple recurring detection)
    # Check for recurring expenses/vendors (e.g. rent) that occur monthly but are missing in the last month
    outflows['month'] = outflows['date'].dt.to_period('M')
    # Identify counterparty-category pairs that appear in at least 3 consecutive months
    if not outflows.empty:
        recurring = outflows.groupby(['counterparty_name', 'category'])['month'].nunique()
        frequent_recurring = recurring[recurring >= 3].index
        
        latest_date = df['date'].max()
        for counterparty, category in frequent_recurring:
            # Check if active in the last 35 days
            history = outflows[(outflows['counterparty_name'] == counterparty) & (outflows['category'] == category)]
            last_seen = history['date'].max()
            if (latest_date - last_seen).days > 35:
                anomalies.append({
                    "org_id": org_id,
                    "type": "missing_payment",
                    "severity": "High",
                    "related_transaction_id": None,
                    "description": f"Missing expected recurring payment to '{counterparty}' for '{category}' (last seen {last_seen.strftime('%Y-%m-%d')})."
                })

    # 4. Revenue Drops (Week-over-week)
    inflows = df[df[direction_col].str.lower().isin(['inflow', 'income', 'in'])].copy()
    if not inflows.empty:
        inflows['week'] = inflows['date'].dt.to_period('W')
        weekly_rev = inflows.groupby('week')['amount'].sum().reset_index()
        if len(weekly_rev) >= 2:
            prev_week_rev = weekly_rev.iloc[-2]['amount']
            current_week_rev = weekly_rev.iloc[-1]['amount']
            if prev_week_rev > 0:
                pct_change = (current_week_rev - prev_week_rev) / prev_week_rev
                if pct_change < -0.30: # 30% drop threshold
                    anomalies.append({
                        "org_id": org_id,
                        "type": "revenue_drop",
                        "severity": "High",
                        "related_transaction_id": None,
                        "description": f"Significant week-over-week revenue drop of {abs(pct_change)*100:.1f}% detected (from ${prev_week_rev:.2f} to ${current_week_rev:.2f})."
                    })

    # Side-effect: Write to DB if db session is provided
    if db is not None:
        for anomaly in anomalies:
            try:
                db.execute(
                    "INSERT INTO anomalies (org_id, type, severity, related_transaction_id, description, detected_at, resolved) "
                    "VALUES (:org_id, :type, :severity, :related_transaction_id, :description, NOW(), FALSE)",
                    {
                        "org_id": anomaly["org_id"],
                        "type": anomaly["type"],
                        "severity": anomaly["severity"],
                        "related_transaction_id": anomaly["related_transaction_id"],
                        "description": anomaly["description"]
                    }
                )
                db.commit()
            except Exception as e:
                logger.error(f"Failed to write anomaly to DB: {e}")
                db.rollback()

    return anomalies
