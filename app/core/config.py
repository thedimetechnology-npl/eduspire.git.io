import secrets
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "EduSphere Pro"
    ENV: str = "development"

    # Database
    DATABASE_URL: str

    # Authentication
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # Uploads
    UPLOAD_DIR: str = "uploads"
    PRIVATE_UPLOAD_DIR: str = "private_uploads"
    MAX_UPLOAD_MB: int = 25
    MAX_VIDEO_UPLOAD_MB: int = 500

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # Email / SMTP
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # Cashfree Payments
    CASHFREE_ENV: str = "SANDBOX"
    CASHFREE_CLIENT_ID: str
    CASHFREE_CLIENT_SECRET: str

    # AI / Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None

    # Seed
    SEED_PASSWORD: str = "Dime@edu2026"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def model_post_init(self, __context) -> None:
        if self.ENV != "development":
            if len(self.SECRET_KEY) < 64:
                raise ValueError(
                    "SECRET_KEY must be at least 64 characters in production. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            if self.SECRET_KEY in (
                "super-secret-key-for-development",
                "changeme",
                "secret",
            ):
                raise ValueError("SECRET_KEY is a known weak value. Generate a random key.")

    @property
    def cors_origins_list(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()