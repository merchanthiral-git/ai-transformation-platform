"""Unit tests for bot analyzers.

Creates a realistic 50-employee test DataFrame and validates every analyzer.
"""

import pytest
import numpy as np
import pandas as pd

from app.bot.analyzers import (
    profile_workforce,
    analyze_org_structure,
    assess_ai_readiness,
    identify_opportunities,
    analyze_skills,
    assess_change_readiness,
    build_scenarios,
    generate_roadmap,
    synthesize_findings,
)


# ── Test fixture: 50 employees, 5 functions, 3 levels ──

FUNCTIONS = ["Technology", "Finance", "Operations", "HR", "Sales"]
LEVELS = ["Analyst", "Manager", "Director"]
JOB_FAMILIES = ["Engineering", "Accounting", "Supply Chain", "People Ops", "Business Dev"]


@pytest.fixture
def workforce_df():
    rng = np.random.RandomState(42)
    n = 50
    emp_ids = [f"E{i:03d}" for i in range(1, n + 1)]
    funcs = rng.choice(FUNCTIONS, n)
    levels = rng.choice(LEVELS, n)
    families = rng.choice(JOB_FAMILIES, n)

    # Managers: first 10 employees are managers, rest report to one of them
    mgr_ids = [""] * n
    for i in range(10, n):
        mgr_ids[i] = emp_ids[rng.randint(0, 10)]

    titles = []
    for i in range(n):
        if i < 3:
            titles.append("VP of " + funcs[i])
        elif i < 10:
            titles.append("Manager, " + families[i % len(JOB_FAMILIES)])
        else:
            role = rng.choice(["Analyst", "Coordinator", "Specialist", "Engineer", "Associate"])
            titles.append(f"Senior {role}" if levels[i] != "Analyst" else role)

    hire_dates = pd.date_range("2015-01-01", periods=n, freq="55D").strftime("%Y-%m-%d").tolist()
    salaries = rng.randint(50000, 180000, n)
    ftes = np.where(rng.random(n) < 0.9, 1.0, 0.5)

    return pd.DataFrame({
        "Employee ID": emp_ids,
        "Employee Name": [f"Person {i}" for i in range(1, n + 1)],
        "Manager ID": mgr_ids,
        "Function ID": funcs,
        "Career Level": levels,
        "Job Family": families,
        "Job Title": titles,
        "Hire Date": hire_dates,
        "Base Pay": salaries,
        "FTE": ftes,
    })


@pytest.fixture
def tasks_df():
    """Small task-level dataset for 3 roles."""
    rows = []
    for title in ["Analyst", "Coordinator", "Engineer"]:
        for i in range(5):
            rows.append({
                "Job Title": title,
                "Task Name": f"Task {i+1}",
                "AI Impact": np.random.randint(20, 90),
                "Time %": np.random.randint(10, 30),
            })
    return pd.DataFrame(rows)


# ═══ Tests ═══════════════════════════════════════════════════════

class TestProfileWorkforce:
    def test_returns_expected_keys(self, workforce_df):
        result = profile_workforce(workforce_df)
        assert "total_headcount" in result
        assert "headcount_by_function" in result
        assert "headcount_by_career_level" in result
        assert "avg_tenure_years" in result
        assert "tenure_distribution" in result
        assert "manager_count" in result
        assert "ic_count" in result
        assert "notable_observations" in result

    def test_headcount_correct(self, workforce_df):
        result = profile_workforce(workforce_df)
        assert result["total_headcount"] == 50

    def test_all_functions_present(self, workforce_df):
        result = profile_workforce(workforce_df)
        assert len(result["headcount_by_function"]) == len(FUNCTIONS)

    def test_tenure_reasonable(self, workforce_df):
        result = profile_workforce(workforce_df)
        assert 0 < result["avg_tenure_years"] < 30

    def test_tenure_distribution_sums(self, workforce_df):
        result = profile_workforce(workforce_df)
        total = sum(d["count"] for d in result["tenure_distribution"].values())
        assert total == 50

    def test_manager_ic_sum(self, workforce_df):
        result = profile_workforce(workforce_df)
        assert result["manager_count"] + result["ic_count"] == 50

    def test_observations_nonempty(self, workforce_df):
        result = profile_workforce(workforce_df)
        assert len(result["notable_observations"]) > 0

    def test_empty_df(self):
        result = profile_workforce(pd.DataFrame())
        assert result["total_headcount"] == 0


