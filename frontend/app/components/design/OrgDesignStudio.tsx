"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import { fmt } from "../../../lib/formatters";
import {
  ViewContext, COLORS, SPAN_BENCHMARKS,
  KpiCard, Card, Empty, Badge, InsightPanel, DataTable,
  BarViz, DonutViz, TabBar, PageHeader, LoadingBar,
  NextStepBar, ContextStrip,
  useApiData, usePersisted, callAI, showToast, JobDesignState, fmtNum,
} from "../shared";
import { Network, Layers3, Users, BookOpen, Sparkle, TriangleAlert, Check, Gauge, GitBranch, ChevronLeft, ChevronRight } from "@/lib/icons";
import { HeroMetric, ExpertPanel, FlowNav, EmptyState } from "@/app/ui";
import { computeScenarioDelta, computeImpactScore } from "@/lib/computed/orgScenario";
import { EmployeeOrgChart } from "../OverviewModule";
import LayerDistributionChart from "./LayerDistributionChart";
import type { LayerData } from "./LayerDistributionChart";
import CostModelChart from "./CostModelChart";
import type { LayerCostData } from "./CostModelChart";
import RoleMigrationChart from "./RoleMigrationChart";
import type { DepartmentMigration } from "./RoleMigrationChart";

const ODS_DEPTS = ["Executive Office","Finance & Accounting","Human Resources","Marketing","Product Design","Supply Chain","IT & Digital","Sales & Commercial","Legal & Compliance","Operations"];
const ODS_LEVELS = ["E5","E4","E3","E2","E1","M6","M5","M4","M3","M2","M1","P8","P7","P6","P5","P4","P3","P2","P1","T8","T7","T6","T5","T4","T3","T2","T1","S6","S5","S4","S3","S2","S1"];
const ODS_AVG_COMP: Record<string, number> = { "E5": 650000, "E4": 450000, "E3": 375000, "E2": 310000, "E1": 250000, "M6": 225000, "M5": 190000, "M4": 155000, "M3": 120000, "M2": 95000, "M1": 75000, "P8": 340000, "P7": 260000, "P6": 218000, "P5": 175000, "P4": 142000, "P3": 115000, "P2": 95000, "P1": 72000, "T8": 360000, "T7": 280000, "T6": 235000, "T5": 195000, "T4": 162000, "T3": 130000, "T2": 105000, "T1": 82000, "S6": 90000, "S5": 81000, "S4": 73000, "S3": 66000, "S2": 57000, "S1": 48000 };
let _odsSeed = 42;

function odsRand() { _odsSeed = (_odsSeed * 16807 + 0) % 2147483647; return _odsSeed / 2147483647; }
function odsGenDept() { _odsSeed = 42; // Reset seed for consistency
  return ODS_DEPTS.map(name => {
    const hc = Math.floor(odsRand() * 160) + 25;
    const mgrs = Math.max(3, Math.floor(hc * (0.08 + odsRand() * 0.12)));
    const ics = hc - mgrs;
    const layers = Math.floor(odsRand() * 3) + 3;
    const fteRatio = 0.68 + odsRand() * 0.27;
    const levelDist: Record<string, number> = {};
    let rem = hc;
    ODS_LEVELS.forEach((l, i) => { if (i === ODS_LEVELS.length - 1) { levelDist[l] = rem; return; } const share = i < 2 ? 0.02 + odsRand() * 0.03 : i < 4 ? 0.06 + odsRand() * 0.08 : 0.1 + odsRand() * 0.1; const n = Math.max(1, Math.round(hc * share)); levelDist[l] = Math.min(n, rem); rem -= levelDist[l]; });
    return { id: odsRand().toString(36).slice(2, 8), name, headcount: hc, managers: mgrs, ics, layers, avgSpan: Math.round((ics / mgrs) * 10) / 10, fteRatio: Math.round(fteRatio * 1000) / 1000, contractors: Math.floor(hc * (1 - fteRatio)), ftes: hc - Math.floor(hc * (1 - fteRatio)), levelDist };
  });
}
function odsGenScenario(base: ReturnType<typeof odsGenDept>, label: string, intensity = 0.5, idx = 0) {
  return { id: `scenario_${label.toLowerCase().replace(/\s+/g,"_")}_${idx}`, label, departments: base.map(d => {
    const hcD = Math.floor((odsRand() - 0.35) * 20 * intensity);
    const hc = Math.max(10, d.headcount + hcD);
    const mgrs = Math.max(2, d.managers - Math.max(0, Math.floor(odsRand() * 4 * intensity)));
    const ics = hc - mgrs;
    const layers = Math.max(2, d.layers - (odsRand() > 0.6 - intensity * 0.3 ? 1 : 0));
    const fteRatio = Math.min(0.98, d.fteRatio + odsRand() * 0.1 * intensity);
    return { ...d, id: odsRand().toString(36).slice(2, 8), headcount: hc, managers: mgrs, ics, layers, avgSpan: Math.round((ics / mgrs) * 10) / 10, fteRatio: Math.round(fteRatio * 1000) / 1000, contractors: Math.floor(hc * (1 - fteRatio)), ftes: hc - Math.floor(hc * (1 - fteRatio)), newRoles: Math.floor(odsRand() * 3 * intensity), removedRoles: Math.floor(odsRand() * 4 * intensity), restructuredRoles: Math.floor(odsRand() * 5 * intensity) };
  }) };
}
function odsAgg(data: ReturnType<typeof odsGenDept>) {
  const hc = data.reduce((s, d) => s + d.headcount, 0); const mgr = data.reduce((s, d) => s + d.managers, 0); const ic = data.reduce((s, d) => s + d.ics, 0);
  let cost = 0; data.forEach(d => { if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { cost += n * (ODS_AVG_COMP[l] || 85000); }); });
  return { hc, mgr, ic, avgS: mgr > 0 ? ic / mgr : 0, avgL: data.reduce((s, d) => s + d.layers, 0) / data.length, cost };
}

