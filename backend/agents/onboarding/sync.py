import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db, SessionLocal
from core.gemma_client import GemmaClient
from db.seed_data import generate_seed_data
from agents.onboarding.pipeline import ingest_transaction_record

router = APIRouter()

# Global in-memory map of sync connector states
# Maps source_id -> metadata dictionary
connector_states: Dict[str, Dict[str, Any]] = {}

def get_or_create_connector(source_id: str, org_id: int = 1) -> Dict[str, Any]:
    """Helper to initialise mock connector state if it doesn't exist."""
    if source_id not in connector_states:
        # Default last_synced_at to 90 days ago to import historical batches
        start_date = datetime.date.today() - datetime.timedelta(days=90)
        connector_states[source_id] = {
            "org_id": org_id,
            "last_synced_at": start_date,
            "seed_data": generate_seed_data()
        }
    return connector_states[source_id]


@router.post("/sync/{source_id}")
def sync_source(source_id: str, org_id: int = 1, db: Session = Depends(get_db)):
    """
    Manually triggers transactional synchronisation for a source connector.
    Pulls unconsumed transactions from the mock seed data occurring after `last_synced_at`,
    runs them through the pipeline, and updates `last_synced_at`.
    """
    connector = get_or_create_connector(source_id, org_id)
    last_synced = connector["last_synced_at"]
    seed_txs = connector["seed_data"]["transactions"]
    
    # Define sync batch end (e.g. pull 7 days of transactions at a time to simulate batching)
    sync_window_end = last_synced + datetime.timedelta(days=7)
    today = datetime.date.today()
    if sync_window_end > today:
        sync_window_end = today

    if last_synced >= today:
        return {
            "status": "up_to_date",
            "message": f"Source {source_id} is already synchronized up to today.",
            "last_synced_at": last_synced.isoformat(),
            "synced_count": 0,
            "transactions": []
        }

    # Filter transactions occurring in the window (last_synced, sync_window_end]
    batch_txs = []
    for tx in seed_txs:
        tx_date = datetime.date.fromisoformat(tx["date"])
        if last_synced < tx_date <= sync_window_end:
            batch_txs.append(tx)

    # Process batch transactions
    client = GemmaClient()
    synced_records = []
    
    try:
        for raw in batch_txs:
            res = ingest_transaction_record(
                db=db,
                client=client,
                org_id=org_id,
                raw_record=raw,
                source_type="sync"
            )
            synced_records.append(res)
            
        db.commit()
        # Update synced state
        connector["last_synced_at"] = sync_window_end
        
        return {
            "status": "completed",
            "message": f"Successfully synced {len(synced_records)} transactions from source {source_id}.",
            "last_synced_at": sync_window_end.isoformat(),
            "synced_count": len(synced_records),
            "transactions": synced_records
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to synchronise source {source_id}: {str(e)}"
        )
