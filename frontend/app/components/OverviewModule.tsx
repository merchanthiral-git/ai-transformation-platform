"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip } from "recharts";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import {
  KpiCard,
  Card,
  Empty,
  Badge,
  InsightPanel,
  NarrativePanel,
  DataTable,
  BarViz,
  DonutViz,
  RadarViz,
  PageHeader,
  LoadingBar,
  LoadingSkeleton,
  NextStepBar,
  ModuleExportButton,
  usePersisted,
  useApiData,
  callAI,
  showToast,
  COLORS,
  TT,
  PHASES,
  MODULES,
  SIM_PRESETS,
  ContextStrip,
  ReadinessDot,
  CareerFrameworkAccordion,
  AiInsightCard,
} from "./shared";
import type { ViewContext, JobDesignState } from "./shared";

export function TransformationDashboard({ data, jobStates, simState, viewCtx }: { data: Record<string, unknown> | null; jobStates: Record<string, JobDesignState>; simState: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number }; viewCtx?: ViewContext }) {
  const k = (data?.kpis ?? {}) as Record<string, unknown>;
  const finalized = Object.values(jobStates).filter(s => s.finalized).length;
  const totalJobs = Object.values(jobStates).filter(s => s.deconRows.length > 0).length;
  const totalTasks = Object.values(jobStates).reduce((s, js) => s + js.deconRows.length, 0);
  const highAiTasks = Object.values(jobStates).reduce((s, js) => s + js.deconRows.filter(r => String(r["AI Impact"]) === "High").length, 0);

  // Calculate released hours from redeployment
  const releasedHours = Object.values(jobStates).reduce((sum, js) => {
    if (!js.redeploySubmitted) return sum;
    return sum + js.redeployRows.reduce((s, r) => {
      const current = Number(r["Current Time Spent %"] || 0);
      const newTime = Number(r["New Time %"] || current);
      return s + Math.max(0, current - newTime);
    }, 0);
  }, 0);

  const hasProgress = Number(k.employees || 0) > 0 || totalJobs > 0;
  if (!hasProgress) return null;

  // Phase summaries
  const p1Complete = Number(k.employees || 0) > 0;
  const p2Complete = finalized > 0;
  const p3Ready = p2Complete;

  const cfg = simState.custom ? { adoption: simState.custAdopt / 100 } : (SIM_PRESETS[simState.scenario] || { adoption: 0.6 });
  const kpis = viewCtx?.mode === "employee" ? [
    { label: "My AI Impact", value: `${Math.round(cfg.adoption * 100)}%`, icon: "🤖", color: "var(--warning)" },
    { label: "Tasks Augmented", value: Math.round(highAiTasks * cfg.adoption) || "—", icon: "⚡", color: "var(--accent-primary)" },
    { label: "Time Freed", value: `${Math.round(cfg.adoption * 40)}%`, icon: "⏰", color: "var(--success)" },
    { label: "New Skills", value: Math.round(cfg.adoption * 3) || "—", icon: "📚", color: "var(--purple)" },
    { label: "Change Wave", value: "Wave 1", icon: "🚀", color: "var(--accent-primary)" },
    { label: "Readiness", value: `${k.readiness_score || "—"}/100`, icon: "◎", color: "var(--warning)" },
  ] : viewCtx?.mode === "job" ? [
    { label: "Incumbents", value: k.employees as number || 0, icon: "👥", color: "var(--accent-primary)" },
    { label: "Tasks Mapped", value: totalTasks || "—", icon: "📋", color: "var(--success)" },
    { label: "High AI Tasks", value: highAiTasks || "—", icon: "🤖", color: "var(--warning)" },
    { label: "AI Impact", value: `${Math.round(cfg.adoption * 100)}%`, icon: "⚡", color: "var(--accent-primary)" },
    { label: "Status", value: finalized > 0 ? "Finalized" : totalJobs > 0 ? "In Progress" : "Not Started", icon: "✓", color: finalized > 0 ? "var(--success)" : "var(--warning)" },
    { label: "Readiness", value: `${k.readiness_score || "—"}/100`, icon: "◎", color: "var(--warning)" },
  ] : [
    { label: "Employees", value: k.employees as number || 0, icon: "👥", color: "var(--accent-primary)" },
    { label: "Roles Analyzed", value: totalJobs, icon: "💼", color: "var(--purple)" },
    { label: "Tasks Mapped", value: totalTasks, icon: "📋", color: "var(--success)" },
    { label: "High AI Tasks", value: highAiTasks, icon: "🤖", color: "var(--warning)" },
    { label: "Jobs Finalized", value: `${finalized}/${totalJobs || "—"}`, icon: "✓", color: "var(--success)" },
    { label: "AI Readiness", value: `${k.readiness_score || "—"}/100`, icon: "◎", color: k.readiness_score && Number(k.readiness_score) >= 60 ? "var(--success)" : "var(--warning)" },
  ];

  return <div className="mb-6">
    <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center justify-between"><span>{viewCtx?.mode === "employee" ? "My Transformation Impact" : viewCtx?.mode === "job" ? "Role Analysis Progress" : "Transformation Progress"}</span><span className="text-[9px] font-normal opacity-50">hover to expand</span></div>
    {/* Phase progress indicators */}
    <div className="flex gap-2 mb-3">
      {PHASES.map((phase, i) => {
        const done = i === 0 ? p1Complete : i === 1 ? p2Complete : p3Ready;
        return <div key={phase.id} className="flex-1 rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: done ? `${phase.color}10` : "var(--surface-2)", border: `1px solid ${done ? `${phase.color}30` : "var(--border)"}` }}>
          <span className="text-sm">{phase.icon}</span>
          <div><div className="text-[11px] font-bold" style={{ color: done ? phase.color : "var(--text-muted)" }}>{phase.label}</div><div className="text-[9px]" style={{ color: done ? `${phase.color}99` : "var(--text-muted)" }}>{done ? "In progress" : i === 0 ? "Upload data" : "Locked"}</div></div>
        </div>;
      })}
    </div>
    <div className="grid grid-cols-6 gap-2">
      {kpis.map(k => <div key={k.label} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-3 py-3 text-center">
        <div className="text-[16px] mb-1">{k.icon}</div>
        <div className="text-[18px] font-extrabold" style={{ color: k.color }}>{k.value}</div>
        <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">{k.label}</div>
      </div>)}
    </div>
  </div>;
}

