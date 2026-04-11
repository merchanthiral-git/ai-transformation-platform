"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "./shared";


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

    {sub === "ai" && (() => { const s = (data?.summary ?? {}) as Record<string, unknown>; const top10 = (data?.top10 ?? []) as Record<string, unknown>[]; const quickWins = top10.filter(t => String(t["AI Impact"] || t.ai_impact || "").toLowerCase() === "high" && (Number(t["Current Time Spent %"] || t.time_pct || 0) >= 10) && String(t["Logic"] || t.logic || "").toLowerCase() === "deterministic"); return <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Tasks Scored" value={s.tasks_scored as number ?? 0} /><KpiCard label="Quick Wins" value={quickWins.length || (s.quick_wins as number ?? 0)} accent /><KpiCard label="Time Impact" value={`${s.total_time_impact ?? 0}h/wk`} /><KpiCard label="Avg Risk" value={s.avg_risk as number ?? 0} /></div>
      {/* Quick Wins Panel */}
      {quickWins.length > 0 && <div className="bg-gradient-to-r from-[rgba(16,185,129,0.06)] to-transparent border border-[rgba(16,185,129,0.15)] rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3"><span className="text-lg">⚡</span><span className="text-[14px] font-bold text-[var(--success)]">Quick Wins — Automate Now</span><Badge color="green">{quickWins.length} tasks</Badge></div>
        <div className="text-[12px] text-[var(--text-secondary)] mb-3">These tasks are High AI Impact + Deterministic logic + ≥10% of work time. They can be automated with minimal risk and maximum ROI.</div>
        <div className="space-y-2">{quickWins.slice(0, 6).map((t, i) => {
          const taskName = String(t["Task Name"] || t.task || "");
          const timePct = Number(t["Current Time Spent %"] || t.time_pct || 0);
          const role = String(t["Job Title"] || t.role || "");
          const pSkill = String(t["Primary Skill"] || t.primary_skill || "");
          return <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="w-7 h-7 rounded-full bg-[var(--success)]/10 flex items-center justify-center text-[12px] font-bold text-[var(--success)]">{i + 1}</div>
            <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{taskName}</div><div className="text-[10px] text-[var(--text-muted)]">{role} · {pSkill}</div></div>
            <div className="text-right shrink-0"><div className="text-[14px] font-extrabold text-[var(--success)]">{timePct}%</div><div className="text-[9px] text-[var(--text-muted)]">of work time</div></div>
            <Badge color="green">Automate</Badge>
          </div>;
        })}</div>
        <div className="mt-3 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">Total automatable time: {quickWins.reduce((sum, t) => sum + Number(t["Current Time Spent %"] || t.time_pct || 0), 0)}% of combined role time → est. {Math.round(quickWins.reduce((sum, t) => sum + Number(t["Current Time Spent %"] || t.time_pct || 0), 0) * 0.6 * 40 / 100)} hrs/week freed</div>
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
export function SkillsTalent({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [tab, setTab] = useState("inventory");
  const [invData, setInvData] = useState<Record<string, unknown> | null>(null);
  const [gapData, setGapData] = useState<Record<string, unknown> | null>(null);
  const [adjData, setAdjData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
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
    {loading && <LoadingBar />}
    {!loading && employees.length === 0 && validationErrors.length === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🧠</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">No Skills Data Yet</h3><p className="text-[13px] text-[var(--text-secondary)]">Upload workforce data to see skills inventory, or select Demo_Model.</p></div>}

    {/* Validation errors */}
    {validationErrors.map((err, i) => <div key={i} className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-2 text-[12px] text-[var(--warning)]">⚠ {err}</div>)}
    {Boolean(gapSummary.wdl_connected) && <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-2 text-[12px] text-[var(--success)]">✓ Connected to Work Design Lab — gap targets derived from your task reconstruction</div>}

    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Employees" value={employees.length} accent /><KpiCard label="Skills Tracked" value={skills.length} /><KpiCard label="Coverage" value={`${coverage}%`} accent /><KpiCard label="Critical Gaps" value={Number(gapSummary.critical_gaps || 0)} /><KpiCard label="Fillable" value={`${Number(adjSummary.fillable_internally || 0)}/${Number(adjSummary.target_roles || 0)}`} />
    </div>

    <TabBar tabs={[
      { id: "inventory", label: "Skills Inventory" },
      { id: "gap", label: `Gap Analysis${!confirmed ? " 🔒" : ""}` },
      { id: "adjacency", label: `Adjacency Map${!confirmed ? " 🔒" : ""}` },
      { id: "taxonomy", label: "📖 Taxonomy" },
    ]} active={tab} onChange={setTab} />

    {/* ═══ TAB 1: SKILLS INVENTORY ═══ */}
    {tab === "inventory" && <div>
      <Card title="Proficiency Grid">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input value={skillFilter} onChange={e => setSkillFilter(e.target.value)} placeholder="Filter skills..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--text-primary)] outline-none w-40 placeholder:text-[var(--text-muted)]" />
            {dedupSuggestions.length > 0 && <button onClick={() => setShowDedup(!showDedup)} className="text-[11px] text-[var(--warning)] font-semibold">⚠ {dedupSuggestions.length} potential duplicates</button>}
            <button onClick={() => { const lv = prompt("Bulk-assign proficiency (1-4) to all empty cells:"); if (lv && [1,2,3,4].includes(Number(lv))) { const ne: Record<string,number> = {}; employees.forEach(e => { filteredSkills.forEach(s => { if (getProf(e,s)===0) ne[`${e}__${s}`]=Number(lv); }); }); setEditedScores(prev => ({...prev,...ne})); showToast(`Assigned ${Object.keys(ne).length} empty cells to level ${lv}`); } }} className="text-[11px] text-[var(--accent-primary)] font-semibold hover:underline cursor-pointer">Bulk-fill empties</button>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(editedScores).length > 0 && <span className="text-[10px] text-[var(--success)]">✎ {Object.keys(editedScores).length} edits</span>}
            {!confirmed ? <button onClick={() => { setConfirmed(true); showToast("✓ Skills inventory confirmed — Gap Analysis unlocked"); logDec("Skills", "Inventory Confirmed", `${employees.length} employees × ${skills.length} skills confirmed`); }} className="px-4 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>✓ Confirm Inventory</button> : <Badge color="green">✓ Confirmed</Badge>}
          </div>
        </div>

        {/* Dedup suggestions */}
        {showDedup && dedupSuggestions.length > 0 && <div className="bg-[rgba(245,158,11,0.06)] border border-[var(--warning)]/20 rounded-lg p-3 mb-3"><div className="text-[11px] font-bold text-[var(--warning)] mb-2">Potential Duplicate Skills — Consider merging:</div>{dedupSuggestions.map((d, i) => <div key={i} className="flex items-center gap-2 text-[11px] py-1"><span className="text-[var(--text-primary)]">"{d.skill_a}"</span><span className="text-[var(--text-muted)]">↔</span><span className="text-[var(--text-primary)]">"{d.skill_b}"</span><Badge color="amber">{d.similarity}% similar</Badge></div>)}</div>}

        {/* Proficiency grid */}
        <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 480 }}>
          <table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0 z-10">
            <th className="px-2 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-20 min-w-[130px]">Employee</th>
            {filteredSkills.slice(0, 15).map(s => <th key={s} className="px-0.5 py-1 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)] min-w-[55px]"><div style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", height: 75, fontSize: 9 }}>{s}</div></th>)}
          </tr></thead>
          <tbody>{employees.slice(empPage * EMP_PAGE_SIZE, (empPage + 1) * EMP_PAGE_SIZE).map(emp => <tr key={emp} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
            <td className="px-2 py-1 font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--surface-1)] z-10 border-r border-[var(--border)] truncate" style={{ maxWidth: 130 }}>{emp}</td>
            {filteredSkills.slice(0, 15).map(s => { const p = getProf(emp, s); const key = `${emp}__${s}`; const edited = editedScores[key] !== undefined; return <td key={s} className="px-0.5 py-0.5 text-center"><button title={`${s}: ${profLabel(p)} (${p}/4)\nClick to change`} onClick={() => setEditedScores(prev => ({ ...prev, [key]: p >= 4 ? 0 : p + 1 }))} className="w-6 h-6 rounded text-[9px] font-bold transition-all" style={{ background: p ? `${profColor(p)}20` : "var(--surface-2)", color: p ? profColor(p) : "var(--text-muted)", border: `1px solid ${edited ? "var(--accent-primary)" : (p ? profColor(p) + "30" : "var(--border)")}`, outline: edited ? "1px solid var(--accent-primary)" : "none" }}>{p || "·"}</button></td>; })}
          </tr>)}</tbody></table>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-3 text-[9px] text-[var(--text-muted)]">{["1=Novice","2=Developing","3=Proficient","4=Expert","·=No data"].map(l => <span key={l}>{l}</span>)}</div>
          {employees.length > EMP_PAGE_SIZE && <div className="flex items-center gap-2">
          <button onClick={() => setEmpPage(p => Math.max(0, p-1))} disabled={empPage === 0} className="px-2 py-1 rounded text-[10px] bg-[var(--surface-2)] border border-[var(--border)] disabled:opacity-30">← Prev</button>
          <span className="text-[10px] text-[var(--text-muted)]">{empPage * EMP_PAGE_SIZE + 1}-{Math.min((empPage+1) * EMP_PAGE_SIZE, employees.length)} of {employees.length}</span>
          <button onClick={() => setEmpPage(p => p+1)} disabled={(empPage+1) * EMP_PAGE_SIZE >= employees.length} className="px-2 py-1 rounded text-[10px] bg-[var(--surface-2)] border border-[var(--border)] disabled:opacity-30">Next →</button>
        </div>}
        </div>
      </Card>

      {/* Skill clusters */}
      {Object.keys(clusters).length > 0 && <Card title="Skill Clusters — Average Proficiency">
        <div className="grid grid-cols-3 gap-4">{Object.entries(clusters).map(([cluster, clusterSkills]) => {
          const avg = clusterSkills.reduce((sum, s) => { const recs = records.filter(r => r.skill === s); return sum + (recs.length ? recs.reduce((a, r) => a + r.proficiency, 0) / recs.length : 0); }, 0) / Math.max(clusterSkills.length, 1);
          return <div key={cluster} className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-3"><span className="text-[13px] font-bold text-[var(--text-primary)]">{cluster}</span><span className="text-[18px] font-extrabold" style={{ color: avg >= 3 ? "var(--success)" : avg >= 2 ? "var(--warning)" : "var(--risk)" }}>{avg.toFixed(1)}</span></div>
            <div className="space-y-1.5">{clusterSkills.map(s => { const recs = records.filter(r => r.skill === s); const sAvg = recs.length ? recs.reduce((a, r) => a + r.proficiency, 0) / recs.length : 0; const assessed = recs.length; return <div key={s} className="flex items-center justify-between text-[11px]"><span className="text-[var(--text-secondary)] truncate flex-1 mr-2">{s}</span><div className="flex items-center gap-1.5"><span className="text-[9px] text-[var(--text-muted)]">{assessed}emp</span><div className="w-14 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(sAvg / 4) * 100}%`, background: sAvg >= 3 ? "var(--success)" : sAvg >= 2 ? "var(--warning)" : "var(--risk)" }} /></div><span className="text-[9px] w-5 text-right font-semibold" style={{ color: sAvg >= 3 ? "var(--success)" : sAvg >= 2 ? "var(--warning)" : "var(--risk)" }}>{sAvg.toFixed(1)}</span></div></div>; })}</div>
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
      {!confirmed ? <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🔒</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Confirm Skills Inventory First</h3><p className="text-[13px] text-[var(--text-secondary)] mb-4">Go to the Inventory tab and click "Confirm Inventory" to unlock Gap Analysis.</p><button onClick={() => { setTab("inventory"); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]">← Go to Inventory</button></div> : <>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total Skills" value={Number(gapSummary.total_skills || 0)} /><KpiCard label="Critical Gaps" value={Number(gapSummary.critical_gaps || 0)} accent /><KpiCard label="Avg Gap" value={String(Number(gapSummary.avg_gap || 0).toFixed(1))} /><KpiCard label="Largest Gap" value={String(gapSummary.largest_gap_skill || "—")} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">{(["skill", "individual"] as const).map(v => <button key={v} onClick={() => setGapView(v)} className="px-3 py-1 rounded-lg text-[11px] font-semibold" style={{ background: gapView === v ? "var(--accent-primary)" : "var(--surface-2)", color: gapView === v ? "#fff" : "var(--text-muted)" }}>{v === "skill" ? "By Skill" : "By Employee"}</button>)}</div>
        <div className="text-[10px] text-[var(--text-muted)]">Set disposition per gap: what action to take</div>
      </div>

      {gapView === "skill" ? <>{model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="skills_gap" label="Gap Analysis" /></div>}
      <Card title="Gap Heatmap — Current vs Target Proficiency">
        <div className="space-y-2">{gaps.map(g => <div key={g.skill} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
          <span className="text-[12px] font-semibold w-40 shrink-0 text-[var(--text-primary)]">{g.skill}</span>
          <div className="flex-1">
            <div className="h-4 bg-[var(--bg)] rounded-full overflow-hidden relative">
              <div className="h-full rounded-full absolute left-0" style={{ width: `${(g.current_avg / 4) * 100}%`, background: g.severity === "Critical" ? "var(--risk)" : g.severity === "Moderate" ? "var(--warning)" : "var(--success)", opacity: 0.6 }} />
              <div style={{ position: "absolute", left: `${(g.target / 4) * 100}%`, top: 0, bottom: 0, width: 2, background: "var(--text-primary)" }} />
            </div>
            <div className="flex justify-between text-[9px] mt-0.5"><span className="text-[var(--text-muted)]">Current: {g.current_avg}</span><span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Target: {g.target} ({g.target_source})</span></div>
          </div>
          <div className="text-center shrink-0 w-14"><div className="text-[15px] font-extrabold" style={{ color: g.severity === "Critical" ? "var(--risk)" : g.severity === "Moderate" ? "var(--warning)" : "var(--success)" }}>-{g.delta}</div><div className="text-[8px]" style={{ color: g.severity === "Critical" ? "var(--risk)" : g.severity === "Moderate" ? "var(--warning)" : "var(--success)" }}>{g.severity}</div></div>
          <select value={gapDispositions[g.skill] || ""} onChange={e => setGapDispositions(prev => ({ ...prev, [g.skill]: e.target.value }))} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none w-32 shrink-0">
            <option value="">Disposition...</option>{dispOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>)}</div>
      </Card></> : <Card title="Individual Employee Gaps">
        {gaps.filter(g => g.severity !== "Low").slice(0, 5).map(g => <div key={g.skill} className="mb-4">
          <div className="flex items-center gap-2 mb-2"><span className="text-[13px] font-bold text-[var(--text-primary)]">{g.skill}</span><Badge color={g.severity === "Critical" ? "red" : "amber"}>{g.severity}</Badge><span className="text-[10px] text-[var(--text-muted)]">Target: {g.target}</span></div>
          <div className="grid grid-cols-5 gap-1">{g.employee_gaps.slice(0, 10).map(eg => <div key={eg.employee} className="bg-[var(--surface-2)] rounded-lg p-2 text-center border border-[var(--border)]">
            <div className="text-[10px] font-semibold text-[var(--text-primary)] truncate">{eg.employee}</div>
            <div className="text-[14px] font-extrabold mt-0.5" style={{ color: eg.delta > 1.5 ? "var(--risk)" : eg.delta > 0.5 ? "var(--warning)" : "var(--success)" }}>{eg.current}→{eg.target}</div>
            <div className="text-[8px]" style={{ color: eg.reskillable ? "var(--success)" : "var(--risk)" }}>{eg.reskillable ? "Reskillable" : "Hire needed"}</div>
          </div>)}</div>
        </div>)}
      </Card>}

      {/* Disposition summary */}
      {Object.keys(gapDispositions).length > 0 && <Card title="Gap Disposition Summary">
        <div className="grid grid-cols-4 gap-3">{dispOptions.map(d => { const count = Object.values(gapDispositions).filter(v => v === d).length; return <div key={d} className="bg-[var(--surface-2)] rounded-xl p-3 text-center border border-[var(--border)]"><div className="text-[20px] font-extrabold" style={{ color: dispColors[d] }}>{count}</div><div className="text-[10px] text-[var(--text-muted)]">{d}</div></div>; })}</div>
      </Card>}
      </>}
    </div>}

    {/* ═══ TAB 3: ADJACENCY MAP ═══ */}
    {tab === "adjacency" && <div>
      {!confirmed ? <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🔒</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Confirm Skills Inventory First</h3><p className="text-[13px] text-[var(--text-secondary)]">Complete the inventory to unlock adjacency mapping.</p></div> : <>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Target Roles" value={Number(adjSummary.target_roles || 0)} /><KpiCard label="Fillable" value={Number(adjSummary.fillable_internally || 0)} accent /><KpiCard label="Need External" value={Number(adjSummary.need_external || 0)} /><KpiCard label="Best Match" value={`${Number(adjSummary.avg_best_adjacency || 0)}%`} />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[12px] text-[var(--text-secondary)]">Threshold:</span>
        <input type="range" min={30} max={90} step={5} value={adjThreshold} onChange={e => setAdjThreshold(Number(e.target.value))} className="w-36" style={{ accentColor: "#D97706" }} />
        <span className="text-[13px] font-bold" style={{ color: adjThreshold >= 70 ? "var(--success)" : adjThreshold >= 50 ? "var(--warning)" : "var(--risk)" }}>{adjThreshold}%</span>
        <div className="flex gap-2 text-[9px]"><Badge color="green">≥70% Strong</Badge><Badge color="amber">50-69% Reskillable</Badge><Badge color="gray">&lt;50% Stretch</Badge></div>
        {Boolean(adjSummary.wdl_connected) && <Badge color="green">WDL Connected</Badge>}
      </div>

      {adjacencies.map(a => <Card key={a.target_role} title={a.target_role}>
        <div className="flex items-center gap-2 mb-3">
          <Badge color="green">{a.strong_matches} strong</Badge><Badge color="amber">{a.reskillable} reskillable</Badge><Badge color="gray">{a.weak_matches} weak</Badge>
          {a.wdl_derived && <span className="text-[9px] text-[var(--success)]">Skills from Work Design Lab</span>}
        </div>
        <div className="grid grid-cols-4 gap-2">{a.top_candidates.filter(c => c.adjacency_pct >= adjThreshold).map(c => { const isShortlisted = (shortlisted[a.target_role] || []).includes(c.employee); return <div key={c.employee} className="bg-[var(--surface-2)] rounded-xl p-3 border transition-all" style={{ borderColor: isShortlisted ? "var(--success)" : "var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate flex-1 mr-1">{c.employee}</span>
            <span className="text-[14px] font-extrabold shrink-0" style={{ color: c.adjacency_pct >= 70 ? "var(--success)" : c.adjacency_pct >= 50 ? "var(--warning)" : "var(--risk)" }}>{c.adjacency_pct}%</span>
          </div>
          <div className="text-[9px] text-[var(--success)] mb-0.5 truncate">✓ {c.matching_skills.slice(0, 3).join(", ")}</div>
          {c.gap_skills.length > 0 && <div className="text-[9px] text-[var(--risk)] mb-1 truncate">✗ {c.gap_skills.slice(0, 3).join(", ")}</div>}
          {c.reskill_months > 0 && <div className="text-[8px] text-[var(--text-muted)]">~{c.reskill_months}mo reskilling</div>}
          <button onClick={() => setShortlisted(prev => { const list = prev[a.target_role] || []; return { ...prev, [a.target_role]: isShortlisted ? list.filter(e => e !== c.employee) : [...list, c.employee] }; })} className="mt-1 text-[9px] font-semibold w-full py-1 rounded text-center" style={{ background: isShortlisted ? "rgba(16,185,129,0.1)" : "var(--surface-1)", color: isShortlisted ? "var(--success)" : "var(--text-muted)", border: `1px solid ${isShortlisted ? "var(--success)" : "var(--border)"}` }}>{isShortlisted ? "★ Shortlisted" : "☆ Shortlist"}</button>
        </div>; })}</div>
        {a.top_candidates.filter(c => c.adjacency_pct >= adjThreshold).length === 0 && <div className="text-[12px] text-[var(--text-muted)] py-4 text-center">No candidates above {adjThreshold}% — lower threshold or plan external hire</div>}
      </Card>)}

      {/* Shortlist summary */}
      {Object.values(shortlisted).some(l => l.length > 0) && <Card title="Shortlisted Candidates">
        {Object.entries(shortlisted).filter(([, l]) => l.length > 0).map(([role, list]) => <div key={role} className="mb-2"><span className="text-[12px] font-bold text-[var(--text-primary)]">{role}:</span> <span className="text-[12px] text-[var(--text-secondary)]">{list.join(", ")}</span></div>)}
      </Card>}
      </>}
    </div>}

    {/* ═══ TAB 4: SKILLS TAXONOMY DICTIONARY ═══ */}
    {tab === "taxonomy" && <div>
      <Card title="📖 Skills Taxonomy Dictionary">
        <div className="text-[12px] text-[var(--text-secondary)] mb-4">Comprehensive skills framework organized by domain. Use as a reference when assessing your workforce or designing target-state skill profiles. Each skill includes 4 proficiency levels from novice to expert.</div>
        {SKILLS_TAXONOMY.map(domain => <div key={domain.domain} className="mb-5">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
            <span className="text-lg">{domain.icon}</span>
            <span className="text-[13px] font-bold" style={{color:domain.color}}>{domain.domain}</span>
            <span className="text-[10px] text-[var(--text-muted)]">({domain.skills.length} skills)</span>
          </div>
          <div className="space-y-2">
            {domain.skills.map(skill => <div key={skill.name} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-[var(--text-primary)]">{skill.name}</span>
                {skill.industries && <div className="flex gap-1">{skill.industries.map(ind => <span key={ind} className="text-[7px] font-bold px-1.5 py-0.5 rounded" style={{background:`${domain.color}15`,color:domain.color}}>{ind}</span>)}</div>}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {skill.profLevels.map((level, li) => <div key={li} className="rounded px-2 py-1.5 text-center" style={{background:`${domain.color}${(li+1)*4>12?"15":"0"+(li+1)*4}`,border:`1px solid ${domain.color}20`}}>
                  <div className="text-[8px] font-bold uppercase mb-0.5" style={{color:domain.color}}>Level {li+1}</div>
                  <div className="text-[9px] text-[var(--text-secondary)] leading-tight">{level}</div>
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
export function AIReadiness({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewLevel, setViewLevel] = useState<"org"|"individual">("org");
  const [rdPage, setRdPage] = useState(0);
  const RD_PAGE = 50;

  useEffect(() => { if (!model) return; setLoading(true); api.getReadinessAssessment(model).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model]);

  const individuals = (data?.individuals || []) as { employee: string; scores: Record<string, number>; average: number; band: string }[];
  const dimAvgs = (data?.dimension_averages || {}) as Record<string, number>;
  const bands = (data?.bands || {}) as Record<string, number>;
  const dimensions = (data?.dimensions || []) as string[];

  return <div>
    <PageHeader icon="🎯" title={viewCtx?.mode === "employee" ? "My AI Readiness" : "AI Readiness Assessment"} subtitle="Individual and team readiness for transformation" onBack={onBack} moduleId="readiness" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="readiness" label="Readiness Scores" /></div>}
    {loading && <LoadingBar />}
    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Org Average" value={`${data?.org_average || "—"}/5`} accent /><KpiCard label="Ready Now" value={bands.ready_now || 0} /><KpiCard label="Coachable" value={bands.coachable || 0} /><KpiCard label="At Risk" value={bands.at_risk || 0} /><KpiCard label="Weakest" value={String(data?.lowest_dimension || "—")} />
    </div>

    <div className="flex gap-2 mb-4">{(["org","individual"] as const).map(v => <button key={v} onClick={() => setViewLevel(v)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: viewLevel === v ? "var(--accent-primary)" : "var(--surface-2)", color: viewLevel === v ? "#fff" : "var(--text-muted)" }}>{v === "org" ? "Organization View" : "Individual Scores"}</button>)}</div>

    {viewLevel === "org" ? <div className="grid grid-cols-2 gap-4">
      <Card title="Readiness by Dimension"><RadarViz data={Object.entries(dimAvgs).map(([k,v]) => ({ subject: k, current: v, max: 5 }))} /></Card>
      <Card title="Readiness Bands"><DonutViz data={[{name:"Ready Now",value:bands.ready_now||0},{name:"Coachable",value:bands.coachable||0},{name:"At Risk",value:bands.at_risk||0}]} />
        <div className="mt-3 space-y-2">{[{band:"Ready Now",color:"var(--success)",desc:"Can adopt AI tools immediately"},{band:"Coachable",color:"var(--warning)",desc:"Needs 3-6 months of support"},{band:"At Risk",color:"var(--risk)",desc:"Needs intensive intervention before rollout"}].map(b => <div key={b.band} className="flex items-center gap-2 text-[11px]"><div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:b.color}} /><span className="font-semibold" style={{color:b.color}}>{b.band}</span><span className="text-[var(--text-muted)]">— {b.desc}</span></div>)}</div>
      </Card>
    </div> : <Card title="Individual Readiness Scores">
      <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{maxHeight:450}}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Employee</th>{dimensions.map(d => <th key={d} className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">{d}</th>)}<th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Avg</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Band</th></tr></thead>
      <tbody>{individuals.slice(rdPage * RD_PAGE, (rdPage + 1) * RD_PAGE).map(ind => <tr key={ind.employee} className="border-b border-[var(--border)]"><td className="px-3 py-1.5 font-semibold">{ind.employee}</td>{dimensions.map(d => { const v = ind.scores[d] || 0; return <td key={d} className="px-2 py-1.5 text-center"><span className="text-[11px] font-bold" style={{color: v >= 4 ? "var(--success)" : v >= 3 ? "var(--accent-primary)" : v >= 2 ? "var(--warning)" : "var(--risk)"}}>{v}</span></td>; })}<td className="px-2 py-1.5 text-center font-bold">{ind.average}</td><td className="px-2 py-1.5 text-center"><Badge color={ind.band==="Ready Now"?"green":ind.band==="Coachable"?"amber":"red"}>{ind.band}</Badge></td></tr>)}</tbody></table></div>
    </Card>}

    {/* Function Breakdown */}
    <Card title="Readiness by Function">
      {(() => {
        const funcData: Record<string, {sum: number; count: number}> = {};
        individuals.forEach(ind => {
          // Approximate function from employee name patterns
          const func = ind.employee.includes("EMP") ? "Unknown" : "General";
          if (!funcData[func]) funcData[func] = {sum: 0, count: 0};
          funcData[func].sum += ind.average;
          funcData[func].count += 1;
        });
        // Group by readiness band
        const bandCounts = {ready: 0, coachable: 0, risk: 0};
        individuals.forEach(i => { if (i.band === "Ready Now") bandCounts.ready++; else if (i.band === "Coachable") bandCounts.coachable++; else bandCounts.risk++; });
        const total = individuals.length || 1;
        return <div className="grid grid-cols-3 gap-4">
          {[{label:"Ready Now",count:bandCounts.ready,color:"var(--success)",desc:"Can adopt AI immediately — deploy as early adopters"},{label:"Coachable",count:bandCounts.coachable,color:"var(--warning)",desc:"3-6 months of support needed — target for reskilling programs"},{label:"At Risk",count:bandCounts.risk,color:"var(--risk)",desc:"Intensive intervention required — may need role redesign"}].map(b => <div key={b.label} className="rounded-xl p-4 border-l-4 transition-all hover:translate-y-[-1px]" style={{background:`${b.color}08`,borderColor:b.color}}>
            <div className="flex items-center justify-between mb-2"><span className="text-[14px] font-bold" style={{color:b.color}}>{b.label}</span><span className="text-[24px] font-extrabold" style={{color:b.color}}>{b.count}</span></div>
            <div className="text-[11px] text-[var(--text-secondary)] mb-2">{b.desc}</div>
            <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{width:`${(b.count/total)*100}%`,background:b.color}} /></div>
            <div className="text-[9px] text-[var(--text-muted)] mt-1">{Math.round((b.count/total)*100)}% of workforce</div>
          </div>)}
        </div>;
      })()}
    </Card>

    {/* Dimension Improvement Plans */}
    <Card title="Improvement Recommendations by Dimension">
      <div className="space-y-2">{Object.entries(dimAvgs).sort((a,b) => Number(a[1]) - Number(b[1])).map(([dim, avg]) => {
        const gap = Math.max(0, 4 - Number(avg));
        const plan = Number(avg) < 2.5 ? "Intensive: structured training program + coaching + tool access" : Number(avg) < 3.5 ? "Moderate: workshop series + self-paced learning + peer support" : "Light: advanced resources + mentoring + stretch assignments";
        const timeline = Number(avg) < 2.5 ? "6-9 months" : Number(avg) < 3.5 ? "3-6 months" : "1-3 months";
        return <div key={dim} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="w-32 shrink-0"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{dim}</div><div className="text-[9px] text-[var(--text-muted)]">Avg: {Number(avg).toFixed(1)}/5</div></div>
          <div className="flex-1"><div className="h-3 rounded-full bg-[var(--surface-3)] overflow-hidden"><div className="h-full rounded-full" style={{width:`${(Number(avg)/5)*100}%`,background: Number(avg) >= 3.5 ? "var(--success)" : Number(avg) >= 2.5 ? "var(--warning)" : "var(--risk)"}} /></div></div>
          <div className="text-right shrink-0 w-48"><div className="text-[10px] font-semibold" style={{color: Number(avg) >= 3.5 ? "var(--success)" : Number(avg) >= 2.5 ? "var(--warning)" : "var(--risk)"}}>{plan.split(":")[0]}</div><div className="text-[9px] text-[var(--text-muted)]">{timeline}</div></div>
        </div>;
      })}</div>
    </Card>

    <InsightPanel title="Readiness Insights" items={[
      `Org average: ${data?.org_average || "—"}/5 — ${Number(data?.org_average || 0) >= 3.5 ? "strong foundation for transformation" : Number(data?.org_average || 0) >= 2.5 ? "moderate readiness — targeted interventions needed" : "significant readiness gap — extend transformation timeline"}`,
      `Weakest dimension: ${data?.lowest_dimension || "—"} — prioritize this in training programs`,
      `Strongest dimension: ${data?.highest_dimension || "—"} — leverage this as a foundation`,
      `${bands.at_risk || 0} At Risk employees need intensive support before AI rollout`,
    ]} icon="🎯" />

    <NextStepBar currentModuleId="readiness" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: MANAGER CAPABILITY
   ═══════════════════════════════════════════════════════════════ */
export function ManagerCapability({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"scorecard"|"correlation">("scorecard");

  useEffect(() => { if (!model) return; setLoading(true); api.getManagerCapability(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl]);

  const managers = (data?.managers || []) as { manager: string; scores: Record<string, number>; average: number; category: string; direct_reports: number; team_readiness_avg: number; correlation: number; team_members: { employee: string; readiness: number; band: string }[] }[];
  const dims = (data?.dimensions || []) as string[];
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const catColors: Record<string, string> = { "Transformation Champion": "#10B981", "Needs Development": "#F59E0B", "Flight Risk": "#EF4444" };

  if (!loading && (!managers || managers.length === 0)) return <div>
    <PageHeader icon="👔" title="Manager Capability" subtitle="Assess managers and identify transformation champions" onBack={onBack} moduleId="mgrcap" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="manager_capability" label="Manager Scores" /></div>}
    <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">👔</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">No Manager Data Available</h3><p className="text-[13px] text-[var(--text-secondary)]">Upload workforce data with org structure to assess manager capability.</p></div>
  </div>;

  return <div>
    <ContextStrip items={["Phase 1: Discover — Assess managers who will lead teams through transformation. Champions become change agents."]} />
    <PageHeader icon="👔" title="Manager Capability" subtitle="Assess managers and identify transformation champions" onBack={onBack} moduleId="mgrcap" />
    {loading && <LoadingBar />}

    <div className="grid grid-cols-6 gap-3 mb-5">
      <KpiCard label="Managers" value={Number(summary.total_managers || 0)} /><KpiCard label="Champions" value={Number(summary.champions || 0)} accent /><KpiCard label="Needs Dev" value={Number(summary.needs_development || 0)} /><KpiCard label="Flight Risk" value={Number(summary.flight_risk || 0)} /><KpiCard label="Weakest Dim" value={String(summary.weakest_dimension || "—")} /><KpiCard label="Multiplier" value={String(summary.correlation_multiplier || "—")} accent />
    </div>

    <TabBar tabs={[{ id: "scorecard", label: "Manager Scorecard" }, { id: "correlation", label: "Team Correlation" }]} active={tab} onChange={t => setTab(t as "scorecard"|"correlation")} />

    {tab === "scorecard" ? <>
      {/* Category distribution */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[{cat:"Transformation Champion",icon:"🏆",desc:"Deploy as change agents — they'll carry the message"},{cat:"Needs Development",icon:"📘",desc:"Build capability before rollout — workshops + coaching"},{cat:"Flight Risk",icon:"⚠️",desc:"Engage immediately — assess commitment, provide support"}].map(c => {
          const count = managers.filter(m => m.category === c.cat).length;
          return <div key={c.cat} className="rounded-xl p-4 border-l-4 transition-all hover:translate-y-[-2px]" style={{ background: `${catColors[c.cat]}08`, borderColor: catColors[c.cat] }}>
            <div className="flex items-center justify-between mb-2"><span className="text-xl">{c.icon}</span><span className="text-[22px] font-extrabold" style={{ color: catColors[c.cat] }}>{count}</span></div>
            <div className="text-[13px] font-bold text-[var(--text-primary)] mb-1">{c.cat}</div>
            <div className="text-[11px] text-[var(--text-secondary)]">{c.desc}</div>
          </div>;
        })}
      </div>

      {/* Scorecard table */}
      <Card title="Detailed Scores">
        <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 400 }}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0 z-10"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Manager</th><th className="px-2 py-2 text-center border-b border-[var(--border)] text-[var(--text-muted)]">Reports</th>{dims.map(d => <th key={d} className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]" style={{maxWidth:70,fontSize:9}}>{d}</th>)}<th className="px-2 py-2 text-center border-b border-[var(--border)]">Avg</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Category</th></tr></thead>
        <tbody>{managers.slice(0, 30).map(m => <tr key={m.manager} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"><td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{m.manager}</td><td className="px-2 py-2 text-center text-[var(--text-muted)]">{m.direct_reports}</td>{dims.map(d => { const v = m.scores[d]; return <td key={d} className="px-2 py-2 text-center"><span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-[11px] font-bold transition-all" style={{ background: `${v >= 4 ? "#10B981" : v >= 3 ? "#D4860A" : v >= 2 ? "#F59E0B" : "#EF4444"}15`, color: v >= 4 ? "#10B981" : v >= 3 ? "#D4860A" : v >= 2 ? "#F59E0B" : "#EF4444" }}>{v}</span></td>; })}<td className="px-2 py-2 text-center font-extrabold text-[var(--text-primary)]">{m.average}</td><td className="px-2 py-2 text-center"><Badge color={m.category === "Transformation Champion" ? "green" : m.category === "Needs Development" ? "amber" : "red"}>{m.category.split(" ").map(w => w[0]).join("")}</Badge></td></tr>)}</tbody></table></div>
      </Card>
    </> : <>
      {/* Correlation view */}
      <Card title="Manager Capability → Team Readiness Correlation">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl p-5 text-center border transition-all hover:translate-y-[-2px]" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}><div className="text-[11px] text-[var(--text-muted)] mb-1">High-Capability Manager Teams</div><div className="text-[28px] font-extrabold text-[var(--success)]">{Number(summary.high_mgr_team_readiness || 0)}<span className="text-[14px]">/5</span></div></div>
          <div className="rounded-xl p-5 text-center border transition-all hover:translate-y-[-2px]" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}><div className="text-[11px] text-[var(--text-muted)] mb-1">Low-Capability Manager Teams</div><div className="text-[28px] font-extrabold text-[var(--risk)]">{Number(summary.low_mgr_team_readiness || 0)}<span className="text-[14px]">/5</span></div></div>
          <div className="rounded-xl p-5 text-center border transition-all hover:translate-y-[-2px]" style={{ background: "rgba(212,134,10,0.06)", borderColor: "rgba(212,134,10,0.2)" }}><div className="text-[11px] text-[var(--text-muted)] mb-1">Multiplier Effect</div><div className="text-[28px] font-extrabold text-[var(--accent-primary)]">{String(summary.correlation_multiplier || "—")}</div></div>
        </div>
        <div className="space-y-2">{managers.map(m => <div key={m.manager} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: catColors[m.category] }}>{m.manager.split(" ").map(w => w[0]).join("").slice(0,2)}</div>
          <div className="flex-1"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{m.manager}</div><div className="text-[10px] text-[var(--text-muted)]">{m.direct_reports} reports · {m.category}</div></div>
          <div className="text-center shrink-0 w-16"><div className="text-[9px] text-[var(--text-muted)]">Manager</div><div className="text-[15px] font-extrabold" style={{ color: catColors[m.category] }}>{m.average}</div></div>
          <div className="w-8 text-center text-[var(--text-muted)]">→</div>
          <div className="text-center shrink-0 w-16"><div className="text-[9px] text-[var(--text-muted)]">Team</div><div className="text-[15px] font-extrabold" style={{ color: m.team_readiness_avg >= 3.5 ? "var(--success)" : m.team_readiness_avg >= 2.5 ? "var(--warning)" : "var(--risk)" }}>{m.team_readiness_avg}</div></div>
        </div>)}</div>
      </Card>
    </>}

    <InsightPanel title="Key Actions" items={[
      `Deploy ${summary.champions || 0} Champions as change agents — they'll accelerate peer adoption`,
      `${summary.flight_risk || 0} Flight Risks need immediate 1:1 engagement to assess commitment`,
      `Focus development on "${summary.weakest_dimension || "—"}" — it's the weakest dimension across all managers`,
      `Manager capability has a ${summary.correlation_multiplier || "—"} multiplier on team readiness — investing in managers is the highest-leverage intervention`,
    ]} icon="👔" />
    <NextStepBar currentModuleId="mgrcap" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: CHANGE READINESS & ADOPTION
   ═══════════════════════════════════════════════════════════════ */
export function ChangeReadiness({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQ, setSelectedQ] = useState<string | null>(null);

  useEffect(() => { if (!model) return; setLoading(true); api.getChangeReadiness(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl]);

  const quadrants = (data?.quadrants || {}) as Record<string, { employees: { employee: string; readiness: number; impact: number; band: string }[]; count: number; label: string; color: string; action: string; cadence: string; priority: number }>;
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const messaging = (data?.messaging_guidance || {}) as Record<string, string>;
  const qOrder = ["high_ready_high_impact", "low_ready_high_impact", "high_ready_low_impact", "low_ready_low_impact"];
  const total = Number(summary.total_assessed || 0);

  if (!loading && total === 0) return <div>
    <PageHeader icon="📈" title="Change Readiness" subtitle="Segment workforce and map interventions" onBack={onBack} moduleId="changeready" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="change_readiness" label="Change Readiness" /></div>}
    <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">📈</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Complete AI Readiness First</h3><p className="text-[13px] text-[var(--text-secondary)]">The readiness assessment feeds the change segmentation model.</p></div>
  </div>;

  return <div>
    <ContextStrip items={["Phase 3: Deliver — Segment your workforce by readiness and impact to target change interventions where they matter most."]} />
    <PageHeader icon="📈" title="Change Readiness & Adoption" subtitle="4-quadrant segmentation with targeted interventions" onBack={onBack} moduleId="changeready" />
    {loading && <LoadingBar />}

    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Assessed" value={total} /><KpiCard label="High Risk" value={Number(summary.high_risk_count || 0)} accent /><KpiCard label="High Risk %" value={`${summary.high_risk_pct || 0}%`} /><KpiCard label="Champions" value={Number(summary.champion_count || 0)} /><KpiCard label="Champions Needed" value={Number(summary.recommended_champions_needed || 0)} />
    </div>

    {/* 4-Quadrant Visual */}
    <Card title="Readiness × Impact Matrix">
      <div className="relative mb-4">
        <div className="grid grid-cols-2 gap-3">
          {qOrder.map(qKey => { const q = quadrants[qKey]; if (!q) return <div key={qKey} />; const isSelected = selectedQ === qKey; const pct = total ? Math.round((q.count / total) * 100) : 0;
            return <div key={qKey} onClick={() => setSelectedQ(isSelected ? null : qKey)} className="rounded-xl p-5 cursor-pointer transition-all hover:translate-y-[-2px]" style={{ background: `${q.color}${isSelected ? "15" : "08"}`, border: `2px solid ${isSelected ? q.color : q.color + "20"}`, boxShadow: isSelected ? `0 4px 20px ${q.color}15` : "none" }}>
              <div className="flex items-center justify-between mb-3"><span className="text-[15px] font-bold" style={{ color: q.color }}>{q.label}</span><div className="flex items-center gap-2"><span className="text-[24px] font-extrabold" style={{ color: q.color }}>{q.count}</span><span className="text-[11px] text-[var(--text-muted)]">({pct}%)</span></div></div>
              <div className="text-[11px] text-[var(--text-secondary)] mb-2">{q.action}</div>
              <div className="flex items-center gap-2"><Badge color={q.priority === 1 ? "red" : q.priority === 2 ? "green" : q.priority === 3 ? "amber" : "gray"}>Priority {q.priority}</Badge><span className="text-[9px] text-[var(--text-muted)]">{q.cadence}</span></div>
              {/* Mini employee list */}
              <div className="flex gap-1 flex-wrap mt-3">{q.employees.slice(0, 8).map(e => <span key={e.employee} className="px-2 py-0.5 rounded-full text-[8px] font-semibold transition-all" style={{ background: `${q.color}12`, color: q.color }}>{e.employee}</span>)}{q.count > 4 && <span className="text-[8px] text-[var(--text-muted)] self-center">+{q.count - 4}</span>}</div>
            </div>;
          })}
        </div>
        <div className="flex justify-between mt-2 text-[9px] text-[var(--text-muted)]"><span>← Low Readiness | High Readiness →</span><span>↑ High Impact | Low Impact ↓</span></div>
      </div>
    </Card>

    {/* Expanded quadrant detail */}
    {selectedQ && quadrants[selectedQ] && <Card title={`${quadrants[selectedQ].label} — Detailed View`}>
      <div className="overflow-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 300 }}><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left border-b border-[var(--border)]">Employee</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Readiness</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Impact</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Band</th></tr></thead>
      <tbody>{quadrants[selectedQ].employees.slice(0, 50).map(e => <tr key={e.employee} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"><td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{e.employee}</td><td className="px-2 py-2 text-center" style={{ color: e.readiness >= 3.5 ? "var(--success)" : "var(--warning)" }}>{e.readiness}</td><td className="px-2 py-2 text-center" style={{ color: e.impact >= 3.5 ? "var(--risk)" : "var(--text-muted)" }}>{e.impact}</td><td className="px-2 py-2 text-center"><Badge color={e.band === "Ready Now" ? "green" : e.band === "Coachable" ? "amber" : "red"}>{e.band}</Badge></td></tr>)}</tbody></table></div>
    </Card>}

    {/* Messaging Guidance */}
    <Card title="Segment-Specific Messaging">
      <div className="grid grid-cols-2 gap-3">{Object.entries(messaging).map(([key, msg]) => {
        const meta: Record<string, {label: string; color: string; icon: string}> = { high_risk: {label:"High Risk",color:"#EF4444",icon:"🔴"}, champions: {label:"Champions",color:"#10B981",icon:"🟢"}, supporters: {label:"Supporters",color:"#D4860A",icon:"🔵"}, monitor: {label:"Monitor",color:"#F59E0B",icon:"🟡"} };
        const m = meta[key] || {label:key,color:"var(--text-muted)",icon:"⚪"};
        return <div key={key} className="p-4 rounded-xl border-l-4 transition-all hover:translate-y-[-1px]" style={{ background: `${m.color}06`, borderColor: m.color }}>
          <div className="text-[13px] font-bold mb-2" style={{ color: m.color }}>{m.icon} {m.label}</div>
          <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{msg}</div>
        </div>;
      })}</div>
    </Card>

    <InsightPanel title="Change Management Actions" items={[
      `${summary.high_risk_pct || 0}% of workforce is High Risk — this is your #1 priority`,
      `Deploy ${summary.recommended_champions_needed || 0} change champions (1 per 5 high-risk employees)`,
      `${summary.champion_count || 0} natural champions identified — engage them as peer advocates`,
      `High Risk group needs bi-weekly 1:1 touchpoints for 6+ months`,
    ]} icon="📈" />

    {/* Intervention Calendar */}
    <Card title="Intervention Calendar — 12-Week Plan">
      <div className="overflow-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Week</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">High Risk</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">Champions</th><th className="px-2 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)]">All Staff</th></tr></thead>
      <tbody>{[
        {w:"1-2",hr:"1:1 impact assessment meetings",ch:"Champion briefing & role definition",all:"All-hands transformation announcement"},
        {w:"3-4",hr:"Personalized support plan delivery",ch:"Peer advocacy training",all:"FAQ document & resource hub launch"},
        {w:"5-6",hr:"Bi-weekly coaching check-ins begin",ch:"First wave communications drafted",all:"Town hall Q&A session"},
        {w:"7-8",hr:"Skills assessment & reskilling start",ch:"Champions lead team workshops",all:"Progress update newsletter"},
        {w:"9-10",hr:"Midpoint review & plan adjustment",ch:"Feedback collection from teams",all:"Pulse survey #1"},
        {w:"11-12",hr:"Continued coaching + escalation review",ch:"Success stories shared org-wide",all:"Phase 1 milestone celebration"},
      ].map(r => <tr key={r.w} className="border-b border-[var(--border)] hover:bg-[var(--hover)] transition-colors"><td className="px-3 py-2 font-bold text-[var(--accent-primary)]">Wk {r.w}</td><td className="px-2 py-2 text-[var(--risk)]">{r.hr}</td><td className="px-2 py-2 text-[var(--success)]">{r.ch}</td><td className="px-2 py-2 text-[var(--text-secondary)]">{r.all}</td></tr>)}</tbody></table></div>
    </Card>

    {/* Resistance Patterns */}
    <Card title="Common Resistance Patterns & Mitigations">
      <div className="space-y-2">{[
        {pattern:"Fear of job loss",freq:"High",mitigation:"Communicate early: transformation ≠ layoffs. Show redeployment paths.",color:"var(--risk)"},
        {pattern:"Skills anxiety",freq:"High",mitigation:"Provide clear reskilling pathways with timeline and support. Make training accessible.",color:"var(--risk)"},
        {pattern:"Process attachment",freq:"Medium",mitigation:"Involve employees in redesigning their own processes. Co-creation reduces resistance.",color:"var(--warning)"},
        {pattern:"Technology distrust",freq:"Medium",mitigation:"Pilot with champions first, share results, build confidence through evidence.",color:"var(--warning)"},
        {pattern:"Leadership skepticism",freq:"Low",mitigation:"Present data-driven business case. Use this tool's outputs as evidence.",color:"var(--text-muted)"},
      ].map(r => <div key={r.pattern} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex-1"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{r.pattern}</div><div className="text-[10px] text-[var(--text-secondary)]">{r.mitigation}</div></div>
        <Badge color={r.freq === "High" ? "red" : r.freq === "Medium" ? "amber" : "gray"}>{r.freq} freq</Badge>
      </div>)}</div>
    </Card>

    <NextStepBar currentModuleId="changeready" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: MANAGER DEVELOPMENT TRACK
   ═══════════════════════════════════════════════════════════════ */
export function ManagerDevelopment({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!model) return; setLoading(true); api.getManagerDevelopment(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl]);

  const tracks = (data?.tracks || []) as { manager: string; category: string; average_score: number; direct_reports: number; weak_dimensions: string[]; interventions: { dimension: string; intervention: string; format: string; duration_weeks: number; cost: number }[]; role_in_change: string; total_cost: number; total_weeks: number }[];
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const catColors: Record<string, string> = { "Transformation Champion": "#10B981", "Needs Development": "#F59E0B", "Flight Risk": "#EF4444" };
  const catIcons: Record<string, string> = { "Transformation Champion": "🏆", "Needs Development": "📘", "Flight Risk": "⚠️" };

  if (!loading && tracks.length === 0) return <div>
    <PageHeader icon="🎓" title="Manager Development" subtitle="Targeted plans for people managers" onBack={onBack} moduleId="mgrdev" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="manager_development" label="Manager Dev Plans" /></div>}
    <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🎓</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Complete Manager Capability Assessment First</h3><p className="text-[13px] text-[var(--text-secondary)]">Manager development plans are generated from capability scores.</p></div>
  </div>;

  return <div>
    <ContextStrip items={["Phase 3: Deliver — Targeted development for managers. Champions lead change, Flight Risks need immediate engagement."]} />
    <PageHeader icon="🎓" title="Manager Development Track" subtitle="Development plans and transformation roles" onBack={onBack} moduleId="mgrdev" />
    {loading && <LoadingBar />}

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
          <div className="text-[10px] text-[var(--text-secondary)]">{cat === "Transformation Champion" ? "Deploy as change agents" : cat === "Needs Development" ? "Build capability before rollout" : "Engage immediately, assess retention"}</div>
        </div>;
      })}
    </div>

    {/* Individual development cards */}
    {tracks.map(t => <Card key={t.manager} title={`${catIcons[t.category]} ${t.manager}`}>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Badge color={t.category === "Transformation Champion" ? "green" : t.category === "Needs Development" ? "amber" : "red"}>{t.category}</Badge>
        <span className="text-[11px] text-[var(--text-muted)]">Score: {t.average_score}/5 · {t.direct_reports} reports</span>
        <span className="text-[11px] font-semibold" style={{ color: catColors[t.category] }}>{t.total_weeks}wk · {fmtNum(t.total_cost)}</span>
      </div>

      {/* Role in transformation */}
      <div className="bg-[var(--surface-2)] rounded-xl p-3 mb-3 border border-[var(--border)]">
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Transformation Role</div>
        <div className="text-[12px] font-semibold" style={{ color: catColors[t.category] }}>{t.role_in_change}</div>
      </div>

      {/* Interventions */}
      {(t.interventions || []).length > 0 && <div className="space-y-2">{(t.interventions || []).map((int, i) => <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30">
        <div className="flex-1">
          <div className="text-[12px] font-semibold text-[var(--text-primary)]">{int.dimension}</div>
          <div className="text-[11px] text-[var(--text-secondary)]">{int.intervention}</div>
        </div>
        <Badge color={int.format.includes("1:1") ? "purple" : int.format.includes("Group") ? "indigo" : "gray"}>{int.format}</Badge>
        <span className="text-[10px] text-[var(--text-muted)] shrink-0">{int.duration_weeks}wk</span>
        <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--accent-primary)" }}>{fmtNum(int.cost)}</span>
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
        <div className="text-[13px] font-bold text-[var(--text-primary)] mb-2">{m.title}</div>
        <div className="space-y-1">{m.items.map((it,i) => <div key={i} className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)]"><span className="text-[var(--text-muted)] shrink-0">○</span>{it}</div>)}</div>
      </div>)}</div>
    </Card>

    {/* Mentorship Pairing */}
    {tracks.filter(t => t.category === "Transformation Champion").length > 0 && tracks.filter(t => t.category !== "Transformation Champion").length > 0 && <Card title="Mentorship Pairing — Champions → Developing Managers">
      <div className="space-y-2">{tracks.filter(t => t.category === "Transformation Champion").map(champion => {
        const mentees = tracks.filter(t => t.category !== "Transformation Champion").slice(0, 2);
        return <div key={champion.manager} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="flex-1"><div className="text-[12px] font-bold text-[var(--success)]">🏆 {champion.manager}</div><div className="text-[9px] text-[var(--text-muted)]">Champion (Score: {champion.average_score})</div></div>
          <div className="text-[var(--text-muted)]">→</div>
          <div className="flex-1 space-y-1">{mentees.map(m => <div key={m.manager} className="text-[11px]"><span className="font-semibold" style={{color: m.category === "Flight Risk" ? "var(--risk)" : "var(--warning)"}}>{m.manager}</span> <span className="text-[var(--text-muted)]">({m.category}, {m.average_score})</span></div>)}</div>
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
        showToast("Failed to parse AI response — try again");
      }
    } catch {
      showToast("Error generating recommendations");
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
        <p className="text-[13px] text-[var(--text-secondary)] mb-6 max-w-lg mx-auto">
          AI will analyze your workforce data, AI readiness scores, and task-level impact analysis to generate
          ranked, actionable recommendations for your AI transformation journey.
        </p>
        <button onClick={generate} className="px-8 py-3 rounded-2xl text-[14px] font-bold text-white transition-all hover:translate-y-[-2px] hover:shadow-lg" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", boxShadow: "0 4px 20px rgba(224,144,64,0.2)" }}>
          🤖 Generate Recommendations
        </button>
      </div>
    </Card>}

    {loading && <Card><div className="text-center py-16"><LoadingBar /><div className="text-[13px] text-[var(--text-secondary)] mt-4">Analyzing workforce data and generating recommendations...</div></div></Card>}

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
          {categories.map(c => <button key={c} onClick={() => setFilterCat(c)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all" style={{ border: filterCat === c ? "2px solid var(--accent-primary)" : "1px solid var(--border)", background: filterCat === c ? "rgba(212,134,10,0.08)" : "transparent", color: filterCat === c ? "var(--accent-primary)" : "var(--text-muted)" }}>{c}</button>)}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSortBy("impact")} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${sortBy === "impact" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>Sort by Impact</button>
          <button onClick={() => setSortBy("effort")} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold ${sortBy === "effort" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>Sort by Effort</button>
          <button onClick={generate} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5">↻ Regenerate</button>
        </div>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        {sorted.map((r, i) => <div key={r.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden transition-all hover:border-[var(--accent-primary)]/40 hover:translate-y-[-1px]" style={{ animation: `slideUp 0.3s ease-out ${i * 0.05}s both` }}>
          <div className="flex">
            {/* Impact score bar */}
            <div className={`w-20 shrink-0 flex flex-col items-center justify-center bg-gradient-to-b ${impactGradient(r.impact)}`}>
              <div className="text-[24px] font-extrabold font-data text-white">{r.impact}</div>
              <div className="text-[9px] font-bold text-white/70 uppercase tracking-wider">Impact</div>
            </div>
            {/* Content */}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">#{i + 1}</span>
                    <Badge color={r.category === "Automation" ? "amber" : r.category === "Upskilling" ? "green" : r.category === "Governance" ? "purple" : "gray"}>{r.category}</Badge>
                    <Badge color={effortColor(r.effort)}>{r.effort} Effort</Badge>
                    <span className="text-[10px] text-[var(--text-muted)]">⏱ {r.timeframe}</span>
                  </div>
                  <h4 className="text-[15px] font-bold font-heading text-[var(--text-primary)]">{r.title}</h4>
                </div>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-3">{r.description}</p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Roles:</span>
                  {r.affectedRoles.slice(0, 4).map(role => <span key={role} className="text-[11px] bg-[var(--surface-2)] rounded px-2 py-0.5 text-[var(--text-secondary)]">{role}</span>)}
                  {r.affectedRoles.length > 4 && <span className="text-[11px] text-[var(--text-muted)]">+{r.affectedRoles.length - 4}</span>}
                </div>
                {r.kpis?.length > 0 && <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Track:</span>
                  {r.kpis.slice(0, 2).map(k => <span key={k} className="text-[11px] text-[var(--accent-primary)]">{k}</span>)}
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

    {/* Benchmark industry selector */}
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Compare against:</span>
      <select value={benchIndustry} onChange={e => setBenchIndustry(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11px] text-[var(--text-primary)]">
        {["technology","financial_services","healthcare","retail","manufacturing","professional_services","energy","education","legal"].map(i => <option key={i} value={i}>{i.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
      </select>
      <span className="text-[10px] text-[var(--text-muted)]">({empCount > 0 ? empCount < 500 ? "Small" : empCount <= 5000 ? "Mid" : "Large" : "—"} tier)</span>
    </div>

    {/* Overall score */}
    <div className="flex items-center gap-4 mb-5">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-[28px] font-black font-data" style={{ background: `${overallScore >= 70 ? "var(--success)" : overallScore >= 40 ? "var(--warning)" : "var(--risk)"}15`, color: overallScore >= 70 ? "var(--success)" : overallScore >= 40 ? "var(--warning)" : "var(--risk)", border: `2px solid ${overallScore >= 70 ? "var(--success)" : overallScore >= 40 ? "var(--warning)" : "var(--risk)"}40` }}>{overallScore}%</div>
      <div><div className="text-[16px] font-bold text-[var(--text-primary)] font-heading">Organizational Health</div><div className="text-[12px] text-[var(--text-secondary)]">{metrics.filter(m => m.status === "green").length} passing, {metrics.filter(m => m.status === "amber").length} warnings, {metrics.filter(m => m.status === "red").length} critical vs. {benchIndustryLabel} benchmarks</div></div>
    </div>

    {/* Metric cards — with benchmark comparison */}
    <div className="grid grid-cols-3 gap-4 mb-5">
      {metrics.map(m => <div key={m.id} onClick={() => setExpandedMetric(expandedMetric === m.id ? null : m.id)} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 cursor-pointer card-hover hover:border-[var(--accent-primary)]/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{m.label}</span>
          <div className="w-3 h-3 rounded-full" style={{ background: statusColor(m.status) }} />
        </div>
        <div className="text-[22px] font-extrabold font-data text-[var(--text-primary)] mb-1">{m.value}</div>
        {/* Inline benchmark comparison */}
        {m.benchAvg > 0 && <div className="flex items-center gap-2 text-[10px] mb-1">
          <span className="text-[var(--text-muted)]">Industry avg:</span>
          <span className="font-data font-semibold text-[var(--text-secondary)]">{m.benchAvg}{m.id === "high_ai" ? "%" : ""}</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[var(--text-muted)]">Best:</span>
          <span className="font-data font-semibold" style={{ color: "var(--success)" }}>{m.bestInClass}{m.id === "high_ai" ? "%" : ""}</span>
        </div>}
        <div className="text-[10px] text-[var(--text-muted)]">Benchmark: {m.benchmark}</div>
        {expandedMetric === m.id && <div className="mt-3 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text-secondary)] leading-relaxed animate-tab-enter">{m.detail}</div>}
      </div>)}
    </div>

    {/* Benchmark Comparison Radar — CHRO slide-worthy */}
    <Card title={`Benchmark Comparison — Your Org vs. ${benchIndustryLabel}`}>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <ExpandableChart title="Benchmark Comparison"><ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Your Org" dataKey="yours" stroke="#D4860A" fill="#D4860A" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="Industry Avg" dataKey="industry" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.08} strokeWidth={2} strokeDasharray="6 4" />
              <Radar name="Best in Class" dataKey="best" stroke="#10B981" fill="#10B981" fillOpacity={0.05} strokeWidth={1.5} strokeDasharray="3 3" />
              <Tooltip contentStyle={{ ...TT }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer></ExpandableChart>
        </div>
        <div className="col-span-5 flex flex-col justify-center">
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Dimension Breakdown</div>
          {radarData.map(d => {
            const delta = d.yours - d.industry;
            const color = delta >= 5 ? "var(--success)" : delta >= -5 ? "var(--warning)" : "var(--risk)";
            return <div key={d.subject} className="flex items-center gap-2 mb-2">
              <span className="text-[11px] text-[var(--text-secondary)] w-16">{d.subject}</span>
              <div className="flex-1 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden relative">
                <div className="h-full rounded-full" style={{ width: `${d.yours}%`, background: "var(--accent-primary)" }} />
                <div className="absolute top-0 h-full w-0.5" style={{ left: `${d.industry}%`, background: "#3B82F6" }} />
              </div>
              <span className="text-[10px] font-data w-12 text-right font-semibold" style={{ color }}>{delta >= 0 ? "+" : ""}{delta}%</span>
            </div>;
          })}
        </div>
      </div>
    </Card>

    {/* Distribution charts */}
    <div className="grid grid-cols-2 gap-4">
      {layers.length > 0 && <Card title="Level Distribution">
        <div className="space-y-1.5">{layers.sort((a, b) => a.name.localeCompare(b.name)).map(l => <div key={l.name} className="flex items-center gap-2">
          <span className="text-[11px] font-data text-[var(--text-muted)] w-8">{l.name}</span>
          <div className="flex-1 h-3 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(l.value / Math.max(...layers.map(x => x.value), 1)) * 100}%`, background: "var(--accent-primary)" }} /></div>
          <span className="text-[11px] font-data text-[var(--text-secondary)] w-8 text-right">{l.value}</span>
        </div>)}</div>
      </Card>}
      {funcDist.length > 0 && <Card title="Function Size">
        <div className="space-y-1.5">{funcDist.map(fd => <div key={fd.name} className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-secondary)] w-28 truncate">{fd.name}</span>
          <div className="flex-1 h-3 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(fd.value / Math.max(...funcDist.map(x => x.value), 1)) * 100}%`, background: "var(--accent-primary)" }} /></div>
          <span className="text-[11px] font-data text-[var(--text-secondary)] w-8 text-right">{fd.value}</span>
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
  const [loading, setLoading] = useState(true);
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
    {loading && <LoadingBar />}

    {cells.length === 0 && !loading && <Empty text="Upload work design data with Function and Job Family columns to generate the heatmap" icon="🔥" />}

    {cells.length > 0 && <div className="flex gap-4">
      <div className="flex-1 overflow-x-auto">
        <Card title="Impact Matrix">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr>
                <th className="px-2 py-2 text-left text-[10px] text-[var(--text-muted)] font-bold uppercase sticky left-0 bg-[var(--surface-1)]">Function</th>
                {families.map(fam => <th key={fam} className="px-2 py-2 text-center text-[9px] text-[var(--text-muted)] font-bold" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", maxWidth: 30 }}>{fam}</th>)}
              </tr></thead>
              <tbody>{functions.map(func => <tr key={func}>
                <td className="px-2 py-1.5 text-[11px] text-[var(--text-secondary)] font-semibold whitespace-nowrap sticky left-0 bg-[var(--surface-1)]">{func}</td>
                {families.map(fam => {
                  const cell = getCell(func, fam);
                  return <td key={fam} className="p-0.5"><div onClick={() => cell && setSelectedCell(cell)} className="w-8 h-8 rounded-md flex items-center justify-center text-[8px] font-bold cursor-pointer transition-all hover:scale-110" style={{ background: cell ? cellColor(cell.score) : "var(--surface-2)", color: cell ? "#fff" : "var(--text-muted)" }}>{cell ? cell.score.toFixed(0) : ""}</div></td>;
                })}
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(16,185,129,0.5)" }} /> Low (0-3.5)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(245,158,11,0.6)" }} /> Moderate (3.5-6)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(239,68,68,0.7)" }} /> High (6-10)</span>
          </div>
        </Card>
      </div>

      {/* Detail panel */}
      {selectedCell && <div className="w-72 shrink-0 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-4 animate-slide-right">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-bold text-[var(--text-primary)] font-heading">Cell Detail</h4>
          <button onClick={() => setSelectedCell(null)} className="text-[var(--text-muted)] text-sm">✕</button>
        </div>
        <div className="text-[12px] text-[var(--accent-primary)] font-semibold mb-1">{selectedCell.function} × {selectedCell.family}</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center"><div className="text-[16px] font-bold font-data" style={{ color: cellColor(selectedCell.score) }}>{selectedCell.score}</div><div className="text-[8px] text-[var(--text-muted)] uppercase">AI Score</div></div>
          <div className="bg-[var(--surface-2)] rounded-lg p-2 text-center"><div className="text-[16px] font-bold font-data text-[var(--text-primary)]">{selectedCell.tasks}</div><div className="text-[8px] text-[var(--text-muted)] uppercase">Tasks</div></div>
        </div>
        <Badge color={selectedCell.impact === "High" ? "red" : selectedCell.impact === "Moderate" ? "amber" : "green"}>{selectedCell.impact} Impact</Badge>
        {selectedCell.roles.length > 0 && <div className="mt-3"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Roles</div><div className="space-y-1">{selectedCell.roles.map(r => <div key={r} className="text-[11px] text-[var(--text-secondary)] bg-[var(--surface-2)] rounded px-2 py-1">{r}</div>)}</div></div>}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!model) return;
    setLoading(true);
    api.getRoleClusters(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [model, f.func, f.jf, f.sf, f.cl]);

  const clusters = ((data as Record<string, unknown>)?.clusters || []) as { roles: string[]; size: number; avg_overlap: number; consolidation_candidate: boolean; shared_characteristics: string[] }[];
  const roles = ((data as Record<string, unknown>)?.roles || []) as { role: string; task_count: number; characteristics_count: number }[];

  return <div>
    <ContextStrip items={[`${clusters.length} clusters identified · ${clusters.filter(c => c.consolidation_candidate).length} consolidation candidates (>70% overlap)`]} />
    <PageHeader icon="🔗" title="Role Clustering" subtitle="Group similar roles by task overlap — identify consolidation candidates" onBack={onBack} moduleId="clusters" viewCtx={viewCtx} />
    {loading && <LoadingBar />}

    {clusters.length === 0 && !loading && <Empty text="No role clusters found. Upload work design data with task characteristics to enable clustering." icon="🔗" />}

    {/* KPIs */}
    {clusters.length > 0 && <div className="grid grid-cols-4 gap-3 mb-5">
      <KpiCard label="Clusters Found" value={clusters.length} />
      <KpiCard label="Consolidation Candidates" value={clusters.filter(c => c.consolidation_candidate).length} accent />
      <KpiCard label="Avg Overlap" value={`${Math.round(clusters.reduce((s, c) => s + c.avg_overlap, 0) / Math.max(clusters.length, 1))}%`} />
      <KpiCard label="Roles Analyzed" value={roles.length} />
    </div>}

    {/* Cluster cards */}
    <div className="space-y-4">
      {clusters.map((c, i) => <div key={i} className={`bg-[var(--surface-1)] border rounded-xl p-5 animate-card-enter ${c.consolidation_candidate ? "border-[var(--risk)]/40" : "border-[var(--border)]"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold font-heading text-[var(--text-primary)]">Cluster {i + 1}</span>
            <span className="text-[11px] font-data" style={{ color: c.avg_overlap >= 70 ? "var(--risk)" : c.avg_overlap >= 50 ? "var(--warning)" : "var(--text-muted)" }}>{c.avg_overlap}% overlap</span>
            {c.consolidation_candidate && <Badge color="red">Consolidation Candidate</Badge>}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">{c.size} roles</span>
        </div>
        {/* Overlap bar */}
        <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden mb-3"><div className="h-full rounded-full transition-all" style={{ width: `${c.avg_overlap}%`, background: c.avg_overlap >= 70 ? "var(--risk)" : c.avg_overlap >= 50 ? "var(--warning)" : "var(--success)" }} /></div>
        {/* Roles in cluster */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {c.roles.map(r => <span key={r} className="text-[11px] px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">{r}</span>)}
        </div>
        {/* Shared characteristics */}
        {c.shared_characteristics.length > 0 && <div className="text-[10px] text-[var(--text-muted)]">Shared traits: {c.shared_characteristics.join(", ")}</div>}
        {c.consolidation_candidate && <div className="mt-2 text-[11px] text-[var(--risk)] bg-[var(--risk)]/5 rounded-lg px-3 py-2 border border-[var(--risk)]/20">These roles share 70%+ task characteristics and are candidates for consolidation into a single role family.</div>}
      </div>)}
    </div>

    <NextStepBar currentModuleId="scan" onNavigate={onNavigate || onBack} />
  </div>;
}
