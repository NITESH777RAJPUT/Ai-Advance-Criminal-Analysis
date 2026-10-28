import csv
import io
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pypdf import PdfReader
from app.database.mongodb import mongo_client
from app.models.schemas import RawTextInput, UploadHistoryItem, UserResponse
from app.services.alert_service import alert_service
from app.services.auth_service import get_current_user, require_investigator
from app.services.cloudinary_service import cloudinary_service
from app.services.graph_service import graph_service
from app.services.network_analysis import network_analysis
from app.services.nlp_service import nlp_service
from app.utils.logger import get_logger

logger = get_logger("upload_api")

router = APIRouter(prefix="/upload", tags=["Uploads & Evidence Ingestion"])


@router.post("/text")
async def upload_raw_text(
    payload: RawTextInput,
    current_user: UserResponse = Depends(require_investigator)
):
    """Process raw FIR or investigator statement text directly."""
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    extraction = nlp_service.process_text(payload.text)
    case_id = f"case_{uuid.uuid4().hex[:6]}"

    ingest_res = await graph_service.ingest_extraction(
        extraction=extraction,
        case_id=case_id,
        source_name=payload.title,
        uploaded_by=current_user.full_name
    )

    # Re-compute network risk scores and detect alerts
    network_analysis.compute_risk_scores()
    await alert_service.run_detection()

    # Record upload history
    history_item = {
        "id": case_id,
        "title": payload.title,
        "file_type": "text",
        "file_name": "Direct Text Input",
        "cloudinary_url": None,
        "entities_count": len(extraction.entities),
        "relationships_count": len(extraction.relationships),
        "uploaded_by": current_user.full_name,
        "uploaded_at": datetime.now(timezone.utc),
        "summary": extraction.summary
    }
    await mongo_client.uploads.insert_one(history_item)

    return {
        "case_id": case_id,
        "title": payload.title,
        "extraction": extraction,
        "ingestion": ingest_res
    }


@router.post("/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: UserResponse = Depends(require_investigator)
):
    """Extract text from uploaded PDF FIR/investigation reports."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        full_text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                full_text += t + "\n"
    except Exception as e:
        logger.error(f"Error parsing PDF: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF document: {str(e)}")

    if not full_text.strip():
        full_text = f"Report file {file.filename} contained non-extractable text."

    case_title = title or f"FIR Document: {file.filename}"
    case_id = f"pdf_{uuid.uuid4().hex[:6]}"

    extraction = nlp_service.process_text(full_text)
    ingest_res = await graph_service.ingest_extraction(
        extraction=extraction,
        case_id=case_id,
        source_name=case_title,
        uploaded_by=current_user.full_name
    )

    network_analysis.compute_risk_scores()
    await alert_service.run_detection()

    history_item = {
        "id": case_id,
        "title": case_title,
        "file_type": "pdf",
        "file_name": file.filename,
        "cloudinary_url": None,
        "entities_count": len(extraction.entities),
        "relationships_count": len(extraction.relationships),
        "uploaded_by": current_user.full_name,
        "uploaded_at": datetime.now(timezone.utc),
        "summary": extraction.summary
    }
    await mongo_client.uploads.insert_one(history_item)

    return {
        "case_id": case_id,
        "file_name": file.filename,
        "extraction": extraction,
        "ingestion": ingest_res
    }


@router.post("/csv")
async def upload_csv(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: UserResponse = Depends(require_investigator)
):
    """Process structured CSV call records or transaction logs."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    combined_text = []
    for row in reader:
        # Convert row fields into natural language sentences for spaCy NLP
        parts = [f"{k}: {v}" for k, v in row.items() if v]
        combined_text.append(". ".join(parts))

    full_text = ".\n".join(combined_text)
    case_title = title or f"CSV Data: {file.filename}"
    case_id = f"csv_{uuid.uuid4().hex[:6]}"

    extraction = nlp_service.process_text(full_text)
    ingest_res = await graph_service.ingest_extraction(
        extraction=extraction,
        case_id=case_id,
        source_name=case_title,
        uploaded_by=current_user.full_name
    )

    network_analysis.compute_risk_scores()
    await alert_service.run_detection()

    history_item = {
        "id": case_id,
        "title": case_title,
        "file_type": "csv",
        "file_name": file.filename,
        "cloudinary_url": None,
        "entities_count": len(extraction.entities),
        "relationships_count": len(extraction.relationships),
        "uploaded_by": current_user.full_name,
        "uploaded_at": datetime.now(timezone.utc),
        "summary": extraction.summary
    }
    await mongo_client.uploads.insert_one(history_item)

    return {
        "case_id": case_id,
        "file_name": file.filename,
        "extraction": extraction,
        "ingestion": ingest_res
    }


