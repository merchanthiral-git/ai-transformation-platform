"""Work Design Lab — API endpoints.

Covers: queue CRUD, wave management, sync/inheritance,
conflict resolution, decision logging, stage state persistence.
"""

import uuid
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.auth import SessionLocal
from app.models_wd import WorkDesignJob, SyncConflict, WDDecisionLog
from app.store import store
from app.helpers import get_series

router = APIRouter(prefix="/api/wd", tags=["work-design"])


def _db():
    return SessionLocal()


def _now():
    return datetime.now(timezone.utc)


def _uid():
    return uuid.uuid4().hex[:12]


# ── Pydantic models ──────────────────────────────────────────────

class JobCreate(BaseModel):
    project_id: str
    title: str
    function: str = ""
    family: str = ""
    sub_family: str = ""
    track_code: str = ""
    level_code: str = ""
    ja_source_job_id: Optional[str] = None
    wave: str = "unassigned"
    sync_state: str = "manual"

class JobUpdate(BaseModel):
    title: Optional[str] = None
    function: Optional[str] = None
    family: Optional[str] = None
    sub_family: Optional[str] = None
    track_code: Optional[str] = None
    level_code: Optional[str] = None
    wave: Optional[str] = None
    wd_status: Optional[str] = None
    current_stage: Optional[str] = None
    stage_completion: Optional[dict] = None
    context_data: Optional[dict] = None
    decon_rows: Optional[list] = None
    redeploy_rows: Optional[list] = None
    recon_data: Optional[dict] = None
    scenario: Optional[str] = None
    handoff_data: Optional[dict] = None
    org_link_data: Optional[dict] = None
    assigned_to: Optional[str] = None
    decon_submitted: Optional[bool] = None
    redeploy_submitted: Optional[bool] = None
    finalized: Optional[bool] = None
    hours_freed: Optional[float] = None
    cost_delta: Optional[float] = None
    skill_shift_index: Optional[float] = None

class WaveUpdate(BaseModel):
    wave: str

class StatusUpdate(BaseModel):
    wd_status: str

class ConflictResolution(BaseModel):
    resolution: str  # accepted_ja | kept_wd | merged
    merged_value: Optional[dict] = None


# ═══════════════════════════════════════════════════════════════════
#  QUEUE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/queue")
def get_queue(project_id: str, wave: str = "", status: str = "",
              function: str = "", search: str = "", source: str = ""):
    """Returns all WD jobs for the queue view, grouped by function."""
    db = _db()
    try:
        q = db.query(WorkDesignJob).filter_by(project_id=project_id)

        if wave:
            q = q.filter_by(wave=wave)
        if status:
            q = q.filter_by(wd_status=status)
        if function:
            q = q.filter(WorkDesignJob.function == function)
        if source == "ja":
            q = q.filter(WorkDesignJob.ja_source_job_id.isnot(None))
        elif source == "manual":
            q = q.filter(WorkDesignJob.ja_source_job_id.is_(None),
                          WorkDesignJob.sync_state == "manual")
        elif source == "csv":
            q = q.filter(WorkDesignJob.sync_state == "uploaded")
        if search:
            q = q.filter(WorkDesignJob.title.ilike(f"%{search}%"))

        jobs = q.order_by(WorkDesignJob.function, WorkDesignJob.title).all()

        # Group by function
        by_function = defaultdict(list)
        for j in jobs:
            by_function[j.function or "Unassigned"].append(_job_dict(j))

        # Summary counts
        all_jobs = [_job_dict(j) for j in jobs]
        status_counts = Counter(j["wd_status"] for j in all_jobs)
        wave_counts = Counter(j["wave"] for j in all_jobs)

        function_groups = []
        for func_name in sorted(by_function.keys()):
            func_jobs = by_function[func_name]
            func_status = Counter(j["wd_status"] for j in func_jobs)
            function_groups.append({
                "function": func_name,
                "jobs": func_jobs,
                "total": len(func_jobs),
                "redesigned": func_status.get("redesigned", 0),
                "in_progress": func_status.get("in_progress", 0),
                "not_started": func_status.get("not_started", 0),
                "deferred": func_status.get("deferred", 0),
                "out_of_scope": func_status.get("out_of_scope", 0),
            })

        return {
            "functions": function_groups,
            "summary": {
                "total": len(all_jobs),
                "redesigned": status_counts.get("redesigned", 0),
                "in_progress": status_counts.get("in_progress", 0),
                "not_started": status_counts.get("not_started", 0),
                "deferred": status_counts.get("deferred", 0),
                "out_of_scope": status_counts.get("out_of_scope", 0),
            },
            "waves": {
                "wave_1": wave_counts.get("wave_1", 0),
                "wave_2": wave_counts.get("wave_2", 0),
                "wave_3": wave_counts.get("wave_3", 0),
                "deferred": wave_counts.get("deferred", 0),
                "unassigned": wave_counts.get("unassigned", 0),
            },
        }
    finally:
        db.close()


