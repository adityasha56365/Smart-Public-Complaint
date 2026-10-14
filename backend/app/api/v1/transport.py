"""Transport Department Challan Complaint Management & Dashboard endpoints."""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.deps import require_transport_officer, require_transport_supervisor
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
    ChallanAssignRequest,
    ChallanComplaintOut,
    ChallanDecisionRequest,
    ChallanEvidenceOut,
    ChallanRequestInfo,
    ChallanReviewCreate,
    ChallanReviewOut,
    ChallanStatusHistoryOut,
    PaginatedResponse,
    TransportDashboardSummary,
)

router = APIRouter(prefix="/transport", tags=["transport-department"])


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


@router.get("/dashboard/summary", response_model=TransportDashboardSummary)
def get_transport_dashboard_summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_transport_officer),
):
    """Real database counts for the Transport Department dashboard."""
    total = db.query(func.count(ChallanComplaint.id)).scalar() or 0
    newly = db.query(func.count(ChallanComplaint.id)).filter(ChallanComplaint.status == ChallanStatus.submitted).scalar() or 0
    under_rev = db.query(func.count(ChallanComplaint.id)).filter(ChallanComplaint.status == ChallanStatus.under_review).scalar() or 0
    awaiting_info = db.query(func.count(ChallanComplaint.id)).filter(ChallanComplaint.status == ChallanStatus.awaiting_citizen_info).scalar() or 0
    cancellations_app = db.query(func.count(ChallanComplaint.id)).filter(ChallanComplaint.status == ChallanStatus.cancellation_approved).scalar() or 0
    cancellations_exec = db.query(func.count(ChallanComplaint.id)).filter(ChallanComplaint.status == ChallanStatus.cancellation_executed).scalar() or 0
    upheld = db.query(func.count(ChallanComplaint.id)).filter(ChallanComplaint.status == ChallanStatus.upheld).scalar() or 0
    rejected = db.query(func.count(ChallanComplaint.id)).filter(ChallanComplaint.status == ChallanStatus.dispute_rejected).scalar() or 0

    decisions = db.query(func.count(ChallanComplaint.id)).filter(
        ChallanComplaint.status.in_([
            ChallanStatus.upheld,
            ChallanStatus.dispute_rejected,
            ChallanStatus.correction_approved,
            ChallanStatus.cancellation_approved,
            ChallanStatus.cancellation_executed,
        ])
    ).scalar() or 0

    return TransportDashboardSummary(
        total_disputes=total,
        newly_submitted=newly,
        pending_review=newly,
        under_review=under_rev,
        awaiting_citizen_info=awaiting_info,
        decisions_issued=decisions,
        cancellations_approved=cancellations_app,
        cancellations_executed=cancellations_exec,
        upheld_count=upheld,
        rejected_count=rejected,
    )


@router.get("/challan-complaints", response_model=PaginatedResponse)
def list_transport_challan_complaints(
    status_filter: Optional[str] = Query(None, alias="status"),
    dispute_reason: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    assigned_to_me: Optional[bool] = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_transport_officer),
):
    """List challan disputes for Transport Department review with filtering and search."""
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
    )

    if status_filter:
        query = query.filter(ChallanComplaint.status == status_filter)

    if dispute_reason:
        query = query.filter(ChallanComplaint.dispute_reason == dispute_reason)

    if assigned_to_me:
        query = query.filter(ChallanComplaint.assigned_officer_id == current_user.id)

    if search:
        s = f"%{search.strip().upper()}%"
        query = query.filter(
            (ChallanComplaint.reference_id.ilike(s))
            | (ChallanComplaint.challan_number.ilike(s))
            | (ChallanComplaint.vehicle_number.ilike(s))
            | (ChallanComplaint.issuing_authority.ilike(s))
        )

    # Sorting
    order_col = ChallanComplaint.created_at
    if sort_by == "issue_date":
        order_col = ChallanComplaint.issue_date
    elif sort_by == "status":
        order_col = ChallanComplaint.status

    if sort_order.lower() == "asc":
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[_serialize_challan(c) for c in items],
    )


@router.get("/challan-complaints/{complaint_id}", response_model=ChallanComplaintOut)
def get_transport_challan_detail(
    complaint_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_transport_officer),
):
    """Retrieve complete review workspace data for an authorized Transport officer."""
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

    return _serialize_challan(complaint)


