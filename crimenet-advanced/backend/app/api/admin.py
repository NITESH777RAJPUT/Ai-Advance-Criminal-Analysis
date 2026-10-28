from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.database.mongodb import mongo_client
from app.models.schemas import UserCreate, UserResponse
from app.services.auth_service import AuthService, require_admin

router = APIRouter(prefix="/admin", tags=["Admin Governance"])


@router.get("/users", response_model=List[UserResponse])
async def list_users(current_admin: UserResponse = Depends(require_admin)):
    """Admin-only: list all system users and investigators."""
    cursor = mongo_client.users.find().sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return [UserResponse(**d) for d in docs]


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    current_admin: UserResponse = Depends(require_admin)
):
    """Admin-only: register a new investigator or administrator."""
    return await AuthService.create_user(user_in)


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: str,
    current_admin: UserResponse = Depends(require_admin)
):
    """Admin-only: deactivate a user account."""
    res = await mongo_client.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": f"User {user_id} deactivated successfully."}


@router.get("/audit-logs")
async def get_audit_logs(current_admin: UserResponse = Depends(require_admin)):
    """Admin-only: view operational intelligence audit logs."""
    cursor = mongo_client.audit_logs.find().sort("timestamp", -1).limit(50)
    return await cursor.to_list(length=50)


@router.post("/seed-demo")
async def seed_demo_intelligence(current_admin: UserResponse = Depends(require_admin)):
    """Admin-only: load the pre-configured ShadowNet criminal syndicate intelligence dataset."""
    from seed_data import seed_complete_syndicate
    count = await seed_complete_syndicate()
    return {"message": "Demo syndicate successfully seeded into intelligence network.", "records_loaded": count}

