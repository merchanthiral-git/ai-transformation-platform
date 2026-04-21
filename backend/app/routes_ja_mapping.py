"""Job Architecture Mapping — API endpoints.

Covers: framework CRUD, bulk CSV import, mapping CRUD (split/merge),
catalogue health diagnostics, title-to-role collapse, flag evaluation,
and structured AI rationale.
"""

import csv
import io
import json
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Optional

from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.auth import SessionLocal
from app.models_ja import (
    JAFramework, LevelCriteriaDimension, LevelCriteria, RoleArchetype,
    JAScenario, CurrentStateRole, FutureStateRole,
    MappingGroup, RoleMapping, JobDescription,
    FlagRule, FlagViolation, JAAuditEntry,
)
from app.store import store
from app.helpers import get_series

router = APIRouter(prefix="/api/ja", tags=["ja-mapping"])


def _db():
    return SessionLocal()


def _now():
    return datetime.now(timezone.utc)


def _uid():
    return uuid.uuid4().hex[:12]


# ── Pydantic request models ──────────────────────────────────────

class FrameworkCreate(BaseModel):
    project_id: str
    name: str
    description: str = ""
    structure: dict = {}
    tracks: dict = {}
    grades: list = []

class FrameworkUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    structure: Optional[dict] = None
    tracks: Optional[dict] = None
    grades: Optional[list] = None

class DimensionCreate(BaseModel):
    name: str
    description: str = ""
    sort_order: int = 0

class CriteriaUpsert(BaseModel):
    track_code: str
    level_code: str
    dimension_id: str
    criteria_text: str

class ScenarioCreate(BaseModel):
    project_id: str
    name: str
    description: str = ""
    framework_id: Optional[str] = None
    is_primary: bool = False

class RoleMappingRequest(BaseModel):
    """Create or update a mapping group with its entries."""
    project_id: str
    scenario_id: str
    pattern: str = "one_to_one"  # one_to_one, split, merge, new, sunset
    source_role_ids: list[str] = []
    target_role_ids: list[str] = []
    mapping_status: str = "confirmed"
    confidence_score: float = 0.0
    ai_rationale: dict = {}

class BulkMappingAction(BaseModel):
    group_ids: list[str]
    action: str  # "accept", "reject"

class FutureRoleCreate(BaseModel):
    project_id: str
    scenario_id: str
    title: str
    function_group: str = ""
    family: str = ""
    sub_family: str = ""
    track_code: str = ""
    level_code: str = ""
    people_manager: bool = False
    justification: str = ""
    working_notes: str = ""
    is_anchor: bool = False
    archetype_id: Optional[str] = None

class FutureRoleUpdate(BaseModel):
    title: Optional[str] = None
    function_group: Optional[str] = None
    family: Optional[str] = None
    sub_family: Optional[str] = None
    track_code: Optional[str] = None
    level_code: Optional[str] = None
    people_manager: Optional[bool] = None
    justification: Optional[str] = None
    working_notes: Optional[str] = None
    is_anchor: Optional[bool] = None
    archetype_id: Optional[str] = None
    lifecycle_state: Optional[str] = None

class FlagRuleCreate(BaseModel):
    project_id: str
    name: str
    description: str = ""
    rule_key: str
    operator: str = ""
    threshold: Optional[float] = None
    severity: str = "warning"
    enabled: bool = True

class FlagSuppressRequest(BaseModel):
    note: str


# ═══════════════════════════════════════════════════════════════════
#  FRAMEWORK ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.post("/frameworks")
def create_framework(body: FrameworkCreate):
    db = _db()
    try:
        fw = JAFramework(
            id=_uid(), project_id=body.project_id, name=body.name,
            description=body.description, structure=body.structure,
            tracks=body.tracks, grades=body.grades,
        )
        db.add(fw)
        db.commit()
        return _fw_dict(fw)
    finally:
        db.close()


@router.get("/frameworks")
def list_frameworks(project_id: str):
    db = _db()
    try:
        fws = db.query(JAFramework).filter_by(project_id=project_id).all()
        return [_fw_dict(f) for f in fws]
    finally:
        db.close()


@router.get("/frameworks/{fw_id}")
def get_framework(fw_id: str):
    db = _db()
    try:
        fw = db.query(JAFramework).get(fw_id)
        if not fw:
            raise HTTPException(404, "Framework not found")
        # Include dimensions and criteria
        dims = db.query(LevelCriteriaDimension).filter_by(framework_id=fw_id)\
            .order_by(LevelCriteriaDimension.sort_order).all()
        criteria = db.query(LevelCriteria).filter_by(framework_id=fw_id).all()
        archetypes = db.query(RoleArchetype).filter_by(framework_id=fw_id).all()
        result = _fw_dict(fw)
        result["dimensions"] = [{"id": d.id, "name": d.name, "description": d.description,
                                  "sort_order": d.sort_order} for d in dims]
        result["criteria"] = [{"id": c.id, "track_code": c.track_code, "level_code": c.level_code,
                                "dimension_id": c.dimension_id, "criteria_text": c.criteria_text}
                               for c in criteria]
        result["archetypes"] = [{"id": a.id, "name": a.name, "track_code": a.track_code,
                                  "level_code": a.level_code, "family_id": a.family_id,
                                  "description": a.description, "responsibilities": a.responsibilities,
                                  "is_anchor": a.is_anchor} for a in archetypes]
        return result
    finally:
        db.close()


@router.put("/frameworks/{fw_id}")
def update_framework(fw_id: str, body: FrameworkUpdate):
    db = _db()
    try:
        fw = db.query(JAFramework).get(fw_id)
        if not fw:
            raise HTTPException(404, "Framework not found")
        for field in ["name", "description", "structure", "tracks", "grades"]:
            val = getattr(body, field)
            if val is not None:
                setattr(fw, field, val)
        fw.updated_at = _now()
        db.commit()
        return _fw_dict(fw)
    finally:
        db.close()


