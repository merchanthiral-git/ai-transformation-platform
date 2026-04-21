"""Job Architecture Mapping — SQLAlchemy models.

Supports: mapping groups (split/merge), scenarios, archetypes,
structured level criteria, role justification, working notes,
configurable flag rules, and structured AI rationale.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Text, Boolean,
    ForeignKey, JSON, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.auth import Base, engine


def _uid():
    return uuid.uuid4().hex[:12]


# ── Framework definition ──────────────────────────────────────────

class JAFramework(Base):
    """Project-level framework: defines which functions, families,
    sub-families, tracks, and levels are valid for this engagement."""
    __tablename__ = "ja_frameworks"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")

    # Hierarchical structure stored as JSON:
    # { functions: [{ id, name, families: [{ id, name, sub_families: [{ id, name }] }] }] }
    structure = Column(JSON, default=dict)

    # Tracks and valid levels per track:
    # { tracks: [{ code: "P", name: "Professional", levels: ["P1","P2","P3","P4","P5","P6"] }, ...] }
    tracks = Column(JSON, default=dict)

    # Grade structure (client's existing grades, optional reference):
    # [{ code: "G12", name: "Grade 12", mapped_levels: ["P4","M2"] }]
    grades = Column(JSON, default=list)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    updated_by = Column(String(100), default="")

    criteria_dimensions = relationship("LevelCriteriaDimension", back_populates="framework",
                                       cascade="all, delete-orphan")
    criteria = relationship("LevelCriteria", back_populates="framework",
                            cascade="all, delete-orphan")
    archetypes = relationship("RoleArchetype", back_populates="framework",
                              cascade="all, delete-orphan")


class LevelCriteriaDimension(Base):
    """Configurable dimension for the level criteria grid.
    e.g. Scope of Impact, Autonomy, Complexity, Influence, Leadership.
    Consultant defines these per engagement."""
    __tablename__ = "ja_level_criteria_dimensions"

    id = Column(String, primary_key=True, default=_uid)
    framework_id = Column(String, ForeignKey("ja_frameworks.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)       # e.g. "Scope of Impact"
    description = Column(Text, default="")            # what this dimension measures
    sort_order = Column(Integer, default=0)

    framework = relationship("JAFramework", back_populates="criteria_dimensions")


class LevelCriteria(Base):
    """Structured criteria for a specific track+level on a specific dimension.
    One row per (framework, track, level, dimension) tuple.
    e.g. Track=P, Level=P3, Dimension=Scope → 'Owns delivery of a
    single workstream; impact within team boundaries.'"""
    __tablename__ = "ja_level_criteria"

    id = Column(String, primary_key=True, default=_uid)
    framework_id = Column(String, ForeignKey("ja_frameworks.id"), nullable=False, index=True)
    track_code = Column(String(10), nullable=False)   # "P", "T", "M", "E", "S"
    level_code = Column(String(10), nullable=False)   # "P3", "M2", etc.
    dimension_id = Column(String, ForeignKey("ja_level_criteria_dimensions.id"), nullable=False)
    criteria_text = Column(Text, default="")

    framework = relationship("JAFramework", back_populates="criteria")

    __table_args__ = (
        UniqueConstraint("framework_id", "track_code", "level_code", "dimension_id",
                         name="uq_level_criteria"),
    )


# ── Role archetypes ───────────────────────────────────────────────