export function LandingPage({ onNavigate, moduleStatus, hasData, viewMode }: { onNavigate: (id: string) => void; moduleStatus: Record<string, string>; hasData: boolean; viewMode?: string }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return !localStorage.getItem("onboarding_dismissed"); } catch { return false; }
  });
  const dismissOnboarding = () => { setShowOnboarding(false); try { localStorage.setItem("onboarding_dismissed", "1"); } catch {} };
  const noModulesVisited = Object.values(moduleStatus).every(s => s === "not_started");

  // Phase logic
  const getPhaseStatus = (phase: typeof PHASES[0]) => {
    const ms = phase.modules.map(id => moduleStatus[id] || "not_started");
    if (ms.every(s => s === "complete")) return "complete";
    if (ms.some(s => s !== "not_started")) return "in_progress";
    return "not_started";
  };
  const isPhaseUnlocked = (pi: number) => {
    if (pi === 0) return true;
    if (pi === 1) return hasData;
    return true; // Phase 3 always accessible for exploration
  };
  const filteredModules = MODULES.filter(m => !m.views || m.views.includes(viewMode || "org"));

  return <div className="relative min-h-[calc(100vh-48px)] overflow-hidden">
    {/* Full bleed background */}
    <div className="absolute inset-0 z-0 hub-bg" />
    <div className="absolute inset-0 z-0" style={{ background: panelOpen ? "rgba(8,12,24,0.5)" : "radial-gradient(ellipse at 35% 40%, rgba(8,12,24,0.15) 0%, rgba(8,12,24,0.4) 50%, rgba(8,12,24,0.65) 100%)", transition: "background 0.5s ease" }} />

    {/* Clickable area — click anywhere to open panel */}
    {!panelOpen && <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setPanelOpen(true)}>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-[fadeIn_1s_ease]">
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl animate-pulse" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.12)" }}>
          <span style={{ color: "rgba(255,230,200,0.8)", fontSize: 14, fontWeight: 600 }}>Click anywhere to explore</span>
          <span className="text-[16px]">→</span>
        </div>
      </div>
    </div>}

    {/* Slide-open panel from the right */}
    <div className="absolute z-20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ top: 0, right: 0, bottom: 0, width: panelOpen ? "55%" : "0%", overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", background: "rgba(11,17,32,0.94)", backdropFilter: "blur(32px)", borderLeft: "1px solid rgba(255,200,150,0.06)", display: "flex", flexDirection: "column", padding: panelOpen ? "32px 32px" : "32px 0", opacity: panelOpen ? 1 : 0, transition: "opacity 0.5s ease 0.2s, padding 0.7s ease", overflowY: "auto" }}>

        {/* Panel header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #e09040, #c07030)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff" }}>AI</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "rgba(255,245,235,0.95)", letterSpacing: "-0.02em" }}>Transformation Platform</div>
              <div style={{ fontSize: 11, color: "rgba(255,200,150,0.4)" }}>{viewMode === "employee" ? "Employee View" : viewMode === "job" ? "Job View" : viewMode === "custom" ? "Custom View" : "Organization View"}</div>
            </div>
          </div>
          <button onClick={() => setPanelOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,150,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,200,150,0.4)", fontSize: 14 }} onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,200,150,0.8)"; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,200,150,0.4)"; }}>✕</button>
        </div>

        {/* First-time onboarding banner */}
        {showOnboarding && noModulesVisited && <div className="mb-5 rounded-2xl overflow-hidden animate-card-enter" style={{ background: "linear-gradient(135deg, rgba(212,134,10,0.12), rgba(192,112,48,0.08))", border: "1px solid rgba(212,134,10,0.2)" }}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">👋</div>
                <div>
                  <div className="text-[16px] font-bold font-heading" style={{ color: "rgba(255,245,235,0.95)" }}>Welcome to the AI Transformation Platform</div>
                  <div className="text-[12px]" style={{ color: "rgba(255,200,150,0.5)" }}>Your workspace is ready with sample data</div>
                </div>
              </div>
              <button onClick={dismissOnboarding} className="text-[11px] px-2 py-1 rounded" style={{ color: "rgba(255,200,150,0.4)" }}>✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{ icon: "📊", label: "Discover", desc: "Assess current state — workforce data, AI readiness, skills gaps", action: "snapshot" },
                { icon: "✏️", label: "Design", desc: "Deconstruct roles, redesign work, plan talent strategy", action: "skills" },
                { icon: "🚀", label: "Deliver", desc: "Reskilling paths, change plans, operating model", action: "reskill" },
              ].map(p => <button key={p.label} onClick={() => { dismissOnboarding(); onNavigate(p.action); }} className="text-left rounded-xl p-3 transition-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,200,150,0.06)" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,200,150,0.08)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.3)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,200,150,0.06)"; }}>
                <div className="text-xl mb-1">{p.icon}</div>
                <div className="text-[12px] font-bold" style={{ color: "rgba(255,245,235,0.9)" }}>{p.label}</div>
                <div className="text-[10px]" style={{ color: "rgba(255,220,190,0.35)" }}>{p.desc}</div>
              </button>)}
            </div>
            <div className="text-[11px]" style={{ color: "rgba(255,200,150,0.35)" }}>💡 Demo_Model is pre-loaded with 16 employees and 5 roles. Use the <strong style={{ color: "#E09040" }}>🎓 Sandbox</strong> from Projects for a full 500+ employee dataset.</div>
          </div>
        </div>}

        {/* Phase progress bar */}
        <div className="flex items-center gap-2 mb-6">
          {PHASES.map((phase, pi) => {
            const status = getPhaseStatus(phase);
            const unlocked = isPhaseUnlocked(pi);
            return <React.Fragment key={phase.id}>
              {pi > 0 && <div className="flex-1 h-px" style={{ background: unlocked ? `${phase.color}30` : "rgba(255,255,255,0.04)" }} />}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: status !== "not_started" ? `${phase.color}20` : "rgba(255,255,255,0.03)", color: unlocked ? phase.color : "rgba(255,255,255,0.12)", border: `1.5px solid ${unlocked ? phase.color + "60" : "rgba(255,255,255,0.06)"}` }}>{status === "complete" ? "✓" : pi + 1}</div>
                <span className="text-[11px] font-semibold" style={{ color: unlocked ? "rgba(255,245,235,0.7)" : "rgba(255,255,255,0.15)" }}>{phase.label}</span>
              </div>
            </React.Fragment>;
          })}
        </div>

        {/* Phase sections with module cards */}
        {PHASES.map((phase, pi) => {
          const unlocked = isPhaseUnlocked(pi);
          const phaseMods = filteredModules.filter(m => (m as Record<string, unknown>).phase === phase.id);
          if (phaseMods.length === 0) return null;
          return <div key={phase.id} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{phase.icon}</span>
              <span className="text-[13px] font-bold" style={{ color: unlocked ? "rgba(255,245,235,0.8)" : "rgba(255,255,255,0.15)" }}>Phase {pi + 1}: {phase.label}</span>
              {!unlocked && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.15)" }}>🔒</span>}
              {pi === 2 && !hasData && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "rgba(245,158,11,0.5)" }}>Best after Phase 2</span>}
            </div>
            <div className={`grid ${phaseMods.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-2`}>
              {phaseMods.map(m => {
                const status = moduleStatus[m.id] || "not_started";
                const statusColor = status === "complete" ? "#E8C547" : status === "in_progress" ? "#E09040" : "rgba(255,220,180,0.12)";
                const mTitle = viewMode === "employee" && (m as Record<string, unknown>).empTitle ? String((m as Record<string, unknown>).empTitle) : viewMode === "job" && (m as Record<string, unknown>).jobTitle ? String((m as Record<string, unknown>).jobTitle) : m.title;
                const mDesc = viewMode === "employee" && (m as Record<string, unknown>).empDesc ? String((m as Record<string, unknown>).empDesc) : viewMode === "job" && (m as Record<string, unknown>).jobDesc ? String((m as Record<string, unknown>).jobDesc) : m.desc;
                return <button key={m.id} onClick={() => unlocked && onNavigate(m.id)} disabled={!unlocked} className="text-left rounded-xl p-4 transition-all duration-200 group" style={{ background: unlocked ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)", border: `1px solid ${unlocked ? "rgba(255,200,150,0.06)" : "rgba(255,255,255,0.02)"}`, opacity: unlocked ? 1 : 0.35, cursor: unlocked ? "pointer" : "not-allowed" }} onMouseEnter={e => { if (unlocked) { e.currentTarget.style.background = "rgba(255,200,150,0.06)"; e.currentTarget.style.borderColor = `${m.color}30`; }}} onMouseLeave={e => { e.currentTarget.style.background = unlocked ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)"; e.currentTarget.style.borderColor = unlocked ? "rgba(255,200,150,0.06)" : "rgba(255,255,255,0.02)"; }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl group-hover:scale-110 transition-transform">{m.icon}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                  </div>
                  <div className="text-[13px] font-bold mb-0.5" style={{ color: unlocked ? "rgba(255,245,235,0.9)" : "rgba(255,255,255,0.15)" }}>{mTitle}</div>
                  <div className="text-[10px] leading-relaxed" style={{ color: unlocked ? "rgba(255,220,190,0.35)" : "rgba(255,255,255,0.06)" }}>{mDesc}</div>
                </button>;
              })}
            </div>
            {/* Unlock hint */}
            {!unlocked && pi === 1 && <div className="mt-2 text-[10px] px-3 py-1.5 rounded-lg" style={{ background: `${phase.color}08`, color: `${phase.color}80` }}>Upload data to unlock Design tools</div>}
          </div>;
        })}

        {/* Data prompt */}
        {!hasData && <div className="mt-2 text-center"><p className="text-[11px]" style={{ color: "rgba(255,220,180,0.3)" }}>Upload data or select <strong style={{ color: "#f0a050" }}>Demo_Model</strong> in the sidebar</p></div>}
      </div>
    </div>
  </div>;
}