def _fw_dict(fw):
    return {
        "id": fw.id, "project_id": fw.project_id, "name": fw.name,
        "description": fw.description, "structure": fw.structure,
        "tracks": fw.tracks, "grades": fw.grades,
        "created_at": str(fw.created_at), "updated_at": str(fw.updated_at),
    }


# ── Level criteria dimensions ────────────────────────────────────

@router.post("/frameworks/{fw_id}/dimensions")
def add_dimension(fw_id: str, body: DimensionCreate):
    db = _db()
    try:
        dim = LevelCriteriaDimension(
            id=_uid(), framework_id=fw_id, name=body.name,
            description=body.description, sort_order=body.sort_order,
        )
        db.add(dim)
        db.commit()
        return {"id": dim.id, "name": dim.name, "description": dim.description,
                "sort_order": dim.sort_order}
    finally:
        db.close()


@router.put("/frameworks/{fw_id}/criteria")
def upsert_criteria(fw_id: str, body: list[CriteriaUpsert]):
    """Bulk upsert level criteria — one call sets all cells in the grid."""
    db = _db()
    try:
        for item in body:
            existing = db.query(LevelCriteria).filter_by(
                framework_id=fw_id, track_code=item.track_code,
                level_code=item.level_code, dimension_id=item.dimension_id,
            ).first()
            if existing:
                existing.criteria_text = item.criteria_text
            else:
                db.add(LevelCriteria(
                    id=_uid(), framework_id=fw_id, track_code=item.track_code,
                    level_code=item.level_code, dimension_id=item.dimension_id,
                    criteria_text=item.criteria_text,
                ))
        db.commit()
        return {"status": "ok", "count": len(body)}
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  SCENARIO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.post("/scenarios")
def create_scenario(body: ScenarioCreate):
    db = _db()
    try:
        if body.is_primary:
            # Un-primary existing scenarios
            db.query(JAScenario).filter_by(project_id=body.project_id)\
                .update({"is_primary": False})
        sc = JAScenario(
            id=_uid(), project_id=body.project_id, name=body.name,
            description=body.description, framework_id=body.framework_id,
            is_primary=body.is_primary,
        )
        db.add(sc)
        db.commit()
        return _sc_dict(sc)
    finally:
        db.close()


@router.get("/scenarios")
def list_scenarios(project_id: str):
    db = _db()
    try:
        scs = db.query(JAScenario).filter_by(project_id=project_id).all()
        return [_sc_dict(s) for s in scs]
    finally:
        db.close()


def _sc_dict(sc):
    return {
        "id": sc.id, "project_id": sc.project_id, "name": sc.name,
        "description": sc.description, "framework_id": sc.framework_id,
        "is_primary": sc.is_primary, "created_at": str(sc.created_at),
    }


# ═══════════════════════════════════════════════════════════════════
#  BULK CSV IMPORT (current-state roles)
# ═══════════════════════════════════════════════════════════════════

@router.post("/import")
async def bulk_import(project_id: str, file: UploadFile = File(...)):
    """Import current-state roles from CSV.
    Expected columns (flexible matching): Job Title, Function, Family,
    Sub-Family, Track, Level, Incumbent Count, Job Code, Location, Grade."""
    content = await file.read()
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    # Flexible column mapping
    ALIASES = {
        "title": ["job title", "title", "role title", "role name", "standard title", "job name"],
        "function_group": ["function group", "function id", "function", "job family group"],
        "family": ["family", "job family", "job_family"],
        "sub_family": ["sub-family", "sub_family", "subfamily", "sub family"],
        "track_code": ["track", "career track", "track code", "career_track"],
        "level_code": ["level", "career level", "level code", "career_level", "grade level"],
        "incumbent_count": ["incumbent count", "headcount", "incumbents", "count", "hc"],
        "source_job_code": ["job code", "job_code", "role code", "code"],
        "location": ["location", "geography", "geo", "country"],
        "grade_code": ["grade", "grade code", "pay grade"],
        "people_manager": ["manager or ic", "people manager", "manager", "is_manager"],
    }

    if not reader.fieldnames:
        raise HTTPException(400, "CSV has no headers")

    col_map = {}
    lower_fields = {f.lower().strip(): f for f in reader.fieldnames}
    for target, aliases in ALIASES.items():
        for alias in aliases:
            if alias in lower_fields:
                col_map[target] = lower_fields[alias]
                break

    if "title" not in col_map:
        raise HTTPException(400, "CSV must contain a Job Title column")

    db = _db()
    try:
        # Clear existing current-state roles for this project
        db.query(CurrentStateRole).filter_by(project_id=project_id).delete()

        rows = list(reader)
        created = []
        for row in rows:
            title = (row.get(col_map.get("title", ""), "") or "").strip()
            if not title:
                continue

            mgr_raw = (row.get(col_map.get("people_manager", ""), "") or "").strip().lower()
            is_mgr = mgr_raw in ("manager", "true", "yes", "1", "m", "mgr")

            try:
                hc = int(row.get(col_map.get("incumbent_count", ""), 0) or 0)
            except (ValueError, TypeError):
                hc = 0

            role = CurrentStateRole(
                id=_uid(), project_id=project_id, title=title,
                function_group=(row.get(col_map.get("function_group", ""), "") or "").strip(),
                family=(row.get(col_map.get("family", ""), "") or "").strip(),
                sub_family=(row.get(col_map.get("sub_family", ""), "") or "").strip(),
                track_code=(row.get(col_map.get("track_code", ""), "") or "").strip(),
                level_code=(row.get(col_map.get("level_code", ""), "") or "").strip(),
                people_manager=is_mgr,
                incumbent_count=hc,
                grade_code=(row.get(col_map.get("grade_code", ""), "") or "").strip(),
                location=(row.get(col_map.get("location", ""), "") or "").strip(),
                source_job_code=(row.get(col_map.get("source_job_code", ""), "") or "").strip(),
                raw_data=dict(row),
            )
            db.add(role)
            created.append(role)

        db.commit()
        return {
            "status": "ok",
            "imported": len(created),
            "columns_mapped": {k: v for k, v in col_map.items()},
            "columns_unmapped": [f for f in (reader.fieldnames or [])
                                 if f not in col_map.values()],
        }
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  CURRENT-STATE ROLES (read)
# ═══════════════════════════════════════════════════════════════════

