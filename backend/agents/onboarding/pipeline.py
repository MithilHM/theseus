from sqlalchemy.orm import Session
from db.models import Transaction, Revenue, Expense, Payment, Invoice, ForecastData, ReliabilityScore
from core.gemma_client import GemmaClient
from agents.onboarding.normalizer import normalize_to_schema
from agents.onboarding.dedup import check_duplicate
from agents.onboarding.categorizer import categorize_transaction
from agents.onboarding.invoice_matcher import match_payment_to_invoice

def stale_mark_analytics(db: Session, org_id: int):
    """
    Marks the analytics tables (forecasts and reliability scores) as stale (needs_recompute=True)
    so the Analytics Agent knows to trigger calculations.
    """
    db.query(ForecastData).filter(ForecastData.org_id == org_id).update({"needs_recompute": True})
    db.query(ReliabilityScore).filter(ReliabilityScore.org_id == org_id).update({"needs_recompute": True})
    db.commit()

def ingest_transaction_record(db: Session, client: GemmaClient, org_id: int, raw_record: dict, source_type: str) -> dict:
    """
    Runs a single raw transaction record through the complete ingestion pipeline:
    Normalizer -> Deduplication -> Categorization -> DB Insert -> Invoice Matcher.
    Stale-marks the analytics layer after a successful insert.
    """
    # 1. Normalization
    normalized = normalize_to_schema(raw_record, source_type=source_type)
    
    # 2. Duplicate Detection (±2 days window)
    is_dup = check_duplicate(
        db=db,
        org_id=org_id,
        amount=normalized["amount"],
        counterparty_name=normalized["counterparty_name"],
        date=normalized["date"]
    )
    
    # 3. Categorization (Gemma function calling)
    category = normalized["category"]
    if not category or category == "other":
        category = categorize_transaction(
            client=client,
            counterparty_name=normalized["counterparty_name"],
            amount=normalized["amount"],
            direction=normalized["direction"],
            raw_description=normalized["raw_description"]
        )
        
    # 4. Insert Transaction into Database
    tx = Transaction(
        org_id=org_id,
        date=normalized["date"],
        amount=normalized["amount"],
        direction=normalized["direction"],
        category=category,
        counterparty_name=normalized["counterparty_name"],
        counterparty_type=normalized["counterparty_type"],
        raw_description=normalized["raw_description"],
        is_duplicate_flag=is_dup
    )
    db.add(tx)
    db.commit() # Commit to generate tx.id
    
    # 5. Propagate to Revenue or Expense analytics tables
    if normalized["direction"] == "inflow":
        rev = Revenue(
            org_id=org_id,
            amount=normalized["amount"],
            date=normalized["date"],
            source=normalized["counterparty_name"]
        )
        db.add(rev)
    else:
        exp = Expense(
            org_id=org_id,
            amount=normalized["amount"],
            date=normalized["date"],
            category=category
        )
        db.add(exp)
    db.commit()
    
    # 6. Payment Matching if inflow
    if normalized["direction"] == "inflow":
        payment = Payment(
            org_id=org_id,
            invoice_id=None, # Will be set by matcher if matched
            amount=normalized["amount"],
            date=normalized["date"],
            method="statement" if source_type == "file" else "sync",
            matched_transaction_id=tx.id
        )
        db.add(payment)
        db.commit() # Commit to generate payment.id
        
        # Match to outstanding invoices
        match_payment_to_invoice(db, payment, normalized["counterparty_name"])
        
    # 7. Stale mark analytics tables
    stale_mark_analytics(db, org_id)
    
    return {
        "id": tx.id,
        "date": tx.date.isoformat() if tx.date else None,
        "amount": float(tx.amount),
        "direction": tx.direction,
        "category": tx.category,
        "counterparty_name": tx.counterparty_name,
        "is_duplicate": tx.is_duplicate_flag
    }
