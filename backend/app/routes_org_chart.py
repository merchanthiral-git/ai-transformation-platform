"""Org Chart — API endpoints.

Dedicated endpoints for tree traversal, lazy subtree loading,
search with fuzzy matching, and aggregate org stats.
Reads from in-memory workforce data + JA tables.
"""

from collections import Counter, defaultdict
from fastapi import APIRouter, Query
from app.store import store, get_manager_candidates
from app.helpers import get_series
from app.shared import _safe

router = APIRouter(prefix="/api/v1/org-chart", tags=["org-chart"])


def _build_tree(wf, max_depth=3, root_id=None, functions=None):
    """Build org tree from workforce DataFrame."""
    if wf is None or wf.empty or "Employee Name" not in wf.columns:
        return None, {}

    nodes = {}
    for _, row in wf.iterrows():
        eid = str(row.get("Employee ID", ""))
        name = str(row.get("Employee Name", ""))
        if not eid or not name:
            continue
        nodes[name] = {
            "id": eid, "name": name,
            "title": str(row.get("Job Title", "")),
            "level": str(row.get("Career Level", "")),
            "track": str(row.get("Career Track", "")),
            "function": str(row.get("Function ID", "")),
            "family": str(row.get("Job Family", "")),
            "sub_family": str(row.get("Sub-Family", "")),
            "geography": str(row.get("Geography", "")),
            "manager_name": str(row.get("Manager Name", "")),
            "children": [],
            "direct_report_count": 0,
            "total_subtree_count": 1,
            "layers_below": 0,
        }

    # Build parent-child relationships
    roots = []
    for name, node in nodes.items():
        mgr = node["manager_name"]
        parent = nodes.get(mgr)
        if parent and parent["id"] != node["id"]:
            parent["children"].append(node)
        else:
            roots.append(node)

    # Compute subtree counts and layers
    def compute_stats(n):
        count = 1
        max_layer = 0
        n["direct_report_count"] = len(n["children"])
        for c in n["children"]:
            c_count, c_layers = compute_stats(c)
            count += c_count
            max_layer = max(max_layer, c_layers + 1)
        n["total_subtree_count"] = count
        n["layers_below"] = max_layer
        return count, max_layer

    for r in roots:
        compute_stats(r)

    # Sort children by subtree size (largest first)
    def sort_children(n):
        n["children"].sort(key=lambda c: c["total_subtree_count"], reverse=True)
        for c in n["children"]:
            sort_children(c)
    for r in roots:
        sort_children(r)

    # Find root
    if root_id:
        def find_node(n, target_id):
            if n["id"] == target_id:
                return n
            for c in n["children"]:
                found = find_node(c, target_id)
                if found:
                    return found
            return None
        root = None
        for r in roots:
            root = find_node(r, root_id)
            if root:
                break
        if not root and roots:
            root = roots[0]
    else:
        root = roots[0] if roots else None

    if not root:
        return None, {}

    # Trim to max_depth and apply function filter
    def trim(n, depth, max_d):
        node = {k: v for k, v in n.items() if k != "children"}
        node["manager_name"] = n.get("manager_name", "")
        # Function filter: dim but don't remove
        if functions and n["function"] not in functions:
            node["dimmed"] = True
        else:
            node["dimmed"] = False

        if depth < max_d:
            node["children"] = [trim(c, depth + 1, max_d) for c in n["children"]]
        else:
            node["children"] = []
            node["has_children"] = len(n["children"]) > 0
        return node

    trimmed = trim(root, 0, max_depth)

    # Compute meta stats
    all_nodes_flat = []
    def flatten(n):
        all_nodes_flat.append(n)
        for c in n.get("children", []):
            flatten(c)
    flatten(root)

    spans = [n["direct_report_count"] for n in all_nodes_flat if n["direct_report_count"] > 0]
    median_span = sorted(spans)[len(spans) // 2] if spans else 0
    functions_set = set(n["function"] for n in all_nodes_flat if n["function"])

    # Count mapping statuses and flags (simplified — from JA data if available)
    unmapped_count = 0
    flagged_count = 0

    meta = {
        "total_people": root["total_subtree_count"],
        "total_layers": root["layers_below"] + 1,
        "median_span": median_span,
        "unmapped_count": unmapped_count,
        "flagged_count": flagged_count,
        "functions": sorted(functions_set),
    }

    return trimmed, meta


@router.get("/tree")
def get_tree(model_id: str = "Demo_Model", root: str = "",
             depth: int = 3, functions: str = "",
             engagement_id: str = ""):
    mid = store.resolve_model_id(model_id)
    if mid not in store.datasets:
        return _safe({"root": None, "meta": {}})

    data = store.get_filtered_data(mid, {"func": "All", "jf": "All", "sf": "All", "cl": "All"})
    wf = data.get("workforce")

    func_list = [f.strip() for f in functions.split(",") if f.strip()] if functions else None
    tree, meta = _build_tree(wf, max_depth=depth, root_id=root or None, functions=func_list)

    return _safe({"root": tree, "meta": meta})


@router.get("/subtree/{employee_id}")
def get_subtree(employee_id: str, model_id: str = "Demo_Model",
                depth: int = 1, engagement_id: str = ""):
    mid = store.resolve_model_id(model_id)
    if mid not in store.datasets:
        return _safe({"root": None})

    data = store.get_filtered_data(mid, {"func": "All", "jf": "All", "sf": "All", "cl": "All"})
    wf = data.get("workforce")
    tree, _ = _build_tree(wf, max_depth=depth + 5, root_id=employee_id)
    # Return just this node's children trimmed to requested depth
    if tree:
        def trim_depth(n, d, max_d):
            node = {k: v for k, v in n.items() if k != "children"}
            if d < max_d:
                node["children"] = [trim_depth(c, d + 1, max_d) for c in n.get("children", [])]
            else:
                node["children"] = []
                node["has_children"] = len(n.get("children", [])) > 0
            return node
        tree = trim_depth(tree, 0, depth)

    return _safe({"root": tree})


@router.get("/search")
def search_org(query: str = "", model_id: str = "Demo_Model",
               limit: int = 20, engagement_id: str = ""):
    if len(query) < 2:
        return {"results": [], "total": 0}

    mid = store.resolve_model_id(model_id)
    if mid not in store.datasets:
        return {"results": [], "total": 0}

    data = store.get_filtered_data(mid, {"func": "All", "jf": "All", "sf": "All", "cl": "All"})
    wf = data.get("workforce")
    if wf is None or wf.empty:
        return {"results": [], "total": 0}

    q = query.lower()
    results = []
    for _, row in wf.iterrows():
        name = str(row.get("Employee Name", ""))
        title = str(row.get("Job Title", ""))
        eid = str(row.get("Employee ID", ""))
        func = str(row.get("Function ID", ""))
        level = str(row.get("Career Level", ""))

        # Scoring
        score = 0
        match_field = ""
        if name.lower() == q:
            score = 100; match_field = "name"
        elif name.lower().startswith(q):
            score = 80; match_field = "name"
        elif q in name.lower():
            score = 60; match_field = "name"
        elif title.lower().startswith(q):
            score = 70; match_field = "title"
        elif q in title.lower():
            score = 50; match_field = "title"
        elif eid.lower() == q:
            score = 90; match_field = "id"

        if score > 0:
            results.append({
                "type": "employee",
                "id": eid, "name": name, "title": title,
                "function": func, "level": level,
                "match_field": match_field,
                "match_confidence": score / 100,
            })

    results.sort(key=lambda r: r["match_confidence"], reverse=True)
    return {"results": results[:limit], "total": len(results)}


@router.get("/stats")
def get_stats(model_id: str = "Demo_Model", functions: str = "",
              engagement_id: str = ""):
    mid = store.resolve_model_id(model_id)
    if mid not in store.datasets:
        return _safe({})

    data = store.get_filtered_data(mid, {"func": "All", "jf": "All", "sf": "All", "cl": "All"})
    wf = data.get("workforce")
    if wf is None or wf.empty:
        return _safe({"total_people": 0, "total_layers": 0, "median_span": 0})

    mgr_df = get_manager_candidates(wf)
    spans = []
    if mgr_df is not None and not mgr_df.empty and "Direct Reports" in mgr_df.columns:
        spans = mgr_df["Direct Reports"].dropna().astype(int).tolist()

    median_span = sorted(spans)[len(spans) // 2] if spans else 0
    layers = int(get_series(wf, "Career Level").nunique()) if "Career Level" in wf.columns else 0
    funcs = sorted(get_series(wf, "Function ID").dropna().unique().tolist()) if "Function ID" in wf.columns else []

    span_dist = dict(Counter(min(s, 15) for s in spans))
    layer_dist = dict(get_series(wf, "Career Level").value_counts()) if "Career Level" in wf.columns else {}

    return _safe({
        "total_people": len(wf),
        "total_layers": layers,
        "median_span": median_span,
        "functions": funcs,
        "span_distribution": span_dist,
        "layer_distribution": layer_dist,
    })
