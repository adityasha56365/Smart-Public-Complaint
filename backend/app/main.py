"""FastAPI application entry point."""
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

app = FastAPI(
    title="Civicly — Smart Public Complaint API",
    description="Backend API for the Civicly citizen complaint management platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
PREFIX = "/api/v1"

app.include_router(auth_router, prefix=PREFIX)
app.include_router(chat_router, prefix=PREFIX)
app.include_router(complaints_router, prefix=PREFIX)
app.include_router(offices_router, prefix=PREFIX)
app.include_router(dept_router, prefix=PREFIX)
app.include_router(cat_router, prefix=PREFIX)
app.include_router(users_router, prefix=PREFIX)
app.include_router(notif_router, prefix=PREFIX)
app.include_router(admin_router, prefix=PREFIX)
app.include_router(audit_router, prefix=PREFIX)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "env": settings.APP_ENV}


# ---------------------------------------------------------------------------
# Global error handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )
