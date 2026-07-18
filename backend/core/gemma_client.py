import base64
import requests
import time
import logging
from core.config import settings

logger = logging.getLogger(__name__)

class GemmaClient:
    def __init__(self):
        self.api_key = settings.GEMMA_API_KEY
        self.mock_mode = settings.GEMMA_MOCK
        # Default model endpoints in Gemini API
        self.text_model_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        self.multimodal_model_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        self.embedding_model_url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"

    def complete_text(self, prompt: str) -> str:
        start_time = time.time()
        logger.info("Calling Gemma complete_text...")
        try:
            if self.mock_mode:
                return "This is a mock text response from Gemma."
            
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            headers = {"Content-Type": "application/json"}
            url = f"{self.text_model_url}?key={self.api_key}"
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            res_json = response.json()
            return res_json["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.error(f"Gemma complete_text error: {str(e)}")
            return f"Error calling Gemma: {str(e)}"
        finally:
            logger.info(f"Gemma complete_text execution time: {time.time() - start_time:.4f}s")

    def complete_function_call(self, prompt: str, tools: list) -> dict:
        """
        Runs text-based content generation with forced function calling.
        """
        start_time = time.time()
        logger.info("Calling Gemma complete_function_call...")
        try:
            if self.mock_mode:
                # Handle mock categorizer fallback
                if "category" in prompt.lower() or "categorize" in prompt.lower():
                    category = "other"
                    p_lower = prompt.lower()
                    if "uber" in p_lower or "travel" in p_lower:
                        category = "utilities"
                    elif "sales" in p_lower or "client" in p_lower or "invoice" in p_lower:
                        category = "revenue"
                    elif "salary" in p_lower or "payroll" in p_lower:
                        category = "payroll"
                    elif "rent" in p_lower or "office space" in p_lower:
                        category = "rent"
                    elif "tax" in p_lower or "gst" in p_lower:
                        category = "tax"
                    elif "marketing" in p_lower or "ads" in p_lower:
                        category = "marketing"
                    elif "inventory" in p_lower or "supplier" in p_lower:
                        category = "cogs"
                    return {"name": "categorize_transaction", "arguments": {"category": category}}
                return {"name": "mock_function", "arguments": {}}

            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "tools": [{"functionDeclarations": tools}],
                "toolConfig": {
                    "functionCallingConfig": {
                        "mode": "ANY"
                    }
                }
            }
            headers = {"Content-Type": "application/json"}
            url = f"{self.text_model_url}?key={self.api_key}"
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            res_json = response.json()
            parts = res_json["candidates"][0]["content"]["parts"]
            for part in parts:
                if "functionCall" in part:
                    return {
                        "name": part["functionCall"]["name"],
                        "arguments": part["functionCall"]["args"]
                    }
            return {}
        except Exception as e:
            logger.error(f"Gemma complete_function_call error: {str(e)}")
            raise RuntimeError(f"Gemma function call failed: {str(e)}")
        finally:
            logger.info(f"Gemma complete_function_call execution time: {time.time() - start_time:.4f}s")

    def image(self, prompt: str, image_bytes: bytes, mime_type: str = "image/png", tools: list = None) -> dict:
        """
        Processes image inputs, optionally with structured tool definitions.
        """
        start_time = time.time()
        logger.info("Calling Gemma image...")
        try:
            if self.mock_mode:
                if "invoice" in prompt.lower() or "receipt" in prompt.lower():
                    return {
                        "name": "extract_invoice",
                        "arguments": {
                            "vendor_name": "Starbucks Coffee",
                            "amount": 24.50,
                            "date": "2026-07-17",
                            "line_items": [
                                {"name": "Caramel Macchiato", "quantity": 2, "price": 6.50},
                                {"name": "Blueberry Scone", "quantity": 1, "price": 4.50},
                                {"name": "Chocolate Croissant", "quantity": 2, "price": 3.50}
                            ]
                        }
                    }
                elif "statement" in prompt.lower() or "ocr" in prompt.lower() or "transactions" in prompt.lower():
                    return {
                        "name": "extract_transactions",
                        "arguments": {
                            "transactions": [
                                {
                                    "date": "2026-07-01",
                                    "amount": 10000.00,
                                    "direction": "inflow",
                                    "category": "revenue",
                                    "counterparty_name": "Acme Corp",
                                    "counterparty_type": "customer",
                                    "raw_description": "INWARD BANK TRANSFER ACME"
                                },
                                {
                                    "date": "2026-07-03",
                                    "amount": 1200.00,
                                    "direction": "outflow",
                                    "category": "utilities",
                                    "counterparty_name": "Electricity Board",
                                    "counterparty_type": "vendor",
                                    "raw_description": "ACH DEBIT FOR ELECTRICITY"
                                },
                                {
                                    "date": "2026-07-05",
                                    "amount": 3500.00,
                                    "direction": "outflow",
                                    "category": "payroll",
                                    "counterparty_name": "John Doe",
                                    "counterparty_type": "other",
                                    "raw_description": "MONTHLY SALARY PAYOUT"
                                }
                            ]
                        }
                    }
                return {"name": "mock_image_function", "arguments": {}}

            b64_data = base64.b64encode(image_bytes).decode("utf-8")
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inlineData": {
                                    "mimeType": mime_type,
                                    "data": b64_data
                                }
                            }
                        ]
                    }
                ]
            }
            if tools:
                payload["tools"] = [{"functionDeclarations": tools}]
                payload["toolConfig"] = {
                    "functionCallingConfig": {
                        "mode": "ANY"
                    }
                }

            headers = {"Content-Type": "application/json"}
            url = f"{self.multimodal_model_url}?key={self.api_key}"
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            res_json = response.json()
            parts = res_json["candidates"][0]["content"]["parts"]
            for part in parts:
                if "functionCall" in part:
                    return {
                        "name": part["functionCall"]["name"],
                        "arguments": part["functionCall"]["args"]
                    }
            return {}
        except Exception as e:
            logger.error(f"Gemma image error: {str(e)}")
            raise RuntimeError(f"Gemma image function call failed: {str(e)}")
        finally:
            logger.info(f"Gemma image execution time: {time.time() - start_time:.4f}s")

    def audio(self, prompt: str, audio_bytes: bytes, mime_type: str = "audio/wav", tools: list = None) -> dict:
        """
        Processes audio inputs, forcing structured tool outputs.
        """
        start_time = time.time()
        logger.info("Calling Gemma audio...")
        try:
            if self.mock_mode:
                return {
                    "name": "log_transaction",
                    "arguments": {
                        "amount": 450.00,
                        "direction": "outflow",
                        "counterparty": "Uber",
                        "category": "utilities",
                        "raw_description": "I spent 450 rupees on Uber for client visit"
                    }
                }

            b64_data = base64.b64encode(audio_bytes).decode("utf-8")
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inlineData": {
                                    "mimeType": mime_type,
                                    "data": b64_data
                                }
                            }
                        ]
                    }
                ]
            }
            if tools:
                payload["tools"] = [{"functionDeclarations": tools}]
                payload["toolConfig"] = {
                    "functionCallingConfig": {
                        "mode": "ANY"
                    }
                }

            headers = {"Content-Type": "application/json"}
            url = f"{self.multimodal_model_url}?key={self.api_key}"
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            res_json = response.json()
            parts = res_json["candidates"][0]["content"]["parts"]
            for part in parts:
                if "functionCall" in part:
                    return {
                        "name": part["functionCall"]["name"],
                        "arguments": part["functionCall"]["args"]
                    }
            return {}
        except Exception as e:
            logger.error(f"Gemma audio error: {str(e)}")
            raise RuntimeError(f"Gemma audio function call failed: {str(e)}")
        finally:
            logger.info(f"Gemma audio execution time: {time.time() - start_time:.4f}s")

    def process_image(self, prompt: str, image_bytes: bytes) -> str:
        """Fallback helper for raw text response from image analysis"""
        res = self.image(prompt, image_bytes)
        return str(res)

    def process_audio(self, prompt: str, audio_bytes: bytes) -> str:
        """Fallback helper for raw text response from audio analysis"""
        res = self.audio(prompt, audio_bytes)
        return str(res)

    def get_embeddings(self, text: str) -> list[float]:
        """
        Generates vector embeddings for a given text string.
        """
        start_time = time.time()
        logger.info("Calling Gemma get_embeddings...")
        try:
            if self.mock_mode:
                return [0.0] * 768
                
            payload = {
                "model": "models/text-embedding-004",
                "content": {
                    "parts": [{
                        "text": text
                    }]
                }
            }
            headers = {"Content-Type": "application/json"}
            url = f"{self.embedding_model_url}?key={self.api_key}"
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            res_json = response.json()
            return res_json["embedding"]["values"]
        except Exception as e:
            logger.error(f"Gemma get_embeddings error: {str(e)}")
            raise RuntimeError(f"Gemma embedding call failed: {str(e)}")
        finally:
            logger.info(f"Gemma get_embeddings execution time: {time.time() - start_time:.4f}s")
