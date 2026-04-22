"""Expert-tier API routes: diagnostics, risk assessment, implementation, stress testing, interrogation."""

import pandas as pd
from fastapi import APIRouter, Query, HTTPException
from app.store import store, get_manager_candidates
from app.helpers import get_series, safe_value_counts
from app.shared import _safe, _f
from app.expert_engine import run_diagnostics, detect_risks, analyze_implementation, run_stress_test

router = APIRouter(prefix="/api/expert", tags=["expert"])


@router.get("/diagnostics")
def get_diagnostics(model_id: str, industry: str = "technology", size: int = 2000,
                    fn: str = Query("All", alias="func"), jf: str = "All"):
    """Run diagnostic X-Ray on current org."""
    model_id = store.resolve_model_id(model_id)
    if model_id not in store.datasets:
        raise HTTPException(404, "Model not found")
    data = store.get_filtered_data(model_id, _f(fn, jf, "All", "All"))
    source = data["org_design"] if not data["org_design"].empty else data["workforce"]
    diagnostics = run_diagnostics(source, industry, size)
    return _safe({"diagnostics": diagnostics, "total": len(diagnostics)})


@router.post("/risks")
def assess_risks(payload: dict):
    """Assess risks for a set of scenario changes."""
    import pandas as pd
    model_id = payload.get("model_id", "")
    model_id = store.resolve_model_id(model_id)
    nodes = payload.get("nodes", [])
    industry = payload.get("industry", "technology")

    source = pd.DataFrame()
    if model_id in store.datasets:
        data = store.get_filtered_data(model_id, _f("All", "All", "All", "All"))
        source = data["org_design"] if not data["org_design"].empty else data["workforce"]

    risks = detect_risks(nodes, source, industry)
    return _safe({"risks": risks, "total": len(risks)})


@router.post("/implementation")
def analyze_implementation_plan(payload: dict):
    """Analyze implementation pragmatics for scenario changes."""
    model_id = payload.get("model_id", "")
    model_id = store.resolve_model_id(model_id)
    nodes = payload.get("nodes", [])

    source = pd.DataFrame()
    if model_id in store.datasets:
        data = store.get_filtered_data(model_id, _f("All", "All", "All", "All"))
        source = data.get("org_design", pd.DataFrame())
        if source.empty:
            source = data.get("workforce", pd.DataFrame())

    result = analyze_implementation(nodes, source)
    return _safe(result)


@router.post("/stress-test")
def run_stress_test_endpoint(payload: dict):
    """Run stress tests against a scenario."""
    model_id = payload.get("model_id", "")
    model_id = store.resolve_model_id(model_id)
    nodes = payload.get("nodes", [])
    stress_type = payload.get("stress_type", "standard")

    source = pd.DataFrame()
    if model_id in store.datasets:
        data = store.get_filtered_data(model_id, _f("All", "All", "All", "All"))
        source = data.get("org_design", pd.DataFrame())
        if source.empty:
            source = data.get("workforce", pd.DataFrame())

    result = run_stress_test(nodes, source, stress_type)
    return _safe(result)


@router.post("/interrogate")
async def conversational_interrogation(payload: dict):
    """Natural language query over engagement data."""
    from app.ai_providers import call_claude_sync

    question = payload.get("question", "")
    model_id = payload.get("model_id", "")
    model_id = store.resolve_model_id(model_id)

    if not question:
        raise HTTPException(400, "Question is required")

    # Build context from available data
    context_parts = []
    if model_id in store.datasets:
        data = store.get_filtered_data(model_id, _f("All", "All", "All", "All"))
        source = data.get("org_design", data.get("workforce", pd.DataFrame()))
        if not source.empty:
            mgr_df = get_manager_candidates(source)
            total = len(source)
            mgr_count = len(mgr_df) if not mgr_df.empty else 0
            avg_span = round(float(mgr_df["Direct Reports"].mean()), 1) if not mgr_df.empty and "Direct Reports" in mgr_df.columns else 0
            funcs = safe_value_counts(get_series(source, "Function ID"))
            levels = safe_value_counts(get_series(source, "Career Level"))

            context_parts.append(f"Organization: {total} employees, {mgr_count} managers, avg span {avg_span}:1")
            context_parts.append(f"Functions: {dict(funcs)}")
            context_parts.append(f"Levels: {dict(levels)}")

    # Include scenario data if provided
    scenario_nodes = payload.get("scenario_nodes", [])
    if scenario_nodes:
        eliminated = len([n for n in scenario_nodes if n.get("change_type") == "eliminated"])
        created = len([n for n in scenario_nodes if n.get("change_type") == "created"])
        context_parts.append(f"Active scenario: {eliminated} eliminated, {created} created, {len(scenario_nodes)} total nodes")

    context = "\n".join(context_parts)

    prompt = f"""You are an expert org design consultant answering a question about an organization.

Context:
{context}

Question: {question}

Provide a concise, data-driven answer. Reference specific numbers from the context. If you need data that isn't available, say so."""

    try:
        answer = call_claude_sync(prompt)
        return _safe({"question": question, "answer": answer, "context_used": context_parts})
    except Exception as e:
        raise HTTPException(500, f"Query failed: {str(e)}")
