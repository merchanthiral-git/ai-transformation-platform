"""Flight Recorder API routes."""

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse

from app.flight_recorder import recorder

router = APIRouter(prefix="/api", tags=["flight-recorder"])


@router.get("/flight-recorder/{project_id}")
async def get_flight_recorder(
    project_id: str,
    module: str = "",
    event_type: str = "",
    significance: str = "",
    from_date: str = "",
    to_date: str = "",
    q: str = "",
):
    """Get filtered flight recorder events."""
    if q:
        return {"events": recorder.search(project_id, q)}
    return {"events": recorder.get_timeline(project_id, module, event_type, significance, from_date, to_date)}


@router.get("/flight-recorder/{project_id}/summary")
async def get_flight_recorder_summary(project_id: str):
    """Summary statistics for the project's flight recorder."""
    return recorder.get_summary(project_id)


@router.get("/flight-recorder/{project_id}/milestones")
async def get_flight_recorder_milestones(project_id: str):
    """Get milestone-flagged events only."""
    return {"events": recorder.get_milestones(project_id)}


@router.post("/flight-recorder/{project_id}/milestone/{event_id}")
async def toggle_flight_recorder_milestone(project_id: str, event_id: str):
    """Toggle milestone status for an event."""
    new_status = recorder.toggle_milestone(project_id, event_id)
    return {"is_milestone": new_status}


@router.get("/flight-recorder/{project_id}/export")
async def export_flight_recorder(project_id: str):
    """Export full timeline as markdown."""
    md = recorder.export_timeline(project_id)
    return PlainTextResponse(content=md, media_type="text/markdown")
