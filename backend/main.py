from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agents.onboarding import router as onboarding_router
from agents.analytics import router as analytics_router
from agents.course_of_action import router as coa_router
from agents.document_intelligence import router as doc_intel_router

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

@app.get("/health")
def health_check():
    return {"status": "healthy"}
