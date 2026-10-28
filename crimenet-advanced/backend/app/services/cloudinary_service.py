import os
import uuid
from typing import Any, Dict, Optional
import cloudinary
import cloudinary.uploader
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger("cloudinary_service")


class CloudinaryService:
    def __init__(self):
        self.is_configured = bool(
            settings.CLOUDINARY_CLOUD_NAME and
            settings.CLOUDINARY_API_KEY and
            settings.CLOUDINARY_API_SECRET
        )
        if self.is_configured:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )
            logger.info("Cloudinary configured with cloud_name: %s", settings.CLOUDINARY_CLOUD_NAME)
        else:
            logger.warning("Cloudinary credentials not provided in .env. Local storage fallback active.")

    async def upload_image(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Uploads an image to Cloudinary or falls back to local storage."""
        if self.is_configured:
            try:
                result = cloudinary.uploader.upload(
                    file_bytes,
                    folder="criminal_network_evidence",
                    resource_type="image"
                )
                logger.info(f"Image uploaded to Cloudinary: {result.get('secure_url')}")
                return {
                    "url": result.get("secure_url"),
                    "public_id": result.get("public_id"),
                    "width": result.get("width"),
                    "height": result.get("height"),
                    "format": result.get("format"),
                    "storage": "cloudinary"
                }
            except Exception as e:
                logger.error(f"Cloudinary upload failed: {e}. Using local storage fallback.")

        # Local storage fallback
        local_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "uploads")
        os.makedirs(local_dir, exist_ok=True)
        unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
        file_path = os.path.join(local_dir, unique_name)
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        fallback_url = f"/api/uploads/media/{unique_name}"
        return {
            "url": fallback_url,
            "public_id": unique_name,
            "width": 800,
            "height": 600,
            "format": filename.split(".")[-1] if "." in filename else "jpg",
            "storage": "local"
        }


cloudinary_service = CloudinaryService()

