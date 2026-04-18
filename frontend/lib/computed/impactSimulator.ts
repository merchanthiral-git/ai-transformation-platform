/**
 * impactSimulator.ts
 *
 * Projects multi-year financial return on investment (ROI) for an AI
 * transformation scenario, accounting for one-time transition costs,
 * recurring programme costs, and gross savings from workforce re-design.
 *
 * Year-1 net is typically negative (transition costs dominate).
 * Payback period is the month when cumulative net cash flow turns positive.
 *
 * All exports are pure functions with no side effects.
 */

/** Multi-year ROI projection for a scenario. All monetary values in USD. */
export interface ROIResult {
  /** Annualised gross savings from headcount reduction + productivity gains. */
  grossSavings: number;
  /** One-time costs: severance, retraining, system integration, change management. */
  transitionCosts: number;
  /** Recurring annual programme costs: AI licences, support, governance overhead. */
  ongoingCosts: number;
  /** Net value at end of Year 1: grossSavings - transitionCosts - ongoingCosts. */
  netYear1: number;
  /** Cumulative net value at end of Year 2 (Year 1 net + Year 2 net). */
  netYear2: number;
  /** Cumulative net value at end of Year 3. */
  netYear3: number;
  /**
   * Months from programme start until cumulative net cash flow becomes positive.
   * Returns 0 when the programme is immediately net-positive, or -1 when payback
   * is not projected within the 3-year window.
   */
  paybackMonths: number;
}

/**
 * Estimate the ROI trajectory for a given transformation scenario.
 *
 * The stub returns zeros for all fields. A real implementation would:
 *   1. Pull headcount reduction targets and salary data from `scenario`.
 *   2. Apply `assumptions.severanceMultiple`, `assumptions.retrainingCostPerHead`,
 *      and `assumptions.productivityLiftPercent` to compute each line item.
 *   3. Build a monthly cash-flow model to find the payback month.
 *
 * @param scenario    - Scenario definition (headcount targets, roles in scope, timeline).
 * @param assumptions - Financial assumption overrides (severance, licence costs, etc.).
 * @returns An `ROIResult`; all values are 0 in the stub.
 */
export function computeScenarioROI(scenario: any, assumptions?: any): ROIResult {
  // TODO: implement once scenario schema and financial assumption model are finalised.
  void scenario;
  void assumptions;

  return {
    grossSavings: 0,
    transitionCosts: 0,
    ongoingCosts: 0,
    netYear1: 0,
    netYear2: 0,
    netYear3: 0,
    paybackMonths: 0,
  };
}