@router.post("/jobs")
def create_job(body: JobCreate):
    db = _db()
    try:
        job = WorkDesignJob(
            id=_uid(), project_id=body.project_id, title=body.title,
            function=body.function, family=body.family, sub_family=body.sub_family,
            track_code=body.track_code, level_code=body.level_code,
            ja_source_job_id=body.ja_source_job_id, wave=body.wave,
            sync_state=body.sync_state,
            stage_completion={
                "context": 0, "deconstruction": 0, "reconstruction": 0,
                "redeployment": 0, "impact": 0, "org_link": 0, "handoff": 0,
            },
        )
        if body.ja_source_job_id:
            job.sync_state = "synced"
            job.last_synced_at = _now()
            job.ja_source_version = 1
        db.add(job)
        db.commit()
        return _job_dict(job)
    finally:
        db.close()


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    db = _db()
    try:
        job = db.query(WorkDesignJob).get(job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        return _job_full_dict(job)
    finally:
        db.close()


@router.put("/jobs/{job_id}")
def update_job(job_id: str, body: JobUpdate):
    """Update job fields. Diffs changes into the decision log."""
    db = _db()
    try:
        job = db.query(WorkDesignJob).get(job_id)
        if not job:
            raise HTTPException(404, "Job not found")

        updatable = [
            "title", "function", "family", "sub_family", "track_code", "level_code",
            "wave", "wd_status", "current_stage", "stage_completion",
            "context_data", "decon_rows", "redeploy_rows", "recon_data",
            "scenario", "handoff_data", "org_link_data", "assigned_to",
            "decon_submitted", "redeploy_submitted", "finalized",
            "hours_freed", "cost_delta", "skill_shift_index",
        ]

        for field in updatable:
            new_val = getattr(body, field, None)
            if new_val is not None:
                old_val = getattr(job, field)
                # Log significant changes (skip stage_completion, sparkline KPIs)
                if field not in ("stage_completion", "hours_freed", "cost_delta",
                                  "skill_shift_index") and old_val != new_val:
                    stage = job.current_stage or "unknown"
                    db.add(WDDecisionLog(
                        id=_uid(), wd_job_id=job_id, stage=stage,
                        field=field, old_value=_jsonable(old_val),
                        new_value=_jsonable(new_val),
                    ))
                setattr(job, field, new_val)

        # Auto-set status to in_progress if stage is set and status is not_started
        if job.current_stage and job.wd_status == "not_started":
            job.wd_status = "in_progress"

        # Auto-set status to redesigned if finalized
        if job.finalized:
            job.wd_status = "redesigned"

        job.updated_at = _now()
        db.commit()
        return _job_full_dict(job)
    finally:
        db.close()


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str):
    db = _db()
    try:
        job = db.query(WorkDesignJob).get(job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        db.delete(job)
        db.commit()
        return {"status": "deleted"}
    finally:
        db.close()


# ── Batch operations ─────────────────────────────────────────────

class BatchWaveUpdate(BaseModel):
    job_ids: list[str]
    wave: str

class BatchStatusUpdate(BaseModel):
    job_ids: list[str]
    wd_status: str

@router.post("/jobs/batch-wave")
def batch_update_wave(body: BatchWaveUpdate):
    db = _db()
    try:
        updated = 0
        for jid in body.job_ids:
            job = db.query(WorkDesignJob).get(jid)
            if job:
                job.wave = body.wave
                job.updated_at = _now()
                updated += 1
        db.commit()
        return {"status": "ok", "updated": updated}
    finally:
        db.close()


@router.post("/jobs/batch-status")
def batch_update_status(body: BatchStatusUpdate):
    db = _db()
    try:
        updated = 0
        for jid in body.job_ids:
            job = db.query(WorkDesignJob).get(jid)
            if job:
                job.wd_status = body.wd_status
                job.updated_at = _now()
                updated += 1
        db.commit()
        return {"status": "ok", "updated": updated}
    finally:
        db.close()


# ── Wave & status shortcuts ──────────────────────────────────────

@router.patch("/jobs/{job_id}/wave")
def update_wave(job_id: str, body: WaveUpdate):
    db = _db()
    try:
        job = db.query(WorkDesignJob).get(job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        job.wave = body.wave
        job.updated_at = _now()
        db.commit()
        return {"status": "ok", "wave": job.wave}
    finally:
        db.close()


@router.patch("/jobs/{job_id}/status")
def update_status(job_id: str, body: StatusUpdate):
    db = _db()
    try:
        job = db.query(WorkDesignJob).get(job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        job.wd_status = body.wd_status
        job.updated_at = _now()
        db.commit()
        return {"status": "ok", "wd_status": job.wd_status}
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  SYNC / INHERITANCE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.post("/queue/scan-sync")
def scan_sync(project_id: str):
    """Re-evaluate sync state for all jobs in the queue.
    Compares JA source version against WD's last-synced version."""
    db = _db()
    try:
        jobs = db.query(WorkDesignJob).filter_by(project_id=project_id)\
            .filter(WorkDesignJob.ja_source_job_id.isnot(None))\
            .filter(WorkDesignJob.sync_state != "broken").all()

        results = {"synced": 0, "stale": 0, "conflict": 0, "unchanged": 0}

        for job in jobs:
            # Check if JA source still exists and has been updated
            # For now, we check against the JA current/future role tables
            from app.models_ja import CurrentStateRole, FutureStateRole
            ja_role = db.query(CurrentStateRole).get(job.ja_source_job_id)
            if not ja_role:
                ja_role = db.query(FutureStateRole).get(job.ja_source_job_id)

            if not ja_role:
                # JA role was deleted
                job.sync_state = "broken"
                results["stale"] += 1
                continue

            # Check for field-level changes
            ja_fields = {
                "function": getattr(ja_role, "function_group", "") or getattr(ja_role, "family", ""),
                "family": ja_role.family if hasattr(ja_role, "family") else "",
                "sub_family": ja_role.sub_family if hasattr(ja_role, "sub_family") else "",
                "track_code": ja_role.track_code if hasattr(ja_role, "track_code") else "",
                "level_code": ja_role.level_code if hasattr(ja_role, "level_code") else "",
            }

            has_conflict = False
            for field, ja_val in ja_fields.items():
                wd_val = getattr(job, field, "")
                if ja_val and wd_val and ja_val != wd_val:
                    # Check if WD has modified this field from inherited value
                    if field in (job.inherited_fields or []):
                        has_conflict = True
                        # Create or update conflict record
                        existing = db.query(SyncConflict).filter_by(
                            wd_job_id=job.id, field_path=field,
                            resolution="unresolved").first()
                        if not existing:
                            db.add(SyncConflict(
                                id=_uid(), wd_job_id=job.id, field_path=field,
                                ja_value=ja_val, wd_value=wd_val,
                                ja_changed_at=_now(),
                            ))

            if has_conflict:
                job.sync_state = "conflict"
                results["conflict"] += 1
            elif any(
                getattr(ja_role, f, "") != getattr(job, f, "")
                for f in ["family", "sub_family", "track_code", "level_code"]
                if getattr(ja_role, f, "")
            ):
                job.sync_state = "stale"
                results["stale"] += 1
            else:
                job.sync_state = "synced"
                results["synced"] += 1

        db.commit()
        return {"status": "ok", "results": results, "scanned": len(jobs)}
    finally:
        db.close()


@router.post("/jobs/{job_id}/re-sync")
def re_sync_job(job_id: str):
    """Pull latest JA data into WD job. Returns conflict list if any."""
    db = _db()
    try:
        job = db.query(WorkDesignJob).get(job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        if not job.ja_source_job_id:
            raise HTTPException(400, "Job has no JA source")
        if job.sync_state == "broken":
            raise HTTPException(400, "Inheritance is broken. Re-link first.")

        from app.models_ja import CurrentStateRole, FutureStateRole
        ja_role = db.query(CurrentStateRole).get(job.ja_source_job_id)
        if not ja_role:
            ja_role = db.query(FutureStateRole).get(job.ja_source_job_id)
        if not ja_role:
            raise HTTPException(404, "JA source role not found")

        syncable = ["family", "sub_family", "track_code", "level_code"]
        conflicts = []

        for field in syncable:
            ja_val = getattr(ja_role, field, "")
            wd_val = getattr(job, field, "")
            if ja_val and ja_val != wd_val:
                if job.sync_state == "conflict" or (wd_val and field not in (job.inherited_fields or [])):
                    # WD has its own value — conflict
                    conflicts.append({
                        "field": field,
                        "ja_value": ja_val,
                        "wd_value": wd_val,
                    })
                else:
                    # Safe to pull — WD hasn't modified this field
                    setattr(job, field, ja_val)

        if conflicts:
            job.sync_state = "conflict"
            # Persist conflict records
            for c in conflicts:
                existing = db.query(SyncConflict).filter_by(
                    wd_job_id=job.id, field_path=c["field"],
                    resolution="unresolved").first()
                if not existing:
                    db.add(SyncConflict(
                        id=_uid(), wd_job_id=job.id, field_path=c["field"],
                        ja_value=c["ja_value"], wd_value=c["wd_value"],
                        ja_changed_at=_now(),
                    ))
        else:
            job.sync_state = "synced"
            job.ja_source_version = (job.ja_source_version or 0) + 1

        job.last_synced_at = _now()
        job.updated_at = _now()
        db.commit()

        return {
            "status": "conflict" if conflicts else "synced",
            "conflicts": conflicts,
            "job": _job_dict(job),
        }
    finally:
        db.close()


@router.post("/jobs/{job_id}/resolve-conflict")
def resolve_conflict(job_id: str, conflict_id: str, body: ConflictResolution):
    """Resolve a single field conflict."""
    db = _db()
    try:
        conflict = db.query(SyncConflict).get(conflict_id)
        if not conflict or conflict.wd_job_id != job_id:
            raise HTTPException(404, "Conflict not found")

        job = db.query(WorkDesignJob).get(job_id)
        if not job:
            raise HTTPException(404, "Job not found")

        conflict.resolution = body.resolution
        conflict.resolved_at = _now()

        if body.resolution == "accepted_ja":
            setattr(job, conflict.field_path, conflict.ja_value)
        elif body.resolution == "merged" and body.merged_value is not None:
            setattr(job, conflict.field_path, body.merged_value)
        # kept_wd: no change needed

        # Check if all conflicts are resolved
        unresolved = db.query(SyncConflict).filter_by(
            wd_job_id=job_id, resolution="unresolved").count()
        if unresolved == 0:
            job.sync_state = "synced"
            job.ja_source_version = (job.ja_source_version or 0) + 1
            job.last_synced_at = _now()

        job.updated_at = _now()
        db.commit()

        return {"status": "resolved", "remaining_conflicts": unresolved}
    finally:
        db.close()


@router.post("/jobs/{job_id}/break-inheritance")
def break_inheritance(job_id: str):
    db = _db()
    try:
        job = db.query(WorkDesignJob).get(job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        job.sync_state = "broken"
        job.updated_at = _now()
        db.commit()
        return {"status": "ok", "sync_state": "broken"}
    finally:
        db.close()


@router.post("/jobs/{job_id}/relink-to-ja")
def relink_to_ja(job_id: str, ja_job_id: str):
    db = _db()
    try:
        job = db.query(WorkDesignJob).get(job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        job.ja_source_job_id = ja_job_id
        job.sync_state = "stale"  # will be resolved on next re-sync
        job.updated_at = _now()
        db.commit()
        return {"status": "ok", "sync_state": "stale"}
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  CONFLICTS LIST
# ═══════════════════════════════════════════════════════════════════

@router.get("/jobs/{job_id}/conflicts")
def get_conflicts(job_id: str):
    db = _db()
    try:
        conflicts = db.query(SyncConflict).filter_by(
            wd_job_id=job_id).order_by(SyncConflict.ja_changed_at.desc()).all()
        return [{
            "id": c.id, "field_path": c.field_path,
            "ja_value": c.ja_value, "wd_value": c.wd_value,
            "resolution": c.resolution,
            "ja_changed_at": str(c.ja_changed_at) if c.ja_changed_at else None,
        } for c in conflicts]
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  DECISION LOG
# ═══════════════════════════════════════════════════════════════════

@router.get("/jobs/{job_id}/decisions")
def get_decisions(job_id: str, stage: str = ""):
    db = _db()
    try:
        q = db.query(WDDecisionLog).filter_by(wd_job_id=job_id)
        if stage:
            q = q.filter_by(stage=stage)
        entries = q.order_by(WDDecisionLog.timestamp.desc()).all()
        return [{
            "id": e.id, "stage": e.stage, "field": e.field,
            "old_value": e.old_value, "new_value": e.new_value,
            "user_id": e.user_id, "timestamp": str(e.timestamp),
        } for e in entries]
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  POPULATE FROM EXISTING DATA
# ═══════════════════════════════════════════════════════════════════

@router.post("/queue/populate-from-data")
def populate_from_data(project_id: str, model_id: str = ""):
    """Populate queue from in-memory workforce/work_design data.
    Creates WD jobs for all unique job titles in the dataset."""
    mid = model_id or "Demo_Model"
    mid = store.resolve_model_id(mid)
    if mid not in store.datasets:
        return {"status": "no_data", "created": 0}

    data = store.get_filtered_data(mid, {"func": "All", "jf": "All", "sf": "All", "cl": "All"})
    wf = data.get("workforce")
    wd = data.get("work_design")

    # Collect unique jobs from both datasets
    jobs_seen = {}
    if wf is not None and not wf.empty and "Job Title" in wf.columns:
        for _, row in wf.drop_duplicates("Job Title").iterrows():
            title = str(row.get("Job Title", "")).strip()
            if title and title not in jobs_seen:
                jobs_seen[title] = {
                    "function": str(row.get("Function ID", "")),
                    "family": str(row.get("Job Family", "")),
                    "sub_family": str(row.get("Sub-Family", "")),
                    "track_code": str(row.get("Career Track", "")),
                    "level_code": str(row.get("Career Level", "")),
                }

    if wd is not None and not wd.empty and "Job Title" in wd.columns:
        for title in get_series(wd, "Job Title").dropna().unique():
            title = str(title).strip()
            if title and title not in jobs_seen:
                func = str(wd[get_series(wd, "Job Title") == title].iloc[0].get("Function ID", ""))
                jobs_seen[title] = {
                    "function": func,
                    "family": "", "sub_family": "", "track_code": "", "level_code": "",
                }

    db = _db()
    try:
        existing = {j.title for j in db.query(WorkDesignJob).filter_by(project_id=project_id).all()}
        created = 0
        for title, meta in jobs_seen.items():
            if title in existing:
                continue
            db.add(WorkDesignJob(
                id=_uid(), project_id=project_id, title=title,
                function=meta["function"], family=meta["family"],
                sub_family=meta["sub_family"], track_code=meta["track_code"],
                level_code=meta["level_code"],
                sync_state="manual", wave="unassigned", wd_status="not_started",
                stage_completion={
                    "context": 0, "deconstruction": 0, "reconstruction": 0,
                    "redeployment": 0, "impact": 0, "org_link": 0, "handoff": 0,
                },
            ))
            created += 1
        db.commit()
        return {"status": "ok", "created": created, "existing": len(existing)}
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════

def _jsonable(val):
    """Make a value JSON-safe for the decision log."""
    if isinstance(val, (str, int, float, bool, type(None))):
        return val
    if isinstance(val, (list, dict)):
        return val
    return str(val)


def _job_dict(j):
    """Queue-level summary (no stage data)."""
    return {
        "id": j.id, "project_id": j.project_id, "title": j.title,
        "function": j.function, "family": j.family, "sub_family": j.sub_family,
        "track_code": j.track_code, "level_code": j.level_code,
        "ja_source_job_id": j.ja_source_job_id,
        "sync_state": j.sync_state,
        "ja_source_version": j.ja_source_version,
        "wave": j.wave, "wd_status": j.wd_status,
        "current_stage": j.current_stage,
        "stage_completion": j.stage_completion or {},
        "assigned_to": j.assigned_to,
        "hours_freed": j.hours_freed,
        "cost_delta": j.cost_delta,
        "skill_shift_index": j.skill_shift_index,
        "decon_submitted": j.decon_submitted,
        "finalized": j.finalized,
        "updated_at": str(j.updated_at) if j.updated_at else None,
    }


def _job_full_dict(j):
    """Full job with all stage data."""
    d = _job_dict(j)
    d.update({
        "context_data": j.context_data or {},
        "decon_rows": j.decon_rows or [],
        "redeploy_rows": j.redeploy_rows or [],
        "recon_data": j.recon_data or {},
        "scenario": j.scenario,
        "handoff_data": j.handoff_data or {},
        "org_link_data": j.org_link_data or {},
        "inherited_fields": j.inherited_fields or [],
        "last_synced_at": str(j.last_synced_at) if j.last_synced_at else None,
        "redeploy_submitted": j.redeploy_submitted,
        "created_at": str(j.created_at) if j.created_at else None,
    })
    return d
