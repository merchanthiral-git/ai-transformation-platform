"""ODS (Org Design Studio) Workflow — SQLAlchemy models.

Supports: design sessions, layer states, visions, scenarios,
scenario nodes (org tree), and decision records.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, DateTime, Text, Boolean, JSON,
)

from app.auth import Base, engine


def _uid():
    return uuid.uuid4().hex[:12]


# ── Design Sessions ──────────────────────────────────────────────

class DesignSession(Base):
    """A scoped design session — one per layer-depth engagement.
    L0 sessions have parent_layer_id=null."""
    __tablename__ = "ods_design_sessions"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    parent_layer_id = Column(String, nullable=True)       # null for L0 sessions
    in_scope_layers = Column(JSON, default=list)           # array of layer depths
    vision_id = Column(String, nullable=True)
    status = Column(String(20), default="drafting")        # drafting/proposed/approved/archived
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_edited_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                            onupdate=lambda: datetime.now(timezone.utc))


# ── Layer States ─────────────────────────────────────────────────

class LayerState(Base):
    """Tracks the lifecycle of a single org layer within a session."""
    __tablename__ = "ods_layer_states"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    session_id = Column(String, nullable=True)
    layer_depth = Column(Integer, nullable=False)
    parent_layer_state_id = Column(String, nullable=True)
    status = Column(String(20), default="baseline")        # baseline/vision/drafting/proposed/approved/superseded
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String, nullable=True)
    locked = Column(Boolean, default=False)


# ── Visions ──────────────────────────────────────────────────────

class Vision(Base):
    """Design vision — principles, operating model narrative,
    constraints, and success criteria."""
    __tablename__ = "ods_visions"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    version = Column(Integer, default=1)
    principles = Column(JSON, default=list)
    operating_model_narrative = Column(Text, default="")
    constraints = Column(JSON, default=list)
    success_criteria = Column(JSON, default=list)
    source = Column(Text, default="")
    confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Scenarios ────────────────────────────────────────────────────

class Scenario(Base):
    """Named future-state scenario within a design session."""
    __tablename__ = "ods_scenarios"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    session_id = Column(String, nullable=False)
    layer_state_id = Column(String, nullable=True)
    name = Column(String(200), nullable=False)
    variant_type = Column(String(30), default="custom")    # cost_led/capability_led/speed_led/hybrid/custom
    parameters = Column(JSON, default=dict)
    status = Column(String(20), default="draft")           # draft/proposed/approved/discarded
    rationale = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_edited_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                            onupdate=lambda: datetime.now(timezone.utc))


# ── Scenario Nodes ───────────────────────────────────────────────

class ScenarioNode(Base):
    """Individual org-tree node within a scenario — represents
    a position/role with change tracking."""
    __tablename__ = "ods_scenario_nodes"

    id = Column(String, primary_key=True, default=_uid)
    scenario_id = Column(String, index=True, nullable=False)
    parent_node_id = Column(String, nullable=True)
    role_id = Column(String, nullable=True)
    employee_id = Column(String, nullable=True)
    title = Column(String(200), default="")
    function_id = Column(String(100), default="")
    level = Column(String(10), default="")
    track = Column(String(5), default="")
    comp = Column(Integer, default=0)
    change_type = Column(String(20), default="unchanged")  # unchanged/modified/created/eliminated/moved/merged/split
    change_rationale = Column(Text, default="")


# ── Decision Records ─────────────────────────────────────────────

class DecisionRecord(Base):
    """Captures approval decisions — which scenario was chosen,
    who approved, and the rationale."""
    __tablename__ = "ods_decision_records"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    session_id = Column(String, nullable=False)
    approved_scenario_id = Column(String, nullable=False)
    approver = Column(String(200), default="")
    approval_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    scenarios_considered = Column(JSON, default=list)
    rationale = Column(Text, default="")
    next_steps = Column(Text, default="")
    captured_by = Column(String, nullable=True)
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Create tables ─────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
