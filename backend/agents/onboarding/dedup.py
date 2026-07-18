from sqlalchemy.orm import Session
from db.models import Transaction
import datetime

def check_duplicate(db: Session, org_id: int, amount: float, counterparty_name: str, date: datetime.date) -> bool:
    """
    Checks if there is another transaction in the database with the same org_id,
    amount, counterparty_name, and date within a 2-day window (before or after).

    Args:
        db (Session): SQLAlchemy database session.
        org_id (int): Organization ID.
        amount (float): Transaction amount.
        counterparty_name (str): The name of the counterparty.
        date (datetime.date): The date of the transaction.

    Returns:
        bool: True if a duplicate is found, False otherwise.
    """
    start_date = date - datetime.timedelta(days=2)
    end_date = date + datetime.timedelta(days=2)

    # Convert incoming float amount to a decimal/rounded representation for match comparison
    rounded_amount = round(float(amount), 2)

    # Query for any existing transaction
    existing = db.query(Transaction).filter(
        Transaction.org_id == org_id,
        Transaction.amount == rounded_amount,
        Transaction.counterparty_name == counterparty_name,
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).first()

    return existing is not None
