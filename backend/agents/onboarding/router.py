import uuid
from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException

from db.session import SessionLocal
from core.gemma_client import GemmaClient

# Import pipeline steps
from agents.onboarding.parsers import parse_csv, parse_excel, parse_pdf
from agents.onboarding.photo_parser import parse_invoice_photo
from agents.onboarding.voice_parser import parse_voice_transaction
from agents.onboarding.pipeline import ingest_transaction_record

router = APIRouter()

# In-memory job status queue for the hackathon
jobs_store: Dict[str, Dict[str, Any]] = {}

def process_onboarding_job(job_id: str, org_id: int, file_bytes: bytes, file_name: str, upload_type: str):
    """
    Background worker that runs the full onboarding ingestion pipeline.
    """
    jobs_store[job_id]["status"] = "processing"
    
    db = SessionLocal()
    client = GemmaClient()
    
    try:
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
            
        jobs_store[job_id]["status"] = "completed"
        jobs_store[job_id]["results"] = {
            "processed_count": len(processed_transactions),
            "transactions": processed_transactions
        }
    except Exception as e:
        db.rollback()
        jobs_store[job_id]["status"] = "failed"
        jobs_store[job_id]["errors"] = str(e)
    finally:
        db.close()


@router.post("/upload")
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    org_id: int = Form(...)
):
    """
    Endpoint to upload statement files (CSV, Excel, or PDF).
    Processes transactions asynchronously.
    """
    file_bytes = await file.read()
    job_id = str(uuid.uuid4())
    jobs_store[job_id] = {
        "status": "pending",
        "results": None,
        "errors": None
    }
    background_tasks.add_task(
        process_onboarding_job,
        job_id,
        org_id,
        file_bytes,
        file.filename,
        "file"
    )
    return {"job_id": job_id, "status": "pending"}


@router.post("/photo")
async def upload_invoice_photo(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    org_id: int = Form(...)
):
    """
    Endpoint to upload a photographed receipt/invoice.
    Processes structured fields asynchronously.
    """
    file_bytes = await file.read()
    job_id = str(uuid.uuid4())
    jobs_store[job_id] = {
        "status": "pending",
        "results": None,
        "errors": None
    }
    background_tasks.add_task(
        process_onboarding_job,
        job_id,
        org_id,
        file_bytes,
        file.filename,
        "photo"
    )
    return {"job_id": job_id, "status": "pending"}


@router.post("/voice")
async def upload_voice_clip(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    org_id: int = Form(...)
):
    """
    Endpoint to upload a voice recording describing a transaction.
    Transcribes and structures the transaction asynchronously.
    """
    file_bytes = await file.read()
    job_id = str(uuid.uuid4())
    jobs_store[job_id] = {
        "status": "pending",
        "results": None,
        "errors": None
    }
    background_tasks.add_task(
        process_onboarding_job,
        job_id,
        org_id,
        file_bytes,
        file.filename,
        "voice"
    )
    return {"job_id": job_id, "status": "pending"}


@router.get("/status/{job_id}")
def get_job_status(job_id: str):
    """
    Returns the status and processing results for a given job_id.
    """
    job = jobs_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

from agents.onboarding.simulated_feed import reset_simulated_feed

@router.post("/reset-demo")
def reset_demo(org_id: int = 1):
    """
    Resets the demo environment by wiping all database tables for the org and re-seeding baseline data.
    """
    try:
        reset_simulated_feed(org_id=org_id)
        return {"status": "success", "message": "Demo database wiped and re-seeded successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset demo: {str(e)}")

from agents.onboarding.sync import router as sync_router
router.include_router(sync_router)


