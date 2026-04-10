"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, CartesianGrid, Legend } from "recharts";

export type ViewContext = { mode: string; employee: string; job: string; custom: Record<string, string> };

export const COLORS = ["#D4860A","#C07030","#E8C547","#B8602A","#D97706","#F59E0B","#A0522D","#E09040"];

/* ── AI Helper — routes all AI calls through backend Gemini proxy ── */
let _aiRemaining = 20;
export function getAiRemaining() { return _aiRemaining; }

export async function callAI(system: string, message: string, retries = 1): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      const resp = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, message }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1500)); continue; }
        return "[AI unavailable — backend returned an error. Check that your backend is running on port 8000.]";
      }
      const data = await resp.json();
      // Track remaining requests
      if (typeof data.remaining === "number") _aiRemaining = data.remaining;
      if (data.error) {
        // Don't retry on rate limit or key errors — they won't resolve
        if (data.text?.includes("Rate limit") || data.text?.includes("API key") || data.text?.includes("revoked")) {
          return data.text;
        }
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1500)); continue; }
        return data.text || "[AI error — try again]";
      }
      return data.text || "";
    } catch (e) {
      console.error(`AI call attempt ${attempt + 1} failed:`, e);
      if (attempt < retries) { await new Promise(r => setTimeout(r, 1500)); continue; }
      return "[AI unavailable — could not connect to backend. Make sure the backend is running on port 8000.]";
    }
  }
  return "";
}
// ── AI Insight Card — reusable collapsible card for Gemini-powered insights ──
export function AiInsightCard({ title, contextData, systemPrompt, moduleId }: { title: string; contextData: string; systemPrompt?: string; moduleId?: string }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    const sys = systemPrompt || "You are an AI transformation consultant. Provide 3 concise, actionable insights based on the data. Be specific with numbers. No markdown formatting.";
    const result = await callAI(sys, `Analyze this data and provide key insights: ${contextData.slice(0, 3000)}`);
    setInsight(result);
    setGenerated(true);
    setExpanded(true);
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(insight).then(() => showToast("Copied to clipboard"));
  };

  return <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden mb-3 transition-all hover:border-[var(--accent-primary)]/20">
    <button onClick={() => generated ? setExpanded(!expanded) : generate()} className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[var(--hover)]">
      <span className="text-[14px]">{loading ? "⏳" : "✨"}</span>
      <span className="text-[12px] font-semibold text-[var(--text-primary)] flex-1 font-heading">{title}</span>
      {loading && <span className="text-[10px] text-[var(--accent-primary)]">Generating...</span>}
      {generated && !loading && <span className="text-[10px] text-[var(--text-muted)]">{expanded ? "▲" : "▼"}</span>}
      {!generated && !loading && <span className="text-[10px] text-[var(--accent-primary)] font-semibold">Generate</span>}
    </button>
    {expanded && insight && <div className="px-4 pb-3 border-t border-[var(--border)]">
      <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed mt-3 whitespace-pre-line">{insight}</div>
      <div className="flex gap-2 mt-3">
        <button onClick={copy} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">📋 Copy</button>
        <button onClick={generate} disabled={loading} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">↻ Regenerate</button>
      </div>
    </div>}
  </div>;
}

