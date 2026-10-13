"""Production Database Bootstrap Script for Neon PostgreSQL and local environments.

Usage:
    python init_db.py
    python init_db.py --email admin@example.com --password YourSecurePassword
"""
import argparse
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.db.session import engine, Base
import app.models.models  # noqa: F401
from seed import seed


def init_database(admin_email: str, admin_password: str, admin_name: str = "Super Administrator"):
    print("=" * 65)
    print("Civicly Database Initialization")
    safe_target = settings.clean_database_url.split("@")[-1] if "@" in settings.clean_database_url else "local"
    print(f"Connecting to: {safe_target}")
    print("=" * 65)

    # 1. Create all schema tables
    print("\n[1/2] Creating database schema tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("  [OK] Tables created/verified successfully.")
    except Exception as exc:
        print(f"  [ERROR] Error creating tables: {exc}")
        print("\nTroubleshooting tips for Neon PostgreSQL:")
        print("1. Verify your DATABASE_URL has sslmode=require")
        print("2. Ensure your credentials are correct")
        raise exc

    # 2. Seed initial data
    print("\n[2/2] Seeding default departments, categories, and superuser...")
    try:
        seed(email=admin_email, password=admin_password, full_name=admin_name)
        print("  [OK] Data seeding completed.")
    except Exception as exc:
        print(f"  [ERROR] Error seeding data: {exc}")
        raise exc

    print("\n" + "=" * 65)
    print("Database is fully initialized and production-ready!")
    print(f"Admin Email:    {admin_email}")
    print("=" * 65)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap the database with schema and initial admin.")
    parser.add_argument("--email", default="admin@civicly.app", help="Superuser email")
    parser.add_argument("--password", default="CiviclyAdmin2026!", help="Superuser password (min 8 chars)")
    parser.add_argument("--name", default="Super Administrator", help="Superuser full name")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("ERROR: Password must be at least 8 characters long.")
        sys.exit(1)

    init_database(args.email, args.password, args.name)