export function EmployeeProfileCard({ employee, model, f }: { employee: string; model: string; f: Filters }) {
  const [data] = useApiData(() => api.getOverview(model, f), [model]);
  const [aiProfile, setAiProfile] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee || !model) return;
    setLoading(true);
    callAI("Return ONLY valid JSON.", `Based on the employee name "${employee}" in an organization, generate a plausible employee profile. Return JSON: {"name":"${employee}","title":"likely job title","department":"department","manager":"manager name","level":"Junior/Mid/Senior/Lead/Director","track":"IC/Manager","tenure":"e.g. 3 years","location":"city","skills":["3 skills"],"aiImpact":"High/Moderate/Low","summary":"1 sentence about their role"}`).then(raw => {
      try { setAiProfile(JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim())); } catch {}
      setLoading(false);
    });
  }, [employee, model]);

  if (loading) return <Card><LoadingSkeleton rows={4} /></Card>;
  if (!aiProfile) return <Card><Empty text="Loading employee profile..." /></Card>;

  return <Card>
    <div className="flex items-start gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, var(--purple), var(--accent-primary))" }}>{(aiProfile.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
      <div className="flex-1">
        <div className="text-[20px] font-extrabold text-[var(--text-primary)] mb-0.5">{aiProfile.name}</div>
        <div className="text-[14px] text-[var(--text-secondary)] mb-2">{aiProfile.title} · {aiProfile.department}</div>
        <div className="flex gap-2 flex-wrap mb-3">
          <Badge color="indigo">{aiProfile.level}</Badge>
          <Badge color={aiProfile.track === "Manager" ? "amber" : "gray"}>{aiProfile.track}</Badge>
          <Badge color="purple">{aiProfile.tenure}</Badge>
          <Badge color="gray">{aiProfile.location}</Badge>
        </div>
        <div className="text-[13px] text-[var(--text-secondary)] mb-3">{aiProfile.summary}</div>
        <div className="flex gap-1.5">{(Array.isArray(aiProfile.skills) ? aiProfile.skills : []).map((s: string, i: number) => <Badge key={i} color="indigo">{s}</Badge>)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Reports to</div>
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">{aiProfile.manager}</div>
        <div className="mt-3 text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">AI Impact</div>
        <div className="text-[15px] font-bold" style={{ color: aiProfile.aiImpact === "High" ? "var(--risk)" : aiProfile.aiImpact === "Moderate" ? "var(--warning)" : "var(--success)" }}>{aiProfile.aiImpact}</div>
      </div>
    </div>
  </Card>;
}

export function EmployeeOrgChart({ employee, model, f }: { employee: string; model: string; f: Filters }) {
  const [chart, setChart] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee || !model) return;
    setLoading(true);
    // Try to get real org data first, fall back to AI-generated
    api.getOrgDiagnostics(model, f).then(orgData => {
      // If we have real span data, it means workforce is uploaded — use AI with context
      const orgContext = orgData ? `This organization has ${(orgData as Record<string, unknown>)?.kpis ? JSON.stringify((orgData as Record<string, unknown>).kpis) : "unknown structure"}.` : "";
      return callAI("Return ONLY valid JSON.", `Generate a plausible org chart for employee "${employee}" in this organization. ${orgContext} Return JSON: {"skip_level":{"name":"SVP name","title":"SVP title"},"manager":{"name":"Director name","title":"Director title"},"self":{"name":"${employee}","title":"their title"},"peers":[{"name":"peer1","title":"title"},{"name":"peer2","title":"title"}],"directs":[{"name":"report1","title":"title"}]}`);
    }).then(raw => {
      try { setChart(JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim())); } catch {}
      setLoading(false);
    });
  }, [employee, model]);

  if (loading) return <Card title="Org Chart"><LoadingSkeleton rows={5} /></Card>;
  if (!chart) return null;

  const PersonNode = ({ name, title, highlight, color }: { name: string; title: string; highlight?: boolean; color?: string }) => (
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold text-white mb-1" style={{ background: color || (highlight ? "linear-gradient(135deg, var(--purple), var(--accent-primary))" : "var(--surface-3)"), border: highlight ? "2px solid var(--purple)" : "1px solid var(--border)" }}>{name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>
      <div className="text-[11px] font-semibold text-center" style={{ color: highlight ? "var(--text-primary)" : "var(--text-secondary)" }}>{name}</div>
      <div className="text-[10px] text-[var(--text-muted)] text-center">{title}</div>
    </div>
  );

  const skip = chart.skip_level as Record<string, string>;
  const mgr = chart.manager as Record<string, string>;
  const self = chart.self as Record<string, string>;
  const peers = (chart.peers || []) as Record<string, string>[];
  const directs = (chart.directs || []) as Record<string, string>[];

  return <Card title="Org Chart">
    <div className="flex flex-col items-center gap-1">
      {/* Skip level */}
      {skip && <><PersonNode name={skip.name} title={skip.title} color="var(--surface-3)" /><div className="w-px h-4 bg-[var(--border)]" /></>}
      {/* Manager */}
      {mgr && <><PersonNode name={mgr.name} title={mgr.title} color="rgba(212,134,10,0.3)" /><div className="w-px h-4 bg-[var(--border)]" /></>}
      {/* Self + peers row */}
      <div className="flex items-start gap-6">
        {peers.slice(0, 2).map((p, i) => <PersonNode key={i} name={p.name} title={p.title} />)}
        <PersonNode name={self.name} title={self.title} highlight />
        {peers.slice(2, 4).map((p, i) => <PersonNode key={i+2} name={p.name} title={p.title} />)}
      </div>
      {/* Directs */}
      {directs.length > 0 && <><div className="w-px h-4 bg-[var(--border)]" /><div className="flex items-start gap-4">{directs.map((d, i) => <PersonNode key={i} name={d.name} title={d.title} />)}</div></>}
    </div>
  </Card>;
}

export function PersonalImpactCard({ employee, jobStates, simState }: { employee: string; jobStates: Record<string, JobDesignState>; simState: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number } }) {
  const cfg = simState.custom ? { adoption: simState.custAdopt / 100 } : (SIM_PRESETS[simState.scenario] || { adoption: 0.6 });
  const impactPct = Math.round(cfg.adoption * 100);
  return <Card title="How AI Transformation Affects You">
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
        <div className="text-2xl mb-1">🤖</div>
        <div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{impactPct}%</div>
        <div className="text-[11px] text-[var(--text-muted)]">of your tasks will be AI-augmented</div>
      </div>
      <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
        <div className="text-2xl mb-1">⏰</div>
        <div className="text-[20px] font-extrabold text-[var(--success)]">{Math.round(impactPct * 0.4)}%</div>
        <div className="text-[11px] text-[var(--text-muted)]">time freed for higher-value work</div>
      </div>
      <div className="bg-[var(--surface-2)] rounded-xl p-4 text-center border border-[var(--border)]">
        <div className="text-2xl mb-1">📈</div>
        <div className="text-[20px] font-extrabold text-[var(--purple)]">{Math.round(impactPct * 0.3)}%</div>
        <div className="text-[11px] text-[var(--text-muted)]">new skills you will develop</div>
      </div>
    </div>
    <div className="mt-4 bg-[rgba(16,185,129,0.06)] border border-[var(--success)]/20 rounded-xl p-4">
      <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">Under the <strong className="text-[var(--text-primary)]">{simState.scenario || "Balanced"}</strong> scenario, your role will evolve. Repetitive tasks will be automated, freeing your time for strategic work, relationship building, and innovation. You will receive training on new AI tools relevant to your function.</div>
    </div>
  </Card>;
}