@router.post("/json")
async def upload_json(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: UserResponse = Depends(require_investigator)
):
    """Process JSON crime dossiers, incident records, or intelligence feeds."""
    if not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON files are accepted.")

    content = await file.read()
    try:
        data = json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")

    # Extract all text values recursively
    text_chunks = []
    def extract_strings(obj):
        if isinstance(obj, str):
            text_chunks.append(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                extract_strings(v)
        elif isinstance(obj, list):
            for item in obj:
                extract_strings(item)

    extract_strings(data)
    full_text = ".\n".join(text_chunks)
    case_title = title or f"JSON Feed: {file.filename}"
    case_id = f"json_{uuid.uuid4().hex[:6]}"

    extraction = nlp_service.process_text(full_text)
    ingest_res = await graph_service.ingest_extraction(
        extraction=extraction,
        case_id=case_id,
        source_name=case_title,
        uploaded_by=current_user.full_name
    )

    network_analysis.compute_risk_scores()
    await alert_service.run_detection()

    history_item = {
        "id": case_id,
        "title": case_title,
        "file_type": "json",
        "file_name": file.filename,
        "cloudinary_url": None,
        "entities_count": len(extraction.entities),
        "relationships_count": len(extraction.relationships),
        "uploaded_by": current_user.full_name,
        "uploaded_at": datetime.now(timezone.utc),
        "summary": extraction.summary
    }
    await mongo_client.uploads.insert_one(history_item)

    return {
        "case_id": case_id,
        "file_name": file.filename,
        "extraction": extraction,
        "ingestion": ingest_res
    }


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    suspect_name: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: UserResponse = Depends(require_investigator)
):
    """Upload evidence photo or suspect mugshot to Cloudinary and link in MongoDB."""
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp", ".bmp"]
    if not any(file.filename.lower().endswith(ext) for ext in allowed_exts):
        raise HTTPException(status_code=400, detail="Allowed image extensions: JPG, PNG, WEBP, BMP.")

    file_bytes = await file.read()
    upload_res = await cloudinary_service.upload_image(file_bytes, file.filename)
    cloudinary_url = upload_res.get("url")

    case_id = f"img_{uuid.uuid4().hex[:6]}"
    case_title = f"Photo Evidence: {suspect_name or file.filename}"

    # If suspect_name is provided, also link to suspect node in graph
    if suspect_name:
        text_desc = f"{suspect_name} was identified in photographic evidence. {notes or ''}"
        extraction = nlp_service.process_text(text_desc)
        await graph_service.ingest_extraction(
            extraction=extraction,
            case_id=case_id,
            source_name=case_title,
            uploaded_by=current_user.full_name
        )

    history_item = {
        "id": case_id,
        "title": case_title,
        "file_type": "image",
        "file_name": file.filename,
        "cloudinary_url": cloudinary_url,
        "entities_count": 1 if suspect_name else 0,
        "relationships_count": 0,
        "uploaded_by": current_user.full_name,
        "uploaded_at": datetime.now(timezone.utc),
        "summary": f"Image stored at {cloudinary_url}. Notes: {notes or 'None'}"
    }
    await mongo_client.uploads.insert_one(history_item)

    return {
        "case_id": case_id,
        "cloudinary_url": cloudinary_url,
        "storage": upload_res.get("storage"),
        "file_name": file.filename,
        "suspect_name": suspect_name
    }


@router.get("/history", response_model=List[UploadHistoryItem])
async def get_upload_history(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve history of uploaded cases, files, and Cloudinary media."""
    cursor = mongo_client.uploads.find().sort("uploaded_at", -1).limit(50)
    docs = await cursor.to_list(length=50)
    return [UploadHistoryItem(**d) for d in docs]

