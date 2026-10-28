import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.database.mongodb import mongo_client
from app.models.schemas import TokenData, UserCreate, UserRegister, UserResponse, UserRole
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger("auth_service")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


class AuthService:
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[dict]:
        return await mongo_client.users.find_one({"email": email.lower()})

    @staticmethod
    async def create_user(user_in: UserCreate) -> UserResponse:
        existing = await AuthService.get_user_by_email(user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )
        user_id = f"usr_{uuid.uuid4().hex[:8]}"
        user_doc = {
            "id": user_id,
            "email": user_in.email.lower().strip(),
            "full_name": user_in.full_name.strip(),
            "badge_number": user_in.badge_number.strip() if user_in.badge_number else None,
            "role": user_in.role.value,
            "hashed_password": get_password_hash(user_in.password),
            "is_active": user_in.is_active,
            "created_at": datetime.now(timezone.utc)
        }
        await mongo_client.users.insert_one(user_doc)
        return UserResponse(**user_doc)

    @staticmethod
    async def register_public_user(user_in: UserRegister) -> UserResponse:
        """Self-registration for public users. Strictly enforces least-privileged INVESTIGATOR role."""
        existing = await AuthService.get_user_by_email(user_in.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )
        user_id = f"usr_{uuid.uuid4().hex[:8]}"
        user_doc = {
            "id": user_id,
            "email": user_in.email.lower().strip(),
            "full_name": user_in.full_name.strip(),
            "badge_number": user_in.badge_number.strip() if user_in.badge_number else None,
            "role": UserRole.INVESTIGATOR.value,
            "hashed_password": get_password_hash(user_in.password),
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        await mongo_client.users.insert_one(user_doc)
        logger.info(f"New investigator account registered: {user_doc['email']}")
        return UserResponse(**user_doc)

    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[dict]:
        user = await AuthService.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.get("hashed_password", "")):
            return None
        return user

    @staticmethod
    async def seed_default_users():
        """Seeds standard Admin and Investigator accounts if not present."""
        admin_email = (getattr(settings, "INITIAL_ADMIN_EMAIL", None) or "admin@intelligence.gov").lower().strip()
        admin_pw = getattr(settings, "INITIAL_ADMIN_PASSWORD", None) or "Admin@123"
        admin_name = getattr(settings, "INITIAL_ADMIN_NAME", None) or "Chief Director Admin"

        admin = await AuthService.get_user_by_email(admin_email)
        if not admin:
            admin_doc = {
                "id": "usr_admin01",
                "email": admin_email,
                "full_name": admin_name,
                "badge_number": "DIR-001",
                "role": UserRole.ADMIN.value,
                "hashed_password": get_password_hash(admin_pw),
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            }
            await mongo_client.users.insert_one(admin_doc)
            logger.info(f"Default Admin account seeded: {admin_email}")

        inv = await AuthService.get_user_by_email("investigator@intelligence.gov")
        if not inv:
            inv_doc = {
                "id": "usr_inv01",
                "email": "investigator@intelligence.gov",
                "full_name": "Special Agent Miller",
                "badge_number": "INV-742",
                "role": UserRole.INVESTIGATOR.value,
                "hashed_password": get_password_hash("Investigator@123"),
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            }
            await mongo_client.users.insert_one(inv_doc)
            logger.info("Default Investigator account seeded: investigator@intelligence.gov / Investigator@123")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserResponse:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = TokenData(email=email, role=payload.get("role"))
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_dict = await AuthService.get_user_by_email(token_data.email)
    if user_dict is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User belonging to this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user_dict.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account.")

    return UserResponse(**user_dict)


async def require_admin(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Administrator role required."
        )
    return current_user


async def require_investigator(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    # Both investigator and admin can access investigator routes
    if current_user.role not in [UserRole.INVESTIGATOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Investigator role required."
        )
    return current_user