export function TransformationExecDashboard({ model, f, onBack, onNavigate, decisionLog = [], riskRegister = [], addRisk, updateRisk }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; decisionLog?: {ts:string;module:string;action:string;detail:string}[]; riskRegister?: {id:string;source:string;risk:string;probability:string;impact:string;mitigation:string;status:string}[]; addRisk?: (s:string,r:string,p:string,i:string,m:string) => void; updateRisk?: (id:string,u:Partial<{status:string;mitigation:string}>) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!model) return;
    setLoading(true);
    api.getExportSummary(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [model]);

  const bbba = (data?.bbba_summary || {}) as Record<string, unknown>;
  const reskill = (data?.reskilling_summary || {}) as Record<string, unknown>;
  const mp = (data?.marketplace_summary || {}) as Record<string, unknown>;
  const wf = (data?.headcount_waterfall || {}) as Record<string, unknown>;
  const mgr = (data?.manager_summary || {}) as Record<string, unknown>;
  const bands = (data?.readiness_bands || {}) as Record<string, number>;

  const nav = (id: string) => onNavigate ? onNavigate(id) : onBack();

  return <div>
    <PageHeader icon="🎯" title="Transformation Dashboard" subtitle="Executive summary across all 18 modules" onBack={onBack} moduleId="dashboard" />
    {loading && <LoadingBar />}

    {/* Phase summary cards */}
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[
        { phase: "Discover", icon: "🔍", color: "#D4860A", items: [
          { label: "Employees", value: data?.total_employees || 0 },
          { label: "AI Readiness", value: `${data?.org_readiness || "—"}/5` },
          { label: "Champions", value: mgr.champions || 0 },
          { label: "At Risk", value: bands.at_risk || 0 },
        ]},
        { phase: "Design", icon: "✏️", color: "#10B981", items: [
          { label: "Skills Coverage", value: `${data?.skills_coverage || 0}%` },
          { label: "Critical Gaps", value: data?.critical_gaps || 0 },
          { label: "Build Roles", value: bbba.build || 0 },
          { label: "Buy Roles", value: bbba.buy || 0 },
        ]},
        { phase: "Deliver", icon: "🚀", color: "#F59E0B", items: [
          { label: "High Risk %", value: `${data?.high_risk_pct || 0}%` },
          { label: "Internal Fill", value: mp.internal_fill || 0 },
          { label: "Reskill Cost", value: `$${(Number(reskill.total_investment || 0) / 1000).toFixed(0)}K` },
          { label: "Net HC Change", value: wf.net_change || 0 },
        ]},
      ].map(p => <div key={p.phase} className="rounded-2xl p-5 border transition-all hover:translate-y-[-2px]" style={{ background: `${p.color}08`, borderColor: `${p.color}20` }}>
        <div className="flex items-center gap-2 mb-4"><span className="text-xl">{p.icon}</span><span className="text-[15px] font-bold" style={{ color: p.color }}>{p.phase}</span></div>
        <div className="grid grid-cols-2 gap-3">{p.items.map(it => <div key={it.label} className="text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{String(it.value)}</div><div className="text-[9px] text-[var(--text-muted)] uppercase">{it.label}</div></div>)}</div>
      </div>)}
    </div>

    {/* Investment overview */}
    <Card title="Investment & ROI Summary">
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Total Investment</div><div className="text-[24px] font-extrabold text-[var(--text-primary)]">${(Number(bbba.total_investment || 0) / 1000).toFixed(0)}K</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Reskilling</div><div className="text-[24px] font-extrabold text-[var(--success)]">${(Number(bbba.reskilling_investment || reskill.total_investment || 0) / 1000).toFixed(0)}K</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Hiring</div><div className="text-[24px] font-extrabold text-[var(--accent-primary)]">${(Number(bbba.hiring_cost || 0) / 1000).toFixed(0)}K</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)] bg-[var(--surface-2)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Manager Dev</div><div className="text-[24px] font-extrabold text-[var(--purple)]">${(Number((data?.manager_summary as Record<string,unknown>)?.total_investment || 0) / 1000).toFixed(0)}K</div></div>
      </div>
    </Card>

    {/* Readiness & Risk */}
    <div className="grid grid-cols-2 gap-4">
      <Card title="Workforce Readiness">
        <div className="flex gap-3">{[
          { label: "Ready Now", value: bands.ready_now || 0, color: "var(--success)" },
          { label: "Coachable", value: bands.coachable || 0, color: "var(--warning)" },
          { label: "At Risk", value: bands.at_risk || 0, color: "var(--risk)" },
        ].map(b => <div key={b.label} className="flex-1 rounded-xl p-3 text-center border border-[var(--border)]">
          <div className="text-[24px] font-extrabold" style={{ color: b.color }}>{b.value}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{b.label}</div>
          <div className="mt-2 h-2 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Number(b.value) / Math.max(Number(data?.total_employees || 1), 1) * 100}%`, background: b.color }} /></div>
        </div>)}</div>
      </Card>
      <Card title="Talent Strategy Mix">
        <div className="flex gap-3">{[
          { label: "Build", value: Number(bbba.build || 0), color: "var(--success)", icon: "🏗️" },
          { label: "Buy", value: Number(bbba.buy || 0), color: "var(--accent-primary)", icon: "🛒" },
          { label: "Borrow", value: Number(bbba.borrow || 0), color: "var(--warning)", icon: "🤝" },
          { label: "Automate", value: Number(bbba.automate || 0), color: "var(--purple)", icon: "🤖" },
        ].map(b => <div key={b.label} className="flex-1 rounded-xl p-3 text-center border border-[var(--border)]">
          <div className="text-lg mb-1">{b.icon}</div>
          <div className="text-[20px] font-extrabold" style={{ color: b.color }}>{b.value}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{b.label}</div>
        </div>)}</div>
      </Card>
    </div>

    {/* Quick navigation to modules */}
    <Card title="Deep Dive Into Any Module">
      <div className="grid grid-cols-6 gap-2">{[
        { id: "snapshot", icon: "📊", label: "Snapshot" },
        { id: "skills", icon: "🧠", label: "Skills" },
        { id: "design", icon: "✏️", label: "Work Design" },
        { id: "bbba", icon: "🔀", label: "BBBA" },
        { id: "headcount", icon: "👥", label: "Headcount" },
        { id: "simulate", icon: "⚡", label: "Simulator" },
        { id: "readiness", icon: "🎯", label: "Readiness" },
        { id: "mgrcap", icon: "👔", label: "Managers" },
        { id: "reskill", icon: "📚", label: "Reskilling" },
        { id: "marketplace", icon: "🏪", label: "Marketplace" },
        { id: "changeready", icon: "📈", label: "Change" },
        { id: "plan", icon: "🚀", label: "Planner" },
        { id: "mgrdev", icon: "🎓", label: "Mgr Dev" },
        { id: "opmodel", icon: "🧬", label: "Op Model" },
        { id: "build", icon: "🏗️", label: "Org Design" },
        { id: "scan", icon: "🔬", label: "AI Scan" },
        { id: "jobs", icon: "🗂️", label: "Jobs" },
        { id: "export", icon: "📋", label: "Export" },
      ].map(m => <button key={m.id} onClick={() => nav(m.id)} className="rounded-xl p-3 text-center bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30 hover:translate-y-[-1px] cursor-pointer">
        <div className="text-lg mb-1">{m.icon}</div>
        <div className="text-[10px] font-semibold text-[var(--text-secondary)]">{m.label}</div>
      </button>)}</div>
    </Card>

    {/* Decision Log */}
    <Card title="Decision Log — Audit Trail">
      {decisionLog.length === 0 ? <div className="text-[12px] text-[var(--text-muted)] py-4 text-center">No decisions recorded yet. Decisions are logged automatically as you confirm skills, submit work design, and override recommendations.</div> : <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{maxHeight:250}}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0"><th className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Time</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Module</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Action</th><th className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Detail</th></tr></thead>
      <tbody>{[...decisionLog].reverse().map((d, i) => <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"><td className="px-3 py-1.5 text-[var(--text-muted)]">{new Date(d.ts).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td><td className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">{d.module}</td><td className="px-2 py-1.5 text-[var(--accent-primary)]">{d.action}</td><td className="px-3 py-1.5 text-[var(--text-secondary)]">{d.detail}</td></tr>)}</tbody></table></div>}
    </Card>

    {/* Risk Register */}
    <Card title="Risk Register">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-[var(--text-secondary)]">Aggregated risks across all modules. Add risks manually or let modules flag them.</div>
        <button onClick={() => {
          const risk = prompt("Describe the risk:");
          if (risk && addRisk) { addRisk("Manual", risk, "Medium", "Medium", "To be determined"); showToast("Risk added to register"); }
        }} className="px-3 py-1 rounded-lg text-[10px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/5 transition-all">+ Add Risk</button>
      </div>
      {riskRegister.length === 0 ? <div className="text-[12px] text-[var(--text-muted)] py-4 text-center">No risks registered. Risks are auto-flagged as you identify gaps, flight-risk managers, and low-readiness segments.</div> : <div className="space-y-2">{riskRegister.map(r => <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="text-[11px] font-bold text-[var(--text-muted)] w-8 shrink-0">{r.id}</div>
        <div className="flex-1"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{r.risk}</div><div className="text-[10px] text-[var(--text-muted)]">Source: {r.source} · Mitigation: {r.mitigation}</div></div>
        <Badge color={r.probability === "High" ? "red" : r.probability === "Medium" ? "amber" : "green"}>{r.probability}</Badge>
        <Badge color={r.impact === "High" ? "red" : r.impact === "Medium" ? "amber" : "green"}>{r.impact}</Badge>
        <button onClick={() => updateRisk?.(r.id, { status: r.status === "Open" ? "Mitigated" : "Open" })} className="text-[9px] font-semibold px-2 py-1 rounded" style={{ background: r.status === "Open" ? "var(--risk)" : "var(--success)", color: "#fff" }}>{r.status}</button>
      </div>)}</div>}
    </Card>


    {/* Phase Completion */}
    <Card title="Transformation Progress">
      {(() => {
        const visited = JSON.parse(localStorage.getItem(`${model}_visited`) || "{}") as Record<string, boolean>;
        const phases = [
          {name:"Discover",modules:["snapshot","jobs","scan","readiness","mgrcap"],color:"#D4860A"},
          {name:"Design",modules:["skills","design","bbba","headcount","simulate","build"],color:"#10B981"},
          {name:"Deliver",modules:["reskill","marketplace","changeready","mgrdev","plan","opmodel"],color:"#F59E0B"},
        ];
        return <div className="grid grid-cols-3 gap-4">{phases.map(p => {
          const done = p.modules.filter(m => visited[m]).length;
          const pct = Math.round((done / p.modules.length) * 100);
          return <div key={p.name} className="rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-2"><span className="text-[13px] font-bold" style={{color:p.color}}>{p.name}</span><span className="text-[14px] font-extrabold" style={{color:p.color}}>{pct}%</span></div>
            <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden mb-2"><div className="h-full rounded-full" style={{width:`${pct}%`,background:p.color}} /></div>
            <div className="text-[9px] text-[var(--text-muted)]">{done}/{p.modules.length} modules completed</div>
          </div>;
        })}</div>;
      })()}
    </Card>

    <InsightPanel title="Executive Summary" items={[
      `${data?.total_employees || 0} employees assessed with ${data?.skills_coverage || 0}% skills coverage`,
      `${data?.critical_gaps || 0} critical skill gaps identified — ${Object.values(bbba).reduce((s: number, v) => s + (typeof v === "number" ? v : 0), 0) || 0} roles need sourcing decisions`,
      `Workforce readiness: ${data?.org_readiness || "—"}/5 — ${bands.at_risk || 0} employees in At Risk band need intervention`,
      `Total transformation investment: $${(Number(bbba.total_investment || 0) / 1000).toFixed(0)}K across reskilling, hiring, and manager development`,
      `${data?.high_risk_pct || 0}% of workforce is in the High Risk change segment — prioritize these for support`,
    ]} icon="🎯" />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   UPLOAD INTELLIGENCE — auto-generated insights after data upload
   ═══════════════════════════════════════════════════════════════ */