@router.post("/challan-complaints/{complaint_id}/accept", response_model=ChallanComplaintOut)
def accept_for_review(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_transport_officer),
):
    """Officer accepts case for formal review."""
    complaint = db.query(ChallanComplaint).filter(ChallanComplaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Challan complaint not found")

    prev_status = complaint.status
    complaint.status = ChallanStatus.under_review
    if not complaint.assigned_officer_id:
        complaint.assigned_officer_id = current_user.id

    history = ChallanStatusHistory(
        complaint_id=complaint.id,
        from_status=prev_status.value if prev_status else None,
        to_status=ChallanStatus.under_review.value,
        changed_by_id=current_user.id,
        note=f"Accepted for review by {current_user.full_name}",
    )
    db.add(history)

    notif = Notification(
        user_id=complaint.citizen_id,
        challan_complaint_id=complaint.id,
        title="Dispute Under Review",
        message=f"Your dispute for challan {complaint.challan_number} is now being actively reviewed by the Transport Department.",
    )
    db.add(notif)

    db.commit()
    db.refresh(complaint)
    return _serialize_challan(complaint)


@router.post("/challan-complaints/{complaint_id}/assign", response_model=ChallanComplaintOut)
def assign_challan_officer(
    complaint_id: int,
    body: ChallanAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_transport_supervisor),
):
    """Supervisor assigns challan case to a specific transport officer."""
    complaint = db.query(ChallanComplaint).filter(ChallanComplaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Challan complaint not found")

    officer = db.query(User).filter(User.id == body.officer_id).first()
    if not officer or officer.role not in (UserRole.transport_officer, UserRole.transport_supervisor, UserRole.admin):
        raise HTTPException(status_code=400, detail="Target user must be an active Transport Department officer.")

    complaint.assigned_officer_id = officer.id
    history = ChallanStatusHistory(
        complaint_id=complaint.id,
        from_status=complaint.status.value,
        to_status=complaint.status.value,
        changed_by_id=current_user.id,
        note=f"Assigned to {officer.full_name}. {body.note or ''}",
    )
    db.add(history)

    db.commit()
    db.refresh(complaint)
    return _serialize_challan(complaint)


@router.post("/challan-complaints/{complaint_id}/review", response_model=ChallanComplaintOut)
def record_review_findings(
    complaint_id: int,
    body: ChallanReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_transport_officer),
):
    """Record internal review findings and assessment notes."""
    complaint = db.query(ChallanComplaint).filter(ChallanComplaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Challan complaint not found")

    review = ChallanReview(
        complaint_id=complaint.id,
        officer_id=current_user.id,
        findings=body.findings.strip(),
        action_taken=body.action_taken.strip(),
    )
    db.add(review)

    db.commit()
    db.refresh(complaint)
    return _serialize_challan(complaint)


@router.post("/challan-complaints/{complaint_id}/request-info", response_model=ChallanComplaintOut)
def request_additional_info(
    complaint_id: int,
    body: ChallanRequestInfo,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_transport_officer),
):
    """Request additional documents or clarification from citizen."""
    complaint = db.query(ChallanComplaint).filter(ChallanComplaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Challan complaint not found")

    prev_status = complaint.status
    complaint.status = ChallanStatus.awaiting_citizen_info
    complaint.additional_info_requested = body.message.strip()

    history = ChallanStatusHistory(
        complaint_id=complaint.id,
        from_status=prev_status.value if prev_status else None,
        to_status=ChallanStatus.awaiting_citizen_info.value,
        changed_by_id=current_user.id,
        note=f"Additional information requested from citizen: {body.message.strip()[:120]}...",
    )
    db.add(history)

    notif = Notification(
        user_id=complaint.citizen_id,
        challan_complaint_id=complaint.id,
        title="Action Required: Additional Information Requested",
        message=f"The Transport Department requires more information regarding challan {complaint.challan_number}: {body.message.strip()}",
    )
    db.add(notif)

    db.commit()
    db.refresh(complaint)
    return _serialize_challan(complaint)


@router.post("/challan-complaints/{complaint_id}/decision", response_model=ChallanComplaintOut)
def record_complaint_decision(
    complaint_id: int,
    body: ChallanDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_transport_officer),
):
    """
    Issue official departmental decision.
    Note: 'cancellation_approved' and 'cancellation_executed' strictly require transport_supervisor or admin.
    """
    complaint = db.query(ChallanComplaint).filter(ChallanComplaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Challan complaint not found")

    target_decision = body.decision_type.strip().lower()
    valid_decisions = {
        "upheld": ChallanStatus.upheld,
        "dispute_rejected": ChallanStatus.dispute_rejected,
        "correction_recommended": ChallanStatus.correction_recommended,
        "correction_approved": ChallanStatus.correction_approved,
        "cancellation_approved": ChallanStatus.cancellation_approved,
        "cancellation_executed": ChallanStatus.cancellation_executed,
    }
    if target_decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision type '{body.decision_type}'.")

    # Authorization check for cancellation
    if target_decision in ("cancellation_approved", "cancellation_executed"):
        if current_user.role not in (UserRole.transport_supervisor, UserRole.admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only a Transport Department Supervisor or Administrator can authorize or execute challan cancellation.",
            )

    new_status = valid_decisions[target_decision]
    prev_status = complaint.status

    complaint.status = new_status
    complaint.decision_type = target_decision
    complaint.decision_reason = body.reason.strip()
    complaint.decision_by_id = current_user.id
    complaint.decision_date = datetime.now(timezone.utc)

    # Status history
    hist = ChallanStatusHistory(
        complaint_id=complaint.id,
        from_status=prev_status.value if prev_status else None,
        to_status=new_status.value,
        changed_by_id=current_user.id,
        note=f"Decision issued: {target_decision.replace('_', ' ').title()}. Reason: {body.reason.strip()[:150]}",
    )
    db.add(hist)

    # Citizen notification
    decision_readable = target_decision.replace('_', ' ').title()
    notif = Notification(
        user_id=complaint.citizen_id,
        challan_complaint_id=complaint.id,
        title=f"Challan Dispute Decision: {decision_readable}",
        message=f"A decision has been reached for your challan dispute ({complaint.reference_id}): {decision_readable}. Remarks: {body.reason.strip()}",
    )
    db.add(notif)

    db.commit()
    db.refresh(complaint)
    return _serialize_challan(complaint)
