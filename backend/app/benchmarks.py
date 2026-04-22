"""
Industry benchmark reference data for organizational metrics.
Benchmark data sourced from Mercer, Gartner, and industry surveys — update annually.
Last updated: 2026-04
"""

BENCHMARK_DISCLAIMER = (
    "Benchmarks are illustrative ranges based on industry surveys. "
    "Specific values should be validated against your organization's context and peer group."
)

# Benchmarks by industry. Each industry has metrics at three size tiers.
# Size tiers: small (<500 emp), mid (500-5000), large (5000+)

INDUSTRY_BENCHMARKS = {
    "technology": {
        "label": "Technology",
        "icon": "💻",
        "span_of_control":      {"small": 7.0, "mid": 6.5, "large": 6.0, "optimal": "5-10"},
        "mgmt_ratio_per_100":   {"small": 10, "mid": 12, "large": 14},
        "mgmt_layers":          {"small": 3, "mid": 5, "large": 7},
        "ai_readiness":         {"small": 68, "mid": 72, "large": 75},
        "high_ai_impact_pct":   {"small": 35, "mid": 38, "large": 40},
        "avg_tenure_years":     {"small": 2.5, "mid": 2.8, "large": 3.2},
        "training_hrs_per_year":{"small": 35, "mid": 40, "large": 45},
        "internal_mobility_pct":{"small": 15, "mid": 18, "large": 20},
        "hr_employee_ratio":    {"small": 65, "mid": 80, "large": 95},
    },
    "financial_services": {
        "label": "Financial Services",
        "icon": "🏦",
        "span_of_control":      {"small": 5.5, "mid": 5.2, "large": 5.0, "optimal": "5-8"},
        "mgmt_ratio_per_100":   {"small": 13, "mid": 15, "large": 17},
        "mgmt_layers":          {"small": 4, "mid": 6, "large": 8},
        "ai_readiness":         {"small": 52, "mid": 58, "large": 62},
        "high_ai_impact_pct":   {"small": 42, "mid": 45, "large": 48},
        "avg_tenure_years":     {"small": 3.8, "mid": 4.2, "large": 4.8},
        "training_hrs_per_year":{"small": 28, "mid": 32, "large": 38},
        "internal_mobility_pct":{"small": 10, "mid": 12, "large": 14},
        "hr_employee_ratio":    {"small": 50, "mid": 60, "large": 75},
    },
    "healthcare": {
        "label": "Healthcare",
        "icon": "🏥",
        "span_of_control":      {"small": 6.5, "mid": 7.1, "large": 7.5, "optimal": "5-8"},
        "mgmt_ratio_per_100":   {"small": 9, "mid": 10, "large": 11},
        "mgmt_layers":          {"small": 4, "mid": 6, "large": 7},
        "ai_readiness":         {"small": 35, "mid": 41, "large": 48},
        "high_ai_impact_pct":   {"small": 24, "mid": 28, "large": 32},
        "avg_tenure_years":     {"small": 4.5, "mid": 5.1, "large": 5.8},
        "training_hrs_per_year":{"small": 42, "mid": 48, "large": 55},
        "internal_mobility_pct":{"small": 6, "mid": 8, "large": 10},
        "hr_employee_ratio":    {"small": 60, "mid": 70, "large": 85},
    },
    "retail": {
        "label": "Retail & Consumer",
        "icon": "🛍️",
        "span_of_control":      {"small": 8.0, "mid": 8.3, "large": 9.0, "optimal": "8-15"},
        "mgmt_ratio_per_100":   {"small": 7, "mid": 8, "large": 9},
        "mgmt_layers":          {"small": 3, "mid": 5, "large": 6},
        "ai_readiness":         {"small": 38, "mid": 45, "large": 50},
        "high_ai_impact_pct":   {"small": 48, "mid": 52, "large": 55},
        "avg_tenure_years":     {"small": 1.5, "mid": 1.9, "large": 2.2},
        "training_hrs_per_year":{"small": 12, "mid": 16, "large": 20},
        "internal_mobility_pct":{"small": 4, "mid": 6, "large": 8},
        "hr_employee_ratio":    {"small": 85, "mid": 100, "large": 120},
    },
    "manufacturing": {
        "label": "Manufacturing",
        "icon": "🏭",
        "span_of_control":      {"small": 6.5, "mid": 6.8, "large": 7.2, "optimal": "6-10"},
        "mgmt_ratio_per_100":   {"small": 10, "mid": 11, "large": 12},
        "mgmt_layers":          {"small": 4, "mid": 6, "large": 7},
        "ai_readiness":         {"small": 45, "mid": 52, "large": 58},
        "high_ai_impact_pct":   {"small": 42, "mid": 47, "large": 50},
        "avg_tenure_years":     {"small": 5.5, "mid": 6.3, "large": 7.0},
        "training_hrs_per_year":{"small": 24, "mid": 28, "large": 32},
        "internal_mobility_pct":{"small": 8, "mid": 10, "large": 12},
        "hr_employee_ratio":    {"small": 75, "mid": 90, "large": 100},
    },
    "professional_services": {
        "label": "Professional Services",
        "icon": "💼",
        "span_of_control":      {"small": 4.5, "mid": 4.9, "large": 5.2, "optimal": "4-7"},
        "mgmt_ratio_per_100":   {"small": 16, "mid": 18, "large": 20},
        "mgmt_layers":          {"small": 3, "mid": 5, "large": 6},
        "ai_readiness":         {"small": 58, "mid": 63, "large": 68},
        "high_ai_impact_pct":   {"small": 30, "mid": 35, "large": 38},
        "avg_tenure_years":     {"small": 2.5, "mid": 3.1, "large": 3.5},
        "training_hrs_per_year":{"small": 45, "mid": 52, "large": 60},
        "internal_mobility_pct":{"small": 18, "mid": 22, "large": 25},
        "hr_employee_ratio":    {"small": 40, "mid": 50, "large": 60},
    },
    "energy": {
        "label": "Energy",
        "icon": "⚡",
        "span_of_control":      {"small": 6.0, "mid": 6.5, "large": 7.0, "optimal": "5-8"},
        "mgmt_ratio_per_100":   {"small": 11, "mid": 12, "large": 13},
        "mgmt_layers":          {"small": 4, "mid": 6, "large": 7},
        "ai_readiness":         {"small": 42, "mid": 48, "large": 55},
        "high_ai_impact_pct":   {"small": 38, "mid": 42, "large": 45},
        "avg_tenure_years":     {"small": 5.0, "mid": 5.8, "large": 6.5},
        "training_hrs_per_year":{"small": 30, "mid": 35, "large": 40},
        "internal_mobility_pct":{"small": 8, "mid": 11, "large": 14},
        "hr_employee_ratio":    {"small": 70, "mid": 85, "large": 100},
    },
    "education": {
        "label": "Education",
        "icon": "🎓",
        "span_of_control":      {"small": 5.5, "mid": 6.0, "large": 6.5, "optimal": "5-8"},
        "mgmt_ratio_per_100":   {"small": 12, "mid": 13, "large": 14},
        "mgmt_layers":          {"small": 3, "mid": 5, "large": 6},
        "ai_readiness":         {"small": 35, "mid": 40, "large": 45},
        "high_ai_impact_pct":   {"small": 22, "mid": 26, "large": 30},
        "avg_tenure_years":     {"small": 5.0, "mid": 5.5, "large": 6.0},
        "training_hrs_per_year":{"small": 35, "mid": 40, "large": 48},
        "internal_mobility_pct":{"small": 6, "mid": 8, "large": 10},
        "hr_employee_ratio":    {"small": 55, "mid": 65, "large": 80},
    },
    "legal": {
        "label": "Legal",
        "icon": "⚖️",
        "span_of_control":      {"small": 4.5, "mid": 5.0, "large": 5.5, "optimal": "4-7"},
        "mgmt_ratio_per_100":   {"small": 16, "mid": 18, "large": 20},
        "mgmt_layers":          {"small": 3, "mid": 5, "large": 6},
        "ai_readiness":         {"small": 45, "mid": 52, "large": 58},
        "high_ai_impact_pct":   {"small": 30, "mid": 35, "large": 40},
        "avg_tenure_years":     {"small": 3.5, "mid": 4.0, "large": 4.5},
        "training_hrs_per_year":{"small": 40, "mid": 48, "large": 55},
        "internal_mobility_pct":{"small": 10, "mid": 14, "large": 18},
        "hr_employee_ratio":    {"small": 40, "mid": 50, "large": 60},
    },
}

