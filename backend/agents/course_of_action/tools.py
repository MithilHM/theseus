# course_of_action/tools.py

TOOL_SCHEMAS = [
    {
        "name": "get_current_cash_balance",
        "description": "Retrieves the current running cash balance of the organization.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "org_id": {"type": "INTEGER", "description": "The organization's ID."}
            },
            "required": ["org_id"]
        }
    },
    {
        "name": "get_cash_runway",
        "description": "Retrieves the remaining cash runway in days for the organization.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "org_id": {"type": "INTEGER", "description": "The organization's ID."}
            },
            "required": ["org_id"]
        }
    },
    {
        "name": "get_reliability_score",
        "description": "Retrieves the payment reliability score (0-100) for a given customer or vendor.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "org_id": {"type": "INTEGER", "description": "The organization's ID."},
                "entity_id": {"type": "INTEGER", "description": "The unique ID of the customer or vendor."},
                "entity_type": {"type": "STRING", "description": "Either 'customer' or 'vendor'."}
            },
            "required": ["org_id", "entity_id", "entity_type"]
        }
    },
    {
        "name": "ask_document_intelligence",
        "description": "Queries the document store (RAG) to find specific facts from uploaded agreements, contracts, or notices.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "org_id": {"type": "INTEGER", "description": "The organization's ID."},
                "question": {"type": "STRING", "description": "The natural language query or question about the documents."}
            },
            "required": ["org_id", "question"]
        }
    }
]
