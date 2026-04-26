"use client";
import React, { useState, useEffect, useRef } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import type { JobContextKpis, JobContextResponse } from "../../../types/api";
import {
  COLORS, KpiCard, Card, Empty, Badge, InsightPanel, DataTable,
  BarViz, DonutViz, TabBar, PageHeader, LoadingBar, LoadingSkeleton,
  NextStepBar,
  useApiData, usePersisted, callAI, showToast, logDec,
  EmptyWithAction, JobDesignState, SIM_PRESETS,
  AiJobSuggestButton, fmtNum,
} from "../shared";
import {
  Sparkle, PenLine, Search, Filter, ChevronLeft, ChevronRight,
  Plus, X, Pencil, Check, BookOpen, Layers3, TrendingUp,
  FileText, BarChart3, Lock,
} from "@/lib/icons";
import WorkDesignQueue from "../wd/WorkDesignQueue";
import WorkflowCanvas from "../wd/WorkflowCanvas";
import {
  EmptyState,
  ExpertPanel,
  FlowNav,
} from "@/app/ui";
export { TASK_DICTIONARY, findTaskDictEntries } from "../shared/taskDictionary";
import { TASK_DICTIONARY, findTaskDictEntries } from "../shared/taskDictionary";
import { PathStepBanner } from "../designpaths/PathStepBanner";
import { SoftCompletionWarning } from "../designpaths/SoftCompletionWarning";
import { usePathBanner } from "../../lib/designpaths/usePathBanner";

/* ─── Change Playbook Dictionary — pre-built wave plans for common transformations ─── */
const CHANGE_PLAYBOOKS: { name: string; desc: string; industry: string; waves: { wave: string; time: string; initiatives: { name: string; owner: string; priority: string; risk: string }[] }[] }[] = [
  { name: "AI Copilot Rollout", desc: "Phased introduction of AI copilot tools across functions — awareness, pilot, scale.", industry: "General", waves: [
    { wave: "Wave 1", time: "Month 1-3", initiatives: [
      {name:"AI tool selection & procurement",owner:"CDO",priority:"High",risk:"Vendor lock-in"},
      {name:"Change champion network formation",owner:"CHRO",priority:"High",risk:"Champion burnout"},
      {name:"Baseline productivity measurement",owner:"People Analytics",priority:"Medium",risk:"Data quality"},
      {name:"IT infrastructure readiness",owner:"CIO",priority:"High",risk:"Security gaps"},
    ]},
    { wave: "Wave 2", time: "Month 4-6", initiatives: [
      {name:"Pilot group deployment (2-3 functions)",owner:"Function Leads",priority:"High",risk:"Low adoption"},
      {name:"Training program launch",owner:"L&D",priority:"High",risk:"Content relevance"},
      {name:"Feedback loop & iteration",owner:"Product Owner",priority:"Medium",risk:"Scope creep"},
    ]},
    { wave: "Wave 3", time: "Month 7-12", initiatives: [
      {name:"Enterprise-wide rollout",owner:"COO",priority:"High",risk:"Change fatigue"},
      {name:"Process redesign integration",owner:"Process Excellence",priority:"Medium",risk:"Resistance"},
      {name:"ROI measurement & reporting",owner:"CFO",priority:"Medium",risk:"Attribution difficulty"},
    ]},
  ]},
  { name: "Shared Services Migration", desc: "Transition from embedded function delivery to Global Business Services model.", industry: "General", waves: [
    { wave: "Wave 1", time: "Month 1-4", initiatives: [
      {name:"Service catalog definition",owner:"GBS Lead",priority:"High",risk:"Scope ambiguity"},
      {name:"SLA design & governance",owner:"COO",priority:"High",risk:"Unrealistic targets"},
      {name:"Technology platform selection",owner:"CIO",priority:"High",risk:"Integration complexity"},
    ]},
    { wave: "Wave 2", time: "Month 5-9", initiatives: [
      {name:"Transactional process migration",owner:"GBS Lead",priority:"High",risk:"Knowledge loss"},
      {name:"Staff transition & reskilling",owner:"CHRO",priority:"High",risk:"Attrition spike"},
      {name:"Service delivery go-live",owner:"GBS Lead",priority:"High",risk:"Quality dip"},
    ]},
    { wave: "Wave 3", time: "Month 10-18", initiatives: [
      {name:"Advanced analytics & automation",owner:"CDO",priority:"Medium",risk:"Underinvestment"},
      {name:"Continuous improvement program",owner:"Process Excellence",priority:"Medium",risk:"Complacency"},
      {name:"Offshore/nearshore optimization",owner:"GBS Lead",priority:"Low",risk:"Communication gaps"},
    ]},
  ]},
  { name: "ERP Transformation", desc: "Major ERP migration (SAP S/4HANA, Oracle Cloud) with org change management.", industry: "Manufacturing", waves: [
    { wave: "Wave 1", time: "Month 1-6", initiatives: [
      {name:"Blueprint & design workshops",owner:"Program Director",priority:"High",risk:"Requirements creep"},
      {name:"Data migration strategy",owner:"Data Lead",priority:"High",risk:"Data quality"},
      {name:"Organizational readiness assessment",owner:"Change Lead",priority:"High",risk:"Underestimated impact"},
    ]},
    { wave: "Wave 2", time: "Month 7-14", initiatives: [
      {name:"Build, configure & test",owner:"Tech Lead",priority:"High",risk:"Timeline slippage"},
      {name:"Training curriculum development",owner:"L&D",priority:"High",risk:"Content lag"},
      {name:"Process harmonization",owner:"Process Lead",priority:"Medium",risk:"Local resistance"},
    ]},
    { wave: "Wave 3", time: "Month 15-20", initiatives: [
      {name:"Go-live & hypercare",owner:"Program Director",priority:"High",risk:"Business disruption"},
      {name:"Post-go-live optimization",owner:"CoE Lead",priority:"Medium",risk:"Knowledge retention"},
    ]},
  ]},
  { name: "RIF / Workforce Reduction", desc: "Sensitive headcount reduction program with compliance, communication, and support.", industry: "General", waves: [
    { wave: "Wave 1", time: "Week 1-2", initiatives: [
      {name:"Legal & compliance review",owner:"General Counsel",priority:"High",risk:"Legal exposure"},
      {name:"Impacted population identification",owner:"CHRO",priority:"High",risk:"Selection criteria disputes"},
      {name:"Leadership alignment & briefing",owner:"CEO",priority:"High",risk:"Message inconsistency"},
    ]},
    { wave: "Wave 2", time: "Week 3-4", initiatives: [
      {name:"Manager notification training",owner:"CHRO",priority:"High",risk:"Emotional escalation"},
      {name:"Employee notifications",owner:"Managers",priority:"High",risk:"Information leaks"},
      {name:"Outplacement & support activation",owner:"HR",priority:"High",risk:"Inadequate support"},
    ]},
    { wave: "Wave 3", time: "Month 2-6", initiatives: [
      {name:"Remaining workforce engagement",owner:"CHRO",priority:"High",risk:"Survivor syndrome"},
      {name:"Knowledge transfer completion",owner:"Function Leads",priority:"Medium",risk:"Institutional knowledge loss"},
      {name:"Org redesign & role consolidation",owner:"OD Lead",priority:"Medium",risk:"Overload on remaining staff"},
    ]},
  ]},
  { name: "Digital Health Transformation", desc: "Hospital system digitization — EHR optimization, telehealth, AI clinical decision support.", industry: "Healthcare", waves: [
    { wave: "Wave 1", time: "Month 1-4", initiatives: [
      {name:"Clinical workflow assessment",owner:"CMIO",priority:"High",risk:"Clinician pushback"},
      {name:"EHR optimization sprint",owner:"Health IT",priority:"High",risk:"Vendor dependency"},
      {name:"Telehealth infrastructure",owner:"CIO",priority:"High",risk:"Regulatory compliance"},
    ]},
    { wave: "Wave 2", time: "Month 5-10", initiatives: [
      {name:"AI clinical decision support pilot",owner:"CMO",priority:"Medium",risk:"Patient safety validation"},
      {name:"Revenue cycle automation",owner:"CFO",priority:"High",risk:"Billing accuracy"},
      {name:"Patient portal enhancement",owner:"Patient Experience",priority:"Medium",risk:"Digital divide"},
    ]},
    { wave: "Wave 3", time: "Month 11-18", initiatives: [
      {name:"Predictive analytics deployment",owner:"CMIO",priority:"Medium",risk:"Data integration"},
      {name:"Population health management",owner:"CMO",priority:"Low",risk:"Interoperability"},
    ]},
  ]},
];

/* ─── Career Framework Dictionary — standardized career architectures by industry ─── */

export function WorkDesignLab({
  model, f, job, jobs, onBack, jobStates, setJobState, onSelectJob }: {
  model: string; f: Filters; job: string; jobs: string[]; onBack: () => void;
  jobStates: Record<string, JobDesignState>;
  setJobState: (job: string, state: Partial<JobDesignState>) => void;
  onSelectJob: (job: string) => void;
}) {
  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  const [wdTab, setWdTab] = useState("ctx");
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [viewMode, setViewMode] = useState<"queue" | "classic">("queue");
  const [selectedWDJob, setSelectedWDJob] = useState<{ id: string; title: string } | null>(null);
  // Reset to Context tab when job changes
  useEffect(() => { if (job) setWdTab("ctx"); }, [job]);
  const js = jobStates[job] || { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false };
  const pb = usePathBanner(model, "design");

  const [ctx, ctxLoading] = useApiData(() => job ? api.getJobContext(model, job, f) : Promise.resolve(null), [model, job, f.func, f.jf, f.sf, f.cl]);
  const [decon, deconLoading] = useApiData(() => job ? api.getDeconstruction(model, job, f) : Promise.resolve(null), [model, job, f.func, f.jf, f.sf, f.cl]);
  const [orgDiag] = useApiData(() => job ? api.getOrgDiagnostics(model, f) : Promise.resolve(null), [model, job, f.func, f.jf, f.sf, f.cl]);

  // Initialize decon rows from API only if not already initialized for this job
  useEffect(() => {
    if (!job || js.initialized) return;
    const tasks = ((decon as Record<string, unknown> | null)?.tasks ?? []) as Record<string, unknown>[];
    if (!tasks.length) return;
    setJobState(job, {
      initialized: true,
      deconRows: tasks.map((row, i) => ({
        ...row, "Task ID": row["Task ID"] || `T${i + 1}`, "Task Name": row["Task Name"] || "",
        Workstream: row.Workstream || "", "AI Impact": row["AI Impact"] || "Low",
        "Est Hours/Week": Math.round(Number(row["Est Hours/Week"] || 0)),
        "Current Time Spent %": Math.round(Number(row["Current Time Spent %"] || 0)),
        "Time Saved %": Math.round(Number(row["Time Saved %"] || 0)),
        "Task Type": row["Task Type"] || "Variable", Interaction: row.Interaction || "Interactive",
        Logic: row.Logic || "Probabilistic", "Primary Skill": row["Primary Skill"] || "", "Secondary Skill": row["Secondary Skill"] || "",
      })),
    });
  }, [job, decon, js.initialized, setJobState]);

  // Build redeployment rows when decon is submitted
  useEffect(() => {
    if (!js.deconSubmitted) return;
    if (js.redeployRows.length > 0) return; // already built
    const rows = js.deconRows.map((row) => {
      const current = Math.round(Number(row["Current Time Spent %"] || 0));
      const impact = String(row["AI Impact"] || "Low");
      // AI-estimated time savings based on task characteristics
      const aiImpactScore = impact === "High" ? 0.6 : impact === "Moderate" ? 0.3 : 0.1;
      const typeBonus = String(row["Task Type"]) === "Repetitive" ? 0.15 : 0;
      const interBonus = String(row.Interaction) === "Independent" ? 0.1 : 0;
      const logicBonus = String(row.Logic) === "Deterministic" ? 0.1 : String(row.Logic) === "Probabilistic" ? 0.05 : 0;
      const saved = Math.round(current * Math.min(aiImpactScore + typeBonus + interBonus + logicBonus, 0.85));
      const logic = String(row.Logic || "");
      const interaction = String(row.Interaction || "");
      let decision = "Retain";
      if (impact === "High" && logic === "Deterministic" && interaction === "Independent") decision = "Automate";
      else if (saved >= 8) decision = "Redesign";
      else if (impact === "High" || impact === "Moderate") decision = "Augment";
      const techMap: Record<string, string> = { Automate: "RPA", Augment: "GenAI", Redesign: "Agentic AI", Retain: "Human-led", Transfer: "Shared Service" };
      const destMap: Record<string, string> = { Automate: "AI / automation layer", Augment: "Higher-value work in role", Redesign: "New workflow / operating rhythm", Retain: "Continue in role", Transfer: "Another team or shared service" };
      return { ...row, Decision: decision, Technology: techMap[decision] || "GenAI", "New Time %": Math.max(current - saved, 0), "Redeployment Destination": destMap[decision] || "Future-state allocation", "Future Skill": row["Primary Skill"] || "", Notes: "" };
    });
    setJobState(job, { redeployRows: rows });
  }, [js.deconSubmitted, js.deconRows, js.redeployRows.length, job, setJobState]);

  // Compute reconstruction when redeployment submitted
  useEffect(() => {
    if (!js.redeploySubmitted || !(js.redeployRows || []).length || js.recon) return;
    const tasks = (js.redeployRows || []).map((row) => ({ ...row, "Time Saved %": Math.max(Number(row["Current Time Spent %"] || 0) - Number(row["New Time %"] || 0), 0) }));
    api.computeReconstruction(tasks, js.scenario).then((resp) => {
      const actionMix = (resp?.action_mix ?? {}) as Record<string, number>;
      const reconstruction = ((resp?.reconstruction ?? []) as Record<string, unknown>[]);
      const totalCurrent = reconstruction.reduce((s, r) => s + Number(r["Current Hrs"] || 0), 0);
      const totalFuture = reconstruction.reduce((s, r) => s + Number(r["Future Hrs"] || 0), 0);
      setJobState(job, { recon: { ...resp, action_counts: actionMix, detail: resp?.redeployment ?? [], total_current_hrs: Number(totalCurrent.toFixed(1)), total_future_hrs: Number(totalFuture.toFixed(1)) } });
    });
  }, [js.redeploySubmitted, js.redeployRows, js.recon, js.scenario, job, setJobState]);

  // Validation
  const deconTotal = js.deconRows.reduce((s, row) => s + Math.round(Number(row["Current Time Spent %"] || 0)), 0);
  const totalEstHours = js.deconRows.reduce((s, row) => s + Math.round(Number(row["Est Hours/Week"] || 0)), 0);
  const blankRequired = js.deconRows.reduce((sum, row) => { const req = ["Task ID", "Task Name", "Workstream", "AI Impact", "Est Hours/Week", "Current Time Spent %", "Task Type", "Interaction", "Logic"]; return sum + req.filter((key) => { const v = row[key]; return v === undefined || v === null || String(v).trim() === "" || (typeof v === "number" && v === 0 && ["Est Hours/Week", "Current Time Spent %"].includes(key)); }).length; }, 0);
  const zeroTimeRows = js.deconRows.filter((r) => Math.round(Number(r["Current Time Spent %"] || 0)) <= 0).length;
  const deconValid = deconTotal === 100 && blankRequired === 0 && zeroTimeRows === 0 && js.deconRows.length > 0;
  const redeployTotal = Math.round(js.redeployRows.reduce((s, row) => s + Number(row["New Time %"] || 0), 0));
  const redeployValid = js.redeployRows.length > 0 && redeployTotal <= 100;

  const updateDeconCell = (idx: number, key: string, value: string) => {
    const isNum = ["Est Hours/Week", "Current Time Spent %", "Time Saved %"].includes(key);
    const newRows = js.deconRows.map((row, i) => {
      if (i !== idx) return row;
      const next: Record<string, unknown> = { ...row };
      if (isNum) { const parsed = value === "" ? 0 : Math.round(Math.abs(parseInt(value, 10) || 0)); next[key] = parsed; if (key === "Time Saved %") { next[key] = Math.min(parsed, Math.round(Number(next["Current Time Spent %"] || 0))); } } else { next[key] = value; }
      return next;
    });
    setJobState(job, { deconRows: newRows, deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] });
  };

  const updateRedeployCell = (idx: number, key: string, value: string) => {
    const newRows = js.redeployRows.map((row, i) => {
      if (i !== idx) return row;
      const next: Record<string, unknown> = { ...row, [key]: key === "New Time %" ? Math.round(Math.abs(parseInt(value, 10) || 0)) : value };
      if (key === "Decision") { const techMap: Record<string, string> = { Automate: "RPA", Augment: "GenAI", Redesign: "Agentic AI", Retain: "Human-led", Transfer: "Shared Service" }; next.Technology = techMap[value] || next.Technology; }
      return next;
    });
    setJobState(job, { redeployRows: newRows, redeploySubmitted: false, finalized: false, recon: null });
  };

  // ── Task Dictionary panel state ──
  const [showTaskDict, setShowTaskDict] = useState(false);
  const dictEntries = findTaskDictEntries(job || "");

  // ── AI Task Auto-Generation ──
  const [aiGenerating, setAiGenerating] = useState(false);
  const generateTasks = async () => {
    if (!job || aiGenerating) return;
    setAiGenerating(true);
    try {
      const jobMeta = `${String(meta.Function || f.func || "")} ${String(meta["Career Level"] || "")} ${String(meta["Career Track"] || "")}`.trim();
      const prompt = `You are an expert workforce analyst. Generate a detailed task breakdown for the role "${job}"${jobMeta ? ` (${jobMeta})` : ""}.

Return ONLY a JSON array of 8-12 tasks. Each task object must have exactly these fields:
- "Task ID": string (e.g., "T1", "T2")
- "Task Name": string (specific, actionable task name)
- "Workstream": string (group name like "Reporting", "Analysis", "Operations", "Communication")
- "AI Impact": string ("High", "Moderate", or "Low")
- "Est Hours/Week": number (1-10, realistic hours per week)
- "Current Time Spent %": number (percentage, all tasks MUST sum to exactly 100)
- "Time Saved %": number (set to 0, this is calculated later in redeployment)
- "Task Type": string ("Repetitive" or "Variable")
- "Interaction": string ("Independent", "Interactive", or "Collaborative")
- "Logic": string ("Deterministic", "Probabilistic", or "Judgment-heavy")
- "Primary Skill": string (main skill required)
- "Secondary Skill": string (supporting skill)

Rules:
- "Current Time Spent %" across ALL tasks must sum to EXACTLY 100
- Tasks should be realistic for this specific role
- Include a mix of High, Moderate, and Low AI impact tasks
- Set Time Saved % to 0 for all tasks (savings are computed in the redeployment phase)
- Repetitive + Independent + Deterministic tasks = highest AI potential
- Return ONLY the JSON array, no markdown, no explanation, no backticks`;

      const text = await callAI("You are an expert workforce analyst. Return ONLY valid JSON, no markdown, no backticks, no explanation.", prompt);
      // Parse JSON — handle potential markdown wrapping
      const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const tasks = JSON.parse(cleanText) as Record<string, unknown>[];

      if (Array.isArray(tasks) && tasks.length > 0) {
        // Validate and normalize
        const normalized = tasks.map((t, i) => ({
          "Task ID": String(t["Task ID"] || `T${i + 1}`),
          "Task Name": String(t["Task Name"] || ""),
          Workstream: String(t["Workstream"] || ""),
          "AI Impact": ["High", "Moderate", "Low"].includes(String(t["AI Impact"])) ? String(t["AI Impact"]) : "Low",
          "Est Hours/Week": Math.round(Math.abs(Number(t["Est Hours/Week"]) || 2)),
          "Current Time Spent %": Math.round(Math.abs(Number(t["Current Time Spent %"]) || 0)),
          "Time Saved %": Math.min(Math.round(Math.abs(Number(t["Time Saved %"]) || 0)), Math.round(Math.abs(Number(t["Current Time Spent %"]) || 0))),
          "Task Type": ["Repetitive", "Variable"].includes(String(t["Task Type"])) ? String(t["Task Type"]) : "Variable",
          Interaction: ["Independent", "Interactive", "Collaborative"].includes(String(t["Interaction"])) ? String(t["Interaction"]) : "Interactive",
          Logic: ["Deterministic", "Probabilistic", "Judgment-heavy"].includes(String(t["Logic"])) ? String(t["Logic"]) : "Probabilistic",
          "Primary Skill": String(t["Primary Skill"] || ""),
          "Secondary Skill": String(t["Secondary Skill"] || ""),
        }));

        // Fix time allocation to sum to 100
        const total = normalized.reduce((s, t) => s + (t["Current Time Spent %"] as number), 0);
        if (total !== 100 && total > 0) {
          const factor = 100 / total;
          let running = 0;
          normalized.forEach((t, i) => {
            if (i === normalized.length - 1) {
              (t as Record<string, unknown>)["Current Time Spent %"] = 100 - running;
            } else {
              const adj = Math.round((t["Current Time Spent %"] as number) * factor);
              (t as Record<string, unknown>)["Current Time Spent %"] = adj;
              running += adj;
            }
          });
        }

        setJobState(job, {
          deconRows: normalized,
          initialized: true,
          deconSubmitted: false,
          redeploySubmitted: false,
          finalized: false,
          recon: null,
          redeployRows: []
        });
      }
    } catch (err) {
      console.error("AI task generation failed:", err);
    }
    setAiGenerating(false);
  };

  const ctxTyped = ctx as unknown as JobContextResponse | null;
  const k = ctxTyped?.kpis ?? { hours_week: 0, tasks: 0, workstreams: 0, released_hrs: 0, released_pct: 0, future_hrs: 0, evolution: "" };
  const meta = (ctxTyped?.meta ?? {}) as Record<string, string>;
  const ws = ctxTyped?.ws_breakdown ?? [];
  const ds = ctxTyped?.decon_summary ?? [];
  const aid = (ctxTyped?.ai_distribution ?? []) as { name: string; value: number }[];
  const aip = (((decon as Record<string, unknown> | null)?.ai_priority ?? []) as Record<string, unknown>[]);

  // Editable cell components
  const EditableCell = ({ value, onChange, type = "text", suffix }: { value: unknown; onChange: (v: string) => void; type?: string; suffix?: string }) => {
    const [local, setLocal] = useState(String(value ?? "")); const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { setLocal(String(value ?? "")); }, [value]);
    return <div className="relative"><input ref={inputRef} value={local} type={type === "number" ? "number" : "text"} step={type === "number" ? "1" : undefined} min={type === "number" ? "0" : undefined} onChange={(e) => { setLocal(e.target.value); if (type !== "number") onChange(e.target.value); }} onBlur={() => { if (type === "number") { const v = Math.round(Math.abs(parseInt(local, 10) || 0)); setLocal(String(v)); onChange(String(v)); } else onChange(local); }} onKeyDown={(e) => { if (e.key === "Enter" && type === "number") { const v = Math.round(Math.abs(parseInt(local, 10) || 0)); setLocal(String(v)); onChange(String(v)); (e.target as HTMLInputElement).blur(); } }} className="w-full border border-[var(--border)] rounded-md px-2 py-1 text-[15px] bg-[var(--surface-2)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]" />{suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[15px] text-[var(--text-muted)] pointer-events-none">{suffix}</span>}</div>;
  };
  const SelectCell = ({ value, onChange, options }: { value: unknown; onChange: (v: string) => void; options: string[] }) => <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="w-full border border-[var(--border)] rounded-md px-2 py-1 text-[15px] bg-[var(--surface-2)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;

  // Completed / in-progress / not-started counts
  const completedJobs = jobs.filter(j => jobStates[j]?.finalized);
  const inProgressJobs = jobs.filter(j => jobStates[j]?.deconSubmitted && !jobStates[j]?.finalized);
  const notStartedJobs = jobs.filter(j => !jobStates[j]?.deconSubmitted && !jobStates[j]?.finalized);

  // ── Filter chip state ──
  const [statusFilter, setStatusFilter] = useState<"all" | "not-analyzed" | "in-progress" | "complete">("all");

  // ── Step definitions for the guided workflow ──
  const steps = [
    { id: "ctx", label: "Context", done: js.initialized && js.deconRows.length > 0 },
    { id: "decon", label: "Deconstruction", done: js.deconSubmitted },
    { id: "redeploy", label: "Redeployment", done: js.redeploySubmitted },
    { id: "recon", label: "Reconstruction", done: !!js.recon },
    { id: "impact", label: "Impact Summary", done: js.finalized },
    { id: "orglink", label: "Org Link", done: false },
    { id: "handoff", label: "Handoff", done: false },
  ];
  const [jobSearch, setJobSearch] = useState("");

  // Apply filters
  const statusFilteredJobs = (() => {
    let filtered = jobs;
    if (statusFilter === "not-analyzed") filtered = filtered.filter(j => !jobStates[j]?.deconSubmitted && !jobStates[j]?.finalized);
    else if (statusFilter === "in-progress") filtered = filtered.filter(j => jobStates[j]?.deconSubmitted && !jobStates[j]?.finalized);
    else if (statusFilter === "complete") filtered = filtered.filter(j => jobStates[j]?.finalized);
    return filtered;
  })();
  const filteredJobs = jobSearch ? statusFilteredJobs.filter(j => j.toLowerCase().includes(jobSearch.toLowerCase())) : statusFilteredJobs;

  // Top 5 jobs sorted alphabetically (start here strip)
  const topJobs = [...jobs].sort((a, b) => a.localeCompare(b)).slice(0, 5);

  // ── QUEUE MODE: canvas view (WD job selected from queue) ──
  if (!job && viewMode === "queue" && selectedWDJob) return (
    <WorkflowCanvas
      jobId={selectedWDJob.id}
      jobTitle={selectedWDJob.title}
      projectId={model || "Demo_Model"}
      model={model}
      onBackToQueue={() => setSelectedWDJob(null)}
    />
  );

  // ── QUEUE MODE: queue landing view ──
  if (!job && viewMode === "queue") return <div style={{ minHeight: "calc(100vh - 48px)" }}>
    <PageHeader icon={<PenLine size={20} />} title="Work Design Lab" subtitle="Mercer Work Design methodology — queue-based redesign workflow" onBack={onBack} moduleId="design" />
    {pb.bannerPaths.length > 0 && <PathStepBanner paths={pb.bannerPaths} onMarkComplete={pb.handleMarkComplete} onPause={pb.handlePause} onOpenPathDrawer={(srcId) => onBack()} />}
    {pb.completionWarning && <SoftCompletionWarning criterion={pb.completionWarning.criterion} onConfirm={pb.confirmComplete} onCancel={pb.cancelComplete} />}
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button onClick={() => setViewMode("classic")} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Switch to Classic View</button>
      </div>
    </div>
    <WorkDesignQueue projectId={model || "Demo_Model"} model={model} onJobSelect={(wdJob) => setSelectedWDJob({ id: wdJob.id, title: wdJob.title })} />
  </div>;

  // ── STEP 0: Job Selector — classic view (no job selected) ──
  if (!job) return <div style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(244,168,58,0.04) 0%, transparent 60%)", minHeight: "calc(100vh - 48px)" }}>
    <PageHeader icon={<PenLine size={20} />} title="Work Design Lab" subtitle="Mercer Work Design methodology — select a job to begin analysis" onBack={onBack} moduleId="design" />
    {pb.bannerPaths.length > 0 && <PathStepBanner paths={pb.bannerPaths} onMarkComplete={pb.handleMarkComplete} onPause={pb.handlePause} onOpenPathDrawer={(srcId) => onBack()} />}
    {pb.completionWarning && <SoftCompletionWarning criterion={pb.completionWarning.criterion} onConfirm={pb.confirmComplete} onCancel={pb.cancelComplete} />}
    <div style={{ maxWidth: 768, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button onClick={() => setViewMode("queue")} style={{ fontSize: 11, color: "var(--amber)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Switch to Queue View</button>
      </div>
    </div>

    <div className="max-w-3xl mx-auto px-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4"><PenLine size={32} className="text-[var(--accent-primary)]" /></div>
        <h2 className="text-[24px] font-bold font-heading text-[var(--text-primary)] mb-2">Select a Job to Analyze</h2>
        <p className="text-[14px] text-[var(--text-secondary)]">Pick a role from your organization to walk through the structured work redesign process.</p>
      </div>

      {/* Start here — high impact strip */}
      {topJobs.length > 0 && <div className="mb-6">
        <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2"><TrendingUp size={14} /> Start here — high impact</div>
        <div className="flex gap-2 flex-wrap">
          {topJobs.map(j => <button key={j} onClick={() => onSelectJob(j)} className="px-3 py-2 rounded-lg border border-[var(--accent-primary)]/20 bg-[rgba(244,168,58,0.06)] text-[15px] font-semibold text-[var(--accent-primary)] transition-all hover:border-[var(--accent-primary)]/40 hover:translate-y-[-1px]">{j}</button>)}
        </div>
      </div>}

      {/* Search + Filter chips */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Search jobs..." className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-3 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/40 placeholder:text-[var(--text-muted)]" />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "not-analyzed", "in-progress", "complete"] as const).map(s => {
          const labels: Record<string, string> = { all: "All", "not-analyzed": "Not analyzed", "in-progress": "In progress", complete: "Complete" };
          const isActive = statusFilter === s;
          return <button key={s} onClick={() => setStatusFilter(s)} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold border transition-all" style={{ background: isActive ? "rgba(244,168,58,0.1)" : "var(--surface-2)", borderColor: isActive ? "var(--accent-primary)" : "var(--border)", color: isActive ? "var(--accent-primary)" : "var(--text-secondary)" }}><Filter size={12} className="inline mr-1" />{labels[s]}</button>;
        })}
      </div>

      {/* Recently Analyzed */}
      {(completedJobs.length > 0 || inProgressJobs.length > 0) && <div className="mb-6">
        <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recently Analyzed</div>
        <div className="flex gap-2 flex-wrap">
          {[...inProgressJobs, ...completedJobs].slice(0, 6).map(j => {
            const st = jobStates[j]; const done = st?.finalized;
            return <button key={j} onClick={() => onSelectJob(j)} className="px-3 py-2 rounded-lg border text-[15px] font-semibold transition-all hover:border-[var(--accent-primary)]/40 flex items-center gap-1" style={{ background: done ? "rgba(139,168,122,0.06)" : "rgba(244,168,58,0.06)", borderColor: done ? "rgba(139,168,122,0.2)" : "rgba(244,168,58,0.2)", color: done ? "var(--success)" : "var(--accent-primary)" }}>
              {done ? <Check size={14} /> : <span>&#9684;</span>}{j}
            </button>;
          })}
        </div>
      </div>}

      {/* Job Grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredJobs.map(j => {
          const st = jobStates[j];
          const status = st?.finalized ? "complete" : st?.deconSubmitted ? "in_progress" : "not_started";
          const dotColor = status === "complete" ? "var(--success)" : status === "in_progress" ? "var(--accent-primary)" : "var(--text-muted)";
          return <button key={j} onClick={() => onSelectJob(j)} className="text-left px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] transition-all hover:border-[var(--accent-primary)]/40 hover:translate-y-[-1px]">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} /><span className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{j}</span></div>
          </button>;
        })}
      </div>
      {!jobs.length && <EmptyState icon={<PenLine size={24} />} headline="No jobs to analyze" explanation="Upload a job catalog or load the Chesapeake Energy demo to explore the module with pre-scored roles." primaryAction={{ label: "Load demo dataset", onClick: onBack }} />}

      {/* Progress */}
      {jobs.length > 0 && <div className="mt-6 text-center text-[15px] text-[var(--text-muted)]">{completedJobs.length}/{jobs.length} jobs finalized · {inProgressJobs.length} in progress</div>}
    </div>
  </div>;

  // ── Main Workspace (job selected) ──
  return <div className="flex gap-0" style={{ minHeight: "calc(100vh - 48px)" }}>
    {/* Left: Step Navigator */}
    <div className="w-48 shrink-0 bg-[var(--surface-1)] border-r border-[var(--border)] py-5 px-3 flex flex-col">
      <button onClick={() => onSelectJob("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-4 transition-colors flex items-center gap-1"><ChevronLeft size={14} /> All Jobs</button>
      <div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-1 truncate">{job}</div>
      <div className="text-[14px] text-[var(--text-muted)] mb-4">{meta.Function || "\u2014"} · {meta["Career Level"] || "\u2014"}</div>
      <div className="space-y-1 flex-1">
        {steps.map((s, si) => {
          const isActive = wdTab === s.id;
          const canGo = si === 0 || steps[si - 1].done;
          return <button key={s.id} onClick={() => canGo && setWdTab(s.id)} className="w-full text-left px-3 py-2 rounded-lg text-[15px] transition-all flex items-center gap-2" style={{ background: isActive ? "rgba(244,168,58,0.1)" : "transparent", color: isActive ? "var(--accent-primary)" : canGo ? "var(--text-secondary)" : "var(--text-muted)", cursor: canGo ? "pointer" : "not-allowed", opacity: canGo ? 1 : 0.4 }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0" style={{ background: s.done ? "var(--success)" : isActive ? "var(--accent-primary)" : "var(--surface-2)", color: s.done || isActive ? "#fff" : "var(--text-muted)", border: `1.5px solid ${s.done ? "var(--success)" : isActive ? "var(--accent-primary)" : "var(--border)"}` }}>{s.done ? <Check size={12} /> : si + 1}</span>
            <span className="font-semibold truncate">{s.label}</span>
          </button>;
        })}
      </div>
      <div className="mt-auto pt-3 border-t border-[var(--border)]">
        <div className="text-[14px] text-[var(--text-muted)] mb-1">{steps.filter(s => s.done).length}/{steps.length} steps complete</div>
        <div className="h-1 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--success)] transition-all" style={{ width: `${(steps.filter(s => s.done).length / steps.length) * 100}%` }} /></div>
      </div>
    </div>

    {/* Right: Content */}
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-5">
        {/* Active job confirmation bar */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-5 py-3 mb-4 flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-[14px] text-[var(--accent-primary)]">{job}</span>
          <span className="text-[15px] text-[var(--text-secondary)]">{js.deconRows.length} tasks · {String(k.hours_week ?? 0)}h/wk · Scenario: {js.scenario}</span>
          <div className="ml-auto flex items-center gap-2"><Badge color={js.deconSubmitted ? "green" : "gray"}>Decon {js.deconSubmitted ? <Check size={12} className="inline" /> : <span className="inline-block w-2 h-2 rounded-full border border-current" />}</Badge><Badge color={js.redeploySubmitted ? "green" : "gray"}>Redeploy {js.redeploySubmitted ? <Check size={12} className="inline" /> : <span className="inline-block w-2 h-2 rounded-full border border-current" />}</Badge><Badge color={js.finalized ? "green" : "gray"}>Final {js.finalized ? <Check size={12} className="inline" /> : <span className="inline-block w-2 h-2 rounded-full border border-current" />}</Badge></div>
        </div>

      {wdTab === "ctx" && <div>
        {js.deconRows.length === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
          <div className="text-[15px] text-[var(--text-secondary)]">Ready to break down <strong className="text-[var(--text-primary)]">{job}</strong> into tasks?</div>
          <div className="flex gap-2">
            <AiJobSuggestButton title={job} industry={f.func !== "All" ? f.func : "technology"} onAccept={(d) => {
              // Convert AI suggestions into decon rows and populate the task table
              const rows = d.tasks.map((t, i) => ({
                "Task ID": `T${i + 1}`,
                "Task Name": t.name,
                "Workstream": "Core",
                "AI Impact": t.ai_impact || "Moderate",
                "Est Hours/Week": t.hours_per_week || 4,
                "Current Time Spent %": Math.round(100 / Math.max(d.tasks.length, 1)),
                "Time Saved %": 0,
                "Task Type": t.task_type || "Variable",
                "Interaction": t.interaction || "Interactive",
                "Logic": t.logic || "Probabilistic",
                "Primary Skill": d.skills[0]?.skills[0] || "",
                "Secondary Skill": d.skills[1]?.skills[0] || "",
              }));
              // Normalize time to 100%
              const sum = rows.reduce((s, r) => s + (r["Current Time Spent %"] as number), 0);
              if (sum !== 100 && rows.length > 0) {
                const factor = 100 / sum;
                let running = 0;
                rows.forEach((r, i) => {
                  if (i < rows.length - 1) { r["Current Time Spent %"] = Math.round((r["Current Time Spent %"] as number) * factor); running += r["Current Time Spent %"] as number; }
                  else { r["Current Time Spent %"] = 100 - running; }
                });
              }
              setJobState(job, { deconRows: rows, initialized: true, deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] });
              setWdTab("decon");
              showToast(`Pre-populated ${rows.length} tasks for ${job} — review and edit below`);
            }} />
            <button onClick={() => { generateTasks(); setWdTab("decon"); }} disabled={aiGenerating} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-white flex items-center gap-1" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>{aiGenerating ? "Generating..." : <><Sparkle size={14} /> Quick Generate</>}</button>
            <button onClick={() => setWdTab("decon")} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)]">Manual Entry <ChevronRight size={14} className="inline" /></button>
          </div>
        </div>}
        <div className="grid grid-cols-6 gap-3 mb-5"><KpiCard label="Hours/Week" value={Number(k.hours_week ?? 0)} accent /><KpiCard label="Tasks" value={Number(k.tasks ?? 0)} /><KpiCard label="Workstreams" value={Number(k.workstreams ?? 0)} /><KpiCard label="Released" value={`${Number(k.released_hrs ?? 0)}h`} delta={`${Number(k.released_pct ?? 0)}%`} /><KpiCard label="Future Hrs" value={Number(k.future_hrs ?? 0)} /><KpiCard label="Evolution" value={String(k.evolution ?? "\u2014")} /></div>
        <div className="grid grid-cols-12 gap-4"><div className="col-span-5"><Card title="Role Summary"><div className="flex flex-wrap gap-1.5 mb-3">{Object.entries(meta).map(([x, v]) => <Badge key={x} color="indigo">{x}: {String(v)}</Badge>)}</div><p className="text-[15px] text-[var(--text-secondary)]">{String(ctx?.description ?? "No description.")}</p></Card></div><div className="col-span-4"><Card title="Time by Workstream"><BarViz data={ws} labelKey="Workstream" valueKey="Current Time Spent %" /></Card></div><div className="col-span-3"><Card title="Role attributes"><DataTable data={ds} cols={["Metric", "Value"]} /></Card></div></div>
      </div>}

      {wdTab === "decon" && <div>
        {/* ExpertPanel for Deconstruction */}
        <ExpertPanel title="Mercer Work Design Methodology" source="Mercer" variant="info">
          Mercer Work Design decomposes each role into 15-30 discrete tasks. Each task is scored on AI impact, categorized, and assigned a disposition in the Reconstruction stage.
        </ExpertPanel>
        <div className="mb-4" />
        {/* AI generation prompt when no tasks */}
        {js.deconRows.length === 0 && !aiGenerating && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.08)] to-[rgba(192,112,48,0.04)] border border-[rgba(224,144,64,0.2)] rounded-xl p-6 mb-4 text-center">
          <div className="flex justify-center mb-2"><Sparkle size={24} className="text-[var(--accent-primary)]" /></div>
          <h3 className="text-[15px] font-bold font-heading text-[var(--text-primary)] mb-1">No tasks yet for {job}</h3>
          <p className="text-[15px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">Let AI generate a detailed task breakdown, or add tasks manually below.</p>
          <button onClick={generateTasks} className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90 inline-flex items-center gap-2" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", boxShadow: "var(--shadow-2)" }}><Sparkle size={14} /> Auto-Generate Task Breakdown</button>
        </div>}
        {aiGenerating && <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 mb-4 text-center animate-pulse">
          <div className="flex justify-center mb-2"><Sparkle size={24} className="text-[var(--accent-primary)]" /></div>
          <h3 className="text-[15px] font-bold font-heading text-[var(--text-primary)] mb-1">AI is analyzing the {job} role...</h3>
          <p className="text-[15px] text-[var(--text-secondary)]">Generating task breakdown with AI impact scores, time estimates, and skill requirements</p>
        </div>}
        {/* Hours Budget Control */}
        {(() => {
          const allocatedHrs = Math.round(deconTotal * weeklyHours / 100 * 10) / 10;
          const remainingHrs = Math.round((weeklyHours - allocatedHrs) * 10) / 10;
          const humanHrs = js.deconRows.filter(r => String(r["AI Impact"]) === "Low").reduce((s, r) => s + Number(r["Current Time Spent %"] || 0), 0) * weeklyHours / 100;
          const augHrs = js.deconRows.filter(r => String(r["AI Impact"]) === "Moderate").reduce((s, r) => s + Number(r["Current Time Spent %"] || 0), 0) * weeklyHours / 100;
          const autoHrs = js.deconRows.filter(r => String(r["AI Impact"]) === "High").reduce((s, r) => s + Number(r["Current Time Spent %"] || 0), 0) * weeklyHours / 100;
          return <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-5 py-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold">Hours Budget:</span>
                <input type="number" value={weeklyHours} onChange={e => setWeeklyHours(Math.max(1, Number(e.target.value) || 40))} className="w-16 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-[15px] text-[var(--text-primary)] text-center outline-none" /> <span className="text-[14px] text-[var(--text-muted)]">hrs/wk</span>
              </div>
              <div className="flex items-center gap-4 text-[15px]">
                <span>Allocated: <strong>{allocatedHrs}h</strong></span>
                <span style={{ color: remainingHrs >= 0 ? "var(--success)" : "var(--risk)" }}>Remaining: <strong>{remainingHrs}h</strong></span>
                <span className="font-bold" style={{ color: deconTotal === 100 ? "var(--success)" : deconTotal > 100 ? "var(--risk)" : "var(--accent-primary)" }}>{deconTotal}%</span>
              </div>
            </div>
            {/* Segmented progress bar */}
            <div className="h-3 bg-[var(--surface-2)] rounded-full overflow-hidden flex">
              {humanHrs > 0 && <div className="h-full" style={{ width: `${(humanHrs / weeklyHours) * 100}%`, background: "var(--success)" }} />}
              {augHrs > 0 && <div className="h-full" style={{ width: `${(augHrs / weeklyHours) * 100}%`, background: "var(--warning)" }} />}
              {autoHrs > 0 && <div className="h-full" style={{ width: `${(autoHrs / weeklyHours) * 100}%`, background: "var(--risk)" }} />}
            </div>
            <div className="flex gap-4 mt-2 text-[14px] text-[var(--text-muted)]">
              <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--success)] mr-1" />Human: {humanHrs.toFixed(1)}h</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--warning)] mr-1" />AI-Augmented: {augHrs.toFixed(1)}h</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-[var(--risk)] mr-1" />Automated: {autoHrs.toFixed(1)}h</span>
            </div>
            {deconTotal !== 100 && deconTotal > 0 && <div className="mt-2 text-[14px] font-semibold" style={{ color: "var(--risk)" }}>Total is {deconTotal}% — must equal 100% to proceed</div>}
          </div>;
        })()}
        <div className="grid grid-cols-12 gap-4 mb-5"><div className="col-span-4"><Card title="AI Impact"><DonutViz data={aid} /></Card></div><div className="col-span-4"><Card title="AI Priority"><BarViz data={aip} labelKey="Task Name" valueKey="AI Priority" color="var(--accent-scenario)" /></Card></div><div className="col-span-4"><InsightPanel title="Validation" items={[deconTotal === 100 ? "\u2713 Time = 100%" : `\u2717 Time = ${deconTotal}%`, blankRequired === 0 ? "\u2713 All fields filled" : `\u2717 ${blankRequired} blank`, deconValid ? "\u2713 Ready to submit" : "Pending: Fix issues above"]} icon={<FileText size={16} />} /></div></div>
        <Card title="Task Inventory — Editable">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[15px] text-[var(--text-muted)]">{js.deconRows.length} tasks · {totalEstHours}h/wk</span>
            <div className="flex gap-2">
              <button onClick={generateTasks} disabled={aiGenerating || js.finalized} className={`px-3 py-1.5 rounded-md text-[15px] font-semibold transition-all inline-flex items-center gap-1 ${aiGenerating ? "animate-pulse" : ""}`} style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", color: "#fff", opacity: aiGenerating || js.finalized ? 0.5 : 1 }}><Sparkle size={14} />{aiGenerating ? "Generating..." : "Auto-Generate Tasks"}</button>
              {dictEntries.length > 0 && <button onClick={() => setShowTaskDict(d => !d)} className="px-3 py-1.5 rounded-md text-[15px] font-semibold bg-[rgba(167,139,184,0.1)] border border-[rgba(167,139,184,0.3)] text-[var(--purple)] inline-flex items-center gap-1" style={{ opacity: js.finalized ? 0.5 : 1 }}><BookOpen size={14} /> Dictionary ({dictEntries.length})</button>}
              <button onClick={() => { const maxId = js.deconRows.reduce((m, r) => { const n = parseInt(String(r["Task ID"] || "T0").replace("T", ""), 10); return n > m ? n : m; }, 0); setJobState(job, { deconRows: [...js.deconRows, { "Task ID": `T${String(maxId + 1).padStart(3, "0")}`, "Task Name": "", Workstream: "", "AI Impact": "Low", "Est Hours/Week": 0, "Current Time Spent %": 0, "Time Saved %": 0, "Task Type": "Variable", Interaction: "Interactive", Logic: "Probabilistic", "Primary Skill": "", "Secondary Skill": "" }], deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] }); }} className="px-3 py-1.5 bg-[var(--surface-3)] rounded-md text-[15px] font-semibold text-[var(--text-secondary)] inline-flex items-center gap-1"><Plus size={14} /> Add Task</button>
              <button disabled={!deconValid || js.finalized} onClick={() => { setJobState(job, { deconSubmitted: true, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] }); setWdTab("redeploy"); }} className={`px-3 py-1.5 rounded-md text-[15px] font-semibold ${!deconValid || js.finalized ? "bg-[var(--border)] text-[var(--text-muted)]" : "bg-[var(--accent-primary)] text-white hover:opacity-90"}`}>{js.deconSubmitted ? "Update" : "Submit"} Deconstruction</button>
            </div>
          </div>
          {/* Task Dictionary Panel */}
          {showTaskDict && dictEntries.length > 0 && <div className="mb-4 rounded-xl border border-[rgba(167,139,184,0.3)] bg-[rgba(167,139,184,0.04)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[15px] font-bold text-[var(--purple)] flex items-center gap-2"><BookOpen size={16} /> Task Dictionary — {job}</div>
              <button onClick={() => setShowTaskDict(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X size={16} /></button>
            </div>
            <div className="text-[15px] text-[var(--text-secondary)] mb-3">Pre-built task portfolios for this role. Click an industry variant to load its tasks. This replaces your current task inventory.</div>
            <div className="grid grid-cols-1 gap-2">
              {dictEntries.map((entry, ei) => <div key={ei} className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Badge color="purple">{entry.industry}</Badge><span className="text-[15px] text-[var(--text-muted)]">{entry.tasks.length} tasks</span></div>
                  <button onClick={() => {
                    const newRows = entry.tasks.map((t, i) => ({
                      "Task ID": `T${i + 1}`, "Task Name": t.name, Workstream: t.workstream,
                      "AI Impact": t.impact, "Est Hours/Week": Math.round(40 * t.pct / 100),
                      "Current Time Spent %": t.pct, "Time Saved %": 0,
                      "Task Type": t.type, Interaction: t.interaction, Logic: t.logic,
                      "Primary Skill": t.skill1, "Secondary Skill": t.skill2,
                    }));
                    setJobState(job, { deconRows: newRows, initialized: true, deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] });
                    setShowTaskDict(false);
                    showToast(`Loaded ${entry.tasks.length} tasks from ${entry.industry} dictionary`);
                  }} className="px-3 py-1 rounded-lg text-[15px] font-semibold bg-[var(--purple)]/15 border border-[var(--purple)]/30 text-[var(--purple)] cursor-pointer hover:bg-[var(--purple)]/25 transition-all">Load Tasks</button>
                </div>
                <div className="grid grid-cols-2 gap-1">{entry.tasks.map((t, ti) => <div key={ti} className="flex items-center gap-1.5 text-[14px] text-[var(--text-muted)]">
                  <div className="w-1 h-1 rounded-full" style={{background: t.impact === "High" ? "var(--risk)" : t.impact === "Moderate" ? "var(--warning)" : "var(--success)"}} />
                  <span className="truncate">{t.name}</span>
                  <span className="text-[15px] shrink-0">{t.pct}%</span>
                </div>)}</div>
              </div>)}
            </div>
          </div>}
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-left text-[15px]"><thead><tr className="bg-[var(--surface-2)]">{["ID","Task Name","Time %","Est Hrs","AI Impact","Type","Interaction","Logic","Skill"].map(c => <th key={c} className="px-2 py-2 border-b border-[var(--border)] text-[14px] uppercase text-[var(--text-muted)] whitespace-nowrap font-semibold">{c}</th>)}<th className="w-8" /></tr></thead><tbody>{js.deconRows.map((row, idx) => {
            const timePct = Math.round(Number(row["Current Time Spent %"] || 0));
            const estHrs = Math.round(timePct * weeklyHours / 100 * 10) / 10;
            const impactColor = String(row["AI Impact"]) === "High" ? "var(--risk)" : String(row["AI Impact"]) === "Moderate" ? "var(--warning)" : "var(--success)";
            return <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
              <td className="px-2 py-2 text-[14px] font-data text-[var(--text-muted)] w-16">{String(row["Task ID"] || `T${String(idx + 1).padStart(3, "0")}`)}</td>
              <td className="px-2 py-2 min-w-[180px]"><EditableCell value={row["Task Name"]} onChange={v => updateDeconCell(idx, "Task Name", v)} /></td>
              <td className="px-2 py-2 w-20"><EditableCell type="number" value={row["Current Time Spent %"]} onChange={v => updateDeconCell(idx, "Current Time Spent %", v)} suffix="%" /></td>
              <td className="px-2 py-2 w-16 text-[15px] font-data text-[var(--text-muted)]">{estHrs}h</td>
              <td className="px-2 py-2 w-24"><SelectCell value={row["AI Impact"]} onChange={v => updateDeconCell(idx, "AI Impact", v)} options={["High","Moderate","Low"]} /></td>
              <td className="px-2 py-2 w-24"><SelectCell value={row["Task Type"]} onChange={v => updateDeconCell(idx, "Task Type", v)} options={["Repetitive","Variable"]} /></td>
              <td className="px-2 py-2 w-28"><SelectCell value={row.Interaction} onChange={v => updateDeconCell(idx, "Interaction", v)} options={["Independent","Interactive","Collaborative"]} /></td>
              <td className="px-2 py-2 w-28"><SelectCell value={row.Logic} onChange={v => updateDeconCell(idx, "Logic", v)} options={["Deterministic","Probabilistic","Judgment-heavy"]} /></td>
              <td className="px-2 py-2 min-w-[100px]"><EditableCell value={row["Primary Skill"]} onChange={v => updateDeconCell(idx, "Primary Skill", v)} /></td>
              <td className="px-2 py-2 w-8"><button onClick={() => { const newRows = js.deconRows.filter((_, i) => i !== idx); setJobState(job, { deconRows: newRows, deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] }); }} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px]"><X size={14} /></button></td>
            </tr>; })}</tbody>
            <tfoot><tr className="bg-[var(--surface-2)]"><td className="px-2 py-2 text-[14px] font-bold text-[var(--text-muted)]" colSpan={2}>Total</td><td className="px-2 py-2 text-[15px] font-bold" style={{ color: deconTotal === 100 ? "var(--success)" : "var(--risk)" }}>{deconTotal}%</td><td className="px-2 py-2 text-[15px] font-bold text-[var(--text-muted)]">{(deconTotal * weeklyHours / 100).toFixed(1)}h</td><td colSpan={6} /></tr></tfoot>
          </table></div>
        </Card>
      </div>}

      {wdTab === "redeploy" && <div>{!js.deconSubmitted ? <EmptyState icon={<Lock size={24} />} headline="Deconstruction required" explanation="Complete task decomposition in the Deconstruction stage to unlock this step." primaryAction={{ label: "Go to Deconstruction", onClick: () => setWdTab("decon") }} /> : <>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Card title="Scenario"><SelectCell value={js.scenario} onChange={v => setJobState(job, { scenario: v, redeploySubmitted: false, recon: null })} options={["Conservative","Balanced","Aggressive"]} /></Card>
          <InsightPanel title="Guidance" items={[`New Time total: ${redeployTotal}%`, "Adjust decisions and future time.", "Submit to see reconstruction."]} icon={<Sparkle size={16} />} />
          <Card title="AI Assist"><button onClick={async () => {
            const newRows = js.redeployRows.map(row => {
              const impact = String(row["AI Impact"]);
              const taskType = String(row["Task Type"]);
              const logic = String(row.Logic);
              const inter = String(row.Interaction);
              let decision = "Retain";
              if (impact === "High" && taskType === "Repetitive" && logic === "Deterministic") decision = "Automate";
              else if (impact === "High") decision = "Augment";
              else if (impact === "Moderate" && inter === "Independent") decision = "Augment";
              else if (impact === "Moderate") decision = "Redesign";
              const techMap: Record<string, string> = { Automate: "RPA", Augment: "GenAI", Redesign: "Agentic AI", Retain: "Human-led", Transfer: "Shared Service" };
              return { ...row, Decision: decision, Technology: techMap[decision] || "Human-led" };
            });
            setJobState(job, { redeployRows: newRows, redeploySubmitted: false, finalized: false, recon: null });
          }} disabled={js.finalized} className="w-full py-2 rounded-md text-[15px] font-semibold text-white mb-2 inline-flex items-center justify-center gap-1" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}><Sparkle size={14} /> Auto-Recommend</button><div className="text-[15px] text-[var(--text-muted)]">AI assigns Retain/Augment/Automate based on task characteristics</div></Card>
          <Card title="Submit"><button disabled={!redeployValid || js.finalized} onClick={() => { setJobState(job, { redeploySubmitted: true, finalized: false, recon: null }); setWdTab("recon"); }} className={`w-full py-2 rounded-md text-[15px] font-semibold ${!redeployValid ? "bg-[var(--border)] text-[var(--text-muted)]" : "bg-[var(--accent-primary)] text-white"}`}>{js.redeploySubmitted ? "Update" : "Submit"} Redeployment</button></Card>
        </div>
        <Card title="Redeployment Plan — Editable">
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-left text-[15px]"><thead><tr className="bg-[var(--surface-2)]">{["Task ID","Task Name","Decision","Technology","Current %","New %","Destination","Future Skill","Notes"].map(c => <th key={c} className="px-2 py-2 border-b border-[var(--border)] text-[15px] uppercase text-[var(--text-muted)] whitespace-nowrap">{c}</th>)}</tr></thead><tbody>{js.redeployRows.map((row, idx) => <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--hover)]"><td className="px-2 py-2 text-[var(--text-secondary)]">{String(row["Task ID"] ?? "")}</td><td className="px-2 py-2 min-w-[160px] text-[var(--text-secondary)]">{String(row["Task Name"] ?? "")}</td><td className="px-2 py-2 min-w-[120px]"><SelectCell value={row.Decision} onChange={v => updateRedeployCell(idx, "Decision", v)} options={["Retain","Augment","Automate","Redesign","Transfer"]} /></td><td className="px-2 py-2 min-w-[120px]"><SelectCell value={row.Technology} onChange={v => updateRedeployCell(idx, "Technology", v)} options={["Human-led","GenAI","RPA","Agentic AI","ML","Shared Service"]} /></td><td className="px-2 py-2 text-[var(--text-secondary)]">{String(row["Current Time Spent %"] ?? "")}</td><td className="px-2 py-2 min-w-[80px]"><EditableCell type="number" value={row["New Time %"]} onChange={v => updateRedeployCell(idx, "New Time %", v)} /></td><td className="px-2 py-2 min-w-[160px]"><EditableCell value={row["Redeployment Destination"]} onChange={v => updateRedeployCell(idx, "Redeployment Destination", v)} /></td><td className="px-2 py-2 min-w-[120px]"><EditableCell value={row["Future Skill"]} onChange={v => updateRedeployCell(idx, "Future Skill", v)} /></td><td className="px-2 py-2 min-w-[120px]"><EditableCell value={row.Notes} onChange={v => updateRedeployCell(idx, "Notes", v)} /></td></tr>)}</tbody></table></div>
        </Card>
      </>}</div>}

      {wdTab === "recon" && (() => { const r = js.recon; const ac = ((r?.action_counts ?? {}) as Record<string, number>); const wf = ((r?.waterfall ?? {}) as Record<string, number>); const detail = ((r?.reconstruction ?? []) as Record<string, unknown>[]); const rollup = ((r?.rollup ?? []) as Record<string, unknown>[]); const recs = ((r?.recommendations ?? []) as string[]); return !js.redeploySubmitted ? <EmptyState icon={<Lock size={24} />} headline="Redeployment required" explanation="Complete the Work Options stage and submit your redeployment plan to unlock reconstruction." primaryAction={{ label: "Go to Work Options", onClick: () => setWdTab("redeploy") }} /> : <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Automate" value={ac.Automate ?? 0} accent /><KpiCard label="Augment" value={ac.Augment ?? 0} /><KpiCard label="Redesign" value={ac.Redesign ?? 0} /><KpiCard label="Retain" value={ac.Retain ?? 0} /></div><div className="grid grid-cols-12 gap-4 mb-5"><div className="col-span-5"><Card title="Reconstruction Rollup">{rollup.length ? <DataTable data={rollup} /> : <Empty text="Building..." icon={<Layers3 size={16} />} />}</Card></div><div className="col-span-3"><Card title="Capacity Waterfall">{Object.keys(wf).length ? <div className="flex items-end gap-2 h-40">{Object.entries(wf).map(([n, v], i) => <div key={n} className="flex-1 flex flex-col items-center justify-end"><div className="text-[15px] font-semibold text-[var(--text-secondary)] mb-1">{Number(v).toFixed(1)}h</div><div className="w-full rounded-t" style={{ height: `${Math.max((Number(v) / Math.max(Number(wf.current) || 1, 1)) * 100, 4)}%`, background: COLORS[i % COLORS.length] }} /><div className="text-[15px] text-[var(--text-muted)] mt-1 truncate w-full text-center">{n}</div></div>)}</div> : <Empty text="Building..." icon={<BarChart3 size={16} />} />}</Card></div><div className="col-span-4"><InsightPanel title="Recommendations" items={recs.length ? recs : ["Building..."]} icon={<TrendingUp size={16} />} /></div></div><Card title="Future-State Detail"><DataTable data={detail} /></Card><div className="mt-4 flex justify-end"><button disabled={!js.redeploySubmitted || js.finalized} onClick={() => setJobState(job, { finalized: true })} className={`px-4 py-2 rounded-md text-[15px] font-semibold inline-flex items-center gap-1 ${js.finalized ? "bg-[var(--success)] text-white" : "bg-[var(--success)] text-white hover:opacity-90"}`}>{js.finalized ? <><Check size={14} /> Finalized</> : "Finalize Work Design"}</button></div></div>; })()}

      {wdTab === "impact" && (() => { const r = js.recon; const ins = ((r?.insights ?? []) as Record<string, unknown>[]); const vm = ((r?.value_model ?? {}) as Record<string, unknown>); return !js.redeploySubmitted ? <EmptyState icon={<Lock size={24} />} headline="Redeployment required" explanation="Complete the Work Options stage and submit your redeployment plan to unlock the impact summary." primaryAction={{ label: "Go to Work Options", onClick: () => setWdTab("redeploy") }} /> : <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Current" value={r?.total_current_hrs as number ?? 0} /><KpiCard label="Future" value={r?.total_future_hrs as number ?? 0} /><KpiCard label="Released" value={((r?.total_current_hrs as number ?? 0) - (r?.total_future_hrs as number ?? 0)).toFixed(1)} accent /><KpiCard label="Evolution" value={String(r?.evolution ?? "\u2014")} /></div><div className="grid grid-cols-2 gap-4"><Card title="Transformation Insights"><DataTable data={ins} cols={["Category", "Metric", "Value", "Interpretation"]} /></Card><Card title="Value Model">{Object.keys(vm).length ? <div className="space-y-2">{Object.entries(vm).map(([n, v]) => <div key={n} className="flex justify-between text-[15px]"><span className="text-[var(--text-secondary)]">{n}</span><span className="font-semibold">{String(v)}</span></div>)}</div> : <Empty text="Computing..." />}</Card></div></div>; })()}

      {wdTab === "orglink" && <div>
        <EmptyState icon={<Layers3 size={24} />} headline="Org Link" explanation="This stage will connect your work design outputs to the Org Design Studio. Coming in a future update." primaryAction={{ label: "Back to Impact Summary", onClick: () => setWdTab("impact") }} />
      </div>}

      {wdTab === "handoff" && <div>
        <EmptyState icon={<Layers3 size={24} />} headline="Handoff" explanation="Stakeholder sign-off, change plan, and implementation owner assignment. Coming in a future update." primaryAction={{ label: "Back to Org Link", onClick: () => setWdTab("orglink") }} />
      </div>}

    <FlowNav previous={{ target: { kind: "module", moduleId: "ja-design" }, label: "JA Design Tool" }} next={{ target: { kind: "module", moduleId: "build" }, label: "Org Design Studio" }} />
      </div>
    </div>
  </div>;
}
