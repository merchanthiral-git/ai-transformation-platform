/* ═══════════════════════════════════════════════════════════════
   Design Paths — Engine Registry
   ═══════════════════════════════════════════════════════════════ */

import { AIReadinessPathEngine } from "./engines/AIReadinessPathEngine";

export const PATH_ENGINES = {
  readiness: AIReadinessPathEngine,
  // future: scan, orghealth, skills, changeready
} as const;
