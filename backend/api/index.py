"""Vercel Serverless Function entry point when root directory is set to backend."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app as fastapi_app


class VercelPathAdapter:
    """ASGI adapter to ensure Vercel rewrites to /api route properly."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            matched_bytes = (
                headers.get(b"x-matched-path")
                or headers.get(b"x-forwarded-uri")
                or headers.get(b"x-vercel-matched-path")
            )

            if matched_bytes:
                try:
                    orig_path = matched_bytes.decode("utf-8").split("?")[0]
                    if orig_path and not orig_path.endswith("index.py") and orig_path != "/api/index":
                        scope["path"] = orig_path
                except Exception:
                    pass

        await self.app(scope, receive, send)


app = VercelPathAdapter(fastapi_app)
