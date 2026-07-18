from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_analytics_status():
    return {"status": "not implemented"}
