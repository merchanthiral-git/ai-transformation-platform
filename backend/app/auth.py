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
SECRET_KEY = os.environ.get("JWT_SECRET", "dev-only-secret-change-in-production")
if not os.environ.get("JWT_SECRET"):
    print("[SECURITY WARNING] JWT_SECRET not set — using insecure default. Set JWT_SECRET in production.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

bearer_scheme = HTTPBearer(auto_error=False)


# ── Database setup (PostgreSQL via SQLAlchemy) ──────────────────
from sqlalchemy import create_engine, Column, String, DateTime, Text, ForeignKey, JSON, Boolean
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
    email = Column(String(255), nullable=True)
    display_name = Column(String(100), nullable=True)
    email_verified = Column(String(5), default="false")
    verification_token = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)
    is_active = Column(String(5), default="true")  # "true" / "false" (SQLite compat)
    user_type = Column(String(50), default="")  # "consultant" or "industry"
    user_role = Column(String(100), default="")  # e.g., "analyst", "principal", "hrbp", "chro"
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


# ── Agent System Tables ──
class AgentSessionDB(Base):
    __tablename__ = "agent_sessions"
    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex[:8])
    project_id = Column(String, index=True, nullable=False)
    agent_name = Column(String(50), nullable=False)
    status = Column(String(20), default="running")  # running, completed, failed
    run_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


class AgentEventDB(Base):
    __tablename__ = "agent_events"
    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex[:8])
    session_id = Column(String, index=True, nullable=True)
    project_id = Column(String, index=True, nullable=False)
    event_type = Column(String(50), nullable=False)
    agent = Column(String(50), nullable=False)
    data = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AgentMemoryDB(Base):
    __tablename__ = "agent_memories"
    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex[:8])
    project_id = Column(String, index=True, default="")  # empty = global memory
    category = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    confidence = Column(String(10), default="0.8")
    source_project = Column(String, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Decision Log & Annotations Tables ──
class DecisionLogDB(Base):
    __tablename__ = "decision_log"
    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex[:8])
    project_id = Column(String, index=True, nullable=False)
    module = Column(String(100), default="")
    decision_type = Column(String(100), default="")
    detail = Column(Text, default="")
    user_id = Column(String, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AnnotationDB(Base):
    __tablename__ = "annotations"
    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex[:8])
    project_id = Column(String, index=True, nullable=False)
    module_id = Column(String(100), default="")
    x_pct = Column(String(20), default="0")
    y_pct = Column(String(20), default="0")
    text = Column(Text, default="")
    color = Column(String(20), default="amber")
    tag = Column(String(100), default="")
    priority = Column(String(20), default="Medium")
    resolved = Column(String(5), default="false")
    author = Column(String(100), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# Create tables (will add new columns if they don't exist via migrate helper below)
Base.metadata.create_all(bind=engine)

# ── Auto-migrate: add new columns to existing DBs ──────────────
def _migrate_add_columns():
    """Safely add new columns to existing tables (SQLite-compatible)."""
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    if "users" in insp.get_table_names():
        existing = [c["name"] for c in insp.get_columns("users")]
        with engine.begin() as conn:
            if "email_verified" not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN email_verified VARCHAR(5) DEFAULT 'false'"))
            if "verification_token" not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR(100)"))
            if "display_name" not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR(100)"))
            if "last_login" not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login TIMESTAMP"))
            if "is_active" not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active VARCHAR(5) DEFAULT 'true'"))
            if "user_type" not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT ''"))
            if "user_role" not in existing:
                conn.execute(text("ALTER TABLE users ADD COLUMN user_role VARCHAR(100) DEFAULT ''"))

try:
    _migrate_add_columns()
except Exception as e:
    print(f"[Migration warning] {e}")


# ── Seed admin user if not exists ─────────────────────────────
def _seed_admin():
    """Create the admin user on first startup if ADMIN_SEED_PASSWORD env var is set."""
    seed_password = os.environ.get("ADMIN_SEED_PASSWORD")
    if not seed_password:
        print("[Seed] ADMIN_SEED_PASSWORD not set — skipping admin seed")
        return
    db = SessionLocal()
    try:
        existing = db.query(UserDB).filter(UserDB.username == "hiral").first()
        if not existing:
            admin = UserDB(
                username="hiral",
                email="merchanthiral@gmail.com",
                display_name="Hiral",
                password_hash=hash_password(seed_password),
                is_active="true",
                email_verified="true",
                created_at=datetime.now(timezone.utc),
            )
            db.add(admin)
            db.commit()
            print("[Seed] Admin user 'hiral' created")
        else:
            print("[Seed] Admin user 'hiral' already exists — skipping")
    except Exception as e:
        print(f"[Seed warning] {e}")
        db.rollback()
    finally:
        db.close()

try:
    _seed_admin()
except Exception as e:
    print(f"[Seed error] {e}")


# ── Dependency — get DB session ─────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Pydantic schemas ────────────────────────────────────────────
def _validate_email_strict(v: str, required: bool = True) -> str:
    """Validate email with strict rules to reject obviously fake addresses."""
    v = v.strip().lower()
    if not v:
        if required:
            raise ValueError("Email is required")
        return v

    # Basic format check
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
        raise ValueError("Please enter a valid email address")

    local, domain = v.rsplit("@", 1)

    # Local part must be at least 2 characters
    if len(local) < 2:
        raise ValueError("Please enter a valid email address")

    # Domain must have at least 4 characters (e.g. a.co)
    if len(domain) < 4:
        raise ValueError("Please enter a valid email address")

    # Domain must have a dot and a TLD of 2+ chars
    parts = domain.split(".")
    if len(parts) < 2 or len(parts[-1]) < 2:
        raise ValueError("Please enter a valid email address")

    # Domain name (before TLD) must be at least 2 characters
    if len(parts[0]) < 2:
        raise ValueError("Please enter a valid email address")

    # Reject known fake patterns
    if domain in ("test.com", "test.test", "example.com", "example.org",
                   "fake.com", "asdf.com", "aaa.com", "xxx.com", "temp.com"):
        raise ValueError("Please use a real email address")

    return v


class RegisterRequest(BaseModel):
    username: str
    password: str
    password_confirm: str
    email: str  # required
    display_name: Optional[str] = None

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

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        return _validate_email_strict(v, required=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        return _validate_email_strict(v, required=True)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    new_password_confirm: str


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    new_password_confirm: Optional[str] = None
    user_type: Optional[str] = None  # "consultant" or "industry"
    user_role: Optional[str] = None  # specific role within type

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return v
        return _validate_email_strict(v, required=False)


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
