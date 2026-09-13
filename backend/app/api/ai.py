from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import AICopilotQuery, AICopilotResponse, UserResponse
from app.services.ai_copilot_service import ai_copilot_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Investigation Copilot (INTEL-AI)"])


@router.post("/query", response_model=AICopilotResponse)
async def query_copilot(
    payload: AICopilotQuery,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Query INTEL-AI Investigation Copilot.
    Strictly grounded in ingested criminal network graph, document store, and alert database.
    Zero fake data or hallucinations.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    return await ai_copilot_service.process_query(
        question=payload.question,
        user=current_user,
        selected_entity_id=payload.selected_entity_id,
        session_id=payload.session_id
    )

