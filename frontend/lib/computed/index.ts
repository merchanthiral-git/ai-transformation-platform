/**
 * computed/index.ts
 *
 * Barrel export for all deterministic, pure-function computation modules.
 * Import from "@/lib/computed" to access any computed utility without
 * specifying the exact sub-module path.
 *
 * @example
 * import { computeOrgMetrics, classifyReadiness } from "@/lib/computed";
 */

export * from "./orgMetrics";
export * from "./aiImpact";
export * from "./capacityWaterfall";
export * from "./roleClusters";
export * from "./readinessBands";
export * from "./costModel";
export * from "./impactSimulator";
export * from "./orgScenario";
export * from "./headcountPlan";
