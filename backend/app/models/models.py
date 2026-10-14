"""SQLAlchemy ORM models for the Civicly application."""
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, DateTime, Enum, ForeignKey,
    Index, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

PK_ID = BigInteger().with_variant(Integer, "sqlite")


def utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    citizen = "citizen"
    officer = "officer"
    supervisor = "supervisor"
    admin = "admin"
    transport_officer = "transport_officer"
    transport_supervisor = "transport_supervisor"


class ComplaintStatus(str, enum.Enum):
    submitted = "submitted"
    under_review = "under_review"
    assigned = "assigned"
    in_progress = "in_progress"
    awaiting_info = "awaiting_info"
    resolved = "resolved"
    reopened = "reopened"
    rejected = "rejected"
    closed = "closed"


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class AttachmentType(str, enum.Enum):
    image = "image"
    video = "video"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.citizen, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    department: Mapped["Department | None"] = relationship("Department", back_populates="officers")
    complaints: Mapped[list["Complaint"]] = relationship("Complaint", back_populates="citizen", foreign_keys="Complaint.citizen_id")
    assigned_complaints: Mapped[list["ComplaintAssignment"]] = relationship("ComplaintAssignment", back_populates="officer", foreign_keys="ComplaintAssignment.officer_id")
    challan_complaints: Mapped[list["ChallanComplaint"]] = relationship("ChallanComplaint", back_populates="citizen", foreign_keys="ChallanComplaint.citizen_id")
    assigned_challans: Mapped[list["ChallanComplaint"]] = relationship("ChallanComplaint", back_populates="assigned_officer", foreign_keys="ChallanComplaint.assigned_officer_id")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="actor", foreign_keys="AuditLog.actor_id")

    __table_args__ = (
        Index("ix_users_role", "role"),
    )


# ---------------------------------------------------------------------------
# Departments & Categories
# ---------------------------------------------------------------------------

class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    officers: Mapped[list["User"]] = relationship("User", back_populates="department")
    categories: Mapped[list["ComplaintCategory"]] = relationship("ComplaintCategory", back_populates="department")
    assignments: Mapped[list["ComplaintAssignment"]] = relationship("ComplaintAssignment", back_populates="department")
    challan_complaints: Mapped[list["ChallanComplaint"]] = relationship("ChallanComplaint", back_populates="department")


class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    department: Mapped["Department | None"] = relationship("Department", back_populates="categories")
    complaints: Mapped[list["Complaint"]] = relationship("Complaint", back_populates="category")


# ---------------------------------------------------------------------------
# Complaints
# ---------------------------------------------------------------------------

class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    reference_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_landmark: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location_lat: Mapped[float | None] = mapped_column(nullable=True)
    location_lng: Mapped[float | None] = mapped_column(nullable=True)
    ward: Mapped[str | None] = mapped_column(String(100), nullable=True)
    zone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), default=Priority.medium, nullable=False)
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus), default=ComplaintStatus.submitted, nullable=False, index=True
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    citizen_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("complaint_categories.id"), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    citizen: Mapped["User"] = relationship("User", back_populates="complaints", foreign_keys=[citizen_id])
    category: Mapped["ComplaintCategory | None"] = relationship("ComplaintCategory", back_populates="complaints")
    attachments: Mapped[list["ComplaintAttachment"]] = relationship("ComplaintAttachment", back_populates="complaint", cascade="all, delete-orphan")
    assignments: Mapped[list["ComplaintAssignment"]] = relationship("ComplaintAssignment", back_populates="complaint", cascade="all, delete-orphan")
    status_history: Mapped[list["ComplaintStatusHistory"]] = relationship("ComplaintStatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    comments: Mapped[list["ComplaintComment"]] = relationship("ComplaintComment", back_populates="complaint", cascade="all, delete-orphan")
    internal_notes: Mapped[list["ComplaintInternalNote"]] = relationship("ComplaintInternalNote", back_populates="complaint", cascade="all, delete-orphan")
    feedback: Mapped["ComplaintFeedback | None"] = relationship("ComplaintFeedback", back_populates="complaint", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_complaints_citizen_status", "citizen_id", "status"),
    )


class ComplaintAttachment(Base):
    __tablename__ = "complaint_attachments"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    attachment_type: Mapped[AttachmentType] = mapped_column(Enum(AttachmentType), nullable=False)
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    file_data: Mapped[str | None] = mapped_column(Text, nullable=True)  # Base64 encoded payload for serverless persistence
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="attachments")


