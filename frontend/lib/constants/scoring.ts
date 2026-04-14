/**
 * Business logic scoring thresholds — extracted from magic numbers across modules.
 * Centralizing these makes threshold changes propagate everywhere at once.
 */

// ── AI Impact Classification ──
/** Below this % saved → "Enhanced" (AI augments the role) */
export const AUTOMATION_THRESHOLD_LOW = 30;
/** Between LOW and HIGH → "Redesigned" (significantly changed) */
export const AUTOMATION_THRESHOLD_HIGH = 60;

// ── Readiness Scoring ──
/** Score >= this → "High readiness" (green) */
export const AI_READINESS_HIGH = 80;
/** Score >= this → "Medium readiness" (amber) */
export const AI_READINESS_MEDIUM = 60;

// ── Impact Scoring (Heatmap) ──
export const IMPACT_SCORE_HIGH = 6;
export const IMPACT_SCORE_MEDIUM = 3.5;

// ── Risk Scoring ──
export const RISK_SCORE_HIGH = 16;
export const RISK_SCORE_MEDIUM = 9;

// ── Simulation Parameters ──
export const TIMELINE_ACCELERATION_FACTOR = 0.4;
export const ADOPTION_HIGH_THRESHOLD = 40;
export const ADOPTION_LOW_THRESHOLD = 20;
