"""Authentication module — username/password with JWT tokens and PostgreSQL."""

import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
import bcrypt
from pydantic import BaseModel, field_validator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ── Config ──────────────────────────────────────────────────────
SECRET_KEY = os.environ.get("JWT_SECRET", "change-me-in-production-" + uuid.uuid4().hex)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

bearer_scheme = HTTPBearer(auto_error=False)


# ── Database setup (PostgreSQL via SQLAlchemy) ──────────────────
from sqlalchemy import create_engine, Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./app.db")
# Railway PostgreSQL uses postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Models ──────────────────────────────────────────────────────
class UserDB(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)  # optional recovery email
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    projects = relationship("ProjectDB", back_populates="owner", cascade="all, delete-orphan")


class ProjectDB(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    meta = Column(Text, default="")
    client = Column(String(200), default="")
    industry = Column(String(100), default="")
    size = Column(String(50), default="")
    lead = Column(String(200), default="")
    status = Column(String(50), default="Not Started")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    state_data = Column(JSON, default=dict)  # stores all project state (decisions, risks, etc.)
    owner = relationship("UserDB", back_populates="projects")


class PasswordResetDB(Base):
    __tablename__ = "password_resets"
    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    used = Column(String(5), default="false")


# Create tables
Base.metadata.create_all(bind=engine)


# ── Dependency — get DB session ─────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Pydantic schemas ────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    password_confirm: str
    email: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 30:
            raise ValueError("Username must be 30 characters or less")
        if not re.match(r'^[a-zA-Z0-9_.-]+$', v):
            raise ValueError("Username can only contain letters, numbers, underscores, dots, and hyphens")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r'[A-Z]', v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r'[0-9]', v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class ForgotPasswordRequest(BaseModel):
    username: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    new_password_confirm: str


class ProjectCreateRequest(BaseModel):
    name: str
    meta: Optional[str] = ""
    client: Optional[str] = ""
    industry: Optional[str] = ""
    size: Optional[str] = ""
    lead: Optional[str] = ""


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    meta: Optional[str] = None
    status: Optional[str] = None
    state_data: Optional[dict] = None


# ── Token helpers ───────────────────────────────────────────────
def create_access_token(user_id: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "username": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Get current user dependency ─────────────────────────────────
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> UserDB:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    user = db.query(UserDB).filter(UserDB.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[UserDB]:
    """Returns user if authenticated, None otherwise. For endpoints that work both ways."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        return db.query(UserDB).filter(UserDB.id == payload["sub"]).first()
    except Exception:
        return None
