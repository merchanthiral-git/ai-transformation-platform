"""Diagnostic Modules 2-5 — API endpoints.

Persistent CRUD for opportunities, exposure scores, role clusters,
and readiness assessments. Elevates the existing in-memory compute
with queryable, auditable persistence.
"""

import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.auth import SessionLocal
from app.models_diagnostic import (
    Opportunity, ExposureScore, RoleCluster, ReadinessAssessment,
)

router = APIRouter(prefix="/api/diag", tags=["diagnostics"])


def _db():
    return SessionLocal()

def _now():
    return datetime.now(timezone.utc)

def _uid():
    return uuid.uuid4().hex[:12]


# ═══════════════════════════════════════════════════════════════════
#  MODULE 2: AI OPPORTUNITY SCAN
# ═══════════════════════════════════════════════════════════════════

class OpportunityCreate(BaseModel):
    project_id: str
    title: str
    category: str = "augment"
    value_thesis: str = ""
    affected_roles: list = []
    headcount_impact: int = 0
    impact_score: float = 50.0
    feasibility_score: float = 50.0

class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    impact_score: Optional[float] = None
    feasibility_score: Optional[float] = None
    impact_components: Optional[dict] = None
    feasibility_components: Optional[dict] = None
    value_thesis: Optional[str] = None
    current_state: Optional[str] = None
    future_state: Optional[str] = None
    change_magnitude: Optional[str] = None
    assigned_to: Optional[str] = None
    investment_tier: Optional[str] = None
    risks: Optional[list] = None
    signals: Optional[list] = None


@router.post("/opportunities")
def create_opportunity(body: OpportunityCreate):
    db = _db()
    try:
        opp = Opportunity(
            id=_uid(), project_id=body.project_id, title=body.title,
            category=body.category, value_thesis=body.value_thesis,
            affected_roles=body.affected_roles, headcount_impact=body.headcount_impact,
            impact_score=body.impact_score, feasibility_score=body.feasibility_score,
            combined_score=round((body.impact_score + body.feasibility_score) / 2, 1),
        )
        db.add(opp)
        db.commit()
        return _opp_dict(opp)
    finally:
        db.close()


@router.get("/opportunities")
def list_opportunities(project_id: str, category: str = "", status: str = "",
                        sort_by: str = "combined_score", page: int = 0, page_size: int = 50):
    db = _db()
    try:
        q = db.query(Opportunity).filter_by(project_id=project_id)
        if category:
            q = q.filter_by(category=category)
        if status:
            q = q.filter_by(status=status)

        total = q.count()
        sort_col = getattr(Opportunity, sort_by, Opportunity.combined_score)
        opps = q.order_by(sort_col.desc()).offset(page * page_size).limit(page_size).all()

        # Summary
        all_opps = db.query(Opportunity).filter_by(project_id=project_id).all()
        cat_counts = Counter(o.category for o in all_opps)
        status_counts = Counter(o.status for o in all_opps)
        total_hc = sum(o.headcount_impact for o in all_opps)

        return {
            "opportunities": [_opp_dict(o) for o in opps],
            "total": total, "page": page, "page_size": page_size,
            "summary": {
                "total": len(all_opps),
                "categories": dict(cat_counts),
                "statuses": dict(status_counts),
                "total_headcount_impact": total_hc,
                "avg_impact": round(sum(o.impact_score for o in all_opps) / max(len(all_opps), 1), 1),
                "avg_feasibility": round(sum(o.feasibility_score for o in all_opps) / max(len(all_opps), 1), 1),
            },
        }
    finally:
        db.close()


@router.put("/opportunities/{opp_id}")
def update_opportunity(opp_id: str, body: OpportunityUpdate):
    db = _db()
    try:
        opp = db.query(Opportunity).get(opp_id)
        if not opp:
            raise HTTPException(404, "Opportunity not found")
        for field in ["title", "category", "status", "impact_score", "feasibility_score",
                       "impact_components", "feasibility_components", "value_thesis",
                       "current_state", "future_state", "change_magnitude",
                       "assigned_to", "investment_tier", "risks", "signals"]:
            val = getattr(body, field, None)
            if val is not None:
                setattr(opp, field, val)
        opp.combined_score = round((opp.impact_score + opp.feasibility_score) / 2, 1)
        opp.updated_at = _now()
        db.commit()
        return _opp_dict(opp)
    finally:
        db.close()


def _opp_dict(o):
    return {
        "id": o.id, "project_id": o.project_id, "title": o.title,
        "category": o.category, "status": o.status,
        "impact_score": o.impact_score, "feasibility_score": o.feasibility_score,
        "combined_score": o.combined_score,
        "impact_components": o.impact_components,
        "feasibility_components": o.feasibility_components,
        "value_thesis": o.value_thesis, "change_magnitude": o.change_magnitude,
        "affected_roles": o.affected_roles, "headcount_impact": o.headcount_impact,
        "signals": o.signals, "risks": o.risks,
        "assigned_to": o.assigned_to, "investment_tier": o.investment_tier,
        "updated_at": str(o.updated_at) if o.updated_at else None,
    }


# ═══════════════════════════════════════════════════════════════════
#  MODULE 3: AI IMPACT HEATMAP
# ═══════════════════════════════════════════════════════════════════