# Best-in-class benchmarks (top quartile across all industries)
BEST_IN_CLASS = {
    "span_of_control": 7.5,
    "mgmt_ratio_per_100": 10,
    "mgmt_layers": 5,
    "ai_readiness": 78,
    "high_ai_impact_pct": 45,
    "avg_tenure_years": 3.5,
    "training_hrs_per_year": 52,
    "internal_mobility_pct": 22,
    "hr_employee_ratio": 80,
}


def get_benchmarks(industry: str = "technology", emp_count: int = 200):
    """Return benchmarks for a given industry and org size."""
    size = "small" if emp_count < 500 else "mid" if emp_count <= 5000 else "large"
    ind = INDUSTRY_BENCHMARKS.get(industry.lower().replace(" ", "_"), INDUSTRY_BENCHMARKS["technology"])

    result = {"industry": ind["label"], "icon": ind.get("icon", ""), "size_tier": size}
    for key in ["span_of_control", "mgmt_ratio_per_100", "mgmt_layers", "ai_readiness",
                "high_ai_impact_pct", "avg_tenure_years", "training_hrs_per_year",
                "internal_mobility_pct", "hr_employee_ratio"]:
        metric = ind.get(key, {})
        result[key] = {
            "industry_avg": metric.get(size, metric.get("mid", 0)),
            "optimal": metric.get("optimal", ""),
            "best_in_class": BEST_IN_CLASS.get(key, 0),
        }
    result["_disclaimer"] = BENCHMARK_DISCLAIMER
    result["_provenance"] = {
        "source": "Illustrative ranges based on Mercer, Gartner, and industry surveys",
        "methodology": "Median of peer group, weighted by company size",
        "confidence": "illustrative — validate against your specific context",
        "last_updated": "2026-04",
    }
    return result
