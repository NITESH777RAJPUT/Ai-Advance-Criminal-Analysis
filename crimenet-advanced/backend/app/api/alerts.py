from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.schemas import AlertRecord, AlertStatusUpdate, UserResponse
from app.services.alert_service import alert_service
from app.services.auth_service import get_current_user, require_investigator

router = APIRouter(prefix="/alerts", tags=["Suspicious Activity Alerts"])


@router.get("", response_model=List[AlertRecord])
async def list_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: CRITICAL, HIGH, MEDIUM, LOW"),
    status: Optional[str] = Query(None, description="Filter by status: NEW, INVESTIGATING, RESOLVED, DISMISSED"),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user)
):
    """Retrieve prioritized suspicious activity alerts."""
    return await alert_service.get_alerts(severity=severity, status=status, limit=limit)


@router.post("/run-detection", response_model=List[AlertRecord])
async def trigger_detection_rules(current_user: UserResponse = Depends(require_investigator)):
    """Manually trigger the rule-based suspicious activity detection engine across the network."""
    return await alert_service.run_detection()


@router.patch("/{alert_id}", response_model=AlertRecord)
async def update_alert_status(
    alert_id: str,
    update_in: AlertStatusUpdate,
    current_user: UserResponse = Depends(require_investigator)
):
    """Update alert triage status (NEW, INVESTIGATING, RESOLVED, DISMISSED)."""
    res = await alert_service.update_alert(
        alert_id=alert_id,
        new_status=update_in.status,
        notes=update_in.investigator_notes
    )
    if not res:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")
    return res

