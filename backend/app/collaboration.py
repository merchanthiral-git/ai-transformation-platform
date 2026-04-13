"""Real-time collaboration via Socket.IO.

Manages presence, broadcast of state changes, editing indicators,
tab awareness, and a project activity feed.
"""

import time
import uuid
from datetime import datetime
from collections import defaultdict

import socketio

# ── Socket.IO server (async mode for FastAPI/uvicorn) ──
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

# ── In-memory state ──
# sid → { user_id, username, display_name, project_id, active_tab, color, joined_at }
_connections: dict[str, dict] = {}
# project_id → [activity_entry, ...]  (last 100 per project)
_activity_feeds: dict[str, list] = defaultdict(list)
# project_id → { user_id: { editing_module, started_at } }
_editing_state: dict[str, dict] = defaultdict(dict)

_MAX_FEED = 100

# Consistent avatar colors assigned per user_id
_AVATAR_COLORS = [
    "#E09040", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B",
    "#EF4444", "#EC4899", "#6366F1", "#14B8A6", "#F97316",
]
_user_color_cache: dict[str, str] = {}


def _color_for(user_id: str) -> str:
    if user_id not in _user_color_cache:
        _user_color_cache[user_id] = _AVATAR_COLORS[len(_user_color_cache) % len(_AVATAR_COLORS)]
    return _user_color_cache[user_id]


def _presence_list(project_id: str, exclude_sid: str | None = None) -> list[dict]:
    """Build the list of users currently connected to a project."""
    seen_users: set[str] = set()
    result = []
    for sid, info in _connections.items():
        if info["project_id"] != project_id:
            continue
        if exclude_sid and sid == exclude_sid:
            continue
        uid = info["user_id"]
        if uid in seen_users:
            continue
        seen_users.add(uid)
        editing = _editing_state.get(project_id, {}).get(uid)
        result.append({
            "user_id": uid,
            "username": info["username"],
            "display_name": info["display_name"],
            "active_tab": info.get("active_tab", "home"),
            "color": info["color"],
            "editing": editing,
        })
    return result


def _add_activity(project_id: str, entry: dict):
    feed = _activity_feeds[project_id]
    entry.setdefault("id", uuid.uuid4().hex[:12])
    entry.setdefault("timestamp", datetime.utcnow().isoformat() + "Z")
    feed.append(entry)
    if len(feed) > _MAX_FEED:
        _activity_feeds[project_id] = feed[-_MAX_FEED:]


# ═══════════════════════════════════════════════════════════════
#  Socket.IO event handlers
# ═══════════════════════════════════════════════════════════════

@sio.event
async def connect(sid, environ, auth):
    """Client connects — no-op until they join a project."""
    pass


@sio.event
async def disconnect(sid):
    info = _connections.pop(sid, None)
    if not info:
        return
    project_id = info["project_id"]
    user_id = info["user_id"]
    # Clear editing state
    _editing_state.get(project_id, {}).pop(user_id, None)
    # Log activity
    _add_activity(project_id, {
        "type": "leave",
        "user_id": user_id,
        "username": info["username"],
        "display_name": info["display_name"],
        "message": f"{info['display_name'] or info['username']} left the project",
    })
    # Broadcast updated presence
    await sio.emit("presence", _presence_list(project_id), room=project_id)


@sio.event
async def join_project(sid, data):
    """User joins a project room.
    data: { user_id, username, display_name, project_id }
    """
    user_id = data.get("user_id", "")
    username = data.get("username", "unknown")
    display_name = data.get("display_name") or username
    project_id = data.get("project_id", "")
    if not project_id or not user_id:
        return

    color = _color_for(user_id)
    _connections[sid] = {
        "user_id": user_id,
        "username": username,
        "display_name": display_name,
        "project_id": project_id,
        "active_tab": "home",
        "color": color,
        "joined_at": time.time(),
    }
    sio.enter_room(sid, project_id)

    _add_activity(project_id, {
        "type": "join",
        "user_id": user_id,
        "username": username,
        "display_name": display_name,
        "message": f"{display_name} joined the project",
    })

    # Send current presence + recent activity to the new user
    await sio.emit("presence", _presence_list(project_id), room=project_id)
    await sio.emit("activity_feed", _activity_feeds.get(project_id, [])[-50:], to=sid)


@sio.event
async def leave_project(sid, data):
    """Explicit leave (e.g. user navigates away)."""
    info = _connections.pop(sid, None)
    if not info:
        return
    project_id = info["project_id"]
    sio.leave_room(sid, project_id)
    _editing_state.get(project_id, {}).pop(info["user_id"], None)
    await sio.emit("presence", _presence_list(project_id), room=project_id)


@sio.event
async def tab_change(sid, data):
    """User navigated to a different tab/module.
    data: { tab }
    """
    info = _connections.get(sid)
    if not info:
        return
    info["active_tab"] = data.get("tab", "home")
    project_id = info["project_id"]
    await sio.emit("presence", _presence_list(project_id), room=project_id)


@sio.event
async def editing_start(sid, data):
    """User started editing in a module.
    data: { module }
    """
    info = _connections.get(sid)
    if not info:
        return
    project_id = info["project_id"]
    user_id = info["user_id"]
    _editing_state[project_id][user_id] = {
        "module": data.get("module", ""),
        "started_at": time.time(),
    }
    await sio.emit("presence", _presence_list(project_id), room=project_id)


@sio.event
async def editing_stop(sid, data):
    """User stopped editing."""
    info = _connections.get(sid)
    if not info:
        return
    project_id = info["project_id"]
    _editing_state.get(project_id, {}).pop(info["user_id"], None)
    await sio.emit("presence", _presence_list(project_id), room=project_id)


@sio.event
async def state_change(sid, data):
    """User changed shared state (filter, scenario, design decision).
    data: { kind, summary, detail? }
    kind: "filter" | "scenario" | "design" | "decision" | "upload" | "other"
    """
    info = _connections.get(sid)
    if not info:
        return
    project_id = info["project_id"]
    user_id = info["user_id"]
    display_name = info["display_name"] or info["username"]

    entry = {
        "type": "change",
        "kind": data.get("kind", "other"),
        "user_id": user_id,
        "username": info["username"],
        "display_name": display_name,
        "summary": data.get("summary", "made a change"),
        "message": f"{display_name} {data.get('summary', 'made a change')}",
    }
    if data.get("detail"):
        entry["detail"] = data["detail"]

    _add_activity(project_id, entry)

    # Broadcast the change notification to OTHER users in the project
    await sio.emit(
        "remote_change",
        {
            "user_id": user_id,
            "display_name": display_name,
            "kind": data.get("kind", "other"),
            "summary": data.get("summary", "made a change"),
            "detail": data.get("detail"),
        },
        room=project_id,
        skip_sid=sid,
    )
    # Update activity feed for everyone
    await sio.emit("activity_update", entry, room=project_id)


@sio.event
async def get_activity(sid, data):
    """Client requests the activity feed."""
    info = _connections.get(sid)
    if not info:
        return
    project_id = info["project_id"]
    await sio.emit("activity_feed", _activity_feeds.get(project_id, [])[-50:], to=sid)
