"""Complaints CRUD API endpoints."""
import base64
import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, defer, joinedload, selectinload

from app.core.deps import get_current_user, require_officer
from app.core.utils import generate_reference_number
from app.db.session import get_db
from app.models.models import (
    AttachmentType,
    Complaint,
    ComplaintAssignment,
    ComplaintAttachment,
    ComplaintCategory,
    ComplaintComment,
    ComplaintFeedback,
    ComplaintInternalNote,
    ComplaintStatus,
    ComplaintStatusHistory,
    Notification,
    User,
    UserRole,
    AuditLog,
)
from app.schemas.schemas import (
    AssignmentOut,
    AttachmentOut,
    CommentCreate,
    CommentOut,
    ComplaintAssignRequest,
    ComplaintCreate,
    ComplaintDetail,
    ComplaintOut,
    ComplaintStatusUpdate,
    FeedbackCreate,
    InternalNoteOut,
    StatusHistoryOut,
)
from app.core.config import settings

router = APIRouter(prefix="/complaints", tags=["complaints"])

# Valid status transitions (from_status -> allowed_to_statuses)
VALID_TRANSITIONS = {
    ComplaintStatus.submitted: {ComplaintStatus.under_review, ComplaintStatus.rejected},
    ComplaintStatus.under_review: {ComplaintStatus.assigned, ComplaintStatus.awaiting_info, ComplaintStatus.rejected},
    ComplaintStatus.assigned: {ComplaintStatus.in_progress, ComplaintStatus.under_review},
    ComplaintStatus.in_progress: {ComplaintStatus.awaiting_info, ComplaintStatus.resolved, ComplaintStatus.under_review},
    ComplaintStatus.awaiting_info: {ComplaintStatus.in_progress, ComplaintStatus.under_review, ComplaintStatus.closed},
    ComplaintStatus.resolved: {ComplaintStatus.reopened, ComplaintStatus.closed},
    ComplaintStatus.reopened: {ComplaintStatus.under_review, ComplaintStatus.assigned},
    ComplaintStatus.rejected: {ComplaintStatus.under_review},
    ComplaintStatus.closed: set(),
}

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/quicktime", "video/webm",
}


def _attachment_to_out(att: ComplaintAttachment, complaint_id: int, request: Optional[Request] = None, include_data: bool = True) -> AttachmentOut:
    data_url = None
    if include_data and att.file_data and att.attachment_type == AttachmentType.image and len(att.file_data) < 4_000_000:
        data_url = f"data:{att.mime_type};base64,{att.file_data}"

    if request:
        base = str(request.base_url).rstrip("/")
        url = f"{base}/api/v1/complaints/{complaint_id}/attachments/{att.id}/file"
    elif settings.BACKEND_BASE_URL:
        url = f"{settings.BACKEND_BASE_URL.rstrip('/')}/api/v1/complaints/{complaint_id}/attachments/{att.id}/file"
    else:
        url = f"/api/v1/complaints/{complaint_id}/attachments/{att.id}/file"

    return AttachmentOut(
        id=att.id,
        original_filename=att.original_filename,
        mime_type=att.mime_type,
        size_bytes=att.size_bytes,
        attachment_type=att.attachment_type,
        created_at=att.created_at,
        url=url,
        data_url=data_url,
    )


