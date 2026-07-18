from core.gemma_client import GemmaClient

# Fixed enum categories requested
ALLOWED_CATEGORIES = ["revenue", "cogs", "payroll", "rent", "utilities", "tax", "loan_payment", "marketing", "other"]

CATEGORIZE_TOOL = {
    "name": "categorize_transaction",
    "description": "Assigns a category to a transaction using its counterparty name, amount, direction, and description.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "category": {
                "type": "STRING",
                "enum": ALLOWED_CATEGORIES,
                "description": "The category of the transaction. Must be strictly chosen from this list."
            }
        },
        "required": ["category"]
    }
}

def categorize_transaction(client: GemmaClient, counterparty_name: str, amount: float, direction: str, raw_description: str) -> str:
    """
    Categorizes a transaction using Gemma's function-calling capability.
    Forces the response to fall strictly into the pre-defined category enum.
    
    Returns:
        str: Categorized string (revenue, cogs, payroll, rent, utilities, tax, loan_payment, marketing, or other).
    """
    prompt = (
        f"Please categorize the following financial transaction:\n"
        f"Counterparty: {counterparty_name}\n"
        f"Amount: {amount}\n"
        f"Direction: {direction}\n"
        f"Description: {raw_description}\n\n"
        f"Analyze the context and assign the most appropriate category."
    )

    try:
        response = client.complete_function_call(prompt, tools=[CATEGORIZE_TOOL])
        category = response.get("arguments", {}).get("category", "other")
        
        # Ensure fallback safety in case Gemma returns something outside the allowed list
        if category not in ALLOWED_CATEGORIES:
            category = "other"
        return category
    except Exception:
        # Graceful fallback to 'other' if the AI Studio API encounters an error
        return "other"
