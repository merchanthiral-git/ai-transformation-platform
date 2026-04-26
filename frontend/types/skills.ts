/* ═══════════════════════════════════════════════════════════════
   Skills Architecture — Type Definitions
   ═══════════════════════════════════════════════════════════════ */

export type Proficiency = 1 | 2 | 3 | 4 | 5;
// Anchors: 1=Aware, 2=Practicing, 3=Proficient, 4=Advanced, 5=Expert

export const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  1: "Aware",
  2: "Practicing",
  3: "Proficient",
  4: "Advanced",
  5: "Expert",
};

export type SkillCriticality = "critical" | "important" | "useful";

export type AIImpact =
  | "augmentable"   // AI accelerates the human
  | "substitutable" // AI can do this directly
  | "resistant"     // human-only, judgment-heavy
  | "emerging";     // new because of AI

export type SkillLifecycle =
  | "active"
  | "emerging"   // new, growing demand
  | "deprecated" // declining but not gone
  | "obsolete";  // remove from taxonomy

export type SkillCategory = "technical" | "behavioral" | "domain";

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description?: string;
  aiImpact: AIImpact;
  lifecycle: SkillLifecycle;
  adjacentSkillIds: string[];
  aliases?: string[];
  version: string; // semver, default "1.0.0"
  deprecatedReason?: string;
  deprecatedInFavorOf?: string; // skill id
}

export type SkillAssignmentType = "core" | "supporting" | "new" | "declining" | "obsolete";

export interface JobSkillAssignment {
  skillId: string;
  type: SkillAssignmentType;
  requiredProficiency: Proficiency;
  criticality: SkillCriticality;
  weight: number; // 0-100
  derivedFromTaskIds: string[];
  confidence?: number; // 0-1, from derivation
  source?: "rules" | "llm" | "manual";
}

export interface JobSkillBundle {
  jobId: string;
  skills: JobSkillAssignment[];
  status: "pending" | "review" | "approved";
  lastUpdated: string; // ISO
}

export interface EmployeeSkillRecord {
  employeeId: string;
  skillId: string;
  proficiency: Proficiency;
  selfAssessed: boolean;
  lastValidated?: string;
}

export interface SkillShift {
  skillId: string;
  fromState: { jobIds: string[]; avgWeight: number };
  toState: { jobIds: string[]; avgWeight: number };
  direction: "increasing" | "decreasing" | "new" | "obsolete";
  magnitude: number; // -100 to +1000+
}
