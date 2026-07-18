import datetime
from typing import Any, Dict

def normalize_to_schema(data: Dict[str, Any], source_type: str) -> Dict[str, Any]:
    """
    Normalizes transaction raw inputs into a unified structured dictionary.
    
    Expected uniform schema:
    {
        "date": datetime.date,
        "amount": float,
        "direction": str ('inflow' | 'outflow'),
        "category": str,
        "counterparty_name": str,
        "counterparty_type": str ('customer' | 'vendor' | 'other'),
        "raw_description": str,
        "source_type": str,
        "confidence": float
    }
    """
    # 1. Parse date
    raw_date = data.get("date")
    parsed_date = None
    if isinstance(raw_date, datetime.date):
        parsed_date = raw_date
    elif isinstance(raw_date, datetime.datetime):
        parsed_date = raw_date.date()
    elif isinstance(raw_date, str) and raw_date.strip():
        # Try a few common date formats
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                parsed_date = datetime.datetime.strptime(raw_date.strip(), fmt).date()
                break
            except ValueError:
                continue
    if not parsed_date:
        parsed_date = datetime.date.today()

    # 2. Parse amount and infer direction if negative
    raw_amount = data.get("amount", 0.0)
    try:
        amount = float(raw_amount)
    except (ValueError, TypeError):
        amount = 0.0

    inferred_direction = data.get("direction", "").strip().lower()
    if amount < 0:
        amount = abs(amount)
        # If amount is explicitly negative, override direction to outflow
        inferred_direction = "outflow"

    # 3. Resolve direction
    if inferred_direction not in ("inflow", "outflow"):
        # Heuristics for direction if not specified
        if "credit" in str(data.get("raw_description", "")).lower() or "deposit" in str(data.get("raw_description", "")).lower():
            inferred_direction = "inflow"
        elif "debit" in str(data.get("raw_description", "")).lower() or "withdrawal" in str(data.get("raw_description", "")).lower():
            inferred_direction = "outflow"
        else:
            inferred_direction = "outflow" # Default safe assumption

    # 4. Resolve counterparty_type
    counterparty_type = data.get("counterparty_type", "").strip().lower()
    if counterparty_type not in ("customer", "vendor", "other"):
        if inferred_direction == "inflow":
            counterparty_type = "customer"
        elif inferred_direction == "outflow":
            counterparty_type = "vendor"
        else:
            counterparty_type = "other"

    # 5. Resolve counterparty_name
    counterparty_name = str(data.get("counterparty_name") or data.get("counterparty") or "Unknown").strip()
    if not counterparty_name:
        counterparty_name = "Unknown"

    # 6. Resolve category
    category = str(data.get("category") or "other").strip().lower()

    # 7. Resolve raw description
    raw_desc = str(data.get("raw_description") or data.get("description") or "").strip()

    # 8. Resolve confidence
    try:
        confidence = float(data.get("confidence", 1.0))
    except (ValueError, TypeError):
        confidence = 1.0

    return {
        "date": parsed_date,
        "amount": round(amount, 2),
        "direction": inferred_direction,
        "category": category,
        "counterparty_name": counterparty_name,
        "counterparty_type": counterparty_type,
        "raw_description": raw_desc,
        "source_type": source_type,
        "confidence": confidence
    }
