"""Synthesis Module Data Models — covers Modules 7-10.

Module 7: AI Recommendations — cross-module synthesis into actionable interventions
Module 8: Skills & Talent — talent profiles with gap/adjacency analysis (persistent layer)
Module 9: Skills Map Engine — skill taxonomy with O*NET (persistent layer)
Module 10: Change Readiness — change absorption profile with 4-quadrant model

Modules 8-9 already have strong implementations; these models add persistence.
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
#  MODULE 7: AI RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════════

class Recommendation(Base):
    """Actionable intervention synthesized from multiple module findings."""
    __tablename__ = "synth_recommendations"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    title = Column(String(300), nullable=False)
    category = Column(String(30), default="process")
    # process | technology | people | structure | governance

    # Scoring
    impact_score = Column(Float, default=50.0)
    feasibility_score = Column(Float, default=50.0)
    priority_score = Column(Float, default=50.0)
    investment_tier = Column(String(20), default="should_do")
    # must_do | should_do | could_do

    # Content
    description = Column(Text, default="")
    rationale = Column(Text, default="")
    expected_outcome = Column(Text, default="")
    implementation_notes = Column(Text, default="")

    # Source findings from other modules
    source_findings = Column(JSON, default=list)
    # [{ module: "opportunity_scan", finding_id: "...", finding_summary: "..." }]

    # Affected entities
    affected_roles = Column(JSON, default=list)
    affected_functions = Column(JSON, default=list)
    headcount_impact = Column(Integer, default=0)

    # Dependencies
    dependencies = Column(JSON, default=list)
    # [{ recommendation_id, type: "blocks" | "enables" }]

    # Roadmap placement
    roadmap_wave = Column(String(20), default="")  # wave_1 | wave_2 | wave_3
    estimated_duration = Column(String(50), default="")
    strategic_alignment = Column(Float, default=50.0)

    # Status
    status = Column(String(20), default="proposed")
    # proposed | accepted | in_progress | completed | rejected | deferred

    # AI rationale
    ai_rationale = Column(JSON, default=dict)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════════════
#  MODULE 8: SKILLS & TALENT (persistent layer)
# ═══════════════════════════════════════════════════════════════════

class TalentSkillProfile(Base):
    """Persistent skill profile for an individual or role."""
    __tablename__ = "synth_talent_profiles"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    entity_type = Column(String(20), default="role")  # individual | role
    entity_id = Column(String, default="")
    entity_name = Column(String(300), default="")
    function = Column(String(200), default="")
    family = Column(String(200), default="")

    # Current skills
    current_skills = Column(JSON, default=list)
    # [{ skill: "Python", proficiency: 3, source: "assessment" }]

    # Required skills (for role profiles)
    required_skills = Column(JSON, default=list)
    # [{ skill: "Python", min_proficiency: 3 }]

    # Gaps
    skill_gaps = Column(JSON, default=list)
    # [{ skill: "ML Engineering", current: 1, required: 3, gap: 2 }]

    # Adjacencies
    skill_adjacencies = Column(JSON, default=list)
    # [{ from_skill: "Python", to_skill: "ML Engineering", distance: 0.3 }]

    # Sourcing strategy
    sourcing_strategy = Column(String(20), default="build")
    # build | buy | borrow

    gap_score = Column(Float, default=0.0)  # 0-100, higher = more gaps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════════════
#  MODULE 9: SKILLS MAP ENGINE (persistent taxonomy layer)
# ═══════════════════════════════════════════════════════════════════

class SkillTaxonomyEntry(Base):
    """Persistent skill in the engagement's taxonomy (extends O*NET base)."""
    __tablename__ = "synth_skill_taxonomy"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    skill_name = Column(String(200), nullable=False)
    category = Column(String(100), default="")  # technical | functional | leadership | adaptive
    subcategory = Column(String(100), default="")
    description = Column(Text, default="")
    source = Column(String(20), default="onet")  # onet | manual | imported
    onet_code = Column(String(20), default="")

    # Proficiency levels
    proficiency_definitions = Column(JSON, default=dict)
    # { 1: "Awareness", 2: "Working knowledge", 3: "Practitioner", 4: "Expert", 5: "Authority" }

    # Relationships
    related_skills = Column(JSON, default=list)
    # [{ skill_id: "...", relationship: "prerequisite" | "adjacent" | "complementary" }]

    # Engagement-specific extensions
    is_critical = Column(Boolean, default=False)
    criticality_reason = Column(Text, default="")
    role_count = Column(Integer, default=0)  # how many roles need this skill

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════════════════════════
#  MODULE 10: CHANGE READINESS
# ═══════════════════════════════════════════════════════════════════

class ChangeReadinessProfile(Base):
    """Change absorption profile for a population unit."""
    __tablename__ = "synth_change_readiness"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    entity_type = Column(String(20), default="function")  # individual | team | function | org
    entity_id = Column(String, default="")
    entity_name = Column(String(300), default="")

    # 2-axis model
    willingness = Column(Float, default=50.0)  # 0-100
    ability = Column(Float, default=50.0)       # 0-100

    # Quadrant: Ready (high-high), Eager (high will, low ability),
    # Capable (low will, high ability), Resistant (low-low)
    quadrant = Column(String(20), default="capable")

    # Drivers
    willingness_drivers = Column(JSON, default=list)
    # [{ driver: "leadership_support", score: 70, weight: 0.3 }]
    ability_drivers = Column(JSON, default=list)
    # [{ driver: "digital_skills", score: 40, weight: 0.25 }]

    # Change load
    current_change_load = Column(Float, default=0.0)  # 0-100
    change_capacity = Column(Float, default=0.0)       # available capacity

    # Interventions
    recommended_interventions = Column(JSON, default=list)
    # [{ type: "communication", description: "...", priority: "high" }]

    headcount = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ChangeReadinessSnapshot(Base):
    """Point-in-time snapshot of org-wide change readiness."""
    __tablename__ = "synth_change_snapshots"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    snapshot_tag = Column(String(200), default="")
    org_willingness = Column(Float, default=0.0)
    org_ability = Column(Float, default=0.0)
    org_quadrant = Column(String(20), default="")
    quadrant_distribution = Column(JSON, default=dict)
    # { ready: 25, eager: 30, capable: 20, resistant: 25 }
    total_population = Column(Integer, default=0)
    change_load_avg = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


Base.metadata.create_all(bind=engine)
