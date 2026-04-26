/* ═══════════════════════════════════════════════════════════════
   Design Paths — Engine Interface
   ═══════════════════════════════════════════════════════════════ */

import type { DesignPath } from "./types";

export interface PathEngine<TAssessmentResult> {
  sourceModuleId: string;
  sourceModuleTitle: string;
  generate(result: TAssessmentResult, projectId: string): DesignPath;
}
