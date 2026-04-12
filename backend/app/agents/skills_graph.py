"""Skills Adjacency Graph — builds skill-to-skill graph from task/role overlap,
finds shortest reskilling paths via Dijkstra, and groups role transitions.

The graph is built deterministically from data — no Claude calls for graph
construction or pathfinding. Claude is only used for cognitive similarity
scoring of the top skill pairs (optional enrichment).
"""

import json
import heapq
import hashlib
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import pandas as pd

from app.store import store, build_ai_priority_scores, build_skill_analysis, build_reconstruction
from app.helpers import get_series, safe_value_counts
from app.shared import _f

GRAPH_DIR = Path(__file__).parent.parent.parent / "data" / "skills_graph"
GRAPH_DIR.mkdir(parents=True, exist_ok=True)


def _graph_path(project_id: str) -> Path:
    safe_id = project_id.replace("/", "_").replace("..", "_")
    return GRAPH_DIR / f"{safe_id}.json"


def _data_fingerprint(model_id: str) -> str:
    """Hash the work_design + workforce data for cache invalidation."""
    ds = store.datasets.get(model_id, {})
    wd = ds.get("work_design", pd.DataFrame())
    wf = ds.get("workforce", pd.DataFrame())
    content = f"{len(wd)}:{len(wf)}:{list(wd.columns) if not wd.empty else []}:{wd['Job Title'].nunique() if not wd.empty and 'Job Title' in wd.columns else 0}"
    return hashlib.md5(content.encode()).hexdigest()


def get_graph_status(project_id: str, model_id: str = "") -> dict:
    """Check if a cached graph exists and is current."""
    path = _graph_path(project_id)
    if not path.exists():
        return {"built": False, "node_count": 0, "edge_count": 0, "cached_at": None}
    try:
        data = json.loads(path.read_text())
        mid = store.resolve_model_id(model_id) if model_id else ""
        current_fp = _data_fingerprint(mid) if mid else ""
        stale = current_fp and data.get("fingerprint") != current_fp
        return {
            "built": True,
            "stale": stale,
            "node_count": len(data.get("nodes", [])),
            "edge_count": len(data.get("edges", [])),
            "cached_at": data.get("built_at"),
        }
    except (json.JSONDecodeError, OSError):
        return {"built": False, "node_count": 0, "edge_count": 0, "cached_at": None}


