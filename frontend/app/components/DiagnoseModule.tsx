"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import {
  KpiCard,
  Card,
  Empty,
  Badge,
  InsightPanel,
  DataTable,
  BarViz,
  DonutViz,
  RadarViz,
  TT,
  TabBar,
  PageHeader,
  LoadingBar,
  ModuleExportButton,
  NextStepBar,
  ContextStrip,
  useApiData,
  usePersisted,
  showToast,
  logDec,
  callAI,
  SKILLS_TAXONOMY,
  COLORS,
  AiInsightCard,
  fmtNum,
  ExpandableChart,
  type ViewContext,
  type JobDesignState,
} from "./shared";
import { SkeletonKpiRow, SkeletonTable, SkeletonChart } from "./ui-primitives";


/* ═══════════════════════════════════════════════════════════════
   MODULE: AI OPPORTUNITY SCAN
   ═══════════════════════════════════════════════════════════════ */
export function AiOpportunityScan({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [sub, setSub] = useState("ai");
  const [data, loading] = useApiData(() => { if (sub === "ai") return api.getAIPriority(model, f); if (sub === "skills") return api.getSkillAnalysis(model, f); if (sub === "org") return api.getOrgDiagnostics(model, f); return api.getDataQuality(model); }, [sub, model, f.func, f.jf, f.sf, f.cl]);

  const scanTitle = viewCtx?.mode === "employee" ? "AI Impact on My Role" : viewCtx?.mode === "job" ? `AI Impact — ${viewCtx.job}` : "AI Opportunity Scan";
  const scanSubtitle = viewCtx?.mode === "employee" ? `How AI will change ${viewCtx?.employee}'s tasks` : viewCtx?.mode === "job" ? `Tasks and AI scores for ${viewCtx.job}` : `Find where AI creates the most value${loading ? " · Loading..." : ""}`;
  return <div>
    <ContextStrip items={[viewCtx?.mode === "employee" ? "Showing AI impact on tasks in your role." : viewCtx?.mode === "job" ? `Filtered to ${viewCtx?.job} tasks only.` : "Phase 1: Discover — Find where AI creates the most value. This unlocks Phase 2: Design."]} />
    <PageHeader icon={viewCtx?.mode === "employee" ? "👤" : "🔬"} title={scanTitle} subtitle={scanSubtitle} onBack={onBack} moduleId="scan" />
    <TabBar tabs={[{ id: "ai", label: "AI Prioritization" }, { id: "skills", label: "Skill Gaps" }, { id: "org", label: "Org Diagnostics" }, { id: "dq", label: "Data Quality" }]} active={sub} onChange={setSub} />

    {loading && !data && <div className="space-y-4 mt-4"><SkeletonKpiRow count={4} /><SkeletonChart height={200} /><SkeletonTable rows={5} cols={4} /></div>}

    {sub === "ai" && (() => { const s = (data?.summary ?? {}) as Record<string, unknown>; const top10 = (data?.top10 ?? []) as Record<string, unknown>[]; const quickWins = top10.filter(t => String(t["AI Impact"] || t.ai_impact || "").toLowerCase() === "high" && (Number(t["Current Time Spent %"] || t.time_pct || 0) >= 10) && String(t["Logic"] || t.logic || "").toLowerCase() === "deterministic"); return <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Tasks Scored" value={s.tasks_scored as number ?? 0} /><KpiCard label="Quick Wins" value={quickWins.length || (s.quick_wins as number ?? 0)} accent /><KpiCard label="Time Impact" value={`${s.total_time_impact ?? 0}h/wk`} /><KpiCard label="Avg Risk" value={s.avg_risk as number ?? 0} /></div>
      {/* Quick Wins Panel */}
      {quickWins.length > 0 && <div className="bg-gradient-to-r from-[rgba(16,185,129,0.06)] to-transparent border border-[rgba(16,185,129,0.15)] rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3"><span className="text-lg">⚡</span><span className="text-[14px] font-bold text-[var(--success)]">Quick Wins — Automate Now</span><Badge color="green">{quickWins.length} tasks</Badge></div>
        <div className="text-[15px] text-[var(--text-secondary)] mb-3">These tasks are High AI Impact + Deterministic logic + ≥10% of work time. They can be automated with minimal risk and maximum ROI.</div>
        <div className="space-y-2">{quickWins.slice(0, 6).map((t, i) => {
          const taskName = String(t["Task Name"] || t.task || "");
          const timePct = Number(t["Current Time Spent %"] || t.time_pct || 0);
          const role = String(t["Job Title"] || t.role || "");
          const pSkill = String(t["Primary Skill"] || t.primary_skill || "");
          return <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="w-7 h-7 rounded-full bg-[var(--success)]/10 flex items-center justify-center text-[15px] font-bold text-[var(--success)]">{i + 1}</div>
            <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{taskName}</div><div className="text-[15px] text-[var(--text-muted)]">{role} · {pSkill}</div></div>
            <div className="text-right shrink-0"><div className="text-[14px] font-extrabold text-[var(--success)]">{timePct}%</div><div className="text-[14px] text-[var(--text-muted)]">of work time</div></div>
            <Badge color="green">Automate</Badge>
          </div>;
        })}</div>
        <div className="mt-3 pt-2 border-t border-[var(--border)] text-[15px] text-[var(--text-muted)]">Total automatable time: {quickWins.reduce((sum, t) => sum + Number(t["Current Time Spent %"] || t.time_pct || 0), 0)}% of combined role time → est. {Math.round(quickWins.reduce((sum, t) => sum + Number(t["Current Time Spent %"] || t.time_pct || 0), 0) * 0.6 * 40 / 100)} hrs/week freed</div>
      </div>}
      <div className="grid grid-cols-12 gap-4"><div className="col-span-7"><Card title="Top AI Priority Tasks"><DataTable data={top10} /></Card></div><div className="col-span-5"><Card title="Impact by Workstream"><BarViz data={((data?.workstream_impact ?? []) as Record<string, unknown>[])} labelKey="Workstream" valueKey="Time Impact" color="var(--accent-scenario)" /></Card></div></div></div>; })()}
    {sub === "skills" && <div className="grid grid-cols-2 gap-4"><Card title="Current Skills"><BarViz data={((data?.current ?? []) as Record<string, unknown>[])} labelKey="Skill" valueKey="Weight" color="var(--success)" /></Card><Card title="Skill Gap"><DataTable data={((data?.gap ?? []) as Record<string, unknown>[])} cols={["Skill", "Current", "Future", "Delta"]} /></Card></div>}
    {sub === "org" && (() => { if (data && (data as Record<string, unknown>).empty) return <Empty text="Upload org or workforce data" icon="🏢" />; const k = (data?.kpis ?? {}) as Record<string, unknown>; return <div><div className="grid grid-cols-6 gap-3 mb-5"><KpiCard label="Headcount" value={k.total as number ?? 0} /><KpiCard label="Managers" value={k.managers as number ?? 0} /><KpiCard label="ICs" value={k.ics as number ?? 0} /><KpiCard label="Avg Span" value={k.avg_span as number ?? 0} accent /><KpiCard label="Max Span" value={k.max_span as number ?? 0} /><KpiCard label="Layers" value={k.layers as number ?? 0} /></div><div className="grid grid-cols-2 gap-4"><Card title="Span of Control"><BarViz data={((data?.span_top15 ?? []) as Record<string, unknown>[])} labelKey="Label" valueKey="Direct Reports" color="var(--warning)" /></Card><Card title="Layer Distribution"><BarViz data={((data?.layer_distribution ?? []) as Record<string, unknown>[])} labelKey="name" valueKey="value" /></Card></div></div>; })()}
    {sub === "dq" && (() => { const s = (data?.summary ?? {}) as Record<string, unknown>; return <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Ready" value={`${s.ready ?? 0}/7`} accent /><KpiCard label="Missing" value={s.missing as number ?? 0} /><KpiCard label="Issues" value={s.total_issues as number ?? 0} /><KpiCard label="Completeness" value={`${s.avg_completeness ?? 0}%`} /></div><div className="grid grid-cols-2 gap-4"><Card title="Readiness"><DataTable data={((data?.readiness ?? []) as Record<string, unknown>[])} cols={["Dataset", "Status", "Rows", "Issues", "Completeness"]} /></Card><Card title="Upload Log"><DataTable data={((data?.upload_log ?? []) as Record<string, unknown>[])} /></Card></div></div>; })()}
    <AiInsightCard title="✨ AI Diagnosis Summary" contextData={JSON.stringify({ summary: (data as Record<string,unknown>)?.summary, sub }).slice(0, 2000)} systemPrompt="You are an organizational diagnostics consultant. Provide 3 key findings and recommended focus areas. Use specific numbers. No markdown." />
    <NextStepBar currentModuleId="scan" onNavigate={onNavigate || onBack} />
  </div>;
}



/* ═══════════════════════════════════════════════════════════════
   MODULE: SKILLS & TALENT — Inventory, Gap Analysis, Adjacency
   Full spec: editable grid, dedup, dispositions, WDL connection,
   role/individual toggle, adjacency with shortlisting
   ═══════════════════════════════════════════════════════════════ */
export function SkillsTalent({ model, f, onBack, onNavigate, viewCtx, jobStates }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext; jobStates?: Record<string, JobDesignState> }) {
  const [tab, setTab] = useState("inventory");
  const [invData, setInvData] = useState<Record<string, unknown> | null>(null);
  const [gapData, setGapData] = useState<Record<string, unknown> | null>(null);
  const [adjData, setAdjData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [editedScores, setEditedScores] = usePersisted<Record<string, number>>(`${model}_skillEdits`, {});
  const [confirmed, setConfirmed] = usePersisted<boolean>(`${model}_skillsConfirmed`, false);
  const [adjThreshold, setAdjThreshold] = useState(50);
  const [gapView, setGapView] = useState<"skill" | "individual">("skill");
  const [gapDispositions, setGapDispositions] = usePersisted<Record<string, string>>(`${model}_gapDispositions`, {});
  const [shortlisted, setShortlisted] = usePersisted<Record<string, string[]>>(`${model}_shortlisted`, {});
  const [showDedup, setShowDedup] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [empPage, setEmpPage] = useState(0);
  const EMP_PAGE_SIZE = 50;
  const [maturityScores, setMaturityScores] = useState<Record<string, number>>({});
  const [selectedCareerRole, setSelectedCareerRole] = useState("");

  useEffect(() => {
    if (!model) return;
    setLoading(true);
    Promise.all([
      api.getSkillsInventory(model, { func: f.func, jf: f.jf }),
      api.getSkillsGap(model),
      api.getSkillsAdjacency(model),
    ]).then(([inv, gap, adj]) => {
      setInvData(inv); setGapData(gap); setAdjData(adj); setLoading(false);
    }).catch(() => setLoading(false));
  }, [model, f.func, f.jf]);

  const inv = invData as Record<string, unknown> | null;
  const records = (inv?.records || []) as { employee: string; skill: string; proficiency: number }[];
  const skills = (inv?.skills || []) as string[];
  const employees = (inv?.employees || []) as string[];
  const clusters = (inv?.clusters || {}) as Record<string, string[]>;
  const coverage = Number(inv?.coverage || 0);
  const isSample = Boolean(inv?.sample);
  const validationErrors = (inv?.validation_errors || []) as string[];
  const dedupSuggestions = (inv?.dedup_suggestions || []) as { skill_a: string; skill_b: string; similarity: number }[];

  const gap = gapData as Record<string, unknown> | null;
  const gaps = (gap?.gaps || []) as { skill: string; current_avg: number; target: number; target_source: string; delta: number; employees_assessed: number; severity: string; employee_gaps: { employee: string; current: number; target: number; delta: number; reskillable: boolean }[] }[];
  const gapSummary = (gap?.summary || {}) as Record<string, unknown>;

  const adj = adjData as Record<string, unknown> | null;
  const adjacencies = (adj?.adjacencies || []) as { target_role: string; required_skills: Record<string, number>; top_candidates: { employee: string; adjacency_pct: number; matching_skills: string[]; gap_skills: string[]; reskill_months: number }[]; strong_matches: number; reskillable: number; weak_matches: number; wdl_derived: boolean }[];
  const adjSummary = (adj?.summary || {}) as Record<string, unknown>;

  const getProf = (emp: string, skill: string) => {
    const key = `${emp}__${skill}`;
    if (editedScores[key] !== undefined) return editedScores[key];
    const rec = records.find(r => r.employee === emp && r.skill === skill);
    return rec ? rec.proficiency : 0;
  };
  const profColor = (p: number) => p === 0 ? "transparent" : p === 1 ? "#EF4444" : p === 2 ? "#F59E0B" : p === 3 ? "#10B981" : "#065F46";
  const profLabel = (p: number) => p === 1 ? "Novice" : p === 2 ? "Developing" : p === 3 ? "Proficient" : p === 4 ? "Expert" : "Not assessed";
  const dispColors: Record<string, string> = { "Close Internally": "var(--success)", "Hire Externally": "var(--accent-primary)", "Accept Risk": "var(--warning)", "Automate": "var(--purple)" };
  const dispOptions = ["Close Internally", "Hire Externally", "Accept Risk", "Automate"];

  const filteredSkills = skillFilter ? skills.filter(s => s.toLowerCase().includes(skillFilter.toLowerCase())) : skills;

  return <div>
    <PageHeader icon="🧠" title="Skills & Talent" subtitle="Inventory, gap analysis, and adjacency mapping" onBack={onBack} moduleId="skills" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="skills_inventory" label="Skills Data" /></div>}
    {loading && <><LoadingBar /><div className="mt-4 space-y-4"><SkeletonKpiRow count={5} /><SkeletonTable rows={6} cols={5} /></div></>}
    {!loading && employees.length === 0 && validationErrors.length === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🧠</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">No Skills Data Yet</h3><p className="text-[15px] text-[var(--text-secondary)]">Upload workforce data to see skills inventory, or select Demo_Model.</p></div>}

    {/* Validation errors */}
    {validationErrors.map((err, i) => <div key={i} className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-2 text-[15px] text-[var(--warning)]">⚠ {err}</div>)}
    {Boolean(gapSummary.wdl_connected) && <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-2 text-[15px] text-[var(--success)]">✓ Connected to Work Design Lab — gap targets derived from your task reconstruction</div>}

    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Employees" value={employees.length} accent /><KpiCard label="Skills Tracked" value={skills.length} /><KpiCard label="Coverage" value={`${coverage}%`} accent /><KpiCard label="Critical Gaps" value={Number(gapSummary.critical_gaps || 0)} /><KpiCard label="Fillable" value={`${Number(adjSummary.fillable_internally || 0)}/${Number(adjSummary.target_roles || 0)}`} />
    </div>

    <TabBar tabs={[
      { id: "inventory", label: "Skills Inventory" },
      { id: "gap", label: `Gap Analysis${!confirmed ? " 🔒" : ""}` },
      { id: "adjacency", label: `Adjacency Map${!confirmed ? " 🔒" : ""}` },
      { id: "supply", label: "Supply & Demand" },
      { id: "careers", label: "Career Paths" },
      { id: "maturity", label: "Maturity" },
      { id: "taxonomy", label: "📖 Taxonomy" },
    ]} active={tab} onChange={setTab} />

    {/* ═══ TAB 1: SKILLS INVENTORY ═══ */}
    {tab === "inventory" && <div>
      <Card title="Proficiency Grid">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input value={skillFilter} onChange={e => setSkillFilter(e.target.value)} placeholder="Filter skills..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none w-40 placeholder:text-[var(--text-muted)]" />
            {dedupSuggestions.length > 0 && <button onClick={() => setShowDedup(!showDedup)} className="text-[15px] text-[var(--warning)] font-semibold">⚠ {dedupSuggestions.length} potential duplicates</button>}
            <button aria-label="Bulk fill proficiency level" onClick={() => { const lv = prompt("Bulk-assign proficiency (1-4) to all empty cells:"); if (lv && [1,2,3,4].includes(Number(lv))) { const ne: Record<string,number> = {}; employees.forEach(e => { filteredSkills.forEach(s => { if (getProf(e,s)===0) ne[`${e}__${s}`]=Number(lv); }); }); setEditedScores(prev => ({...prev,...ne})); showToast(`Assigned ${Object.keys(ne).length} empty cells to level ${lv}`); } }} className="text-[15px] text-[var(--accent-primary)] font-semibold hover:underline cursor-pointer">Bulk-fill empties</button>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(editedScores).length > 0 && <span className="text-[15px] text-[var(--success)]">✎ {Object.keys(editedScores).length} edits</span>}
            {!confirmed ? <button onClick={() => { setConfirmed(true); showToast("✓ Skills inventory confirmed — Gap Analysis unlocked"); logDec("Skills", "Inventory Confirmed", `${employees.length} employees × ${skills.length} skills confirmed`); }} className="px-4 py-1.5 rounded-lg text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>✓ Confirm Inventory</button> : <Badge color="green">✓ Confirmed</Badge>}
          </div>
        </div>

        {/* Dedup suggestions */}
        {showDedup && dedupSuggestions.length > 0 && <div className="bg-[rgba(245,158,11,0.06)] border border-[var(--warning)]/20 rounded-lg p-3 mb-3"><div className="text-[15px] font-bold text-[var(--warning)] mb-2">Potential Duplicate Skills — Consider merging:</div>{dedupSuggestions.map((d, i) => <div key={i} className="flex items-center gap-2 text-[15px] py-1"><span className="text-[var(--text-primary)]">"{d.skill_a}"</span><span className="text-[var(--text-muted)]">↔</span><span className="text-[var(--text-primary)]">"{d.skill_b}"</span><Badge color="amber">{d.similarity}% similar</Badge></div>)}</div>}

        {/* Proficiency grid */}
        <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 480 }}>
          <table className="w-full text-[15px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0 z-10">
            <th className="px-2 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-20 min-w-[130px]">Employee</th>
            {filteredSkills.slice(0, 15).map(s => <th key={s} className="px-0.5 py-1 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)] min-w-[55px]"><div style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", height: 75, fontSize: 14 }}>{s}</div></th>)}
          </tr></thead>
          <tbody>{employees.slice(empPage * EMP_PAGE_SIZE, (empPage + 1) * EMP_PAGE_SIZE).map(emp => <tr key={emp} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
            <td className="px-2 py-1 font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--surface-1)] z-10 border-r border-[var(--border)] truncate" style={{ maxWidth: 130 }}>{emp}</td>
            {filteredSkills.slice(0, 15).map(s => { const p = getProf(emp, s); const key = `${emp}__${s}`; const edited = editedScores[key] !== undefined; return <td key={s} className="px-0.5 py-0.5 text-center"><button title={`${s}: ${profLabel(p)} (${p}/4)\nClick to change`} onClick={() => setEditedScores(prev => ({ ...prev, [key]: p >= 4 ? 0 : p + 1 }))} className="w-6 h-6 rounded text-[14px] font-bold transition-all" style={{ background: p ? `${profColor(p)}20` : "var(--surface-2)", color: p ? profColor(p) : "var(--text-muted)", border: `1px solid ${edited ? "var(--accent-primary)" : (p ? profColor(p) + "30" : "var(--border)")}`, outline: edited ? "1px solid var(--accent-primary)" : "none" }}>{p || "·"}</button></td>; })}
          </tr>)}</tbody></table>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-3 text-[14px] text-[var(--text-muted)]">{["1=Novice","2=Developing","3=Proficient","4=Expert","·=No data"].map(l => <span key={l}>{l}</span>)}</div>
          {employees.length > EMP_PAGE_SIZE && <div className="flex items-center gap-2">
          <button onClick={() => setEmpPage(p => Math.max(0, p-1))} disabled={empPage === 0} className="px-2 py-1 rounded text-[15px] bg-[var(--surface-2)] border border-[var(--border)] disabled:opacity-30">← Prev</button>
          <span className="text-[15px] text-[var(--text-muted)]">{empPage * EMP_PAGE_SIZE + 1}-{Math.min((empPage+1) * EMP_PAGE_SIZE, employees.length)} of {employees.length}</span>
          <button onClick={() => setEmpPage(p => p+1)} disabled={(empPage+1) * EMP_PAGE_SIZE >= employees.length} className="px-2 py-1 rounded text-[15px] bg-[var(--surface-2)] border border-[var(--border)] disabled:opacity-30">Next →</button>
        </div>}
        </div>
      </Card>

      {/* Skill clusters */}
      {Object.keys(clusters).length > 0 && <Card title="Skill Clusters — Average Proficiency">
        <div className="grid grid-cols-3 gap-4">{Object.entries(clusters).map(([cluster, clusterSkills]) => {
          const avg = clusterSkills.reduce((sum, s) => { const recs = records.filter(r => r.skill === s); return sum + (recs.length ? recs.reduce((a, r) => a + r.proficiency, 0) / recs.length : 0); }, 0) / Math.max(clusterSkills.length, 1);
          return <div key={cluster} className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3"><span className="text-[15px] font-bold text-[var(--text-primary)]">{cluster}</span><span className="text-[18px] font-extrabold" style={{ color: avg >= 3 ? "var(--success)" : avg >= 2 ? "var(--warning)" : "var(--risk)" }}>{avg.toFixed(1)}</span></div>
            <div className="space-y-1.5">{clusterSkills.map(s => { const recs = records.filter(r => r.skill === s); const sAvg = recs.length ? recs.reduce((a, r) => a + r.proficiency, 0) / recs.length : 0; const assessed = recs.length; return <div key={s} className="flex items-center justify-between text-[15px]"><span className="text-[var(--text-secondary)] truncate flex-1 mr-2">{s}</span><div className="flex items-center gap-1.5"><span className="text-[14px] text-[var(--text-muted)]">{assessed}emp</span><div className="w-14 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(sAvg / 4) * 100}%`, background: sAvg >= 3 ? "var(--success)" : sAvg >= 2 ? "var(--warning)" : "var(--risk)" }} /></div><span className="text-[14px] w-5 text-right font-semibold" style={{ color: sAvg >= 3 ? "var(--success)" : sAvg >= 2 ? "var(--warning)" : "var(--risk)" }}>{sAvg.toFixed(1)}</span></div></div>; })}</div>
          </div>;
        })}</div>
      </Card>}

      <InsightPanel title="Inventory Insights" items={[
        `${coverage}% of your workforce has skills data${coverage < 80 ? " — gap analysis will be incomplete for unassessed employees" : ""}`,
        clusters.Technical ? `Highest cluster: ${Object.entries(clusters).sort((a,b) => b[1].length - a[1].length)[0]?.[0] || "—"} (${Object.entries(clusters).sort((a,b) => b[1].length - a[1].length)[0]?.[1]?.length || 0} skills)` : "Upload skills data for cluster analysis",
        Object.keys(editedScores).length > 0 ? `You've made ${Object.keys(editedScores).length} manual edits to proficiency scores` : "Click cells to edit proficiency ratings",
      ]} icon="🧠" />
    </div>}

    {/* ═══ TAB 2: GAP ANALYSIS ═══ */}
    {tab === "gap" && <div>
      {!confirmed ? <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🔒</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Confirm Skills Inventory First</h3><p className="text-[15px] text-[var(--text-secondary)] mb-4">Go to the Inventory tab and click "Confirm Inventory" to unlock Gap Analysis.</p><button onClick={() => { setTab("inventory"); }} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]">← Go to Inventory</button></div> : <>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Skills" value={Number(gapSummary.total_skills || 0)} /><KpiCard label="Critical Gaps" value={Number(gapSummary.critical_gaps || 0)} accent /><KpiCard label="Avg Gap" value={String(Number(gapSummary.avg_gap || 0).toFixed(1))} /><KpiCard label="Largest Gap" value={String(gapSummary.largest_gap_skill || "—")} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">{(["skill", "individual"] as const).map(v => <button key={v} onClick={() => setGapView(v)} className="px-3 py-1 rounded-lg text-[15px] font-semibold" style={{ background: gapView === v ? "var(--accent-primary)" : "var(--surface-2)", color: gapView === v ? "#fff" : "var(--text-muted)" }}>{v === "skill" ? "By Skill" : "By Employee"}</button>)}</div>
        <div className="text-[15px] text-[var(--text-muted)]">Set disposition per gap: what action to take</div>
      </div>

      {gapView === "skill" ? <>{model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="skills_gap" label="Gap Analysis" /></div>}
      <Card title="Gap Heatmap — Current vs Target Proficiency">
        <div className="space-y-2">{gaps.map(g => <div key={g.skill} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
          <span className="text-[15px] font-semibold w-40 shrink-0 text-[var(--text-primary)]">{g.skill}</span>
          <div className="flex-1">
            <div className="h-4 bg-[var(--bg)] rounded-full overflow-hidden relative">
              <div className="h-full rounded-full absolute left-0" style={{ width: `${(g.current_avg / 4) * 100}%`, background: g.severity === "Critical" ? "var(--risk)" : g.severity === "Moderate" ? "var(--warning)" : "var(--success)", opacity: 0.6 }} />
              <div style={{ position: "absolute", left: `${(g.target / 4) * 100}%`, top: 0, bottom: 0, width: 2, background: "var(--text-primary)" }} />
            </div>
            <div className="flex justify-between text-[14px] mt-0.5"><span className="text-[var(--text-muted)]">Current: {g.current_avg}</span><span className="text-[14px]" style={{ color: "var(--text-muted)" }}>Target: {g.target} ({g.target_source})</span></div>
          </div>
          <div className="text-center shrink-0 w-14"><div className="text-[15px] font-extrabold" style={{ color: g.severity === "Critical" ? "var(--risk)" : g.severity === "Moderate" ? "var(--warning)" : "var(--success)" }}>-{g.delta}</div><div className="text-[15px]" style={{ color: g.severity === "Critical" ? "var(--risk)" : g.severity === "Moderate" ? "var(--warning)" : "var(--success)" }}>{g.severity}</div></div>
          <select value={gapDispositions[g.skill] || ""} onChange={e => setGapDispositions(prev => ({ ...prev, [g.skill]: e.target.value }))} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-2 py-1 text-[15px] text-[var(--text-primary)] outline-none w-32 shrink-0">
            <option value="">Disposition...</option>{dispOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>)}</div>
      </Card></> : <Card title="Individual Employee Gaps">
        {gaps.filter(g => g.severity !== "Low").slice(0, 5).map(g => <div key={g.skill} className="mb-4">
          <div className="flex items-center gap-2 mb-2"><span className="text-[15px] font-bold text-[var(--text-primary)]">{g.skill}</span><Badge color={g.severity === "Critical" ? "red" : "amber"}>{g.severity}</Badge><span className="text-[15px] text-[var(--text-muted)]">Target: {g.target}</span></div>
          <div className="grid grid-cols-5 gap-1">{g.employee_gaps.slice(0, 10).map(eg => <div key={eg.employee} className="bg-[var(--surface-2)] rounded-lg p-2 text-center border border-[var(--border)]">
            <div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{eg.employee}</div>
            <div className="text-[14px] font-extrabold mt-0.5" style={{ color: eg.delta > 1.5 ? "var(--risk)" : eg.delta > 0.5 ? "var(--warning)" : "var(--success)" }}>{eg.current}→{eg.target}</div>
            <div className="text-[15px]" style={{ color: eg.reskillable ? "var(--success)" : "var(--risk)" }}>{eg.reskillable ? "Reskillable" : "Hire needed"}</div>
          </div>)}</div>
        </div>)}
      </Card>}

      {/* Disposition summary */}
      {Object.keys(gapDispositions).length > 0 && <Card title="Gap Disposition Summary">
        <div className="grid grid-cols-4 gap-3">{dispOptions.map(d => { const count = Object.values(gapDispositions).filter(v => v === d).length; return <div key={d} className="bg-[var(--surface-2)] rounded-xl p-3 text-center border border-[var(--border)]"><div className="text-[20px] font-extrabold" style={{ color: dispColors[d] }}>{count}</div><div className="text-[15px] text-[var(--text-muted)]">{d}</div></div>; })}</div>
      </Card>}
      </>}
    </div>}

    {/* ═══ TAB 3: ADJACENCY MAP ═══ */}
    {tab === "adjacency" && <div>
      {!confirmed ? <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🔒</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Confirm Skills Inventory First</h3><p className="text-[15px] text-[var(--text-secondary)]">Complete the inventory to unlock adjacency mapping.</p></div> : <>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Target Roles" value={Number(adjSummary.target_roles || 0)} /><KpiCard label="Fillable" value={Number(adjSummary.fillable_internally || 0)} accent /><KpiCard label="Need External" value={Number(adjSummary.need_external || 0)} /><KpiCard label="Best Match" value={`${Number(adjSummary.avg_best_adjacency || 0)}%`} />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[15px] text-[var(--text-secondary)]">Threshold:</span>
        <input type="range" min={30} max={90} step={5} value={adjThreshold} onChange={e => setAdjThreshold(Number(e.target.value))} className="w-36" style={{ accentColor: "#D97706" }} />
        <span className="text-[15px] font-bold" style={{ color: adjThreshold >= 70 ? "var(--success)" : adjThreshold >= 50 ? "var(--warning)" : "var(--risk)" }}>{adjThreshold}%</span>
        <div className="flex gap-2 text-[14px]"><Badge color="green">≥70% Strong</Badge><Badge color="amber">50-69% Reskillable</Badge><Badge color="gray">&lt;50% Stretch</Badge></div>
        {Boolean(adjSummary.wdl_connected) && <Badge color="green">WDL Connected</Badge>}
      </div>

      {adjacencies.map(a => <Card key={a.target_role} title={a.target_role}>
        <div className="flex items-center gap-2 mb-3">
          <Badge color="green">{a.strong_matches} strong</Badge><Badge color="amber">{a.reskillable} reskillable</Badge><Badge color="gray">{a.weak_matches} weak</Badge>
          {a.wdl_derived && <span className="text-[14px] text-[var(--success)]">Skills from Work Design Lab</span>}
        </div>
        <div className="grid grid-cols-4 gap-2">{(a.top_candidates || []).filter(c => c.adjacency_pct >= adjThreshold).map(c => { const isShortlisted = (shortlisted[a.target_role] || []).includes(c.employee); return <div key={c.employee} className="bg-[var(--surface-2)] rounded-xl p-3 border transition-all" style={{ borderColor: isShortlisted ? "var(--success)" : "var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[15px] font-semibold text-[var(--text-primary)] truncate flex-1 mr-1">{c.employee}</span>
            <span className="text-[14px] font-extrabold shrink-0" style={{ color: c.adjacency_pct >= 70 ? "var(--success)" : c.adjacency_pct >= 50 ? "var(--warning)" : "var(--risk)" }}>{c.adjacency_pct}%</span>
          </div>
          <div className="text-[14px] text-[var(--success)] mb-0.5 truncate">✓ {c.matching_skills.slice(0, 3).join(", ")}</div>
          {c.gap_skills.length > 0 && <div className="text-[14px] text-[var(--risk)] mb-1 truncate">✗ {c.gap_skills.slice(0, 3).join(", ")}</div>}
          {c.reskill_months > 0 && <div className="text-[15px] text-[var(--text-muted)]">~{c.reskill_months}mo reskilling</div>}
          <button onClick={() => setShortlisted(prev => { const list = prev[a.target_role] || []; return { ...prev, [a.target_role]: isShortlisted ? list.filter(e => e !== c.employee) : [...list, c.employee] }; })} className="mt-1 text-[14px] font-semibold w-full py-1 rounded text-center" style={{ background: isShortlisted ? "rgba(16,185,129,0.1)" : "var(--surface-1)", color: isShortlisted ? "var(--success)" : "var(--text-muted)", border: `1px solid ${isShortlisted ? "var(--success)" : "var(--border)"}` }}>{isShortlisted ? "★ Shortlisted" : "☆ Shortlist"}</button>
        </div>; })}</div>
        {(a.top_candidates || []).filter(c => c.adjacency_pct >= adjThreshold).length === 0 && <div className="text-[15px] text-[var(--text-muted)] py-4 text-center">No candidates above {adjThreshold}% — lower threshold or plan external hire</div>}
      </Card>)}

      {/* Shortlist summary */}
      {Object.values(shortlisted).some(l => l.length > 0) && <Card title="Shortlisted Candidates">
        {Object.entries(shortlisted).filter(([, l]) => l.length > 0).map(([role, list]) => <div key={role} className="mb-2"><span className="text-[15px] font-bold text-[var(--text-primary)]">{role}:</span> <span className="text-[15px] text-[var(--text-secondary)]">{list.join(", ")}</span></div>)}
      </Card>}
      </>}
    </div>}

    {/* ═══ TAB: SKILLS SUPPLY & DEMAND ═══ */}
    {tab === "supply" && <div>
      {skills.length === 0 ? <Card title="Skills Supply vs. Demand"><Empty text="Complete Skills Inventory to see supply & demand analysis" icon="📊" /></Card> : (() => {
        // Compute supply/demand as percentages with deterministic demand
        const supplyDemand = skills.slice(0, 20).map(skill => {
          const totalWithSkill = records.filter(r => r.skill === skill).length;
          const proficient = records.filter(r => r.skill === skill && r.proficiency >= 3).length;
          const supplyPct = employees.length > 0 ? Math.round((proficient / employees.length) * 100) : 0;
          // Demand: estimate from gap data or derive from skill type
          const gap = gaps.find(g => g.skill === skill);
          const sl = skill.toLowerCase();
          // AI/tech skills have high demand, traditional skills lower demand
          const isAiSkill = ["ai", "ml", "automation", "cloud", "python", "data science", "machine learning", "digital"].some(kw => sl.includes(kw));
          const isHumanSkill = ["leadership", "communication", "critical thinking", "stakeholder", "coaching", "mentoring"].some(kw => sl.includes(kw));
          const isTraditionalSkill = ["regulatory", "compliance", "accounting", "financial modeling", "manual", "filing"].some(kw => sl.includes(kw));
          const demandPct = gap ? Math.round(Math.min(gap.target / 5, 1) * 100) : isAiSkill ? Math.min(supplyPct + 35 + Math.round(sl.length % 10), 80) : isHumanSkill ? Math.min(supplyPct + 15 + Math.round(sl.length % 8), 75) : isTraditionalSkill ? Math.max(supplyPct - 10, 15) : Math.min(supplyPct + 10, 65);
          const gapPct = demandPct - supplyPct;
          const status = gapPct > 30 ? "critical" : gapPct > 15 ? "shortage" : gapPct > 5 ? "moderate" : gapPct > -5 ? "adequate" : "surplus";
          return { skill, supplyPct, demandPct, gapPct, status, supplyCount: proficient, demandCount: Math.round(employees.length * demandPct / 100) };
        }).sort((a, b) => b.gapPct - a.gapPct);

        const statusColors: Record<string, string> = { critical: "var(--risk)", shortage: "var(--warning)", moderate: "var(--accent-primary)", adequate: "var(--success)", surplus: "#0EA5E9" };
        const statusLabels: Record<string, string> = { critical: "CRITICAL", shortage: "SHORTAGE", moderate: "MODERATE", adequate: "ADEQUATE", surplus: "SURPLUS" };
        const criticals = supplyDemand.filter(s => s.status === "critical");
        const shortages = supplyDemand.filter(s => s.status === "shortage");

        return <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3">
            <KpiCard label="Skills Tracked" value={supplyDemand.length} />
            <KpiCard label="Critical Shortages" value={criticals.length} accent />
            <KpiCard label="Shortages" value={shortages.length} />
            <KpiCard label="Adequate/Surplus" value={supplyDemand.filter(s => s.status === "adequate" || s.status === "surplus").length} />
            <KpiCard label="Biggest Gap" value={supplyDemand[0] ? `${supplyDemand[0].gapPct}%` : "—"} />
          </div>

          {/* Butterfly chart */}
          <Card title="Supply vs. Demand — Butterfly Chart">
            <div className="text-[14px] text-[var(--text-secondary)] mb-4">Supply (teal, left) = employees with proficiency ≥3. Demand (amber, right) = required proficiency for the future state. Sorted by gap severity.</div>
            <div className="space-y-2">
              {supplyDemand.map(sd => <div key={sd.skill} className="flex items-center gap-2 py-2">
                {/* Supply bar (goes LEFT from center) */}
                <div className="w-16 text-right text-[13px] font-data font-bold" style={{ color: "#0891B2" }}>{sd.supplyPct}%</div>
                <div className="w-24 flex justify-end"><div className="h-5 rounded-l-lg" style={{ width: `${Math.max(sd.supplyPct, 2)}%`, minWidth: 4, background: "#0891B2" }} /></div>
                {/* Center: skill name */}
                <div className="w-36 text-center shrink-0"><span className="text-[14px] font-semibold text-[var(--text-primary)] truncate block">{sd.skill}</span></div>
                {/* Demand bar (goes RIGHT from center) */}
                <div className="w-24"><div className="h-5 rounded-r-lg" style={{ width: `${Math.max(sd.demandPct, 2)}%`, minWidth: 4, background: "var(--accent-primary)" }} /></div>
                <div className="w-16 text-[13px] font-data font-bold" style={{ color: "var(--accent-primary)" }}>{sd.demandPct}%</div>
                {/* Gap badge */}
                <div className="w-24 text-right"><span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${statusColors[sd.status]}12`, color: statusColors[sd.status] }}>{sd.gapPct > 0 ? `-${sd.gapPct}%` : `+${Math.abs(sd.gapPct)}%`} {statusLabels[sd.status]}</span></div>
              </div>)}
            </div>
            <div className="flex justify-between mt-3 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#0891B2" }} /> Supply (have the skill)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "var(--accent-primary)" }} /> Demand (need the skill)</span>
            </div>
          </Card>

          {/* Action panel */}
          {(criticals.length > 0 || shortages.length > 0) && <Card title="📋 Recommended Talent Strategy">
            <div className="space-y-3">
              {criticals.map((sd, i) => <div key={sd.skill} className="rounded-xl p-4 border-l-3" style={{ borderLeft: "3px solid var(--risk)", background: "rgba(239,68,68,0.04)" }}>
                <div className="flex items-center gap-2 mb-1"><span className="text-[14px] font-bold text-[var(--risk)]">Priority {i + 1} (URGENT)</span><Badge color="red">{sd.gapPct}% gap</Badge></div>
                <div className="text-[15px] text-[var(--text-primary)] font-semibold mb-1">Launch {sd.skill} upskilling for {sd.demandCount - sd.supplyCount} employees</div>
                <div className="text-[14px] text-[var(--text-muted)] mb-2">Current: {sd.supplyPct}% ({sd.supplyCount} people) → Need: {sd.demandPct}% ({sd.demandCount} people)</div>
                <div className="flex gap-2">{onNavigate && <button onClick={() => onNavigate("reskill")} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "var(--risk)" }}>Create Reskilling Pathway</button>}</div>
              </div>)}
              {shortages.slice(0, 3).map((sd, i) => <div key={sd.skill} className="rounded-xl p-4 border-l-3" style={{ borderLeft: "3px solid var(--warning)", background: "rgba(245,158,11,0.04)" }}>
                <div className="flex items-center gap-2 mb-1"><span className="text-[14px] font-bold text-[var(--warning)]">Priority {criticals.length + i + 1}</span><Badge color="amber">{sd.gapPct}% gap</Badge></div>
                <div className="text-[15px] text-[var(--text-primary)] font-semibold">{sd.skill}: strengthen through development programs</div>
                <div className="text-[14px] text-[var(--text-muted)]">{sd.demandCount - sd.supplyCount} employees need this skill</div>
              </div>)}
            </div>
          </Card>}
        </div>;
      })()}
    </div>}

    {/* ═══ TAB: CAREER PATHS ═══ */}
    {tab === "careers" && (() => {
      const selectedRole = selectedCareerRole || (adjacencies[0]?.target_role || "");
      const setSelectedRole = setSelectedCareerRole;
      const selectedAdj = adjacencies.find(a => a.target_role === selectedRole);
      const moveTypes = [
        { type: "⬆️", label: "Promotion", color: "var(--success)", desc: "Move up a level" },
        { type: "➡️", label: "Lateral", color: "#0EA5E9", desc: "Same level, different function" },
        { type: "↗️", label: "Cross-track", color: "var(--purple)", desc: "IC to Manager or vice versa" },
        { type: "🔄", label: "Pivot", color: "var(--warning)", desc: "New domain entirely" },
      ];

      return <div className="space-y-5">
        <Card title="Career Explorer">
          {adjacencies.length === 0 ? <div className="text-center py-12"><div className="text-[40px] mb-3 opacity-40">🧭</div><div className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Complete Gap Analysis First</div><div className="text-[14px] text-[var(--text-muted)] mb-4">Career Explorer needs skills adjacency data. Confirm the Skills Inventory, then run Gap Analysis.</div>{onNavigate && <button onClick={() => setTab("inventory")} className="px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Skills Inventory</button>}</div> : <>
            {/* Role selector */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[14px] text-[var(--text-muted)]">Explore career moves from:</span>
              <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2 text-[15px] text-[var(--text-primary)] outline-none font-semibold flex-1 max-w-md">
                {adjacencies.map(a => <option key={a.target_role} value={a.target_role}>{a.target_role}</option>)}
              </select>
            </div>

            {/* Career map — center node + connected moves */}
            {selectedAdj && <div>
              {/* Center node */}
              <div className="flex justify-center mb-6">
                <div className="rounded-2xl px-8 py-5 text-center" style={{ background: "rgba(212,134,10,0.1)", border: "2px solid var(--accent-primary)", boxShadow: "0 0 20px rgba(212,134,10,0.15)" }}>
                  <div className="text-[20px] font-extrabold text-[var(--accent-primary)] font-heading">{selectedAdj.target_role}</div>
                  <div className="flex gap-3 justify-center mt-2">
                    <Badge color="green">{selectedAdj.strong_matches || 0} strong</Badge>
                    <Badge color="amber">{selectedAdj.reskillable || 0} reskillable</Badge>
                  </div>
                </div>
              </div>

              {/* Connected roles — career move cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                {(selectedAdj.top_candidates || []).slice(0, 9).map((c, ci) => {
                  const moveType = c.adjacency_pct >= 80 ? moveTypes[0] : c.adjacency_pct >= 60 ? moveTypes[1] : c.adjacency_pct >= 40 ? moveTypes[2] : moveTypes[3];
                  const lineColor = c.adjacency_pct >= 70 ? "var(--success)" : c.adjacency_pct >= 50 ? "var(--warning)" : "var(--risk)";
                  return <div key={c.employee || ci} className="rounded-xl border bg-[var(--surface-1)] p-4 transition-all hover:border-[var(--accent-primary)]/30" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-1)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[16px]">{moveType.type}</span>
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{c.employee}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      {/* Skill match ring */}
                      <div className="relative w-12 h-12 shrink-0">
                        <svg width="48" height="48" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="var(--surface-2)" strokeWidth="4" />
                          <circle cx="24" cy="24" r="20" fill="none" stroke={lineColor} strokeWidth="4" strokeDasharray={`${c.adjacency_pct * 1.26} 126`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold font-data" style={{ color: lineColor }}>{c.adjacency_pct}%</div>
                      </div>
                      <div>
                        <div className="text-[13px] text-[var(--text-muted)]">{moveType.label}</div>
                        <div className="text-[14px] font-semibold text-[var(--text-secondary)]">{c.reskill_months || 6}mo to qualify</div>
                      </div>
                    </div>
                    {/* Skills */}
                    <div className="flex flex-wrap gap-1">
                      {(c.matching_skills || []).slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 rounded text-[11px] bg-[rgba(16,185,129,0.1)] text-[var(--success)]">{s}</span>)}
                      {(c.gap_skills || []).slice(0, 2).map(s => <span key={s} className="px-1.5 py-0.5 rounded text-[11px] bg-[rgba(239,68,68,0.1)] text-[var(--risk)]">+{s}</span>)}
                    </div>
                  </div>;
                })}
              </div>

              {/* No candidates message */}
              {(selectedAdj.top_candidates || []).length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">No career path candidates found for this role. Check skills data.</div>}
            </div>}

            {/* Move type legend */}
            <div className="flex gap-4 text-[13px] text-[var(--text-muted)]">
              {moveTypes.map(mt => <span key={mt.label} className="flex items-center gap-1"><span>{mt.type}</span> {mt.label} — {mt.desc}</span>)}
            </div>
          </>}
        </Card>

        {/* Career insights */}
        {adjacencies.length > 0 && <Card title="Career Insights">
          <div className="space-y-2">
            {adjacencies.slice(0, 3).map(a => {
              const topCandidate = (a.top_candidates || [])[0];
              if (!topCandidate) return null;
              return <div key={a.target_role} className="rounded-lg p-3 bg-[var(--surface-2)] border border-[var(--border)]">
                <div className="text-[14px] text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">{a.target_role}</strong>: {a.strong_matches || 0} employees have a strong skill match ({topCandidate.adjacency_pct}%+). {(topCandidate.gap_skills || []).length > 0 ? `Key gap: ${(topCandidate.gap_skills || []).slice(0, 2).join(", ")}.` : "No skill gaps — ready to move."}</div>
              </div>;
            })}
          </div>
        </Card>}
      </div>;
    })()}

    {/* ═══ TAB: SKILLS MATURITY ASSESSMENT ═══ */}
    {tab === "maturity" && (() => {
      const dims = [
        { id: "language", label: "Skills Language", desc: "Shared taxonomy across the org", icon: "📖" },
        { id: "data", label: "Skills Data", desc: "Skills mapped to people and jobs", icon: "📊" },
        { id: "processes", label: "Skills in Talent Processes", desc: "Hiring, development, succession are skills-based", icon: "⚙️" },
        { id: "technology", label: "Skills Technology", desc: "HR systems support skills tracking", icon: "💻" },
        { id: "culture", label: "Skills Culture", desc: "Employees own their skill development", icon: "🌱" },
        { id: "governance", label: "Skills Governance", desc: "Owner and update process established", icon: "🛡️" },
      ];
      const scores = maturityScores; const setScores = setMaturityScores;
      const avg = Object.values(scores).length > 0 ? Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length : 0;
      const level = avg >= 4 ? "Advanced" : avg >= 3 ? "Proficient" : avg >= 2 ? "Emerging" : avg >= 1 ? "Foundational" : "Not Assessed";
      const levelColor = avg >= 4 ? "var(--success)" : avg >= 3 ? "var(--accent-primary)" : avg >= 2 ? "var(--warning)" : "var(--risk)";

      return <div>
        <Card title="Skills Maturity Assessment">
          <p className="text-[15px] text-[var(--text-secondary)] mb-6">Rate your organization across six dimensions of skills maturity. This diagnostic shows how skills-powered your organization currently is and where to invest.</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {dims.map(d => <div key={d.id} className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{d.icon}</span>
                <div><div className="text-[15px] font-bold text-[var(--text-primary)]">{d.label}</div><div className="text-[14px] text-[var(--text-muted)]">{d.desc}</div></div>
              </div>
              <div className="flex gap-1 mt-2">{[1,2,3,4,5].map(v => <button key={v} onClick={() => setScores(p => ({ ...p, [d.id]: p[d.id] === v ? 0 : v }))} className="flex-1 py-2 rounded-lg text-[14px] font-bold transition-all" style={{ background: (scores[d.id] || 0) >= v ? "var(--accent-primary)" : "var(--surface-1)", color: (scores[d.id] || 0) >= v ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>{v}</button>)}</div>
            </div>)}
          </div>
          {Object.values(scores).length > 0 && <div className="text-center p-6 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div className="text-[48px] font-extrabold" style={{ color: levelColor }}>{avg.toFixed(1)}<span className="text-[18px] font-normal text-[var(--text-muted)]">/5</span></div>
            <div className="text-[18px] font-bold mt-1" style={{ color: levelColor }}>{level}</div>
            <p className="text-[15px] text-[var(--text-secondary)] mt-3 max-w-lg mx-auto">
              {avg < 2 && "Your organization is at the foundational stage. Start by establishing a shared skills taxonomy and mapping skills to your top 20 roles."}
              {avg >= 2 && avg < 3 && "Your organization is emerging. You have some skills data but it's not yet integrated into talent processes. Focus on connecting skills to hiring and development."}
              {avg >= 3 && avg < 4 && "Your organization is proficient. Skills data is available and partially used. Invest in technology to scale skills-based decision making."}
              {avg >= 4 && "Your organization is advanced. Skills are a core part of your talent strategy. Focus on governance and continuous improvement."}
            </p>
          </div>}
        </Card>
      </div>;
    })()}

    {/* ═══ TAB 4: SKILLS TAXONOMY DICTIONARY ═══ */}
    {tab === "taxonomy" && <div>
      <Card title="📖 Skills Taxonomy Dictionary">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">Comprehensive skills framework organized by domain. Use as a reference when assessing your workforce or designing target-state skill profiles. Each skill includes 4 proficiency levels from novice to expert.</div>
        {SKILLS_TAXONOMY.map(domain => <div key={domain.domain} className="mb-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
            <span className="text-lg">{domain.icon}</span>
            <span className="text-[15px] font-bold" style={{color:domain.color}}>{domain.domain}</span>
            <span className="text-[15px] text-[var(--text-muted)]">({domain.skills.length} skills)</span>
          </div>
          <div className="space-y-2">
            {domain.skills.map(skill => <div key={skill.name} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] font-bold text-[var(--text-primary)]">{skill.name}</span>
                {skill.industries && <div className="flex gap-1">{skill.industries.map(ind => <span key={ind} className="text-[15px] font-bold px-1.5 py-0.5 rounded" style={{background:`${domain.color}15`,color:domain.color}}>{ind}</span>)}</div>}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {skill.profLevels.map((level, li) => <div key={li} className="rounded px-2 py-1.5 text-center" style={{background:`${domain.color}${(li+1)*4>12?"15":"0"+(li+1)*4}`,border:`1px solid ${domain.color}20`}}>
                  <div className="text-[15px] font-bold uppercase mb-0.5" style={{color:domain.color}}>Level {li+1}</div>
                  <div className="text-[14px] text-[var(--text-secondary)] leading-tight">{level}</div>
                </div>)}
              </div>
            </div>)}
          </div>
        </div>)}
      </Card>
    </div>}

    <NextStepBar currentModuleId="skills" onNavigate={onNavigate || onBack} />
  </div>;
}



/* ═══════════════════════════════════════════════════════════════
   MODULE: AI READINESS ASSESSMENT
   ═══════════════════════════════════════════════════════════════ */
export function AIReadiness({ model, f, onBack, onNavigate, viewCtx, jobStates }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext; jobStates?: Record<string, JobDesignState> }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewLevel, setViewLevel] = useState<"org"|"individual">("org");
  const [rdPage, setRdPage] = useState(0);
  const RD_PAGE = 50;

  // Assessment state
  const ASSESS_DIMS = [
    { id: "Data Literacy", icon: "📊", questions: [
      { q: "How would you describe your organization's data infrastructure?", opts: ["Primarily spreadsheets and manual reports", "Some centralized databases, often siloed", "Data warehouse with standard reporting tools", "Modern data pipelines with self-service analytics", "Mature data mesh/fabric with real-time analytics"] },
      { q: "What percentage of business decisions are backed by data analysis?", opts: ["Less than 20% — mostly intuition-based", "20-40% — some teams use data regularly", "40-60% — standard for major decisions", "60-80% — data-driven culture established", "80%+ — nearly all decisions involve data"] },
      { q: "How comfortable is your average employee with data visualizations?", opts: ["Most struggle with basic charts", "Can read charts but not draw conclusions", "Comfortable with standard dashboards", "Can create their own analyses", "Fluent in advanced analytics"] },
    ]},
    { id: "Tool Adoption", icon: "🤖", questions: [
      { q: "What is the current state of AI/ML tool usage?", opts: ["No AI tools in use", "Experimenting with basic AI", "AI deployed in 1-2 functions", "AI integrated into multiple processes", "AI is core to our operating model"] },
      { q: "How well do your current systems integrate?", opts: ["Mostly standalone with manual transfer", "Some key systems integrated", "Core systems integrated via APIs", "Comprehensive real-time integration", "Fully integrated event-driven ecosystem"] },
      { q: "How quickly can IT deploy a new software tool?", opts: ["6+ months due to procurement", "3-6 months with standard processes", "1-3 months with agile practices", "2-4 weeks for cloud tools", "Days — rapid deployment framework"] },
    ]},
    { id: "AI Awareness", icon: "🧠", questions: [
      { q: "How well does leadership understand AI capabilities?", opts: ["Limited — AI is a buzzword", "Basic awareness, no strategic thinking", "General understanding, exploring use cases", "Actively champions AI with clear vision", "Deep understanding, AI-first strategy"] },
      { q: "Does your organization have a formal AI strategy?", opts: ["No AI strategy exists", "Informal discussions only", "Strategy in development", "Formal strategy being executed", "AI integrated into business strategy"] },
      { q: "How aware are employees of AI's impact on their roles?", opts: ["Most don't think AI affects them", "Some awareness, mostly fear-based", "Moderate awareness, mixed sentiment", "Good awareness, proactive engagement", "Employees identify AI opportunities"] },
    ]},
    { id: "AI Collaboration", icon: "🤝", questions: [
      { q: "How do teams collaborate with AI tools?", opts: ["No collaboration with AI", "Individual experimentation only", "Some teams use AI in workflows", "AI-human collaboration is standard", "Teams designed around human-AI models"] },
      { q: "How open are employees to AI changing their work?", opts: ["Strong resistance — seen as threat", "Skeptical but willing to listen", "Cautiously optimistic", "Enthusiastic — seeking AI tools", "Employees driving adoption bottom-up"] },
      { q: "Do cross-functional teams collaborate on AI?", opts: ["No cross-functional AI work", "Occasional ad hoc projects", "Some formal AI teams exist", "AI center of excellence active", "AI embedded in every function"] },
    ]},
    { id: "Change Openness", icon: "🔄", questions: [
      { q: "How would you describe your org's appetite for change?", opts: ["Change-averse — prefer stability", "Reluctant — change is slow", "Moderate — accept necessary change", "Adaptive — embrace change", "Change-seeking — proactively disrupt"] },
      { q: "How effective were past transformations?", opts: ["Most failed or stalled", "Mixed results", "Generally successful", "Strong track record", "Transformation is a core competency"] },
      { q: "Does your org have change management capability?", opts: ["No change management function", "Ad hoc support from HR/PMO", "Part-time change resources", "Dedicated team with methodology", "Enterprise change office, mature tools"] },
    ]},
  ];
  const totalQuestions = ASSESS_DIMS.reduce((s, d) => s + d.questions.length, 0);
  const [assessAnswers, setAssessAnswers] = usePersisted<Record<string, number>>(`${model}_readiness_assess`, {});
  const [assessActive, setAssessActive] = useState(false);
  const [assessQ, setAssessQ] = useState(0);
  const assessComplete = Object.keys(assessAnswers).length >= totalQuestions;

  // Compute scores from answers
  const assessScores = useMemo(() => {
    const scores: Record<string, number> = {};
    let qIdx = 0;
    ASSESS_DIMS.forEach(dim => {
      let sum = 0; let count = 0;
      dim.questions.forEach(() => { const a = assessAnswers[`q${qIdx}`]; if (a !== undefined) { sum += a + 1; count++; } qIdx++; });
      scores[dim.id] = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    });
    return scores;
  }, [assessAnswers]); // eslint-disable-line react-hooks/exhaustive-deps
  const overallScore = (() => { const vals = Object.values(assessScores).filter(v => v > 0); return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0; })();

  useEffect(() => { if (!model) return; setLoading(true); api.getReadinessAssessment(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model]);

  const individuals = (data?.individuals || []) as { employee: string; scores: Record<string, number>; average: number; band: string }[];
  const dimAvgs = assessComplete ? assessScores : (data?.dimension_averages || {}) as Record<string, number>;
  const bands = (data?.bands || {}) as Record<string, number>;
  const dimensions = (data?.dimensions || []) as string[];
  const orgAvg = assessComplete ? overallScore : Number(data?.org_average || 0);
  const hasData = !loading && (individuals.length > 0 || assessComplete);

  // ─── ASSESSMENT QUIZ ───
  if (assessActive && !assessComplete) {
    let qIdx = 0;
    let currentDim = ASSESS_DIMS[0];
    let currentDimQ = 0;
    let dimStartIdx = 0;
    for (const dim of ASSESS_DIMS) {
      if (assessQ < qIdx + dim.questions.length) { currentDim = dim; currentDimQ = assessQ - qIdx; dimStartIdx = qIdx; break; }
      qIdx += dim.questions.length;
    }
    const question = currentDim.questions[currentDimQ];
    const answered = assessAnswers[`q${assessQ}`];
    const pct = Math.round(((assessQ + 1) / totalQuestions) * 100);

    return <div>
      <PageHeader icon="🎯" title="AI Readiness Assessment" subtitle={`${currentDim.icon} ${currentDim.id}`} onBack={() => setAssessActive(false)} moduleId="readiness" />
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2"><span className="text-[14px] text-[var(--text-muted)]">Question {assessQ + 1} of {totalQuestions}</span><span className="text-[14px] font-bold text-[var(--accent-primary)] font-data">{pct}%</span></div>
        <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--accent-primary)] transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="flex gap-1 mt-2">{ASSESS_DIMS.map((d, di) => { const dStart = ASSESS_DIMS.slice(0, di).reduce((s, dd) => s + dd.questions.length, 0); const dEnd = dStart + d.questions.length; const isActive = assessQ >= dStart && assessQ < dEnd; const isDone = assessQ >= dEnd; return <div key={d.id} className="flex-1 text-center text-[11px] font-semibold" style={{ color: isActive ? "var(--accent-primary)" : isDone ? "var(--success)" : "var(--text-muted)" }}>{d.icon} {d.id.split(" ").slice(-1)}</div>; })}</div>
      </div>
      {/* Question */}
      <div className="max-w-2xl mx-auto">
        <div className="text-[20px] font-bold text-[var(--text-primary)] font-heading mb-6 leading-snug">{question.q}</div>
        <div className="space-y-3">
          {question.opts.map((opt, oi) => {
            const isSelected = answered === oi;
            return <button key={oi} onClick={() => { setAssessAnswers(prev => ({ ...prev, [`q${assessQ}`]: oi })); setTimeout(() => { if (assessQ < totalQuestions - 1) setAssessQ(assessQ + 1); else setAssessActive(false); }, 400); }} className="w-full text-left px-5 py-4 rounded-xl transition-all" style={{
              background: isSelected ? "rgba(212,134,10,0.1)" : "var(--surface-1)",
              border: isSelected ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
              boxShadow: isSelected ? "0 0 12px rgba(212,134,10,0.15)" : "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0" style={{ background: isSelected ? "var(--accent-primary)" : "var(--surface-2)", color: isSelected ? "white" : "var(--text-muted)" }}>{isSelected ? "✓" : oi + 1}</div>
                <span className="text-[16px]" style={{ color: isSelected ? "var(--accent-primary)" : "var(--text-secondary)" }}>{opt}</span>
              </div>
            </button>;
          })}
        </div>
        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button onClick={() => { if (assessQ > 0) setAssessQ(assessQ - 1); }} disabled={assessQ === 0} className="px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)] disabled:opacity-30">← Back</button>
          <button onClick={() => setAssessActive(false)} className="px-4 py-2 rounded-xl text-[14px] text-[var(--text-muted)]">Save & Exit</button>
          {answered !== undefined && <button onClick={() => { if (assessQ < totalQuestions - 1) setAssessQ(assessQ + 1); else setAssessActive(false); }} className="px-6 py-2 rounded-xl text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Next →</button>}
        </div>
      </div>
    </div>;
  }

  return <div>
    <PageHeader icon="🎯" title={viewCtx?.mode === "employee" ? "My AI Readiness" : "AI Readiness Assessment"} subtitle="Individual and team readiness for transformation" onBack={onBack} moduleId="readiness" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="readiness" label="Readiness Scores" /></div>}
    {loading && <><LoadingBar /><div className="mt-4 space-y-4"><SkeletonKpiRow count={4} /><SkeletonTable rows={5} cols={4} /></div></>}

    {/* ─── BEFORE ASSESSMENT — invitation card ─── */}
    {!loading && !hasData && !assessComplete && <div className="flex items-center justify-center py-12">
      <div className="max-w-lg text-center">
        <div className="text-[64px] mb-4">🎯</div>
        <h2 className="text-[28px] font-extrabold text-[var(--text-primary)] font-heading mb-3">What{"'"}s Your AI Readiness Score?</h2>
        <p className="text-[16px] text-[var(--text-muted)] mb-6">A 5-minute assessment across 5 dimensions to understand how prepared your organization is for AI transformation.</p>
        <button onClick={() => { setAssessActive(true); setAssessQ(0); }} className="px-8 py-3.5 rounded-2xl text-[17px] font-bold text-white glow-pulse" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", boxShadow: "var(--shadow-2)" }}>Take the Assessment →</button>
        <p className="text-[14px] text-[var(--text-muted)] mt-4">Based on responses from your leadership team. Takes approximately 5 minutes.</p>
        <div className="flex justify-center gap-4 mt-6">{ASSESS_DIMS.map(d => <div key={d.id} className="text-center"><div className="text-[20px]">{d.icon}</div><div className="text-[12px] text-[var(--text-muted)]">{d.id}</div></div>)}</div>
      </div>
    </div>}

    {/* ─── RESULTS DASHBOARD ─── */}
    {hasData && <>
      {/* Assessment score header */}
      {assessComplete && <div className="rounded-2xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-6 mb-5 text-center">
        <div className="text-[14px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Your AI Readiness Score</div>
        <div className="text-[48px] font-extrabold font-data" style={{ color: orgAvg >= 3.5 ? "var(--success)" : orgAvg >= 2.5 ? "var(--warning)" : "var(--risk)" }}>{orgAvg}/5</div>
        <div className="text-[16px] font-semibold" style={{ color: orgAvg >= 3.5 ? "var(--success)" : orgAvg >= 2.5 ? "var(--warning)" : "var(--risk)" }}>{orgAvg >= 4 ? "Exceptional" : orgAvg >= 3.5 ? "Strong" : orgAvg >= 2.5 ? "Moderate" : orgAvg >= 1.5 ? "Developing" : "Critical"}</div>
        <button onClick={() => { setAssessActive(true); setAssessQ(0); }} className="mt-3 text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">Retake Assessment</button>
      </div>}

      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Org Average" value={`${orgAvg || data?.org_average || "—"}/5`} accent /><KpiCard label="Ready Now" value={bands.ready_now || 0} /><KpiCard label="Coachable" value={bands.coachable || 0} /><KpiCard label="At Risk" value={bands.at_risk || 0} /><KpiCard label="Weakest" value={String(Object.entries(dimAvgs).sort((a,b) => Number(a[1]) - Number(b[1]))[0]?.[0] || data?.lowest_dimension || "—")} />
      </div>

      <div className="flex gap-2 mb-4">{(["org","individual"] as const).map(v => <button key={v} onClick={() => setViewLevel(v)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold" style={{ background: viewLevel === v ? "var(--accent-primary)" : "var(--surface-2)", color: viewLevel === v ? "#fff" : "var(--text-muted)" }}>{v === "org" ? "Organization View" : "Individual Scores"}</button>)}</div>

      {viewLevel === "org" ? <div className="grid grid-cols-2 gap-4">
        <Card title="Readiness by Dimension"><RadarViz data={Object.entries(dimAvgs).map(([k,v]) => ({ subject: k, current: Number(v), max: 5 }))} /></Card>
        <Card title="Readiness Bands"><DonutViz data={[{name:"Ready Now",value:bands.ready_now||0},{name:"Coachable",value:bands.coachable||0},{name:"At Risk",value:bands.at_risk||0}]} />
          <div className="mt-3 space-y-2">{[{band:"Ready Now",color:"var(--success)",desc:"Can adopt AI tools immediately"},{band:"Coachable",color:"var(--warning)",desc:"Needs 3-6 months of support"},{band:"At Risk",color:"var(--risk)",desc:"Needs intensive intervention"}].map(b => <div key={b.band} className="flex items-center gap-2 text-[14px]"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:b.color}} /><span className="font-semibold" style={{color:b.color}}>{b.band}</span><span className="text-[var(--text-muted)]">— {b.desc}</span></div>)}</div>
        </Card>
      </div> : <Card title="Individual Readiness Scores">
        <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{maxHeight:450}}><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Employee</th>{dimensions.map(d => <th key={d} className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">{d}</th>)}<th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Avg</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Band</th></tr></thead>
        <tbody>{individuals.slice(rdPage * RD_PAGE, (rdPage + 1) * RD_PAGE).map(ind => <tr key={ind.employee} className="border-b border-[var(--border)]"><td className="px-3 py-1.5 font-semibold">{ind.employee}</td>{dimensions.map(d => { const v = ind.scores[d] || 0; return <td key={d} className="px-2 py-1.5 text-center"><span className="text-[14px] font-bold" style={{color: v >= 4 ? "var(--success)" : v >= 3 ? "var(--accent-primary)" : v >= 2 ? "var(--warning)" : "var(--risk)"}}>{v}</span></td>; })}<td className="px-2 py-1.5 text-center font-bold">{ind.average}</td><td className="px-2 py-1.5 text-center"><Badge color={ind.band==="Ready Now"?"green":ind.band==="Coachable"?"amber":"red"}>{ind.band}</Badge></td></tr>)}</tbody></table></div>
      </Card>}

      {/* Dimension improvement */}
      <Card title="Improvement Recommendations">
        <div className="space-y-2">{Object.entries(dimAvgs).sort((a,b) => Number(a[1]) - Number(b[1])).map(([dim, avg]) => {
          const plan = Number(avg) < 2.5 ? "Intensive program needed" : Number(avg) < 3.5 ? "Moderate support" : "Light touch";
          const timeline = Number(avg) < 2.5 ? "6-9 months" : Number(avg) < 3.5 ? "3-6 months" : "1-3 months";
          const dimInfo = ASSESS_DIMS.find(d => d.id === dim);
          return <div key={dim} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <span className="text-[18px] shrink-0">{dimInfo?.icon || "📊"}</span>
            <div className="w-28 shrink-0"><div className="text-[14px] font-semibold text-[var(--text-primary)]">{dim}</div><div className="text-[13px] text-[var(--text-muted)]">{Number(avg).toFixed(1)}/5</div></div>
            <div className="flex-1"><div className="h-3 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{width:`${(Number(avg)/5)*100}%`,background: Number(avg) >= 3.5 ? "var(--success)" : Number(avg) >= 2.5 ? "var(--warning)" : "var(--risk)"}} /></div></div>
            <div className="text-right shrink-0"><div className="text-[14px] font-semibold" style={{color: Number(avg) >= 3.5 ? "var(--success)" : Number(avg) >= 2.5 ? "var(--warning)" : "var(--risk)"}}>{plan}</div><div className="text-[13px] text-[var(--text-muted)]">{timeline}</div></div>
          </div>;
        })}</div>
      </Card>

      <NextStepBar currentModuleId="readiness" onNavigate={onNavigate || onBack} />
    </>}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: MANAGER CAPABILITY
   ═══════════════════════════════════════════════════════════════ */
export function ManagerCapability({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"scorecard"|"correlation">("scorecard");

  useEffect(() => { if (!model) return; setLoading(true); api.getManagerCapability(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl]);

  const managers = (data?.managers || []) as { manager: string; scores: Record<string, number>; average: number; category: string; direct_reports: number; team_readiness_avg: number; correlation: number; team_members: { employee: string; readiness: number; band: string }[] }[];
  const dims = (data?.dimensions || []) as string[];
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const catColors: Record<string, string> = { "Transformation Champion": "#10B981", "Needs Development": "#F59E0B", "Flight Risk": "#EF4444", "Adequate": "#7B8BA2" };
  const catIcons: Record<string, string> = { "Transformation Champion": "🏆", "Needs Development": "📘", "Flight Risk": "⚠️", "Adequate": "✓" };
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedMgr, setExpandedMgr] = useState<string | null>(null);

  const champCount = managers.filter(m => m.category === "Transformation Champion").length;
  const devCount = managers.filter(m => m.category === "Needs Development").length;
  const riskCount = managers.filter(m => m.category === "Flight Risk").length;
  const adeqCount = managers.length - champCount - devCount - riskCount;

  if (!loading && (!managers || managers.length === 0)) return <div>
    <PageHeader icon="👔" title="Manager Capability" subtitle="Assess managers and identify transformation champions" onBack={onBack} moduleId="mgrcap" />
    <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">👔</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">No Manager Data</h3><p className="text-[15px] text-[var(--text-secondary)]">Upload workforce data with org structure.</p></div>
  </div>;

  return <div>
    <ContextStrip items={["Assess managers who will lead teams through transformation. Every insight has an action path."]} />
    <PageHeader icon="👔" title="Manager Capability" subtitle="Assess, act, and align managers for transformation" onBack={onBack} moduleId="mgrcap" />
    {loading && <><LoadingBar /><div className="mt-4 space-y-4"><SkeletonKpiRow count={6} /><SkeletonTable rows={5} cols={4} /></div></>}

    <div className="grid grid-cols-6 gap-3 mb-5">
      <KpiCard label="Managers" value={managers.length} /><KpiCard label="Champions" value={champCount} accent /><KpiCard label="Needs Dev" value={devCount} /><KpiCard label="Flight Risk" value={riskCount} /><KpiCard label="Weakest Dim" value={String(summary.weakest_dimension || dims.length ? dims[0] : "—")} /><KpiCard label="Multiplier" value={String(summary.correlation_multiplier || "2.1x")} accent />
    </div>

    <TabBar tabs={[{ id: "scorecard", label: "Manager Scorecard" }, { id: "correlation", label: "Team Correlation" }]} active={tab} onChange={t => setTab(t as "scorecard"|"correlation")} />

    {tab === "scorecard" ? <>
      {/* ═══ ACTIONABLE CATEGORY PANELS ═══ */}
      <div className="space-y-4 mb-5">
        {[
          { cat: "Transformation Champion", count: champCount, actions: [
            { title: "Assign as Change Champions", desc: "Pair each Champion with 2-3 At-Risk managers for peer coaching", btn: "✨ Auto-Generate Pairings", link: "plan" },
            { title: "Create Champion Network", desc: "Form a formal network with regular meetings and communication channel", btn: "Add to Comms Plan", link: "plan" },
            { title: "Recognize & Retain", desc: "Champions are high performers — ensure engagement and retention", btn: "Flag for Retention", link: "plan" },
          ]},
          { cat: "Needs Development", count: devCount, actions: [
            { title: "Build Development Program", desc: "Create targeted capability building — top gaps across this group", btn: "✨ Generate Training Plan", link: "reskill" },
            { title: "Assign Coaching", desc: "Pair each with a Transformation Champion for 1:1 coaching", btn: "Auto-Pair with Champions", link: "plan" },
            { title: "Set Development Timeline", desc: "These managers must be ready before their teams are affected", btn: "Add Milestones to Gantt", link: "plan" },
          ]},
          { cat: "Flight Risk", count: riskCount, actions: [
            { title: "Immediate Engagement Plan", desc: "Sorted by impact — managers with most reports are highest priority", btn: "Generate 1:1 Talking Points", link: "plan" },
            { title: "Stakeholder Alignment", desc: "Assign a senior sponsor to each high-risk manager", btn: "Sync to Stakeholder Map", link: "plan" },
            { title: "Exit Risk Assessment", desc: "Impact analysis if these managers leave during transformation", btn: "Create Contingency Plan", link: "plan" },
          ]},
        ].map(panel => {
          const isExpanded = expandedCat === panel.cat;
          const catMgrs = managers.filter(m => m.category === panel.cat).sort((a, b) => b.direct_reports - a.direct_reports);
          return <div key={panel.cat} className="rounded-2xl border overflow-hidden" style={{ borderColor: `${catColors[panel.cat]}30`, boxShadow: "var(--shadow-1)" }}>
            <button onClick={() => setExpandedCat(isExpanded ? null : panel.cat)} className="w-full px-5 py-4 text-left flex items-center justify-between transition-all hover:bg-[var(--hover)]" style={{ background: `${catColors[panel.cat]}06`, borderLeft: `4px solid ${catColors[panel.cat]}` }}>
              <div className="flex items-center gap-3">
                <span className="text-[22px]">{catIcons[panel.cat]}</span>
                <div><div className="text-[16px] font-bold text-[var(--text-primary)] font-heading">{panel.cat} — {panel.count} managers</div><div className="text-[13px] text-[var(--text-muted)]">{panel.actions[0].desc}</div></div>
              </div>
              <div className="flex items-center gap-3"><span className="text-[24px] font-extrabold font-data" style={{ color: catColors[panel.cat] }}>{panel.count}</span><span className="text-[var(--text-muted)]">{isExpanded ? "▾" : "▸"}</span></div>
            </button>
            {isExpanded && <div className="px-5 py-4 border-t border-[var(--border)] space-y-4" style={{ background: "var(--surface-1)" }}>
              {/* Action cards */}
              <div className="grid grid-cols-3 gap-3">
                {panel.actions.map(act => <div key={act.title} className="rounded-xl p-4 border border-[var(--border)] bg-[var(--surface-2)]">
                  <div className="text-[14px] font-bold text-[var(--text-primary)] mb-1">{act.title}</div>
                  <div className="text-[13px] text-[var(--text-muted)] mb-3">{act.desc}</div>
                  <button onClick={() => { showToast(`${act.title} — added to ${act.link === "reskill" ? "Reskilling Pathways" : "Change Planner"}`); if (onNavigate) onNavigate(act.link); }} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: catColors[panel.cat] }}>{act.btn}</button>
                  <div className="text-[11px] text-[var(--text-muted)] mt-2">Feeds into: {act.link === "reskill" ? "Reskilling Pathways" : "Change Planner, Stakeholder Map"}</div>
                </div>)}
              </div>
              {/* Top managers in this category */}
              <div className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Top {Math.min(catMgrs.length, 8)} by team size</div>
              <div className="space-y-1">{catMgrs.slice(0, 8).map(m => <div key={m.manager} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)] cursor-pointer hover:border-[var(--accent-primary)]/30 border border-transparent transition-all" onClick={() => setExpandedMgr(expandedMgr === m.manager ? null : m.manager)}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: catColors[panel.cat] }}>{m.manager.split(" ").map(w => w[0]).join("").slice(0,2)}</div>
                <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{m.manager}</div><div className="text-[12px] text-[var(--text-muted)]">{m.direct_reports} reports · Avg: {m.average}/5</div></div>
                {panel.cat === "Flight Risk" && m.direct_reports > 5 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.1)] text-[var(--risk)] font-bold">High Impact</span>}
                {expandedMgr === m.manager && <span className="text-[var(--text-muted)]">▾</span>}
              </div>)}
              </div>
            </div>}
          </div>;
        })}
      </div>

      {/* ═══ SCORECARD TABLE ═══ */}
      <Card title="Detailed Scores">
        <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 400 }}><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0 z-10"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Manager</th><th className="px-2 py-2 text-center border-b border-[var(--border)] text-[var(--text-muted)]">Reports</th>{dims.map(d => <th key={d} className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]" style={{maxWidth:70,fontSize: 13}}>{d.length > 10 ? d.slice(0,8) + ".." : d}</th>)}<th className="px-2 py-2 text-center border-b border-[var(--border)]">Avg</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Category</th></tr></thead>
        <tbody>{managers.slice(0, 30).map(m => <tr key={m.manager} className="border-b border-[var(--border)] hover:bg-[var(--hover)] cursor-pointer transition-colors" onClick={() => setExpandedMgr(expandedMgr === m.manager ? null : m.manager)}>
          <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{m.manager}</td>
          <td className="px-2 py-2 text-center text-[var(--text-muted)]">{m.direct_reports}</td>
          {dims.map(d => { const v = m.scores[d] || 0; return <td key={d} className="px-2 py-2 text-center"><span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-[14px] font-bold" style={{ background: `${v >= 4 ? "#10B981" : v >= 3 ? "#D4860A" : v >= 2 ? "#F59E0B" : "#EF4444"}15`, color: v >= 4 ? "#10B981" : v >= 3 ? "#D4860A" : v >= 2 ? "#F59E0B" : "#EF4444" }}>{v || "—"}</span></td>; })}
          <td className="px-2 py-2 text-center font-extrabold text-[var(--text-primary)]">{m.average || "—"}</td>
          <td className="px-2 py-2 text-center"><Badge color={m.category === "Transformation Champion" ? "green" : m.category === "Needs Development" ? "amber" : m.category === "Flight Risk" ? "red" : "gray"}>{catIcons[m.category] || "✓"}</Badge></td>
        </tr>)}</tbody></table></div>
      </Card>
    </> : <>
      {/* Correlation view — unchanged but with better KPIs */}
      <Card title="Manager Capability → Team Readiness">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl p-5 text-center border" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}><div className="text-[14px] text-[var(--text-muted)] mb-1">Champion Teams</div><div className="text-[28px] font-extrabold text-[var(--success)]">{Number(summary.high_mgr_team_readiness || 3.8)}<span className="text-[14px]">/5</span></div></div>
          <div className="rounded-xl p-5 text-center border" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}><div className="text-[14px] text-[var(--text-muted)] mb-1">At-Risk Teams</div><div className="text-[28px] font-extrabold text-[var(--risk)]">{Number(summary.low_mgr_team_readiness || 2.1)}<span className="text-[14px]">/5</span></div></div>
          <div className="rounded-xl p-5 text-center border" style={{ background: "rgba(212,134,10,0.06)", borderColor: "rgba(212,134,10,0.2)" }}><div className="text-[14px] text-[var(--text-muted)] mb-1">Multiplier Effect</div><div className="text-[28px] font-extrabold text-[var(--accent-primary)]">{String(summary.correlation_multiplier || "2.1x")}</div></div>
        </div>
        <div className="text-[14px] text-[var(--text-secondary)] mb-4 p-3 rounded-lg border-l-3" style={{ borderLeft: "3px solid var(--accent-primary)", background: "rgba(212,134,10,0.04)" }}>Manager capability has a <strong>{summary.correlation_multiplier || "2.1x"}</strong> multiplier effect on team readiness. Investing in manager development is the highest-leverage intervention.</div>
        <div className="space-y-2">{managers.slice(0, 15).map(m => <div key={m.manager} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-white shrink-0" style={{ background: catColors[m.category] || "#888" }}>{m.manager.split(" ").map(w => w[0]).join("").slice(0,2)}</div>
          <div className="flex-1"><div className="text-[14px] font-semibold text-[var(--text-primary)]">{m.manager}</div><div className="text-[12px] text-[var(--text-muted)]">{m.direct_reports} reports</div></div>
          <div className="text-center shrink-0 w-14"><div className="text-[11px] text-[var(--text-muted)]">Mgr</div><div className="text-[14px] font-extrabold" style={{ color: catColors[m.category] || "#888" }}>{m.average || "—"}</div></div>
          <span className="text-[var(--text-muted)]">→</span>
          <div className="text-center shrink-0 w-14"><div className="text-[11px] text-[var(--text-muted)]">Team</div><div className="text-[14px] font-extrabold" style={{ color: m.team_readiness_avg >= 3.5 ? "var(--success)" : m.team_readiness_avg >= 2.5 ? "var(--warning)" : "var(--risk)" }}>{m.team_readiness_avg || "—"}</div></div>
        </div>)}</div>
      </Card>
    </>}

    <NextStepBar currentModuleId="mgrcap" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: CHANGE READINESS & ADOPTION
   ═══════════════════════════════════════════════════════════════ */
export function ChangeReadiness({ model, f, onBack, onNavigate, viewCtx, simState }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext; simState?: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number } }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [crTab, setCrTab] = useState<"campaigns" | "activities" | "raci" | "messages" | "tracking">("campaigns");

  useEffect(() => { if (!model) return; setLoading(true); api.getChangeReadiness(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl]);

  const summary = (data?.summary || {}) as Record<string, unknown>;
  const total = Number(summary.total_assessed || 0);

  // Campaign state
  type Activity = { id: string; activity: string; type: string; channel: string; audience: string; owner: string; start: string; end: string; status: string; notes: string };
  type Campaign = { id: string; name: string; status: string; target: string; owner: string; start: string; end: string; activities: Activity[] };
  const [campaigns, setCampaigns] = usePersisted<Campaign[]>(`${model}_change_campaigns`, [{
    id: "c1", name: "AI Transformation — Technology Function", status: "In Planning", target: "Technology (2,400 employees)", owner: "Program Lead", start: "2026-05", end: "2026-10",
    activities: [
      { id: "a1", activity: "Leadership alignment workshop with VPs", type: "Workshop", channel: "In-person", audience: "Senior Leadership", owner: "Consultant", start: "2026-05-01", end: "2026-05-02", status: "Ready for Review", notes: "" },
      { id: "a2", activity: "Town hall: Future of Technology function", type: "Town Hall", channel: "Virtual", audience: "All employees", owner: "Client Sponsor", start: "2026-05-15", end: "2026-05-15", status: "In Planning", notes: "" },
      { id: "a3", activity: "Manager toolkit & briefing materials", type: "Document", channel: "Intranet", audience: "Managers only", owner: "Consultant", start: "2026-05-10", end: "2026-05-14", status: "In Progress", notes: "Include FAQ, talking points, timeline" },
      { id: "a4", activity: "Skip-level listening sessions", type: "1:1 Meeting", channel: "Virtual", audience: "Affected employees only", owner: "HRBP", start: "2026-05-20", end: "2026-06-05", status: "Not Started", notes: "8 sessions across teams" },
      { id: "a5", activity: "Pulse survey: post-announcement sentiment", type: "Survey", channel: "Email", audience: "All employees", owner: "HR Lead", start: "2026-06-01", end: "2026-06-07", status: "Not Started", notes: "5 questions, anonymous" },
      { id: "a6", activity: "Manager cascade: restructuring details", type: "Communication", channel: "Manager cascade", audience: "Managers only", owner: "Function Head", start: "2026-06-10", end: "2026-06-14", status: "Not Started", notes: "" },
      { id: "a7", activity: "Reskilling program launch for Wave 1", type: "Training", channel: "Virtual", audience: "Affected employees only", owner: "L&D Lead", start: "2026-06-20", end: "2026-08-20", status: "Not Started", notes: "AI tools, data literacy" },
      { id: "a8", activity: "Drop-in office hours (weekly)", type: "Drop-in", channel: "Virtual", audience: "All employees", owner: "Change Lead", start: "2026-05-20", end: "2026-10-30", status: "Not Started", notes: "Every Thursday 2-3pm" },
    ],
  }]);
  const [activeCampaignId, setActiveCampaignId] = useState(campaigns[0]?.id || "");
  const [addingCampaign, setAddingCampaign] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

  // RACI state
  const [raciMatrix, setRaciMatrix] = usePersisted<Record<string, Record<string, string>>>(`${model}_raci`, {});
  const raciActivities = ["Approve restructuring plan", "Deliver town hall", "Prepare FAQ document", "Conduct manager briefings", "Respond to employee questions", "Monitor sentiment", "Approve communications", "Deliver reskilling", "Track progress"];
  const raciStakeholders = ["Sponsor", "HR Lead", "Function Head", "HRBPs", "Consultant", "Comms Team", "L&D"];

  // Pulse state
  const [pulseEntries, setPulseEntries] = usePersisted<{ date: string; source: string; segment: string; sentiment: number; themes: string }[]>(`${model}_pulse`, []);
  const [issues, setIssues] = usePersisted<{ id: string; desc: string; severity: string; owner: string; status: string }[]>(`${model}_issues`, []);

  const statusColors: Record<string, string> = { "Not Started": "var(--text-muted)", "In Planning": "#0EA5E9", "Ready for Review": "var(--warning)", "Approved": "var(--success)", "In Progress": "var(--accent-primary)", "Completed": "var(--success)", "Deferred": "var(--text-muted)", "Active": "var(--success)", "Draft": "var(--text-muted)", "Paused": "var(--warning)", "Complete": "var(--success)" };

  return <div>
    <ContextStrip items={["Plan, coordinate, and track change management campaigns across your transformation."]} />
    <PageHeader icon="📋" title="Change Campaign Planner" subtitle="Plan activities, assign responsibilities, and track sentiment" onBack={onBack} moduleId="changeready" />
    {loading && <><LoadingBar /><div className="mt-4 space-y-4"><SkeletonKpiRow count={4} /><SkeletonTable rows={5} cols={5} /></div></>}

    <TabBar tabs={[
      { id: "campaigns", label: "📊 Campaigns" },
      { id: "activities", label: "📅 Activities" },
      { id: "raci", label: "👥 RACI" },
      { id: "messages", label: "📝 Messages" },
      { id: "tracking", label: "📈 Tracking" },
    ]} active={crTab} onChange={t => setCrTab(t as typeof crTab)} />

    {/* ═══ TAB: CAMPAIGNS ═══ */}
    {crTab === "campaigns" && <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Campaigns" value={campaigns.length} /><KpiCard label="Active" value={campaigns.filter(c => c.status === "Active" || c.status === "In Planning").length} accent /><KpiCard label="Activities" value={campaigns.reduce((s, c) => s + c.activities.length, 0)} /><KpiCard label="Completed" value={campaigns.reduce((s, c) => s + c.activities.filter(a => a.status === "Completed").length, 0)} />
      </div>
      {campaigns.map(c => {
        const completedActs = c.activities.filter(a => a.status === "Completed").length;
        const pct = c.activities.length ? Math.round((completedActs / c.activities.length) * 100) : 0;
        return <div key={c.id} className="rounded-2xl border bg-[var(--surface-1)] p-5 cursor-pointer transition-all hover:border-[var(--accent-primary)]/30" style={{ borderColor: activeCampaignId === c.id ? "var(--accent-primary)" : "var(--border)", borderLeft: `4px solid ${statusColors[c.status] || "var(--text-muted)"}`, boxShadow: "var(--shadow-1)" }} onClick={() => { setActiveCampaignId(c.id); setCrTab("activities"); }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[18px] font-bold text-[var(--text-primary)] font-heading">{c.name}</div>
            <span className="px-3 py-1 rounded-full text-[13px] font-bold" style={{ background: `${statusColors[c.status] || "var(--text-muted)"}12`, color: statusColors[c.status] }}>{c.status}</span>
          </div>
          <div className="flex items-center gap-4 text-[14px] text-[var(--text-muted)] mb-3">
            <span>{c.target}</span><span>Owner: {c.owner}</span><span>{c.start} → {c.end}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${pct}%` }} /></div>
            <span className="text-[13px] font-bold font-data text-[var(--text-muted)]">{completedActs}/{c.activities.length} ({pct}%)</span>
          </div>
        </div>;
      })}
      <button onClick={() => setAddingCampaign(true)} className="w-full px-4 py-3 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ New Campaign</button>
      {addingCampaign && <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 space-y-3">
        <input id="cn" placeholder="Campaign name..." className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
        <div className="grid grid-cols-2 gap-3"><input id="ct" placeholder="Target audience..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" /><input id="co" placeholder="Campaign owner..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" /></div>
        <div className="flex gap-2"><button onClick={() => { const el = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || ""; const name = el("cn"); if (!name) return; setCampaigns(prev => [...prev, { id: `c${Date.now()}`, name, status: "Draft", target: el("ct"), owner: el("co"), start: "", end: "", activities: [] }]); setAddingCampaign(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Create</button><button onClick={() => setAddingCampaign(false)} className="px-4 py-2 rounded-lg text-[14px] text-[var(--text-muted)] border border-[var(--border)]">Cancel</button></div>
      </div>}
      {/* Audience segmentation from readiness data */}
      {total > 0 && <Card title="Audience Segmentation (from AI Readiness)">
        <div className="grid grid-cols-4 gap-3">
          {[{ l: "Champions", v: summary.champion_count, c: "var(--success)" }, { l: "High Risk", v: summary.high_risk_count, c: "var(--risk)" }, { l: "Supporters", v: Math.round(total * 0.4), c: "var(--accent-primary)" }, { l: "Monitor", v: Math.round(total * 0.15), c: "var(--text-muted)" }].map(s => <div key={s.l} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: s.c as string }}>{Number(s.v || 0)}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">{s.l}</div></div>)}
        </div>
      </Card>}
    </div>}

    {/* ═══ TAB: ACTIVITIES ═══ */}
    {crTab === "activities" && <div>
      {!activeCampaign ? <div className="text-center py-12 text-[var(--text-muted)]">Select a campaign from the Campaigns tab</div> : <Card title={`${activeCampaign.name} — Activities`}>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
          {["Activity", "Type", "Channel", "Audience", "Owner", "Start", "Status", ""].map(h => <th key={h} className="px-2 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] whitespace-nowrap">{h}</th>)}
        </tr></thead><tbody>
          {activeCampaign.activities.map(act => <tr key={act.id} className="border-b border-[var(--border)]" style={{ borderLeft: `3px solid ${statusColors[act.status] || "var(--text-muted)"}` }}>
            <td className="px-2 py-2 font-semibold text-[var(--text-primary)] max-w-[250px]">{act.activity}</td>
            <td className="px-2 py-2 text-[var(--text-muted)]">{act.type}</td>
            <td className="px-2 py-2 text-[var(--text-muted)]">{act.channel}</td>
            <td className="px-2 py-2 text-[var(--text-muted)]">{act.audience}</td>
            <td className="px-2 py-2 text-[var(--text-secondary)]">{act.owner}</td>
            <td className="px-2 py-2 text-[var(--text-muted)] font-data">{act.start}</td>
            <td className="px-2 py-2"><button onClick={() => { const cycle = ["Not Started", "In Planning", "Ready for Review", "In Progress", "Completed"]; setCampaigns(prev => prev.map(c => c.id === activeCampaignId ? { ...c, activities: c.activities.map(a => a.id === act.id ? { ...a, status: cycle[(cycle.indexOf(a.status) + 1) % cycle.length] } : a) } : c)); }} className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${statusColors[act.status]}12`, color: statusColors[act.status] }}>{act.status}</button></td>
            <td className="px-2 py-2"><button onClick={() => setCampaigns(prev => prev.map(c => c.id === activeCampaignId ? { ...c, activities: c.activities.filter(a => a.id !== act.id) } : c))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[12px]">×</button></td>
          </tr>)}
        </tbody></table></div>
        <button onClick={() => setAddingActivity(true)} className="mt-3 w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]">+ Add Activity</button>
        {addingActivity && <div className="mt-3 rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 grid grid-cols-3 gap-2">
          <input id="aa" placeholder="Activity description..." className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none" />
          <select id="at" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-2 text-[13px] outline-none"><option>Workshop</option><option>Town Hall</option><option>1:1 Meeting</option><option>Communication</option><option>Training</option><option>Survey</option><option>Document</option><option>Drop-in</option></select>
          <select id="ac" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-2 text-[13px] outline-none"><option>In-person</option><option>Virtual</option><option>Email</option><option>Intranet</option><option>Manager cascade</option></select>
          <input id="ao" placeholder="Owner..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-2 text-[13px] outline-none" />
          <div className="col-span-3 flex gap-2"><button onClick={() => { const el = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || ""; const desc = el("aa"); if (!desc) return; setCampaigns(prev => prev.map(c => c.id === activeCampaignId ? { ...c, activities: [...c.activities, { id: `a${Date.now()}`, activity: desc, type: el("at"), channel: el("ac"), audience: "All employees", owner: el("ao"), start: "", end: "", status: "Not Started", notes: "" }] } : c)); setAddingActivity(false); }} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Add</button><button onClick={() => setAddingActivity(false)} className="text-[13px] text-[var(--text-muted)]">Cancel</button></div>
        </div>}
      </Card>}
    </div>}

    {/* ═══ TAB: RACI ═══ */}
    {crTab === "raci" && <Card title="RACI Matrix — Responsibility Assignment">
      <div className="text-[14px] text-[var(--text-secondary)] mb-4">Click cells to assign: R (Responsible), A (Accountable — one per row), C (Consulted), I (Informed)</div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
        <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[200px]">Activity</th>
        {raciStakeholders.map(s => <th key={s} className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)] min-w-[70px]">{s}</th>)}
      </tr></thead><tbody>
        {raciActivities.map(act => <tr key={act} className="border-b border-[var(--border)]">
          <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{act}</td>
          {raciStakeholders.map(s => {
            const key = `${act}__${s}`;
            const val = raciMatrix[key] || "";
            const raciColors: Record<string, string> = { R: "#0891B2", A: "var(--accent-primary)", C: "var(--purple)", I: "var(--text-muted)" };
            return <td key={s} className="px-2 py-2 text-center"><button onClick={() => { const cycle = ["", "R", "A", "C", "I"]; setRaciMatrix(prev => ({ ...prev, [key]: cycle[(cycle.indexOf(val) + 1) % cycle.length] })); }} className="w-7 h-7 rounded-lg text-[14px] font-bold inline-flex items-center justify-center" style={{ background: val ? `${raciColors[val] || "var(--text-muted)"}15` : "var(--surface-2)", color: val ? raciColors[val] : "var(--border)", border: `1px solid ${val ? `${raciColors[val]}30` : "var(--border)"}` }}>{val || "·"}</button></td>;
          })}
        </tr>)}
      </tbody></table></div>
      <div className="flex gap-4 mt-3 text-[13px] text-[var(--text-muted)]">{[{ l: "R", n: "Responsible", c: "#0891B2" }, { l: "A", n: "Accountable", c: "var(--accent-primary)" }, { l: "C", n: "Consulted", c: "var(--purple)" }, { l: "I", n: "Informed", c: "var(--text-muted)" }].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-5 h-5 rounded text-[13px] font-bold flex items-center justify-center" style={{ background: `${x.c}15`, color: x.c }}>{x.l}</span>{x.n}</span>)}</div>
    </Card>}

    {/* ═══ TAB: MESSAGES ═══ */}
    {crTab === "messages" && <div className="space-y-4">
      {[
        { phase: "Pre-Announcement", templates: [
          { title: "Leadership alignment email", purpose: "Secure executive buy-in before public announcement", body: "Dear [Sponsor Name],\n\nI'm writing to confirm our alignment on the [Change Description] initiative. The restructuring will affect [X] employees across [Function], with implementation beginning [Timeline].\n\nKey decisions we need your sign-off on:\n1. Communication timing and sequence\n2. Manager briefing approach\n3. Support resources for affected employees\n\nPlease review the attached briefing document and confirm your availability for a 30-minute alignment call this week." },
          { title: "Manager pre-brief talking points", purpose: "Equip managers before they hear questions from teams", body: "TALKING POINTS FOR MANAGERS\n\nWhat's happening:\n• [Change Description] — starting [Timeline]\n• This affects [X] roles in [Function]\n\nWhat to say if asked:\n• \"We are restructuring to better position our team for the future\"\n• \"No decisions about individuals have been made yet\"\n• \"Support resources will be available from [Date]\"\n\nWhat NOT to say:\n• Don't speculate about specific role changes\n• Don't promise outcomes you can't guarantee\n• Don't share details beyond what's been approved" },
        ]},
        { phase: "Announcement", templates: [
          { title: "All-employee email from sponsor", purpose: "Official announcement to the full workforce", body: "Dear colleagues,\n\nI'm writing to share an important update about the future of our [Function] team.\n\n[Change Description — 2-3 sentences]\n\nWhat this means for you:\n• [Key impact statement]\n• [Timeline for changes]\n• [Support available]\n\nI understand this may raise questions. We've prepared:\n• FAQ document: [link]\n• Town hall Q&A: [date]\n• Drop-in sessions: [schedule]\n\nI'm committed to making this transition as smooth as possible.\n\n[Sponsor Name]" },
        ]},
        { phase: "During Transition", templates: [
          { title: "Weekly progress update", purpose: "Keep stakeholders informed on implementation", body: "WEEKLY UPDATE — Week [X]\n\nProgress: [X]% of activities on track\nCompleted this week: [list]\nUpcoming next week: [list]\nIssues to escalate: [list or 'None']\nSentiment pulse: [improving/stable/declining]" },
          { title: "Pulse survey (5 questions)", purpose: "Quick sentiment check with affected employees", body: "1. I understand why this change is happening (1-5)\n2. I feel supported during this transition (1-5)\n3. I know where to go if I have questions (1-5)\n4. I'm confident this change will be positive long-term (1-5)\n5. What's one thing we could do better? (open text)" },
        ]},
      ].map(phase => <Card key={phase.phase} title={phase.phase}>
        <div className="space-y-3">{phase.templates.map(tmpl => <div key={tmpl.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="flex items-center justify-between mb-2"><div className="text-[15px] font-bold text-[var(--text-primary)]">{tmpl.title}</div><button onClick={() => { navigator.clipboard.writeText(tmpl.body); showToast("Template copied to clipboard"); }} className="px-3 py-1 rounded-lg text-[13px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)]">Copy</button></div>
          <div className="text-[13px] text-[var(--text-muted)] mb-2">{tmpl.purpose}</div>
          <pre className="text-[14px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed bg-[var(--bg)] rounded-lg p-3 border border-[var(--border)] max-h-[200px] overflow-y-auto" style={{ fontFamily: "'Outfit', sans-serif" }}>{tmpl.body}</pre>
        </div>)}</div>
      </Card>)}
    </div>}

    {/* ═══ TAB: TRACKING ═══ */}
    {crTab === "tracking" && <div className="space-y-5">
      {/* Campaign health */}
      {activeCampaign && <Card title="Campaign Health">
        {(() => { const acts = activeCampaign.activities; const done = acts.filter(a => a.status === "Completed").length; const inProg = acts.filter(a => a.status === "In Progress").length; const delayed = acts.filter(a => a.status === "Deferred").length; return <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{done}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Completed</div></div>
          <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{inProg}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">In Progress</div></div>
          <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{delayed}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Delayed</div></div>
          <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-muted)]">{acts.length - done - inProg - delayed}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Not Started</div></div>
        </div>; })()}
      </Card>}
      {/* Issue log */}
      <Card title="Issue Log">
        <div className="space-y-2 mb-3">{issues.map(iss => <div key={iss.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
          <span className="text-[14px]" style={{ color: iss.severity === "High" ? "var(--risk)" : iss.severity === "Medium" ? "var(--warning)" : "var(--text-muted)" }}>{iss.severity === "High" ? "🔴" : iss.severity === "Medium" ? "🟡" : "⚪"}</span>
          <div className="flex-1 text-[14px] text-[var(--text-secondary)]">{iss.desc}</div>
          <span className="text-[13px] text-[var(--text-muted)]">{iss.owner}</span>
          <button onClick={() => setIssues(prev => prev.map(i => i.id === iss.id ? { ...i, status: i.status === "Open" ? "Resolved" : "Open" } : i))} className="px-2 py-0.5 rounded text-[12px] font-semibold" style={{ color: iss.status === "Open" ? "var(--risk)" : "var(--success)" }}>{iss.status}</button>
        </div>)}</div>
        <button onClick={() => { const desc = prompt("Issue description:"); if (desc) setIssues(prev => [...prev, { id: `i${Date.now()}`, desc, severity: "Medium", owner: "", status: "Open" }]); }} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">+ Add Issue</button>
      </Card>
      {/* Pulse entries */}
      <Card title="Pulse Check Log">
        <div className="space-y-2 mb-3">{pulseEntries.map((p, i) => <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)]">
          <span className="text-[13px] text-[var(--text-muted)] font-data w-20">{p.date}</span>
          <span className="text-[13px] text-[var(--text-muted)]">{p.source}</span>
          <span className="text-[13px] text-[var(--text-muted)]">{p.segment}</span>
          <span className="text-[14px] font-bold" style={{ color: p.sentiment >= 4 ? "var(--success)" : p.sentiment >= 3 ? "var(--warning)" : "var(--risk)" }}>{p.sentiment}/5</span>
          <span className="text-[13px] text-[var(--text-secondary)] flex-1">{p.themes}</span>
        </div>)}</div>
        <button onClick={() => { const date = new Date().toISOString().split("T")[0]; const sentiment = Number(prompt("Sentiment score (1-5):") || "3"); const themes = prompt("Key themes:") || ""; setPulseEntries(prev => [...prev, { date, source: "Survey", segment: "All", sentiment, themes }]); }} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">+ Add Pulse Check</button>
      </Card>
    </div>}

    <NextStepBar currentModuleId="changeready" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: MANAGER DEVELOPMENT TRACK
   ═══════════════════════════════════════════════════════════════ */
export function ManagerDevelopment({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!model) return; setLoading(true); api.getManagerDevelopment(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl]);

  const tracks = (data?.tracks || []) as { manager: string; category: string; average_score: number; direct_reports: number; weak_dimensions: string[]; interventions: { dimension: string; intervention: string; format: string; duration_weeks: number; cost: number }[]; role_in_change: string; total_cost: number; total_weeks: number }[];
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const catColors: Record<string, string> = { "Transformation Champion": "#10B981", "Needs Development": "#F59E0B", "Flight Risk": "#EF4444" };
  const catIcons: Record<string, string> = { "Transformation Champion": "🏆", "Needs Development": "📘", "Flight Risk": "⚠️" };

  if (!loading && tracks.length === 0) return <div>
    <PageHeader icon="🎓" title="Manager Development" subtitle="Targeted plans for people managers" onBack={onBack} moduleId="mgrdev" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="manager_development" label="Manager Dev Plans" /></div>}
    <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🎓</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Complete Manager Capability Assessment First</h3><p className="text-[15px] text-[var(--text-secondary)]">Manager development plans are generated from capability scores.</p></div>
  </div>;

  return <div>
    <ContextStrip items={["Phase 3: Deliver — Targeted development for managers. Champions lead change, Flight Risks need immediate engagement."]} />
    <PageHeader icon="🎓" title="Manager Development Track" subtitle="Development plans and transformation roles" onBack={onBack} moduleId="mgrdev" />
    {loading && <><LoadingBar /><div className="mt-4 space-y-4"><SkeletonKpiRow count={5} /><SkeletonTable rows={5} cols={4} /></div></>}

    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Managers" value={Number(summary.total_managers || 0)} /><KpiCard label="Change Agents" value={Number(summary.change_agents || 0)} accent /><KpiCard label="Need Dev" value={Number(summary.need_development || 0)} /><KpiCard label="Avg Duration" value={`${summary.avg_duration_weeks || 0}wk`} /><KpiCard label="Investment" value={fmtNum(summary.total_investment || 0)} />
    </div>

    {/* Category summary */}
    <div className="grid grid-cols-3 gap-4 mb-4">
      {(["Transformation Champion", "Needs Development", "Flight Risk"] as const).map(cat => {
        const group = tracks.filter(t => t.category === cat);
        return <div key={cat} className="rounded-xl p-4 border-l-4 transition-all hover:translate-y-[-2px]" style={{ background: `${catColors[cat]}08`, borderColor: catColors[cat] }}>
          <div className="flex items-center gap-2 mb-2"><span className="text-lg">{catIcons[cat]}</span><span className="text-[14px] font-bold" style={{ color: catColors[cat] }}>{cat}</span></div>
          <div className="text-[22px] font-extrabold mb-1" style={{ color: catColors[cat] }}>{group.length}</div>
          <div className="text-[15px] text-[var(--text-secondary)]">{cat === "Transformation Champion" ? "Deploy as change agents" : cat === "Needs Development" ? "Build capability before rollout" : "Engage immediately, assess retention"}</div>
        </div>;
      })}
    </div>

    {/* Individual development cards */}
    {tracks.map(t => <Card key={t.manager} title={`${catIcons[t.category]} ${t.manager}`}>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Badge color={t.category === "Transformation Champion" ? "green" : t.category === "Needs Development" ? "amber" : "red"}>{t.category}</Badge>
        <span className="text-[15px] text-[var(--text-muted)]">Score: {t.average_score}/5 · {t.direct_reports} reports</span>
        <span className="text-[15px] font-semibold" style={{ color: catColors[t.category] }}>{t.total_weeks}wk · {fmtNum(t.total_cost)}</span>
      </div>

      {/* Role in transformation */}
      <div className="bg-[var(--surface-2)] rounded-xl p-3 mb-3 border border-[var(--border)]">
        <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Transformation Role</div>
        <div className="text-[15px] font-semibold" style={{ color: catColors[t.category] }}>{t.role_in_change}</div>
      </div>

      {/* Interventions */}
      {(t.interventions || []).length > 0 && <div className="space-y-2">{(t.interventions || []).map((int, i) => <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30">
        <div className="flex-1">
          <div className="text-[15px] font-semibold text-[var(--text-primary)]">{int.dimension}</div>
          <div className="text-[15px] text-[var(--text-secondary)]">{int.intervention}</div>
        </div>
        <Badge color={int.format.includes("1:1") ? "purple" : int.format.includes("Group") ? "indigo" : "gray"}>{int.format}</Badge>
        <span className="text-[15px] text-[var(--text-muted)] shrink-0">{int.duration_weeks}wk</span>
        <span className="text-[15px] font-bold shrink-0" style={{ color: "var(--accent-primary)" }}>{fmtNum(int.cost)}</span>
      </div>)}</div>}
    </Card>)}

    <InsightPanel title="Investment Summary" items={[
      `Total manager development investment: ${fmtNum(summary.total_investment || 0)}`,
      `${summary.change_agents || 0} managers ready to deploy as change agents immediately`,
      `${summary.need_development || 0} managers need ${summary.avg_duration_weeks || 0} weeks average development before they can lead transformation`,
      `Flight Risk managers should be engaged within 2 weeks — delay increases attrition probability`,
    ]} icon="🎓" />

    {/* 30/60/90 Day Milestones */}
    <Card title="Development Milestones — 30/60/90 Day Plan">
      <div className="grid grid-cols-3 gap-4">{[
        {day:"30",title:"Foundation",items:["Complete initial assessment","Assign executive coach/mentor","Begin first development module","Set personal development goals"],color:"var(--accent-primary)"},
        {day:"60",title:"Building",items:["Complete 2 of 4 development modules","Lead one team workshop on AI readiness","Receive 360 feedback mid-check","Demonstrate 1 new AI tool adoption"],color:"var(--success)"},
        {day:"90",title:"Demonstrating",items:["Complete all development modules","Lead transformation initiative in function","Re-assess on all 4 dimensions","Present development journey to peers"],color:"var(--purple)"},
      ].map(m => <div key={m.day} className="rounded-xl p-4 border-l-4 bg-[var(--surface-2)]" style={{borderColor:m.color}}>
        <div className="text-[18px] font-extrabold mb-1" style={{color:m.color}}>Day {m.day}</div>
        <div className="text-[15px] font-bold text-[var(--text-primary)] mb-2">{m.title}</div>
        <div className="space-y-1">{m.items.map((it,i) => <div key={i} className="flex items-start gap-2 text-[15px] text-[var(--text-secondary)]"><span className="text-[var(--text-muted)] shrink-0">○</span>{it}</div>)}</div>
      </div>)}</div>
    </Card>

    {/* Mentorship Pairing */}
    {tracks.filter(t => t.category === "Transformation Champion").length > 0 && tracks.filter(t => t.category !== "Transformation Champion").length > 0 && <Card title="Mentorship Pairing — Champions → Developing Managers">
      <div className="space-y-2">{tracks.filter(t => t.category === "Transformation Champion").map(champion => {
        const mentees = tracks.filter(t => t.category !== "Transformation Champion").slice(0, 2);
        return <div key={champion.manager} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="flex-1"><div className="text-[15px] font-bold text-[var(--success)]">🏆 {champion.manager}</div><div className="text-[14px] text-[var(--text-muted)]">Champion (Score: {champion.average_score})</div></div>
          <div className="text-[var(--text-muted)]">→</div>
          <div className="flex-1 space-y-1">{mentees.map(m => <div key={m.manager} className="text-[15px]"><span className="font-semibold" style={{color: m.category === "Flight Risk" ? "var(--risk)" : "var(--warning)"}}>{m.manager}</span> <span className="text-[var(--text-muted)]">({m.category}, {m.average_score})</span></div>)}</div>
        </div>;
      })}</div>
    </Card>}

    <NextStepBar currentModuleId="mgrdev" onNavigate={onNavigate || onBack} />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   AI RECOMMENDATIONS ENGINE
   Generates actionable AI transformation recommendations from
   workforce data, readiness scores, and task impact analysis.
   ═══════════════════════════════════════════════════════════════ */

type Recommendation = {
  id: number;
  title: string;
  description: string;
  impact: number;
  effort: "Low" | "Medium" | "High";
  category: string;
  affectedRoles: string[];
  timeframe: string;
  kpis: string[];
};

export function AiRecommendationsEngine({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sortBy, setSortBy] = useState<"impact" | "effort">("impact");
  const [filterCat, setFilterCat] = useState("All");

  // Gather context data from multiple endpoints
  const generate = useCallback(async () => {
    if (!model) return;
    setLoading(true);
    try {
      const [overview, priority, readiness] = await Promise.all([
        api.getOverview(model, f),
        api.getAIPriority(model, f),
        api.getReadiness(model, f),
      ]);
      const ctx = JSON.stringify({
        employees: (overview as Record<string, unknown>)?.kpis,
        func_distribution: ((overview as Record<string, unknown>)?.func_distribution as unknown[] || []).slice(0, 8),
        top_tasks: ((priority as Record<string, unknown>)?.top10 as unknown[] || []).slice(0, 10),
        summary: (priority as Record<string, unknown>)?.summary,
        readiness_score: (readiness as Record<string, unknown>)?.score,
        readiness_tier: (readiness as Record<string, unknown>)?.tier,
        dimensions: (readiness as Record<string, unknown>)?.dimensions,
      }).slice(0, 4000);

      const raw = await callAI(
        "You are an AI transformation strategist. Return ONLY valid JSON, no markdown.",
        `Analyze this workforce data and generate 8 ranked AI transformation recommendations. Data: ${ctx}

Return JSON array: [{"id":1,"title":"short title","description":"2-3 sentence actionable recommendation","impact":85,"effort":"Low|Medium|High","category":"Automation|Augmentation|Upskilling|Process|Governance|Data","affectedRoles":["role1","role2"],"timeframe":"0-3mo|3-6mo|6-12mo|12-18mo","kpis":["metric to track"]}]

Rank by impact score (0-100). Make recommendations specific to this org's data, not generic advice. Cover a mix of quick wins, medium-term, and strategic bets.`
      );

      try {
        const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        setRecs(Array.isArray(parsed) ? parsed : []);
        setGenerated(true);
        showToast("🤖 AI recommendations generated");
      } catch {
        showToast("AI response wasn't in the expected format — try again");
      }
    } catch {
      showToast("Couldn't generate recommendations — check your data and try again");
    }
    setLoading(false);
  }, [model, f]);

  const categories = ["All", ...Array.from(new Set(recs.map(r => r.category)))];
  const sorted = [...recs]
    .filter(r => filterCat === "All" || r.category === filterCat)
    .sort((a, b) => sortBy === "impact" ? b.impact - a.impact : (a.effort === "Low" ? 0 : a.effort === "Medium" ? 1 : 2) - (b.effort === "Low" ? 0 : b.effort === "Medium" ? 1 : 2));

  const effortColor = (e: string) => e === "Low" ? "green" : e === "Medium" ? "amber" : "red";
  const impactGradient = (score: number) => score >= 80 ? "from-[#D4860A] to-[#E8C547]" : score >= 60 ? "from-[#C07030] to-[#D4860A]" : "from-[#A0522D] to-[#C07030]";

  return <div>
    <ContextStrip items={["AI-powered recommendations based on your workforce data, readiness scores, and task analysis."]} />
    <PageHeader icon="🤖" title="AI Recommendations Engine" subtitle="Actionable transformation recommendations ranked by impact" onBack={onBack} moduleId="recommendations" viewCtx={viewCtx} />

    {!generated && !loading && <Card>
      <div className="text-center py-12">
        <div className="text-5xl mb-4">🤖</div>
        <h3 className="text-[18px] font-bold font-heading text-[var(--text-primary)] mb-2">Generate AI Recommendations</h3>
        <p className="text-[15px] text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">
          AI will analyze your workforce data, AI readiness scores, and task-level impact analysis to generate
          ranked, actionable recommendations for your AI transformation journey.
        </p>
        <button onClick={generate} className="px-8 py-3 rounded-2xl text-[14px] font-bold text-white transition-all hover:translate-y-[-2px] hover:shadow-lg" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", boxShadow: "var(--shadow-2)" }}>
          🤖 Generate Recommendations
        </button>
      </div>
    </Card>}

    {loading && <Card><div className="text-center py-16"><LoadingBar /><div className="text-[15px] text-[var(--text-secondary)] mt-4">Analyzing workforce data and generating recommendations...</div></div></Card>}

    {generated && recs.length > 0 && <>
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KpiCard label="Recommendations" value={recs.length} />
        <KpiCard label="Avg Impact" value={`${Math.round(recs.reduce((s, r) => s + r.impact, 0) / recs.length)}/100`} accent />
        <KpiCard label="Quick Wins" value={recs.filter(r => r.effort === "Low").length} />
        <KpiCard label="Roles Affected" value={new Set(recs.flatMap(r => r.affectedRoles)).size} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2">
          {categories.map(c => <button key={c} onClick={() => setFilterCat(c)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold transition-all" style={{ border: filterCat === c ? "2px solid var(--accent-primary)" : "1px solid var(--border)", background: filterCat === c ? "rgba(212,134,10,0.08)" : "transparent", color: filterCat === c ? "var(--accent-primary)" : "var(--text-muted)" }}>{c}</button>)}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSortBy("impact")} className={`px-3 py-1.5 rounded-lg text-[15px] font-semibold ${sortBy === "impact" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>Sort by Impact</button>
          <button onClick={() => setSortBy("effort")} className={`px-3 py-1.5 rounded-lg text-[15px] font-semibold ${sortBy === "effort" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>Sort by Effort</button>
          <button onClick={generate} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5">↻ Regenerate</button>
        </div>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        {sorted.map((r, i) => <div key={r.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden transition-all hover:border-[var(--accent-primary)]/40 hover:translate-y-[-1px]" style={{ animation: `slideUp 0.3s ease-out ${i * 0.05}s both` }}>
          <div className="flex">
            {/* Impact score bar */}
            <div className={`w-20 shrink-0 flex flex-col items-center justify-center bg-gradient-to-b ${impactGradient(r.impact)}`}>
              <div className="text-[24px] font-extrabold font-data text-white">{r.impact}</div>
              <div className="text-[14px] font-bold text-white/70 uppercase tracking-wider">Impact</div>
            </div>
            {/* Content */}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider">#{i + 1}</span>
                    <Badge color={r.category === "Automation" ? "amber" : r.category === "Upskilling" ? "green" : r.category === "Governance" ? "purple" : "gray"}>{r.category}</Badge>
                    <Badge color={effortColor(r.effort)}>{r.effort} Effort</Badge>
                    <span className="text-[15px] text-[var(--text-muted)]">⏱ {r.timeframe}</span>
                  </div>
                  <h4 className="text-[15px] font-bold font-heading text-[var(--text-primary)]">{r.title}</h4>
                </div>
              </div>
              <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed mb-3">{r.description}</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] text-[var(--text-muted)] uppercase font-bold">Roles:</span>
                  {r.affectedRoles.slice(0, 4).map(role => <span key={role} className="text-[15px] bg-[var(--surface-2)] rounded px-2 py-0.5 text-[var(--text-secondary)]">{role}</span>)}
                  {r.affectedRoles.length > 4 && <span className="text-[15px] text-[var(--text-muted)]">+{r.affectedRoles.length - 4}</span>}
                </div>
                {r.kpis?.length > 0 && <div className="flex items-center gap-1.5">
                  <span className="text-[15px] text-[var(--text-muted)] uppercase font-bold">Track:</span>
                  {r.kpis.slice(0, 2).map(k => <span key={k} className="text-[15px] text-[var(--accent-primary)]">{k}</span>)}
                </div>}
              </div>
            </div>
          </div>
        </div>)}
      </div>
    </>}

    {generated && recs.length === 0 && <Empty text="No recommendations generated. Upload more workforce data and try again." />}

    <NextStepBar currentModuleId="recommendations" onNavigate={onNavigate || onBack} />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   ORG HEALTH SCORECARD — auto-calculated with benchmarks
   ═══════════════════════════════════════════════════════════════ */

export function OrgHealthScorecard({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [orgData] = useApiData(() => model ? api.getOrgDiagnostics(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);
  const [overviewData] = useApiData(() => model ? api.getOverview(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [benchIndustry, setBenchIndustry] = useState("technology");
  const [benchData, setBenchData] = useState<Record<string, Record<string, number | string>> | null>(null);

  const kpis = (orgData as Record<string, unknown>)?.kpis as Record<string, number> || {};
  const ovKpis = (overviewData as Record<string, unknown>)?.kpis as Record<string, unknown> || {};
  const layers = ((orgData as Record<string, unknown>)?.layers || []) as { name: string; value: number }[];
  const funcDist = ((overviewData as Record<string, unknown>)?.func_distribution || []) as { name: string; value: number }[];
  const empCount = Number(ovKpis.employees || 0);

  // Auto-detect industry from model name
  useEffect(() => {
    const m = (model || "").toLowerCase();
    const detected = ["financial_services", "healthcare", "manufacturing", "retail", "energy", "education", "legal", "professional_services"].find(i => m.includes(i.replace("_", " ")) || m.includes(i));
    if (detected) setBenchIndustry(detected);
  }, [model]);

  // Fetch benchmarks
  useEffect(() => {
    api.getBenchmarks(benchIndustry, empCount || 200).then(d => setBenchData(d as Record<string, Record<string, number | string>>));
  }, [benchIndustry, empCount]);

  const bm = (key: string) => {
    if (!benchData || !benchData[key]) return { industry_avg: 0, best_in_class: 0 };
    return benchData[key] as { industry_avg: number; best_in_class: number; optimal?: string };
  };

  const mgrIcRatio = kpis.managers && kpis.ics ? Math.round(kpis.ics / Math.max(kpis.managers, 1)) : 0;
  const mgrPer100 = empCount > 0 ? Math.round((kpis.managers || 0) / empCount * 100) : 0;

  // Compare value to benchmark: green if within 15% of industry avg, amber if within 30%, red if worse
  const compareStatus = (val: number, benchAvg: number, lowerIsBetter = false): "green" | "amber" | "red" => {
    if (benchAvg === 0) return "amber";
    const pctDiff = lowerIsBetter ? (val - benchAvg) / benchAvg : (benchAvg - val) / benchAvg;
    if (pctDiff <= 0.1) return "green";
    if (pctDiff <= 0.3) return "amber";
    return "red";
  };

  type Metric = { id: string; label: string; value: string | number; numValue: number; benchAvg: number; bestInClass: number; benchmark: string; status: "green" | "amber" | "red"; detail: string };
  const metrics: Metric[] = [
    { id: "span", label: "Avg Span of Control", value: kpis.avg_span || 0, numValue: kpis.avg_span || 0, benchAvg: Number(bm("span_of_control").industry_avg), bestInClass: Number(bm("span_of_control").best_in_class), benchmark: bm("span_of_control").optimal as string || "5-8", status: compareStatus(Math.abs((kpis.avg_span || 0) - Number(bm("span_of_control").industry_avg)), 2, true), detail: `Current span is ${kpis.avg_span || 0}. Industry avg: ${bm("span_of_control").industry_avg}. Best in class: ${bm("span_of_control").best_in_class}.` },
    { id: "layers", label: "Management Layers", value: kpis.layers || 0, numValue: kpis.layers || 0, benchAvg: Number(bm("mgmt_layers").industry_avg), bestInClass: Number(bm("mgmt_layers").best_in_class), benchmark: `${bm("mgmt_layers").industry_avg} avg`, status: (kpis.layers || 0) <= Number(bm("mgmt_layers").industry_avg) + 1 ? "green" : (kpis.layers || 0) <= Number(bm("mgmt_layers").industry_avg) + 3 ? "amber" : "red", detail: `${kpis.layers || 0} layers vs. industry avg ${bm("mgmt_layers").industry_avg}. Best in class: ${bm("mgmt_layers").best_in_class}.` },
    { id: "mgr_ratio", label: "Managers per 100", value: mgrPer100, numValue: mgrPer100, benchAvg: Number(bm("mgmt_ratio_per_100").industry_avg), bestInClass: Number(bm("mgmt_ratio_per_100").best_in_class), benchmark: `${bm("mgmt_ratio_per_100").industry_avg} avg`, status: compareStatus(mgrPer100, Number(bm("mgmt_ratio_per_100").industry_avg), true), detail: `${mgrPer100} managers per 100 employees. Industry avg: ${bm("mgmt_ratio_per_100").industry_avg}. Ratio 1:${mgrIcRatio}.` },
    { id: "ai_readiness", label: "AI Readiness", value: `${ovKpis.readiness_score || 0}/100`, numValue: Number(ovKpis.readiness_score || 0), benchAvg: Number(bm("ai_readiness").industry_avg), bestInClass: Number(bm("ai_readiness").best_in_class), benchmark: `${bm("ai_readiness").industry_avg} avg`, status: Number(ovKpis.readiness_score || 0) >= Number(bm("ai_readiness").industry_avg) ? "green" : Number(ovKpis.readiness_score || 0) >= Number(bm("ai_readiness").industry_avg) * 0.7 ? "amber" : "red", detail: `Score: ${ovKpis.readiness_score || 0}. Industry avg: ${bm("ai_readiness").industry_avg}. Best in class: ${bm("ai_readiness").best_in_class}.` },
    { id: "high_ai", label: "High AI Impact %", value: `${ovKpis.high_ai_pct || 0}%`, numValue: Number(ovKpis.high_ai_pct || 0), benchAvg: Number(bm("high_ai_impact_pct").industry_avg), bestInClass: Number(bm("high_ai_impact_pct").best_in_class), benchmark: `${bm("high_ai_impact_pct").industry_avg}% avg`, status: Number(ovKpis.high_ai_pct || 0) >= 20 && Number(ovKpis.high_ai_pct || 0) <= 55 ? "green" : "amber", detail: `${ovKpis.high_ai_pct || 0}% high AI vs. industry avg ${bm("high_ai_impact_pct").industry_avg}%.` },
    { id: "roles", label: "Unique Roles", value: ovKpis.roles || 0, numValue: Number(ovKpis.roles || 0), benchAvg: 0, bestInClass: 0, benchmark: "1:15-20 per HC", status: (empCount / Math.max(Number(ovKpis.roles || 1), 1)) >= 10 ? "green" : "amber", detail: `${ovKpis.roles || 0} roles for ${empCount} employees (1:${Math.round(empCount / Math.max(Number(ovKpis.roles || 1), 1))}).` },
  ];

  const statusColor = (s: string) => s === "green" ? "var(--success)" : s === "amber" ? "var(--warning)" : "var(--risk)";
  const overallScore = Math.round(metrics.filter(m => m.status === "green").length / metrics.length * 100);

  // Radar chart data for benchmark comparison
  const radarData = [
    { subject: "Span", yours: Math.min(100, ((kpis.avg_span || 0) / 12) * 100), industry: Math.min(100, (Number(bm("span_of_control").industry_avg) / 12) * 100), best: Math.min(100, (Number(bm("span_of_control").best_in_class) / 12) * 100), max: 100 },
    { subject: "AI Ready", yours: Number(ovKpis.readiness_score || 0), industry: Number(bm("ai_readiness").industry_avg), best: Number(bm("ai_readiness").best_in_class), max: 100 },
    { subject: "AI Impact", yours: Number(ovKpis.high_ai_pct || 0), industry: Number(bm("high_ai_impact_pct").industry_avg), best: Number(bm("high_ai_impact_pct").best_in_class), max: 100 },
    { subject: "Mobility", yours: 15, industry: Number(bm("internal_mobility_pct").industry_avg), best: Number(bm("internal_mobility_pct").best_in_class), max: 40 },
    { subject: "Training", yours: 35, industry: Number(bm("training_hrs_per_year").industry_avg), best: Number(bm("training_hrs_per_year").best_in_class), max: 60 },
    { subject: "Tenure", yours: 4, industry: Number(bm("avg_tenure_years").industry_avg), best: Number(bm("avg_tenure_years").best_in_class), max: 8 },
  ].map(d => ({ ...d, yours: Math.round(d.yours / Math.max(d.max, 1) * 100), industry: Math.round(d.industry / Math.max(d.max, 1) * 100), best: Math.round(d.best / Math.max(d.max, 1) * 100) }));

  const benchIndustryLabel = (benchData as Record<string, unknown>)?.industry as string || benchIndustry;

  return <div>
    <ContextStrip items={[`${metrics.filter(m => m.status === "green").length}/${metrics.length} metrics within benchmarks · vs. ${benchIndustryLabel} · Overall health: ${overallScore}%`]} />
    <PageHeader icon="🏥" title="Org Health Scorecard" subtitle="Auto-calculated metrics with industry benchmarks" onBack={onBack} moduleId="orghealth" viewCtx={viewCtx} />

    {empCount === 0 && <div className="mb-4 px-4 py-3 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/5"><span className="text-[15px] text-[var(--warning)] font-semibold">⚠ No workforce data loaded.</span><span className="text-[15px] text-[var(--text-secondary)] ml-2">Upload employee data to populate your org metrics. Industry benchmarks are shown below for reference.</span></div>}

    {/* Benchmark industry selector */}
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[15px] font-bold text-[var(--text-muted)] uppercase">Compare against:</span>
      <select value={benchIndustry} onChange={e => setBenchIndustry(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[15px] text-[var(--text-primary)]">
        {["technology","financial_services","healthcare","retail","manufacturing","professional_services","energy","education","legal"].map(i => <option key={i} value={i}>{i.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
      </select>
      <span className="text-[15px] text-[var(--text-muted)]">({empCount > 0 ? empCount < 500 ? "Small" : empCount <= 5000 ? "Mid" : "Large" : "—"} tier)</span>
    </div>

    {/* Overall score */}
    <div className="flex items-center gap-4 mb-5">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-[28px] font-black font-data" style={{ background: `${overallScore >= 70 ? "var(--success)" : overallScore >= 40 ? "var(--warning)" : "var(--risk)"}15`, color: overallScore >= 70 ? "var(--success)" : overallScore >= 40 ? "var(--warning)" : "var(--risk)", border: `2px solid ${overallScore >= 70 ? "var(--success)" : overallScore >= 40 ? "var(--warning)" : "var(--risk)"}40` }}>{overallScore}%</div>
      <div><div className="text-[16px] font-bold text-[var(--text-primary)] font-heading">Organizational Health</div><div className="text-[15px] text-[var(--text-secondary)]">{metrics.filter(m => m.status === "green").length} passing, {metrics.filter(m => m.status === "amber").length} warnings, {metrics.filter(m => m.status === "red").length} critical vs. {benchIndustryLabel} benchmarks</div></div>
    </div>

    {/* Metric cards — with benchmark comparison */}
    <div className="grid grid-cols-3 gap-4 mb-5">
      {metrics.map(m => <div key={m.id} onClick={() => setExpandedMetric(expandedMetric === m.id ? null : m.id)} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 cursor-pointer card-hover hover:border-[var(--accent-primary)]/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{m.label}</span>
          <div className="w-3 h-3 rounded-full" style={{ background: statusColor(m.status) }} />
        </div>
        <div className="text-[22px] font-extrabold font-data text-[var(--text-primary)] mb-1">{m.value}</div>
        {/* Inline benchmark comparison */}
        {m.benchAvg > 0 && <div className="flex items-center gap-2 text-[15px] mb-1">
          <span className="text-[var(--text-muted)]">Industry avg:</span>
          <span className="font-data font-semibold text-[var(--text-secondary)]">{m.benchAvg}{m.id === "high_ai" ? "%" : ""}</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[var(--text-muted)]">Best:</span>
          <span className="font-data font-semibold" style={{ color: "var(--success)" }}>{m.bestInClass}{m.id === "high_ai" ? "%" : ""}</span>
        </div>}
        <div className="text-[15px] text-[var(--text-muted)]">Benchmark: {m.benchmark}</div>
        {expandedMetric === m.id && <div className="mt-3 pt-3 border-t border-[var(--border)] text-[15px] text-[var(--text-secondary)] leading-relaxed animate-tab-enter">{m.detail}</div>}
      </div>)}
    </div>

    {/* Benchmark Comparison Radar — CHRO slide-worthy */}
    <Card title={`Benchmark Comparison — Your Org vs. ${benchIndustryLabel}`}>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <ExpandableChart title="Benchmark Comparison"><ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Your Org" dataKey="yours" stroke="#D4860A" fill="#D4860A" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="Industry Avg" dataKey="industry" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.08} strokeWidth={2} strokeDasharray="6 4" />
              <Radar name="Best in Class" dataKey="best" stroke="#10B981" fill="#10B981" fillOpacity={0.05} strokeWidth={1.5} strokeDasharray="3 3" />
              <Tooltip contentStyle={{ ...TT }} />
              <Legend wrapperStyle={{ fontSize: 15 }} />
            </RadarChart>
          </ResponsiveContainer></ExpandableChart>
        </div>
        <div className="col-span-5 flex flex-col justify-center">
          <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Dimension Breakdown</div>
          {radarData.map(d => {
            const delta = d.yours - d.industry;
            const color = delta >= 5 ? "var(--success)" : delta >= -5 ? "var(--warning)" : "var(--risk)";
            return <div key={d.subject} className="flex items-center gap-2 mb-2">
              <span className="text-[15px] text-[var(--text-secondary)] w-16">{d.subject}</span>
              <div className="flex-1 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden relative">
                <div className="h-full rounded-full" style={{ width: `${d.yours}%`, background: "var(--accent-primary)" }} />
                <div className="absolute top-0 h-full w-0.5" style={{ left: `${d.industry}%`, background: "#3B82F6" }} />
              </div>
              <span className="text-[15px] font-data w-12 text-right font-semibold" style={{ color }}>{delta >= 0 ? "+" : ""}{delta}%</span>
            </div>;
          })}
        </div>
      </div>
    </Card>

    {/* Distribution charts */}
    <div className="grid grid-cols-2 gap-4">
      {layers.length > 0 && <Card title="Level Distribution">
        <div className="space-y-1.5">{layers.sort((a, b) => a.name.localeCompare(b.name)).map(l => <div key={l.name} className="flex items-center gap-2">
          <span className="text-[15px] font-data text-[var(--text-muted)] w-8">{l.name}</span>
          <div className="flex-1 h-3 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(l.value / Math.max(...layers.map(x => x.value), 1)) * 100}%`, background: "var(--accent-primary)" }} /></div>
          <span className="text-[15px] font-data text-[var(--text-secondary)] w-8 text-right">{l.value}</span>
        </div>)}</div>
      </Card>}
      {funcDist.length > 0 && <Card title="Function Size">
        <div className="space-y-1.5">{funcDist.map(fd => <div key={fd.name} className="flex items-center gap-2">
          <span className="text-[15px] text-[var(--text-secondary)] w-28 truncate">{fd.name}</span>
          <div className="flex-1 h-3 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(fd.value / Math.max(...funcDist.map(x => x.value), 1)) * 100}%`, background: "var(--accent-primary)" }} /></div>
          <span className="text-[15px] font-data text-[var(--text-secondary)] w-8 text-right">{fd.value}</span>
        </div>)}</div>
      </Card>}
    </div>

    <NextStepBar currentModuleId="snapshot" onNavigate={onNavigate || onBack} />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   AI IMPACT HEATMAP — function × family matrix
   ═══════════════════════════════════════════════════════════════ */

export function AIImpactHeatmap({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{function: string; family: string; score: number; impact: string; tasks: number; roles: string[]} | null>(null);

  useEffect(() => {
    if (!model) return;
    setLoading(true);
    api.getAIHeatmap(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [model, f.func, f.jf, f.sf, f.cl]);

  const cells = ((data as Record<string, unknown>)?.cells || []) as {function: string; family: string; score: number; impact: string; tasks: number; high_tasks: number; roles: string[]}[];
  const functions = ((data as Record<string, unknown>)?.functions || []) as string[];
  const families = ((data as Record<string, unknown>)?.families || []) as string[];

  const cellColor = (score: number) => score >= 6 ? "rgba(239,68,68,0.7)" : score >= 3.5 ? "rgba(245,158,11,0.6)" : "rgba(16,185,129,0.5)";
  const getCell = (func: string, fam: string) => cells.find(c => c.function === func && c.family === fam);

  return <div>
    <ContextStrip items={[`${cells.length} intersections analyzed · ${cells.filter(c => c.impact === "High").length} high-impact zones`]} />
    <PageHeader icon="🔥" title="AI Impact Heatmap" subtitle="Automation potential by function and job family" onBack={onBack} moduleId="heatmap" viewCtx={viewCtx} />
    {loading && <><LoadingBar /><div className="mt-4 space-y-4"><SkeletonKpiRow count={4} /><SkeletonTable rows={6} cols={6} /></div></>}

    {cells.length === 0 && !loading && <Empty text="Upload work design data with Function and Job Family columns to generate the heatmap" icon="🔥" />}

    {cells.length > 0 && <div className="flex gap-4">
      <div className="flex-1 overflow-x-auto">
        <Card title="Impact Matrix">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr>
                <th className="px-2 py-2 text-left text-[15px] text-[var(--text-muted)] font-bold uppercase sticky left-0 bg-[var(--surface-1)]">Function</th>
                {families.map(fam => <th key={fam} className="px-2 py-2 text-center text-[14px] text-[var(--text-muted)] font-bold" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", maxWidth: 30 }}>{fam}</th>)}
              </tr></thead>
              <tbody>{functions.map(func => <tr key={func}>
                <td className="px-2 py-1.5 text-[15px] text-[var(--text-secondary)] font-semibold whitespace-nowrap sticky left-0 bg-[var(--surface-1)]">{func}</td>
                {families.map(fam => {
                  const cell = getCell(func, fam);
                  return <td key={fam} className="p-0.5"><div onClick={() => cell && setSelectedCell(cell)} className="w-8 h-8 rounded-md flex items-center justify-center text-[15px] font-bold cursor-pointer transition-all hover:scale-110" style={{ background: cell ? cellColor(cell.score) : "var(--surface-2)", color: cell ? "#fff" : "var(--text-muted)" }}>{cell ? cell.score.toFixed(0) : ""}</div></td>;
                })}
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[15px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(16,185,129,0.5)" }} /> Low (0-3.5)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(245,158,11,0.6)" }} /> Moderate (3.5-6)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(239,68,68,0.7)" }} /> High (6-10)</span>
          </div>
        </Card>
      </div>

      {/* Detail panel */}
      {selectedCell && <div className="w-72 shrink-0 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-4 animate-slide-right">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[15px] font-bold text-[var(--text-primary)] font-heading">Cell Detail</h4>
          <button onClick={() => setSelectedCell(null)} className="text-[var(--text-muted)] text-sm">✕</button>
        </div>
        <div className="text-[15px] text-[var(--accent-primary)] font-semibold mb-1">{selectedCell.function} × {selectedCell.family}</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center"><div className="text-[16px] font-bold font-data" style={{ color: cellColor(selectedCell.score) }}>{selectedCell.score}</div><div className="text-[15px] text-[var(--text-muted)] uppercase">AI Score</div></div>
          <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center"><div className="text-[16px] font-bold font-data text-[var(--text-primary)]">{selectedCell.tasks}</div><div className="text-[15px] text-[var(--text-muted)] uppercase">Tasks</div></div>
        </div>
        <Badge color={selectedCell.impact === "High" ? "red" : selectedCell.impact === "Moderate" ? "amber" : "green"}>{selectedCell.impact} Impact</Badge>
        {selectedCell.roles.length > 0 && <div className="mt-3"><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-1">Roles</div><div className="space-y-1">{selectedCell.roles.map(r => <div key={r} className="text-[15px] text-[var(--text-secondary)] bg-[var(--surface-2)] rounded px-2 py-1">{r}</div>)}</div></div>}
      </div>}
    </div>}

    <NextStepBar currentModuleId="scan" onNavigate={onNavigate || onBack} />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   ROLE CLUSTERING — group similar roles by task overlap
   ═══════════════════════════════════════════════════════════════ */

export function RoleClustering({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);

  useEffect(() => {
    if (!model) return;
    setLoading(true);
    api.getRoleClusters(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [model, f.func, f.jf, f.sf, f.cl]);

  const clusters = ((data as Record<string, unknown>)?.clusters || []) as { name: string; function: string; family: string; roles: string[]; size: number; headcount: number; avg_overlap: number; consolidation_candidate: boolean; shared_skills: string[]; highest_pair: [string, string, number] | null }[];
  const opportunities = ((data as Record<string, unknown>)?.opportunities || []) as { role_a: string; role_b: string; similarity: number; headcount_affected: number; estimated_savings: number; impact: string; risk: string }[];
  const summary = ((data as Record<string, unknown>)?.summary || {}) as Record<string, unknown>;
  const pairs = ((data as Record<string, unknown>)?.pairs || []) as { role_a: string; role_b: string; similarity: number }[];

  const funcColors: Record<string, string> = { Technology: "#0891B2", Finance: "#D4860A", HR: "#8B5CF6", Operations: "#F59E0B", Marketing: "#EC4899", Legal: "#EF4444", Sales: "#6366F1", Product: "#10B981" };

  return <div>
    <ContextStrip items={[clusters.length > 0 ? `${summary.total_clusters || clusters.length} clusters · ${summary.consolidation_opportunities || 0} consolidation opportunities · ${summary.roles_affected || 0} roles affected` : "Analyzing role similarity..."]} />
    <PageHeader icon="🔗" title="Role Clustering" subtitle="Identify similar roles, consolidation candidates, and redundancies" onBack={onBack} moduleId="clusters" viewCtx={viewCtx} />
    {loading && <><LoadingBar /><div className="mt-4 space-y-4"><SkeletonKpiRow count={5} /><SkeletonTable rows={5} cols={4} /></div></>}

    {clusters.length === 0 && !loading && <Empty text="No clusters found. Upload work design data with task characteristics." icon="🔗" />}

    {/* KPIs */}
    {clusters.length > 0 && <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Clusters" value={Number(summary.total_clusters || clusters.length)} />
      <KpiCard label="Consolidation Opps" value={Number(summary.consolidation_opportunities || 0)} accent />
      <KpiCard label="Potential Savings" value={fmtNum(Number(summary.potential_savings || 0))} />
      <KpiCard label="Roles Affected" value={`${summary.roles_affected || 0}/${summary.total_roles || 0}`} />
      <KpiCard label="Highest Overlap" value={pairs.length > 0 ? `${pairs[0].similarity}%` : "—"} />
    </div>}

    {/* Cluster cards */}
    <div className="space-y-4 mb-6">
      {clusters.map((c, i) => {
        const isExpanded = expandedCluster === i;
        const funcColor = funcColors[c.function] || "var(--text-muted)";
        return <div key={i} className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface-1)", borderColor: c.consolidation_candidate ? "rgba(239,68,68,0.3)" : "var(--border)", boxShadow: "var(--shadow-1)" }}>
          <button onClick={() => setExpandedCluster(isExpanded ? null : i)} className="w-full px-5 py-4 text-left flex items-center justify-between transition-all hover:bg-[var(--hover)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-bold text-white shrink-0" style={{ background: funcColor }}>{c.size}</div>
              <div>
                <div className="text-[16px] font-bold text-[var(--text-primary)] font-heading">{c.name}</div>
                <div className="text-[13px] text-[var(--text-muted)]">{c.headcount} employees · {c.roles.length} roles</div>
              </div>
              {c.consolidation_candidate && <Badge color="red">Consolidation</Badge>}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right"><div className="text-[18px] font-extrabold font-data" style={{ color: c.avg_overlap >= 70 ? "var(--risk)" : c.avg_overlap >= 50 ? "var(--warning)" : "var(--success)" }}>{c.avg_overlap}%</div><div className="text-[11px] text-[var(--text-muted)]">overlap</div></div>
              <span className="text-[var(--text-muted)]">{isExpanded ? "▾" : "▸"}</span>
            </div>
          </button>
          {isExpanded && <div className="px-5 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
            {/* Roles in cluster */}
            <div className="flex flex-wrap gap-2">{c.roles.map(r => <span key={r} className="px-3 py-1.5 rounded-xl text-[14px] font-semibold text-[var(--text-primary)]" style={{ background: `${funcColor}10`, border: `1px solid ${funcColor}25` }}>{r}</span>)}</div>
            {/* Shared skills */}
            {c.shared_skills.length > 0 && <div><span className="text-[13px] text-[var(--text-muted)]">Shared skills: </span>{c.shared_skills.map(s => <span key={s} className="text-[13px] text-[var(--text-secondary)] mr-2">{s}</span>)}</div>}
            {/* Highest overlap pair */}
            {c.highest_pair && <div className="rounded-xl p-3 border border-[var(--border)] bg-[var(--surface-2)]">
              <div className="text-[13px] text-[var(--text-muted)] mb-1">Highest overlap within cluster:</div>
              <div className="text-[15px] font-semibold text-[var(--text-primary)]">{c.highest_pair[0]} ↔ {c.highest_pair[1]}: <span className="font-data" style={{ color: "var(--risk)" }}>{c.highest_pair[2]}%</span></div>
            </div>}
          </div>}
        </div>;
      })}
    </div>

    {/* Consolidation Opportunities */}
    {opportunities.length > 0 && <Card title="Consolidation Opportunities">
      <div className="text-[15px] text-[var(--text-secondary)] mb-4">Roles with highest similarity — potential for merging to reduce redundancy and save cost.</div>
      <div className="space-y-3">{opportunities.filter(o => o.impact === "High" || o.impact === "Medium").map((o, i) => {
        const impactColors: Record<string, string> = { High: "var(--risk)", Medium: "var(--warning)", Low: "var(--text-muted)" };
        return <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">{o.impact === "High" ? "🔴" : "🟡"}</span>
              <span className="text-[15px] font-bold text-[var(--text-primary)]">Merge: {o.role_a} + {o.role_b}</span>
              <span className="text-[14px] font-data font-bold" style={{ color: impactColors[o.impact] }}>{o.similarity}% similar</span>
            </div>
            <Badge color={o.impact === "High" ? "red" : "amber"}>{o.impact} Impact</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 text-[14px]">
            <div><span className="text-[var(--text-muted)]">Employees affected: </span><span className="font-bold">{o.headcount_affected}</span></div>
            <div><span className="text-[var(--text-muted)]">Est. savings: </span><span className="font-bold text-[var(--success)]">{fmtNum(o.estimated_savings)}</span></div>
            <div><span className="text-[var(--text-muted)]">Risk: </span><span className="font-bold" style={{ color: o.risk === "Low" ? "var(--success)" : "var(--warning)" }}>{o.risk}</span></div>
          </div>
        </div>;
      })}</div>
    </Card>}

    {/* Top pairs */}
    {pairs.length > 0 && <Card title="Role Similarity Pairs">
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
        <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Role A</th>
        <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">↔</th>
        <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Role B</th>
        <th className="px-3 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Similarity</th>
      </tr></thead><tbody>{pairs.slice(0, 15).map((p, i) => <tr key={i} className="border-b border-[var(--border)]">
        <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{p.role_a}</td>
        <td className="px-2 py-2 text-center text-[var(--text-muted)]">↔</td>
        <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{p.role_b}</td>
        <td className="px-3 py-2 text-center"><span className="font-bold font-data" style={{ color: p.similarity >= 75 ? "var(--risk)" : p.similarity >= 60 ? "var(--warning)" : "var(--success)" }}>{p.similarity}%</span></td>
      </tr>)}</tbody></table></div>
    </Card>}

    <NextStepBar currentModuleId="clusters" onNavigate={onNavigate || onBack} />
  </div>;
}