@router.get("/current-roles")
def list_current_roles(project_id: str, page: int = 0, page_size: int = 50):
    db = _db()
    try:
        q = db.query(CurrentStateRole).filter_by(project_id=project_id)
        total = q.count()
        roles = q.order_by(CurrentStateRole.title).offset(page * page_size).limit(page_size).all()
        return {
            "roles": [_current_role_dict(r) for r in roles],
            "total": total, "page": page, "page_size": page_size,
        }
    finally:
        db.close()


def _current_role_dict(r):
    return {
        "id": r.id, "title": r.title, "function_group": r.function_group,
        "family": r.family, "sub_family": r.sub_family,
        "track_code": r.track_code, "level_code": r.level_code,
        "people_manager": r.people_manager, "incumbent_count": r.incumbent_count,
        "grade_code": r.grade_code, "location": r.location,
        "source_job_code": r.source_job_code,
    }


# ═══════════════════════════════════════════════════════════════════
#  FUTURE-STATE ROLES (CRUD)
# ═══════════════════════════════════════════════════════════════════

@router.post("/future-roles")
def create_future_role(body: FutureRoleCreate):
    db = _db()
    try:
        role = FutureStateRole(
            id=_uid(), project_id=body.project_id, scenario_id=body.scenario_id,
            title=body.title, function_group=body.function_group,
            family=body.family, sub_family=body.sub_family,
            track_code=body.track_code, level_code=body.level_code,
            people_manager=body.people_manager, justification=body.justification,
            working_notes=body.working_notes, is_anchor=body.is_anchor,
            archetype_id=body.archetype_id,
        )
        db.add(role)
        db.commit()
        return _future_role_dict(role)
    finally:
        db.close()


@router.get("/future-roles")
def list_future_roles(project_id: str, scenario_id: str,
                      page: int = 0, page_size: int = 50):
    db = _db()
    try:
        q = db.query(FutureStateRole).filter_by(
            project_id=project_id, scenario_id=scenario_id)
        total = q.count()
        roles = q.order_by(FutureStateRole.title).offset(page * page_size).limit(page_size).all()
        return {
            "roles": [_future_role_dict(r) for r in roles],
            "total": total, "page": page, "page_size": page_size,
        }
    finally:
        db.close()


@router.put("/future-roles/{role_id}")
def update_future_role(role_id: str, body: FutureRoleUpdate):
    db = _db()
    try:
        role = db.query(FutureStateRole).get(role_id)
        if not role:
            raise HTTPException(404, "Role not found")
        for field in ["title", "function_group", "family", "sub_family", "track_code",
                       "level_code", "people_manager", "justification", "working_notes",
                       "is_anchor", "archetype_id", "lifecycle_state"]:
            val = getattr(body, field)
            if val is not None:
                setattr(role, field, val)
        role.updated_at = _now()
        db.commit()

        # Re-evaluate flags after mapping change
        _evaluate_flags(db, role.project_id, role.scenario_id)

        return _future_role_dict(role)
    finally:
        db.close()


@router.delete("/future-roles/{role_id}")
def delete_future_role(role_id: str):
    db = _db()
    try:
        role = db.query(FutureStateRole).get(role_id)
        if not role:
            raise HTTPException(404, "Role not found")
        db.delete(role)
        db.commit()
        return {"status": "deleted"}
    finally:
        db.close()


def _future_role_dict(r):
    return {
        "id": r.id, "project_id": r.project_id, "scenario_id": r.scenario_id,
        "title": r.title, "function_group": r.function_group,
        "family": r.family, "sub_family": r.sub_family,
        "track_code": r.track_code, "level_code": r.level_code,
        "people_manager": r.people_manager, "incumbent_count": r.incumbent_count,
        "grade_code": r.grade_code, "location": r.location,
        "justification": r.justification, "working_notes": r.working_notes,
        "is_anchor": r.is_anchor, "archetype_id": r.archetype_id,
        "lifecycle_state": r.lifecycle_state,
        "updated_at": str(r.updated_at), "updated_by": r.updated_by,
    }


# ═══════════════════════════════════════════════════════════════════
#  MAPPING GROUPS (split/merge support)
# ═══════════════════════════════════════════════════════════════════

@router.post("/mappings")
def create_mapping(body: RoleMappingRequest):
    db = _db()
    try:
        group = MappingGroup(
            id=_uid(), project_id=body.project_id, scenario_id=body.scenario_id,
            pattern=body.pattern, mapping_status=body.mapping_status,
            confidence_score=body.confidence_score, ai_rationale=body.ai_rationale,
        )
        db.add(group)

        for src_id in body.source_role_ids:
            db.add(RoleMapping(id=_uid(), group_id=group.id,
                               direction="source", current_role_id=src_id))
        for tgt_id in body.target_role_ids:
            db.add(RoleMapping(id=_uid(), group_id=group.id,
                               direction="target", future_role_id=tgt_id))
        db.commit()

        _evaluate_flags(db, body.project_id, body.scenario_id)

        return _mapping_group_dict(db, group)
    finally:
        db.close()


