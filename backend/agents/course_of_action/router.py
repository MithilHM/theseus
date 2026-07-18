from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_coa_status():
    return {"status": "not implemented"}