def _complaint_to_out(c: Complaint, request: Optional[Request] = None, include_attachment_data: bool = False) -> ComplaintOut:
    atts = [_attachment_to_out(a, c.id, request, include_data=include_attachment_data) for a in (c.attachments or [])]
    return ComplaintOut(
        id=c.id,
        reference_number=c.reference_number,
        title=c.title,
        description=c.description,
        location_address=c.location_address,
        location_landmark=c.location_landmark,
        location_lat=c.location_lat,
        location_lng=c.location_lng,
        ward=c.ward,
        zone=c.zone,
        priority=c.priority,
        status=c.status,
        rejection_reason=c.rejection_reason,
        resolution_details=c.resolution_details,
        citizen_id=c.citizen_id,
        category_id=c.category_id,
        category_name=c.category.name if c.category else None,
        contact_name=c.contact_name,
        contact_email=c.contact_email,
        contact_phone=c.contact_phone,
        attachments=atts,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


def _notify(db: Session, user_id: int, complaint_id: int, title: str, message: str):
    n = Notification(user_id=user_id, complaint_id=complaint_id, title=title, message=message)
    db.add(n)


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(
    body: ComplaintCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Generate a unique reference number (retry on collision)
    for _ in range(5):
        ref = generate_reference_number()
        if not db.query(Complaint).filter(Complaint.reference_number == ref).first():
            break

    complaint = Complaint(
        reference_number=ref,
        title=body.title,
        description=body.description,
        category_id=body.category_id,
        location_address=body.location_address,
        location_landmark=body.location_landmark,
        location_lat=body.location_lat,
        location_lng=body.location_lng,
        ward=body.ward,
        zone=body.zone,
        priority=body.priority,
        citizen_id=current_user.id,
        contact_name=body.contact_name or current_user.full_name,
        contact_email=str(body.contact_email) if body.contact_email else current_user.email,
        contact_phone=body.contact_phone or current_user.phone,
        status=ComplaintStatus.submitted,
    )
    db.add(complaint)
    db.flush()

    history = ComplaintStatusHistory(
        complaint_id=complaint.id,
        previous_status=None,
        new_status=ComplaintStatus.submitted,
        changed_by_id=current_user.id,
        reason="Complaint submitted by citizen",
    )
    db.add(history)
    _notify(db, current_user.id, complaint.id, "Complaint submitted",
            f"Your complaint '{complaint.title}' has been submitted. Reference: {ref}")
    db.commit()
    db.refresh(complaint)
    return _complaint_to_out(complaint, request, include_attachment_data=True)


@router.get("", response_model=dict)
def list_complaints(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Complaint).options(
        joinedload(Complaint.category),
        selectinload(Complaint.attachments).defer(ComplaintAttachment.file_data),
    )
    # Citizens only see their own complaints
    if current_user.role == UserRole.citizen:
        q = q.filter(Complaint.citizen_id == current_user.id)
    if status:
        q = q.filter(Complaint.status == status)
    if category_id:
        q = q.filter(Complaint.category_id == category_id)
    if search:
        q = q.filter(
            Complaint.title.ilike(f"%{search}%") | Complaint.reference_number.ilike(f"%{search}%")
        )
    total = q.count()
    items = q.order_by(Complaint.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [_complaint_to_out(c, request, include_attachment_data=False) for c in items]}


@router.get("/{complaint_id}", response_model=ComplaintDetail)
def get_complaint(
    complaint_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = (
        db.query(Complaint)
        .options(
            joinedload(Complaint.category),
            selectinload(Complaint.attachments),
            selectinload(Complaint.assignments),
            selectinload(Complaint.status_history),
            selectinload(Complaint.comments),
        )
        .filter(Complaint.id == complaint_id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role == UserRole.citizen and c.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    active_assign = next((a for a in c.assignments if a.is_active), None)
    assign_out = None
    if active_assign:
        assign_out = AssignmentOut(
            id=active_assign.id,
            officer_id=active_assign.officer_id,
            officer_name=active_assign.officer.full_name if active_assign.officer else None,
            department_id=active_assign.department_id,
            department_name=active_assign.department.name if active_assign.department else None,
            notes=active_assign.notes,
            created_at=active_assign.created_at,
        )

    attachments = [_attachment_to_out(a, complaint_id, request) for a in c.attachments]

    history = [
        StatusHistoryOut(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            reason=h.reason,
            created_at=h.created_at,
            changed_by_name=db.query(User).filter(User.id == h.changed_by_id).first().full_name if h.changed_by_id else None,
        )
        for h in sorted(c.status_history, key=lambda x: x.created_at)
    ]

    comments = [
        CommentOut(
            id=cm.id,
            content=cm.content,
            created_at=cm.created_at,
            author_name=db.query(User).filter(User.id == cm.author_id).first().full_name,
            author_role=db.query(User).filter(User.id == cm.author_id).first().role,
        )
        for cm in sorted(c.comments, key=lambda x: x.created_at)
    ]

    notes_out: List[InternalNoteOut] = []
    if current_user.role != UserRole.citizen:
        notes_out = [
            InternalNoteOut(
                id=n.id,
                content=n.content,
                created_at=n.created_at,
                author_name=db.query(User).filter(User.id == n.author_id).first().full_name,
            )
            for n in sorted(c.internal_notes, key=lambda x: x.created_at)
        ]

    return ComplaintDetail(
        id=c.id,
        reference_number=c.reference_number,
        title=c.title,
        description=c.description,
        location_address=c.location_address,
        location_landmark=c.location_landmark,
        location_lat=c.location_lat,
        location_lng=c.location_lng,
        ward=c.ward,
        zone=c.zone,
        priority=c.priority,
        status=c.status,
        rejection_reason=c.rejection_reason,
        resolution_details=c.resolution_details,
        citizen_id=c.citizen_id,
        citizen_name=c.citizen.full_name if c.citizen else None,
        category_id=c.category_id,
        category_name=c.category.name if c.category else None,
        contact_name=c.contact_name,
        contact_email=c.contact_email,
        contact_phone=c.contact_phone,
        created_at=c.created_at,
        updated_at=c.updated_at,
        attachments=attachments,
        status_history=history,
        comments=comments,
        internal_notes=notes_out,
        current_assignment=assign_out,
    )


@router.patch("/{complaint_id}/status", response_model=ComplaintOut)
def update_status(
    complaint_id: int,
    body: ComplaintStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    allowed = VALID_TRANSITIONS.get(c.status, set())
    if body.status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition from '{c.status}' to '{body.status}'"
        )
    if body.status == ComplaintStatus.rejected and not body.reason:
        raise HTTPException(status_code=422, detail="A reason is required when rejecting a complaint.")

    prev = c.status
    c.status = body.status
    if body.status == ComplaintStatus.rejected and body.reason:
        c.rejection_reason = body.reason
    if body.resolution_details:
        c.resolution_details = body.resolution_details

    db.add(ComplaintStatusHistory(
        complaint_id=c.id,
        previous_status=prev,
        new_status=body.status,
        changed_by_id=current_user.id,
        reason=body.reason,
    ))
    _notify(db, c.citizen_id, c.id, "Complaint status updated",
            f"Your complaint '{c.title}' is now '{body.status.replace('_', ' ')}'.")
    db.commit()
    db.refresh(c)
    return _complaint_to_out(c, request, include_attachment_data=True)


@router.post("/{complaint_id}/assign", response_model=ComplaintOut)
def assign_complaint(
    complaint_id: int,
    body: ComplaintAssignRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if body.department_id:
        dept = db.query(Department).filter(Department.id == body.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
    if body.officer_id:
        off = db.query(User).filter(User.id == body.officer_id).first()
        if not off:
            raise HTTPException(status_code=404, detail="Officer not found")
    # Deactivate previous active assignment
    for a in c.assignments:
        if a.is_active:
            a.is_active = False
    new_assign = ComplaintAssignment(
        complaint_id=c.id,
        officer_id=body.officer_id,
        department_id=body.department_id,
        assigned_by_id=current_user.id,
        notes=body.notes,
        is_active=True,
    )
    db.add(new_assign)
    if c.status == ComplaintStatus.submitted:
        c.status = ComplaintStatus.under_review
    db.add(ComplaintStatusHistory(
        complaint_id=c.id,
        previous_status=c.status,
        new_status=ComplaintStatus.assigned if body.officer_id else c.status,
        changed_by_id=current_user.id,
        reason="Officer assigned",
    ))
    if body.officer_id:
        c.status = ComplaintStatus.assigned
    _notify(db, c.citizen_id, c.id, "Complaint assigned", f"Your complaint '{c.title}' has been assigned.")
    db.commit()
    db.refresh(c)
    return _complaint_to_out(c, request, include_attachment_data=True)


@router.post("/{complaint_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    complaint_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role == UserRole.citizen and c.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=422, detail=f"File type '{file.content_type}' not allowed.")

    contents = await file.read()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit.")

    ext = os.path.splitext(file.filename or "")[1].lower() or ".bin"
    stored_name = f"{uuid.uuid4().hex}{ext}"

    # 1. Best-effort write to local disk
    try:
        upload_path = settings.upload_path / stored_name
        with open(upload_path, "wb") as f_out:
            f_out.write(contents)
    except Exception:
        pass

    # 2. Persist in database as base64 so images NEVER get lost on Vercel or container restarts
    b64_data = base64.b64encode(contents).decode("ascii")
    att_type = AttachmentType.video if file.content_type.startswith("video/") else AttachmentType.image

    att = ComplaintAttachment(
        complaint_id=c.id,
        original_filename=file.filename or stored_name,
        stored_filename=stored_name,
        mime_type=file.content_type,
        size_bytes=len(contents),
        attachment_type=att_type,
        uploaded_by_id=current_user.id,
        file_data=b64_data,
    )
    db.add(att)
    db.commit()
    db.refresh(att)

    out = _attachment_to_out(att, complaint_id, request)
    return {
        "id": att.id,
        "stored_filename": stored_name,
        "size_bytes": len(contents),
        "url": out.url,
        "data_url": out.data_url,
    }


@router.get("/{complaint_id}/attachments/{attachment_id}/file")
def download_attachment(
    complaint_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
):
    att = db.query(ComplaintAttachment).filter(
        ComplaintAttachment.id == attachment_id,
        ComplaintAttachment.complaint_id == complaint_id,
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_path = settings.upload_path / att.stored_filename
    if file_path.exists():
        return FileResponse(path=str(file_path), media_type=att.mime_type, filename=att.original_filename)

    # Serverless fallback: Serve directly from database-persisted base64
    if att.file_data:
        try:
            raw_bytes = base64.b64decode(att.file_data)
            # Re-seed local /tmp cache if possible
            try:
                file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(file_path, "wb") as f_out:
                    f_out.write(raw_bytes)
            except Exception:
                pass

            return Response(
                content=raw_bytes,
                media_type=att.mime_type,
                headers={
                    "Content-Disposition": f'inline; filename="{att.original_filename}"',
                    "Cache-Control": "public, max-age=86400",
                },
            )
        except Exception:
            pass

    fallback = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / att.stored_filename
    if fallback.exists():
        return FileResponse(path=str(fallback), media_type=att.mime_type, filename=att.original_filename)

    raise HTTPException(status_code=404, detail="File not found on server")


@router.post("/{complaint_id}/comments", response_model=CommentOut)
def add_comment(
    complaint_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    cm = ComplaintComment(complaint_id=c.id, author_id=current_user.id, content=body.content)
    db.add(cm)
    _notify(db, c.citizen_id, c.id, "New update on your complaint",
            f"An update was posted on your complaint '{c.title}'.")
    db.commit()
    return CommentOut(
        id=cm.id, content=cm.content, created_at=cm.created_at,
        author_name=current_user.full_name, author_role=current_user.role,
    )


@router.post("/{complaint_id}/internal-notes", response_model=InternalNoteOut)
def add_internal_note(
    complaint_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    note = ComplaintInternalNote(complaint_id=c.id, author_id=current_user.id, content=body.content)
    db.add(note)
    db.commit()
    return InternalNoteOut(id=note.id, content=note.content, created_at=note.created_at, author_name=current_user.full_name)


@router.post("/{complaint_id}/feedback")
def submit_feedback(
    complaint_id: int,
    body: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if c.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if c.status not in (ComplaintStatus.resolved, ComplaintStatus.closed):
        raise HTTPException(status_code=422, detail="Feedback can only be submitted for resolved complaints.")
    if c.feedback:
        raise HTTPException(status_code=409, detail="Feedback already submitted.")
    fb = ComplaintFeedback(complaint_id=c.id, citizen_id=current_user.id, rating=body.rating, comment=body.comment)
    db.add(fb)
    db.commit()
    return {"message": "Feedback submitted. Thank you!"}
