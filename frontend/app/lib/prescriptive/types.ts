/* ═══════════════════════════════════════════════════════════════
   Prescriptive Diagnose Framework — Core Types
   ═══════════════════════════════════════════════════════════════ */

/** A single recommendation step — one module the user should visit */
export type RoadmapStep = {
  moduleId: string;
  rationale: string;
  emphasis?: string;
  estimatedEffort?: "low" | "medium" | "high";
  confidence: "high" | "inferred" | "open-question";
};

/** A single diagnostic finding */
export type DiagnosisItem = {
  title: string;
  finding: string;
  whyItMatters: string;
  cost: string;
  whatGoodLooksLike: string;
  severity: "critical" | "important" | "watch";
  confidence: "high" | "inferred" | "open-question";
};

/** A strategic question for the leadership team */
export type StrategicQuestion = {
  question: string;
  framing: string;
  category: "leadership" | "talent" | "governance" | "culture" | "operations";
};

/** The full prescribed path produced by a diagnostic module */
export type PrescribedRoadmap = {
  sourceModuleId: string;
  sourceModuleTitle: string;
  generatedAt: string;
  findingsSummary: string;
  band: string;
  bandDescription: string;
  diagnosis: DiagnosisItem[];
  steps: RoadmapStep[];
  strategicQuestions: StrategicQuestion[];
  honestCaveat: string;
};
