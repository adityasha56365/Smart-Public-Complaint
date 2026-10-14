"""Citizen Challan Complaint endpoints."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, require_citizen
from app.db.session import get_db
from app.models.models import (
    ChallanComplaint,
    ChallanDisputeReason,
    ChallanEvidence,
    ChallanReview,
    ChallanStatus,
    ChallanStatusHistory,
    Notification,
    User,
    UserRole,
)
from app.schemas.schemas import (
    ChallanCitizenResponse,
    ChallanComplaintCreate,
    ChallanComplaintOut,
    ChallanEvidenceOut,
    ChallanReviewOut,
    ChallanStatusHistoryOut,
    PaginatedResponse,
)

router = APIRouter(prefix="/challan-complaints", tags=["challan-complaints"])


def _serialize_challan(c: ChallanComplaint) -> ChallanComplaintOut:
    return ChallanComplaintOut(
        id=c.id,
        reference_id=c.reference_id,
        citizen_id=c.citizen_id,
        citizen_name=c.citizen.full_name if c.citizen else None,
        citizen_email=c.citizen.email if c.citizen else None,
        citizen_phone=c.citizen.phone if c.citizen else None,
        challan_number=c.challan_number,
        vehicle_number=c.vehicle_number,
        owner_name=c.owner_name,
        vehicle_type=c.vehicle_type,
        contact_name=c.contact_name or (c.citizen.full_name if c.citizen else None),
        contact_email=c.contact_email or (c.citizen.email if c.citizen else None),
        contact_phone=c.contact_phone or (c.citizen.phone if c.citizen else None),
        issue_date=c.issue_date,
        issuing_authority=c.issuing_authority,
        jurisdiction=c.jurisdiction,
        dispute_reason=c.dispute_reason,
        description=c.description,
        status=c.status,
        assigned_officer_id=c.assigned_officer_id,
        assigned_officer_name=c.assigned_officer.full_name if c.assigned_officer else None,
        assigned_department_id=c.assigned_department_id,
        decision_type=c.decision_type,
        decision_reason=c.decision_reason,
        decision_by_name=c.decision_by.full_name if c.decision_by else None,
        decision_date=c.decision_date,
        additional_info_requested=c.additional_info_requested,
        citizen_response_text=c.citizen_response_text,
        created_at=c.created_at,
        updated_at=c.updated_at,
        evidence=[
            ChallanEvidenceOut(
                id=e.id,
                original_filename=e.original_filename,
                stored_filename=e.stored_filename,
                mime_type=e.mime_type,
                size_bytes=e.size_bytes,
                attachment_type=e.attachment_type,
                evidence_type=e.evidence_type,
                file_data=e.file_data,
                is_citizen_response=e.is_citizen_response,
                created_at=e.created_at,
            )
            for e in (c.evidence or [])
        ],
        status_history=[
            ChallanStatusHistoryOut(
                id=h.id,
                from_status=h.from_status,
                to_status=h.to_status,
                changed_by_name=h.changed_by.full_name if h.changed_by else None,
                note=h.note,
                created_at=h.created_at,
            )
            for h in (c.status_history or [])
        ],
        reviews=[
            ChallanReviewOut(
                id=r.id,
                officer_name=r.officer.full_name if r.officer else None,
                findings=r.findings,
                action_taken=r.action_taken,
                created_at=r.created_at,
            )
            for r in (c.reviews or [])
        ],
    )


@router.post("", response_model=ChallanComplaintOut, status_code=status.HTTP_201_CREATED)
def create_challan_complaint(
    body: ChallanComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_citizen),
):
    """Citizen creates a new challan dispute with supporting evidence."""
    clean_challan = body.challan_number.strip().upper()
    clean_vehicle = body.vehicle_number.strip().upper().replace(" ", "")

    # Duplicate check: check if a pending dispute exists for same challan and vehicle
    existing = (
        db.query(ChallanComplaint)
        .filter(
            func.upper(ChallanComplaint.challan_number) == clean_challan,
            func.upper(ChallanComplaint.vehicle_number) == clean_vehicle,
            ChallanComplaint.status.in_([
                ChallanStatus.submitted,
                ChallanStatus.under_review,
                ChallanStatus.awaiting_citizen_info,
            ]),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active dispute for challan {clean_challan} is already under review with Reference ID {existing.reference_id}.",
        )

    # Validate compulsory vehicle image evidence (front or back image of vehicle is compulsory)
    has_vehicle_image = False
    if body.evidence:
        for ev in body.evidence:
            if ev.evidence_type in ("vehicle_front", "vehicle_back") or ev.attachment_type == "image":
                has_vehicle_image = True
                break
    if not has_vehicle_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle photo (Front or Back image of vehicle) is compulsory for Challan dispute verification.",
        )

    # Generate unique reference ID
    year = datetime.now(timezone.utc).year
    ref_id = f"CHL-{year}-{uuid.uuid4().hex[:6].upper()}"

    complaint = ChallanComplaint(
        reference_id=ref_id,
        citizen_id=current_user.id,
        challan_number=clean_challan,
        vehicle_number=clean_vehicle,
        owner_name=body.owner_name.strip() if body.owner_name else None,
        vehicle_type=body.vehicle_type.strip() if body.vehicle_type else None,
        contact_name=body.contact_name.strip() if body.contact_name else current_user.full_name,
        contact_email=body.contact_email.strip() if body.contact_email else current_user.email,
        contact_phone=body.contact_phone.strip() if body.contact_phone else current_user.phone,
        issue_date=body.issue_date,
        issuing_authority=body.issuing_authority.strip() if body.issuing_authority else None,
        jurisdiction=body.jurisdiction.strip() if body.jurisdiction else None,
        dispute_reason=body.dispute_reason,
        description=body.description.strip(),
        status=ChallanStatus.submitted,
    )
    db.add(complaint)
    db.flush()

    # Evidence attachments
    if body.evidence:
        for ev in body.evidence:
            if ev.size_bytes > 15 * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"File {ev.original_filename} exceeds 15MB limit.")
            stored_name = f"ev_{complaint.id}_{uuid.uuid4().hex[:8]}_{ev.original_filename}"
            evidence_row = ChallanEvidence(
                complaint_id=complaint.id,
                uploaded_by_id=current_user.id,
                original_filename=ev.original_filename,
                stored_filename=stored_name,
                mime_type=ev.mime_type,
                size_bytes=ev.size_bytes,
                attachment_type=ev.attachment_type or "image",
                evidence_type=ev.evidence_type or "vehicle_front",
                file_data=ev.file_data,
                is_citizen_response=False,
            )
            db.add(evidence_row)

    # Initial status history
    history = ChallanStatusHistory(
        complaint_id=complaint.id,
        from_status=None,
        to_status=ChallanStatus.submitted.value,
        changed_by_id=current_user.id,
        note="Challan dispute registered by citizen",
    )
    db.add(history)

    # In-app notification for the citizen
    notif = Notification(
        user_id=current_user.id,
        challan_complaint_id=complaint.id,
        title="Challan Dispute Registered",
        message=f"Your dispute for challan {clean_challan} has been registered with reference ID {ref_id}.",
    )
    db.add(notif)

    db.commit()
    db.refresh(complaint)
    return _serialize_challan(complaint)


@router.get("/my", response_model=PaginatedResponse)
def list_my_challan_complaints(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_citizen),
):
    """List authenticated citizen's challan disputes."""
    query = (
        db.query(ChallanComplaint)
        .options(
            joinedload(ChallanComplaint.citizen),
            joinedload(ChallanComplaint.assigned_officer),
            joinedload(ChallanComplaint.decision_by),
            joinedload(ChallanComplaint.evidence),
            joinedload(ChallanComplaint.status_history),
            joinedload(ChallanComplaint.reviews),
        )
        .filter(ChallanComplaint.citizen_id == current_user.id)
    )

    if status_filter:
        query = query.filter(ChallanComplaint.status == status_filter)

    if search:
        s = f"%{search.strip().upper()}%"
        query = query.filter(
            (ChallanComplaint.reference_id.ilike(s))
            | (ChallanComplaint.challan_number.ilike(s))
            | (ChallanComplaint.vehicle_number.ilike(s))
        )

    total = query.count()
    items = (
        query.order_by(ChallanComplaint.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[_serialize_challan(c) for c in items],
    )


@router.get("/{complaint_id}", response_model=ChallanComplaintOut)
def get_challan_complaint_detail(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full challan complaint detail with strict ownership or staff check."""
    complaint = (
        db.query(ChallanComplaint)
        .options(
            joinedload(ChallanComplaint.citizen),
            joinedload(ChallanComplaint.assigned_officer),
            joinedload(ChallanComplaint.decision_by),
            joinedload(ChallanComplaint.evidence),
            joinedload(ChallanComplaint.status_history),
            joinedload(ChallanComplaint.reviews),
        )
        .filter(ChallanComplaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Challan complaint not found")

    # Access control: citizen can only view their own
    if current_user.role == UserRole.citizen and complaint.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this challan complaint.")

    return _serialize_challan(complaint)


@router.post("/{complaint_id}/respond", response_model=ChallanComplaintOut)
def respond_to_additional_info(
    complaint_id: int,
    body: ChallanCitizenResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_citizen),
):
    """Citizen provides requested additional explanation and optional evidence."""
    complaint = (
        db.query(ChallanComplaint)
        .filter(ChallanComplaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Challan complaint not found")

    if complaint.citizen_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this challan complaint.")

    clean_response = body.response_text.strip()
    complaint.citizen_response_text = clean_response
    prev_status = complaint.status
    complaint.status = ChallanStatus.under_review

    # Add optional response evidence
    if body.evidence:
        for ev in body.evidence:
            stored_name = f"ev_resp_{complaint.id}_{uuid.uuid4().hex[:8]}_{ev.original_filename}"
            evidence_row = ChallanEvidence(
                complaint_id=complaint.id,
                uploaded_by_id=current_user.id,
                original_filename=ev.original_filename,
                stored_filename=stored_name,
                mime_type=ev.mime_type,
                size_bytes=ev.size_bytes,
                attachment_type=ev.attachment_type or "image",
                file_data=ev.file_data,
                is_citizen_response=True,
            )
            db.add(evidence_row)

    # Status history
    hist = ChallanStatusHistory(
        complaint_id=complaint.id,
        from_status=prev_status.value if prev_status else None,
        to_status=ChallanStatus.under_review.value,
        changed_by_id=current_user.id,
        note=f"Citizen responded to information request: {clean_response[:120]}...",
    )
    db.add(hist)

    # Notification
    notif = Notification(
        user_id=current_user.id,
        challan_complaint_id=complaint.id,
        title="Information Submitted",
        message=f"Your response for challan {complaint.challan_number} has been submitted for Transport Department review.",
    )
    db.add(notif)

    db.commit()
    db.refresh(complaint)
    return _serialize_challan(complaint)
