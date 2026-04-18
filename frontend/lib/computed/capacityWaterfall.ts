/**
 * capacityWaterfall.ts
 *
 * Models how workforce capacity (measured in hours) flows through an AI
 * transformation scenario:
 *
 *   currentHours      — total hours in scope before any change
 *   freedHours        — hours released by AI automation / augmentation
 *   reinvestedHours   — freed hours redirected to higher-value work
 *   eliminatedHours   — freed hours associated with roles that will be
 *                       reduced or removed (not reinvested)
 *
 * The waterfall identity is:
 *   freedHours = reinvestedHours + eliminatedHours
 *
 * All exports are pure functions with no side effects.
 */

/** Shape returned by `computeCapacityWaterfall`. */
export interface WaterfallResult {
  /** Total workforce hours currently in scope (FTEs × annual hours). */
  currentHours: number;
  /** Hours unlocked by AI tools — the starting "freed" pool. */
  freedHours: number;
  /** Subset of freedHours to be redirected to growth / value-add work. */
  reinvestedHours: number;
  /** Subset of freedHours attributed to roles targeted for elimination. */
  eliminatedHours: number;
}

/**
 * Compute a capacity waterfall from task records and their disposition decisions.
 *
 * The stub returns zeros for all fields. A real implementation would:
 *   1. Sum task hours weighted by AI-automation probability from `tasks`.
 *   2. Cross-reference `dispositions` (Automate / Augment / Eliminate / Retain)
 *      to split freed capacity into reinvested vs eliminated pools.
 *
 * @param tasks        - Array of task records with hour/FTE estimates.
 * @param dispositions - Array of disposition decisions keyed by task or role id.
 * @returns A `WaterfallResult` object; all values are 0 in the stub.
 */
export function computeCapacityWaterfall(
  tasks: any[],
  dispositions: any[]
): WaterfallResult {
  // TODO: implement waterfall logic once task hour estimates are available.
  void tasks;
  void dispositions;

  return {
    currentHours: 0,
    freedHours: 0,
    reinvestedHours: 0,
    eliminatedHours: 0,
  };
}