class RoleArchetype(Base):
    """Base role definition that specializations inherit from.
    e.g. 'Senior Engineer' archetype with specializations for
    Platform, Mobile, ML, etc."""
    __tablename__ = "ja_role_archetypes"

    id = Column(String, primary_key=True, default=_uid)
    framework_id = Column(String, ForeignKey("ja_frameworks.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)         # "Senior Engineer"
    track_code = Column(String(10), nullable=False)
    level_code = Column(String(10), nullable=False)
    family_id = Column(String(100), default="")
    description = Column(Text, default="")
    responsibilities = Column(JSON, default=list)      # ["Leads technical design", ...]
    is_anchor = Column(Boolean, default=False)         # leveling anchor role

    framework = relationship("JAFramework", back_populates="archetypes")


# ── Scenarios ─────────────────────────────────────────────────────

class JAScenario(Base):
    """Named future-state scenario. A project can have multiple
    concurrent scenarios (e.g. 'Aggressive consolidation', 'Conservative').
    One is marked primary."""
    __tablename__ = "ja_scenarios"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    framework_id = Column(String, ForeignKey("ja_frameworks.id"), nullable=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    is_primary = Column(Boolean, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    created_by = Column(String(100), default="")

    future_roles = relationship("FutureStateRole", back_populates="scenario",
                                cascade="all, delete-orphan")
    mapping_groups = relationship("MappingGroup", back_populates="scenario",
                                  cascade="all, delete-orphan")


# ── Current & Future State Roles ──────────────────────────────────

class CurrentStateRole(Base):
    """One row per role in the client's current-state catalogue.
    Populated from CSV import or from in-memory workforce data."""
    __tablename__ = "ja_current_roles"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    title = Column(String(300), nullable=False)
    function_group = Column(String(200), default="")   # optional — not all clients use it
    family = Column(String(200), default="")
    sub_family = Column(String(200), default="")
    track_code = Column(String(10), default="")
    level_code = Column(String(10), default="")
    people_manager = Column(Boolean, default=False)
    incumbent_count = Column(Integer, default=0)
    grade_code = Column(String(20), default="")        # client's existing grade
    location = Column(String(200), default="")         # available locations
    source_job_code = Column(String(50), default="")   # HRIS job code
    raw_data = Column(JSON, default=dict)              # original CSV row for reference

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class FutureStateRole(Base):
    """One row per role in the future-state architecture.
    Scoped to a scenario."""
    __tablename__ = "ja_future_roles"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    scenario_id = Column(String, ForeignKey("ja_scenarios.id"), nullable=False, index=True)
    archetype_id = Column(String, ForeignKey("ja_role_archetypes.id"), nullable=True)

    title = Column(String(300), nullable=False)
    function_group = Column(String(200), default="")
    family = Column(String(200), default="")
    sub_family = Column(String(200), default="")
    track_code = Column(String(10), default="")
    level_code = Column(String(10), default="")
    people_manager = Column(Boolean, default=False)
    incumbent_count = Column(Integer, default=0)
    grade_code = Column(String(20), default="")
    location = Column(String(200), default="")
    target_job_code = Column(String(50), default="")

    # Role justification — why this role exists / was created / eliminated
    justification = Column(Text, default="")
    # Consultant working notes — internal only, not shown to client
    working_notes = Column(Text, default="")
    # Leveling anchor
    is_anchor = Column(Boolean, default=False)

    # Lifecycle: proposed, active, deprecated, retired, archived
    lifecycle_state = Column(String(20), default="proposed")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    updated_by = Column(String(100), default="")

    scenario = relationship("JAScenario", back_populates="future_roles")


# ── Mapping Groups (split/merge support) ──────────────────────────

class MappingGroup(Base):
    """A mapping group represents a transformation pattern:
    1:1, 1:many (split), many:1 (merge), or many:many.
    All RoleMappings within a group are part of the same logical change."""
    __tablename__ = "ja_mapping_groups"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    scenario_id = Column(String, ForeignKey("ja_scenarios.id"), nullable=False, index=True)

    # Pattern type for display purposes
    pattern = Column(String(20), default="one_to_one")  # one_to_one, split, merge, new, sunset

    # AI suggestion metadata — structured rationale
    ai_rationale = Column(JSON, default=dict)
    # {
    #   "summary": "Role evolving toward ML-assisted analytics...",
    #   "signals": [
    #     { "type": "title_match", "detail": "Title contains 'Senior'", "weight": 0.3 },
    #     { "type": "jd_language", "detail": "JD mentions 'mentors junior analysts'", "weight": 0.25 },
    #     { "type": "peer_comparison", "detail": "Similar roles in Engineering at P3", "weight": 0.25 },
    #     { "type": "incumbent_count", "detail": "12 incumbents typical for P3-P4", "weight": 0.2 },
    #   ],
    #   "benchmark_source": "Mercer IPE"
    # }
    confidence_score = Column(Float, default=0.0)       # 0.0–1.0
    mapping_status = Column(String(20), default="unmapped")
    # unmapped | ai_suggested | confirmed | rejected | changes_requested

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    updated_by = Column(String(100), default="")

    entries = relationship("RoleMapping", back_populates="group",
                           cascade="all, delete-orphan")
    scenario = relationship("JAScenario", back_populates="mapping_groups")


class RoleMapping(Base):
    """Single entry in a mapping group. Direction indicates whether this
    role is a source (current state) or target (future state) in the group."""
    __tablename__ = "ja_role_mappings"

    id = Column(String, primary_key=True, default=_uid)
    group_id = Column(String, ForeignKey("ja_mapping_groups.id"), nullable=False, index=True)
    direction = Column(String(10), nullable=False)     # "source" or "target"
    current_role_id = Column(String, ForeignKey("ja_current_roles.id"), nullable=True)
    future_role_id = Column(String, ForeignKey("ja_future_roles.id"), nullable=True)

    group = relationship("MappingGroup", back_populates="entries")


# ── Job Descriptions ──────────────────────────────────────────────

class JobDescription(Base):
    """One JD per role, with upload metadata."""
    __tablename__ = "ja_job_descriptions"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    role_id = Column(String, nullable=False, index=True)  # current or future role ID
    role_type = Column(String(10), default="future")       # "current" or "future"
    filename = Column(String(300), default="")
    file_key = Column(String(300), default="")             # storage key
    content_text = Column(Text, default="")                # extracted plain text
    content_structured = Column(JSON, default=dict)
    # { "summary": "...", "responsibilities": [...], "qualifications": [...], "scope": "..." }

    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    uploaded_by = Column(String(100), default="")


# ── Configurable Flag Rules ───────────────────────────────────────

class FlagRule(Base):
    """Configurable data integrity rule definition."""
    __tablename__ = "ja_flag_rules"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    rule_key = Column(String(50), nullable=False)      # machine key: "min_incumbents", "duplicate_title", etc.
    operator = Column(String(20), default="")           # gte, lte, eq, neq, duplicate, missing
    threshold = Column(Float, nullable=True)
    severity = Column(String(10), default="warning")    # info, warning, error
    enabled = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class FlagViolation(Base):
    """Active flag violation on a specific role."""
    __tablename__ = "ja_flag_violations"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    rule_id = Column(String, ForeignKey("ja_flag_rules.id"), nullable=False, index=True)
    role_id = Column(String, nullable=False, index=True)
    role_type = Column(String(10), default="future")      # "current" or "future"
    detail = Column(Text, default="")                      # human-readable violation detail
    suppressed = Column(Boolean, default=False)
    suppressed_note = Column(Text, default="")
    suppressed_by = Column(String(100), default="")
    suppressed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Audit Trail ───────────────────────────────────────────────────

class JAAuditEntry(Base):
    """Every edit logged: user, timestamp, before/after."""
    __tablename__ = "ja_audit_trail"

    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, index=True, nullable=False)
    entity_type = Column(String(50), nullable=False)     # "mapping", "role", "framework", "flag"
    entity_id = Column(String, nullable=False)
    action = Column(String(20), nullable=False)          # "create", "update", "delete"
    before_data = Column(JSON, default=dict)
    after_data = Column(JSON, default=dict)
    user_id = Column(String(100), default="")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Create tables ─────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
