from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import TokenResponse, UserCreate, UserLogin, UserRegister, UserResponse
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


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister):
    """
    Public self-registration for investigators.
    Enforces least-privileged INVESTIGATOR role to prevent privilege escalation.
    Returns session JWT token and user profile for immediate terminal access.
    """
    # Enforce password strength minimums
    if len(user_in.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if not any(c.isdigit() for c in user_in.password) or not any(c.isalpha() for c in user_in.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain both letters and at least one number."
        )

    created_user = await AuthService.register_public_user(user_in)
    token = create_access_token(data={"sub": created_user.email, "role": created_user.role.value})
    return TokenResponse(access_token=token, user=created_user)


