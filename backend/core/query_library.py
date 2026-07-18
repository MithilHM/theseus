from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import datetime
from db.models import Transaction, Revenue, Expense, Invoice, Payment, CashBalance, ForecastData, Vendor, Customer

def get_current_cash_balance(db: Session, org_id: int) -> dict:
    """
    Retrieves the most recent cash balance for a given organization.

    Args:
        db (Session): SQLAlchemy database session.
        org_id (int): The unique identifier of the organization.

    Returns:
        dict: A dictionary containing 'org_id', 'balance', and 'date' (ISO-8601 string),
              or 0.0 balance and None date if no records exist.
    """
    record = db.query(CashBalance).filter(
        CashBalance.org_id == org_id
    ).order_by(
        desc(CashBalance.date), desc(CashBalance.id)
    ).first()

    if not record:
        return {
            "org_id": org_id,
            "balance": 0.0,
            "date": None
        }

    return {
        "org_id": org_id,
        "balance": float(record.balance),
        "date": record.date.isoformat() if record.date else None
    }


def get_monthly_revenue(db: Session, org_id: int, month: str) -> dict:
    """
    Retrieves the total accumulated revenue for an organization in a specific month.

    Args:
        db (Session): SQLAlchemy database session.
        org_id (int): The unique identifier of the organization.
        month (str): The month to query in 'YYYY-MM' format.

    Returns:
        dict: A dictionary containing 'org_id', 'month', and 'total_revenue'.
    """
    try:
        year, mon = map(int, month.split('-'))
        start_date = datetime.date(year, mon, 1)
        if mon == 12:
            end_date = datetime.date(year + 1, 1, 1)
        else:
            end_date = datetime.date(year, mon + 1, 1)
    except Exception as e:
        raise ValueError(f"Invalid month format: '{month}'. Must be 'YYYY-MM'. Error: {str(e)}")

    total = db.query(func.sum(Revenue.amount)).filter(
        Revenue.org_id == org_id,
        Revenue.date >= start_date,
        Revenue.date < end_date
    ).scalar()

    return {
        "org_id": org_id,
        "month": month,
        "total_revenue": float(total) if total is not None else 0.0
    }


def get_outstanding_invoices(db: Session, org_id: int, min_days_overdue: int = 0) -> list:
    """
    Retrieves all outstanding (unpaid or overdue) invoices for an organization.
    Optionally filters for invoices overdue by at least a specified number of days.

    Args:
        db (Session): SQLAlchemy database session.
        org_id (int): The unique identifier of the organization.
        min_days_overdue (int, optional): The minimum number of days the invoice must be overdue.
                                          Defaults to 0 (returns all outstanding invoices).

    Returns:
        list: A list of dictionaries, each containing full details of an outstanding invoice,
              plus calculated 'days_overdue'.
    """
    today = datetime.date.today()
    query = db.query(Invoice).filter(
        Invoice.org_id == org_id,
        Invoice.status != 'paid'
    )

    if min_days_overdue > 0:
        max_due_date = today - datetime.timedelta(days=min_days_overdue)
        query = query.filter(Invoice.due_date <= max_due_date)

    records = query.all()
    results = []
    for r in records:
        days_overdue = (today - r.due_date).days if today > r.due_date else 0
        results.append({
            "id": r.id,
            "org_id": r.org_id,
            "customer_id": r.customer_id,
            "amount": float(r.amount),
            "issue_date": r.issue_date.isoformat() if r.issue_date else None,
            "due_date": r.due_date.isoformat() if r.due_date else None,
            "status": r.status,
            "paid_date": r.paid_date.isoformat() if r.paid_date else None,
            "linked_payment_id": r.linked_payment_id,
            "days_overdue": days_overdue
        })
    return results


