from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from agents.course_of_action.reasoning import run_copilot_loop
from agents.course_of_action.recommendations import get_action_recommendations
from agents.course_of_action.drafting import draft_invoice_reminder

from agents.course_of_action.weekly_plan import generate_weekly_plan

router = APIRouter()

class AskRequest(BaseModel):
    org_id: int
    question: str

class AskResponse(BaseModel):
    answer: str

class Recommendation(BaseModel):
    priority: str
    title: str
    description: str
    metric_reference: Optional[str] = None

class DraftResponse(BaseModel):
    draft: str

class WeeklyPlanResponse(BaseModel):
    org_id: int
    week_start: str
    recommendations: List[Recommendation]
    highest_risk_invoice_id: Optional[int] = None
    primary_action_reminder_draft: Optional[str] = None

@router.get("/")
def get_coa_status():
    return {"status": "healthy", "service": "course_of_action"}

@router.post("/ask", response_model=AskResponse)
def ask_copilot(request: AskRequest):
    """
    General copilot advisor chat which runs the tool-selection reasoning loop.
    """
    try:
        answer = run_copilot_loop(request.org_id, request.question)
        return AskResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations/{org_id}", response_model=List[Recommendation])
def get_recommendations(org_id: int):
    """
    Returns priority-tiered recommendations for the organization.
    """
    try:
        recs = get_action_recommendations(org_id)
        return recs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/draft-reminder/{invoice_id}", response_model=DraftResponse)
def get_reminder_draft(invoice_id: int, org_id: int = Query(...), language: str = Query("English")):
    """
    Drafts an email reminder for an overdue invoice, translating to the target language.
    """
    try:
        draft = draft_invoice_reminder(org_id, invoice_id, language)
        return DraftResponse(draft=draft)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weekly-plan/{org_id}", response_model=WeeklyPlanResponse)
def get_weekly_plan(org_id: int):
    """
    Retrieves the prioritized weekly action plan checklist.
    """
    try:
        plan = generate_weekly_plan(org_id)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
