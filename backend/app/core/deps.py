"""FastAPI dependency for extracting and validating the current user."""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.models import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def _get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def get_current_user(user: User = Depends(_get_current_user)) -> User:
    return user


def require_citizen(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.citizen, UserRole.officer, UserRole.supervisor, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user


def require_officer(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.officer, UserRole.supervisor, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Officers and above only")
    return user


def require_supervisor(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.supervisor, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Supervisors and above only")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_transport_officer(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.transport_officer, UserRole.transport_supervisor, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Transport Department personnel access only")
    return user


def require_transport_supervisor(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.transport_supervisor, UserRole.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Transport Department supervisor access required")
    return user
