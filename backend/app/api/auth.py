from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import TokenResponse, UserCreate, UserLogin, UserResponse
from app.services.auth_service import (
    AuthService,
    create_access_token,
    get_current_user,
    require_admin,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await AuthService.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": user["email"], "role": user["role"]})
    user_resp = UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        badge_number=user.get("badge_number"),
        role=user["role"],
        is_active=user["is_active"],
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_resp)


@router.post("/logout")
async def logout(current_user: UserResponse = Depends(get_current_user)):
    return {"message": "Successfully logged out.", "user": current_user.email}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: UserResponse = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UserResponse)
async def register_user(
    user_in: UserCreate,
    current_admin: UserResponse = Depends(require_admin)
):
    """Admin-only endpoint to create new investigator or admin accounts."""
    return await AuthService.create_user(user_in)

