"""Pydantic schemas for request validation and response serialization."""
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.models import AttachmentType, ComplaintStatus, Priority, UserRole


# ---------------------------------------------------------------------------
# Common
# ---------------------------------------------------------------------------

class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{7,15}$")
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email", "phone")
    @classmethod
    def at_least_one_contact(cls, v, info):
        return v


class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_role: UserRole
    user_id: int
    full_name: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    id: int
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    role: UserRole
    is_active: bool
    department_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = None
    jurisdiction: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    description: Optional[str] = None
    jurisdiction: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    jurisdiction: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DepartmentWithStats(DepartmentOut):
    officer_count: int = 0
    open_count: int = 0
    overdue_count: int = 0
    resolution_rate: float = 0.0


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = None
    icon: Optional[str] = None
    department_id: Optional[int] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon: Optional[str]
    department_id: Optional[int]
    is_active: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Complaints
# ---------------------------------------------------------------------------

class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    category_id: Optional[int] = None
    location_address: Optional[str] = None
    location_landmark: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    ward: Optional[str] = None
    zone: Optional[str] = None
    priority: Priority = Priority.medium
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    reason: Optional[str] = None
    resolution_details: Optional[str] = None


class ComplaintAssignRequest(BaseModel):
    officer_id: Optional[int] = None
    department_id: Optional[int] = None
    notes: Optional[str] = None


class AttachmentOut(BaseModel):
    id: int
    original_filename: str
    mime_type: str
    size_bytes: int
    attachment_type: AttachmentType
    created_at: datetime
    url: Optional[str] = None
    data_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ComplaintOut(BaseModel):
    id: int
    reference_number: str
    title: str
    description: str
    location_address: Optional[str]
    location_landmark: Optional[str]
    location_lat: Optional[float]
    location_lng: Optional[float]
    ward: Optional[str]
    zone: Optional[str]
    priority: Priority
    status: ComplaintStatus
    rejection_reason: Optional[str]
    resolution_details: Optional[str]
    citizen_id: int
    category_id: Optional[int]
    category_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    attachments: List[AttachmentOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ComplaintDetail(ComplaintOut):
    citizen_name: Optional[str] = None
    status_history: List["StatusHistoryOut"] = []
    comments: List["CommentOut"] = []
    internal_notes: List["InternalNoteOut"] = []
    current_assignment: Optional["AssignmentOut"] = None


class StatusHistoryOut(BaseModel):
    id: int
    previous_status: Optional[str]
    new_status: str
    reason: Optional[str]
    created_at: datetime
    changed_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class CommentOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    author_name: Optional[str] = None
    author_role: Optional[str] = None

    model_config = {"from_attributes": True}


class InternalNoteOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    author_name: Optional[str] = None

    model_config = {"from_attributes": True}


class AssignmentOut(BaseModel):
    id: int
    officer_id: Optional[int]
    officer_name: Optional[str] = None
    department_id: Optional[int]
    department_name: Optional[str] = None
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=2)


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationOut(BaseModel):
    id: int
    complaint_id: Optional[int]
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dashboard / Reports
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total: int
    new_today: int
    pending_review: int
    in_progress: int
    resolved: int
    overdue: int


class CategoryDistribution(BaseModel):
    category: str
    count: int
    percentage: float


class StatusDistribution(BaseModel):
    status: str
    count: int


class DailyTrend(BaseModel):
    date: str
    received: int
    resolved: int


class ReportSummary(BaseModel):
    total_received: int
    total_resolved: int
    median_resolution_days: float
    reopened_rate: float
    category_distribution: List[CategoryDistribution]
    daily_trend: List[DailyTrend]


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

class AdminUserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = UserRole.officer
    department_id: Optional[int] = None


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    department_id: Optional[int] = None


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------

class AuditLogOut(BaseModel):
    id: int
    actor_id: Optional[int]
    actor_name: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
