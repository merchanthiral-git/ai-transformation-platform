/**
 * Org scenario computation utilities.
 * Pure functions for org design analysis.
 */

export type ShapeName = "Diamond" | "Pyramid" | "Hourglass" | "Inverted Pyramid" | "Balanced";

export interface ShapeAssessment {
  shape: ShapeName;
  health: "Healthy" | "Needs work" | "Critical";
  risks: string[];
  recommendations: string[];
}

export function computeShape(levelDistribution: Record<string, number>): ShapeAssessment {
  const levels = Object.entries(levelDistribution).sort((a, b) => a[0].localeCompare(b[0]));
  const total = levels.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return { shape: "Balanced", health: "Needs work", risks: ["No data"], recommendations: ["Load workforce data"] };

  // Compute distribution by tier
  const executive = levels.filter(([l]) => l.startsWith("E")).reduce((s, [, v]) => s + v, 0) / total;
  const management = levels.filter(([l]) => l.startsWith("M")).reduce((s, [, v]) => s + v, 0) / total;
  const professional = levels.filter(([l]) => l.startsWith("P")).reduce((s, [, v]) => s + v, 0) / total;
  const midBand = management + professional * 0.5;

  let shape: ShapeName = "Balanced";
  if (midBand > 0.5) shape = "Diamond";
  else if (executive > 0.15) shape = "Inverted Pyramid";
  else if (management < 0.1 && professional > 0.5) shape = "Hourglass";
  else if (executive < 0.05 && management < 0.15) shape = "Pyramid";

  const risks: string[] = [];
  const recommendations: string[] = [];

  if (shape === "Diamond") {
    risks.push("Bloated middle management — decision velocity suffers");
    recommendations.push("Widen M2-M4 spans to 7-9");
    recommendations.push("Compress executive layers with <20 HC each");
  }

  const health = shape === "Balanced" ? "Healthy" : shape === "Pyramid" ? "Healthy" : "Needs work";

  return { shape, health, risks, recommendations };
}

export function computeScenarioDelta(base: Record<string, number>, scenario: Record<string, number>): Record<string, number> {
  return {
    headcountDelta: (scenario.hc || 0) - (base.hc || 0),
    costDelta: (scenario.cost || 0) - (base.cost || 0),
    spanDelta: (scenario.avgS || 0) - (base.avgS || 0),
    layerDelta: (scenario.avgL || 0) - (base.avgL || 0),
  };
}

export function computeImpactScore(delta: Record<string, number>): number {
  // 0-100 score — higher means more change
  const hcImpact = Math.min(Math.abs(delta.headcountDelta || 0) / 50, 1) * 30;
  const costImpact = Math.min(Math.abs(delta.costDelta || 0) / 5000000, 1) * 30;
  const spanImpact = Math.min(Math.abs(delta.spanDelta || 0) / 3, 1) * 20;
  const layerImpact = Math.min(Math.abs(delta.layerDelta || 0) / 2, 1) * 20;
  return Math.round(hcImpact + costImpact + spanImpact + layerImpact);
}
