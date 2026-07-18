from typing import Any, Dict
from core.gemma_client import GemmaClient

# Strict length limit check (~2 MB fits standard 30s wav mono/compressed)
MAX_AUDIO_SIZE_BYTES = 2.5 * 1024 * 1024

VOICE_EXTRACT_TOOL = {
    "name": "log_transaction",
    "description": "Logs a financial transaction by extracting transaction details from a voice clip.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "amount": {"type": "NUMBER", "description": "Absolute numeric transaction amount"},
            "direction": {
                "type": "STRING", 
                "enum": ["inflow", "outflow"], 
                "description": "Transaction direction (inflow if money received, outflow if money spent)"
            },
            "counterparty": {"type": "STRING", "description": "Name of the customer, vendor, or other counterparty"},
            "category": {
                "type": "STRING", 
                "description": "Category suggestion: revenue, cogs, payroll, rent, utilities, tax, loan_payment, marketing, other"
            },
            "raw_description": {"type": "STRING", "description": "Literal transcription or description extracted from the audio"}
        },
        "required": ["amount", "direction", "counterparty"]
    }
}

def parse_voice_transaction(client: GemmaClient, audio_bytes: bytes, mime_type: str = "audio/wav") -> Dict[str, Any]:
    """
    Calls Gemma's multimodal capabilities to transcribe and parse transaction info from an audio recording.
    Returns structured results via function calling.

    Args:
        client (GemmaClient): Custom client for Gemma interaction.
        audio_bytes (bytes): Binary data of the voice recording (≤30 seconds).
        mime_type (str, optional): The mime type of the audio. Defaults to "audio/wav".

    Returns:
        dict: A dictionary containing 'amount', 'direction', 'counterparty', and 'raw_description'.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        raise ValueError("The uploaded voice clip is empty or corrupted.")

    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise ValueError("The audio recording exceeds the maximum allowed duration of 30 seconds.")

    prompt = (
        "Analyze this audio clip, transcribe the transaction mentioned, and extract the amount, "
        "direction, counterparty, and category. Strict JSON tool call response only."
    )

    try:
        res = client.audio(
            prompt=prompt,
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            tools=[VOICE_EXTRACT_TOOL]
        )
        
        args = res.get("arguments", {})
        if not args or "amount" not in args or "direction" not in args or "counterparty" not in args:
            raise ValueError("The audio recording is unintelligible. Please speak clearly, stating the amount, counterparty, and direction.")
            
        return args
    except ValueError as ve:
        raise ve
    except Exception as e:
        raise ValueError(
            f"The voice transaction could not be processed. Please make sure the audio format is supported "
            f"and you speak clearly. Details: {str(e)}"
        )
