"""Confidence calibration for bot findings.

Scores each finding 0.0-1.0 based on data quality, sample size,
benchmark reliability, and prior corrections.
"""

from __future__ import annotations

import pandas as pd


def calibrate_confidence(
    finding: dict,
    workforce_df: pd.DataFrame,
    corrections: list[dict] | None = None,
) -> float:
    """Calculate a calibrated confidence score for a finding."""
    base = 0.8
    adjustments = []

    detail = finding.get("detail", "").lower()
    func = finding.get("function")
    n = len(workforce_df)

    # 1. Data quality — estimated/inferred data lowers confidence
    if "estimate" in detail or "estimated" in detail or "inferred" in detail:
        adjustments.append(-0.25)
    if "limited data" in detail or "sparse" in detail:
        adjustments.append(-0.3)

    # 2. Sample size
    if func and n > 0:
        func_col = None
        for c in workforce_df.columns:
            if "function" in c.lower():
                func_col = c
                break
        if func_col:
            func_count = (workforce_df[func_col] == func).sum()
            if func_count < 20:
                adjustments.append(-0.3)
            elif func_count < 50:
                adjustments.append(-0.15)
            elif func_count >= 100:
                adjustments.append(0.1)
    elif n < 50:
        adjustments.append(-0.2)

    # 3. Benchmark reliability
    if "benchmark" in detail and ("industry" in detail or "published" in detail):
        adjustments.append(0.1)  # Published benchmark → higher confidence
    elif "benchmark" in detail and "estimated" in detail:
        adjustments.append(-0.15)

    # 4. Prior corrections — if user corrected similar findings, lower confidence
    if corrections:
        for corr in corrections:
            corr_text = corr.get("correction", "").lower()
            orig_text = corr.get("original", "").lower()
            if any(word in detail for word in corr_text.split() if len(word) > 4):
                adjustments.append(-0.2)
                break

    # 5. Severity boost — critical findings based on clear thresholds are more reliable
    severity = finding.get("severity", "info")
    if severity == "critical" and any(w in detail for w in ["represents", "fewer than", "more than", "ratio"]):
        adjustments.append(0.1)

    score = base + sum(adjustments)
    return round(max(0.1, min(1.0, score)), 2)


def confidence_label(score: float) -> str:
    """Human-readable confidence label."""
    if score >= 0.8:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"


def confidence_qualifier(score: float) -> str:
    """Optional text qualifier for the finding narration."""
    if score >= 0.8:
        return ""
    if score >= 0.5:
        return "Based on available data, "
    return "This is an estimate based on limited data — I'd recommend validating. "
