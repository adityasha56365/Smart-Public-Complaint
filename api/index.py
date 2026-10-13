"""Vercel Serverless Function entry point for Civicly FastAPI backend."""
import sys
from pathlib import Path

# Add backend directory to sys.path so app modules can be resolved
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Ensure root directory is on sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.main import app  # ASGI app for Vercel