// Global toast notification
export function ModuleExportButton({ model, module, label }: { model: string; module: string; label?: string }) {
  const [exporting, setExporting] = useState(false);
  return <button onClick={async () => {
    setExporting(true);
    try {
      const resp = await fetch(`/api/export/module/${model}/${module}`);
      if (resp.ok) { const blob = await resp.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${module}_export.xlsx`; a.click(); URL.revokeObjectURL(url); showToast(`📥 ${label || module} exported`); }
      else showToast("Export failed");
    } catch { showToast("Export failed — check backend"); }
    setExporting(false);
  }} disabled={exporting} className="px-3 py-1 rounded-lg text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent-primary)]/30 hover:text-[var(--accent-primary)] transition-all" style={{opacity: exporting ? 0.5 : 1}}>
    {exporting ? "..." : "↓ Export"}
  </button>;
}

let _globalToast: ((msg: string) => void) | null = null;
export function setGlobalToast(fn: (msg: string) => void) { _globalToast = fn; }
export function showToast(msg: string) { if (_globalToast) _globalToast(msg); }
let _globalLogDecision: ((module: string, action: string, detail: string) => void) | null = null;
export function setGlobalLogDecision(fn: (module: string, action: string, detail: string) => void) { _globalLogDecision = fn; }
export function logDec(module: string, action: string, detail: string) { if (_globalLogDecision) _globalLogDecision(module, action, detail); }

// Global Decision Log — tracks all decisions across modules
export function useDecisionLog(projectId: string) {
  const [log, setLog] = usePersisted<{ts: string; module: string; action: string; detail: string}[]>(`${projectId}_decisionLog`, []);
  const logDecision = useCallback((module: string, action: string, detail: string) => {
    setLog(prev => [...prev, { ts: new Date().toISOString(), module, action, detail }].slice(-100));
  }, [setLog]);
  return { log, logDecision, clearLog: () => setLog([]) };
}

// Global Risk Register — aggregated risks
export function useRiskRegister(projectId: string) {
  const [risks, setRisks] = usePersisted<{id: string; source: string; risk: string; probability: string; impact: string; mitigation: string; status: string}[]>(`${projectId}_riskRegister`, []);
  const addRisk = useCallback((source: string, risk: string, probability: string, impact: string, mitigation: string) => {
    setRisks(prev => [...prev, { id: `R${prev.length+1}`, source, risk, probability, impact, mitigation, status: "Open" }]);
  }, [setRisks]);
  const updateRisk = useCallback((id: string, updates: Partial<{status: string; mitigation: string}>) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, [setRisks]);
  return { risks, addRisk, updateRisk };
}

export const TT: React.CSSProperties = { background: "#1A2340", border: "1px solid #2A3555", borderRadius: 8, fontSize: 12, color: "#E8ECF4" };

/* ═══════════════════════════════════════════════════════════════
   ERROR BOUNDARY — prevents white screen crashes
   ═══════════════════════════════════════════════════════════════ */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return this.props.fallback || <div className="p-8 text-center"><div className="text-3xl mb-3">⚠️</div><h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Something went wrong</h3><p className="text-[13px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">{this.state.error?.message || "An unexpected error occurred. Try refreshing the page."}</p><button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent-primary)] text-white">Try Again</button></div>;
    return this.props.children;
  }
}

export function KpiCard({ label, value, accent, delta }: { label: string; value: string | number; accent?: boolean; delta?: string }) {
  return <div className={`bg-[var(--surface-1)] border rounded-xl px-5 py-4 card-hover hover:border-[var(--accent-primary)]/30 animate-card-enter ${accent ? "border-l-[3px] border-l-[var(--accent-primary)] border-[var(--border)]" : "border-[var(--border)]"}`}>
    <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</div>
    <div className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-data">{value}</div>
    {delta && <div className="text-[11px] font-semibold text-[var(--success)] mt-1">{delta}</div>}
  </div>;
}

export function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mb-4 animate-card-enter">
    {title && <h3 className="text-sm font-semibold text-[var(--text-primary)] pb-2 mb-3 border-b border-[var(--border)] font-heading">{title}</h3>}
    {children}
  </div>;
}

export function Empty({ text, icon = "📭" }: { text: string; icon?: string }) {
  return <div className="text-center py-12 text-[var(--text-secondary)]"><div className="text-3xl mb-2 opacity-40">{icon}</div><div className="text-sm max-w-xs mx-auto leading-relaxed">{text}</div></div>;
}

export function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const s: Record<string, string> = { indigo: "bg-[rgba(212,134,10,0.15)] text-[var(--accent-primary)]", green: "bg-[rgba(16,185,129,0.15)] text-[var(--success)]", amber: "bg-[rgba(249,115,22,0.15)] text-[var(--warning)]", red: "bg-[rgba(239,68,68,0.15)] text-[var(--risk)]", purple: "bg-[rgba(139,92,246,0.15)] text-[var(--purple)]", gray: "bg-[rgba(163,177,198,0.12)] text-[var(--text-muted)]" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s[color] || s.gray}`}>{children}</span>;
}

export function InsightPanel({ title, items, icon = "💡" }: { title: string; items: string[]; icon?: string }) {
  return <Card><div className="flex items-center gap-2 text-[13px] font-bold mb-2">{icon} {title}</div><ul className="list-disc pl-4 space-y-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">{items.map((t, i) => <li key={i}>{t}</li>)}</ul></Card>;
}

/* ─── Help System: InfoButton + MODULE_HELP ─── */
export const MODULE_HELP: Record<string, { title: string; summary: string; pages?: { heading: string; body: string }[] }> = {
  snapshot: { title: "Workforce Snapshot", summary: "Baseline view of headcount, roles, functions, and readiness. Start here to understand current state.", pages: [
    { heading: "What it shows", body: "Total headcount, function breakdown, role count, task coverage %, and AI readiness score." },
    { heading: "How to use", body: "Review the 6 KPI cards for a quick health check. Drill into any function bar to filter downstream modules. Use the data quality indicator to identify gaps before designing." },
  ]},
  jobs: { title: "Job Architecture", summary: "Explore job families, career tracks, levels, and role clusters across your organization." },
  scan: { title: "AI Opportunity Scan", summary: "Identifies where AI creates the most value by scoring tasks on automation potential, time savings, and complexity." },
  readiness: { title: "AI Readiness", summary: "Individual and team readiness scores based on skill proficiency, change disposition, and current AI tool adoption." },
  mgrcap: { title: "Manager Capability", summary: "Assesses manager readiness to lead transformation — identifies champions, at-risk managers, and development needs." },
  skills: { title: "Skills & Talent", summary: "Skill inventory, gap analysis, and adjacency mapping. Identifies critical gaps and reskilling opportunities." },
  bbba: { title: "Build/Buy/Borrow/Automate", summary: "Talent sourcing strategy framework — recommends whether to reskill, hire, contract, or automate each redesigned role." },
  headcount: { title: "Headcount Planning", summary: "Current-to-future workforce waterfall showing net FTE impact of AI transformation." },
  design: { title: "Work Design Lab", summary: "Redesign jobs task-by-task. Deconstruct roles into tasks, apply AI impact scores, reconstruct new role profiles.", pages: [
    { heading: "Step 1: Context", body: "Select a job from the sidebar. Review the job description, incumbent count, and current task portfolio." },
    { heading: "Step 2: Deconstruct", body: "Break the role into its component tasks. Each task gets scored on type (repetitive/variable), logic (deterministic/probabilistic/judgment), and AI impact." },
    { heading: "Step 3: Reconstruct", body: "Apply an AI scenario (Conservative/Moderate/Aggressive) to see how tasks redistribute. The reconstructed role shows new time allocation." },
    { heading: "Step 4: Redeployment", body: "Freed capacity from AI automation flows into redeployment options — higher-value work, new roles, or cross-functional assignments." },
  ]},
  simulate: { title: "Impact Simulator", summary: "Model scenarios, costs, and redeployment outcomes. Compare conservative vs. aggressive AI adoption paths." },
  build: { title: "Org Design Studio", summary: "Reshape spans, layers, and org structure. Visualize reporting lines and identify structural inefficiencies." },
  reskill: { title: "Reskilling Pathways", summary: "Per-employee learning plans with timelines, investment estimates, and skill gap closure tracking." },
  marketplace: { title: "Talent Marketplace", summary: "Match internal candidates to redesigned roles based on skill adjacency and readiness scores." },
  changeready: { title: "Change Readiness", summary: "4-quadrant workforce segmentation — maps willingness vs. ability to adopt AI-driven changes." },
  mgrdev: { title: "Manager Development", summary: "Targeted development plans for people managers based on their capability assessment results." },
  plan: { title: "Change Planner", summary: "Sequence transformation initiatives into waves. Manage dependencies, risks, and milestone tracking." },
  export: { title: "Export & Report", summary: "Generate board-ready .docx transformation report with all findings, data, and recommendations." },
  opmodel: { title: "Operating Model Lab", summary: "Explore and design operating model architectures across functions, archetypes, and governance patterns.", pages: [
    { heading: "Function & Archetype", body: "Select a function (Finance, Technology, HR, etc.) and an archetype (Functional, Divisional, Matrix, Platform, Network) to generate a capability blueprint." },
    { heading: "Company Sandbox", body: "Click a company name (Toyota, Netflix, etc.) to seed full organizational data that flows through all platform tabs. The backend generates employees, tasks, skills, and operating model data." },
    { heading: "Blueprint Tab", body: "Shows the 5-layer architecture: Governance → Core → Shared → Enabling → Interface. Each capability auto-classifies into an AI service tier." },
    { heading: "KPI Alignment Tab", body: "Link strategic objectives to measurable KPIs. Track progress and build a traceability matrix connecting objectives → KPIs → operating model nodes." },
  ]},
  om_canvas: { title: "OM Design Canvas", summary: "Visual drag-and-drop canvas for designing operating model structures with FTE deltas and KPI linkage." },
  rolecompare: { title: "Role Comparison", summary: "Compare up to 4 roles side-by-side — current state metrics, task breakdown, AI impact, and redesigned outcomes.", pages: [
    { heading: "How to use", body: "Select 2-4 jobs from the picker. Each role card shows task count, AI-automatable percentage, and top tasks by time allocation." },
    { heading: "Redesigned view", body: "Roles that have been processed through the Work Design Lab show a 'Redesigned' badge with human vs. AI time split from your chosen scenario." },
  ]},
  quickwins: { title: "Quick-Win Identifier", summary: "Automatically surfaces the highest-ROI, lowest-effort AI automation opportunities across your organization.", pages: [
    { heading: "Scoring", body: "Each task is scored on ROI (time saved × impact level × logic type) and effort (repetitive = low, variable = medium, judgment = high). The combined score ranks opportunities." },
    { heading: "Categories", body: "Quick Wins are high-impact, low-effort. Strategic Bets are high-impact but need more investment. Easy Automations are simple but lower-impact." },
  ]},
  dashboard: { title: "Transformation Dashboard", summary: "Executive summary across all transformation phases — decision log, risk register, and progress tracking." },
};

export function HelpBookAccordion() {
  const [expandedId, setExpandedId] = useState<string|null>(null);
  return <div className="space-y-1">{Object.entries(MODULE_HELP).map(([id, h]) => <div key={id} className="rounded-xl border border-[var(--border)] overflow-hidden">
    <button onClick={() => setExpandedId(expandedId === id ? null : id)} className="w-full text-left px-4 py-2.5 flex items-center justify-between bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors cursor-pointer">
      <div className="flex items-center gap-2"><span className="text-[11px] font-bold text-[var(--accent-primary)]">{id.toUpperCase()}</span><span className="text-[12px] font-semibold text-[var(--text-primary)]">{h.title}</span></div>
      <span className="text-[var(--text-muted)] text-[10px]">{expandedId === id ? "▲" : "▼"}</span>
    </button>
    {expandedId === id && <div className="px-4 py-3 bg-[var(--surface-1)]">
      <p className="text-[12px] text-[var(--text-secondary)] mb-2">{h.summary}</p>
      {h.pages && h.pages.map((p, i) => <div key={i} className="ml-2 mb-2"><div className="text-[11px] font-bold text-[var(--text-primary)]">{p.heading}</div><div className="text-[11px] text-[var(--text-muted)] leading-relaxed">{p.body}</div></div>)}
    </div>}
  </div>)}</div>;
}

export function CareerFrameworkAccordion() {
  const [expandedIdx, setExpandedIdx] = useState<number|null>(0);
  return <>{CAREER_FRAMEWORKS.map((fw, fi) => <div key={fi} className="mb-3 rounded-xl border border-[var(--border)] overflow-hidden">
    <button onClick={() => setExpandedIdx(expandedIdx === fi ? null : fi)} className="w-full text-left px-4 py-3 flex items-center justify-between bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors cursor-pointer">
      <div className="flex items-center gap-2"><Badge color="purple">{fw.industry}</Badge><span className="text-[12px] font-bold text-[var(--text-primary)]">{fw.name}</span><span className="text-[10px] text-[var(--text-muted)]">{fw.levels.length} levels</span></div>
      <span className="text-[var(--text-muted)] text-[10px]">{expandedIdx === fi ? "▲" : "▼"}</span>
    </button>
    {expandedIdx === fi && <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]">
      {["Level","Title","Track","Span","Focus","Comp Range"].map(h => <th key={h} className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase text-[9px]">{h}</th>)}
    </tr></thead><tbody>
      {fw.levels.map((l, li) => <tr key={li} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
        <td className="px-3 py-2 font-bold text-[var(--accent-primary)]">{l.code}</td>
        <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{l.title}</td>
        <td className="px-3 py-2"><Badge color={l.track.includes("Executive")?"purple":l.track.includes("Manager")?"amber":"indigo"}>{l.track}</Badge></td>
        <td className="px-3 py-2 text-[var(--text-muted)]">{l.span}</td>
        <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[200px]">{l.focus}</td>
        <td className="px-3 py-2 font-semibold text-[var(--success)]">{l.comp_range}</td>
      </tr>)}
    </tbody></table></div>}
  </div>)}</>;
}

export function InfoButton({ moduleId }: { moduleId: string }) {
  const [open, setOpen] = useState(false);
  // Check both old MODULE_HELP and new KnowledgeBase for content
  const hasOldHelp = !!MODULE_HELP[moduleId];
  const title = MODULE_HELP[moduleId]?.title || moduleId;
  // Dynamic import to avoid circular dependency
  const [KnowledgeModal, setKM] = useState<React.ComponentType<{moduleId: string; onClose: () => void}> | null>(null);
  const loadModal = () => {
    import("./KnowledgeBase").then(m => { setKM(() => m.KnowledgeModal); setOpen(true); });
  };
  if (!hasOldHelp) return null;
  return <>
    <button onClick={loadModal} className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] cursor-pointer transition-all hover:scale-110" style={{ background: "rgba(212,134,10,0.1)", border: "1px solid rgba(212,134,10,0.2)", color: "var(--accent-primary)" }} title={`Help: ${title}`}>ℹ</button>
    {open && KnowledgeModal && <KnowledgeModal moduleId={moduleId} onClose={() => setOpen(false)} />}
  </>;
}


export function NarrativePanel({ title, items }: { title: string; items: string[] }) {
  return <div className="bg-gradient-to-br from-[var(--surface-2)] via-[rgba(212,134,10,0.06)] to-[var(--surface-1)] rounded-2xl px-7 py-6 text-[var(--text-primary)] border border-[var(--border)] mb-4"><div className="text-sm font-bold mb-3">{title}</div>{items.map((t, i) => <div key={i} className="text-[13px] text-[var(--text-secondary)] mb-1.5 pl-4 relative"><span className="absolute left-0 text-[var(--accent-primary)] font-bold">›</span>{t}</div>)}</div>;
}

export function DataTable({ data, cols, pageSize = 15 }: { data: Record<string, unknown>[]; cols?: string[]; pageSize?: number }) {
  const [search, setSearch] = useState(""); const [sortCol, setSortCol] = useState(""); const [sortAsc, setSortAsc] = useState(true); const [page, setPage] = useState(0);
  if (!data?.length) return <Empty text="No data available" />;
  const columns = cols || Object.keys(data[0]);
  const filtered = search ? data.filter(row => columns.some(c => String(row[c] ?? "").toLowerCase().includes(search.toLowerCase()))) : data;
  const sorted = sortCol ? [...filtered].sort((a, b) => { const av = String(a[sortCol] ?? ""); const bv = String(b[sortCol] ?? ""); const na = Number(av); const nb = Number(bv); if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na; return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av); }) : filtered;
  const totalPages = Math.ceil(sorted.length / pageSize); const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  return <div>
    <div className="flex items-center justify-between mb-2">
      <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-3 py-1.5 text-[12px] text-[var(--text-primary)] outline-none w-48 focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
      <span className="text-[11px] text-[var(--text-muted)]">{sorted.length} rows{totalPages > 1 ? ` · Page ${page + 1}/${totalPages}` : ""}</span>
    </div>
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]" style={{ WebkitOverflowScrolling: "touch" }}>
      <table className="w-full text-left" style={{ minWidth: Math.max(columns.length * 120, 600) }}><thead><tr className="bg-[var(--surface-2)]">{columns.map(c => <th key={c} onClick={() => { if (sortCol === c) setSortAsc(!sortAsc); else { setSortCol(c); setSortAsc(true); } }} className="px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b-2 border-[var(--border)] whitespace-nowrap cursor-pointer hover:text-[var(--accent-primary)] select-none">{c}{sortCol === c ? (sortAsc ? " ▲" : " ▼") : ""}</th>)}</tr></thead>
      <tbody>{paged.map((row, i) => <tr key={i} className={`border-b border-[var(--border)] hover:bg-[var(--hover)] ${i % 2 ? "bg-[var(--surface-2)]/30" : ""}`}>{columns.map(c => <td key={c} className="px-3 py-2 text-[13px] whitespace-nowrap max-w-[280px] truncate text-[var(--text-secondary)] font-data">{String(row[c] ?? "")}</td>)}</tr>)}</tbody></table>
    </div>
    {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-2">{page > 0 && <button onClick={() => setPage(page - 1)} className="text-[11px] text-[var(--accent-primary)] font-semibold">← Prev</button>}<span className="text-[11px] text-[var(--text-muted)]">{page + 1} / {totalPages}</span>{page < totalPages - 1 && <button onClick={() => setPage(page + 1)} className="text-[11px] text-[var(--accent-primary)] font-semibold">Next →</button>}</div>}
  </div>;
}

export function BarViz({ data, labelKey = "name", valueKey = "value", color = "var(--accent-primary)" }: { data: Record<string, unknown>[]; labelKey?: string; valueKey?: string; color?: string }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => Math.abs(Number(d[valueKey] || 0))), 1);
  return <div className="space-y-2">{data.slice(0, 12).map((d, i) => {
    const val = Number(d[valueKey] || 0);
    const label = String(d[labelKey] || "");
    const truncLabel = label.length > 24 ? label.slice(0, 22) + "…" : label;
    return <div key={i} className="flex items-center gap-3">
      <div className="text-[11px] text-[var(--text-secondary)] text-right shrink-0 truncate" style={{ width: 120 }} title={label}>{truncLabel}</div>
      <div className="flex-1 h-5 bg-[var(--surface-2)] rounded overflow-hidden"><div className="h-full rounded transition-all" style={{ width: `${Math.max((Math.abs(val) / maxVal) * 100, 2)}%`, background: color, opacity: 0.85 }} /></div>
      <div className="text-[11px] font-semibold text-[var(--text-primary)] shrink-0" style={{ minWidth: 32, textAlign: "right" }}>{val}</div>
    </div>;
  })}</div>;
}

export function DonutViz({ data }: { data: { name: string; value: number }[] }) {
  if (!data?.length) return null;
  return <div className="flex items-center gap-6">
    <ResponsiveContainer width={120} height={120}><PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={52} strokeWidth={0}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={TT as object} /></PieChart></ResponsiveContainer>
    <div className="space-y-1">{data.map((d, i) => <div key={i} className="flex items-center gap-2 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-[var(--text-secondary)]">{d.name}</span><span className="font-semibold ml-auto">{d.value}</span></div>)}</div>
  </div>;
}

