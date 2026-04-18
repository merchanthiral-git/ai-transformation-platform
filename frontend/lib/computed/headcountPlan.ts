/**
 * Headcount Planning pure computation functions.
 * All assumptions are documented inline with practitioner sources.
 */

export interface WaterfallStep {
  label: string;
  hc: number;
  delta: number;
  color: "neutral" | "risk" | "warn" | "success" | "info";
}

export interface FinancialImpact {
  annualSavings: number;
  hiringCost: number;
  transitionCost: number;
  netYear1: number;
  year2Cumulative: number;
  year3Cumulative: number;
}

export interface CompositionShift {
  track: "E" | "M" | "P" | "S" | "T";
  current: number;
  target: number;
  currentPct: number;
  targetPct: number;
}

/**
 * Compute the headcount waterfall steps from planning inputs.
 * Each step shows cumulative headcount and the delta from the previous step.
 */
export function computeWaterfall(input: {
  startingHC: number;
  eliminations: number;
  naturalAttrition: number;
  redeployed: number;
  newHires: number;
  contractors?: number;
}): WaterfallStep[] {
  const { startingHC, eliminations, naturalAttrition, redeployed, newHires, contractors = 0 } = input;
  const afterElim = startingHC - eliminations;
  const afterAttrition = afterElim - naturalAttrition;
  const afterRedeploy = afterAttrition + redeployed;
  const afterHires = afterRedeploy + newHires;
  const target = afterHires + contractors;

  return [
    { label: "Starting", hc: startingHC, delta: 0, color: "neutral" },
    { label: "Eliminated", hc: afterElim, delta: -eliminations, color: "risk" },
    { label: "Attrition", hc: afterAttrition, delta: -naturalAttrition, color: "warn" },
    { label: "Redeployed", hc: afterRedeploy, delta: redeployed, color: "info" },
    { label: "New Hires", hc: afterHires, delta: newHires, color: "success" },
    ...(contractors > 0 ? [{ label: "Contractors", hc: target, delta: contractors, color: "info" as const }] : []),
    { label: "Target", hc: target, delta: 0, color: "neutral" },
  ];
}

/**
 * Compute financial impact of the headcount transition.
 *
 * Assumptions (documented per Mercer CompDB 2024):
 * - avgLoadedCost: $150,000 — Mercer median loaded cost for US professional services
 * - severanceMonths: 6 — Mercer median for involuntary separations in professional services
 * - onboardingCost: $20,000 per hire — includes recruiting, training, productivity ramp
 * - Year 2 assumes full-year savings with no transition costs
 * - Year 3 assumes compounding from process maturity (+5% efficiency)
 */
export function computeFinancialImpact(input: {
  eliminations: number;
  newHires: number;
  naturalAttrition?: number;
  avgLoadedCost?: number;
  severanceMonths?: number;
  onboardingCost?: number;
}): FinancialImpact {
  const {
    eliminations,
    newHires,
    naturalAttrition = 0,
    avgLoadedCost = 150_000,
    severanceMonths = 6,
    onboardingCost = 20_000,
  } = input;

  const annualSavings = eliminations * avgLoadedCost;
  const hiringCost = newHires * (avgLoadedCost * 0.3 + onboardingCost);
  // Severance only applies to forced separations (eliminations minus what attrition absorbs)
  const forcedSeparations = Math.max(0, eliminations - naturalAttrition);
  const severanceCost = forcedSeparations * avgLoadedCost * (severanceMonths / 12);
  const transitionCost = severanceCost + (newHires * onboardingCost);

  const netYear1 = annualSavings - hiringCost - transitionCost;
  const year2Cumulative = netYear1 + annualSavings; // full savings, no transition costs
  const year3Cumulative = year2Cumulative + annualSavings * 1.05; // +5% efficiency gain

  return { annualSavings, hiringCost, transitionCost, netYear1, year2Cumulative, year3Cumulative };
}

/**
 * Compute workforce composition shift by career track.
 * Tracks: E (Executive), M (Management), P (Professional), S (Support), T (Technical)
 */
export function computeCompositionShift(input: {
  currentByTrack: Record<string, number>;
  targetByTrack: Record<string, number>;
}): CompositionShift[] {
  const tracks: Array<"E" | "M" | "P" | "S" | "T"> = ["E", "M", "P", "S", "T"];
  const currentTotal = Object.values(input.currentByTrack).reduce((s, v) => s + v, 0) || 1;
  const targetTotal = Object.values(input.targetByTrack).reduce((s, v) => s + v, 0) || 1;

  return tracks.map(track => ({
    track,
    current: input.currentByTrack[track] || 0,
    target: input.targetByTrack[track] || 0,
    currentPct: Math.round(((input.currentByTrack[track] || 0) / currentTotal) * 100),
    targetPct: Math.round(((input.targetByTrack[track] || 0) / targetTotal) * 100),
  }));
}
