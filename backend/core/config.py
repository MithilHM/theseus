from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMMA_API_KEY: str = ""
    GEMMA_MOCK: bool = True
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/theseus"
    VECTOR_DB: str = "pgvector"
    PINECONE_API_KEY: str = ""
    DEMO_MODE: bool = True
    SIMULATED_FEED_INTERVAL_SECONDS: int = 5

    # Email Delivery Service (SMTP / Gmail app password)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    EMAIL_MOCK: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
