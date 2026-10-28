"""
CRIMENET - Initial Admin Provisioning CLI Script
Usage:
    python -m app.scripts.create_admin
    python -m app.scripts.create_admin --email custom_admin@intelligence.gov --password SecurePassword@123 --name "Custom Admin"
"""
import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone

from app.database.mongodb import mongo_client
from app.models.schemas import UserRole
from app.services.auth_service import AuthService, get_password_hash
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger("create_admin")


async def setup_admin(email: str, password: str, name: str, badge: str = "DIR-001"):
    email = email.lower().strip()
    existing = await AuthService.get_user_by_email(email)
    if existing:
        logger.warning(f"Admin user with email '{email}' already exists. No changes made.")
        print(f"[CRIMENET] User '{email}' already exists.")
        return

    admin_doc = {
        "id": "usr_admin01",
        "email": email,
        "full_name": name,
        "badge_number": badge,
        "role": UserRole.ADMIN.value,
        "hashed_password": get_password_hash(password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }

    await mongo_client.users.insert_one(admin_doc)
    logger.info(f"Admin account created successfully: {email}")
    print(f"[CRIMENET] Admin account successfully initialized: {email}")


def main():
    parser = argparse.ArgumentParser(description="Initialize CRIMENET Admin Account")
    parser.add_argument("--email", default=os.getenv("INITIAL_ADMIN_EMAIL", getattr(settings, "INITIAL_ADMIN_EMAIL", "admin@intelligence.gov")))
    parser.add_argument("--password", default=os.getenv("INITIAL_ADMIN_PASSWORD", getattr(settings, "INITIAL_ADMIN_PASSWORD", "Admin@123")))
    parser.add_argument("--name", default=os.getenv("INITIAL_ADMIN_NAME", getattr(settings, "INITIAL_ADMIN_NAME", "Chief Director Admin")))
    parser.add_argument("--badge", default="DIR-001")

    args = parser.parse_args()

    asyncio.run(setup_admin(args.email, args.password, args.name, args.badge))


if __name__ == "__main__":
    main()