@router.get("/mappings")
def list_mappings(project_id: str, scenario_id: str,
                  status: Optional[str] = None, page: int = 0, page_size: int = 50):
    db = _db()
    try:
        q = db.query(MappingGroup).filter_by(
            project_id=project_id, scenario_id=scenario_id)
        if status:
            q = q.filter_by(mapping_status=status)
        total = q.count()
        groups = q.order_by(MappingGroup.updated_at.desc())\
            .offset(page * page_size).limit(page_size).all()
        return {
            "mappings": [_mapping_group_dict(db, g) for g in groups],
            "total": total, "page": page, "page_size": page_size,
        }
    finally:
        db.close()


@router.put("/mappings/{group_id}")
def update_mapping(group_id: str, body: RoleMappingRequest):
    db = _db()
    try:
        group = db.query(MappingGroup).get(group_id)
        if not group:
            raise HTTPException(404, "Mapping group not found")
        group.pattern = body.pattern
        group.mapping_status = body.mapping_status
        group.confidence_score = body.confidence_score
        group.ai_rationale = body.ai_rationale
        group.updated_at = _now()

        # Replace entries
        db.query(RoleMapping).filter_by(group_id=group_id).delete()
        for src_id in body.source_role_ids:
            db.add(RoleMapping(id=_uid(), group_id=group.id,
                               direction="source", current_role_id=src_id))
        for tgt_id in body.target_role_ids:
            db.add(RoleMapping(id=_uid(), group_id=group.id,
                               direction="target", future_role_id=tgt_id))
        db.commit()

        _evaluate_flags(db, group.project_id, group.scenario_id)

        return _mapping_group_dict(db, group)
    finally:
        db.close()


@router.post("/mappings/bulk-action")
def bulk_mapping_action(body: BulkMappingAction):
    db = _db()
    try:
        status_map = {"accept": "confirmed", "reject": "rejected"}
        new_status = status_map.get(body.action)
        if not new_status:
            raise HTTPException(400, f"Unknown action: {body.action}")
        updated = 0
        for gid in body.group_ids:
            group = db.query(MappingGroup).get(gid)
            if group:
                group.mapping_status = new_status
                group.updated_at = _now()
                updated += 1
        db.commit()
        return {"status": "ok", "updated": updated}
    finally:
        db.close()


def _mapping_group_dict(db, g):
    entries = db.query(RoleMapping).filter_by(group_id=g.id).all()
    sources, targets = [], []
    for e in entries:
        if e.direction == "source" and e.current_role_id:
            role = db.query(CurrentStateRole).get(e.current_role_id)
            if role:
                sources.append(_current_role_dict(role))
        elif e.direction == "target" and e.future_role_id:
            role = db.query(FutureStateRole).get(e.future_role_id)
            if role:
                targets.append(_future_role_dict(role))
    return {
        "id": g.id, "project_id": g.project_id, "scenario_id": g.scenario_id,
        "pattern": g.pattern, "mapping_status": g.mapping_status,
        "confidence_score": g.confidence_score, "ai_rationale": g.ai_rationale,
        "sources": sources, "targets": targets,
        "updated_at": str(g.updated_at), "updated_by": g.updated_by,
    }


# ═══════════════════════════════════════════════════════════════════
#  MAPPING GRID — combined current+future view
# ═══════════════════════════════════════════════════════════════════

@router.get("/mapping-grid")
def get_mapping_grid(project_id: str, scenario_id: str,
                     search: str = "", status: str = "",
                     family: str = "", track: str = "", level: str = "",
                     sort_by: str = "title", sort_dir: str = "asc",
                     page: int = 0, page_size: int = 50):
    """Returns the merged grid data: every current-state role with its
    corresponding future-state mapping (if any)."""
    db = _db()
    try:
        # Get all current roles
        current_roles = db.query(CurrentStateRole).filter_by(project_id=project_id).all()

        # Get all mapping groups + entries for this scenario
        groups = db.query(MappingGroup).filter_by(
            project_id=project_id, scenario_id=scenario_id).all()

        # Build lookup: current_role_id → mapping group
        current_to_group = {}
        for g in groups:
            entries = db.query(RoleMapping).filter_by(group_id=g.id).all()
            for e in entries:
                if e.direction == "source" and e.current_role_id:
                    current_to_group[e.current_role_id] = (g, entries)

        # Get all future roles for target lookup
        future_lookup = {}
        for g in groups:
            entries = db.query(RoleMapping).filter_by(group_id=g.id).all()
            for e in entries:
                if e.direction == "target" and e.future_role_id:
                    fr = db.query(FutureStateRole).get(e.future_role_id)
                    if fr:
                        future_lookup.setdefault(g.id, []).append(fr)

        # Get flag violations for badge display
        violations = db.query(FlagViolation).filter_by(
            project_id=project_id, suppressed=False).all()
        violation_by_role = defaultdict(list)
        for v in violations:
            violation_by_role[v.role_id].append(v.detail)

        # Assemble grid rows
        rows = []
        for cr in current_roles:
            mapping_info = current_to_group.get(cr.id)
            group = mapping_info[0] if mapping_info else None

            future_roles = future_lookup.get(group.id, []) if group else []
            primary_future = future_roles[0] if future_roles else None

            # Determine status
            if group:
                ms = group.mapping_status
            else:
                ms = "unmapped"

            # Compute change dimensions
            changes = []
            if primary_future:
                for dim in ["function_group", "family", "sub_family", "track_code", "level_code"]:
                    cur_val = getattr(cr, dim, "")
                    fut_val = getattr(primary_future, dim, "")
                    if cur_val and fut_val and cur_val != fut_val:
                        changes.append(dim)

            # Track change flag (IC ↔ Manager)
            ic_tracks = {"P", "T", "S"}
            mgr_tracks = {"M", "E"}
            track_change = False
            if primary_future and cr.track_code and primary_future.track_code:
                cur_is_ic = cr.track_code in ic_tracks
                fut_is_ic = primary_future.track_code in ic_tracks
                if cur_is_ic != fut_is_ic:
                    track_change = True

            row = {
                "current": _current_role_dict(cr),
                "future": _future_role_dict(primary_future) if primary_future else None,
                "mapping_group_id": group.id if group else None,
                "mapping_status": ms,
                "confidence_score": group.confidence_score if group else 0,
                "ai_rationale": group.ai_rationale if group else {},
                "pattern": group.pattern if group else None,
                "changes": changes,
                "track_change": track_change,
                "change_count": len(changes),
                "flags": violation_by_role.get(cr.id, []),
                "future_flags": violation_by_role.get(primary_future.id, []) if primary_future else [],
            }
            rows.append(row)

        # Apply filters
        if search:
            s = search.lower()
            rows = [r for r in rows if s in r["current"]["title"].lower()]
        if status:
            rows = [r for r in rows if r["mapping_status"] == status]
        if family:
            rows = [r for r in rows if r["current"]["family"] == family]
        if track:
            rows = [r for r in rows if r["current"]["track_code"] == track]
        if level:
            rows = [r for r in rows if r["current"]["level_code"] == level]

        # Sort
        def sort_key(r):
            if sort_by == "title":
                return r["current"]["title"].lower()
            elif sort_by == "status":
                return r["mapping_status"]
            elif sort_by == "incumbent_count":
                return r["current"]["incumbent_count"]
            elif sort_by == "change_count":
                return r["change_count"]
            return r["current"]["title"].lower()

        rows.sort(key=sort_key, reverse=(sort_dir == "desc"))

        total = len(rows)
        paged = rows[page * page_size: (page + 1) * page_size]

        # Summary stats
        status_counts = Counter(r["mapping_status"] for r in rows)

        return {
            "rows": paged,
            "total": total, "page": page, "page_size": page_size,
            "summary": {
                "total_roles": total,
                "mapped": status_counts.get("confirmed", 0),
                "ai_suggested": status_counts.get("ai_suggested", 0),
                "unmapped": status_counts.get("unmapped", 0),
                "rejected": status_counts.get("rejected", 0),
                "total_flags": sum(len(r["flags"]) + len(r["future_flags"]) for r in rows),
            },
        }
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  CATALOGUE HEALTH DIAGNOSTICS
# ═══════════════════════════════════════════════════════════════════

