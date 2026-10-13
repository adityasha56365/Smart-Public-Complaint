"""Admin bootstrap script — creates the first superuser from environment or arguments.

Usage:
    python seed.py
    python seed.py --email admin@example.com --password SecurePass123
"""
import argparse
import sys

# Add backend to path
sys.path.insert(0, ".")

from app.core.security import hash_password
from app.db.session import SessionLocal, Base, engine
from app.models.models import (
    ComplaintCategory,
    Department,
    User,
    UserRole,
)


DEFAULT_DEPARTMENTS = [
    ("Roads & Infrastructure", "East, South zones"),
    ("Solid Waste Management", "City-wide"),
    ("Water Supply", "North, East zones"),
    ("Storm Water Drains", "City-wide"),
    ("Electrical Maintenance", "All zones"),
    ("Parks & Recreation", "City-wide"),
]

DEFAULT_CATEGORIES = [
    ("Roads & Potholes", "road", "Roads & Infrastructure"),
    ("Garbage & Sanitation", "trash", "Solid Waste Management"),
    ("Water Supply", "water", "Water Supply"),
    ("Streetlights", "light", "Electrical Maintenance"),
    ("Parks & Public Property", "park", "Parks & Recreation"),
    ("Drainage & Sewage", "water", "Storm Water Drains"),
    ("Other Civic Issues", "building", None),
]


def seed(email: str, password: str, full_name: str = "Super Administrator"):
    # Ensure all tables exist before inserting records
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Create departments
        dept_map = {}
        for name, jurisdiction in DEFAULT_DEPARTMENTS:
            existing = db.query(Department).filter(Department.name == name).first()
            if not existing:
                d = Department(name=name, jurisdiction=jurisdiction)
                db.add(d)
                db.flush()
                dept_map[name] = d.id
            else:
                dept_map[name] = existing.id

        # Create categories
        for cat_name, icon, dept_name in DEFAULT_CATEGORIES:
            if not db.query(ComplaintCategory).filter(ComplaintCategory.name == cat_name).first():
                dept_id = dept_map.get(dept_name) if dept_name else None
                db.add(ComplaintCategory(name=cat_name, icon=icon, department_id=dept_id))

        # Create admin user
        existing_admin = db.query(User).filter(User.email == email).first()
        if existing_admin:
            print(f"User {email} already exists. Skipping admin creation.")
        else:
            admin = User(
                full_name=full_name,
                email=email,
                hashed_password=hash_password(password),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(admin)
            print(f"Created admin user: {email}")

        db.commit()
        print("Seed complete.")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap the Civicly database.")
    parser.add_argument("--email", default="admin@civicly.app")
    parser.add_argument("--password", required=True, help="Admin password (min 8 chars)")
    parser.add_argument("--name", default="Super Administrator")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("ERROR: Password must be at least 8 characters.")
        sys.exit(1)

    seed(args.email, args.password, args.name)
