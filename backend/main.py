"""Entry point shim for Railway/production deployment.
Re-exports the FastAPI app from app.main so both
`uvicorn main:app` and `uvicorn app.main:app` work.
"""
import uvicorn
from app.main import app  # noqa: F401 — re-export for uvicorn

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