@router.get("/catalogue-health")
def get_catalogue_health(project_id: str, model_id: str = ""):
    """One-page diagnostic on the client's current-state data.
    Works with both DB-imported roles and in-memory workforce data."""
    db = _db()
    try:
        # Try DB roles first, fall back to in-memory workforce
        db_roles = db.query(CurrentStateRole).filter_by(project_id=project_id).all()

        if db_roles:
            titles = [r.title for r in db_roles]
            families = [r.family for r in db_roles if r.family]
            levels = [r.level_code for r in db_roles if r.level_code]
            tracks = [r.track_code for r in db_roles if r.track_code]
            hc_map = {r.title: r.incumbent_count for r in db_roles}
            total_incumbents = sum(r.incumbent_count for r in db_roles)
            role_families = {r.title: r.family for r in db_roles}
        else:
            # Fall back to in-memory data
            mid = model_id or store.resolve_model_id(model_id or "Demo_Model")
            if mid not in store.datasets:
                return {"diagnostics": {}, "issues": []}
            data = store.get_filtered_data(mid, {"func": "All", "jf": "All", "sf": "All", "cl": "All"})
            wf = data.get("workforce")
            if wf is None or wf.empty:
                return {"diagnostics": {}, "issues": []}
            titles = get_series(wf, "Job Title").dropna().astype(str).tolist() if "Job Title" in wf.columns else []
            families = get_series(wf, "Job Family").dropna().astype(str).tolist() if "Job Family" in wf.columns else []
            levels = get_series(wf, "Career Level").dropna().astype(str).tolist() if "Career Level" in wf.columns else []
            tracks = get_series(wf, "Career Track").dropna().astype(str).tolist() if "Career Track" in wf.columns else []
            hc_map = Counter(titles)
            total_incumbents = len(titles)
            role_families = {}
            if "Job Title" in wf.columns and "Job Family" in wf.columns:
                for _, row in wf.iterrows():
                    t = str(row.get("Job Title", ""))
                    f = str(row.get("Job Family", ""))
                    if t:
                        role_families[t] = f

        unique_titles = set(titles)
        title_counts = Counter(titles)

        # Duplicate titles (exact match)
        duplicates = {t: c for t, c in title_counts.items() if c > 1}

        # Ghost roles (in catalogue but 0 incumbents)
        ghost_roles = [t for t, hc in hc_map.items() if hc == 0]

        # Title inflation: distinct titles per 100 employees
        inflation_rate = (len(unique_titles) / max(total_incumbents, 1)) * 100

        # Titles per family
        family_title_counts = Counter(families)
        titles_per_family = {}
        fam_titles = defaultdict(set)
        for t in unique_titles:
            f = role_families.get(t, "")
            if f:
                fam_titles[f].add(t)
        titles_per_family = {f: len(ts) for f, ts in fam_titles.items()}

        # Missing data
        roles_no_family = sum(1 for r in (db_roles or []) if not r.family) if db_roles else 0
        roles_no_level = sum(1 for r in (db_roles or []) if not r.level_code) if db_roles else 0
        roles_no_track = sum(1 for r in (db_roles or []) if not r.track_code) if db_roles else 0

        issues = []
        if len(ghost_roles) > 0:
            issues.append({"severity": "warning", "category": "Ghost Roles",
                           "title": f"{len(ghost_roles)} ghost roles",
                           "detail": "Roles in catalogue with zero incumbents"})
        if inflation_rate > 30:
            issues.append({"severity": "critical", "category": "Title Inflation",
                           "title": f"Title inflation: {inflation_rate:.0f} titles per 100 employees",
                           "detail": "Healthy range is 15-25 per 100. Consider title consolidation before mapping."})
        if len(duplicates) > 5:
            issues.append({"severity": "warning", "category": "Duplicates",
                           "title": f"{len(duplicates)} duplicate titles",
                           "detail": "Same title appears in multiple catalogue entries"})
        if roles_no_family > 0:
            issues.append({"severity": "warning", "category": "Missing Data",
                           "title": f"{roles_no_family} roles without a family assignment",
                           "detail": "These roles need family assignment before mapping"})

        return {
            "diagnostics": {
                "total_roles": len(unique_titles),
                "total_incumbents": total_incumbents,
                "title_inflation_rate": round(inflation_rate, 1),
                "ghost_roles_count": len(ghost_roles),
                "duplicate_titles_count": len(duplicates),
                "roles_missing_family": roles_no_family,
                "roles_missing_level": roles_no_level,
                "roles_missing_track": roles_no_track,
                "titles_per_family": titles_per_family,
                "families_count": len(set(families)),
            },
            "ghost_roles": ghost_roles[:50],
            "duplicate_titles": dict(list(duplicates.items())[:50]),
            "issues": issues,
        }
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  TITLE-TO-ROLE COLLAPSE (fuzzy matching)
# ═══════════════════════════════════════════════════════════════════

