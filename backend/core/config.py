import os
from pydantic_settings import BaseSettings

# Resolve path to the .env in root workspace directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, "..", ".env")

class Settings(BaseSettings):
    GEMMA_API_KEY: str = ""
    GEMMA_MOCK: bool = True
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/theseus"
    VECTOR_DB: str = "pgvector"
    PINECONE_API_KEY: str = ""
    DEMO_MODE: bool = True
    SIMULATED_FEED_INTERVAL_SECONDS: int = 5

    class Config:
        env_file = ENV_PATH

settings = Settings()

