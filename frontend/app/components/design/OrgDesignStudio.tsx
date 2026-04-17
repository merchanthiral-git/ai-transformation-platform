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

  // Upgrade 3: Insights slideshow state
  const [insightSlide, setInsightSlide] = useState(0);

  // Keyboard navigation for insights slideshow
  useEffect(() => {
    if (view !== "insights") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); setInsightSlide(prev => prev + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setInsightSlide(prev => Math.max(0, prev - 1)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view]);

  const DChip = ({ a, b, inv }: { a: number; b: number; inv?: boolean }) => {
    const diff = b - a; const pos = inv ? diff < 0 : diff > 0; const neg = inv ? diff > 0 : diff < 0;
    const c = pos ? "var(--success)" : neg ? "var(--risk)" : "var(--text-muted)";
    const ar = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[15px] font-bold" style={{ color: c, background: pos ? "rgba(16,185,129,0.1)" : neg ? "rgba(239,68,68,0.1)" : "transparent" }}>{ar}{fmt(Math.abs(diff))}</span>;
  };

  const HBar = ({ value, max, color }: { value: number; max: number; color: string }) => <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: `${color}12` }}><div className="h-full rounded-full transition-all" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} /></div>;

  const OdsKpi = ({ label, current, future, inv }: { label: string; current: number; future: number; inv?: boolean }) => (
    <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
      <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-baseline gap-3">
        <div><div className="text-[15px] text-[var(--text-muted)]">Current</div><div className="text-xl font-extrabold text-[var(--accent-primary)]">{fmt(current)}</div></div>
        <span className="text-[var(--text-muted)]">→</span>
        <div><div className="text-[15px] text-[var(--text-muted)]">Scenario</div><div className="text-xl font-extrabold text-[var(--success)]">{fmt(future)}</div></div>
      </div>
      <div className="mt-1"><DChip a={current} b={future} inv={inv} /></div>
    </div>
  );

  // Job view: structural context
  if (viewCtx?.mode === "job" && viewCtx?.job) {
    const matchDept = currentData.find(d => d.name.toLowerCase().includes((viewCtx.job || "").split(" ")[0].toLowerCase())) || currentData[0];
    const matchFuture = sc.departments[currentData.indexOf(matchDept)] || sc.departments[0];
    return <div>
      <PageHeader icon="💼" title={`Structural Context — ${viewCtx.job}`} subtitle="Where this role sits in the org structure" onBack={onBack} moduleId="build" />
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
        ]} icon="🏗️" />
      </div>
      <NextStepBar currentModuleId="build" onNavigate={onBack} />
    </div>;
  }

  // Employee view: show org chart
  if (viewCtx?.mode === "employee" && viewCtx?.employee) return <div>
    <PageHeader icon="👤" title="My Org Chart" subtitle={`${viewCtx.employee}'s reporting structure`} onBack={onBack} moduleId="build" />
    <EmployeeOrgChart employee={viewCtx.employee} model={model} f={f} />
    <InsightPanel title="What This Means" items={["Your org chart shows your reporting line, peers at your level, and any direct reports.", "During transformation, your reporting line may change as layers are adjusted.", "Use the Organization View to see how the full structure is being redesigned."]} icon="🏗️" />
  </div>;

  return <div>
    <ContextStrip items={["Phase 2: Design — Model your future org structure. Data is generated for modeling — upload workforce data to ground in reality."]} />
    <PageHeader icon="🏗️" title="Org Design Studio" subtitle="Current → Future State Modeling · Multi-Scenario Engine" onBack={onBack} moduleId="build" />
    {hasRealData ? <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-4 text-[15px] text-[var(--success)]">✓ Using your uploaded workforce data to model departments</div> : <div className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-4 text-[15px] text-[var(--warning)]">Using generated sample data — upload workforce data for your real org structure</div>}

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
          <input type="range" min={min} max={max} step={step} value={value} onChange={e => { onChange(Number(e.target.value)); setCustomPreset(""); }} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, #3B82F6 ${((value - min) / (max - min)) * 100}%, rgba(59,130,246,0.15) ${((value - min) / (max - min)) * 100}%)` }} />
        </div>
      );

      return <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300" onClick={() => setDrawerOpen(false)} />
        {/* Drawer */}
        <div className="fixed top-0 right-0 h-full w-[400px] z-50 bg-[#0f172a] border-l border-[var(--border)] shadow-2xl overflow-y-auto transition-transform duration-300" style={{ boxShadow: "0 0 60px rgba(0,0,0,0.5)" }}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[18px] font-bold text-[var(--text-primary)]">Scenario Builder</div>
                <div className="text-[13px] text-[var(--text-muted)]">Presets are starting points — customize every lever to build your scenario</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl font-bold px-2">×</button>
            </div>

            {/* UX Guidance */}
            <div className="rounded-lg bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)] p-3 mb-5 text-[12px] text-[var(--text-secondary)] leading-relaxed">
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
                    background: customPreset === name ? "rgba(59,130,246,0.1)" : "var(--surface-2)",
                    border: customPreset === name ? "2px solid #3B82F6" : "2px solid var(--border)",
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
              }} className="flex-1 px-4 py-2.5 rounded-lg text-[14px] font-bold text-white transition-all" style={{ background: "#3B82F6" }}>
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

    {/* View tabs */}
    <TabBar tabs={[{ id: "overview", label: "Overview" }, { id: "soc", label: "Span Detail" }, { id: "layers", label: "Layers" }, { id: "cost", label: "Cost Model" }, { id: "roles", label: "Role Migration" }, { id: "drill", label: "Dept Drill-Down" }, { id: "compare", label: "Compare All" }, { id: "insights", label: "Insights" }, { id: "benchmarks", label: "📖 Benchmarks" }]} active={view} onChange={setView} />

    {aiOdsInsights.length > 0 && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.06)] to-transparent border border-[rgba(224,144,64,0.15)] rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2 text-[15px] font-bold" style={{ color: "#f0a050" }}>✨ AI Restructuring Recommendations</div>
      <div className="space-y-1.5">{aiOdsInsights.map((ins, i) => <div key={i} className="text-[15px] text-[var(--text-secondary)] pl-4 relative"><span className="absolute left-0 text-[#f0a050] font-bold">{i+1}.</span>{ins}</div>)}</div>
    </div>}

    {view === "overview" && <div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <OdsKpi label="Total Headcount" current={cA.hc} future={fA.hc} inv /><OdsKpi label="Avg Span" current={cA.avgS} future={fA.avgS} /><OdsKpi label="Avg Layers" current={cA.avgL} future={fA.avgL} inv /><OdsKpi label="Managers" current={cA.mgr} future={fA.mgr} inv /><OdsKpi label="ICs" current={cA.ic} future={fA.ic} /><OdsKpi label="Est. Cost ($M)" current={cA.cost / 1e6} future={fA.cost / 1e6} inv />
      </div>
      {/* Span by dept */}
      <Card title="Span of Control by Department">
        {(() => { const maxSpan = Math.max(...currentData.map(d => d.avgSpan), ...sc.departments.map(d => d.avgSpan)) * 1.15; return <div className="space-y-2">{currentData.map((d, i) => { const f = sc.departments[i]; return <div key={d.name} className="flex items-center gap-3"><div className="w-32 text-[15px] text-[var(--text-muted)] text-right shrink-0">{d.name}</div><div className="flex-1 space-y-1"><HBar value={d.avgSpan} max={maxSpan} color="var(--accent-primary)" /><HBar value={f?.avgSpan || 0} max={maxSpan} color="var(--success)" /></div><div className="w-16 shrink-0"><DChip a={d.avgSpan} b={f?.avgSpan || 0} /></div></div>; })}</div>; })()}
        <div className="flex gap-4 mt-3 text-[15px] text-[var(--text-muted)]"><span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[var(--accent-primary)]" />Current</span><span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[var(--success)]" />{sc.label}</span></div>
      </Card>
    </div>}

    {view === "soc" && (() => {
      const SPAN_MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";
      const spanHealth = (s: number) => s >= 6 && s <= 8 ? { label: "Optimal", color: "#10B981", badge: "✓" } : s >= 5 && s <= 10 ? { label: s < 6 ? "Narrow" : "Wide", color: "#F59E0B", badge: "◈" } : { label: s < 5 ? "Critical-Narrow" : "Critical-Wide", color: "#EF4444", badge: "⚠" };
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
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Org-Wide Average Span</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 28, fontFamily: SPAN_MONO, fontWeight: 700, color: spanHealth(orgAvgCur).color }}>{orgAvgCur.toFixed(1)}</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>→</span>
              <span style={{ fontSize: 28, fontFamily: SPAN_MONO, fontWeight: 700, color: spanHealth(orgAvgFut).color }}>{orgAvgFut.toFixed(1)}</span>
              <span style={{ fontSize: 12, fontFamily: SPAN_MONO, fontWeight: 700, color: spanImproving(orgAvgCur, orgAvgFut) ? "#10B981" : "#F97316", padding: "2px 6px", borderRadius: 4, background: spanImproving(orgAvgCur, orgAvgFut) ? "rgba(16,185,129,0.1)" : "rgba(249,115,22,0.1)" }}>{orgAvgFut > orgAvgCur ? "↑" : "↓"}{Math.abs(orgAvgFut - orgAvgCur).toFixed(1)}</span>
            </div>
          </div>
          {/* Departments in benchmark */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>In Benchmark Range (6-8:1)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", width: 48, height: 48 }}>
                <svg viewBox="0 0 48 48" style={{ width: 48, height: 48, transform: "rotate(-90deg)" }}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - inBenchFut / Math.max(currentData.length, 1))}`} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: SPAN_MONO, fontWeight: 700, color: "#e8ecf4" }}>{inBenchFut}</div>
              </div>
              <div>
                <div style={{ fontSize: 15, fontFamily: SPAN_MONO, fontWeight: 700, color: "#e8ecf4" }}>{inBenchCur} → {inBenchFut} <span style={{ fontSize: 11, color: "#64748b" }}>of {currentData.length}</span></div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{inBenchFut > inBenchCur ? "Improving" : inBenchFut < inBenchCur ? "Degrading" : "Stable"}</div>
              </div>
            </div>
          </div>
          {/* Widest span gap */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Widest Span Variance</div>
            {widestGap && <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e8ecf4" }}>{widestGap.name}</div>
              <div style={{ fontSize: 13, fontFamily: SPAN_MONO, fontWeight: 700, color: "#F97316" }}>{widestGap.min}:1 to {widestGap.max}:1 <span style={{ fontSize: 11, color: "#64748b" }}>— range of {widestGap.range}</span></div>
            </div>}
          </div>
        </div>

        {/* Benchmark reference */}
        <div style={{ padding: "8px 12px", marginBottom: 16, background: "rgba(59,130,246,0.04)", borderLeft: "3px solid #3B82F6", borderRadius: 8, fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
          Industry benchmark for knowledge workers: 6-8 direct reports per manager. Below 5:1 indicates over-management. Above 10:1 may indicate insufficient oversight.
        </div>

        {/* ═══ VISUAL SPAN COMPARISON ═══ */}
        <Card title="Span of Control by Department">
          {sorted.map((d) => {
            const f = d.fut;
            const curSpan = d.avgSpan;
            const futSpan = f?.avgSpan || curSpan;
            const curH = spanHealth(curSpan);
            const futH = spanHealth(futSpan);
            const improving = spanImproving(curSpan, futSpan);
            const barScale = 14; // max scale
            const isExpanded = expandedDept === d.name;
            const sr = spanRanges.find(r => r.name === d.name);

            return <div key={d.name} style={{ marginBottom: 4 }}>
              <button onClick={() => setExpandedDept(isExpanded ? null : d.name)} style={{ width: "100%", display: "grid", gridTemplateColumns: "140px 1fr 120px 60px", gap: 12, alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {/* Department name */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: curH.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e8ecf4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                  </div>
                  <div style={{ fontSize: 9, fontFamily: SPAN_MONO, fontWeight: 700, color: "#64748b", marginLeft: 12 }}>{d.headcount} HC · {d.managers} mgrs</div>
                </div>
                {/* Span bar */}
                <div style={{ position: "relative", height: 24 }}>
                  {/* Benchmark zone */}
                  <div style={{ position: "absolute", left: `${(6 / barScale) * 100}%`, width: `${((8 - 6) / barScale) * 100}%`, top: 4, bottom: 4, background: "rgba(16,185,129,0.08)", borderRadius: 4, border: "1px dashed rgba(16,185,129,0.2)" }} />
                  {/* Current span marker */}
                  <div style={{ position: "absolute", left: `${Math.min(curSpan / barScale, 1) * 100}%`, top: "50%", transform: "translate(-50%, -50%)", width: 10, height: 10, borderRadius: 5, background: curH.color, border: "2px solid rgba(255,255,255,0.2)", zIndex: 2 }} title={`Current: ${curSpan.toFixed(1)}:1`} />
                  {/* Future span marker */}
                  <div style={{ position: "absolute", left: `${Math.min(futSpan / barScale, 1) * 100}%`, top: "50%", transform: "translate(-50%, -50%) rotate(45deg)", width: 8, height: 8, background: futH.color, border: "1px solid rgba(255,255,255,0.3)", zIndex: 2 }} title={`Future: ${futSpan.toFixed(1)}:1`} />
                  {/* Connecting line */}
                  {curSpan !== futSpan && <div style={{ position: "absolute", top: "50%", left: `${Math.min(Math.min(curSpan, futSpan) / barScale, 1) * 100}%`, width: `${Math.abs(futSpan - curSpan) / barScale * 100}%`, height: 1, background: improving ? "#10B981" : "#F97316", opacity: 0.4, transform: "translateY(-50%)" }} />}
                  {/* Axis line */}
                  <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "rgba(255,255,255,0.06)", transform: "translateY(-50%)", zIndex: 0 }} />
                </div>
                {/* Values */}
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontFamily: SPAN_MONO, fontWeight: 700, color: curH.color }}>{curSpan.toFixed(1)}</span>
                  <span style={{ fontSize: 11, color: "#64748b", margin: "0 4px" }}>→</span>
                  <span style={{ fontSize: 13, fontFamily: SPAN_MONO, fontWeight: 700, color: futH.color }}>{futSpan.toFixed(1)}</span>
                  <span style={{ fontSize: 11, fontFamily: SPAN_MONO, fontWeight: 700, color: improving ? "#10B981" : "#F97316", marginLeft: 4 }}>{futSpan > curSpan ? "↑" : "↓"}{Math.abs(futSpan - curSpan).toFixed(1)}</span>
                </div>
                {/* Health badge */}
                <div style={{ textAlign: "center" }}>
                  <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: `${futH.color}15`, color: futH.color }}>{futH.badge} {futH.label.split("-")[0]}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && <div style={{ padding: "12px 16px 16px", marginLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
                {/* Span distribution */}
                {sr && <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 6 }}>Manager Span Distribution</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: SPAN_MONO, fontWeight: 700, color: "#64748b" }}>{sr.min}:1</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)", position: "relative" }}>
                      <div style={{ position: "absolute", left: `${(sr.min / barScale) * 100}%`, width: `${((sr.max - sr.min) / barScale) * 100}%`, top: 0, bottom: 0, borderRadius: 3, background: sr.range > 8 ? "rgba(239,68,68,0.3)" : sr.range > 4 ? "rgba(249,115,22,0.3)" : "rgba(16,185,129,0.3)" }} />
                      <div style={{ position: "absolute", left: `${(curSpan / barScale) * 100}%`, top: -2, width: 4, height: 10, borderRadius: 2, background: "#e8ecf4", transform: "translateX(-50%)" }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: SPAN_MONO, fontWeight: 700, color: "#64748b" }}>{sr.max}:1</span>
                    <span style={{ fontSize: 9, color: sr.range > 8 ? "#EF4444" : sr.range > 4 ? "#F97316" : "#10B981" }}>Range: {sr.range}</span>
                  </div>
                </div>}
                {/* Flags */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {curSpan < 5 && <div style={{ fontSize: 12, color: "#F59E0B", padding: "4px 8px", borderRadius: 6, background: "rgba(245,158,11,0.06)" }}>⚠ Span below 5:1 indicates potential over-management — consider removing a management layer</div>}
                  {curSpan > 10 && <div style={{ fontSize: 12, color: "#EF4444", padding: "4px 8px", borderRadius: 6, background: "rgba(239,68,68,0.06)" }}>⚠ Span above 10:1 — managers may be overextended. Consider splitting teams or adding team leads.</div>}
                  {sr && sr.range > 6 && <div style={{ fontSize: 12, color: "#F97316", padding: "4px 8px", borderRadius: 6, background: "rgba(249,115,22,0.06)" }}>◈ High span variance ({sr.range}) — redistribute reports to equalize manager workloads</div>}
                  {improving && <div style={{ fontSize: 12, color: "#10B981", padding: "4px 8px", borderRadius: 6, background: "rgba(16,185,129,0.06)" }}>✓ Scenario moves span toward benchmark (6-8:1)</div>}
                </div>
                {/* Detail stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
                  {[
                    { l: "Headcount", c: d.headcount, f: f?.headcount },
                    { l: "Managers", c: d.managers, f: f?.managers },
                    { l: "ICs", c: d.ics, f: f?.ics },
                    { l: "Layers", c: d.layers, f: f?.layers },
                  ].map(m => <div key={m.l} style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.02)", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>{m.l}</div>
                    <div style={{ fontSize: 13, fontFamily: SPAN_MONO, fontWeight: 700, color: "#e8ecf4" }}>{m.c} <span style={{ color: "#64748b" }}>→</span> {m.f || m.c}</div>
                  </div>)}
                </div>
              </div>}
            </div>;
          })}

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#64748b" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: "#10B981" }} />Current</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 1, background: "#3B82F6", transform: "rotate(45deg)" }} />Future</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 16, height: 8, borderRadius: 2, background: "rgba(16,185,129,0.2)", border: "1px dashed rgba(16,185,129,0.3)" }} />Benchmark (6-8:1)</span>
          </div>
        </Card>
      </div>;
    })()}

    {view === "layers" && (() => {
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
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Scope:</span>
          <select value={layerScope} onChange={e => setLayerScope(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none">
            <option value="all">Entire Organization</option>
            {currentData.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>

        {/* New bracketed delta chart */}
        <Card title="Layer Distribution — Current vs. Future">
          <LayerDistributionChart data={layerChartData} />
        </Card>

        {/* Cost model below layer distribution */}
        <Card title="Cost Model — Current vs. Future">
          <CostModelChart data={costChartData} />
        </Card>
      </div>;
    })()}

    {view === "cost" && (() => {
      // Build cost data from current scenario
      const srcCurrent = layerScope === "all" ? currentData : currentData.filter(d => d.name === layerScope);
      const srcFuture = layerScope === "all" ? (sc.departments || []) : (sc.departments || []).filter((d: ReturnType<typeof odsGenDept>[0]) => d.name === layerScope);
      const costChartData: LayerCostData[] = ODS_LEVELS.map(l => {
        const curCount = srcCurrent.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0);
        const futCount = srcFuture.reduce((s: number, d: ReturnType<typeof odsGenDept>[0]) => s + (d.levelDist?.[l] || 0), 0);
        return { layer: l, currentHeadcount: curCount, futureHeadcount: futCount, avgComp: ODS_AVG_COMP[l] || 85000 };
      });

      return <div>
        <Card title="Cost Model — Current vs. Future">
          <CostModelChart data={costChartData} />
        </Card>
        <Card title="Cost by Department">
          {(() => { const cCosts = currentData.map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const fCosts = (sc.departments || []).map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const maxCost = Math.max(...cCosts, ...fCosts, 1); return <div className="space-y-3">{currentData.map((d, i) => { const delta = (fCosts[i] ?? 0) - (cCosts[i] ?? 0); return <div key={d.name} className="flex items-center gap-3"><div className="w-36 text-[15px] font-semibold text-[var(--text-secondary)] text-right shrink-0">{d.name}</div><div className="flex-1 space-y-1"><HBar value={cCosts[i] ?? 0} max={maxCost} color="var(--accent-primary)" /><HBar value={fCosts[i] ?? 0} max={maxCost} color="var(--success)" /></div><div className="w-24 text-right shrink-0"><div className="text-[15px] font-semibold text-[var(--text-primary)]">{fmtNum(cCosts[i] ?? 0)}</div><div className="text-[15px]" style={{ color: delta < 0 ? "var(--success)" : delta > 0 ? "var(--risk)" : "var(--text-muted)" }}>{delta < 0 ? "↓" : delta > 0 ? "↑" : "→"} ${Math.abs(delta / 1e3).toFixed(0)}K</div></div></div>; })}</div>; })()}
        </Card>
      </div>;
    })()}

    {view === "roles" && (() => {
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
    {view === "drill" && (() => {
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
        else if (midPct > 0.4) { shape = "Diamond"; color = "#F59E0B"; desc = "Bloated middle management — review mid-level consolidation"; }
        else if (topPct > 0.25) { shape = "Top-Heavy"; color = "#F97316"; desc = "High senior concentration — review management overhead"; }
        else if (Math.abs(topPct - bottomPct) < 0.15) { shape = "Column"; color = "#F97316"; desc = "Uniform distribution — lacks leverage, review career architecture"; }
        else { shape = "Flat"; color = "#3B82F6"; desc = "Broad base with minimal hierarchy — verify coaching capacity"; }
        return { shape, color, desc, top, mid, bottom, topPct, midPct, bottomPct };
      })() : { shape: "—", color: "#888", desc: "", top: 0, mid: 0, bottom: 0, topPct: 0, midPct: 0, bottomPct: 0 };

      // Benchmark check helper
      const benchColor = (val: number, min: number, max: number) => val >= min && val <= max ? "#34d399" : "#F97316";

      // Track colors for pyramid bars
      const DRILL_TRACK_COLORS: Record<string, string> = { E: "#ef4444", M: "#F97316", P: "#3B82F6", S: "#22d3ee", T: "#a78bfa" };
      const DRILL_MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";

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
        <Card title="Department Deep Dive">
          <div className="flex items-center gap-2 mb-5">
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#64748b" }}>Department:</span>
            <select value={selDept} onChange={e => setSelDept(Number(e.target.value))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] min-w-[200px]">
              {currentData.map((d, i) => <option key={d.name} value={i}>{d.name} — {d.headcount} HC</option>)}
            </select>
          </div>
          {/* KPI cards — Current → Scenario with scenario emphasized */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {kpiData.map(kpi => {
              const diff = kpi.scenario - kpi.current;
              const isGood = kpi.inv ? diff <= 0 : diff >= 0;
              const changed = Math.abs(diff) > 0.01;
              return <div key={kpi.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>{kpi.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 14, color: "#64748b", fontFamily: DRILL_MONO, fontWeight: 700 }}>{fmt(kpi.current)}</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>→</span>
                  <span style={{ fontSize: 24, fontWeight: 700, fontFamily: DRILL_MONO, color: changed ? (isGood ? "#34d399" : "#F97316") : "#e8ecf4" }}>{fmt(kpi.scenario)}</span>
                </div>
                {changed && <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  marginTop: 4, padding: "2px 8px", borderRadius: 6,
                  fontSize: 11, fontWeight: 700, fontFamily: DRILL_MONO,
                  background: isGood ? "rgba(52,211,153,0.1)" : "rgba(249,115,22,0.1)",
                  color: isGood ? "#34d399" : "#F97316",
                }}>{diff > 0 ? "+" : ""}{fmt(diff)}</span>}
              </div>;
            })}
          </div>
        </Card>

        {/* Main content area with simulator side panel */}
        <div className="flex gap-4">
          {/* Left: Pyramid visualization */}
          <div className="flex-1 min-w-0">
            <Card title={`Level Distribution — ${dept?.name || ""}`}>
              {/* Centered horizontal bar pyramid */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {pyramidLevels.map(lv => {
                  const trackChar = lv.level.charAt(0);
                  const trackColor = DRILL_TRACK_COLORS[trackChar] || "#3B82F6";
                  const currentWidth = (lv.current / maxPyramidHC) * 100;
                  const scenarioWidth = (lv.scenario / maxPyramidHC) * 100;
                  const maxBarPct = 70; // max bar width percentage

                  return <div key={lv.level} style={{
                    display: "grid", gridTemplateColumns: "60px 1fr 120px 60px",
                    alignItems: "center", gap: 8, padding: "4px 0",
                    transition: "background 0.15s ease-out",
                  }}>
                    {/* Level badge */}
                    <div style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      padding: "3px 10px", borderRadius: 8,
                      background: `${trackColor}15`, color: trackColor,
                      fontSize: 12, fontWeight: 700, fontFamily: DRILL_MONO,
                      letterSpacing: "0.03em", width: "fit-content",
                    }}>
                      {lv.level}
                    </div>

                    {/* Centered bar */}
                    <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {/* Current state — faded background bar */}
                      <div style={{
                        position: "absolute", height: 24, borderRadius: 6,
                        width: `${(currentWidth / 100) * maxBarPct}%`,
                        background: `${trackColor}25`,
                        transition: "width 0.5s ease-out",
                      }} />
                      {/* Scenario state — solid bar overlaid */}
                      <div style={{
                        position: "absolute", height: 24, borderRadius: 6,
                        width: `${(scenarioWidth / 100) * maxBarPct}%`,
                        background: trackColor,
                        opacity: 0.8,
                        transition: "width 0.5s ease-out",
                      }} />
                      {/* HC count centered on bar */}
                      <span style={{
                        position: "relative", zIndex: 2,
                        fontSize: 12, fontWeight: 700, fontFamily: DRILL_MONO,
                        color: "rgba(255,255,255,0.9)",
                        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                      }}>
                        {lv.current}
                      </span>
                    </div>

                    {/* Cost info — muted mono */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, fontFamily: DRILL_MONO, fontWeight: 700, color: "#64748b" }}>
                        ${Math.round(lv.comp / 1000)}K avg
                      </div>
                      <div style={{ fontSize: 10, fontFamily: DRILL_MONO, fontWeight: 700, color: "#64748b" }}>
                        ${(lv.totalCost / 1e6).toFixed(1)}M total
                      </div>
                    </div>

                    {/* Delta */}
                    <div style={{ textAlign: "right" }}>
                      {lv.delta !== 0 ? (
                        <span style={{
                          fontSize: 12, fontWeight: 700, fontFamily: DRILL_MONO,
                          color: lv.delta < 0 ? "#34d399" : "#F97316",
                        }}>
                          {lv.delta > 0 ? "+" : ""}{lv.delta}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#64748b" }}>—</span>
                      )}
                    </div>
                  </div>;
                })}
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 16, height: 8, borderRadius: 3, background: "rgba(59,130,246,0.25)" }} />
                  <span style={{ fontSize: 11, color: "#64748b" }}>Current</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 16, height: 8, borderRadius: 3, background: "rgba(59,130,246,0.8)" }} />
                  <span style={{ fontSize: 11, color: "#64748b" }}>Scenario</span>
                </div>
              </div>
            </Card>

            {/* Cost Concentration section */}
            <Card title="Cost Concentration — Top 3 Levels">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {costConcentration.map((lv, idx) => {
                  const pct = totalDeptLevelCost > 0 ? (lv.totalCost / totalDeptLevelCost) * 100 : 0;
                  const trackColor = DRILL_TRACK_COLORS[lv.level.charAt(0)] || "#3B82F6";
                  return <div key={lv.level}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>#{idx + 1}</span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6,
                          background: `${trackColor}15`, color: trackColor,
                          fontSize: 12, fontWeight: 700, fontFamily: DRILL_MONO,
                        }}>{lv.level}</span>
                        <span style={{ fontSize: 12, color: "#a3b1c6" }}>{lv.current} heads</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: DRILL_MONO, color: "#e8ecf4" }}>
                          ${(lv.totalCost / 1e6).toFixed(1)}M
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: DRILL_MONO, color: trackColor }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
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
            </Card>
          </div>

          {/* Right: What-If Simulator side panel */}
          <div className="shrink-0 space-y-4" style={{ width: "clamp(260px, 22vw, 320px)" }}>
            {/* What-If Simulator */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5" style={{ boxShadow: "var(--shadow-1)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔬</span>
                <span className="text-[15px] font-bold text-[var(--text-primary)]">What-If Simulator</span>
              </div>
              <div className="text-[12px] text-[var(--text-muted)] mb-4">Drag the sliders to reshape {dept?.name || "this department"} and see the impact in real-time.</div>

              {/* Target Span slider */}
              <div className="mb-4">
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[var(--text-muted)] font-semibold">Target Span</span>
                  <span className="text-[var(--text-primary)] font-bold">{simTargetSpan}:1</span>
                </div>
                <input type="range" min={3} max={12} step={0.5} value={simTargetSpan} onChange={e => setSimTargetSpan(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, #3B82F6 ${((simTargetSpan - 3) / 9) * 100}%, rgba(59,130,246,0.15) ${((simTargetSpan - 3) / 9) * 100}%)` }} />
                <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-0.5"><span>3</span><span>12</span></div>
              </div>

              {/* Max Layers slider */}
              <div className="mb-4">
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[var(--text-muted)] font-semibold">Max Layers</span>
                  <span className="text-[var(--text-primary)] font-bold">{simMaxLayers}</span>
                </div>
                <input type="range" min={2} max={8} step={1} value={simMaxLayers} onChange={e => setSimMaxLayers(Number(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, #3B82F6 ${((simMaxLayers - 2) / 6) * 100}%, rgba(59,130,246,0.15) ${((simMaxLayers - 2) / 6) * 100}%)` }} />
                <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-0.5"><span>2</span><span>8</span></div>
              </div>

              {/* Simulated Impact box — colored values */}
              <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-3 space-y-2">
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#64748b", marginBottom: 4 }}>Simulated Impact</div>
                {[
                  { label: "Headcount Change", value: `${simDept.hcDelta >= 0 ? "+" : ""}${simDept.hcDelta}`, good: simDept.hcDelta <= 0 },
                  { label: "Cost Impact", value: `${simDept.costPct >= 0 ? "+" : ""}${simDept.costPct.toFixed(1)}%`, good: simDept.costPct <= 0 },
                  { label: "New Span", value: `${simDept.span}:1`, good: simDept.span >= 6 && simDept.span <= 8 },
                  { label: "Layer Delta", value: `${simDept.layerDelta > 0 ? "-" : simDept.layerDelta < 0 ? "+" : ""}${Math.abs(simDept.layerDelta)}`, good: simDept.layerDelta >= 0 },
                ].map(r => <div key={r.label} className="flex justify-between items-center text-[13px]">
                  <span className="text-[var(--text-muted)]">{r.label}</span>
                  <span style={{ fontWeight: 700, fontFamily: DRILL_MONO, color: r.good ? "#34d399" : "#F97316" }}>{r.value}</span>
                </div>)}
              </div>
            </div>

            {/* Shape Assessment — larger bars with counts */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5" style={{ boxShadow: "var(--shadow-1)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#64748b", marginBottom: 12 }}>Shape Assessment</div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-full text-[13px] font-bold" style={{ background: `${shapeAssessment.color}20`, color: shapeAssessment.color }}>{shapeAssessment.shape}</span>
              </div>
              {/* Larger shape visualization with counts */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Senior", pct: shapeAssessment.topPct, count: shapeAssessment.top },
                  { label: "Mid", pct: shapeAssessment.midPct, count: shapeAssessment.mid },
                  { label: "IC", pct: shapeAssessment.bottomPct, count: shapeAssessment.bottom },
                ].map(tier => <div key={tier.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#64748b", width: 40, textAlign: "right" }}>{tier.label}</span>
                  <div style={{ flex: 1, height: 16, borderRadius: 8, overflow: "hidden", background: `${shapeAssessment.color}12` }}>
                    <div style={{ height: "100%", borderRadius: 8, transition: "width 0.3s ease-out", width: `${Math.max(tier.pct * 100, 6)}%`, background: shapeAssessment.color }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: DRILL_MONO, color: "#e8ecf4", minWidth: 32, textAlign: "right" }}>{tier.count}</span>
                </div>)}
              </div>
              <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{shapeAssessment.desc}</div>
            </div>

            {/* vs. Industry Benchmark */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5" style={{ boxShadow: "var(--shadow-1)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#64748b", marginBottom: 12 }}>vs. Industry Benchmark</div>
              <div className="space-y-3">
                {[
                  { label: "Span of Control", current: dept?.avgSpan || 0, benchmark: "6-8:1", min: 6, max: 8 },
                  { label: "Layer Count", current: dept?.layers || 0, benchmark: "4-5", min: 4, max: 5 },
                  { label: "Manager Ratio", current: dept ? Math.round((dept.managers / Math.max(dept.headcount, 1)) * 100) : 0, benchmark: "10-12%", min: 10, max: 12 },
                ].map(row => <div key={row.label} className="flex items-center justify-between text-[13px]">
                  <div>
                    <div className="text-[var(--text-muted)] font-semibold">{row.label}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Benchmark: {row.benchmark}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold" style={{ color: benchColor(row.current, row.min, row.max) }}>{row.current}{row.label === "Manager Ratio" ? "%" : row.label === "Span of Control" ? ":1" : ""}</div>
                    <div className="text-[11px]" style={{ color: benchColor(row.current, row.min, row.max) }}>{row.current >= row.min && row.current <= row.max ? "✓ In range" : "⚠ Out of range"}</div>
                  </div>
                </div>)}
              </div>
            </div>
          </div>
        </div>
      </div>;
    })()}

    {/* Scenario Compare — all scenarios side by side */}
    {view === "compare" && <Card title="Multi-Scenario Comparison">
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Metric</th><th className="px-3 py-2 text-center text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Current</th>{scenarios.map((s, i) => <th key={s.id} className="px-3 py-2 text-center text-[15px] font-semibold border-b border-[var(--border)]" style={{ color: COLORS[i % COLORS.length] }}>{s.label}</th>)}</tr></thead>
      <tbody>{[{ label: "Headcount", key: "hc", inv: true }, { label: "Avg Span", key: "avgS" }, { label: "Avg Layers", key: "avgL", inv: true }, { label: "Managers", key: "mgr", inv: true }, { label: "Est. Cost ($M)", key: "cost", inv: true, fmtFn: (v: number) => `${fmtNum(v)}` }].map(m => {
        const cVal = cA[m.key as keyof typeof cA] as number;
        return <tr key={m.label} className="border-b border-[var(--border)]"><td className="px-3 py-2 text-[15px] font-semibold">{m.label}</td><td className="px-3 py-2 text-center text-[var(--text-secondary)]">{m.fmtFn ? m.fmtFn(cVal) : fmt(cVal)}</td>{scenarios.map((s, i) => { const a = odsAgg(s.departments); const v = a[m.key as keyof typeof a] as number; return <td key={s.id} className="px-3 py-2 text-center"><span className="font-bold" style={{ color: COLORS[i % COLORS.length] }}>{m.fmtFn ? m.fmtFn(v) : fmt(v)}</span> <DChip a={cVal} b={v} inv={m.inv} /></td>; })}</tr>;
      })}</tbody></table></div>
    </Card>}

    {/* Insights Engine — comprehensive */}
    {view === "insights" && (() => {
      const insights: { type: string; title: string; body: string; color: string; metric?: string }[] = [];
      const narrow = currentData.filter(d => d.avgSpan < 5);
      if (narrow.length > 0) insights.push({ type: "warning", title: "Over-Layered Functions", body: `${narrow.map(d => `${d.name} (${d.avgSpan}:1)`).join(", ")} — spans below 5:1 indicate excessive management overhead. Industry benchmark is 6-8:1 for knowledge workers. Consider removing one management layer in these functions.`, color: "var(--warning)", metric: `${narrow.length} dept${narrow.length > 1 ? "s" : ""}` });
      const wide = currentData.filter(d => d.avgSpan > 12);
      if (wide.length > 0) insights.push({ type: "alert", title: "Overextended Spans", body: `${wide.map(d => `${d.name} (${d.avgSpan}:1)`).join(", ")} — spans above 12:1 risk insufficient coaching and development. Managers lose ability to provide meaningful 1:1s above ~10 direct reports.`, color: "var(--risk)", metric: `${wide.length} dept${wide.length > 1 ? "s" : ""}` });
      const optimalSpan = currentData.filter(d => d.avgSpan >= 6 && d.avgSpan <= 10);
      if (optimalSpan.length > 0) insights.push({ type: "positive", title: "Healthy Span Functions", body: `${optimalSpan.map(d => d.name).join(", ")} — 6-10:1 span range is optimal. These functions have the right balance of oversight and autonomy.`, color: "var(--success)", metric: `${optimalSpan.length}/${currentData.length}` });
      const layerReductions = currentData.filter((d, i) => sc.departments[i]?.layers != null && sc.departments[i].layers < d.layers);
      if (layerReductions.length > 0) { const totalRemoved = layerReductions.reduce((s, d, i) => s + d.layers - (sc.departments[currentData.indexOf(d)]?.layers || d.layers), 0); insights.push({ type: "positive", title: `${totalRemoved} Layers Removed in ${sc.label}`, body: `De-layering ${layerReductions.map(d => d.name).join(", ")} compresses decision-making distance by ~${Math.round(totalRemoved / currentData.reduce((s, d) => s + d.layers, 0) * 100)}%. Expected impact: 20-30% faster decision cycles and reduced escalation burden.`, color: "var(--success)", metric: `${totalRemoved} layers` }); }
      // Manager ratio analysis
      const mgrRatio = cA.mgr / Math.max(cA.hc, 1) * 100;
      const fMgrRatio = fA.mgr / Math.max(fA.hc, 1) * 100;
      insights.push({ type: mgrRatio > 15 ? "warning" : "info", title: `Manager Ratio: ${fmt(mgrRatio, "pct")} → ${fmt(fMgrRatio, "pct")}`, body: `Current org has 1 manager per ${fmt(Math.round(cA.hc / Math.max(cA.mgr, 1)))} employees. ${mgrRatio > 15 ? "Above the 12-15% benchmark — indicates over-management." : mgrRatio < 8 ? "Below 8% — may indicate insufficient leadership coverage." : "Within healthy 8-15% range."} The ${sc.label} scenario ${fMgrRatio < mgrRatio ? "improves" : "maintains"} this to ${fmt(fMgrRatio, "pct")}.`, color: mgrRatio > 15 ? "var(--warning)" : "var(--accent-primary)", metric: `${fmt(mgrRatio, "pct")}` });
      // Cost insights
      if (fA.cost < cA.cost) { const savings = cA.cost - fA.cost; const pct = (savings / Math.max(cA.cost, 1) * 100); insights.push({ type: "positive", title: `${fmtNum(savings)} Annual Savings (${pct.toFixed(0)}%)`, body: `The ${sc.label} scenario achieves labor cost reduction through structural efficiency. At current compensation levels, removing ${cA.hc - fA.hc} positions saves ${fmtNum(savings)}/year. Break-even on restructuring costs (est. ${fmtNum((cA.hc - fA.hc) * 50000)} severance) within ${Math.ceil(((cA.hc - fA.hc) * 50000) / Math.max(savings, 1) * 12)} months.`, color: "var(--success)", metric: `${fmtNum(savings)}` }); }
      if (fA.cost > cA.cost) { const increase = fA.cost - cA.cost; insights.push({ type: "warning", title: `${fmtNum(increase)} Cost Increase`, body: `The ${sc.label} scenario adds ${fA.hc - cA.hc} headcount costing ${fmtNum(increase)}/year. Verify this represents strategic investment (new capabilities, growth functions) rather than structural bloat.`, color: "var(--warning)", metric: `+${fmtNum(increase)}` }); }
      // Largest department
      const largest = [...currentData].sort((a, b) => b.headcount - a.headcount)[0] || { name: "—", headcount: 0 };
      const smallest = [...currentData].sort((a, b) => a.headcount - b.headcount)[0] || { name: "—", headcount: 0 };
      insights.push({ type: "info", title: `Concentration Risk: ${largest.name}`, body: `${largest.name} holds ${Math.round(largest.headcount / Math.max(cA.hc, 1) * 100)}% of total headcount (${largest.headcount}/${cA.hc}). ${largest.headcount / Math.max(cA.hc, 1) > 0.3 ? "This concentration exceeds 30% — consider whether this function warrants sub-division to improve resilience." : "Concentration is within acceptable range."} Smallest function: ${smallest.name} (${smallest.headcount}, ${Math.round(smallest.headcount / Math.max(cA.hc, 1) * 100)}%).`, color: "var(--accent-primary)", metric: `${Math.round(largest.headcount / Math.max(cA.hc, 1) * 100)}%` });
      // IC to Manager ratio by department
      const worstIMRatio = [...currentData].sort((a, b) => (a.ics / Math.max(a.managers, 1)) - (b.ics / Math.max(b.managers, 1)))[0] || { name: "—", ics: 0, managers: 1 };
      const bestIMRatio = [...currentData].sort((a, b) => (b.ics / Math.max(b.managers, 1)) - (a.ics / Math.max(a.managers, 1)))[0] || { name: "—", ics: 0, managers: 1 };
      insights.push({ type: "info", title: "IC-to-Manager Disparity", body: `Widest gap: ${bestIMRatio.name} has ${(bestIMRatio.ics / Math.max(bestIMRatio.managers, 1)).toFixed(1)} ICs per manager vs ${worstIMRatio.name} at ${(worstIMRatio.ics / Math.max(worstIMRatio.managers, 1)).toFixed(1)}. Standardizing ratios could improve equity and reduce role confusion.`, color: "var(--accent-primary)" });
      // FTE ratio
      const avgFte = currentData.reduce((s, d) => s + d.fteRatio, 0) / currentData.length;
      const lowFte = currentData.filter(d => d.fteRatio < 0.8);
      if (lowFte.length > 0) insights.push({ type: "warning", title: `High Contractor Reliance`, body: `${lowFte.map(d => `${d.name} (${Math.round(d.fteRatio * 100)}% FTE)`).join(", ")} — FTE ratio below 80% indicates dependency on contingent workforce. Consider converting key contractor roles to FTE for knowledge retention.`, color: "var(--warning)", metric: `${Math.round(avgFte * 100)}% avg` });
      // Scenario-specific
      insights.push({ type: "info", title: `${sc.label} Scenario Summary`, body: `This scenario changes headcount from ${fmt(cA.hc)} → ${fmt(fA.hc)} (${fmt(fA.hc - cA.hc, "delta")}), adjusts average span from ${fmt(cA.avgS)} → ${fmt(fA.avgS)}, and shifts cost from ${fmtNum(cA.cost)} → ${fmtNum(fA.cost)}. The primary lever is ${fA.avgL < cA.avgL ? "layer compression" : fA.hc < cA.hc ? "headcount reduction" : "span optimization"}.`, color: "var(--accent-primary)" });

      if (!insights.length) insights.push({ type: "info", title: "No Major Flags", body: "Current scenario changes are within normal ranges.", color: "var(--accent-primary)" });

      // Add recommendation and headline to each insight for the slideshow
      const enrichedInsights = insights.map(ins => {
        let severity: string, severityIcon: string, severityColor: string;
        if (ins.type === "alert") { severity = "Critical"; severityIcon = "⚠"; severityColor = "var(--risk)"; }
        else if (ins.type === "warning") { severity = "Warning"; severityIcon = "◈"; severityColor = "var(--warning)"; }
        else if (ins.type === "positive") { severity = "On Track"; severityIcon = "✓"; severityColor = "var(--success)"; }
        else if (ins.title.includes("Summary")) { severity = "Summary"; severityIcon = "◎"; severityColor = "#6b7280"; }
        else { severity = "Insight"; severityIcon = "ℹ"; severityColor = "#3B82F6"; }

        // Extract a headline from the body (first sentence)
        const headline = ins.body.split(". ")[0] + ".";
        const bodyRest = ins.body.split(". ").slice(1).join(". ");

        // Generate recommendation based on type
        let recommendation = "";
        if (ins.title.includes("Over-Layered")) recommendation = "Consolidate one management layer in flagged functions. Target 6-8:1 span ratio through attrition or redeployment.";
        else if (ins.title.includes("Overextended")) recommendation = "Add team leads or split teams to bring spans below 10:1 for effective coaching and development.";
        else if (ins.title.includes("Healthy")) recommendation = "Preserve current structure. Use these functions as benchmarks for restructuring other departments.";
        else if (ins.title.includes("Layers Removed")) recommendation = "Implement de-layering through attrition cycles. Reassign decision rights to remaining layers.";
        else if (ins.title.includes("Manager Ratio")) recommendation = "Review manager-to-IC ratios across all departments. Standardize toward 1:8 target.";
        else if (ins.title.includes("Savings")) recommendation = "Phase savings realization over 12-18 months to minimize disruption. Reinvest 20% in upskilling.";
        else if (ins.title.includes("Cost Increase")) recommendation = "Validate that cost increases map to strategic capabilities. Tag each new role to a revenue or efficiency outcome.";
        else if (ins.title.includes("Concentration")) recommendation = "Assess single-point-of-failure risk. Consider functional splits if concentration exceeds 30%.";
        else if (ins.title.includes("IC-to-Manager")) recommendation = "Standardize IC-to-Manager ratios across comparable functions to improve equity and clarity.";
        else if (ins.title.includes("Contractor")) recommendation = "Convert critical contractor roles to FTE. Prioritize roles with institutional knowledge requirements.";
        else if (ins.title.includes("Summary")) recommendation = "Review all scenario parameters before stakeholder presentation. Validate key assumptions with department heads.";
        else recommendation = "Review and validate these findings with relevant department heads before taking action.";

        return { ...ins, severity, severityIcon, severityColor, headline, bodyRest, recommendation };
      });

      // Sort: positive first, then info, then warnings, then critical — builds narrative tension
      enrichedInsights.sort((a, b) => {
        const order: Record<string, number> = { positive: 0, info: 1, warning: 2, alert: 3 };
        return (order[a.type] ?? 1) - (order[b.type] ?? 1);
      });

      // Final action synthesis slide
      enrichedInsights.push({
        type: "info", title: "Your 3 Highest-Impact Actions",
        body: `1. ${enrichedInsights.find(i => i.type === "alert" || i.type === "warning")?.recommendation || "Address structural issues first"}. 2. ${enrichedInsights.find(i => i.title.includes("Savings") || i.title.includes("Cost"))?.recommendation || "Review cost optimization opportunities"}. 3. ${enrichedInsights.find(i => i.title.includes("Span") || i.title.includes("Ratio"))?.recommendation || "Standardize management ratios across functions"}.`,
        color: "#3B82F6", metric: "3", severity: "Action Plan", severityIcon: "\uD83C\uDFAF", severityColor: "#3B82F6",
        headline: "Based on all insights, these three actions have the highest estimated ROI.",
        bodyRest: "Prioritize in this order for maximum organizational impact.",
        recommendation: "Present these to the executive team with supporting data from each insight slide."
      });

      const currentInsight = enrichedInsights[insightSlide] || enrichedInsights[0];
      const totalSlides = enrichedInsights.length;
      const clampedSlide = Math.min(insightSlide, totalSlides - 1);

      // Visualization renderer for right column
      const renderViz = (ins: typeof currentInsight) => {
        if (ins.title.includes("Over-Layered") || ins.title.includes("Overextended") || ins.title.includes("Healthy")) {
          // Horizontal comparison bars (current vs benchmark range)
          const depts = ins.title.includes("Healthy") ? currentData.filter(d => d.avgSpan >= 6 && d.avgSpan <= 10).slice(0, 5) : ins.title.includes("Over-Layered") ? currentData.filter(d => d.avgSpan < 5).slice(0, 5) : currentData.filter(d => d.avgSpan > 12).slice(0, 5);
          return <div className="space-y-2 mt-4">{depts.map(d => <div key={d.name}>
            <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-0.5"><span>{d.name}</span><span>{d.avgSpan}:1</span></div>
            <div className="relative h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="absolute top-0 h-full rounded-full transition-all" style={{ width: `${Math.min((d.avgSpan / 15) * 100, 100)}%`, background: d.avgSpan >= 6 && d.avgSpan <= 8 ? "#34d399" : "#F97316" }} />
              {/* Benchmark range marker */}
              <div className="absolute top-0 h-full border-l-2 border-r-2 border-dashed" style={{ left: `${(6 / 15) * 100}%`, width: `${((8 - 6) / 15) * 100}%`, borderColor: "rgba(52,211,153,0.4)" }} />
            </div>
          </div>)}</div>;
        }
        if (ins.title.includes("Layers Removed")) {
          // Small bar chart showing layers removed per dept
          return <div className="space-y-1.5 mt-4">{currentData.filter((d, i) => sc.departments[i]?.layers < d.layers).slice(0, 6).map((d, i) => {
            const removed = d.layers - (sc.departments[currentData.indexOf(d)]?.layers || d.layers);
            return <div key={d.name} className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--text-muted)] w-16 text-right truncate">{d.name.split(" ")[0]}</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full" style={{ width: `${(removed / 3) * 100}%`, background: "#34d399" }} />
              </div>
              <span className="text-[10px] font-bold text-[var(--success)]">-{removed}</span>
            </div>;
          })}</div>;
        }
        if (ins.title.includes("Concentration")) {
          // Mini treemap showing dept headcount proportions
          return <div className="grid grid-cols-3 gap-1 mt-4">{[...currentData].sort((a, b) => b.headcount - a.headcount).slice(0, 6).map((d, i) => {
            const pct = Math.round(d.headcount / Math.max(cA.hc, 1) * 100);
            return <div key={d.name} className="rounded-lg p-2 text-center" style={{ background: `${COLORS[i % COLORS.length]}15` }}>
              <div className="text-[10px] text-[var(--text-muted)] truncate">{d.name.split(" ")[0]}</div>
              <div className="text-[13px] font-bold" style={{ color: COLORS[i % COLORS.length] }}>{pct}%</div>
            </div>;
          })}</div>;
        }
        if (ins.title.includes("IC-to-Manager")) {
          // Horizontal bar chart with department IC:Manager ratios
          return <div className="space-y-1.5 mt-4">{[...currentData].sort((a, b) => (b.ics / Math.max(b.managers, 1)) - (a.ics / Math.max(a.managers, 1))).slice(0, 6).map(d => {
            const ratio = d.ics / Math.max(d.managers, 1);
            const inRange = ratio >= 6 && ratio <= 8;
            return <div key={d.name} className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--text-muted)] w-14 text-right truncate">{d.name.split(" ")[0]}</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((ratio / 15) * 100, 100)}%`, background: inRange ? "#34d399" : "#F97316" }} />
              </div>
              <span className="text-[10px] font-bold" style={{ color: inRange ? "#34d399" : "#F97316" }}>{ratio.toFixed(1)}</span>
            </div>;
          })}</div>;
        }
        if (ins.title.includes("Contractor") || ins.title.includes("FTE")) {
          // Dot plot per department showing FTE % vs 80% threshold
          return <div className="space-y-2 mt-4">{currentData.filter(d => d.fteRatio < 0.95).slice(0, 6).map(d => {
            const pct = Math.round(d.fteRatio * 100);
            return <div key={d.name}>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-0.5"><span>{d.name.split(" ")[0]}</span><span>{pct}%</span></div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? "#34d399" : "#F97316" }} />
                {/* 80% threshold line */}
                <div className="absolute top-0 h-full w-0.5 bg-red-400/50" style={{ left: "80%" }} />
              </div>
            </div>;
          })}</div>;
        }
        if (ins.title.includes("Summary")) {
          // Three large "from → to" metrics
          return <div className="space-y-3 mt-4">
            {[
              { label: "Headcount", from: fmt(cA.hc), to: fmt(fA.hc) },
              { label: "Avg Span", from: fmt(cA.avgS), to: fmt(fA.avgS) },
              { label: "Est. Cost", from: fmtNum(cA.cost), to: fmtNum(fA.cost) },
            ].map(m => <div key={m.label} className="text-center">
              <div className="text-[10px] text-[var(--text-muted)] uppercase mb-0.5">{m.label}</div>
              <div className="text-[15px] font-bold">
                <span className="text-[var(--accent-primary)]">{m.from}</span>
                <span className="text-[var(--text-muted)] mx-1">→</span>
                <span className="text-[var(--success)]">{m.to}</span>
              </div>
            </div>)}
          </div>;
        }
        // Default: cost bar
        return <div className="mt-4 text-center text-[11px] text-[var(--text-muted)]">Structural analysis metric</div>;
      };

      return <div>
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">{totalSlides} insights generated from structural analysis of {currentData.length} departments, {fmt(cA.hc)} employees</div>

        {/* Navigation controls */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <button onClick={() => setInsightSlide(Math.max(0, clampedSlide - 1))} disabled={clampedSlide === 0} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-primary)] disabled:opacity-30 transition-all">←</button>
          <span className="text-[13px] text-[var(--text-muted)] font-semibold px-2">{clampedSlide + 1} / {totalSlides}</span>
          <button onClick={() => setInsightSlide(Math.min(totalSlides - 1, clampedSlide + 1))} disabled={clampedSlide === totalSlides - 1} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-primary)] disabled:opacity-30 transition-all">→</button>
        </div>

        {/* Slide */}
        <div className="flex justify-center">
          <div className="w-full max-w-[900px] min-h-[380px] rounded-2xl border border-[var(--border)] p-8 transition-all duration-500" style={{
            background: "linear-gradient(135deg, #131b2e 0%, #1a2340 50%, #131b2e 100%)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
          }}>
            {currentInsight && <div className="flex gap-8 h-full" key={clampedSlide}>
              {/* Left Column (55%) */}
              <div className="flex-[55] flex flex-col">
                {/* Severity badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold w-fit mb-4" style={{ background: `${currentInsight.severityColor}15`, color: currentInsight.severityColor }}>
                  {currentInsight.severityIcon} {currentInsight.severity}
                </span>
                {/* Title */}
                <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2 leading-tight">{currentInsight.title}</h2>
                {/* Headline */}
                <p className="text-[13px] text-[var(--text-secondary)] mb-3 leading-relaxed">{currentInsight.headline}</p>
                {/* Body */}
                <p className="text-[12px] text-[var(--text-muted)] mb-auto leading-relaxed">{currentInsight.bodyRest}</p>
                {/* Recommendation box */}
                <div className="mt-4 rounded-lg p-3 border-l-3" style={{ background: "rgba(59,130,246,0.06)", borderLeft: "3px solid #3B82F6" }}>
                  <div className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider mb-1">Recommendation</div>
                  <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{currentInsight.recommendation}</div>
                </div>
              </div>

              {/* Right Column (45%) */}
              <div className="flex-[45] flex flex-col items-center">
                {/* Large stat number */}
                {currentInsight.metric && <>
                  <div className="text-[52px] font-extrabold mt-4" style={{ color: currentInsight.severityColor }}>{currentInsight.metric}</div>
                  <div className="text-[12px] text-[var(--text-muted)] uppercase tracking-wider mb-2">{currentInsight.title.split(":")[0]}</div>
                </>}
                {/* Contextual visualization */}
                <div className="w-full px-2">
                  {renderViz(currentInsight)}
                </div>
              </div>
            </div>}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {enrichedInsights.map((_, i) => (
            <button key={i} onClick={() => setInsightSlide(i)} className="rounded-full transition-all duration-300" style={{
              width: i === clampedSlide ? 24 : 8,
              height: 8,
              background: i === clampedSlide ? "#3B82F6" : "rgba(255,255,255,0.15)",
            }} />
          ))}
        </div>
      </div>;
    })()}

    {view === "benchmarks" && <Card title="📖 Span & Layer Benchmarks by Industry">
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

    <NextStepBar currentModuleId="build" onNavigate={onBack} />
  </div>;
}
