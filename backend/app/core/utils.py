"""Complaint reference number generator and audit helper."""
import datetime
import random
import string


def generate_reference_number(prefix: str = "SPC") -> str:
    """Generate a unique complaint reference number e.g. SPC-2026-48291."""
    year = datetime.datetime.now().year
    suffix = "".join(random.choices(string.digits, k=5))
    return f"{prefix}-{year}-{suffix}"


def build_audit_detail(**kwargs) -> str:
    """Flatten kwargs into a plain string for audit log details."""
    return "; ".join(f"{k}={v}" for k, v in kwargs.items() if v is not None)