@router.get("/title-collapse")
def get_title_collapse(project_id: str, threshold: float = 0.82):
    """Find similar titles that likely collapse into the same role.
    Uses SequenceMatcher for fuzzy matching (no new dependencies)."""
    db = _db()
    try:
        roles = db.query(CurrentStateRole).filter_by(project_id=project_id).all()
        titles = list({r.title for r in roles if r.title})

        # Normalize for comparison
        def normalize(t):
            return t.lower().replace(",", "").replace(".", "").replace("-", " ").strip()

        clusters = []
        used = set()
        normalized = {t: normalize(t) for t in titles}

        for i, t1 in enumerate(titles):
            if t1 in used:
                continue
            group = [t1]
            for t2 in titles[i + 1:]:
                if t2 in used:
                    continue
                ratio = SequenceMatcher(None, normalized[t1], normalized[t2]).ratio()
                if ratio >= threshold:
                    group.append(t2)
                    used.add(t2)
            if len(group) > 1:
                used.add(t1)
                # Find the most common form as the suggested canonical title
                hc_totals = {}
                for t in group:
                    matching = [r for r in roles if r.title == t]
                    hc_totals[t] = sum(r.incumbent_count for r in matching)
                canonical = max(group, key=lambda t: hc_totals.get(t, 0))
                clusters.append({
                    "canonical": canonical,
                    "variants": group,
                    "total_incumbents": sum(hc_totals.get(t, 0) for t in group),
                    "count": len(group),
                })

        clusters.sort(key=lambda c: c["total_incumbents"], reverse=True)
        return {
            "clusters": clusters[:100],
            "total_clusters": len(clusters),
            "titles_affected": sum(c["count"] for c in clusters),
            "threshold": threshold,
        }
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  FLAG RULES & EVALUATION
# ═══════════════════════════════════════════════════════════════════

@router.get("/flag-rules")
def list_flag_rules(project_id: str):
    db = _db()
    try:
        rules = db.query(FlagRule).filter_by(project_id=project_id)\
            .order_by(FlagRule.sort_order).all()
        return [_flag_rule_dict(r) for r in rules]
    finally:
        db.close()


@router.post("/flag-rules")
def create_flag_rule(body: FlagRuleCreate):
    db = _db()
    try:
        rule = FlagRule(
            id=_uid(), project_id=body.project_id, name=body.name,
            description=body.description, rule_key=body.rule_key,
            operator=body.operator, threshold=body.threshold,
            severity=body.severity, enabled=body.enabled,
        )
        db.add(rule)
        db.commit()
        return _flag_rule_dict(rule)
    finally:
        db.close()


@router.put("/flag-rules/{rule_id}")
def update_flag_rule(rule_id: str, body: FlagRuleCreate):
    db = _db()
    try:
        rule = db.query(FlagRule).get(rule_id)
        if not rule:
            raise HTTPException(404, "Rule not found")
        for field in ["name", "description", "rule_key", "operator", "threshold",
                       "severity", "enabled"]:
            setattr(rule, field, getattr(body, field))
        db.commit()
        return _flag_rule_dict(rule)
    finally:
        db.close()


@router.post("/flag-rules/seed")
def seed_default_rules(project_id: str):
    """Create the 11 default flag rules for a project."""
    db = _db()
    try:
        existing = db.query(FlagRule).filter_by(project_id=project_id).count()
        if existing > 0:
            return {"status": "skipped", "message": "Rules already exist"}

        defaults = [
            ("min_incumbents", "Minimum incumbents per role",
             "Flag roles with fewer than N incumbents", "lte", 10, "warning"),
            ("max_incumbents", "Maximum incumbents per role",
             "Flag roles with more than N incumbents (consolidation candidate)", "gte", 100, "info"),
            ("duplicate_title", "Duplicate title across families",
             "Same role title appears in multiple families", "duplicate", None, "warning"),
            ("missing_sub_family", "Missing sub-family",
             "Roles without a sub-family assignment", "missing", None, "warning"),
            ("missing_level", "Missing level",
             "Roles without a level assignment", "missing", None, "error"),
            ("track_level_mismatch", "Track-level mismatch",
             "Level is not valid for the selected track", "mismatch", None, "error"),
            ("ic_manager_flag", "IC role flagged as manager",
             "P or T track roles with people_manager=true", "conflict", None, "error"),
            ("manager_no_reports", "Manager with no direct reports",
             "M/E track roles where all incumbents have zero direct reports", "conflict", None, "warning"),
            ("orphaned_sub_family", "Orphaned sub-family",
             "Sub-families that don't belong to any family in the future state", "orphan", None, "warning"),
            ("family_size_floor", "Family size floor",
             "Families with fewer than N roles", "lte", 10, "warning"),
            ("manager_ic_pair", "Manager-IC pair integrity",
             "Manager roles without corresponding IC track, or vice versa", "conflict", None, "warning"),
        ]

        for i, (key, name, desc, op, thresh, sev) in enumerate(defaults):
            db.add(FlagRule(
                id=_uid(), project_id=project_id, name=name,
                description=desc, rule_key=key, operator=op,
                threshold=thresh, severity=sev, enabled=True, sort_order=i,
            ))
        db.commit()
        return {"status": "ok", "seeded": len(defaults)}
    finally:
        db.close()