class TestOrgStructure:
    def test_returns_expected_keys(self, workforce_df):
        result = analyze_org_structure(workforce_df)
        assert "total_layers" in result
        assert "span_of_control" in result
        assert "structural_issues" in result

    def test_layers_positive(self, workforce_df):
        result = analyze_org_structure(workforce_df)
        assert result["total_layers"] >= 1

    def test_span_reasonable(self, workforce_df):
        result = analyze_org_structure(workforce_df)
        span = result["span_of_control"]
        assert span["avg"] >= 0
        assert span["max"] >= span["min"]

    def test_issues_nonempty(self, workforce_df):
        result = analyze_org_structure(workforce_df)
        assert len(result["structural_issues"]) > 0


class TestAiReadiness:
    def test_returns_expected_keys(self, workforce_df):
        result = assess_ai_readiness(workforce_df)
        assert "scores_by_function" in result
        assert "readiness_gap" in result
        assert "readiness_insights" in result

    def test_all_functions_scored(self, workforce_df):
        result = assess_ai_readiness(workforce_df)
        assert len(result["scores_by_function"]) == len(FUNCTIONS)

    def test_scores_in_range(self, workforce_df):
        result = assess_ai_readiness(workforce_df)
        for func, scores in result["scores_by_function"].items():
            assert 0 <= scores["overall"] <= 100
            assert scores["maturity"] in {"Nascent", "Emerging", "Developing", "Advanced", "Leading"}

    def test_insights_nonempty(self, workforce_df):
        result = assess_ai_readiness(workforce_df)
        assert len(result["readiness_insights"]) > 0


class TestOpportunities:
    def test_returns_expected_keys(self, workforce_df):
        result = identify_opportunities(workforce_df)
        assert "opportunities" in result
        assert "quadrant_summary" in result
        assert "total_addressable_savings" in result
        assert "opportunity_highlights" in result

    def test_opportunities_nonempty(self, workforce_df):
        result = identify_opportunities(workforce_df)
        assert len(result["opportunities"]) > 0

    def test_savings_positive(self, workforce_df):
        result = identify_opportunities(workforce_df)
        assert result["total_addressable_savings"] > 0

    def test_quadrants_populated(self, workforce_df):
        result = identify_opportunities(workforce_df)
        assert len(result["quadrant_summary"]) > 0

    def test_with_tasks(self, workforce_df, tasks_df):
        result = identify_opportunities(workforce_df, tasks_df)
        assert len(result["opportunities"]) > 0

    def test_highlights_nonempty(self, workforce_df):
        result = identify_opportunities(workforce_df)
        assert len(result["opportunity_highlights"]) > 0


class TestSkills:
    def test_returns_expected_keys(self, workforce_df):
        result = analyze_skills(workforce_df)
        assert "skill_priorities" in result

    def test_priorities_nonempty(self, workforce_df):
        result = analyze_skills(workforce_df)
        assert len(result["skill_priorities"]) > 0

    def test_estimated_needs(self, workforce_df):
        result = analyze_skills(workforce_df)
        if "estimated_needs_by_family" in result:
            assert len(result["estimated_needs_by_family"]) > 0


class TestChangeReadiness:
    def test_returns_expected_keys(self, workforce_df):
        result = assess_change_readiness(workforce_df)
        assert "overall_segments" in result
        assert "overall_pct" in result
        assert "by_function" in result
        assert "change_insights" in result

    def test_segments_sum_to_total(self, workforce_df):
        result = assess_change_readiness(workforce_df)
        total = sum(result["overall_segments"].values())
        assert total == 50

    def test_percentages_sum_to_100(self, workforce_df):
        result = assess_change_readiness(workforce_df)
        total_pct = sum(result["overall_pct"].values())
        assert abs(total_pct - 100) < 1  # Allow rounding error

    def test_at_least_two_segments(self, workforce_df):
        result = assess_change_readiness(workforce_df)
        # With 50 employees, not all 4 segments may be populated, but we need at least 2
        assert len(result["overall_segments"]) >= 2
        for seg in result["overall_segments"]:
            assert seg in {"Champion", "Training Need", "Change Mgmt Need", "High Risk"}

    def test_insights_nonempty(self, workforce_df):
        result = assess_change_readiness(workforce_df)
        assert len(result["change_insights"]) > 0


