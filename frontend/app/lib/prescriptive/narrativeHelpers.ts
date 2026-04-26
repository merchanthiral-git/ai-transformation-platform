/* ═══════════════════════════════════════════════════════════════
   Prescriptive Diagnose Framework — Narrative Helpers

   Small utilities for natural-sounding narrative generation.
   ═══════════════════════════════════════════════════════════════ */

/** Pick the right indefinite article */
export function article(word: string): "a" | "an" {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

/** Convert a score to qualitative language */
export function qualifyScore(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.8) return "well above the threshold for sustained adoption";
  if (pct >= 0.7) return "above average, with room for targeted improvement";
  if (pct >= 0.5) return "near the midpoint — functional but fragile under pressure";
  if (pct >= 0.3) return "below the threshold most organizations need before scaling";
  return "well below the threshold for sustained adoption";
}

/** Format an org-size descriptor */
export function orgScale(employeeCount?: number): string {
  if (!employeeCount) return "your organization";
  if (employeeCount < 100) return "a small team";
  if (employeeCount < 500) return "a mid-size organization";
  if (employeeCount < 2000) return "a mid-cap organization";
  if (employeeCount < 10000) return "a large organization";
  return "an enterprise-scale organization";
}

/** Pluralize module count */
export function moduleCount(n: number): string {
  return `${n} module${n === 1 ? "" : "s"}`;
}

/** Format a score for display */
export function fmtScore(score: number, max: number = 5): string {
  return `${score.toFixed(1)} of ${max}`;
}

/** Get band name from overall score (0-5 scale) */
export function scoreToBand(score: number): string {
  if (score >= 4.0) return "Leading";
  if (score >= 3.5) return "Advanced";
  if (score >= 2.5) return "Operational";
  if (score >= 1.5) return "Developing";
  return "Foundational";
}
