from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMMA_API_KEY: str = ""
    GEMMA_MOCK: bool = True
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/theseus"
    VECTOR_DB: str = "pgvector"
    PINECONE_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
