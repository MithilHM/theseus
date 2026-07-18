from sqlalchemy.orm import Session
from db.models import Invoice, Payment, Customer
import datetime

def match_payment_to_invoice(db: Session, payment: Payment, counterparty_name: str) -> bool:
    """
    Attempts to match an incoming payment to an outstanding invoice for the same org.
    Matches are based on:
      1. Exact amount match.
      2. Counterparty name containing or being contained in customer name (case-insensitive).
      3. Payment date being after or equal to invoice issue_date, and within 60 days.
      
    If matched confidently, updates invoice status to 'paid', sets paid_date, and links
    payment/invoice references.

    Args:
        db (Session): SQLAlchemy database session.
        payment (Payment): The Payment ORM object that was created.
        counterparty_name (str): The name of the counterparty from the payment transaction.

    Returns:
        bool: True if matched and updated, False otherwise.
    """
    # 1. Fetch outstanding invoices with exact same amount
    # Join Customer to filter by name
    outstanding = db.query(Invoice).join(Customer).filter(
        Invoice.org_id == payment.org_id,
        Invoice.status.in_(["pending", "overdue"]),
        Invoice.amount == payment.amount
    ).all()

    best_match = None
    min_days_diff = 999999

    # 2. Iterate and match by counterparty name and date proximity
    for inv in outstanding:
        inv_cust_name = inv.customer.name.lower()
        cp_name = counterparty_name.lower()

        # Check if names are similar / substrings of each other
        if inv_cust_name in cp_name or cp_name in inv_cust_name:
            # Payment must happen on or after the invoice issue date
            if payment.date >= inv.issue_date:
                days_diff = (payment.date - inv.issue_date).days
                if days_diff < min_days_diff:
                    min_days_diff = days_diff
                    best_match = inv

    # 3. If a match is found within a 60-day window, apply updates
    if best_match and min_days_diff <= 60:
        best_match.status = "paid"
        best_match.paid_date = payment.date
        best_match.linked_payment_id = payment.id
        
        # Link the invoice to the payment
        payment.invoice_id = best_match.id
        
        db.commit()
        return True

    return False