class TestBuildScenarios:
    def test_returns_three_scenarios(self, workforce_df):
        opps = identify_opportunities(workforce_df)
        result = build_scenarios(workforce_df, opps)
        assert "conservative" in result["scenarios"]
        assert "moderate" in result["scenarios"]
        assert "aggressive" in result["scenarios"]

    def test_aggressive_higher_than_conservative(self, workforce_df):
        opps = identify_opportunities(workforce_df)
        result = build_scenarios(workforce_df, opps)
        s = result["scenarios"]
        assert s["aggressive"]["year1_savings"] >= s["conservative"]["year1_savings"]

    def test_scenario_keys(self, workforce_df):
        opps = identify_opportunities(workforce_df)
        result = build_scenarios(workforce_df, opps)
        for label in ["conservative", "moderate", "aggressive"]:
            sc = result["scenarios"][label]
            assert "gross_fte_reduction" in sc
            assert "net_fte_reduction" in sc
            assert "year1_savings" in sc
            assert "investment" in sc
            assert "payback_months" in sc

    def test_recommendation_string(self, workforce_df):
        opps = identify_opportunities(workforce_df)
        result = build_scenarios(workforce_df, opps)
        assert len(result["scenario_recommendation"]) > 10


class TestGenerateRoadmap:
    def test_returns_phases(self, workforce_df):
        opps = identify_opportunities(workforce_df)
        scenario = build_scenarios(workforce_df, opps)["scenarios"]["moderate"]
        change = assess_change_readiness(workforce_df)
        result = generate_roadmap(scenario, change)
        assert len(result["phases"]) >= 3
        assert result["total_workstreams"] > 0

    def test_workstreams_have_required_fields(self, workforce_df):
        opps = identify_opportunities(workforce_df)
        scenario = build_scenarios(workforce_df, opps)["scenarios"]["moderate"]
        change = assess_change_readiness(workforce_df)
        result = generate_roadmap(scenario, change)
        for ws in result["workstreams"]:
            assert "name" in ws
            assert "phase" in ws
            assert "effort" in ws
            assert "status" in ws

    def test_notes_nonempty(self, workforce_df):
        opps = identify_opportunities(workforce_df)
        scenario = build_scenarios(workforce_df, opps)["scenarios"]["moderate"]
        change = assess_change_readiness(workforce_df)
        result = generate_roadmap(scenario, change)
        assert len(result["roadmap_notes"]) > 0


class TestSynthesizeFindings:
    def test_returns_expected_keys(self, workforce_df):
        profile = profile_workforce(workforce_df)
        org = analyze_org_structure(workforce_df)
        readiness = assess_ai_readiness(workforce_df)
        opps = identify_opportunities(workforce_df)
        skills = analyze_skills(workforce_df)
        change = assess_change_readiness(workforce_df)

        all_results = {
            "workforce_profile": profile,
            "org_structure": org,
            "ai_readiness": readiness,
            "opportunities": opps,
            "skills": skills,
            "change_readiness": change,
        }
        result = synthesize_findings(all_results)
        assert "findings" in result
        assert "themes" in result
        assert "big_3" in result
        assert "executive_summary" in result

    def test_big3_has_entries(self, workforce_df):
        profile = profile_workforce(workforce_df)
        org = analyze_org_structure(workforce_df)
        readiness = assess_ai_readiness(workforce_df)
        opps = identify_opportunities(workforce_df)
        skills = analyze_skills(workforce_df)
        change = assess_change_readiness(workforce_df)

        all_results = {
            "workforce_profile": profile,
            "org_structure": org,
            "ai_readiness": readiness,
            "opportunities": opps,
            "skills": skills,
            "change_readiness": change,
        }
        result = synthesize_findings(all_results)
        assert len(result["big_3"]) >= 1

    def test_executive_summary_nonempty(self, workforce_df):
        all_results = {
            "workforce_profile": profile_workforce(workforce_df),
            "org_structure": analyze_org_structure(workforce_df),
            "ai_readiness": assess_ai_readiness(workforce_df),
            "opportunities": identify_opportunities(workforce_df),
            "skills": analyze_skills(workforce_df),
            "change_readiness": assess_change_readiness(workforce_df),
        }
        result = synthesize_findings(all_results)
        assert len(result["executive_summary"]) > 50
