"""Auth + Project API routes — mounted as /api/auth/* and /api/projects/*"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import (
    UserDB, ProjectDB, PasswordResetDB,
    RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest,
    ProjectCreateRequest, ProjectUpdateRequest,
    hash_password, verify_password, create_access_token, get_current_user, get_db,
)

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])
project_router = APIRouter(prefix="/api/projects", tags=["projects"])


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

    user = UserDB(
        id=uuid.uuid4().hex,
        username=req.username.lower().strip(),
        password_hash=hash_password(req.password),
        email=req.email.strip() if req.email else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.username)
    return {
        "token": token,
        "user": {"id": user.id, "username": user.username, "email": user.email},
    }


@auth_router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.username == req.username.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(user.id, user.username)
    return {
        "token": token,
        "user": {"id": user.id, "username": user.username, "email": user.email},
    }


@auth_router.get("/me")
def get_me(user: UserDB = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "email": user.email}


@auth_router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a reset token. In a real app you'd email this.
    For now, we return it directly (since email is optional)."""
    user = db.query(UserDB).filter(UserDB.username == req.username.lower().strip()).first()
    if not user:
        # Don't reveal if user exists
        return {"message": "If that username exists, a reset token has been generated.", "token": None}

    if not user.email:
        raise HTTPException(
            status_code=400,
            detail="No recovery email on file. Please contact support or create a new account."
        )

    reset_token = uuid.uuid4().hex[:16]
    reset = PasswordResetDB(
        id=uuid.uuid4().hex,
        user_id=user.id,
        token=reset_token,
        created_at=datetime.now(timezone.utc),
    )
    db.add(reset)
    db.commit()

    # In production, you'd send this via email. For now, return it.
    return {
        "message": "A reset token has been generated. In production, this would be emailed to you.",
        "token": reset_token,
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

    # Check if token is less than 1 hour old
    age = (datetime.now(timezone.utc) - reset.created_at.replace(tzinfo=timezone.utc)).total_seconds()
    if age > 3600:
        raise HTTPException(status_code=400, detail="Reset token has expired (1 hour limit)")

    user = db.query(UserDB).filter(UserDB.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.password_hash = hash_password(req.new_password)
    reset.used = "true"
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}


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