export function OrgDesignStudio({ onBack, model, f, odsState, setOdsState, viewCtx, jobStates }: { onBack: () => void; model: string; f: Filters; odsState: { activeScenario: number; view: string }; setOdsState: (s: { activeScenario: number; view: string }) => void; viewCtx?: ViewContext; jobStates?: Record<string, JobDesignState> }) {
  // Try to build from real org data
  const [orgData] = useApiData(() => model ? api.getOrgDiagnostics(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);
  const [overviewData] = useApiData(() => model ? api.getOverview(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);

  const hasRealData = orgData && (orgData as Record<string,unknown>).kpis && ((orgData as Record<string,unknown>).kpis as Record<string,unknown>).total as number > 0;

  const [currentData, setCurrentData] = useState(() => odsGenDept());
  const [scenarios, setScenarios] = useState(() => [odsGenScenario(odsGenDept(), "Optimized", 0.5, 0), odsGenScenario(odsGenDept(), "Aggressive", 0.9, 1), odsGenScenario(odsGenDept(), "Conservative", 0.25, 2)]);
  const [aiOdsLoading, setAiOdsLoading] = useState(false);
  const [aiOdsInsights, setAiOdsInsights] = useState<string[]>([]);
  const activeScenario = odsState.activeScenario;
  const view = odsState.view;
  const setActiveScenario = (i: number) => setOdsState({ ...odsState, activeScenario: i });
  const setView = (v: string) => setOdsState({ ...odsState, view: v });

  // Build from real data if available — use func_distribution to create dept structure
  const realDataBuilt = useRef(false);
  useEffect(() => {
    if (realDataBuilt.current) return;
    const fd = ((overviewData as Record<string,unknown>)?.func_distribution ?? []) as {name:string;value:number}[];
    if (fd.length >= 2) {
      realDataBuilt.current = true;
      const orgK = ((orgData as Record<string,unknown>)?.kpis ?? {}) as Record<string,number>;
      const totalHC = orgK.total || fd.reduce((s,d) => s + Number(d.value), 0);
      const avgMgrRatio = orgK.managers && orgK.total ? orgK.managers / orgK.total : 0.12;
      const avgLayers = orgK.layers || 4;
      const depts = fd.map(d => {
        const hc = Number(d.value) || 20;
        const mgrs = Math.max(2, Math.round(hc * avgMgrRatio));
        const ics = hc - mgrs;
        const layers = Math.max(2, Math.min(6, avgLayers + Math.floor(Math.random()*2 - 1)));
        const fteRatio = 0.75 + Math.random() * 0.2;
        const levelDist: Record<string,number> = {};
        let rem = hc;
        ODS_LEVELS.forEach((l, i) => { if (i === ODS_LEVELS.length - 1) { levelDist[l] = rem; return; } const share = i < 2 ? 0.02 + Math.random()*0.03 : i < 4 ? 0.06 + Math.random()*0.08 : 0.1 + Math.random()*0.1; const n = Math.max(1, Math.round(hc * share)); levelDist[l] = Math.min(n, rem); rem -= levelDist[l]; });
        return { id: Math.random().toString(36).slice(2,8), name: d.name, headcount: hc, managers: mgrs, ics, layers, avgSpan: Math.round((ics/mgrs)*10)/10, fteRatio: Math.round(fteRatio*1000)/1000, contractors: Math.floor(hc*(1-fteRatio)), ftes: hc - Math.floor(hc*(1-fteRatio)), levelDist };
      });
      setCurrentData(depts);
      setScenarios([odsGenScenario(depts, "Optimized", 0.5, 0), odsGenScenario(depts, "Aggressive", 0.9, 1), odsGenScenario(depts, "Conservative", 0.25, 2)]);
    }
  }, [overviewData, orgData]);

  // Fall back to generated data if no real data
  useEffect(() => {
    if (realDataBuilt.current) return;
    const c = odsGenDept();
    setCurrentData(c);
    setScenarios([odsGenScenario(c, "Optimized", 0.5, 0), odsGenScenario(c, "Aggressive", 0.9, 1), odsGenScenario(c, "Conservative", 0.25, 2)]);
  }, []);

  const sc = scenarios[activeScenario] || scenarios[0] || { id: 0, label: "Default", departments: currentData };
  const cA = useMemo(() => odsAgg(currentData), [currentData]);
  const fA = useMemo(() => odsAgg(sc?.departments || []), [sc]);
  const [selDept, setSelDept] = useState(0);
  const [layerScope, setLayerScope] = useState("all");

  // Span Detail state (must be at top level — not inside conditional IIFE)
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // Phase 1 Elevation: Analyze sub-tab state
  const [analyzeSubTab, setAnalyzeSubTab] = useState<string>("soc");

  // Upgrade 1: What-If Simulator state
  const [simTargetSpan, setSimTargetSpan] = useState(7);
  const [simMaxLayers, setSimMaxLayers] = useState(5);

  // Upgrade 2: Scenario Builder drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customPreset, setCustomPreset] = useState<string>("Optimized");
  const [customSpanMin, setCustomSpanMin] = useState(6);
  const [customSpanMax, setCustomSpanMax] = useState(8);
  const [customMaxLayers, setCustomMaxLayers] = useState(5);
  const [customMinFte, setCustomMinFte] = useState(80);
  const [customCostCeiling, setCustomCostCeiling] = useState(200);
  const [customMgrRatioCap, setCustomMgrRatioCap] = useState(12);
  const [customLabel, setCustomLabel] = useState<string | null>(null);

  // Upgrade 3: Insights filter state
  const [insightFilter, setInsightFilter] = useState<string>("all");

  const DChip = ({ a, b, inv }: { a: number; b: number; inv?: boolean }) => {
    const diff = b - a; const pos = inv ? diff < 0 : diff > 0; const neg = inv ? diff > 0 : diff < 0;
    const c = pos ? "var(--success)" : neg ? "var(--risk)" : "var(--text-muted)";
    const ar = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[15px] font-bold" style={{ color: c, background: pos ? "rgba(52,211,153,0.1)" : neg ? "rgba(251,113,133,0.1)" : "transparent" }}>{ar}{fmt(Math.abs(diff))}</span>;
  };

  const HBar = ({ value, max, color }: { value: number; max: number; color: string }) => <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: `${color}12` }}><div className="h-full rounded-full transition-all" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} /></div>;

  // Phase 2 Elevation: Reusable KPI card
  const OdsKpiCard = ({ label, value, delta, deltaColor, sub }: { label: string; value: string | number; delta?: string; deltaColor?: string; sub?: string }) => (
    <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 14, minWidth: 0, flex: '1 1 160px', maxWidth: 200 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(28,43,58,0.55)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 500, color: '#05070d', lineHeight: 1.1 }}>{value}</span>
        {delta && <span style={{ fontSize: 12, fontWeight: 500, color: deltaColor || 'rgba(28,43,58,0.55)' }}>{delta}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const OdsKpi = ({ label, current, future, inv }: { label: string; current: number; future: number; inv?: boolean }) => (
    <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
      <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-baseline gap-3">
        <div><div className="text-[15px] text-[var(--text-muted)]">Current</div><div className="text-xl font-extrabold text-[var(--accent-primary)]">{fmt(current)}</div></div>
        <span className="text-[var(--text-muted)]">→</span>
        <div><div className="text-[15px] text-[var(--text-muted)]">Proposed</div><div className="text-xl font-extrabold text-[var(--success)]">{fmt(future)}</div></div>
      </div>
      <div className="mt-1"><DChip a={current} b={future} inv={inv} /></div>
    </div>
  );

  // Job view: structural context
  if (viewCtx?.mode === "job" && viewCtx?.job) {
    const matchDept = currentData.find(d => d.name.toLowerCase().includes((viewCtx.job || "").split(" ")[0].toLowerCase())) || currentData[0];
    const matchFuture = sc.departments[currentData.indexOf(matchDept)] || sc.departments[0];
    return <div>
      <PageHeader icon={<Layers3 />} title={`Structural Context — ${viewCtx.job}`} subtitle="Where this role sits in the org structure" onBack={onBack} moduleId="build" />
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Department" value={matchDept?.name || "—"} /><KpiCard label="Dept HC" value={matchDept?.headcount || 0} /><KpiCard label="Span" value={matchDept?.avgSpan || 0} accent /><KpiCard label="Layers" value={matchDept?.layers || 0} /><KpiCard label="Managers" value={matchDept?.managers || 0} />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card title="Current vs Future State">
          <div className="space-y-3">
            {[{ label: "Headcount", c: matchDept?.headcount, f: matchFuture?.headcount },
              { label: "Avg Span", c: matchDept?.avgSpan, f: matchFuture?.avgSpan },
              { label: "Layers", c: matchDept?.layers, f: matchFuture?.layers },
              { label: "Managers", c: matchDept?.managers, f: matchFuture?.managers },
            ].map(r => <div key={r.label} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[15px] text-[var(--text-secondary)]">{r.label}</span>
              <div className="flex items-center gap-3 text-[15px]"><span className="text-[var(--accent-primary)] font-semibold">{r.c || 0}</span><span className="text-[var(--text-muted)]">→</span><span className="text-[var(--success)] font-semibold">{r.f || 0}</span><DChip a={Number(r.c || 0)} b={Number(r.f || 0)} inv /></div>
            </div>)}
          </div>
        </Card>
        <InsightPanel title="Structural Insights" items={[
          `${viewCtx.job} sits in ${matchDept?.name || "this department"} with ${matchDept?.headcount || 0} total headcount.`,
          `Current span of control is ${matchDept?.avgSpan || 0} — ${(matchDept?.avgSpan || 0) < 5 ? "narrow, suggesting over-management" : (matchDept?.avgSpan || 0) > 10 ? "wide, risk of insufficient coaching" : "within healthy range"}.`,
          `The department has ${matchDept?.layers || 0} layers — ${(matchDept?.layers || 0) > 5 ? "consider de-layering" : "reasonable depth"}.`,
          matchFuture && matchFuture.headcount !== matchDept?.headcount ? `Future state targets ${matchFuture.headcount} headcount (${matchFuture.headcount > (matchDept?.headcount || 0) ? "growth" : "optimization"}).` : "No scenario changes applied yet.",
        ]} icon={<Network />} />
      </div>
      <FlowNav
        previous={{ id: "impactsim", label: "Impact Simulator", icon: <Gauge /> }}
        next={{ id: "orgrestructuring", label: "Org Restructuring", icon: <Network /> }}
        onNavigate={onBack}
      />
    </div>;
  }

  // Employee view: show org chart
  if (viewCtx?.mode === "employee" && viewCtx?.employee) return <div>
    <PageHeader icon={<Users />} title="My Org Chart" subtitle={`${viewCtx.employee}'s reporting structure`} onBack={onBack} moduleId="build" />
    <EmployeeOrgChart employee={viewCtx.employee} model={model} f={f} />
    <InsightPanel title="What This Means" items={["Your org chart shows your reporting line, peers at your level, and any direct reports.", "During transformation, your reporting line may change as layers are adjusted.", "Use the Organization View to see how the full structure is being redesigned."]} icon={<Network />} />
  </div>;

  return <div style={{ background: 'var(--ivory, #e8ecf5)', margin: '-24px -24px 0', padding: '24px 24px 0', minHeight: '100vh' }}>
    <ContextStrip items={["You're designing your future org. This is sample data — upload your own to make it real."]} />
    {/* Module header — elevated consulting style */}
    <div className="mb-6">
      <button onClick={onBack} title="Go back (Escape)" className="text-[13px] hover:text-[var(--accent-primary)] mb-3 flex items-center gap-1 transition-colors" style={{ color: 'var(--navy-55, rgba(28,43,58,0.55))' }}>← Back</button>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--navy, #05070d)', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.3 }} className="font-heading">Org Design Studio</h1>
          <p style={{ fontSize: 13, color: 'var(--navy-65, rgba(28,43,58,0.65))', margin: '2px 0 0' }}>Current → Future State Modeling · Multi-Scenario Engine</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Data freshness indicator */}
          <span style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)', fontStyle: 'italic' }}>Data as of: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
    {hasRealData ? <div className="bg-[rgba(52,211,153,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-4 text-[15px] text-[var(--success)]">✓ Using your uploaded workforce data to model departments</div> : <div className="bg-[rgba(251,191,36,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-4 text-[15px] text-[var(--warning)]" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ background: 'rgba(251,191,36,0.15)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>SAMPLE DATA</span><span>Upload your workforce data for real analysis — current charts use generated sample data</span></div>}

    {/* Scenario selector — dropdown with Customize button */}
    <div className="flex gap-3 mb-4 items-center">
      <span className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Scenario:</span>
      <select value={activeScenario} onChange={e => setActiveScenario(Number(e.target.value))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] min-w-[180px]">
        {scenarios.map((s, i) => <option key={s.id} value={i}>{customLabel && i === activeScenario ? customLabel : `${s.label} — ${odsAgg(s.departments).hc} HC, ${fmtNum(odsAgg(s.departments).cost)}`}</option>)}
      </select>
      <button onClick={() => {
        // Pre-fill drawer from current scenario
        const presets: Record<string, { spanMin: number; spanMax: number; maxL: number; minFte: number; costCeil: number; mgrCap: number }> = {
          "Optimized": { spanMin: 6, spanMax: 8, maxL: 5, minFte: 80, costCeil: 200, mgrCap: 12 },
          "Aggressive": { spanMin: 8, spanMax: 10, maxL: 4, minFte: 90, costCeil: 175, mgrCap: 10 },
          "Conservative": { spanMin: 5, spanMax: 7, maxL: 6, minFte: 70, costCeil: 225, mgrCap: 15 },
        };
        const p = presets[sc.label] || presets["Optimized"];
        setCustomPreset(sc.label);
        setCustomSpanMin(p.spanMin); setCustomSpanMax(p.spanMax); setCustomMaxLayers(p.maxL);
        setCustomMinFte(p.minFte); setCustomCostCeiling(p.costCeil); setCustomMgrRatioCap(p.mgrCap);
        setDrawerOpen(true);
      }} className="px-3 py-2 rounded-lg text-[15px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-primary)] flex items-center gap-1.5" title="Customize scenario">⚙ Customize</button>
      <button onClick={async () => {
        setAiOdsLoading(true);
        try {
          const context = currentData.map(d => `${d.name}: ${d.headcount}hd, span ${d.avgSpan}, ${d.layers} layers, ${d.managers} mgrs`).join("; ");
          const aiText1 = await callAI("Return ONLY a valid JSON array of strings.", `Analyze this org structure and give 4-5 specific restructuring recommendations. Current state: ${context}. Return ONLY a JSON array of strings.`);
          setAiOdsInsights(JSON.parse(aiText1.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()));
      } catch (e) { console.error("[DesignModule] AI ODS insights error", e); } setAiOdsLoading(false); }} disabled={aiOdsLoading} className="px-3 py-2 rounded-lg text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: aiOdsLoading ? 0.5 : 1 }}>{aiOdsLoading ? "Analyzing..." : "✨ AI Recommendations"}</button>
      <button onClick={() => { setCustomLabel(null); realDataBuilt.current = false; const c = odsGenDept(); setCurrentData(c); setScenarios([odsGenScenario(c, "Optimized", 0.5, 0), odsGenScenario(c, "Aggressive", 0.9, 1), odsGenScenario(c, "Conservative", 0.25, 2)]); }} className="px-3 py-2 rounded-lg text-[15px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-primary)]">↻ Reset</button>
    </div>

    {/* Scenario Builder Drawer Overlay */}
    {drawerOpen && (() => {
      const presets: Record<string, { spanMin: number; spanMax: number; maxL: number; minFte: number; costCeil: number; mgrCap: number; desc: string }> = {
        "Optimized": { spanMin: 6, spanMax: 8, maxL: 5, minFte: 80, costCeil: 200, mgrCap: 12, desc: "Span 6-8:1, Max 5 layers, Min 80% FTE" },
        "Aggressive": { spanMin: 8, spanMax: 10, maxL: 4, minFte: 90, costCeil: 175, mgrCap: 10, desc: "Span 8-10:1, Max 4 layers, Min 90% FTE" },
        "Conservative": { spanMin: 5, spanMax: 7, maxL: 6, minFte: 70, costCeil: 225, mgrCap: 15, desc: "Span 5-7:1, Max 6 layers, Min 70% FTE" },
      };
      // Compute custom scenario impact preview
      const customHc = (() => {
        let totalHc = 0;
        currentData.forEach(d => {
          const targetSpan = (customSpanMin + customSpanMax) / 2;
          const ics = d.ics;
          const mgrs = Math.max(2, Math.round(ics / targetSpan));
          totalHc += mgrs + ics;
        });
        return totalHc;
      })();
      const customCost = (() => {
        let total = 0;
        currentData.forEach(d => {
          if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { total += n * (ODS_AVG_COMP[l] || 85000); });
        });
        // Adjust proportionally by HC change
        return total * (customHc / Math.max(cA.hc, 1));
      })();
      const costExceeds = customCost / 1e6 > customCostCeiling;

      const SliderRow = ({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) => (
        <div className="mb-3">
          <div className="flex justify-between text-[13px] mb-1">
            <span className="text-[var(--text-muted)] font-semibold">{label}</span>
            <span className="text-[var(--text-primary)] font-bold">{suffix === "$" ? `$${value}M` : `${value}${suffix || ""}`}</span>
          </div>
          <input type="range" min={min} max={max} step={step} value={value} onChange={e => { onChange(Number(e.target.value)); setCustomPreset(""); }} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, #22d3ee ${((value - min) / (max - min)) * 100}%, rgba(34,211,238,0.15) ${((value - min) / (max - min)) * 100}%)` }} />
        </div>
      );

      const drawerRef = React.createRef<HTMLDivElement>();
      const handleDrawerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") { setDrawerOpen(false); return; }
        if (e.key !== "Tab") return;
        const container = drawerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(
          'input, button, [tabindex]:not([tabindex="-1"]), select, textarea, a[href]'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };

      return <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300" onClick={() => setDrawerOpen(false)} />
        {/* Drawer */}
        <div ref={drawerRef} onKeyDown={handleDrawerKeyDown} role="dialog" aria-label="Scenario Builder" className="fixed top-0 right-0 h-full w-[400px] z-50 bg-[#0f172a] border-l border-[var(--border)] shadow-2xl overflow-y-auto transition-transform duration-300" style={{ boxShadow: "0 0 60px rgba(0,0,0,0.5)" }}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[18px] font-bold text-[var(--text-primary)]">Scenario Builder</div>
                <div className="text-[13px] text-[var(--text-muted)]">Presets are starting points — customize every lever to build your scenario</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close scenario builder" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl font-bold px-2">×</button>
            </div>

            {/* UX Guidance */}
            <div className="rounded-lg bg-[rgba(34,211,238,0.06)] border border-[rgba(34,211,238,0.15)] p-3 mb-5 text-[12px] text-[var(--text-secondary)] leading-relaxed">
              Every org design scenario is driven by a set of structural levers. Choose a preset to start, then adjust any lever to see how it changes the outcome. The impact preview at the bottom updates as you move each slider.
            </div>

            {/* Step 1 — Presets */}
            <div className="mb-5">
              <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Step 1 — Choose a Starting Point</div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(presets).map(([name, p]) => (
                  <button key={name} onClick={() => {
                    setCustomPreset(name);
                    setCustomSpanMin(p.spanMin); setCustomSpanMax(p.spanMax); setCustomMaxLayers(p.maxL);
                    setCustomMinFte(p.minFte); setCustomCostCeiling(p.costCeil); setCustomMgrRatioCap(p.mgrCap);
                  }} className="rounded-lg p-3 text-left transition-all duration-200" style={{
                    background: customPreset === name ? "rgba(34,211,238,0.1)" : "var(--surface-2)",
                    border: customPreset === name ? "2px solid #22d3ee" : "2px solid var(--border)",
                  }}>
                    <div className="text-[13px] font-bold text-[var(--text-primary)] mb-0.5">{name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] leading-tight">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Fine-Tune */}
            <div className="mb-5">
              <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Step 2 — Fine-Tune Your Levers</div>
              <SliderRow label="Target Span Range (Min)" value={customSpanMin} min={3} max={10} step={0.5} onChange={setCustomSpanMin} />
              <SliderRow label="Target Span Range (Max)" value={customSpanMax} min={4} max={12} step={0.5} onChange={setCustomSpanMax} />
              <SliderRow label="Max Layers" value={customMaxLayers} min={3} max={8} step={1} onChange={setCustomMaxLayers} />
              <SliderRow label="Min FTE Ratio" value={customMinFte} min={60} max={100} step={5} onChange={setCustomMinFte} suffix="%" />
              <SliderRow label="Cost Ceiling" value={customCostCeiling} min={150} max={250} step={5} onChange={setCustomCostCeiling} suffix="$" />
              <SliderRow label="Manager Ratio Cap" value={customMgrRatioCap} min={8} max={20} step={1} onChange={setCustomMgrRatioCap} suffix="%" />
            </div>

            {/* Step 3 — Review Impact (sticky-ish at bottom) */}
            <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-4 mb-4">
              <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Step 3 — Review Impact</div>
              <div className="space-y-2">
                <div className="flex justify-between text-[14px]">
                  <span className="text-[var(--text-muted)]">Total HC (scenario)</span>
                  <span className="font-bold text-[var(--text-primary)]">{fmt(customHc)}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-[var(--text-muted)]">Est. Cost (scenario)</span>
                  <span className="font-bold" style={{ color: costExceeds ? "var(--risk)" : "var(--success)" }}>{fmtNum(customCost)}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-[var(--text-muted)]">Delta HC vs current</span>
                  <span className="font-bold" style={{ color: customHc < cA.hc ? "var(--success)" : customHc > cA.hc ? "var(--risk)" : "var(--text-muted)" }}>{customHc - cA.hc >= 0 ? "+" : ""}{customHc - cA.hc}</span>
                </div>
              </div>
              {costExceeds && <div className="mt-2 text-[12px] text-[var(--risk)] font-semibold">⚠ Cost exceeds ceiling of ${customCostCeiling}M</div>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => {
                // Apply custom scenario: regenerate with adjusted intensity
                const targetSpan = (customSpanMin + customSpanMax) / 2;
                const intensity = targetSpan >= 8 ? 0.9 : targetSpan >= 6 ? 0.5 : 0.25;
                const customSc = odsGenScenario(currentData, customPreset || "Custom", intensity, activeScenario);
                // Override scenario parameters based on custom levers
                customSc.departments = customSc.departments.map((d, i) => {
                  const base = currentData[i];
                  const mgrs = Math.max(2, Math.round(base.ics / targetSpan));
                  const hc = mgrs + base.ics;
                  const layers = Math.min(customMaxLayers, base.layers);
                  const fteRatio = Math.max(customMinFte / 100, d.fteRatio);
                  return { ...d, headcount: hc, managers: mgrs, ics: base.ics, layers, avgSpan: Math.round((base.ics / mgrs) * 10) / 10, fteRatio: Math.round(fteRatio * 1000) / 1000 };
                });
                const newScenarios = [...scenarios];
                newScenarios[activeScenario] = customSc;
                setScenarios(newScenarios);
                const agg = odsAgg(customSc.departments);
                setCustomLabel(`Custom — ${agg.hc} HC, ${fmtNum(agg.cost)}`);
                setDrawerOpen(false);
              }} className="flex-1 px-4 py-2.5 rounded-lg text-[14px] font-bold text-white transition-all" style={{ background: "#22d3ee" }}>
                Apply Scenario
              </button>
              <button onClick={() => {
                const p = presets[customPreset] || presets["Optimized"];
                setCustomSpanMin(p.spanMin); setCustomSpanMax(p.spanMax); setCustomMaxLayers(p.maxL);
                setCustomMinFte(p.minFte); setCustomCostCeiling(p.costCeil); setCustomMgrRatioCap(p.mgrCap);
              }} className="px-4 py-2.5 rounded-lg text-[14px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-secondary)] transition-all">
                Reset to Preset
              </button>
            </div>
          </div>
        </div>
      </>;
    })()}

    {/* Primary tabs — 5-tab consolidated navigation */}
    <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--navy-12, rgba(28,43,58,0.12))', marginBottom: 0, paddingBottom: 0 }} className="tab-scroll">
      {[{ id: "current", label: "Current State" }, { id: "design", label: "Design" }, { id: "analyze", label: "Analyze" }, { id: "compare", label: "Compare" }, { id: "present", label: "Present" }].map(t => (
        <button key={t.id} onClick={() => setView(t.id)} style={{
          fontSize: 13, fontWeight: 500, padding: '10px 0 10px', background: 'none', border: 'none',
          borderBottom: view === t.id ? '2px solid var(--navy, #05070d)' : '2px solid transparent',
          color: view === t.id ? 'var(--navy, #05070d)' : 'var(--navy-65, rgba(28,43,58,0.65))',
          cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s, border-color 0.15s',
          marginBottom: -1,
        }} className="btn-press">{t.label}</button>
      ))}
    </div>
    {/* Analyze sub-tabs — only visible when Analyze is active */}
    {view === "analyze" && (
      <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid var(--navy-08, rgba(28,43,58,0.08))', paddingTop: 8, marginBottom: 16 }} className="tab-scroll">
        {[{ id: "soc", label: "Span & Layers" }, { id: "cost", label: "Cost" }, { id: "roles", label: "Role Migration" }, { id: "insights", label: "People Impact" }, { id: "benchmarks", label: "Benchmarks" }].map(t => (
          <button key={t.id} onClick={() => setAnalyzeSubTab(t.id)} style={{
            fontSize: 12, fontWeight: 500, padding: '6px 0 8px', background: 'none', border: 'none',
            borderBottom: analyzeSubTab === t.id ? '2px solid var(--navy, #05070d)' : '2px solid transparent',
            color: analyzeSubTab === t.id ? 'var(--navy, #05070d)' : 'var(--navy-55, rgba(28,43,58,0.55))',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s, border-color 0.15s',
            marginBottom: -1,
          }} className="btn-press">{t.label}</button>
        ))}
      </div>
    )}
    {view !== "analyze" && <div style={{ marginBottom: 16 }} />}

    {aiOdsInsights.length > 0 && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.06)] to-transparent border border-[rgba(224,144,64,0.15)] rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2 text-[15px] font-bold" style={{ color: "#f0a050" }}>✨ AI Restructuring Recommendations</div>
      <div className="space-y-1.5">{aiOdsInsights.map((ins, i) => <div key={i} className="text-[15px] text-[var(--text-secondary)] pl-4 relative"><span className="absolute left-0 text-[#f0a050] font-bold">{i+1}.</span>{ins}</div>)}</div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(28,43,58,0.55)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 13 }}>ⓘ</span> These recommendations were generated by AI and should be validated by a domain expert.</div>
    </div>}

    {view === "current" && (() => {
      const OV_MONO = "'JetBrains Mono', monospace";
      const spanHealth = (s: number) => s >= 6 && s <= 8 ? { label: "Optimal", color: "#34d399", badge: "✓" } : s >= 5 && s <= 10 ? { label: s < 6 ? "Narrow" : "Wide", color: "#fbbf24", badge: "◈" } : { label: s < 5 ? "Critically narrow" : "Critically wide", color: "#fb7185", badge: "⚠" };
      const spanImproving = (cur: number, fut: number) => Math.abs(fut - 7) < Math.abs(cur - 7);
      // Scenario impact score: 0-100 based on how much the scenario improves structure
      const deptImprovements = currentData.filter((d, i) => spanImproving(d.avgSpan, sc.departments[i]?.avgSpan || d.avgSpan)).length;
      const layerDelta = cA.avgL - fA.avgL;
      const spanDelta = fA.avgS - cA.avgS;
      const costEfficiency = cA.cost > 0 ? Math.min(Math.abs(fA.cost - cA.cost) / cA.cost * 100, 20) : 0;
      const impactScore = Math.max(0, Math.min(100, Math.round(deptImprovements / Math.max(currentData.length, 1) * 40 + (layerDelta > 0 ? layerDelta * 20 : 0) + (spanDelta > 0 && cA.avgS < 6 ? spanDelta * 20 : 0) + costEfficiency)));
      const impactColor = impactScore >= 70 ? "#34d399" : impactScore >= 40 ? "#fbbf24" : "#fb7185";
      // Sorted departments by health (worst first)
      const sortedDepts = currentData.map((d, i) => ({ ...d, idx: i, fut: sc.departments[i], health: spanHealth(d.avgSpan), futHealth: spanHealth(sc.departments[i]?.avgSpan || d.avgSpan), improving: spanImproving(d.avgSpan, sc.departments[i]?.avgSpan || d.avgSpan) })).sort((a, b) => { const aD = Math.abs(a.avgSpan - 7); const bD = Math.abs(b.avgSpan - 7); return bD - aD; });
      // Top 3 actions
      const actions: { title: string; desc: string; hc: number }[] = [];
      const overLayered = sortedDepts.filter(d => d.layers > 4);
      if (overLayered.length > 0) actions.push({ title: `De-layer ${overLayered[0].name}`, desc: `Reduce from ${overLayered[0].layers} to ${overLayered[0].fut?.layers || overLayered[0].layers - 1} layers. Impact: faster decision-making.`, hc: overLayered[0].headcount });
      const narrowSpan = sortedDepts.filter(d => d.avgSpan < 5);
      if (narrowSpan.length > 0) actions.push({ title: `Widen ${narrowSpan[0].name} span`, desc: `Current ${narrowSpan[0].avgSpan.toFixed(1)}:1 is below benchmark. Redistribute reports to reduce manager overhead.`, hc: narrowSpan[0].headcount });
      const highMgrRatio = sortedDepts.filter(d => d.managers / Math.max(d.headcount, 1) > 0.15);
      if (highMgrRatio.length > 0) actions.push({ title: `Address ${highMgrRatio[0].name} manager ratio`, desc: `${highMgrRatio[0].managers} managers for ${highMgrRatio[0].headcount} HC (${Math.round(highMgrRatio[0].managers / highMgrRatio[0].headcount * 100)}%) exceeds 12% target.`, hc: highMgrRatio[0].headcount });
      if (actions.length === 0) actions.push({ title: "Review scenario parameters", desc: "All departments are within benchmark ranges. Consider testing an Aggressive scenario for further optimization.", hc: 0 });
      const maxSpan = Math.max(...currentData.map(d => d.avgSpan), ...sc.departments.map(d => d.avgSpan), 12) * 1.1;

      return <div>
        {/* KPI strip — elevated white cards */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {(() => {
            const kpis: { label: string; value: string; delta?: string; deltaColor?: string; sub?: string }[] = [
              { label: 'Total Headcount', value: fmt(fA.hc), delta: fA.hc !== cA.hc ? `${fA.hc > cA.hc ? '+' : ''}${fA.hc - cA.hc}` : undefined, deltaColor: fA.hc < cA.hc ? '#16A34A' : fA.hc > cA.hc ? '#DC2626' : undefined, sub: `Current: ${fmt(cA.hc)}` },
              { label: 'Avg Span', value: fmt(fA.avgS), delta: fA.avgS !== cA.avgS ? `${fA.avgS > cA.avgS ? '+' : ''}${fmt(fA.avgS - cA.avgS)}` : undefined, deltaColor: fA.avgS > cA.avgS && cA.avgS < 6 ? '#16A34A' : fA.avgS < cA.avgS ? '#DC2626' : '#fbbf24', sub: `Current: ${fmt(cA.avgS)}` },
              { label: 'Avg Layers', value: fmt(fA.avgL), delta: fA.avgL !== cA.avgL ? `${fA.avgL > cA.avgL ? '+' : ''}${fmt(fA.avgL - cA.avgL)}` : undefined, deltaColor: fA.avgL < cA.avgL ? '#16A34A' : fA.avgL > cA.avgL ? '#DC2626' : '#fbbf24', sub: `Current: ${fmt(cA.avgL)}` },
              { label: 'Managers', value: fmt(fA.mgr), delta: fA.mgr !== cA.mgr ? `${fA.mgr > cA.mgr ? '+' : ''}${fA.mgr - cA.mgr}` : undefined, deltaColor: fA.mgr < cA.mgr ? '#16A34A' : fA.mgr > cA.mgr ? '#DC2626' : '#fbbf24', sub: `Current: ${fmt(cA.mgr)}` },
              { label: 'ICs', value: fmt(fA.ic), delta: fA.ic !== cA.ic ? `${fA.ic > cA.ic ? '+' : ''}${fA.ic - cA.ic}` : undefined, deltaColor: fA.ic > cA.ic ? '#16A34A' : fA.ic < cA.ic ? '#DC2626' : '#fbbf24', sub: `Current: ${fmt(cA.ic)}` },
              { label: 'Est. Cost ($M)', value: `$${fmt(fA.cost / 1e6)}`, delta: Math.abs(fA.cost - cA.cost) > cA.cost * 0.01 ? `${fA.cost > cA.cost ? '+' : ''}$${fmt(Math.abs(fA.cost - cA.cost) / 1e6)}` : undefined, deltaColor: fA.cost < cA.cost ? '#16A34A' : fA.cost > cA.cost ? '#DC2626' : '#fbbf24', sub: `Current: $${fmt(cA.cost / 1e6)}` },
              { label: 'Impact Score', value: `${impactScore}`, delta: impactScore >= 70 ? 'Strong' : impactScore >= 40 ? 'Moderate' : 'Minimal', deltaColor: impactColor, sub: `${deptImprovements}/${currentData.length} depts improving` },
            ];
            return kpis.map(k => <OdsKpiCard key={k.label} {...k} />);
          })()}
        </div>

        {/* Impact Score — featured full-width white card */}
        {(() => {
          const baseAgg = odsAgg(currentData);
          const scnAgg = odsAgg(sc?.departments || currentData);
          const delta = computeScenarioDelta(baseAgg as unknown as Record<string, number>, scnAgg as unknown as Record<string, number>);
          const heroImpactScore = computeImpactScore(delta);
          const goalAlignItems = [
            { label: 'Span benchmark', met: fA.avgS >= 6 && fA.avgS <= 8 },
            { label: 'Layer reduction', met: fA.avgL < cA.avgL },
            { label: 'Cost efficiency', met: fA.cost <= cA.cost },
            { label: 'Manager ratio', met: fA.mgr / Math.max(fA.hc, 1) < 0.12 },
          ];
          const goalsMet = goalAlignItems.filter(g => g.met).length;
          return <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20, marginBottom: 16, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* Left: numeric score + gauge */}
            <div style={{ width: 240, flexShrink: 0 }}>
              <div style={{ fontSize: 36, fontWeight: 500, color: '#05070d', lineHeight: 1.1, marginBottom: 2 }}>{heroImpactScore}</div>
              <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)', marginBottom: 10, fontWeight: 500 }}>Change Magnitude</div>
              {/* Horizontal gauge */}
              <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'rgba(28,43,58,0.08)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, width: `${Math.min(heroImpactScore, 100)}%`, background: impactColor, transition: 'width 0.4s ease-out' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(28,43,58,0.65)', marginTop: 3 }}>
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>
            {/* Middle: narrative */}
            <div style={{ flex: 1, fontSize: 13, color: 'rgba(28,43,58,0.65)', lineHeight: 1.7 }}>
              The <span style={{ fontWeight: 500, color: '#05070d' }}>{sc.label}</span> scenario changes headcount from <span style={{ fontWeight: 500, color: '#05070d' }}>{cA.hc.toLocaleString()}</span> to <span style={{ fontWeight: 500, color: '#05070d' }}>{fA.hc.toLocaleString()}</span>{' '}
              ({fA.hc - cA.hc >= 0 ? '+' : ''}{fA.hc - cA.hc}), {fA.avgL < cA.avgL ? <span>reduces average layers from <span style={{ fontWeight: 500 }}>{fmt(cA.avgL)}</span> to <span style={{ fontWeight: 500 }}>{fmt(fA.avgL)}</span></span> : <span>maintains layers at <span style={{ fontWeight: 500 }}>{fmt(fA.avgL)}</span></span>},{' '}
              and {fA.avgS > cA.avgS ? <span>widens average span from <span style={{ fontWeight: 500 }}>{fmt(cA.avgS)}</span> to <span style={{ fontWeight: 500 }}>{fmt(fA.avgS)}</span></span> : <span>adjusts span to <span style={{ fontWeight: 500 }}>{fmt(fA.avgS)}</span></span>}.{' '}
              <span style={{ fontWeight: 500, color: '#05070d' }}>{deptImprovements}/{currentData.length}</span> departments move closer to the 6-8:1 benchmark.
              {' '}Total cost {Math.abs(fA.cost - cA.cost) < cA.cost * 0.01 ? 'remains neutral' : fA.cost < cA.cost ? <span style={{ color: '#16A34A' }}>decreases by {fmtNum(cA.cost - fA.cost)}</span> : <span style={{ color: '#DC2626' }}>increases by {fmtNum(fA.cost - cA.cost)}</span>} at <span style={{ fontWeight: 500 }}>{fmtNum(fA.cost)}</span>.
            </div>
            {/* Right: goal alignment */}
            <div style={{ width: 200, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(28,43,58,0.55)', marginBottom: 8 }}>Goal Alignment</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#05070d', marginBottom: 8 }}>{goalsMet}/{goalAlignItems.length} met</div>
              {goalAlignItems.map(g => (
                <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: g.met ? '#16A34A' : 'rgba(28,43,58,0.65)', marginBottom: 4 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, background: g.met ? 'rgba(22,163,74,0.1)' : 'rgba(28,43,58,0.06)', color: g.met ? '#16A34A' : 'rgba(28,43,58,0.55)' }}>{g.met ? '\u2713' : '\u2013'}</span>
                  {g.label}
                </div>
              ))}
            </div>
          </div>;
        })()}

        {/* Span of Control by Department — diverging dot plot */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 2 }}>Span of Control by Department</div>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(28,43,58,0.65)', marginBottom: 4 }}>Current vs. {sc.label} scenario</div>
          {(() => { const widest = sortedDepts.reduce((best, d) => { const delta = Math.abs((d.fut?.avgSpan || d.avgSpan) - d.avgSpan); return delta > best.delta ? { name: d.name, cur: d.avgSpan, fut: d.fut?.avgSpan || d.avgSpan, delta } : best; }, { name: '', cur: 0, fut: 0, delta: 0 }); return widest.delta > 0.05 ? <div style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(28,43,58,0.65)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 14 }}>&#x1F4A1;</span> Key insight: {widest.name} sees the largest span shift ({widest.cur.toFixed(1)} &rarr; {widest.fut.toFixed(1)})</div> : null; })()}
          {/* X-axis header */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', gap: 8, padding: '0 0 6px', borderBottom: '0.5px solid rgba(28,43,58,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(28,43,58,0.65)' }}>Department</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 400, color: 'rgba(28,43,58,0.55)' }}>
              {[2, 4, 6, 8, 10, 12, 14].map(v => <span key={v}>{v}</span>)}
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(28,43,58,0.65)', textAlign: 'right' }}>Delta</div>
          </div>
          {sortedDepts.map(d => {
            const f = d.fut;
            const curSpan = d.avgSpan;
            const futSpan = f?.avgSpan || curSpan;
            const delta = futSpan - curSpan;
            const deltaColor = Math.abs(delta) < 0.05 ? 'rgba(28,43,58,0.65)' : d.improving ? '#16A34A' : '#DC2626';
            const scaleMax = 15;
            return <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '0.5px dashed rgba(28,43,58,0.08)' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#05070d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(28,43,58,0.55)' }}>{d.headcount} HC</div>
              </div>
              <div style={{ position: 'relative', height: 24 }}>
                {/* Benchmark band */}
                <div style={{ position: 'absolute', left: `${(6 / scaleMax) * 100}%`, width: `${((8 - 6) / scaleMax) * 100}%`, top: 0, bottom: 0, background: '#e8ecf5', borderRadius: 3 }} />
                {/* Gridlines */}
                {[2, 4, 6, 8, 10, 12, 14].map(v => <div key={v} style={{ position: 'absolute', left: `${(v / scaleMax) * 100}%`, top: 0, bottom: 0, width: 0, borderLeft: '0.5px dashed rgba(28,43,58,0.08)' }} />)}
                {/* Connecting line */}
                {Math.abs(curSpan - futSpan) > 0.05 && <div style={{ position: 'absolute', top: '50%', left: `${(Math.min(curSpan, futSpan) / scaleMax) * 100}%`, width: `${(Math.abs(futSpan - curSpan) / scaleMax) * 100}%`, height: 2, borderRadius: 1, background: d.improving ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)', transform: 'translateY(-50%)' }} />}
                {/* Current dot (gray) */}
                <div style={{ position: 'absolute', left: `${Math.min(curSpan / scaleMax, 1) * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: 5, background: 'rgba(28,43,58,0.35)', border: '1.5px solid #FFFFFF', zIndex: 2 }} />
                {/* Proposed dot (blue) */}
                <div style={{ position: 'absolute', left: `${Math.min(futSpan / scaleMax, 1) * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: 5, background: '#22d3ee', border: '1.5px solid #FFFFFF', zIndex: 2 }} />
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 500, color: deltaColor }}>
                {Math.abs(delta) < 0.05 ? '\u2014' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
              </div>
            </div>;
          })}
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 8, borderTop: '0.5px solid rgba(28,43,58,0.08)', fontSize: 11, color: 'rgba(28,43,58,0.55)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: 'rgba(28,43,58,0.35)' }} />Current</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: '#22d3ee' }} />Proposed</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 10, borderRadius: 2, background: '#e8ecf5' }} />Benchmark (6-8:1)</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.45)', marginTop: 8, textAlign: 'right' }}>Source: Industry benchmarks (illustrative ranges, 2024)</div>
        </div>

        {/* Priority Actions — white card */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 14 }}>Priority Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {actions.slice(0, 3).map((a, i) => <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i > 0 ? '0.5px solid rgba(28,43,58,0.08)' : 'none', cursor: 'default', transition: 'background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(247,245,240,0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
              <span style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--ivory, #e8ecf5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#05070d', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#05070d', marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.65)', lineHeight: 1.5 }}>{a.desc}</div>
              </div>
              {a.hc > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(28,43,58,0.55)', flexShrink: 0, alignSelf: 'center' }}>{a.hc} HC</span>}
            </div>)}
          </div>
        </div>

        {/* Department Comparison — white card table */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--ivory, #F1EFE8)' }}>
                {['Department', 'HC', 'Span (C\u2192S)', 'Layers (C\u2192S)', 'Mgr Ratio', 'Health'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Department' ? 'left' : 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(28,43,58,0.55)', borderBottom: '0.5px solid rgba(28,43,58,0.12)' }}>{h}</th>)}
              </tr></thead>
              <tbody>{sortedDepts.map((d, i) => {
                const f = d.fut;
                const mgrRatio = Math.round(d.managers / Math.max(d.headcount, 1) * 100);
                return <tr key={d.name} style={{ borderBottom: '0.5px solid rgba(28,43,58,0.08)', background: i % 2 ? 'var(--ivory, #e8ecf5)' : '#FFFFFF' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500, color: '#05070d', fontSize: 12 }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: d.health.color, marginRight: 8 }} />{d.name}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#05070d', fontSize: 11 }}>{d.headcount} <span style={{ color: 'rgba(28,43,58,0.65)' }}>{'\u2192'}</span> {f?.headcount || d.headcount}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11 }}>
                    <span style={{ fontWeight: 500, color: d.health.color }}>{d.avgSpan.toFixed(1)}</span>
                    <span style={{ color: 'rgba(28,43,58,0.65)', margin: '0 4px' }}>{'\u2192'}</span>
                    <span style={{ fontWeight: 500, color: d.futHealth.color }}>{(f?.avgSpan || d.avgSpan).toFixed(1)}</span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#05070d', fontSize: 11 }}>{d.layers} <span style={{ color: 'rgba(28,43,58,0.65)' }}>{'\u2192'}</span> {f?.layers || d.layers}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, fontSize: 11, color: mgrRatio > 15 ? '#DC2626' : mgrRatio > 12 ? '#fbbf24' : 'rgba(28,43,58,0.55)' }}>{mgrRatio}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}><span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${d.futHealth.color}15`, color: d.futHealth.color }}>{d.futHealth.badge} {d.futHealth.label.split(' ')[0]}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      </div>;
    })()}

    {view === "analyze" && analyzeSubTab === "soc" && (() => {
      const SPAN_MONO = "'JetBrains Mono', monospace";
      const spanHealth = (s: number) => s >= 6 && s <= 8 ? { label: "Optimal", color: "#34d399", badge: "✓" } : s >= 5 && s <= 10 ? { label: s < 6 ? "Narrow" : "Wide", color: "#fbbf24", badge: "◈" } : { label: s < 5 ? "Critical-Narrow" : "Critical-Wide", color: "#fb7185", badge: "⚠" };
      const spanImproving = (cur: number, fut: number) => { const curDist = Math.abs(cur - 7); const futDist = Math.abs(fut - 7); return futDist < curDist; };
      const orgAvgCur = cA.hc > 0 ? cA.ic / Math.max(cA.mgr, 1) : 0;
      const orgAvgFut = fA.hc > 0 ? fA.ic / Math.max(fA.mgr, 1) : 0;
      const inBenchCur = currentData.filter(d => d.avgSpan >= 6 && d.avgSpan <= 8).length;
      const inBenchFut = (sc.departments || []).filter((d: ReturnType<typeof odsGenDept>[0]) => d.avgSpan >= 6 && d.avgSpan <= 8).length;
      // Find widest span gap
      const spanRanges = currentData.map(d => { const base = d.avgSpan; const variance = Math.max(1, base * 0.35 + Math.random() * 2); return { name: d.name, min: Math.max(1, Math.round((base - variance) * 10) / 10), max: Math.round((base + variance) * 10) / 10, range: Math.round(variance * 2 * 10) / 10 }; });
      const widestGap = [...spanRanges].sort((a, b) => b.range - a.range)[0];
      // Sort departments by worst span (furthest from 7)
      const sorted = currentData.map((d, i) => ({ ...d, idx: i, fut: sc.departments[i], dist: Math.abs(d.avgSpan - 7) })).sort((a, b) => b.dist - a.dist);
      // expandedDept state is hoisted to component top level (rules of hooks)

      return <div>
        {/* ═══ SPAN HEALTH SUMMARY ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {/* Org-wide avg span */}
          <div style={{ background: '#FFFFFF', borderRadius: 8, padding: 14, border: '0.5px solid rgba(28,43,58,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "rgba(28,43,58,0.55)", marginBottom: 6 }}>Org-Wide Average Span</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 500, color: '#05070d' }}>{orgAvgCur.toFixed(1)}</span>
              <span style={{ fontSize: 12, color: "rgba(28,43,58,0.55)" }}>{"\u2192"}</span>
              <span style={{ fontSize: 22, fontWeight: 500, color: '#05070d' }}>{orgAvgFut.toFixed(1)}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: spanImproving(orgAvgCur, orgAvgFut) ? "#16A34A" : "#DC2626", padding: "1px 5px", borderRadius: 4, background: spanImproving(orgAvgCur, orgAvgFut) ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)" }}>{orgAvgFut > orgAvgCur ? "\u2191" : "\u2193"}{Math.abs(orgAvgFut - orgAvgCur).toFixed(1)}</span>
            </div>
          </div>
          {/* Departments in benchmark */}
          <div style={{ background: '#FFFFFF', borderRadius: 8, padding: 14, border: '0.5px solid rgba(28,43,58,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "rgba(28,43,58,0.55)", marginBottom: 6 }}>In Benchmark Range (6-8:1)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", width: 44, height: 44 }}>
                <svg viewBox="0 0 48 48" style={{ width: 44, height: 44, transform: "rotate(-90deg)" }}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(28,43,58,0.06)" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - inBenchFut / Math.max(currentData.length, 1))}`} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "#05070d" }}>{inBenchFut}</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#05070d" }}>{inBenchCur} {"\u2192"} {inBenchFut} <span style={{ fontSize: 11, color: "rgba(28,43,58,0.55)" }}>of {currentData.length}</span></div>
                <div style={{ fontSize: 11, color: "rgba(28,43,58,0.55)" }}>{inBenchFut > inBenchCur ? "Improving" : inBenchFut < inBenchCur ? "Degrading" : "Stable"}</div>
              </div>
            </div>
          </div>
          {/* Widest span gap */}
          <div style={{ background: '#FFFFFF', borderRadius: 8, padding: 14, border: '0.5px solid rgba(28,43,58,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "rgba(28,43,58,0.55)", marginBottom: 6 }}>Widest Span Variance</div>
            {widestGap && <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#05070d" }}>{widestGap.name}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#DC2626" }}>{widestGap.min}:1 to {widestGap.max}:1 <span style={{ fontSize: 11, color: "rgba(28,43,58,0.55)" }}>— range of {widestGap.range}</span></div>
            </div>}
          </div>
        </div>

        {/* Benchmark reference */}
        <div style={{ padding: "8px 12px", marginBottom: 16, background: "rgba(34,211,238,0.04)", borderLeft: "3px solid #22d3ee", borderRadius: 6, fontSize: 11, color: "rgba(28,43,58,0.55)", lineHeight: 1.5 }}>
          Industry benchmark for knowledge workers: 6-8 direct reports per manager. Below 5:1 indicates over-management. Above 10:1 may indicate insufficient oversight.
        </div>

        {/* ═══ DIVERGING DOT PLOT: Span of Control ═══ */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 2 }}>Span of Control by Department</div>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(28,43,58,0.65)', marginBottom: 4 }}>Current vs. proposed span with benchmark range</div>
          {(() => { const widest = sorted.reduce((best, d) => { const delta = Math.abs((d.fut?.avgSpan || d.avgSpan) - d.avgSpan); return delta > best.delta ? { name: d.name, cur: d.avgSpan, fut: d.fut?.avgSpan || d.avgSpan, delta } : best; }, { name: '', cur: 0, fut: 0, delta: 0 }); return widest.delta > 0.05 ? <div style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(28,43,58,0.65)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 14 }}>&#x1F4A1;</span> Key insight: {widest.name} sees the largest span shift ({widest.cur.toFixed(1)} &rarr; {widest.fut.toFixed(1)})</div> : null; })()}

          {/* X-axis header */}
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 70px', gap: 12, padding: '0 4px 6px', borderBottom: '0.5px solid rgba(28,43,58,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(28,43,58,0.65)' }}>Department</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 400, color: 'rgba(28,43,58,0.55)' }}>
              {[2, 4, 6, 8, 10, 12, 14].map(v => <span key={v}>{v}</span>)}
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(28,43,58,0.65)', textAlign: 'right' }}>Delta</div>
          </div>

          {sorted.map((d) => {
            const f = d.fut;
            const curSpan = d.avgSpan;
            const futSpan = f?.avgSpan || curSpan;
            const improving = spanImproving(curSpan, futSpan);
            const delta = futSpan - curSpan;
            const deltaColor = Math.abs(delta) < 0.1 ? 'rgba(28,43,58,0.65)' : improving ? '#16A34A' : '#DC2626';
            const scaleMax = 15;
            const isExpanded = expandedDept === d.name;

            return <div key={d.name} style={{ borderBottom: '0.5px dashed rgba(28,43,58,0.08)' }}>
              <button onClick={() => setExpandedDept(isExpanded ? null : d.name)} style={{
                width: '100%', display: 'grid', gridTemplateColumns: '150px 1fr 70px',
                gap: 12, alignItems: 'center', padding: '10px 4px', borderRadius: 4,
                background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(247,245,240,0.5)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                {/* Department name + HC sub-text */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#05070d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(28,43,58,0.55)' }}>{d.headcount} HC</div>
                </div>

                {/* Dot plot area */}
                <div style={{ position: 'relative', height: 28 }}>
                  {/* Benchmark band (6-8) */}
                  <div style={{
                    position: 'absolute',
                    left: `${(6 / scaleMax) * 100}%`,
                    width: `${((8 - 6) / scaleMax) * 100}%`,
                    top: 0, bottom: 0,
                    background: '#e8ecf5',
                    borderRadius: 3,
                  }} />
                  {/* Gridlines */}
                  {[2, 4, 6, 8, 10, 12, 14].map(v => (
                    <div key={v} style={{
                      position: 'absolute', left: `${(v / scaleMax) * 100}%`,
                      top: 0, bottom: 0, width: 0,
                      borderLeft: '0.5px dashed rgba(28,43,58,0.08)',
                    }} />
                  ))}
                  {/* Connecting line between dots */}
                  {Math.abs(curSpan - futSpan) > 0.05 && (
                    <div style={{
                      position: 'absolute', top: '50%',
                      left: `${(Math.min(curSpan, futSpan) / scaleMax) * 100}%`,
                      width: `${(Math.abs(futSpan - curSpan) / scaleMax) * 100}%`,
                      height: 2, borderRadius: 1,
                      background: improving ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)',
                      transform: 'translateY(-50%)',
                    }} />
                  )}
                  {/* Current dot (gray) */}
                  <div style={{
                    position: 'absolute',
                    left: `${Math.min(curSpan / scaleMax, 1) * 100}%`,
                    top: '50%', transform: 'translate(-50%, -50%)',
                    width: 10, height: 10, borderRadius: 5,
                    background: 'rgba(28,43,58,0.35)',
                    border: '1.5px solid #FFFFFF',
                    zIndex: 2,
                  }} title={`Current: ${curSpan.toFixed(1)}:1`} />
                  {/* Proposed dot (blue) */}
                  <div style={{
                    position: 'absolute',
                    left: `${Math.min(futSpan / scaleMax, 1) * 100}%`,
                    top: '50%', transform: 'translate(-50%, -50%)',
                    width: 10, height: 10, borderRadius: 5,
                    background: '#22d3ee',
                    border: '1.5px solid #FFFFFF',
                    zIndex: 2,
                  }} title={`Proposed: ${futSpan.toFixed(1)}:1`} />
                </div>

                {/* Delta label */}
                <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 500, color: deltaColor }}>
                  {Math.abs(delta) < 0.05 ? '\u2014' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (() => {
                const sr = spanRanges.find(r => r.name === d.name);
                return <div style={{ padding: '8px 16px 12px', marginLeft: 8, borderLeft: '2px solid rgba(28,43,58,0.08)' }}>
                  {sr && <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'rgba(28,43,58,0.65)', marginBottom: 4 }}>Manager Span Distribution</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)' }}>{sr.min}:1</span>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(28,43,58,0.04)', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: `${(sr.min / 15) * 100}%`, width: `${((sr.max - sr.min) / 15) * 100}%`, top: 0, bottom: 0, borderRadius: 3, background: sr.range > 8 ? 'rgba(220,38,38,0.2)' : sr.range > 4 ? 'rgba(251,191,36,0.2)' : 'rgba(22,163,74,0.2)' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)' }}>{sr.max}:1</span>
                      <span style={{ fontSize: 11, color: sr.range > 8 ? '#DC2626' : sr.range > 4 ? '#fbbf24' : '#16A34A' }}>Range: {sr.range}</span>
                    </div>
                  </div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {curSpan < 5 && <div style={{ fontSize: 11, color: '#fbbf24', padding: '3px 8px', borderRadius: 4, background: 'rgba(251,191,36,0.06)' }}>Span below 5:1 indicates potential over-management</div>}
                    {curSpan > 10 && <div style={{ fontSize: 11, color: '#DC2626', padding: '3px 8px', borderRadius: 4, background: 'rgba(220,38,38,0.06)' }}>Span above 10:1 — managers may be overextended</div>}
                    {improving && <div style={{ fontSize: 11, color: '#16A34A', padding: '3px 8px', borderRadius: 4, background: 'rgba(22,163,74,0.06)' }}>Scenario moves span toward benchmark (6-8:1)</div>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
                    {[
                      { l: 'Headcount', c: d.headcount, fv: f?.headcount },
                      { l: 'Managers', c: d.managers, fv: f?.managers },
                      { l: 'ICs', c: d.ics, fv: f?.ics },
                      { l: 'Layers', c: d.layers, fv: f?.layers },
                    ].map(m => <div key={m.l} style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(247,245,240,0.5)', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.65)', textTransform: 'uppercase' as const }}>{m.l}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#05070d' }}>{m.c} <span style={{ color: 'rgba(28,43,58,0.55)' }}>{'\u2192'}</span> {m.fv || m.c}</div>
                    </div>)}
                  </div>
                </div>;
              })()}
            </div>;
          })}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 8, borderTop: '0.5px solid rgba(28,43,58,0.08)', fontSize: 11, color: 'rgba(28,43,58,0.55)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: 'rgba(28,43,58,0.35)' }} />Current</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: '#22d3ee' }} />Proposed</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 10, borderRadius: 2, background: '#e8ecf5' }} />Benchmark (6-8:1)</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.45)', marginTop: 8, textAlign: 'right' }}>Source: Industry benchmarks (illustrative ranges, 2024)</div>
        </div>
      </div>;
    })()}

    {view === "analyze" && analyzeSubTab === "soc" && (() => {
      // Aggregate level distribution across current & future
      const srcCurrent = layerScope === "all" ? currentData : currentData.filter(d => d.name === layerScope);
      const srcFuture = layerScope === "all" ? (sc.departments || []) : (sc.departments || []).filter((d: ReturnType<typeof odsGenDept>[0]) => d.name === layerScope);
      const curLevels = ODS_LEVELS.map(l => ({ level: l, count: srcCurrent.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0) }));
      const futLevels = ODS_LEVELS.map(l => ({ level: l, count: srcFuture.reduce((s: number, d: ReturnType<typeof odsGenDept>[0]) => s + (d.levelDist?.[l] || 0), 0) }));

      // Build LayerData for the new component — only E and M layers
      const layerChartData: LayerData[] = ODS_LEVELS.filter(l => l.startsWith("E") || l.startsWith("M")).map(l => {
        const li = ODS_LEVELS.indexOf(l);
        return { layer: l, current: curLevels[li]?.count || 0, future: futLevels[li]?.count || 0 };
      });

      // Build LayerCostData for the cost model
      const costChartData: LayerCostData[] = ODS_LEVELS.map(l => {
        const li = ODS_LEVELS.indexOf(l);
        return { layer: l, currentHeadcount: curLevels[li]?.count || 0, futureHeadcount: futLevels[li]?.count || 0, avgComp: ODS_AVG_COMP[l] || 85000 };
      });

      return <div>
        {/* Scope selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'rgba(28,43,58,0.55)' }}>Scope:</span>
          <select value={layerScope} onChange={e => setLayerScope(e.target.value)} style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#05070d', outline: 'none' }}>
            <option value="all">Entire Organization</option>
            {currentData.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>

        {/* Layer Distribution chart */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 2 }}>Layer Distribution</div>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(28,43,58,0.65)', marginBottom: 4 }}>Current vs. Proposed headcount by level</div>
          {(() => { const changedLayers = layerChartData.filter(l => l.current !== l.future).length; const totalLayers = layerChartData.filter(l => l.current > 0 || l.future > 0).length; return <div style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(28,43,58,0.65)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 14 }}>&#x2139;&#xFE0F;</span> Key insight: {changedLayers > 0 ? `${changedLayers} of ${totalLayers} layers change in this scenario` : 'This scenario preserves all layers'}</div>; })()}
          <LayerDistributionChart data={layerChartData} />
          <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.45)', marginTop: 8, textAlign: 'right' }}>Source: Industry benchmarks (illustrative ranges, 2024)</div>
        </div>

        {/* Cost model chart */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 2 }}>Cost Model</div>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(28,43,58,0.65)', marginBottom: 4 }}>Current vs. Proposed compensation cost</div>
          {(() => { const totalCur = costChartData.reduce((s, d) => s + d.currentHeadcount * (d.avgComp || 0), 0); const totalFut = costChartData.reduce((s, d) => s + d.futureHeadcount * (d.futureAvgComp || d.avgComp || 0), 0); const delta = totalFut - totalCur; const pct = totalCur > 0 ? ((delta / totalCur) * 100).toFixed(1) : '0.0'; const sign = delta >= 0 ? '+' : ''; return <div style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(28,43,58,0.65)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 14 }}>&#x1F4A1;</span> Key insight: Net cost impact is {sign}${Math.abs(delta / 1e6).toFixed(1)}M ({sign}{pct}%)</div>; })()}
          <CostModelChart data={costChartData} />
        </div>
      </div>;
    })()}

    {view === "analyze" && analyzeSubTab === "cost" && (() => {
      // Build cost data from current scenario
      const srcCurrent = layerScope === "all" ? currentData : currentData.filter(d => d.name === layerScope);
      const srcFuture = layerScope === "all" ? (sc.departments || []) : (sc.departments || []).filter((d: ReturnType<typeof odsGenDept>[0]) => d.name === layerScope);
      const costChartData: LayerCostData[] = ODS_LEVELS.map(l => {
        const curCount = srcCurrent.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0);
        const futCount = srcFuture.reduce((s: number, d: ReturnType<typeof odsGenDept>[0]) => s + (d.levelDist?.[l] || 0), 0);
        return { layer: l, currentHeadcount: curCount, futureHeadcount: futCount, avgComp: ODS_AVG_COMP[l] || 85000 };
      });

      return <div>
        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 2 }}>Cost Model</div>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(28,43,58,0.65)', marginBottom: 4 }}>Current vs. Proposed compensation cost</div>
          {(() => { const totalCur = costChartData.reduce((s, d) => s + d.currentHeadcount * (d.avgComp || 0), 0); const totalFut = costChartData.reduce((s, d) => s + d.futureHeadcount * (d.futureAvgComp || d.avgComp || 0), 0); const delta = totalFut - totalCur; const pct = totalCur > 0 ? ((delta / totalCur) * 100).toFixed(1) : '0.0'; const sign = delta >= 0 ? '+' : ''; return <div style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(28,43,58,0.65)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 14 }}>&#x1F4A1;</span> Key insight: Net cost impact is {sign}${Math.abs(delta / 1e6).toFixed(1)}M ({sign}{pct}%)</div>; })()}
          <CostModelChart data={costChartData} />
        </div>
        <Card title="Cost by Department">
          {(() => { const cCosts = currentData.map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const fCosts = (sc.departments || []).map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const maxCost = Math.max(...cCosts, ...fCosts, 1); return <div className="space-y-3">{currentData.map((d, i) => { const delta = (fCosts[i] ?? 0) - (cCosts[i] ?? 0); return <div key={d.name} className="flex items-center gap-3"><div className="w-36 text-[15px] font-semibold text-[var(--text-secondary)] text-right shrink-0">{d.name}</div><div className="flex-1 space-y-1"><HBar value={cCosts[i] ?? 0} max={maxCost} color="var(--accent-primary)" /><HBar value={fCosts[i] ?? 0} max={maxCost} color="var(--success)" /></div><div className="w-24 text-right shrink-0"><div className="text-[15px] font-semibold text-[var(--text-primary)]">{fmtNum(cCosts[i] ?? 0)}</div><div className="text-[15px]" style={{ color: delta < 0 ? "var(--success)" : delta > 0 ? "var(--risk)" : "var(--text-muted)" }}>{delta < 0 ? "↓" : delta > 0 ? "↑" : "→"} ${Math.abs(delta / 1e3).toFixed(0)}K</div></div></div>; })}</div>; })()}
        </Card>
      </div>;
    })()}

    {view === "analyze" && analyzeSubTab === "roles" && (() => {
      // Build migration data from scenario
      const migrationData: DepartmentMigration[] = currentData.map((d, i) => {
        const f = sc.departments[i];
        return {
          name: d.name,
          totalHeadcount: d.headcount,
          newRoles: f?.newRoles || Math.max(0, Math.floor((f?.headcount || d.headcount) - d.headcount)),
          restructured: f?.restructuredRoles || Math.floor(Math.max(1, d.headcount * 0.02)),
          eliminated: f?.removedRoles || Math.max(0, Math.floor(d.headcount - (f?.headcount || d.headcount))),
        };
      });
      const totalHC = migrationData.reduce((s, d) => s + d.totalHeadcount, 0);
      const totalImpacted = migrationData.reduce((s, d) => s + d.newRoles + d.restructured + d.eliminated, 0);
      const retainedCount = totalHC - totalImpacted;

      return <Card title="Role Migration — Impact Analysis">
        <RoleMigrationChart data={migrationData} retainedCount={retainedCount} />
      </Card>;
    })()}

    {/* Dept Drill-Down — expanded with What-If Simulator */}
    {view === "design" && (() => {
      const dept = currentData[selDept];
      const deptFuture = sc.departments[selDept];
      const deptCost = Object.entries(dept?.levelDist || {}).reduce((s, [l, n]) => s + n * (ODS_AVG_COMP[l] || 85000), 0);
      const deptFutureCost = Object.entries(deptFuture?.levelDist || {}).reduce((s, [l, n]) => s + n * (ODS_AVG_COMP[l] || 85000), 0);

      // What-If Simulation calculations
      const simDept = dept ? (() => {
        const curLayers = dept.layers || 1;
        const curMgrs = dept.managers || 1;
        const curIcs = dept.ics || 0;
        const curHc = dept.headcount || 0;
        const simMgrs = Math.max(2, Math.round(curIcs / simTargetSpan));
        const simHc = simMgrs + curIcs;
        const simLayers = Math.min(simMaxLayers, curLayers);
        const layerDelta = curLayers - simLayers;
        const layerMgrReduction = layerDelta > 0 ? Math.floor(simMgrs * (layerDelta * 0.12)) : 0;
        const finalMgrs = Math.max(2, simMgrs - layerMgrReduction);
        const finalHc = finalMgrs + curIcs;
        const hcDelta = finalHc - curHc;
        const costDelta = hcDelta * (ODS_AVG_COMP["M3"] || 120000);
        const costPct = deptCost > 0 ? (costDelta / deptCost) * 100 : 0;
        const finalSpan = curIcs / Math.max(finalMgrs, 1);
        return { hc: finalHc, mgrs: finalMgrs, layers: simLayers, span: Math.round(finalSpan * 10) / 10, hcDelta, costDelta, costPct, layerDelta };
      })() : { hc: 0, mgrs: 0, layers: 0, span: 0, hcDelta: 0, costDelta: 0, costPct: 0, layerDelta: 0 };

      // Shape Assessment
      const shapeAssessment = dept ? (() => {
        const ld = dept.levelDist || {};
        const execCount = ODS_LEVELS.filter(l => l.startsWith("E")).reduce((s, l) => s + (ld[l] || 0), 0);
        const mgrCount = ODS_LEVELS.filter(l => l.startsWith("M")).reduce((s, l) => s + (ld[l] || 0), 0);
        const icCount = dept.headcount - execCount - mgrCount;
        const top = execCount; const mid = mgrCount; const bottom = icCount;
        const total = top + mid + bottom || 1;
        const topPct = top / total; const midPct = mid / total; const bottomPct = bottom / total;
        let shape: string, color: string, desc: string;
        if (bottomPct > 0.55 && topPct < 0.15) { shape = "Pyramid"; color = "#34d399"; desc = "Healthy distribution — strong leverage model"; }
        else if (midPct > 0.4) { shape = "Diamond"; color = "#fbbf24"; desc = "Bloated middle management — review mid-level consolidation"; }
        else if (topPct > 0.25) { shape = "Top-Heavy"; color = "#fbbf24"; desc = "High senior concentration — review management overhead"; }
        else if (Math.abs(topPct - bottomPct) < 0.15) { shape = "Column"; color = "#fbbf24"; desc = "Uniform distribution — lacks leverage, review career architecture"; }
        else { shape = "Flat"; color = "#22d3ee"; desc = "Broad base with minimal hierarchy — verify coaching capacity"; }
        return { shape, color, desc, top, mid, bottom, topPct, midPct, bottomPct };
      })() : { shape: "—", color: "#888", desc: "", top: 0, mid: 0, bottom: 0, topPct: 0, midPct: 0, bottomPct: 0 };

      // Benchmark check helper
      const benchColor = (val: number, min: number, max: number) => val >= min && val <= max ? "#34d399" : "#fbbf24";

      // Track colors for pyramid bars
      const DRILL_TRACK_COLORS: Record<string, string> = { E: "#ef4444", M: "#fbbf24", P: "#22d3ee", S: "#22d3ee", T: "#a78bfa" };
      const DRILL_MONO = "'JetBrains Mono', monospace";

      // Build pyramid data — only levels with at least 1 person in current or scenario
      const pyramidLevels = ODS_LEVELS.map(l => {
        const cN = dept?.levelDist?.[l] || 0;
        const fN = deptFuture?.levelDist?.[l] || 0;
        const comp = ODS_AVG_COMP[l] || 85000;
        return { level: l, current: cN, scenario: fN, comp, totalCost: cN * comp, delta: fN - cN };
      }).filter(lv => lv.current > 0 || lv.scenario > 0);

      const maxPyramidHC = Math.max(...pyramidLevels.map(lv => Math.max(lv.current, lv.scenario)), 1);

      // Cost concentration: top 3 levels by total cost
      const costConcentration = [...pyramidLevels].sort((a, b) => b.totalCost - a.totalCost).slice(0, 3);
      const totalDeptLevelCost = pyramidLevels.reduce((s, lv) => s + lv.totalCost, 0);

      // KPI cards with scenario emphasis
      const kpiData = [
        { label: "Headcount", current: dept?.headcount || 0, scenario: simDept.hc, inv: true },
        { label: "Avg Span", current: dept?.avgSpan || 0, scenario: simDept.span, inv: false },
        { label: "Layers", current: dept?.layers || 0, scenario: simDept.layers, inv: true },
        { label: "Managers", current: dept?.managers || 0, scenario: simDept.mgrs, inv: true },
        { label: "FTE Ratio %", current: (dept?.fteRatio || 0) * 100, scenario: (deptFuture?.fteRatio || dept?.fteRatio || 0) * 100, inv: false },
        { label: "Est. Cost ($M)", current: deptCost / 1e6, scenario: (deptCost + simDept.costDelta) / 1e6, inv: true },
      ];

      return <div>
        {/* Department selector — prominent white card */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: '0', marginBottom: 16, display: 'inline-flex', alignItems: 'center', minWidth: 280 }}>
          <select value={selDept} onChange={e => setSelDept(Number(e.target.value))} style={{
            background: 'transparent', border: 'none', outline: 'none', padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#05070d',
            cursor: 'pointer', width: '100%', height: 48, appearance: 'auto' as const,
          }}>
            {currentData.map((d, i) => <option key={d.name} value={i}>{d.name} \u2014 {d.headcount} HC</option>)}
          </select>
        </div>

        {/* KPI cards — white OdsKpiCard style */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {kpiData.map(kpi => {
            const diff = kpi.scenario - kpi.current;
            const isGood = kpi.inv ? diff <= 0 : diff >= 0;
            const changed = Math.abs(diff) > 0.01;
            return <OdsKpiCard key={kpi.label} label={kpi.label} value={fmt(kpi.scenario)}
              delta={changed ? `${diff > 0 ? "+" : ""}${fmt(diff)}` : undefined}
              deltaColor={changed ? (isGood ? '#16A34A' : '#DC2626') : undefined}
              sub={`Current: ${fmt(kpi.current)}`} />;
          })}
        </div>

        {/* Main content area with simulator side panel */}
        <div className="flex gap-4">
          {/* Left: Pyramid visualization */}
          <div className="flex-1 min-w-0">
            {/* Level Distribution — white card */}
            <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 2 }}>Level Distribution — {dept?.name || ""}</div>
              <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.65)', marginBottom: 14 }}>Current vs. scenario headcount by level</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {pyramidLevels.map(lv => {
                  const trackChar = lv.level.charAt(0);
                  const trackColor = DRILL_TRACK_COLORS[trackChar] || "#22d3ee";
                  const currentWidth = (lv.current / maxPyramidHC) * 100;
                  const scenarioWidth = (lv.scenario / maxPyramidHC) * 100;
                  const maxBarPct = 70;

                  return <div key={lv.level} style={{
                    display: "grid", gridTemplateColumns: "60px 1fr 120px 60px",
                    alignItems: "center", gap: 8, padding: "4px 0",
                    transition: "background 0.15s ease-out",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(247,245,240,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                    {/* Level badge */}
                    <div style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      padding: "3px 10px", borderRadius: 8,
                      background: `${trackColor}15`, color: trackColor,
                      fontSize: 12, fontWeight: 500, fontFamily: DRILL_MONO,
                      letterSpacing: "0.03em", width: "fit-content",
                    }}>
                      {lv.level}
                    </div>

                    {/* Centered bar */}
                    <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{
                        position: "absolute", height: 24, borderRadius: 6,
                        width: `${(currentWidth / 100) * maxBarPct}%`,
                        background: `${trackColor}20`,
                        transition: "width 0.5s ease-out",
                      }} />
                      <div style={{
                        position: "absolute", height: 24, borderRadius: 6,
                        width: `${(scenarioWidth / 100) * maxBarPct}%`,
                        background: trackColor,
                        opacity: 0.75,
                        transition: "width 0.5s ease-out",
                      }} />
                      <span style={{
                        position: "relative", zIndex: 2,
                        fontSize: 12, fontWeight: 500, fontFamily: DRILL_MONO,
                        color: "#FFFFFF",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      }}>
                        {lv.current}
                      </span>
                    </div>

                    {/* Cost info */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, fontFamily: DRILL_MONO, fontWeight: 500, color: 'rgba(28,43,58,0.55)' }}>
                        ${Math.round(lv.comp / 1000)}K avg
                      </div>
                      <div style={{ fontSize: 11, fontFamily: DRILL_MONO, fontWeight: 500, color: 'rgba(28,43,58,0.55)' }}>
                        ${(lv.totalCost / 1e6).toFixed(1)}M total
                      </div>
                    </div>

                    {/* Delta */}
                    <div style={{ textAlign: "right" }}>
                      {lv.delta !== 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 500, fontFamily: DRILL_MONO, color: lv.delta < 0 ? "#16A34A" : "#DC2626" }}>
                          {lv.delta > 0 ? "+" : ""}{lv.delta}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'rgba(28,43,58,0.65)' }}>{'\u2014'}</span>
                      )}
                    </div>
                  </div>;
                })}
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 8, borderTop: "0.5px solid rgba(28,43,58,0.08)", fontSize: 11, color: 'rgba(28,43,58,0.55)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 8, borderRadius: 3, background: "rgba(34,211,238,0.20)" }} />Current</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 16, height: 8, borderRadius: 3, background: "rgba(34,211,238,0.75)" }} />Proposed</span>
              </div>
            </div>

            {/* Cost Concentration — white card */}
            <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 14 }}>Cost Concentration — Top 3 Levels</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {costConcentration.map((lv, idx) => {
                  const pct = totalDeptLevelCost > 0 ? (lv.totalCost / totalDeptLevelCost) * 100 : 0;
                  const trackColor = DRILL_TRACK_COLORS[lv.level.charAt(0)] || "#22d3ee";
                  return <div key={lv.level}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(28,43,58,0.45)' }}>#{idx + 1}</span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6,
                          background: `${trackColor}15`, color: trackColor,
                          fontSize: 12, fontWeight: 500, fontFamily: DRILL_MONO,
                        }}>{lv.level}</span>
                        <span style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)' }}>{lv.current} heads</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, fontFamily: DRILL_MONO, color: '#05070d' }}>
                          ${(lv.totalCost / 1e6).toFixed(1)}M
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, fontFamily: DRILL_MONO, color: trackColor }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "rgba(28,43,58,0.04)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4,
                        width: `${pct}%`,
                        background: trackColor, opacity: 0.7,
                        transition: "width 0.5s ease-out",
                      }} />
                    </div>
                  </div>;
                })}
              </div>
            </div>
          </div>

          {/* Right: What-If Simulator side panel */}
          <div className="shrink-0" style={{ width: "clamp(260px, 22vw, 320px)", display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* What-If Simulator — white card */}
            <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 4 }}>What-If Simulator</div>
              <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)', marginBottom: 16 }}>Drag the sliders to reshape {dept?.name || "this department"} and see impact in real-time.</div>

              {/* Target Span slider */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)' }}>Target Span</span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: '#05070d' }}>{simTargetSpan}:1</span>
                </div>
                <input type="range" min={3} max={12} step={0.5} value={simTargetSpan} onChange={e => setSimTargetSpan(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, #22d3ee ${((simTargetSpan - 3) / 9) * 100}%, rgba(28,43,58,0.15) ${((simTargetSpan - 3) / 9) * 100}%)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(28,43,58,0.55)', marginTop: 2 }}><span>3</span><span>12</span></div>
              </div>

              {/* Max Layers slider */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)' }}>Max Layers</span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: '#05070d' }}>{simMaxLayers}</span>
                </div>
                <input type="range" min={2} max={8} step={1} value={simMaxLayers} onChange={e => setSimMaxLayers(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, #22d3ee ${((simMaxLayers - 2) / 6) * 100}%, rgba(28,43,58,0.15) ${((simMaxLayers - 2) / 6) * 100}%)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(28,43,58,0.55)', marginTop: 2 }}><span>2</span><span>8</span></div>
              </div>

              {/* Simulated Impact box */}
              <div style={{ background: 'var(--ivory, #e8ecf5)', borderRadius: 6, padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(28,43,58,0.55)', marginBottom: 2 }}>Simulated Impact</div>
                {[
                  { label: "Headcount Change", value: `${simDept.hcDelta >= 0 ? "+" : ""}${simDept.hcDelta}`, good: simDept.hcDelta <= 0 },
                  { label: "Cost Impact", value: `${simDept.costPct >= 0 ? "+" : ""}${simDept.costPct.toFixed(1)}%`, good: simDept.costPct <= 0 },
                  { label: "New Span", value: `${simDept.span}:1`, good: simDept.span >= 6 && simDept.span <= 8 },
                  { label: "Layer Delta", value: `${simDept.layerDelta > 0 ? "-" : simDept.layerDelta < 0 ? "+" : ""}${Math.abs(simDept.layerDelta)}`, good: simDept.layerDelta >= 0 },
                ].map(r => <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'rgba(28,43,58,0.55)' }}>{r.label}</span>
                  <span style={{ fontWeight: 500, color: r.good ? '#16A34A' : '#DC2626' }}>{r.value}</span>
                </div>)}
              </div>
            </div>

            {/* Shape Assessment — white card */}
            <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(28,43,58,0.55)', marginBottom: 12 }}>Shape Assessment</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#05070d', marginBottom: 4 }}>{shapeAssessment.shape}</div>
              <div style={{ fontSize: 12, color: 'rgba(28,43,58,0.65)', marginBottom: 12, lineHeight: 1.5 }}>{shapeAssessment.desc}</div>
              {/* Bars with counts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: "Senior", pct: shapeAssessment.topPct, count: shapeAssessment.top },
                  { label: "Mid", pct: shapeAssessment.midPct, count: shapeAssessment.mid },
                  { label: "IC", pct: shapeAssessment.bottomPct, count: shapeAssessment.bottom },
                ].map(tier => <div key={tier.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(28,43,58,0.55)', width: 40, textAlign: 'right' }}>{tier.label}</span>
                  <div style={{ flex: 1, height: 16, borderRadius: 8, overflow: 'hidden', background: 'rgba(28,43,58,0.04)' }}>
                    <div style={{ height: '100%', borderRadius: 8, transition: 'width 0.3s ease-out', width: `${Math.max(tier.pct * 100, 6)}%`, background: shapeAssessment.color, opacity: 0.7 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#05070d', minWidth: 32, textAlign: 'right' }}>{tier.count}</span>
                </div>)}
              </div>
            </div>

            {/* vs. Industry Benchmark — white card */}
            <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(28,43,58,0.55)', marginBottom: 12 }}>vs. Industry Benchmark</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: "Span of Control", current: dept?.avgSpan || 0, benchmark: "6-8:1", min: 6, max: 8 },
                  { label: "Layer Count", current: dept?.layers || 0, benchmark: "4-5", min: 4, max: 5 },
                  { label: "Manager Ratio", current: dept ? Math.round((dept.managers / Math.max(dept.headcount, 1)) * 100) : 0, benchmark: "10-12%", min: 10, max: 12 },
                ].map(row => <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#05070d' }}>{row.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.65)' }}>Benchmark: {row.benchmark}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: benchColor(row.current, row.min, row.max) }}>{row.current}{row.label === "Manager Ratio" ? "%" : row.label === "Span of Control" ? ":1" : ""}</div>
                    <div style={{ fontSize: 11, color: benchColor(row.current, row.min, row.max) }}>{row.current >= row.min && row.current <= row.max ? "\u2713 In range" : "\u26A0 Out of range"}</div>
                  </div>
                </div>)}
              </div>
            </div>
          </div>
        </div>
      </div>;
    })()}

    {/* Scenario Compare — elevated white card table + micro-summary */}
    {view === "compare" && (() => {
      const scAggs = scenarios.map(s => odsAgg(s.departments));
      const metrics = [
        { label: "Headcount", key: "hc", inv: true },
        { label: "Avg Span", key: "avgS" },
        { label: "Avg Layers", key: "avgL", inv: true },
        { label: "Managers", key: "mgr", inv: true },
        { label: "ICs", key: "ic" },
        { label: "Est. Cost ($M)", key: "cost", inv: true, fmtFn: (v: number) => `${fmtNum(v)}` },
      ];
      return <div>
        {/* Multi-scenario table */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 2 }}>Multi-Scenario Comparison</div>
          <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.65)', marginBottom: 14 }}>All scenarios vs. current state</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#F1EFE8' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(28,43,58,0.55)', borderBottom: '0.5px solid rgba(28,43,58,0.12)' }}>Metric</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(28,43,58,0.55)', borderBottom: '0.5px solid rgba(28,43,58,0.12)' }}>Current</th>
                {scenarios.map((s, i) => <th key={s.id} style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#05070d', borderBottom: '0.5px solid rgba(28,43,58,0.12)' }}>{s.label}</th>)}
              </tr></thead>
              <tbody>{metrics.map((m, ri) => {
                const cVal = cA[m.key as keyof typeof cA] as number;
                return <tr key={m.label} style={{ background: ri % 2 ? 'var(--ivory, #e8ecf5)' : '#FFFFFF', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#e8ecf5'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ri % 2 ? 'var(--ivory, #e8ecf5)' : '#FFFFFF'; }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#05070d', fontSize: 12, borderBottom: '0.5px solid rgba(28,43,58,0.06)' }}>{m.label}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: 'rgba(28,43,58,0.65)', fontSize: 12, fontWeight: 500, borderBottom: '0.5px solid rgba(28,43,58,0.06)' }}>{m.fmtFn ? m.fmtFn(cVal) : fmt(cVal)}</td>
                  {scenarios.map((s, i) => {
                    const v = scAggs[i][m.key as keyof typeof cA] as number;
                    const diff = v - cVal;
                    const pos = m.inv ? diff < 0 : diff > 0;
                    const neg = m.inv ? diff > 0 : diff < 0;
                    const dColor = pos ? '#16A34A' : neg ? '#DC2626' : 'rgba(28,43,58,0.65)';
                    return <td key={s.id} style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '0.5px solid rgba(28,43,58,0.06)' }}>
                      <span style={{ fontWeight: 500, color: '#05070d', fontSize: 12 }}>{m.fmtFn ? m.fmtFn(v) : fmt(v)}</span>
                      {Math.abs(diff) > 0.01 && <span style={{ fontSize: 11, fontWeight: 500, color: dColor, marginLeft: 4 }}>({diff > 0 ? '+' : ''}{m.fmtFn ? m.fmtFn(diff) : fmt(diff)})</span>}
                    </td>;
                  })}
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>

        {/* Micro-summary cards — one per scenario */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scenarios.length}, 1fr)`, gap: 12 }}>
          {scenarios.map((s, i) => {
            const a = scAggs[i];
            const costDelta = a.cost - cA.cost;
            const hcDelta = a.hc - cA.hc;
            return <div key={s.id} style={{
              background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 16,
              cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
              onClick={() => setActiveScenario(i)}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(28,43,58,0.40)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(28,43,58,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(28,43,58,0.15)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#05070d', marginBottom: 8 }}>{s.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'rgba(28,43,58,0.55)' }}>Headcount</span>
                  <span style={{ fontWeight: 500, color: '#05070d' }}>{a.hc.toLocaleString()} <span style={{ fontSize: 11, color: hcDelta < 0 ? '#16A34A' : hcDelta > 0 ? '#DC2626' : 'rgba(28,43,58,0.65)' }}>({hcDelta >= 0 ? '+' : ''}{hcDelta})</span></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'rgba(28,43,58,0.55)' }}>Avg Span</span>
                  <span style={{ fontWeight: 500, color: '#05070d' }}>{fmt(a.avgS)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'rgba(28,43,58,0.55)' }}>Cost</span>
                  <span style={{ fontWeight: 500, color: '#05070d' }}>{fmtNum(a.cost)}</span>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 500, color: '#22d3ee', display: 'flex', alignItems: 'center', gap: 4 }}>
                View details <span style={{ fontSize: 11 }}>{'\u2192'}</span>
              </div>
            </div>;
          })}
        </div>
      </div>;
    })()}

    {/* Insights Engine — grid layout */}
    {view === "analyze" && analyzeSubTab === "insights" && (() => {
      const insights: { type: string; title: string; body: string; color: string; metric?: string }[] = [];
      const narrow = currentData.filter(d => d.avgSpan < 5);
      if (narrow.length > 0) insights.push({ type: "warning", title: "Over-Layered Functions", body: `${narrow.map(d => `${d.name} (${d.avgSpan}:1)`).join(", ")} — spans below 5:1 indicate excessive management overhead. Industry benchmark is 6-8:1 for knowledge workers.`, color: "var(--warning)", metric: `${narrow.length} dept${narrow.length > 1 ? "s" : ""}` });
      const wide = currentData.filter(d => d.avgSpan > 12);
      if (wide.length > 0) insights.push({ type: "alert", title: "Overextended Spans", body: `${wide.map(d => `${d.name} (${d.avgSpan}:1)`).join(", ")} — spans above 12:1 risk insufficient coaching and development.`, color: "var(--risk)", metric: `${wide.length} dept${wide.length > 1 ? "s" : ""}` });
      const optimalSpan = currentData.filter(d => d.avgSpan >= 6 && d.avgSpan <= 10);
      if (optimalSpan.length > 0) insights.push({ type: "positive", title: "Healthy Span Functions", body: `${optimalSpan.map(d => d.name).join(", ")} — 6-10:1 span range is optimal with the right balance of oversight and autonomy.`, color: "var(--success)", metric: `${optimalSpan.length}/${currentData.length}` });
      const layerReductions = currentData.filter((d, i) => sc.departments[i]?.layers != null && sc.departments[i].layers < d.layers);
      if (layerReductions.length > 0) { const totalRemoved = layerReductions.reduce((s, d) => s + d.layers - (sc.departments[currentData.indexOf(d)]?.layers || d.layers), 0); insights.push({ type: "positive", title: `${totalRemoved} Layers Removed in ${sc.label}`, body: `De-layering ${layerReductions.map(d => d.name).join(", ")} compresses decision-making distance by ~${Math.round(totalRemoved / currentData.reduce((s, d) => s + d.layers, 0) * 100)}%.`, color: "var(--success)", metric: `${totalRemoved} layers` }); }
      const mgrRatio = cA.mgr / Math.max(cA.hc, 1) * 100;
      const fMgrRatio = fA.mgr / Math.max(fA.hc, 1) * 100;
      insights.push({ type: mgrRatio > 15 ? "warning" : "info", title: `Manager Ratio: ${fmt(mgrRatio, "pct")} to ${fmt(fMgrRatio, "pct")}`, body: `Current org has 1 manager per ${fmt(Math.round(cA.hc / Math.max(cA.mgr, 1)))} employees. ${mgrRatio > 15 ? "Above the 12-15% benchmark." : mgrRatio < 8 ? "Below 8% — may indicate insufficient leadership." : "Within healthy 8-15% range."}`, color: mgrRatio > 15 ? "var(--warning)" : "var(--accent-primary)", metric: `${fmt(mgrRatio, "pct")}` });
      if (fA.cost < cA.cost) { const savings = cA.cost - fA.cost; const pct = (savings / Math.max(cA.cost, 1) * 100); insights.push({ type: "positive", title: `${fmtNum(savings)} Annual Savings (${pct.toFixed(0)}%)`, body: `The ${sc.label} scenario achieves labor cost reduction through structural efficiency, removing ${cA.hc - fA.hc} positions.`, color: "var(--success)", metric: `${fmtNum(savings)}` }); }
      if (fA.cost > cA.cost) { const increase = fA.cost - cA.cost; insights.push({ type: "warning", title: `${fmtNum(increase)} Cost Increase`, body: `The ${sc.label} scenario adds ${fA.hc - cA.hc} headcount costing ${fmtNum(increase)}/year. Verify this represents strategic investment.`, color: "var(--warning)", metric: `+${fmtNum(increase)}` }); }
      const largest = [...currentData].sort((a, b) => b.headcount - a.headcount)[0] || { name: "\u2014", headcount: 0 };
      const smallest = [...currentData].sort((a, b) => a.headcount - b.headcount)[0] || { name: "\u2014", headcount: 0 };
      insights.push({ type: "info", title: `Concentration Risk: ${largest.name}`, body: `${largest.name} holds ${Math.round(largest.headcount / Math.max(cA.hc, 1) * 100)}% of total headcount. ${largest.headcount / Math.max(cA.hc, 1) > 0.3 ? "Exceeds 30% — consider sub-division." : "Within acceptable range."}`, color: "var(--accent-primary)", metric: `${Math.round(largest.headcount / Math.max(cA.hc, 1) * 100)}%` });
      const worstIMRatio = [...currentData].sort((a, b) => (a.ics / Math.max(a.managers, 1)) - (b.ics / Math.max(b.managers, 1)))[0] || { name: "\u2014", ics: 0, managers: 1 };
      const bestIMRatio = [...currentData].sort((a, b) => (b.ics / Math.max(b.managers, 1)) - (a.ics / Math.max(a.managers, 1)))[0] || { name: "\u2014", ics: 0, managers: 1 };
      insights.push({ type: "info", title: "IC-to-Manager Disparity", body: `Widest gap: ${bestIMRatio.name} (${(bestIMRatio.ics / Math.max(bestIMRatio.managers, 1)).toFixed(1)}) vs ${worstIMRatio.name} (${(worstIMRatio.ics / Math.max(worstIMRatio.managers, 1)).toFixed(1)}). Standardizing ratios could improve equity.`, color: "var(--accent-primary)" });
      const avgFte = currentData.reduce((s, d) => s + d.fteRatio, 0) / currentData.length;
      const lowFte = currentData.filter(d => d.fteRatio < 0.8);
      if (lowFte.length > 0) insights.push({ type: "warning", title: `High Contractor Reliance`, body: `${lowFte.map(d => `${d.name} (${Math.round(d.fteRatio * 100)}% FTE)`).join(", ")} — FTE ratio below 80% indicates dependency on contingent workforce.`, color: "var(--warning)", metric: `${Math.round(avgFte * 100)}% avg` });
      insights.push({ type: "info", title: `${sc.label} Scenario Summary`, body: `HC ${fmt(cA.hc)} to ${fmt(fA.hc)}, span ${fmt(cA.avgS)} to ${fmt(fA.avgS)}, cost ${fmtNum(cA.cost)} to ${fmtNum(fA.cost)}. Primary lever: ${fA.avgL < cA.avgL ? "layer compression" : fA.hc < cA.hc ? "headcount reduction" : "span optimization"}.`, color: "var(--accent-primary)" });

      if (!insights.length) insights.push({ type: "info", title: "No Major Flags", body: "Current scenario changes are within normal ranges.", color: "var(--accent-primary)" });

      // Enrich insights with severity, recommendation
      const enrichedInsights = insights.map(ins => {
        let severity: string, severityIcon: string, severityColor: string;
        if (ins.type === "alert") { severity = "Critical"; severityIcon = "\u26A0"; severityColor = "#fb7185"; }
        else if (ins.type === "warning") { severity = "Needs Attention"; severityIcon = "\u25C8"; severityColor = "#fbbf24"; }
        else if (ins.type === "positive") { severity = "On Track"; severityIcon = "\u2713"; severityColor = "#16A34A"; }
        else { severity = "Opportunity"; severityIcon = "\u2139"; severityColor = "#22d3ee"; }

        let recommendation = "";
        if (ins.title.includes("Over-Layered")) recommendation = "Consolidate one management layer in flagged functions. Target 6-8:1 span ratio.";
        else if (ins.title.includes("Overextended")) recommendation = "Add team leads or split teams to bring spans below 10:1.";
        else if (ins.title.includes("Healthy")) recommendation = "Preserve current structure. Use as benchmarks for other departments.";
        else if (ins.title.includes("Layers Removed")) recommendation = "Implement de-layering through attrition cycles. Reassign decision rights.";
        else if (ins.title.includes("Manager Ratio")) recommendation = "Review manager-to-IC ratios across departments. Standardize toward 1:8.";
        else if (ins.title.includes("Savings")) recommendation = "Phase savings over 12-18 months. Reinvest 20% in upskilling.";
        else if (ins.title.includes("Cost Increase")) recommendation = "Validate cost increases map to strategic capabilities.";
        else if (ins.title.includes("Concentration")) recommendation = "Assess single-point-of-failure risk if concentration exceeds 30%.";
        else if (ins.title.includes("IC-to-Manager")) recommendation = "Standardize IC-to-Manager ratios across comparable functions.";
        else if (ins.title.includes("Contractor")) recommendation = "Convert critical contractor roles to FTE for knowledge retention.";
        else if (ins.title.includes("Summary")) recommendation = "Validate key assumptions with department heads before presenting.";
        else recommendation = "Review and validate findings with relevant department heads.";

        // Mini visualization score (inline bar width)
        const vizScore = ins.type === "alert" ? 90 : ins.type === "warning" ? 65 : ins.type === "positive" ? 30 : 50;

        return { ...ins, severity, severityIcon, severityColor, recommendation, vizScore };
      });

      // Count by severity
      const counts: Record<string, number> = { "On Track": 0, "Needs Attention": 0, "Critical": 0, "Opportunity": 0 };
      enrichedInsights.forEach(i => { counts[i.severity] = (counts[i.severity] || 0) + 1; });
      const filtered = insightFilter === "all" ? enrichedInsights : enrichedInsights.filter(i => i.severity === insightFilter);

      return <div>
        <div style={{ fontSize: 12, color: 'rgba(28,43,58,0.65)', marginBottom: 12 }}>{enrichedInsights.length} insights from {currentData.length} departments, {fmt(cA.hc)} employees</div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { key: "all", label: `All insights`, count: enrichedInsights.length },
            { key: "On Track", label: "On Track", count: counts["On Track"] },
            { key: "Needs Attention", label: "Needs Attention", count: counts["Needs Attention"] },
            { key: "Critical", label: "Critical", count: counts["Critical"] },
            { key: "Opportunity", label: "Opportunity", count: counts["Opportunity"] },
          ].filter(p => p.key === "all" || p.count > 0).map(pill => (
            <button key={pill.key} onClick={() => setInsightFilter(pill.key)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: insightFilter === pill.key ? 'none' : '0.5px solid rgba(28,43,58,0.15)',
                background: insightFilter === pill.key ? '#05070d' : 'transparent',
                color: insightFilter === pill.key ? '#FFFFFF' : 'rgba(28,43,58,0.65)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (insightFilter !== pill.key) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(28,43,58,0.40)'; }}
              onMouseLeave={e => { if (insightFilter !== pill.key) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(28,43,58,0.15)'; }}
            >{pill.label} ({pill.count})</button>
          ))}
        </div>

        {/* Grid of insight cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((ins, i) => (
            <div key={i} style={{
              background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: 20,
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(28,43,58,0.40)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(28,43,58,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(28,43,58,0.15)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
              {/* Status indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, background: `${ins.severityColor}12`, color: ins.severityColor }}>{ins.severityIcon}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: ins.severityColor }}>{ins.severity}</span>
              </div>
              {/* Title */}
              <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 6, lineHeight: 1.4 }}>{ins.title}</div>
              {/* Description */}
              <div style={{ fontSize: 12, color: '#05070d', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{ins.body}</div>
              {/* Mini visualization — inline severity bar */}
              {ins.metric && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(28,43,58,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${ins.vizScore}%`, background: ins.severityColor, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: ins.severityColor }}>{ins.metric}</span>
              </div>}
              {/* Recommendation box */}
              <div style={{ background: 'var(--ivory, #e8ecf5)', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(28,43,58,0.65)', marginBottom: 4 }}>Recommendation</div>
                <div style={{ fontSize: 11, color: 'rgba(28,43,58,0.65)', lineHeight: 1.5 }}>{ins.recommendation}</div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, color: 'rgba(28,43,58,0.15)', marginBottom: 8 }}>&#9783;</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 4 }}>No insights match this filter</div>
            <div style={{ fontSize: 12, color: 'rgba(28,43,58,0.55)' }}>Try selecting a different category above</div>
          </div>
        )}
      </div>;
    })()}

    {view === "analyze" && analyzeSubTab === "benchmarks" && <Card title="Span & Layer Benchmarks by Industry">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Industry benchmarks for optimal spans of control, management layers, and manager-to-IC ratios. Use as design targets when restructuring.</div>
      <div className="space-y-5">
        {SPAN_BENCHMARKS.map((bm, bi) => <div key={bi} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">{bm.icon}</span><span className="text-[14px] font-bold text-[var(--text-primary)]">{bm.industry}</span></div>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg p-2 bg-[var(--surface-1)] text-center"><div className="text-[16px] font-extrabold text-[var(--accent-primary)]">{bm.optimalSpan}</div><div className="text-[15px] text-[var(--text-muted)] uppercase">Optimal Span</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-1)] text-center"><div className="text-[16px] font-extrabold text-[var(--success)]">{bm.optimalLayers}</div><div className="text-[15px] text-[var(--text-muted)] uppercase">Optimal Layers</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-1)] text-center"><div className="text-[16px] font-extrabold text-[var(--purple)]">{bm.mgrRatio}</div><div className="text-[15px] text-[var(--text-muted)] uppercase">Mgr:IC Ratio</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-1)] text-center"><div className="text-[16px] font-extrabold text-[var(--warning)]">{bm.avgSpan}</div><div className="text-[15px] text-[var(--text-muted)] uppercase">Avg Span (Actual)</div></div>
            </div>
            <div className="text-[15px] text-[var(--text-muted)] mt-2 italic">{bm.notes}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">By Function</div>
            <div className="overflow-x-auto"><table className="w-full text-[15px]"><thead><tr className="border-b border-[var(--border)]">
              {["Function","Span","Layers","Rationale"].map(h => <th key={h} className="px-2 py-1.5 text-left text-[var(--text-muted)] font-semibold">{h}</th>)}
            </tr></thead><tbody>
              {bm.byFunction.map((bf, bfi) => <tr key={bfi} className="border-b border-[var(--border)]">
                <td className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">{bf.func}</td>
                <td className="px-2 py-1.5 text-[var(--accent-primary)] font-bold">{bf.span}</td>
                <td className="px-2 py-1.5 text-[var(--success)] font-bold">{bf.layers}</td>
                <td className="px-2 py-1.5 text-[var(--text-secondary)]">{bf.rationale}</td>
              </tr>)}
            </tbody></table></div>
          </div>
        </div>)}
      </div>

      {/* Current vs Benchmark comparison */}
      {currentData.length > 0 && <div className="mt-5">
        <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Your Org vs Industry Benchmarks</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-4 bg-[var(--surface-1)] border border-[var(--border)] text-center">
            <div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Your Avg Span</div>
            <div className="text-[22px] font-extrabold text-[var(--text-primary)]">{fmt(cA.hc / Math.max(cA.mgr, 1))}</div>
            <div className="text-[14px] text-[var(--text-muted)] mt-1">vs benchmark 6-10</div>
          </div>
          <div className="rounded-xl p-4 bg-[var(--surface-1)] border border-[var(--border)] text-center">
            <div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Your Avg Layers</div>
            <div className="text-[22px] font-extrabold text-[var(--text-primary)]">{fmt(currentData.reduce((s, d) => s + d.layers, 0) / currentData.length)}</div>
            <div className="text-[14px] text-[var(--text-muted)] mt-1">vs benchmark 4-6</div>
          </div>
          <div className="rounded-xl p-4 bg-[var(--surface-1)] border border-[var(--border)] text-center">
            <div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Mgr Ratio</div>
            <div className="text-[22px] font-extrabold text-[var(--text-primary)]">1:{Math.round(cA.hc / Math.max(cA.mgr, 1))}</div>
            <div className="text-[14px] text-[var(--text-muted)] mt-1">vs benchmark 1:6 to 1:10</div>
          </div>
        </div>
      </div>}
    </Card>}

    {/* Present tab — designed empty state */}
    {view === "present" && (
      <div style={{ background: '#FFFFFF', border: '0.5px solid rgba(28,43,58,0.15)', borderRadius: 8, padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, color: 'rgba(28,43,58,0.12)', marginBottom: 12 }}>{'\uD83D\uDCCA'}</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#05070d', marginBottom: 6 }}>Presentation Mode</div>
        <div style={{ fontSize: 12, color: 'rgba(28,43,58,0.55)', marginBottom: 16, maxWidth: 400, margin: '0 auto 16px' }}>Presentation mode is in development. In the meantime, export your analysis from the Compare tab or use your browser's print function.</div>
      </div>
    )}

    <FlowNav
      previous={{ id: "impactsim", label: "Impact Simulator", icon: <Gauge /> }}
      next={{ id: "orgrestructuring", label: "Org Restructuring", icon: <Network /> }}
      onNavigate={onBack}
    />
  </div>;
}
