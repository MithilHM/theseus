from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_onboarding_status():
    return {"status": "not implemented"}
