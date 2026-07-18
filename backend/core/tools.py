# backend/core/tools.py
# Gemma Function Calling Tool Schemas for THESEUS query library

GET_CURRENT_CASH_BALANCE_TOOL = {
    "name": "get_current_cash_balance",
    "description": (
        "Retrieves the most recent cash balance for a given organization. "
        "Use this tool when the user asks 'how much cash do we have?', 'what is our current balance?', "
        "or 'how much money is in the account?'."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "org_id": {
                "type": "INTEGER",
                "description": "The unique identifier of the organization."
            }
        },
        "required": ["org_id"]
    }
}

GET_MONTHLY_REVENUE_TOOL = {
    "name": "get_monthly_revenue",
    "description": (
        "Retrieves the total accumulated revenue for an organization in a specific month. "
        "Use this tool when the user asks 'what was our revenue in June?', 'how much did we make last month?', "
        "or wants to see monthly sales figures. The month must be specified in 'YYYY-MM' format."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "org_id": {
                "type": "INTEGER",
                "description": "The unique identifier of the organization."
            },
            "month": {
                "type": "STRING",
                "description": "The target month in YYYY-MM format (e.g., '2026-07')."
            }
        },
        "required": ["org_id", "month"]
    }
}

GET_OUTSTANDING_INVOICES_TOOL = {
    "name": "get_outstanding_invoices",
    "description": (
        "Retrieves all outstanding (unpaid or overdue) invoices for an organization. "
        "Use this tool when the user asks 'do we have any unpaid invoices?', 'who owes us money?', "
        "or wants to see overdue bills. Optionally filters by minimum days overdue."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "org_id": {
                "type": "INTEGER",
                "description": "The unique identifier of the organization."
            },
            "min_days_overdue": {
                "type": "INTEGER",
                "description": "The minimum number of days the invoice must be overdue. Defaults to 0 (returns all outstanding)."
            }
        },
        "required": ["org_id"]
    }
}

GET_VENDOR_PAYMENTS_TOOL = {
    "name": "get_vendor_payments",
    "description": (
        "Retrieves payments made to vendors for an organization. "
        "Use this tool when the user asks 'how much did we pay Delta Suppliers?', 'list our vendor transactions', "
        "or 'what have we spent since last week?'. Optionally filters by vendor ID and/or a date threshold."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "org_id": {
                "type": "INTEGER",
                "description": "The unique identifier of the organization."
            },
            "vendor_id": {
                "type": "INTEGER",
                "description": "The unique identifier of a specific vendor. If not provided, returns all vendor payments."
            },
            "since": {
                "type": "STRING",
                "description": "Filter payments on or after this date. Format must be YYYY-MM-DD (e.g. '2026-07-01')."
            }
        },
        "required": ["org_id"]
    }
}

GET_CASH_RUNWAY_TOOL = {
    "name": "get_cash_runway",
    "description": (
        "Reads the latest forecast data (p10, p50, p90 for 30/60/90 days horizon) for the organization. "
        "Use this tool when the user asks 'how long will our cash last?', 'what is our cash runway?', "
        "or wants to see future cash flow projections."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "org_id": {
                "type": "INTEGER",
                "description": "The unique identifier of the organization."
            }
        },
        "required": ["org_id"]
    }
}

GET_PROFIT_LOSS_TOOL = {
    "name": "get_profit_loss",
    "description": (
        "Calculates the total revenue, total expenses, and resulting net profit or loss "
        "over a specified date range. Use this tool when the user asks 'are we profitable?', "
        "'what is our net income for the last quarter?', or wants a profit and loss summary."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "org_id": {
                "type": "INTEGER",
                "description": "The unique identifier of the organization."
            },
            "start_date": {
                "type": "STRING",
                "description": "The start date of the period in YYYY-MM-DD format (inclusive)."
            },
            "end_date": {
                "type": "STRING",
                "description": "The end date of the period in YYYY-MM-DD format (inclusive)."
            }
        },
        "required": ["org_id", "start_date", "end_date"]
    }
}

# The comprehensive list of schemas to register with GemmaClient
ALL_THESEUS_TOOLS = [
    GET_CURRENT_CASH_BALANCE_TOOL,
    GET_MONTHLY_REVENUE_TOOL,
    GET_OUTSTANDING_INVOICES_TOOL,
    GET_VENDOR_PAYMENTS_TOOL,
    GET_CASH_RUNWAY_TOOL,
    GET_PROFIT_LOSS_TOOL
]
