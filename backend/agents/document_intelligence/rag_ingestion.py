import os
import argparse
import logging
from db.session import SessionLocal
from agents.document_intelligence.chunking import parse_html_table
from agents.document_intelligence.embeddings import embed_and_store_chunks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ingest_kaggle_dataset(dataset_path: str, org_id: int = 1):
    """
    Walks through the Kaggle Financial Statements Clustering dataset directories
    (e.g., 'Income Statements', 'Balance Sheets', 'Cash Flows', 'Notes', 'Others')
    and ingests HTML files.
    """
    db = SessionLocal()
    
    try:
        categories = ["Income Statements", "Balance Sheets", "Cash Flows", "Notes", "Others"]
        
        for category in categories:
            category_path = os.path.join(dataset_path, category)
            if not os.path.isdir(category_path):
                logger.warning(f"Category folder not found: {category_path}")
                continue
                
            for filename in os.listdir(category_path):
                if not filename.endswith(".html"):
                    continue
                    
                file_path = os.path.join(category_path, filename)
                logger.info(f"Ingesting {file_path}...")
                
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    html_content = f.read()
                    
                # 1. Chunking
                chunks = parse_html_table(html_content)
                if not chunks:
                    logger.warning(f"No chunks extracted from {filename}")
                    continue
                    
                # 2. Embed and Store
                metadata = {
                    "category": category,
                    "filename": filename,
                    "dataset": "kaggle_financial_clustering"
                }
                
                embed_and_store_chunks(
                    db=db,
                    org_id=org_id,
                    source_name=filename,
                    source_type="kaggle_html",
                    chunks=chunks,
                    metadata=metadata
                )
    except Exception as e:
        logger.error(f"Error during ingestion: {e}")
        db.rollback()
    finally:
        db.close()
        logger.info("Ingestion completed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Kaggle Financial Statements Dataset")
    parser.add_argument("--path", type=str, required=True, help="Path to the unzipped dataset folder")
    parser.add_argument("--org_id", type=int, default=1, help="Organization ID to tie the documents to")
    
    args = parser.parse_args()
    ingest_kaggle_dataset(args.path, args.org_id)
