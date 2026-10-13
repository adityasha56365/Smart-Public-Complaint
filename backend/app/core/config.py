"""Application configuration loaded from environment variables."""
import secrets
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_URL: str = "postgresql+psycopg2://civicly_user:changeme@localhost:5432/civicly_db"
    SECRET_KEY: str = "civicly-production-secret-key-change-in-env-at-least-32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_ORIGINS: str = "http://localhost:8443,http://localhost:5173"
    BACKEND_BASE_URL: str = "http://localhost:8000"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 20
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@civicly.app"
    MAPS_API_KEY: str = ""

    # AI Chatbot (JanSahayak AI)
    AI_PROVIDER: str = "google"   # "google" | "openai" | leave blank for rule-based fallback
    AI_API_KEY: str = ""          # API key for the selected provider (NEVER expose to frontend)
    GEMINI_API_KEY: str = ""      # Direct alias for Google Gemini API key
    AI_MODEL: str = "gemini-3.1-flash-lite"  # Model name (e.g. gemini-3.1-flash-lite / gemini-3.5-flash)

    @property
    def clean_database_url(self) -> str:
        """Normalize PostgreSQL URL for Neon and SQLAlchemy with psycopg2 and SSL."""
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

        # Neon and remote databases require SSL connection
        if "localhost" not in url and "127.0.0.1" not in url and "sslmode" not in url:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}sslmode=require"
        return url

    @property
    def allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]

    @property
    def upload_path(self) -> Path:
        import os
        # In Vercel / AWS Lambda serverless runtime, filesystem is read-only except /tmp
        if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
            p = Path("/tmp") / self.UPLOAD_DIR
        else:
            backend_dir = Path(__file__).resolve().parent.parent.parent
            p = backend_dir / self.UPLOAD_DIR
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
