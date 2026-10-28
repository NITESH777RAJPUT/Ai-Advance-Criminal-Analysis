from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Response
from app.database.mongodb import mongo_client
from app.models.schemas import ReportGenerateRequest, UserResponse
from app.services.auth_service import get_current_user, require_investigator
from app.services.report_service import report_service

router = APIRouter(prefix="/reports", tags=["Report Generation"])


@router.post("/generate")
async def generate_report_pdf(
    req: ReportGenerateRequest,
    current_user: UserResponse = Depends(require_investigator)
):
    """Generate and download a formal law-enforcement intelligence PDF dossier."""
    pdf_bytes = await report_service.generate_suspect_pdf(
        req=req,
        generated_by=f"{current_user.full_name} ({current_user.badge_number or 'INV'})"
    )

    filename = f"intelligence_report_{req.suspect_id or 'syndicate'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("")
async def list_report_history(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve audit history of generated intelligence reports."""
    cursor = mongo_client.audit_logs.find({"action": "GENERATE_REPORT"}).sort("timestamp", -1).limit(30)
    return await cursor.to_list(length=30)

