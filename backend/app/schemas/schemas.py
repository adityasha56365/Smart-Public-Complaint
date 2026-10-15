"""Pydantic schemas for request validation and response serialization."""
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.models import (
    AttachmentType,
    ChallanDisputeReason,
    ChallanStatus,
    ComplaintStatus,
    Priority,
    UserRole,
)


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
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    user_role: Optional[UserRole] = None
    user_id: Optional[int] = None

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


# ---------------------------------------------------------------------------
# Challan Complaint Module Schemas
# ---------------------------------------------------------------------------

class ChallanEvidenceIn(BaseModel):
    original_filename: str = Field(..., max_length=255)
    mime_type: str = Field(..., max_length=100)
    size_bytes: int
    attachment_type: str = "image"
    evidence_type: Optional[str] = "vehicle_front"
    file_data: Optional[str] = None


class ChallanEvidenceOut(BaseModel):
    id: int
    original_filename: str
    stored_filename: str
    mime_type: str
    size_bytes: int
    attachment_type: str
    evidence_type: Optional[str] = None
    file_data: Optional[str] = None
    is_citizen_response: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ChallanStatusHistoryOut(BaseModel):
    id: int
    from_status: Optional[str]
    to_status: str
    changed_by_name: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChallanReviewOut(BaseModel):
    id: int
    officer_name: Optional[str] = None
    findings: str
    action_taken: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChallanComplaintCreate(BaseModel):
    challan_number: str = Field(..., min_length=3, max_length=50)
    vehicle_number: str = Field(..., min_length=3, max_length=30)
    owner_name: Optional[str] = Field(None, max_length=120)
    vehicle_type: Optional[str] = Field(None, max_length=50)
    contact_name: Optional[str] = Field(None, max_length=120)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=20)
    issue_date: datetime
    issuing_authority: Optional[str] = None
    jurisdiction: Optional[str] = None
    dispute_reason: ChallanDisputeReason
    description: str = Field(..., min_length=10, max_length=3000)
    evidence: Optional[List[ChallanEvidenceIn]] = None


class ChallanComplaintOut(BaseModel):
    id: int
    reference_id: str
    citizen_id: int
    citizen_name: Optional[str] = None
    citizen_email: Optional[str] = None
    citizen_phone: Optional[str] = None
    challan_number: str
    vehicle_number: str
    owner_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    issue_date: datetime
    issuing_authority: Optional[str] = None
    jurisdiction: Optional[str] = None
    dispute_reason: ChallanDisputeReason
    description: str
    status: ChallanStatus
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    assigned_department_id: Optional[int] = None
    decision_type: Optional[str] = None
    decision_reason: Optional[str] = None
    decision_by_name: Optional[str] = None
    decision_date: Optional[datetime] = None
    additional_info_requested: Optional[str] = None
    citizen_response_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    evidence: List[ChallanEvidenceOut] = []
    status_history: List[ChallanStatusHistoryOut] = []
    reviews: List[ChallanReviewOut] = []

    model_config = {"from_attributes": True}


class ChallanCitizenResponse(BaseModel):
    response_text: str = Field(..., min_length=5, max_length=3000)
    evidence: Optional[List[ChallanEvidenceIn]] = None


class ChallanAssignRequest(BaseModel):
    officer_id: int
    note: Optional[str] = None


class ChallanReviewCreate(BaseModel):
    findings: str = Field(..., min_length=5, max_length=3000)
    action_taken: str = "reviewed"


class ChallanRequestInfo(BaseModel):
    message: str = Field(..., min_length=5, max_length=2000)


class ChallanDecisionRequest(BaseModel):
    decision_type: str = Field(..., description="upheld | dispute_rejected | correction_recommended | correction_approved | cancellation_approved | cancellation_executed")
    reason: str = Field(..., min_length=5, max_length=3000)


class TransportDashboardSummary(BaseModel):
    total_disputes: int
    newly_submitted: int
    pending_review: int
    under_review: int
    awaiting_citizen_info: int
    decisions_issued: int
    cancellations_approved: int
    cancellations_executed: int
    upheld_count: int
    rejected_count: int
    today_submitted: int = 0
    reason_breakdown: Optional[dict[str, int]] = None
    estimated_relief_amount: int = 0