@router.get("/flags")
def list_flag_violations(project_id: str, scenario_id: str = "",
                         include_suppressed: bool = False):
    db = _db()
    try:
        q = db.query(FlagViolation).filter_by(project_id=project_id)
        if not include_suppressed:
            q = q.filter_by(suppressed=False)
        violations = q.all()

        # Group by rule
        rules = {r.id: r for r in db.query(FlagRule).filter_by(project_id=project_id).all()}
        grouped = defaultdict(list)
        for v in violations:
            rule = rules.get(v.rule_id)
            grouped[v.rule_id].append({
                "id": v.id, "role_id": v.role_id, "role_type": v.role_type,
                "detail": v.detail, "suppressed": v.suppressed,
                "suppressed_note": v.suppressed_note,
            })

        result = []
        for rule_id, items in grouped.items():
            rule = rules.get(rule_id)
            if rule:
                result.append({
                    "rule": _flag_rule_dict(rule),
                    "violations": items,
                    "count": len(items),
                })

        result.sort(key=lambda r: {"error": 0, "warning": 1, "info": 2}.get(
            r["rule"]["severity"], 3))
        return {"groups": result, "total": sum(r["count"] for r in result)}
    finally:
        db.close()


@router.post("/flags/{violation_id}/suppress")
def suppress_flag(violation_id: str, body: FlagSuppressRequest):
    db = _db()
    try:
        v = db.query(FlagViolation).get(violation_id)
        if not v:
            raise HTTPException(404, "Violation not found")
        v.suppressed = True
        v.suppressed_note = body.note
        v.suppressed_at = _now()
        db.commit()
        return {"status": "suppressed"}
    finally:
        db.close()


def _flag_rule_dict(r):
    return {
        "id": r.id, "project_id": r.project_id, "name": r.name,
        "description": r.description, "rule_key": r.rule_key,
        "operator": r.operator, "threshold": r.threshold,
        "severity": r.severity, "enabled": r.enabled,
    }


def _evaluate_flags(db, project_id, scenario_id):
    """Re-evaluate all enabled flag rules and persist violations."""
    rules = db.query(FlagRule).filter_by(project_id=project_id, enabled=True).all()
    if not rules:
        return

    future_roles = db.query(FutureStateRole).filter_by(
        project_id=project_id, scenario_id=scenario_id).all()
    current_roles = db.query(CurrentStateRole).filter_by(project_id=project_id).all()

    # Clear non-suppressed violations and re-evaluate
    db.query(FlagViolation).filter_by(
        project_id=project_id, suppressed=False).delete()

    for rule in rules:
        key = rule.rule_key
        threshold = rule.threshold

        if key == "min_incumbents" and threshold is not None:
            for r in future_roles:
                if r.incumbent_count < threshold:
                    db.add(FlagViolation(
                        id=_uid(), project_id=project_id, rule_id=rule.id,
                        role_id=r.id, role_type="future",
                        detail=f"{r.title}: {r.incumbent_count} incumbents (min {int(threshold)})",
                    ))

        elif key == "max_incumbents" and threshold is not None:
            for r in future_roles:
                if r.incumbent_count > threshold:
                    db.add(FlagViolation(
                        id=_uid(), project_id=project_id, rule_id=rule.id,
                        role_id=r.id, role_type="future",
                        detail=f"{r.title}: {r.incumbent_count} incumbents (max {int(threshold)})",
                    ))

        elif key == "duplicate_title":
            title_families = defaultdict(set)
            for r in future_roles:
                if r.family:
                    title_families[r.title].add(r.family)
            for title, fams in title_families.items():
                if len(fams) > 1:
                    matching = [r for r in future_roles if r.title == title]
                    for r in matching:
                        db.add(FlagViolation(
                            id=_uid(), project_id=project_id, rule_id=rule.id,
                            role_id=r.id, role_type="future",
                            detail=f"'{title}' appears in families: {', '.join(sorted(fams))}",
                        ))

        elif key == "missing_sub_family":
            for r in future_roles:
                if not r.sub_family:
                    db.add(FlagViolation(
                        id=_uid(), project_id=project_id, rule_id=rule.id,
                        role_id=r.id, role_type="future",
                        detail=f"{r.title}: missing sub-family assignment",
                    ))

        elif key == "missing_level":
            for r in future_roles:
                if not r.level_code:
                    db.add(FlagViolation(
                        id=_uid(), project_id=project_id, rule_id=rule.id,
                        role_id=r.id, role_type="future",
                        detail=f"{r.title}: missing level assignment",
                    ))

        elif key == "ic_manager_flag":
            for r in future_roles:
                if r.track_code in ("P", "T", "S") and r.people_manager:
                    db.add(FlagViolation(
                        id=_uid(), project_id=project_id, rule_id=rule.id,
                        role_id=r.id, role_type="future",
                        detail=f"{r.title}: {r.track_code} track but flagged as people manager",
                    ))

        elif key == "family_size_floor" and threshold is not None:
            family_counts = Counter(r.family for r in future_roles if r.family)
            for fam, count in family_counts.items():
                if count < threshold:
                    matching = [r for r in future_roles if r.family == fam]
                    for r in matching[:1]:  # flag once per family
                        db.add(FlagViolation(
                            id=_uid(), project_id=project_id, rule_id=rule.id,
                            role_id=r.id, role_type="future",
                            detail=f"Family '{fam}' has only {count} roles (min {int(threshold)})",
                        ))

        elif key == "manager_ic_pair":
            # For each family, check that manager tracks have IC counterparts
            family_tracks = defaultdict(set)
            for r in future_roles:
                if r.family and r.track_code:
                    family_tracks[r.family].add(r.track_code)
            mgr_tracks = {"M", "E"}
            ic_tracks = {"P", "T", "S"}
            for fam, trks in family_tracks.items():
                has_mgr = bool(trks & mgr_tracks)
                has_ic = bool(trks & ic_tracks)
                if has_mgr and not has_ic:
                    matching = [r for r in future_roles
                                if r.family == fam and r.track_code in mgr_tracks]
                    for r in matching[:1]:
                        db.add(FlagViolation(
                            id=_uid(), project_id=project_id, rule_id=rule.id,
                            role_id=r.id, role_type="future",
                            detail=f"Family '{fam}' has manager roles but no IC track defined",
                        ))

        elif key == "orphaned_sub_family":
            future_families = {r.family for r in future_roles if r.family}
            future_sf = {(r.sub_family, r.family) for r in future_roles if r.sub_family}
            for sf, fam in future_sf:
                if fam not in future_families:
                    matching = [r for r in future_roles if r.sub_family == sf]
                    for r in matching[:1]:
                        db.add(FlagViolation(
                            id=_uid(), project_id=project_id, rule_id=rule.id,
                            role_id=r.id, role_type="future",
                            detail=f"Sub-family '{sf}' belongs to family '{fam}' which has no roles",
                        ))

    db.commit()


