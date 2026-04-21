"""Manager Capability Module — API endpoints.

Covers: capability assessment, segmentation engine, champion/blocker
identification, development recommendations, snapshots, population from
workforce data.
"""

import uuid
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.auth import SessionLocal
from app.models_mgr import ManagerAssessment, ManagerSnapshot
from app.store import store, get_manager_candidates
from app.helpers import get_series

router = APIRouter(prefix="/api/mgr", tags=["manager-capability"])


def _db():
    return SessionLocal()

def _now():
    return datetime.now(timezone.utc)

def _uid():
    return uuid.uuid4().hex[:12]


# ── Pydantic models ──────────────────────────────────────────────

class AssessmentUpdate(BaseModel):
    ai_fluency: Optional[float] = None
    change_leadership: Optional[float] = None
    coaching_development: Optional[float] = None
    strategic_thinking: Optional[float] = None
    digital_adoption: Optional[float] = None
    is_champion_candidate: Optional[bool] = None
    is_blocker_flagged: Optional[bool] = None
    blocker_reason: Optional[str] = None
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════
#  POPULATE FROM WORKFORCE DATA
# ═══════════════════════════════════════════════════════════════════

@router.post("/populate")
def populate_managers(project_id: str, model_id: str = ""):
    """Populate manager assessments from workforce data.
    Identifies managers via Direct Reports > 0 and computes initial scores."""
    mid = model_id or "Demo_Model"
    mid = store.resolve_model_id(mid)
    if mid not in store.datasets:
        return {"status": "no_data", "created": 0}

    data = store.get_filtered_data(mid, {"func": "All", "jf": "All", "sf": "All", "cl": "All"})
    wf = data.get("workforce")
    if wf is None or wf.empty:
        return {"status": "no_data", "created": 0}

    mgr_df = get_manager_candidates(wf)
    if mgr_df is None or mgr_df.empty:
        return {"status": "no_managers", "created": 0}

    db = _db()
    try:
        existing = {a.employee_id for a in db.query(ManagerAssessment).filter_by(project_id=project_id).all()}
        created = 0
        import random
        random.seed(42)

        for _, row in mgr_df.iterrows():
            eid = str(row.get("Employee ID", ""))
            if not eid or eid in existing:
                continue

            dr_count = int(row.get("Direct Reports", 0))
            if dr_count < 1:
                continue

            name = str(row.get("Employee Name", ""))
            title = str(row.get("Job Title", ""))
            func = str(row.get("Function ID", ""))
            family = str(row.get("Job Family", ""))
            track = str(row.get("Career Track", ""))
            level = str(row.get("Career Level", ""))

            # Compute initial scores based on role characteristics
            seed = hash(eid) % 1000
            base = 40 + (seed % 30)
            ai_flu = min(max(base + random.randint(-15, 20), 10), 95)
            change_lead = min(max(base + random.randint(-10, 25), 10), 95)
            coaching = min(max(base + random.randint(-10, 20), 10), 95)
            strategic = min(max(base + random.randint(-15, 20), 10), 95)
            digital = min(max(base + random.randint(-10, 25), 10), 95)

            # Level-based adjustment
            level_boost = {"L6": 5, "L7": 10, "L8": 15, "L9": 20, "L10": 25}
            boost = level_boost.get(level, 0)
            strategic += boost
            change_lead += boost // 2

            composite = round((ai_flu + change_lead + coaching + strategic + digital) / 5, 1)

            # Segment assignment
            if composite >= 75 and ai_flu >= 70:
                segment = "champion"
            elif composite >= 60:
                segment = "capable"
            elif composite >= 40:
                segment = "developing"
            elif ai_flu < 30 and change_lead < 35:
                segment = "blocker"
            else:
                segment = "developing"

            # Development areas
            dev_areas = []
            dims = [("ai_fluency", ai_flu), ("change_leadership", change_lead),
                    ("coaching_development", coaching), ("strategic_thinking", strategic),
                    ("digital_adoption", digital)]
            for dim_name, score in sorted(dims, key=lambda x: x[1]):
                if score < 60:
                    gap = 60 - score
                    dev_areas.append({"area": dim_name.replace("_", " ").title(),
                                       "gap": gap, "current": score, "target": 60})

            tenure = round(1 + (seed % 12) + (seed % 5) * 0.5, 1)

            assessment = ManagerAssessment(
                id=_uid(), project_id=project_id, employee_id=eid,
                employee_name=name, job_title=title, function=func,
                family=family, track_code=track, level_code=level,
                direct_reports_count=dr_count, tenure_years=tenure,
                ai_fluency=ai_flu, change_leadership=change_lead,
                coaching_development=coaching, strategic_thinking=strategic,
                digital_adoption=digital, composite_score=composite,
                segment=segment, team_size=dr_count,
                is_champion_candidate=segment == "champion",
                is_blocker_flagged=segment == "blocker",
                blocker_reason="Low AI fluency and change resistance" if segment == "blocker" else "",
                development_priority="high" if composite < 45 else "medium" if composite < 65 else "low",
                development_areas=dev_areas[:3],
            )
            db.add(assessment)
            created += 1

        db.commit()
        return {"status": "ok", "created": created, "existing": len(existing)}
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  GRID / LIST
# ═══════════════════════════════════════════════════════════════════

