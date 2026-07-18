import uuid
import os
import shutil
from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException

from db.session import SessionLocal
from core.gemma_client import GemmaClient
from core.kafka_client import publish_job

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory job status queue for the hackathon submission state
# Note: In a production Kafka setup, worker would update a DB table for job status
jobs_store: Dict[str, Dict[str, Any]] = {}


async def save_upload_file(upload_file: UploadFile, job_id: str) -> str:
    file_extension = os.path.splitext(upload_file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}{file_extension}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return file_path


@router.post("/upload")
async def upload_statement(
    file: UploadFile = File(...),
    org_id: int = Form(...)
):
    """
    Endpoint to upload statement files (CSV, Excel, or PDF).
    Pushes the job to Kafka for asynchronous processing.
    """
    job_id = str(uuid.uuid4())
    file_path = await save_upload_file(file, job_id)
    
    payload = {
        "job_id": job_id,
        "org_id": org_id,
        "file_path": file_path,
        "file_name": file.filename,
        "upload_type": "file"
    }
    publish_job("document-ingestion", job_id, payload)
    
    jobs_store[job_id] = {"status": "pending_in_kafka", "results": None, "errors": None}
    return {"job_id": job_id, "status": "pending_in_kafka"}


@router.post("/photo")
async def upload_invoice_photo(
    file: UploadFile = File(...),
    org_id: int = Form(...)
):
    """
    Endpoint to upload a photographed receipt/invoice.
    Pushes the job to Kafka.
    """
    job_id = str(uuid.uuid4())
    file_path = await save_upload_file(file, job_id)
    
    payload = {
        "job_id": job_id,
        "org_id": org_id,
        "file_path": file_path,
        "file_name": file.filename,
        "upload_type": "photo"
    }
    publish_job("document-ingestion", job_id, payload)
    
    jobs_store[job_id] = {"status": "pending_in_kafka", "results": None, "errors": None}
    return {"job_id": job_id, "status": "pending_in_kafka"}


@router.post("/voice")
async def upload_voice_clip(
    file: UploadFile = File(...),
    org_id: int = Form(...)
):
    """
    Endpoint to upload a voice recording describing a transaction.
    Pushes the job to Kafka.
    """
    job_id = str(uuid.uuid4())
    file_path = await save_upload_file(file, job_id)
    
    payload = {
        "job_id": job_id,
        "org_id": org_id,
        "file_path": file_path,
        "file_name": file.filename,
        "upload_type": "voice"
    }
    publish_job("document-ingestion", job_id, payload)
    
    jobs_store[job_id] = {"status": "pending_in_kafka", "results": None, "errors": None}
    return {"job_id": job_id, "status": "pending_in_kafka"}


@router.get("/status/{job_id}")
def get_job_status(job_id: str):
    """
    Returns the status for a given job_id.
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