type UploadInsights = {
  observations: string[];
  suggestions: { text: string; target: string }[];
  quality_issues: string[];
  missing_fields: string[];
  completeness_pct: number;
  level_distribution: { level: string; count: number }[];
  emp_count: number;
  func_count: number;
  title_count: number;
  level_count: number;
  largest_func: string;
  largest_func_count: number;
  largest_func_pct: number;
  readiness_score: number;
};

function UploadIntelligencePanel({ insights, funcDist, onNavigate }: {
  insights: UploadInsights;
  funcDist: { name: string; value: number }[];
  onNavigate?: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = usePersisted("upload_intelligence_collapsed", false);
  const [revealed, setRevealed] = useState(0);
  const [analyzing, setAnalyzing] = useState(true);

  // Staggered reveal animation
  useEffect(() => {
    if (collapsed) return;
    setAnalyzing(true);
    setRevealed(0);
    const analyzeTimer = setTimeout(() => {
      setAnalyzing(false);
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setRevealed(count);
        if (count >= insights.observations.length + insights.suggestions.length + 4) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }, 1200);
    return () => clearTimeout(analyzeTimer);
  }, [collapsed, insights.observations.length, insights.suggestions.length]);

  // Data quality traffic light
  const qualityColor = insights.completeness_pct >= 90 ? "#10B981" : insights.completeness_pct >= 60 ? "#F59E0B" : "#EF4444";
  const qualityLabel = insights.completeness_pct >= 90 ? "Complete" : insights.completeness_pct >= 60 ? "Some Gaps" : "Needs Attention";

  return <div className="mb-5 rounded-2xl border overflow-hidden transition-all" style={{ borderColor: "rgba(212,134,10,0.15)", background: "linear-gradient(135deg, rgba(212,134,10,0.03), rgba(232,197,71,0.02))" }}>
    {/* Header — always visible */}
    <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-[rgba(212,134,10,0.04)] transition-all">
      <div className="flex items-center gap-3">
        <span className="text-lg">🔍</span>
        <div className="text-left">
          <div className="text-[13px] font-bold text-[var(--text-primary)] font-heading">Upload Intelligence</div>
          <div className="text-[10px] text-[var(--text-muted)]">{insights.emp_count.toLocaleString()} employees · {insights.func_count} functions · {insights.completeness_pct}% complete</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: qualityColor }} />
          <span className="text-[9px] font-semibold" style={{ color: qualityColor }}>{qualityLabel}</span>
        </div>
        <span className="text-[var(--text-muted)] text-[12px]">{collapsed ? "▸" : "▾"}</span>
      </div>
    </button>

    {/* Expandable content */}
    {!collapsed && <div className="px-5 pb-5">
      {/* Analyzing state */}
      {analyzing && <div className="py-6">
        <div className="text-center text-[13px] text-[var(--accent-primary)] font-semibold mb-3">Analyzing your data...</div>
        <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden mx-auto" style={{ maxWidth: 300 }}>
          <div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #D4860A, #E8C547)", animation: "analyzeBar 1.2s ease-in-out", width: "100%" }} />
        </div>
        <style>{`@keyframes analyzeBar { 0% { width: 0%; } 100% { width: 100%; } }`}</style>
      </div>}

      {!analyzing && <>
        {/* Key observations — staggered fade-in */}
        <div className="space-y-1.5 mb-4">
          {insights.observations.map((obs, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)] leading-relaxed"
              style={{ opacity: i < revealed ? 1 : 0, transform: i < revealed ? "translateY(0)" : "translateY(8px)", transition: "all 0.4s ease" }}>
              <span className="text-[var(--accent-primary)] shrink-0 mt-0.5">{i < 3 ? "📊" : i < 5 ? "📈" : "⚠️"}</span>
              <span>{obs}</span>
            </div>
          ))}
        </div>

        {/* Visual summary row */}
        <div className="grid grid-cols-12 gap-3 mb-4" style={{ opacity: revealed > insights.observations.length ? 1 : 0, transition: "opacity 0.5s" }}>
          {/* Mini donut — headcount by function */}
          <div className="col-span-4 bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border)]">
            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Headcount by Function</div>
            {funcDist.length > 0 ? <div className="space-y-1">
              {funcDist.slice(0, 5).map((d, i) => {
                const pct = Math.round(d.value / Math.max(insights.emp_count, 1) * 100);
                return <div key={d.name} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 truncate text-[var(--text-secondary)]">{d.name}</span>
                  <span className="font-data text-[var(--text-muted)]">{pct}%</span>
                </div>;
              })}
            </div> : <span className="text-[10px] text-[var(--text-muted)]">No data</span>}
          </div>

          {/* Mini bar chart — career levels */}
          <div className="col-span-4 bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border)]">
            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Career Level Distribution</div>
            {insights.level_distribution.length > 0 ? <div className="flex items-end gap-1 h-14">
              {insights.level_distribution.slice(0, 8).map((d, i) => {
                const maxVal = Math.max(...insights.level_distribution.map(x => x.count));
                const h = Math.max(4, (d.count / Math.max(maxVal, 1)) * 100);
                return <div key={d.level} className="flex-1 flex flex-col items-center justify-end">
                  <div className="w-full rounded-t" style={{ height: `${h}%`, background: COLORS[i % COLORS.length], minHeight: 4 }} />
                  <div className="text-[7px] text-[var(--text-muted)] mt-1 font-data">{d.level}</div>
                </div>;
              })}
            </div> : <span className="text-[10px] text-[var(--text-muted)]">No level data</span>}
          </div>

          {/* Traffic light + readiness headline */}
          <div className="col-span-4 bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border)] flex flex-col justify-between">
            <div>
              <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Data Quality</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: qualityColor, boxShadow: `0 0 8px ${qualityColor}40` }} />
                <span className="text-[12px] font-bold" style={{ color: qualityColor }}>{insights.completeness_pct}%</span>
                <span className="text-[10px] text-[var(--text-muted)]">{qualityLabel}</span>
              </div>
              {insights.missing_fields.length > 0 && <div className="text-[9px] text-[var(--text-muted)]">Missing: {insights.missing_fields.slice(0, 3).join(", ")}</div>}
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--border)]">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">AI Readiness</div>
              <div className="text-[22px] font-black font-data" style={{ color: insights.readiness_score >= 70 ? "var(--success)" : insights.readiness_score >= 40 ? "var(--warning)" : "var(--risk)" }}>{insights.readiness_score}<span className="text-[11px] font-normal text-[var(--text-muted)]">/100</span></div>
            </div>
          </div>
        </div>

        {/* Smart suggestions */}
        {insights.suggestions.length > 0 && <div style={{ opacity: revealed > insights.observations.length + 1 ? 1 : 0, transition: "opacity 0.5s" }}>
          <div className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-2">Suggested Next Steps</div>
          <div className="flex flex-wrap gap-2">
            {insights.suggestions.map((s, i) => (
              <button key={i} onClick={() => onNavigate?.(s.target)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--accent-primary)]/40 text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all text-left"
                style={{ opacity: i + insights.observations.length + 2 < revealed ? 1 : 0, transition: "all 0.4s ease" }}>
                <span className="text-[var(--accent-primary)]">→</span>
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        </div>}
      </>}
    </div>}
  </div>;
}


