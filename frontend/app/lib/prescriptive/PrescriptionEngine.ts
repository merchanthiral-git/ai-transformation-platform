/* ═══════════════════════════════════════════════════════════════
   Prescriptive Diagnose Framework — Engine Interface

   Every Diagnose module implements this interface to produce a
   personalized roadmap from its assessment result.
   ═══════════════════════════════════════════════════════════════ */

import type { PrescribedRoadmap } from "./types";

export interface PrescriptionEngine<TAssessmentResult> {
  sourceModuleId: string;
  sourceModuleTitle: string;
  generate(assessmentResult: TAssessmentResult): PrescribedRoadmap;
}
