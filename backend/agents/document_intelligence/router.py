from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_document_intelligence_status():
    return {"status": "not implemented"}
