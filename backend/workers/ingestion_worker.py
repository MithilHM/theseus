import json
import logging
import time
from core.kafka_client import get_kafka_consumer
from db.session import SessionLocal
from core.gemma_client import GemmaClient

# Import pipeline steps
from agents.onboarding.parsers import parse_csv, parse_excel, parse_pdf
from agents.onboarding.photo_parser import parse_invoice_photo
from agents.onboarding.voice_parser import parse_voice_transaction
from agents.onboarding.pipeline import ingest_transaction_record

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_job(payload: dict):
    job_id = payload.get("job_id")
    org_id = payload.get("org_id")
    file_path = payload.get("file_path")
    file_name = payload.get("file_name")
    upload_type = payload.get("upload_type")
    
    logger.info(f"Processing job {job_id} for org {org_id} from {file_path}")
    
    db = SessionLocal()
    client = GemmaClient()
    
    try:
        # Read the file bytes
        with open(file_path, "rb") as f:
            file_bytes = f.read()
            
        raw_records = []
        
        # 1. Parsing Phase based on input type
        if upload_type == "file":
            if file_name.endswith(".csv"):
                raw_records = parse_csv(file_bytes)
            elif file_name.endswith((".xlsx", ".xls")):
                raw_records = parse_excel(file_bytes)
            elif file_name.endswith(".pdf"):
                raw_records = parse_pdf(file_bytes, client)
            else:
                raise ValueError("Unsupported file format. Must be CSV, Excel, or PDF.")
        elif upload_type == "photo":
            invoice_data = parse_invoice_photo(client, file_bytes)
            raw_records = [{
                "date": invoice_data.get("date"),
                "amount": invoice_data.get("amount"),
                "direction": "outflow",  # Receipts/invoices are outflows/expenses
                "counterparty_name": invoice_data.get("vendor_name"),
                "counterparty_type": "vendor",
                "raw_description": f"Invoice photo from {invoice_data.get('vendor_name')}"
            }]
        elif upload_type == "voice":
            voice_data = parse_voice_transaction(client, file_bytes)
            raw_records = [voice_data]
            
        processed_transactions = []

        # 2. Pipeline processing for each record
        for raw in raw_records:
            tx_res = ingest_transaction_record(
                db=db,
                client=client,
                org_id=org_id,
                raw_record=raw,
                source_type=upload_type
            )
            processed_transactions.append(tx_res)
            
        logger.info(f"Successfully processed {len(processed_transactions)} transactions for job {job_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to process job {job_id}: {str(e)}")
    finally:
        db.close()


def run_worker():
    consumer = get_kafka_consumer("theseus-ingestion-group")
    consumer.subscribe(["document-ingestion"])
    
    logger.info("Starting ingestion worker. Waiting for messages...")
    
    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                logger.error(f"Consumer error: {msg.error()}")
                continue
                
            try:
                payload = json.loads(msg.value().decode('utf-8'))
                process_job(payload)
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                
    except KeyboardInterrupt:
        logger.info("Worker shutting down")
    finally:
        consumer.close()

if __name__ == "__main__":
    run_worker()