# ═══════════════════════════════════════════════════════════════════
#  JOB DESCRIPTIONS
# ═══════════════════════════════════════════════════════════════════

@router.get("/roles/{role_id}/jd")
def get_job_description(role_id: str):
    db = _db()
    try:
        jd = db.query(JobDescription).filter_by(role_id=role_id).first()
        if not jd:
            return {"jd": None}
        return {"jd": {
            "id": jd.id, "filename": jd.filename, "content_text": jd.content_text,
            "content_structured": jd.content_structured,
            "uploaded_at": str(jd.uploaded_at), "uploaded_by": jd.uploaded_by,
        }}
    finally:
        db.close()


@router.post("/roles/{role_id}/jd")
async def upload_job_description(role_id: str, project_id: str,
                                  role_type: str = "future",
                                  file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8-sig", errors="replace")

    db = _db()
    try:
        # Replace existing
        existing = db.query(JobDescription).filter_by(role_id=role_id).first()
        if existing:
            db.delete(existing)

        jd = JobDescription(
            id=_uid(), project_id=project_id, role_id=role_id,
            role_type=role_type, filename=file.filename or "",
            content_text=text,
        )
        db.add(jd)
        db.commit()
        return {"status": "ok", "jd_id": jd.id, "filename": jd.filename}
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  EMPLOYEES (from in-memory workforce data)
# ═══════════════════════════════════════════════════════════════════

@router.get("/roles/{role_id}/employees")
def get_role_employees(role_id: str, project_id: str, model_id: str = "",
                       page: int = 0, page_size: int = 25,
                       search: str = "", sort_by: str = "name"):
    """Get employees for a role. Reads from in-memory workforce data."""
    db = _db()
    try:
        # Get role title
        role = db.query(CurrentStateRole).get(role_id)
        if not role:
            role = db.query(FutureStateRole).get(role_id)
        if not role:
            return {"employees": [], "total": 0}

        title = role.title
    finally:
        db.close()

    # Look up employees from in-memory workforce
    mid = model_id or "Demo_Model"
    mid = store.resolve_model_id(mid)
    if mid not in store.datasets:
        return {"employees": [], "total": 0}

    data = store.get_filtered_data(mid, {"func": "All", "jf": "All", "sf": "All", "cl": "All"})
    wf = data.get("workforce")
    if wf is None or wf.empty or "Job Title" not in wf.columns:
        return {"employees": [], "total": 0}

    # Filter to employees in this role
    mask = get_series(wf, "Job Title").astype(str).str.strip() == title
    matched = wf[mask]

    employees = []
    for _, row in matched.iterrows():
        emp = {
            "id": str(row.get("Employee ID", "")),
            "name": str(row.get("Employee Name", "")),
            "title": str(row.get("Job Title", "")),
            "function": str(row.get("Function ID", "")),
            "family": str(row.get("Job Family", "")),
            "sub_family": str(row.get("Sub-Family", "")),
            "track": str(row.get("Career Track", "")),
            "level": str(row.get("Career Level", "")),
            "location": str(row.get("Geography", "")),
            "manager": str(row.get("Manager Name", "")),
            "department": str(row.get("Department", "")),
        }
        # Synthetic tenure
        seed = hash(emp["id"]) % 1000
        emp["tenure"] = round(1 + (seed % 15) + (seed % 7) * 0.3, 1)
        emp["employment_type"] = "Full-time"

        # Working title mismatch detection
        emp["working_title_mismatch"] = False
        if emp["title"] and emp["name"]:
            # Flag if job title from HRIS doesn't match the mapped role title
            # (will be more meaningful once mapping connects roles)
            pass

        employees.append(emp)

    # Search
    if search:
        s = search.lower()
        employees = [e for e in employees
                     if s in e["name"].lower() or s in e["id"].lower()]

    # Sort
    sort_keys = {"name": "name", "tenure": "tenure", "location": "location", "manager": "manager"}
    sk = sort_keys.get(sort_by, "name")
    employees.sort(key=lambda e: (e.get(sk, "") or ""))

    total = len(employees)
    paged = employees[page * page_size: (page + 1) * page_size]
    return {"employees": paged, "total": total, "page": page, "page_size": page_size}
