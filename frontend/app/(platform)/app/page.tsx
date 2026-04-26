"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as api from "../../../lib/api";
import * as authApi from "../../../lib/auth-api";
import type { Filters } from "../../../lib/api";
import { useWorkspaceController } from "../../../lib/workspace";
import * as analytics from "../../../lib/analytics";

// ── Shared components & hooks ──
import {
  ViewContext, COLORS, TT, PHASES, MODULES, PHASE_BACKGROUNDS, generateCardBackgrounds,
  SIM_PRESETS, SIM_DIMS, SIM_JOBS, SIM_READINESS,
  KpiCard, Card, Empty, Badge, InsightPanel, NarrativePanel, DataTable,
  BarViz, DonutViz, RadarViz, TabBar, SidebarSelect, ReadinessDot,
  PageHeader, LoadingBar, LoadingSkeleton, ModuleExportButton, NextStepBar,
  ContextStrip, InfoButton, ErrorBoundary, EmptyWithAction,
  ViewToggle, HelpBookAccordion, CareerFrameworkAccordion,
  AiEspressoPanel, AiEspressoButton, ViewSelector, ViewJobPicker, ViewEmployeePicker, GuideModal,
  usePersisted, useDebounce, useApiData, useDecisionLog, useRiskRegister,
  callAI, showToast, logDec, exportToCSV,
  setGlobalToast, setGlobalLogDecision,
  JobDesignState, Toast, useToast,
  PageTransition, AnimatedNumber, AnimatedBar, StaggerGrid, StaggerItem,
  useTheme, ThemeToggle,
  useKeyboardShortcuts, KeyboardShortcutsPanel, ShortcutDef,
  CommandPalette, CmdAction,
  AnnotationLayer, AnnotationPanel, Annotation,
  AiCoPilot, StoryEngine, Breadcrumb,
  NavContext,
} from "../../components/shared";
import type { NavTarget } from "../../components/shared";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

// ── Tab Module Components — dynamic imports for code-splitting ──
import dynamic from "next/dynamic";

// Overview (always loaded — landing page)
import {
  LandingPage, WorkforceSnapshot,
  TransformationDashboard, TransformationExecDashboard,
  EmployeeProfileCard, EmployeeOrgChart, PersonalImpactCard,
  SkillShiftIndex,
} from "../../components/OverviewModule";

// Module loading skeleton — prevents blank flash during code-split chunk load
const ModuleLoadingSkeleton = () => <div style={{ minHeight: "calc(100vh - 120px)", padding: "var(--space-6) var(--space-8)" }}><LoadingSkeleton /></div>;

// Diagnose — loaded on demand
const AiOpportunityScan = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.AiOpportunityScan })), { ssr: false, loading: ModuleLoadingSkeleton });
const AIReadiness = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.AIReadiness })), { ssr: false, loading: ModuleLoadingSkeleton });
const ManagerCapability = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.ManagerCapability })), { ssr: false, loading: ModuleLoadingSkeleton });
const SkillsTalent = dynamic(() => import("../../components/SkillsEngine").then(m => ({ default: m.SkillsEngine })), { ssr: false, loading: ModuleLoadingSkeleton });
const ChangeReadiness = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.ChangeReadiness })), { ssr: false, loading: ModuleLoadingSkeleton });
const ManagerDevelopment = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.ManagerDevelopment })), { ssr: false, loading: ModuleLoadingSkeleton });
const OrgHealthScorecard = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.OrgHealthScorecard })), { ssr: false, loading: ModuleLoadingSkeleton });

// Design — heaviest module (~5500 lines), loaded on demand
const WorkDesignLab = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.WorkDesignLab })), { ssr: false, loading: ModuleLoadingSkeleton });
const OrgDesignStudio = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.OrgDesignStudio })), { ssr: false, loading: ModuleLoadingSkeleton });
const OrgRestructuring = dynamic(() => import("../../components/design/OrgRestructuring").then(m => ({ default: m.OrgRestructuring })), { ssr: false, loading: ModuleLoadingSkeleton });
const OperatingModelLab = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.OperatingModelLab })), { ssr: false, loading: ModuleLoadingSkeleton });
const OMDesignCanvas = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.OMDesignCanvas })), { ssr: false, loading: ModuleLoadingSkeleton });
const RoleComparison = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.RoleComparison })), { ssr: false, loading: ModuleLoadingSkeleton });
const QuickWinIdentifier = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.QuickWinIdentifier })), { ssr: false, loading: ModuleLoadingSkeleton });
const BBBAFramework = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.BBBAFramework })), { ssr: false, loading: ModuleLoadingSkeleton });
const HeadcountPlanning = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.HeadcountPlanning })), { ssr: false, loading: ModuleLoadingSkeleton });
const KPIAlignmentModule = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.KPIAlignmentModule })), { ssr: false, loading: ModuleLoadingSkeleton });

// Simulate — loaded on demand
const ImpactSimulator = dynamic(() => import("../../components/SimulateModule").then(m => ({ default: m.ImpactSimulator })), { ssr: false, loading: ModuleLoadingSkeleton });

// Mobilize — loaded on demand
const ChangePlanner = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.ChangePlanner })), { ssr: false, loading: ModuleLoadingSkeleton });
const ReskillingPathways = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.ReskillingPathways })), { ssr: false, loading: ModuleLoadingSkeleton });
const TalentMarketplace = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.TalentMarketplace })), { ssr: false, loading: ModuleLoadingSkeleton });
const TransformationStoryBuilder = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.TransformationStoryBuilder })), { ssr: false, loading: ModuleLoadingSkeleton });
const ReadinessArchetypes = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.ReadinessArchetypes })), { ssr: false, loading: ModuleLoadingSkeleton });
const SkillsNetwork = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.SkillsNetwork })), { ssr: false, loading: ModuleLoadingSkeleton });

// Export — loaded on demand
const ExportReport = dynamic(() => import("../../components/ExportModule").then(m => ({ default: m.ExportReport })), { ssr: false, loading: ModuleLoadingSkeleton });

// Guides — loaded on demand (large content files)
const GuideViewer = dynamic(() => import("../../components/guides/GuideViewer"), { ssr: false });
const consultantGuideLoader = () => import("../../components/guides/consultantGuide").then(m => m.consultantGuide);
const hrGuideLoader = () => import("../../components/guides/hrGuide").then(m => m.hrGuide);

// Job Architecture (split: Audit + Design Tool), PlatformHub, supporting modules — loaded on demand
const JobArchitectureModule = dynamic(() => import("../../components/JobArchModule").then(m => ({ default: m.JobArchitectureModule })), { ssr: false, loading: ModuleLoadingSkeleton });
const JAAuditModule = dynamic(() => import("../../components/JAAuditModule").then(m => ({ default: m.JAAuditModule })), { ssr: false, loading: ModuleLoadingSkeleton });
const JADesignToolModule = dynamic(() => import("../../components/JADesignToolModule").then(m => ({ default: m.JADesignToolModule })), { ssr: false, loading: ModuleLoadingSkeleton });
const SkillsArchitecture = dynamic(() => import("../../components/design/SkillsArchitecture").then(m => ({ default: m.SkillsArchitecture })), { ssr: false, loading: ModuleLoadingSkeleton });
const PlatformHub = dynamic(() => import("../../components/PlatformHub").then(m => ({ default: m.PlatformHub })), { ssr: false });
const AgentOrchestrator = dynamic(() => import("../../components/AgentPanel").then(m => ({ default: m.AgentOrchestrator })), { ssr: false });
const NLQBar = dynamic(() => import("../../components/NLQBar").then(m => ({ default: m.NLQBar })), { ssr: false });
const FlightRecorder = dynamic(() => import("../../components/FlightRecorder").then(m => ({ default: m.FlightRecorder })), { ssr: false });
const Tutorial = dynamic(() => import("../../components/Tutorial").then(m => ({ default: m.Tutorial })), { ssr: false });
const BotWorkspace = dynamic(() => import("../../components/bot/BotWorkspace"), { ssr: false });
import { VideoBackground } from "../../components/VideoBackground";
import { useAnimatedBg } from "../../../lib/animated-bg-context";
import { CDN_BASE, cb } from "../../../lib/cdn";
import { useCollaboration } from "../../../lib/collaboration";
import type { RemoteChange } from "../../../lib/collaboration";
import { PresenceAvatars, EditingIndicator, RemoteChangeToast, ActivityFeedPanel } from "../../components/CollaborationPanel";
import { AiObservationsPanel } from "../../components/AiIntelligence";
const MusicPlayer = dynamic(() => import("../../components/platform/MusicPlayer").then(m => ({ default: m.MusicPlayer })), { ssr: false });
import { ProfileModal, isValidEmail } from "../../components/platform/ProfileModal";
import { ProjectHub, TutorialOverlay, TutorialBadge, buildTutorialSteps } from "../../components/platform/ProjectHub";

/* ═══════════════════════════════════════════════════════════════
   EXPORT HELPER — downloads data as CSV
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   HOME — Main workspace
   ═══════════════════════════════════════════════════════════════

   CROSS-MODULE DATA FLOW:
   ┌─────────┐  filters (f)   ┌──────────┐  jobStates  ┌──────────┐  simState  ┌──────────┐
   │ Sidebar  │──────────────→ │ ALL      │────────────→│ Simulate │──────────→ │ Mobilize │
   │ Filters  │  model, job    │ MODULES  │             │          │            │ Roadmap  │
   └─────────┘                 └──────────┘             └──────────┘            └──────────┘
       │                            ↑                        ↑                       ↑
       │  viewCtx                   │ API data               │ redeployRows          │ jobStates
       └────────────────────────────┘ (filtered)             │ (design decisions)    │ simState
                                                             │                       │
   ┌─────────┐  jobStates (R/W)  ┌──────────┐               │                       │
   │ Design   │─────────────────→│ jobStates│───────────────┘                       │
   │ WDL      │  decon/redeploy  │ (central)│───────────────────────────────────────┘
   └─────────┘                   └──────────┘
       │                              │
       │  logDec() (global)           │ decisionLog, riskRegister
       └──────────────────────────────┼──────────→ ┌──────────┐
                                      └──────────→ │ Export   │
                                                   │ Dashboard│
                                                   └──────────┘
   State lives in Home component, flows via props.
   Filters cascade: func → jf → sf → cl (workspace.ts).
   All API calls include filters for server-side filtering.
   logDec() is globally available for cross-module decision tracking.
   ═══════════════════════════════════════════════════════════════ */