def get_vendor_payments(db: Session, org_id: int, vendor_id: int = None, since: datetime.date = None) -> list:
    """
    Retrieves payments made to vendors for an organization. Vendor payments are identified
    as outflow transactions where the counterparty is marked as a vendor.

    Args:
        db (Session): SQLAlchemy database session.
        org_id (int): The unique identifier of the organization.
        vendor_id (int, optional): The unique identifier of a specific vendor. If provided,
                                   fetches the vendor's name and filters transactions.
        since (datetime.date or str, optional): Filter transactions on or after this date.
                                                Can be a date object or a 'YYYY-MM-DD' string.

    Returns:
        list: A list of dictionaries representing the payment transactions.
    """
    if since and isinstance(since, str):
        try:
            since = datetime.date.fromisoformat(since)
        except Exception as e:
            raise ValueError(f"Invalid date format for 'since': '{since}'. Must be 'YYYY-MM-DD'. Error: {str(e)}")

    query = db.query(Transaction).filter(
        Transaction.org_id == org_id,
        Transaction.direction == 'outflow',
        Transaction.counterparty_type == 'vendor'
    )

    if vendor_id:
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id, Vendor.org_id == org_id).first()
        if not vendor:
            return []
        query = query.filter(Transaction.counterparty_name == vendor.name)

    if since:
        query = query.filter(Transaction.date >= since)

    records = query.all()
    return [{
        "id": r.id,
        "org_id": r.org_id,
        "date": r.date.isoformat() if r.date else None,
        "amount": float(r.amount),
        "category": r.category,
        "counterparty_name": r.counterparty_name,
        "counterparty_type": r.counterparty_type,
        "source_document_id": r.source_document_id,
        "raw_description": r.raw_description,
        "is_duplicate_flag": r.is_duplicate_flag
    } for r in records]


def get_cash_runway(db: Session, org_id: int) -> dict:
    """
    Reads the latest set of forecast data (p10, p50, p90 for 30/60/90 days horizon) for the organization.

    Args:
        db (Session): SQLAlchemy database session.
        org_id (int): The unique identifier of the organization.

    Returns:
        dict: A dictionary containing 'org_id', 'generated_at', 'model_version', and 'forecasts' (list of horizons).
    """
    latest_generated = db.query(func.max(ForecastData.generated_at)).filter(
        ForecastData.org_id == org_id
    ).scalar()

    if not latest_generated:
        return {
            "org_id": org_id,
            "generated_at": None,
            "model_version": None,
            "forecasts": []
        }

    records = db.query(ForecastData).filter(
        ForecastData.org_id == org_id,
        ForecastData.generated_at == latest_generated
    ).order_by(ForecastData.horizon_days).all()

    return {
        "org_id": org_id,
        "generated_at": latest_generated.isoformat() if latest_generated else None,
        "model_version": records[0].model_version if records else None,
        "forecasts": [{
            "horizon_days": r.horizon_days,
            "p10": float(r.p10),
            "p50": float(r.p50),
            "p90": float(r.p90)
        } for r in records]
    }


def get_profit_loss(db: Session, org_id: int, start_date: datetime.date, end_date: datetime.date) -> dict:
    """
    Calculates the total revenue, total expenses, and resulting net profit/loss
    for an organization over a specified date range.

    Args:
        db (Session): SQLAlchemy database session.
        org_id (int): The unique identifier of the organization.
        start_date (datetime.date or str): The start date of the period (inclusive).
        end_date (datetime.date or str): The end date of the period (inclusive).

    Returns:
        dict: A dictionary containing 'org_id', 'start_date', 'end_date', 'total_revenue',
              'total_expenses', and 'net_profit'.
    """
    if isinstance(start_date, str):
        try:
            start_date = datetime.date.fromisoformat(start_date)
        except Exception as e:
            raise ValueError(f"Invalid format for 'start_date': '{start_date}'. Must be 'YYYY-MM-DD'. Error: {str(e)}")

    if isinstance(end_date, str):
        try:
            end_date = datetime.date.fromisoformat(end_date)
        except Exception as e:
            raise ValueError(f"Invalid format for 'end_date': '{end_date}'. Must be 'YYYY-MM-DD'. Error: {str(e)}")

    total_rev = db.query(func.sum(Revenue.amount)).filter(
        Revenue.org_id == org_id,
        Revenue.date >= start_date,
        Revenue.date <= end_date
    ).scalar() or 0.0

    total_exp = db.query(func.sum(Expense.amount)).filter(
        Expense.org_id == org_id,
        Expense.date >= start_date,
        Expense.date <= end_date
    ).scalar() or 0.0

    return {
        "org_id": org_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_revenue": float(total_rev),
        "total_expenses": float(total_exp),
        "net_profit": float(total_rev) - float(total_exp)
    }
