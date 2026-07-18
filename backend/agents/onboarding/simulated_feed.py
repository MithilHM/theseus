import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from core.config import settings
from db.session import SessionLocal
from core.gemma_client import GemmaClient
from db.seed_data import generate_seed_data
from db.models import Customer, Vendor, Invoice, Transaction, Revenue, Expense, Payment, CashBalance, GSTData, ForecastData, ReliabilityScore, Anomaly, Document
from agents.onboarding.pipeline import ingest_transaction_record, stale_mark_analytics

# Simulation state to track fed dataset progress
simulation_state = {
    "initialized": False,
    "current_day_index": 60,  # 0 to 60 is seeded as history at startup, 61-90 continuous
    "seed_data": None,
    "org_id": 1,
    "interval_seconds": settings.SIMULATED_FEED_INTERVAL_SECONDS
}

scheduler = BackgroundScheduler()

def feed_worker():
    """Worker function that runs at intervals to inject one day of transactions."""
    if not simulation_state["initialized"] or not simulation_state["seed_data"]:
        return
        
    next_day_idx = simulation_state["current_day_index"] + 1
    if next_day_idx > 90:
        # Wrap around from day 61 to day 90 to keep feed going infinitely in demo mode
        print("Simulated Feed: Reached end of 90 days. Wrapping back to day 61.")
        next_day_idx = 61
        
    simulation_state["current_day_index"] = next_day_idx
    
    db = SessionLocal()
    client = GemmaClient()
    
    try:
        # Find absolute target date
        start_date = datetime.date.today() - datetime.timedelta(days=90)
        target_date = start_date + datetime.timedelta(days=next_day_idx)
        target_date_str = target_date.isoformat()
        
        # Filter transactions matching this day
        all_txs = simulation_state["seed_data"]["transactions"]
        day_txs = [tx for tx in all_txs if tx["date"] == target_date_str]
        
        print(f"Simulated Feed: Ingesting {len(day_txs)} transactions for day {next_day_idx} ({target_date_str})...")
        
        for raw in day_txs:
            # Process using same onboarding pipeline
            ingest_transaction_record(
                db=db,
                client=client,
                org_id=simulation_state["org_id"],
                raw_record=raw,
                source_type="simulated_feed"
            )
            
        # Always stale-mark analytics on day advancement because time has moved forward
        stale_mark_analytics(db, simulation_state["org_id"])
        db.commit()
        print(f"Simulated Feed: Day {next_day_idx} ingestion completed. Analytics flagged for recompute.")
    except Exception as e:
        print(f"Error in simulated feed worker: {str(e)}")
        db.rollback()
    finally:
        db.close()