export function RadarViz({ data }: { data: { subject: string; current: number; future?: number; max: number }[] }) {
  if (!data?.length) return null;
  return <ResponsiveContainer width="100%" height={280}>
    <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
      <PolarGrid stroke="#2A3555" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#A3B1C6" }} /><PolarRadiusAxis domain={[0, data[0]?.max || 5]} tick={{ fontSize: 10, fill: "#7B8BA2" }} />
      <Radar name="Current" dataKey="current" stroke="#D4860A" fill="#D4860A" fillOpacity={0.2} strokeWidth={2} />
      {data[0]?.future !== undefined && <Radar name="Future" dataKey="future" stroke="#F97316" fill="#F97316" fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 4" />}
      <Legend wrapperStyle={{ fontSize: 11, color: "#A3B1C6" }} /><Tooltip contentStyle={TT as object} />
    </RadarChart>
  </ResponsiveContainer>;
}

export function TabBar({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return <div className="flex border-b-2 border-[var(--border)] mb-5 gap-0 overflow-x-auto">{tabs.map(t => <button key={t.id} onClick={() => onChange(t.id)} className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap -mb-[2px] border-b-2 transition-all ${active === t.id ? "text-[var(--accent-primary)] font-semibold border-[var(--accent-primary)]" : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]"}`}>{t.label}</button>)}</div>;
}

export function SidebarSelect({ label, options, value, onChange }: { label?: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return <div className="mb-2">{label && <label className="block text-[11px] font-semibold text-[var(--text-muted)] tracking-wide mb-1">{label}</label>}<select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[13px] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none appearance-none">{options.map(o => <option key={o} value={o} className="bg-[var(--surface-2)]">{o}</option>)}</select></div>;
}

export function ReadinessDot({ ready }: { ready: boolean }) { return <span className={`inline-block w-2 h-2 rounded-full mr-2 ${ready ? "bg-[var(--success)]" : "bg-[var(--risk)]"}`} />; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
/* ═══════════════════════════════════════════════════════════════
   HOOKS — usePersisted, useDebounce, useApiData
   ═══════════════════════════════════════════════════════════════ */
export function usePersisted<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(initial);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s !== null) setVal(JSON.parse(s)); } catch {} }, [key]);
  const setter = useCallback((v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === "function" ? (v as (prev: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [val, setter];
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

export function useApiData(fetcher: () => Promise<any>, deps: unknown[]): [Record<string, unknown> | null, boolean] {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let cancelled = false; setLoading(true); fetcher().then((d: unknown) => { if (!cancelled) { setData(d as Record<string, unknown> | null); setLoading(false); } }).catch((err) => { console.error("[useApiData]", err); if (!cancelled) setLoading(false); }); return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [data, loading];
}

/* ═══════════════════════════════════════════════════════════════
   VIEW TOGGLE — Quick switch in module headers
   ═══════════════════════════════════════════════════════════════ */
export function ViewToggle({ viewCtx, onChangeView }: { viewCtx: ViewContext; onChangeView: () => void }) {
  const colors: Record<string, string> = { org: "var(--accent-primary)", job: "var(--success)", employee: "var(--purple)", custom: "var(--warning)" };
  const icons: Record<string, string> = { org: "🏢", job: "💼", employee: "👤", custom: "⚙️" };
  const labels: Record<string, string> = { org: "Org-Wide", job: viewCtx.job || "Job", employee: viewCtx.employee || "Employee", custom: "Custom" };
  return <button onClick={onChangeView} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80" style={{ background: `${colors[viewCtx.mode]}15`, border: `1px solid ${colors[viewCtx.mode]}30`, color: colors[viewCtx.mode] }}>
    {icons[viewCtx.mode]} {labels[viewCtx.mode]} <span className="text-[9px] opacity-60">↻</span>
  </button>;
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data?.length) return;
  const cols = Object.keys(data[0]);
  const csv = [cols.join(","), ...data.map(row => cols.map(c => { const v = String(row[c] ?? ""); return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v; }).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}


/* ═══════════════════════════════════════════════════════════════
   PAGE HEADER — used on every module page
   ═══════════════════════════════════════════════════════════════ */
export function PageHeader({ icon, title, subtitle, onBack, moduleId, onUpload, viewCtx, onViewChange }: { icon: string; title: string; subtitle: string; onBack: () => void; moduleId?: string; onUpload?: (files: FileList) => void; viewCtx?: ViewContext; onViewChange?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MODULE_DATA_LABELS: Record<string, string> = { snapshot: "Workforce", jobs: "Job Catalog", scan: "Work Design", design: "Work Design", simulate: "Work Design", build: "Org Design", plan: "Change Mgmt", opmodel: "Operating Model" };
  const dataLabel = moduleId ? MODULE_DATA_LABELS[moduleId] : null;
  const noTemplate = moduleId === "opmodel"; // Op Model Lab is a sandbox, no upload needed

  return <div className="mb-6">
    <button onClick={onBack} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-3 flex items-center gap-1 transition-colors">← Back to Home</button>
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e09040] to-[#c07030] flex items-center justify-center text-xl">{icon}</div>
        <div><h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">{title}</h1><p className="text-[13px] text-[var(--text-secondary)]">{subtitle}</p></div>
        {moduleId && <InfoButton moduleId={moduleId} />}
      </div>
      <div className="flex items-center gap-2">
        {viewCtx && viewCtx.mode !== "org" && onViewChange && <ViewToggle viewCtx={viewCtx} onChangeView={onViewChange} />}
      {moduleId && !noTemplate && <>
        <a href={`/api/template/${moduleId}`} download className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] no-underline">⬇ {dataLabel} Template</a>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { if (e.target.files && onUpload) onUpload(e.target.files); }} />
        <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all bg-[var(--accent-primary)] text-white hover:opacity-90">⬆ Upload {dataLabel}</button>
      </>}
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   CONTEXT STRIP — shows insights from prior modules
   ═══════════════════════════════════════════════════════════════ */
export function ContextStrip({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-2.5 mb-5 flex items-center gap-3 flex-wrap">
    <span className="text-[12px] font-bold text-[var(--accent-primary)]">From prior steps:</span>
    {items.map((t, i) => <span key={i} className="text-[12px] text-[var(--text-secondary)]">{t}</span>)}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
   ═══════════════════════════════════════════════════════════════ */
export function Toast({ message, type = "info", onDismiss }: { message: string; type?: "info" | "success" | "error" | "warning"; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
  const colors = { info: "var(--accent-primary)", success: "var(--success)", error: "var(--risk)", warning: "var(--warning)" };
  const icons = { info: "ℹ️", success: "✓", error: "✕", warning: "⚠" };
  return <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl" style={{ background: "var(--surface-1)", border: `1px solid ${colors[type]}30`, minWidth: 280, maxWidth: 420 }}>
    <span className="text-lg" style={{ color: colors[type] }}>{icons[type]}</span>
    <span className="text-[13px] text-[var(--text-primary)] flex-1">{message}</span>
    <button onClick={onDismiss} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm ml-2">✕</button>
  </div>;
}

export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "info" | "success" | "error" | "warning" }[]>([]);
  const add = useCallback((message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const remove = useCallback((id: number) => { setToasts(prev => prev.filter(t => t.id !== id)); }, []);
  const ToastContainer = useMemo(() => {
    return function ToastList() {
      return <>{toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => remove(t.id)} />)}</>;
    };
  }, [toasts, remove]);
  return { toast: add, ToastContainer };
}


/* ═══════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════ */
export function LoadingBar() {
  return <div className="w-full h-1 bg-[var(--surface-2)] rounded-full overflow-hidden mb-4"><div className="h-full bg-[var(--accent-primary)] rounded-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: "40%" }} /></div>;
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3 animate-pulse">{Array.from({ length: rows }, (_, i) => <div key={i} className="flex gap-3"><div className="h-4 bg-[var(--surface-2)] rounded w-1/4" /><div className="h-4 bg-[var(--surface-2)] rounded w-1/2" /><div className="h-4 bg-[var(--surface-2)] rounded w-1/4" /></div>)}</div>;
}

export function EmptyWithAction({ text, icon = "📭", actionLabel, onAction }: { text: string; icon?: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="text-center py-12 text-[var(--text-secondary)]">
    <div className="text-3xl mb-2 opacity-40">{icon}</div>
    <div className="text-sm max-w-xs mx-auto leading-relaxed mb-3">{text}</div>
    {actionLabel && onAction && <button onClick={onAction} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">{actionLabel}</button>}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   NEXT STEP NAVIGATION
   ═══════════════════════════════════════════════════════════════ */
export function NextStepBar({ currentModuleId, onNavigate }: { currentModuleId: string; onNavigate: (id: string) => void }) {
  const currentIdx = MODULES.findIndex(m => m.id === currentModuleId);
  const next = currentIdx >= 0 && currentIdx < MODULES.length - 1 ? MODULES[currentIdx + 1] : null;
  const prev = currentIdx > 0 ? MODULES[currentIdx - 1] : null;
  if (!prev && !next) return null;
  return <div className="mt-8 pt-4 border-t border-[var(--border)] flex items-center justify-between">
    {prev ? <button onClick={() => onNavigate(prev.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>← {prev.icon} {prev.title}</button> : <div />}
    {next ? <button onClick={() => onNavigate(next.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">Next: {next.icon} {next.title} →</button> : <div />}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   AI ESPRESSO SYSTEM — Quick prompts + Central AI button + Chat
   ═══════════════════════════════════════════════════════════════ */

export const MODULE_QUICK_PROMPTS: Record<string, { label: string; prompt: string; needsInput?: boolean; inputLabel?: string; inputPlaceholder?: string }[]> = {
  snapshot: [
    { label: "Executive Summary", prompt: "Write a 3-paragraph executive summary of our workforce. Include headcount, largest functions, AI readiness score, and top risks." },

    { label: "Executive Summary", prompt: "Write a 3-paragraph executive summary of our workforce. Include headcount, largest functions, AI readiness score, and top risks." },
    { label: "Risk Assessment", prompt: "Identify the top 5 workforce risks based on our structure, span of control, and AI readiness data." },
    { label: "Benchmark Compare", prompt: "How does our org structure compare to industry benchmarks for a company of this size?", needsInput: true, inputLabel: "Industry", inputPlaceholder: "e.g. Financial Services, Tech, Healthcare..." },
  ],
  snapshot_employee: [
    { label: "Explain My Profile", prompt: "Based on my role, explain my position in the organization, my typical career trajectory, and what skills I should develop." },
    { label: "How Will AI Affect Me?", prompt: "Explain specifically how AI transformation will change my day-to-day work. What tasks will change? What stays the same?" },
    { label: "My Development Plan", prompt: "Create a personalized 6-month development plan for me to prepare for the AI transformation." },
  ],
  snapshot_job: [
    { label: "Role Analysis", prompt: "Analyze this role in depth — what are the key value-drivers, what's at risk from AI, and how should this role evolve?" },
    { label: "Comparable Roles", prompt: "What are the comparable roles in other organizations? How does this role's scope and level compare to industry norms?" },
    { label: "Succession Risk", prompt: "What is the succession risk for this role? How hard is it to replace, and what skills are most critical to retain?" },
  ],
  jobs: [
    { label: "Role Redundancy Check", prompt: "Analyze our job catalog for potential redundancies — roles with overlapping descriptions or responsibilities." },
    { label: "Career Path Gaps", prompt: "Identify gaps in our career architecture — levels or tracks that are missing or underpopulated." },
    { label: "Restructure Proposal", prompt: "Propose a restructured job architecture that reduces role fragmentation while maintaining career progression." },
  ],
  scan: [
    { label: "Top 5 Quick Wins", prompt: "Identify the 5 tasks that would deliver the highest ROI if automated immediately. Explain why for each." },
    { label: "Automation Roadmap", prompt: "Create a phased automation roadmap: what to automate in Month 1-3, 4-6, and 7-12." },
    { label: "Skills Gap Plan", prompt: "Based on our AI impact scores, what new skills does our workforce need? Create a training priority list." },
    { label: "Phase 1 Summary", prompt: "Summarize everything discovered in Phase 1: workforce composition, job architecture findings, and AI opportunity assessment. What should we prioritize in Phase 2 Design?" },
  ],
  design: [
    { label: "Auto-Generate Tasks", prompt: "Generate a complete task breakdown for the selected role with AI impact scores, time allocations, and skill requirements." },
    { label: "Validate My Design", prompt: "Review my current task breakdown. Flag any issues: time not summing to 100%, misclassified AI impact, unrealistic estimates." },
    { label: "Benchmark This Role", prompt: "How does this role's task breakdown compare to industry norms?", needsInput: true, inputLabel: "Industry/Company", inputPlaceholder: "e.g. Big 4 Consulting, Fortune 500 Finance..." },
  ],
  simulate: [
    { label: "Scenario Brief", prompt: "Write an executive summary of our current scenario results. Include released hours, FTE equivalents, cost savings, and break-even timeline." },
    { label: "Adoption Strategy", prompt: "Based on our scenario results, what adoption rate do you recommend and why? What are the risks of going higher or lower?" },
    { label: "Investment Sizing", prompt: "Based on our org size and the roles in scope, what per-role investment amount do you recommend? Break down the investment into tooling, training, change management, and productivity loss.", needsInput: true, inputLabel: "Your industry", inputPlaceholder: "e.g. Financial Services, Tech, Healthcare..." },
    { label: "Custom Scenario", prompt: "Model a scenario where we only transform specific functions.", needsInput: true, inputLabel: "Functions to transform", inputPlaceholder: "e.g. Finance and HR only..." },
  ],
  build: [
    { label: "Restructure Plan", prompt: "Analyze our current org structure and generate specific restructuring recommendations with expected savings." },
    { label: "Optimal Spans", prompt: "Calculate the optimal span of control for each department based on their function type, complexity, and industry benchmarks." },
    { label: "De-Layering Plan", prompt: "Identify which departments should be de-layered, how many layers to remove, and the expected impact on decision speed and cost." },
    { label: "Industry Benchmark", prompt: "Compare our org structure to industry best practices.", needsInput: true, inputLabel: "Your industry", inputPlaceholder: "e.g. Financial Services, SaaS, Manufacturing..." },
  ],
  plan: [
    { label: "Auto-Build Roadmap", prompt: "Generate a complete change management roadmap with initiatives, owners, waves, dependencies, and risks based on our work design decisions." },
    { label: "Risk Mitigation", prompt: "For each high-risk initiative, provide 3 specific mitigation strategies with owners and timelines." },
    { label: "Stakeholder Map", prompt: "Create a stakeholder analysis: who needs to champion this transformation, who might resist, and how to bring them along.", needsInput: true, inputLabel: "Key stakeholders", inputPlaceholder: "e.g. CFO, VP Engineering, Union rep..." },
    { label: "Full Transformation Report", prompt: "Write a complete executive transformation report covering Phase 1 (Discovery findings), Phase 2 (Design decisions and scenario results), and Phase 3 (Change plan and operating model). Format as a board-ready narrative." },
  ],
  opmodel: [
    { label: "Recommend Architecture", prompt: "Based on our function and industry, recommend the best organizational archetype, operating model, and governance combination with reasoning." },
    { label: "Generate Company Model", prompt: "Generate the operating model for a specific company as a reference template.", needsInput: true, inputLabel: "Company name", inputPlaceholder: "e.g. Chipotle, Stripe, Tesla..." },
    { label: "Transition Plan", prompt: "If we move from our current archetype to the recommended one, what are the key transition steps, risks, and timeline?" },
  ],
};

export const MODULE_AI_PROMPTS: Record<string, string> = {
  snapshot: "You are analyzing a Workforce Snapshot. Help the user understand their workforce composition, org structure, headcount distribution, span of control, and AI readiness scores.",
  jobs: "You are analyzing Job Architecture. Help the user understand their job catalog, career levels, role clusters, and org hierarchy.",
  scan: "You are analyzing an AI Opportunity Scan. Help the user understand which tasks have the highest AI impact, where quick wins are, and what skills gaps exist.",
  design: "You are in the Work Design Lab. Help the user deconstruct jobs into tasks, decide which tasks to automate/augment/redesign/retain, and plan redeployment.",
  simulate: "You are in the Impact Simulator. Help the user understand scenario outcomes — released hours, FTE equivalents, ROI, break-even timelines.",
  build: "You are in the Org Design Studio. Help the user model future org structures — analyze span of control, layers, cost implications, and role migration.",
  plan: "You are in the Change Planner. Help the user sequence transformation initiatives, assess risks, build a roadmap, and assign ownership.",
  opmodel: "You are in the Operating Model Lab. Help the user choose between organizational archetypes and operating models. Explain tradeoffs.",
};

export interface AiMessage { role: "user" | "assistant"; content: string }

export function AiEspressoPanel({ moduleId, contextData, isGlobal = false }: { moduleId: string; contextData?: string; isGlobal?: boolean }) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePrompt, setActivePrompt] = useState<number | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const prompts = MODULE_QUICK_PROMPTS[moduleId] || [];

  const systemPrompt = isGlobal
    ? `You are the AI Espresso engine for the AI Transformation Platform. You have full context about the user's transformation journey. Provide strategic, actionable recommendations. Be specific with numbers when possible. Context: ${contextData || "No data loaded."}`
    : `You are an expert AI transformation consultant. ${MODULE_AI_PROMPTS[moduleId] || ""} Keep responses concise (2-4 paragraphs), actionable, and specific. Context: ${contextData || "No data loaded."}`;

  const sendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    const userMsg: AiMessage = { role: "user", content: message.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setActivePrompt(null);
    setPromptInput("");
    setEditingPrompt(null);
    setLoading(true);

    const chatHistory = newMessages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    const aiText = await callAI(systemPrompt, chatHistory) || "I couldn't generate a response. Please try again.";
    setMessages(prev => [...prev, { role: "assistant", content: aiText }]);
    setLoading(false);
  };

  const handlePromptClick = (idx: number) => {
    const p = prompts[idx];
    if (p.needsInput) {
      setActivePrompt(idx);
      setEditingPrompt(p.prompt);
    } else {
      setEditingPrompt(null);
      sendMessage(p.prompt);
    }
  };

  return <div className="flex flex-col h-full">
    {/* Quick prompts — toggleable cards */}
    {messages.length === 0 && <div className="px-4 pt-3 pb-2">
      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{isGlobal ? "Platform-wide actions" : "Quick actions"}</div>
      <div className="space-y-1.5">
        {prompts.map((p, i) => <div key={i}>
          <button onClick={() => handlePromptClick(i)} className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] transition-all flex items-center justify-between group" style={{ background: activePrompt === i ? "rgba(224,144,64,0.1)" : "var(--surface-2)", border: activePrompt === i ? "1px solid rgba(224,144,64,0.3)" : "1px solid var(--border)" }} onMouseEnter={e => { if (activePrompt !== i) e.currentTarget.style.borderColor = "rgba(224,144,64,0.15)"; }} onMouseLeave={e => { if (activePrompt !== i) e.currentTarget.style.borderColor = "var(--border)"; }}>
            <span className="font-semibold" style={{ color: activePrompt === i ? "#f0a050" : "var(--text-primary)" }}>{p.label}</span>
            <span className="text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">{p.needsInput ? "✎" : "→"}</span>
          </button>
          {/* Input dialog for prompts that need user input */}
          {activePrompt === i && p.needsInput && <div className="mt-1.5 ml-3 mr-1 p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid rgba(224,144,64,0.2)" }}>
            <div className="text-[11px] font-semibold text-[var(--text-muted)] mb-1.5">{p.inputLabel}</div>
            <input value={promptInput} onChange={e => setPromptInput(e.target.value)} placeholder={p.inputPlaceholder} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[rgba(224,144,64,0.3)] placeholder:text-[var(--text-muted)] mb-2" onKeyDown={e => { if (e.key === "Enter" && promptInput.trim()) sendMessage(`${p.prompt} ${p.inputLabel}: ${promptInput.trim()}`); }} />
            <div className="text-[10px] text-[var(--text-muted)] mb-2 italic">Prompt: {p.prompt}</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActivePrompt(null)} className="px-3 py-1.5 rounded-lg text-[11px] text-[var(--text-muted)]">Cancel</button>
              <button onClick={() => { if (promptInput.trim()) sendMessage(`${p.prompt} ${p.inputLabel}: ${promptInput.trim()}`); }} disabled={!promptInput.trim()} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: promptInput.trim() ? 1 : 0.4 }}>Run ☕</button>
            </div>
          </div>}
        </div>)}
      </div>
    </div>}

    {/* Messages */}
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: messages.length ? "50vh" : "0", minHeight: messages.length ? 120 : 0 }}>
      {messages.map((m, i) => <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-[13px] leading-relaxed" style={{ background: m.role === "user" ? "linear-gradient(135deg, #e09040, #c07030)" : "var(--surface-2)", color: m.role === "user" ? "#fff" : "var(--text-primary)", borderBottomRightRadius: m.role === "user" ? 4 : 12, borderBottomLeftRadius: m.role === "user" ? 12 : 4 }}>
          {m.content.split("\n").map((line, li) => <div key={li} className={li > 0 ? "mt-1.5" : ""}>{line}</div>)}
        </div>
      </div>)}
      {loading && <div className="flex justify-start"><div className="rounded-xl px-4 py-2.5 text-[13px] flex items-center gap-2" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}><span className="inline-block w-4 h-4 rounded-full animate-pulse" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }} /> Brewing your espresso...</div></div>}
      <div ref={messagesEndRef} />
    </div>

    {/* Free-form input */}
    <div className="px-4 py-3 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
      <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendMessage(input); }} placeholder={messages.length ? "Follow up..." : "Or type your own question..."} className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[rgba(224,144,64,0.3)] placeholder:text-[var(--text-muted)]" />
      <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕</button>
    </div>
  </div>;
}

export function AiEspressoButton({ moduleId, contextData, viewMode: vMode }: { moduleId: string; contextData?: string; viewMode?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"module" | "global">("module");
  const moduleName = MODULES.find(m => m.id === moduleId)?.title || "Platform";

  return <>
    {/* Floating espresso button */}
    <button onClick={() => setOpen(!open)} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl transition-all duration-300 hover:scale-105 group" style={{ background: open ? "var(--risk)" : "linear-gradient(135deg, #e09040, #c07030)", boxShadow: open ? "0 8px 30px rgba(239,68,68,0.3)" : "0 8px 30px rgba(200,120,40,0.35)" }} title="AI Espresso">
      {open ? "✕" : "☕"}
    </button>

    {/* Panel */}
    {open && <div className="fixed bottom-24 right-6 z-40 w-[420px] rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", maxHeight: "75vh" }}>
      {/* Header with mode toggle */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, rgba(224,144,64,0.08), rgba(192,112,48,0.03))", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">☕</span>
          <div>
            <div className="text-[14px] font-bold text-[var(--text-primary)]">AI Espresso</div>
            <div className="text-[10px] text-[var(--text-muted)]">{mode === "module" ? moduleName : "Full Platform"} · {getAiRemaining()} requests left</div>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
          <button onClick={() => setMode("module")} className="px-2.5 py-1 text-[10px] font-semibold transition-all" style={{ background: mode === "module" ? "rgba(224,144,64,0.15)" : "transparent", color: mode === "module" ? "#f0a050" : "var(--text-muted)" }}>This Module</button>
          <button onClick={() => setMode("global")} className="px-2.5 py-1 text-[10px] font-semibold transition-all" style={{ background: mode === "global" ? "rgba(224,144,64,0.15)" : "transparent", color: mode === "global" ? "#f0a050" : "var(--text-muted)" }}>Full Platform</button>
        </div>
      </div>

      {/* Content */}
      <AiEspressoPanel moduleId={mode === "global" ? "snapshot" : (vMode && vMode !== "org" && vMode !== "custom" ? `${moduleId}_${vMode}` : moduleId)} contextData={contextData} isGlobal={mode === "global"} />
    </div>}
  </>;
}



/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   VIEW SELECTOR — Choose perspective before entering the tool
   ═══════════════════════════════════════════════════════════════ */
export function ViewSelector({ onSelect, employees, jobs, filterOptions, onBack }: { 
  onSelect: (mode: string, detail?: Record<string, string>) => void; 
  employees: string[]; 
  jobs: string[];
  filterOptions: Record<string, string[]>;
  onBack: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [customFilters, setCustomFilters] = useState({ func: "All", jf: "All", sf: "All", cl: "All", ct: "All" });

  const views = [
    { id: "org", icon: "🏢", title: "Organization", desc: "Full org analysis — all functions, roles, and employees", color: "#D4860A", ready: true },
    { id: "job", icon: "💼", title: "Job Focus", desc: "Deep dive into a single role", color: "#10B981", ready: jobs.length > 0 },
    { id: "employee", icon: "👤", title: "Employee", desc: "One person's world — profile, org chart, impact", color: "#8B5CF6", ready: employees.length > 0 },
    { id: "custom", icon: "⚙️", title: "Custom Slice", desc: "Filter by function, family, level, or track", color: "#F97316", ready: true },
  ];

  return <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#0B1120" }}>
    {/* Full bleed background */}
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 65%, #0a0f1a 100%)", backgroundImage: "url(/view_bg.png)", backgroundSize: "cover", backgroundPosition: "center center", backgroundRepeat: "no-repeat", width: "100vw", height: "100vh" }} />
    <div style={{ position: "absolute", inset: 0, background: revealed ? "rgba(8,12,24,0.75)" : "radial-gradient(ellipse at center, rgba(8,12,24,0.2) 0%, rgba(8,12,24,0.5) 60%, rgba(8,12,24,0.7) 100%)", transition: "background 0.6s ease", width: "100vw", height: "100vh" }} />

    {/* Back button */}
    <button onClick={onBack} style={{ position: "absolute", top: 20, left: 20, zIndex: 20, fontSize: 12, color: "rgba(255,220,180,0.5)", background: "none", border: "none", cursor: "pointer" }}>← Back to Projects</button>

    {/* Click-to-reveal state */}
    {!revealed && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setRevealed(true)}>
      <div className="text-center">
        <div className="mb-8 animate-[fadeIn_1s_ease]">
          <div className="text-[28px] font-extrabold text-white mb-2" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>Choose Your Perspective</div>
          <p className="text-[15px]" style={{ color: "rgba(255,220,180,0.5)" }}>The platform adapts to how you want to explore</p>
        </div>
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl animate-pulse" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.15)" }}>
          <span className="text-[14px]" style={{ color: "rgba(255,230,200,0.8)" }}>Click anywhere to continue</span>
          <span className="text-[16px]">→</span>
        </div>
      </div>
    </div>}

    {/* View cards — revealed on click */}
    {revealed && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }} className="animate-[slideUp_0.4s_ease]">
      <div className="max-w-2xl w-full px-6">
        <div className="text-center mb-6">
          <div className="text-[22px] font-extrabold text-white mb-1" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>Select Your View</div>
          <p className="text-[13px]" style={{ color: "rgba(255,220,180,0.4)" }}>Every module adapts to your chosen perspective</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {views.map(v => <button key={v.id} onClick={() => {
            if (v.id === "org") onSelect("org");
            else if (v.id === "custom") setCustomExpanded(!customExpanded);
            else if (v.id === "job" && jobs.length) onSelect("job_select");
            else if (v.id === "employee" && employees.length) onSelect("employee_select");
          }} disabled={!v.ready} className="text-left rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden disabled:opacity-30" style={{ background: "rgba(15,20,35,0.7)", backdropFilter: "blur(20px)", border: v.id === "custom" && customExpanded ? `1px solid ${v.color}50` : "1px solid rgba(255,200,150,0.08)" }} onMouseEnter={e => { if (v.ready) e.currentTarget.style.borderColor = `${v.color}40`; }} onMouseLeave={e => { if (!customExpanded || v.id !== "custom") e.currentTarget.style.borderColor = "rgba(255,200,150,0.08)"; }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{v.icon}</span>
              <span className="text-[16px] font-bold" style={{ color: "rgba(255,245,235,0.92)" }}>{v.title}</span>
            </div>
            <div className="text-[12px]" style={{ color: "rgba(255,220,190,0.4)" }}>{v.desc}</div>
            {!v.ready && <div className="text-[11px] mt-2" style={{ color: "rgba(245,158,11,0.6)" }}>Upload data to enable</div>}
            <div className="absolute top-4 right-4 text-[14px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: v.color }}>→</div>
          </button>)}
        </div>

        {/* Custom filter expansion */}
        {customExpanded && <div className="rounded-xl p-5 mb-3 animate-[slideUp_0.3s_ease]" style={{ background: "rgba(15,20,35,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(249,115,22,0.2)" }}>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[{ key: "func", label: "Function", options: filterOptions.functions || ["All"] },
              { key: "jf", label: "Job Family", options: filterOptions.job_families || ["All"] },
              { key: "sf", label: "Sub-Family", options: filterOptions.sub_families || ["All"] },
              { key: "cl", label: "Career Level", options: filterOptions.career_levels || ["All"] },
              { key: "ct", label: "Career Track", options: ["All", "Executive", "Manager", "IC", "Analyst"] },
            ].map(f => <div key={f.key}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,200,150,0.3)" }}>{f.label}</div>
              <select value={customFilters[f.key as keyof typeof customFilters]} onChange={e => setCustomFilters(prev => ({ ...prev, [f.key]: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-[12px] outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,150,0.1)", color: "rgba(255,245,235,0.85)" }}>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>)}
          </div>
          <div className="flex justify-end">
            <button onClick={() => onSelect("custom", customFilters)} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>Apply & Enter →</button>
          </div>
        </div>}
      </div>
    </div>}
  </div>;
}

export function ViewJobPicker({ jobs, onSelect, onBack }: { jobs: string[]; onSelect: (job: string) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = jobs.filter(j => j.toLowerCase().includes(search.toLowerCase()));
  return <div className="min-h-[calc(100vh-48px)] flex items-center justify-center" style={{ background: "var(--bg)" }}>
    <div className="max-w-lg w-full px-6">
      <button onClick={onBack} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-4 flex items-center gap-1">← Back to view selection</button>
      <div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">Select a Job</div>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">The entire platform will focus on this role</p>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] mb-3 placeholder:text-[var(--text-muted)]" />
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">{filtered.map(j => <button key={j} onClick={() => onSelect(j)} className="w-full text-left px-4 py-3 rounded-xl text-[13px] transition-all hover:bg-[rgba(212,134,10,0.06)] border border-transparent hover:border-[var(--accent-primary)]/20" style={{ background: "var(--surface-1)" }}>
        <span className="font-semibold text-[var(--text-primary)]">{j}</span>
      </button>)}</div>
      {filtered.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">No matching jobs</div>}
    </div>
  </div>;
}

export function ViewEmployeePicker({ employees, onSelect, onBack }: { employees: string[]; onSelect: (emp: string) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = employees.filter(e => e.toLowerCase().includes(search.toLowerCase()));
  return <div className="min-h-[calc(100vh-48px)] flex items-center justify-center" style={{ background: "var(--bg)" }}>
    <div className="max-w-lg w-full px-6">
      <button onClick={onBack} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-4 flex items-center gap-1">← Back to view selection</button>
      <div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">Select an Employee</div>
      <p className="text-[13px] text-[var(--text-secondary)] mb-4">See their world — role, team, org chart, and how AI affects them</p>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] mb-3 placeholder:text-[var(--text-muted)]" />
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">{filtered.slice(0, 50).map(e => <button key={e} onClick={() => onSelect(e)} className="w-full text-left px-4 py-3 rounded-xl text-[13px] transition-all hover:bg-[rgba(139,92,246,0.06)] border border-transparent hover:border-[var(--purple)]/20" style={{ background: "var(--surface-1)" }}>
        <span className="font-semibold text-[var(--text-primary)]">{e}</span>
      </button>)}</div>
      {filtered.length > 50 && <div className="text-center py-3 text-[12px] text-[var(--text-muted)]">Showing 50 of {filtered.length} — narrow your search</div>}
      {filtered.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">No matching employees</div>}
    </div>
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   TRANSFORMATION DASHBOARD — KPI summary strip on landing page
   ═══════════════════════════════════════════════════════════════ */


export const PHASES = [
  { id: "discover", label: "Discover", icon: "🔍", color: "#D4860A", desc: "Upload data and understand your current state", modules: ["dashboard", "snapshot", "jobs", "scan", "readiness", "mgrcap"] },
  { id: "design", label: "Design", icon: "✏️", color: "#10B981", desc: "Redesign roles, model scenarios, reshape structure", modules: ["skills", "design", "bbba", "headcount", "simulate", "build"] },
  { id: "deliver", label: "Deliver", icon: "🚀", color: "#F59E0B", desc: "Build your change plan and operating model", modules: ["reskill", "marketplace", "changeready", "mgrdev", "plan", "opmodel", "export"] },
];

export const MODULES = [
  { id: "dashboard", icon: "🎯", title: "Transformation Dashboard", desc: "Executive summary across all phases", color: "#F59E0B", phase: "discover", views: ["org","custom"] },
  { id: "jobarch", icon: "🏗️", title: "Job Architecture", desc: "Enterprise job catalogue, hierarchy, career framework & validation", color: "#B8602A", phase: "discover", views: ["org","job","custom"] },
  { id: "snapshot", icon: "📊", title: "Workforce Snapshot", desc: "See your people, structure, and readiness baseline", color: "#D4860A", phase: "discover", views: ["org","job","employee","custom"], empTitle: "Employee Profile", jobTitle: "Job Profile", empDesc: "Your profile, team, and AI impact", jobDesc: "Role incumbents, comp, and AI scores" },
  { id: "jobs", icon: "🗂️", title: "Job Architecture", desc: "Explore job catalog, career tracks, and role clusters", color: "#8B5CF6", phase: "discover", views: ["org","job","employee","custom"], empTitle: "Career Path", jobTitle: "Role in Context", empDesc: "Your career trajectory and development", jobDesc: "Where this role sits in the hierarchy" },
  { id: "orghealth", icon: "🏥", title: "Org Health Scorecard", desc: "Auto-calculated metrics with industry benchmarks", color: "#D4860A", phase: "discover", views: ["org","custom"] },
  { id: "scan", icon: "🔬", title: "AI Opportunity Scan", desc: "Find where AI creates the most value", color: "#F97316", phase: "discover", views: ["org","job","employee","custom"], empTitle: "AI Impact on My Role", jobTitle: "AI Impact on This Job" },
  { id: "heatmap", icon: "🔥", title: "AI Impact Heatmap", desc: "Automation potential by function × job family", color: "#EF4444", phase: "discover", views: ["org","custom"] },
  { id: "clusters", icon: "🔗", title: "Role Clustering", desc: "Group similar roles, identify consolidation candidates", color: "#B8602A", phase: "discover", views: ["org","custom"] },
  { id: "readiness", icon: "🎯", title: "AI Readiness", desc: "Individual and team readiness for AI transformation", color: "#C07030", phase: "discover", views: ["org","job","employee","custom"], empTitle: "My Readiness", empDesc: "Your personal AI readiness scores" },
  { id: "mgrcap", icon: "👔", title: "Manager Capability", desc: "Assess manager readiness and identify champions", color: "#A855F7", phase: "discover", views: ["org","custom"] },
  { id: "recommendations", icon: "🤖", title: "AI Recommendations", desc: "AI-generated transformation recommendations ranked by impact", color: "#E09040", phase: "discover", views: ["org","job","custom"] },
  { id: "skills", icon: "🧠", title: "Skills & Talent", desc: "Inventory, gap analysis, and adjacency mapping", color: "#D97706", phase: "design", views: ["org","job","employee","custom"], empTitle: "My Skills", jobTitle: "Role Skills", empDesc: "Your skill profile and development gaps", jobDesc: "Skills required for this role" },
  { id: "bbba", icon: "🔀", title: "Build/Buy/Borrow/Auto", desc: "Talent sourcing strategy per redesigned role", color: "#B8602A", phase: "design", views: ["org","custom"] },
  { id: "headcount", icon: "👥", title: "Headcount Planning", desc: "Current to future workforce waterfall", color: "#8B5CF6", phase: "design", views: ["org","custom"] },
  { id: "design", icon: "✏️", title: "Work Design Lab", desc: "Redesign tasks, roles, and time allocation job by job", color: "#10B981", phase: "design", views: ["org","job","custom"] },
  { id: "simulate", icon: "⚡", title: "Impact Simulator", desc: "Model scenarios, costs, and redeployment outcomes", color: "#D97706", phase: "design", views: ["org","job","employee","custom"], empTitle: "How AI Affects Me", jobTitle: "Role Scenario", empDesc: "Personal impact of AI transformation", jobDesc: "Scenario modeling for this specific role" },
  { id: "build", icon: "🏗️", title: "Org Design Studio", desc: "Reshape spans, layers, and structure across the org", color: "#B8602A", phase: "design", views: ["org","job","employee","custom"], empTitle: "My Org Chart", jobTitle: "Structural Context", empDesc: "Your reporting line and team structure", jobDesc: "Where this role sits structurally" },
  { id: "reskill", icon: "📚", title: "Reskilling Pathways", desc: "Per-employee learning plans and timelines", color: "#D97706", phase: "deliver", views: ["org","employee","custom"], empTitle: "My Learning Path", empDesc: "Your personal reskilling journey" },
  { id: "marketplace", icon: "🏪", title: "Talent Marketplace", desc: "Match internal candidates to redesigned roles", color: "#F97316", phase: "deliver", views: ["org","custom"] },
  { id: "skillshift", icon: "🔄", title: "Skill Shift Index", desc: "Net skill movement — declining, amplified, and net-new skills", color: "#D97706", phase: "discover", views: ["org","custom"] },
  { id: "changeready", icon: "📈", title: "Change Readiness", desc: "4-quadrant segmentation and intervention mapping", color: "#EF4444", phase: "deliver", views: ["org","custom"] },
  { id: "archetypes", icon: "🎭", title: "Readiness Archetypes", desc: "Consultant-grade workforce archetypes with engagement playbooks", color: "#C07030", phase: "deliver", views: ["org","custom"] },
  { id: "story", icon: "📖", title: "Transformation Story", desc: "AI-generated executive narrative for board presentations", color: "#E09040", phase: "deliver", views: ["org","custom"] },
  { id: "mgrdev", icon: "🎓", title: "Manager Development", desc: "Targeted development plans for people managers", color: "#A855F7", phase: "deliver", views: ["org","custom"] },
  { id: "plan", icon: "🚀", title: "Change Planner", desc: "Sequence initiatives and manage transformation risk", color: "#EF4444", phase: "deliver", views: ["org","job","employee","custom"], empTitle: "My Change Journey", jobTitle: "Role Change Plan", empDesc: "Your personal transformation timeline", jobDesc: "Change initiatives affecting this role" },
  { id: "export", icon: "📋", title: "Export & Report", desc: "Generate your board-ready transformation report", color: "#EF4444", phase: "deliver", views: ["org"] },
  { id: "opmodel", icon: "🧬", title: "Operating Model Lab", desc: "Explore architecture patterns across functions", color: "#F59E0B", phase: "deliver", views: ["org","custom"] },
  // om_canvas is accessed from within OperatingModelLab, not as a standalone module
  { id: "rolecompare", icon: "⚖️", title: "Role Comparison", desc: "Side-by-side current vs. redesigned role analysis", color: "#C07030", phase: "design", views: ["org","job","custom"] },
  { id: "quickwins", icon: "⚡", title: "Quick-Win Identifier", desc: "Find highest ROI, lowest effort AI opportunities", color: "#22C55E", phase: "discover", views: ["org","custom"] },
];


export const SIM_DIMS = ["Data Readiness","Process Standardization","Technology Enablement","Talent Readiness","Leadership Alignment"];
export const SIM_PRESETS: Record<string, { label: string; adoption: number; timeline: number; ramp: number; color: string }> = {
  conservative: { label: "Conservative", adoption: 0.3, timeline: 18, ramp: 0.6, color: "#D4860A" },
  balanced: { label: "Balanced", adoption: 0.6, timeline: 12, ramp: 0.8, color: "#10B981" },
  transformative: { label: "Transformative", adoption: 0.9, timeline: 6, ramp: 1.0, color: "#8B5CF6" },
};
export const SIM_JOBS = [
  { role: "Financial Analyst", dept: "Finance", currentHrs: 188, aiEligibleHrs: 120, highAiTasks: 14, rate: 85 },
  { role: "HR Coordinator", dept: "Human Resources", currentHrs: 160, aiEligibleHrs: 95, highAiTasks: 11, rate: 65 },
  { role: "Marketing Specialist", dept: "Marketing", currentHrs: 172, aiEligibleHrs: 110, highAiTasks: 16, rate: 78 },
  { role: "Operations Manager", dept: "Operations", currentHrs: 195, aiEligibleHrs: 85, highAiTasks: 9, rate: 92 },
  { role: "Customer Success Rep", dept: "Customer Success", currentHrs: 168, aiEligibleHrs: 130, highAiTasks: 18, rate: 60 },
];
export const SIM_READINESS: Record<string, { item: string; score: number; notes: string }[]> = {
  "Data Readiness": [{ item: "Data Availability", score: 4, notes: "Core data accessible via API" }, { item: "Data Quality", score: 3, notes: "Some inconsistencies in legacy systems" }, { item: "Data Governance", score: 4, notes: "Established DG framework" }, { item: "Data Integration", score: 3, notes: "Partial integration" }],
  "Process Standardization": [{ item: "Process Documentation", score: 2, notes: "Tribal knowledge dominates" }, { item: "Workflow Consistency", score: 2, notes: "Varies by team" }, { item: "Automation Baseline", score: 1, notes: "Minimal automation" }, { item: "Change Protocols", score: 3, notes: "Basic change mgmt exists" }],
  "Technology Enablement": [{ item: "AI/ML Infrastructure", score: 2, notes: "Cloud available, no ML pipeline" }, { item: "Tool Ecosystem", score: 2, notes: "Fragmented tooling" }, { item: "Integration Architecture", score: 1, notes: "Point-to-point integrations" }, { item: "Security & Compliance", score: 3, notes: "SOC2 compliant" }],
  "Talent Readiness": [{ item: "AI Literacy", score: 4, notes: "78% completed AI training" }, { item: "Digital Skills Depth", score: 5, notes: "Strong technical bench" }, { item: "Learning Culture", score: 4, notes: "Active L&D programs" }, { item: "Change Appetite", score: 4, notes: "82% excited about AI" }],
  "Leadership Alignment": [{ item: "Executive Sponsorship", score: 4, notes: "CTO is active champion" }, { item: "Strategic Clarity", score: 3, notes: "Strategy drafted, not socialized" }, { item: "Investment Commitment", score: 4, notes: "$2.4M approved" }, { item: "Governance Readiness", score: 3, notes: "AI ethics board forming" }],
};


export const CAREER_FRAMEWORKS: { name: string; industry: string; levels: { code: string; title: string; track: string; span: string; focus: string; comp_range: string }[] }[] = [
  { name: "Technology Career Framework", industry: "Technology", levels: [
    {code:"L1",title:"Associate / Junior",track:"IC",span:"—",focus:"Learning, executing defined tasks",comp_range:"$55K-$85K"},
    {code:"L2",title:"Analyst / Engineer",track:"IC",span:"—",focus:"Independent contributor, owns deliverables",comp_range:"$80K-$120K"},
    {code:"L3",title:"Senior Engineer / Sr. Analyst",track:"IC",span:"—",focus:"Drives projects, mentors juniors, technical depth",comp_range:"$110K-$160K"},
    {code:"L4",title:"Staff / Lead",track:"IC / Manager",span:"5-8 for managers",focus:"Cross-team influence, architecture decisions",comp_range:"$150K-$220K"},
    {code:"L5",title:"Principal / Sr. Director",track:"IC / Manager",span:"15-30",focus:"Organization-wide strategy, domain ownership",comp_range:"$200K-$300K"},
    {code:"L6",title:"Distinguished / VP",track:"IC / Executive",span:"50-150",focus:"Industry-shaping, company-wide technical vision",comp_range:"$280K-$450K+"},
    {code:"L7",title:"Fellow / SVP / C-Level",track:"Executive",span:"150+",focus:"Enterprise strategy, board engagement",comp_range:"$400K+"},
  ]},
  { name: "Financial Services Framework", industry: "Financial Services", levels: [
    {code:"Analyst",title:"Analyst",track:"IC",span:"—",focus:"Model building, research, supporting deals",comp_range:"$90K-$130K"},
    {code:"Associate",title:"Associate",track:"IC",span:"—",focus:"Deal execution, client interaction, team leadership",comp_range:"$130K-$200K"},
    {code:"VP",title:"Vice President",track:"IC / Manager",span:"3-6",focus:"Deal origination, client management, P&L ownership",comp_range:"$200K-$350K"},
    {code:"Director",title:"Director / Executive Director",track:"Manager",span:"8-15",focus:"Business line management, revenue generation",comp_range:"$300K-$500K"},
    {code:"MD",title:"Managing Director",track:"Executive",span:"20-50",focus:"Strategic client relationships, firm leadership",comp_range:"$500K-$2M+"},
    {code:"Partner",title:"Partner / Senior MD",track:"Executive",span:"50+",focus:"Firm strategy, major client ownership, talent development",comp_range:"$1M+"},
  ]},
  { name: "Healthcare Framework", industry: "Healthcare", levels: [
    {code:"CNA",title:"Clinical Support / CNA",track:"Clinical",span:"—",focus:"Direct patient care support",comp_range:"$32K-$45K"},
    {code:"RN",title:"Registered Nurse / Therapist",track:"Clinical",span:"—",focus:"Patient assessment, care delivery, documentation",comp_range:"$60K-$95K"},
    {code:"Senior",title:"Senior Clinician / Charge Nurse",track:"Clinical",span:"4-8",focus:"Shift leadership, protocol adherence, mentoring",comp_range:"$80K-$115K"},
    {code:"Manager",title:"Nurse Manager / Dept Manager",track:"Management",span:"15-40",focus:"Unit operations, staff scheduling, quality metrics",comp_range:"$95K-$140K"},
    {code:"Director",title:"Director of Nursing / Clinical Director",track:"Management",span:"50-150",focus:"Service line strategy, budget ownership",comp_range:"$130K-$185K"},
    {code:"VP",title:"VP / CNO / CMO",track:"Executive",span:"200+",focus:"Enterprise clinical strategy, board engagement",comp_range:"$200K-$400K+"},
  ]},
  { name: "Manufacturing Framework", industry: "Manufacturing", levels: [
    {code:"L1",title:"Operator / Technician I",track:"Production",span:"—",focus:"Equipment operation, basic maintenance",comp_range:"$35K-$50K"},
    {code:"L2",title:"Senior Technician / Specialist",track:"Production / IC",span:"—",focus:"Advanced troubleshooting, quality control",comp_range:"$48K-$68K"},
    {code:"L3",title:"Lead / Supervisor",track:"Frontline Mgmt",span:"8-15",focus:"Shift supervision, safety, output targets",comp_range:"$60K-$85K"},
    {code:"L4",title:"Manager / Sr. Engineer",track:"IC / Manager",span:"15-40",focus:"Department management, process improvement",comp_range:"$85K-$125K"},
    {code:"L5",title:"Director / Plant Manager",track:"Manager",span:"50-200",focus:"Plant P&L, capital planning, cross-functional leadership",comp_range:"$120K-$180K"},
    {code:"L6",title:"VP Operations / SVP",track:"Executive",span:"500+",focus:"Multi-plant strategy, supply chain optimization",comp_range:"$180K-$350K+"},
  ]},
  { name: "Professional Services Framework", industry: "Professional Services", levels: [
    {code:"Analyst",title:"Analyst / Consultant I",track:"IC",span:"—",focus:"Research, analysis, deliverable production",comp_range:"$70K-$100K"},
    {code:"Consultant",title:"Consultant / Senior Consultant",track:"IC",span:"—",focus:"Workstream ownership, client delivery, methodology",comp_range:"$100K-$150K"},
    {code:"Manager",title:"Manager / Engagement Manager",track:"Manager",span:"3-8",focus:"Project P&L, team leadership, client management",comp_range:"$140K-$200K"},
    {code:"Sr Manager",title:"Senior Manager / Associate Director",track:"Manager",span:"10-20",focus:"Multi-project oversight, practice development",comp_range:"$180K-$260K"},
    {code:"Director",title:"Director / Principal",track:"Senior Mgmt",span:"20-50",focus:"Client development, methodology innovation, thought leadership",comp_range:"$250K-$400K"},
    {code:"Partner",title:"Partner / Managing Director",track:"Executive",span:"50+",focus:"Revenue ownership, firm strategy, major pursuits",comp_range:"$400K-$2M+"},
  ]},
];

/* ─── Span & Layer Benchmarks — org design targets by industry ─── */
export const SPAN_BENCHMARKS: { industry: string; icon: string; avgSpan: number; optimalSpan: string; avgLayers: number; optimalLayers: string; mgrRatio: string; notes: string; byFunction: { func: string; span: string; layers: string; rationale: string }[] }[] = [
  { industry: "Technology", icon: "💻", avgSpan: 8.5, optimalSpan: "7-12", avgLayers: 5, optimalLayers: "4-6", mgrRatio: "1:8", notes: "Flat structures with wide spans. Platform orgs can go wider (10-15). Deep IC tracks reduce management layers.", byFunction: [
    {func:"Engineering",span:"8-15",layers:"4-5",rationale:"Autonomous teams, code review replaces supervision"},
    {func:"Product",span:"6-8",layers:"4-5",rationale:"Cross-functional coordination needs"},
    {func:"Sales",span:"8-12",layers:"4-5",rationale:"Individual contributor heavy, CRM-driven"},
    {func:"G&A (HR, Finance, Legal)",span:"5-7",layers:"4-5",rationale:"Process-heavy, compliance requirements"},
  ]},
  { industry: "Financial Services", icon: "🏦", avgSpan: 5.5, optimalSpan: "5-8", avgLayers: 7, optimalLayers: "5-7", mgrRatio: "1:6", notes: "Narrower spans driven by regulatory oversight and risk control. Three lines of defense adds layers. Front office wider than back office.", byFunction: [
    {func:"Front Office (Trading, Banking)",span:"4-6",layers:"5-6",rationale:"High-value decisions, close supervision"},
    {func:"Risk & Compliance",span:"5-7",layers:"6-7",rationale:"Regulatory mandate, audit trail"},
    {func:"Operations / GBS",span:"8-12",layers:"4-5",rationale:"Transactional, standardized processes"},
    {func:"Technology",span:"6-8",layers:"5-6",rationale:"Matrix reporting, project-based"},
  ]},
  { industry: "Healthcare", icon: "🏥", avgSpan: 6.0, optimalSpan: "5-8", avgLayers: 6, optimalLayers: "5-7", mgrRatio: "1:7", notes: "Clinical departments have narrower spans (patient safety). Administrative functions can go wider. Physician hierarchy is distinct from management hierarchy.", byFunction: [
    {func:"Nursing / Clinical",span:"5-8",layers:"5-6",rationale:"Patient safety, shift coverage, licensure oversight"},
    {func:"Administration",span:"6-10",layers:"4-5",rationale:"Process standardization possible"},
    {func:"Revenue Cycle",span:"8-12",layers:"4-5",rationale:"High-volume transactional work"},
    {func:"Health IT",span:"6-8",layers:"4-5",rationale:"Project-based, vendor management"},
  ]},
  { industry: "Manufacturing", icon: "🏭", avgSpan: 7.0, optimalSpan: "6-10", avgLayers: 6, optimalLayers: "5-7", mgrRatio: "1:8", notes: "Plant floor has wider spans (shift supervisors manage 10-20). Corporate functions narrower. Safety requirements add oversight layers.", byFunction: [
    {func:"Production / Plant",span:"10-20",layers:"4-5",rationale:"Standardized operations, shift-based"},
    {func:"Quality / EHS",span:"6-8",layers:"5-6",rationale:"Compliance and safety oversight"},
    {func:"Engineering / R&D",span:"5-7",layers:"5-6",rationale:"Complex projects, technical mentorship"},
    {func:"Supply Chain",span:"7-10",layers:"5-6",rationale:"Process-driven, KPI-managed"},
  ]},
  { industry: "Retail", icon: "🛍️", avgSpan: 10.0, optimalSpan: "8-15", avgLayers: 5, optimalLayers: "4-6", mgrRatio: "1:10", notes: "Very wide spans at store level. Corporate narrower. Seasonal workforce creates variable spans. Digital/e-commerce teams look more like tech.", byFunction: [
    {func:"Store Operations",span:"12-20",layers:"3-4",rationale:"Standardized tasks, POS-driven"},
    {func:"Merchandising",span:"6-8",layers:"5-6",rationale:"Category expertise, vendor relationships"},
    {func:"E-Commerce / Digital",span:"8-10",layers:"4-5",rationale:"Tech-influenced, agile teams"},
    {func:"Corporate (HR, Finance)",span:"5-7",layers:"5-6",rationale:"Standard corporate functions"},
  ]},
  { industry: "Professional Services", icon: "💼", avgSpan: 5.0, optimalSpan: "4-7", avgLayers: 5, optimalLayers: "4-6", mgrRatio: "1:5", notes: "Leverage model (Partner → Manager → Analyst) creates natural narrow spans. Utilization targets constrain management bandwidth. Practice areas are the primary org dimension.", byFunction: [
    {func:"Consulting / Delivery",span:"4-6",layers:"4-5",rationale:"Leverage model, mentorship-intensive"},
    {func:"Business Development",span:"3-5",layers:"4-5",rationale:"Relationship-driven, partner-led"},
    {func:"Back Office",span:"6-10",layers:"3-4",rationale:"Shared services, standardized"},
    {func:"Research / Knowledge",span:"5-8",layers:"3-4",rationale:"Specialist expertise"},
  ]},
];


export const SKILLS_TAXONOMY: { domain: string; color: string; icon: string; skills: { name: string; profLevels: string[]; industries?: string[] }[] }[] = [
  { domain: "Technical & Engineering", color: "#D4860A", icon: "⚙️", skills: [
    {name:"Software Engineering",profLevels:["Can read code","Can write features","Can architect systems","Can lead platform design"]},
    {name:"Data Engineering",profLevels:["SQL basics","Pipeline building","Data architecture","Enterprise data strategy"]},
    {name:"Cloud Platforms (AWS/Azure/GCP)",profLevels:["Basic deployment","Multi-service usage","Architecture design","Enterprise cloud strategy"]},
    {name:"DevOps & CI/CD",profLevels:["Understands pipelines","Builds automations","Designs infrastructure","Platform engineering lead"]},
    {name:"Cybersecurity",profLevels:["Security awareness","Vulnerability assessment","Security architecture","CISO-level strategy"]},
    {name:"Machine Learning / AI",profLevels:["Understands concepts","Builds models","Production ML systems","AI strategy & governance"]},
    {name:"ERP Systems (SAP/Oracle)",profLevels:["End-user","Configuration","Customization","Architecture & integration"],industries:["Manufacturing","Financial Services"]},
    {name:"HRIS / Workday",profLevels:["End-user","Report building","Configuration","Architecture"],industries:["General"]},
  ]},
  { domain: "Leadership & Management", color: "#8B5CF6", icon: "👔", skills: [
    {name:"People Leadership",profLevels:["Peer influence","Team lead (3-5)","Director (15-50)","Executive (100+)"]},
    {name:"Strategic Thinking",profLevels:["Understands strategy","Contributes to planning","Shapes function strategy","Sets enterprise direction"]},
    {name:"Change Management",profLevels:["Adapts to change","Supports change","Leads change programs","Transforms organizations"]},
    {name:"Stakeholder Management",profLevels:["Manages upward","Cross-functional influence","Executive communication","Board-level engagement"]},
    {name:"Decision Making",profLevels:["Follows frameworks","Data-driven decisions","Complex tradeoff analysis","Ambiguity navigation"]},
    {name:"Coaching & Development",profLevels:["Provides feedback","Mentors individuals","Builds team capability","Creates learning culture"]},
  ]},
  { domain: "Analytical & Quantitative", color: "#10B981", icon: "📊", skills: [
    {name:"Data Analysis",profLevels:["Basic reporting","Trend analysis","Advanced analytics","Predictive modeling"]},
    {name:"Financial Modeling",profLevels:["Reads financials","Builds models","Complex scenarios","Enterprise valuation"],industries:["Financial Services","General"]},
    {name:"Statistical Analysis",profLevels:["Descriptive stats","Hypothesis testing","Regression/ML","Experimental design"]},
    {name:"Business Intelligence",profLevels:["Consumes dashboards","Builds reports","Designs BI architecture","Enterprise analytics strategy"]},
    {name:"Process Analysis",profLevels:["Documents processes","Identifies improvements","Lean/Six Sigma","Process transformation"]},
  ]},
  { domain: "Communication & Influence", color: "#F97316", icon: "💬", skills: [
    {name:"Written Communication",profLevels:["Clear emails","Reports & proposals","Executive communications","Published thought leadership"]},
    {name:"Presentation Skills",profLevels:["Team updates","Client presentations","Executive briefings","Keynote / board-level"]},
    {name:"Negotiation",profLevels:["Basic bargaining","Contract negotiation","Complex multi-party","Strategic deal-making"]},
    {name:"Cross-Cultural Communication",profLevels:["Awareness","Working across cultures","Leading global teams","Global strategy development"]},
  ]},
  { domain: "Digital & AI Fluency", color: "#E8C547", icon: "🤖", skills: [
    {name:"AI Tool Usage",profLevels:["Basic prompting","Workflow integration","Custom automations","AI strategy & governance"]},
    {name:"Prompt Engineering",profLevels:["Simple queries","Complex chain-of-thought","System design","Enterprise AI patterns"]},
    {name:"No-Code / Low-Code",profLevels:["Template usage","Custom workflows","Integration design","Platform architecture"]},
    {name:"Data Literacy",profLevels:["Reads charts","Interprets data","Designs metrics","Data-driven culture leadership"]},
    {name:"Process Automation",profLevels:["Identifies opportunities","Builds simple automations","RPA/workflow design","Enterprise automation strategy"]},
  ]},
  { domain: "Domain-Specific", color: "#B8602A", icon: "🏢", skills: [
    {name:"Regulatory & Compliance",profLevels:["Follows regulations","Monitors changes","Designs compliance programs","Enterprise risk governance"],industries:["Financial Services","Healthcare"]},
    {name:"Clinical Knowledge",profLevels:["Basic terminology","Clinical workflows","Evidence-based practice","Clinical governance"],industries:["Healthcare"]},
    {name:"Supply Chain Management",profLevels:["Understands flow","Demand/supply planning","Network optimization","Global supply strategy"],industries:["Manufacturing","Retail"]},
    {name:"Investment Analysis",profLevels:["Financial literacy","Fundamental analysis","Portfolio construction","Investment committee-level"],industries:["Financial Services"]},
    {name:"HR / People Operations",profLevels:["HR admin","HRBP support","HR strategy","CHRO-level"],industries:["General"]},
    {name:"Legal & Contract Management",profLevels:["Contract review","Drafting & negotiation","Legal strategy","General counsel-level"],industries:["Legal","General"]},
  ]},
];


// Type for per-job work design state

/* ═══════════════════════════════════════════════════════════════
   AI JOB AUTO-SUGGEST — Gemini-powered skill/task inference
   Reusable component: cache, review panel, accept/edit/dismiss
   ═══════════════════════════════════════════════════════════════ */

export interface AiJobSuggestion {
  tasks: { name: string; hours_per_week: number; ai_impact: string; task_type: string; interaction: string; logic: string }[];
  skills: { category: string; skills: string[] }[];
  kpis: string[];
  responsibilities: string[];
  collaborates_with: string[];
  external_parties: string[];
}

const AI_SUGGEST_CACHE_KEY = "ai_job_suggest_cache";
const AI_SUGGEST_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function _getCachedSuggestion(title: string, industry: string): AiJobSuggestion | null {
  try {
    const raw = localStorage.getItem(AI_SUGGEST_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, { data: AiJobSuggestion; ts: number }>;
    const key = `${title.toLowerCase().trim()}|${industry.toLowerCase().trim()}`;
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > AI_SUGGEST_CACHE_EXPIRY_MS) {
      delete cache[key];
      localStorage.setItem(AI_SUGGEST_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.data;
  } catch { return null; }
}

function _setCachedSuggestion(title: string, industry: string, data: AiJobSuggestion) {
  try {
    const raw = localStorage.getItem(AI_SUGGEST_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) as Record<string, { data: AiJobSuggestion; ts: number }> : {};
    const key = `${title.toLowerCase().trim()}|${industry.toLowerCase().trim()}`;
    cache[key] = { data, ts: Date.now() };
    // Prune expired entries
    for (const k of Object.keys(cache)) {
      if (Date.now() - cache[k].ts > AI_SUGGEST_CACHE_EXPIRY_MS) delete cache[k];
    }
    localStorage.setItem(AI_SUGGEST_CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full — skip */ }
}

export function AiJobSuggestButton({ title, industry, onAccept, compact }: {
  title: string;
  industry?: string;
  onAccept: (data: AiJobSuggestion) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!title || title === "New Role") return null;

  return <>
    <button onClick={() => setOpen(true)}
      className={`${compact ? "px-2 py-1 text-[9px]" : "px-3 py-1.5 text-[10px]"} rounded-lg font-semibold bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 transition-all inline-flex items-center gap-1`}>
      <span>✨</span> Auto-suggest
    </button>
    {open && <AiJobSuggestPanel title={title} industry={industry || "technology"} onAccept={d => { onAccept(d); setOpen(false); }} onClose={() => setOpen(false)} />}
  </>;
}

function AiJobSuggestPanel({ title, industry, onAccept, onClose }: {
  title: string; industry: string;
  onAccept: (data: AiJobSuggestion) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<AiJobSuggestion | null>(null);
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [checkedSkills, setCheckedSkills] = useState<Set<number>>(new Set());
  const [checkedKpis, setCheckedKpis] = useState<Set<number>>(new Set());
  const [checkedResps, setCheckedResps] = useState<Set<number>>(new Set());
  const [editIdx, setEditIdx] = useState<{ section: string; idx: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  // On mount — check cache first, then fetch
  useEffect(() => {
    const cached = _getCachedSuggestion(title, industry);
    if (cached) {
      setSuggestion(cached);
      _selectAll(cached);
      return;
    }
    fetchSuggestion();
  }, [title, industry]);

  function _selectAll(data: AiJobSuggestion) {
    setCheckedTasks(new Set(data.tasks.map((_, i) => i)));
    setCheckedSkills(new Set(data.skills.map((_, i) => i)));
    setCheckedKpis(new Set(data.kpis.map((_, i) => i)));
    setCheckedResps(new Set(data.responsibilities.map((_, i) => i)));
  }

  async function fetchSuggestion() {
    setLoading(true);
    setError("");
    const prompt = `For the job title "${title}" in the ${industry} industry, suggest:
1. 8-10 key tasks with estimated hours per week for each, AI impact level (High/Moderate/Low), task type (Repetitive/Variable), interaction level (Independent/Interactive/Collaborative), and logic type (Deterministic/Probabilistic/Judgment-heavy)
2. 6-8 required skills grouped by category (Technical, Functional, Leadership, Digital/AI)
3. 4-5 typical KPIs used to measure this role
4. 3-5 key responsibilities
5. Internal teams this role typically collaborates with
6. External parties they interact with

Return ONLY valid JSON in this exact format:
{"tasks":[{"name":"task name","hours_per_week":5,"ai_impact":"High","task_type":"Repetitive","interaction":"Independent","logic":"Deterministic"}],"skills":[{"category":"Technical","skills":["skill1","skill2"]}],"kpis":["KPI 1","KPI 2"],"responsibilities":["resp 1"],"collaborates_with":["team 1"],"external_parties":["party 1"]}`;

    const raw = await callAI(
      "You are an expert organizational design consultant. Return ONLY valid JSON, no markdown.",
      prompt
    );

    if (raw.startsWith("[AI") || raw.startsWith("[Rate")) {
      setError("Auto-suggest unavailable right now — you can enter details manually");
      setLoading(false);
      return;
    }

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as AiJobSuggestion;
      // Validate minimum structure
      if (!parsed.tasks || !Array.isArray(parsed.tasks) || parsed.tasks.length === 0) throw new Error("No tasks");
      setSuggestion(parsed);
      _setCachedSuggestion(title, industry, parsed);
      _selectAll(parsed);
    } catch {
      setError("Auto-suggest unavailable right now — you can enter details manually");
    }
    setLoading(false);
  }

  function toggleCheck(set: Set<number>, setFn: (s: Set<number>) => void, idx: number) {
    const next = new Set(set);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setFn(next);
  }

  function handleAcceptSelected() {
    if (!suggestion) return;
    const accepted: AiJobSuggestion = {
      tasks: suggestion.tasks.filter((_, i) => checkedTasks.has(i)),
      skills: suggestion.skills.filter((_, i) => checkedSkills.has(i)),
      kpis: suggestion.kpis.filter((_, i) => checkedKpis.has(i)),
      responsibilities: suggestion.responsibilities.filter((_, i) => checkedResps.has(i)),
      collaborates_with: suggestion.collaborates_with,
      external_parties: suggestion.external_parties,
    };
    onAccept(accepted);
    showToast(`✨ Accepted ${accepted.tasks.length} tasks, ${accepted.skills.reduce((s, g) => s + g.skills.length, 0)} skills for ${title}`);
  }

  function handleEditSave() {
    if (!editIdx || !suggestion) return;
    const updated = { ...suggestion };
    if (editIdx.section === "task") {
      updated.tasks = [...updated.tasks];
      updated.tasks[editIdx.idx] = { ...updated.tasks[editIdx.idx], name: editValue };
    } else if (editIdx.section === "kpi") {
      updated.kpis = [...updated.kpis];
      updated.kpis[editIdx.idx] = editValue;
    } else if (editIdx.section === "resp") {
      updated.responsibilities = [...updated.responsibilities];
      updated.responsibilities[editIdx.idx] = editValue;
    }
    setSuggestion(updated);
    setEditIdx(null);
  }

  const checkboxStyle: React.CSSProperties = { accentColor: "#A855F7", width: 13, height: 13, cursor: "pointer" };

  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
    <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720, maxHeight: "85vh", overflow: "auto", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: "24px", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-bold font-heading text-[var(--text-primary)] flex items-center gap-2">✨ AI Auto-Suggest <span className="text-[12px] font-normal text-purple-400">{title}</span></h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Review suggestions below. Check items to accept, double-click to edit, then confirm.</p>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg">✕</button>
      </div>

      {/* Loading shimmer */}
      {loading && <div className="space-y-3 py-8">
        <div className="text-center text-[13px] text-purple-400 font-semibold mb-4">AI is analyzing this role...</div>
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: `linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3, rgba(255,255,255,0.05)) 50%, var(--surface-2) 75%)`, backgroundSize: "200% 100%", animation: `shimmer 1.5s infinite ${i * 0.15}s` }} />)}
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      </div>}

      {/* Error state */}
      {error && <div className="text-center py-8">
        <div className="text-2xl mb-3 opacity-40">⚡</div>
        <p className="text-[13px] text-[var(--text-secondary)] mb-2">{error}</p>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent-primary)]">Continue manually</button>
      </div>}

      {/* Results */}
      {suggestion && !loading && <>
        {/* Tasks */}
        <div className="mb-4">
          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Tasks ({checkedTasks.size}/{suggestion.tasks.length} selected)</div>
          <div className="space-y-1">
            {suggestion.tasks.map((t, i) => <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--hover)] text-[11px]">
              <input type="checkbox" checked={checkedTasks.has(i)} onChange={() => toggleCheck(checkedTasks, setCheckedTasks, i)} style={checkboxStyle} />
              {editIdx?.section === "task" && editIdx.idx === i ? (
                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleEditSave} onKeyDown={e => e.key === "Enter" && handleEditSave()}
                  className="flex-1 bg-[var(--surface-2)] border border-purple-500/40 rounded px-2 py-0.5 text-[11px] text-[var(--text-primary)] outline-none" />
              ) : (
                <span className="flex-1 text-[var(--text-primary)] cursor-text" onDoubleClick={() => { setEditIdx({ section: "task", idx: i }); setEditValue(t.name); }}>{t.name}</span>
              )}
              <span className="text-[9px] font-data text-[var(--text-muted)] w-12 text-right">{t.hours_per_week}h/wk</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${t.ai_impact === "High" ? "bg-red-500/10 text-red-400" : t.ai_impact === "Moderate" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"}`}>{t.ai_impact}</span>
            </div>)}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Skills by Category ({checkedSkills.size}/{suggestion.skills.length} groups selected)</div>
          <div className="grid grid-cols-2 gap-2">
            {suggestion.skills.map((g, i) => <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              <input type="checkbox" checked={checkedSkills.has(i)} onChange={() => toggleCheck(checkedSkills, setCheckedSkills, i)} style={{ ...checkboxStyle, marginTop: 2 }} />
              <div>
                <div className="text-[10px] font-semibold text-[var(--accent-primary)]">{g.category}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{g.skills.join(", ")}</div>
              </div>
            </div>)}
          </div>
        </div>

        {/* KPIs + Responsibilities side by side */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">KPIs</div>
            {suggestion.kpis.map((k, i) => <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
              <input type="checkbox" checked={checkedKpis.has(i)} onChange={() => toggleCheck(checkedKpis, setCheckedKpis, i)} style={checkboxStyle} />
              {editIdx?.section === "kpi" && editIdx.idx === i ? (
                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleEditSave} onKeyDown={e => e.key === "Enter" && handleEditSave()}
                  className="flex-1 bg-[var(--surface-2)] border border-purple-500/40 rounded px-2 py-0.5 text-[11px] text-[var(--text-primary)] outline-none" />
              ) : (
                <span className="text-[var(--text-secondary)] cursor-text" onDoubleClick={() => { setEditIdx({ section: "kpi", idx: i }); setEditValue(k); }}>{k}</span>
              )}
            </div>)}
          </div>
          <div>
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Responsibilities</div>
            {suggestion.responsibilities.map((r, i) => <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
              <input type="checkbox" checked={checkedResps.has(i)} onChange={() => toggleCheck(checkedResps, setCheckedResps, i)} style={checkboxStyle} />
              {editIdx?.section === "resp" && editIdx.idx === i ? (
                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleEditSave} onKeyDown={e => e.key === "Enter" && handleEditSave()}
                  className="flex-1 bg-[var(--surface-2)] border border-purple-500/40 rounded px-2 py-0.5 text-[11px] text-[var(--text-primary)] outline-none" />
              ) : (
                <span className="text-[var(--text-secondary)] cursor-text" onDoubleClick={() => { setEditIdx({ section: "resp", idx: i }); setEditValue(r); }}>{r}</span>
              )}
            </div>)}
          </div>
        </div>

        {/* Collaborators (info only, no checkbox) */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Collaborates With</div>
            <div className="flex flex-wrap gap-1">{suggestion.collaborates_with.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[9px] text-[var(--text-secondary)]">{t}</span>)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">External Parties</div>
            <div className="flex flex-wrap gap-1">{suggestion.external_parties.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[9px] text-[var(--text-secondary)]">{t}</span>)}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <div className="flex gap-2">
            <button onClick={() => _selectAll(suggestion)} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-purple-400">Select All</button>
            <button onClick={() => { setCheckedTasks(new Set()); setCheckedSkills(new Set()); setCheckedKpis(new Set()); setCheckedResps(new Set()); }} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Deselect All</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Dismiss</button>
            <button onClick={handleAcceptSelected} disabled={checkedTasks.size === 0 && checkedSkills.size === 0}
              className="px-4 py-2 rounded-lg text-[11px] font-semibold text-white disabled:opacity-40 transition-all" style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}>
              Accept Selected
            </button>
          </div>
        </div>
      </>}
    </div>
  </div>;
}


export interface JobDesignState {
  deconRows: Record<string, unknown>[];
  redeployRows: Record<string, unknown>[];
  scenario: string;
  deconSubmitted: boolean;
  redeploySubmitted: boolean;
  finalized: boolean;
  recon: Record<string, unknown> | null;
  initialized: boolean;
}
