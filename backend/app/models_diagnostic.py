"""Diagnostic Module Data Models — covers Modules 2-5.

Module 2: AI Opportunity Scan — persistent opportunity portfolio
Module 3: AI Impact Heatmap — exposure scores with overrides
Module 4: Role Clustering — cluster analysis with consolidation actions
Module 5: AI Readiness — assessment scores and segmentation

All modules share: engagement scoping, audit logging, structured AI rationale.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Text, Boolean,
    ForeignKey, JSON,
)

from app.auth import Base, engine


def _uid():
    return uuid.uuid4().hex[:12]


# ═══════════════════════════════════════════════════════════════════
#  MODULE 2: AI OPPORTUNITY SCAN
# ═══════════════════════════════════════════════════════════════════

class Opportunity(Base):
    """A discrete AI value creation opportunity."""
    __tablename__ = "diag_opportunities"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    title = Column(String(300), nullable=False)
    category = Column(String(20), default="augment")
    # automate | augment | accelerate | create
    status = Column(String(20), default="identified")
    # identified | scoped | validated | prioritized | in_roadmap | rejected | deferred

    # Scoring (0-100)
    impact_score = Column(Float, default=50.0)
    feasibility_score = Column(Float, default=50.0)
    combined_score = Column(Float, default=50.0)

    # Score components (structured breakdown)
    impact_components = Column(JSON, default=dict)
    # { headcount_reach: 70, time_value: 60, strategic_alignment: 80, quality: 50 }
    feasibility_components = Column(JSON, default=dict)
    # { tech_readiness: 80, data_readiness: 60, org_readiness: 50, change_complexity: 40 }

    # Details
    value_thesis = Column(Text, default="")
    current_state = Column(Text, default="")
    future_state = Column(Text, default="")
    change_magnitude = Column(String(20), default="moderate")
    # cosmetic | moderate | transformational

    # Affected entities
    affected_roles = Column(JSON, default=list)   # [{ role_id, role_title }]
    affected_activities = Column(JSON, default=list)
    headcount_impact = Column(Integer, default=0)

    # Evidence
    signals = Column(JSON, default=list)
    # [{ type: "pattern_match", signal: "repetitive data entry", strength: 0.8 }]
    risks = Column(JSON, default=list)
    # [{ risk: "...", severity: "high", mitigation: "..." }]
    dependencies = Column(JSON, default=list)
    # [{ opportunity_id, relationship: "blocks" }]

    # Assignment
    assigned_to = Column(String(100), default="")
    investment_tier = Column(String(20), default="")
    # must_do | should_do | could_do

    # AI rationale
    ai_rationale = Column(JSON, default=dict)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════════════
#  MODULE 3: AI IMPACT HEATMAP
# ═══════════════════════════════════════════════════════════════════

class ExposureScore(Base):
    """AI exposure score for a role or role group."""
    __tablename__ = "diag_exposure_scores"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    entity_type = Column(String(20), default="role")  # role | family | function
    entity_id = Column(String, default="")
    entity_name = Column(String(300), default="")
    function = Column(String(200), default="")
    family = Column(String(200), default="")

    # Score
    exposure_score = Column(Float, default=0.0)  # 0-100
    automation_potential = Column(Float, default=0.0)
    augmentation_potential = Column(Float, default=0.0)
    headcount = Column(Integer, default=0)

    # Score components
    components = Column(JSON, default=dict)
    # { repetitive_work_pct, data_intensity, rule_based_pct, ... }

    # Override
    is_overridden = Column(Boolean, default=False)
    override_score = Column(Float, nullable=True)
    override_reason = Column(Text, default="")
    override_by = Column(String(100), default="")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════════════
#  MODULE 4: ROLE CLUSTERING
# ═══════════════════════════════════════════════════════════════════

class RoleCluster(Base):
    """A group of roles identified as similar/duplicate."""
    __tablename__ = "diag_role_clusters"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    label = Column(String(200), default="")
    description = Column(Text, default="")
    confidence = Column(Float, default=0.0)  # 0-1
    role_count = Column(Integer, default=0)
    total_incumbents = Column(Integer, default=0)

    # Members
    members = Column(JSON, default=list)
    # [{ role_id, role_title, family, headcount, similarity_score }]

    # Evidence
    evidence = Column(JSON, default=list)
    # [{ type: "skill_overlap", detail: "85% skill match", weight: 0.4 }]

    # Recommendation
    recommendation = Column(String(20), default="review")
    # consolidate | differentiate | review | no_action
    consolidation_target = Column(String(300), default="")
    consolidation_rationale = Column(Text, default="")

    # Status
    status = Column(String(20), default="identified")
    # identified | reviewed | actioned | dismissed

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════════════
#  MODULE 5: AI READINESS
# ═══════════════════════════════════════════════════════════════════

class ReadinessAssessment(Base):
    """AI readiness assessment for a population unit (individual, team, function, org)."""
    __tablename__ = "diag_readiness"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    entity_type = Column(String(20), default="function")  # individual | team | function | org
    entity_id = Column(String, default="")
    entity_name = Column(String(300), default="")

    # 4 readiness dimensions (0-100)
    capability = Column(Float, default=50.0)  # skills and knowledge
    opportunity = Column(Float, default=50.0)  # role AI amenability
    motivation = Column(Float, default=50.0)  # willingness to adopt
    resources = Column(Float, default=50.0)   # tools, budget, support

    # Composite
    composite_score = Column(Float, default=50.0)
    readiness_tier = Column(String(20), default="emerging")
    # early | emerging | advanced

    # Segment (for 2x2 mapping)
    segment = Column(String(20), default="follower")
    # champion | follower | skeptic | unengaged

    # Components
    dimension_details = Column(JSON, default=dict)
    # { capability: { skills_gap: 30, digital_fluency: 60, ... }, ... }

    # Interventions
    recommended_interventions = Column(JSON, default=list)
    # [{ type: "training", area: "AI tools", priority: "high" }]

    headcount = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


Base.metadata.create_all(bind=engine)
