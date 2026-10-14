from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.complaints import router as complaints_router
from app.api.v1.offices import router as offices_router
from app.api.v1.admin import (
    admin_router,
    audit_router,
    cat_router,
    dept_router,
    notif_router,
    users_router,
)
from app.core.config import settings


_schema_initialized = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database schema tables and columns exist on startup (cached across warm lambda instances)."""
    global _schema_initialized
    if not _schema_initialized:
        try:
            from app.db.session import Base, engine
            import app.models.models  # noqa: F401
            import sqlalchemy as sa
            Base.metadata.create_all(bind=engine)
            with engine.connect() as conn:
                for col, col_type in [
                    ("contact_name", "VARCHAR(120)"),
                    ("contact_email", "VARCHAR(255)"),
                    ("contact_phone", "VARCHAR(20)"),
                ]:
                    try:
                        conn.execute(sa.text(f"ALTER TABLE complaints ADD COLUMN IF NOT EXISTS {col} {col_type};"))
                        conn.commit()
                    except Exception:
                        pass
                try:
                    conn.execute(sa.text("ALTER TABLE complaint_attachments ADD COLUMN IF NOT EXISTS file_data TEXT;"))
                    conn.commit()
                except Exception:
                    pass
            _schema_initialized = True
        except Exception as exc:
            print(f"Warning: Database auto-table creation failed: {exc}")
    yield


app = FastAPI(
    title="Civicly — Smart Public Complaint API",
    description="Backend API for the Civicly citizen complaint management platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    redirect_slashes=False,
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers (register both /api/v1 and /v1 so Vercel rewrite variants always resolve)
# ---------------------------------------------------------------------------
for pfx in ["/api/v1", "/v1"]:
    app.include_router(auth_router, prefix=pfx)
    app.include_router(chat_router, prefix=pfx)
    app.include_router(complaints_router, prefix=pfx)
    app.include_router(offices_router, prefix=pfx)
    app.include_router(dept_router, prefix=pfx)
    app.include_router(cat_router, prefix=pfx)
    app.include_router(users_router, prefix=pfx)
    app.include_router(notif_router, prefix=pfx)
    app.include_router(admin_router, prefix=pfx)
    app.include_router(audit_router, prefix=pfx)



# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Health check & Root
# ---------------------------------------------------------------------------
@app.get("/", tags=["health"])
@app.get("/api", tags=["health"])
@app.get("/api/", tags=["health"])
@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "message": "Civicly API is running successfully on Vercel!",
        "docs_url": "/docs",
        "env": settings.APP_ENV,
    }



# ---------------------------------------------------------------------------
# Global error handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )
