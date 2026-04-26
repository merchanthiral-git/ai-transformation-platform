/* ═══════════════════════════════════════════════════════════════
   Design Paths — Core Types
   ═══════════════════════════════════════════════════════════════ */

export type StepStatus = "complete" | "in-progress" | "pending";

export type Stakeholder = string;

export type PathLifecycleState = "active" | "paused" | "off";

export type StepTiming = {
  minWeeks: number;
  maxWeeks: number;
  actualWeeks?: number;
  edited: boolean;
};

export type StepCompletionCriterion = {
  description: string;
  autoDetectFn?: string;
  howToInModule?: string[];
};

export type SubStep = {
  tabId: string;
  tabLabel: string;
  title: string;
  criterion: string;
  howToDoIt: string[];
  completedAt?: string;
  completedManually?: boolean;
  suggestedOrder: number;
};

export type ModuleTabContext = {
  moduleId: string;
  pathRequiredTabs: string[];
  optionalTabNotices: Record<string, { label: string; whatItDoes: string }>;
};

export type DesignPathStep = {
  moduleId: string;
  title: string;
  description: string;
  framework?: string;
  whyNow: string;
  timing: StepTiming;
  scope: string;
  stakeholders: Stakeholder[];
  watchPoint: string;

  completionCriterion: StepCompletionCriterion;
  completedAt?: string;
  completedManually?: boolean;

  subSteps: SubStep[];
  moduleTabContext?: ModuleTabContext;
};

export type Alternative = {
  label: string;
  blurb: string;
  rejectedReason?: string;
  selected: boolean;
};

export type PivotalFinding = {
  dimensionName: string;
  score: number;
  maxScore: number;
  pivotal: boolean;
  flag: "weak" | "developing" | "strong";
};

export type DesignPath = {
  pathId: string;
  sourceModuleId: string;
  sourceModuleTitle: string;
  generatedAt: string;

  headline: string;
  outcomeStatement: string;

  bandLabel: string;
  overallScore?: number;

  findings: PivotalFinding[];
  alternatives: Alternative[];
  steps: DesignPathStep[];

  sensitivityNote: string;

  lifecycleState: PathLifecycleState;
  lastActiveAt: string;
  archivedReplaceMentOf?: string;
};

export type PathHistoryEntry = {
  pathId: string;
  archivedAt: string;
  completedSteps: number;
  totalSteps: number;
};