function Home({ projectId, projectName, projectMeta, onBackToHub, user, onShowProfile, onShowPlatformHub }: { projectId: string; projectName: string; projectMeta: string; onBackToHub: () => void; user?: authApi.AuthUser; onShowProfile?: () => void; onShowPlatformHub?: () => void }) {
  const { theme, toggle: toggleTheme } = useTheme();
  const animatedBg = useAnimatedBg();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdRecentIds, setCmdRecentIds] = usePersisted<string[]>(`${projectId}_cmd_recent`, []);
  const [annotations, setAnnotations] = usePersisted<Annotation[]>(`${projectId}_annotations`, []);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [showAnnoPanel, setShowAnnoPanel] = useState(false);
  const [showCoPilot, setShowCoPilot] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const [showStoryEngine, setShowStoryEngine] = useState(false);
  const [showBotWorkspace, setShowBotWorkspace] = useState(false);
  const [showAgentHub, setShowAgentHub] = useState(false);
  const [agentHistory, setAgentHistory] = usePersisted<{ id: string; agent: string; name: string; action: string; time: string; result?: string }[]>(`${projectId}_agent_history`, []);
  const [agentSettings, setAgentSettings] = usePersisted<Record<string, { enabled: boolean; autonomy: string }>>(`${projectId}_agent_settings`, {
    watcher: { enabled: true, autonomy: "suggest" }, analyst: { enabled: true, autonomy: "suggest" },
    designer: { enabled: true, autonomy: "suggest" }, planner: { enabled: true, autonomy: "suggest" },
    narrator: { enabled: true, autonomy: "suggest" }, quality: { enabled: true, autonomy: "observe" },
  });
  const [agentRunning, setAgentRunning] = useState<string | null>(null);
  const [aiProviders, setAiProviders] = useState<{ claude: boolean; gemini: boolean; no_key_message?: string | null } | null>(null);
  useEffect(() => { api.apiFetch("/api/ai/providers").then(r => r.json()).then(d => setAiProviders(d)).catch((e) => { console.error("[API]", e); }); }, []);
  const [agentResults, setAgentResults] = usePersisted<{ id: string; agent: string; agentName: string; result: string; time: string; reviewed: boolean }[]>(`${projectId}_agent_results`, []);
  const [presentStartTime, setPresentStartTime] = useState(0);
  const [presentNotes, setPresentNotes] = useState(false);
  // Sync-read viewMode so the first render already has the value set by SandboxViewSelector.
  // usePersisted reads via useEffect (async) which causes a flash of the ViewSelector.
  const _initViewMode = typeof window !== "undefined" ? (() => { try { const s = localStorage.getItem(`${projectId}_viewMode`); if (s) return JSON.parse(s); } catch (e) { console.error("[Storage]", e); } return ""; })() : "";
  const [viewMode, setViewMode] = usePersisted<string>(`${projectId}_viewMode`, _initViewMode);
  const [viewEmployee, setViewEmployee] = usePersisted<string>(`${projectId}_viewEmployee`, "");
  const [viewJob, setViewJob] = usePersisted<string>(`${projectId}_viewJob`, "");

  // Card & phase background images — generate for existing projects on first load
  const [cardBgs, setCardBgs] = usePersisted<Record<string, string>>(`${projectId}_cardBackgrounds`, {});
  const [phaseBgs, setPhaseBgs] = usePersisted<Record<string, string>>(`${projectId}_phaseBackgrounds`, {});
  useEffect(() => {
    if (!cardBgs || Object.keys(cardBgs).length === 0) setCardBgs(generateCardBackgrounds());
    if (!phaseBgs || Object.keys(phaseBgs).length === 0) setPhaseBgs({ ...PHASE_BACKGROUNDS });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [viewCustom, setViewCustom] = usePersisted<Record<string, string>>(`${projectId}_viewCustom`, { func: "All", jf: "All", sf: "All", cl: "All", ct: "All" });
  const [employees, setEmployees] = useState<string[]>([]);
  const [page, setPage] = useState("home");
  const fileRef = useRef<HTMLInputElement>(null);

  // Tutorial mode — must be declared before the useEffect that references it
  const [isTutorial] = useState(() => { try { return JSON.parse(localStorage.getItem(`${projectId}_isTutorial`) || "false"); } catch (e) { console.error("[Storage]", e); return false; } });

  // Page state is intentionally useState (not usePersisted) — on project entry,
  // users always start at "home" (Overview). Navigation state is session-only.
  const workspace = useWorkspaceController();
  const { models, model, jobs, job, filters: f, filterOptions: fo, message: msg, backendOk, loadingModels, uploadFiles, resetWorkspace, setModel, setJob, setFilter, clearFilters } = workspace;
  const { toast, ToastContainer } = useToast();
  const { log: decisionLog, logDecision } = useDecisionLog(projectId);
  const { risks: riskRegister, addRisk, updateRisk } = useRiskRegister(projectId);
  const [showDecLog, setShowDecLog] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [sidebarGuide, setSidebarGuide] = useState<"consultant" | "hr" | null>(() => {
    if (typeof window === "undefined") return null;
    try { const g = sessionStorage.getItem(`${projectId}_openGuide`); if (g === "consultant" || g === "hr") { sessionStorage.removeItem(`${projectId}_openGuide`); return g; } } catch (e) { console.error("[Storage]", e); }
    return null;
  });
  const [loadedGuideData, setLoadedGuideData] = useState<import("../../components/guides/types").GuideData | null>(null);
  useEffect(() => {
    if (!sidebarGuide) { setLoadedGuideData(null); return; }
    (sidebarGuide === "consultant" ? consultantGuideLoader() : hrGuideLoader()).then(setLoadedGuideData);
  }, [sidebarGuide]);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return !sessionStorage.getItem(`${projectId}_splashSeen`); } catch (e) { console.error("[Storage]", e); return true; }
  });
  const [decLogFilter, setDecLogFilter] = useState("All");
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [remoteChange, setRemoteChange] = useState<RemoteChange | null>(null);
  const collab = useCollaboration({
    projectId,
    userId: user?.id || "",
    username: user?.username || "",
    displayName: user?.display_name || user?.username || "",
    currentTab: page,
    onRemoteChange: (change) => setRemoteChange(change),
  });
  setGlobalToast(toast);
  setGlobalLogDecision(logDecision);
  // Wire up API-level toast notifications
  api.setApiToast(toast);

  // Toast when model loads  
  const prevModelRef = useRef(model);
  useEffect(() => {
    if (model && model !== prevModelRef.current && backendOk) {
      prevModelRef.current = model;
      showToast(`Model loaded: ${model}`);
    }
  }, [model, backendOk]);

  // Auto-select Tutorial model for sandbox/tutorial projects
  useEffect(() => {
    const shouldAutoSelect = isTutorial || projectId.startsWith("tutorial_");
    if (shouldAutoSelect && backendOk) {
      // Read the stored model name
      try {
        const lm = JSON.parse(localStorage.getItem("lastModel") || "null");
        if (lm && String(lm).startsWith("Tutorial_") && model !== lm) {
          setModel(lm);
        }
      } catch (e) { console.error("[Parse]", e); }
      // Also try to derive model name from projectId if lastModel isn't set
      if (!model || model === "Demo_Model") {
        const derivedModel = projectId.replace("tutorial_", "Tutorial_").split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("_");
        if (derivedModel.startsWith("Tutorial_")) {
          // Seed the backend FIRST, then set the model so modules don't fetch before data exists
          const industry = projectId.split("_").slice(2).join("_");
          const size = projectId.split("_")[1];
          api.apiFetch(`/api/tutorial/seed?industry=${industry}&size=${size}`)
            .then(() => setModel(derivedModel))
            .catch(() => setModel(derivedModel)); // Set model even if seed fails (data might already exist)
        }
      }
    }
  }, [isTutorial, backendOk, model, setModel, projectId]);

  // Fetch employee names for employee view picker
  useEffect(() => {
    if (!model || !backendOk) return;
    api.getOverview(model, f).then(d => {
      const names = ((d as Record<string, unknown>)?.employee_names ?? []) as string[];
      if (names.length) setEmployees(names);
    }).catch((e) => { console.error("[API]", e); });
  }, [model, backendOk]);

  // ── Persistent work design state — scoped to project ──
  const [jobStates, setJobStates] = usePersisted<Record<string, JobDesignState>>(`${projectId}_jobStates`, {});
  const setJobState = useCallback((jobTitle: string, partial: Partial<JobDesignState>) => {
    setJobStates(prev => ({ ...prev, [jobTitle]: { ...(prev[jobTitle] || { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false }), ...partial } }));
  }, [setJobStates]);

  // ── Persistent simulator state — scoped to project ──
  const [simState, setSimState] = usePersisted(`${projectId}_simState`, { scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 });

  // ── Persistent ODS state — scoped to project ──
  const [odsState, setOdsState] = usePersisted(`${projectId}_odsState`, { activeScenario: 0, view: "current" });
  const [omNodes] = usePersisted<Record<string, unknown>[]>(`${projectId}_om_nodes`, []);

  // ── Track visited modules — scoped to project ──
  const [visited, setVisited] = usePersisted<Record<string, boolean>>(`${projectId}_visited`, {});

  // ── Central navigation — single source of truth ──
  const [pendingPhase, setPendingPhase] = useState<string | null>(null);

  const goTo = useCallback((target: NavTarget) => {
    // Dismiss splash for ANY explicit navigation — user is past the intro
    if (showSplash) {
      setShowSplash(false);
      try { sessionStorage.setItem(`${projectId}_splashSeen`, "1"); } catch (e) { console.error("[Storage]", e); }
    }
    // Ensure viewMode is set so the ViewSelector early-return (line ~729) doesn't
    // swallow the navigation. If viewMode is empty, default to "org" so the main
    // render tree (sidebar + LandingPage/modules) actually mounts.
    if (!viewMode) {
      setViewMode("org");
    }
    switch (target.kind) {
      case "home":
        setPage("home");
        setPendingPhase(null);
        break;
      case "phase":
        setPage("home");
        setPendingPhase(target.phaseId);
        break;
      case "module":
        setPage(target.moduleId);
        setVisited(prev => ({ ...prev, [target.moduleId]: true }));
        analytics.trackModuleVisited(target.moduleId);
        analytics.startModuleSession(target.moduleId);
        break;
    }
  }, [setPage, setViewMode, setVisited, page, showSplash, viewMode, projectId]);

  // Backward-compat wrappers — modules still receive onBack / onNavigate
  const goHome = useCallback((targetPhase?: string) => {
    goTo(targetPhase ? { kind: "phase", phaseId: targetPhase } : { kind: "home" });
  }, [goTo]);

  const navigate = useCallback((id: string) => {
    if (id.startsWith("home:")) { goTo({ kind: "phase", phaseId: id.split(":")[1] }); return; }
    if (id === "home") { goTo({ kind: "home" }); return; }
    goTo({ kind: "module", moduleId: id });
  }, [goTo]);
  const funnelFiredRef = useRef(false);
  useEffect(() => {
    if (funnelFiredRef.current) return;
    const distinct = Object.keys(visited).filter(k => visited[k] && k !== "home").length;
    if (distinct >= 3) { analytics.trackFunnelStep("used_3_modules"); funnelFiredRef.current = true; }
  }, [visited]);

  // ── Smart Import Wizard ──
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [wizStep, setWizStep] = useState(1);
  const [wizFiles, setWizFiles] = useState<File[]>([]);
  const [wizPreview, setWizPreview] = useState<{ name: string; size: string; rows: number; cols: number; headers: string[]; sample: string[][] } | null>(null);
  const [wizMappings, setWizMappings] = useState<Record<string, string>>({});
  const [wizAutoMapCount, setWizAutoMapCount] = useState(0);
  const [wizValidation, setWizValidation] = useState<{ type: "pass" | "warn" | "error"; msg: string }[]>([]);
  const [wizImporting, setWizImporting] = useState(false);
  const [wizTemplate, setWizTemplate] = useState("custom");
  const [wizImportHistory, setWizImportHistory] = usePersisted<{ date: string; file: string; rows: number; quality: number }[]>(`${projectId}_import_history`, []);

  const WIZ_TARGET_FIELDS = ["Employee ID", "Employee Name", "Job Title", "Function ID", "Job Family", "Sub-Family", "Career Track", "Career Level", "Manager ID", "Manager Name", "Base Pay", "FTE", "Hire Date", "Geography", "Performance", "Skills", "Model ID", "Job Code", "Job Family Group", "Gender", "Age Band", "Tenure"];
  const WIZ_ALIASES: Record<string, string> = {
    "employee_id": "Employee ID", "emp_id": "Employee ID", "worker_id": "Employee ID", "employee id": "Employee ID", "employee number": "Employee ID", "employee_number": "Employee ID", "emplid": "Employee ID",
    "employee_name": "Employee Name", "full_name": "Employee Name", "name": "Employee Name", "worker": "Employee Name", "employee name": "Employee Name", "preferred name": "Employee Name",
    "job_title": "Job Title", "position": "Job Title", "role": "Job Title", "title": "Job Title", "job title": "Job Title", "position title": "Job Title",
    "department": "Function ID", "dept": "Function ID", "function": "Function ID", "org_unit": "Function ID", "business_unit": "Function ID", "cost_center": "Function ID",
    "job_family": "Job Family", "job family": "Job Family", "family": "Job Family", "job_family_group": "Job Family Group",
    "sub_family": "Sub-Family", "sub family": "Sub-Family", "sub-function": "Sub-Family", "sub function": "Sub-Family", "subfamily": "Sub-Family",
    "career_track": "Career Track", "track": "Career Track", "track_type": "Career Track", "career track": "Career Track", "job_category": "Career Track",
    "career_level": "Career Level", "level": "Career Level", "grade": "Career Level", "pay_grade": "Career Level", "job_level": "Career Level", "career level": "Career Level",
    "manager_id": "Manager ID", "supervisor_id": "Manager ID", "reports_to_id": "Manager ID", "manager id": "Manager ID", "mgr_id": "Manager ID",
    "manager_name": "Manager Name", "supervisor": "Manager Name", "reports_to": "Manager Name", "manager": "Manager Name", "manager name": "Manager Name",
    "base_pay": "Base Pay", "salary": "Base Pay", "compensation": "Base Pay", "annual_salary": "Base Pay", "base pay": "Base Pay", "base salary": "Base Pay",
    "fte": "FTE", "headcount": "FTE",
    "hire_date": "Hire Date", "start_date": "Hire Date", "date_of_hire": "Hire Date", "original_hire_date": "Hire Date", "hire date": "Hire Date",
    "geography": "Geography", "location": "Geography", "region": "Geography", "country": "Geography", "work_location": "Geography", "office": "Geography",
    "performance": "Performance", "performance_rating": "Performance", "rating": "Performance", "review_rating": "Performance",
    "skills": "Skills", "competencies": "Skills", "skill_set": "Skills",
    "model_id": "Model ID", "scenario": "Model ID", "company": "Model ID",
    "gender": "Gender", "sex": "Gender",
    "age_band": "Age Band", "age": "Age Band", "age_group": "Age Band",
    "tenure": "Tenure", "years_of_service": "Tenure", "service_years": "Tenure",
  };

  const wizAutoMap = (headers: string[]) => {
    const mappings: Record<string, string> = {};
    let count = 0;
    headers.forEach(h => {
      const norm = h.toLowerCase().replace(/[^a-z0-9_ ]/g, "").trim();
      const match = WIZ_ALIASES[norm];
      if (match) { mappings[h] = match; count++; }
      else {
        // Fuzzy: check if header contains a target field name
        const fuzzy = WIZ_TARGET_FIELDS.find(t => norm.includes(t.toLowerCase().replace(/ /g, "_")) || norm.includes(t.toLowerCase().replace(/ /g, "")));
        if (fuzzy) { mappings[h] = fuzzy; count++; }
      }
    });
    setWizMappings(mappings);
    setWizAutoMapCount(count);
  };

  const wizParseFile = async (file: File) => {
    // Read file to get headers and row count
    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    const delim = file.name.endsWith(".tsv") ? "\t" : ",";
    const headers = lines[0]?.split(delim).map(h => h.replace(/"/g, "").trim()) || [];
    const sampleRows = lines.slice(1, 6).map(l => l.split(delim).map(c => c.replace(/"/g, "").trim()));
    setWizPreview({ name: file.name, size: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`, rows: lines.length - 1, cols: headers.length, headers, sample: sampleRows });
    wizAutoMap(headers);
  };

  const wizRunValidation = () => {
    const checks: { type: "pass" | "warn" | "error"; msg: string }[] = [];
    const mapped = Object.values(wizMappings);
    if (mapped.includes("Employee ID")) checks.push({ type: "pass", msg: "Employee ID mapped" });
    else checks.push({ type: "error", msg: "Employee ID not mapped — required field" });
    if (mapped.includes("Employee Name")) checks.push({ type: "pass", msg: "Employee Name mapped" });
    else checks.push({ type: "error", msg: "Employee Name not mapped — required field" });
    if (mapped.includes("Job Title")) checks.push({ type: "pass", msg: "Job Title mapped" });
    else checks.push({ type: "warn", msg: "Job Title not mapped — recommended for analysis" });
    if (mapped.includes("Function ID")) checks.push({ type: "pass", msg: "Function mapped" });
    else checks.push({ type: "warn", msg: "Function not mapped — org structure will be limited" });
    if (mapped.includes("Manager ID") || mapped.includes("Manager Name")) checks.push({ type: "pass", msg: "Manager relationship mapped" });
    else checks.push({ type: "warn", msg: "No manager field mapped — org hierarchy unavailable" });
    if (mapped.includes("Career Level")) checks.push({ type: "pass", msg: "Career Level mapped" });
    else checks.push({ type: "warn", msg: "Career Level not mapped — leveling analysis unavailable" });
    const unmapped = (wizPreview?.headers || []).filter(h => !wizMappings[h]).length;
    if (unmapped > 0) checks.push({ type: "pass", msg: `${unmapped} column(s) skipped — not needed for analysis` });
    checks.push({ type: "pass", msg: `${wizPreview?.rows || 0} rows ready for import` });
    setWizValidation(checks);
  };

  const wizDoImport = async () => {
    if (wizFiles.length === 0) return;
    setWizImporting(true);
    try {
      const dt = new DataTransfer();
      wizFiles.forEach(f => dt.items.add(f));
      await uploadFiles(dt.files);
      for (const wf of wizFiles) {
        const ext = wf.name.split(".").pop() || "unknown";
        analytics.trackDataUploaded(ext, wf.size, wizPreview?.rows);
      }
      analytics.trackFunnelStep("uploaded_data");
      const quality = Math.round((wizValidation.filter(v => v.type === "pass").length / Math.max(wizValidation.length, 1)) * 100);
      setWizImportHistory(prev => [...prev, { date: new Date().toISOString().split("T")[0], file: wizFiles[0]?.name || "", rows: wizPreview?.rows || 0, quality }]);
      toast("Data imported successfully", "success");
      setShowImportWizard(false);
      setWizStep(1); setWizFiles([]); setWizPreview(null);
    } catch { toast("Import failed — check file format", "error"); }
    setWizImporting(false);
  };

  const upload = async (files: FileList) => {
    try {
      await uploadFiles(files);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split(".").pop() || "unknown";
        analytics.trackDataUploaded(ext, f.size);
      }
      analytics.trackFunnelStep("uploaded_data");
      toast("Data uploaded successfully", "success");
      if (model) {
        try {
          const dq = await api.getDataQuality(model);
          const summary = (dq as Record<string, unknown>)?.summary as Record<string, unknown>;
          const missing = Number(summary?.missing ?? 0);
          const issues = Number(summary?.total_issues ?? 0);
          if (missing > 0) toast(`${missing} dataset(s) still missing — check Data Quality in AI Opportunity Scan`, "warning");
          else if (issues === 0 && missing === 0) toast("Great data coverage — your analysis will be well-grounded.", "success");
          else if (issues > 0) toast(`${issues} data issue(s) detected — review in AI Opportunity Scan > Data Quality`, "warning");
        } catch (e) { console.error("[API]", e); }
      }
    } catch { toast("Upload failed — check file format and required columns", "error"); }
  };
  const reset = async () => { await resetWorkspace(); setPage("home"); setJobStates({}); setVisited({}); setSimState({ scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 }); setOdsState({ activeScenario: 0, view: "overview" }); };
  const af = Object.values(f).filter(v => v !== "All").length;
  const hasJobs = jobs.length > 0;
  const hasData = !!model;

  // Module status for landing page
  const moduleStatus: Record<string, string> = {};
  const completedJobCount = jobs.filter(j => jobStates[j]?.finalized).length;
  if (completedJobCount === jobs.length && jobs.length > 0) moduleStatus.design = "complete";
  else if (Object.values(jobStates).some(s => s.deconSubmitted)) moduleStatus.design = "in_progress";
  // Smart module completion with phase awareness
  if (hasData) {
    moduleStatus.snapshot = "in_progress";
    moduleStatus["ja-audit"] = "in_progress";
    moduleStatus["ja-design"] = "in_progress";
    moduleStatus.scan = "in_progress";
  }
  if (Object.values(jobStates).some(s => s.deconRows.length > 0)) moduleStatus.design = "in_progress";
  if (Object.values(jobStates).some(s => s.finalized)) { 
    moduleStatus.design = "complete";
    moduleStatus.simulate = "in_progress";
  }
  if (Object.values(jobStates).filter(s => s.finalized).length >= 3) moduleStatus.simulate = "complete";
  Object.entries(visited).forEach(([k, v]) => { if (v && !moduleStatus[k]) moduleStatus[k] = "in_progress"; });

  // Fetch overview data for TransformationDashboard
  const [overviewData] = useApiData(() => model ? api.getOverview(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);

  // Build context string for AI assistant based on current page
  const buildAiContext = useCallback(() => {
    const parts: string[] = [];
    if (viewMode) parts.push(`View: ${viewMode}${viewMode === "job" ? ` (${viewJob})` : viewMode === "employee" ? ` (${viewEmployee})` : ""}`);
    if (model) parts.push(`Model: ${model}`);
    if (job) parts.push(`Active job: ${job}`);
    if (jobs.length) parts.push(`${jobs.length} jobs in scope`);
    const completedCount = Object.values(jobStates).filter(s => s.finalized).length;
    if (completedCount > 0) parts.push(`${completedCount}/${jobs.length} jobs finalized in Work Design`);
    const deconCount = Object.values(jobStates).filter(s => s.deconSubmitted).length;
    if (deconCount > 0) parts.push(`${deconCount} jobs deconstructed`);
    if (Object.keys(f).some(k => f[k as keyof typeof f] !== "All")) {
      parts.push(`Filters active: ${Object.entries(f).filter(([,v]) => v !== "All").map(([k,v]) => `${k}=${v}`).join(", ")}`);
    }
    // Add module-specific context
    if (page === "simulate") {
      const cfg = simState.custom ? `Custom (${simState.custAdopt}% adoption, ${simState.custTimeline}mo)` : simState.scenario;
      parts.push(`Scenario: ${cfg}, Investment: $${simState.investment}/role`);
    }
    if (decisionLog.length > 0) parts.push(`${decisionLog.length} decisions logged`);
    if (riskRegister.length > 0) parts.push(`${riskRegister.length} risks tracked (${riskRegister.filter(r => r.status === "Open").length} open)`);
    return parts.join(". ");
  }, [model, job, jobs, jobStates, f, page, simState, decisionLog, riskRegister]);

  // Agent system
  const AGENT_DEFS = [
    { id: "watcher", name: "Monitor", icon: "W", desc: "Monitors data changes and inconsistencies" },
    { id: "analyst", name: "Analyze", icon: "A", desc: "Detects patterns and surfaces insights" },
    { id: "designer", name: "Design", icon: "D", desc: "Autonomously redesigns roles and structures" },
    { id: "planner", name: "Plan", icon: "P", desc: "Maintains the living transformation plan" },
    { id: "narrator", name: "Summarize", icon: "N", desc: "Keeps the executive narrative current" },
    { id: "quality", name: "Validate", icon: "Q", desc: "Validates consistency across all modules" },
  ];
  const runAgent = useCallback(async (agentId: string) => {
    if (agentRunning) return;
    const agent = AGENT_DEFS.find(a => a.id === agentId);
    if (!agent || !agentSettings[agentId]?.enabled) return;
    setAgentRunning(agentId);
    try {
      const ctx = buildAiContext();
      const prompts: Record<string, string> = {
        watcher: `As the Monitor agent, analyze for changes and anomalies. Context: ${ctx}. Return 2 observations.`,
        analyst: `As the Analyze agent, detect patterns in this data. Context: ${ctx}. Return 3 insights with specific numbers.`,
        designer: `As the Design agent, identify top 3 roles for AI redesign. Context: ${ctx}. Return role names and reasons.`,
        planner: `As the Plan agent, check if the plan needs updates. Context: ${ctx}. Return 2 recommendations.`,
        narrator: `As the Summarize agent, generate a 3-sentence executive summary update. Context: ${ctx}.`,
        quality: `As the Validate agent, check for data inconsistencies. Context: ${ctx}. Return 2 issues found.`,
      };
      const result = await callAI(`You are ${agent.name}, a specialized AI agent. Be specific and concise.`, prompts[agentId] || ctx);
      const entry = { id: `ar_${Date.now()}`, agent: agentId, agentName: agent.name, result: result.slice(0, 500), time: new Date().toISOString(), reviewed: false };
      setAgentResults(prev => [entry, ...prev].slice(0, 50));
      setAgentHistory(prev => [{ id: entry.id, agent: agentId, name: agent.name, action: "Completed analysis", time: entry.time }, ...prev].slice(0, 100));
      showToast(`${agent.icon} ${agent.name} completed analysis`);
    } catch { showToast(`${agent.name} failed — try again`); }
    setAgentRunning(null);
  }, [agentRunning, agentSettings, buildAiContext, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAllAgents = useCallback(async () => {
    for (const agent of AGENT_DEFS) {
      if (agentSettings[agent.id]?.enabled) {
        await runAgent(agent.id);
      }
    }
  }, [agentSettings, runAgent]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewCtx: ViewContext = { mode: viewMode || "org", employee: viewEmployee, job: viewJob, custom: viewCustom };

  // ── Computed transformation summary — derived from all cross-module state ──
  // Provides a unified view of transformation progress that any module can read.
  const transformationSummary = useMemo(() => {
    const designedJobs = Object.entries(jobStates).filter(([, s]) => s.finalized);
    const inProgressJobs = Object.entries(jobStates).filter(([, s]) => s.deconSubmitted && !s.finalized);
    // Aggregate task dispositions from all finalized job designs
    let tasksAutomate = 0, tasksAugment = 0, tasksEliminate = 0, tasksRetain = 0, totalTasks = 0;
    let totalCapacityFreed = 0;
    for (const [, state] of designedJobs) {
      for (const row of (state.deconRows || [])) {
        totalTasks++;
        const disp = (row as Record<string, unknown>).disposition as string || "";
        const pct = Number((row as Record<string, unknown>).ai_impact || (row as Record<string, unknown>).aiImpact || 0);
        const timePct = Number((row as Record<string, unknown>).time_pct || (row as Record<string, unknown>).timePct || 0);
        if (disp === "automate" || disp === "Automate") { tasksAutomate++; totalCapacityFreed += timePct * (pct / 100); }
        else if (disp === "augment" || disp === "Augment") { tasksAugment++; totalCapacityFreed += timePct * (pct / 100) * 0.5; }
        else if (disp === "eliminate" || disp === "Eliminate") { tasksEliminate++; totalCapacityFreed += timePct; }
        else tasksRetain++;
      }
    }
    return {
      designedJobCount: designedJobs.length,
      inProgressJobCount: inProgressJobs.length,
      totalJobCount: jobs.length,
      totalTasks,
      tasksAutomate, tasksAugment, tasksEliminate, tasksRetain,
      capacityFreedPct: totalTasks > 0 ? Math.round(totalCapacityFreed / Math.max(1, designedJobs.length)) : 0,
      scenario: simState.scenario,
      adoptionRate: simState.custom ? simState.custAdopt : (simState.scenario === "conservative" ? 35 : simState.scenario === "aggressive" ? 80 : 55),
      timeline: simState.custom ? simState.custTimeline : (simState.scenario === "conservative" ? 30 : simState.scenario === "aggressive" ? 14 : 20),
      investment: simState.investment,
      decisionCount: decisionLog.length,
      riskCount: riskRegister.length,
      openRiskCount: riskRegister.filter(r => r.status === "Open").length,
    };
  }, [jobStates, jobs, simState, decisionLog, riskRegister]);

  // Tutorial mode state and handlers
  const [tutorialStep, setTutorialStep] = useState(() => { try { return JSON.parse(localStorage.getItem(`${projectId}_tutorialStep`) || "0"); } catch (e) { console.error("[Storage]", e); return 0; } });
  const [tutorialVisible, setTutorialVisible] = useState(isTutorial);
  const tutorialSteps = useMemo(() => buildTutorialSteps(projectId), [projectId]);

  useEffect(() => {
    if (isTutorial) { try { localStorage.setItem(`${projectId}_tutorialStep`, JSON.stringify(tutorialStep)); } catch (e) { console.error("[Storage]", e); } }
  }, [tutorialStep, projectId, isTutorial]);

  const tutorialNext = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      const nextStep = tutorialStep + 1;
      setTutorialStep(nextStep);
      const nextPage = tutorialSteps[nextStep].page;
      if (nextPage !== "home") setPage(nextPage);
      else setPage("home");
    } else {
      setTutorialVisible(false);
    }
  };
  const tutorialPrev = () => {
    if (tutorialStep > 0) {
      const prevStep = tutorialStep - 1;
      setTutorialStep(prevStep);
      const prevPage = tutorialSteps[prevStep].page;
      if (prevPage !== "home") setPage(prevPage);
      else setPage("home");
    }
  };
  const tutorialJump = (s: number) => {
    setTutorialStep(s);
    const pg = tutorialSteps[s].page;
    if (pg !== "home") setPage(pg);
    else setPage("home");
  };

  // ── Keyboard shortcuts ──
  const PHASE_FIRST_MODULES: Record<string, string> = { "1": "snapshot", "2": "scan", "3": "design", "4": "simulate", "5": "plan" };
  const shortcutDefs: ShortcutDef[] = useMemo(() => [
    // Command palette
    { key: "k", ctrl: true, label: "Open command palette", action: () => setShowCmdPalette(true), category: "Tools" },
    { key: "p", ctrl: true, label: "Toggle presentation mode", action: () => { if (presentMode) { setPresentMode(false); } else { setPresentMode(true); setPresentStartTime(Date.now()); setShowCoPilot(false); setShowAnnoPanel(false); setAnnotateMode(false); } }, category: "Tools" },
    // Global navigation
    { key: "h", ctrl: true, label: "Go to Home", action: () => setPage("home"), category: "Navigation" },
    { key: "1", ctrl: true, label: "Discover phase", action: () => navigate("snapshot"), category: "Navigation" },
    { key: "2", ctrl: true, label: "Diagnose phase", action: () => navigate("scan"), category: "Navigation" },
    { key: "3", ctrl: true, label: "Design phase", action: () => navigate("design"), category: "Navigation" },
    { key: "4", ctrl: true, label: "Simulate phase", action: () => navigate("simulate"), category: "Navigation" },
    { key: "5", ctrl: true, label: "Mobilize phase", action: () => navigate("plan"), category: "Navigation" },
    { key: "e", ctrl: true, label: "Export", action: () => navigate("export"), category: "Navigation" },
    { key: "Escape", label: "Close / Go back", action: () => { if (showCmdPalette) setShowCmdPalette(false); else if (showShortcuts) setShowShortcuts(false); else if (showImportWizard) setShowImportWizard(false); else if (page !== "home") setPage("home"); }, category: "Navigation" },
    // Tools
    { key: "d", ctrl: true, label: "Toggle dark/light mode", action: toggleTheme, category: "Tools" },
    { key: "/", ctrl: true, label: "Show keyboard shortcuts", action: () => setShowShortcuts(true), category: "Tools" },
    { key: "?", label: "Show keyboard shortcuts", action: () => setShowShortcuts(true), category: "Tools" },
    { key: "f", ctrl: true, label: "Focus search/filter", action: () => { const el = document.querySelector<HTMLInputElement>("input[placeholder*='earch'], input[placeholder*='ilter']"); if (el) el.focus(); }, category: "Tools" },
    { key: "s", ctrl: true, label: "Save current state", action: () => { showToast("State saved — your work is preserved"); }, category: "Tools" },
  ], [navigate, setPage, toggleTheme, showShortcuts, showImportWizard, showCmdPalette, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useKeyboardShortcuts(shortcutDefs);

  // Command palette actions catalog
  const cmdActions: CmdAction[] = useMemo(() => {
    const navAction = (id: string, label: string, icon: string, desc: string, shortcut?: string, kw?: string): CmdAction => ({
      id: `nav_${id}`, icon, label, desc, category: "Navigation", shortcut,
      action: () => { navigate(id); setCmdRecentIds(prev => [id, ...prev.filter(x => x !== id)].slice(0, 8)); },
      keywords: kw,
    });
    const items: CmdAction[] = [
      // Navigation — all modules
      ...MODULES.map(m => navAction(m.id, m.title, m.icon, m.desc, undefined, `${m.phase} ${m.id}`)),
      navAction("home", "Home", "\u2302", "Go to the landing page", "Cmd+H"),
      // Phase shortcuts
      { id: "phase_discover", icon: "\u2315", label: "Discover Phase", desc: "Workforce snapshot, job architecture, skill shift", category: "Navigation", shortcut: "Cmd+1", action: () => navigate("snapshot"), keywords: "discover phase 1" },
      { id: "phase_diagnose", icon: "\u2695", label: "Diagnose Phase", desc: "AI scan, org health, readiness, change readiness", category: "Navigation", shortcut: "Cmd+2", action: () => navigate("scan"), keywords: "diagnose phase 2" },
      { id: "phase_design", icon: "\u270E", label: "Design Phase", desc: "Work design, operating model, BBBA, headcount", category: "Navigation", shortcut: "Cmd+3", action: () => navigate("design"), keywords: "design phase 3" },
      { id: "phase_simulate", icon: "\u26A1", label: "Simulate Phase", desc: "Impact modeling, scenarios, ROI", category: "Navigation", shortcut: "Cmd+4", action: () => navigate("simulate"), keywords: "simulate phase 4" },
      { id: "phase_mobilize", icon: "\u2192", label: "Mobilize Phase", desc: "Change planner, reskilling, talent marketplace", category: "Navigation", shortcut: "Cmd+5", action: () => navigate("plan"), keywords: "mobilize phase 5" },
      // Actions
      { id: "act_upload", icon: "\u21E7", label: "Upload Data", desc: "Open the smart import wizard", category: "Actions", action: () => { setShowImportWizard(true); setShowCmdPalette(false); } },
      { id: "act_theme", icon: theme === "dark" ? "\u263C" : "\u263E", label: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode", desc: "Toggle the color theme", category: "Actions", shortcut: "Cmd+D", action: toggleTheme, keywords: "dark light mode theme toggle" },
      { id: "act_shortcuts", icon: "\u2328", label: "Keyboard Shortcuts", desc: "View all keyboard shortcuts", category: "Actions", shortcut: "Cmd+/", action: () => { setShowCmdPalette(false); setShowShortcuts(true); } },
      { id: "act_export", icon: "\u21E9", label: "Export Report", desc: "Generate and download deliverables", category: "Actions", action: () => navigate("export"), keywords: "export download pdf pptx docx" },
      { id: "act_agents", icon: "\u2699", label: "Open Agent Hub", desc: "Multi-agent AI system for autonomous analysis", category: "Actions", action: () => { setShowAgentHub(true); setShowCmdPalette(false); }, keywords: "agent hub AI autonomous watcher analyst designer planner" },
      { id: "act_agents_run", icon: "\u25B6", label: "Run All Agents", desc: "Trigger all AI agents to analyze your project", category: "Actions", action: () => { setShowCmdPalette(false); runAllAgents(); }, keywords: "run agents analyze AI" },
      { id: "act_story", icon: "\u2261", label: "Generate Executive Story", desc: "AI-generated data narrative for client presentation", category: "Actions", action: () => { setShowStoryEngine(true); setShowCmdPalette(false); }, keywords: "story narrative executive report generate AI" },
      { id: "act_present", icon: "\u25A3", label: "Enter Presentation Mode", desc: "Full-screen client-ready presentation", category: "Actions", shortcut: "Cmd+P", action: () => { setPresentMode(true); setPresentStartTime(Date.now()); setShowCmdPalette(false); setShowCoPilot(false); if (page === "home") navigate("snapshot"); }, keywords: "present presentation slides client meeting" },
      { id: "act_reset", icon: "\u21BA", label: "Reset Data", desc: "Clear all data and start fresh", category: "Actions", action: () => { if (confirm("Reset all data? This cannot be undone.")) reset(); }, keywords: "reset clear" },
      // Data — jobs
      ...jobs.slice(0, 50).map(j => ({
        id: `job_${j}`, icon: "\u2630", label: j, desc: "Job title — click to view in Work Design Lab", category: "Data",
        action: () => { setJob(j); navigate("design"); setCmdRecentIds(prev => [`job_${j}`, ...prev.filter(x => x !== `job_${j}`)].slice(0, 8)); },
        keywords: `job role title ${j}`,
      })),
    ];
    return items;
  }, [navigate, jobs, theme, toggleTheme, setJob, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Account dropdown close-on-click-outside
  useEffect(() => {
    if (!accountMenuOpen) return;
    const close = (e: MouseEvent) => { if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) setAccountMenuOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAccountMenuOpen(false); };
    const t = setTimeout(() => { window.addEventListener("click", close); window.addEventListener("keydown", esc); }, 50);
    return () => { clearTimeout(t); window.removeEventListener("click", close); window.removeEventListener("keydown", esc); };
  }, [accountMenuOpen]);

  // Presentation mode module sequence (must be before conditional returns)
  const PRESENT_MODULES = ["snapshot", "scan", "ja-audit", "ja-design", "design", "opmodel", "simulate", "plan", "export"];
  const presentIdx = PRESENT_MODULES.indexOf(page);
  const presentPrev = useCallback(() => { if (presentIdx > 0) navigate(PRESENT_MODULES[presentIdx - 1]); }, [presentIdx, navigate]); // eslint-disable-line react-hooks/exhaustive-deps
  const presentNext = useCallback(() => { if (presentIdx < PRESENT_MODULES.length - 1) navigate(PRESENT_MODULES[presentIdx + 1]); else if (page === "home") navigate(PRESENT_MODULES[0]); }, [presentIdx, page, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Presentation mode keyboard handler (must be before conditional returns)
  useEffect(() => {
    if (!presentMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); presentNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); presentPrev(); }
      else if (e.key === "n" || e.key === "N") { if ((e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") setPresentNotes(p => !p); }
      else if (e.key === "Escape") { setPresentMode(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presentMode, presentNext, presentPrev]);

  // Set data-present attribute (must be before conditional returns)
  useEffect(() => {
    document.documentElement.setAttribute("data-present", presentMode ? "true" : "false");
    return () => document.documentElement.removeAttribute("data-present");
  }, [presentMode]);

  // View selector pages — full screen, no sidebar
  if (!viewMode || viewMode === "job_select" || viewMode === "employee_select") {
    return <div style={{ minHeight: "100vh", background: "#0B1120", animation: "pageCrossfade 0.2s ease-out" }}>
      {!viewMode && <ViewSelector
        onBack={onBackToHub}
        onSelect={(mode, detail) => {
          if (mode === "org") { setViewMode("org"); setShowSplash(true); }
          else if (mode === "job_select") { setViewMode("job_select"); }
          else if (mode === "employee_select") { setViewMode("employee_select"); }
          else if (mode === "custom" && detail) { setViewMode("custom"); setViewCustom(detail); Object.entries(detail).forEach(([k, v]) => { if (k !== "ct") setFilter(k as keyof Filters, v); }); }
          // Guide modes: set org view and auto-open the guide
          if (mode === "consultant" || mode === "hr") { setViewMode("org"); setSidebarGuide(mode as "consultant" | "hr"); }
        }} 
        employees={employees} 
        jobs={jobs}
        filterOptions={fo}
      />}
      {viewMode === "job_select" && <ViewJobPicker jobs={jobs} onSelect={j => { setViewMode("job"); setViewJob(j); setJob(j); }} onBack={() => setViewMode("")} />}
      {viewMode === "employee_select" && <ViewEmployeePicker employees={employees} onSelect={e => { setViewMode("employee"); setViewEmployee(e); }} onBack={() => setViewMode("")} />}
    </div>;
  }

  // Platform Hub — handled by parent Page component now
  if (page === "hub" && onShowPlatformHub) { onShowPlatformHub(); setPage("home"); }

  // ── Landing splash screen — pure full-screen background image, click to enter ──
  if (showSplash && page === "home") {
    return <div onClick={() => { setShowSplash(false); try { sessionStorage.setItem(`${projectId}_splashSeen`, "1"); } catch (e) { console.error("[Storage]", e); } }} style={{ position: "fixed", inset: 0, cursor: "pointer", zIndex: 30, animation: "pageCrossfade 0.2s ease-out", willChange: "opacity" }}>
      <VideoBackground name="landing_bg" overlay={0.15} poster={`${CDN_BASE}/landing_bg.png`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #0c1e3a 100%)" className="absolute inset-0" />
    </div>;
  }

  return <NavContext.Provider value={goTo}><div className="flex min-h-screen w-full overflow-x-hidden">
    {/* ── COMMAND PALETTE ── */}
    <AnimatePresence>{showCmdPalette && <CommandPalette actions={cmdActions} recentIds={cmdRecentIds} onClose={() => setShowCmdPalette(false)} />}</AnimatePresence>

    {/* ── KEYBOARD SHORTCUTS PANEL ── */}
    {showShortcuts && <KeyboardShortcutsPanel shortcuts={shortcutDefs} onClose={() => setShowShortcuts(false)} />}

    {/* ── SMART IMPORT WIZARD MODAL ── */}
    {showImportWizard && <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-[var(--bg)] rounded-2xl border border-[var(--border)] w-full max-w-[800px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div><div className="text-[18px] font-bold text-[var(--text-primary)]">Smart Data Import</div><div className="text-[13px] text-[var(--text-muted)]">Step {wizStep} of 4</div></div>
          <button onClick={() => setShowImportWizard(false)} className="text-[20px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
        </div>
        {/* Progress */}
        <div className="flex gap-1 px-6 pt-3">{[1,2,3,4].map(s => <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: s <= wizStep ? "var(--accent-primary)" : "var(--surface-2)" }} />)}</div>

        <div className="px-6 py-5">
          {/* STEP 1: File Selection */}
          {wizStep === 1 && <div className="space-y-4">
            <div className="text-[15px] font-bold text-[var(--text-primary)]">Select & Upload Your Data File</div>
            {/* Format templates */}
            <div className="flex gap-2 flex-wrap">
              {[{ id: "custom", label: "Generic / Custom" }, { id: "workday", label: "Workday" }, { id: "sap", label: "SAP SuccessFactors" }, { id: "oracle", label: "Oracle HCM" }, { id: "adp", label: "ADP" }].map(t => <button key={t.id} onClick={() => setWizTemplate(t.id)} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all" style={{ background: wizTemplate === t.id ? "rgba(244,168,58,0.12)" : "var(--surface-2)", color: wizTemplate === t.id ? "var(--accent-primary)" : "var(--text-muted)", border: wizTemplate === t.id ? "1px solid rgba(244,168,58,0.3)" : "1px solid var(--border)" }}>{t.label}</button>)}
            </div>
            {/* Drop zone */}
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-10 text-center hover:border-[var(--accent-primary)] transition-all cursor-pointer" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length) { setWizFiles(files); wizParseFile(files[0]); } }} onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = ".xlsx,.xls,.csv,.tsv"; input.multiple = true; input.onchange = () => { const files = Array.from(input.files || []); if (files.length) { setWizFiles(files); wizParseFile(files[0]); } }; input.click(); }}>
              <div className="text-[32px] mb-2">📂</div>
              <div className="text-[15px] font-semibold text-[var(--text-primary)]">Drag & drop your file here</div>
              <div className="text-[14px] text-[var(--text-muted)] mt-1">or click to browse · .xlsx, .xls, .csv, .tsv</div>
            </div>
            {/* Preview */}
            {wizPreview && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[15px] font-bold text-[var(--text-primary)]">{wizPreview.name}</div>
                <span className="text-[13px] text-[var(--text-muted)]">{wizPreview.size}</span>
              </div>
              <div className="text-[14px] text-[var(--success)] mb-2">Detected <strong>{wizPreview.rows.toLocaleString()}</strong> rows and <strong>{wizPreview.cols}</strong> columns</div>
              <div className="flex flex-wrap gap-1">{wizPreview.headers.slice(0, 15).map(h => <span key={h} className="px-2 py-0.5 rounded text-[12px] bg-[var(--bg)] text-[var(--text-secondary)]">{h}</span>)}{wizPreview.headers.length > 15 && <span className="text-[12px] text-[var(--text-muted)]">+{wizPreview.headers.length - 15} more</span>}</div>
            </div>}
            {wizPreview && <button onClick={() => setWizStep(2)} className="w-full px-4 py-2.5 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>Continue to Column Mapping →</button>}
          </div>}

          {/* STEP 2: Column Mapping */}
          {wizStep === 2 && <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-bold text-[var(--text-primary)]">Column Mapping</div>
              <div className="text-[14px] font-semibold" style={{ color: wizAutoMapCount > 0 ? "var(--success)" : "var(--text-muted)" }}>Mapped {wizAutoMapCount} of {wizPreview?.headers.length || 0} columns automatically ({wizPreview?.headers.length ? Math.round((wizAutoMapCount / wizPreview.headers.length) * 100) : 0}%)</div>
            </div>
            <div className="overflow-y-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 400 }}>
              <table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0">
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Your Column</th>
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Sample Data</th>
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Maps To</th>
              </tr></thead><tbody>
                {(wizPreview?.headers || []).map((h, hi) => {
                  const mapped = wizMappings[h] || "";
                  const samples = (wizPreview?.sample || []).map(r => r[hi] || "").filter(Boolean).slice(0, 3);
                  return <tr key={h} className="border-b border-[var(--border)]">
                    <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{h}</td>
                    <td className="px-3 py-2 text-[13px] text-[var(--text-muted)]">{samples.join(", ") || "—"}</td>
                    <td className="px-3 py-2"><select value={mapped} onChange={e => setWizMappings(prev => ({ ...prev, [h]: e.target.value }))} className="bg-[var(--bg)] border rounded-lg px-2 py-1 text-[13px] outline-none w-full" style={{ borderColor: mapped ? "var(--success)" : "var(--border)", color: mapped ? "var(--success)" : "var(--text-muted)" }}>
                      <option value="">Skip</option>{WIZ_TARGET_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select></td>
                  </tr>;
                })}
              </tbody></table>
            </div>
            {/* Preview mapped */}
            {Object.keys(wizMappings).length > 0 && <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Preview (first 3 rows with mapped names)</div>
              <div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr>{Object.entries(wizMappings).filter(([,v]) => v).slice(0, 8).map(([,v]) => <th key={v} className="px-2 py-1 text-left text-[var(--success)] font-semibold">{v}</th>)}</tr></thead><tbody>{(wizPreview?.sample || []).slice(0, 3).map((row, ri) => <tr key={ri}>{Object.entries(wizMappings).filter(([,v]) => v).slice(0, 8).map(([k,v]) => { const ci = wizPreview?.headers.indexOf(k) ?? -1; return <td key={v} className="px-2 py-1 text-[var(--text-secondary)]">{ci >= 0 ? row[ci] || "—" : "—"}</td>; })}</tr>)}</tbody></table></div>
            </div>}
            <div className="flex gap-2">
              <button onClick={() => setWizStep(1)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">← Back</button>
              <button onClick={() => { wizRunValidation(); setWizStep(3); }} className="flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>Validate Data →</button>
            </div>
          </div>}

          {/* STEP 3: Validation */}
          {wizStep === 3 && <div className="space-y-4">
            <div className="text-[15px] font-bold text-[var(--text-primary)]">Data Validation</div>
            <div className="space-y-2">{wizValidation.map((v, i) => {
              const icons = { pass: "✅", warn: "⚠️", error: "❌" };
              const colors = { pass: "var(--success)", warn: "var(--warning)", error: "var(--risk)" };
              return <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: `${colors[v.type]}06`, border: `1px solid ${colors[v.type]}20` }}>
                <span className="text-[16px]">{icons[v.type]}</span>
                <span className="text-[14px] text-[var(--text-secondary)] flex-1">{v.msg}</span>
              </div>;
            })}</div>
            {/* Quality score */}
            {(() => {
              const errors = wizValidation.filter(v => v.type === "error").length;
              const passes = wizValidation.filter(v => v.type === "pass").length;
              const score = wizValidation.length ? Math.round((passes / wizValidation.length) * 100) : 0;
              return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-center">
                <div className="text-[28px] font-extrabold" style={{ color: score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--risk)" }}>{score}%</div>
                <div className="text-[14px] text-[var(--text-muted)]">Data Quality Score</div>
                {errors > 0 && <div className="text-[14px] text-[var(--risk)] mt-2">{errors} error(s) must be resolved before import</div>}
              </div>;
            })()}
            <div className="flex gap-2">
              <button onClick={() => setWizStep(2)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">← Back</button>
              <button onClick={() => setWizStep(4)} disabled={wizValidation.some(v => v.type === "error")} className="flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: wizValidation.some(v => v.type === "error") ? 0.4 : 1 }}>Confirm & Import →</button>
            </div>
          </div>}

          {/* STEP 4: Confirm & Import */}
          {wizStep === 4 && <div className="space-y-4">
            <div className="text-[15px] font-bold text-[var(--text-primary)]">Confirm Import</div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center"><div className="text-[22px] font-extrabold text-[var(--text-primary)]">{wizPreview?.rows.toLocaleString()}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Rows</div></div>
                <div className="text-center"><div className="text-[22px] font-extrabold text-[var(--accent-primary)]">{Object.values(wizMappings).filter(Boolean).length}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Fields Mapped</div></div>
                <div className="text-center"><div className="text-[22px] font-extrabold text-[var(--success)]">{Math.round((wizValidation.filter(v => v.type === "pass").length / Math.max(wizValidation.length, 1)) * 100)}%</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Quality</div></div>
              </div>
              <div className="text-[14px] text-[var(--text-secondary)] text-center">Ready to import <strong>{wizPreview?.name}</strong> with {Object.values(wizMappings).filter(Boolean).length} mapped fields.</div>
            </div>
            {/* Import history */}
            {wizImportHistory.length > 0 && <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Previous Imports</div>
              {wizImportHistory.slice(-3).reverse().map((h, i) => <div key={i} className="flex justify-between text-[13px] text-[var(--text-secondary)] py-1">{h.date} — {h.file} ({h.rows} rows, {h.quality}% quality)</div>)}
            </div>}
            <div className="flex gap-2">
              <button onClick={() => setWizStep(3)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">← Back</button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={wizDoImport} disabled={wizImporting} className="flex-1 px-4 py-3 rounded-xl text-[16px] font-bold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: wizImporting ? 0.5 : 1 }}>{wizImporting ? "Importing..." : "🚀 Import Data"}</motion.button>
            </div>
            {wizImporting && <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--accent-primary)] animate-pulse" style={{ width: "80%" }} /></div>}
          </div>}
        </div>
      </div>
    </div>}

    {/* ── SIDEBAR ── */}
    {/* Presentation mode top bar */}
    {presentMode && <div className="fixed top-0 left-0 right-0 z-[9996] flex items-center justify-between px-6 py-3" style={{ background: "linear-gradient(180deg, rgba(6,10,20,0.95), rgba(6,10,20,0.7))", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(244,168,58,0.1)" }}>
      <div className="flex items-center gap-4">
        <button onClick={presentPrev} disabled={presentIdx <= 0} className="text-[18px] text-white/40 hover:text-white disabled:opacity-20 transition-all">←</button>
        <div><div className="text-[18px] font-bold text-white font-heading">{MODULES.find(m => m.id === page)?.title || "Home"}</div><div className="text-[13px] text-white/40">{presentIdx >= 0 ? `Slide ${presentIdx + 1} of ${PRESENT_MODULES.length}` : "Presentation Mode"}</div></div>
        <button onClick={presentNext} disabled={presentIdx >= PRESENT_MODULES.length - 1} className="text-[18px] text-white/40 hover:text-white disabled:opacity-20 transition-all">→</button>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[13px] text-white/30 font-data">{Math.floor((Date.now() - presentStartTime) / 60000)} min</span>
        <button onClick={() => setPresentNotes(p => !p)} className="text-[13px] text-white/40 hover:text-white transition-all px-2 py-1 rounded border border-white/10">Notes (N)</button>
        <button onClick={() => setPresentMode(false)} className="text-[13px] font-semibold text-white/60 hover:text-white transition-all px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30">Exit Presentation</button>
      </div>
    </div>}

    {/* Presentation mode bottom navigator */}
    {presentMode && <div className="fixed bottom-0 left-0 right-0 z-[9996] h-12 flex items-center justify-center gap-2 px-6" style={{ background: "linear-gradient(0deg, rgba(6,10,20,0.95), rgba(6,10,20,0.7))", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(244,168,58,0.1)" }}>
      {PRESENT_MODULES.map((m, i) => {
        const mod = MODULES.find(x => x.id === m);
        const isCurrent = page === m;
        return <motion.button key={m} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(m)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-all" style={{ background: isCurrent ? "rgba(244,168,58,0.15)" : "transparent", color: isCurrent ? "#f0a050" : "rgba(255,255,255,0.3)", border: isCurrent ? "1px solid rgba(244,168,58,0.3)" : "1px solid transparent" }}>
          <span className="text-[14px]">{mod?.icon}</span>
          <span className="hidden lg:inline">{mod?.title?.split(" ").slice(0, 2).join(" ") || m}</span>
        </motion.button>;
      })}
    </div>}

    {/* Presenter notes overlay */}
    {presentMode && presentNotes && <div className="fixed bottom-12 left-0 right-0 z-[9995] px-8 py-4" style={{ background: "rgba(6,10,20,0.85)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(244,168,58,0.1)" }}>
      <div className="text-[14px] text-white/60 italic">
        {page === "snapshot" ? "Key metrics to highlight: total headcount, function distribution, AI readiness score. Note any anomalies in the data." :
         page === "scan" ? "Focus on the top 3 highest-impact findings. Walk through the AI impact matrix — which functions have the most automation potential?" :
         page === "design" ? "Walk through the Work Design Lab results for the top 2 roles. Show before/after time allocation." :
         page === "simulate" ? "Compare Conservative vs. Balanced vs. Aggressive. Highlight the risk-adjusted returns." :
         page === "plan" ? "Show the Gantt timeline. Walk through the ADKAR assessment results for leadership buy-in." :
         page === "opmodel" ? "Start with strategic priorities, then walk through the capability maturity gaps." :
         page === "export" ? "Offer to generate the deliverable pack: executive summary, detailed report, and transformation roadmap." :
         "Talking points for this module — press N to toggle notes."}
      </div>
    </div>}

    <aside className="min-h-screen flex flex-col px-4 py-5 shrink-0 overflow-y-auto sticky top-0 border-r border-[var(--border)] transition-all duration-300" style={{ width: "var(--sidebar-width)", height: "100vh", background: "var(--bg-deep)", ...(presentMode ? { marginLeft: "calc(var(--sidebar-width) * -1)", opacity: 0, pointerEvents: "none" } : {}) }}>
      <div className="flex items-center justify-between mb-1">
        <div className="cursor-pointer" onClick={() => goTo({ kind: "home" })}><div className="text-sm font-extrabold text-[var(--text-primary)]">AI Transformation</div><div className="text-[15px] font-semibold text-[var(--accent-primary)] uppercase tracking-[1.5px]">PLATFORM</div></div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <button onClick={() => {
        if (page === "home" && viewMode) { setViewMode(""); }
        else if (page !== "home") {
          const parentPhase = PHASES.find(p => p.modules?.some((mid: string) => mid === page));
          goTo(parentPhase ? { kind: "phase", phaseId: parentPhase.id } : { kind: "home" });
        }
        else { onBackToHub(); }
      }} className="w-full text-left text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1 mb-1 flex items-center gap-1 transition-colors">{
        page === "home" && viewMode ? "← Back to Views"
        : page !== "home" ? `← Back to ${PHASES.find(p => p.modules?.some((mid: string) => mid === page))?.label || "Home"}`
        : "← Back to Projects"
      }</button>
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-[var(--surface-2)] rounded-lg px-3 py-2 mb-2 border border-[var(--border)]"><div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-0.5">Active Project</div><div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{projectName}</div>{projectMeta && <div className="text-[15px] text-[var(--text-muted)] truncate mt-0.5 italic">{projectMeta}</div>}</motion.div>
      {/* Journey progress bar */}
      <div className="flex items-center gap-1 mb-2 mt-1">
        {PHASES.map((phase, pi) => {
          const ms = phase.modules.map(id => (moduleStatus[id] || "not_started"));
          const pStatus = ms.every(s => s === "complete") ? "complete" : ms.some(s => s !== "not_started") ? "in_progress" : "not_started";
          return <React.Fragment key={phase.id}>
            {pi > 0 && <div className="flex-1 h-px" style={{ background: pStatus !== "not_started" ? `${phase.color}40` : "var(--border)" }} />}
            <motion.button initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: pStatus !== "not_started" ? 1 : 0.4 }} transition={{ delay: pi * 0.1, duration: 0.3 }} onClick={() => { setPage("home"); }} title={`Phase ${pi+1}: ${phase.label}`} className="flex items-center gap-1 shrink-0 transition-all">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[15px] font-bold" style={{ background: pStatus === "complete" ? `${phase.color}20` : pStatus === "in_progress" ? `${phase.color}10` : "transparent", color: phase.color, border: `1px solid ${phase.color}${pStatus !== "not_started" ? "60" : "20"}` }}>{pStatus === "complete" ? "✓" : pStatus === "in_progress" ? "●" : "○"}</div>
            </motion.button>
          </React.Fragment>;
        })}
      </div>
      <div className="text-[15px] text-[var(--text-muted)] mb-1">{(() => { const ci = PHASES.findIndex(p => p.modules.some(id => (moduleStatus[id] || "not_started") !== "complete") || p.modules.every(id => (moduleStatus[id] || "not_started") === "not_started")); return ci >= 0 ? `Phase ${ci+1} of 5 — ${PHASES[ci].label}` : "Journey complete"; })()}</div>
      <div className="h-px bg-[var(--border)] my-3" />
      <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Data Intake</div>
      <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv,.tsv" onChange={e => e.target.files && upload(e.target.files)} className="hidden" />
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { setShowImportWizard(true); setWizStep(1); setWizFiles([]); setWizPreview(null); setWizMappings({}); setWizValidation([]); }} className="w-full text-white text-[13px] font-semibold py-1.5 rounded-lg mb-1.5" style={{ background: "#f4a83a" }}>Upload data</motion.button>
      <a href="/api/template" download className="block w-full bg-[var(--surface-3)] hover:bg-[var(--hover)] border border-[var(--accent-primary)] text-[var(--accent-primary)] text-[13px] font-semibold py-1.5 rounded-lg mb-1.5 text-center no-underline">Download Excel template</a>
      <button onClick={reset} className="w-full bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[13px] font-semibold py-1 rounded-lg">Reset to original data</button>
      {msg && <div className="mt-1.5 text-[15px] text-[var(--accent-primary)] bg-[rgba(244,168,58,0.1)] rounded px-2 py-1">{msg}</div>}
      {!backendOk && <div className="mt-1.5 text-[15px] text-[var(--risk)] bg-[rgba(232,122,93,0.1)] rounded px-2 py-1.5 border border-[var(--risk)]/20">⚠ Can't reach the server<br/><span className="text-[15px] text-[var(--text-muted)]">Start the backend: cd backend && python3 main.py</span></div>}
      {backendOk && model && <div className="mt-1.5 text-[15px] text-[var(--success)] bg-[rgba(139,168,122,0.1)] rounded px-2 py-1">✓ Connected · {model}</div>}
      <div className="h-px bg-[var(--border)] my-3" />
      {viewMode !== "employee" && <><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Model</div>
      <SidebarSelect options={models.length ? models : [loadingModels ? "Loading..." : "No models"]} value={model || (models[0] || (loadingModels ? "Loading..." : "No models"))} onChange={setModel} />
      <div className="h-px bg-[var(--border)] my-3" /></>}
      {viewMode !== "employee" && <><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Active Job</div>
      <SidebarSelect options={hasJobs ? ["All Jobs", ...jobs] : ["No jobs available"]} value={job || "All Jobs"} onChange={v => setJob(v === "All Jobs" || v === "No jobs available" ? "" : v)} />
      {job && job !== "All Jobs" && <div className="mt-1"><Badge color="indigo">{job}</Badge></div>}</>}
      <div className="h-px bg-[var(--border)] my-3" />
      {viewMode === "org" && <div className="bg-[rgba(244,168,58,0.06)] border border-[var(--accent-primary)]/15 rounded-lg px-3 py-2 mb-2"><div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-0.5">🏢 Organization View</div><div className="text-[15px] text-[var(--text-muted)]">Full workforce analytics</div><button onClick={() => setViewMode("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode === "employee" && viewEmployee && <div className="bg-[rgba(167,139,184,0.1)] border border-[var(--purple)]/20 rounded-lg px-3 py-2 mb-2"><div className="text-[15px] font-bold text-[var(--purple)] uppercase tracking-wider mb-0.5">👤 Employee View</div><div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{viewEmployee}</div><button onClick={() => setViewMode("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode === "job" && viewJob && <div className="bg-[rgba(139,168,122,0.1)] border border-[var(--success)]/20 rounded-lg px-3 py-2 mb-2"><div className="text-[15px] font-bold text-[var(--success)] uppercase tracking-wider mb-0.5">💼 Job View</div><div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{viewJob}</div><button onClick={() => setViewMode("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode === "custom" && <div className="bg-[rgba(232,197,71,0.08)] border border-[var(--warning)]/15 rounded-lg px-3 py-2 mb-2"><div className="text-[15px] font-bold text-[var(--warning)] uppercase tracking-wider mb-0.5">⚙️ Custom Slice</div><div className="text-[15px] text-[var(--text-muted)]">Filtered view</div><button onClick={() => setViewMode("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode !== "employee" && <><div className="flex items-center justify-between mb-2"><span className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px]">Filters</span>{af > 0 && <span className="bg-[rgba(244,168,58,0.2)] text-[var(--accent-primary)] text-[15px] font-bold px-2 py-0.5 rounded-full">{af}</span>}</div>
      <SidebarSelect label="Function" options={fo.functions || ["All"]} value={f.func} onChange={v => setFilter("func", v)} />
      <SidebarSelect label="Job Family" options={fo.job_families || ["All"]} value={f.jf} onChange={v => setFilter("jf", v)} />
      <SidebarSelect label="Sub-Family" options={fo.sub_families || ["All"]} value={f.sf} onChange={v => setFilter("sf", v)} />
      <SidebarSelect label="Career Level" options={fo.career_levels || ["All"]} value={f.cl} onChange={v => setFilter("cl", v)} />
      {af > 0 && <button onClick={clearFilters} className="w-full bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[15px] font-semibold py-1 rounded-md mt-1">Clear All</button>}</>}
      {/* Decision Log + Platform Hub */}
      <div className="mt-auto">
        <div className="h-px bg-[var(--border)] my-3" />
        <button onClick={() => setShowBotWorkspace(true)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showBotWorkspace ? "bg-[rgba(224,144,64,0.12)] text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">✦</span> AI Analyst
        </button>
        <button onClick={() => setShowAgentHub(!showAgentHub)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showAgentHub ? "bg-[rgba(167,139,184,0.1)] text-[var(--purple)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">🤖</span> Agent Hub {agentResults.filter(r => !r.reviewed).length > 0 && <span className="text-[12px] px-1.5 py-0.5 rounded-full bg-[rgba(167,139,184,0.2)] text-[var(--purple)] font-bold">{agentResults.filter(r => !r.reviewed).length}</span>}
        </button>
        <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }} onClick={() => setShowStoryEngine(true)} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">📖</span> Generate Story
        </motion.button>
        <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }} onClick={() => { setPresentMode(true); setPresentStartTime(Date.now()); setShowCoPilot(false); setShowAnnoPanel(false); setAnnotateMode(false); if (page === "home") navigate("snapshot"); }} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">🖥️</span> Present
        </motion.button>
        <button onClick={() => setShowCoPilot(!showCoPilot)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showCoPilot ? "bg-[rgba(244,168,58,0.1)] text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">🤖</span> AI Co-Pilot
        </button>
        <button onClick={() => setAnnotateMode(!annotateMode)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${annotateMode ? "bg-[rgba(244,168,58,0.1)] text-[#f4a83a] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">💬</span> {annotateMode ? "Annotating..." : "Annotate"}
        </button>
        <button onClick={() => setShowAnnoPanel(!showAnnoPanel)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showAnnoPanel ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">📋</span> Notes {annotations.length > 0 && <span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold">{annotations.length}</span>}
        </button>
        <button onClick={() => navigate("flightrecorder")} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${page === "flightrecorder" ? "bg-[rgba(244,168,58,0.08)] text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">🛫</span> Flight Recorder
        </button>
        <button onClick={() => setShowActivityFeed(!showActivityFeed)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showActivityFeed ? "bg-[rgba(139,168,122,0.1)] text-[var(--success)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">📡</span> Activity Feed {collab.presence.length > 0 && <span className="text-[12px] px-1.5 py-0.5 rounded-full bg-[rgba(139,168,122,0.2)] text-[var(--success)] font-bold">{collab.presence.length}</span>}
        </button>
        <button onClick={() => setShowDecLog(!showDecLog)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showDecLog ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">📝</span> Decision Log {decisionLog.length > 0 && <span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold">{decisionLog.length}</span>}
        </button>
        <button onClick={() => setSidebarGuide("consultant")} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">📋</span> Consultant Guide
        </button>
        <button onClick={() => setSidebarGuide("hr")} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">👥</span> HR Guide
        </button>
        <button onClick={() => { if (onShowPlatformHub) onShowPlatformHub(); }} className="w-full rounded-xl p-2.5 text-left transition-all group" style={{ background: "rgba(244,168,58,0.03)", border: "1px solid rgba(244,168,58,0.08)" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(244,168,58,0.2)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(244,168,58,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(244,168,58,0.08)"; e.currentTarget.style.boxShadow = "none"; }}>
          <div className="text-[15px] font-bold font-heading group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: "rgba(244,168,58,0.6)" }}>AI Transformation</div>
          <div className="text-[14px]" style={{ color: "rgba(244,168,58,0.3)" }}>Account & Info</div>
        </button>
      </div>

      {/* Account controls — anchored at sidebar bottom */}
      <div className="pt-3 border-t border-[var(--border)] relative" ref={accountMenuRef}>
        {/* Dropdown menu — pops upward */}
        {accountMenuOpen && <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 8, borderRadius: 14, background: "rgba(15,12,8,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(244,168,58,0.12)", boxShadow: "var(--shadow-4)", padding: "6px", zIndex: 50, animation: "menuFadeIn 0.15s ease" }}>
          {[
            { icon: "👤", label: "My Account", action: () => { setAccountMenuOpen(false); if (onShowPlatformHub) onShowPlatformHub(); } },
            { icon: "🏠", label: "Platform Hub", action: () => { setAccountMenuOpen(false); if (onShowPlatformHub) onShowPlatformHub(); } },
            { icon: "📂", label: "My Projects", action: () => { setAccountMenuOpen(false); onBackToHub(); } },
            ...((user?.username === "hiral") ? [{ icon: "🛡️", label: "Admin Panel", action: () => { setAccountMenuOpen(false); if (onShowPlatformHub) onShowPlatformHub(); } }] : []),
          ].map(item => <button key={item.label} onClick={item.action} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[15px] font-semibold text-[var(--text-secondary)] transition-all" style={{ background: "transparent" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,168,58,0.08)"; e.currentTarget.style.color = "#f5e6d0"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            <span className="text-[15px]">{item.icon}</span>{item.label}
          </button>)}
          <div className="h-px mx-2 my-1" style={{ background: "rgba(244,168,58,0.1)" }} />
          {/* Animated backgrounds toggle */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" title={animatedBg.forced ? animatedBg.forceReason : undefined} style={{ opacity: animatedBg.forced ? 0.4 : 1 }}>
            <span className="text-[15px]">🎬</span>
            <span className="text-[14px] text-[var(--text-secondary)] flex-1">Animated BGs</span>
            <button onClick={animatedBg.toggle} disabled={animatedBg.forced} className="w-8 h-4 rounded-full transition-all relative" style={{ background: animatedBg.enabled ? "var(--accent-primary)" : "var(--surface-3)", border: "1px solid var(--border)", cursor: animatedBg.forced ? "not-allowed" : "pointer" }}>
              <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: animatedBg.enabled ? 16 : 1 }} />
            </button>
          </div>
          {animatedBg.forced && <div className="px-3 pb-1 text-[10px] text-[var(--text-muted)] italic">{animatedBg.forceReason}</div>}
          <div className="h-px mx-2 my-1" style={{ background: "rgba(244,168,58,0.1)" }} />
          <button onClick={() => { setAccountMenuOpen(false); authApi.logout(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] transition-all" style={{ background: "transparent" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,122,93,0.08)"; e.currentTarget.style.color = "#ef4444"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
            <span className="text-[15px]">🚪</span>Sign Out
          </button>
          <style>{`@keyframes menuFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>}

        {/* Avatar + name — clickable to open dropdown */}
        {user && <button onClick={() => setAccountMenuOpen(!accountMenuOpen)} className="w-full flex items-center gap-2 mb-2 rounded-lg px-1 py-1 transition-all" style={{ background: accountMenuOpen ? "rgba(244,168,58,0.06)" : "transparent", cursor: "pointer", border: "none", textAlign: "left" }} onMouseEnter={e => { if (!accountMenuOpen) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }} onMouseLeave={e => { if (!accountMenuOpen) e.currentTarget.style.background = "transparent"; }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[15px] font-bold shrink-0" style={{ background: "linear-gradient(135deg, rgba(244,168,58,0.2), rgba(192,112,48,0.15))", border: "1px solid rgba(224,144,64,0.2)", color: "var(--accent-primary)", fontFamily: "'Inter Tight', sans-serif" }}>{(user.display_name || user.username || "U")[0].toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{user.display_name || user.username}</div>
            {user.last_login && <div className="text-[15px] text-[var(--text-muted)] font-data truncate">Last: {new Date(user.last_login).toLocaleDateString()}</div>}
          </div>
          <span className="text-[14px] text-[var(--text-muted)]">{accountMenuOpen ? "▾" : "▸"}</span>
        </button>}
        <div className="text-center text-[14px] text-[var(--text-muted)] mt-1 opacity-50">v4.0</div>
        {aiProviders && <div className="text-center text-[12px] mt-0.5 opacity-40" style={{ color: aiProviders.claude ? "var(--success)" : "var(--risk)" }}>{aiProviders.claude ? "🟢 AI: Claude" : "🔴 AI: Offline"}</div>}
        <button onClick={() => setShowShortcuts(true)} className="text-[12px] text-[var(--text-muted)] opacity-40 hover:opacity-80 transition-opacity mt-1 flex items-center justify-center gap-1"><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 16, padding: "0 4px", borderRadius: 4, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 11, fontFamily: "monospace" }}>⌘/</span> shortcuts</button>
      </div>
    </aside>

    {/* ── MAIN ── */}
    <main className={`flex-1 min-w-0 min-h-screen bg-[var(--bg)] overflow-x-hidden ${presentMode ? "present-scale" : ""}`} style={presentMode ? { paddingTop: 60, paddingBottom: 56 } : undefined}>
      {/* Collaboration: presence bar + editing indicator */}
      {collab.presence.length > 0 && !presentMode && (
        <div style={{ position: "sticky", top: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px", background: "rgba(var(--bg-rgb, 15,12,8),0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
          <EditingIndicator users={collab.presence} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
            <PresenceAvatars users={collab.presence} />
            <button onClick={() => setShowActivityFeed(!showActivityFeed)} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Inter Tight', sans-serif" }}>
              <span style={{ fontSize: 13 }}>📡</span> Activity
            </button>
          </div>
        </div>
      )}
      {/* Breadcrumb navigation */}
      {page !== "home" && !presentMode && (() => {
        const mod = MODULES.find(m => m.id === page);
        const phase = PHASES.find(p => p.modules?.some((mid: string) => mid === page));
        const segments: { label: string; target?: NavTarget }[] = [{ label: "Home", target: { kind: "home" } }];
        if (phase) segments.push({ label: phase.label, target: { kind: "phase", phaseId: phase.id } });
        if (mod) segments.push({ label: mod.title });
        if (job && viewCtx.mode === "job") segments.push({ label: job });
        if (viewCtx.mode === "employee" && viewCtx.employee) segments.push({ label: viewCtx.employee });
        return <div className="px-7 pt-3"><Breadcrumb segments={segments} /></div>;
      })()}
      <AnnotationLayer annotations={annotations} moduleId={page} annotateMode={annotateMode} onAdd={a => setAnnotations(prev => [...prev, a])} onUpdate={a => setAnnotations(prev => prev.map(x => x.id === a.id ? a : x))} onDelete={id => setAnnotations(prev => prev.filter(x => x.id !== id))}>
      <AnimatePresence mode="wait">
      <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1, ease: "easeOut" }} style={{ minHeight: "calc(100vh - 48px)" }}>
      {page === "home" && <LandingPage onNavigate={navigate} moduleStatus={moduleStatus} hasData={hasData} viewMode={viewMode} projectName={projectName} onBackToHub={onBackToHub} onBackToSplash={() => { setShowSplash(true); try { sessionStorage.removeItem(`${projectId}_splashSeen`); } catch (e) { console.error("[Storage]", e); } }} cardBackgrounds={cardBgs} phaseBackgrounds={phaseBgs} scrollToPhase={pendingPhase} onScrollToPhaseHandled={() => setPendingPhase(null)} />}
      {page !== "home" && <div className="module-enter" style={{ padding: "var(--space-6) var(--space-8)", paddingBottom: 80 }}>
      <NLQBar projectId={projectId} modelId={model} currentModule={page} />
      {model && page !== "flightrecorder" && <AiObservationsPanel module={page} dataSummary={buildAiContext()} context={`Project: ${projectName}. Model: ${model}. Job: ${job || "All"}.`} filters={f} projectId={projectId} onNavigate={navigate} />}
      {page === "snapshot" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><WorkforceSnapshot model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "ja-audit" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><JAAuditModule model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "ja-design" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><JADesignToolModule model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "skills-arch" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><SkillsArchitecture model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} /></ErrorBoundary>}
      {(page === "jobs" || page === "jobarch") && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><JobArchitectureModule model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "scan" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AiOpportunityScan model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "mgrcap" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ManagerCapability model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "changeready" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ChangeReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} simState={simState} /></ErrorBoundary>}
      {page === "mgrdev" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ManagerDevelopment model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "orghealth" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OrgHealthScorecard model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "skillshift" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><SkillShiftIndex model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "story" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><TransformationStoryBuilder model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} simState={simState} decisionLog={decisionLog} riskRegister={riskRegister} /></ErrorBoundary>}
      {page === "archetypes" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ReadinessArchetypes model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "export" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ExportReport model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} simState={simState} decisionLog={decisionLog} riskRegister={riskRegister} /></ErrorBoundary>}
      {page === "dashboard" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><TransformationExecDashboard model={model} f={f} onBack={goHome} onNavigate={navigate} decisionLog={decisionLog} riskRegister={riskRegister} addRisk={addRisk} updateRisk={updateRisk} jobStates={jobStates} simState={simState} transformationSummary={transformationSummary} /></ErrorBoundary>}
      {page === "readiness" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AIReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} /></ErrorBoundary>}
      {page === "bbba" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><BBBAFramework model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "headcount" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><HeadcountPlanning model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "reskill" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ReskillingPathways model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} simState={simState} /></ErrorBoundary>}
      {page === "marketplace" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><TalentMarketplace model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "skillnet" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><SkillsNetwork model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "skills" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><SkillsTalent model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} /></ErrorBoundary>}
      {page === "design" && model && viewCtx.mode !== "employee" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><WorkDesignLab model={model} f={f} job={viewCtx.mode === "job" ? viewCtx.job || job : job} jobs={jobs} onBack={goHome} jobStates={jobStates} setJobState={setJobState} onSelectJob={setJob} /></ErrorBoundary>}
      {page === "simulate" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ImpactSimulator onBack={goHome} onNavigate={navigate} model={model} viewCtx={viewCtx} f={f} jobStates={jobStates} simState={simState} setSimState={setSimState} /></ErrorBoundary>}
      {page === "build" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OrgDesignStudio onBack={goHome} viewCtx={viewCtx} model={model} f={f} odsState={odsState} setOdsState={setOdsState} jobStates={jobStates} /></ErrorBoundary>}
      {page === "reorg" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OrgRestructuring model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} /></ErrorBoundary>}
      {page === "plan" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ChangePlanner model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} simState={simState} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "opmodel" && viewCtx.mode === "job" && <div className="px-7 py-6"><div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Job View</h3><p className="text-[15px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[15px] font-semibold">Change View ↻</button></div></div>}
      {page === "opmodel" && viewCtx.mode !== "employee" && viewCtx.mode !== "job" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OperatingModelLab onBack={goHome} model={model} f={f} projectId={projectId} onNavigateCanvas={() => navigate("om_canvas")} onModelChange={setModel} /></ErrorBoundary>}
      {(page === "design" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[15px] text-[var(--text-secondary)] mb-2">Work Design Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="green">💼 Job</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[15px] font-semibold">Change View ↻</button></div>}
      {(page === "opmodel" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[15px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[15px] font-semibold">Change View ↻</button></div>}
      {page === "om_canvas" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OMDesignCanvas projectId={projectId} onBack={goHome} onNavigateLab={() => navigate("opmodel")} /></ErrorBoundary>}
      {page === "rolecompare" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><RoleComparison model={model} f={f} onBack={goHome} jobs={jobs} jobStates={jobStates} /></ErrorBoundary>}
      {page === "quickwins" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><QuickWinIdentifier model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} /></ErrorBoundary>}
      {page === "flightrecorder" && <FlightRecorder projectId={projectId} projectName={projectName} onBack={goHome} />}
      {!model && page !== "home" && page !== "flightrecorder" && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">📂</div><h3 className="text-lg font-semibold mb-1">No workforce data loaded</h3><p className="text-[15px] text-[var(--text-secondary)] max-w-md mx-auto mb-4">This module needs workforce data to function. Upload your data using the Smart Import wizard or select a demo model from the sidebar to explore.</p><div className="flex gap-3 justify-center"><button onClick={() => goTo({ kind: "home" })} className="px-4 py-2 rounded-xl text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/5 transition-all">← Back to Overview</button><button onClick={() => setShowImportWizard(true)} className="px-4 py-2 rounded-xl text-[15px] font-semibold text-white bg-[var(--accent-primary)] hover:brightness-110 transition-all">Import Data</button></div></div>}
      </div>}
      </motion.div>
      </AnimatePresence>
      </AnnotationLayer>
    </main>
    {/* AI Co-Pilot sidebar */}
    <AnimatePresence>{showCoPilot && <AiCoPilot moduleId={page} contextData={buildAiContext()} open={showCoPilot} onClose={() => setShowCoPilot(false)} onNavigate={navigate} />}</AnimatePresence>
    <AnimatePresence>{showAnnoPanel && <AnnotationPanel annotations={annotations} onUpdate={a => setAnnotations(prev => prev.map(x => x.id === a.id ? a : x))} onDelete={id => setAnnotations(prev => prev.filter(x => x.id !== id))} onClose={() => setShowAnnoPanel(false)} />}</AnimatePresence>

    {/* ═══ COLLABORATION: Activity Feed + Remote Change Toast ═══ */}
    <AnimatePresence>{showActivityFeed && <ActivityFeedPanel activity={collab.activity} onClose={() => setShowActivityFeed(false)} />}</AnimatePresence>
    <RemoteChangeToast change={remoteChange} onDismiss={() => setRemoteChange(null)} />

    {/* ═══ AGENT ORCHESTRATOR ═══ */}
    <AgentOrchestrator projectId={projectId} sessionData={{ jobs: jobs.slice(0, 20), headcount: jobs.length, tasks: [], skills: [], functions: Array.from(new Set(jobs)), model_id: model || "", current_module: page }} />

    {/* ═══ AGENT HUB PANEL ═══ */}
    <AnimatePresence>{showAgentHub && <motion.div className="fixed top-0 right-0 bottom-0 w-[380px] z-[9997] flex flex-col" style={{ background: "var(--surface-1)", borderLeft: "1px solid var(--border)", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }} initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }} transition={{ duration: 0.25, ease: "easeOut" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]" style={{ background: "linear-gradient(135deg, rgba(167,139,184,0.06), transparent)" }}>
        <div className="flex items-center gap-2.5"><span className="text-[18px]">🤖</span><div><div className="text-[15px] font-bold text-[var(--text-primary)] font-heading">Agent Hub</div><div className="text-[12px] text-[var(--text-muted)]">{AGENT_DEFS.filter(a => agentSettings[a.id]?.enabled).length} agents active</div></div></div>
        <div className="flex items-center gap-2">
          <button onClick={runAllAgents} disabled={!!agentRunning} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--purple), #7C3AED)", opacity: agentRunning ? 0.5 : 1 }}>{agentRunning ? "Running..." : "▶ Run All"}</button>
          <button onClick={() => setShowAgentHub(false)} className="text-[16px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
        </div>
      </div>

      {/* Agent cards */}
      <div className="px-3 py-3 space-y-2 border-b border-[var(--border)] overflow-y-auto" style={{ maxHeight: "40vh" }}>
        {AGENT_DEFS.map(agent => {
          const settings = agentSettings[agent.id] || { enabled: true, autonomy: "suggest" };
          const isRunning = agentRunning === agent.id;
          const recentResult = agentResults.find(r => r.agent === agent.id);
          return <div key={agent.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px]">{agent.icon}</span>
              <div className="flex-1 min-w-0"><div className="text-[14px] font-bold text-[var(--text-primary)]">{agent.name}</div><div className="text-[12px] text-[var(--text-muted)]">{agent.desc}</div></div>
              <div className="flex items-center gap-1.5">
                {isRunning && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--purple)" }} />}
                <button onClick={() => setAgentSettings(prev => ({...prev, [agent.id]: {...settings, enabled: !settings.enabled}}))} className="w-8 h-4 rounded-full transition-all relative" style={{ background: settings.enabled ? "var(--purple)" : "var(--surface-2)", border: "1px solid var(--border)" }}><div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: settings.enabled ? 16 : 1 }} /></button>
              </div>
            </div>
            {settings.enabled && <div className="flex items-center gap-2">
              <div className="flex gap-0.5">{(["observe", "suggest", "auto"] as const).map(a => <button key={a} onClick={() => setAgentSettings(prev => ({...prev, [agent.id]: {...settings, autonomy: a}}))} className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: settings.autonomy === a ? "rgba(167,139,184,0.15)" : "transparent", color: settings.autonomy === a ? "var(--purple)" : "var(--text-muted)" }}>{a}</button>)}</div>
              <div className="flex-1" />
              <button onClick={() => runAgent(agent.id)} disabled={!!agentRunning || !settings.enabled} className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-[var(--purple)] border border-[var(--purple)]/20 hover:bg-[rgba(167,139,184,0.08)] disabled:opacity-30">Run</button>
            </div>}
            {recentResult && !recentResult.reviewed && <div className="mt-2 rounded-lg bg-[rgba(167,139,184,0.04)] border border-[var(--purple)]/10 p-2">
              <div className="text-[12px] text-[var(--text-secondary)] line-clamp-2">{recentResult.result.slice(0, 120)}...</div>
              <div className="flex gap-1 mt-1"><button onClick={() => setAgentResults(prev => prev.map(r => r.id === recentResult.id ? {...r, reviewed: true} : r))} className="text-[11px] text-[var(--success)]">Accept</button><button onClick={() => setAgentResults(prev => prev.filter(r => r.id !== recentResult.id))} className="text-[11px] text-[var(--text-muted)]">Dismiss</button></div>
            </div>}
          </div>;
        })}
      </div>

      {/* Results feed */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Activity Feed</div>
        {agentHistory.length === 0 && <div className="text-center py-8 text-[var(--text-muted)] text-[13px]">No agent activity yet. Click &quot;Run All&quot; to start.</div>}
        <div className="space-y-1.5">{agentHistory.slice(0, 20).map(h => {
          const agent = AGENT_DEFS.find(a => a.id === h.agent);
          return <div key={h.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
            <span className="text-[14px] shrink-0">{agent?.icon || "🤖"}</span>
            <div className="flex-1 min-w-0"><div className="text-[13px] text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">{h.name}</strong> {h.action}</div><div className="text-[11px] text-[var(--text-muted)]">{new Date(h.time).toLocaleTimeString()}</div></div>
          </div>;
        })}</div>
      </div>
    </motion.div>}</AnimatePresence>
    <AnimatePresence>{showStoryEngine && <StoryEngine projectName={projectName} model={model} contextData={buildAiContext()} onClose={() => setShowStoryEngine(false)} onNavigate={navigate} />}</AnimatePresence>

    {/* ═══ BOT WORKSPACE ═══ */}
    {showBotWorkspace && model && <BotWorkspace projectId={projectId} modelId={model} onClose={() => setShowBotWorkspace(false)} />}
    {isTutorial && tutorialVisible && <TutorialOverlay step={tutorialStep} totalSteps={tutorialSteps.length} steps={tutorialSteps} onNext={tutorialNext} onPrev={tutorialPrev} onClose={() => setTutorialVisible(false)} onJump={tutorialJump} />}
    {isTutorial && !tutorialVisible && <TutorialBadge onClick={() => setTutorialVisible(true)} step={tutorialStep} total={tutorialSteps.length} />}

    {/* Decision Log Slide-out Panel */}
    {showDecLog && <div className="fixed top-0 right-0 bottom-0 w-[380px] z-[9998] bg-[var(--surface-1)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-slide-right" style={{ boxShadow: "-8px 0 30px rgba(0,0,0,0.3)" }}>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2"><span className="text-lg">📝</span><h3 className="text-[14px] font-bold font-heading text-[var(--text-primary)]">Decision Log</h3><span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold">{decisionLog.length}</span></div>
        <button onClick={() => setShowDecLog(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">✕</button>
      </div>
      <div className="px-4 py-2 border-b border-[var(--border)] flex gap-1 shrink-0 overflow-x-auto">
        {["All", ...Array.from(new Set(decisionLog.map(d => d.module)))].map(m => <button key={m} onClick={() => setDecLogFilter(m)} className={`px-2 py-1 rounded text-[14px] font-semibold whitespace-nowrap ${decLogFilter === m ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>{m}</button>)}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {decisionLog.length === 0 ? <div className="text-center py-12 text-[var(--text-muted)]"><div className="text-3xl mb-2 opacity-30">📝</div><div className="text-[15px]">No decisions logged yet.<br/>Actions in any module are automatically recorded here.</div></div> :
        <div className="space-y-2">
          {decisionLog.filter(d => decLogFilter === "All" || d.module === decLogFilter).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).map((d, i) => <div key={i} className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold">{d.module}</span>
              <span className="text-[14px] text-[var(--text-muted)] font-data">{new Date(d.ts).toLocaleDateString()} {new Date(d.ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
            </div>
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">{d.action}</div>
            <div className="text-[15px] text-[var(--text-secondary)] mt-0.5">{d.detail}</div>
          </div>)}
        </div>}
      </div>
    </div>}

    {sidebarGuide && loadedGuideData && <GuideViewer guide={loadedGuideData} onBack={() => setSidebarGuide(null)} onNavigate={(moduleId) => { setSidebarGuide(null); navigate(moduleId); }} />}
    <ToastContainer />
  </div></NavContext.Provider>;
}

function AuthGate({ onAuth }: { onAuth: (user: authApi.AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [message, setMessage] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwC, setShowPwC] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [successUser, setSuccessUser] = useState<authApi.AuthUser | null>(null);

  // Username availability check (debounced)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Email availability check (debounced)
  const [emailAvailable, setEmailAvailable] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emailValid = isValidEmail(email);
  const showEmailFormatError = emailTouched && email.length > 0 && !emailValid;
  const showEmailFormatOk = emailTouched && email.length > 0 && emailValid;

  // Load remembered credentials on mount
  useEffect(() => {
    setError("");
    const saved = authApi.getRememberedCredentials();
    if (saved) { setUsername(saved.username); setPassword(saved.password); setRememberMe(true); }
  }, []);

  // Debounced username availability check
  useEffect(() => {
    if (mode !== "register" || username.length < 3) {
      setUsernameStatus(username.length > 0 && username.length < 3 ? "invalid" : "idle");
      setUsernameSuggestions([]);
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    usernameTimerRef.current = setTimeout(async () => {
      const result = await authApi.checkUsername(username);
      setUsernameStatus(result.available ? "available" : result.reason === "invalid" ? "invalid" : "taken");
      setUsernameSuggestions(result.suggestions || []);
    }, 500);
    return () => { if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current); };
  }, [username, mode]);

  // Debounced email availability check
  useEffect(() => {
    if (mode !== "register" || !emailValid) { setEmailAvailable("idle"); return; }
    setEmailAvailable("checking");
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    emailTimerRef.current = setTimeout(async () => {
      const result = await authApi.checkEmail(email.trim().toLowerCase());
      setEmailAvailable(result.available ? "available" : "taken");
    }, 500);
    return () => { if (emailTimerRef.current) clearTimeout(emailTimerRef.current); };
  }, [email, emailValid, mode]);

  // Auto-fill display name from username
  useEffect(() => {
    if (mode === "register" && username && !displayName) setDisplayName(username);
  }, [username, mode, displayName]);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const d = await authApi.login(username, password);
      if (rememberMe) authApi.saveRememberedCredentials(username, password);
      else authApi.clearRememberedCredentials();
      const u = d.user as authApi.AuthUser;
      analytics.identifyUser(u.id, { username: u.username, display_name: u.display_name });
      analytics.trackLogin(u.id);
      onAuth(u);
    }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Login failed"); setShakeError(true); setTimeout(() => setShakeError(false), 600); }
    setLoading(false);
  };

  const handleRegister = async () => {
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError("Email is required"); return; }
    if (!isValidEmail(cleanEmail)) { setError("Please enter a valid email address"); return; }
    if (password !== passwordConfirm) { setError("Passwords do not match"); return; }
    if (!agreeTerms) { setError("Please agree to the Terms of Service"); return; }
    setLoading(true);
    try {
      const d = await authApi.register(username, password, passwordConfirm, cleanEmail, displayName || username);
      const regUser = d.user as authApi.AuthUser;
      analytics.identifyUser(regUser.id, { username: regUser.username, display_name: regUser.display_name, email: cleanEmail });
      analytics.trackSignup(regUser.id, "email");
      analytics.trackFunnelStep("signed_up");
      setSuccessUser(regUser);
    }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Registration failed"); setShakeError(true); setTimeout(() => setShakeError(false), 600); }
    setLoading(false);
  };

  const handleForgot = async () => {
    setError(""); setMessage("");
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) { setError("Please enter a valid email address"); return; }
    setLoading(true);
    try {
      const d = await authApi.forgotPassword(cleanEmail);
      if ((d as Record<string, unknown>).token) { setResetToken((d as Record<string, unknown>).token as string); setMessage("Reset token generated. Enter it below with your new password."); setMode("reset"); }
      else { setMessage((d as Record<string, unknown>).message as string); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  };
  const handleReset = async () => {
    setError(""); setMessage(""); setLoading(true);
    try { await authApi.resetPassword(resetToken, password, passwordConfirm); setMessage("Password reset! You can now log in."); setMode("login"); setPassword(""); setPasswordConfirm(""); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Reset failed"); }
    setLoading(false);
  };

  const pwReqs = [
    { ok: password.length >= 8, t: "8+ characters" },
    { ok: /[A-Z]/.test(password), t: "Uppercase" },
    { ok: /[a-z]/.test(password), t: "Lowercase" },
    { ok: /[0-9]/.test(password), t: "Number" },
    { ok: /[!@#$%^&*(),.?":{}|<>]/.test(password), t: "Special char" },
  ];
  const pwScore = pwReqs.filter(r => r.ok).length;
  const pwStrengthLabel = pwScore <= 1 ? "Weak" : pwScore <= 2 ? "Fair" : pwScore <= 3 ? "Good" : pwScore <= 4 ? "Strong" : "Excellent";
  const pwColors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#8ba87a"];
  const pwStrengthColor = pwScore > 0 ? pwColors[Math.min(pwScore - 1, 4)] : "rgba(255,255,255,0.1)";
  const allPwOk = pwReqs.every(r => r.ok);
  const pwMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const pwMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  const canSubmitRegister = emailValid && emailAvailable !== "taken" && usernameStatus === "available" && allPwOk && pwMatch && agreeTerms && !loading;

  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", color: "#f5e6d0", fontSize: 14, fontFamily: "'Inter Tight', sans-serif", outline: "none", boxSizing: "border-box" as const, backdropFilter: "blur(4px)", transition: "border-color 0.2s" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontFamily: "monospace", textTransform: "uppercase" as const, letterSpacing: "1.5px" };
  const btnStyle: React.CSSProperties = { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", letterSpacing: "0.5px", boxShadow: "0 4px 20px rgba(224,144,64,0.3)", transition: "all 0.3s" };
  const hintStyle: React.CSSProperties = { fontSize: 14, fontFamily: "monospace", marginTop: 3, display: "flex", alignItems: "center", gap: 4 };
  const focusBorder = "rgba(224,144,64,0.5)";

  // ── Welcome modal after successful registration ──
  if (successUser) {
    return (
      <div className="auth-screen" style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <VideoBackground name="login_bg" overlay={0.5} poster={`${CDN_BASE}/login_bg.png`} fallbackGradient="linear-gradient(135deg, #1a1208 0%, #2a1a0a 30%, #0f0d08 70%, #1a1510 100%)" className="absolute inset-0" />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse at center, rgba(10,8,5,0.3) 0%, rgba(10,8,5,0.75) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420, padding: "0 24px", textAlign: "center" }}>
          <div style={{ background: "rgba(15,12,8,0.7)", backdropFilter: "blur(30px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: "40px 32px", boxShadow: "var(--shadow-4)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f5e6d0", marginBottom: 8, fontFamily: "'Inter Tight', sans-serif" }}>Welcome, {successUser.display_name || successUser.username}!</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 28, lineHeight: 1.6 }}>Your account is ready. Start exploring the AI Transformation Platform.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { sessionStorage.setItem("fresh_login", "1"); onAuth(successUser); }}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f5e6d0", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif" }}>
                Take the Tour
              </button>
              <button onClick={() => onAuth(successUser)}
                style={{ ...btnStyle, flex: 1, padding: "12px" }}>
                Jump In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen" style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <VideoBackground name="login_bg" overlay={0.5} poster={`${CDN_BASE}/login_bg.png`} fallbackGradient="linear-gradient(135deg, #1a1208 0%, #2a1a0a 30%, #0f0d08 70%, #1a1510 100%)" className="absolute inset-0" />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse at center, rgba(10,8,5,0.25) 0%, rgba(10,8,5,0.7) 100%)" }} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Inter Tight', sans-serif", letterSpacing: "-0.5px", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>AI Transformation</div>
          <div style={{ fontSize: 15, color: "rgba(224,144,64,0.85)", fontFamily: "monospace", letterSpacing: "5px", textTransform: "uppercase" as const, marginTop: 4, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>Platform</div>
        </div>

        <div style={{ background: "rgba(15,12,8,0.65)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: "32px 28px", boxShadow: "0 32px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)", animation: shakeError ? "shake 0.5s ease" : undefined }}>
          <style>{`@keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
            @keyframes pulseBtn { 0%,100% { box-shadow: 0 4px 20px rgba(224,144,64,0.3); } 50% { box-shadow: 0 4px 28px rgba(224,144,64,0.5); } }`}</style>

          {(mode === "login" || mode === "register") && (
            <div style={{ display: "flex", gap: 3, marginBottom: 22, background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: 3 }}>
              {(["login", "register"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); setMessage(""); }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 15, fontWeight: 600, fontFamily: "'Inter Tight', sans-serif", border: "none", cursor: "pointer", transition: "all 0.25s",
                    background: mode === m ? "rgba(224,144,64,0.18)" : "transparent",
                    color: mode === m ? "var(--accent-primary)" : "rgba(255,255,255,0.35)",
                  }}>{m === "login" ? "Sign In" : "Create Account"}</button>
              ))}
            </div>
          )}

          {mode === "forgot" && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer", fontFamily: "monospace" }}>← Back to Sign In</button>
              <h3 style={{ color: "#f5e6d0", fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>Forgot Password</h3>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 15, marginTop: 4 }}>Enter your email to receive a reset link.</p>
            </div>
          )}
          {mode === "reset" && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer", fontFamily: "monospace" }}>← Back to Sign In</button>
              <h3 style={{ color: "#f5e6d0", fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: "'Inter Tight', sans-serif" }}>Reset Password</h3>
            </div>
          )}

          {error && error.trim() && <div style={{ background: "rgba(220,50,50,0.12)", border: "1px solid rgba(220,50,50,0.25)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, color: "#f08080", fontSize: 15, fontFamily: "monospace" }}>{error}</div>}
          {message && <div style={{ background: "rgba(139,168,122,0.1)", border: "1px solid rgba(139,168,122,0.2)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, color: "#6ee7b7", fontSize: 15, fontFamily: "monospace" }}>{message}</div>}

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <form onSubmit={e => { e.preventDefault(); handleLogin(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }} autoComplete="on" noValidate>
              <div><label htmlFor="login-username" style={labelStyle}>Username</label><input id="login-username" value={username} onChange={e => setUsername(e.target.value)} onInvalid={e => e.preventDefault()} formNoValidate placeholder="Enter username" style={inputStyle} autoComplete="username" name="username" onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} /></div>
              <div><label htmlFor="login-password" style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input id="login-password" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onInvalid={e => e.preventDefault()} formNoValidate placeholder="Enter password" style={{ ...inputStyle, paddingRight: 44 }} autoComplete="off" name="password" onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center" }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input id="login-remember" type="checkbox" checked={rememberMe} onChange={e => { setRememberMe(e.target.checked); if (!e.target.checked) authApi.clearRememberedCredentials(); }} style={{ accentColor: "var(--accent-primary)", width: 14, height: 14 }} />
                <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>Remember me</span>
              </label>
              <button type="submit" disabled={loading || !username || !password} style={{ ...btnStyle, opacity: loading ? 0.5 : 1, marginTop: 2 }}>{loading ? "Signing in..." : "Sign In"}</button>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 15, cursor: "pointer", fontFamily: "monospace" }}>Forgot password?</button>
            </form>
          )}

          {/* ── REGISTER (premium experience) ── */}
          {mode === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Email */}
              <div>
                <label htmlFor="reg-email" style={labelStyle}>Email</label>
                <div style={{ position: "relative" }}>
                  <input id="reg-email" value={email} onChange={e => { setEmail(e.target.value); if (!emailTouched) setEmailTouched(true); }} onBlur={() => setEmailTouched(true)} placeholder="your@email.com" type="email" style={{ ...inputStyle, paddingRight: 36, borderColor: showEmailFormatError || emailAvailable === "taken" ? "rgba(232,122,93,0.5)" : showEmailFormatOk && emailAvailable === "available" ? "rgba(139,168,122,0.4)" : undefined }} autoComplete="email" onFocus={e => { if (!showEmailFormatError) e.currentTarget.style.borderColor = focusBorder; }} />
                  {emailAvailable === "checking" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#f59e0b", fontSize: 15 }}>...</span>}
                  {emailAvailable === "available" && showEmailFormatOk && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#8ba87a", fontSize: 15 }}>✓</span>}
                  {showEmailFormatError && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
                  {emailAvailable === "taken" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
                </div>
                {showEmailFormatError && <span style={{ ...hintStyle, color: "#ef4444" }}>Please enter a valid email address</span>}
                {emailAvailable === "taken" && <span style={{ ...hintStyle, color: "#ef4444" }}>An account with this email already exists — <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: "var(--accent-primary)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", textDecoration: "underline" }}>sign in instead?</button></span>}
                {emailAvailable === "available" && showEmailFormatOk && <span style={{ ...hintStyle, color: "#8ba87a" }}>Valid email</span>}
              </div>

              {/* Username */}
              <div>
                <label htmlFor="reg-username" style={labelStyle}>Username</label>
                <div style={{ position: "relative" }}>
                  <input id="reg-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" style={{ ...inputStyle, paddingRight: 36, borderColor: usernameStatus === "taken" || usernameStatus === "invalid" ? "rgba(232,122,93,0.5)" : usernameStatus === "available" ? "rgba(139,168,122,0.4)" : undefined }} autoComplete="username" name="username" onFocus={e => { if (usernameStatus !== "taken" && usernameStatus !== "invalid") e.currentTarget.style.borderColor = focusBorder; }} />
                  {usernameStatus === "checking" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#f59e0b", fontSize: 15 }}>...</span>}
                  {usernameStatus === "available" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#8ba87a", fontSize: 15 }}>✓</span>}
                  {usernameStatus === "taken" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
                  {usernameStatus === "invalid" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
                </div>
                {usernameStatus === "available" && <span style={{ ...hintStyle, color: "#8ba87a" }}>Available</span>}
                {usernameStatus === "taken" && <span style={{ ...hintStyle, color: "#ef4444" }}>Username already taken</span>}
                {usernameStatus === "invalid" && <span style={{ ...hintStyle, color: "#ef4444" }}>3-30 characters, letters, numbers, underscores only</span>}
                {usernameStatus === "taken" && usernameSuggestions.length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {usernameSuggestions.map(s => <button key={s} onClick={() => setUsername(s)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(224,144,64,0.3)", background: "rgba(224,144,64,0.08)", color: "var(--accent-primary)", fontSize: 15, cursor: "pointer", fontFamily: "monospace" }}>{s}</button>)}
                </div>}
              </div>

              {/* Display Name */}
              <div>
                <label htmlFor="reg-displayname" style={labelStyle}>Display Name</label>
                <input id="reg-displayname" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How others will see you" style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input id="reg-password" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" style={{ ...inputStyle, paddingRight: 44 }} autoComplete="new-password" name="password" onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center" }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                {password.length > 0 && <>
                  <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                    {[1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= pwScore ? pwColors[Math.min(pwScore - 1, 4)] : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 5, gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {pwReqs.map(r => <span key={r.t} style={{ fontSize: 14, fontFamily: "monospace", color: r.ok ? "#8ba87a" : "rgba(255,255,255,0.25)", transition: "color 0.2s" }}>{r.ok ? "✓" : "○"} {r.t}</span>)}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: pwStrengthColor, fontFamily: "monospace", whiteSpace: "nowrap" }}>{pwStrengthLabel}</span>
                  </div>
                </>}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-password-confirm" style={labelStyle}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input id="reg-password-confirm" type={showPwC ? "text" : "password"} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Type password again" style={{ ...inputStyle, paddingRight: 44, borderColor: pwMismatch ? "rgba(232,122,93,0.5)" : pwMatch ? "rgba(139,168,122,0.4)" : undefined }} autoComplete="new-password" name="password_confirm" onFocus={e => { if (!pwMismatch) e.currentTarget.style.borderColor = focusBorder; }} />
                  <button type="button" onClick={() => setShowPwC(!showPwC)} aria-label={showPwC ? "Hide password confirmation" : "Show password confirmation"} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center" }}>{showPwC ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                {pwMatch && <span style={{ ...hintStyle, color: "#8ba87a" }}>Passwords match</span>}
                {pwMismatch && <span style={{ ...hintStyle, color: "#ef4444" }}>Passwords don&apos;t match</span>}
              </div>

              {/* Terms */}
              <label htmlFor="reg-terms" style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginTop: 2 }}>
                <input id="reg-terms" type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ accentColor: "var(--accent-primary)", width: 14, height: 14, marginTop: 1 }} />
                <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", lineHeight: 1.5 }}>I agree to the <span style={{ color: "var(--accent-primary)", cursor: "pointer" }}>Terms of Service</span> and <span style={{ color: "var(--accent-primary)", cursor: "pointer" }}>Privacy Policy</span></span>
              </label>

              {/* Submit */}
              <button onClick={handleRegister} disabled={!canSubmitRegister}
                style={{ ...btnStyle, opacity: canSubmitRegister ? 1 : 0.3, marginTop: 4, animation: canSubmitRegister && !loading ? "pulseBtn 2s ease-in-out infinite" : "none" }}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                    Creating your account...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </span>
                ) : "Create Account"}
              </button>
            </div>
          )}

          {/* ── FORGOT ── */}
          {mode === "forgot" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label htmlFor="forgot-email" style={labelStyle}>Email</label>
                <div style={{ position: "relative" }}>
                  <input id="forgot-email" value={email} onChange={e => { setEmail(e.target.value); if (!emailTouched) setEmailTouched(true); }} onBlur={() => setEmailTouched(true)} placeholder="Enter your account email" type="email" style={{ ...inputStyle, paddingRight: 36, borderColor: showEmailFormatError ? "rgba(232,122,93,0.5)" : showEmailFormatOk ? "rgba(139,168,122,0.4)" : undefined }} />
                  {showEmailFormatOk && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#8ba87a", fontSize: 15 }}>✓</span>}
                  {showEmailFormatError && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
                </div>
                {showEmailFormatError && <span style={{ ...hintStyle, color: "#ef4444" }}>Please enter a valid email address</span>}
              </div>
              <button onClick={handleForgot} disabled={loading || !emailValid} style={{ ...btnStyle, opacity: (loading || !emailValid) ? 0.5 : 1 }}>{loading ? "..." : "Send Reset Link"}</button>
            </div>
          )}

          {/* ── RESET ── */}
          {mode === "reset" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label htmlFor="reset-token" style={labelStyle}>Reset Token</label><input id="reset-token" value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Paste reset token" style={{ ...inputStyle, fontFamily: "monospace" }} /></div>
              <div><label htmlFor="reset-password" style={labelStyle}>New Password</label><input id="reset-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter new password" style={inputStyle} /></div>
              <div><label htmlFor="reset-password-confirm" style={labelStyle}>Confirm New Password</label><input id="reset-password-confirm" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Type again" style={inputStyle} /></div>
              <button onClick={handleReset} disabled={loading || !resetToken || !password || password !== passwordConfirm} style={{ ...btnStyle, opacity: loading ? 0.5 : 1 }}>{loading ? "..." : "Reset Password"}</button>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>Token expires after 30 minutes</p>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 15, marginTop: 20, fontFamily: "monospace", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>Secure authentication {"\u00B7"} Your data stays private</p>
        <div style={{ textAlign: "center", marginTop: 12, display: "flex", justifyContent: "center", gap: 16 }}>
          <a href="/privacy" style={{ fontSize: 13, color: "rgba(255,200,150,0.25)", textDecoration: "none", fontFamily: "monospace" }}>Privacy Policy</a>
          <a href="/terms" style={{ fontSize: 13, color: "rgba(255,200,150,0.25)", textDecoration: "none", fontFamily: "monospace" }}>Terms of Service</a>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   OM DESIGN CANVAS — drag-and-drop operating model builder
   Archetypes · Layers · FTE delta overlay · KPI linkage · Versioning
   ═══════════════════════════════════════════════════════════════ */

// ── Types ─────────────────────────────────────────────────────────────────────

/* ═══════════════════════════════════════════════════════════════
   APP ROOT — Auth gate → ProjectHub → Home
   ═══════════════════════════════════════════════════════════════ */
export default function Page() {
  const [user, setUser] = useState<authApi.AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeProject, setActiveProject] = useState<{ id: string; name: string; meta: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [sessionWarned, setSessionWarned] = useState(false);
  const [showPlatformHub, setShowPlatformHub] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSandboxPicker, setShowSandboxPicker] = useState(false);

  // Session management — check for inactivity timeout
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      authApi.touchActivity(); // reset on any render cycle with user interaction
    }, 60000); // touch every minute
    // Check session expiry every 30 seconds
    const checkSession = setInterval(() => {
      if (authApi.isSessionExpired()) {
        authApi.clearToken();
        setUser(null);
        setAuthChecked(true);
        alert("Session expired, please sign in again");
      } else if (authApi.isSessionWarning() && !sessionWarned) {
        setSessionWarned(true);
        // Will be shown via toast once app is mounted
      }
    }, 30000);
    // Track activity on user interaction
    const onActivity = () => authApi.touchActivity();
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => { clearInterval(interval); clearInterval(checkSession); window.removeEventListener("click", onActivity); window.removeEventListener("keydown", onActivity); };
  }, [user, sessionWarned]);

  // Check if user is already logged in
  useEffect(() => {
    const stored = authApi.getStoredUser();
    const token = authApi.getToken();
    if (stored && token) {
      // Check session expiry first
      if (authApi.isSessionExpired()) {
        authApi.clearToken();
        setAuthChecked(true);
        return;
      }
      authApi.getMe().then(u => {
        if (u) { setUser(u); analytics.identifyUser(u.id, { username: u.username, display_name: u.display_name }); } else { authApi.clearToken(); }
        setAuthChecked(true);
      });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Load active project from localStorage
  useEffect(() => {
    if (!user) return;
    try { const saved = localStorage.getItem("hub_active"); if (saved) setActiveProject(JSON.parse(saved)); } catch (e) { console.error("[Storage]", e); }
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!loaded || !user) return;
    if (activeProject) localStorage.setItem("hub_active", JSON.stringify(activeProject));
    else localStorage.removeItem("hub_active");
  }, [activeProject, loaded, user]);

  if (!authChecked) return null;
  if (!user) return <AuthGate onAuth={(u) => { sessionStorage.setItem("fresh_login", "1"); localStorage.removeItem("hub_active"); setActiveProject(null); setUser(u); }} />;
  if (!loaded) return null;

  // On ProjectHub (no sidebar), show account controls top-right with Platform Hub link
  const hubAccountBar = (
    <div style={{ position: "fixed", top: 16, right: 20, zIndex: 9999, display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={() => setShowPlatformHub(true)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,200,150,0.15)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", color: "rgba(255,200,150,0.6)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 15 }}>🧭</span> Platform Hub</button>
      <button onClick={() => setShowProfile(true)} style={{ width: 30, height: 30, borderRadius: 10, border: "1px solid rgba(224,144,64,0.2)", background: "linear-gradient(135deg, rgba(244,168,58,0.15), rgba(192,112,48,0.1))", color: "var(--accent-primary)", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }} title="Profile Settings">{(user.display_name || user.username || "U")[0].toUpperCase()}</button>
      <button onClick={() => authApi.logout()} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,200,150,0.15)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", color: "rgba(255,200,150,0.6)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif" }}>Sign Out</button>
    </div>
  );

  const profileModal = showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} onUpdate={u => { setUser(u); setShowProfile(false); }} />;

  // Platform Hub — accessible from BOTH the project selection page and inside the app
  if (showPlatformHub) return <PlatformHub user={user} onBack={() => setShowPlatformHub(false)} onUpdateUser={u => setUser(u)} />;

  // Tutorial overlay (standalone, no data needed)
  if (showTutorial) return <Tutorial onClose={() => { setShowTutorial(false); setShowSandboxPicker(false); }} onGoToSandbox={() => { setShowTutorial(false); setShowSandboxPicker(true); }} onGoToNewProject={() => { setShowTutorial(false); setShowSandboxPicker(false); }} />;

  const appContent = !activeProject
    ? <>{hubAccountBar}{profileModal}<ProjectHub user={user} onOpenProject={setActiveProject} onStartTutorial={() => setShowTutorial(true)} onOpenSandbox={() => setShowSandboxPicker(true)} showSandboxPicker={showSandboxPicker} onCloseSandbox={() => setShowSandboxPicker(false)} /></>
    : <>{profileModal}<Home key={activeProject.id} projectId={activeProject.id} projectName={activeProject.name} projectMeta={activeProject.meta} onBackToHub={() => setActiveProject(null)} user={user} onShowProfile={() => setShowProfile(true)} onShowPlatformHub={() => setShowPlatformHub(true)} /></>;
  return <>{appContent}{!activeProject && <MusicPlayer projectActive={false} />}</>;
}