def build_skills_graph(project_id: str, model_id: str = "", user_id: str = "") -> dict:
    """Build the full skills adjacency graph from project data."""
    mid = store.resolve_model_id(model_id, user_id)
    if mid not in store.datasets:
        return {"error": True, "message": "No data available. Upload workforce data first."}

    # Check cache
    path = _graph_path(project_id)
    fp = _data_fingerprint(mid)
    if path.exists():
        try:
            cached = json.loads(path.read_text())
            if cached.get("fingerprint") == fp:
                return cached
        except (json.JSONDecodeError, OSError):
            pass

    data = store.get_filtered_data(mid, _f())
    wd = data["work_design"]
    wf = data["workforce"]

    if wd.empty and wf.empty:
        return {"error": True, "message": "No skills data available."}

    # ── Step 1: Extract all skills and their metadata ──

    # Skills from work_design tasks
    skill_tasks: dict[str, set] = defaultdict(set)       # skill → set of task names
    skill_roles: dict[str, set] = defaultdict(set)       # skill → set of role titles
    task_skills: dict[str, set] = defaultdict(set)        # task → set of skills
    role_skills: dict[str, set] = defaultdict(set)        # role → set of skills

    if not wd.empty:
        for _, row in wd.iterrows():
            task = str(row.get("Task Name", "")).strip()
            title = str(row.get("Job Title", "")).strip()
            for col in ["Primary Skill", "Secondary Skill"]:
                s = str(row.get(col, "")).strip()
                if s and s != "nan":
                    skill_tasks[s].add(task)
                    if title and title != "nan":
                        skill_roles[s].add(title)
                        role_skills[title].add(s)
                    if task and task != "nan":
                        task_skills[task].add(s)

    all_skills = sorted(skill_tasks.keys())
    if len(all_skills) < 3:
        return {"error": True, "message": "Need at least 3 skills to build a network. Add more task data."}

    # Employee counts per skill (from workforce + work_design mapping)
    skill_employees: dict[str, int] = defaultdict(int)
    if not wf.empty and "Job Title" in wf.columns:
        title_counts = safe_value_counts(get_series(wf, "Job Title"))
        for title, count in title_counts.items():
            t = str(title).strip()
            for sk in role_skills.get(t, set()):
                skill_employees[sk] += int(count)

    # AI relevance from AI priority scores
    skill_ai_relevance: dict[str, float] = {}
    if not wd.empty:
        scored = build_ai_priority_scores(wd)
        if not scored.empty and "AI Priority" in scored.columns:
            for _, row in scored.iterrows():
                ai_score = float(row.get("AI Priority", 0))
                for col in ["Primary Skill", "Secondary Skill"]:
                    s = str(row.get(col, "")).strip()
                    if s and s != "nan":
                        skill_ai_relevance[s] = max(skill_ai_relevance.get(s, 0), round(ai_score, 1))

    # Skill categories (derived from function/family of roles that use them)
    skill_categories: dict[str, str] = {}
    if not wd.empty and "Function ID" in wd.columns:
        for _, row in wd.iterrows():
            fn = str(row.get("Function ID", "")).strip()
            for col in ["Primary Skill", "Secondary Skill"]:
                s = str(row.get(col, "")).strip()
                if s and s != "nan" and fn and fn != "nan":
                    if s not in skill_categories:
                        skill_categories[s] = fn

    # Proficiency average per skill
    skill_proficiency: dict[str, float] = {}
    # Estimate from role seniority
    if not wd.empty and "Career Level" in wd.columns:
        for _, row in wd.iterrows():
            level = str(row.get("Career Level", "")).strip()
            level_num = int("".join(c for c in level if c.isdigit()) or "3")
            prof = min(4.0, 1.0 + level_num * 0.4)
            for col in ["Primary Skill", "Secondary Skill"]:
                s = str(row.get(col, "")).strip()
                if s and s != "nan":
                    skill_proficiency[s] = round(max(skill_proficiency.get(s, 0), prof), 1)

    # ── Step 2: Compute pairwise adjacency ──

    edges = []
    skills_list = list(all_skills)

    for i in range(len(skills_list)):
        for j in range(i + 1, len(skills_list)):
            sa, sb = skills_list[i], skills_list[j]

            # Task overlap (Jaccard similarity)
            tasks_a = skill_tasks.get(sa, set())
            tasks_b = skill_tasks.get(sb, set())
            shared_tasks = tasks_a & tasks_b
            union_tasks = tasks_a | tasks_b
            task_jaccard = len(shared_tasks) / max(len(union_tasks), 1)

            # Role co-occurrence
            roles_a = skill_roles.get(sa, set())
            roles_b = skill_roles.get(sb, set())
            shared_roles = roles_a & roles_b
            union_roles = roles_a | roles_b
            role_jaccard = len(shared_roles) / max(len(union_roles), 1)

            # Combined adjacency score
            weight = task_jaccard * 0.6 + role_jaccard * 0.4

            if weight > 0.15:
                overlap_type = "task" if task_jaccard > role_jaccard else "role"
                edges.append({
                    "source": sa, "target": sb,
                    "weight": round(weight, 3),
                    "overlap_type": overlap_type,
                    "shared_tasks": sorted(shared_tasks)[:5],
                    "shared_roles": sorted(shared_roles)[:3],
                })

    # Build nodes
    nodes = []
    for sk in all_skills:
        nodes.append({
            "id": sk, "name": sk,
            "category": skill_categories.get(sk, "General"),
            "proficiency_avg": skill_proficiency.get(sk, 2.0),
            "employee_count": skill_employees.get(sk, 0),
            "ai_relevance": round(min(10, skill_ai_relevance.get(sk, 3.0)), 1),
            "task_count": len(skill_tasks.get(sk, set())),
            "role_count": len(skill_roles.get(sk, set())),
        })

    result = {
        "nodes": nodes,
        "edges": sorted(edges, key=lambda e: -e["weight"]),
        "fingerprint": fp,
        "built_at": datetime.now().isoformat(),
        "stats": {
            "total_skills": len(nodes),
            "total_edges": len(edges),
            "avg_connections": round(len(edges) * 2 / max(len(nodes), 1), 1),
            "categories": sorted(set(n["category"] for n in nodes)),
        },
    }

    # Cache
    path.write_text(json.dumps(result, indent=2, default=str))
    return result


# ── Dijkstra's shortest path ──