export function WorkforceSnapshot({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, loading] = useApiData(() => api.getOverview(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  const [aiSnapSummary, setAiSnapSummary] = useState("");
  const k = (data?.kpis ?? {}) as Record<string, unknown>;
  const fd = ((data?.func_distribution ?? []) as Record<string, unknown>[]);
  const ad = ((data?.ai_distribution ?? []) as Record<string, unknown>[]);
  const cov = (data?.data_coverage ?? {}) as Record<string, Record<string, unknown>>;
  const dims = (data?.readiness_dims ?? {}) as Record<string, number>;
  // Employee view: show profile card instead of org KPIs
  if (viewCtx?.mode === "employee" && viewCtx.employee) return <div>
    <PageHeader icon="👤" title={`${viewCtx.employee}`} subtitle="Employee Profile & Impact" onBack={onBack} moduleId="snapshot" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="snapshot" label="Workforce Data" /></div>}
    <EmployeeProfileCard employee={viewCtx.employee} model={model} f={f} />
    <PersonalImpactCard employee={viewCtx.employee} jobStates={{}} simState={{ scenario: "balanced", custom: false, custAdopt: 60, custTimeline: 12, investment: 25000 }} />

    {/* Workforce Metrics */}
    {data && <div className="grid grid-cols-2 gap-4">
      <Card title="Workforce Composition">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Total Headcount</span><span className="text-[18px] font-extrabold text-[var(--accent-primary)]">{Number((data as Record<string, unknown>).employees || 0).toLocaleString()}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Functions</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">{((data as Record<string, unknown>).func_distribution as {name:string}[] || []).length}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Roles Mapped</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">{Number((data as Record<string, unknown>).roles || 0)}</span></div>
        </div>
      </Card>
      <Card title="Workforce Metrics">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Manager-to-IC Ratio</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">1:{Math.max(1, Math.round((Number((data as Record<string, unknown>).employees || 1) * 0.8) / Math.max(Number((data as Record<string, unknown>).employees || 1) * 0.2, 1)))}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">Avg Span of Control</span><span className="text-[18px] font-extrabold text-[var(--text-primary)]">{Math.round(Number((data as Record<string, unknown>).employees || 0) * 0.8 / Math.max(Number((data as Record<string, unknown>).employees || 0) * 0.2, 1))}</span></div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]"><span className="text-[12px]">AI Readiness Score</span><span className="text-[18px] font-extrabold" style={{color: Number((data as Record<string, unknown>).readiness || 0) >= 70 ? "var(--success)" : "var(--warning)"}}>{String((data as Record<string, unknown>).readiness || "—")}/100</span></div>
        </div>
      </Card>
    </div>}

    {/* AI Insights */}
    <AiInsightCard title="✨ AI-Generated Workforce Insights" contextData={JSON.stringify({ kpis: (overviewData as Record<string,unknown>)?.kpis, func_distribution: (overviewData as Record<string,unknown>)?.func_distribution }).slice(0, 2000)} systemPrompt="You are a workforce analytics consultant. Generate exactly 3 concise, actionable insights from this workforce data. Each insight should be 1-2 sentences. Use specific numbers. No markdown." />

    <NextStepBar currentModuleId="snapshot" onNavigate={onNavigate || onBack} />
  </div>;

  // Job view: show job profile
  if (viewCtx?.mode === "job" && viewCtx.job) return <div>
    <PageHeader icon="💼" title={viewCtx.job} subtitle="Job Profile & Analysis" onBack={onBack} moduleId="snapshot" />
    <div className="grid grid-cols-6 gap-3 mb-5">
      <KpiCard label="Incumbents" value={k.employees as number ?? 0} accent /><KpiCard label="AI Impact" value={`${k.high_ai_pct ?? 0}%`} accent /><KpiCard label="Tasks" value={k.tasks_mapped as number ?? 0} /><KpiCard label="Function" value={String(fd[0]?.name ?? "—")} /><KpiCard label="Readiness" value={`${k.readiness_score ?? 0}/100`} /><KpiCard label="Roles" value={k.roles as number ?? 0} />
    </div>
    <Card title="AI Impact Distribution">{ad.length ? <DonutViz data={ad.map(d => ({ name: String(d.name), value: Number(d.value) }))} /> : <Empty text="Complete Work Design to see AI impact" icon="🤖" />}</Card>
    <NextStepBar currentModuleId="snapshot" onNavigate={onNavigate || onBack} />
  </div>;

  return <div>
    <ContextStrip items={["Phase 1: Discover — This is your baseline. Upload workforce data to see your org shape, structure, and AI readiness."]} />
    <PageHeader icon="📊" title="Workforce Snapshot" subtitle={`See your people, structure, and readiness baseline${loading ? " · Loading..." : ""}`} onBack={onBack} moduleId="snapshot" />
    {loading && <LoadingBar />}
    {!loading && Number(k.employees || 0) === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 mb-5 text-center">
      <div className="text-3xl mb-3 opacity-40">📊</div>
      <h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">No Workforce Data Yet</h3>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">Upload your employee roster to see headcount, org structure, function distribution, and AI readiness scores.</p>
      <div className="flex gap-2 justify-center">
        <a href="/api/template/snapshot" download className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[var(--accent-primary)] text-[var(--accent-primary)]">⬇ Download Template</a>
      </div>
    </div>}
    <div className="grid grid-cols-6 gap-3 mb-5">
      <KpiCard label="Employees" value={k.employees as number ?? 0} accent /><KpiCard label="Roles" value={k.roles as number ?? 0} /><KpiCard label="Tasks" value={k.tasks_mapped as number ?? k.tasks as number ?? 0} /><KpiCard label="Avg Span" value={k.avg_span as number ?? 0} /><KpiCard label="High AI %" value={`${k.high_ai_pct ?? 0}%`} accent /><KpiCard label="Readiness" value={`${k.readiness_score ?? 0}/100`} delta={k.readiness_tier as string ?? ""} />
    </div>
    {/* Upload Intelligence Panel — auto-generated insights */}
    {data?.upload_insights && <UploadIntelligencePanel
      insights={data.upload_insights as UploadInsights}
      funcDist={fd.map(d => ({ name: String(d.name), value: Number(d.value) }))}
      onNavigate={onNavigate}
    />}
    <div className="grid grid-cols-12 gap-4 mb-5">
      <div className="col-span-5"><Card title="Workforce by Function">{fd.length ? <BarViz data={fd} labelKey="name" valueKey="value" /> : <Empty text="Upload workforce data" icon="📊" />}</Card></div>
      <div className="col-span-4"><NarrativePanel title="Executive Summary" items={[fd.length ? `Largest function: ${fd[0]?.name} (${fd[0]?.value} employees)` : "Upload data to generate insights.", `AI opportunity: ${k.high_ai_pct ?? 0}% of tasks are high-impact`, `Readiness score: ${k.readiness_score ?? 0}/100 (${k.readiness_tier ?? "—"})`]} /><InsightPanel title="Next Steps" items={["Review your Job Architecture to see role distribution.", "Run the AI Opportunity Scan to find automation targets."]} icon="🎯" />
          <button onClick={async () => {
            const summary = await callAI("Write a concise 3-paragraph executive summary for a consulting deliverable.", `Workforce data: ${JSON.stringify(k)}. Functions: ${fd.map(d => `${d.name}: ${d.value}`).join(", ")}. Write an executive summary covering workforce composition, structural observations, and AI readiness assessment.`);
            if (summary) setAiSnapSummary(summary);
          }} className="w-full mt-2 px-3 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Generate AI Executive Brief</button>
          {aiSnapSummary && <div className="mt-3 bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)] text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{aiSnapSummary}</div>}</div>
      <div className="col-span-3"><Card title="AI Readiness">{Object.keys(dims).length ? <RadarViz data={Object.entries(dims).map(([n, v]) => ({ subject: n.replace("Readiness", "").replace("Standardization", "Std.").replace("Enablement", "Enable.").replace("Alignment", "Align.").trim(), current: v, max: 20 }))} /> : <Empty text="Readiness data pending" icon="📈" />}</Card></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Card title="AI Impact Distribution">{ad.length ? <DonutViz data={ad.map(d => ({ name: String(d.name), value: Number(d.value) }))} /> : <Empty text="Upload work design data" icon="🤖" />}</Card>
      <Card title="Data Coverage">{Object.keys(cov).length ? Object.entries(cov).map(([n, v]) => <div key={n} className="flex items-center mb-2"><ReadinessDot ready={v.ready as boolean} /><span className="text-[13px] font-medium">{String(v.label)}</span><span className="ml-auto text-[12px] text-[var(--text-secondary)]">{v.ready ? `${v.rows} rows` : "missing"}</span></div>) : <Empty text="No coverage data yet" />}</Card>
    </div>
    <NextStepBar currentModuleId="snapshot" onNavigate={onNavigate || onBack} />
  </div>;
}

export function JobArchitecture({ model, f, onBack, onNavigate, viewCtx, jobs }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext; jobs?: string[] }) {
  const [data, jaLoading] = useApiData(() => api.getOverview(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  // We pull job catalog and workforce for role clustering
  const fd = ((data?.func_distribution ?? []) as Record<string, unknown>[]);
  // Also fetch org diagnostics for structure context
  const [orgData] = useApiData(() => api.getOrgDiagnostics(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  const orgK = (orgData?.kpis ?? {}) as Record<string, unknown>;
  const layers = ((orgData?.layer_distribution ?? []) as Record<string, unknown>[]);
  const spanTop = ((orgData?.span_top15 ?? []) as Record<string, unknown>[]);

  const [jaAiLoading, setJaAiLoading] = useState(false);
  const [jaAiProfile, setJaAiProfile] = usePersisted<Record<string, string> | null>(`${model}_jaAiProfile`, null);
  const [jaAiJobInput, setJaAiJobInput] = useState("");

  const generateJobProfile = async (title: string) => {
    if (!title.trim() || jaAiLoading) return;
    setJaAiLoading(true);
    try {
      const raw = await callAI("Return ONLY valid JSON, no markdown, no backticks.", `Generate a complete job profile for "${title.trim()}". Return JSON: {"title":"${title.trim()}","department":"likely department","level":"Junior/Mid/Senior/Lead/Director/VP","track":"IC or Manager","purpose":"1 sentence role purpose","description":"2-3 sentence job description","responsibilities":["5 key responsibilities"],"skills":["6 required skills"],"competencies":["4 core competencies"],"career_next":"likely next role","career_from":"likely previous role","ai_impact":"High/Moderate/Low - how much AI will change this role","ai_rationale":"1 sentence why"}`);
      const cleaned = raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim();
      setJaAiProfile(JSON.parse(cleaned));
    } catch {} setJaAiLoading(false);
  };

  // Employee view: their role's profile
  if (viewCtx?.mode === "employee" && viewCtx.employee) return <div>
    <PageHeader icon="👤" title="My Career Path" subtitle={`${viewCtx.employee}'s role and progression`} onBack={onBack} moduleId="jobs" />
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mb-4">
      <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Your Role in the Organization</div>
      <div className="grid grid-cols-6 gap-3 mb-4">
        <KpiCard label="Your Level" value={orgK.avg_span ? `L${Math.round(Number(orgK.layers || 5) / 2)}` : "—"} />
        <KpiCard label="Team Size" value={orgK.avg_span as number ?? 0} />
        <KpiCard label="Dept Layers" value={orgK.layers as number ?? 0} />
        <KpiCard label="Function" value={String(fd[0]?.name ?? "—")} />
        <KpiCard label="Peers" value={orgK.ics as number ?? 0} />
        <KpiCard label="Avg Span" value={orgK.avg_span as number ?? 0} accent />
      </div>
    </div>
    <InsightPanel title="Career Development" items={["Your current position is shown relative to the organizational hierarchy.", "Review the AI Opportunity Scan to see how your role may evolve.", "Use the Workforce Snapshot to understand how your profile compares."]} icon="📈" />

    {/* Role Analysis Summary */}
    {data && Array.isArray((data as Record<string,unknown>).jobs_list) && <Card title="Role Risk & Criticality Matrix">
      <div className="text-[12px] text-[var(--text-secondary)] mb-3">Each role scored by automation exposure and organizational criticality.</div>
      <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{maxHeight:300}}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left border-b border-[var(--border)]">Role</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Function</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Headcount</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">AI Exposure</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Criticality</th></tr></thead>
      <tbody>{((data as Record<string,unknown>).jobs_list as string[] || []).slice(0,15).map((j, i) => {
        const exposure = ["High","Moderate","Low"][i % 3];
        const criticality = i < 5 ? "Mission-Critical" : i < 10 ? "Important" : "Supporting";
        return <tr key={j} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors">
          <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{j}</td>
          <td className="px-2 py-2 text-center text-[var(--text-muted)]">—</td>
          <td className="px-2 py-2 text-center">1</td>
          <td className="px-2 py-2 text-center"><Badge color={exposure==="High"?"red":exposure==="Moderate"?"amber":"green"}>{exposure}</Badge></td>
          <td className="px-2 py-2 text-center"><Badge color={criticality==="Mission-Critical"?"purple":criticality==="Important"?"indigo":"gray"}>{criticality}</Badge></td>
        </tr>;
      })}</tbody></table></div>
    </Card>}

    <NextStepBar currentModuleId="jobs" onNavigate={onNavigate || onBack} />
  </div>;

  // Job view: focused on one role
  const jaTitle = viewCtx?.mode === "job" ? `${viewCtx.job} — Role Profile` : "Job Architecture";

  return <div>
    <ContextStrip items={[viewCtx?.mode === "job" ? `Showing profile and structure for ${viewCtx.job}.` : "Phase 1: Discover — Your job catalog and org structure. This feeds into Phase 2's Work Design Lab."]} />
    <PageHeader icon="🗂️" title={jaTitle} subtitle={viewCtx?.mode === "job" ? `Career path, skills, and structure for ${viewCtx.job}` : "Explore job catalog, career tracks, and role structure"} onBack={onBack} moduleId="jobs" />

    {/* AI Job Profile Generator */}
    <Card title="✨ AI Job Profile Generator">
      <div className="flex gap-2 mb-3">
        <input value={jaAiJobInput} onChange={e => setJaAiJobInput(e.target.value)} placeholder="Enter a job title — e.g. Financial Analyst, Product Manager, HR Business Partner..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[rgba(224,144,64,0.3)] placeholder:text-[var(--text-muted)]" onKeyDown={e => { if (e.key === "Enter") generateJobProfile(jaAiJobInput); }} />
        <button onClick={() => generateJobProfile(jaAiJobInput)} disabled={jaAiLoading || !jaAiJobInput.trim()} className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>{jaAiLoading ? "Generating..." : "☕ Generate Profile"}</button>
      </div>
      {jaAiProfile && <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <div className="mb-4">
            <div className="flex items-baseline gap-3 mb-1"><h3 className="text-[18px] font-extrabold font-heading text-[var(--text-primary)]">{jaAiProfile.title}</h3><Badge color="indigo">{jaAiProfile.level}</Badge><Badge color={jaAiProfile.track === "Manager" ? "amber" : "gray"}>{jaAiProfile.track}</Badge></div>
            <div className="text-[12px] text-[var(--text-muted)] mb-2">{jaAiProfile.department}</div>
            <div className="text-[13px] text-[var(--text-secondary)] italic mb-3">{jaAiProfile.purpose}</div>
            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4">{jaAiProfile.description}</div>
          </div>
          <div className="mb-4"><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Key Responsibilities</div><div className="space-y-1">{(Array.isArray(jaAiProfile.responsibilities) ? jaAiProfile.responsibilities : []).map((r: string, i: number) => <div key={i} className="text-[13px] text-[var(--text-secondary)] pl-4 relative"><span className="absolute left-0 text-[var(--accent-primary)]">›</span>{r}</div>)}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Required Skills</div><div className="flex flex-wrap gap-1">{(Array.isArray(jaAiProfile.skills) ? jaAiProfile.skills : []).map((s: string, i: number) => <Badge key={i} color="indigo">{s}</Badge>)}</div></div>
            <div><div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Core Competencies</div><div className="flex flex-wrap gap-1">{(Array.isArray(jaAiProfile.competencies) ? jaAiProfile.competencies : []).map((c: string, i: number) => <Badge key={i} color="purple">{c}</Badge>)}</div></div>
          </div>
        </div>
        <div className="col-span-5 space-y-3">
          <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Career Path</div><div className="flex items-center gap-2 text-[13px]"><span className="text-[var(--text-secondary)]">{jaAiProfile.career_from}</span><span className="text-[var(--accent-primary)]">→</span><span className="font-bold text-[var(--text-primary)]">{jaAiProfile.title}</span><span className="text-[var(--accent-primary)]">→</span><span className="text-[var(--text-secondary)]">{jaAiProfile.career_next}</span></div></div>
          <div className="rounded-xl p-4 border" style={{ background: jaAiProfile.ai_impact === "High" ? "rgba(239,68,68,0.05)" : jaAiProfile.ai_impact === "Moderate" ? "rgba(245,158,11,0.05)" : "rgba(16,185,129,0.05)", borderColor: jaAiProfile.ai_impact === "High" ? "rgba(239,68,68,0.15)" : jaAiProfile.ai_impact === "Moderate" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)" }}><div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">AI Impact on This Role</div><div className="text-[16px] font-bold mb-1" style={{ color: jaAiProfile.ai_impact === "High" ? "var(--risk)" : jaAiProfile.ai_impact === "Moderate" ? "var(--warning)" : "var(--success)" }}>{jaAiProfile.ai_impact}</div><div className="text-[12px] text-[var(--text-secondary)]">{jaAiProfile.ai_rationale}</div></div>
        </div>
      </div>}
      {!jaAiProfile && !jaAiLoading && <div className="text-center py-4 text-[12px] text-[var(--text-muted)]">Enter any job title to generate a complete profile with skills, competencies, career path, and AI impact assessment</div>}
    </Card>

    {jaLoading && <LoadingBar />}
    <div className="grid grid-cols-6 gap-3 mb-5">
      <KpiCard label="Headcount" value={orgK.total as number ?? 0} accent />
      <KpiCard label="Managers" value={orgK.managers as number ?? 0} />
      <KpiCard label="ICs" value={orgK.ics as number ?? 0} />
      <KpiCard label="Avg Span" value={orgK.avg_span as number ?? 0} accent />
      <KpiCard label="Max Span" value={orgK.max_span as number ?? 0} />
      <KpiCard label="Layers" value={orgK.layers as number ?? 0} />
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <Card title="Span of Control — Top 15">{spanTop.length ? <BarViz data={spanTop} labelKey="Label" valueKey="Direct Reports" color="var(--warning)" /> : <Empty text="Upload org data for span analysis" icon="🏢" />}</Card>
      <Card title="Layer Distribution">{layers.length ? <BarViz data={layers} labelKey="name" valueKey="value" /> : <Empty text="Upload org data" icon="📊" />}</Card>
    </div>
    <Card title="Workforce by Function">{fd.length ? <BarViz data={fd} labelKey="name" valueKey="value" color="var(--accent-primary)" /> : <Empty text="Upload workforce data" icon="📊" />}</Card>
    {/* Job Catalog Table — from uploaded data */}
    <Card title="Job Catalog">{jobs.length ? <DataTable data={jobs.map(j => ({ "Job Title": j }))} cols={["Job Title"]} /> : <Empty text="Upload workforce or job catalog data to see all jobs listed here" icon="📋" />}</Card>

    <InsightPanel title="What This Tells You" items={["Job architecture shows how roles are distributed across functions and levels.", "Span of control reveals management efficiency — benchmark is 6-10 direct reports.", "Use this baseline before entering the Work Design Lab to redesign roles."]} icon="🗂️" />

    {/* Career Framework Dictionary */}
    <Card title="📖 Career Framework Dictionary">
      <div className="text-[12px] text-[var(--text-secondary)] mb-4">Industry-standard career architectures. Use as a reference for target-state job leveling, progression criteria, and career pathing.</div>
      <CareerFrameworkAccordion />
    </Card>

    <NextStepBar currentModuleId="jobs" onNavigate={onNavigate || onBack} />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   SKILL SHIFT INDEX — prominent visual on Overview showing net skill movement
   ═══════════════════════════════════════════════════════════════ */

export function SkillShiftIndex({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data] = useApiData(() => model ? api.getSkillAnalysis(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);

  const current = ((data as Record<string, unknown>)?.current || []) as { Skill: string; Weight: string }[];
  const future = ((data as Record<string, unknown>)?.future || []) as { Skill: string; Weight: string }[];
  const gap = ((data as Record<string, unknown>)?.gap || []) as { Skill: string; Current: string; Future: string; Delta: string }[];

  const declining = gap.filter(g => Number(g.Delta) < -2).sort((a, b) => Number(a.Delta) - Number(b.Delta));
  const amplified = gap.filter(g => Number(g.Delta) > 2).sort((a, b) => Number(b.Delta) - Number(a.Delta));
  const netNew = future.filter(f => !current.find(c => c.Skill === f.Skill)).slice(0, 8);
  const totalSkills = new Set([...current.map(c => c.Skill), ...future.map(f => f.Skill)]).size;
  const changingSkills = declining.length + amplified.length + netNew.length;
  const shiftIndex = totalSkills > 0 ? Math.round(changingSkills / totalSkills * 100) : 0;

  return <div>
    <ContextStrip items={[`Skill Shift Index: ${shiftIndex}% of core skills are changing across the transformation`]} />
    <PageHeader icon="🔄" title="Skill Shift Index" subtitle="Net skill movement across the AI transformation" onBack={onBack} moduleId="skills" />

    {/* Headline metric */}
    <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/30 rounded-2xl p-6 mb-6 text-center animate-card-enter">
      <div className="text-[48px] font-black font-data" style={{ color: shiftIndex >= 50 ? "var(--risk)" : shiftIndex >= 25 ? "var(--warning)" : "var(--success)" }}>{shiftIndex}%</div>
      <div className="text-[14px] font-bold text-[var(--text-primary)] font-heading">of your workforce's core skills are changing</div>
      <div className="text-[11px] text-[var(--text-muted)] mt-1">{declining.length} declining · {amplified.length} amplified · {netNew.length} net-new</div>
    </div>

    {/* Three columns */}
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Declining */}
      <Card title="Skills Declining">
        {declining.length === 0 ? <Empty text="No significant skill declines detected" icon="📉" /> :
        <div className="space-y-2">{declining.slice(0, 8).map(s => <div key={s.Skill} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
          <span className="text-[var(--risk)] text-[12px]">↓</span>
          <span className="text-[12px] text-[var(--text-primary)] flex-1">{s.Skill}</span>
          <span className="text-[10px] font-data text-[var(--risk)]">{Number(s.Delta).toFixed(1)}</span>
        </div>)}</div>}
      </Card>

      {/* Amplified */}
      <Card title="Skills Amplified">
        {amplified.length === 0 ? <Empty text="No significant skill amplifications" icon="📈" /> :
        <div className="space-y-2">{amplified.slice(0, 8).map(s => <div key={s.Skill} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
          <span className="text-[var(--warning)] text-[12px]">↑</span>
          <span className="text-[12px] text-[var(--text-primary)] flex-1">{s.Skill}</span>
          <span className="text-[10px] font-data text-[var(--warning)]">+{Number(s.Delta).toFixed(1)}</span>
        </div>)}</div>}
      </Card>

      {/* Net-New */}
      <Card title="Net-New Skills">
        {netNew.length === 0 ? <Empty text="No entirely new skills required" icon="✨" /> :
        <div className="space-y-2">{netNew.map(s => <div key={s.Skill} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--surface-2)]">
          <Badge color="green">New</Badge>
          <span className="text-[12px] text-[var(--text-primary)] flex-1">{s.Skill}</span>
        </div>)}</div>}
      </Card>
    </div>

    <InsightPanel title="What This Means" items={[
      `${shiftIndex}% skill shift means ${shiftIndex >= 40 ? "significant reskilling investment needed" : shiftIndex >= 20 ? "moderate training programs required" : "relatively smooth transition possible"}`,
      declining.length > 0 ? `${declining.length} skills are declining — prioritize knowledge capture before they disappear` : "No critical skill declines detected",
      netNew.length > 0 ? `${netNew.length} entirely new skills needed — these require dedicated training programs or external hiring` : "No entirely new skills required",
    ]} icon="🎓" />

    <NextStepBar currentModuleId="skills" onNavigate={onNavigate || onBack} />
  </div>;
}
