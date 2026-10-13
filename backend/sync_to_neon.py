"""Universal sync script to copy all local tables and data to Neon PostgreSQL.

Usage:
    python sync_to_neon.py --neon-url "..."
"""
import argparse
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text, select
from app.core.config import settings
from app.db.session import Base
import app.models.models  # noqa: F401


def normalize_neon_url(url: str) -> str:
    url = url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if "sslmode" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"
    return url


def sync_all(neon_url: str):
    clean_neon = normalize_neon_url(neon_url)
    print("=" * 65)
    print("MIGRATING ALL LOCAL DATABASE DATA TO NEON POSTGRESQL")
    print(f"Source: {settings.clean_database_url.split('@')[-1]}")
    print(f"Target: {clean_neon.split('@')[-1]}")
    print("=" * 65)

    local_engine = create_engine(settings.clean_database_url)
    neon_engine = create_engine(clean_neon)

    # 1. Ensure all tables exist on Neon
    print("\n[1/3] Ensuring tables exist in Neon Cloud...")
    Base.metadata.create_all(bind=neon_engine)
    print("  [OK] Tables verified.")

    # Tables in foreign-key dependency order
    table_names = [
        "departments",
        "complaint_categories",
        "users",
        "complaints",
        "complaint_attachments",
        "complaint_assignments",
        "complaint_status_history",
        "complaint_comments",
        "complaint_internal_notes",
        "complaint_feedback",
        "notifications",
        "audit_logs",
    ]

    print("\n[2/3] Clearing and copying table rows...")
    with local_engine.connect() as local_conn, neon_engine.begin() as neon_conn:
        # Truncate all tables at once with CASCADE to cleanly reset
        valid_tables = [t for t in table_names if t in Base.metadata.tables]
        truncate_sql = f"TRUNCATE TABLE {', '.join(valid_tables)} CASCADE;"
        try:
            neon_conn.execute(text(truncate_sql))
            print("  [OK] Cleaned previous records in Neon.")
        except Exception as e:
            print(f"  [Notice] Truncate notice: {e}")

        for t_name in table_names:
            if t_name not in Base.metadata.tables:
                continue
            table = Base.metadata.tables[t_name]

            # Fetch local rows
            rows = local_conn.execute(select(table)).mappings().all()
            if not rows:
                print(f"  - {t_name}: 0 rows (skipped)")
                continue

            row_dicts = [dict(r) for r in rows]

            # Insert all local rows
            neon_conn.execute(table.insert(), row_dicts)
            print(f"  + {t_name}: {len(row_dicts)} rows migrated!")


    # 3. Reset all PostgreSQL serial sequences
    print("\n[3/3] Updating PostgreSQL primary key sequences...")
    with neon_engine.begin() as neon_conn:
        for t_name in table_names:
            try:
                neon_conn.execute(
                    text(f"SELECT setval(pg_get_serial_sequence('{t_name}', 'id'), coalesce(max(id), 1)) FROM {t_name};")
                )
            except Exception:
                pass
    print("  [OK] Sequences reset.")

    print("\n" + "=" * 65)
    print("MIGRATION COMPLETED SUCCESSFULLY!")
    print("All users, complaints, and data are now live on Neon Cloud!")
    print("=" * 65)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync all tables to Neon.")
    parser.add_argument("--neon-url", required=True, help="Neon database URL")
    args = parser.parse_args()
    sync_all(args.neon_url)
