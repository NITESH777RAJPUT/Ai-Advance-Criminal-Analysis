from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "AI-Powered Criminal Network Analysis System"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_value(cls, v):
        if isinstance(v, str):
            return v.lower() not in ("release", "false", "0", "no", "prod", "production")
        return bool(v)


    # Databases
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "criminal_intelligence"

    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Security
    JWT_SECRET_KEY: str = "crimenetwork_super_secret_jwt_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Initial Admin Provisioning (Auto-seeded if users collection is empty)
    INITIAL_ADMIN_EMAIL: str = "admin@intelligence.gov"
    INITIAL_ADMIN_PASSWORD: str = "Admin@123"
    INITIAL_ADMIN_NAME: str = "Chief Director Admin"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [orig.strip() for orig in self.CORS_ORIGINS.split(",") if orig.strip()]
        return origins or ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

