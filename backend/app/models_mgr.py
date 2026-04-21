"""Manager Capability Module — SQLAlchemy models.

Supports: capability assessments across 5 dimensions, segmentation
(Champion/Capable/Developing/Blocker/Detached), champion identification,
blocker flagging, development recommendations, historical tracking.
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


class ManagerAssessment(Base):
    """Capability assessment for a single manager.
    One row per manager per assessment cycle."""
    __tablename__ = "mgr_assessments"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    employee_id = Column(String, index=True, nullable=False)
    employee_name = Column(String(200), default="")
    job_title = Column(String(300), default="")
    function = Column(String(200), default="")
    family = Column(String(200), default="")
    track_code = Column(String(10), default="")
    level_code = Column(String(10), default="")
    direct_reports_count = Column(Integer, default=0)
    tenure_years = Column(Float, default=0.0)

    # 5 capability dimension scores (0-100)
    ai_fluency = Column(Float, default=50.0)
    change_leadership = Column(Float, default=50.0)
    coaching_development = Column(Float, default=50.0)
    strategic_thinking = Column(Float, default=50.0)
    digital_adoption = Column(Float, default=50.0)

    # Composite score (weighted average of dimensions)
    composite_score = Column(Float, default=50.0)

    # Segmentation
    segment = Column(String(20), default="capable")
    # champion | capable | developing | blocker | detached

    # Direct report readiness (avg readiness of their team)
    team_readiness_score = Column(Float, default=0.0)
    team_size = Column(Integer, default=0)

    # Flags
    is_champion_candidate = Column(Boolean, default=False)
    is_blocker_flagged = Column(Boolean, default=False)
    blocker_reason = Column(Text, default="")

    # Development recommendation
    development_priority = Column(String(20), default="")  # high, medium, low
    development_areas = Column(JSON, default=list)
    # [{ "area": "AI fluency", "gap": 30, "recommendation": "..." }]

    # Assessment metadata
    assessment_source = Column(String(20), default="computed")
    # computed | self_assessed | 360_lite | manual
    notes = Column(Text, default="")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class ManagerSnapshot(Base):
    """Point-in-time snapshot of manager capability across the org.
    Enables trend tracking across assessment cycles."""
    __tablename__ = "mgr_snapshots"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    snapshot_tag = Column(String(200), default="")
    total_managers = Column(Integer, default=0)
    avg_composite = Column(Float, default=0.0)
    segment_counts = Column(JSON, default=dict)
    # { "champion": 5, "capable": 20, "developing": 15, "blocker": 3, "detached": 2 }
    dimension_avgs = Column(JSON, default=dict)
    # { "ai_fluency": 45, "change_leadership": 62, ... }
    champion_count = Column(Integer, default=0)
    blocker_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(String(100), default="")


Base.metadata.create_all(bind=engine)
