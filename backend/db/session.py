from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings

DATABASE_URL = settings.DATABASE_URL
# Handle possible postgres:// vs postgresql:// prefix differences (e.g. from Heroku or elsewhere)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    FastAPI dependency that provides a SQLAlchemy database session.
    Ensures that the connection is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
