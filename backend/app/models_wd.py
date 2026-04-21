"""Work Design Lab — SQLAlchemy models.

Supports: WD job queue with wave planning, JA↔WD inheritance/sync,
per-field conflict resolution, decision audit log.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Text, Boolean,
    ForeignKey, JSON,
)
from sqlalchemy.orm import relationship

from app.auth import Base, engine


def _uid():
    return uuid.uuid4().hex[:12]


# ── Work Design Job ───────────────────────────────────────────────

class WorkDesignJob(Base):
    """A job being redesigned in the Work Design Lab.
    One row per job in the queue. Persists all 7-stage state."""
    __tablename__ = "wd_jobs"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)

    # Job identity
    title = Column(String(300), nullable=False)
    function = Column(String(200), default="")
    family = Column(String(200), default="")
    sub_family = Column(String(200), default="")
    track_code = Column(String(10), default="")
    level_code = Column(String(10), default="")

    # JA inheritance / provenance
    ja_source_job_id = Column(String, nullable=True)          # FK to JA role
    ja_source_version = Column(Integer, nullable=True)        # snapshot version at last sync
    sync_state = Column(String(20), default="manual")
    # synced | stale | conflict | manual | uploaded | broken
    last_synced_at = Column(DateTime, nullable=True)
    inherited_fields = Column(JSON, default=list)             # ["function","family",...]

    # Queue management
    wave = Column(String(20), default="unassigned")
    # wave_1 | wave_2 | wave_3 | deferred | out_of_scope | unassigned
    wd_status = Column(String(20), default="not_started")
    # not_started | in_progress | redesigned | deferred | out_of_scope
    current_stage = Column(String(20), nullable=True)
    # context | deconstruction | reconstruction | redeployment | impact | org_link | handoff
    stage_completion = Column(JSON, default=dict)
    # {"context": 0, "deconstruction": 0, ...} — 0 to 100

    assigned_to = Column(String(100), default="")

    # Stage data (JSON blobs — each stage persists its own state)
    context_data = Column(JSON, default=dict)
    # { business_case: "", business_case_type: "", scope_in: [], scope_out: [],
    #   success_criteria: [], stakeholders: [], related_jobs: [] }
    decon_rows = Column(JSON, default=list)
    # [ { task_id, task_name, workstream, ai_impact, est_hours, time_pct,
    #     time_saved_pct, task_type, interaction, logic, primary_skill, secondary_skill } ]
    redeploy_rows = Column(JSON, default=list)
    # [ { task_id, task_name, decision, technology, current_pct, new_pct,
    #     destination, future_skill, notes, confidence } ]
    recon_data = Column(JSON, default=dict)
    # Reconstruction results from backend compute
    scenario = Column(String(20), default="Balanced")
    # Conservative | Balanced | Aggressive

    handoff_data = Column(JSON, default=dict)
    # { summary_artifact: "", published_jd: "", change_impact: "",
    #   wave_notes: "", go_live_date: "", dependencies: [] }

    org_link_data = Column(JSON, default=dict)
    # { final_title: "", manager_role: "", direct_reports: [],
    #   location: "", work_arrangement: "" }

    # Sparkline KPIs (cached for queue display without loading full stage data)
    hours_freed = Column(Float, default=0.0)
    cost_delta = Column(Float, default=0.0)
    skill_shift_index = Column(Float, default=0.0)

    # Flags
    decon_submitted = Column(Boolean, default=False)
    redeploy_submitted = Column(Boolean, default=False)
    finalized = Column(Boolean, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    conflicts = relationship("SyncConflict", back_populates="wd_job",
                             cascade="all, delete-orphan")
    decisions = relationship("WDDecisionLog", back_populates="wd_job",
                             cascade="all, delete-orphan")


# ── Sync Conflicts ────────────────────────────────────────────────

class SyncConflict(Base):
    """Per-field conflict when JA changes affect WD state."""
    __tablename__ = "wd_sync_conflicts"

    id = Column(String, primary_key=True, default=_uid)
    wd_job_id = Column(String, ForeignKey("wd_jobs.id"), nullable=False, index=True)
    field_path = Column(String(200), nullable=False)    # e.g. "family", "track_code"
    ja_value = Column(JSON, default=None)
    wd_value = Column(JSON, default=None)
    ja_changed_at = Column(DateTime, nullable=True)
    wd_changed_at = Column(DateTime, nullable=True)
    resolution = Column(String(20), default="unresolved")
    # unresolved | accepted_ja | kept_wd | merged
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), default="")

    wd_job = relationship("WorkDesignJob", back_populates="conflicts")


# ── Decision Audit Log ────────────────────────────────────────────

class WDDecisionLog(Base):
    """Every field change logged with user, timestamp, before/after.
    Auto-populated on every save via backend diff."""
    __tablename__ = "wd_decision_log"

    id = Column(String, primary_key=True, default=_uid)
    wd_job_id = Column(String, ForeignKey("wd_jobs.id"), nullable=False, index=True)
    stage = Column(String(20), nullable=False)
    field = Column(String(200), nullable=False)
    old_value = Column(JSON, default=None)
    new_value = Column(JSON, default=None)
    user_id = Column(String(100), default="")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    wd_job = relationship("WorkDesignJob", back_populates="decisions")


# ── Create tables ─────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