class ComplaintAssignment(Base):
    __tablename__ = "complaint_assignments"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    assigned_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="assignments")
    officer: Mapped["User | None"] = relationship("User", back_populates="assigned_complaints", foreign_keys=[officer_id])
    department: Mapped["Department | None"] = relationship("Department", back_populates="assignments")


class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="status_history")


class ComplaintComment(Base):
    """Citizen-visible comments from officers/admins."""
    __tablename__ = "complaint_comments"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="comments")


class ComplaintInternalNote(Base):
    """Internal notes visible only to officers and admins."""
    __tablename__ = "complaint_internal_notes"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="internal_notes")


class ComplaintFeedback(Base):
    __tablename__ = "complaint_feedback"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, unique=True)
    citizen_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["Complaint"] = relationship("Complaint", back_populates="feedback")


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    complaint_id: Mapped[int | None] = mapped_column(ForeignKey("complaints.id"), nullable=True)
    challan_complaint_id: Mapped[int | None] = mapped_column(ForeignKey("challan_complaints.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "is_read"),
    )


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    actor: Mapped["User | None"] = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_actor", "actor_id"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
        Index("ix_audit_logs_created_at", "created_at"),
    )


# ---------------------------------------------------------------------------
# Challan Complaint Module (Strict Separation from General Public Complaints)
# ---------------------------------------------------------------------------

class ChallanStatus(str, enum.Enum):
    submitted = "submitted"
    under_review = "under_review"
    awaiting_citizen_info = "awaiting_citizen_info"
    upheld = "upheld"
    correction_recommended = "correction_recommended"
    correction_approved = "correction_approved"
    cancellation_approved = "cancellation_approved"
    cancellation_executed = "cancellation_executed"
    dispute_rejected = "dispute_rejected"


class ChallanDisputeReason(str, enum.Enum):
    wrong_vehicle = "wrong_vehicle"
    incorrect_reg_no = "incorrect_reg_no"
    details_mismatch = "details_mismatch"
    already_paid = "already_paid"
    duplicate_challan = "duplicate_challan"
    incorrect_location_time = "incorrect_location_time"
    evidence_indicates_mistake = "evidence_indicates_mistake"
    other = "other"


class ChallanComplaint(Base):
    __tablename__ = "challan_complaints"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    reference_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    citizen_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    challan_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    vehicle_number: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    issuing_authority: Mapped[str | None] = mapped_column(String(120), nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dispute_reason: Mapped[ChallanDisputeReason] = mapped_column(Enum(ChallanDisputeReason), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ChallanStatus] = mapped_column(
        Enum(ChallanStatus), default=ChallanStatus.submitted, nullable=False, index=True
    )
    assigned_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    assigned_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    decision_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    decision_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    additional_info_requested: Mapped[str | None] = mapped_column(Text, nullable=True)
    citizen_response_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    citizen: Mapped["User"] = relationship("User", back_populates="challan_complaints", foreign_keys=[citizen_id])
    assigned_officer: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_officer_id])
    decision_by: Mapped["User | None"] = relationship("User", foreign_keys=[decision_by_id])
    department: Mapped["Department | None"] = relationship("Department", back_populates="challan_complaints")
    evidence: Mapped[list["ChallanEvidence"]] = relationship("ChallanEvidence", back_populates="complaint", cascade="all, delete-orphan")
    status_history: Mapped[list["ChallanStatusHistory"]] = relationship("ChallanStatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    reviews: Mapped[list["ChallanReview"]] = relationship("ChallanReview", back_populates="complaint", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_challan_citizen_status", "citizen_id", "status"),
        Index("ix_challan_status_date", "status", "created_at"),
    )


class ChallanEvidence(Base):
    __tablename__ = "challan_evidence"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("challan_complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    attachment_type: Mapped[str] = mapped_column(String(20), default="image", nullable=False)
    file_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_citizen_response: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["ChallanComplaint"] = relationship("ChallanComplaint", back_populates="evidence")
    uploaded_by: Mapped["User"] = relationship("User")


class ChallanStatusHistory(Base):
    __tablename__ = "challan_status_history"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("challan_complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["ChallanComplaint"] = relationship("ChallanComplaint", back_populates="status_history")
    changed_by: Mapped["User"] = relationship("User")


class ChallanReview(Base):
    __tablename__ = "challan_reviews"

    id: Mapped[int] = mapped_column(PK_ID, primary_key=True, autoincrement=True, index=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("challan_complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    officer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    findings: Mapped[str] = mapped_column(Text, nullable=False)
    action_taken: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["ChallanComplaint"] = relationship("ChallanComplaint", back_populates="reviews")
    officer: Mapped["User"] = relationship("User")
