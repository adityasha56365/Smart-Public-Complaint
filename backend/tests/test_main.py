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


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