@router.get("/exposure")
def list_exposure_scores(project_id: str, entity_type: str = "",
                          function: str = ""):
    db = _db()
    try:
        q = db.query(ExposureScore).filter_by(project_id=project_id)
        if entity_type:
            q = q.filter_by(entity_type=entity_type)
        if function:
            q = q.filter(ExposureScore.function == function)
        scores = q.order_by(ExposureScore.exposure_score.desc()).all()
        return {
            "scores": [{
                "id": s.id, "entity_type": s.entity_type,
                "entity_name": s.entity_name, "function": s.function,
                "family": s.family, "exposure_score": s.exposure_score,
                "automation_potential": s.automation_potential,
                "augmentation_potential": s.augmentation_potential,
                "headcount": s.headcount, "is_overridden": s.is_overridden,
                "override_score": s.override_score,
            } for s in scores],
            "total": len(scores),
        }
    finally:
        db.close()


@router.put("/exposure/{score_id}/override")
def override_exposure(score_id: str, score: float, reason: str = ""):
    db = _db()
    try:
        s = db.query(ExposureScore).get(score_id)
        if not s:
            raise HTTPException(404, "Score not found")
        s.is_overridden = True
        s.override_score = score
        s.override_reason = reason
        db.commit()
        return {"status": "ok"}
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  MODULE 4: ROLE CLUSTERING
# ═══════════════════════════════════════════════════════════════════

@router.get("/clusters")
def list_clusters(project_id: str, status: str = "",
                   recommendation: str = ""):
    db = _db()
    try:
        q = db.query(RoleCluster).filter_by(project_id=project_id)
        if status:
            q = q.filter_by(status=status)
        if recommendation:
            q = q.filter_by(recommendation=recommendation)
        clusters = q.order_by(RoleCluster.confidence.desc()).all()
        return {
            "clusters": [{
                "id": c.id, "label": c.label, "description": c.description,
                "confidence": c.confidence, "role_count": c.role_count,
                "total_incumbents": c.total_incumbents,
                "members": c.members, "evidence": c.evidence,
                "recommendation": c.recommendation,
                "consolidation_target": c.consolidation_target,
                "status": c.status,
            } for c in clusters],
            "total": len(clusters),
            "consolidation_candidates": sum(1 for c in clusters if c.recommendation == "consolidate"),
        }
    finally:
        db.close()


@router.put("/clusters/{cluster_id}")
def update_cluster(cluster_id: str, status: str = "", recommendation: str = "",
                    consolidation_target: str = "", consolidation_rationale: str = ""):
    db = _db()
    try:
        c = db.query(RoleCluster).get(cluster_id)
        if not c:
            raise HTTPException(404, "Cluster not found")
        if status:
            c.status = status
        if recommendation:
            c.recommendation = recommendation
        if consolidation_target:
            c.consolidation_target = consolidation_target
        if consolidation_rationale:
            c.consolidation_rationale = consolidation_rationale
        db.commit()
        return {"status": "ok"}
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  MODULE 5: AI READINESS
# ═══════════════════════════════════════════════════════════════════

@router.get("/readiness")
def list_readiness(project_id: str, entity_type: str = "",
                    segment: str = "", tier: str = ""):
    db = _db()
    try:
        q = db.query(ReadinessAssessment).filter_by(project_id=project_id)
        if entity_type:
            q = q.filter_by(entity_type=entity_type)
        if segment:
            q = q.filter_by(segment=segment)
        if tier:
            q = q.filter_by(readiness_tier=tier)
        assessments = q.order_by(ReadinessAssessment.composite_score.desc()).all()

        seg_counts = Counter(a.segment for a in assessments)
        tier_counts = Counter(a.readiness_tier for a in assessments)

        return {
            "assessments": [{
                "id": a.id, "entity_type": a.entity_type,
                "entity_name": a.entity_name,
                "capability": a.capability, "opportunity": a.opportunity,
                "motivation": a.motivation, "resources": a.resources,
                "composite_score": a.composite_score,
                "readiness_tier": a.readiness_tier, "segment": a.segment,
                "headcount": a.headcount,
                "recommended_interventions": a.recommended_interventions,
            } for a in assessments],
            "total": len(assessments),
            "segments": dict(seg_counts),
            "tiers": dict(tier_counts),
            "avg_composite": round(sum(a.composite_score for a in assessments) / max(len(assessments), 1), 1),
        }
    finally:
        db.close()


@router.put("/readiness/{assessment_id}")
def update_readiness(assessment_id: str, capability: float = None,
                      opportunity: float = None, motivation: float = None,
                      resources: float = None):
    db = _db()
    try:
        a = db.query(ReadinessAssessment).get(assessment_id)
        if not a:
            raise HTTPException(404, "Assessment not found")
        if capability is not None: a.capability = capability
        if opportunity is not None: a.opportunity = opportunity
        if motivation is not None: a.motivation = motivation
        if resources is not None: a.resources = resources
        a.composite_score = round((a.capability + a.opportunity + a.motivation + a.resources) / 4, 1)
        a.readiness_tier = "advanced" if a.composite_score >= 70 else "emerging" if a.composite_score >= 40 else "early"
        if a.composite_score >= 70 and a.motivation >= 60:
            a.segment = "champion"
        elif a.composite_score >= 50:
            a.segment = "follower"
        elif a.motivation < 40:
            a.segment = "skeptic"
        else:
            a.segment = "unengaged"
        db.commit()
        return {"status": "ok", "composite": a.composite_score, "tier": a.readiness_tier, "segment": a.segment}
    finally:
        db.close()
