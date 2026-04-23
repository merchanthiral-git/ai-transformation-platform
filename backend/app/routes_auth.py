"""Auth + Project API routes — mounted as /api/auth/* and /api/projects/*"""

import uuid
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import (
    UserDB, ProjectDB, PasswordResetDB,
    RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest,
    ProjectCreateRequest, ProjectUpdateRequest, ProfileUpdateRequest,
    hash_password, verify_password, create_access_token, get_current_user, get_db,
)
from app.email_service import (
    send_welcome_email, send_admin_new_user_notification,
    send_password_reset_email, _send_email, _wrap_html, ADMIN_EMAIL, APP_NAME,
)

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])
project_router = APIRouter(prefix="/api/projects", tags=["projects"])

def _user_dict(user: UserDB) -> dict:
    return {"id": user.id, "username": user.username, "email": user.email,
            "display_name": user.display_name, "last_login": str(user.last_login),
            "user_type": getattr(user, "user_type", "") or "",
            "user_role": getattr(user, "user_role", "") or ""}


# ═══════════════════════════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════════════════════════

@auth_router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if req.password != req.password_confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing = db.query(UserDB).filter(UserDB.username == req.username.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Check duplicate email
    email_clean = req.email.strip().lower()
    existing_email = db.query(UserDB).filter(UserDB.email == email_clean).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    now = datetime.now(timezone.utc)
    user = UserDB(
        id=uuid.uuid4().hex,
        username=req.username.lower().strip(),
        password_hash=hash_password(req.password),
        email=email_clean,
        display_name=(req.display_name or req.username).strip(),
        created_at=now,
        last_login=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.username)

    # Send emails asynchronously (don't block registration)
    async def _send_emails():
        await send_welcome_email(user.email, user.display_name or user.username, "")
        await send_admin_new_user_notification(user.username, user.email)
    try: asyncio.get_event_loop().create_task(_send_emails())
    except RuntimeError: pass  # No event loop in sync context — emails skipped

    return {
        "token": token,
        "user": _user_dict(user),
    }


@auth_router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(UserDB).filter(UserDB.username == req.username.lower().strip()).first()
    except Exception:
        raise HTTPException(status_code=503, detail="Login temporarily unavailable. Please try again.")
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    prev_login = str(user.last_login) if user.last_login else None
    user.last_login = datetime.now(timezone.utc)
    try:
        db.commit()
    except Exception:
        db.rollback()

    token = create_access_token(user.id, user.username)
    return {
        "token": token,
        "user": {**_user_dict(user), "display_name": user.display_name or user.username, "last_login": prev_login},
    }


@auth_router.get("/me")
def get_me(user: UserDB = Depends(get_current_user)):
    return _user_dict(user)


@auth_router.get("/check-username")
def check_username(username: str, db: Session = Depends(get_db)):
    """Check if a username is available. Returns availability + suggestions if taken."""
    clean = username.lower().strip()
    if len(clean) < 3 or not __import__("re").match(r'^[a-zA-Z0-9_.-]+$', clean):
        return {"available": False, "reason": "invalid", "suggestions": []}
    existing = db.query(UserDB).filter(UserDB.username == clean).first()
    if existing:
        # Generate suggestions
        import random
        random.seed(hash(clean) % 2**31)
        year = __import__("datetime").datetime.now().year
        suggestions = [f"{clean}_{random.randint(10, 99)}", f"{clean}.{year}", f"{clean}_ai"]
        # Filter out ones that are also taken
        suggestions = [s for s in suggestions if not db.query(UserDB).filter(UserDB.username == s).first()][:3]
        return {"available": False, "reason": "taken", "suggestions": suggestions}
    return {"available": True, "reason": "", "suggestions": []}


@auth_router.get("/check-email")
def check_email(email: str, db: Session = Depends(get_db)):
    """Check if an email is already registered."""
    clean = email.strip().lower()
    existing = db.query(UserDB).filter(UserDB.email == clean).first()
    return {"available": not bool(existing)}


@auth_router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a reset token and log it. Uses email to find the account."""
    email_clean = req.email.strip().lower()
    user = db.query(UserDB).filter(UserDB.email == email_clean).first()
    # Always return success to avoid revealing whether email exists
    if not user:
        return {"message": "If an account with that email exists, a reset link has been sent."}

    reset_token = uuid.uuid4().hex[:16]
    reset = PasswordResetDB(
        id=uuid.uuid4().hex,
        user_id=user.id,
        token=reset_token,
        created_at=datetime.now(timezone.utc),
    )
    db.add(reset)
    db.commit()

    # Send reset email
    async def _send_reset():
        await send_password_reset_email(email_clean, user.username, reset_token)
    try: asyncio.get_event_loop().create_task(_send_reset())
    except RuntimeError: pass

    return {
        "message": "If an account with that email exists, a reset link has been sent.",
    }


@auth_router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if req.new_password != req.new_password_confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    reset = db.query(PasswordResetDB).filter(
        PasswordResetDB.token == req.token,
        PasswordResetDB.used == "false",
    ).first()

    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Check if token is less than 30 minutes old
    age = (datetime.now(timezone.utc) - reset.created_at.replace(tzinfo=timezone.utc)).total_seconds()
    if age > 1800:
        raise HTTPException(status_code=400, detail="Reset token has expired (30 minute limit)")

    user = db.query(UserDB).filter(UserDB.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.password_hash = hash_password(req.new_password)
    reset.used = "true"
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}


@auth_router.put("/profile")
def update_profile(req: ProfileUpdateRequest, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update display name, email, or password. Requires current password for password changes."""
    if req.display_name is not None:
        user.display_name = req.display_name.strip()

    if req.email is not None:
        email_clean = req.email.strip().lower()
        existing = db.query(UserDB).filter(UserDB.email == email_clean, UserDB.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        user.email = email_clean

    if req.user_type is not None:
        user.user_type = req.user_type.strip()
    if req.user_role is not None:
        user.user_role = req.user_role.strip()

    if req.new_password:
        if not req.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        if not verify_password(req.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if req.new_password != req.new_password_confirm:
            raise HTTPException(status_code=400, detail="New passwords do not match")
        if len(req.new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        user.password_hash = hash_password(req.new_password)

    db.commit()
    db.refresh(user)
    return _user_dict(user)


# ═══════════════════════════════════════════════════════════════
# PROJECT ROUTES (user-scoped)
# ═══════════════════════════════════════════════════════════════

@project_router.get("/")
def list_projects(user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(ProjectDB).filter(ProjectDB.user_id == user.id).order_by(ProjectDB.created_at.desc()).all()
    return {
        "projects": [
            {
                "id": p.id,
                "name": p.name,
                "meta": p.meta,
                "client": p.client,
                "industry": p.industry,
                "size": p.size,
                "lead": p.lead,
                "status": p.status,
                "created": p.created_at.strftime("%m/%d/%Y") if p.created_at else "",
                "state_data": p.state_data or {},
            }
            for p in projects
        ]
    }


@project_router.post("/")
def create_project(req: ProjectCreateRequest, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    project = ProjectDB(
        id=uuid.uuid4().hex,
        user_id=user.id,
        name=req.name.strip(),
        meta=req.meta or "",
        client=req.client or "",
        industry=req.industry or "",
        size=req.size or "",
        lead=req.lead or "",
        status="Not Started",
        created_at=datetime.now(timezone.utc),
        state_data={},
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {
        "id": project.id,
        "name": project.name,
        "meta": project.meta,
        "client": project.client,
        "industry": project.industry,
        "size": project.size,
        "lead": project.lead,
        "status": project.status,
        "created": project.created_at.strftime("%m/%d/%Y"),
        "state_data": project.state_data or {},
    }


@project_router.put("/{project_id}")
def update_project(project_id: str, req: ProjectUpdateRequest, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id, ProjectDB.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if req.name is not None:
        project.name = req.name
    if req.meta is not None:
        project.meta = req.meta
    if req.status is not None:
        project.status = req.status
    if req.state_data is not None:
        # Merge state data instead of replacing
        existing = project.state_data or {}
        existing.update(req.state_data)
        project.state_data = existing

    db.commit()
    db.refresh(project)
    return {
        "id": project.id,
        "name": project.name,
        "meta": project.meta,
        "status": project.status,
        "state_data": project.state_data or {},
    }


@project_router.delete("/{project_id}")
def delete_project(project_id: str, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id, ProjectDB.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return {"ok": True}


@project_router.get("/{project_id}")
def get_project(project_id: str, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id, ProjectDB.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": project.id,
        "name": project.name,
        "meta": project.meta,
        "client": project.client,
        "industry": project.industry,
        "size": project.size,
        "lead": project.lead,
        "status": project.status,
        "created": project.created_at.strftime("%m/%d/%Y") if project.created_at else "",
        "state_data": project.state_data or {},
    }


@project_router.put("/{project_id}/state")
def save_project_state(project_id: str, state: dict, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save arbitrary state data for a project (decisions, risks, view state, etc.)"""
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id, ProjectDB.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.state_data = state
    db.commit()
    return {"ok": True}


@project_router.get("/{project_id}/design-state")
def get_design_state(project_id: str, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get OM canvas + KPI state for a project."""
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id, ProjectDB.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    state = (project.state_data or {}).get("design", {})
    return state


@project_router.post("/{project_id}/design-state")
def save_design_state(project_id: str, state: dict, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save OM canvas + KPI state for a project."""
    project = db.query(ProjectDB).filter(ProjectDB.id == project_id, ProjectDB.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    existing = dict(project.state_data or {})
    existing["design"] = state
    project.state_data = existing
    db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
# ADMIN ROUTES (hiral only)
# ═══════════════════════════════════════════════════════════════

ADMIN_EMAILS = {"merchanthiral@gmail.com"}


def _require_admin(user: UserDB):
    if (user.email or "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")


@auth_router.get("/admin/users")
def admin_list_users(user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all users with stats. Admin only."""
    _require_admin(user)
    from sqlalchemy import func as sa_func
    # Single query: user + project count (fixes N+1)
    user_projects = dict(
        db.query(ProjectDB.user_id, sa_func.count(ProjectDB.id))
        .group_by(ProjectDB.user_id).all()
    )
    users = db.query(UserDB).order_by(UserDB.created_at.desc()).all()
    result = []
    for u in users:
        project_count = user_projects.get(u.id, 0)
        # Determine activity status based on last_login recency
        activity = "Never"
        if u.last_login:
            from datetime import datetime, timezone, timedelta
            now_utc = datetime.now(timezone.utc)
            ll = u.last_login.replace(tzinfo=timezone.utc) if u.last_login.tzinfo is None else u.last_login
            delta = now_utc - ll
            if delta < timedelta(hours=1):
                activity = "Online"
            elif delta < timedelta(days=1):
                activity = "Today"
            elif delta < timedelta(days=7):
                activity = "This week"
            elif delta < timedelta(days=30):
                activity = "This month"
            else:
                activity = "Inactive"
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "display_name": u.display_name or u.username,
            "user_type": u.user_type or "",
            "user_role": u.user_role or "",
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else None,
            "last_login": u.last_login.strftime("%Y-%m-%d %H:%M") if u.last_login else None,
            "is_active": u.is_active != "false",
            "activity": activity,
            "project_count": project_count,
        })
    # Stats
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    def _login_after(u, cutoff):
        if not u.last_login:
            return False
        ll = u.last_login.replace(tzinfo=timezone.utc) if u.last_login.tzinfo is None else u.last_login
        return ll >= cutoff

    active_today = sum(1 for u in users if _login_after(u, today_start))
    active_7d = sum(1 for u in users if _login_after(u, week_ago))
    active_30d = sum(1 for u in users if _login_after(u, month_ago))
    total_projects = db.query(ProjectDB).count()

    import os
    db_url = os.environ.get("DATABASE_URL", "sqlite:///./app.db")
    db_type = "postgresql" if "postgres" in db_url else "sqlite"

    return {
        "users": result,
        "stats": {
            "total_users": len(users),
            "active_today": active_today,
            "active_7d": active_7d,
            "active_30d": active_30d,
            "total_projects": total_projects,
            "db_type": db_type,
        },
    }


@auth_router.put("/admin/users/{user_id}/status")
def admin_toggle_user_status(user_id: str, payload: dict, user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    """Activate or deactivate a user account. Admin only."""
    _require_admin(user)
    target = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if (target.email or "").lower() in ADMIN_EMAILS:
        raise HTTPException(status_code=400, detail="Cannot deactivate admin accounts")
    target.is_active = "true" if payload.get("active", True) else "false"
    db.commit()
    return {"ok": True, "username": target.username, "is_active": target.is_active != "false"}


@auth_router.get("/admin/ai-usage")
def admin_ai_usage(user: UserDB = Depends(get_current_user)):
    """Get AI usage stats. Admin only."""
    _require_admin(user)
    from app.routes_ai import _rate_tracker, RATE_LIMIT_PER_DAY
    import time
    now = time.time()
    day_ago = now - 86400
    usage = {}
    total_today = 0
    for uid, timestamps in _rate_tracker.items():
        recent = [t for t in timestamps if t > day_ago]
        if recent:
            usage[uid] = len(recent)
            total_today += len(recent)
    return {
        "total_today": total_today,
        "limit_per_user": RATE_LIMIT_PER_DAY,
        "per_user": usage,
    }


# ═══════════════════════════════════════════════════════════════
# EMAIL TEST ENDPOINT (admin only)
# ═══════════════════════════════════════════════════════════════
@auth_router.get("/admin/test-email")
async def test_email(user: UserDB = Depends(get_current_user)):
    """Send a test email to verify Resend configuration. Admin only."""
    _require_admin(user)
    body = f"""
    <div style="font-size:18px;font-weight:700;color:#f5e6d0;margin-bottom:12px;">Test Email</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6;">
      This is a test email from the {APP_NAME}.<br>
      Sent at: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}<br>
      If you're reading this, email delivery is working.
    </div>
    """
    success = await _send_email(ADMIN_EMAIL, f"[{APP_NAME}] Test Email", _wrap_html(body))
    return {"sent": success, "to": ADMIN_EMAIL}
