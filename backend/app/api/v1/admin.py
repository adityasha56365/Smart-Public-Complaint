"""Admin, departments, categories, users, notifications, reports, and audit log endpoints."""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin, require_officer, require_supervisor
from app.core.security import hash_password
from app.db.session import get_db
from app.models.models import (
    AuditLog,
    Complaint,
    ComplaintAssignment,
    ComplaintCategory,
    ComplaintStatus,
    Department,
    Notification,
    User,
    UserRole,
)
from app.schemas.schemas import (
    AdminUserCreate,
    AdminUserUpdate,
    AuditLogOut,
    CategoryCreate,
    CategoryOut,
    DashboardStats,
    DepartmentCreate,
    DepartmentOut,
    DepartmentWithStats,
    NotificationOut,
    ReportSummary,
    UserOut,
)

# ----- Departments -----
dept_router = APIRouter(prefix="/departments", tags=["departments"])


@dept_router.get("", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Department).filter(Department.is_active == True).all()


@dept_router.post("", response_model=DepartmentOut, status_code=201)
def create_department(body: DepartmentCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(Department).filter(Department.name == body.name).first():
        raise HTTPException(status_code=409, detail="Department name already exists.")
    d = Department(**body.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@dept_router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, body: DepartmentCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    d = db.query(Department).filter(Department.id == dept_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Department not found")
    d.name = body.name
    if body.description is not None:
        d.description = body.description
    if body.jurisdiction is not None:
        d.jurisdiction = body.jurisdiction
    db.commit()
    db.refresh(d)
    return d


@dept_router.get("/with-stats", response_model=List[DepartmentWithStats])
def departments_with_stats(db: Session = Depends(get_db), _: User = Depends(require_officer)):
    depts = db.query(Department).filter(Department.is_active == True).all()
    if not depts:
        return []

    # 1. Single query for active officers per department
    officer_counts = dict(
        db.query(User.department_id, func.count(User.id))
        .filter(User.department_id.isnot(None), User.is_active == True)
        .group_by(User.department_id)
        .all()
    )

    # 2. Single query for complaint assignments with status
    assign_rows = (
        db.query(
            ComplaintAssignment.department_id,
            Complaint.status,
            ComplaintAssignment.is_active,
        )
        .join(Complaint, Complaint.id == ComplaintAssignment.complaint_id)
        .filter(ComplaintAssignment.department_id.isnot(None))
        .all()
    )

    # Fast in-memory aggregation
    dept_stats_map = {}
    for d_id, status, is_active in assign_rows:
        if d_id not in dept_stats_map:
            dept_stats_map[d_id] = {"open": 0, "total": 0, "resolved": 0}
        dept_stats_map[d_id]["total"] += 1
        if status in (ComplaintStatus.resolved, ComplaintStatus.closed):
            dept_stats_map[d_id]["resolved"] += 1
        elif is_active and status not in (ComplaintStatus.rejected,):
            dept_stats_map[d_id]["open"] += 1

    result = []
    for d in depts:
        st = dept_stats_map.get(d.id, {"open": 0, "total": 0, "resolved": 0})
        total = st["total"]
        resolved = st["resolved"]
        rate = round(resolved / total * 100, 1) if total > 0 else 0.0
        result.append(DepartmentWithStats(
            id=d.id,
            name=d.name,
            description=d.description,
            jurisdiction=d.jurisdiction,
            is_active=d.is_active,
            created_at=d.created_at,
            officer_count=officer_counts.get(d.id, 0),
            open_count=st["open"],
            overdue_count=0,
            resolution_rate=rate,
        ))
    return result


# ----- Categories -----
cat_router = APIRouter(prefix="/categories", tags=["categories"])


@cat_router.get("", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(ComplaintCategory).filter(ComplaintCategory.is_active == True).all()


@cat_router.post("", response_model=CategoryOut, status_code=201)
def create_category(body: CategoryCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    c = ComplaintCategory(**body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


# ----- Users / Officers -----
users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@users_router.get("", response_model=dict)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_supervisor),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if search:
        q = q.filter(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": [UserOut.model_validate(u) for u in items]}


@users_router.post("", response_model=UserOut, status_code=201)
def create_user(body: AdminUserCreate, db: Session = Depends(get_db), _: User = Depends(require_supervisor)):
    email = body.email.strip().lower() if body.email and body.email.strip() else None
    if email and db.query(User).filter(User.email.ilike(email)).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists.")
    phone = body.phone.strip() if body.phone and body.phone.strip() else None
    if phone and db.query(User).filter(User.phone == phone).first():
        raise HTTPException(status_code=409, detail="A user with this phone number already exists.")
    u = User(
        full_name=body.full_name.strip(),
        email=email,
        phone=phone,
        hashed_password=hash_password(body.password),
        role=body.role,
        department_id=body.department_id,
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@users_router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: AdminUserUpdate, db: Session = Depends(get_db), current: User = Depends(require_admin)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if body.full_name:
        u.full_name = body.full_name
    if body.role:
        u.role = body.role
    if body.is_active is not None:
        u.is_active = body.is_active
    if body.department_id is not None:
        u.department_id = body.department_id
    db.commit()
    db.refresh(u)
    return u


@users_router.get("/officers", response_model=List[UserOut])
def list_officers(db: Session = Depends(get_db), _: User = Depends(require_officer)):
    return db.query(User).filter(User.role.in_([UserRole.officer, UserRole.supervisor]), User.is_active == True).all()


# ----- Notifications -----
notif_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notif_router.get("", response_model=List[NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50).all()


@notif_router.post("/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}


@notif_router.patch("/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read."}


# ----- Admin Dashboard -----
admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), _: User = Depends(require_officer)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    stats_row = db.query(
        func.count(Complaint.id).label("total"),
        func.count(case((Complaint.created_at >= today_start, Complaint.id))).label("new_today"),
        func.count(case((Complaint.status.in_([ComplaintStatus.submitted, ComplaintStatus.under_review]), Complaint.id))).label("pending"),
        func.count(case((Complaint.status == ComplaintStatus.in_progress, Complaint.id))).label("in_progress"),
        func.count(case((Complaint.status.in_([ComplaintStatus.resolved, ComplaintStatus.closed]), Complaint.id))).label("resolved"),
    ).first()

    total = stats_row.total if stats_row else 0
    new_today = stats_row.new_today if stats_row else 0
    pending = stats_row.pending if stats_row else 0
    in_prog = stats_row.in_progress if stats_row else 0
    resolved = stats_row.resolved if stats_row else 0

    return DashboardStats(total=total, new_today=new_today, pending_review=pending, in_progress=in_prog, resolved=resolved, overdue=0)


@admin_router.get("/reports", response_model=ReportSummary)
def reports(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_officer),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    report_counts = db.query(
        func.count(case((Complaint.created_at >= since, Complaint.id))).label("total_received"),
        func.count(case((
            (Complaint.status.in_([ComplaintStatus.resolved, ComplaintStatus.closed])) & (Complaint.updated_at >= since),
            Complaint.id
        ))).label("total_resolved"),
        func.count(case((Complaint.status == ComplaintStatus.reopened, Complaint.id))).label("reopened"),
    ).first()

    total_received = report_counts.total_received if report_counts else 0
    total_resolved = report_counts.total_resolved if report_counts else 0
    reopened = report_counts.reopened if report_counts else 0
    reopened_rate = round(reopened / max(total_received, 1) * 100, 2)

    # Category distribution (single grouped query)
    cat_counts = db.query(
        ComplaintCategory.name, func.count(Complaint.id)
    ).outerjoin(Complaint, Complaint.category_id == ComplaintCategory.id).group_by(ComplaintCategory.name).all()
    total_cats = sum(c for _, c in cat_counts) or 1
    category_dist = [
        {"category": name, "count": cnt, "percentage": round(cnt / total_cats * 100, 1)}
        for name, cnt in sorted(cat_counts, key=lambda x: -x[1])
    ]

    # Daily trend in 1 single query instead of 28 sequential queries
    fourteen_days_ago = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=14)
    recent_rows = db.query(
        Complaint.created_at,
        Complaint.updated_at,
        Complaint.status,
    ).filter(
        (Complaint.created_at >= fourteen_days_ago) | (Complaint.updated_at >= fourteen_days_ago)
    ).all()

    daily = []
    now_utc = datetime.now(timezone.utc)
    for i in range(14):
        day = now_utc - timedelta(days=13 - i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        recv = sum(1 for r in recent_rows if r.created_at and day_start <= r.created_at < day_end)
        res = sum(
            1 for r in recent_rows
            if r.status in (ComplaintStatus.resolved, ComplaintStatus.closed)
            and r.updated_at and day_start <= r.updated_at < day_end
        )
        daily.append({"date": day_start.strftime("%d %b"), "received": recv, "resolved": res})

    return ReportSummary(
        total_received=total_received,
        total_resolved=total_resolved,
        median_resolution_days=0.0,
        reopened_rate=reopened_rate,
        category_distribution=category_dist,
        daily_trend=daily,
    )


# ----- Audit Logs -----
audit_router = APIRouter(prefix="/audit-logs", tags=["audit"])


@audit_router.get("", response_model=dict)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    logs = []
    for log in items:
        actor_name = log.actor.full_name if log.actor else "System"
        logs.append(AuditLogOut(
            id=log.id, actor_id=log.actor_id, actor_name=actor_name,
            action=log.action, resource_type=log.resource_type,
            resource_id=log.resource_id, details=log.details,
            ip_address=log.ip_address, created_at=log.created_at,
        ))
    return {"total": total, "page": page, "page_size": page_size, "items": logs}
