/**
 * readinessBands.ts
 *
 * Classifies employees or cohorts into discrete readiness bands based on a
 * composite AI-readiness score (0–5 scale as used throughout the platform).
 *
 * Band definitions:
 *   ReadyNow  — score >= 3.5  — strong digital literacy, embraces change
 *   Coachable — score >= 2.0  — moderate baseline, upskillable with support
 *   AtRisk    — score <  2.0  — significant skill gap, requires intensive intervention
 *
 * All exports are pure functions with no side effects.
 */

/** The three readiness bands used across the platform's talent analytics. */
export type ReadinessBand = "ReadyNow" | "Coachable" | "AtRisk";

/**
 * Map a numeric AI-readiness score to a readiness band label.
 *
 * @param score - Composite readiness score on a 0–5 scale.
 * @returns The corresponding `ReadinessBand` string literal.
 *
 * @example
 * classifyReadiness(4.1)  // → "ReadyNow"
 * classifyReadiness(2.8)  // → "Coachable"
 * classifyReadiness(1.3)  // → "AtRisk"
 */
export function classifyReadiness(score: number): ReadinessBand {
  if (score >= 3.5) return "ReadyNow";
  if (score >= 2.0) return "Coachable";
  return "AtRisk";
}
