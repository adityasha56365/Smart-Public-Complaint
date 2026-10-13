"""Database engine and session factory."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

import os

is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
engine_kwargs = {
    "pool_pre_ping": True,
}

if is_serverless:
    # Serverless: Lean connection pool per serverless instance to prevent exhausting Neon pooler
    engine_kwargs["pool_size"] = 2
    engine_kwargs["max_overflow"] = 3
    engine_kwargs["pool_recycle"] = 300
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 1800

engine = create_engine(
    settings.clean_database_url,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