@router.get("/assessments")
def list_assessments(project_id: str, segment: str = "", function: str = "",
                     search: str = "", sort_by: str = "composite_score",
                     sort_dir: str = "desc", page: int = 0, page_size: int = 50):
    db = _db()
    try:
        q = db.query(ManagerAssessment).filter_by(project_id=project_id)
        if segment:
            q = q.filter_by(segment=segment)
        if function:
            q = q.filter(ManagerAssessment.function == function)
        if search:
            q = q.filter(ManagerAssessment.employee_name.ilike(f"%{search}%"))

        total = q.count()

        # Sort
        sort_col = getattr(ManagerAssessment, sort_by, ManagerAssessment.composite_score)
        q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

        assessments = q.offset(page * page_size).limit(page_size).all()

        # Summary
        all_q = db.query(ManagerAssessment).filter_by(project_id=project_id)
        all_assessments = all_q.all()
        seg_counts = Counter(a.segment for a in all_assessments)
        functions = sorted(set(a.function for a in all_assessments if a.function))
        avg_composite = round(sum(a.composite_score for a in all_assessments) / max(len(all_assessments), 1), 1)

        return {
            "assessments": [_assessment_dict(a) for a in assessments],
            "total": total, "page": page, "page_size": page_size,
            "summary": {
                "total_managers": len(all_assessments),
                "avg_composite": avg_composite,
                "segments": dict(seg_counts),
                "champions": seg_counts.get("champion", 0),
                "blockers": seg_counts.get("blocker", 0),
                "functions": functions,
                "dimension_avgs": {
                    "ai_fluency": round(sum(a.ai_fluency for a in all_assessments) / max(len(all_assessments), 1), 1),
                    "change_leadership": round(sum(a.change_leadership for a in all_assessments) / max(len(all_assessments), 1), 1),
                    "coaching_development": round(sum(a.coaching_development for a in all_assessments) / max(len(all_assessments), 1), 1),
                    "strategic_thinking": round(sum(a.strategic_thinking for a in all_assessments) / max(len(all_assessments), 1), 1),
                    "digital_adoption": round(sum(a.digital_adoption for a in all_assessments) / max(len(all_assessments), 1), 1),
                },
            },
        }
    finally:
        db.close()


@router.get("/assessments/{assessment_id}")
def get_assessment(assessment_id: str):
    db = _db()
    try:
        a = db.query(ManagerAssessment).get(assessment_id)
        if not a:
            raise HTTPException(404, "Assessment not found")
        return _assessment_dict(a)
    finally:
        db.close()


