import io
import datetime
import pandas as pd
import pdfplumber
import pypdfium2 as pdfium
from typing import List, Dict, Any
from core.gemma_client import GemmaClient

OCR_TX_TOOL = {
    "name": "extract_transactions",
    "description": "Extracts structured transaction records from a bank statement image.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "transactions": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "date": {"type": "STRING", "description": "Transaction date in YYYY-MM-DD format"},
                        "amount": {"type": "NUMBER", "description": "Absolute numeric transaction amount"},
                        "direction": {"type": "STRING", "enum": ["inflow", "outflow"], "description": "Direction of payment flow"},
                        "counterparty_name": {"type": "STRING", "description": "Name of the customer or vendor"},
                        "counterparty_type": {"type": "STRING", "enum": ["customer", "vendor", "other"]},
                        "raw_description": {"type": "STRING", "description": "Raw description or narration from statement"}
                    },
                    "required": ["date", "amount", "direction", "counterparty_name"]
                }
            }
        },
        "required": ["transactions"]
    }
}

def df_to_transactions(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Converts a pandas DataFrame into a raw transaction list by detecting column indices/names."""
    if df.empty:
        raise ValueError("The parsed file contains no rows or transaction records.")

    orig_cols = list(df.columns)
    df.columns = [str(c).strip().lower() for c in df.columns]
    
    transactions = []
    
    # Try finding matching headers
    date_col = next((c for c in df.columns if 'date' in c), None)
    amount_col = next((c for c in df.columns if 'amount' in c or 'val' in c or 'sum' in c), None)
    desc_col = next((c for c in df.columns if 'desc' in c or 'narr' in c or 'details' in c or 'info' in c), None)
    cp_col = next((c for c in df.columns if 'party' in c or 'name' in c or 'payee' in c or 'sender' in c or 'receiver' in c), None)
    dir_col = next((c for c in df.columns if 'dir' in c or 'type' in c or 'flow' in c), None)

    for idx, row in df.iterrows():
        try:
            val_date = row[date_col] if date_col else (row.iloc[0] if len(row) > 0 else None)
            val_amount = row[amount_col] if amount_col else (row.iloc[1] if len(row) > 1 else 0.0)
            val_desc = row[desc_col] if desc_col else (row.iloc[2] if len(row) > 2 else "")
            val_cp = row[cp_col] if cp_col else (row.iloc[3] if len(row) > 3 else "")
            val_dir = row[dir_col] if dir_col else ""

            if pd.isna(val_date) and pd.isna(val_amount):
                continue

            transactions.append({
                "date": None if pd.isna(val_date) else str(val_date),
                "amount": 0.0 if pd.isna(val_amount) else val_amount,
                "raw_description": "" if pd.isna(val_desc) else str(val_desc),
                "counterparty_name": "" if pd.isna(val_cp) else str(val_cp),
                "direction": "" if pd.isna(val_dir) else str(val_dir)
            })
        except Exception as row_err:
            raise ValueError(f"Malformed row layout on row #{idx + 1}. Error: {str(row_err)}")

    # Restore original column names to the dataframe to avoid side effects
    df.columns = orig_cols
    return transactions


def parse_csv(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Parses a CSV bank statement into raw transaction dictionaries with robust error checking."""
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except pd.errors.EmptyDataError:
        raise ValueError("The uploaded CSV file is empty.")
    except pd.errors.ParserError as pe:
        raise ValueError(f"The CSV file is malformed or has invalid delimiters. Error: {str(pe)}")
    except Exception as e:
        raise ValueError(f"Failed to read CSV statement: {str(e)}")
        
    try:
        return df_to_transactions(df)
    except ValueError as ve:
        raise ve
    except Exception as e:
        raise ValueError(f"Failed to parse transactions from CSV: {str(e)}")


def parse_excel(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Parses an Excel bank statement into raw transaction dictionaries with robust error checking."""
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Unsupported Excel format or unreadable workbook. Please upload a valid .xlsx or .xls file. Error: {str(e)}")
        
    try:
        return df_to_transactions(df)
    except ValueError as ve:
        raise ve
    except Exception as e:
        raise ValueError(f"Failed to parse transactions from Excel: {str(e)}")


def parse_pdf_via_ocr(file_bytes: bytes, client: GemmaClient) -> List[Dict[str, Any]]:
    """Rasterises PDF pages and extracts transactions using Gemma Client OCR capabilities."""
    extracted_txs = []
    try:
        doc = pdfium.PdfDocument(file_bytes)
    except Exception as e:
        raise ValueError(f"The PDF file is corrupted and pages could not be rasterized. Error: {str(e)}")
        
    try:
        # Parse first 3 pages of the statement
        for page_idx in range(min(len(doc), 3)):
            page = doc[page_idx]
            bitmap = page.render(scale=2.0)
            pil_img = bitmap.to_pil()
            
            img_io = io.BytesIO()
            pil_img.save(img_io, format="PNG")
            img_bytes = img_io.getvalue()
            
            prompt = "Extract all bank statement transactions from this page image into a list of structured records."
            res = client.image(prompt, img_bytes, mime_type="image/png", tools=[OCR_TX_TOOL])
            
            tx_list = res.get("arguments", {}).get("transactions", [])
            for tx in tx_list:
                extracted_txs.append(tx)
    except Exception as e:
        raise ValueError(f"Failed to perform Gemma OCR extraction on PDF pages: {str(e)}")
    
    return extracted_txs


def parse_pdf(file_bytes: bytes, client: GemmaClient) -> List[Dict[str, Any]]:
    """
    Parses a PDF bank statement.
    Attempts table extraction first. If tables are missing or empty,
    rasterizes the PDF pages to PNGs and performs OCR-based extraction using Gemma.
    """
    transactions = []
    has_tables = False
    
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if table and len(table) > 1:
                        has_tables = True
                        headers = [str(h).strip().lower() for h in table[0]]
                        for row in table[1:]:
                            if not row or not any(row) or len(row) != len(headers):
                                continue
                            row_dict = dict(zip(headers, row))
                            
                            date_val = next((row_dict[k] for k in row_dict if 'date' in k), None)
                            amount_val = next((row_dict[k] for k in row_dict if 'amount' in k or 'value' in k or 'sum' in k), None)
                            desc_val = next((row_dict[k] for k in row_dict if 'desc' in k or 'narr' in k or 'info' in k), "")
                            cp_val = next((row_dict[k] for k in row_dict if 'party' in k or 'name' in k or 'payee' in k), "")
                            dir_val = next((row_dict[k] for k in row_dict if 'dir' in k or 'type' in k), "")

                            if not date_val and len(row) > 0:
                                date_val = row[0]
                            if not amount_val and len(row) > 1:
                                amount_val = row[1]
                                
                            transactions.append({
                                "date": date_val,
                                "amount": amount_val,
                                "raw_description": desc_val,
                                "counterparty_name": cp_val,
                                "direction": dir_val
                            })
    except Exception as e:
        print(f"pdfplumber failed (falling back to OCR): {str(e)}")
        has_tables = False
    
    # Fallback to OCR if table parsing yielded no transactions
    if not has_tables or len(transactions) == 0:
        try:
            transactions = parse_pdf_via_ocr(file_bytes, client)
        except Exception as ocr_err:
            raise ValueError(f"Unreadable PDF bank statement. Native extraction and OCR both failed. Details: {str(ocr_err)}")
        
    if len(transactions) == 0:
        raise ValueError("Could not extract any transaction entries from the uploaded PDF bank statement.")
        
    return transactions