def find_shortest_path(graph: dict, source: str, target: str) -> dict:
    """Find shortest weighted path between two skills using Dijkstra's algorithm."""
    nodes = {n["id"]: n for n in graph.get("nodes", [])}
    if source not in nodes or target not in nodes:
        return {"error": True, "message": f"Skill '{source if source not in nodes else target}' not found in graph."}

    # Build adjacency list
    adj: dict[str, list] = defaultdict(list)
    edge_map: dict[tuple, dict] = {}
    for e in graph.get("edges", []):
        # Weight for pathfinding: invert adjacency (higher adjacency = shorter path)
        dist = round(1.0 - e["weight"], 3)
        adj[e["source"]].append((e["target"], dist))
        adj[e["target"]].append((e["source"], dist))
        edge_map[(e["source"], e["target"])] = e
        edge_map[(e["target"], e["source"])] = e

    # Dijkstra
    distances = {source: 0.0}
    previous: dict[str, str | None] = {source: None}
    heap = [(0.0, source)]
    visited = set()

    while heap:
        dist, u = heapq.heappop(heap)
        if u in visited:
            continue
        visited.add(u)
        if u == target:
            break
        for v, w in adj.get(u, []):
            if v in visited:
                continue
            new_dist = dist + w
            if new_dist < distances.get(v, float("inf")):
                distances[v] = new_dist
                previous[v] = u
                heapq.heappush(heap, (new_dist, v))

    if target not in previous:
        return {"error": True, "message": f"No path exists between '{source}' and '{target}'."}

    # Reconstruct path
    path = []
    current = target
    while current is not None:
        path.append(current)
        current = previous.get(current)
    path.reverse()

    # Build step details
    steps = []
    for k in range(len(path) - 1):
        a, b = path[k], path[k + 1]
        edge = edge_map.get((a, b), {})
        adjacency = edge.get("weight", 0)
        weeks = max(1, round((1 - adjacency) * 12))
        steps.append({
            "from_skill": a, "to_skill": b,
            "adjacency_score": adjacency,
            "shared_tasks": edge.get("shared_tasks", []),
            "learning_approach": "build" if adjacency >= 0.5 else "borrow" if adjacency >= 0.3 else "buy",
            "estimated_weeks": weeks,
        })

    total_weeks = sum(s["estimated_weeks"] for s in steps)
    already_have = sum(1 for sk in path if nodes.get(sk, {}).get("proficiency_avg", 0) >= 2.0)

    return {
        "path": path,
        "total_distance": round(distances.get(target, 0), 3),
        "estimated_months": max(1, round(total_weeks / 4)),
        "estimated_weeks": total_weeks,
        "steps": steps,
        "already_have_pct": round(already_have / max(len(path), 1) * 100, 1),
    }


# ── Role transition paths ──

def find_role_transition(graph: dict, current_role: str, target_role: str, model_id: str = "", user_id: str = "") -> dict:
    """Find optimal skill paths for transitioning between roles."""
    mid = store.resolve_model_id(model_id, user_id) if model_id else ""
    ds = store.datasets.get(mid, {})
    wd = ds.get("work_design", pd.DataFrame())

    # Get skills for each role from work_design
    def get_role_skills(title: str) -> set:
        skills = set()
        if not wd.empty:
            for _, row in wd.iterrows():
                if str(row.get("Job Title", "")).strip() == title:
                    for col in ["Primary Skill", "Secondary Skill"]:
                        s = str(row.get(col, "")).strip()
                        if s and s != "nan":
                            skills.add(s)
        return skills

    current_skills = get_role_skills(current_role)
    target_skills = get_role_skills(target_role)

    if not current_skills and not target_skills:
        return {"error": True, "message": f"No skills data for '{current_role}' or '{target_role}'."}

    gap_skills = target_skills - current_skills
    shared_skills = current_skills & target_skills
    all_graph_skills = {n["id"] for n in graph.get("nodes", [])}

    # Find paths for each gap skill from the closest current skill
    quick_wins = []  # adjacency > 0.6
    medium_effort = []  # 0.3 - 0.6
    heavy_lift = []  # < 0.3

    for gap in gap_skills:
        if gap not in all_graph_skills:
            heavy_lift.append({"skill": gap, "adjacency": 0, "path": None, "weeks": 12, "approach": "buy"})
            continue

        # Find closest current skill in graph
        best_path = None
        best_adj = 0
        for cs in current_skills:
            if cs not in all_graph_skills:
                continue
            result = find_shortest_path(graph, cs, gap)
            if not result.get("error"):
                # Use the edge weight of the first step as adjacency indicator
                first_adj = result["steps"][0]["adjacency_score"] if result["steps"] else 0
                if first_adj > best_adj:
                    best_adj = first_adj
                    best_path = result

        entry = {
            "skill": gap,
            "adjacency": round(best_adj, 2),
            "path": best_path,
            "weeks": best_path["estimated_weeks"] if best_path else 12,
            "approach": "build" if best_adj >= 0.5 else "borrow" if best_adj >= 0.3 else "buy",
        }

        if best_adj >= 0.6:
            quick_wins.append(entry)
        elif best_adj >= 0.3:
            medium_effort.append(entry)
        else:
            heavy_lift.append(entry)

    total_weeks = sum(e["weeks"] for e in quick_wins + medium_effort + heavy_lift)

    return {
        "current_role": current_role,
        "target_role": target_role,
        "current_skills": sorted(current_skills),
        "target_skills": sorted(target_skills),
        "shared_skills": sorted(shared_skills),
        "gap_count": len(gap_skills),
        "coverage_pct": round(len(shared_skills) / max(len(target_skills), 1) * 100, 1),
        "quick_wins": sorted(quick_wins, key=lambda x: -x["adjacency"]),
        "medium_effort": sorted(medium_effort, key=lambda x: -x["adjacency"]),
        "heavy_lift": sorted(heavy_lift, key=lambda x: -x["adjacency"]),
        "total_weeks": total_weeks,
        "total_months": max(1, round(total_weeks / 4)),
    }