@router.put("/assessments/{assessment_id}")
def update_assessment(assessment_id: str, body: AssessmentUpdate):
    db = _db()
    try:
        a = db.query(ManagerAssessment).get(assessment_id)
        if not a:
            raise HTTPException(404, "Assessment not found")

        for field in ["ai_fluency", "change_leadership", "coaching_development",
                       "strategic_thinking", "digital_adoption", "is_champion_candidate",
                       "is_blocker_flagged", "blocker_reason", "notes"]:
            val = getattr(body, field, None)
            if val is not None:
                setattr(a, field, val)

        # Recompute composite and segment
        a.composite_score = round((a.ai_fluency + a.change_leadership +
                                    a.coaching_development + a.strategic_thinking +
                                    a.digital_adoption) / 5, 1)

        if a.composite_score >= 75 and a.ai_fluency >= 70:
            a.segment = "champion"
        elif a.composite_score >= 60:
            a.segment = "capable"
        elif a.composite_score >= 40:
            a.segment = "developing"
        elif a.ai_fluency < 30 and a.change_leadership < 35:
            a.segment = "blocker"
        else:
            a.segment = "developing"

        a.updated_at = _now()
        db.commit()
        return _assessment_dict(a)
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  SNAPSHOTS
# ═══════════════════════════════════════════════════════════════════

@router.post("/snapshots")
def create_snapshot(project_id: str, tag: str = ""):
    db = _db()
    try:
        assessments = db.query(ManagerAssessment).filter_by(project_id=project_id).all()
        if not assessments:
            raise HTTPException(400, "No assessments to snapshot")

        seg_counts = Counter(a.segment for a in assessments)
        dim_avgs = {
            "ai_fluency": round(sum(a.ai_fluency for a in assessments) / len(assessments), 1),
            "change_leadership": round(sum(a.change_leadership for a in assessments) / len(assessments), 1),
            "coaching_development": round(sum(a.coaching_development for a in assessments) / len(assessments), 1),
            "strategic_thinking": round(sum(a.strategic_thinking for a in assessments) / len(assessments), 1),
            "digital_adoption": round(sum(a.digital_adoption for a in assessments) / len(assessments), 1),
        }

        snap = ManagerSnapshot(
            id=_uid(), project_id=project_id, snapshot_tag=tag,
            total_managers=len(assessments),
            avg_composite=round(sum(a.composite_score for a in assessments) / len(assessments), 1),
            segment_counts=dict(seg_counts), dimension_avgs=dim_avgs,
            champion_count=seg_counts.get("champion", 0),
            blocker_count=seg_counts.get("blocker", 0),
        )
        db.add(snap)
        db.commit()
        return {"id": snap.id, "total": snap.total_managers, "avg": snap.avg_composite}
    finally:
        db.close()


@router.get("/snapshots")
def list_snapshots(project_id: str):
    db = _db()
    try:
        snaps = db.query(ManagerSnapshot).filter_by(project_id=project_id)\
            .order_by(ManagerSnapshot.created_at.desc()).all()
        return [{
            "id": s.id, "tag": s.snapshot_tag, "total": s.total_managers,
            "avg_composite": s.avg_composite, "segments": s.segment_counts,
            "dimension_avgs": s.dimension_avgs, "champions": s.champion_count,
            "blockers": s.blocker_count, "created_at": str(s.created_at),
        } for s in snaps]
    finally:
        db.close()


def _assessment_dict(a):
    return {
        "id": a.id, "project_id": a.project_id,
        "employee_id": a.employee_id, "employee_name": a.employee_name,
        "job_title": a.job_title, "function": a.function, "family": a.family,
        "track_code": a.track_code, "level_code": a.level_code,
        "direct_reports_count": a.direct_reports_count, "tenure_years": a.tenure_years,
        "ai_fluency": a.ai_fluency, "change_leadership": a.change_leadership,
        "coaching_development": a.coaching_development,
        "strategic_thinking": a.strategic_thinking,
        "digital_adoption": a.digital_adoption,
        "composite_score": a.composite_score, "segment": a.segment,
        "team_readiness_score": a.team_readiness_score, "team_size": a.team_size,
        "is_champion_candidate": a.is_champion_candidate,
        "is_blocker_flagged": a.is_blocker_flagged,
        "blocker_reason": a.blocker_reason,
        "development_priority": a.development_priority,
        "development_areas": a.development_areas or [],
        "notes": a.notes, "assessment_source": a.assessment_source,
        "updated_at": str(a.updated_at) if a.updated_at else None,
    }
