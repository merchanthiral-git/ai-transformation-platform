"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
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

const ODS_DEPTS = ["Executive Office","Finance & Accounting","Human Resources","Marketing","Product Design","Supply Chain","IT & Digital","Sales & Commercial","Legal & Compliance","Operations"];
const ODS_LEVELS = ["E3","E2","E1","M5","M4","M3","M2","M1","P5","P4","P3","P2","P1","T4","T3","T2","T1","S2","S1"];
const ODS_AVG_COMP: Record<string, number> = { "E4": 500000, "E3": 420000, "E2": 310000, "E1": 235000, "M5": 200000, "M4": 175000, "M3": 145000, "M2": 125000, "M1": 105000, "P6": 220000, "P5": 180000, "P4": 150000, "P3": 120000, "P2": 95000, "P1": 75000, "T6": 250000, "T5": 200000, "T4": 170000, "T3": 140000, "T2": 115000, "T1": 90000, "S4": 75000, "S3": 65000, "S2": 55000, "S1": 48000 };
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

    {/* Scenario selector — dropdown to save space */}
    <div className="flex gap-3 mb-4 items-center">
      <span className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Scenario:</span>
      <select value={activeScenario} onChange={e => setActiveScenario(Number(e.target.value))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] min-w-[180px]">
        {scenarios.map((s, i) => <option key={s.id} value={i}>{s.label} — {odsAgg(s.departments).hc} HC, {fmtNum(odsAgg(s.departments).cost)}</option>)}
      </select>
      <button onClick={async () => {
        setAiOdsLoading(true);
        try {
          const context = currentData.map(d => `${d.name}: ${d.headcount}hd, span ${d.avgSpan}, ${d.layers} layers, ${d.managers} mgrs`).join("; ");
          const aiText1 = await callAI("Return ONLY a valid JSON array of strings.", `Analyze this org structure and give 4-5 specific restructuring recommendations. Current state: ${context}. Return ONLY a JSON array of strings.`);
          setAiOdsInsights(JSON.parse(aiText1.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()));
      } catch (e) { console.error("[DesignModule] AI ODS insights error", e); } setAiOdsLoading(false); }} disabled={aiOdsLoading} className="px-3 py-2 rounded-lg text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: aiOdsLoading ? 0.5 : 1 }}>{aiOdsLoading ? "Analyzing..." : "✨ AI Recommendations"}</button>
      <button onClick={() => { realDataBuilt.current = false; const c = odsGenDept(); setCurrentData(c); setScenarios([odsGenScenario(c, "Optimized", 0.5, 0), odsGenScenario(c, "Aggressive", 0.9, 1), odsGenScenario(c, "Conservative", 0.25, 2)]); }} className="px-3 py-2 rounded-lg text-[15px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-primary)]">↻ Reset</button>
    </div>

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

    {view === "soc" && <Card title="Span of Control Detail">
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">{["Department","HC (C)","HC (F)","Mgrs (C)","Mgrs (F)","ICs (C)","ICs (F)","SoC (C)","SoC (F)","Δ"].map(h => <th key={h} className="px-3 py-2 text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] text-center">{h}</th>)}</tr></thead>
      <tbody>{currentData.map((d, i) => { const f = sc.departments[i]; return <tr key={d.name} className="border-b border-[var(--border)] hover:bg-[var(--hover)]"><td className="px-3 py-2 text-[15px] font-semibold">{d.name}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.headcount}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.headcount}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.managers}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.managers}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.ics}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.ics}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.avgSpan}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.avgSpan}</td><td className="px-3 py-2 text-center"><DChip a={d.avgSpan} b={f?.avgSpan || 0} /></td></tr>; })}</tbody></table></div>
    </Card>}

    {view === "layers" && (() => {
      // Aggregate level distribution across current & future
      const [layerScope, setLayerScope] = React.useState("all");
      const srcCurrent = layerScope === "all" ? currentData : currentData.filter(d => d.name === layerScope);
      const srcFuture = layerScope === "all" ? (sc.departments || []) : (sc.departments || []).filter((d: ReturnType<typeof odsGenDept>[0]) => d.name === layerScope);
      const curLevels = ODS_LEVELS.map(l => ({ level: l, count: srcCurrent.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0) }));
      const futLevels = ODS_LEVELS.map(l => ({ level: l, count: srcFuture.reduce((s: number, d: ReturnType<typeof odsGenDept>[0]) => s + (d.levelDist?.[l] || 0), 0) }));
      const totalCur = curLevels.reduce((s, l) => s + l.count, 0);
      const totalFut = futLevels.reduce((s, l) => s + l.count, 0);
      const maxCount = Math.max(...curLevels.map(l => l.count), ...futLevels.map(l => l.count), 1);
      const layerColors = ["var(--teal)", "var(--accent-primary)", "var(--amber)", "var(--warning)", "#F0C060", "#F5DEB3"];
      const benchmarks: Record<string, number> = { "C-Suite": 0.5, SVP: 1.5, VP: 4, Director: 10, Manager: 18, IC: 66 };

      // Chain analysis
      const maxChain = Math.max(...currentData.map(d => d.layers), 0);
      const minChain = Math.min(...currentData.map(d => d.layers), 99);
      const avgChain = currentData.length > 0 ? (currentData.reduce((s, d) => s + d.layers, 0) / currentData.length).toFixed(1) : "0";
      const deepest = currentData.find(d => d.layers === maxChain);
      const shallowest = currentData.find(d => d.layers === minChain);

      // Shape analysis
      const topHeavyPct = curLevels.slice(0, 3).reduce((s, l) => s + l.count, 0) / Math.max(totalCur, 1) * 100;
      const shape = topHeavyPct > 20 ? "top-heavy" : topHeavyPct < 8 ? "bottom-heavy" : "balanced";

      return <div>
        {/* Scope selector */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Scope:</span>
          <select value={layerScope} onChange={e => setLayerScope(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none">
            <option value="all">Entire Organization</option>
            {currentData.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>

        {/* Unified Org Pyramid — mirrored bar chart */}
        <Card title="Layer Distribution — Current vs. Future">
          <div className="space-y-3">
            {ODS_LEVELS.map((level, li) => {
              const cur = curLevels[li].count;
              const fut = futLevels[li].count;
              const delta = fut - cur;
              const curPct = totalCur > 0 ? (cur / totalCur * 100).toFixed(1) : "0";
              const futPct = totalFut > 0 ? (fut / totalFut * 100).toFixed(1) : "0";
              const bPct = benchmarks[level] || 0;
              const actualPct = Number(curPct);
              const health = Math.abs(actualPct - bPct) < bPct * 0.5 ? "green" : Math.abs(actualPct - bPct) < bPct * 0.8 ? "amber" : "red";
              return <div key={level}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-20 text-right text-[15px] font-semibold text-[var(--text-secondary)] shrink-0">{level}</div>
                  <div className="flex-1 flex flex-col gap-1">
                    {/* Current bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-6 bg-[var(--surface-2)] rounded overflow-hidden"><div className="h-full rounded transition-all" style={{ width: `${Math.max((cur / maxCount) * 100, 1)}%`, background: `linear-gradient(90deg, ${layerColors[li]}dd, ${layerColors[li]}90)` }} /></div>
                      <span className="text-[15px] font-data text-[var(--text-muted)] w-16 text-right">{cur} ({curPct}%)</span>
                    </div>
                    {/* Future bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-5 bg-[var(--surface-2)] rounded overflow-hidden"><div className="h-full rounded transition-all" style={{ width: `${Math.max((fut / maxCount) * 100, 1)}%`, background: `linear-gradient(90deg, rgba(16,185,129,0.7), rgba(16,185,129,0.4))` }} /></div>
                      <span className="text-[15px] font-data w-16 text-right" style={{ color: delta < 0 ? "var(--success)" : delta > 0 ? "var(--risk)" : "var(--text-muted)" }}>{delta !== 0 ? `${delta > 0 ? "+" : ""}${delta}` : "—"}</span>
                    </div>
                  </div>
                  <div className="w-6 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full" style={{ background: health === "green" ? "var(--success)" : health === "amber" ? "var(--warning)" : "var(--risk)" }} /></div>
                </div>
              </div>;
            })}
            <div className="flex items-center gap-3 text-[14px] text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center gap-1"><div className="w-3 h-2 rounded" style={{ background: "var(--accent-primary)" }} /> Current</div>
              <div className="flex items-center gap-1"><div className="w-3 h-2 rounded" style={{ background: "rgba(16,185,129,0.6)" }} /> {sc.label}</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--success)]" /> Healthy</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--warning)]" /> Watch</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--risk)]" /> Issue</div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          {/* Reporting chain analysis */}
          <Card title="Reporting Chain Analysis">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center"><div className="text-[28px] font-extrabold text-[var(--risk)]">{maxChain}</div><div className="text-[15px] text-[var(--text-muted)]">Deepest Chain</div><div className="text-[14px] text-[var(--text-muted)]">{deepest?.name || "—"}</div></div>
              <div className="text-center"><div className="text-[28px] font-extrabold text-[var(--accent-primary)]">{avgChain}</div><div className="text-[15px] text-[var(--text-muted)]">Average Depth</div></div>
              <div className="text-center"><div className="text-[28px] font-extrabold text-[var(--success)]">{minChain < 99 ? minChain : 0}</div><div className="text-[15px] text-[var(--text-muted)]">Shallowest</div><div className="text-[14px] text-[var(--text-muted)]">{shallowest?.name || "—"}</div></div>
            </div>
            {/* Visual chains */}
            <div className="flex gap-6 justify-center">
              {[{ label: "Deepest", dept: deepest, count: maxChain, color: "var(--risk)" }, { label: "Shallowest", dept: shallowest, count: minChain < 99 ? minChain : 0, color: "var(--success)" }].map(ch => <div key={ch.label} className="flex flex-col items-center gap-1">
                <div className="text-[14px] font-bold uppercase tracking-wider mb-1" style={{ color: ch.color }}>{ch.label}</div>
                {Array.from({ length: ch.count }, (_, j) => <div key={j} className="w-12 h-4 rounded-md flex items-center justify-center text-[15px] font-bold" style={{ background: `${ch.color}15`, border: `1px solid ${ch.color}30`, color: ch.color }}>{ODS_LEVELS[Math.min(j, ODS_LEVELS.length - 1)]?.slice(0, 3)}</div>)}
              </div>)}
            </div>
          </Card>

          {/* Layer distribution shape */}
          <Card title="Distribution Shape Analysis">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[15px] font-bold" style={{ color: shape === "balanced" ? "var(--success)" : shape === "top-heavy" ? "var(--warning)" : "var(--accent-primary)" }}>Your org is {shape}</div>
              <Badge color={shape === "balanced" ? "green" : shape === "top-heavy" ? "amber" : "indigo"}>{topHeavyPct.toFixed(0)}% above Director</Badge>
            </div>
            <div className="flex items-end gap-1 h-24 mb-3">
              {curLevels.map((l, i) => <div key={l.level} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full rounded-t" style={{ height: `${Math.max((l.count / maxCount) * 100, 4)}%`, background: layerColors[i], opacity: 0.7, minHeight: 4 }} />
                <div className="text-[15px] text-[var(--text-muted)] mt-1">{l.level.slice(0, 3)}</div>
              </div>)}
            </div>
            <div className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
              {shape === "top-heavy" && "Consider de-layering senior levels to improve decision speed and reduce management overhead. Target: <15% of headcount above Director level."}
              {shape === "balanced" && "Healthy pyramid distribution. Senior layers are proportionate to the overall workforce. Continue monitoring as transformation progresses."}
              {shape === "bottom-heavy" && "Strong IC base with lean management. Ensure sufficient leadership coverage — may need to add management capacity in growing functions."}
            </div>
          </Card>
        </div>

        {/* Layer health table */}
        <Card title="Layer Health Indicators">
          <div className="overflow-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-[15px]">
              <thead><tr className="bg-[var(--surface-2)]">
                {["Layer", "Current HC", "% of Org", "Benchmark", "Gap", "Avg Tenure", "Health"].map(h => <th key={h} className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase text-[14px]">{h}</th>)}
              </tr></thead>
              <tbody>{curLevels.map((l, li) => {
                const pct = totalCur > 0 ? (l.count / totalCur * 100) : 0;
                const bPct = benchmarks[l.level] || 0;
                const gap = pct - bPct;
                const health = Math.abs(gap) < bPct * 0.5 ? "green" : Math.abs(gap) < bPct * 0.8 ? "amber" : "red";
                const tenure = Math.round(3 + li * 1.5 + Math.random() * 2);
                return <tr key={l.level} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
                  <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{l.level}</td>
                  <td className="px-3 py-2 font-data">{l.count.toLocaleString()}</td>
                  <td className="px-3 py-2 font-data">{pct.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-data text-[var(--text-muted)]">{bPct}%</td>
                  <td className="px-3 py-2 font-data" style={{ color: gap > 0 ? "var(--risk)" : gap < 0 ? "var(--success)" : "var(--text-muted)" }}>{gap > 0 ? "+" : ""}{gap.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-data text-[var(--text-muted)]">{tenure}yr</td>
                  <td className="px-3 py-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: health === "green" ? "var(--success)" : health === "amber" ? "var(--warning)" : "var(--risk)" }} /></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          {curLevels.some((l, li) => l.count === 0 && li > 0 && li < ODS_LEVELS.length - 1) && <div className="mt-3 p-3 rounded-lg bg-[var(--risk)]/5 border border-[var(--risk)]/15 text-[15px] text-[var(--risk)]">⚠ Gap detected: {curLevels.filter((l, li) => l.count === 0 && li > 0 && li < ODS_LEVELS.length - 1).map(l => l.level).join(", ")} has no employees — creates a career progression gap.</div>}
        </Card>
      </div>;
    })()}

    {view === "cost" && <div>
      {/* Cost methodology */}
      <Card title="Cost Model — Methodology">
        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <div className="text-[15px] font-bold text-[var(--text-primary)] mb-2">How Current Cost is Calculated</div>
            <div className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-3">Total labor cost is computed by multiplying headcount at each career level by the average fully-loaded compensation for that level. This includes base salary, benefits (est. 25%), and overhead allocation.</div>
            <div className="space-y-1.5">{ODS_LEVELS.map(l => { const n = currentData.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0); const comp = ODS_AVG_COMP[l] || 85000; return <div key={l} className="flex items-center justify-between text-[15px] p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[var(--text-secondary)]">{l}</span>
              <span className="text-[var(--text-muted)]">{n} × {fmtNum(comp)}</span>
              <span className="font-semibold text-[var(--accent-primary)]">{fmtNum((n * comp))}</span>
            </div>; })}</div>
            <div className="flex justify-between mt-2 p-2 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[15px] font-bold"><span className="text-[var(--accent-primary)]">Current Total</span><span className="text-[var(--accent-primary)]">{fmtNum(cA.cost)}</span></div>
          </div>
          <div>
            <div className="text-[15px] font-bold text-[var(--text-primary)] mb-2">How Future Cost is Derived ({sc.label})</div>
            <div className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-3">Future cost reflects scenario adjustments: layer removal reduces management headcount, span optimization redistributes ICs, and structural changes shift the level mix. Each change is applied per-department.</div>
            <div className="space-y-1.5">{ODS_LEVELS.map(l => { const n = sc.departments.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0); const cN = currentData.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0); const comp = ODS_AVG_COMP[l] || 85000; const delta = n - cN; return <div key={l} className="flex items-center justify-between text-[15px] p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[var(--text-secondary)]">{l}</span>
              <span className="text-[var(--text-muted)]">{n} × {fmtNum(comp)} {delta !== 0 && <span style={{ color: delta < 0 ? "var(--success)" : "var(--risk)", fontSize: 15 }}>({delta > 0 ? "+" : ""}{delta})</span>}</span>
              <span className="font-semibold text-[var(--success)]">{fmtNum((n * comp))}</span>
            </div>; })}</div>
            <div className="flex justify-between mt-2 p-2 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-[15px] font-bold"><span className="text-[var(--success)]">{sc.label} Total</span><span className="text-[var(--success)]">{fmtNum(fA.cost)}</span></div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <div className="text-center"><div className="text-[15px] text-[var(--text-muted)] uppercase">Net Change</div><div className="text-2xl font-extrabold" style={{ color: fA.cost < cA.cost ? "var(--success)" : "var(--risk)" }}>{fmtNum((fA.cost - cA.cost))}</div></div>
          <div className="text-center"><div className="text-[15px] text-[var(--text-muted)] uppercase">Percent Change</div><div className="text-2xl font-extrabold" style={{ color: fA.cost < cA.cost ? "var(--success)" : "var(--risk)" }}>{cA.cost > 0 ? fmt(((fA.cost - cA.cost) / cA.cost) * 100, "pct") : "0%"}</div></div>
          <div className="text-center"><div className="text-[15px] text-[var(--text-muted)] uppercase">HC Change</div><div className="text-2xl font-extrabold" style={{ color: fA.hc < cA.hc ? "var(--success)" : "var(--risk)" }}>{fmt(fA.hc - cA.hc, "delta")}</div></div>
          <div className="text-center"><div className="text-[15px] text-[var(--text-muted)] uppercase">Cost per Head</div><div className="text-lg font-extrabold text-[var(--text-primary)]">{fmt(cA.hc > 0 ? (cA.cost / cA.hc) : 0, "$")} → {fmt(fA.hc > 0 ? (fA.cost / fA.hc) : 0, "$")}</div></div>
        </div>
      </Card>
      <Card title="Cost by Department">
        {(() => { const cCosts = currentData.map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const fCosts = (sc.departments || []).map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const maxCost = Math.max(...cCosts, ...fCosts, 1); return <div className="space-y-3">{currentData.map((d, i) => { const delta = (fCosts[i] ?? 0) - (cCosts[i] ?? 0); return <div key={d.name} className="flex items-center gap-3"><div className="w-36 text-[15px] font-semibold text-[var(--text-secondary)] text-right shrink-0">{d.name}</div><div className="flex-1 space-y-1"><HBar value={cCosts[i] ?? 0} max={maxCost} color="var(--accent-primary)" /><HBar value={fCosts[i] ?? 0} max={maxCost} color="var(--success)" /></div><div className="w-24 text-right shrink-0"><div className="text-[15px] font-semibold text-[var(--text-primary)]">{fmtNum(cCosts[i] ?? 0)}</div><div className="text-[15px]" style={{ color: delta < 0 ? "var(--success)" : delta > 0 ? "var(--risk)" : "var(--text-muted)" }}>{delta < 0 ? "↓" : delta > 0 ? "↑" : "→"} ${Math.abs(delta / 1e3).toFixed(0)}K</div></div></div>; })}</div>; })()}
      </Card>
    </div>}

    {view === "roles" && <Card title="Role Migration & Gap Analysis">
      {(() => {
        const gaps = currentData.map((d, i) => {
          const f = sc.departments[i]; const nr = f?.newRoles || Math.floor(Math.random() * 3); const rr = f?.removedRoles || Math.floor(Math.random() * 4); const rs = f?.restructuredRoles || Math.floor(Math.random() * 5);
          return { name: d.name, currentHC: d.headcount, futureHC: f?.headcount || d.headcount, newRoles: nr, removedRoles: rr, restructuredRoles: rs, retained: Math.max(0, Math.min(d.headcount, f?.headcount || d.headcount) - rr) };
        });
        const tn = gaps.reduce((s, g) => s + g.newRoles, 0); const tr = gaps.reduce((s, g) => s + g.removedRoles, 0); const ts = gaps.reduce((s, g) => s + g.restructuredRoles, 0); const tRet = gaps.reduce((s, g) => s + g.retained, 0);
        const mostNew = [...gaps].sort((a, b) => b.newRoles - a.newRoles)[0] || { name: "—", newRoles: 0 };
        const mostElim = [...gaps].sort((a, b) => b.removedRoles - a.removedRoles)[0] || { name: "—", removedRoles: 0 };
        const totalHC = gaps.reduce((s, g) => s + g.currentHC, 0);
        return <div>
          <div className="grid grid-cols-4 gap-3 mb-5">{[{ label: "New Roles", val: tn, color: "var(--success)", desc: "Created by restructuring" }, { label: "Eliminated", val: tr, color: "var(--risk)", desc: "Removed or automated" }, { label: "Restructured", val: ts, color: "var(--warning)", desc: "Scope or level changed" }, { label: "Retained", val: tRet, color: "var(--accent-primary)", desc: "Unchanged in scope" }].map(k => <div key={k.label} className="bg-[var(--surface-2)] rounded-xl p-4 border-l-[3px] border border-[var(--border)]" style={{ borderLeftColor: k.color }}><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{k.label}</div><div className="text-2xl font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[15px] text-[var(--text-muted)] mt-1">{k.desc}</div></div>)}</div>

          {/* How these numbers were derived */}
          <div className="bg-gradient-to-r from-[rgba(212,134,10,0.06)] to-transparent border border-[rgba(212,134,10,0.12)] rounded-xl p-5 mb-4">
            <div className="text-[15px] font-bold text-[var(--accent-primary)] mb-2">📊 How Role Migration is Calculated</div>
            <div className="grid grid-cols-2 gap-4 text-[15px] text-[var(--text-secondary)] leading-relaxed">
              <div><strong className="text-[var(--text-primary)]">New roles</strong> emerge when a department grows headcount or the scenario adds specialized functions. {mostNew?.name} generates the most ({mostNew?.newRoles}) due to its headcount expansion from {mostNew?.currentHC} → {mostNew?.futureHC}.</div>
              <div><strong className="text-[var(--text-primary)]">Eliminated roles</strong> result from layer compression and span widening. When a {mostElim?.name} department loses a management layer, the displaced manager positions are removed ({mostElim?.removedRoles} roles).</div>
              <div><strong className="text-[var(--text-primary)]">Restructured roles</strong> keep the same headcount but change in scope — e.g., a "Data Entry Clerk" becoming an "AI Operations Analyst." The {sc.label} scenario restructures {ts} roles across {gaps.filter(g => g.restructuredRoles > 0).length} departments.</div>
              <div><strong className="text-[var(--text-primary)]">Retained roles</strong> ({Math.round(tRet / totalHC * 100)}% of current workforce) continue unchanged. Higher retention is lower-risk but may limit transformation speed.</div>
            </div>
          </div>

          {/* Migration flow bars — taller */}
          <div className="space-y-3">{gaps.map(g => { const total = g.retained + g.newRoles + g.removedRoles + g.restructuredRoles; return <div key={g.name} className="flex items-center gap-3"><div className="w-36 text-[15px] font-semibold text-[var(--text-secondary)] text-right shrink-0">{g.name}</div><div className="flex-1 flex h-7 rounded-lg overflow-hidden"><div className="flex items-center justify-center text-[14px] font-bold text-white" style={{ width: `${g.retained / total * 100}%`, background: "var(--accent-primary)", minWidth: g.retained > 0 ? 20 : 0 }}>{g.retained}</div><div className="flex items-center justify-center text-[14px] font-bold text-white" style={{ width: `${g.newRoles / total * 100}%`, background: "var(--success)", minWidth: g.newRoles > 0 ? 16 : 0 }}>{g.newRoles}</div><div className="flex items-center justify-center text-[14px] font-bold text-white" style={{ width: `${g.restructuredRoles / total * 100}%`, background: "var(--warning)", minWidth: g.restructuredRoles > 0 ? 16 : 0 }}>{g.restructuredRoles}</div><div className="flex items-center justify-center text-[14px] font-bold text-white" style={{ width: `${g.removedRoles / total * 100}%`, background: "var(--risk)", minWidth: g.removedRoles > 0 ? 16 : 0 }}>{g.removedRoles}</div></div><div className="w-16 text-[15px] text-[var(--text-muted)] text-right">{g.currentHC}→{g.futureHC}</div></div>; })}</div>
          <div className="flex gap-4 mt-3 justify-center text-[15px] text-[var(--text-muted)]">{[{ c: "var(--accent-primary)", l: "Retained" }, { c: "var(--success)", l: "New" }, { c: "var(--warning)", l: "Restructured" }, { c: "var(--risk)", l: "Eliminated" }].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: x.c }} />{x.l}</span>)}</div>
        </div>;
      })()}
    </Card>}

    {/* Dept Drill-Down — expanded */}
    {view === "drill" && <div>
        <Card title="Department Deep Dive">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Department:</span>
            <select value={selDept} onChange={e => setSelDept(Number(e.target.value))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] min-w-[200px]">
              {currentData.map((d, i) => <option key={d.name} value={i}>{d.name} — {d.headcount} HC</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <OdsKpi label="Headcount" current={currentData[selDept]?.headcount || 0} future={sc.departments[selDept]?.headcount || 0} inv /><OdsKpi label="Avg Span" current={currentData[selDept]?.avgSpan || 0} future={sc.departments[selDept]?.avgSpan || 0} /><OdsKpi label="Layers" current={currentData[selDept]?.layers || 0} future={sc.departments[selDept]?.layers || 0} inv /><OdsKpi label="Managers" current={currentData[selDept]?.managers || 0} future={sc.departments[selDept]?.managers || 0} inv /><OdsKpi label="FTE Ratio %" current={(currentData[selDept]?.fteRatio || 0) * 100} future={(sc.departments[selDept]?.fteRatio || currentData[selDept]?.fteRatio || 0) * 100} /><OdsKpi label="Est. Cost ($M)" current={Object.entries(currentData[selDept]?.levelDist || {}).reduce((s, [l, n]) => s + n * (ODS_AVG_COMP[l] || 85000), 0) / 1e6} future={Object.entries(sc.departments[selDept]?.levelDist || {}).reduce((s, [l, n]) => s + n * (ODS_AVG_COMP[l] || 85000), 0) / 1e6} inv />
          </div>
        </Card>
        <Card title={`Level Distribution — ${currentData[selDept]?.name || ""}`}>
          <div className="grid grid-cols-6 gap-3">{ODS_LEVELS.map(l => { const cN = currentData[selDept]?.levelDist?.[l] || 0; const fN = sc.departments[selDept]?.levelDist?.[l] || 0; const comp = ODS_AVG_COMP[l] || 85000; return <div key={l} className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-3">{l}</div>
            <div className="flex justify-between text-[16px] font-extrabold mb-1"><span className="text-[var(--accent-primary)]">{cN}</span><span className="text-[var(--text-muted)]">→</span><span className="text-[var(--success)]">{fN}</span></div>
            <DChip a={cN} b={fN} inv />
            <div className="mt-2 pt-2 border-t border-[var(--border)]"><div className="text-[14px] text-[var(--text-muted)]">Avg comp: {fmtNum(comp)}</div><div className="text-[14px] text-[var(--text-muted)]">Cost: {fmtNum((cN * comp))}</div></div>
          </div>; })}</div>
        </Card>
        <Card title={`${currentData[selDept]?.name || ""} — Workforce Composition`}>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">FTE vs Contractors</div><div className="flex gap-3 mb-2"><div><div className="text-xl font-extrabold text-[var(--accent-primary)]">{currentData[selDept]?.ftes || 0}</div><div className="text-[15px] text-[var(--text-muted)]">Full-Time</div></div><div><div className="text-xl font-extrabold text-[var(--warning)]">{currentData[selDept]?.contractors || 0}</div><div className="text-[15px] text-[var(--text-muted)]">Contractors</div></div></div><HBar value={currentData[selDept]?.ftes || 0} max={currentData[selDept]?.headcount || 1} color="var(--accent-primary)" /></div>
            <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">Manager to IC Ratio</div><div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">1 : {((currentData[selDept]?.ics || 0) / Math.max(currentData[selDept]?.managers || 1, 1)).toFixed(1)}</div><div className="text-[15px] text-[var(--text-muted)]">{currentData[selDept]?.managers || 0} managers overseeing {currentData[selDept]?.ics || 0} individual contributors</div></div>
            <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">Dept Share</div><div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">{cA.hc > 0 ? Math.round((currentData[selDept]?.headcount || 0) / cA.hc * 100) : 0}%</div><div className="text-[15px] text-[var(--text-muted)]">{currentData[selDept]?.headcount || 0} of {cA.hc} total headcount</div><HBar value={currentData[selDept]?.headcount || 0} max={cA.hc || 1} color="var(--purple)" /></div>
          </div>
        </Card>
      </div>}

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
      return <div>
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">{insights.length} insights generated from structural analysis of {currentData.length} departments, {fmt(cA.hc)} employees, comparing current state to {sc.label} scenario.</div>
        <div className="space-y-3">{insights.map((ins, i) => <div key={i} className="rounded-xl p-5 border" style={{ background: `${ins.color}08`, borderColor: `${ins.color}20`, borderLeftWidth: 4, borderLeftColor: ins.color }}>
          <div className="flex items-center justify-between mb-1"><div className="text-[14px] font-bold" style={{ color: ins.color }}>{ins.title}</div>{ins.metric && <span className="px-2 py-0.5 rounded-full text-[15px] font-bold" style={{ background: `${ins.color}15`, color: ins.color }}>{ins.metric}</span>}</div>
          <div className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{ins.body}</div>
        </div>)}</div>
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