def start_simulated_feed(org_id: int = 1, interval_seconds: int = 15):
    """
    Initializes simulated feed data:
    1. Pre-seeds Customers, Vendors, and Invoices.
    2. Inserts first 60 days of transactional history.
    3. Configures and starts APScheduler to inject remaining 30 days one day at a time.
    """
    if simulation_state["initialized"]:
        return
        
    db = SessionLocal()
    try:
        # 1. Generate / load seed dataset
        data = generate_seed_data()
        simulation_state["seed_data"] = data
        simulation_state["org_id"] = org_id
        simulation_state["interval_seconds"] = interval_seconds
        
        # 2. Seed basic entities (Customers, Vendors, Invoices)
        print("Simulated Feed: Pre-seeding customers and vendors...")
        for c in data["customers"]:
            exists = db.query(Customer).filter(Customer.org_id == org_id, Customer.name == c["name"]).first()
            if not exists:
                db.add(Customer(org_id=org_id, name=c["name"]))
                
        for v in data["vendors"]:
            exists = db.query(Vendor).filter(Vendor.org_id == org_id, Vendor.name == v["name"]).first()
            if not exists:
                db.add(Vendor(org_id=org_id, name=v["name"]))
        db.commit()

        # Seed outstanding invoices
        print("Simulated Feed: Pre-seeding outstanding invoices...")
        for inv in data["invoices"]:
            cust = db.query(Customer).filter(Customer.org_id == org_id, Customer.name == inv["customer_name"]).first()
            if cust:
                exists = db.query(Invoice).filter(
                    Invoice.org_id == org_id,
                    Invoice.customer_id == cust.id,
                    Invoice.amount == inv["amount"],
                    Invoice.issue_date == datetime.date.fromisoformat(inv["issue_date"])
                ).first()
                if not exists:
                    db.add(Invoice(
                        org_id=org_id,
                        customer_id=cust.id,
                        amount=inv["amount"],
                        issue_date=datetime.date.fromisoformat(inv["issue_date"]),
                        due_date=datetime.date.fromisoformat(inv["due_date"]),
                        status=inv["status"]
                    ))
        db.commit()

        # 3. Seed historical transactions (Days 0 to 60)
        start_date = datetime.date.today() - datetime.timedelta(days=90)
        cutoff_date = start_date + datetime.timedelta(days=60)
        
        history_txs = [tx for tx in data["transactions"] if datetime.date.fromisoformat(tx["date"]) <= cutoff_date]
        print(f"Simulated Feed: Pre-seeding {len(history_txs)} transactions of historical baseline...")
        
        client = GemmaClient()
        for raw in history_txs:
            # Check duplicate to avoid double insertion on restarts
            exists = db.query(Transaction).filter(
                Transaction.org_id == org_id,
                Transaction.amount == raw["amount"],
                Transaction.counterparty_name == raw["counterparty_name"],
                Transaction.date == datetime.date.fromisoformat(raw["date"])
            ).first()
            if not exists:
                ingest_transaction_record(
                    db=db,
                    client=client,
                    org_id=org_id,
                    raw_record=raw,
                    source_type="seed"
                )
        db.commit()
        simulation_state["initialized"] = True
        
        # 4. Start scheduler for day 61 to 90
        scheduler.add_job(
            feed_worker, 
            'interval', 
            seconds=interval_seconds, 
            id='simulated_feed_job', 
            replace_existing=True
        )
        scheduler.start()
        print(f"Simulated Feed: Scheduler started. Ingesting one day every {interval_seconds}s.")
        
    except Exception as e:
        print(f"Simulated Feed: Initialization failed: {str(e)}")
        db.rollback()
    finally:
        db.close()

def stop_simulated_feed():
    """Stops the simulated feed background job."""
    if scheduler.running:
        try:
            scheduler.shutdown()
        except Exception:
            pass
        simulation_state["initialized"] = False
        print("Simulated Feed: Scheduler shutdown successfully.")

def reset_simulated_feed(org_id: int = 1):
    """
    Stops the scheduler, wipes all database tables for the given org_id,
    resets simulation pointers, and triggers start_simulated_feed to re-seed.
    """
    stop_simulated_feed()
    
    # Re-initialize scheduler since shutdown() might make it un-startable depending on standard scheduler lifecycle
    global scheduler
    scheduler = BackgroundScheduler()
    
    db = SessionLocal()
    try:
        print(f"Simulated Feed: Wiping database tables for org_id {org_id}...")
        db.query(Anomaly).filter(Anomaly.org_id == org_id).delete()
        db.query(ReliabilityScore).filter(ReliabilityScore.org_id == org_id).delete()
        db.query(ForecastData).filter(ForecastData.org_id == org_id).delete()
        db.query(GSTData).filter(GSTData.org_id == org_id).delete()
        db.query(CashBalance).filter(CashBalance.org_id == org_id).delete()
        db.query(Payment).filter(Payment.org_id == org_id).delete()
        db.query(Invoice).filter(Invoice.org_id == org_id).delete()
        db.query(Expense).filter(Expense.org_id == org_id).delete()
        db.query(Revenue).filter(Revenue.org_id == org_id).delete()
        db.query(Transaction).filter(Transaction.org_id == org_id).delete()
        db.query(Vendor).filter(Vendor.org_id == org_id).delete()
        db.query(Customer).filter(Customer.org_id == org_id).delete()
        db.query(Document).filter(Document.org_id == org_id).delete()
        db.commit()
        print("Simulated Feed: Database wipe completed.")
    except Exception as e:
        db.rollback()
        print(f"Error during db reset wipe: {str(e)}")
        raise e
    finally:
        db.close()

    simulation_state["initialized"] = False
    simulation_state["current_day_index"] = 60
    
    print(f"Simulated Feed: Re-initializing simulated feed with interval={settings.SIMULATED_FEED_INTERVAL_SECONDS}s...")
    start_simulated_feed(org_id=org_id, interval_seconds=settings.SIMULATED_FEED_INTERVAL_SECONDS)

