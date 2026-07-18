from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agents.onboarding import router as onboarding_router
from agents.analytics import router as analytics_router
from agents.course_of_action import router as coa_router
from agents.document_intelligence import router as doc_intel_router
from agents.email import router as email_router

from core.config import settings
from agents.onboarding.simulated_feed import start_simulated_feed, stop_simulated_feed

app = FastAPI(title="THESEUS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding_router.router, prefix="/api/onboarding", tags=["onboarding"])
app.include_router(analytics_router.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(coa_router.router, prefix="/api/course_of_action", tags=["course_of_action"])
app.include_router(doc_intel_router.router, prefix="/api/document_intelligence", tags=["document_intelligence"])
app.include_router(email_router.router, prefix="/api/email", tags=["email"])

@app.on_event("startup")
def startup_event():
    # If DEMO_MODE is enabled, initialize the database tables and start the simulated feed
    if settings.DEMO_MODE:
        from db.session import engine
        from db.models import Base
        print("FastAPI Startup: Ensuring database tables are created...")
        Base.metadata.create_all(bind=engine)
        
        print(f"FastAPI Startup: Initializing and launching simulated feed (interval={settings.SIMULATED_FEED_INTERVAL_SECONDS}s)...")
        start_simulated_feed(org_id=1, interval_seconds=settings.SIMULATED_FEED_INTERVAL_SECONDS)

@app.on_event("shutdown")
def shutdown_event():
    if settings.DEMO_MODE:
        print("FastAPI Shutdown: Stopping background simulated feed...")
        stop_simulated_feed()

@app.get("/health")
def health_check():
    return {"status": "healthy"}
