from typing import Any, Dict
from core.gemma_client import GemmaClient

INVOICE_EXTRACT_TOOL = {
    "name": "extract_invoice",
    "description": "Extracts key structured details from a photographed receipt or invoice.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "vendor_name": {"type": "STRING", "description": "The name of the merchant/vendor"},
            "amount": {"type": "NUMBER", "description": "Total invoice or receipt amount"},
            "date": {"type": "STRING", "description": "Invoice date in YYYY-MM-DD format"},
            "line_items": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "name": {"type": "STRING", "description": "Name or description of the line item"},
                        "quantity": {"type": "NUMBER", "description": "Quantity purchased"},
                        "price": {"type": "NUMBER", "description": "Price per unit"}
                    },
                    "required": ["name"]
                },
                "description": "List of line items purchased"
            }
        },
        "required": ["vendor_name", "amount", "date"]
    }
}

def parse_invoice_photo(client: GemmaClient, image_bytes: bytes, mime_type: str = "image/png") -> Dict[str, Any]:
    """
    Calls Gemma's multimodal capability to extract structured invoice data from an uploaded receipt/invoice image.
    Uses function calling to return strict JSON fields without free text.

    Args:
        client (GemmaClient): Custom client for Gemma interaction.
        image_bytes (bytes): Binary data of the uploaded image.
        mime_type (str, optional): The mime type of the image. Defaults to "image/png".

    Returns:
        dict: A dictionary containing 'vendor_name', 'amount', 'date', and optional 'line_items'.
    """
    if not image_bytes or len(image_bytes) < 100:
        raise ValueError("The uploaded receipt image is empty or corrupted.")

    prompt = (
        "Extract vendor_name, amount, date, and line_items from this receipt/invoice photo. "
        "Strictly execute the tool call and output no conversational text."
    )

    try:
        res = client.image(
            prompt=prompt,
            image_bytes=image_bytes,
            mime_type=mime_type,
            tools=[INVOICE_EXTRACT_TOOL]
        )
        
        args = res.get("arguments", {})
        if not args or "vendor_name" not in args or "amount" not in args or "date" not in args:
            raise ValueError("Important billing fields (vendor name, total amount, or date) could not be extracted.")
            
        return args
    except ValueError as ve:
        raise ve
    except Exception as e:
        raise ValueError(
            f"The invoice photo could not be read. Please ensure the image is clear, "
            f"well-lit, and contains visible pricing details. Details: {str(e)}"
        )
