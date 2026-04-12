"""Database configuration — PostgreSQL (production) or SQLite (development)

Usage:
    from app.database import get_db, engine, SessionLocal, Base

Environment:
    DATABASE_URL — PostgreSQL connection string (default: sqlite:///./app.db)
    Example: postgresql://user:password@localhost:5432/ai_platform
"""

import os
from app.auth import engine, SessionLocal, Base, get_db

# Re-export for convenience
__all__ = ["engine", "SessionLocal", "Base", "get_db"]

# Database info
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./app.db")
IS_POSTGRES = "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL

def get_db_info():
    """Return database connection info for health checks"""
    return {
        "type": "postgresql" if IS_POSTGRES else "sqlite",
        "url": DATABASE_URL.split("@")[-1] if IS_POSTGRES else "local",
        "connected": True,
    }
