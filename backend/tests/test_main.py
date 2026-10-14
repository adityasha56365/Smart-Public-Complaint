"""Backend tests for authentication, complaints, and RBAC."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import Base, get_db
from app.main import app
from app.models.models import ComplaintCategory, Department, User, UserRole
from app.core.security import hash_password

# Use SQLite in-memory with StaticPool for tests
from sqlalchemy.pool import StaticPool
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def citizen_token(client):
    client.post("/api/v1/auth/register", json={
        "full_name": "Test Citizen",
        "email": "citizen@test.com",
        "password": "testpassword123",
    })
    resp = client.post("/api/v1/auth/login", json={"email": "citizen@test.com", "password": "testpassword123"})
    return resp.json()["access_token"]


@pytest.fixture
def admin_token(db, client):
    admin = User(
        full_name="Admin User",
        email="admin@test.com",
        hashed_password=hash_password("adminpassword"),
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "adminpassword"})
    return resp.json()["access_token"]


@pytest.fixture
def officer_token(db, client):
    officer = User(
        full_name="Officer User",
        email="officer@test.com",
        hashed_password=hash_password("officerpassword"),
        role=UserRole.officer,
    )
    db.add(officer)
    db.commit()
    resp = client.post("/api/v1/auth/login", json={"email": "officer@test.com", "password": "officerpassword"})
    return resp.json()["access_token"]


@pytest.fixture
def transport_officer_token(db, client):
    officer = User(
        full_name="Transport Officer User",
        email="transport_officer@test.com",
        hashed_password=hash_password("transportpassword"),
        role=UserRole.transport_officer,
    )
    db.add(officer)
    db.commit()
    resp = client.post("/api/v1/auth/login", json={"email": "transport_officer@test.com", "password": "transportpassword"})
    return resp.json()["access_token"]


@pytest.fixture
def transport_supervisor_token(db, client):
    supervisor = User(
        full_name="Transport Supervisor User",
        email="transport_supervisor@test.com",
        hashed_password=hash_password("transportsupervisorpassword"),
        role=UserRole.transport_supervisor,
    )
    db.add(supervisor)
    db.commit()
    resp = client.post("/api/v1/auth/login", json={"email": "transport_supervisor@test.com", "password": "transportsupervisorpassword"})
    return resp.json()["access_token"]


@pytest.fixture
def sample_category(db):
    cat = ComplaintCategory(name="Roads & Potholes", icon="road")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------

class TestAuth:
    def test_register_success(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "full_name": "Ananya Mehta",
            "email": "ananya@test.com",
            "password": "password123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "ananya@test.com"
        assert data["role"] == "citizen"
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client):
        payload = {"full_name": "User A", "email": "dup@test.com", "password": "pass12345"}
        client.post("/api/v1/auth/register", json=payload)
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 409

    def test_register_requires_contact(self, client):
        resp = client.post("/api/v1/auth/register", json={"full_name": "No Contact", "password": "pass12345"})
        assert resp.status_code == 422

    def test_login_success(self, client, citizen_token):
        assert citizen_token is not None
        assert len(citizen_token) > 10

    def test_login_wrong_password(self, client):
        client.post("/api/v1/auth/register", json={"full_name": "A", "email": "a@b.com", "password": "correct123"})
        resp = client.post("/api/v1/auth/login", json={"email": "a@b.com", "password": "wrongpassword"})
        assert resp.status_code == 401

    def test_me_endpoint(self, client, citizen_token):
        resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {citizen_token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "citizen@test.com"

    def test_me_unauthenticated(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Complaint tests
# ---------------------------------------------------------------------------

class TestComplaints:
    def test_create_complaint(self, client, citizen_token, sample_category):
        resp = client.post("/api/v1/complaints", json={
            "title": "Pothole on main road",
            "description": "There is a large pothole causing accidents.",
            "category_id": sample_category.id,
            "location_address": "12th Main Road, Indiranagar",
        }, headers={"Authorization": f"Bearer {citizen_token}"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "submitted"
        assert data["reference_number"].startswith("SPC-")
        assert data["title"] == "Pothole on main road"

    def test_create_complaint_unauthenticated(self, client):
        resp = client.post("/api/v1/complaints", json={
            "title": "Test", "description": "Description here."
        })
        assert resp.status_code == 401

    def test_list_complaints_citizen_only_sees_own(self, client, citizen_token, db, sample_category):
        # Create complaint as citizen
        client.post("/api/v1/complaints", json={
            "title": "My complaint", "description": "Details of my complaint."
        }, headers={"Authorization": f"Bearer {citizen_token}"})

        # Create another user and their complaint
        other = User(full_name="Other", email="other@test.com", hashed_password=hash_password("pass1234"), role=UserRole.citizen)
        db.add(other)
        db.commit()

        resp = client.get("/api/v1/complaints", headers={"Authorization": f"Bearer {citizen_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert all(item["citizen_id"] != other.id for item in data["items"])

    def test_get_complaint_detail(self, client, citizen_token, sample_category):
        create_resp = client.post("/api/v1/complaints", json={
            "title": "Streetlight out", "description": "The streetlight has not worked for days."
        }, headers={"Authorization": f"Bearer {citizen_token}"})
        complaint_id = create_resp.json()["id"]
        resp = client.get(f"/api/v1/complaints/{complaint_id}", headers={"Authorization": f"Bearer {citizen_token}"})
        assert resp.status_code == 200
        assert resp.json()["id"] == complaint_id

    def test_citizen_cannot_access_other_complaint(self, client, db, sample_category):
        # Create two citizens
        u1 = User(full_name="C1", email="c1@test.com", hashed_password=hash_password("pass1234"), role=UserRole.citizen)
        u2 = User(full_name="C2", email="c2@test.com", hashed_password=hash_password("pass1234"), role=UserRole.citizen)
        db.add_all([u1, u2])
        db.commit()

        token1 = client.post("/api/v1/auth/login", json={"email": "c1@test.com", "password": "pass1234"}).json()["access_token"]
        token2 = client.post("/api/v1/auth/login", json={"email": "c2@test.com", "password": "pass1234"}).json()["access_token"]

        create_resp = client.post("/api/v1/complaints", json={
            "title": "C1 complaint", "description": "Details of citizen 1 complaint."
        }, headers={"Authorization": f"Bearer {token1}"})
        c_id = create_resp.json()["id"]

        # C2 tries to access C1's complaint
        resp = client.get(f"/api/v1/complaints/{c_id}", headers={"Authorization": f"Bearer {token2}"})
        assert resp.status_code == 403

    def test_create_complaint_with_contact_details(self, client, citizen_token):
        resp = client.post("/api/v1/complaints", json={
            "title": "Broken bench",
            "description": "The public bench is broken into two pieces.",
            "contact_name": "Ramesh Kumar",
            "contact_email": "ramesh@example.com",
            "contact_phone": "+919876543210",
        }, headers={"Authorization": f"Bearer {citizen_token}"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["contact_name"] == "Ramesh Kumar"
        assert data["contact_email"] == "ramesh@example.com"
        assert data["contact_phone"] == "+919876543210"

    def test_upload_and_download_attachment(self, client, citizen_token, db):
        # 1. Create complaint
        create_resp = client.post("/api/v1/complaints", json={
            "title": "Pothole hazard", "description": "Dangerous pothole near the school."
        }, headers={"Authorization": f"Bearer {citizen_token}"})
        c_id = create_resp.json()["id"]

        # 2. Upload dummy image
        file_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRdummytestimage"
        upload_resp = client.post(
            f"/api/v1/complaints/{c_id}/attachments",
            files={"file": ("evidence.png", file_bytes, "image/png")},
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert upload_resp.status_code == 201
        att_id = upload_resp.json()["id"]

        # 3. Check complaint detail has attachment with url and data_url
        detail_resp = client.get(f"/api/v1/complaints/{c_id}", headers={"Authorization": f"Bearer {citizen_token}"})
        assert detail_resp.status_code == 200
        atts = detail_resp.json()["attachments"]
        assert len(atts) == 1
        assert atts[0]["id"] == att_id
        assert atts[0]["data_url"] is not None

        # 4. Download attachment
        download_resp = client.get(f"/api/v1/complaints/{c_id}/attachments/{att_id}/file")
        assert download_resp.status_code == 200
        assert download_resp.content == file_bytes


# ---------------------------------------------------------------------------
# Status transition tests
# ---------------------------------------------------------------------------

class TestStatusTransitions:
    def test_officer_can_update_status(self, client, citizen_token, officer_token):
        c = client.post("/api/v1/complaints", json={
            "title": "Water leak", "description": "There is a water main leak on the road."
        }, headers={"Authorization": f"Bearer {citizen_token}"}).json()

        resp = client.patch(f"/api/v1/complaints/{c['id']}/status",
            json={"status": "under_review"},
            headers={"Authorization": f"Bearer {officer_token}"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "under_review"

    def test_citizen_cannot_update_status(self, client, citizen_token):
        c = client.post("/api/v1/complaints", json={
            "title": "Garbage pile", "description": "Large pile of uncollected garbage."
        }, headers={"Authorization": f"Bearer {citizen_token}"}).json()

        resp = client.patch(f"/api/v1/complaints/{c['id']}/status",
            json={"status": "under_review"},
            headers={"Authorization": f"Bearer {citizen_token}"})
        assert resp.status_code == 403

    def test_invalid_transition_rejected(self, client, citizen_token, officer_token):
        c = client.post("/api/v1/complaints", json={
            "title": "Park light", "description": "Park lights are not functioning at night."
        }, headers={"Authorization": f"Bearer {citizen_token}"}).json()

        # Cannot jump from submitted directly to resolved
        resp = client.patch(f"/api/v1/complaints/{c['id']}/status",
            json={"status": "resolved"},
            headers={"Authorization": f"Bearer {officer_token}"})
        assert resp.status_code == 422

    def test_reject_requires_reason(self, client, citizen_token, officer_token):
        c = client.post("/api/v1/complaints", json={
            "title": "Invalid complaint", "description": "This complaint will be rejected."
        }, headers={"Authorization": f"Bearer {citizen_token}"}).json()

        resp = client.patch(f"/api/v1/complaints/{c['id']}/status",
            json={"status": "rejected"},
            headers={"Authorization": f"Bearer {officer_token}"})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Admin tests
# ---------------------------------------------------------------------------

class TestAdmin:
    def test_admin_stats(self, client, admin_token):
        resp = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data

    def test_citizen_cannot_access_admin_stats(self, client, citizen_token):
        resp = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {citizen_token}"})
        assert resp.status_code == 403

    def test_admin_can_create_department(self, client, admin_token):
        resp = client.post("/api/v1/departments", json={"name": "Test Dept", "jurisdiction": "Test zone"},
                           headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 201
        assert resp.json()["name"] == "Test Dept"

    def test_citizen_cannot_create_department(self, client, citizen_token):
        resp = client.post("/api/v1/departments", json={"name": "Hack Dept"},
                           headers={"Authorization": f"Bearer {citizen_token}"})
        assert resp.status_code == 403

    def test_admin_can_update_department(self, client, admin_token):
        # Create department
        create_resp = client.post("/api/v1/departments", json={"name": "Update Dept", "jurisdiction": "South Zone"},
                                  headers={"Authorization": f"Bearer {admin_token}"})
        dept_id = create_resp.json()["id"]

        # Update name and jurisdiction
        update_resp = client.put(f"/api/v1/departments/{dept_id}",
                                 json={"name": "Updated Dept Name", "jurisdiction": "North Zone"},
                                 headers={"Authorization": f"Bearer {admin_token}"})
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["name"] == "Updated Dept Name"
        assert data["jurisdiction"] == "North Zone"

    def test_admin_can_delete_department(self, client, admin_token):
        create_resp = client.post("/api/v1/departments", json={"name": "Delete Dept", "jurisdiction": "East Zone"},
                                  headers={"Authorization": f"Bearer {admin_token}"})
        dept_id = create_resp.json()["id"]

        del_resp = client.delete(f"/api/v1/departments/{dept_id}", headers={"Authorization": f"Bearer {admin_token}"})
        assert del_resp.status_code == 204


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Challan Complaint Module Tests (Strict Queue Separation & RBAC)
# ---------------------------------------------------------------------------

class TestChallanComplaintModule:
    sample_challan_payload = {
        "challan_number": "DL1234567890",
        "vehicle_number": "DL01AB1234",
        "issue_date": "2026-03-01T10:00:00Z",
        "issuing_authority": "Delhi Traffic Police, East Zone",
        "jurisdiction": "East Zone",
        "dispute_reason": "wrong_vehicle",
        "description": "The vehicle in the violation camera photo is a commercial truck whereas my vehicle is a two-wheeler motorcycle.",
        "evidence": [
            {
                "original_filename": "rc_copy.png",
                "mime_type": "image/png",
                "size_bytes": 102400,
                "attachment_type": "image",
                "file_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            }
        ],
    }

    def test_citizen_can_create_challan_dispute(self, client, citizen_token):
        resp = client.post(
            "/api/v1/challan-complaints",
            json=self.sample_challan_payload,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["reference_id"].startswith("CHL-")
        assert data["challan_number"] == "DL1234567890"
        assert data["status"] == "submitted"
        assert len(data["evidence"]) == 1
        assert len(data["status_history"]) >= 1

    def test_duplicate_challan_dispute_rejected(self, client, citizen_token):
        # First creation
        client.post(
            "/api/v1/challan-complaints",
            json=self.sample_challan_payload,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        # Duplicate submission with same challan and vehicle
        dup_resp = client.post(
            "/api/v1/challan-complaints",
            json=self.sample_challan_payload,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert dup_resp.status_code == 409
        assert "already under review" in dup_resp.json()["detail"]

    def test_critical_queue_separation(self, client, citizen_token, admin_token, officer_token):
        """Verify Challan Complaint NEVER appears in the normal Public Complaint queue or admin tables."""
        # 1. Citizen creates a challan dispute
        challan_resp = client.post(
            "/api/v1/challan-complaints",
            json=self.sample_challan_payload,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert challan_resp.status_code == 201
        challan_ref = challan_resp.json()["reference_id"]

        # 2. General Public Complaint list (/api/v1/complaints) MUST NOT contain this challan
        general_complaints_resp = client.get(
            "/api/v1/complaints",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert general_complaints_resp.status_code == 200
        items = general_complaints_resp.json()["items"]
        assert all(c["reference_number"] != challan_ref for c in items)

        # 3. Citizen's normal public complaint list (/api/v1/complaints) MUST NOT contain this challan
        my_public_resp = client.get(
            "/api/v1/complaints",
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert my_public_resp.status_code == 200
        my_items = my_public_resp.json()["items"]
        assert all(c["reference_number"] != challan_ref for c in my_items)

        # 4. Admin stats (/api/v1/admin/stats) MUST NOT count challan disputes
        stats_resp = client.get(
            "/api/v1/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert stats_resp.status_code == 200
        assert stats_resp.json()["total"] == 0

    def test_regular_officer_cannot_access_transport_endpoints(self, client, officer_token, citizen_token):
        """Regular municipal officers are strictly forbidden from transport endpoints."""
        resp = client.get(
            "/api/v1/transport/challan-complaints",
            headers={"Authorization": f"Bearer {officer_token}"},
        )
        assert resp.status_code == 403

        # Citizen also cannot access transport endpoints
        cit_resp = client.get(
            "/api/v1/transport/challan-complaints",
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert cit_resp.status_code == 403

    def test_transport_officer_workflow(self, client, citizen_token, transport_officer_token, transport_supervisor_token):
        """Full dispute review, info request, response, and decision lifecycle."""
        # Citizen files dispute
        create_resp = client.post(
            "/api/v1/challan-complaints",
            json=self.sample_challan_payload,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        dispute_id = create_resp.json()["id"]

        # Transport officer accepts for review
        accept_resp = client.post(
            f"/api/v1/transport/challan-complaints/{dispute_id}/accept",
            headers={"Authorization": f"Bearer {transport_officer_token}"},
        )
        assert accept_resp.status_code == 200
        assert accept_resp.json()["status"] == "under_review"

        # Transport officer requests info
        info_resp = client.post(
            f"/api/v1/transport/challan-complaints/{dispute_id}/request-info",
            json={"message": "Please provide your registration certificate front and back scan."},
            headers={"Authorization": f"Bearer {transport_officer_token}"},
        )
        assert info_resp.status_code == 200
        assert info_resp.json()["status"] == "awaiting_citizen_info"

        # Citizen responds
        respond_resp = client.post(
            f"/api/v1/challan-complaints/{dispute_id}/respond",
            json={"response_text": "Attached my registration certificate showing two-wheeler classification."},
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert respond_resp.status_code == 200
        assert respond_resp.json()["status"] == "under_review"
        assert "two-wheeler" in respond_resp.json()["citizen_response_text"]

        # Ordinary transport officer CANNOT approve cancellation
        cancel_attempt = client.post(
            f"/api/v1/transport/challan-complaints/{dispute_id}/decision",
            json={"decision_type": "cancellation_approved", "reason": "Confirmed photographic error."},
            headers={"Authorization": f"Bearer {transport_officer_token}"},
        )
        assert cancel_attempt.status_code == 403

        # Transport supervisor CAN approve cancellation
        supervisor_resp = client.post(
            f"/api/v1/transport/challan-complaints/{dispute_id}/decision",
            json={"decision_type": "cancellation_approved", "reason": "Confirmed photographic error and number plate mismatch."},
            headers={"Authorization": f"Bearer {transport_supervisor_token}"},
        )
        assert supervisor_resp.status_code == 200
        assert supervisor_resp.json()["status"] == "cancellation_approved"
        assert supervisor_resp.json()["decision_type"] == "cancellation_approved"
