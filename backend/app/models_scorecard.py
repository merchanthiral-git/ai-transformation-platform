"""Org Health Scorecard — SQLAlchemy models.

Supports: 6-dimension scorecard with persistent snapshots,
traffic-light thresholds, historical trend tracking,
configurable weights, AI interpretation.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Text, JSON,
)

from app.auth import Base, engine


def _uid():
    return uuid.uuid4().hex[:12]


class ScorecardSnapshot(Base):
    """Point-in-time snapshot of org health across 6 dimensions."""
    __tablename__ = "scorecard_snapshots"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    overall_score = Column(Float, default=0.0)
    snapshot_tag = Column(String(200), default="")
    # e.g. "Pre-intervention baseline", "Post-redesign", "Q2 check"

    # 6 dimension scores (0-100)
    structural_clarity = Column(Float, default=0.0)
    span_layer_discipline = Column(Float, default=0.0)
    leveling_integrity = Column(Float, default=0.0)
    workforce_composition = Column(Float, default=0.0)
    career_mobility = Column(Float, default=0.0)
    transformation_readiness = Column(Float, default=0.0)

    # Dimension weights (configurable per engagement)
    weights = Column(JSON, default=dict)
    # { "structural_clarity": 1.0, "span_layer_discipline": 1.0, ... }

    # Full metric data per dimension
    metrics = Column(JSON, default=dict)
    # { "structural_clarity": { "metrics": [{ "name": "...", "value": ..., "status": "green", "benchmark": ... }], "anomalies": [...] }, ... }

    # AI-generated interpretation
    interpretation = Column(Text, default="")
    dimension_interpretations = Column(JSON, default=dict)
    # { "structural_clarity": "The architecture shows...", ... }

    # Top issues and strengths
    top_issues = Column(JSON, default=list)
    top_strengths = Column(JSON, default=list)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(String(100), default="")


Base.metadata.create_all(bind=engine)
