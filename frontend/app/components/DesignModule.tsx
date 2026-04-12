"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import { fmt } from "../../lib/formatters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, CartesianGrid } from "recharts";
import {
  ViewContext, COLORS, TT, SPAN_BENCHMARKS,
  KpiCard, Card, Empty, Badge, InsightPanel, NarrativePanel, DataTable,
  BarViz, DonutViz, RadarViz, TabBar, PageHeader, LoadingBar, LoadingSkeleton,
  ModuleExportButton, NextStepBar, ContextStrip, InfoButton,
  useApiData, usePersisted, useDebounce, callAI, showToast, logDec,
  exportToCSV, EmptyWithAction, JobDesignState, SIM_PRESETS,
  CareerFrameworkAccordion, HelpBookAccordion, ErrorBoundary,
  AiJobSuggestButton, AiJobSuggestion, fmtNum,
} from "./shared";

export function BBBAFramework({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = usePersisted<Record<string, string>>(`${model}_bbba_overrides`, {});

  useEffect(() => { if (!model) return; setLoading(true); api.getBBBA(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl]);

  const roles = (data?.roles || []) as { role: string; disposition: string; reason: string; strong_candidates: number; reskillable_candidates: number; cost_per_fte: number; fte_needed: number; total_cost: number; required_skills: string[]; timeline_months: number }[];
  const summary = (data?.summary || {}) as Record<string, unknown>;
  const dispColors: Record<string, string> = { Build: "var(--success)", Buy: "var(--accent-primary)", Borrow: "var(--warning)", Automate: "var(--purple)" };
  const dispIcons: Record<string, string> = { Build: "🏗️", Buy: "🛒", Borrow: "🤝", Automate: "🤖" };

  // Strategy meta
  const strategies = [
    { id: "Build", icon: "🎓", color: "var(--success)", label: "Train your existing people", pros: "Cheapest long-term, retains culture", cons: "Slowest (3-12mo)", best: "Skills adjacent to current", cost: "$", time: "🕐🕐🕐" },
    { id: "Buy", icon: "🛒", color: "var(--accent-primary)", label: "Hire new talent externally", pros: "Exact skills immediately", cons: "Expensive, culture risk", best: "Skills don't exist internally", cost: "$$$", time: "🕐🕐" },
    { id: "Borrow", icon: "🤝", color: "var(--warning)", label: "Use contractors or consultants", pros: "Fastest, no commitment", cons: "No knowledge transfer", best: "Temporary or specialized need", cost: "$$", time: "🕐" },
    { id: "Automate", icon: "🤖", color: "var(--purple)", label: "Deploy AI or technology", pros: "Scales infinitely, low ongoing cost", cons: "Upfront investment, change mgmt", best: "Repetitive, rule-based tasks", cost: "$$ then $", time: "🕐🕐" },
  ];
  const [showStratInfo, setShowStratInfo] = useState(true);
  const getDisp = (role: string, orig: string) => overrides[role] || orig;
  const setDisp = (role: string, disp: string) => { setOverrides(prev => ({...prev, [role]: disp})); logDec("BBBA", `Set ${role} to ${disp}`, `Changed talent strategy disposition`); };
  const buildCount = roles.filter(r => getDisp(r.role, r.disposition) === "Build").length;
  const buyCount = roles.filter(r => getDisp(r.role, r.disposition) === "Buy").length;
  const borrowCount = roles.filter(r => getDisp(r.role, r.disposition) === "Borrow").length;
  const autoCount = roles.filter(r => getDisp(r.role, r.disposition) === "Automate").length;
  const totalCost = roles.reduce((s, r) => s + r.total_cost, 0);
  const avgTimeline = roles.length ? Math.round(roles.reduce((s, r) => s + r.timeline_months, 0) / roles.length) : 0;

  return <div>
    <PageHeader icon="🎯" title="Talent Strategy" subtitle="For each capability gap, decide the smartest way to close it" onBack={onBack} moduleId="bbba" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="bbba" label="Talent Strategy" /></div>}
    {loading && <LoadingBar />}
    {!loading && roles.length === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-10 text-center"><div className="text-4xl mb-3 opacity-40">🎯</div><h3 className="text-[18px] font-bold font-heading text-[var(--text-primary)] mb-2">Complete Skills Gap Analysis First</h3><p className="text-[16px] text-[var(--text-secondary)] max-w-md mx-auto mb-4">Every gap has four options — each with different costs, timelines, and risks. This tool helps you choose.</p><div className="flex gap-3 justify-center">{onNavigate && <><button onClick={() => onNavigate("design")} className="px-4 py-2 rounded-xl text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Go to Work Design Lab →</button><button onClick={() => onNavigate("scan")} className="px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Go to AI Scan →</button></>}</div></div>}

    {/* ═══ STRATEGY EXPLAINER CARDS ═══ */}
    {roles.length > 0 && <div className="mb-5">
      <button onClick={() => setShowStratInfo(!showStratInfo)} className="text-[13px] text-[var(--text-muted)] mb-2 hover:text-[var(--accent-primary)]">{showStratInfo ? "▾ Hide" : "▸ Show"} strategy guide</button>
      {showStratInfo && <div className="grid grid-cols-4 gap-3">
        {strategies.map(s => <div key={s.id} className="rounded-xl p-4" style={{ borderLeft: `3px solid ${s.color}`, background: "var(--surface-1)", boxShadow: "var(--shadow-1)" }}>
          <div className="flex items-center gap-2 mb-2"><span className="text-[20px]">{s.icon}</span><span className="text-[15px] font-bold" style={{ color: s.color }}>{s.id}</span></div>
          <div className="text-[13px] text-[var(--text-secondary)] mb-2">{s.label}</div>
          <div className="text-[12px] text-[var(--success)] mb-0.5">✓ {s.pros}</div>
          <div className="text-[12px] text-[var(--risk)] mb-0.5">✗ {s.cons}</div>
          <div className="text-[12px] text-[var(--text-muted)] italic mt-1">Best when: {s.best}</div>
          <div className="flex justify-between mt-2 text-[11px] text-[var(--text-muted)]"><span>Cost: {s.cost}</span><span>{s.time}</span></div>
        </div>)}
      </div>}
    </div>}

    {/* ═══ ROLE DECISION CARDS ═══ */}
    {roles.length > 0 && <div className="space-y-4 mb-6">
      {roles.map(r => {
        const disp = getDisp(r.role, r.disposition);
        return <div key={r.role} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden" style={{ boxShadow: "var(--shadow-1)" }}>
          {/* Role header */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border)]" style={{ background: "var(--surface-2)" }}>
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-bold text-[var(--text-primary)] font-heading">{r.role}</span>
              <span className="text-[12px] px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold">{r.fte_needed} FTE</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
              <span>✨ AI Recommends:</span>
              <span className="font-bold" style={{ color: dispColors[r.disposition] }}>{dispIcons[r.disposition]} {r.disposition}</span>
            </div>
          </div>
          {/* Four strategy panels */}
          <div className="grid grid-cols-4 gap-0">
            {strategies.map(s => {
              const isSelected = disp === s.id;
              const costEst = s.id === "Build" ? Math.round(r.total_cost * 0.3) : s.id === "Buy" ? Math.round(r.total_cost * 1.2) : s.id === "Borrow" ? Math.round(r.total_cost * 0.7) : Math.round(r.total_cost * 0.5);
              const timeEst = s.id === "Build" ? Math.max(r.timeline_months, 6) : s.id === "Buy" ? Math.round(r.timeline_months * 0.6) : s.id === "Borrow" ? Math.max(Math.round(r.timeline_months * 0.3), 1) : Math.round(r.timeline_months * 0.8);
              const riskLevel = s.id === "Build" ? "Low" : s.id === "Buy" ? "Medium" : s.id === "Borrow" ? "Low" : "High";
              return <button key={s.id} onClick={() => setDisp(r.role, s.id)} className="p-4 text-left transition-all border-r border-[var(--border)] last:border-r-0" style={{
                background: isSelected ? `${s.color}08` : "transparent",
                borderTop: isSelected ? `3px solid ${s.color}` : "3px solid transparent",
              }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[16px]">{s.icon}</span>
                  <span className="text-[14px] font-bold" style={{ color: isSelected ? s.color : "var(--text-primary)" }}>{s.id}</span>
                  {isSelected && <span className="text-[12px] ml-auto" style={{ color: s.color }}>✓</span>}
                </div>
                <div className="text-[13px] text-[var(--text-secondary)] mb-1">{s.id === "Build" ? `Train ${r.strong_candidates + r.reskillable_candidates} people` : s.id === "Buy" ? `Hire ${r.fte_needed} new` : s.id === "Borrow" ? `Contract ${Math.max(1, Math.round(r.fte_needed * 0.7))}` : "Deploy AI tool"}</div>
                <div className="text-[12px] text-[var(--text-muted)]">Cost: <span className="font-bold font-data">{fmtNum(costEst)}</span></div>
                <div className="text-[12px] text-[var(--text-muted)]">Time: <span className="font-bold">{timeEst}mo</span></div>
                <div className="text-[12px]" style={{ color: riskLevel === "High" ? "var(--risk)" : riskLevel === "Medium" ? "var(--warning)" : "var(--success)" }}>Risk: {riskLevel}</div>
              </button>;
            })}
          </div>
          {/* Selected strategy detail */}
          <div className="px-5 py-3 text-[14px] text-[var(--text-secondary)] border-t border-[var(--border)]" style={{ background: `${dispColors[disp]}04` }}>
            <span className="font-semibold" style={{ color: dispColors[disp] }}>{dispIcons[disp]} {disp}:</span> {r.reason}
            {r.required_skills.length > 0 && <span className="text-[var(--text-muted)]"> · Skills: {r.required_skills.slice(0, 3).join(", ")}</span>}
          </div>
        </div>;
      })}
    </div>}

    {/* ═══ STRATEGY MIX DASHBOARD ═══ */}
    {roles.length > 0 && <div className="grid grid-cols-2 gap-5 mb-5">
      <Card title="Strategy Mix">
        <DonutViz data={[{name:"Build",value:buildCount},{name:"Buy",value:buyCount},{name:"Borrow",value:borrowCount},{name:"Automate",value:autoCount}]} />
        {/* Benchmark comparison */}
        <div className="mt-4 space-y-2">
          <div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Your Mix vs. Benchmark</div>
          {[{ label: "Build", yours: Math.round(buildCount / Math.max(roles.length, 1) * 100), bench: 35, color: "var(--success)" },
            { label: "Buy", yours: Math.round(buyCount / Math.max(roles.length, 1) * 100), bench: 25, color: "var(--accent-primary)" },
            { label: "Borrow", yours: Math.round(borrowCount / Math.max(roles.length, 1) * 100), bench: 15, color: "var(--warning)" },
            { label: "Automate", yours: Math.round(autoCount / Math.max(roles.length, 1) * 100), bench: 25, color: "var(--purple)" },
          ].map(b => <div key={b.label} className="flex items-center gap-2 text-[13px]">
            <span className="w-16 text-[var(--text-muted)]">{b.label}</span>
            <div className="flex-1 h-3 bg-[var(--surface-2)] rounded-full overflow-hidden relative">
              <div className="h-full rounded-full" style={{ width: `${b.yours}%`, background: b.color }} />
              <div className="absolute top-0 h-full w-0.5 bg-white/30" style={{ left: `${b.bench}%` }} title={`Benchmark: ${b.bench}%`} />
            </div>
            <span className="font-bold font-data w-10 text-right" style={{ color: b.color }}>{b.yours}%</span>
          </div>)}
        </div>
      </Card>
      <Card title="Investment Summary">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[{ l: "Total Investment", v: fmtNum(totalCost), c: "var(--text-primary)" }, { l: "Avg Timeline", v: `${avgTimeline}mo`, c: "#0EA5E9" }, { l: "To Reskill", v: String(buildCount), c: "var(--success)" }, { l: "To Hire", v: String(buyCount), c: "var(--accent-primary)" }].map(k => <div key={k.l} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold font-data" style={{ color: k.c }}>{k.v}</div><div className="text-[11px] text-[var(--text-muted)] uppercase">{k.l}</div></div>)}
        </div>
        {/* Insight */}
        {buildCount > buyCount * 1.5 && <div className="rounded-xl p-3 border-l-3" style={{ borderLeft: "3px solid var(--accent-primary)", background: "rgba(212,134,10,0.04)" }}>
          <div className="text-[14px] text-[var(--text-secondary)]">💡 You{"'"}re investing heavily in BUILD ({Math.round(buildCount / Math.max(roles.length, 1) * 100)}%) — cost-effective but extends timeline by ~3 months vs. a BUY-heavy approach.</div>
        </div>}
        {buyCount > buildCount && <div className="rounded-xl p-3 border-l-3" style={{ borderLeft: "3px solid var(--warning)", background: "rgba(245,158,11,0.04)" }}>
          <div className="text-[14px] text-[var(--text-secondary)]">⚠️ BUY-heavy strategy ({Math.round(buyCount / Math.max(roles.length, 1) * 100)}%) is fast but expensive. Consider shifting 2-3 roles to BUILD where skill adjacency is high.</div>
        </div>}
      </Card>
    </div>}

    <NextStepBar currentModuleId="bbba" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: HEADCOUNT PLANNING
   ═══════════════════════════════════════════════════════════════ */

export function HeadcountPlanning({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  // Read BBBA overrides from localStorage to inform headcount
  const bbbaOverrides = usePersisted<Record<string, string>>(`${model}_bbba_overrides`, {})[0];
  useEffect(() => { if (!model) return; setLoading(true); api.getHeadcountPlan(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl, bbbaOverrides]);

  const wf = (data?.waterfall || {}) as Record<string, unknown>;
  const depts = (data?.departments || []) as { department: string; current_fte: number; eliminated: number; redeployed: number; new_hires: number; future_fte: number; pct_change: number }[];
  const timeline = (data?.timeline || {}) as Record<string, string>;

  return <div>
    <PageHeader icon="👥" title="Headcount Planning" subtitle="Current to future workforce evolution" onBack={onBack} moduleId="headcount" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="headcount" label="Headcount Plan" /></div>}
    {loading && <LoadingBar />}
    {!loading && Number(wf.starting_headcount || 0) === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">👥</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Upload Data for Headcount Planning</h3><p className="text-[15px] text-[var(--text-secondary)]">Complete BBBA to generate headcount waterfall.</p></div>}
    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Current HC" value={Number(wf.starting_headcount || 0)} /><KpiCard label="Eliminations" value={Number(wf.eliminations || 0)} /><KpiCard label="New Hires" value={Number(wf.new_hires || 0)} accent /><KpiCard label="Target HC" value={Number(wf.target_headcount || 0)} accent /><KpiCard label="Net Change" value={`${Number(wf.net_change_pct || 0)}%`} />
    </div>

    {/* Waterfall */}
    <Card title="Headcount Waterfall">
      <div className="flex items-end gap-1 h-48 mb-4 px-4">{[
        { label: "Start", value: Number(wf.starting_headcount || 0), color: "var(--accent-primary)" },
        { label: "Eliminated", value: -Number(wf.eliminations || 0), color: "var(--risk)" },
        { label: "Attrition", value: -Number(wf.natural_attrition || 0), color: "var(--warning)" },
        { label: "Redeployed", value: Number(wf.redeployments || 0), color: "var(--success)" },
        { label: "New Hires", value: Number(wf.new_hires || 0), color: "var(--accent-primary)" },
        { label: "Contractors", value: Number(wf.contractors || 0), color: "var(--purple)" },
        { label: "Target", value: Number(wf.target_headcount || 0), color: "var(--success)" },
      ].map(bar => { const maxVal = Math.max(Number(wf.starting_headcount || 1), Number(wf.target_headcount || 1)); const h = Math.abs(bar.value) / maxVal * 100; return <div key={bar.label} className="flex-1 flex flex-col items-center justify-end">
        <div className="text-[15px] font-bold mb-1" style={{ color: bar.color }}>{bar.value > 0 ? "+" : ""}{bar.value}</div>
        <div className="w-full rounded-t" style={{ height: `${Math.max(h, 5)}%`, background: `${bar.color}30`, border: `1px solid ${bar.color}50` }} />
        <div className="text-[15px] text-[var(--text-muted)] mt-1 text-center">{bar.label}</div>
      </div>; })}</div>
    </Card>

    {/* Department breakdown */}
    <Card title="Department Breakdown">
      <div className="overflow-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[15px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Department</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Current</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Eliminated</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Redeployed</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">New Hires</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Future</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Change</th></tr></thead>
      <tbody>{depts.map(d => <tr key={d.department} className="border-b border-[var(--border)]"><td className="px-3 py-2 font-semibold">{d.department}</td><td className="px-2 py-2 text-center">{d.current_fte}</td><td className="px-2 py-2 text-center text-[var(--risk)]">-{d.eliminated}</td><td className="px-2 py-2 text-center text-[var(--success)]">{d.redeployed}</td><td className="px-2 py-2 text-center text-[var(--accent-primary)]">+{d.new_hires}</td><td className="px-2 py-2 text-center font-bold">{d.future_fte}</td><td className="px-2 py-2 text-center" style={{color: d.pct_change >= 0 ? "var(--success)" : "var(--risk)"}}>{d.pct_change > 0 ? "+" : ""}{d.pct_change}%</td></tr>)}</tbody></table></div>
    </Card>

    {/* Timeline */}
    <Card title="Transition Timeline">
      <div className="space-y-3">{[{phase:"Phase 1",time:timeline.phase_1_months,action:timeline.phase_1_actions,color:"var(--accent-primary)"},{phase:"Phase 2",time:timeline.phase_2_months,action:timeline.phase_2_actions,color:"var(--success)"},{phase:"Phase 3",time:timeline.phase_3_months,action:timeline.phase_3_actions,color:"var(--purple)"}].map((p,i) => <div key={i} className="flex gap-3 p-3 rounded-xl bg-[var(--surface-2)]"><div className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-bold text-white shrink-0" style={{background:p.color}}>{i+1}</div><div><div className="text-[15px] font-bold text-[var(--text-primary)]">{p.phase} <span className="text-[var(--text-muted)] font-normal">Month {p.time}</span></div><div className="text-[15px] text-[var(--text-secondary)]">{p.action}</div></div></div>)}</div>
    </Card>

    {/* Financial Impact */}
    <Card title="Financial Impact Summary">
      {(() => {
        const avgComp = 100000;
        const eliminated = Number(wf.eliminations || 0);
        const newHires = Number(wf.new_hires || 0);
        const savings = eliminated * avgComp;
        const hireCost = newHires * avgComp * 1.3;
        const severance = Math.max(0, eliminated - Number(wf.natural_attrition || 0)) * avgComp * 0.25;
        const netYear1 = savings - hireCost - severance;
        return <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Annual Savings</div><div className="text-[22px] font-extrabold text-[var(--success)]">{fmtNum(savings)}</div><div className="text-[14px] text-[var(--text-muted)]">From {eliminated} role eliminations</div></div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Hiring Cost</div><div className="text-[22px] font-extrabold text-[var(--risk)]">{fmtNum(hireCost)}</div><div className="text-[14px] text-[var(--text-muted)]">For {newHires} new roles</div></div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Transition Cost</div><div className="text-[22px] font-extrabold text-[var(--warning)]">{fmtNum(severance)}</div><div className="text-[14px] text-[var(--text-muted)]">Severance & onboarding</div></div>
          <div className="rounded-xl p-4 text-center border-2" style={{borderColor: netYear1 >= 0 ? "var(--success)" : "var(--risk)"}}><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Net Year 1</div><div className="text-[22px] font-extrabold" style={{color: netYear1 >= 0 ? "var(--success)" : "var(--risk)"}}>{netYear1 >= 0 ? "" : "-"}{fmtNum(Math.abs(netYear1))}</div><div className="text-[14px] text-[var(--text-muted)]">{netYear1 >= 0 ? "Net positive" : "Investment year"}</div></div>
        </div>;
      })()}
    </Card>

    {/* Workforce Composition Shift */}
    <Card title="Workforce Composition Shift">
      <div className="grid grid-cols-2 gap-6">
        <div className="text-center"><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">Before</div><div className="flex justify-center gap-8"><div><div className="text-[28px] font-extrabold text-[var(--text-primary)]">{Number(wf.starting_headcount || 0)}</div><div className="text-[15px] text-[var(--text-muted)]">Total HC</div></div></div></div>
        <div className="text-center"><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase mb-2">After</div><div className="flex justify-center gap-8"><div><div className="text-[28px] font-extrabold" style={{color: Number(wf.net_change || 0) >= 0 ? "var(--success)" : "var(--risk)"}}>{Number(wf.target_headcount || 0)}</div><div className="text-[15px] text-[var(--text-muted)]">Target HC ({Number(wf.net_change_pct || 0) > 0 ? "+" : ""}{Number(wf.net_change_pct || 0)}%)</div></div></div></div>
      </div>
    </Card>

    <InsightPanel title="Headcount Insights" items={[
      `Net headcount change: ${Number(wf.net_change || 0) > 0 ? "+" : ""}${wf.net_change || 0} (${Number(wf.net_change_pct || 0) > 0 ? "+" : ""}${wf.net_change_pct || 0}%)`,
      `Natural attrition absorbs ${wf.natural_attrition || 0} of ${wf.eliminations || 0} eliminations — reducing forced displacement`,
      `Operations sees largest shift: most automatable tasks concentrated there`,
      `Phased over 18 months: redeployments first (months 1-6), then hiring (7-12), then transition (13-18)`,
    ]} icon="👥" />

    <NextStepBar currentModuleId="headcount" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: RESKILLING PATHWAYS
   ═══════════════════════════════════════════════════════════════ */

export const TASK_DICTIONARY: Record<string, { industry: string; tasks: { name: string; workstream: string; pct: number; type: string; logic: string; interaction: string; impact: string; skill1: string; skill2: string }[] }[]> = {
  "Financial Analyst": [
    { industry: "Financial Services", tasks: [
      {name:"Monthly financial close & reporting",workstream:"Close",pct:20,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Financial Reporting",skill2:"ERP Systems"},
      {name:"Budget variance analysis",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Financial Analysis",skill2:"Excel"},
      {name:"Revenue forecasting models",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Independent",impact:"Moderate",skill1:"Forecasting",skill2:"Statistical Analysis"},
      {name:"Board deck preparation",workstream:"Reporting",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Collaborative",impact:"High",skill1:"PowerPoint",skill2:"Communication"},
      {name:"Regulatory filing support",workstream:"Compliance",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Regulatory Knowledge",skill2:"Compliance"},
      {name:"Ad-hoc analysis for leadership",workstream:"Analysis",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Critical Thinking",skill2:"Stakeholder Mgmt"},
      {name:"Data reconciliation & validation",workstream:"Close",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Data Quality",skill2:"SQL"},
      {name:"Process improvement initiatives",workstream:"Operations",pct:5,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Process Design",skill2:"Change Mgmt"},
    ]},
    { industry: "Technology", tasks: [
      {name:"Revenue recognition & ASC 606",workstream:"Close",pct:15,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Revenue Recognition",skill2:"ERP Systems"},
      {name:"SaaS metrics dashboard (ARR, churn)",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Independent",impact:"Moderate",skill1:"SaaS Metrics",skill2:"BI Tools"},
      {name:"Headcount planning & burn rate",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Collaborative",impact:"Moderate",skill1:"Workforce Planning",skill2:"Financial Modeling"},
      {name:"Investor relations support",workstream:"Reporting",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Investor Relations",skill2:"Communication"},
      {name:"Expense management & approvals",workstream:"Operations",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Expense Management",skill2:"Policy"},
      {name:"Scenario modeling (fundraise, M&A)",workstream:"Analysis",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Low",skill1:"Financial Modeling",skill2:"Valuation"},
      {name:"Month-end accruals & journal entries",workstream:"Close",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Accounting",skill2:"ERP Systems"},
      {name:"Cross-functional business reviews",workstream:"Reporting",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Business Partnering",skill2:"Presentation"},
    ]},
    { industry: "Manufacturing", tasks: [
      {name:"Cost accounting & COGS analysis",workstream:"Close",pct:20,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Cost Accounting",skill2:"ERP Systems"},
      {name:"Plant P&L variance reporting",workstream:"FP&A",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Variance Analysis",skill2:"Manufacturing Finance"},
      {name:"CapEx tracking & ROI analysis",workstream:"Analysis",pct:10,type:"Variable",logic:"Probabilistic",interaction:"Collaborative",impact:"Moderate",skill1:"Capital Planning",skill2:"ROI Analysis"},
      {name:"Inventory valuation & reserves",workstream:"Close",pct:15,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Inventory Accounting",skill2:"GAAP"},
      {name:"Transfer pricing calculations",workstream:"Tax",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Transfer Pricing",skill2:"Tax"},
      {name:"Standard cost updates",workstream:"Close",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Standard Costing",skill2:"BOM Analysis"},
      {name:"Budget preparation (bottom-up)",workstream:"FP&A",pct:10,type:"Variable",logic:"Probabilistic",interaction:"Collaborative",impact:"Moderate",skill1:"Budgeting",skill2:"Excel"},
      {name:"Management reporting & KPIs",workstream:"Reporting",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"KPI Design",skill2:"Visualization"},
    ]},
  ],
  "HR Business Partner": [
    { industry: "General", tasks: [
      {name:"Workforce planning & headcount mgmt",workstream:"Planning",pct:15,type:"Variable",logic:"Probabilistic",interaction:"Collaborative",impact:"Moderate",skill1:"Workforce Planning",skill2:"Analytics"},
      {name:"Employee relations case management",workstream:"ER",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Interactive",impact:"Low",skill1:"Employee Relations",skill2:"Employment Law"},
      {name:"Performance management coaching",workstream:"Talent",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Coaching",skill2:"Performance Mgmt"},
      {name:"Compensation review & benchmarking",workstream:"Rewards",pct:10,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Compensation",skill2:"Market Data"},
      {name:"Talent review & succession planning",workstream:"Talent",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Talent Management",skill2:"Succession Planning"},
      {name:"Organizational design support",workstream:"OD",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Org Design",skill2:"Change Mgmt"},
      {name:"HR data & people analytics reporting",workstream:"Analytics",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"People Analytics",skill2:"HRIS"},
      {name:"Policy interpretation & guidance",workstream:"Operations",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Interactive",impact:"Moderate",skill1:"HR Policy",skill2:"Communication"},
      {name:"Onboarding & integration support",workstream:"Talent",pct:5,type:"Repetitive",logic:"Deterministic",interaction:"Collaborative",impact:"High",skill1:"Onboarding",skill2:"Process Design"},
    ]},
  ],
  "Software Engineer": [
    { industry: "Technology", tasks: [
      {name:"Feature development & coding",workstream:"Engineering",pct:30,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Programming",skill2:"System Design"},
      {name:"Code review & PR management",workstream:"Quality",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Code Review",skill2:"Communication"},
      {name:"Testing & QA automation",workstream:"Quality",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Testing",skill2:"Automation"},
      {name:"Technical documentation",workstream:"Documentation",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Technical Writing",skill2:"Documentation"},
      {name:"Sprint planning & ceremonies",workstream:"Agile",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Agile/Scrum",skill2:"Estimation"},
      {name:"Incident response & on-call",workstream:"Operations",pct:10,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Debugging",skill2:"Monitoring"},
      {name:"Architecture & design reviews",workstream:"Engineering",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"System Design",skill2:"Architecture"},
      {name:"CI/CD pipeline maintenance",workstream:"DevOps",pct:5,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"DevOps",skill2:"Cloud"},
    ]},
  ],
  "Nurse Manager": [
    { industry: "Healthcare", tasks: [
      {name:"Staff scheduling & shift management",workstream:"Operations",pct:20,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Scheduling",skill2:"Workforce Planning"},
      {name:"Patient care quality oversight",workstream:"Clinical",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Clinical Leadership",skill2:"Quality Improvement"},
      {name:"Staff performance & development",workstream:"People",pct:15,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Leadership",skill2:"Coaching"},
      {name:"Compliance & regulatory reporting",workstream:"Compliance",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Regulatory Knowledge",skill2:"Documentation"},
      {name:"Budget management & supply orders",workstream:"Finance",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Budget Management",skill2:"Procurement"},
      {name:"Interdisciplinary care coordination",workstream:"Clinical",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Care Coordination",skill2:"Communication"},
      {name:"Incident & safety reporting",workstream:"Safety",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Incident Management",skill2:"Patient Safety"},
      {name:"Patient & family communication",workstream:"Clinical",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Communication",skill2:"Empathy"},
    ]},
  ],
  "Data Analyst": [
    { industry: "General", tasks: [
      {name:"Data extraction & SQL querying",workstream:"Data",pct:20,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"SQL",skill2:"Data Modeling"},
      {name:"Dashboard creation & maintenance",workstream:"Visualization",pct:15,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"BI Tools",skill2:"Data Visualization"},
      {name:"Ad-hoc analysis & insights",workstream:"Analysis",pct:20,type:"Variable",logic:"Probabilistic",interaction:"Interactive",impact:"Moderate",skill1:"Statistical Analysis",skill2:"Critical Thinking"},
      {name:"Data quality auditing",workstream:"Data",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Data Quality",skill2:"ETL"},
      {name:"Stakeholder presentations",workstream:"Communication",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Communication",skill2:"Storytelling"},
      {name:"Report automation & scheduling",workstream:"Automation",pct:10,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Python/R",skill2:"Automation"},
      {name:"Requirements gathering",workstream:"Analysis",pct:10,type:"Variable",logic:"Judgment-heavy",interaction:"Collaborative",impact:"Low",skill1:"Business Analysis",skill2:"Requirements"},
      {name:"Documentation & knowledge mgmt",workstream:"Documentation",pct:5,type:"Repetitive",logic:"Deterministic",interaction:"Independent",impact:"High",skill1:"Documentation",skill2:"Knowledge Mgmt"},
    ]},
  ],
};

// Get matching dictionary entries for a job title (fuzzy match)
export function findTaskDictEntries(jobTitle: string): { industry: string; tasks: typeof TASK_DICTIONARY[string][0]["tasks"] }[] {
  const lower = jobTitle.toLowerCase();
  for (const [role, entries] of Object.entries(TASK_DICTIONARY)) {
    if (lower.includes(role.toLowerCase()) || role.toLowerCase().includes(lower)) return entries;
  }
  // Fuzzy: check if any word matches
  const words = lower.split(/\s+/);
  for (const [role, entries] of Object.entries(TASK_DICTIONARY)) {
    const roleWords = role.toLowerCase().split(/\s+/);
    if (words.some(w => roleWords.some(rw => rw.includes(w) || w.includes(rw)))) return entries;
  }
  return [];
}

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
  // Reset to Context tab when job changes
  useEffect(() => { if (job) setWdTab("ctx"); }, [job]);
  const js = jobStates[job] || { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false };

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

  const k = (ctx?.kpis ?? {}) as Record<string, unknown>;
  const meta = (ctx?.meta ?? {}) as Record<string, string>;
  const ws = ((ctx?.ws_breakdown ?? []) as Record<string, unknown>[]);
  const ds = ((ctx?.decon_summary ?? []) as Record<string, unknown>[]);
  const aid = ((ctx?.ai_distribution ?? []) as { name: string; value: number }[]);
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

  // ── Step definitions for the guided workflow ──
  const steps = [
    { id: "ctx", num: "①", label: "Context", done: js.initialized && js.deconRows.length > 0 },
    { id: "decon", num: "②", label: "Deconstruction", done: js.deconSubmitted },
    { id: "redeploy", num: "③", label: "Work Options", done: js.redeploySubmitted },
    { id: "recon", num: "④", label: "Reconstruction", done: !!js.recon },
    { id: "impact", num: "⑤", label: "Impact Summary", done: js.finalized },
  ];
  const [jobSearch, setJobSearch] = useState("");
  const filteredJobs = jobSearch ? jobs.filter(j => j.toLowerCase().includes(jobSearch.toLowerCase())) : jobs;

  // ── STEP 0: Job Selector (no job selected) ──
  if (!job) return <div style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(212,134,10,0.04) 0%, transparent 60%)", minHeight: "calc(100vh - 48px)" }}>
    <PageHeader icon="✏️" title="Work Design Lab" subtitle="Mercer Work Design methodology — select a job to begin analysis" onBack={onBack} moduleId="design" />

    <div className="max-w-3xl mx-auto px-6">
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">✏️</div>
        <h2 className="text-[24px] font-bold font-heading text-[var(--text-primary)] mb-2">Select a Job to Analyze</h2>
        <p className="text-[14px] text-[var(--text-secondary)]">Pick a role from your organization to walk through the structured work redesign process.</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <input value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Search jobs..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/40 placeholder:text-[var(--text-muted)]" />
      </div>

      {/* Recently Analyzed */}
      {(completedJobs.length > 0 || inProgressJobs.length > 0) && <div className="mb-6">
        <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recently Analyzed</div>
        <div className="flex gap-2 flex-wrap">
          {[...inProgressJobs, ...completedJobs].slice(0, 6).map(j => {
            const st = jobStates[j]; const done = st?.finalized;
            return <button key={j} onClick={() => onSelectJob(j)} className="px-3 py-2 rounded-lg border text-[15px] font-semibold transition-all hover:border-[var(--accent-primary)]/40" style={{ background: done ? "rgba(16,185,129,0.06)" : "rgba(212,134,10,0.06)", borderColor: done ? "rgba(16,185,129,0.2)" : "rgba(212,134,10,0.2)", color: done ? "var(--success)" : "var(--accent-primary)" }}>
              {done ? "✓ " : "◐ "}{j}
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
      {!jobs.length && <Empty text="No jobs found — upload Work Design data with Job Titles" icon="📭" />}

      {/* Progress */}
      {jobs.length > 0 && <div className="mt-6 text-center text-[15px] text-[var(--text-muted)]">{completedJobs.length}/{jobs.length} jobs finalized · {inProgressJobs.length} in progress</div>}
    </div>
  </div>;

  // ── Main Workspace (job selected) ──
  return <div className="flex gap-0" style={{ minHeight: "calc(100vh - 48px)" }}>
    {/* Left: Step Navigator */}
    <div className="w-48 shrink-0 bg-[var(--surface-1)] border-r border-[var(--border)] py-5 px-3 flex flex-col">
      <button onClick={() => onSelectJob("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-4 transition-colors">← All Jobs</button>
      <div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-1 truncate">{job}</div>
      <div className="text-[14px] text-[var(--text-muted)] mb-4">{meta.Function || "—"} · {meta["Career Level"] || "—"}</div>
      <div className="space-y-1 flex-1">
        {steps.map((s, si) => {
          const isActive = wdTab === s.id;
          const canGo = si === 0 || steps[si - 1].done;
          return <button key={s.id} onClick={() => canGo && setWdTab(s.id)} className="w-full text-left px-3 py-2 rounded-lg text-[15px] transition-all flex items-center gap-2" style={{ background: isActive ? "rgba(212,134,10,0.1)" : "transparent", color: isActive ? "var(--accent-primary)" : canGo ? "var(--text-secondary)" : "var(--text-muted)", cursor: canGo ? "pointer" : "not-allowed", opacity: canGo ? 1 : 0.4 }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0" style={{ background: s.done ? "var(--success)" : isActive ? "var(--accent-primary)" : "var(--surface-2)", color: s.done || isActive ? "#fff" : "var(--text-muted)", border: `1.5px solid ${s.done ? "var(--success)" : isActive ? "var(--accent-primary)" : "var(--border)"}` }}>{s.done ? "✓" : si + 1}</span>
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
          <div className="ml-auto flex items-center gap-2"><Badge color={js.deconSubmitted ? "green" : "gray"}>Decon {js.deconSubmitted ? "✓" : "○"}</Badge><Badge color={js.redeploySubmitted ? "green" : "gray"}>Redeploy {js.redeploySubmitted ? "✓" : "○"}</Badge><Badge color={js.finalized ? "green" : "gray"}>Final {js.finalized ? "✓" : "○"}</Badge></div>
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
              showToast(`✨ Pre-populated ${rows.length} tasks for ${job} — review and edit below`);
            }} />
            <button onClick={() => { generateTasks(); setWdTab("decon"); }} disabled={aiGenerating} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>{aiGenerating ? "Generating..." : "Quick Generate"}</button>
            <button onClick={() => setWdTab("decon")} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)]">Manual Entry →</button>
          </div>
        </div>}
        <div className="grid grid-cols-6 gap-3 mb-5"><KpiCard label="Hours/Week" value={k.hours_week as number ?? 0} accent /><KpiCard label="Tasks" value={k.tasks as number ?? 0} /><KpiCard label="Workstreams" value={k.workstreams as number ?? 0} /><KpiCard label="Released" value={`${k.released_hrs ?? 0}h`} delta={`${k.released_pct ?? 0}%`} /><KpiCard label="Future Hrs" value={k.future_hrs as number ?? 0} /><KpiCard label="Evolution" value={String(k.evolution ?? "—")} /></div>
        <div className="grid grid-cols-12 gap-4"><div className="col-span-5"><Card title="Role Summary"><div className="flex flex-wrap gap-1.5 mb-3">{Object.entries(meta).map(([x, v]) => <Badge key={x} color="indigo">{x}: {v}</Badge>)}</div><p className="text-[15px] text-[var(--text-secondary)]">{String(ctx?.description ?? "No description.")}</p></Card></div><div className="col-span-4"><Card title="Time by Workstream"><BarViz data={ws} labelKey="Workstream" valueKey="Current Time Spent %" /></Card></div><div className="col-span-3"><Card title="Quick Profile"><DataTable data={ds} cols={["Metric", "Value"]} /></Card></div></div>
      </div>}

      {wdTab === "decon" && <div>
        {/* AI generation prompt when no tasks */}
        {js.deconRows.length === 0 && !aiGenerating && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.08)] to-[rgba(192,112,48,0.04)] border border-[rgba(224,144,64,0.2)] rounded-xl p-6 mb-4 text-center">
          <div className="text-2xl mb-2">✨</div>
          <h3 className="text-[15px] font-bold font-heading text-[var(--text-primary)] mb-1">No tasks yet for {job}</h3>
          <p className="text-[15px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">Let AI generate a detailed task breakdown, or add tasks manually below.</p>
          <button onClick={generateTasks} className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", boxShadow: "var(--shadow-2)" }}>✨ Auto-Generate Task Breakdown</button>
        </div>}
        {aiGenerating && <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 mb-4 text-center animate-pulse">
          <div className="text-2xl mb-2">🧠</div>
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
        <div className="grid grid-cols-12 gap-4 mb-5"><div className="col-span-4"><Card title="AI Impact"><DonutViz data={aid} /></Card></div><div className="col-span-4"><Card title="AI Priority"><BarViz data={aip} labelKey="Task Name" valueKey="AI Priority" color="var(--accent-scenario)" /></Card></div><div className="col-span-4"><InsightPanel title="Validation" items={[deconTotal === 100 ? "✓ Time = 100%" : `✗ Time = ${deconTotal}%`, blankRequired === 0 ? "✓ All fields filled" : `✗ ${blankRequired} blank`, deconValid ? "✓ Ready to submit" : "○ Fix issues above"]} icon="📋" /></div></div>
        <Card title="Task Inventory — Editable">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[15px] text-[var(--text-muted)]">{js.deconRows.length} tasks · {totalEstHours}h/wk</span>
            <div className="flex gap-2">
              <button onClick={generateTasks} disabled={aiGenerating || js.finalized} className={`px-3 py-1.5 rounded-md text-[15px] font-semibold transition-all ${aiGenerating ? "animate-pulse" : ""}`} style={{ background: "linear-gradient(135deg, #e09040, #c07030)", color: "#fff", opacity: aiGenerating || js.finalized ? 0.5 : 1 }}>{aiGenerating ? "✨ Generating..." : "✨ Auto-Generate Tasks"}</button>
              {dictEntries.length > 0 && <button onClick={() => setShowTaskDict(d => !d)} className="px-3 py-1.5 rounded-md text-[15px] font-semibold bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.3)] text-[var(--purple)]" style={{ opacity: js.finalized ? 0.5 : 1 }}>📖 Dictionary ({dictEntries.length})</button>}
              <button onClick={() => { const maxId = js.deconRows.reduce((m, r) => { const n = parseInt(String(r["Task ID"] || "T0").replace("T", ""), 10); return n > m ? n : m; }, 0); setJobState(job, { deconRows: [...js.deconRows, { "Task ID": `T${String(maxId + 1).padStart(3, "0")}`, "Task Name": "", Workstream: "", "AI Impact": "Low", "Est Hours/Week": 0, "Current Time Spent %": 0, "Time Saved %": 0, "Task Type": "Variable", Interaction: "Interactive", Logic: "Probabilistic", "Primary Skill": "", "Secondary Skill": "" }], deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] }); }} className="px-3 py-1.5 bg-[var(--surface-3)] rounded-md text-[15px] font-semibold text-[var(--text-secondary)]">+ Add Task</button>
              <button disabled={!deconValid || js.finalized} onClick={() => { setJobState(job, { deconSubmitted: true, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] }); setWdTab("redeploy"); }} className={`px-3 py-1.5 rounded-md text-[15px] font-semibold ${!deconValid || js.finalized ? "bg-[var(--border)] text-[var(--text-muted)]" : "bg-[var(--accent-primary)] text-white hover:opacity-90"}`}>{js.deconSubmitted ? "Update" : "Submit"} Deconstruction</button>
            </div>
          </div>
          {/* Task Dictionary Panel */}
          {showTaskDict && dictEntries.length > 0 && <div className="mb-4 rounded-xl border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.04)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[15px] font-bold text-[var(--purple)]">📖 Task Dictionary — {job}</div>
              <button onClick={() => setShowTaskDict(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer text-[15px]">✕</button>
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
                    showToast(`📖 Loaded ${entry.tasks.length} tasks from ${entry.industry} dictionary`);
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
              <td className="px-2 py-2 w-8"><button onClick={() => { const newRows = js.deconRows.filter((_, i) => i !== idx); setJobState(job, { deconRows: newRows, deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] }); }} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px]">{"\u00D7"}</button></td>
            </tr>; })}</tbody>
            <tfoot><tr className="bg-[var(--surface-2)]"><td className="px-2 py-2 text-[14px] font-bold text-[var(--text-muted)]" colSpan={2}>Total</td><td className="px-2 py-2 text-[15px] font-bold" style={{ color: deconTotal === 100 ? "var(--success)" : "var(--risk)" }}>{deconTotal}%</td><td className="px-2 py-2 text-[15px] font-bold text-[var(--text-muted)]">{(deconTotal * weeklyHours / 100).toFixed(1)}h</td><td colSpan={6} /></tr></tfoot>
          </table></div>
        </Card>
      </div>}

      {wdTab === "redeploy" && <div>{!js.deconSubmitted ? <Empty text="Submit Deconstruction first" icon="🔒" /> : <>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Card title="Scenario"><SelectCell value={js.scenario} onChange={v => setJobState(job, { scenario: v, redeploySubmitted: false, recon: null })} options={["Conservative","Balanced","Transformative"]} /></Card>
          <InsightPanel title="Guidance" items={[`New Time total: ${redeployTotal}%`, "Adjust decisions and future time.", "Submit to see reconstruction."]} icon="🧭" />
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
          }} disabled={js.finalized} className="w-full py-2 rounded-md text-[15px] font-semibold text-white mb-2" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Auto-Recommend</button><div className="text-[15px] text-[var(--text-muted)]">AI assigns Retain/Augment/Automate based on task characteristics</div></Card>
          <Card title="Submit"><button disabled={!redeployValid || js.finalized} onClick={() => { setJobState(job, { redeploySubmitted: true, finalized: false, recon: null }); setWdTab("recon"); }} className={`w-full py-2 rounded-md text-[15px] font-semibold ${!redeployValid ? "bg-[var(--border)] text-[var(--text-muted)]" : "bg-[var(--accent-primary)] text-white"}`}>{js.redeploySubmitted ? "Update" : "Submit"} Redeployment</button></Card>
        </div>
        <Card title="Redeployment Plan — Editable">
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-left text-[15px]"><thead><tr className="bg-[var(--surface-2)]">{["Task ID","Task Name","Decision","Technology","Current %","New %","Destination","Future Skill","Notes"].map(c => <th key={c} className="px-2 py-2 border-b border-[var(--border)] text-[15px] uppercase text-[var(--text-muted)] whitespace-nowrap">{c}</th>)}</tr></thead><tbody>{js.redeployRows.map((row, idx) => <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--hover)]"><td className="px-2 py-2 text-[var(--text-secondary)]">{String(row["Task ID"] ?? "")}</td><td className="px-2 py-2 min-w-[160px] text-[var(--text-secondary)]">{String(row["Task Name"] ?? "")}</td><td className="px-2 py-2 min-w-[120px]"><SelectCell value={row.Decision} onChange={v => updateRedeployCell(idx, "Decision", v)} options={["Retain","Augment","Automate","Redesign","Transfer"]} /></td><td className="px-2 py-2 min-w-[120px]"><SelectCell value={row.Technology} onChange={v => updateRedeployCell(idx, "Technology", v)} options={["Human-led","GenAI","RPA","Agentic AI","ML","Shared Service"]} /></td><td className="px-2 py-2 text-[var(--text-secondary)]">{String(row["Current Time Spent %"] ?? "")}</td><td className="px-2 py-2 min-w-[80px]"><EditableCell type="number" value={row["New Time %"]} onChange={v => updateRedeployCell(idx, "New Time %", v)} /></td><td className="px-2 py-2 min-w-[160px]"><EditableCell value={row["Redeployment Destination"]} onChange={v => updateRedeployCell(idx, "Redeployment Destination", v)} /></td><td className="px-2 py-2 min-w-[120px]"><EditableCell value={row["Future Skill"]} onChange={v => updateRedeployCell(idx, "Future Skill", v)} /></td><td className="px-2 py-2 min-w-[120px]"><EditableCell value={row.Notes} onChange={v => updateRedeployCell(idx, "Notes", v)} /></td></tr>)}</tbody></table></div>
        </Card>
      </>}</div>}

      {wdTab === "recon" && (() => { const r = js.recon; const ac = ((r?.action_counts ?? {}) as Record<string, number>); const wf = ((r?.waterfall ?? {}) as Record<string, number>); const detail = ((r?.reconstruction ?? []) as Record<string, unknown>[]); const rollup = ((r?.rollup ?? []) as Record<string, unknown>[]); const recs = ((r?.recommendations ?? []) as string[]); return !js.redeploySubmitted ? <Empty text="Submit Redeployment first" icon="🔒" /> : <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Automate" value={ac.Automate ?? 0} accent /><KpiCard label="Augment" value={ac.Augment ?? 0} /><KpiCard label="Redesign" value={ac.Redesign ?? 0} /><KpiCard label="Retain" value={ac.Retain ?? 0} /></div><div className="grid grid-cols-12 gap-4 mb-5"><div className="col-span-5"><Card title="Reconstruction Rollup">{rollup.length ? <DataTable data={rollup} /> : <Empty text="Building..." icon="🧱" />}</Card></div><div className="col-span-3"><Card title="Capacity Waterfall">{Object.keys(wf).length ? <div className="flex items-end gap-2 h-40">{Object.entries(wf).map(([n, v], i) => <div key={n} className="flex-1 flex flex-col items-center justify-end"><div className="text-[15px] font-semibold text-[var(--text-secondary)] mb-1">{Number(v).toFixed(1)}h</div><div className="w-full rounded-t" style={{ height: `${Math.max((Number(v) / Math.max(Number(wf.current) || 1, 1)) * 100, 4)}%`, background: COLORS[i % COLORS.length] }} /><div className="text-[15px] text-[var(--text-muted)] mt-1 truncate w-full text-center">{n}</div></div>)}</div> : <Empty text="Building..." icon="📊" />}</Card></div><div className="col-span-4"><InsightPanel title="Recommendations" items={recs.length ? recs : ["Building..."]} icon="🎯" /></div></div><Card title="Future-State Detail"><DataTable data={detail} /></Card><div className="mt-4 flex justify-end"><button disabled={!js.redeploySubmitted || js.finalized} onClick={() => setJobState(job, { finalized: true })} className={`px-4 py-2 rounded-md text-[15px] font-semibold ${js.finalized ? "bg-[var(--success)] text-white" : "bg-[var(--success)] text-white hover:opacity-90"}`}>{js.finalized ? "✓ Finalized" : "Finalize Work Design"}</button></div></div>; })()}

      {wdTab === "impact" && (() => { const r = js.recon; const ins = ((r?.insights ?? []) as Record<string, unknown>[]); const vm = ((r?.value_model ?? {}) as Record<string, unknown>); return !js.redeploySubmitted ? <Empty text="Submit Redeployment to unlock" icon="🔒" /> : <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Current" value={r?.total_current_hrs as number ?? 0} /><KpiCard label="Future" value={r?.total_future_hrs as number ?? 0} /><KpiCard label="Released" value={((r?.total_current_hrs as number ?? 0) - (r?.total_future_hrs as number ?? 0)).toFixed(1)} accent /><KpiCard label="Evolution" value={String(r?.evolution ?? "—")} /></div><div className="grid grid-cols-2 gap-4"><Card title="Transformation Insights"><DataTable data={ins} cols={["Category", "Metric", "Value", "Interpretation"]} /></Card><Card title="Value Model">{Object.keys(vm).length ? <div className="space-y-2">{Object.entries(vm).map(([n, v]) => <div key={n} className="flex justify-between text-[15px]"><span className="text-[var(--text-secondary)]">{n}</span><span className="font-semibold">{String(v)}</span></div>)}</div> : <Empty text="Computing..." />}</Card></div></div>; })()}
    <NextStepBar currentModuleId="design" onNavigate={onBack} />
      </div>
    </div>
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 5: IMPACT SIMULATOR
   Converted from simulate-full.html — scenarios, custom builder,
   redeployment, ROI, AI readiness with 5-dimension rubric
   ═══════════════════════════════════════════════════════════════ */


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

export function OrgDesignStudio({ onBack, model, f, odsState, setOdsState, viewCtx }: { onBack: () => void; model: string; f: Filters; odsState: { activeScenario: number; view: string }; setOdsState: (s: { activeScenario: number; view: string }) => void; viewCtx?: ViewContext }) {
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
      } catch {} setAiOdsLoading(false); }} disabled={aiOdsLoading} className="px-3 py-2 rounded-lg text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: aiOdsLoading ? 0.5 : 1 }}>{aiOdsLoading ? "Analyzing..." : "✨ AI Recommendations"}</button>
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
      const layerColors = ["#C07030", "#D4860A", "#D97706", "#E8C547", "#F0C060", "#F5DEB3"];
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
              <div className="flex items-center gap-1"><div className="w-3 h-2 rounded" style={{ background: "#D4860A" }} /> Current</div>
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


/* ═══════════════════════════════════════════════════════════════
   MODULE 7: CHANGE PLANNER
   ═══════════════════════════════════════════════════════════════ */

export const OM_FUNCTIONS: Record<string, { label: string; icon: string; core: string[]; shared: string[]; enabling: string[]; interface_: string[] }> = {
  finance: { label: "Finance & Fund Ops", icon: "💰", core: ["Accounting & Close","Treasury & Cash Mgmt","Tax & Compliance","FP&A & Budgeting","Fund Administration","Financial Reporting","Internal Audit","Procurement","Accounts Payable","Accounts Receivable","Revenue Recognition","Cost Management"], shared: ["Financial Systems","Shared Reporting Pool","Data Governance"], enabling: ["ERP Platform","BI & Analytics Tools","Automation Layer"], interface_: ["Investor Reporting Portal","Management Dashboard","Regulatory Filing"] },
  technology: { label: "Technology & Data", icon: "⚙️", core: ["Software Engineering","Cloud Infrastructure","Data Engineering","Data Science & AI","Cybersecurity","IT Operations","Enterprise Architecture","Platform Engineering","Site Reliability","DevOps & CI/CD"], shared: ["Shared Dev Tools","Identity & Access","Monitoring & Observability"], enabling: ["Cloud Platform","API Gateway","ML Infrastructure"], interface_: ["Developer Portal","IT Service Desk","Client-Facing APIs"] },
  hr: { label: "Human Resources", icon: "👥", core: ["Talent Acquisition","Total Rewards & Comp","Learning & Development","People Analytics","Employee Relations","DEI & Belonging","HR Operations","Workforce Planning","Succession Planning","Performance Management","Organizational Design","Culture & Engagement"], shared: ["HRIS Platform","Payroll Processing","Benefits Administration"], enabling: ["People Analytics Platform","LMS","ATS"], interface_: ["Employee Self-Service","Manager Portal","Candidate Experience"] },
  legal: { label: "Legal & Compliance", icon: "⚖️", core: ["Corporate Legal","Regulatory Affairs","Compliance Operations","Risk Oversight","Privacy & Data Protection","IP & Contracts","Litigation","Policy & Governance","Ethics & Investigations","Licensing"], shared: ["Legal Operations","Contract Management","eDiscovery"], enabling: ["CLM Platform","Compliance Monitoring","Risk Database"], interface_: ["Policy Portal","Whistleblower Channel","Regulatory Dashboard"] },
  investments: { label: "Investment Management", icon: "📈", core: ["Research & Analysis","Deal Origination","Underwriting","Portfolio Management","Trading & Execution","Risk Analytics","Valuation","Asset Allocation","Due Diligence","Portfolio Monitoring","ESG Integration","Co-Investment","Fund Structuring"], shared: ["Investor Relations","Fund Accounting","Performance Reporting"], enabling: ["Trading Platform","Data Feeds","Risk Models","Portfolio Analytics"], interface_: ["Investor Portal","LP Reporting","Deal Pipeline Dashboard"] },
  operations: { label: "Operations", icon: "🔧", core: ["Supply Chain Planning","Manufacturing","Quality Assurance","Logistics & Distribution","Customer Operations","Facilities Management","Process Excellence","Inventory Management","Vendor Management","Safety & Compliance"], shared: ["Shared Services Center","Procurement Hub","Fleet Management"], enabling: ["ERP & MRP","IoT & Sensors","WMS"], interface_: ["Supplier Portal","Customer Service","Operations Dashboard"] },
  marketing: { label: "Marketing & Growth", icon: "📣", core: ["Brand Strategy","Digital Marketing","Content & Creative","Marketing Analytics","Demand Generation","Product Marketing","Communications & PR","Social Media","SEO & SEM","CRM & Lifecycle","Market Research","Events & Sponsorships"], shared: ["Marketing Ops","Creative Services Pool","Media Buying"], enabling: ["Marketing Automation","CMS","Analytics Platform"], interface_: ["Brand Portal","Partner Hub","Campaign Dashboard"] },
  product: { label: "Product & Engineering", icon: "🚀", core: ["Product Management","Frontend Engineering","Backend Engineering","Mobile Engineering","UX/UI Design","Quality Engineering","DevOps","Data Engineering","Machine Learning","Platform Services","Technical Architecture"], shared: ["Design System","Component Library","Testing Infrastructure"], enabling: ["CI/CD Pipeline","Feature Flags","Monitoring"], interface_: ["Product Roadmap Portal","API Documentation","Release Notes"] },
};
export const OM_ARCHETYPES: Record<string, { label: string; desc: string; visual: string; gov: string[]; shared: string[]; traits: Record<string, number>; corePrefix: string; coreSuffix: string; enableTheme: string[]; interfaceTheme: string[]; sharedTheme: string[] }> = {
  functional: { label: "Functional", desc: "Organized by expertise. Clear specialization, deep skill pools.", visual: "silos", gov: ["Executive Leadership Council","Functional Heads Forum","Budget & Resource Committee"], shared: ["HR Shared Services","IT Shared Services","Finance Shared Services","Legal Shared Services"], traits: { efficiency: 5, innovation: 2, speed: 2, scalability: 4, collaboration: 2 }, corePrefix: "", coreSuffix: " Center of Excellence", enableTheme: ["Enterprise Systems","Knowledge Management","Process Automation","Standards & Methodology"], interfaceTheme: ["Internal Service Desk","Reporting Portal","Policy & Compliance Hub"], sharedTheme: ["Centralized Analytics","Shared Admin Pool","Cross-Functional PMO"] },
  divisional: { label: "Divisional", desc: "Organized by business line / product / geography. P&L ownership.", visual: "divisions", gov: ["CEO & Executive Committee","Division Presidents Council","Corporate Strategy Board"], shared: ["Corporate Finance","Legal & Compliance CoE","HR Business Partners","Technology Platform"], traits: { efficiency: 3, innovation: 4, speed: 4, scalability: 3, collaboration: 2 }, corePrefix: "", coreSuffix: " — Division-Led", enableTheme: ["Division P&L Systems","Local Market Tools","Product Lifecycle Platform","Regional Infrastructure"], interfaceTheme: ["Division Dashboard","Customer-Facing Portal","Market Intelligence Hub"], sharedTheme: ["Corporate Shared Services","Cross-Division Synergies","Enterprise Risk Management"] },
  matrix: { label: "Matrix", desc: "Dual reporting: function + business line. Balances depth & breadth.", visual: "matrix", gov: ["Executive Steering Committee","Matrix Governance Board","Conflict Resolution Forum","Resource Arbitration"], shared: ["Shared Analytics & BI","Platform Technology","Talent Marketplace","Cross-Functional PMO"], traits: { efficiency: 3, innovation: 4, speed: 3, scalability: 4, collaboration: 5 }, corePrefix: "", coreSuffix: " (Matrix)", enableTheme: ["Collaboration Platform","Resource Management System","Dual-Reporting Tools","Integrated Planning Suite"], interfaceTheme: ["Unified Dashboard","Matrix Navigation Portal","Skills & Availability Finder"], sharedTheme: ["Shared Capability Pools","Integrated Reporting","Cross-Team Coordination"] },
  platform: { label: "Platform", desc: "Central platform enables autonomous teams. APIs over hierarchy.", visual: "hub", gov: ["Platform Steering Committee","API Governance Board","Standards & Interoperability Council"], shared: ["Core Platform Services","Data & Analytics Layer","Identity & Access Platform","Developer Experience"], traits: { efficiency: 4, innovation: 5, speed: 5, scalability: 5, collaboration: 4 }, corePrefix: "", coreSuffix: " as a Service", enableTheme: ["API Gateway","Self-Service Provisioning","Feature Flag Platform","Observability & Monitoring"], interfaceTheme: ["Developer Portal","Self-Service Marketplace","API Documentation Hub"], sharedTheme: ["Platform-as-a-Service Core","Shared Data Mesh","Common Component Library"] },
  network: { label: "Network", desc: "Fluid, project-based. Teams form and dissolve around missions.", visual: "network", gov: ["Mission Council","Resource Allocation Board","Network Coordination"], shared: ["Knowledge Graph","Talent Pool & Matching","Tooling Commons","Mission Support Services"], traits: { efficiency: 2, innovation: 5, speed: 5, scalability: 3, collaboration: 5 }, corePrefix: "", coreSuffix: " Squad", enableTheme: ["Mission Planning Tools","Team Formation Engine","Knowledge Sharing Platform","Rapid Prototyping Lab"], interfaceTheme: ["Mission Board","Skill Finder","Impact Dashboard"], sharedTheme: ["Floating Resource Pool","Shared Learning Hub","Cross-Mission Insights"] },
};
export const OM_OPMODELS: Record<string, { label: string; desc: string }> = {
  centralized: { label: "Centralized", desc: "Single point of control." }, decentralized: { label: "Decentralized", desc: "Local autonomy." }, federated: { label: "Federated", desc: "Central standards, local execution." }, hub_spoke: { label: "Hub-and-Spoke", desc: "CoE hub with embedded spokes." },
};
export const OM_GOVERNANCE: Record<string, { label: string; icon: string }> = {
  tight: { label: "Tight Governance", icon: "🔒" }, balanced: { label: "Balanced", icon: "⚖️" }, light: { label: "Light Governance", icon: "🌊" },
};
export const OM_LIFECYCLES: Record<string, string[]> = { finance: ["Plan","Record","Report","Analyze","Advise","Close"], technology: ["Discover","Design","Build","Test","Deploy","Operate"], hr: ["Attract","Recruit","Onboard","Develop","Perform","Retain"], legal: ["Identify","Assess","Advise","Draft","Review","Monitor"], investments: ["Research","Source","Diligence","Approve","Execute","Exit"], operations: ["Forecast","Source","Produce","Quality","Ship","Improve"], marketing: ["Research","Strategy","Create","Distribute","Measure","Optimize"], product: ["Discover","Define","Design","Build","Ship","Iterate"] };
export const OM_INTERFACES: Record<string, string[]> = { finance: ["Financial Reporting","Budget & Forecast","Capital Allocation","Audit & Controls"], technology: ["Service Catalog","Data Platform","Security Framework","Dev Portal"], hr: ["Employee Portal","Manager Dashboard","Talent Marketplace","Analytics"], legal: ["Contract Hub","Compliance Portal","Risk Dashboard","Policy Library"], investments: ["Deal Pipeline","Portfolio Dashboard","LP Reporting","Research Library"], operations: ["Order Mgmt","Inventory System","Quality Dashboard","Vendor Portal"], marketing: ["Campaign Hub","Analytics Dashboard","Brand Guidelines","Content Library"], product: ["Product Roadmap","Feature Requests","Release Notes","API Docs"] };
export const OM_COMPANIES: Record<string, { name: string; industry: string; archetype: string; opModel: string; governance: string }> = {
  toyota: { name: "Toyota", industry: "manufacturing", archetype: "functional", opModel: "federated", governance: "tight" },
  tesla: { name: "Tesla", industry: "manufacturing", archetype: "platform", opModel: "centralized", governance: "tight" },
  netflix: { name: "Netflix", industry: "technology", archetype: "network", opModel: "decentralized", governance: "light" },
  amazon: { name: "Amazon", industry: "retail", archetype: "divisional", opModel: "decentralized", governance: "balanced" },
  jpmorgan: { name: "JP Morgan", industry: "financial_services", archetype: "matrix", opModel: "federated", governance: "tight" },
  spotify: { name: "Spotify", industry: "technology", archetype: "matrix", opModel: "federated", governance: "light" },
  microsoft: { name: "Microsoft", industry: "technology", archetype: "platform", opModel: "federated", governance: "balanced" },
};

export function OmBlock({ label, colorClass = "core", highlight, wide, note }: { label: string; colorClass?: string; highlight?: boolean; wide?: boolean; note?: string }) {
  const cm: Record<string, { border: string; text: string }> = { core: { border: "var(--accent-primary)", text: "var(--accent-primary)" }, gov: { border: "var(--teal)", text: "var(--teal)" }, shared: { border: "var(--green)", text: "var(--green)" }, flow: { border: "var(--amber)", text: "var(--amber)" }, purple: { border: "var(--purple)", text: "var(--purple)" } };
  const c = cm[colorClass] || cm.core;
  return <div className="transition-all hover:-translate-y-0.5" style={{ background: highlight ? c.border : "var(--surface-2)", border: `1.5px solid ${c.border}`, borderRadius: 6, padding: wide ? "10px 18px" : "8px 12px", minWidth: wide ? 160 : 80, flex: wide ? "1 1 0" : "0 0 auto", textAlign: "center" }}>
    <div style={{ color: highlight ? "#FFFFFF" : c.text, fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>{label}</div>
    {note && <div className="text-[15px] text-[var(--text-muted)] mt-0.5 italic">{note}</div>}
  </div>;
}

export function OperatingModelLab({ onBack, model, f, projectId, onNavigateCanvas, onModelChange }: { onBack: () => void; model?: string; f?: Filters; projectId?: string; onNavigateCanvas?: () => void; onModelChange?: (modelId: string) => void }) {
  const [omData] = useApiData(() => model ? api.getOperatingModel(model, f || { func: "All", jf: "All", sf: "All", cl: "All" }) : Promise.resolve(null), [model]);
  const hasUploadedOM = omData && (omData as Record<string, unknown>).layers && Object.keys((omData as Record<string, unknown>).layers as object).length > 0;
  const [sandboxLoading, setSandboxLoading] = useState<string|null>(null);
  const seedCompanySandbox = async (companyKey: string, co: Record<string,string>) => {
    if(co.archetype) setArch(co.archetype); if(co.opModel) setOpModel(co.opModel); if(co.governance) setGov(co.governance);
    setSandboxLoading(companyKey);
    try {
      const resp = await fetch(`/api/sandbox/company?company=${encodeURIComponent(companyKey)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.model) {
          // Direct model switch — flows through to all tabs
          if (onModelChange) onModelChange(data.model);
          localStorage.setItem("lastModel", JSON.stringify(data.model));
          showToast(`🏢 ${co.name || companyKey} loaded — ${data.employees} employees, ${data.tasks} tasks`);
        }
      }
    } catch { showToast("Couldn't load sandbox data — check that the backend is running"); }
    setSandboxLoading(null);
  };
  const [aiOmLoading, setAiOmLoading] = useState(false);
  const [aiOmReasoning, setAiOmReasoning] = useState("");
  const [aiCompanyInput, setAiCompanyInput] = useState("");
  const [aiCompanyGenerating, setAiCompanyGenerating] = useState(false);
  const [aiCompanies, setAiCompanies] = useState<Record<string, { name: string; industry: string; archetype: string; opModel: string; governance: string }>>({});
  const generateCompanyModel = async () => {
    if (!aiCompanyInput.trim() || aiCompanyGenerating) return;
    setAiCompanyGenerating(true);
    try { const raw = await callAI("Return ONLY valid JSON.", `What organizational archetype, operating model, and governance style does "${aiCompanyInput.trim()}" use? Return JSON: {"name":"${aiCompanyInput.trim()}","industry":"sector","archetype":"functional|divisional|matrix|platform|network","opModel":"centralized|decentralized|federated|hub_spoke","governance":"tight|balanced|light"}`); const c = JSON.parse(raw.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()); if (c.name) { setAiCompanies(p => ({...p, [c.name.toLowerCase().replace(/\s+/g,"_")]: c})); setArch(c.archetype); setOpModel(c.opModel); setGov(c.governance); setAiCompanyInput(""); }
    } catch {} setAiCompanyGenerating(false);
  };
  const [fn, setFnRaw] = useState("finance");
  const setFn = (f: string) => { setFnRaw(f); setRapidRows(({"finance":["Budget Approval","Investment Decisions","Audit Findings","Revenue Recognition","Tax Strategy","Vendor Selection","Financial Close","Capital Allocation"],"technology":["Architecture Decisions","Security Policies","Vendor/Tool Selection","Release Approvals","Data Governance","AI/ML Deployment","Infrastructure Changes","Tech Debt Priorities"],"hr":["Hiring Decisions","Comp Adjustments","Policy Changes","L&D Investment","Performance Ratings","Org Design","DEI Initiatives","Succession Planning"],"legal":["Litigation Strategy","Regulatory Response","Contract Approval","Policy Updates","Risk Acceptance","IP Decisions","Compliance Programs","Investigations"],"investments":["Investment Thesis","Deal Approval","Portfolio Rebalancing","Risk Limits","Valuation Methods","Exit Decisions","LP Communications","Fund Terms"],"operations":["Supply Chain Changes","Quality Standards","Vendor Selection","Process Redesign","Safety Protocols","Capacity Planning","Outsourcing","Technology Adoption"],"marketing":["Brand Guidelines","Campaign Approval","Budget Allocation","Channel Strategy","Pricing Input","Agency Selection","Content Standards","Market Entry"],"product":["Roadmap Priorities","Architecture Decisions","Feature Launch","Tech Stack","Design Standards","Quality Gates","Resource Allocation","Deprecation"]}[f] || []).map((d: string) => ({d, r:["D","A","R","P"]}))); };
  const [arch, setArch] = useState("functional");
  const [opModel, setOpModel] = useState("centralized");
  const [gov, setGov] = useState("balanced");
  const [omView, setOmView] = useState("1.1");
  const [showTomSummary, setShowTomSummary] = useState(false);
  const [maturityScores, setMaturityScores] = usePersisted<Record<string, number>>(`${fn}_${arch}_maturity`, {});
  const [targetScores, setTargetScores] = usePersisted<Record<string, number>>(`${fn}_${arch}_target`, {});
  const defaultRapid = ({"finance":["Budget Approval","Investment Decisions","Audit Findings","Revenue Recognition","Tax Strategy","Vendor Selection","Financial Close","Capital Allocation"],"technology":["Architecture Decisions","Security Policies","Vendor/Tool Selection","Release Approvals","Data Governance","AI/ML Deployment","Infrastructure Changes","Tech Debt Priorities"],"hr":["Hiring Decisions","Comp Adjustments","Policy Changes","L&D Investment","Performance Ratings","Org Design","DEI Initiatives","Succession Planning"],"legal":["Litigation Strategy","Regulatory Response","Contract Approval","Policy Updates","Risk Acceptance","IP Decisions","Compliance Programs","Investigations"],"investments":["Investment Thesis","Deal Approval","Portfolio Rebalancing","Risk Limits","Valuation Methods","Exit Decisions","LP Communications","Fund Terms"],"operations":["Supply Chain Changes","Quality Standards","Vendor Selection","Process Redesign","Safety Protocols","Capacity Planning","Outsourcing","Technology Adoption"],"marketing":["Brand Guidelines","Campaign Approval","Budget Allocation","Channel Strategy","Pricing Input","Agency Selection","Content Standards","Market Entry"],"product":["Roadmap Priorities","Architecture Decisions","Feature Launch","Tech Stack","Design Standards","Quality Gates","Resource Allocation","Deprecation"]}[fn] || "Strategy,Budget,Talent,Technology,AI Implementation,Process Changes,Vendor Selection,Risk Management".split(",")).map((d: string) => ({d, r:["D","A","R","P"]}));
  const [serviceOverrides, setServiceOverrides] = useState<Record<string, string>>({});
  const [rapidRows, setRapidRows] = useState<{d:string;r:string[]}[]>(defaultRapid);
  const [aiBlueprint, setAiBlueprint] = useState<Record<string, string[]> | null>(null);

  // ── Taxonomy Configurator state ──
  const [omTaxonomy, setOmTaxonomy] = useState<Record<string, unknown> | null>(null);
  const [omIndustries, setOmIndustries] = usePersisted<string[]>(`${projectId}_om_industries`, []);
  const [omSelectedUnits, setOmSelectedUnits] = usePersisted<string[]>(`${projectId}_om_selected_units`, []);
  const [omCustomUnits, setOmCustomUnits] = usePersisted<{id:string;name:string;func:string;layer:string}[]>(`${projectId}_om_custom_units`, []);
  const [omRenames, setOmRenames] = usePersisted<Record<string,string>>(`${projectId}_om_renames`, {});
  const [omScopedUnits, setOmScopedUnits] = usePersisted<Record<string,string>>(`${projectId}_om_scoped`, {}); // unit_id -> "in"|"out"
  const [omSearch, setOmSearch] = useState("");
  const [omSearchResults, setOmSearchResults] = useState<Record<string,unknown>[]>([]);
  const [omExpandedFuncs, setOmExpandedFuncs] = useState<Record<string,boolean>>({});
  const [omAddingCustom, setOmAddingCustom] = useState(false);
  const [omCustomName, setOmCustomName] = useState("");
  const [omCustomFunc, setOmCustomFunc] = useState("");
  const [omCustomLayer, setOmCustomLayer] = useState("Core");

  // ── Strategy Layer state ──
  const STRAT_PRIORITIES_ALL = [
    { id: "revenue", label: "Revenue Growth", icon: "📈", desc: "Expand top-line revenue through new markets, products, or channels" },
    { id: "cost", label: "Cost Optimization", icon: "💰", desc: "Reduce operating costs, improve efficiency, eliminate waste" },
    { id: "innovation", label: "Innovation & R&D", icon: "🔬", desc: "Develop new products, services, or business models" },
    { id: "cx", label: "Customer Experience", icon: "🎯", desc: "Improve satisfaction, retention, and lifetime value" },
    { id: "ops", label: "Operational Excellence", icon: "⚙️", desc: "Standardize, automate, and optimize processes" },
    { id: "risk", label: "Risk & Compliance", icon: "🛡️", desc: "Strengthen controls, regulatory compliance, and resilience" },
    { id: "talent", label: "Talent & Culture", icon: "🧑‍🤝‍🧑", desc: "Attract, develop, and retain top talent" },
    { id: "digital", label: "Digital / AI Transformation", icon: "🤖", desc: "Leverage technology and AI for competitive advantage" },
  ];
  const [stratPriorities, setStratPriorities] = usePersisted<string[]>(`${projectId}_strat_priorities`, []);
  const [stratDesignPrinciples, setStratDesignPrinciples] = usePersisted<Record<string, { value: number; rationale: string }>>(`${projectId}_strat_design_principles`, {
    centralize: { value: 50, rationale: "" }, standardize: { value: 50, rationale: "" },
    buildBuy: { value: 50, rationale: "" }, controlSpeed: { value: 50, rationale: "" },
    specialistGen: { value: 50, rationale: "" },
  });
  const [stratCapMatrix, setStratCapMatrix] = usePersisted<Record<string, string>>(`${projectId}_strat_cap_matrix`, {});
  const [stratVision, setStratVision] = usePersisted<string>(`${projectId}_strat_vision`, "");
  const [stratVisionGenerating, setStratVisionGenerating] = useState(false);
  const [stratBizModel, setStratBizModel] = usePersisted<Record<string, string[]>>(`${projectId}_strat_biz_model`, {
    value_prop: [], key_activities: [], key_resources: [], revenue_cost: [],
  });
  const [stratBizEditField, setStratBizEditField] = useState<string | null>(null);
  const [stratBizEditText, setStratBizEditText] = useState("");

  // ── Governance Layer state ──
  type GovDecision = { id: string; name: string; category: "Strategic" | "Tactical" | "Operational"; owner: string; speed: "Fast" | "Medium" | "Slow"; clarity: "Clear" | "Ambiguous" | "Undefined"; func: string; forumId: string };
  type GovForum = { id: string; name: string; purpose: string; cadence: string; chair: string; members: string[]; parentId: string };
  const GOV_DEFAULT_DECISIONS: GovDecision[] = [
    { id: "d1", name: "Approve annual budget", category: "Strategic", owner: "CFO", speed: "Slow", clarity: "Clear", func: "Finance", forumId: "" },
    { id: "d2", name: "Enter new market / geography", category: "Strategic", owner: "CEO", speed: "Slow", clarity: "Clear", func: "Strategy", forumId: "" },
    { id: "d3", name: "Major M&A / investment", category: "Strategic", owner: "CEO", speed: "Slow", clarity: "Clear", func: "Strategy", forumId: "" },
    { id: "d4", name: "Set pricing strategy", category: "Strategic", owner: "CMO", speed: "Medium", clarity: "Ambiguous", func: "Marketing", forumId: "" },
    { id: "d5", name: "Approve org restructuring", category: "Strategic", owner: "CHRO", speed: "Slow", clarity: "Ambiguous", func: "HR", forumId: "" },
    { id: "d6", name: "Select enterprise technology platform", category: "Strategic", owner: "CTO", speed: "Slow", clarity: "Clear", func: "Technology", forumId: "" },
    { id: "d7", name: "Approve new headcount", category: "Tactical", owner: "Function Head", speed: "Medium", clarity: "Clear", func: "HR", forumId: "" },
    { id: "d8", name: "Select technology vendor", category: "Tactical", owner: "CTO", speed: "Medium", clarity: "Ambiguous", func: "Technology", forumId: "" },
    { id: "d9", name: "Launch marketing campaign", category: "Tactical", owner: "CMO", speed: "Medium", clarity: "Clear", func: "Marketing", forumId: "" },
    { id: "d10", name: "Approve capital expenditure (>$100K)", category: "Tactical", owner: "CFO", speed: "Medium", clarity: "Clear", func: "Finance", forumId: "" },
    { id: "d11", name: "Change compensation bands", category: "Tactical", owner: "CHRO", speed: "Slow", clarity: "Ambiguous", func: "HR", forumId: "" },
    { id: "d12", name: "Approve vendor contract", category: "Tactical", owner: "Procurement Lead", speed: "Medium", clarity: "Clear", func: "Operations", forumId: "" },
    { id: "d13", name: "Release product feature", category: "Tactical", owner: "Product Lead", speed: "Fast", clarity: "Clear", func: "Product", forumId: "" },
    { id: "d14", name: "Approve regulatory filing", category: "Tactical", owner: "CLO", speed: "Medium", clarity: "Clear", func: "Legal", forumId: "" },
    { id: "d15", name: "Allocate project resources", category: "Tactical", owner: "Function Head", speed: "Medium", clarity: "Ambiguous", func: "Operations", forumId: "" },
    { id: "d16", name: "Approve training program", category: "Tactical", owner: "L&D Lead", speed: "Medium", clarity: "Ambiguous", func: "HR", forumId: "" },
    { id: "d17", name: "Hire individual contributor", category: "Operational", owner: "Hiring Manager", speed: "Fast", clarity: "Clear", func: "HR", forumId: "" },
    { id: "d18", name: "Approve travel / expenses", category: "Operational", owner: "Manager", speed: "Fast", clarity: "Clear", func: "Finance", forumId: "" },
    { id: "d19", name: "Resolve customer escalation", category: "Operational", owner: "Team Lead", speed: "Fast", clarity: "Clear", func: "Operations", forumId: "" },
    { id: "d20", name: "Deploy code to production", category: "Operational", owner: "Engineering Lead", speed: "Fast", clarity: "Clear", func: "Technology", forumId: "" },
    { id: "d21", name: "Approve purchase order (<$10K)", category: "Operational", owner: "Manager", speed: "Fast", clarity: "Clear", func: "Finance", forumId: "" },
    { id: "d22", name: "Schedule team capacity", category: "Operational", owner: "Team Lead", speed: "Fast", clarity: "Ambiguous", func: "Operations", forumId: "" },
    { id: "d23", name: "Grant system access", category: "Operational", owner: "IT Admin", speed: "Fast", clarity: "Clear", func: "Technology", forumId: "" },
    { id: "d24", name: "Update process documentation", category: "Operational", owner: "Process Owner", speed: "Fast", clarity: "Ambiguous", func: "Operations", forumId: "" },
    { id: "d25", name: "Set AI/automation policy", category: "Strategic", owner: "CTO", speed: "Slow", clarity: "Undefined", func: "Technology", forumId: "" },
  ];
  const [govDecisions, setGovDecisions] = usePersisted<GovDecision[]>(`${projectId}_gov_decisions`, GOV_DEFAULT_DECISIONS);
  const [govRapid, setGovRapid] = usePersisted<Record<string, Record<string, string>>>(`${projectId}_gov_rapid`, {});
  const [govForums, setGovForums] = usePersisted<GovForum[]>(`${projectId}_gov_forums`, [
    { id: "f1", name: "Board of Directors", purpose: "Strategic oversight, fiduciary governance", cadence: "Quarterly", chair: "Board Chair", members: ["CEO", "CFO", "Independent Directors"], parentId: "" },
    { id: "f2", name: "Executive Committee", purpose: "Enterprise strategy execution and cross-functional alignment", cadence: "Weekly", chair: "CEO", members: ["CFO", "CTO", "CHRO", "CMO", "COO"], parentId: "f1" },
    { id: "f3", name: "Operating Committee", purpose: "Operational performance review and tactical decisions", cadence: "Bi-weekly", chair: "COO", members: ["Function Heads", "BU Leads"], parentId: "f2" },
    { id: "f4", name: "Technology Steering Committee", purpose: "Technology investment and architecture decisions", cadence: "Monthly", chair: "CTO", members: ["CIO", "CISO", "Engineering Leads"], parentId: "f2" },
    { id: "f5", name: "People & Culture Committee", purpose: "Talent strategy, org design, and culture initiatives", cadence: "Monthly", chair: "CHRO", members: ["L&D Lead", "Talent Acquisition", "DEI Lead"], parentId: "f2" },
  ]);
  const [govView, setGovView] = useState<"catalogue" | "rapid" | "forums" | "bottlenecks">("catalogue");
  const [govCatFilter, setGovCatFilter] = useState("All");
  const [govFuncFilter, setGovFuncFilter] = useState("All");
  const [govSpeedFilter, setGovSpeedFilter] = useState("All");
  const [govClarityFilter, setGovClarityFilter] = useState("All");
  const [govAddingDecision, setGovAddingDecision] = useState(false);
  const [govNewDec, setGovNewDec] = useState({ name: "", category: "Tactical" as "Strategic"|"Tactical"|"Operational", owner: "", speed: "Medium" as "Fast"|"Medium"|"Slow", clarity: "Ambiguous" as "Clear"|"Ambiguous"|"Undefined", func: "Operations" });
  const [govAddingForum, setGovAddingForum] = useState(false);
  const [govNewForum, setGovNewForum] = useState({ name: "", purpose: "", cadence: "Monthly", chair: "", members: "", parentId: "" });
  const [govEditingDecId, setGovEditingDecId] = useState<string | null>(null);
  const GOV_RAPID_ROLES = ["CEO / Board", "Executive Sponsor", "Function Head", "Team Lead", "Subject Expert"];

  // ── Service Delivery Layer state ──
  const SVC_MODELS = ["In-House", "Shared Services", "COE", "Outsourced/BPO", "Hybrid"] as const;
  type SvcModel = typeof SVC_MODELS[number];
  const SVC_MODEL_COLORS: Record<string, string> = { "In-House": "#10B981", "Shared Services": "#6366F1", "COE": "#8B5CF6", "Outsourced/BPO": "#F97316", "Hybrid": "#D4860A" };
  const SVC_FUNCTIONS_DEFAULT = [
    { id: "fin_ap", label: "Accounts Payable", func: "Finance" },
    { id: "fin_ar", label: "Accounts Receivable", func: "Finance" },
    { id: "fin_payroll", label: "Payroll", func: "Finance" },
    { id: "fin_reporting", label: "Financial Reporting", func: "Finance" },
    { id: "fin_tax", label: "Tax & Compliance", func: "Finance" },
    { id: "fin_fp", label: "FP&A / Budgeting", func: "Finance" },
    { id: "hr_recruit", label: "Talent Acquisition", func: "HR" },
    { id: "hr_onboard", label: "Onboarding & Admin", func: "HR" },
    { id: "hr_comp", label: "Compensation & Benefits", func: "HR" },
    { id: "hr_ld", label: "Learning & Development", func: "HR" },
    { id: "hr_hrbp", label: "HR Business Partnering", func: "HR" },
    { id: "hr_analytics", label: "People Analytics", func: "HR" },
    { id: "it_infra", label: "Infrastructure & Cloud", func: "Technology" },
    { id: "it_security", label: "Cybersecurity", func: "Technology" },
    { id: "it_support", label: "IT Service Desk", func: "Technology" },
    { id: "it_data", label: "Data & Analytics", func: "Technology" },
    { id: "it_dev", label: "Application Development", func: "Technology" },
    { id: "it_ai", label: "AI/ML Engineering", func: "Technology" },
    { id: "ops_procurement", label: "Procurement", func: "Operations" },
    { id: "ops_facilities", label: "Facilities Management", func: "Operations" },
    { id: "ops_supply", label: "Supply Chain", func: "Operations" },
    { id: "legal_contracts", label: "Contract Management", func: "Legal" },
    { id: "legal_compliance", label: "Regulatory Compliance", func: "Legal" },
    { id: "mkt_digital", label: "Digital Marketing", func: "Marketing" },
    { id: "mkt_brand", label: "Brand & Creative", func: "Marketing" },
  ];
  const [svcDeliveryMap, setSvcDeliveryMap] = usePersisted<Record<string, { current: SvcModel; target: SvcModel; rationale: string }>>(`${projectId}_svc_delivery`, {});
  const [svcView, setSvcView] = useState<"matrix" | "shared" | "coe" | "outsource" | "location">("matrix");
  type SvcSharedDef = { services: string; slaResponse: string; slaQuality: string; costPerTx: string; location: string; staffing: string; technology: string; costModel: string };
  const [svcSharedDefs, setSvcSharedDefs] = usePersisted<Record<string, SvcSharedDef>>(`${projectId}_svc_shared`, {});
  type SvcCoeDef = { expertise: string; mandate: string; placement: string; km: string; metrics: string };
  const [svcCoeDefs, setSvcCoeDefs] = usePersisted<Record<string, SvcCoeDef>>(`${projectId}_svc_coe`, {});
  type SvcOutscoreCard = { strategic: number; availability: number; costSavings: number; risk: number };
  const [svcOutsourceScores, setSvcOutsourceScores] = usePersisted<Record<string, SvcOutscoreCard>>(`${projectId}_svc_outsource`, {});
  type SvcLocationDef = { location: string; costIndex: string; talent: string; timezone: string; language: string; risk: string };
  const [svcLocations, setSvcLocations] = usePersisted<Record<string, SvcLocationDef>>(`${projectId}_svc_locations`, {});
  const [svcFuncFilter, setSvcFuncFilter] = useState("All");
  const [svcEditingRationale, setSvcEditingRationale] = useState<string | null>(null);

  // ── Process Layer state ──
  type ProcStep = { id: string; name: string; func: string; duration: string; system: string; automation: "Manual" | "Semi-Auto" | "Automated"; isHandoff?: boolean };
  type ProcDef = { id: string; name: string; owner: string; trigger: string; output: string; functions: string[]; cycleTime: string; steps: ProcStep[]; maturity: number; industryBenchmark: number };
  const PROC_FUNC_COLORS: Record<string, string> = { Finance: "#10B981", HR: "#6366F1", Technology: "#8B5CF6", Operations: "#F97316", Legal: "#EF4444", Marketing: "#D4860A", Sales: "#0891B2", Product: "#EC4899", "Customer Service": "#14B8A6", Strategy: "#A855F7", Risk: "#F43F5E", Supply: "#F59E0B" };
  const PROC_DEFAULT: ProcDef[] = [
    { id: "p1", name: "Hire to Retire", owner: "CHRO", trigger: "Headcount request approved", output: "Employee offboarded / alumni", functions: ["HR", "Finance", "Technology", "Operations"], cycleTime: "30-365 days", maturity: 0, industryBenchmark: 3.2, steps: [
      { id: "p1s1", name: "Requisition Approval", func: "HR", duration: "2-5 days", system: "Workday", automation: "Semi-Auto" },
      { id: "p1s2", name: "Source & Screen Candidates", func: "HR", duration: "10-30 days", system: "Greenhouse/LinkedIn", automation: "Semi-Auto" },
      { id: "p1s3", name: "Interview & Select", func: "Operations", duration: "5-15 days", system: "Calendly/Teams", automation: "Manual", isHandoff: true },
      { id: "p1s4", name: "Offer & Negotiate", func: "HR", duration: "3-7 days", system: "DocuSign", automation: "Semi-Auto", isHandoff: true },
      { id: "p1s5", name: "Onboard & Provision", func: "Technology", duration: "1-5 days", system: "ServiceNow", automation: "Semi-Auto", isHandoff: true },
      { id: "p1s6", name: "Performance Management", func: "HR", duration: "Ongoing", system: "Workday", automation: "Semi-Auto" },
      { id: "p1s7", name: "Develop & Promote", func: "HR", duration: "Ongoing", system: "LMS", automation: "Manual" },
      { id: "p1s8", name: "Offboard & Exit", func: "HR", duration: "5-14 days", system: "Workday/ServiceNow", automation: "Semi-Auto" },
    ]},
    { id: "p2", name: "Order to Cash", owner: "CFO", trigger: "Customer places order", output: "Payment received & reconciled", functions: ["Sales", "Operations", "Finance"], cycleTime: "1-90 days", maturity: 0, industryBenchmark: 3.5, steps: [
      { id: "p2s1", name: "Order Entry", func: "Sales", duration: "< 1 day", system: "Salesforce/ERP", automation: "Semi-Auto" },
      { id: "p2s2", name: "Credit Check", func: "Finance", duration: "1-2 days", system: "ERP", automation: "Automated", isHandoff: true },
      { id: "p2s3", name: "Fulfill & Ship", func: "Operations", duration: "1-14 days", system: "WMS/ERP", automation: "Semi-Auto", isHandoff: true },
      { id: "p2s4", name: "Invoice Generation", func: "Finance", duration: "< 1 day", system: "ERP", automation: "Automated", isHandoff: true },
      { id: "p2s5", name: "Payment Collection", func: "Finance", duration: "30-60 days", system: "ERP/Bank", automation: "Semi-Auto" },
      { id: "p2s6", name: "Cash Reconciliation", func: "Finance", duration: "1-3 days", system: "ERP", automation: "Semi-Auto" },
    ]},
    { id: "p3", name: "Procure to Pay", owner: "CPO / CFO", trigger: "Purchase requisition created", output: "Vendor paid & recorded", functions: ["Operations", "Finance", "Legal"], cycleTime: "7-45 days", maturity: 0, industryBenchmark: 3.0, steps: [
      { id: "p3s1", name: "Requisition & Approval", func: "Operations", duration: "1-3 days", system: "ERP/Coupa", automation: "Semi-Auto" },
      { id: "p3s2", name: "Vendor Selection", func: "Operations", duration: "3-14 days", system: "Sourcing Platform", automation: "Manual" },
      { id: "p3s3", name: "Contract Negotiation", func: "Legal", duration: "5-30 days", system: "CLM", automation: "Manual", isHandoff: true },
      { id: "p3s4", name: "Purchase Order", func: "Operations", duration: "< 1 day", system: "ERP", automation: "Automated", isHandoff: true },
      { id: "p3s5", name: "Goods Receipt", func: "Operations", duration: "1-7 days", system: "ERP/WMS", automation: "Semi-Auto" },
      { id: "p3s6", name: "Invoice Match & Approve", func: "Finance", duration: "1-5 days", system: "ERP", automation: "Semi-Auto", isHandoff: true },
      { id: "p3s7", name: "Payment Execution", func: "Finance", duration: "1-3 days", system: "ERP/Bank", automation: "Automated" },
    ]},
    { id: "p4", name: "Record to Report", owner: "CFO", trigger: "Period end", output: "Financial statements published", functions: ["Finance", "Technology", "Operations"], cycleTime: "5-20 days", maturity: 0, industryBenchmark: 3.3, steps: [
      { id: "p4s1", name: "Sub-ledger Close", func: "Finance", duration: "1-3 days", system: "ERP", automation: "Semi-Auto" },
      { id: "p4s2", name: "Journal Entries", func: "Finance", duration: "1-2 days", system: "ERP", automation: "Semi-Auto" },
      { id: "p4s3", name: "Intercompany Reconciliation", func: "Finance", duration: "2-5 days", system: "ERP/BlackLine", automation: "Semi-Auto" },
      { id: "p4s4", name: "Consolidation", func: "Finance", duration: "1-3 days", system: "HFM/ERP", automation: "Automated" },
      { id: "p4s5", name: "Management Review", func: "Finance", duration: "1-2 days", system: "BI Tool", automation: "Manual" },
      { id: "p4s6", name: "Regulatory Filing", func: "Finance", duration: "1-5 days", system: "Filing System", automation: "Semi-Auto" },
    ]},
    { id: "p5", name: "Plan to Produce", owner: "COO", trigger: "Demand forecast generated", output: "Product delivered to customer", functions: ["Operations", "Supply", "Finance"], cycleTime: "7-90 days", maturity: 0, industryBenchmark: 2.8, steps: [
      { id: "p5s1", name: "Demand Planning", func: "Operations", duration: "3-7 days", system: "Planning Tool", automation: "Semi-Auto" },
      { id: "p5s2", name: "Supply Planning", func: "Supply", duration: "2-5 days", system: "ERP/SCM", automation: "Semi-Auto", isHandoff: true },
      { id: "p5s3", name: "Production Scheduling", func: "Operations", duration: "1-3 days", system: "MES/ERP", automation: "Semi-Auto" },
      { id: "p5s4", name: "Manufacturing / Execution", func: "Operations", duration: "1-60 days", system: "MES", automation: "Semi-Auto" },
      { id: "p5s5", name: "Quality Control", func: "Operations", duration: "1-3 days", system: "QMS", automation: "Semi-Auto" },
      { id: "p5s6", name: "Warehouse & Logistics", func: "Supply", duration: "1-7 days", system: "WMS/TMS", automation: "Semi-Auto", isHandoff: true },
    ]},
    { id: "p6", name: "Idea to Market", owner: "CPO", trigger: "Innovation idea submitted", output: "Product/service launched", functions: ["Product", "Technology", "Marketing", "Operations"], cycleTime: "30-365 days", maturity: 0, industryBenchmark: 2.5, steps: [
      { id: "p6s1", name: "Ideation & Screening", func: "Product", duration: "7-30 days", system: "Jira/Miro", automation: "Manual" },
      { id: "p6s2", name: "Business Case", func: "Product", duration: "7-14 days", system: "PowerPoint/Notion", automation: "Manual" },
      { id: "p6s3", name: "Design & Prototype", func: "Product", duration: "14-60 days", system: "Figma/CAD", automation: "Semi-Auto", isHandoff: true },
      { id: "p6s4", name: "Build & Test", func: "Technology", duration: "30-180 days", system: "CI/CD/Jira", automation: "Semi-Auto", isHandoff: true },
      { id: "p6s5", name: "Go-to-Market Prep", func: "Marketing", duration: "14-30 days", system: "CMS/Marketing", automation: "Semi-Auto", isHandoff: true },
      { id: "p6s6", name: "Launch & Measure", func: "Marketing", duration: "7-30 days", system: "Analytics", automation: "Semi-Auto" },
    ]},
    { id: "p7", name: "Issue to Resolution", owner: "VP Customer Service", trigger: "Customer raises issue", output: "Issue resolved & feedback captured", functions: ["Customer Service", "Technology", "Operations"], cycleTime: "< 1 day to 30 days", maturity: 0, industryBenchmark: 3.4, steps: [
      { id: "p7s1", name: "Issue Intake & Triage", func: "Customer Service", duration: "< 1 hour", system: "Zendesk/ServiceNow", automation: "Semi-Auto" },
      { id: "p7s2", name: "Investigation & Diagnosis", func: "Customer Service", duration: "1-24 hours", system: "CRM/Knowledge Base", automation: "Semi-Auto" },
      { id: "p7s3", name: "Escalation (if needed)", func: "Technology", duration: "1-5 days", system: "Jira/ServiceNow", automation: "Manual", isHandoff: true },
      { id: "p7s4", name: "Resolution & Communication", func: "Customer Service", duration: "< 1 day", system: "CRM", automation: "Semi-Auto" },
      { id: "p7s5", name: "Root Cause Analysis", func: "Operations", duration: "1-7 days", system: "RCA Tools", automation: "Manual", isHandoff: true },
      { id: "p7s6", name: "Feedback & Close", func: "Customer Service", duration: "< 1 day", system: "CRM/Survey", automation: "Automated" },
    ]},
    { id: "p8", name: "Risk to Mitigation", owner: "CRO", trigger: "Risk identified or event occurs", output: "Risk mitigated & controls verified", functions: ["Risk", "Legal", "Operations", "Technology"], cycleTime: "1-90 days", maturity: 0, industryBenchmark: 2.9, steps: [
      { id: "p8s1", name: "Risk Identification", func: "Risk", duration: "Ongoing", system: "GRC Platform", automation: "Semi-Auto" },
      { id: "p8s2", name: "Risk Assessment & Scoring", func: "Risk", duration: "1-5 days", system: "GRC Platform", automation: "Semi-Auto" },
      { id: "p8s3", name: "Control Design", func: "Risk", duration: "3-14 days", system: "GRC/Policy", automation: "Manual" },
      { id: "p8s4", name: "Control Implementation", func: "Operations", duration: "7-60 days", system: "Various", automation: "Manual", isHandoff: true },
      { id: "p8s5", name: "Monitoring & Testing", func: "Risk", duration: "Ongoing", system: "GRC/Analytics", automation: "Semi-Auto", isHandoff: true },
      { id: "p8s6", name: "Reporting & Audit", func: "Legal", duration: "5-14 days", system: "GRC/Audit", automation: "Semi-Auto", isHandoff: true },
    ]},
  ];
  const [procProcesses, setProcProcesses] = usePersisted<ProcDef[]>(`${projectId}_proc_processes`, PROC_DEFAULT);
  const [procView, setProcView] = useState<"map" | "detail" | "maturity" | "capmap" | "bottlenecks">("map");
  const [procSelectedId, setProcSelectedId] = useState<string | null>(null);
  const [procAddingStep, setProcAddingStep] = useState(false);
  const [procNewStep, setProcNewStep] = useState({ name: "", func: "Operations", duration: "", system: "", automation: "Manual" as ProcStep["automation"] });
  const [procAddingProcess, setProcAddingProcess] = useState(false);
  const [procNewProc, setProcNewProc] = useState({ name: "", owner: "", trigger: "", output: "", functions: "", cycleTime: "" });
  const [procAiGenerating, setProcAiGenerating] = useState(false);
  const [procCapMatrix, setProcCapMatrix] = usePersisted<Record<string, string>>(`${projectId}_proc_cap_matrix`, {});
  const procSelected = procProcesses.find(p => p.id === procSelectedId) || null;

  // ── Technology Layer state ──
  type TechSystem = { id: string; name: string; vendor: string; category: string; functions: string[]; capabilities: string[]; processes: string[]; users: string; annualCost: string; age: string; integration: "Standalone" | "Partial" | "Fully Integrated"; status: "Invest" | "Maintain" | "Migrate" | "Retire"; apiReady: "Ready" | "Needs Investment" | "Not Compatible"; dataQuality: string };
  const TECH_CATEGORIES = ["ERP", "CRM", "HCM", "BI/Analytics", "SCM", "CLM/Legal", "GRC", "Collaboration", "AI/ML", "RPA", "Custom App", "Other"] as const;
  const TECH_DEFAULT: TechSystem[] = [
    { id: "t1", name: "SAP S/4HANA", vendor: "SAP", category: "ERP", functions: ["Finance", "Operations", "Supply"], capabilities: ["Financial Reporting", "Procurement"], processes: ["Record to Report", "Procure to Pay"], users: "2,500", annualCost: "$3.2M", age: "3 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "High" },
    { id: "t2", name: "Workday HCM", vendor: "Workday", category: "HCM", functions: ["HR"], capabilities: ["Talent Acquisition", "Compensation & Benefits"], processes: ["Hire to Retire"], users: "1,800", annualCost: "$1.8M", age: "4 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "High" },
    { id: "t3", name: "Salesforce CRM", vendor: "Salesforce", category: "CRM", functions: ["Sales", "Marketing", "Customer Service"], capabilities: ["Sales Operations", "Customer Management"], processes: ["Order to Cash", "Issue to Resolution"], users: "1,200", annualCost: "$1.5M", age: "5 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "Medium" },
    { id: "t4", name: "ServiceNow ITSM", vendor: "ServiceNow", category: "Collaboration", functions: ["Technology", "HR", "Operations"], capabilities: ["IT Service Desk", "Onboarding"], processes: ["Issue to Resolution", "Hire to Retire"], users: "3,000", annualCost: "$1.1M", age: "3 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "High" },
    { id: "t5", name: "Power BI", vendor: "Microsoft", category: "BI/Analytics", functions: ["Finance", "HR", "Operations", "Marketing"], capabilities: ["Financial Reporting", "People Analytics"], processes: ["Record to Report"], users: "800", annualCost: "$120K", age: "4 years", integration: "Partial", status: "Maintain", apiReady: "Ready", dataQuality: "Medium" },
    { id: "t6", name: "Jira / Confluence", vendor: "Atlassian", category: "Collaboration", functions: ["Technology", "Product"], capabilities: ["Application Development"], processes: ["Idea to Market"], users: "600", annualCost: "$85K", age: "6 years", integration: "Partial", status: "Maintain", apiReady: "Ready", dataQuality: "Medium" },
    { id: "t7", name: "Coupa Procurement", vendor: "Coupa", category: "SCM", functions: ["Operations", "Finance"], capabilities: ["Procurement"], processes: ["Procure to Pay"], users: "400", annualCost: "$450K", age: "2 years", integration: "Fully Integrated", status: "Invest", apiReady: "Ready", dataQuality: "High" },
    { id: "t8", name: "BlackLine", vendor: "BlackLine", category: "ERP", functions: ["Finance"], capabilities: ["Financial Reporting"], processes: ["Record to Report"], users: "150", annualCost: "$280K", age: "3 years", integration: "Partial", status: "Maintain", apiReady: "Needs Investment", dataQuality: "High" },
    { id: "t9", name: "Greenhouse ATS", vendor: "Greenhouse", category: "HCM", functions: ["HR"], capabilities: ["Talent Acquisition"], processes: ["Hire to Retire"], users: "200", annualCost: "$180K", age: "4 years", integration: "Partial", status: "Maintain", apiReady: "Needs Investment", dataQuality: "Medium" },
    { id: "t10", name: "Legacy ERP (on-prem)", vendor: "Oracle", category: "ERP", functions: ["Finance", "Operations"], capabilities: ["Financial Reporting", "Procurement"], processes: ["Record to Report", "Procure to Pay"], users: "500", annualCost: "$800K", age: "12 years", integration: "Standalone", status: "Retire", apiReady: "Not Compatible", dataQuality: "Low" },
    { id: "t11", name: "SharePoint", vendor: "Microsoft", category: "Collaboration", functions: ["HR", "Legal", "Finance", "Operations"], capabilities: [], processes: [], users: "4,000", annualCost: "$95K", age: "8 years", integration: "Partial", status: "Maintain", apiReady: "Needs Investment", dataQuality: "Low" },
    { id: "t12", name: "Archer GRC", vendor: "RSA/Archer", category: "GRC", functions: ["Risk", "Legal"], capabilities: ["Regulatory Compliance"], processes: ["Risk to Mitigation"], users: "120", annualCost: "$350K", age: "5 years", integration: "Standalone", status: "Migrate", apiReady: "Not Compatible", dataQuality: "Medium" },
  ];
  const [techSystems, setTechSystems] = usePersisted<TechSystem[]>(`${projectId}_tech_systems`, TECH_DEFAULT);
  const [techView, setTechView] = useState<"portfolio" | "capmap" | "rationalize" | "dataflow" | "aiready">("portfolio");
  const [techCatFilter, setTechCatFilter] = useState("All");
  const [techStatusFilter, setTechStatusFilter] = useState("All");
  const [techAddingSystem, setTechAddingSystem] = useState(false);
  const [techEditingId, setTechEditingId] = useState<string | null>(null);
  const [techCapMatrix, setTechCapMatrix] = usePersisted<Record<string, string>>(`${projectId}_tech_cap_matrix`, {});
  const [techDataFlows, setTechDataFlows] = usePersisted<Record<string, { systems: string[]; dataTypes: string[]; manualFlags: string[] }>>(`${projectId}_tech_dataflows`, {});

  // ── People & Culture state ──
  const CULTURE_DIMS = [
    { id: "innovation", left: "Stability", right: "Innovation", leftIcon: "🏛", rightIcon: "💡" },
    { id: "autonomy", left: "Control", right: "Autonomy", leftIcon: "🔒", rightIcon: "🦅" },
    { id: "collaboration", left: "Individual", right: "Collaboration", leftIcon: "👤", rightIcon: "🤝" },
    { id: "speed", left: "Thoroughness", right: "Speed", leftIcon: "🔍", rightIcon: "⚡" },
    { id: "customer", left: "Process-centric", right: "Customer-centric", leftIcon: "📋", rightIcon: "🎯" },
    { id: "hierarchy", left: "Hierarchical", right: "Flat", leftIcon: "📊", rightIcon: "🌐" },
    { id: "risk", left: "Risk-averse", right: "Risk-taking", leftIcon: "🛡️", rightIcon: "🎲" },
    { id: "purpose", left: "Profit-driven", right: "Purpose-driven", leftIcon: "💰", rightIcon: "🌍" },
  ];
  const [cultureCurrent, setCultureCurrent] = usePersisted<Record<string, number>>(`${projectId}_culture_current`, {});
  const [cultureTarget, setCultureTarget] = usePersisted<Record<string, number>>(`${projectId}_culture_target`, {});
  const [pcView, setPcView] = useState<"culture" | "ways" | "leadership" | "capacity">("culture");

  type WowEntry = { current: string; target: string };
  type WowRow = { func: string; workModel: WowEntry; methodology: WowEntry; decisionMaking: WowEntry; meetingCadence: WowEntry; tools: WowEntry };
  const WOW_FUNCS_DEFAULT = ["Finance", "HR", "Technology", "Operations", "Product", "Marketing", "Legal", "Executive"];
  const [wowData, setWowData] = usePersisted<WowRow[]>(`${projectId}_wow_data`, WOW_FUNCS_DEFAULT.map(f => ({
    func: f,
    workModel: { current: "Hybrid", target: "Hybrid" },
    methodology: { current: f === "Technology" || f === "Product" ? "Agile" : "Waterfall", target: f === "Legal" || f === "Finance" ? "Hybrid" : "Agile" },
    decisionMaking: { current: f === "Executive" ? "Hierarchical" : "Consensus", target: "Delegated" },
    meetingCadence: { current: "Weekly team", target: f === "Technology" || f === "Product" ? "Daily standup" : "Weekly team" },
    tools: { current: "", target: "" },
  })));

  const LEADERSHIP_COMPETENCIES = [
    { id: "lc1", name: "Strategic Vision", desc: "Ability to set direction, anticipate disruption, and align organization to long-term goals" },
    { id: "lc2", name: "Innovation Leadership", desc: "Fosters experimentation, tolerates failure, champions new ideas and business models" },
    { id: "lc3", name: "Digital Fluency", desc: "Understands technology trends, AI/data capabilities, and digital transformation levers" },
    { id: "lc4", name: "People Development", desc: "Coaches, mentors, and builds diverse high-performing teams" },
    { id: "lc5", name: "Change Leadership", desc: "Leads through ambiguity, builds buy-in, sustains momentum during transformation" },
    { id: "lc6", name: "Operational Excellence", desc: "Drives efficiency, quality, and continuous improvement in processes" },
    { id: "lc7", name: "Customer Obsession", desc: "Puts customer needs at the center of decisions and designs" },
    { id: "lc8", name: "Collaboration & Influence", desc: "Builds cross-functional partnerships and leads without authority" },
  ];
  const [leadershipScores, setLeadershipScores] = usePersisted<Record<string, { current: number; required: number }>>(`${projectId}_leadership_scores`, {});

  const [changeLoad, setChangeLoad] = usePersisted<{ active: string; fatigue: number; infrastructure: number; history: number; notes: string }>(`${projectId}_change_capacity`, { active: "", fatigue: 0, infrastructure: 0, history: 0, notes: "" });

  // ── Financials state ──
  type FinFuncCost = { people: number; technology: number; outsourcing: number; facilities: number; peopleTgt: number; technologyTgt: number; outsourcingTgt: number; facilitiesTgt: number };
  const FIN_FUNCS = ["Finance", "HR", "Technology", "Operations", "Marketing", "Legal", "Product", "Executive"];
  const [finCosts, setFinCosts] = usePersisted<Record<string, FinFuncCost>>(`${projectId}_fin_costs`, Object.fromEntries(FIN_FUNCS.map(f => [f, {
    people: f === "Technology" ? 12000 : f === "Operations" ? 8000 : f === "Finance" ? 6000 : f === "HR" ? 5000 : f === "Marketing" ? 4500 : f === "Legal" ? 3500 : f === "Product" ? 7000 : 2500,
    technology: f === "Technology" ? 4000 : f === "Finance" ? 1500 : f === "HR" ? 1200 : f === "Operations" ? 1000 : f === "Marketing" ? 800 : 500,
    outsourcing: f === "Operations" ? 2000 : f === "Technology" ? 1500 : f === "Legal" ? 800 : f === "HR" ? 500 : 200,
    facilities: f === "Operations" ? 1200 : f === "Technology" ? 800 : 400,
    peopleTgt: f === "Technology" ? 11000 : f === "Operations" ? 6500 : f === "Finance" ? 5000 : f === "HR" ? 3800 : f === "Marketing" ? 4200 : f === "Legal" ? 3200 : f === "Product" ? 7500 : 2500,
    technologyTgt: f === "Technology" ? 5000 : f === "Finance" ? 2000 : f === "HR" ? 1800 : f === "Operations" ? 1200 : f === "Marketing" ? 1000 : 600,
    outsourcingTgt: f === "Operations" ? 3000 : f === "Technology" ? 2000 : f === "Legal" ? 1200 : f === "HR" ? 1500 : 300,
    facilitiesTgt: f === "Operations" ? 800 : f === "Technology" ? 600 : 300,
  }])));
  const [finView, setFinView] = useState<"abc" | "cts" | "rcg" | "compare" | "bizcase">("abc");
  type FinCtsEntry = { headcount: number; costPerEmp: number; benchmark: number };
  const [finCts, setFinCts] = usePersisted<Record<string, FinCtsEntry>>(`${projectId}_fin_cts`, {
    HR: { headcount: 85, costPerEmp: 2400, benchmark: 1800 }, Finance: { headcount: 60, costPerEmp: 1900, benchmark: 1500 }, Technology: { headcount: 120, costPerEmp: 3200, benchmark: 2600 },
  });
  type FinRcgEntry = { run: number; change: number; grow: number; runTgt: number; changeTgt: number; growTgt: number };
  const [finRcg, setFinRcg] = usePersisted<Record<string, FinRcgEntry>>(`${projectId}_fin_rcg`, Object.fromEntries(FIN_FUNCS.map(f => [f, {
    run: f === "Operations" ? 75 : f === "Technology" ? 55 : f === "Finance" ? 70 : 65, change: f === "Technology" ? 30 : f === "Operations" ? 15 : 20, grow: f === "Technology" ? 15 : f === "Product" ? 30 : f === "Marketing" ? 25 : 15,
    runTgt: f === "Operations" ? 60 : f === "Technology" ? 45 : f === "Finance" ? 60 : 55, changeTgt: f === "Technology" ? 30 : 25, growTgt: f === "Technology" ? 25 : f === "Product" ? 35 : f === "Marketing" ? 30 : 20,
  }])));
  const [finBizCase, setFinBizCase] = usePersisted<{ investment: string; annualSavings: string; revenueImpact: string; discountRate: string }>(`${projectId}_fin_bizcase`, { investment: "", annualSavings: "", revenueImpact: "", discountRate: "10" });
  const fmtK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}M` : `${n}K`;

  // ── Performance state ──
  type PerfKpi = { id: string; name: string; perspective: "Financial" | "Customer" | "Process" | "Learning"; current: string; target: string; owner: string; frequency: string; status: "Red" | "Amber" | "Green"; stratLink: string; indicator: "Leading" | "Lagging"; pairedWith: string };
  const PERF_DEFAULT_KPIS: PerfKpi[] = [
    { id: "k1", name: "Revenue Growth Rate", perspective: "Financial", current: "5%", target: "12%", owner: "CFO", frequency: "Quarterly", status: "Amber", stratLink: "revenue", indicator: "Lagging", pairedWith: "k13" },
    { id: "k2", name: "Operating Cost Reduction", perspective: "Financial", current: "2%", target: "15%", owner: "CFO", frequency: "Quarterly", status: "Red", stratLink: "cost", indicator: "Lagging", pairedWith: "k10" },
    { id: "k3", name: "ROI on Transformation", perspective: "Financial", current: "0%", target: "150%", owner: "CFO", frequency: "Annually", status: "Amber", stratLink: "digital", indicator: "Lagging", pairedWith: "" },
    { id: "k4", name: "Margin Improvement", perspective: "Financial", current: "18%", target: "22%", owner: "CFO", frequency: "Quarterly", status: "Amber", stratLink: "cost", indicator: "Lagging", pairedWith: "" },
    { id: "k5", name: "Net Promoter Score", perspective: "Customer", current: "32", target: "55", owner: "CMO", frequency: "Monthly", status: "Amber", stratLink: "cx", indicator: "Lagging", pairedWith: "k8" },
    { id: "k6", name: "Customer Satisfaction", perspective: "Customer", current: "3.8", target: "4.5", owner: "CMO", frequency: "Monthly", status: "Amber", stratLink: "cx", indicator: "Lagging", pairedWith: "" },
    { id: "k7", name: "Time-to-Serve (days)", perspective: "Customer", current: "12", target: "5", owner: "COO", frequency: "Weekly", status: "Red", stratLink: "ops", indicator: "Lagging", pairedWith: "k10" },
    { id: "k8", name: "First Contact Resolution %", perspective: "Customer", current: "65%", target: "85%", owner: "VP CS", frequency: "Weekly", status: "Amber", stratLink: "cx", indicator: "Leading", pairedWith: "k5" },
    { id: "k9", name: "Process Cycle Time (avg days)", perspective: "Process", current: "18", target: "8", owner: "COO", frequency: "Monthly", status: "Red", stratLink: "ops", indicator: "Lagging", pairedWith: "k10" },
    { id: "k10", name: "Automation Coverage %", perspective: "Process", current: "25%", target: "60%", owner: "CTO", frequency: "Monthly", status: "Amber", stratLink: "digital", indicator: "Leading", pairedWith: "k2" },
    { id: "k11", name: "Error / Rework Rate", perspective: "Process", current: "8%", target: "2%", owner: "COO", frequency: "Weekly", status: "Red", stratLink: "ops", indicator: "Lagging", pairedWith: "" },
    { id: "k12", name: "Cross-functional Handoffs", perspective: "Process", current: "42", target: "20", owner: "COO", frequency: "Monthly", status: "Amber", stratLink: "ops", indicator: "Leading", pairedWith: "k9" },
    { id: "k13", name: "Skills Coverage Index", perspective: "Learning", current: "62%", target: "85%", owner: "CHRO", frequency: "Quarterly", status: "Red", stratLink: "talent", indicator: "Leading", pairedWith: "k1" },
    { id: "k14", name: "Training Hours / Employee", perspective: "Learning", current: "12", target: "40", owner: "CHRO", frequency: "Monthly", status: "Red", stratLink: "talent", indicator: "Leading", pairedWith: "k13" },
    { id: "k15", name: "Internal Mobility Rate", perspective: "Learning", current: "8%", target: "20%", owner: "CHRO", frequency: "Quarterly", status: "Amber", stratLink: "talent", indicator: "Leading", pairedWith: "" },
    { id: "k16", name: "Employee Engagement Score", perspective: "Learning", current: "3.6", target: "4.3", owner: "CHRO", frequency: "Quarterly", status: "Amber", stratLink: "talent", indicator: "Leading", pairedWith: "k17" },
    { id: "k17", name: "Voluntary Attrition Rate", perspective: "Learning", current: "18%", target: "10%", owner: "CHRO", frequency: "Monthly", status: "Amber", stratLink: "talent", indicator: "Lagging", pairedWith: "k16" },
  ];
  const [perfKpis, setPerfKpis] = usePersisted<PerfKpi[]>(`${projectId}_perf_kpis`, PERF_DEFAULT_KPIS);
  const [perfView, setPerfView] = useState<"scorecard" | "okr" | "indicators" | "healthcheck">("scorecard");

  type PerfOkr = { id: string; level: "Enterprise" | "Function" | "Team"; objective: string; keyResults: { id: string; text: string; progress: number }[]; parentId: string };
  const [perfOkrs, setPerfOkrs] = usePersisted<PerfOkr[]>(`${projectId}_perf_okrs`, [
    { id: "o1", level: "Enterprise", objective: "Accelerate digital transformation across all functions", parentId: "", keyResults: [
      { id: "kr1a", text: "Achieve 60% automation coverage by Q4", progress: 40 },
      { id: "kr1b", text: "Reduce average process cycle time from 18 to 8 days", progress: 25 },
      { id: "kr1c", text: "Deploy AI-assisted decision making in 3 functions", progress: 33 },
    ]},
    { id: "o2", level: "Enterprise", objective: "Achieve operational cost excellence", parentId: "", keyResults: [
      { id: "kr2a", text: "Reduce operating costs by 15% year-over-year", progress: 15 },
      { id: "kr2b", text: "Consolidate from 12 to 8 enterprise systems", progress: 25 },
      { id: "kr2c", text: "Implement shared services for 4 functions", progress: 50 },
    ]},
    { id: "o3", level: "Function", objective: "Transform HR to a data-driven people function", parentId: "o1", keyResults: [
      { id: "kr3a", text: "Reduce time-to-hire from 45 to 25 days", progress: 40 },
      { id: "kr3b", text: "Achieve 85% skills coverage index", progress: 55 },
      { id: "kr3c", text: "Automate 80% of HR admin tasks", progress: 30 },
    ]},
    { id: "o4", level: "Function", objective: "Modernize finance operations", parentId: "o2", keyResults: [
      { id: "kr4a", text: "Reduce close cycle from 10 to 4 days", progress: 35 },
      { id: "kr4b", text: "Achieve 99.5% touchless invoice processing", progress: 60 },
    ]},
    { id: "o5", level: "Team", objective: "Build AI/ML engineering capability", parentId: "o3", keyResults: [
      { id: "kr5a", text: "Hire 5 ML engineers by Q2", progress: 60 },
      { id: "kr5b", text: "Deploy 3 production ML models", progress: 33 },
    ]},
  ]);
  const [perfAddingOkr, setPerfAddingOkr] = useState(false);
  const [perfNewOkr, setPerfNewOkr] = useState({ level: "Function" as PerfOkr["level"], objective: "", parentId: "" });

  const PERF_HEALTH_DIMS = [
    { id: "alignment", name: "Strategic Alignment", desc: "Is the operating model supporting current strategy?", questions: ["Strategy priorities are reflected in OM design", "Capability investments match strategic needs", "KPIs trace to strategic objectives", "Design principles are consistently applied"] },
    { id: "efficiency", name: "Efficiency", desc: "Is the model delivering at target cost?", questions: ["Cost-to-serve is at or below benchmark", "Automation targets are being met", "Redundant systems are being consolidated", "Shared services are operating at scale"] },
    { id: "effectiveness", name: "Effectiveness", desc: "Is the model producing quality outcomes?", questions: ["Process error rates are within target", "Customer/stakeholder satisfaction meets goals", "Decision quality has improved", "Outputs meet quality standards"] },
    { id: "agility", name: "Agility", desc: "Can the model adapt to change?", questions: ["New capabilities can be added within 90 days", "Processes can be reconfigured quickly", "Teams can be redeployed across priorities", "Technology stack supports rapid change"] },
    { id: "people", name: "People", desc: "Are roles clear, skills sufficient, culture aligned?", questions: ["Role clarity scores are above 4/5", "Skills coverage meets target levels", "Culture assessment gaps are closing", "Leadership competencies are developing"] },
  ];
  const [perfHealth, setPerfHealth] = usePersisted<Record<string, number>>(`${projectId}_perf_health`, {});

  // ── Transition Plan state ──
  type TransChange = { id: string; name: string; category: "Structure" | "Process" | "Technology" | "People" | "Governance"; from: string; to: string; affected: string; wave: number; dependencies: string[]; risk: string; owner: string; status: "Not Started" | "In Progress" | "Complete" };
  type TransParallel = { changeId: string; duration: string; exitCriteria: string; rollback: string };
  type TransStakeholder = { id: string; name: string; role: string; status: "Not Started" | "In Review" | "Approved" | "Rejected"; conditions: string };
  const TRANS_DEFAULT_CHANGES: TransChange[] = [
    { id: "tc1", name: "Establish shared services center", category: "Structure", from: "Embedded in each function", to: "Centralized SSC", affected: "Finance, HR, IT support", wave: 1, dependencies: [], risk: "Medium", owner: "COO", status: "Not Started" },
    { id: "tc2", name: "Implement new governance forums", category: "Governance", from: "Ad-hoc decision making", to: "Structured steering committees", affected: "All leadership", wave: 0, dependencies: [], risk: "Low", owner: "CEO", status: "Not Started" },
    { id: "tc3", name: "Deploy AI automation platform", category: "Technology", from: "Manual processes", to: "AI-augmented workflows", affected: "Operations, Finance", wave: 2, dependencies: ["tc6"], risk: "High", owner: "CTO", status: "Not Started" },
    { id: "tc4", name: "Redesign Hire-to-Retire process", category: "Process", from: "5 handoffs, 45-day cycle", to: "3 handoffs, 20-day cycle", affected: "HR, Hiring managers", wave: 1, dependencies: ["tc2"], risk: "Medium", owner: "CHRO", status: "Not Started" },
    { id: "tc5", name: "Reskill 200 employees for AI roles", category: "People", from: "Manual task execution", to: "AI-augmented knowledge work", affected: "Operations, Finance staff", wave: 2, dependencies: ["tc3"], risk: "High", owner: "CHRO", status: "Not Started" },
    { id: "tc6", name: "Retire legacy ERP system", category: "Technology", from: "Oracle on-prem ERP", to: "SAP S/4HANA (cloud)", affected: "Finance, Operations", wave: 2, dependencies: ["tc1"], risk: "High", owner: "CTO", status: "Not Started" },
    { id: "tc7", name: "Launch change champion network", category: "People", from: "No change infrastructure", to: "50 change champions across functions", affected: "All functions", wave: 0, dependencies: [], risk: "Low", owner: "CHRO", status: "Not Started" },
    { id: "tc8", name: "Consolidate CRM platforms", category: "Technology", from: "3 CRM systems", to: "1 unified Salesforce instance", affected: "Sales, Marketing, CS", wave: 1, dependencies: [], risk: "Medium", owner: "CTO", status: "Not Started" },
    { id: "tc9", name: "Implement RAPID decision rights", category: "Governance", from: "Unclear decision ownership", to: "RAPID framework for 25 decisions", affected: "All decision-makers", wave: 0, dependencies: ["tc2"], risk: "Low", owner: "CEO", status: "Not Started" },
    { id: "tc10", name: "Redesign org structure (spans & layers)", category: "Structure", from: "7 layers, 4:1 avg span", to: "5 layers, 7:1 avg span", affected: "All people managers", wave: 2, dependencies: ["tc1", "tc5"], risk: "High", owner: "CHRO", status: "Not Started" },
    { id: "tc11", name: "Quick win: automate expense approvals", category: "Process", from: "Manual 3-day approval", to: "Auto-approve <$500", affected: "All employees", wave: 0, dependencies: [], risk: "Low", owner: "CFO", status: "Not Started" },
    { id: "tc12", name: "Establish COE for data & analytics", category: "Structure", from: "Fragmented analytics teams", to: "Central D&A COE", affected: "Data analysts across functions", wave: 1, dependencies: ["tc2"], risk: "Medium", owner: "CDO", status: "Not Started" },
  ];
  const [transChanges, setTransChanges] = usePersisted<TransChange[]>(`${projectId}_trans_changes`, TRANS_DEFAULT_CHANGES);
  const [transView, setTransView] = useState<"migration" | "waves" | "dependencies" | "parallel" | "signoff">("migration");
  const [transParallels, setTransParallels] = usePersisted<TransParallel[]>(`${projectId}_trans_parallel`, []);
  const [transStakeholders, setTransStakeholders] = usePersisted<TransStakeholder[]>(`${projectId}_trans_stakeholders`, [
    { id: "s1", name: "CEO", role: "Executive Sponsor", status: "Not Started", conditions: "" },
    { id: "s2", name: "CFO", role: "Financial Approval", status: "Not Started", conditions: "" },
    { id: "s3", name: "CHRO", role: "People & Change", status: "Not Started", conditions: "" },
    { id: "s4", name: "CTO", role: "Technology Approval", status: "Not Started", conditions: "" },
    { id: "s5", name: "COO", role: "Operations Impact", status: "Not Started", conditions: "" },
    { id: "s6", name: "Board Representative", role: "Board Oversight", status: "Not Started", conditions: "" },
  ]);
  const [transAddingChange, setTransAddingChange] = useState(false);
  const [transAddingStakeholder, setTransAddingStakeholder] = useState(false);
  const TRANS_CAT_COLORS: Record<string, string> = { Structure: "#6366F1", Process: "#10B981", Technology: "#8B5CF6", People: "#F59E0B", Governance: "#D4860A" };
  const TRANS_WAVE_LABELS = ["Wave 0: Foundations (M1-3)", "Wave 1: Quick Wins (M3-6)", "Wave 2: Core Changes (M6-12)", "Wave 3: Optimization (M12-18)"];

  // ── Model Governance state ──
  type MgovOwner = { role: string; name: string; scope: string };
  const [mgovOwners, setMgovOwners] = usePersisted<MgovOwner[]>(`${projectId}_mgov_owners`, [
    { role: "Model Owner", name: "", scope: "Accountable for the operating model delivering outcomes. Final escalation for model decisions." },
    { role: "Model Steward", name: "", scope: "Day-to-day management of model documentation, change requests, and version control." },
    { role: "Finance Owner", name: "", scope: "Owns finance function operating model: service delivery, processes, governance." },
    { role: "HR Owner", name: "", scope: "Owns people function model: talent processes, culture, ways of working." },
    { role: "Technology Owner", name: "", scope: "Owns technology function model: systems, architecture, AI enablement." },
    { role: "Operations Owner", name: "", scope: "Owns operations function model: processes, supply chain, shared services." },
  ]);
  const MGOV_RACI_ACTIVITIES = [
    "Annual OM review", "Quarterly health check", "Change request approval", "Version release", "KPI target setting",
    "Capability investment", "Service model changes", "Governance forum changes", "Process redesign approval", "Technology decisions",
  ];
  const [mgovRaci, setMgovRaci] = usePersisted<Record<string, Record<string, string>>>(`${projectId}_mgov_raci`, {});
  const [mgovView, setMgovView] = useState<"ownership" | "cadence" | "changes" | "versions">("ownership");

  type MgovReview = { id: string; name: string; type: "Quarterly" | "Annual" | "Triggered"; date: string; status: "Scheduled" | "Complete" | "Overdue"; participants: string; notes: string };
  const [mgovReviews, setMgovReviews] = usePersisted<MgovReview[]>(`${projectId}_mgov_reviews`, [
    { id: "mr1", name: "Q1 Health Check", type: "Quarterly", date: "2026-06-30", status: "Scheduled", participants: "Model Owner, Steward, Function Owners", notes: "" },
    { id: "mr2", name: "Q2 Health Check", type: "Quarterly", date: "2026-09-30", status: "Scheduled", participants: "Model Owner, Steward, Function Owners", notes: "" },
    { id: "mr3", name: "Q3 Health Check", type: "Quarterly", date: "2026-12-31", status: "Scheduled", participants: "Model Owner, Steward, Function Owners", notes: "" },
    { id: "mr4", name: "Year 1 Comprehensive Review", type: "Annual", date: "2027-03-31", status: "Scheduled", participants: "Executive Committee, all Function Owners, HR, Finance", notes: "" },
  ]);
  const MGOV_REVIEW_CHECKLIST = [
    "Are strategic priorities still valid?", "Is the model delivering target cost savings?",
    "Are KPIs on track (check balanced scorecard)?", "Have any governance bottlenecks emerged?",
    "Are process maturity scores improving?", "Is technology rationalization on track?",
    "Is culture shifting toward target state?", "Are change capacity limits being respected?",
  ];

  type MgovChangeReq = { id: string; title: string; reason: string; impact: string; cost: string; requestedBy: string; date: string; status: "Draft" | "Under Review" | "Approved" | "Rejected" | "Implemented"; approver: string };
  const [mgovChangeReqs, setMgovChangeReqs] = usePersisted<MgovChangeReq[]>(`${projectId}_mgov_changereqs`, []);
  const [mgovAddingCr, setMgovAddingCr] = useState(false);

  type MgovVersion = { id: string; version: string; date: string; summary: string; changes: string[]; author: string };
  const [mgovVersions, setMgovVersions] = usePersisted<MgovVersion[]>(`${projectId}_mgov_versions`, [
    { id: "v1", version: "1.0", date: "2026-04-11", summary: "Initial operating model design", changes: ["Strategy layer defined", "Governance forums established", "Service delivery model designed", "Process architecture mapped", "Technology portfolio assessed"], author: "Model Steward" },
  ]);
  const [mgovAddingVersion, setMgovAddingVersion] = useState(false);

  const stratPriorityLabel = (id: string) => STRAT_PRIORITIES_ALL.find(p => p.id === id)?.label || id;
  const stratPrioritySummary = stratPriorities.length >= 1
    ? `Your #1 priority is ${stratPriorityLabel(stratPriorities[0])}${stratPriorities.length >= 2 ? ` — followed by ${stratPriorityLabel(stratPriorities[1])}` : ""}. Recommendations will emphasize ${stratPriorities[0] === "cost" ? "efficiency and cost reduction" : stratPriorities[0] === "revenue" ? "growth and revenue generation" : stratPriorities[0] === "innovation" ? "innovation and R&D investment" : stratPriorities[0] === "cx" ? "customer-centricity" : stratPriorities[0] === "ops" ? "process optimization" : stratPriorities[0] === "risk" ? "risk mitigation and compliance" : stratPriorities[0] === "talent" ? "talent development and culture" : "digital transformation and AI adoption"}.`
    : "";

  // Fetch taxonomy when industries change
  useEffect(() => {
    api.getOMTaxonomy(omIndustries.length ? omIndustries : undefined).then(d => setOmTaxonomy(d));
  }, [omIndustries]);

  // Debounced search
  const debouncedOmSearch = useDebounce(omSearch, 300);
  useEffect(() => {
    if (debouncedOmSearch.length >= 2) {
      api.searchOMTaxonomy(debouncedOmSearch, omIndustries.length ? omIndustries : undefined).then(d => setOmSearchResults((d as Record<string,unknown>).results as Record<string,unknown>[] || []));
    } else { setOmSearchResults([]); }
  }, [debouncedOmSearch, omIndustries]);
  const fnD = OM_FUNCTIONS[fn]; const archD = OM_ARCHETYPES[arch];
  // Governance: archetype base + governance tightness modifier
  const govExtra = gov === "tight" ? ["Audit & Oversight Committee","Policy Enforcement"] : gov === "light" ? [] : ["Governance Coordination"];
  const govLayer = [...archD.gov, ...govExtra];
  // Operating model modifier on shared layer
  const modelShared = opModel === "centralized" ? "Global Shared Services Center" : opModel === "decentralized" ? "Local Delivery Teams" : opModel === "federated" ? "Federated Centers of Expertise" : "Hub Center + Embedded Spokes";
  // Core: function capabilities + archetype suffix
  const coreLayer = fnD.core.map(c => archD.coreSuffix ? `${c}${archD.coreSuffix}` : c);
  // Shared: blend function shared + archetype shared themes
  const sharedLayer = [...(fnD.shared || []), modelShared, ...archD.sharedTheme.filter(s => !(fnD.shared || []).some(fs => fs.toLowerCase().includes(s.toLowerCase().split(" ")[0])))].slice(0, 6);
  // Enabling: archetype-specific enabling (overrides function default)
  const enableLayer = archD.enableTheme;
  // Interface: archetype-specific interface
  const interfaceLayer = archD.interfaceTheme;
  const teams = [...coreLayer, ...sharedLayer, ...enableLayer, ...interfaceLayer];
  const getAiTier = (t: string) => { const l = t.toLowerCase();
    // Platform archetype pushes everything more toward AI
    const platformBoost = arch === "platform" ? 15 : arch === "network" ? 5 : 0;
    // Centralized model favors more automation
    const modelBoost = opModel === "centralized" ? 10 : opModel === "decentralized" ? -5 : 0;
    if (l.includes("analytics") || l.includes("data") || l.includes("reporting") || l.includes("qa") || l.includes("audit")) { const p = Math.min(70 + platformBoost + modelBoost, 95); return { tier: "AI-First" as const, color: "#8B5CF6", pct: p }; }
    if (l.includes("ops") || l.includes("admin") || l.includes("procurement") || l.includes("processing") || l.includes("payable") || l.includes("receivable")) { const p = Math.min(45 + platformBoost + modelBoost, 85); return { tier: "AI-Augmented" as const, color: "#D4860A", pct: p }; }
    if (l.includes("strategy") || l.includes("leadership") || l.includes("relations") || l.includes("counsel") || l.includes("culture")) { const p = Math.max(15 + platformBoost + modelBoost, 5); return { tier: "Human-Led" as const, color: "#10B981", pct: p }; }
    const p = Math.min(35 + platformBoost + modelBoost, 80); return { tier: "Hybrid" as const, color: "#F97316", pct: p }; };
  const getSM = (t: string) => { if (sharedLayer.some(s => s.toLowerCase().includes(t.toLowerCase().split(" ")[0]))) return "Shared"; return "Embedded"; };
  const activeCoreLayer = aiBlueprint?.core || coreLayer.map(c => c.replace(archD.coreSuffix, ""));
  const activeSharedLayer = aiBlueprint?.shared || sharedLayer;
  const activeEnableLayer = aiBlueprint?.enabling || enableLayer;
  const activeInterfaceLayer = aiBlueprint?.interface || interfaceLayer;
  const activeGovLayer = aiBlueprint?.governance || govLayer;
  const allCaps = [...activeGovLayer.map(g => ({name:g,layer:"Governance"})), ...activeCoreLayer.map(c => ({name:c,layer:"Core"})), ...activeSharedLayer.map(s => ({name:s,layer:"Shared"})), ...activeEnableLayer.map(e => ({name:e,layer:"Enabling"})), ...activeInterfaceLayer.map(i => ({name:i,layer:"Interface"}))];
  const layerColors: Record<string,string> = { Governance: "var(--risk)", Core: "var(--accent-primary)", Shared: "var(--success)", Enabling: "var(--purple)", Interface: "var(--warning)" };
  // Capability names for strategy mapping
  const stratCapabilities = [...activeCoreLayer.map(c => c.replace(archD.coreSuffix, "")), ...activeSharedLayer, ...activeEnableLayer];

  // ── Step navigator structure ──
  const OM_PHASES = [
    { id: "1", label: "Strategic Intent", icon: "🎯", color: "#D4860A", steps: [
      { id: "1.1", label: "Strategic Priorities", desc: "Vision, priorities & design principles" },
      { id: "1.2", label: "Business Model & Value Chain", desc: "How you create and capture value" },
    ]},
    { id: "2", label: "Architecture Design", icon: "🏗️", color: "#0891B2", steps: [
      { id: "2.1", label: "Capability Model", desc: "Capabilities, maturity & investment" },
      { id: "2.2", label: "Service Delivery Model", desc: "In-house, shared, COE, outsourced" },
      { id: "2.3", label: "Process Architecture", desc: "E2E processes, handoffs & maturity" },
      { id: "2.4", label: "Technology & Systems", desc: "App portfolio, rationalization & AI" },
      { id: "2.5", label: "Governance & Decisions", desc: "Decision rights, forums & bottlenecks" },
    ]},
    { id: "3", label: "People & Organization", icon: "👥", color: "#8B5CF6", steps: [
      { id: "3.1", label: "Organization Structure", desc: "Blueprint, archetype & structure" },
      { id: "3.2", label: "Culture & Ways of Working", desc: "Culture, leadership & collaboration" },
      { id: "3.3", label: "Workforce Model", desc: "Skills, capacity & change readiness" },
    ]},
    { id: "4", label: "Business Case & Execution", icon: "📊", color: "#10B981", steps: [
      { id: "4.1", label: "Financial Model", desc: "Costing, ROI & business case" },
      { id: "4.2", label: "Performance Framework", desc: "Scorecard, OKRs & health check" },
      { id: "4.3", label: "Transition Plan", desc: "Waves, dependencies & sign-off" },
      { id: "4.4", label: "Model Governance", desc: "Ownership, reviews & versioning" },
    ]},
  ];

  // Step completion logic
  const stepComplete = (id: string): boolean => {
    switch (id) {
      case "1.1": return stratPriorities.length >= 1 && Object.values(stratDesignPrinciples).some(v => v.value !== 50);
      case "1.2": return Object.values(stratBizModel).some(arr => arr.length > 0);
      case "2.1": return Object.keys(maturityScores).length >= 3;
      case "2.2": return Object.keys(svcDeliveryMap).length >= 3;
      case "2.3": return procProcesses.some(p => p.maturity > 0);
      case "2.4": return techSystems.length >= 3;
      case "2.5": return govDecisions.length >= 5 && Object.keys(govRapid).length >= 3;
      case "3.1": return arch !== "functional" || opModel !== "centralized";
      case "3.2": return Object.keys(cultureCurrent).length >= 3;
      case "3.3": return changeLoad.fatigue > 0 || changeLoad.infrastructure > 0;
      case "4.1": return Object.keys(finCosts).length >= 3;
      case "4.2": return perfKpis.some(k => k.status !== "Amber");
      case "4.3": return transChanges.some(c => c.status !== "Not Started");
      case "4.4": return mgovOwners.some(o => o.name.length > 0);
      default: return false;
    }
  };
  const stepInProgress = (id: string): boolean => {
    if (stepComplete(id)) return false;
    switch (id) {
      case "1.1": return stratPriorities.length > 0 || stratVision.length > 0;
      case "1.2": return Object.values(stratBizModel).some(arr => arr.length > 0);
      case "2.1": return Object.keys(maturityScores).length > 0 || Object.keys(targetScores).length > 0;
      case "2.2": return Object.keys(svcDeliveryMap).length > 0;
      case "2.3": return procProcesses.length > 0;
      case "2.4": return techSystems.length > 0;
      case "2.5": return govDecisions.length > 0;
      case "3.2": return Object.keys(cultureCurrent).length > 0 || Object.keys(cultureTarget).length > 0;
      case "4.2": return perfKpis.length > 0;
      case "4.3": return transChanges.length > 0;
      default: return false;
    }
  };
  const completedSteps = OM_PHASES.flatMap(p => p.steps).filter(s => stepComplete(s.id)).length;
  const totalSteps = OM_PHASES.flatMap(p => p.steps).length;
  const completionPct = Math.round((completedSteps / totalSteps) * 100);

  return <div>
    <PageHeader icon="🧬" title="Operating Model Lab" subtitle="Build a complete Target Operating Model — guided step by step" onBack={onBack} moduleId="opmodel" />

    {/* Progress bar + TOM button */}
    <div className="flex items-center gap-4 mb-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">Operating Model: {completionPct}% complete — {completedSteps} of {totalSteps} steps configured</span>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigateCanvas && onNavigateCanvas()} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)] transition-all">⬡ Design Canvas</button>
            <button onClick={() => setShowTomSummary(true)} className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>📋 View Target Operating Model</button>
          </div>
        </div>
        <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${completionPct}%`, background: completionPct >= 70 ? "var(--success)" : completionPct >= 30 ? "var(--accent-primary)" : "var(--text-muted)" }} /></div>
      </div>
    </div>

    {/* ═══ TOM SUMMARY MODAL ═══ */}
    {showTomSummary && <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setShowTomSummary(false)}>
      <div className="bg-[var(--bg)] rounded-2xl border border-[var(--border)] max-w-[1200px] w-full max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div><div className="text-[22px] font-extrabold text-[var(--text-primary)]">Target Operating Model — Summary</div><div className="text-[14px] text-[var(--text-muted)]">TOM-on-a-Page | Generated {new Date().toLocaleDateString()}</div></div>
          <button onClick={() => setShowTomSummary(false)} className="text-[20px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* 1. Strategic Intent */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#D4860A" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#D4860A" }}>Strategic Intent</div>
            {stratPriorities.length > 0 ? <div className="space-y-1">{stratPriorities.map((id, i) => { const p = STRAT_PRIORITIES_ALL.find(x => x.id === id); return <div key={id} className="text-[13px]"><strong>#{i+1}</strong> {p?.icon} {p?.label}</div>; })}</div> : <div className="text-[13px] text-[var(--text-muted)]">Not configured</div>}
            {stratVision && <div className="text-[12px] text-[var(--text-muted)] mt-2 italic line-clamp-2">{stratVision}</div>}
          </div>
          {/* 2. Capability Heatmap */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#0891B2" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#0891B2" }}>Capability Maturity</div>
            <div className="space-y-1">{stratCapabilities.slice(0, 6).map(cap => { const s = maturityScores[cap] || 0; const t = targetScores[cap] || 0; return <div key={cap} className="flex items-center justify-between text-[12px]"><span className="truncate flex-1">{cap}</span><span className="font-bold ml-1" style={{ color: s >= 4 ? "var(--success)" : s >= 3 ? "var(--warning)" : s > 0 ? "var(--risk)" : "var(--text-muted)" }}>{s || "—"}{t ? `→${t}` : ""}</span></div>; })}</div>
          </div>
          {/* 3. Service Delivery */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#0891B2" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#0891B2" }}>Service Delivery</div>
            {(() => { const counts: Record<string, number> = {}; Object.values(svcDeliveryMap).forEach(v => { counts[v.target || v.current] = (counts[v.target || v.current] || 0) + 1; }); return Object.keys(counts).length > 0 ? <div className="space-y-1">{Object.entries(counts).map(([m, c]) => <div key={m} className="flex justify-between text-[12px]"><span>{m}</span><span className="font-bold">{c}</span></div>)}</div> : <div className="text-[13px] text-[var(--text-muted)]">Not configured</div>; })()}
          </div>
          {/* 4. Processes */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#0891B2" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#0891B2" }}>Process Overview</div>
            <div className="space-y-1">{procProcesses.slice(0, 6).map(p => <div key={p.id} className="flex justify-between text-[12px]"><span className="truncate flex-1">{p.name}</span><span className="font-bold ml-1" style={{ color: p.maturity >= 4 ? "var(--success)" : p.maturity >= 3 ? "var(--warning)" : p.maturity > 0 ? "var(--risk)" : "var(--text-muted)" }}>L{p.maturity || "—"}</span></div>)}</div>
          </div>
          {/* 5. Technology */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#0891B2" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#0891B2" }}>Technology Landscape</div>
            <div className="space-y-1">{techSystems.filter(s => s.status === "Invest").slice(0, 4).map(s => <div key={s.id} className="text-[12px]"><strong>{s.name}</strong> <span className="text-[var(--text-muted)]">({s.category})</span></div>)}{techSystems.filter(s => s.status === "Retire").length > 0 && <div className="text-[12px] text-[var(--risk)]">{techSystems.filter(s => s.status === "Retire").length} systems to retire</div>}</div>
          </div>
          {/* 6. Governance */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#0891B2" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#0891B2" }}>Governance</div>
            <div className="text-[12px]"><strong>{govDecisions.length}</strong> decisions catalogued</div>
            <div className="text-[12px]"><strong>{govForums.length}</strong> governance forums</div>
            <div className="text-[12px]">{govDecisions.filter(d => d.clarity === "Undefined").length > 0 ? <span className="text-[var(--risk)]">{govDecisions.filter(d => d.clarity === "Undefined").length} decisions lack clarity</span> : <span className="text-[var(--success)]">All decisions have clear owners</span>}</div>
          </div>
          {/* 7. Organization */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#8B5CF6" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#8B5CF6" }}>Organization</div>
            <div className="text-[12px]">Archetype: <strong>{archD.label}</strong></div>
            <div className="text-[12px]">Model: <strong>{opModel.replace("_", " ")}</strong> · {gov} governance</div>
            {(() => { const gaps = CULTURE_DIMS.filter(d => cultureCurrent[d.id] && cultureTarget[d.id] && Math.abs(cultureTarget[d.id] - cultureCurrent[d.id]) >= 2); return gaps.length > 0 ? <div className="text-[12px] text-[var(--warning)]">{gaps.length} culture gap{gaps.length > 1 ? "s" : ""} to close</div> : null; })()}
          </div>
          {/* 8. Financials */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#10B981" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#10B981" }}>Financials</div>
            {(() => { const curT = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.people||0) + (c?.technology||0) + (c?.outsourcing||0) + (c?.facilities||0); }, 0); const tgtT = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.peopleTgt||0) + (c?.technologyTgt||0) + (c?.outsourcingTgt||0) + (c?.facilitiesTgt||0); }, 0); const d = tgtT - curT; return <><div className="text-[12px]">Current: <strong>${fmtK(curT)}</strong>/yr</div><div className="text-[12px]">Target: <strong>${fmtK(tgtT)}</strong>/yr</div>{d !== 0 && <div className="text-[12px] font-bold" style={{ color: d < 0 ? "var(--success)" : "var(--risk)" }}>{d < 0 ? "Saves" : "Costs"} ${fmtK(Math.abs(d))}/yr</div>}</>; })()}
          </div>
          {/* 9. Implementation */}
          <div className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#10B981" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#10B981" }}>Implementation</div>
            {[0,1,2,3].map(w => { const c = transChanges.filter(ch => ch.wave === w).length; return c > 0 ? <div key={w} className="text-[12px]">{TRANS_WAVE_LABELS[w].split("(")[0]}: <strong>{c} changes</strong></div> : null; })}
            {(() => { const approved = transStakeholders.filter(s => s.status === "Approved").length; return <div className="text-[12px] mt-1">Sign-off: <strong>{approved}/{transStakeholders.length}</strong> approved</div>; })()}
          </div>
          {/* 10. KPIs */}
          <div className="col-span-3 rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "#10B981" }}>
            <div className="text-[13px] font-bold uppercase mb-2" style={{ color: "#10B981" }}>Key Performance Indicators</div>
            <div className="grid grid-cols-4 gap-2">{perfKpis.slice(0, 8).map(k => { const ragC: Record<string, string> = { Red: "var(--risk)", Amber: "var(--warning)", Green: "var(--success)" }; return <div key={k.id} className="flex items-center gap-2 text-[12px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: ragC[k.status] }} /><span className="truncate">{k.name}: <strong>{k.current}</strong> → {k.target}</span></div>; })}</div>
          </div>
        </div>
      </div>
    </div>}

    {/* ═══ MAIN LAYOUT: Step Navigator (left) + Content (right) ═══ */}
    <div className="flex gap-5">
      {/* ── LEFT: Step Navigator ── */}
      <div className="w-[240px] shrink-0 sticky top-4 self-start space-y-1 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
        {/* Industry Setup */}
        <button onClick={() => setOmView("setup")} className="w-full text-left px-3 py-2 rounded-lg text-[13px] font-semibold transition-all mb-2" style={{ background: omView === "setup" ? "rgba(212,134,10,0.1)" : "var(--surface-2)", color: omView === "setup" ? "#e09040" : "var(--text-muted)", border: omView === "setup" ? "1px solid rgba(212,134,10,0.3)" : "1px solid var(--border)" }}>⚙️ Industry Setup</button>
        {OM_PHASES.map(phase => {
          const phaseComplete = phase.steps.every(s => stepComplete(s.id));
          const phaseStarted = phase.steps.some(s => stepComplete(s.id) || stepInProgress(s.id));
          return <div key={phase.id} className="mb-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${phase.color}08` }}>
              <span className="text-[14px]">{phase.icon}</span>
              <span className="text-[13px] font-bold uppercase tracking-wider" style={{ color: phase.color }}>{phase.label}</span>
              {phaseComplete && <span className="text-[11px] ml-auto text-[var(--success)]">✓</span>}
              {!phaseComplete && phaseStarted && <span className="text-[11px] ml-auto" style={{ color: phase.color }}>…</span>}
            </div>
            <div className="ml-2 border-l-2 border-[var(--border)] pl-2 space-y-0.5 mt-1 mb-2">
              {phase.steps.map(step => {
                const isActive = omView === step.id;
                const complete = stepComplete(step.id);
                const inProg = stepInProgress(step.id);
                return <button key={step.id} onClick={() => setOmView(step.id)} className="w-full text-left px-2.5 py-2 rounded-lg transition-all group" style={{
                  background: isActive ? `${phase.color}12` : "transparent",
                  border: isActive ? `1px solid ${phase.color}40` : "1px solid transparent",
                }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] shrink-0" style={{ color: complete ? "var(--success)" : inProg ? phase.color : "var(--text-muted)" }}>{complete ? "🟢" : inProg ? "🟡" : "⚪"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: isActive ? phase.color : "var(--text-primary)" }}>{step.id} {step.label}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">{step.desc}</div>
                    </div>
                  </div>
                </button>;
              })}
            </div>
          </div>;
        })}
      </div>

      {/* ── RIGHT: Content Area ── */}
      <div className="flex-1 min-w-0">
        {/* Strategy context banner — shows on non-strategy steps */}
        {!omView.startsWith("1.") && omView !== "setup" && stratPriorities.length > 0 && <div className="rounded-xl bg-[rgba(212,134,10,0.05)] border border-[rgba(212,134,10,0.15)] px-4 py-2 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px]"><span>🎯</span><span style={{ color: "#e09040" }}>{stratPrioritySummary}</span></div>
          <button onClick={() => setOmView("1.1")} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">Edit</button>
        </div>}

        {/* ── SETUP: Industry Configurator ── */}
        {omView === "setup" && <div className="animate-tab-enter space-y-5">
          <Card title="Industry Setup — Pre-populate Your Operating Model">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Select your industry to pre-populate capabilities, processes, and benchmarks. You can customize everything afterward.</div>
            {/* Company sandbox */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-4">
              <div className="text-[14px] font-bold text-[var(--text-primary)] mb-2">Quick Start — Load a Company Template</div>
              <div className="flex gap-2 flex-wrap mb-3">{Object.entries({...OM_COMPANIES,...aiCompanies}).map(([k,c]) => { const co = c as Record<string,string>; return <button key={k} onClick={() => seedCompanySandbox(k, co)} disabled={sandboxLoading===k} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold transition-all" style={{ background: sandboxLoading===k ? "rgba(224,144,64,0.2)" : "var(--surface-2)", color: sandboxLoading===k ? "var(--accent-primary)" : "var(--text-muted)", border: "1px solid var(--border)" }}>{sandboxLoading===k ? "⏳ " : ""}{co.name||k}</button>; })}</div>
              <div className="flex gap-2"><input value={aiCompanyInput} onChange={e => setAiCompanyInput(e.target.value)} placeholder="Or type any company name..." className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" onKeyDown={e => { if (e.key==="Enter") generateCompanyModel(); }} /><button onClick={generateCompanyModel} disabled={aiCompanyGenerating} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>{aiCompanyGenerating ? "..." : "☕ Generate"}</button></div>
            </div>
            {/* Architecture presets */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div><div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Archetype</div><div className="space-y-1">{Object.entries(OM_ARCHETYPES).map(([k,v]) => <button key={k} onClick={() => setArch(k)} className="w-full text-left px-3 py-1.5 rounded-lg text-[14px] transition-all" style={{ background: arch===k ? "rgba(139,92,246,0.1)" : "transparent", border: arch===k ? "1px solid var(--purple)" : "1px solid transparent", color: arch===k ? "var(--purple)" : "var(--text-muted)" }}>{v.label}</button>)}</div></div>
              <div><div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Operating Model</div><div className="space-y-1">{["centralized","decentralized","federated","hub_spoke"].map(m => <button key={m} onClick={() => setOpModel(m)} className="w-full text-left px-3 py-1.5 rounded-lg text-[14px] transition-all" style={{ background: opModel===m ? "rgba(16,185,129,0.1)" : "transparent", border: opModel===m ? "1px solid var(--success)" : "1px solid transparent", color: opModel===m ? "var(--success)" : "var(--text-muted)" }}>{m.replace("_"," ")}</button>)}</div></div>
              <div><div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Governance Style</div><div className="space-y-1">{["tight","balanced","light"].map(g => <button key={g} onClick={() => setGov(g)} className="w-full text-left px-3 py-1.5 rounded-lg text-[14px] transition-all" style={{ background: gov===g ? "rgba(249,115,22,0.1)" : "transparent", border: gov===g ? "1px solid var(--warning)" : "1px solid transparent", color: gov===g ? "var(--warning)" : "var(--text-muted)" }}>{g}</button>)}</div>
                <button onClick={async () => { setAiOmLoading(true); try { const r = await callAI("Return ONLY valid JSON.", `For ${fnD.label}, recommend: {"archetype":"functional|divisional|matrix|platform|network","opModel":"centralized|decentralized|federated|hub_spoke","governance":"tight|balanced|light","reasoning":"2 sentences"}`); const p = JSON.parse(r.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()); if (p.archetype) setArch(p.archetype); if (p.opModel) setOpModel(p.opModel); if (p.governance) setGov(p.governance); setAiOmReasoning(p.reasoning||""); } catch {} setAiOmLoading(false); }} disabled={aiOmLoading} className="w-full mt-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: aiOmLoading ? 0.5 : 1 }}>{aiOmLoading ? "..." : "☕ AI Recommend"}</button>
                {aiOmReasoning && <div className="text-[13px] text-[var(--text-secondary)] bg-[var(--bg)] rounded-lg p-2 mt-2">{aiOmReasoning}</div>}
              </div>
            </div>
            <button onClick={() => setOmView("1.1")} className="w-full px-4 py-3 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Begin Building Your Operating Model →</button>
          </Card>
        </div>}

        {/* ═══ PHASE 1: STRATEGIC INTENT ═══ */}

        {/* ── Step 1.1: Strategic Priorities ── */}
        {omView === "1.1" && <div className="animate-tab-enter space-y-5">

          {/* ─── 1. STRATEGIC PRIORITIES ─── */}
          <Card title="Strategic Priorities — Select & Rank Your Top 3">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Choose your organization{"'"}s top 3 strategic priorities and rank them. These priorities anchor every recommendation across the operating model.</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {STRAT_PRIORITIES_ALL.map(p => {
                const rank = stratPriorities.indexOf(p.id);
                const isSelected = rank >= 0;
                const rankColors = ["#D4860A", "#C07030", "#A0522D"];
                return <button key={p.id} onClick={() => {
                  setStratPriorities(prev => {
                    if (isSelected) return prev.filter(x => x !== p.id);
                    if (prev.length >= 3) return prev;
                    return [...prev, p.id];
                  });
                }} className="relative rounded-xl p-4 text-left transition-all hover:-translate-y-0.5" style={{
                  background: isSelected ? `${rankColors[rank] || "#A0522D"}12` : "var(--surface-2)",
                  border: isSelected ? `2px solid ${rankColors[rank] || "#A0522D"}` : "1px solid var(--border)",
                }}>
                  {isSelected && <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[14px] font-extrabold text-white" style={{ background: rankColors[rank] }}>#{rank + 1}</div>}
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className="text-[15px] font-bold" style={{ color: isSelected ? rankColors[rank] : "var(--text-primary)" }}>{p.label}</div>
                  <div className="text-[13px] text-[var(--text-muted)] mt-1 leading-snug">{p.desc}</div>
                </button>;
              })}
            </div>
            {stratPriorities.length > 0 && <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                {stratPriorities.map((id, i) => {
                  const p = STRAT_PRIORITIES_ALL.find(x => x.id === id);
                  return <React.Fragment key={id}>
                    {i > 0 && <span className="text-[var(--text-muted)]">→</span>}
                    <span className="px-3 py-1.5 rounded-lg text-[15px] font-bold" style={{ background: ["#D4860A","#C07030","#A0522D"][i] + "18", color: ["#D4860A","#C07030","#A0522D"][i] }}>#{i+1} {p?.icon} {p?.label}</span>
                  </React.Fragment>;
                })}
              </div>
              <button onClick={() => setStratPriorities([])} className="ml-auto text-[14px] text-[var(--text-muted)] hover:text-[var(--risk)]">Reset</button>
            </div>}
            {stratPriorities.length > 0 && <div className="mt-3 rounded-lg bg-[rgba(212,134,10,0.06)] border border-[rgba(212,134,10,0.15)] px-4 py-3 text-[15px]" style={{ color: "#e09040" }}>
              {stratPrioritySummary}
            </div>}
            {stratPriorities.length > 1 && <div className="mt-2 text-[14px] text-[var(--text-muted)]">Drag to re-order: {stratPriorities.map((id, i) => {
              const p = STRAT_PRIORITIES_ALL.find(x => x.id === id);
              return <button key={id} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-[var(--surface-2)] hover:bg-[var(--bg)] transition-all" onClick={() => {
                setStratPriorities(prev => {
                  const arr = [...prev];
                  if (i === 0) { const [item] = arr.splice(i, 1); arr.push(item); }
                  else { [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; }
                  return arr;
                });
              }}><span className="text-[14px]">{i > 0 ? "↑" : "↓"}</span> {p?.icon} {p?.label}</button>;
            })}</div>}
          </Card>

          {/* ─── 2. DESIGN PRINCIPLES ─── */}
          <Card title="Design Principles — Define Your Operating Model Rules">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Set the design principles that will guide all operating model decisions. These become rules that constrain recommendations.</div>
            <div className="space-y-5">
              {[
                { key: "centralize", left: "Decentralize", right: "Centralize", leftIcon: "🌐", rightIcon: "🏢", leftDesc: "Functions operate independently with local autonomy", rightDesc: "Functions consolidated into shared centers" },
                { key: "standardize", left: "Customize", right: "Standardize", leftIcon: "🎨", rightIcon: "📏", leftDesc: "Tailored processes per business unit / region", rightDesc: "Uniform processes and policies across the org" },
                { key: "buildBuy", left: "Build In-House", right: "Buy / Partner", leftIcon: "🔨", rightIcon: "🤝", leftDesc: "Develop capabilities internally", rightDesc: "Acquire or outsource capabilities" },
                { key: "controlSpeed", left: "Speed", right: "Control", leftIcon: "⚡", rightIcon: "🔒", leftDesc: "Minimize approvals, empower teams", rightDesc: "Rigorous governance and oversight" },
                { key: "specialistGen", left: "Generalist", right: "Specialist", leftIcon: "🔄", rightIcon: "🎯", leftDesc: "Broad roles, cross-functional flexibility", rightDesc: "Deep expertise, narrow focus" },
              ].map(p => {
                const val = stratDesignPrinciples[p.key]?.value ?? 50;
                const rationale = stratDesignPrinciples[p.key]?.rationale ?? "";
                const setVal = (v: number) => setStratDesignPrinciples(prev => ({ ...prev, [p.key]: { ...prev[p.key], value: v, rationale: prev[p.key]?.rationale || "" } }));
                const setRat = (r: string) => setStratDesignPrinciples(prev => ({ ...prev, [p.key]: { ...prev[p.key], rationale: r, value: prev[p.key]?.value ?? 50 } }));
                const leanLabel = val < 35 ? p.left : val > 65 ? p.right : "Balanced";
                const leanColor = val < 35 ? "var(--purple)" : val > 65 ? "var(--accent-primary)" : "var(--text-muted)";
                return <div key={p.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><span className="text-lg">{p.leftIcon}</span><span className="text-[15px] font-bold text-[var(--text-primary)]">{p.left}</span></div>
                    <div className="px-3 py-1 rounded-full text-[14px] font-bold" style={{ background: `${leanColor}15`, color: leanColor }}>{leanLabel}</div>
                    <div className="flex items-center gap-2"><span className="text-[15px] font-bold text-[var(--text-primary)]">{p.right}</span><span className="text-lg">{p.rightIcon}</span></div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[13px] text-[var(--text-muted)] w-20 text-right shrink-0">{p.leftDesc.split(",")[0]}</span>
                    <input type="range" min={0} max={100} value={val} onChange={e => setVal(Number(e.target.value))}
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, var(--purple) 0%, var(--text-muted) 50%, var(--accent-primary) 100%)` }} />
                    <span className="text-[13px] text-[var(--text-muted)] w-20 shrink-0">{p.rightDesc.split(",")[0]}</span>
                  </div>
                  <input type="text" value={rationale} onChange={e => setRat(e.target.value)}
                    placeholder={`Rationale: "We ${p.right.toLowerCase()} because..."`}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none mt-1" />
                </div>;
              })}
            </div>
          </Card>

          {/* ─── 3. STRATEGY-TO-CAPABILITY MAPPING ─── */}
          {stratPriorities.length > 0 && <Card title="Strategy-to-Capability Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Map how each capability supports your strategic priorities. Capabilities critical to multiple priorities are strategic differentiators.</div>
            {(() => {
              const levels = ["Critical", "Important", "Supporting", "Not Required"] as const;
              const levelColors: Record<string, string> = { Critical: "var(--risk)", Important: "var(--accent-primary)", Supporting: "var(--text-muted)", "Not Required": "var(--border)" };
              // Count criticals per capability
              const criticalCounts: Record<string, number> = {};
              const anyLink: Record<string, boolean> = {};
              stratCapabilities.forEach(cap => {
                let cc = 0; let linked = false;
                stratPriorities.forEach(pri => {
                  const val = stratCapMatrix[`${pri}__${cap}`];
                  if (val === "Critical") cc++;
                  if (val && val !== "Not Required") linked = true;
                });
                criticalCounts[cap] = cc;
                anyLink[cap] = linked;
              });
              const differentiators = stratCapabilities.filter(c => criticalCounts[c] >= 2);
              const outsourceCandidates = stratCapabilities.filter(c => !anyLink[c] && stratPriorities.length >= 2);
              return <>
                {/* Summary badges */}
                {(differentiators.length > 0 || outsourceCandidates.length > 0) && <div className="flex flex-wrap gap-3 mb-4">
                  {differentiators.length > 0 && <div className="rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] px-4 py-2">
                    <div className="text-[14px] font-bold text-[var(--risk)] uppercase mb-1">Strategic Differentiators</div>
                    <div className="flex flex-wrap gap-1">{differentiators.map(c => <span key={c} className="px-2 py-0.5 rounded-full text-[13px] font-semibold bg-[rgba(239,68,68,0.1)] text-[var(--risk)]">{c}</span>)}</div>
                  </div>}
                  {outsourceCandidates.length > 0 && <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-4 py-2">
                    <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-1">Outsource / Simplify Candidates</div>
                    <div className="flex flex-wrap gap-1">{outsourceCandidates.map(c => <span key={c} className="px-2 py-0.5 rounded-full text-[13px] text-[var(--text-muted)] bg-[var(--bg)]">{c}</span>)}</div>
                  </div>}
                </div>}
                {/* Matrix */}
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                    <th className="px-3 py-2 text-left text-[14px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 min-w-[160px]">Capability</th>
                    {stratPriorities.map((pri, i) => {
                      const p = STRAT_PRIORITIES_ALL.find(x => x.id === pri);
                      return <th key={pri} className="px-2 py-2 text-center text-[14px] font-semibold border-b border-[var(--border)] min-w-[100px]" style={{ color: ["#D4860A","#C07030","#A0522D"][i] }}>{p?.icon} {p?.label}</th>;
                    })}
                    <th className="px-2 py-2 text-center text-[14px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Score</th>
                  </tr></thead>
                  <tbody>{stratCapabilities.map(cap => {
                    const score = stratPriorities.reduce((s, pri) => {
                      const v = stratCapMatrix[`${pri}__${cap}`];
                      return s + (v === "Critical" ? 3 : v === "Important" ? 2 : v === "Supporting" ? 1 : 0);
                    }, 0);
                    return <tr key={cap} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                      <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg)] z-10">
                        {cap}
                        {criticalCounts[cap] >= 2 && <span className="ml-1 text-[12px] text-[var(--risk)]" title="Strategic Differentiator">★</span>}
                      </td>
                      {stratPriorities.map(pri => {
                        const val = stratCapMatrix[`${pri}__${cap}`] || "";
                        return <td key={pri} className="px-2 py-2 text-center">
                          <button onClick={() => {
                            const cycle = ["", "Critical", "Important", "Supporting", "Not Required"];
                            const next = cycle[(cycle.indexOf(val) + 1) % cycle.length];
                            setStratCapMatrix(prev => ({ ...prev, [`${pri}__${cap}`]: next }));
                          }} className="px-2 py-0.5 rounded-full text-[13px] font-semibold min-w-[70px] transition-all" style={{
                            background: val ? `${levelColors[val]}12` : "var(--surface-2)",
                            color: val ? levelColors[val] : "var(--text-muted)",
                            border: val ? `1px solid ${levelColors[val]}30` : "1px solid var(--border)",
                          }}>{val || "—"}</button>
                        </td>;
                      })}
                      <td className="px-2 py-2 text-center">
                        <span className="text-[14px] font-bold" style={{ color: score >= 6 ? "var(--risk)" : score >= 3 ? "var(--accent-primary)" : "var(--text-muted)" }}>{score || "—"}</span>
                      </td>
                    </tr>;
                  })}</tbody></table>
                </div>
                <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">
                  {levels.map(l => <span key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: levelColors[l] }} />{l}</span>)}
                  <span className="flex items-center gap-1"><span className="text-[var(--risk)]">★</span> = Critical to 2+ priorities</span>
                </div>
              </>;
            })()}
          </Card>}

          {/* ─── 4. TARGET STATE VISION ─── */}
          <Card title="Target State Vision">
            <div className="text-[15px] text-[var(--text-secondary)] mb-3">Define your 3-5 sentence target state vision. This appears as context across all operating model tabs.</div>
            <textarea value={stratVision} onChange={e => setStratVision(e.target.value)}
              placeholder="Example: We will be a digitally-enabled, customer-centric organization that leverages AI to automate routine operations while investing in specialist talent for strategic advisory. Our operating model will centralize shared services for efficiency while embedding business partners in each division..."
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none leading-relaxed"
              rows={4} />
            <div className="flex items-center justify-between mt-3">
              <button onClick={async () => {
                setStratVisionGenerating(true);
                try {
                  const priLabels = stratPriorities.map(id => stratPriorityLabel(id)).join(", ");
                  const principles = Object.entries(stratDesignPrinciples).map(([k, v]) => {
                    const labels: Record<string, [string, string]> = { centralize: ["Decentralize", "Centralize"], standardize: ["Customize", "Standardize"], buildBuy: ["Build", "Buy/Partner"], controlSpeed: ["Speed", "Control"], specialistGen: ["Generalist", "Specialist"] };
                    const [left, right] = labels[k] || [k, k];
                    const lean = v.value < 35 ? left : v.value > 65 ? right : `Balanced ${left}/${right}`;
                    return `${lean}${v.rationale ? ` (${v.rationale})` : ""}`;
                  }).join("; ");
                  const prompt = `Generate a compelling 3-5 sentence target state vision for an organization with these strategic priorities: ${priLabels || "not yet defined"}. Design principles: ${principles}. Function focus: ${fnD.label}. Archetype: ${archD.label}. Operating model: ${opModel.replace("_"," ")}. Write in first-person plural ("We will..."). Be specific and strategic, not generic.`;
                  const result = await callAI("You are a McKinsey-level operating model strategist. Write a concise, powerful target state vision statement.", prompt);
                  setStratVision(result.replace(/```/g, "").replace(/^["']|["']$/g, "").trim());
                } catch { showToast("AI couldn't draft the vision — try again"); }
                setStratVisionGenerating(false);
              }} disabled={stratVisionGenerating} className="px-4 py-2 rounded-xl text-[15px] font-semibold text-white flex items-center gap-2" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: stratVisionGenerating ? 0.5 : 1 }}>
                {stratVisionGenerating ? "Generating..." : "✨ AI Draft Vision"}
              </button>
              <span className="text-[14px] text-[var(--text-muted)]">{stratVision.length > 0 ? `${stratVision.split(/[.!?]+/).filter(Boolean).length} sentences` : "No vision set"}</span>
            </div>
          </Card>

          {/* ─── 5. BUSINESS MODEL CANVAS ─── */}
          <Card title="Business Model Canvas">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define the business model your operating model must support. Click any quadrant to add items.</div>
            <div className="grid grid-cols-2 gap-4">
              {([
                { key: "value_prop", label: "Value Proposition", icon: "💎", color: "var(--accent-primary)", desc: "What value do you deliver to customers?" },
                { key: "key_activities", label: "Key Activities", icon: "⚡", color: "var(--success)", desc: "What activities are essential to deliver value?" },
                { key: "key_resources", label: "Key Resources", icon: "🏗️", color: "var(--purple)", desc: "What resources and capabilities are critical?" },
                { key: "revenue_cost", label: "Revenue & Cost Structure", icon: "💰", color: "var(--warning)", desc: "How does the org generate revenue and manage costs?" },
              ] as const).map(q => {
                const items = stratBizModel[q.key] || [];
                const isEditing = stratBizEditField === q.key;
                return <div key={q.key} className="rounded-xl border p-4" style={{ background: `${q.color}04`, borderColor: `${q.color}25` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{q.icon}</span>
                    <span className="text-[15px] font-bold" style={{ color: q.color }}>{q.label}</span>
                  </div>
                  <div className="text-[13px] text-[var(--text-muted)] mb-3">{q.desc}</div>
                  <div className="space-y-1.5 mb-3 min-h-[40px]">
                    {items.map((item, idx) => <div key={idx} className="flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: q.color }} />
                      <span className="text-[14px] text-[var(--text-primary)] flex-1">{item}</span>
                      <button onClick={() => setStratBizModel(prev => ({ ...prev, [q.key]: prev[q.key].filter((_, i) => i !== idx) }))}
                        className="text-[14px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--risk)] transition-all">×</button>
                    </div>)}
                    {items.length === 0 && <div className="text-[14px] text-[var(--text-muted)] italic">No items yet</div>}
                  </div>
                  {isEditing ? <div className="flex gap-2">
                    <input type="text" value={stratBizEditText} onChange={e => setStratBizEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && stratBizEditText.trim()) { setStratBizModel(prev => ({ ...prev, [q.key]: [...(prev[q.key] || []), stratBizEditText.trim()] })); setStratBizEditText(""); } if (e.key === "Escape") { setStratBizEditField(null); setStratBizEditText(""); } }}
                      placeholder="Type and press Enter..."
                      className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                      autoFocus />
                    <button onClick={() => { if (stratBizEditText.trim()) { setStratBizModel(prev => ({ ...prev, [q.key]: [...(prev[q.key] || []), stratBizEditText.trim()] })); setStratBizEditText(""); } setStratBizEditField(null); }}
                      className="px-3 py-1.5 rounded-lg text-[14px] font-semibold" style={{ background: `${q.color}15`, color: q.color }}>Add</button>
                  </div> : <button onClick={() => { setStratBizEditField(q.key); setStratBizEditText(""); }}
                    className="w-full px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Item</button>}
                </div>;
              })}
            </div>
          </Card>

          {/* Strategy completion status */}
          {(() => {
            const checks = [
              { done: stratPriorities.length >= 1, label: "Strategic priorities selected" },
              { done: Object.values(stratDesignPrinciples).some(v => v.value !== 50), label: "Design principles configured" },
              { done: Object.values(stratCapMatrix).some(v => v && v !== "Not Required"), label: "Capabilities mapped to strategy" },
              { done: stratVision.length > 20, label: "Target state vision defined" },
              { done: Object.values(stratBizModel).some(arr => arr.length > 0), label: "Business model outlined" },
            ];
            const completed = checks.filter(c => c.done).length;
            return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[15px] font-bold text-[var(--text-primary)]">Strategy Readiness</div>
                <div className="text-[14px] font-bold" style={{ color: completed >= 4 ? "var(--success)" : completed >= 2 ? "var(--accent-primary)" : "var(--text-muted)" }}>{completed}/5 complete</div>
              </div>
              <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden mb-3"><div className="h-full rounded-full transition-all" style={{ width: `${(completed / 5) * 100}%`, background: completed >= 4 ? "var(--success)" : "var(--accent-primary)" }} /></div>
              <div className="grid grid-cols-2 gap-2">
                {checks.map(c => <div key={c.label} className="flex items-center gap-2 text-[14px]">
                  <span style={{ color: c.done ? "var(--success)" : "var(--text-muted)" }}>{c.done ? "✓" : "○"}</span>
                  <span style={{ color: c.done ? "var(--text-primary)" : "var(--text-muted)" }}>{c.label}</span>
                </div>)}
              </div>
              {completed >= 3 && <button onClick={() => setOmView("1.2")} className="mt-3 w-full px-4 py-2 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Continue to Step 1.2: Business Model →</button>}
            </div>;
          })()}
        </div>}

        {/* ── Step 1.2: Business Model & Value Chain ── */}
        {omView === "1.2" && <div className="animate-tab-enter space-y-5">
          <Card title="Step 1.2 — Business Model & Value Chain">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define how your organization creates and captures value. This determines where your operating model must excel.</div>
          </Card>
          {/* Reuse business model canvas from strategy state */}
          <Card title="Business Model Canvas">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define the business model your operating model must support. Click any quadrant to add items.</div>
            <div className="grid grid-cols-2 gap-4">
              {([
                { key: "value_prop", label: "Value Proposition", icon: "💎", color: "var(--accent-primary)", desc: "What value do you deliver to customers?" },
                { key: "key_activities", label: "Key Activities", icon: "⚡", color: "var(--success)", desc: "What activities are essential to deliver value?" },
                { key: "key_resources", label: "Key Resources", icon: "🏗️", color: "var(--purple)", desc: "What resources and capabilities are critical?" },
                { key: "revenue_cost", label: "Revenue & Cost Structure", icon: "💰", color: "var(--warning)", desc: "How does the org generate revenue and manage costs?" },
              ] as const).map(q => {
                const items = stratBizModel[q.key] || [];
                const isEditing = stratBizEditField === q.key;
                return <div key={q.key} className="rounded-xl border p-4" style={{ background: `${q.color}04`, borderColor: `${q.color}25` }}>
                  <div className="flex items-center gap-2 mb-2"><span className="text-lg">{q.icon}</span><span className="text-[15px] font-bold" style={{ color: q.color }}>{q.label}</span></div>
                  <div className="text-[13px] text-[var(--text-muted)] mb-3">{q.desc}</div>
                  <div className="space-y-1.5 mb-3 min-h-[40px]">
                    {items.map((item, idx) => <div key={idx} className="flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: q.color }} /><span className="text-[14px] text-[var(--text-primary)] flex-1">{item}</span><button onClick={() => setStratBizModel(prev => ({ ...prev, [q.key]: prev[q.key].filter((_, i) => i !== idx) }))} className="text-[14px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--risk)] transition-all">×</button></div>)}
                    {items.length === 0 && <div className="text-[14px] text-[var(--text-muted)] italic">No items yet</div>}
                  </div>
                  {isEditing ? <div className="flex gap-2"><input type="text" value={stratBizEditText} onChange={e => setStratBizEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && stratBizEditText.trim()) { setStratBizModel(prev => ({ ...prev, [q.key]: [...(prev[q.key] || []), stratBizEditText.trim()] })); setStratBizEditText(""); } if (e.key === "Escape") { setStratBizEditField(null); setStratBizEditText(""); } }} placeholder="Type and press Enter..." className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none" autoFocus /><button onClick={() => { if (stratBizEditText.trim()) { setStratBizModel(prev => ({ ...prev, [q.key]: [...(prev[q.key] || []), stratBizEditText.trim()] })); setStratBizEditText(""); } setStratBizEditField(null); }} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold" style={{ background: `${q.color}15`, color: q.color }}>Add</button></div> : <button onClick={() => { setStratBizEditField(q.key); setStratBizEditText(""); }} className="w-full px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Item</button>}
                </div>;
              })}
            </div>
          </Card>
          {/* Value chain from function */}
          <Card title="Value Chain — Primary Activities">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">End-to-end value chain showing how {fnD.label} creates and delivers value across lifecycle stages.</div>
            <div className="flex items-stretch gap-0 mb-4 overflow-x-auto">
              {(OM_LIFECYCLES[fn] || ["Plan","Execute","Deliver","Measure","Optimize","Improve"]).map((stage, i, arr) => {
                const ai = getAiTier(stage); const isLast = i === arr.length - 1;
                return <div key={stage} className="flex-1 min-w-[110px] relative">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] border border-[var(--border)] mx-0.5 h-full">
                    <div className="text-[13px] font-bold text-[var(--text-muted)] uppercase">Stage {i+1}</div>
                    <div className="text-[14px] font-bold text-[var(--text-primary)] mb-1">{stage}</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{background:ai.color}} /><span className="text-[12px]" style={{color:ai.color}}>{ai.tier}</span></div>
                  </div>
                  {!isLast && <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 z-10 text-[var(--text-muted)] text-[12px]">→</div>}
                </div>;
              })}
            </div>
            <div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Support Activities</div>
            <div className="flex gap-2 flex-wrap">{[...fnD.shared, ...fnD.enabling.slice(0,3)].map(s => <span key={s} className="px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[13px] text-[var(--text-secondary)]">{s}</span>)}</div>
          </Card>
          <button onClick={() => setOmView("2.1")} className="w-full px-4 py-3 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #0891B2, #0e7490)" }}>Continue to Step 2.1: Capability Model →</button>
        </div>}

        {/* ── Industry Configurator (accessible from setup) ── */}
        {omView === "setup-cfg" && <div className="animate-tab-enter">
          {/* Industry Selector */}
          <Card title="Step 1 — Select Industries">
            <div className="text-[15px] text-[var(--text-secondary)] mb-3">Select all industries that apply to this organization. Universal functions are always included.</div>
            <div className="flex flex-wrap gap-2">
              {((omTaxonomy as Record<string,unknown>)?.available_industries as {id:string;label:string;icon:string;examples:string;function_count:number;unit_count:number}[] || []).map(ind => {
                const selected = omIndustries.includes(ind.id);
                return <button key={ind.id} onClick={() => setOmIndustries(prev => selected ? prev.filter(i => i !== ind.id) : [...prev, ind.id])}
                  className="px-3 py-2 rounded-xl text-[15px] font-semibold transition-all" style={{
                    border: selected ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                    background: selected ? "rgba(212,134,10,0.08)" : "transparent",
                    color: selected ? "var(--accent-primary)" : "var(--text-muted)",
                  }}>
                  <span className="mr-1">{ind.icon}</span> {ind.label}
                  <span className="ml-1 opacity-50">({ind.unit_count})</span>
                </button>;
              })}
            </div>
            {omIndustries.length > 0 && <div className="mt-2 text-[15px] text-[var(--accent-primary)]">{omIndustries.length} industrie(s) selected</div>}
          </Card>

          {/* Search */}
          <Card title="Step 2 — Browse & Select Operating Units">
            <div className="flex gap-3 mb-4">
              <input value={omSearch} onChange={e => setOmSearch(e.target.value)} placeholder="Search operating units..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
              <div className="flex items-center gap-2 text-[15px] text-[var(--text-muted)] font-data">
                {(() => { const t = omTaxonomy as Record<string,unknown>; const s = t?.stats as Record<string,number>; return s ? `${omSelectedUnits.length} selected · ${s.total_units || 0} total` : ""; })()}
              </div>
            </div>

            {/* Search results */}
            {omSearchResults.length > 0 && <div className="mb-4 bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--accent-primary)]/20">
              <div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase mb-2">Search Results</div>
              {omSearchResults.map((r: Record<string,unknown>) => {
                const uid = String(r.id);
                const isSelected = omSelectedUnits.includes(uid);
                return <div key={uid} className="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0">
                  <input type="checkbox" checked={isSelected} onChange={() => setOmSelectedUnits(prev => isSelected ? prev.filter(u => u !== uid) : [...prev, uid])} style={{ accentColor: "#D4860A" }} />
                  <span className="text-[15px] text-[var(--text-primary)] flex-1">{String(r.name)}</span>
                  <span className="text-[14px] px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-[var(--text-muted)]">{String(r.layer)}</span>
                  <span className="text-[14px] text-[var(--text-muted)]">{String(r.function_label)}</span>
                  <span className="text-[14px] font-data text-[var(--accent-primary)]">{(Number(r.score) * 100).toFixed(0)}%</span>
                </div>;
              })}
            </div>}

            {/* Function tree */}
            {(() => {
              const tax = (omTaxonomy as Record<string,unknown>)?.taxonomy as Record<string,unknown>;
              const funcs = (tax?.functions || {}) as Record<string, {label:string;icon:string;source:string;units:{id:string;name:string;layer:string;source:string}[]}>;
              return <div className="space-y-2">
                {Object.entries(funcs).map(([fid, fdata]) => {
                  const expanded = omExpandedFuncs[fid] !== false; // default expanded
                  const selectedCount = fdata.units.filter(u => omSelectedUnits.includes(u.id)).length;
                  const allSelected = selectedCount === fdata.units.length && fdata.units.length > 0;
                  return <div key={fid} className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-[var(--hover)] transition-colors" onClick={() => setOmExpandedFuncs(prev => ({...prev, [fid]: !expanded}))}>
                      <span className="text-[15px]">{fdata.icon}</span>
                      <span className="text-[15px] font-semibold text-[var(--text-primary)] flex-1 font-heading">{fdata.label}</span>
                      <span className="text-[15px] font-data" style={{ color: selectedCount > 0 ? "var(--accent-primary)" : "var(--text-muted)" }}>{selectedCount}/{fdata.units.length}</span>
                      <input type="checkbox" checked={allSelected} onChange={() => {
                        const ids = fdata.units.map(u => u.id);
                        setOmSelectedUnits(prev => allSelected ? prev.filter(u => !ids.includes(u)) : [...new Set([...prev, ...ids])]);
                      }} onClick={e => e.stopPropagation()} style={{ accentColor: "#D4860A" }} />
                      {fdata.source !== "universal" && <span className="text-[15px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">Industry</span>}
                      <span className="text-[var(--text-muted)] text-[15px]" style={{ transform: `rotate(${expanded ? 90 : 0}deg)`, transition: "transform 0.2s" }}>▸</span>
                    </div>
                    {expanded && <div className="px-4 pb-3 space-y-1">
                      {fdata.units.map(u => {
                        const isSelected = omSelectedUnits.includes(u.id);
                        const scope = omScopedUnits[u.id] || "in";
                        const displayName = omRenames[u.id] || u.name;
                        const layerColors: Record<string,string> = { "Governance": "var(--risk)", "Core": "var(--accent-primary)", "Shared Services": "var(--success)", "Enabling": "var(--warning)", "Interface": "var(--purple)" };
                        return <div key={u.id} className="flex items-center gap-2 py-1 group">
                          <input type="checkbox" checked={isSelected} onChange={() => setOmSelectedUnits(prev => isSelected ? prev.filter(x => x !== u.id) : [...prev, u.id])} style={{ accentColor: "#D4860A" }} />
                          <span className={`text-[15px] flex-1 ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{displayName}</span>
                          <span className="text-[15px] px-1.5 py-0.5 rounded font-semibold" style={{ color: layerColors[u.layer] || "var(--text-muted)", background: `${layerColors[u.layer] || "var(--text-muted)"}15` }}>{u.layer}</span>
                          {isSelected && <button onClick={() => setOmScopedUnits(prev => ({...prev, [u.id]: scope === "in" ? "out" : "in"}))} className="text-[15px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: scope === "in" ? "var(--success)" : "var(--text-muted)", border: `1px solid ${scope === "in" ? "var(--success)" : "var(--border)"}` }}>{scope === "in" ? "In Scope" : "Out of Scope"}</button>}
                        </div>;
                      })}
                    </div>}
                  </div>;
                })}
              </div>;
            })()}
          </Card>

          {/* Customization */}
          <Card title="Step 3 — Custom Operating Units">
            <div className="text-[15px] text-[var(--text-secondary)] mb-3">Add operating units not in the taxonomy, or rename existing ones to match your client's terminology.</div>
            {omCustomUnits.length > 0 && <div className="space-y-1 mb-3">
              {omCustomUnits.map((cu, i) => <div key={cu.id} className="flex items-center gap-2 bg-[var(--surface-2)] rounded-lg px-3 py-2">
                <span className="text-[15px] text-[var(--text-primary)] flex-1">{cu.name}</span>
                <span className="text-[15px] text-[var(--text-muted)]">{cu.func}</span>
                <span className="text-[14px] px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">{cu.layer}</span>
                <button onClick={() => setOmCustomUnits(prev => prev.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px]">✕</button>
              </div>)}
            </div>}
            {omAddingCustom ? <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--accent-primary)]/20 space-y-3">
              <input value={omCustomName} onChange={e => setOmCustomName(e.target.value)} placeholder="Operating unit name" className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none" />
              <div className="flex gap-2">
                <input value={omCustomFunc} onChange={e => setOmCustomFunc(e.target.value)} placeholder="Function (e.g. Finance)" className="flex-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none" />
                <select value={omCustomLayer} onChange={e => setOmCustomLayer(e.target.value)} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)]">
                  {["Governance","Core","Shared Services","Enabling","Interface"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (omCustomName.trim()) { setOmCustomUnits(prev => [...prev, {id:`cust_${Date.now()}`,name:omCustomName.trim(),func:omCustomFunc||"Custom",layer:omCustomLayer}]); setOmCustomName(""); setOmCustomFunc(""); setOmAddingCustom(false); }}} className="px-4 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white">Add</button>
                <button onClick={() => setOmAddingCustom(false)} className="px-4 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setOmAddingCustom(true)} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5 transition-all">+ Add Custom Unit</button>}
          </Card>

          {/* Summary */}
          <Card title="Coverage Summary">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <KpiCard label="Functions" value={(() => { const t = (omTaxonomy as Record<string,unknown>)?.taxonomy as Record<string,unknown>; return Object.keys((t?.functions || {}) as object).length; })()} />
              <KpiCard label="Units Selected" value={omSelectedUnits.length} accent />
              <KpiCard label="In Scope" value={Object.values(omScopedUnits).filter(v => v === "in").length || omSelectedUnits.length} />
              <KpiCard label="Custom Units" value={omCustomUnits.length} />
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                await api.saveOMConfig({ model_id: model || "Demo_Model", industries: omIndustries, selected_units: omSelectedUnits, custom_units: omCustomUnits, renames: omRenames, scoped_units: omScopedUnits });
                showToast("Operating model configuration saved");
              }} className="px-4 py-2 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all">💾 Save Configuration</button>
              <button onClick={() => { setOmSelectedUnits([]); setOmCustomUnits([]); setOmRenames({}); setOmScopedUnits({}); setOmIndustries([]); showToast("Configuration reset"); }} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--risk)]">Reset</button>
            </div>
          </Card>
        </div>}

        {omView === "3.1" && <Card title={`${fnD.label} — ${archD.label} Architecture`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[15px] text-[var(--text-secondary)]">{archD.desc} · {opModel.replace("_"," ")} · {gov} governance</div>
            <button onClick={async () => {
              setAiOmLoading(true);
              try {
                const raw = await callAI("Return ONLY valid JSON.", `Generate a detailed operating model blueprint for a ${fnD.label} function using a ${archD.label} archetype. Return JSON: {"governance":["3-4 governance bodies"],"core":["10-15 core capabilities specific to ${fnD.label}"],"shared":["3-5 shared services"],"enabling":["3-4 enabling platforms/tools"],"interface":["3-4 interface touchpoints"]}. Be specific to ${fnD.label} — not generic.`);
                const parsed = JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim());
                if (parsed.core) setAiBlueprint(parsed);
              } catch {} setAiOmLoading(false);
            }} disabled={aiOmLoading} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>{aiOmLoading ? "..." : "☕ AI Custom Blueprint"}</button>
          </div>

          {aiBlueprint && <div className="bg-[rgba(224,144,64,0.06)] border border-[rgba(224,144,64,0.15)] rounded-lg px-3 py-2 mb-3 flex items-center justify-between"><span className="text-[15px]" style={{ color: "#f0a050" }}>☕ Showing AI-generated blueprint</span><button onClick={() => setAiBlueprint(null)} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Reset to default</button></div>}
          <div className="space-y-2">
            {[{label:"Governance",items:aiBlueprint?.governance || govLayer,color:"var(--risk)"},{label:"Core Components",items:aiBlueprint?.core || coreLayer,color:"var(--accent-primary)",grid:true},{label:"Shared Services",items:aiBlueprint?.shared || sharedLayer,color:"var(--success)"},{label:"Enabling",items:aiBlueprint?.enabling || enableLayer,color:"var(--purple)"},{label:"Interface",items:aiBlueprint?.interface || interfaceLayer,color:"var(--warning)"}].map(layer => <div key={layer.label} className="rounded-xl p-3 border-l-4" style={{ background: `${layer.color}06`, borderColor: layer.color }}>
              <div className="flex items-center justify-between mb-2"><div className="text-[14px] font-bold uppercase tracking-wider" style={{ color: layer.color }}>{layer.label}</div><div className="text-[14px]" style={{ color: `${layer.color}80` }}>{layer.items.length} capabilities</div></div>
              <div className={layer.grid ? `grid gap-2 ${layer.items.length <= 4 ? "grid-cols-4" : layer.items.length <= 6 ? "grid-cols-3" : layer.items.length <= 9 ? "grid-cols-3 lg:grid-cols-4" : "grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}` : "flex gap-2 flex-wrap"}>{layer.items.map(t => { const ai = getAiTier(t); return <div key={t} className={`rounded-lg p-2.5 border ${layer.grid ? "" : "px-3 py-2"}`} style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}><div className="text-[15px] font-semibold text-[var(--text-primary)]">{t.replace(archD.coreSuffix, "")}</div>{archD.coreSuffix && layer.grid && <div className="text-[15px] italic mt-0.5" style={{ color: `${layer.color}80` }}>{archD.coreSuffix.replace(" — ", "").replace(" as a ", "").trim()}</div>}{layer.grid && <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: ai.color }} /><span className="text-[15px]" style={{ color: ai.color }}>{ai.tier}</span></div>}</div>; })}</div>
            </div>)}
          </div>
        </Card>}

        {omView === "2.1" && <Card title="Capability Maturity Assessment">
          {(() => { const scores = Object.values(maturityScores).filter(v => v > 0); const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1) : "—"; const tScores = Object.values(targetScores).filter(v => v > 0); const tAvg = tScores.length ? (tScores.reduce((a,b) => a+b, 0) / tScores.length).toFixed(1) : "—"; return <div className="flex gap-4 mb-4">{[{label:"Current Avg",val:avg,color:"var(--accent-primary)"},{label:"Target Avg",val:tAvg,color:"var(--success)"},{label:"Capabilities Rated",val:`${scores.length}/${allCaps.length}`,color:"var(--text-secondary)"},{label:"Gap",val:scores.length && tScores.length ? (Number(tAvg)-Number(avg)).toFixed(1) : "—",color:"var(--warning)"}].map(k => <div key={k.label} className="flex-1 rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold" style={{color:k.color}}>{k.val}</div><div className="text-[14px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}</div>; })()}
          <div className="text-[15px] text-[var(--text-secondary)] mb-3">Rate current state (left) and target state (right) for each capability.</div>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Capability</th><th className="px-2 py-2 text-center text-[15px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Layer</th>{[1,2,3,4,5].map(n => <th key={n} className="px-2 py-2 text-center text-[15px] border-b border-[var(--border)] text-[var(--text-muted)]">{n}</th>)}<th className="px-1 py-2 text-center text-[14px] border-b border-[var(--border)] text-[var(--text-muted)]">|</th>{[1,2,3,4,5].map(n => <th key={`t${n}`} className="px-2 py-2 text-center text-[15px] border-b border-[var(--border)] text-[var(--success)]">{n}</th>)}<th className="px-2 py-2 text-center text-[15px] border-b border-[var(--border)] text-[var(--text-muted)]">AI</th></tr></thead>
          <tbody>{allCaps.map(cap => { const sc = maturityScores[cap.name]||0; const ai = getAiTier(cap.name); return <tr key={cap.name} className="border-b border-[var(--border)]"><td className="px-3 py-1.5 text-[15px] font-semibold">{cap.name}</td><td className="px-2 py-1.5 text-center"><span className="text-[14px] px-1.5 py-0.5 rounded-full" style={{ background: `${layerColors[cap.layer]}12`, color: layerColors[cap.layer] }}>{cap.layer}</span></td>{[1,2,3,4,5].map(n => <td key={n} className="px-2 py-1.5 text-center"><button onClick={() => setMaturityScores(p => ({...p,[cap.name]: p[cap.name] === n ? 0 : n}))} className="w-6 h-6 rounded text-[15px] font-bold" style={{ background: sc>=n ? `${n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)"}20` : "var(--surface-2)", color: sc>=n ? (n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)") : "var(--text-muted)" }}>{n}</button></td>)}<td className="px-1 py-1.5 text-center text-[var(--border)]">│</td>{[1,2,3,4,5].map(n => <td key={`t${n}`} className="px-2 py-1.5 text-center"><button onClick={() => setTargetScores(p => ({...p,[cap.name]: p[cap.name] === n ? 0 : n}))} className="w-6 h-6 rounded text-[15px] font-bold" style={{ background: (targetScores[cap.name]||0)>=n ? `${n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)"}20` : "var(--surface-2)", color: (targetScores[cap.name]||0)>=n ? (n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)") : "var(--text-muted)" }}>{n}</button></td>)}<td className="px-2 py-1.5 text-center"><span className="text-[14px]" style={{ color: ai.color }}>{ai.tier}</span></td></tr>; })}</tbody></table></div>
          <div className="flex gap-3 mt-2 text-[14px] text-[var(--text-muted)]">{["1=Ad Hoc","2=Emerging","3=Defined","4=Managed","5=Optimized"].map(l => <span key={l}>{l}</span>)}</div>
        </Card>}

        {/* ── Step 2.2: Service Delivery Model ── */}
        {omView === "2.2" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "matrix" as const, label: "Delivery Matrix", icon: "📊" },
              { id: "shared" as const, label: "Shared Services", icon: "🏢" },
              { id: "coe" as const, label: "COE Designer", icon: "🎓" },
              { id: "outsource" as const, label: "Outsource Scoring", icon: "📋" },
              { id: "location" as const, label: "Location Strategy", icon: "🌍" },
            ]).map(v => <button key={v.id} onClick={() => setSvcView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: svcView === v.id ? "rgba(212,134,10,0.12)" : "transparent",
              color: svcView === v.id ? "#e09040" : "var(--text-muted)",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. DELIVERY MODEL MATRIX ─── */}
          {svcView === "matrix" && <Card title="Delivery Model Matrix — Current vs. Target State">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">For each function/capability, set the current and target delivery model. Shifts are color-coded.</div>
            {/* Filter & summary */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[var(--text-muted)]">Function:</span>
                <select value={svcFuncFilter} onChange={e => setSvcFuncFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[14px] text-[var(--text-primary)] outline-none">
                  <option value="All">All Functions</option>
                  {Array.from(new Set(SVC_FUNCTIONS_DEFAULT.map(f => f.func))).sort().map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {(() => {
                const shifts = SVC_FUNCTIONS_DEFAULT.filter(f => { const m = svcDeliveryMap[f.id]; return m && m.current && m.target && m.current !== m.target; });
                const major = shifts.filter(f => { const m = svcDeliveryMap[f.id]; return (m.current === "In-House" && (m.target === "Outsourced/BPO")) || (m.current === "Outsourced/BPO" && m.target === "In-House"); });
                return <div className="flex gap-3 text-[14px]">
                  <span className="text-[var(--text-muted)]">{shifts.length} shift{shifts.length !== 1 ? "s" : ""}</span>
                  {major.length > 0 && <span className="text-[var(--risk)]">{major.length} major</span>}
                </div>;
              })()}
            </div>
            {/* KPI row */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {SVC_MODELS.map(m => {
                const currentCount = SVC_FUNCTIONS_DEFAULT.filter(f => (svcDeliveryMap[f.id]?.current || "In-House") === m).length;
                const targetCount = SVC_FUNCTIONS_DEFAULT.filter(f => (svcDeliveryMap[f.id]?.target || svcDeliveryMap[f.id]?.current || "In-House") === m).length;
                const delta = targetCount - currentCount;
                return <div key={m} className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center">
                  <div className="text-[13px] font-bold" style={{ color: SVC_MODEL_COLORS[m] }}>{m}</div>
                  <div className="text-[16px] font-extrabold text-[var(--text-primary)]">{currentCount} → {targetCount}</div>
                  {delta !== 0 && <div className="text-[13px] font-semibold" style={{ color: delta > 0 ? "var(--success)" : "var(--warning)" }}>{delta > 0 ? "+" : ""}{delta}</div>}
                </div>;
              })}
            </div>
            {/* Matrix table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[180px]">Capability</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Function</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[140px]">Current</th>
              <th className="px-1 py-2 text-center text-[13px] text-[var(--text-muted)] border-b border-[var(--border)]">→</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[140px]">Target</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Shift</th>
              <th className="px-2 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[200px]">Rationale</th>
            </tr></thead><tbody>
              {SVC_FUNCTIONS_DEFAULT.filter(f => svcFuncFilter === "All" || f.func === svcFuncFilter).map(f => {
                const entry = svcDeliveryMap[f.id] || { current: "In-House" as SvcModel, target: "In-House" as SvcModel, rationale: "" };
                const current = entry.current || "In-House";
                const target = entry.target || current;
                const noChange = current === target;
                const majorShift = (current === "In-House" && target === "Outsourced/BPO") || (current === "Outsourced/BPO" && target === "In-House");
                const shiftColor = noChange ? "var(--success)" : majorShift ? "var(--risk)" : "var(--warning)";
                const shiftLabel = noChange ? "No Change" : majorShift ? "Major" : "Shift";
                const setField = (field: "current" | "target", val: SvcModel) => setSvcDeliveryMap(prev => ({ ...prev, [f.id]: { ...entry, current: field === "current" ? val : (prev[f.id]?.current || "In-House"), target: field === "target" ? val : (prev[f.id]?.target || prev[f.id]?.current || "In-House"), rationale: prev[f.id]?.rationale || "" } }));
                return <tr key={f.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{f.label}</td>
                  <td className="px-2 py-2 text-center text-[13px] text-[var(--text-muted)]">{f.func}</td>
                  <td className="px-2 py-2 text-center">
                    <select value={current} onChange={e => setField("current", e.target.value as SvcModel)} className="bg-[var(--bg)] border rounded-lg px-2 py-1 text-[13px] font-semibold outline-none" style={{ borderColor: `${SVC_MODEL_COLORS[current]}40`, color: SVC_MODEL_COLORS[current] }}>
                      {SVC_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-2 text-center text-[var(--text-muted)]">→</td>
                  <td className="px-2 py-2 text-center">
                    <select value={target} onChange={e => setField("target", e.target.value as SvcModel)} className="bg-[var(--bg)] border rounded-lg px-2 py-1 text-[13px] font-semibold outline-none" style={{ borderColor: `${SVC_MODEL_COLORS[target]}40`, color: SVC_MODEL_COLORS[target] }}>
                      {SVC_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-center"><span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${shiftColor}12`, color: shiftColor }}>{shiftLabel}</span></td>
                  <td className="px-2 py-2">
                    {svcEditingRationale === f.id ? <input value={entry.rationale} onChange={e => setSvcDeliveryMap(prev => ({...prev, [f.id]: {...(prev[f.id] || {current: "In-House" as SvcModel, target: "In-House" as SvcModel, rationale: ""}), rationale: e.target.value}}))} onBlur={() => setSvcEditingRationale(null)} onKeyDown={e => { if (e.key === "Enter") setSvcEditingRationale(null); }} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[13px] outline-none" autoFocus placeholder="Why this change..." /> : <button onClick={() => setSvcEditingRationale(f.id)} className="text-[13px] text-left w-full truncate" style={{ color: entry.rationale ? "var(--text-secondary)" : "var(--text-muted)" }}>{entry.rationale || "Click to add rationale..."}</button>}
                  </td>
                </tr>;
              })}
            </tbody></table></div>
            <div className="flex gap-3 mt-2 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--success)]" />No Change</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--warning)]" />Model Shift</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--risk)]" />Major Change</span>
            </div>
          </Card>}

          {/* ─── 2. SHARED SERVICES DESIGNER ─── */}
          {svcView === "shared" && <Card title="Shared Services Designer">
            {(() => {
              const sharedFuncs = SVC_FUNCTIONS_DEFAULT.filter(f => {
                const m = svcDeliveryMap[f.id]; return m && (m.current === "Shared Services" || m.target === "Shared Services");
              });
              if (sharedFuncs.length === 0) return <div className="text-center py-10">
                <div className="text-[40px] mb-3">🏢</div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No Shared Services Defined</div>
                <div className="text-[14px] text-[var(--text-muted)] mb-4">Set capabilities to &quot;Shared Services&quot; in the Delivery Matrix to configure them here.</div>
                <button onClick={() => setSvcView("matrix")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Delivery Matrix</button>
              </div>;
              return <div className="space-y-4">
                <div className="text-[15px] text-[var(--text-secondary)] mb-2">Define SLAs, staffing, technology, and cost models for each shared service.</div>
                {sharedFuncs.map(f => {
                  const def = svcSharedDefs[f.id] || { services: "", slaResponse: "", slaQuality: "", costPerTx: "", location: "Onshore", staffing: "Pooled", technology: "", costModel: "" };
                  const update = (field: string, val: string) => setSvcSharedDefs(prev => ({ ...prev, [f.id]: { ...def, [field]: val } }));
                  return <div key={f.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{f.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: `${SVC_MODEL_COLORS["Shared Services"]}15`, color: SVC_MODEL_COLORS["Shared Services"] }}>Shared Services</span>
                      <span className="text-[13px] text-[var(--text-muted)]">{f.func}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Services Included</label><input value={def.services} onChange={e => update("services", e.target.value)} placeholder="e.g. Invoice processing, vendor payments..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Location</label><select value={def.location} onChange={e => update("location", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Onshore</option><option>Nearshore</option><option>Offshore</option><option>Multi-site</option></select></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">SLA: Response Time</label><input value={def.slaResponse} onChange={e => update("slaResponse", e.target.value)} placeholder="e.g. 24 hours, 4 hours SLA..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">SLA: Quality Metric</label><input value={def.slaQuality} onChange={e => update("slaQuality", e.target.value)} placeholder="e.g. 99.5% accuracy, <2% error rate..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Staffing Model</label><select value={def.staffing} onChange={e => update("staffing", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Dedicated</option><option>Pooled</option><option>Blended</option></select></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Cost per Transaction</label><input value={def.costPerTx} onChange={e => update("costPerTx", e.target.value)} placeholder="e.g. $3.50/invoice, $12/ticket..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Supporting Technology</label><input value={def.technology} onChange={e => update("technology", e.target.value)} placeholder="e.g. SAP, ServiceNow, Workday..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Cost Model</label><input value={def.costModel} onChange={e => update("costModel", e.target.value)} placeholder="e.g. per-employee, per-transaction..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    </div>
                  </div>;
                })}
              </div>;
            })()}
          </Card>}

          {/* ─── 3. COE DESIGNER ─── */}
          {svcView === "coe" && <Card title="Center of Excellence (COE) Designer">
            {(() => {
              const coeFuncs = SVC_FUNCTIONS_DEFAULT.filter(f => {
                const m = svcDeliveryMap[f.id]; return m && (m.current === "COE" || m.target === "COE");
              });
              if (coeFuncs.length === 0) return <div className="text-center py-10">
                <div className="text-[40px] mb-3">🎓</div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No COEs Defined</div>
                <div className="text-[14px] text-[var(--text-muted)] mb-4">Set capabilities to &quot;COE&quot; in the Delivery Matrix to design them here.</div>
                <button onClick={() => setSvcView("matrix")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Delivery Matrix</button>
              </div>;
              return <div className="space-y-4">
                <div className="text-[15px] text-[var(--text-secondary)] mb-2">Define the expertise, mandate, and success metrics for each Center of Excellence.</div>
                {coeFuncs.map(f => {
                  const def = svcCoeDefs[f.id] || { expertise: "", mandate: "Advisory + Execution", placement: "Centralized", km: "", metrics: "" };
                  const update = (field: string, val: string) => setSvcCoeDefs(prev => ({ ...prev, [f.id]: { ...def, [field]: val } }));
                  return <div key={f.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{f.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: `${SVC_MODEL_COLORS["COE"]}15`, color: SVC_MODEL_COLORS["COE"] }}>COE</span>
                      <span className="text-[13px] text-[var(--text-muted)]">{f.func}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Expertise Provided</label><input value={def.expertise} onChange={e => update("expertise", e.target.value)} placeholder="e.g. Advanced analytics, ML model development, data governance..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Mandate</label><select value={def.mandate} onChange={e => update("mandate", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Advisory Only</option><option>Advisory + Execution</option><option>Execution Only</option></select></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Placement</label><select value={def.placement} onChange={e => update("placement", e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Centralized</option><option>Embedded in Business</option><option>Hub & Spoke</option></select></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Knowledge Management</label><input value={def.km} onChange={e => update("km", e.target.value)} placeholder="e.g. Playbooks, training, internal wiki..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Success Metrics</label><input value={def.metrics} onChange={e => update("metrics", e.target.value)} placeholder="e.g. # projects delivered, adoption rate, NPS..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    </div>
                  </div>;
                })}
              </div>;
            })()}
          </Card>}

          {/* ─── 4. OUTSOURCING DECISION MATRIX ─── */}
          {svcView === "outsource" && <Card title="Outsourcing Decision Matrix">
            {(() => {
              const outsourceFuncs = SVC_FUNCTIONS_DEFAULT.filter(f => {
                const m = svcDeliveryMap[f.id]; return m && (m.target === "Outsourced/BPO" || m.current === "Outsourced/BPO");
              });
              const scoredFuncs = outsourceFuncs.filter(f => svcOutsourceScores[f.id]);
              if (outsourceFuncs.length === 0) return <div className="text-center py-10">
                <div className="text-[40px] mb-3">📋</div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No Outsourcing Candidates</div>
                <div className="text-[14px] text-[var(--text-muted)] mb-4">Set capabilities to &quot;Outsourced/BPO&quot; in the Delivery Matrix to evaluate them here.</div>
                <button onClick={() => setSvcView("matrix")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Delivery Matrix</button>
              </div>;
              return <div className="space-y-5">
                <div className="text-[15px] text-[var(--text-secondary)] mb-2">Score each outsourcing candidate on 4 dimensions (1-5). The 2x2 matrix below shows recommendations.</div>
                {/* Scoring table */}
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                  <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Capability</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Strategic Importance</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Vendor Availability</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Cost Savings</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Risk Level</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Recommendation</th>
                </tr></thead><tbody>
                  {outsourceFuncs.map(f => {
                    const scores = svcOutsourceScores[f.id] || { strategic: 3, availability: 3, costSavings: 3, risk: 3 };
                    const setScore = (field: keyof SvcOutscoreCard, val: number) => setSvcOutsourceScores(prev => ({ ...prev, [f.id]: { ...scores, [field]: scores[field] === val ? 0 : val } }));
                    const rec = scores.strategic <= 2 && scores.costSavings >= 4 ? "Outsource" : scores.strategic >= 4 ? "Keep In-House" : "Evaluate";
                    const recColor = rec === "Outsource" ? "var(--success)" : rec === "Keep In-House" ? "var(--purple)" : "var(--warning)";
                    return <tr key={f.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{f.label}<div className="text-[12px] text-[var(--text-muted)]">{f.func}</div></td>
                      {(["strategic", "availability", "costSavings", "risk"] as const).map(dim => <td key={dim} className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {[1,2,3,4,5].map(n => <button key={n} onClick={() => setScore(dim, n)} className="w-6 h-6 rounded text-[13px] font-bold transition-all" style={{
                            background: scores[dim] >= n ? `${n <= 2 ? "var(--success)" : n <= 3 ? "var(--warning)" : "var(--risk)"}20` : "var(--surface-2)",
                            color: scores[dim] >= n ? (n <= 2 ? "var(--success)" : n <= 3 ? "var(--warning)" : "var(--risk)") : "var(--text-muted)",
                          }}>{n}</button>)}
                        </div>
                      </td>)}
                      <td className="px-2 py-2 text-center"><span className="px-2 py-0.5 rounded-full text-[13px] font-bold" style={{ background: `${recColor}12`, color: recColor }}>{rec}</span></td>
                    </tr>;
                  })}
                </tbody></table></div>
                {/* 2x2 quadrant */}
                {scoredFuncs.length > 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-3">Strategic Importance vs. Cost Savings — Outsource Decision Map</div>
                  <div className="grid grid-cols-2 gap-0 border border-[var(--border)] rounded-lg overflow-hidden" style={{ minHeight: 200 }}>
                    {/* Quadrants: [High Strat / High Cost] [High Strat / Low Cost] [Low Strat / High Cost] [Low Strat / Low Cost] */}
                    {[
                      { label: "Keep In-House", desc: "High strategic value, high savings potential — build internal capability", color: "var(--purple)", bg: "rgba(139,92,246,0.04)", filter: (s: SvcOutscoreCard) => s.strategic >= 4 && s.costSavings >= 4 },
                      { label: "Invest & Protect", desc: "High strategic value, low savings — core competency, invest more", color: "var(--accent-primary)", bg: "rgba(212,134,10,0.04)", filter: (s: SvcOutscoreCard) => s.strategic >= 4 && s.costSavings < 4 },
                      { label: "Outsource", desc: "Low strategic value, high savings — clear outsource candidate", color: "var(--success)", bg: "rgba(16,185,129,0.04)", filter: (s: SvcOutscoreCard) => s.strategic < 4 && s.costSavings >= 4 },
                      { label: "Evaluate Carefully", desc: "Low strategic value, low savings — limited benefit either way", color: "var(--warning)", bg: "rgba(245,158,11,0.04)", filter: (s: SvcOutscoreCard) => s.strategic < 4 && s.costSavings < 4 },
                    ].map((q, qi) => <div key={qi} className="p-3 border-r border-b border-[var(--border)] last:border-r-0" style={{ background: q.bg }}>
                      <div className="text-[14px] font-bold mb-0.5" style={{ color: q.color }}>{q.label}</div>
                      <div className="text-[12px] text-[var(--text-muted)] mb-2">{q.desc}</div>
                      <div className="flex flex-wrap gap-1">
                        {outsourceFuncs.filter(f => { const s = svcOutsourceScores[f.id]; return s && q.filter(s); }).map(f => <span key={f.id} className="px-2 py-0.5 rounded text-[12px] font-semibold" style={{ background: `${q.color}15`, color: q.color }}>{f.label}</span>)}
                      </div>
                    </div>)}
                  </div>
                  <div className="flex justify-between mt-2 text-[12px] text-[var(--text-muted)]">
                    <span>← High Cost Savings</span><span>Low Cost Savings →</span>
                  </div>
                  <div className="flex justify-center mt-0.5 text-[12px] text-[var(--text-muted)]">↑ High Strategic Importance | Low Strategic Importance ↓</div>
                </div>}
              </div>;
            })()}
          </Card>}

          {/* ─── 5. LOCATION STRATEGY ─── */}
          {svcView === "location" && <Card title="Location Strategy">
            {(() => {
              const locationFuncs = SVC_FUNCTIONS_DEFAULT.filter(f => {
                const m = svcDeliveryMap[f.id];
                return m && (m.target === "Shared Services" || m.target === "Outsourced/BPO" || m.current === "Shared Services" || m.current === "Outsourced/BPO");
              });
              if (locationFuncs.length === 0) return <div className="text-center py-10">
                <div className="text-[40px] mb-3">🌍</div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No Location Decisions Needed</div>
                <div className="text-[14px] text-[var(--text-muted)] mb-4">Location strategy applies to Shared Services and Outsourced capabilities. Set some in the Delivery Matrix first.</div>
                <button onClick={() => setSvcView("matrix")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Delivery Matrix</button>
              </div>;
              const LOCATION_PRESETS = [
                { name: "US (Onshore)", costIndex: "100", talent: "High", timezone: "US/Americas", language: "English", risk: "Low" },
                { name: "India", costIndex: "25-35", talent: "Very High", timezone: "IST (UTC+5:30)", language: "English", risk: "Low-Medium" },
                { name: "Poland", costIndex: "40-50", talent: "High", timezone: "CET (UTC+1)", language: "English/Polish", risk: "Low" },
                { name: "Philippines", costIndex: "20-30", talent: "High", timezone: "PHT (UTC+8)", language: "English", risk: "Medium" },
                { name: "Mexico (Nearshore)", costIndex: "35-45", talent: "Medium-High", timezone: "CST (UTC-6)", language: "Spanish/English", risk: "Low-Medium" },
                { name: "UK", costIndex: "85-95", talent: "High", timezone: "GMT (UTC+0)", language: "English", risk: "Low" },
                { name: "Singapore", costIndex: "70-80", talent: "High", timezone: "SGT (UTC+8)", language: "English", risk: "Low" },
                { name: "Costa Rica", costIndex: "30-40", talent: "Medium", timezone: "CST (UTC-6)", language: "Spanish/English", risk: "Low" },
              ];
              return <div className="space-y-5">
                <div className="text-[15px] text-[var(--text-secondary)] mb-2">Assign delivery locations and compare options for each shared service or outsourced capability.</div>
                {/* Location reference cards */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {LOCATION_PRESETS.map(loc => <div key={loc.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="text-[14px] font-bold text-[var(--text-primary)] mb-1">{loc.name}</div>
                    <div className="space-y-0.5 text-[12px]">
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Cost Index</span><span className="font-semibold" style={{ color: parseInt(loc.costIndex) <= 35 ? "var(--success)" : parseInt(loc.costIndex) <= 60 ? "var(--warning)" : "var(--text-primary)" }}>{loc.costIndex}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Talent</span><span className="font-semibold text-[var(--text-secondary)]">{loc.talent}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Timezone</span><span className="text-[var(--text-secondary)]">{loc.timezone}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Language</span><span className="text-[var(--text-secondary)]">{loc.language}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Risk</span><span className="font-semibold" style={{ color: loc.risk === "Low" ? "var(--success)" : loc.risk.includes("Medium") ? "var(--warning)" : "var(--risk)" }}>{loc.risk}</span></div>
                    </div>
                  </div>)}
                </div>
                {/* Location assignments */}
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                  <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Capability</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Model</th>
                  <th className="px-2 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Location</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Cost Index</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Talent</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Timezone</th>
                  <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Risk</th>
                </tr></thead><tbody>
                  {locationFuncs.map(f => {
                    const target = svcDeliveryMap[f.id]?.target || svcDeliveryMap[f.id]?.current || "Shared Services";
                    const loc = svcLocations[f.id] || { location: "", costIndex: "", talent: "", timezone: "", language: "", risk: "" };
                    const update = (field: string, val: string) => setSvcLocations(prev => ({ ...prev, [f.id]: { ...loc, [field]: val } }));
                    // Auto-fill from preset
                    const applyPreset = (preset: typeof LOCATION_PRESETS[0]) => {
                      setSvcLocations(prev => ({ ...prev, [f.id]: { location: preset.name, costIndex: preset.costIndex, talent: preset.talent, timezone: preset.timezone, language: preset.language, risk: preset.risk } }));
                    };
                    return <tr key={f.id} className="border-b border-[var(--border)]">
                      <td className="px-3 py-2"><div className="text-[14px] font-semibold text-[var(--text-primary)]">{f.label}</div><div className="text-[12px] text-[var(--text-muted)]">{f.func}</div></td>
                      <td className="px-2 py-2 text-center"><span className="px-2 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: `${SVC_MODEL_COLORS[target] || "#888"}15`, color: SVC_MODEL_COLORS[target] || "#888" }}>{target}</span></td>
                      <td className="px-2 py-2"><select value={loc.location} onChange={e => { const preset = LOCATION_PRESETS.find(p => p.name === e.target.value); if (preset) applyPreset(preset); else update("location", e.target.value); }} className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[13px] text-[var(--text-primary)] outline-none w-full">
                        <option value="">Select...</option>
                        {LOCATION_PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select></td>
                      <td className="px-2 py-2 text-center text-[14px] font-semibold" style={{ color: parseInt(loc.costIndex) <= 35 ? "var(--success)" : parseInt(loc.costIndex) <= 60 ? "var(--warning)" : "var(--text-primary)" }}>{loc.costIndex || "—"}</td>
                      <td className="px-2 py-2 text-center text-[13px] text-[var(--text-secondary)]">{loc.talent || "—"}</td>
                      <td className="px-2 py-2 text-center text-[13px] text-[var(--text-secondary)]">{loc.timezone || "—"}</td>
                      <td className="px-2 py-2 text-center"><span className="text-[13px] font-semibold" style={{ color: loc.risk === "Low" ? "var(--success)" : loc.risk.includes("Medium") ? "var(--warning)" : loc.risk ? "var(--risk)" : "var(--text-muted)" }}>{loc.risk || "—"}</span></td>
                    </tr>;
                  })}
                </tbody></table></div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── Step 2.5: Governance & Decision Rights ── */}
        {omView === "2.5" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "catalogue" as const, label: "Decision Catalogue", icon: "📋" },
              { id: "rapid" as const, label: "RAPID Modeler", icon: "⚡" },
              { id: "forums" as const, label: "Forum Designer", icon: "🏛" },
              { id: "bottlenecks" as const, label: "Bottleneck Analyzer", icon: "🔍" },
            ]).map(v => <button key={v.id} onClick={() => setGovView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: govView === v.id ? "rgba(212,134,10,0.12)" : "transparent",
              color: govView === v.id ? "#e09040" : "var(--text-muted)",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. DECISION CATALOGUE ─── */}
          {govView === "catalogue" && <Card title="Decision Catalogue">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Inventory of key organizational decisions. Click any cell to edit inline.</div>
            {/* Filters */}
            <div className="flex gap-2 flex-wrap mb-4">
              {[
                { label: "Category", val: govCatFilter, set: setGovCatFilter, opts: ["All", "Strategic", "Tactical", "Operational"] },
                { label: "Function", val: govFuncFilter, set: setGovFuncFilter, opts: ["All", ...Array.from(new Set(govDecisions.map(d => d.func))).sort()] },
                { label: "Speed", val: govSpeedFilter, set: setGovSpeedFilter, opts: ["All", "Fast", "Medium", "Slow"] },
                { label: "Clarity", val: govClarityFilter, set: setGovClarityFilter, opts: ["All", "Clear", "Ambiguous", "Undefined"] },
              ].map(f => <div key={f.label} className="flex items-center gap-1">
                <span className="text-[13px] text-[var(--text-muted)]">{f.label}:</span>
                <select value={f.val} onChange={e => f.set(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[14px] text-[var(--text-primary)] outline-none">
                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>)}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[14px] text-[var(--text-muted)]">{govDecisions.filter(d => (govCatFilter === "All" || d.category === govCatFilter) && (govFuncFilter === "All" || d.func === govFuncFilter) && (govSpeedFilter === "All" || d.speed === govSpeedFilter) && (govClarityFilter === "All" || d.clarity === govClarityFilter)).length} decisions</span>
                <button onClick={() => setGovAddingDecision(true)} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>+ Add Decision</button>
              </div>
            </div>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total Decisions", val: govDecisions.length, color: "var(--text-primary)" },
                { label: "Undefined Clarity", val: govDecisions.filter(d => d.clarity === "Undefined").length, color: "var(--risk)" },
                { label: "Slow Decisions", val: govDecisions.filter(d => d.speed === "Slow").length, color: "var(--warning)" },
                { label: "Strategic", val: govDecisions.filter(d => d.category === "Strategic").length, color: "var(--purple)" },
              ].map(k => <div key={k.label} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}
            </div>
            {/* Add form */}
            {govAddingDecision && <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 mb-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add New Decision</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={govNewDec.name} onChange={e => setGovNewDec(p => ({...p, name: e.target.value}))} placeholder="Decision name..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <select value={govNewDec.category} onChange={e => setGovNewDec(p => ({...p, category: e.target.value as GovDecision["category"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none"><option value="Strategic">Strategic</option><option value="Tactical">Tactical</option><option value="Operational">Operational</option></select>
                <input value={govNewDec.owner} onChange={e => setGovNewDec(p => ({...p, owner: e.target.value}))} placeholder="Owner role/title..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <select value={govNewDec.speed} onChange={e => setGovNewDec(p => ({...p, speed: e.target.value as GovDecision["speed"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none"><option value="Fast">Fast (&lt;1 week)</option><option value="Medium">Medium (1-4 weeks)</option><option value="Slow">Slow (&gt;4 weeks)</option></select>
                <select value={govNewDec.clarity} onChange={e => setGovNewDec(p => ({...p, clarity: e.target.value as GovDecision["clarity"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none"><option value="Clear">Clear</option><option value="Ambiguous">Ambiguous</option><option value="Undefined">Undefined</option></select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (!govNewDec.name.trim()) return; setGovDecisions(prev => [...prev, { ...govNewDec, id: `d${Date.now()}`, func: govNewDec.func, forumId: "" }]); setGovNewDec({ name: "", category: "Tactical", owner: "", speed: "Medium", clarity: "Ambiguous", func: "Operations" }); setGovAddingDecision(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Add</button>
                <button onClick={() => setGovAddingDecision(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div>}
            {/* Decision table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Decision</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Category</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Function</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Owner</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Speed</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Clarity</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Forum</th>
              <th className="px-1 py-2 border-b border-[var(--border)]"></th>
            </tr></thead><tbody>
              {govDecisions.filter(d => (govCatFilter === "All" || d.category === govCatFilter) && (govFuncFilter === "All" || d.func === govFuncFilter) && (govSpeedFilter === "All" || d.speed === govSpeedFilter) && (govClarityFilter === "All" || d.clarity === govClarityFilter)).map(d => {
                const catColors: Record<string, string> = { Strategic: "var(--purple)", Tactical: "var(--accent-primary)", Operational: "var(--success)" };
                const speedColors: Record<string, string> = { Fast: "var(--success)", Medium: "var(--warning)", Slow: "var(--risk)" };
                const clarityColors: Record<string, string> = { Clear: "var(--success)", Ambiguous: "var(--warning)", Undefined: "var(--risk)" };
                const forum = govForums.find(f => f.id === d.forumId);
                const isEditing = govEditingDecId === d.id;
                return <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{isEditing ? <input value={d.name} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, name: e.target.value} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[14px] w-full outline-none" /> : d.name}</td>
                  <td className="px-2 py-2 text-center">{isEditing ? <select value={d.category} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, category: e.target.value as GovDecision["category"]} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] outline-none"><option>Strategic</option><option>Tactical</option><option>Operational</option></select> : <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold" style={{ background: `${catColors[d.category]}12`, color: catColors[d.category] }}>{d.category}</span>}</td>
                  <td className="px-2 py-2 text-center text-[14px] text-[var(--text-secondary)]">{isEditing ? <input value={d.func} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, func: e.target.value} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] w-20 outline-none" /> : d.func}</td>
                  <td className="px-2 py-2 text-center text-[14px] text-[var(--text-secondary)]">{isEditing ? <input value={d.owner} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, owner: e.target.value} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] w-24 outline-none" /> : d.owner}</td>
                  <td className="px-2 py-2 text-center">{isEditing ? <select value={d.speed} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, speed: e.target.value as GovDecision["speed"]} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] outline-none"><option>Fast</option><option>Medium</option><option>Slow</option></select> : <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold" style={{ background: `${speedColors[d.speed]}12`, color: speedColors[d.speed] }}>{d.speed}</span>}</td>
                  <td className="px-2 py-2 text-center">{isEditing ? <select value={d.clarity} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, clarity: e.target.value as GovDecision["clarity"]} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] outline-none"><option>Clear</option><option>Ambiguous</option><option>Undefined</option></select> : <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold" style={{ background: `${clarityColors[d.clarity]}12`, color: clarityColors[d.clarity] }}>{d.clarity}</span>}</td>
                  <td className="px-2 py-2 text-center">{isEditing ? <select value={d.forumId} onChange={e => setGovDecisions(prev => prev.map(x => x.id === d.id ? {...x, forumId: e.target.value} : x))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] outline-none"><option value="">None</option>{govForums.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select> : <span className="text-[13px]" style={{ color: forum ? "var(--accent-primary)" : "var(--text-muted)" }}>{forum ? forum.name : "—"}</span>}</td>
                  <td className="px-1 py-2 text-center">
                    <div className="flex gap-1">
                      <button onClick={() => setGovEditingDecId(isEditing ? null : d.id)} className="text-[14px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">{isEditing ? "✓" : "✎"}</button>
                      <button onClick={() => setGovDecisions(prev => prev.filter(x => x.id !== d.id))} className="text-[14px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                    </div>
                  </td>
                </tr>;
              })}
            </tbody></table></div>
          </Card>}

          {/* ─── 2. RAPID MODELER ─── */}
          {govView === "rapid" && <Card title="RAPID Decision Rights Matrix">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assign RAPID roles for each decision. Click cells to cycle through R → A → P → I → D → clear. Every decision needs exactly one D (Decide).</div>
            {/* Validation summary */}
            {(() => {
              const issues: { dec: string; issue: string; severity: "error" | "warn" }[] = [];
              govDecisions.forEach(d => {
                const roles = govRapid[d.id] || {};
                const dCount = Object.values(roles).filter(v => v === "D").length;
                const rCount = Object.values(roles).filter(v => v === "R").length;
                if (dCount === 0 && Object.keys(roles).length > 0) issues.push({ dec: d.name, issue: "No Decider (D) assigned", severity: "error" });
                if (dCount > 1) issues.push({ dec: d.name, issue: `${dCount} Deciders — only one allowed`, severity: "error" });
                // Check rubber-stamping: same role is both R and D
                GOV_RAPID_ROLES.forEach(role => {
                  if (roles[role] === "D" && Object.entries(roles).some(([r, v]) => r !== role && v === "R" && r === role)) issues.push({ dec: d.name, issue: `${role} is both Recommend and Decide`, severity: "warn" });
                });
                if (rCount === 0 && Object.keys(roles).length > 0) issues.push({ dec: d.name, issue: "No Recommender (R) assigned", severity: "warn" });
              });
              // Check bottleneck: any role is "D" on too many decisions
              const dCounts: Record<string, number> = {};
              govDecisions.forEach(d => { const roles = govRapid[d.id] || {}; Object.entries(roles).forEach(([role, v]) => { if (v === "D") dCounts[role] = (dCounts[role] || 0) + 1; }); });
              Object.entries(dCounts).forEach(([role, count]) => { if (count > 5) issues.push({ dec: role, issue: `Decides on ${count} decisions — potential bottleneck`, severity: "warn" }); });
              if (issues.length === 0) return null;
              return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 mb-4 space-y-1">
                <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-1">Validation Issues ({issues.length})</div>
                {issues.slice(0, 8).map((iss, i) => <div key={i} className="flex items-center gap-2 text-[14px]">
                  <span style={{ color: iss.severity === "error" ? "var(--risk)" : "var(--warning)" }}>{iss.severity === "error" ? "✗" : "⚠"}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{iss.dec}</span>
                  <span className="text-[var(--text-muted)]">— {iss.issue}</span>
                </div>)}
                {issues.length > 8 && <div className="text-[13px] text-[var(--text-muted)]">...and {issues.length - 8} more</div>}
              </div>;
            })()}
            {/* Matrix */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 min-w-[200px]">Decision</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Cat.</th>
              {GOV_RAPID_ROLES.map(role => <th key={role} className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)] min-w-[90px]">{role}</th>)}
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Valid</th>
            </tr></thead><tbody>
              {govDecisions.map(d => {
                const roles = govRapid[d.id] || {};
                const dCount = Object.values(roles).filter(v => v === "D").length;
                const hasAssignments = Object.keys(roles).length > 0;
                const valid = dCount === 1;
                const catColors: Record<string, string> = { Strategic: "var(--purple)", Tactical: "var(--accent-primary)", Operational: "var(--success)" };
                const rapidColors: Record<string, string> = { R: "var(--accent-primary)", A: "var(--success)", P: "var(--purple)", I: "var(--text-muted)", D: "var(--warning)" };
                return <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg)] z-10">{d.name}</td>
                  <td className="px-2 py-2 text-center"><span className="text-[12px] font-bold" style={{ color: catColors[d.category] }}>{d.category[0]}</span></td>
                  {GOV_RAPID_ROLES.map(role => {
                    const val = roles[role] || "";
                    return <td key={role} className="px-2 py-2 text-center">
                      <button onClick={() => {
                        const cycle = ["", "R", "A", "P", "I", "D"];
                        const next = cycle[(cycle.indexOf(val) + 1) % cycle.length];
                        setGovRapid(prev => ({ ...prev, [d.id]: { ...(prev[d.id] || {}), [role]: next } }));
                      }} className="w-7 h-7 rounded-lg items-center justify-center text-[14px] font-bold inline-flex cursor-pointer transition-all" style={{
                        background: val ? `${rapidColors[val] || "var(--text-muted)"}15` : "var(--surface-2)",
                        color: val ? rapidColors[val] || "var(--text-muted)" : "var(--border)",
                        border: val ? `1px solid ${rapidColors[val] || "var(--text-muted)"}30` : "1px solid var(--border)",
                      }}>{val || "·"}</button>
                    </td>;
                  })}
                  <td className="px-2 py-2 text-center"><span style={{ color: !hasAssignments ? "var(--text-muted)" : valid ? "var(--success)" : "var(--risk)" }}>{!hasAssignments ? "—" : valid ? "✓" : "✗"}</span></td>
                </tr>;
              })}
            </tbody></table></div>
            <div className="flex gap-4 mt-3 text-[14px] text-[var(--text-muted)]">{[{l:"R",n:"Recommend",c:"var(--accent-primary)"},{l:"A",n:"Agree (veto)",c:"var(--success)"},{l:"P",n:"Perform",c:"var(--purple)"},{l:"I",n:"Input",c:"var(--text-muted)"},{l:"D",n:"Decide (one only)",c:"var(--warning)"}].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-5 h-5 rounded text-[13px] font-bold flex items-center justify-center" style={{background:`${x.c}15`,color:x.c}}>{x.l}</span>{x.n}</span>)}</div>
          </Card>}

          {/* ─── 3. GOVERNANCE FORUM DESIGNER ─── */}
          {govView === "forums" && <Card title="Governance Forum Designer">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Design governance bodies and link decisions to forums. Orphaned decisions (not assigned to any forum) are flagged.</div>
            {/* Orphan check */}
            {(() => {
              const orphans = govDecisions.filter(d => !d.forumId);
              if (orphans.length === 0) return null;
              return <div className="rounded-xl border border-[var(--warning)]/30 bg-[rgba(245,158,11,0.04)] p-3 mb-4">
                <div className="text-[14px] font-bold text-[var(--warning)] mb-1">⚠ {orphans.length} Orphaned Decision{orphans.length > 1 ? "s" : ""} — not assigned to any forum</div>
                <div className="flex flex-wrap gap-1">{orphans.slice(0, 10).map(d => <span key={d.id} className="px-2 py-0.5 rounded-full text-[13px] bg-[rgba(245,158,11,0.1)] text-[var(--warning)]">{d.name}</span>)}{orphans.length > 10 && <span className="text-[13px] text-[var(--text-muted)]">+{orphans.length - 10} more</span>}</div>
              </div>;
            })()}
            {/* Governance hierarchy visualization */}
            <div className="mb-5">
              <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-3">Governance Hierarchy</div>
              <div className="space-y-3">
                {(() => {
                  const topLevel = govForums.filter(f => !f.parentId);
                  const renderForum = (forum: GovForum, depth: number): React.ReactNode => {
                    const children = govForums.filter(f => f.parentId === forum.id);
                    const linkedDecs = govDecisions.filter(d => d.forumId === forum.id);
                    const cadenceColors: Record<string, string> = { Weekly: "var(--success)", "Bi-weekly": "var(--accent-primary)", Monthly: "var(--accent-primary)", Quarterly: "var(--purple)", "Ad hoc": "var(--text-muted)" };
                    return <div key={forum.id} style={{ marginLeft: depth * 24 }}>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {depth > 0 && <span className="text-[var(--text-muted)]">↳</span>}
                            <span className="text-[15px] font-bold text-[var(--text-primary)]">{forum.name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: `${cadenceColors[forum.cadence] || "var(--text-muted)"}12`, color: cadenceColors[forum.cadence] || "var(--text-muted)" }}>{forum.cadence}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] text-[var(--text-muted)]">Chair: {forum.chair}</span>
                            <button onClick={() => setGovForums(prev => prev.filter(f => f.id !== forum.id))} className="text-[14px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                          </div>
                        </div>
                        <div className="text-[14px] text-[var(--text-secondary)] mb-1">{forum.purpose}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] text-[var(--text-muted)]">Members:</span>
                          {forum.members.map((m, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--bg)] text-[13px] text-[var(--text-secondary)]">{m}</span>)}
                        </div>
                        {linkedDecs.length > 0 && <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] text-[var(--text-muted)]">Decisions ({linkedDecs.length}):</span>
                          {linkedDecs.map(d => <span key={d.id} className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[rgba(212,134,10,0.08)] text-[var(--accent-primary)]">{d.name}</span>)}
                        </div>}
                      </div>
                      {children.map(c => renderForum(c, depth + 1))}
                    </div>;
                  };
                  return topLevel.map(f => renderForum(f, 0));
                })()}
              </div>
            </div>
            {/* Add forum */}
            {govAddingForum ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add Governance Forum</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={govNewForum.name} onChange={e => setGovNewForum(p => ({...p, name: e.target.value}))} placeholder="Forum name..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={govNewForum.chair} onChange={e => setGovNewForum(p => ({...p, chair: e.target.value}))} placeholder="Chair (role/title)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={govNewForum.purpose} onChange={e => setGovNewForum(p => ({...p, purpose: e.target.value}))} placeholder="Purpose..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <select value={govNewForum.cadence} onChange={e => setGovNewForum(p => ({...p, cadence: e.target.value}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none">
                  <option>Weekly</option><option>Bi-weekly</option><option>Monthly</option><option>Quarterly</option><option>Ad hoc</option>
                </select>
                <select value={govNewForum.parentId} onChange={e => setGovNewForum(p => ({...p, parentId: e.target.value}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none">
                  <option value="">No parent (top-level)</option>
                  {govForums.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <input value={govNewForum.members} onChange={e => setGovNewForum(p => ({...p, members: e.target.value}))} placeholder="Members (comma-separated)..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (!govNewForum.name.trim()) return; setGovForums(prev => [...prev, { id: `f${Date.now()}`, name: govNewForum.name, purpose: govNewForum.purpose, cadence: govNewForum.cadence, chair: govNewForum.chair, members: govNewForum.members.split(",").map(m => m.trim()).filter(Boolean), parentId: govNewForum.parentId }]); setGovNewForum({ name: "", purpose: "", cadence: "Monthly", chair: "", members: "", parentId: "" }); setGovAddingForum(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Add Forum</button>
                <button onClick={() => setGovAddingForum(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setGovAddingForum(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Governance Forum</button>}
          </Card>}

          {/* ─── 4. BOTTLENECK ANALYZER ─── */}
          {govView === "bottlenecks" && <Card title="Decision Bottleneck Analyzer">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Auto-identified bottlenecks and governance friction points based on your decision catalogue and RAPID assignments.</div>
            {(() => {
              // Analyze bottlenecks
              const undefinedClarity = govDecisions.filter(d => d.clarity === "Undefined");
              const slowStrategic = govDecisions.filter(d => d.category === "Strategic" && d.speed === "Slow");
              const slowTactical = govDecisions.filter(d => d.category === "Tactical" && d.speed === "Slow");
              const slowOps = govDecisions.filter(d => d.category === "Operational" && d.speed !== "Fast");
              // Bottleneck persons: who has "D" on too many decisions
              const deciderLoad: Record<string, { count: number; decisions: string[] }> = {};
              govDecisions.forEach(d => {
                const roles = govRapid[d.id] || {};
                Object.entries(roles).forEach(([role, v]) => {
                  if (v === "D") {
                    if (!deciderLoad[role]) deciderLoad[role] = { count: 0, decisions: [] };
                    deciderLoad[role].count++;
                    deciderLoad[role].decisions.push(d.name);
                  }
                });
                // Also check by owner
                if (!Object.values(roles).includes("D")) {
                  if (!deciderLoad[d.owner]) deciderLoad[d.owner] = { count: 0, decisions: [] };
                  deciderLoad[d.owner].count++;
                  deciderLoad[d.owner].decisions.push(d.name);
                }
              });
              const bottleneckPeople = Object.entries(deciderLoad).filter(([, v]) => v.count >= 4).sort((a, b) => b[1].count - a[1].count);
              // Veto bottlenecks: functions with too many A (Agree/veto) assignments
              const vetoByFunc: Record<string, number> = {};
              govDecisions.forEach(d => {
                const roles = govRapid[d.id] || {};
                Object.values(roles).forEach(v => { if (v === "A") vetoByFunc[d.func] = (vetoByFunc[d.func] || 0) + 1; });
              });
              const vetoBottlenecks = Object.entries(vetoByFunc).filter(([, v]) => v >= 3).sort((a, b) => b[1] - a[1]);
              // Orphaned decisions
              const orphanedDecs = govDecisions.filter(d => !d.forumId);
              // Overall health score
              const totalIssues = undefinedClarity.length + slowTactical.length + slowOps.length + bottleneckPeople.length + vetoBottlenecks.length + Math.floor(orphanedDecs.length / 3);
              const healthScore = Math.max(0, Math.min(100, 100 - totalIssues * 8));
              const healthColor = healthScore >= 70 ? "var(--success)" : healthScore >= 40 ? "var(--warning)" : "var(--risk)";
              const healthLabel = healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Needs Attention" : "Critical";

              return <div className="space-y-5">
                {/* Health score */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center col-span-1">
                    <div className="text-[28px] font-extrabold" style={{ color: healthColor }}>{healthScore}</div>
                    <div className="text-[13px] font-bold uppercase" style={{ color: healthColor }}>{healthLabel}</div>
                    <div className="text-[12px] text-[var(--text-muted)]">Governance Health</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center">
                    <div className="text-[22px] font-extrabold text-[var(--risk)]">{undefinedClarity.length}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">No Clear Owner</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center">
                    <div className="text-[22px] font-extrabold text-[var(--warning)]">{bottleneckPeople.length}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">Bottleneck Roles</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center">
                    <div className="text-[22px] font-extrabold text-[var(--warning)]">{orphanedDecs.length}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">Orphaned Decisions</div>
                  </div>
                </div>

                {/* Bottleneck people heatmap */}
                {bottleneckPeople.length > 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-3">Decision Bottleneck Roles</div>
                  <div className="space-y-3">{bottleneckPeople.map(([role, data]) => {
                    const pct = Math.min(100, (data.count / govDecisions.length) * 100 * 3);
                    return <div key={role}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold text-[var(--text-primary)]">{role}</span>
                        <span className="text-[14px] font-bold" style={{ color: data.count >= 8 ? "var(--risk)" : "var(--warning)" }}>{data.count} decisions</span>
                      </div>
                      <div className="h-3 bg-[var(--bg)] rounded-full overflow-hidden mb-1"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: data.count >= 8 ? "var(--risk)" : "var(--warning)" }} /></div>
                      <div className="flex flex-wrap gap-1">{data.decisions.slice(0, 5).map(dn => <span key={dn} className="text-[12px] text-[var(--text-muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded">{dn}</span>)}{data.decisions.length > 5 && <span className="text-[12px] text-[var(--text-muted)]">+{data.decisions.length - 5}</span>}</div>
                    </div>;
                  })}</div>
                </div>}

                {/* Undefined clarity */}
                {undefinedClarity.length > 0 && <div className="rounded-xl border border-[var(--risk)]/20 bg-[rgba(239,68,68,0.03)] p-4">
                  <div className="text-[14px] font-bold text-[var(--risk)] uppercase mb-2">Decisions with No Clear Owner ({undefinedClarity.length})</div>
                  <div className="space-y-2">{undefinedClarity.map(d => <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)]">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[var(--text-muted)]">{d.func}</span>
                      <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-[rgba(239,68,68,0.1)] text-[var(--risk)]">{d.category}</span>
                    </div>
                  </div>)}</div>
                </div>}

                {/* Speed mismatches */}
                {(slowTactical.length > 0 || slowOps.length > 0) && <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(245,158,11,0.03)] p-4">
                  <div className="text-[14px] font-bold text-[var(--warning)] uppercase mb-2">Speed Mismatches</div>
                  {slowTactical.length > 0 && <div className="mb-2"><div className="text-[13px] text-[var(--text-muted)] mb-1">Tactical decisions taking &gt;4 weeks (should be 1-4 weeks):</div><div className="flex flex-wrap gap-1">{slowTactical.map(d => <span key={d.id} className="px-2 py-0.5 rounded-full text-[13px] bg-[rgba(245,158,11,0.1)] text-[var(--warning)]">{d.name}</span>)}</div></div>}
                  {slowOps.length > 0 && <div><div className="text-[13px] text-[var(--text-muted)] mb-1">Operational decisions not fast (&lt;1 week):</div><div className="flex flex-wrap gap-1">{slowOps.map(d => <span key={d.id} className="px-2 py-0.5 rounded-full text-[13px] bg-[rgba(245,158,11,0.1)] text-[var(--warning)]">{d.name}</span>)}</div></div>}
                </div>}

                {/* Veto bottlenecks */}
                {vetoBottlenecks.length > 0 && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-2">Functions with Excessive Veto Points</div>
                  <div className="grid grid-cols-3 gap-3">{vetoBottlenecks.map(([func, count]) => <div key={func} className="rounded-lg p-3 bg-[var(--bg)] text-center">
                    <div className="text-[18px] font-extrabold text-[var(--warning)]">{count}</div>
                    <div className="text-[14px] text-[var(--text-primary)]">{func}</div>
                    <div className="text-[12px] text-[var(--text-muted)]">agree/veto gates</div>
                  </div>)}</div>
                </div>}

                {/* Recommendations */}
                <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-4">
                  <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Recommendations</div>
                  <div className="space-y-2">
                    {bottleneckPeople.length > 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">Consider delegating {bottleneckPeople.reduce((s, [, d]) => s + Math.max(0, d.count - 3), 0)} tactical/operational decisions from <strong>{bottleneckPeople[0][0]}</strong> to function heads to reduce decision concentration.</span></div>}
                    {undefinedClarity.length > 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">Assign clear owners for {undefinedClarity.length} decision{undefinedClarity.length > 1 ? "s" : ""} with undefined clarity — ambiguity slows execution and creates organizational friction.</span></div>}
                    {orphanedDecs.length > 3 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">{orphanedDecs.length} decisions are not linked to any governance forum. Assign each to a forum in the Decision Catalogue tab to ensure accountability.</span></div>}
                    {slowOps.length > 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">{slowOps.length} operational decisions are slower than expected. Operational decisions should resolve in &lt;1 week — consider pre-approving or setting threshold-based auto-approval rules.</span></div>}
                    {vetoBottlenecks.length > 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">{vetoBottlenecks[0][0]} has {vetoBottlenecks[0][1]} veto/agree gates — consider shifting from "Agree" to "Input" for lower-risk decisions to improve speed.</span></div>}
                    {totalIssues === 0 && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--success)] shrink-0 mt-0.5">✓</span><span className="text-[var(--text-secondary)]">No significant governance bottlenecks detected. Your decision framework appears well-structured.</span></div>}
                  </div>
                </div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── Step 2.3: Process Architecture ── */}
        {omView === "2.3" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "map" as const, label: "E2E Process Map", icon: "🗺" },
              { id: "detail" as const, label: "Process Detail", icon: "🔍" },
              { id: "maturity" as const, label: "Maturity Assessment", icon: "📊" },
              { id: "capmap" as const, label: "Capability Mapping", icon: "🔗" },
              { id: "bottlenecks" as const, label: "Handoff Analyzer", icon: "⚡" },
            ]).map(v => <button key={v.id} onClick={() => setProcView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: procView === v.id ? "rgba(212,134,10,0.12)" : "transparent",
              color: procView === v.id ? "#e09040" : "var(--text-muted)",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. E2E PROCESS MAP ─── */}
          {procView === "map" && <Card title="End-to-End Process Map">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Core enterprise processes spanning multiple functions. Click any process to see detailed steps.</div>
            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Processes", val: procProcesses.length, color: "var(--text-primary)" },
                { label: "Total Steps", val: procProcesses.reduce((s, p) => s + p.steps.length, 0), color: "var(--accent-primary)" },
                { label: "Total Handoffs", val: procProcesses.reduce((s, p) => s + p.steps.filter(st => st.isHandoff).length, 0), color: "var(--warning)" },
                { label: "Avg Maturity", val: (() => { const rated = procProcesses.filter(p => p.maturity > 0); return rated.length ? (rated.reduce((s, p) => s + p.maturity, 0) / rated.length).toFixed(1) : "—"; })(), color: "var(--success)" },
              ].map(k => <div key={k.label} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}
            </div>
            {/* Process cards */}
            <div className="space-y-3">
              {procProcesses.map(proc => {
                const handoffs = proc.steps.filter(s => s.isHandoff).length;
                const funcsInvolved = Array.from(new Set(proc.steps.map(s => s.func)));
                return <div key={proc.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 hover:border-[var(--accent-primary)]/30 transition-all cursor-pointer" onClick={() => { setProcSelectedId(proc.id); setProcView("detail"); }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-[16px] font-bold text-[var(--text-primary)]">{proc.name}</div>
                      {proc.maturity > 0 && <span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${proc.maturity >= 4 ? "var(--success)" : proc.maturity >= 3 ? "var(--accent-primary)" : "var(--warning)"}12`, color: proc.maturity >= 4 ? "var(--success)" : proc.maturity >= 3 ? "var(--accent-primary)" : "var(--warning)" }}>L{proc.maturity}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[14px] text-[var(--text-muted)]">
                      <span>{proc.steps.length} steps</span>
                      <span style={{ color: handoffs > 4 ? "var(--risk)" : handoffs > 2 ? "var(--warning)" : "var(--text-muted)" }}>{handoffs} handoffs</span>
                      <span>{proc.cycleTime}</span>
                      <button onClick={e => { e.stopPropagation(); setProcProcesses(prev => prev.filter(p => p.id !== proc.id)); }} className="text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-[14px]">
                    <span className="text-[var(--text-muted)]">Owner: <strong className="text-[var(--text-secondary)]">{proc.owner}</strong></span>
                    <span className="text-[var(--border)]">|</span>
                    <span className="text-[var(--text-muted)]">{proc.trigger}</span>
                    <span className="text-[var(--text-muted)]">→</span>
                    <span className="text-[var(--text-muted)]">{proc.output}</span>
                  </div>
                  {/* Mini step flow */}
                  <div className="flex items-center gap-0.5 overflow-x-auto">
                    {proc.steps.map((step, si) => <React.Fragment key={step.id}>
                      {si > 0 && <span className="text-[12px] shrink-0" style={{ color: step.isHandoff ? "var(--warning)" : "var(--text-muted)" }}>{step.isHandoff ? "⚡" : "→"}</span>}
                      <div className="px-2 py-1 rounded text-[12px] font-semibold shrink-0 border" style={{
                        background: `${PROC_FUNC_COLORS[step.func] || "#888"}08`,
                        borderColor: `${PROC_FUNC_COLORS[step.func] || "#888"}30`,
                        color: PROC_FUNC_COLORS[step.func] || "var(--text-muted)",
                      }}>{step.name.length > 15 ? step.name.slice(0, 13) + "..." : step.name}</div>
                    </React.Fragment>)}
                  </div>
                  {/* Function tags */}
                  <div className="flex gap-1 mt-2">{funcsInvolved.map(f => <span key={f} className="px-1.5 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${PROC_FUNC_COLORS[f] || "#888"}12`, color: PROC_FUNC_COLORS[f] || "#888" }}>{f}</span>)}</div>
                </div>;
              })}
            </div>
            {/* Add process */}
            {procAddingProcess ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 mt-3 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add Custom Process</div>
              <div className="grid grid-cols-2 gap-3">
                <input value={procNewProc.name} onChange={e => setProcNewProc(p => ({...p, name: e.target.value}))} placeholder="Process name (e.g. Comply to Certify)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.owner} onChange={e => setProcNewProc(p => ({...p, owner: e.target.value}))} placeholder="Process owner (e.g. CTO)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.trigger} onChange={e => setProcNewProc(p => ({...p, trigger: e.target.value}))} placeholder="Start trigger..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.output} onChange={e => setProcNewProc(p => ({...p, output: e.target.value}))} placeholder="End output..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.functions} onChange={e => setProcNewProc(p => ({...p, functions: e.target.value}))} placeholder="Functions involved (comma-separated)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                <input value={procNewProc.cycleTime} onChange={e => setProcNewProc(p => ({...p, cycleTime: e.target.value}))} placeholder="Cycle time (e.g. 7-30 days)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (!procNewProc.name.trim()) return; setProcProcesses(prev => [...prev, { id: `p${Date.now()}`, name: procNewProc.name, owner: procNewProc.owner, trigger: procNewProc.trigger, output: procNewProc.output, functions: procNewProc.functions.split(",").map(f => f.trim()).filter(Boolean), cycleTime: procNewProc.cycleTime, steps: [], maturity: 0, industryBenchmark: 3.0 }]); setProcNewProc({ name: "", owner: "", trigger: "", output: "", functions: "", cycleTime: "" }); setProcAddingProcess(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Add Process</button>
                <button onClick={() => setProcAddingProcess(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setProcAddingProcess(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all mt-3">+ Add Custom Process</button>}
          </Card>}

          {/* ─── 2. PROCESS DETAIL VIEW ─── */}
          {procView === "detail" && <Card title={procSelected ? `${procSelected.name} — Process Steps` : "Select a Process"}>
            {!procSelected ? <div className="text-center py-10">
              <div className="text-[40px] mb-3">🔍</div>
              <div className="text-[15px] text-[var(--text-muted)] mb-4">Select a process from the E2E Map to see its steps.</div>
              <button onClick={() => setProcView("map")} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">Go to Process Map</button>
            </div> : <>
              {/* Process selector */}
              <div className="flex items-center gap-2 mb-4">
                <select value={procSelectedId || ""} onChange={e => setProcSelectedId(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none">
                  {procProcesses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <span className="text-[14px] text-[var(--text-muted)]">Owner: {procSelected.owner} | {procSelected.cycleTime}</span>
                <button onClick={async () => {
                  setProcAiGenerating(true);
                  try {
                    const raw = await callAI("Return ONLY valid JSON array.", `Generate 6-8 detailed process steps for the "${procSelected.name}" process. Each step: {"name":"step name","func":"owning function","duration":"estimate","system":"system used","automation":"Manual|Semi-Auto|Automated","isHandoff":true/false}. Mark cross-functional transitions as handoffs. Be specific to the process.`);
                    const steps = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
                    if (Array.isArray(steps)) { setProcProcesses(prev => prev.map(p => p.id === procSelected.id ? { ...p, steps: steps.map((s: Record<string, unknown>, i: number) => ({ ...s, id: `${procSelected.id}s${i+1}`, automation: s.automation || "Manual" })) as ProcStep[] } : p)); }
                  } catch { showToast("AI couldn't complete the generation — try again"); }
                  setProcAiGenerating(false);
                }} disabled={procAiGenerating} className="ml-auto px-3 py-1.5 rounded-lg text-[14px] font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: procAiGenerating ? 0.5 : 1 }}>{procAiGenerating ? "Generating..." : "✨ AI Generate Steps"}</button>
              </div>
              {/* Horizontal flow */}
              <div className="overflow-x-auto pb-3 mb-4">
                <div className="flex items-stretch gap-1 min-w-max">
                  {procSelected.steps.map((step, si) => {
                    const funcColor = PROC_FUNC_COLORS[step.func] || "#888";
                    const autoColors: Record<string, string> = { Manual: "var(--risk)", "Semi-Auto": "var(--warning)", Automated: "var(--success)" };
                    return <React.Fragment key={step.id}>
                      {si > 0 && <div className="flex items-center shrink-0 px-1">
                        {step.isHandoff ? <div className="flex flex-col items-center"><span className="text-[14px] text-[var(--warning)]">⚡</span><span className="text-[10px] text-[var(--warning)] font-semibold">Handoff</span></div> : <span className="text-[var(--text-muted)]">→</span>}
                      </div>}
                      <div className="rounded-xl p-3 min-w-[140px] max-w-[160px] border-t-4" style={{ background: "var(--surface-2)", border: `1px solid ${funcColor}25`, borderTopColor: funcColor, borderTopWidth: 4 }}>
                        <div className="text-[14px] font-bold text-[var(--text-primary)] mb-1 leading-tight">{step.name}</div>
                        <div className="text-[12px] font-semibold mb-1" style={{ color: funcColor }}>{step.func}</div>
                        <div className="text-[12px] text-[var(--text-muted)] mb-0.5">{step.duration}</div>
                        <div className="text-[12px] text-[var(--text-muted)] mb-1 truncate" title={step.system}>{step.system || "No system"}</div>
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold" style={{ background: `${autoColors[step.automation]}12`, color: autoColors[step.automation] }}>{step.automation}</span>
                        <button onClick={() => setProcProcesses(prev => prev.map(p => p.id === procSelected.id ? { ...p, steps: p.steps.filter(s => s.id !== step.id) } : p))} className="float-right text-[12px] text-[var(--text-muted)] hover:text-[var(--risk)] mt-1">×</button>
                      </div>
                    </React.Fragment>;
                  })}
                </div>
              </div>
              {/* Function legend */}
              <div className="flex gap-2 flex-wrap mb-4">{Array.from(new Set(procSelected.steps.map(s => s.func))).map(f => <span key={f} className="flex items-center gap-1 text-[13px]"><span className="w-3 h-1.5 rounded-full" style={{ background: PROC_FUNC_COLORS[f] || "#888" }} /><span style={{ color: PROC_FUNC_COLORS[f] || "#888" }}>{f}</span></span>)}</div>
              {/* Add step */}
              {procAddingStep ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 space-y-3">
                <div className="text-[14px] font-bold text-[var(--accent-primary)]">Add Step</div>
                <div className="grid grid-cols-3 gap-2">
                  <input value={procNewStep.name} onChange={e => setProcNewStep(p => ({...p, name: e.target.value}))} placeholder="Step name..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input value={procNewStep.func} onChange={e => setProcNewStep(p => ({...p, func: e.target.value}))} placeholder="Function..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input value={procNewStep.duration} onChange={e => setProcNewStep(p => ({...p, duration: e.target.value}))} placeholder="Duration..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input value={procNewStep.system} onChange={e => setProcNewStep(p => ({...p, system: e.target.value}))} placeholder="System..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <select value={procNewStep.automation} onChange={e => setProcNewStep(p => ({...p, automation: e.target.value as ProcStep["automation"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[14px] text-[var(--text-primary)] outline-none"><option>Manual</option><option>Semi-Auto</option><option>Automated</option></select>
                  <div className="flex gap-2">
                    <button onClick={() => { if (!procNewStep.name.trim()) return; setProcProcesses(prev => prev.map(p => p.id === procSelected.id ? { ...p, steps: [...p.steps, { id: `${procSelected.id}s${Date.now()}`, name: procNewStep.name, func: procNewStep.func, duration: procNewStep.duration, system: procNewStep.system, automation: procNewStep.automation, isHandoff: p.steps.length > 0 && p.steps[p.steps.length-1].func !== procNewStep.func }] } : p)); setProcNewStep({ name: "", func: "Operations", duration: "", system: "", automation: "Manual" }); }} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Add</button>
                    <button onClick={() => setProcAddingStep(false)} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Done</button>
                  </div>
                </div>
              </div> : <button onClick={() => setProcAddingStep(true)} className="px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all w-full">+ Add Step</button>}
            </>}
          </Card>}

          {/* ─── 3. PROCESS MATURITY ASSESSMENT ─── */}
          {procView === "maturity" && <Card title="Process Maturity Assessment">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Rate each process on a 1-5 maturity scale. Industry benchmarks shown for comparison.</div>
            {/* Radar chart data + maturity levels legend */}
            {(() => {
              const rated = procProcesses.filter(p => p.maturity > 0);
              const avgMaturity = rated.length ? (rated.reduce((s, p) => s + p.maturity, 0) / rated.length) : 0;
              const avgBenchmark = procProcesses.length ? (procProcesses.reduce((s, p) => s + p.industryBenchmark, 0) / procProcesses.length) : 0;
              return <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: avgMaturity >= 3.5 ? "var(--success)" : avgMaturity >= 2.5 ? "var(--warning)" : "var(--risk)" }}>{avgMaturity ? avgMaturity.toFixed(1) : "—"}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Your Average</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{avgBenchmark.toFixed(1)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Industry Average</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: avgMaturity >= avgBenchmark ? "var(--success)" : "var(--risk)" }}>{avgMaturity ? (avgMaturity - avgBenchmark >= 0 ? "+" : "") + (avgMaturity - avgBenchmark).toFixed(1) : "—"}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Gap</div></div>
                </div>
                {/* Radar */}
                <div className="h-[280px] mb-4">
                  <RadarViz data={procProcesses.map(p => ({ subject: p.name.length > 16 ? p.name.slice(0, 14) + "..." : p.name, current: p.maturity || 0, benchmark: p.industryBenchmark, max: 5 }))} />
                </div>
              </>;
            })()}
            {/* Maturity rating table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Process</th>
              {[1,2,3,4,5].map(n => <th key={n} className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">{n}</th>)}
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Benchmark</th>
              <th className="px-2 py-2 text-center text-[13px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Gap</th>
            </tr></thead><tbody>
              {procProcesses.map(proc => {
                const gap = proc.maturity > 0 ? proc.maturity - proc.industryBenchmark : 0;
                return <tr key={proc.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{proc.name}<div className="text-[12px] text-[var(--text-muted)]">{proc.owner}</div></td>
                  {[1,2,3,4,5].map(n => <td key={n} className="px-2 py-2 text-center"><button onClick={() => setProcProcesses(prev => prev.map(p => p.id === proc.id ? { ...p, maturity: p.maturity === n ? 0 : n } : p))} className="w-7 h-7 rounded-lg text-[14px] font-bold transition-all" style={{
                    background: proc.maturity >= n ? `${n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)"}20` : "var(--surface-2)",
                    color: proc.maturity >= n ? (n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)") : "var(--text-muted)",
                  }}>{n}</button></td>)}
                  <td className="px-2 py-2 text-center text-[14px] font-semibold text-[var(--accent-primary)]">{proc.industryBenchmark.toFixed(1)}</td>
                  <td className="px-2 py-2 text-center text-[14px] font-bold" style={{ color: proc.maturity === 0 ? "var(--text-muted)" : gap >= 0 ? "var(--success)" : "var(--risk)" }}>{proc.maturity === 0 ? "—" : (gap >= 0 ? "+" : "") + gap.toFixed(1)}</td>
                </tr>;
              })}
            </tbody></table></div>
            <div className="flex gap-3 mt-2 text-[13px] text-[var(--text-muted)]">{["1=Ad Hoc", "2=Repeatable", "3=Defined", "4=Managed", "5=Optimized"].map(l => <span key={l}>{l}</span>)}</div>
            {/* Gap insights */}
            {(() => {
              const gaps = procProcesses.filter(p => p.maturity > 0 && p.maturity < p.industryBenchmark).sort((a, b) => (a.maturity - a.industryBenchmark) - (b.maturity - b.industryBenchmark));
              if (gaps.length === 0) return null;
              return <div className="mt-4 rounded-xl border border-[var(--warning)]/20 bg-[rgba(245,158,11,0.04)] p-4">
                <div className="text-[14px] font-bold text-[var(--warning)] uppercase mb-2">Gap Analysis — Below Industry Benchmark</div>
                <div className="space-y-2">{gaps.map(p => <div key={p.id} className="flex items-center gap-2 text-[14px]">
                  <span className="text-[var(--warning)]">⚠</span>
                  <span className="text-[var(--text-secondary)]">Your <strong>{p.name}</strong> process is at Level {p.maturity} vs. industry average Level {p.industryBenchmark.toFixed(1)} — gap of {(p.industryBenchmark - p.maturity).toFixed(1)}</span>
                </div>)}</div>
              </div>;
            })()}
          </Card>}

          {/* ─── 4. PROCESS-TO-CAPABILITY MAPPING ─── */}
          {procView === "capmap" && <Card title="Process-to-Capability Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Map which capabilities enable which processes. Click cells to toggle. Gaps highlight where low-maturity capabilities constrain critical processes.</div>
            {(() => {
              // Use stratCapabilities from earlier
              const caps = stratCapabilities.length > 0 ? stratCapabilities.slice(0, 15) : activeCoreLayer.map(c => c.replace(archD.coreSuffix, "")).slice(0, 15);
              return <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                <th className="px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 min-w-[160px]">Process</th>
                {caps.map(cap => <th key={cap} className="px-1 py-2 text-center border-b border-[var(--border)]" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", minWidth: 36 }}><span className="text-[12px] font-semibold text-[var(--text-muted)]">{cap.length > 18 ? cap.slice(0, 16) + "..." : cap}</span></th>)}
              </tr></thead><tbody>
                {procProcesses.map(proc => <tr key={proc.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg)] z-10">{proc.name}</td>
                  {caps.map(cap => {
                    const key = `${proc.id}__${cap}`;
                    const linked = procCapMatrix[key] === "1";
                    const capMaturity = maturityScores[cap] || 0;
                    const isGap = linked && capMaturity > 0 && capMaturity <= 2;
                    return <td key={cap} className="px-1 py-2 text-center">
                      <button onClick={() => setProcCapMatrix(prev => ({ ...prev, [key]: linked ? "" : "1" }))} className="w-6 h-6 rounded transition-all" style={{
                        background: isGap ? "rgba(239,68,68,0.15)" : linked ? "rgba(212,134,10,0.15)" : "var(--surface-2)",
                        border: isGap ? "1px solid var(--risk)" : linked ? "1px solid var(--accent-primary)" : "1px solid var(--border)",
                        color: isGap ? "var(--risk)" : linked ? "var(--accent-primary)" : "var(--border)",
                      }}>{isGap ? "!" : linked ? "●" : ""}</button>
                    </td>;
                  })}
                </tr>)}
              </tbody></table></div>;
            })()}
            <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-[rgba(212,134,10,0.15)] border border-[var(--accent-primary)] text-[var(--accent-primary)] text-[12px] text-center font-bold">●</span> Linked</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-[rgba(239,68,68,0.15)] border border-[var(--risk)] text-[var(--risk)] text-[12px] text-center font-bold">!</span> Gap — capability maturity too low</span>
            </div>
          </Card>}

          {/* ─── 5. HANDOFF & BOTTLENECK ANALYZER ─── */}
          {procView === "bottlenecks" && <Card title="Handoff & Bottleneck Analyzer">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Identifies cross-functional handoffs, bottleneck processes, and improvement opportunities.</div>
            {(() => {
              const analysis = procProcesses.map(proc => {
                const totalHandoffs = proc.steps.filter(s => s.isHandoff).length;
                const crossFuncHandoffs = proc.steps.filter((s, i) => i > 0 && s.func !== proc.steps[i-1].func).length;
                const manualSteps = proc.steps.filter(s => s.automation === "Manual").length;
                const noSystemHandoffs = proc.steps.filter(s => s.isHandoff && (!s.system || s.system === "No system")).length;
                const uniqueFuncs = new Set(proc.steps.map(s => s.func)).size;
                const complexity = totalHandoffs * 2 + manualSteps + crossFuncHandoffs;
                return { proc, totalHandoffs, crossFuncHandoffs, manualSteps, noSystemHandoffs, uniqueFuncs, complexity };
              }).sort((a, b) => b.complexity - a.complexity);

              const highHandoff = analysis.filter(a => a.totalHandoffs > 4);
              const unsupported = analysis.filter(a => a.noSystemHandoffs > 0);
              const totalCrossFunc = analysis.reduce((s, a) => s + a.crossFuncHandoffs, 0);

              return <div className="space-y-5">
                {/* KPIs */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold text-[var(--text-primary)]">{analysis.reduce((s, a) => s + a.totalHandoffs, 0)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Total Handoffs</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold text-[var(--warning)]">{totalCrossFunc}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Cross-Functional</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold text-[var(--risk)]">{highHandoff.length}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">High Handoff (&gt;4)</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold text-[var(--risk)]">{unsupported.reduce((s, a) => s + a.noSystemHandoffs, 0)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Unsupported Handoffs</div></div>
                </div>
                {/* Bottleneck heatmap */}
                <div className="space-y-2">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase">Process Complexity Ranking</div>
                  {analysis.map(a => {
                    const maxComplexity = Math.max(...analysis.map(x => x.complexity), 1);
                    const pct = (a.complexity / maxComplexity) * 100;
                    const color = a.complexity >= maxComplexity * 0.7 ? "var(--risk)" : a.complexity >= maxComplexity * 0.4 ? "var(--warning)" : "var(--success)";
                    return <div key={a.proc.id} className="rounded-lg bg-[var(--surface-2)] p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[14px] font-semibold text-[var(--text-primary)]">{a.proc.name}</span>
                        <div className="flex items-center gap-3 text-[13px]">
                          <span className="text-[var(--text-muted)]">{a.proc.steps.length} steps</span>
                          <span style={{ color: a.totalHandoffs > 4 ? "var(--risk)" : "var(--text-muted)" }}>{a.totalHandoffs} handoffs</span>
                          <span style={{ color: a.crossFuncHandoffs > 3 ? "var(--warning)" : "var(--text-muted)" }}>{a.crossFuncHandoffs} cross-func</span>
                          <span className="text-[var(--text-muted)]">{a.uniqueFuncs} functions</span>
                          <span style={{ color: a.manualSteps > 3 ? "var(--risk)" : "var(--text-muted)" }}>{a.manualSteps} manual</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} /></div>
                    </div>;
                  })}
                </div>
                {/* Flagged issues */}
                {(highHandoff.length > 0 || unsupported.length > 0) && <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(245,158,11,0.04)] p-4">
                  <div className="text-[14px] font-bold text-[var(--warning)] uppercase mb-2">Flagged Issues</div>
                  <div className="space-y-2">
                    {highHandoff.map(a => <div key={`hh-${a.proc.id}`} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--risk)] shrink-0 mt-0.5">⚠</span><span className="text-[var(--text-secondary)]"><strong>{a.proc.name}</strong> has {a.totalHandoffs} handoffs ({a.crossFuncHandoffs} cross-functional) — high complexity drives delays and errors.</span></div>)}
                    {unsupported.map(a => <div key={`us-${a.proc.id}`} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--risk)] shrink-0 mt-0.5">✗</span><span className="text-[var(--text-secondary)]"><strong>{a.proc.name}</strong> has {a.noSystemHandoffs} handoff{a.noSystemHandoffs > 1 ? "s" : ""} with no supporting system — manual transitions are error-prone.</span></div>)}
                  </div>
                </div>}
                {/* Recommendations */}
                <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-4">
                  <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Recommendations</div>
                  <div className="space-y-2">
                    {analysis.filter(a => a.totalHandoffs > 4).slice(0, 3).map(a => {
                      const consecutiveSameFunc = a.proc.steps.reduce((groups: { func: string; count: number; start: number }[], step, i) => {
                        if (i === 0 || step.func !== a.proc.steps[i-1].func) groups.push({ func: step.func, count: 1, start: i });
                        else groups[groups.length-1].count++;
                        return groups;
                      }, []);
                      const mergeable = consecutiveSameFunc.filter(g => g.count === 1).length;
                      return <div key={a.proc.id} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]">Consolidate single-step function handoffs in <strong>{a.proc.name}</strong> to potentially eliminate {Math.min(mergeable, a.crossFuncHandoffs - 2)} handoffs and reduce cycle time.</span></div>;
                    })}
                    {analysis.filter(a => a.manualSteps >= 3).slice(0, 2).map(a => <div key={`auto-${a.proc.id}`} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--accent-primary)] shrink-0 mt-0.5">→</span><span className="text-[var(--text-secondary)]"><strong>{a.proc.name}</strong> has {a.manualSteps} manual steps — automate data handoffs to reduce processing time and error rates.</span></div>)}
                    {analysis.every(a => a.totalHandoffs <= 4 && a.manualSteps < 3) && <div className="flex items-start gap-2 text-[14px]"><span className="text-[var(--success)] shrink-0 mt-0.5">✓</span><span className="text-[var(--text-secondary)]">No critical bottlenecks detected. Processes are within acceptable complexity thresholds.</span></div>}
                  </div>
                </div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── Step 2.4: Technology & Systems ── */}
        {omView === "2.4" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "portfolio" as const, label: "App Portfolio", icon: "📋" },
              { id: "capmap" as const, label: "Capability Map", icon: "🔗" },
              { id: "rationalize" as const, label: "Rationalization", icon: "🔧" },
              { id: "dataflow" as const, label: "Data Flows", icon: "🔄" },
              { id: "aiready" as const, label: "AI Readiness", icon: "🤖" },
            ]).map(v => <button key={v.id} onClick={() => setTechView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: techView === v.id ? "rgba(212,134,10,0.12)" : "transparent",
              color: techView === v.id ? "#e09040" : "var(--text-muted)",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. APPLICATION PORTFOLIO ─── */}
          {techView === "portfolio" && <Card title="Application Portfolio Inventory">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Enterprise application landscape. Click the pencil to edit, × to remove.</div>
            {/* Filters + summary */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[var(--text-muted)]">Category:</span>
                <select value={techCatFilter} onChange={e => setTechCatFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[14px] text-[var(--text-primary)] outline-none">
                  <option value="All">All</option>{TECH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="text-[13px] text-[var(--text-muted)] ml-2">Status:</span>
                <select value={techStatusFilter} onChange={e => setTechStatusFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[14px] text-[var(--text-primary)] outline-none">
                  <option value="All">All</option><option>Invest</option><option>Maintain</option><option>Migrate</option><option>Retire</option>
                </select>
              </div>
              <button onClick={() => setTechAddingSystem(true)} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>+ Add System</button>
            </div>
            {/* KPIs */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { label: "Total Systems", val: techSystems.length, color: "var(--text-primary)" },
                { label: "Invest", val: techSystems.filter(s => s.status === "Invest").length, color: "var(--success)" },
                { label: "Maintain", val: techSystems.filter(s => s.status === "Maintain").length, color: "var(--accent-primary)" },
                { label: "Migrate", val: techSystems.filter(s => s.status === "Migrate").length, color: "var(--warning)" },
                { label: "Retire", val: techSystems.filter(s => s.status === "Retire").length, color: "var(--risk)" },
              ].map(k => <div key={k.label} className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}
            </div>
            {/* Add form */}
            {techAddingSystem && <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 mb-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add System</div>
              {(() => {
                const [ns, setNs] = [techEditingId ? techSystems.find(s => s.id === techEditingId) : null, null] as const; void ns; void setNs;
                return <div className="grid grid-cols-3 gap-2">
                  <input id="tech-name" placeholder="System name..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="tech-vendor" placeholder="Vendor..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <select id="tech-cat" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none">{TECH_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                  <input id="tech-users" placeholder="# Users..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="tech-cost" placeholder="Annual cost..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="tech-age" placeholder="Age/version..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                </div>;
              })()}
              <div className="flex gap-2">
                <button onClick={() => {
                  const el = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || "";
                  const name = el("tech-name"); if (!name) return;
                  setTechSystems(prev => [...prev, { id: `t${Date.now()}`, name, vendor: el("tech-vendor"), category: el("tech-cat"), functions: [], capabilities: [], processes: [], users: el("tech-users"), annualCost: el("tech-cost"), age: el("tech-age"), integration: "Partial", status: "Maintain", apiReady: "Needs Investment", dataQuality: "Medium" }]);
                  setTechAddingSystem(false);
                }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Add</button>
                <button onClick={() => setTechAddingSystem(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div>}
            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
              {["System","Vendor","Category","Functions","Users","Cost","Age","Integration","Status",""].map(h => <th key={h} className="px-2 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] whitespace-nowrap">{h}</th>)}
            </tr></thead><tbody>
              {techSystems.filter(s => (techCatFilter === "All" || s.category === techCatFilter) && (techStatusFilter === "All" || s.status === techStatusFilter)).map(sys => {
                const statusColors: Record<string, string> = { Invest: "var(--success)", Maintain: "var(--accent-primary)", Migrate: "var(--warning)", Retire: "var(--risk)" };
                const intColors: Record<string, string> = { Standalone: "var(--risk)", Partial: "var(--warning)", "Fully Integrated": "var(--success)" };
                const isEditing = techEditingId === sys.id;
                const update = (field: string, val: unknown) => setTechSystems(prev => prev.map(s => s.id === sys.id ? { ...s, [field]: val } : s));
                return <tr key={sys.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
                  <td className="px-2 py-2 font-semibold text-[var(--text-primary)]">{isEditing ? <input value={sys.name} onChange={e => update("name", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] w-28 outline-none" /> : sys.name}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">{isEditing ? <input value={sys.vendor} onChange={e => update("vendor", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] w-20 outline-none" /> : sys.vendor}</td>
                  <td className="px-2 py-2"><span className="px-1.5 py-0.5 rounded text-[12px] font-semibold bg-[var(--surface-2)] text-[var(--text-secondary)]">{isEditing ? <select value={sys.category} onChange={e => update("category", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none">{TECH_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select> : sys.category}</span></td>
                  <td className="px-2 py-2 text-[13px] text-[var(--text-muted)]">{sys.functions.join(", ") || "—"}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">{sys.users}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">{sys.annualCost}</td>
                  <td className="px-2 py-2 text-[var(--text-muted)]">{sys.age}</td>
                  <td className="px-2 py-2">{isEditing ? <select value={sys.integration} onChange={e => update("integration", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none"><option>Standalone</option><option>Partial</option><option>Fully Integrated</option></select> : <span className="text-[12px] font-semibold" style={{ color: intColors[sys.integration] }}>{sys.integration}</span>}</td>
                  <td className="px-2 py-2">{isEditing ? <select value={sys.status} onChange={e => update("status", e.target.value)} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none"><option>Invest</option><option>Maintain</option><option>Migrate</option><option>Retire</option></select> : <span className="px-1.5 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${statusColors[sys.status]}12`, color: statusColors[sys.status] }}>{sys.status}</span>}</td>
                  <td className="px-2 py-2"><div className="flex gap-1">
                    <button onClick={() => setTechEditingId(isEditing ? null : sys.id)} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">{isEditing ? "✓" : "✎"}</button>
                    <button onClick={() => setTechSystems(prev => prev.filter(s => s.id !== sys.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                  </div></td>
                </tr>;
              })}
            </tbody></table></div>
          </Card>}

          {/* ─── 2. CAPABILITY-TO-SYSTEM MAPPING ─── */}
          {techView === "capmap" && <Card title="Capability-to-System Coverage Map">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Map which systems support which capabilities. Red = unsupported, amber = single system, green = well-covered.</div>
            {(() => {
              const caps = stratCapabilities.length > 0 ? stratCapabilities.slice(0, 12) : activeCoreLayer.map(c => c.replace(archD.coreSuffix, "")).slice(0, 12);
              // Coverage analysis
              const coverage: Record<string, { systems: string[]; level: "none" | "partial" | "covered" | "redundant" }> = {};
              caps.forEach(cap => {
                const linked = techSystems.filter(sys => {
                  const key = `${cap}__${sys.id}`;
                  return techCapMatrix[key] === "1" || sys.capabilities.some(c => c.toLowerCase().includes(cap.toLowerCase().split(" ")[0]));
                });
                coverage[cap] = { systems: linked.map(s => s.name), level: linked.length === 0 ? "none" : linked.length === 1 ? "partial" : linked.length >= 3 ? "redundant" : "covered" };
              });
              const unsupported = Object.entries(coverage).filter(([, v]) => v.level === "none");
              const redundant = Object.entries(coverage).filter(([, v]) => v.level === "redundant");
              return <>
                {/* Summary */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold text-[var(--success)]">{Object.values(coverage).filter(v => v.level === "covered").length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Well Covered</div></div>
                  <div className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold text-[var(--warning)]">{Object.values(coverage).filter(v => v.level === "partial").length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Single System</div></div>
                  <div className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold text-[var(--risk)]">{unsupported.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Unsupported</div></div>
                  <div className="rounded-xl p-2.5 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold text-[var(--purple)]">{redundant.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Redundant (3+)</div></div>
                </div>
                {/* Matrix */}
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
                  <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] sticky left-0 bg-[var(--surface-2)] z-10 min-w-[140px]">Capability</th>
                  {techSystems.map(sys => <th key={sys.id} className="px-1 py-2 text-center border-b border-[var(--border)]" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", minWidth: 32 }}><span className="text-[11px] font-semibold text-[var(--text-muted)]">{sys.name.length > 14 ? sys.name.slice(0, 12) + ".." : sys.name}</span></th>)}
                  <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Level</th>
                </tr></thead><tbody>
                  {caps.map(cap => {
                    const cov = coverage[cap];
                    const levelColors: Record<string, string> = { none: "var(--risk)", partial: "var(--warning)", covered: "var(--success)", redundant: "var(--purple)" };
                    const levelLabels: Record<string, string> = { none: "Gap", partial: "1 sys", covered: "OK", redundant: `${cov.systems.length} sys` };
                    return <tr key={cap} className="border-b border-[var(--border)]">
                      <td className="px-3 py-1.5 text-[13px] font-semibold text-[var(--text-primary)] sticky left-0 bg-[var(--bg)] z-10">{cap}</td>
                      {techSystems.map(sys => {
                        const key = `${cap}__${sys.id}`;
                        const linked = techCapMatrix[key] === "1" || sys.capabilities.some(c => c.toLowerCase().includes(cap.toLowerCase().split(" ")[0]));
                        return <td key={sys.id} className="px-1 py-1.5 text-center"><button onClick={() => setTechCapMatrix(prev => ({ ...prev, [key]: linked ? "" : "1" }))} className="w-5 h-5 rounded transition-all text-[11px]" style={{
                          background: linked ? "rgba(16,185,129,0.15)" : "var(--surface-2)",
                          border: linked ? "1px solid var(--success)" : "1px solid var(--border)",
                          color: linked ? "var(--success)" : "var(--border)",
                        }}>{linked ? "●" : ""}</button></td>;
                      })}
                      <td className="px-2 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${levelColors[cov.level]}12`, color: levelColors[cov.level] }}>{levelLabels[cov.level]}</span></td>
                    </tr>;
                  })}
                </tbody></table></div>
                {/* Alerts */}
                {(unsupported.length > 0 || redundant.length > 0) && <div className="mt-3 space-y-2">
                  {unsupported.length > 0 && <div className="rounded-lg bg-[rgba(239,68,68,0.04)] border border-[var(--risk)]/20 p-3"><div className="text-[13px] font-bold text-[var(--risk)] uppercase mb-1">Unsupported Capabilities</div><div className="flex flex-wrap gap-1">{unsupported.map(([cap]) => <span key={cap} className="px-2 py-0.5 rounded-full text-[12px] bg-[rgba(239,68,68,0.1)] text-[var(--risk)]">{cap}</span>)}</div></div>}
                  {redundant.length > 0 && <div className="rounded-lg bg-[rgba(139,92,246,0.04)] border border-[var(--purple)]/20 p-3"><div className="text-[13px] font-bold text-[var(--purple)] uppercase mb-1">Potential Redundancy (3+ systems)</div>{redundant.map(([cap, v]) => <div key={cap} className="text-[13px] text-[var(--text-secondary)] mt-1"><strong>{cap}</strong>: {v.systems.join(", ")}</div>)}</div>}
                </div>}
              </>;
            })()}
          </Card>}

          {/* ─── 3. SYSTEM RATIONALIZATION ─── */}
          {techView === "rationalize" && <Card title="System Rationalization Analyzer">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Auto-detects redundant systems by category. Estimates consolidation savings and recommends action.</div>
            {(() => {
              // Group by category, find duplicates
              const catGroups: Record<string, TechSystem[]> = {};
              techSystems.forEach(s => { if (!catGroups[s.category]) catGroups[s.category] = []; catGroups[s.category].push(s); });
              const redundancies = Object.entries(catGroups).filter(([, syss]) => syss.length >= 2).sort((a, b) => b[1].length - a[1].length);
              const retireTargets = techSystems.filter(s => s.status === "Retire" || s.status === "Migrate");
              // Parse cost for estimation
              const parseCost = (c: string) => { const m = c.replace(/[^0-9.KMk]/g, ""); const num = parseFloat(m); if (c.toLowerCase().includes("m")) return num * 1000000; if (c.toLowerCase().includes("k")) return num * 1000; return num || 0; };
              const fmtCostShort = (n: number) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;
              const potentialSavings = retireTargets.reduce((s, sys) => s + parseCost(sys.annualCost), 0);

              return <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold text-[var(--purple)]">{redundancies.length}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Redundant Categories</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold text-[var(--warning)]">{retireTargets.length}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Migrate/Retire</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold text-[var(--success)]">{potentialSavings > 0 ? fmtCostShort(potentialSavings) : "—"}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Potential Savings</div></div>
                </div>
                {/* Redundancy cards */}
                {redundancies.map(([cat, syss]) => {
                  const totalCost = syss.reduce((s, sys) => s + parseCost(sys.annualCost), 0);
                  const savingsEst = syss.length >= 3 ? totalCost * 0.4 : totalCost * 0.25;
                  const complexity = syss.some(s => s.integration === "Fully Integrated") ? "High" : syss.some(s => s.integration === "Partial") ? "Medium" : "Low";
                  const complexityColor = complexity === "High" ? "var(--risk)" : complexity === "Medium" ? "var(--warning)" : "var(--success)";
                  return <div key={cat} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div><span className="text-[15px] font-bold text-[var(--text-primary)]">{cat}</span><span className="text-[14px] text-[var(--text-muted)] ml-2">— {syss.length} systems</span></div>
                      <div className="flex gap-3 text-[14px]">
                        <span className="text-[var(--text-muted)]">Total: {fmtCostShort(totalCost)}/yr</span>
                        <span className="text-[var(--success)] font-semibold">Savings: ~{fmtCostShort(savingsEst)}/yr</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-3">{syss.map(sys => {
                      const statusColors: Record<string, string> = { Invest: "var(--success)", Maintain: "var(--accent-primary)", Migrate: "var(--warning)", Retire: "var(--risk)" };
                      return <div key={sys.id} className="rounded-lg p-2.5 bg-[var(--bg)] border border-[var(--border)]">
                        <div className="text-[14px] font-semibold text-[var(--text-primary)]">{sys.name}</div>
                        <div className="text-[12px] text-[var(--text-muted)]">{sys.vendor} · {sys.age}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[12px] text-[var(--text-secondary)]">{sys.annualCost}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${statusColors[sys.status]}12`, color: statusColors[sys.status] }}>{sys.status}</span>
                        </div>
                      </div>;
                    })}</div>
                    <div className="flex items-center gap-4 text-[13px]">
                      <span className="text-[var(--text-muted)]">Migration complexity: <strong style={{ color: complexityColor }}>{complexity}</strong></span>
                      <span className="text-[var(--text-muted)]">Recommendation: <strong className="text-[var(--accent-primary)]">{syss.length >= 3 ? `Consolidate to 1-2 systems — save ~${fmtCostShort(savingsEst)}/yr` : `Evaluate consolidation — potential ${fmtCostShort(savingsEst)}/yr savings`}</strong></span>
                    </div>
                  </div>;
                })}
                {redundancies.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">No redundant system categories detected. Each category has a single system.</div>}
                {/* Quick wins */}
                {retireTargets.length > 0 && <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-4">
                  <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Quick Wins — Systems Marked for Retire/Migrate</div>
                  <div className="space-y-2">{retireTargets.map(sys => <div key={sys.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)]">
                    <div><span className="text-[14px] font-semibold text-[var(--text-primary)]">{sys.name}</span><span className="text-[13px] text-[var(--text-muted)] ml-2">{sys.vendor} · {sys.category}</span></div>
                    <div className="flex items-center gap-3"><span className="text-[14px] text-[var(--text-secondary)]">{sys.annualCost}/yr</span><span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: sys.status === "Retire" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: sys.status === "Retire" ? "var(--risk)" : "var(--warning)" }}>{sys.status}</span></div>
                  </div>)}</div>
                </div>}
              </div>;
            })()}
          </Card>}

          {/* ─── 4. DATA FLOW MAPPING ─── */}
          {techView === "dataflow" && <Card title="Data Flow Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">For each core process, map which systems are involved and how data flows between them. Flag manual transfers.</div>
            <div className="space-y-4">
              {procProcesses.map(proc => {
                const flow = techDataFlows[proc.id] || { systems: [], dataTypes: [], manualFlags: [] };
                // Auto-detect systems from process steps
                const autoSystems = Array.from(new Set(proc.steps.map(s => s.system).filter(Boolean).flatMap(s => s.split("/")))).slice(0, 6);
                const displaySystems = flow.systems.length > 0 ? flow.systems : autoSystems;
                return <div key={proc.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[15px] font-bold text-[var(--text-primary)] mb-3">{proc.name}</div>
                  {/* Flow visualization */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3">
                    {displaySystems.map((sys, i) => {
                      const isManual = flow.manualFlags.includes(sys);
                      const matchedTech = techSystems.find(t => t.name.toLowerCase().includes(sys.toLowerCase()) || sys.toLowerCase().includes(t.name.toLowerCase().split(" ")[0]));
                      return <React.Fragment key={`${proc.id}-${sys}-${i}`}>
                        {i > 0 && <div className="flex flex-col items-center shrink-0 px-1">
                          <span className="text-[14px]" style={{ color: isManual ? "var(--risk)" : "var(--success)" }}>{isManual ? "✋" : "→"}</span>
                          <span className="text-[10px]" style={{ color: isManual ? "var(--risk)" : "var(--text-muted)" }}>{isManual ? "Manual" : "Auto"}</span>
                        </div>}
                        <div className="rounded-lg px-3 py-2 shrink-0 text-center min-w-[100px]" style={{
                          background: matchedTech ? `${matchedTech.status === "Retire" ? "rgba(239,68,68,0.06)" : "var(--surface-2)"}` : "var(--bg)",
                          border: `1px solid ${matchedTech?.status === "Retire" ? "var(--risk)" : isManual ? "var(--warning)" : "var(--border)"}`,
                        }}>
                          <div className="text-[13px] font-semibold text-[var(--text-primary)]">{sys}</div>
                          {matchedTech && <div className="text-[11px] text-[var(--text-muted)]">{matchedTech.vendor}</div>}
                        </div>
                      </React.Fragment>;
                    })}
                  </div>
                  {/* Edit flow */}
                  <div className="flex gap-2">
                    <input value={(flow.systems || []).join(", ")} onChange={e => setTechDataFlows(prev => ({ ...prev, [proc.id]: { ...flow, systems: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } }))} placeholder="Systems in order (comma-separated)..." className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                    <input value={(flow.manualFlags || []).join(", ")} onChange={e => setTechDataFlows(prev => ({ ...prev, [proc.id]: { ...flow, manualFlags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } }))} placeholder="Manual transfer points..." className="w-48 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  </div>
                </div>;
              })}
            </div>
            <div className="flex gap-3 mt-3 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="text-[var(--success)]">→</span> Automated integration</span>
              <span className="flex items-center gap-1"><span className="text-[var(--risk)]">✋</span> Manual data transfer — error-prone</span>
            </div>
          </Card>}

          {/* ─── 5. AI/AUTOMATION READINESS ─── */}
          {techView === "aiready" && <Card title="AI/Automation Readiness per System">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assess each system{"'"}s ability to integrate with AI tools. Score API availability, data accessibility, and automation potential.</div>
            {/* Summary */}
            {(() => {
              const ready = techSystems.filter(s => s.apiReady === "Ready").length;
              const needsInv = techSystems.filter(s => s.apiReady === "Needs Investment").length;
              const notComp = techSystems.filter(s => s.apiReady === "Not Compatible").length;
              const readyPct = techSystems.length ? Math.round((ready / techSystems.length) * 100) : 0;
              return <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[22px] font-extrabold" style={{ color: readyPct >= 60 ? "var(--success)" : readyPct >= 30 ? "var(--warning)" : "var(--risk)" }}>{readyPct}%</div><div className="text-[13px] text-[var(--text-muted)] uppercase">AI Ready</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{ready}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Ready</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{needsInv}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Needs Investment</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--risk)]">{notComp}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Not Compatible</div></div>
              </div>;
            })()}
            {/* System readiness table */}
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">System</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Category</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Integration</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">API Ready</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Data Quality</th>
              <th className="px-2 py-2 text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">AI Score</th>
            </tr></thead><tbody>
              {techSystems.map(sys => {
                const apiColors: Record<string, string> = { Ready: "var(--success)", "Needs Investment": "var(--warning)", "Not Compatible": "var(--risk)" };
                const dqColors: Record<string, string> = { High: "var(--success)", Medium: "var(--warning)", Low: "var(--risk)" };
                const aiScore = (sys.apiReady === "Ready" ? 3 : sys.apiReady === "Needs Investment" ? 1.5 : 0) + (sys.integration === "Fully Integrated" ? 1 : sys.integration === "Partial" ? 0.5 : 0) + (sys.dataQuality === "High" ? 1 : sys.dataQuality === "Medium" ? 0.5 : 0);
                const maxScore = 5;
                const aiPct = Math.round((aiScore / maxScore) * 100);
                return <tr key={sys.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2"><div className="text-[14px] font-semibold text-[var(--text-primary)]">{sys.name}</div><div className="text-[12px] text-[var(--text-muted)]">{sys.vendor}</div></td>
                  <td className="px-2 py-2 text-center text-[13px] text-[var(--text-secondary)]">{sys.category}</td>
                  <td className="px-2 py-2 text-center">
                    <select value={sys.integration} onChange={e => setTechSystems(prev => prev.map(s => s.id === sys.id ? { ...s, integration: e.target.value as TechSystem["integration"] } : s))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none">{(["Standalone", "Partial", "Fully Integrated"] as const).map(o => <option key={o} value={o}>{o}</option>)}</select>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <select value={sys.apiReady} onChange={e => setTechSystems(prev => prev.map(s => s.id === sys.id ? { ...s, apiReady: e.target.value as TechSystem["apiReady"] } : s))} className="bg-[var(--bg)] border rounded px-1 py-0.5 text-[12px] font-semibold outline-none" style={{ borderColor: `${apiColors[sys.apiReady]}40`, color: apiColors[sys.apiReady] }}>{(["Ready", "Needs Investment", "Not Compatible"] as const).map(o => <option key={o} value={o}>{o}</option>)}</select>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <select value={sys.dataQuality} onChange={e => setTechSystems(prev => prev.map(s => s.id === sys.id ? { ...s, dataQuality: e.target.value } : s))} className="bg-[var(--bg)] border rounded px-1 py-0.5 text-[12px] font-semibold outline-none" style={{ borderColor: `${dqColors[sys.dataQuality] || "var(--text-muted)"}40`, color: dqColors[sys.dataQuality] || "var(--text-muted)" }}><option>High</option><option>Medium</option><option>Low</option></select>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center gap-1 justify-center"><div className="w-12 h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${aiPct}%`, background: aiPct >= 70 ? "var(--success)" : aiPct >= 40 ? "var(--warning)" : "var(--risk)" }} /></div><span className="text-[12px] font-bold" style={{ color: aiPct >= 70 ? "var(--success)" : aiPct >= 40 ? "var(--warning)" : "var(--risk)" }}>{aiPct}%</span></div>
                  </td>
                </tr>;
              })}
            </tbody></table></div>
            {/* Recommendations */}
            {(() => {
              const blockers = techSystems.filter(s => s.apiReady === "Not Compatible" && s.status !== "Retire");
              const lowData = techSystems.filter(s => s.dataQuality === "Low" && s.status !== "Retire");
              if (blockers.length === 0 && lowData.length === 0) return null;
              return <div className="mt-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-4">
                <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">AI Readiness Recommendations</div>
                <div className="space-y-2">
                  {blockers.map(s => <div key={s.id} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--risk)] shrink-0 mt-0.5">✗</span><span className="text-[var(--text-secondary)]"><strong>{s.name}</strong> is not AI-compatible — consider migrating to {s.category === "GRC" ? "a modern cloud GRC platform" : s.category === "ERP" ? "a cloud ERP with API layer" : "a platform with REST APIs"} to enable AI integration.</span></div>)}
                  {lowData.map(s => <div key={s.id} className="flex items-start gap-2 text-[14px]"><span className="text-[var(--warning)] shrink-0 mt-0.5">⚠</span><span className="text-[var(--text-secondary)]"><strong>{s.name}</strong> has low data quality — AI models trained on poor data will produce unreliable results. Invest in data cleansing before AI deployment.</span></div>)}
                </div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── PEOPLE & CULTURE TAB ── */}
        {omView === "3.2" && <div className="animate-tab-enter space-y-5">
          {/* Sub-navigation */}
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "culture" as const, label: "Culture Assessment", icon: "🎭" },
              { id: "ways" as const, label: "Ways of Working", icon: "🔧" },
              { id: "leadership" as const, label: "Leadership Model", icon: "👑" },
              { id: "capacity" as const, label: "Change Capacity", icon: "📊" },
            ]).map(v => <button key={v.id} onClick={() => setPcView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: pcView === v.id ? "rgba(212,134,10,0.12)" : "transparent",
              color: pcView === v.id ? "#e09040" : "var(--text-muted)",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. CULTURE ASSESSMENT ─── */}
          {pcView === "culture" && <Card title="Culture Assessment — Current vs. Required">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Score your current culture and the culture required for the target operating model on each dimension (1-5).</div>
            {/* Radar chart */}
            {(() => {
              const hasData = Object.keys(cultureCurrent).length > 0 || Object.keys(cultureTarget).length > 0;
              const radarData = CULTURE_DIMS.map(d => ({ subject: d.right, current: cultureCurrent[d.id] || 0, required: cultureTarget[d.id] || 0, max: 5 }));
              const gaps = CULTURE_DIMS.map(d => ({ dim: d, current: cultureCurrent[d.id] || 0, target: cultureTarget[d.id] || 0, gap: (cultureTarget[d.id] || 0) - (cultureCurrent[d.id] || 0) })).filter(g => g.current > 0 && g.target > 0).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
              const biggestGap = gaps.length > 0 ? gaps[0] : null;
              return <>
                {hasData && <div className="h-[280px] mb-4"><RadarViz data={radarData} /></div>}
                {biggestGap && Math.abs(biggestGap.gap) >= 2 && <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(245,158,11,0.04)] px-4 py-3 mb-4">
                  <div className="text-[14px] text-[var(--warning)]">
                    <strong>Biggest culture gap:</strong> Your culture is <strong>{biggestGap.gap < 0 ? biggestGap.dim.right : biggestGap.dim.left}</strong> ({biggestGap.current}/5) but your target operating model requires <strong>{biggestGap.gap > 0 ? biggestGap.dim.right : biggestGap.dim.left}</strong> ({biggestGap.target}/5) — gap of {Math.abs(biggestGap.gap).toFixed(0)} levels.
                  </div>
                </div>}
              </>;
            })()}
            {/* Scoring table */}
            <div className="space-y-4">
              {CULTURE_DIMS.map(dim => {
                const cur = cultureCurrent[dim.id] || 0;
                const tgt = cultureTarget[dim.id] || 0;
                const gap = cur > 0 && tgt > 0 ? tgt - cur : 0;
                return <div key={dim.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><span>{dim.leftIcon}</span><span className="text-[14px] font-semibold text-[var(--text-muted)]">{dim.left}</span></div>
                    {gap !== 0 && <span className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: Math.abs(gap) >= 2 ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: Math.abs(gap) >= 2 ? "var(--risk)" : "var(--warning)" }}>Gap: {gap > 0 ? "+" : ""}{gap}</span>}
                    <div className="flex items-center gap-2"><span className="text-[14px] font-semibold text-[var(--text-muted)]">{dim.right}</span><span>{dim.rightIcon}</span></div>
                  </div>
                  {/* Current */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] text-[var(--text-muted)] w-16 shrink-0 uppercase">Current</span>
                    <div className="flex gap-1 flex-1 justify-center">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setCultureCurrent(p => ({...p, [dim.id]: p[dim.id] === n ? 0 : n}))} className="w-9 h-7 rounded-lg text-[14px] font-bold transition-all" style={{
                      background: cur >= n ? "rgba(212,134,10,0.15)" : "var(--bg)", color: cur >= n ? "var(--accent-primary)" : "var(--text-muted)", border: cur >= n ? "1px solid var(--accent-primary)" : "1px solid var(--border)",
                    }}>{n}</button>)}</div>
                  </div>
                  {/* Target */}
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--text-muted)] w-16 shrink-0 uppercase">Required</span>
                    <div className="flex gap-1 flex-1 justify-center">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setCultureTarget(p => ({...p, [dim.id]: p[dim.id] === n ? 0 : n}))} className="w-9 h-7 rounded-lg text-[14px] font-bold transition-all" style={{
                      background: tgt >= n ? "rgba(16,185,129,0.15)" : "var(--bg)", color: tgt >= n ? "var(--success)" : "var(--text-muted)", border: tgt >= n ? "1px solid var(--success)" : "1px solid var(--border)",
                    }}>{n}</button>)}</div>
                  </div>
                </div>;
              })}
            </div>
            <div className="flex gap-4 mt-3 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[rgba(212,134,10,0.15)] border border-[var(--accent-primary)]" /> Current</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[rgba(16,185,129,0.15)] border border-[var(--success)]" /> Required</span>
              <span>1 = Left anchor, 5 = Right anchor</span>
            </div>
          </Card>}

          {/* ─── 2. WAYS OF WORKING ─── */}
          {pcView === "ways" && <Card title="Ways of Working — Current vs. Target">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define how each function works today and how they should work in the target operating model.</div>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Function</th>
              {["Work Model", "Methodology", "Decision-Making", "Meeting Cadence", "Collaboration Tools"].map(h => <th key={h} className="px-1 py-2 text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]" colSpan={2}>{h}<div className="flex justify-center gap-1 mt-0.5"><span className="text-[10px] text-[var(--accent-primary)]">Now</span><span className="text-[10px] text-[var(--success)]">Target</span></div></th>)}
            </tr></thead><tbody>
              {wowData.map((row, ri) => {
                const update = (field: keyof Omit<WowRow, "func">, which: "current" | "target", val: string) => setWowData(prev => prev.map((r, i) => i === ri ? { ...r, [field]: { ...r[field], [which]: val } } : r));
                const selCls = "bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-full";
                const changed = (f: keyof Omit<WowRow, "func">) => row[f].current !== row[f].target;
                const cellBg = (f: keyof Omit<WowRow, "func">) => changed(f) ? "rgba(245,158,11,0.04)" : "";
                return <tr key={row.func} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{row.func}</td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("workModel") }}><select value={row.workModel.current} onChange={e => update("workModel", "current", e.target.value)} className={selCls}><option>Fully office</option><option>Hybrid</option><option>Fully remote</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("workModel") }}><select value={row.workModel.target} onChange={e => update("workModel", "target", e.target.value)} className={selCls} style={{ color: changed("workModel") ? "var(--success)" : undefined }}><option>Fully office</option><option>Hybrid</option><option>Fully remote</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("methodology") }}><select value={row.methodology.current} onChange={e => update("methodology", "current", e.target.value)} className={selCls}><option>Agile</option><option>Waterfall</option><option>Hybrid</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("methodology") }}><select value={row.methodology.target} onChange={e => update("methodology", "target", e.target.value)} className={selCls} style={{ color: changed("methodology") ? "var(--success)" : undefined }}><option>Agile</option><option>Waterfall</option><option>Hybrid</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("decisionMaking") }}><select value={row.decisionMaking.current} onChange={e => update("decisionMaking", "current", e.target.value)} className={selCls}><option>Consensus</option><option>Delegated</option><option>Hierarchical</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("decisionMaking") }}><select value={row.decisionMaking.target} onChange={e => update("decisionMaking", "target", e.target.value)} className={selCls} style={{ color: changed("decisionMaking") ? "var(--success)" : undefined }}><option>Consensus</option><option>Delegated</option><option>Hierarchical</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("meetingCadence") }}><select value={row.meetingCadence.current} onChange={e => update("meetingCadence", "current", e.target.value)} className={selCls}><option>Daily standup</option><option>Weekly team</option><option>Bi-weekly sprint</option><option>Monthly review</option></select></td>
                  <td className="px-1 py-1.5" style={{ background: cellBg("meetingCadence") }}><select value={row.meetingCadence.target} onChange={e => update("meetingCadence", "target", e.target.value)} className={selCls} style={{ color: changed("meetingCadence") ? "var(--success)" : undefined }}><option>Daily standup</option><option>Weekly team</option><option>Bi-weekly sprint</option><option>Monthly review</option></select></td>
                  <td className="px-1 py-1.5"><input value={row.tools.current} onChange={e => update("tools", "current", e.target.value)} placeholder="Current..." className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-full placeholder:text-[var(--text-muted)]" /></td>
                  <td className="px-1 py-1.5"><input value={row.tools.target} onChange={e => update("tools", "target", e.target.value)} placeholder="Target..." className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-full placeholder:text-[var(--text-muted)]" style={{ color: row.tools.current !== row.tools.target && row.tools.target ? "var(--success)" : undefined }} /></td>
                </tr>;
              })}
            </tbody></table></div>
            {/* Change summary */}
            {(() => {
              const totalChanges = wowData.reduce((s, r) => s + (["workModel", "methodology", "decisionMaking", "meetingCadence"] as const).filter(f => r[f].current !== r[f].target).length, 0);
              return totalChanges > 0 ? <div className="mt-3 rounded-lg bg-[rgba(245,158,11,0.04)] border border-[var(--warning)]/20 px-4 py-2 text-[14px] text-[var(--warning)]">{totalChanges} way-of-working change{totalChanges > 1 ? "s" : ""} planned across {wowData.filter(r => (["workModel", "methodology", "decisionMaking", "meetingCadence"] as const).some(f => r[f].current !== r[f].target)).length} functions. Amber-highlighted cells show shifts.</div> : null;
            })()}
          </Card>}

          {/* ─── 3. LEADERSHIP MODEL ─── */}
          {pcView === "leadership" && <Card title="Leadership Competency Model">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Rate your current leadership team against the competencies required for the target operating model.</div>
            {/* Radar */}
            {(() => {
              const hasData = Object.values(leadershipScores).some(v => v.current > 0 || v.required > 0);
              if (!hasData) return null;
              const radarData = LEADERSHIP_COMPETENCIES.map(c => ({ subject: c.name.length > 14 ? c.name.slice(0, 12) + ".." : c.name, current: leadershipScores[c.id]?.current || 0, required: leadershipScores[c.id]?.required || 0, max: 5 }));
              return <div className="h-[260px] mb-4"><RadarViz data={radarData} /></div>;
            })()}
            {/* Competency cards */}
            <div className="space-y-3">
              {LEADERSHIP_COMPETENCIES.map(comp => {
                const scores = leadershipScores[comp.id] || { current: 0, required: 0 };
                const gap = scores.current > 0 && scores.required > 0 ? scores.current - scores.required : 0;
                return <div key={comp.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[15px] font-bold text-[var(--text-primary)]">{comp.name}</div>
                      <div className="text-[13px] text-[var(--text-muted)]">{comp.desc}</div>
                    </div>
                    {gap !== 0 && <span className="px-2 py-0.5 rounded-full text-[12px] font-bold shrink-0 ml-3" style={{ background: gap < -1 ? "rgba(239,68,68,0.1)" : gap < 0 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)", color: gap < -1 ? "var(--risk)" : gap < 0 ? "var(--warning)" : "var(--success)" }}>Gap: {gap > 0 ? "+" : ""}{gap}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[12px] text-[var(--text-muted)] uppercase">Current Strength</span>
                      <div className="flex gap-1 mt-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setLeadershipScores(p => ({...p, [comp.id]: { ...scores, current: scores.current === n ? 0 : n }}))} className="w-8 h-6 rounded text-[13px] font-bold transition-all" style={{
                        background: scores.current >= n ? "rgba(212,134,10,0.15)" : "var(--bg)", color: scores.current >= n ? "var(--accent-primary)" : "var(--text-muted)", border: scores.current >= n ? "1px solid var(--accent-primary)" : "1px solid var(--border)",
                      }}>{n}</button>)}</div>
                    </div>
                    <div>
                      <span className="text-[12px] text-[var(--text-muted)] uppercase">Required Level</span>
                      <div className="flex gap-1 mt-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setLeadershipScores(p => ({...p, [comp.id]: { ...scores, required: scores.required === n ? 0 : n }}))} className="w-8 h-6 rounded text-[13px] font-bold transition-all" style={{
                        background: scores.required >= n ? "rgba(16,185,129,0.15)" : "var(--bg)", color: scores.required >= n ? "var(--success)" : "var(--text-muted)", border: scores.required >= n ? "1px solid var(--success)" : "1px solid var(--border)",
                      }}>{n}</button>)}</div>
                    </div>
                  </div>
                </div>;
              })}
            </div>
            {/* Gap summary */}
            {(() => {
              const gaps = LEADERSHIP_COMPETENCIES.map(c => ({ name: c.name, gap: (leadershipScores[c.id]?.current || 0) - (leadershipScores[c.id]?.required || 0) })).filter(g => leadershipScores[g.name.toLowerCase().replace(/ /g, "")] || Object.keys(leadershipScores).some(k => { const comp = LEADERSHIP_COMPETENCIES.find(c => c.id === k); return comp?.name === g.name && ((leadershipScores[k]?.current || 0) > 0); }));
              const scored = LEADERSHIP_COMPETENCIES.filter(c => leadershipScores[c.id]?.current > 0 && leadershipScores[c.id]?.required > 0);
              const strengths = scored.filter(c => (leadershipScores[c.id]?.current || 0) >= (leadershipScores[c.id]?.required || 0));
              const weaknesses = scored.filter(c => (leadershipScores[c.id]?.current || 0) < (leadershipScores[c.id]?.required || 0)).sort((a, b) => ((leadershipScores[a.id]?.current || 0) - (leadershipScores[a.id]?.required || 0)) - ((leadershipScores[b.id]?.current || 0) - (leadershipScores[b.id]?.required || 0)));
              if (scored.length === 0) return null;
              return <div className="mt-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-4">
                <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Leadership Gap Analysis</div>
                {strengths.length > 0 && <div className="text-[14px] text-[var(--text-secondary)] mb-2"><strong className="text-[var(--success)]">Strengths:</strong> {strengths.map(c => c.name).join(", ")}</div>}
                {weaknesses.length > 0 && <div className="space-y-1">{weaknesses.map(c => <div key={c.id} className="text-[14px] text-[var(--text-secondary)]"><span className="text-[var(--risk)]">→</span> <strong>{c.name}</strong>: current {leadershipScores[c.id]?.current}/5 vs. required {leadershipScores[c.id]?.required}/5 — invest in development</div>)}</div>}
              </div>;
            })()}
          </Card>}

          {/* ─── 4. CHANGE CAPACITY ASSESSMENT ─── */}
          {pcView === "capacity" && <Card title="Change Capacity Assessment">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assess your organization{"'"}s ability to absorb transformation. Overloading change capacity is the #1 reason transformations fail.</div>
            <div className="grid grid-cols-2 gap-5">
              {/* Left: inputs */}
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Active Change Initiatives</label>
                  <input value={changeLoad.active} onChange={e => setChangeLoad(p => ({...p, active: e.target.value}))} placeholder="e.g. ERP migration, org restructure, AI rollout, new CRM..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <div className="text-[12px] text-[var(--text-muted)] mt-1">Count: {changeLoad.active ? changeLoad.active.split(",").filter(Boolean).length : 0} initiatives</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Change Fatigue Level</label>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, fatigue: p.fatigue === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold transition-all" style={{
                    background: changeLoad.fatigue >= n ? `${n <= 2 ? "var(--success)" : n <= 3 ? "var(--warning)" : "var(--risk)"}15` : "var(--bg)",
                    color: changeLoad.fatigue >= n ? (n <= 2 ? "var(--success)" : n <= 3 ? "var(--warning)" : "var(--risk)") : "var(--text-muted)",
                    border: changeLoad.fatigue >= n ? `1px solid ${n <= 2 ? "var(--success)" : n <= 3 ? "var(--warning)" : "var(--risk)"}` : "1px solid var(--border)",
                  }}>{n}</button>)}</div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1"><span>Low fatigue</span><span>Severe fatigue</span></div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Change Infrastructure</label>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, infrastructure: p.infrastructure === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold transition-all" style={{
                    background: changeLoad.infrastructure >= n ? `${n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)"}15` : "var(--bg)",
                    color: changeLoad.infrastructure >= n ? (n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)") : "var(--text-muted)",
                    border: changeLoad.infrastructure >= n ? `1px solid ${n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)"}` : "1px solid var(--border)",
                  }}>{n}</button>)}</div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1"><span>No change team</span><span>Mature change org</span></div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Historical Change Success</label>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, history: p.history === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold transition-all" style={{
                    background: changeLoad.history >= n ? `${n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)"}15` : "var(--bg)",
                    color: changeLoad.history >= n ? (n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)") : "var(--text-muted)",
                    border: changeLoad.history >= n ? `1px solid ${n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)"}` : "1px solid var(--border)",
                  }}>{n}</button>)}</div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1"><span>Most changes fail</span><span>Strong track record</span></div>
                </div>
              </div>
              {/* Right: output */}
              <div className="space-y-4">
                {(() => {
                  const activeCount = changeLoad.active ? changeLoad.active.split(",").filter(Boolean).length : 0;
                  const capacity = Math.max(1, Math.round((changeLoad.infrastructure || 1) * 1.5 + (changeLoad.history || 1) * 0.5 - (changeLoad.fatigue || 3) * 0.5 + 1));
                  const loadPct = activeCount > 0 ? Math.round((activeCount / capacity) * 100) : 0;
                  const status = loadPct > 120 ? "Over Capacity" : loadPct > 80 ? "At Capacity" : loadPct > 0 ? "Has Room" : "Not Assessed";
                  const statusColor = loadPct > 120 ? "var(--risk)" : loadPct > 80 ? "var(--warning)" : "var(--success)";
                  return <>
                    {/* Gauge */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center">
                      <div className="text-[14px] text-[var(--text-muted)] uppercase mb-2">Change Capacity Status</div>
                      <div className="text-[36px] font-extrabold mb-1" style={{ color: statusColor }}>{status}</div>
                      <div className="h-4 bg-[var(--bg)] rounded-full overflow-hidden mx-auto max-w-[250px] mb-3">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(loadPct, 150)}%`, background: `linear-gradient(to right, var(--success), ${loadPct > 80 ? "var(--warning)" : "var(--success)"}, ${loadPct > 100 ? "var(--risk)" : "var(--success)"})` }} />
                      </div>
                      <div className="text-[15px] text-[var(--text-secondary)]">
                        Your organization can absorb <strong style={{ color: "var(--accent-primary)" }}>~{capacity}</strong> concurrent change initiatives.
                        {activeCount > 0 && <> You currently have <strong style={{ color: activeCount > capacity ? "var(--risk)" : "var(--success)" }}>{activeCount}</strong>.</>}
                      </div>
                    </div>
                    {/* Dimension scores */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Fatigue", val: changeLoad.fatigue, invert: true, desc: changeLoad.fatigue >= 4 ? "High fatigue — reduce load" : changeLoad.fatigue >= 2 ? "Moderate" : "Low fatigue" },
                        { label: "Infrastructure", val: changeLoad.infrastructure, invert: false, desc: changeLoad.infrastructure >= 4 ? "Strong change team" : changeLoad.infrastructure >= 2 ? "Basic support" : "No change team" },
                        { label: "Track Record", val: changeLoad.history, invert: false, desc: changeLoad.history >= 4 ? "Strong success history" : changeLoad.history >= 2 ? "Mixed results" : "Poor track record" },
                        { label: "Load", val: activeCount, invert: true, desc: `${activeCount} active initiative${activeCount !== 1 ? "s" : ""}`, raw: true },
                      ].map(d => <div key={d.label} className="rounded-xl p-3 bg-[var(--bg)] text-center">
                        <div className="text-[18px] font-extrabold" style={{ color: d.raw ? (activeCount > capacity ? "var(--risk)" : "var(--success)") : (d.invert ? (d.val >= 4 ? "var(--risk)" : d.val >= 2 ? "var(--warning)" : "var(--success)") : (d.val >= 4 ? "var(--success)" : d.val >= 2 ? "var(--warning)" : "var(--risk)")) }}>{d.raw ? activeCount : d.val || "—"}</div>
                        <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase">{d.label}</div>
                        <div className="text-[12px] text-[var(--text-muted)]">{d.desc}</div>
                      </div>)}
                    </div>
                    {/* Recommendation */}
                    <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-4">
                      <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-2">Recommendation</div>
                      <div className="text-[14px] text-[var(--text-secondary)]">
                        {loadPct > 120 ? `You are over capacity. Consider pausing or sequencing ${activeCount - capacity} initiative${activeCount - capacity > 1 ? "s" : ""}. Running too many changes simultaneously increases failure risk by 60%.` :
                         loadPct > 80 ? "You are near capacity. Be cautious about adding new initiatives. Prioritize and sequence remaining changes carefully." :
                         activeCount > 0 ? `You have room for ${capacity - activeCount} more concurrent initiative${capacity - activeCount > 1 ? "s" : ""}. Your change infrastructure can support additional transformation work.` :
                         "Enter your active change initiatives to assess capacity."}
                      </div>
                      {changeLoad.fatigue >= 4 && <div className="text-[14px] text-[var(--text-secondary)] mt-2"><span className="text-[var(--risk)]">⚠</span> High change fatigue detected. Consider a &quot;change holiday&quot; — pause non-critical changes for 1-2 months to rebuild organizational resilience.</div>}
                    </div>
                  </>;
                })()}
              </div>
            </div>
          </Card>}
        </div>}

        {/* ── Step 3.3: Workforce Model ── */}
        {omView === "3.3" && <div className="animate-tab-enter space-y-5">
          <Card title="Step 3.3 — Workforce Model & Change Capacity">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assess your organization{"'"}s capacity to absorb transformation and define workforce requirements.</div>
          </Card>
          {/* Reuse change capacity from People & Culture */}
          <Card title="Change Capacity Assessment">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Active Change Initiatives</label><input value={changeLoad.active} onChange={e => setChangeLoad(p => ({...p, active: e.target.value}))} placeholder="e.g. ERP migration, org restructure, AI rollout..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /><div className="text-[12px] text-[var(--text-muted)] mt-1">Count: {changeLoad.active ? changeLoad.active.split(",").filter(Boolean).length : 0}</div></div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Change Fatigue (1-5)</label><div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, fatigue: p.fatigue === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold" style={{ background: changeLoad.fatigue >= n ? `${n <= 2 ? "var(--success)" : n <= 3 ? "var(--warning)" : "var(--risk)"}15` : "var(--bg)", color: changeLoad.fatigue >= n ? (n <= 2 ? "var(--success)" : n <= 3 ? "var(--warning)" : "var(--risk)") : "var(--text-muted)", border: changeLoad.fatigue >= n ? `1px solid ${n <= 2 ? "var(--success)" : n <= 3 ? "var(--warning)" : "var(--risk)"}` : "1px solid var(--border)" }}>{n}</button>)}</div></div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><label className="text-[14px] font-bold text-[var(--text-primary)] block mb-2">Change Infrastructure (1-5)</label><div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setChangeLoad(p => ({...p, infrastructure: p.infrastructure === n ? 0 : n}))} className="flex-1 py-2 rounded-lg text-[14px] font-bold" style={{ background: changeLoad.infrastructure >= n ? `${n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)"}15` : "var(--bg)", color: changeLoad.infrastructure >= n ? (n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)") : "var(--text-muted)", border: changeLoad.infrastructure >= n ? `1px solid ${n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)"}` : "1px solid var(--border)" }}>{n}</button>)}</div></div>
              </div>
              <div className="space-y-4">
                {(() => { const activeCount = changeLoad.active ? changeLoad.active.split(",").filter(Boolean).length : 0; const capacity = Math.max(1, Math.round((changeLoad.infrastructure || 1) * 1.5 + (changeLoad.history || 1) * 0.5 - (changeLoad.fatigue || 3) * 0.5 + 1)); const status = activeCount > capacity * 1.2 ? "Over Capacity" : activeCount > capacity * 0.8 ? "At Capacity" : activeCount > 0 ? "Has Room" : "Not Assessed"; const statusColor = activeCount > capacity * 1.2 ? "var(--risk)" : activeCount > capacity * 0.8 ? "var(--warning)" : "var(--success)"; return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center"><div className="text-[14px] text-[var(--text-muted)] uppercase mb-2">Change Capacity</div><div className="text-[32px] font-extrabold mb-1" style={{ color: statusColor }}>{status}</div><div className="text-[14px] text-[var(--text-secondary)]">Can absorb ~{capacity} concurrent initiatives.{activeCount > 0 && <> Currently have <strong>{activeCount}</strong>.</>}</div></div>; })()}
              </div>
            </div>
          </Card>
          <button onClick={() => setOmView("4.1")} className="w-full px-4 py-3 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>Continue to Step 4.1: Financial Model →</button>
        </div>}

        {/* ── Step 4.1: Financial Model ── */}
        {omView === "4.1" && <div className="animate-tab-enter space-y-5">
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "abc" as const, label: "Activity Costing", icon: "📊" },
              { id: "cts" as const, label: "Cost-to-Serve", icon: "🎯" },
              { id: "rcg" as const, label: "Run/Change/Grow", icon: "📈" },
              { id: "compare" as const, label: "OM Cost Compare", icon: "⚖️" },
              { id: "bizcase" as const, label: "Business Case", icon: "💼" },
            ]).map(v => <button key={v.id} onClick={() => setFinView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: finView === v.id ? "rgba(212,134,10,0.12)" : "transparent",
              color: finView === v.id ? "#e09040" : "var(--text-muted)",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. ACTIVITY-BASED COSTING ─── */}
          {finView === "abc" && <Card title="Activity-Based Costing — Current vs. Target ($K)">
            <div className="text-[16px] text-[var(--text-secondary)] mb-5" style={{ fontFamily: "'Outfit', sans-serif" }}>Cost components per function in thousands ($K). Click any cell to edit.</div>
            {(() => {
              const totalCur = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.people||0) + (c?.technology||0) + (c?.outsourcing||0) + (c?.facilities||0); }, 0);
              const totalTgt = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.peopleTgt||0) + (c?.technologyTgt||0) + (c?.outsourcingTgt||0) + (c?.facilitiesTgt||0); }, 0);
              const delta = totalTgt - totalCur;
              const funcColors: Record<string, string> = { Finance: "#D4860A", HR: "#8B5CF6", Technology: "#0891B2", Operations: "#F59E0B", Marketing: "#EC4899", Legal: "#EF4444", Product: "#10B981", Executive: "#A855F7" };
              return <>
                {/* Glass KPI cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="kpi-glass"><div className="text-[24px] font-extrabold font-data text-[var(--text-primary)]" style={{ animation: "countUp 0.5s ease-out" }}>${fmtK(totalCur)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>Current Total</div></div>
                  <div className="kpi-glass" style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(19,27,46,0.9))" }}><div className="text-[24px] font-extrabold font-data" style={{ color: "#0EA5E9", animation: "countUp 0.5s ease-out" }}>${fmtK(totalTgt)}</div><div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>Target Total</div></div>
                  <div className="kpi-glass" style={{ background: `linear-gradient(135deg, ${delta <= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)"}, rgba(19,27,46,0.9))` }}><div className="flex items-center justify-center gap-2"><span className="text-[18px]">{delta <= 0 ? "↓" : "↑"}</span><span className="text-[24px] font-extrabold font-data" style={{ color: delta <= 0 ? "var(--success)" : "var(--risk)", animation: "countUp 0.5s ease-out" }}>${fmtK(Math.abs(delta))}</span></div><div className="text-[13px] text-[var(--text-muted)] uppercase tracking-wider mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{delta <= 0 ? "Annual Savings" : "Additional Cost"}</div></div>
                </div>
                {/* Premium table */}
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)]" style={{ boxShadow: "var(--shadow-2)" }}><table className="w-full"><thead><tr style={{ background: "linear-gradient(135deg, var(--surface-2), var(--surface-3))" }}>
                  <th className="px-4 py-3 text-left text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]" style={{ fontFamily: "'Outfit', sans-serif" }}>Function</th>
                  {["People","Technology","Outsource","Facilities"].map(h => <th key={h} className="px-2 py-3 text-center text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]" colSpan={2} style={{ fontFamily: "'Outfit', sans-serif" }}>{h}<div className="flex justify-center gap-2 mt-1"><span className="text-[11px] font-semibold" style={{ color: "var(--accent-primary)" }}>Now</span><span className="text-[11px] font-semibold" style={{ color: "#0EA5E9" }}>Target</span></div></th>)}
                  <th className="px-3 py-3 text-center text-[12px] font-bold text-[var(--text-muted)] uppercase border-b border-[var(--border)]" style={{ fontFamily: "'Outfit', sans-serif" }}>Total</th>
                  <th className="px-3 py-3 text-center text-[12px] font-bold uppercase border-b border-[var(--border)]" style={{ color: "#0EA5E9", fontFamily: "'Outfit', sans-serif" }}>Target</th>
                  <th className="px-3 py-3 text-center text-[12px] font-bold text-[var(--text-muted)] uppercase border-b border-[var(--border)]" style={{ fontFamily: "'Outfit', sans-serif" }}>Delta</th>
                </tr></thead><tbody>
                  {FIN_FUNCS.map((f, fi) => {
                    const c = finCosts[f] || { people: 0, technology: 0, outsourcing: 0, facilities: 0, peopleTgt: 0, technologyTgt: 0, outsourcingTgt: 0, facilitiesTgt: 0 };
                    const curTotal = c.people + c.technology + c.outsourcing + c.facilities;
                    const tgtTotal = c.peopleTgt + c.technologyTgt + c.outsourcingTgt + c.facilitiesTgt;
                    const d = tgtTotal - curTotal;
                    const inp = (field: keyof FinFuncCost, isTgt?: boolean) => <input type="number" value={c[field] || ""} onChange={e => setFinCosts(prev => ({...prev, [f]: {...c, [field]: Number(e.target.value) || 0}}))} className="bg-transparent border-b border-transparent hover:border-[var(--border)] rounded-none px-1 py-1 text-[15px] text-right outline-none w-16 font-data transition-all" style={{ color: isTgt ? "#0EA5E9" : "var(--text-primary)" }} />;
                    return <tr key={f} className="border-b border-[var(--border)] transition-colors" style={{ background: fi % 2 === 0 ? "rgba(212,134,10,0.02)" : "transparent" }}>
                      <td className="px-4 py-3 text-[16px] font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Outfit', sans-serif", borderLeft: `3px solid ${funcColors[f] || "#888"}` }}>{f}</td>
                      <td className="px-2 py-2 text-right">{inp("people")}</td><td className="px-2 py-2 text-right">{inp("peopleTgt", true)}</td>
                      <td className="px-2 py-2 text-right">{inp("technology")}</td><td className="px-2 py-2 text-right">{inp("technologyTgt", true)}</td>
                      <td className="px-2 py-2 text-right">{inp("outsourcing")}</td><td className="px-2 py-2 text-right">{inp("outsourcingTgt", true)}</td>
                      <td className="px-2 py-2 text-right">{inp("facilities")}</td><td className="px-2 py-2 text-right">{inp("facilitiesTgt", true)}</td>
                      <td className="px-3 py-3 text-right text-[16px] font-bold font-data text-[var(--text-primary)]">${fmtK(curTotal)}</td>
                      <td className="px-3 py-3 text-right text-[16px] font-bold font-data" style={{ color: "#0EA5E9" }}>${fmtK(tgtTotal)}</td>
                      <td className="px-3 py-3 text-right"><span className="text-[16px] font-extrabold font-data px-2 py-0.5 rounded-lg" style={{ color: d <= 0 ? "var(--success)" : "var(--risk)", background: d <= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}>{d <= 0 ? "" : "+"}{fmtK(d)}</span></td>
                    </tr>;
                  })}
                </tbody></table></div>
              </>;
            })()}
          </Card>}

          {/* ─── 2. COST-TO-SERVE ─── */}
          {finView === "cts" && <Card title="Cost-to-Serve Analysis — Service Functions">
            <div className="text-[16px] text-[var(--text-secondary)] mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>Cost per employee served vs. industry benchmark, by function.</div>
            <div className="space-y-5">
              {Object.entries(finCts).map(([func, data]) => {
                const gap = data.costPerEmp - data.benchmark;
                const gapPct = data.benchmark > 0 ? Math.round((gap / data.benchmark) * 100) : 0;
                const maxVal = Math.max(data.costPerEmp, data.benchmark, 1);
                const costPct = (data.costPerEmp / maxVal) * 100;
                const benchPct = (data.benchmark / maxVal) * 100;
                // Ring gauge: 0-100% of circumference
                const ringRadius = 40; const ringCirc = 2 * Math.PI * ringRadius;
                const ringFill = (data.costPerEmp / (data.benchmark * 1.5 || 1)) * 100;
                const ringOffset = ringCirc - (Math.min(ringFill, 100) / 100) * ringCirc;
                // Gradient bar position: benchmark at center (50%), cost position relative
                const barPos = data.benchmark > 0 ? Math.min(95, Math.max(5, 50 + (gap / data.benchmark) * 50)) : 50;
                return <div key={func} className="glass-card p-6">
                  <div className="flex gap-6">
                    {/* Left: Ring gauge */}
                    <div className="shrink-0 flex flex-col items-center justify-center" style={{ width: 120 }}>
                      <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
                        <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
                        <circle cx="50" cy="50" r={ringRadius} fill="none" stroke={gap > 0 ? "var(--risk)" : "var(--success)"} strokeWidth="8" strokeDasharray={ringCirc} strokeDashoffset={ringOffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
                        {/* Benchmark marker */}
                        <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeDasharray={`2 ${ringCirc - 2}`} strokeDashoffset={ringCirc - (Math.min(100, benchPct / 1.5 * 100 / maxVal) / 100) * ringCirc} opacity="0.6" />
                      </svg>
                      <div className="absolute text-center" style={{ marginTop: -4 }}>
                        <div className="text-[18px] font-extrabold font-data" style={{ color: gap > 0 ? "var(--risk)" : "var(--success)" }}>{gap > 0 ? "+" : ""}${Math.abs(gap)}</div>
                        <div className="text-[10px] text-[var(--text-muted)] uppercase">gap</div>
                      </div>
                    </div>
                    {/* Right: details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[22px] font-bold text-[var(--text-primary)]" style={{ fontFamily: "'Outfit', sans-serif" }}>{func}</span>
                        <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)]">{data.headcount} staff</span>
                      </div>
                      <div className="flex items-baseline gap-4 mb-3 text-[16px]">
                        <span className="font-data"><span className="text-[var(--text-muted)] text-[13px] uppercase mr-1">Yours</span><input type="number" value={data.costPerEmp} onChange={e => setFinCts(prev => ({...prev, [func]: {...data, costPerEmp: Number(e.target.value) || 0}}))} className="font-extrabold text-[var(--text-primary)] bg-transparent outline-none w-20 border-b border-transparent hover:border-[var(--border)] font-data text-[16px]" /><span className="text-[var(--text-muted)] text-[13px]">/emp</span></span>
                        <span className="text-[var(--text-muted)]">vs.</span>
                        <span className="font-data"><span className="text-[var(--text-muted)] text-[13px] uppercase mr-1">Benchmark</span><input type="number" value={data.benchmark} onChange={e => setFinCts(prev => ({...prev, [func]: {...data, benchmark: Number(e.target.value) || 0}}))} className="font-extrabold text-[var(--accent-primary)] bg-transparent outline-none w-20 border-b border-transparent hover:border-[var(--border)] font-data text-[16px]" /><span className="text-[var(--text-muted)] text-[13px]">/emp</span></span>
                        <span className="font-extrabold font-data" style={{ color: gap > 0 ? "var(--risk)" : "var(--success)" }}>({gapPct > 0 ? "+" : ""}{gapPct}%)</span>
                      </div>
                      {/* Gradient zone bar */}
                      <div className="relative mb-3">
                        <div className="gradient-bar-zones" />
                        <div className="absolute top-[-3px] w-3 h-3 rounded-full border-2 border-white" style={{ left: `calc(${barPos}% - 6px)`, background: gap > 0 ? "var(--risk)" : gap < 0 ? "var(--success)" : "var(--warning)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", transition: "left 0.5s ease-out" }} />
                        <div className="flex justify-between mt-1 text-[11px] text-[var(--text-muted)]"><span>Below benchmark</span><span>At benchmark</span><span>Above</span></div>
                      </div>
                      {/* Insight */}
                      {gap > 0 && <div className="text-[15px] text-[var(--text-secondary)] border-l-2 pl-3 mt-2" style={{ borderColor: "var(--accent-primary)" }}>
                        {func === "HR" ? "Implementing shared services and AI-assisted onboarding could reduce cost-to-serve by 25%." : func === "Technology" ? "Consolidating service desk and automating L1 support could reduce cost by 20%." : "Standardizing processes and automating reporting could close the gap."}
                      </div>}
                    </div>
                  </div>
                </div>;
              })}
              <button onClick={() => {
                const func = prompt("Add cost-to-serve for which function?");
                if (func && !finCts[func]) setFinCts(prev => ({...prev, [func]: { headcount: 50, costPerEmp: 2000, benchmark: 1500 }}));
              }} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Function</button>
            </div>
          </Card>}

          {/* ─── 3. RUN / CHANGE / GROW ─── */}
          {finView === "rcg" && <Card title="Run / Change / Grow Budget Allocation">
            <div className="text-[16px] text-[var(--text-secondary)] mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>Allocate budget across Run (BAU), Change (transformation), and Grow (innovation).</div>
            {/* Summary row */}
            {(() => {
              const totals = FIN_FUNCS.reduce((s, f) => { const r = finRcg[f] || { run: 65, change: 20, grow: 15, runTgt: 55, changeTgt: 25, growTgt: 20 }; return { run: s.run + r.run, change: s.change + r.change, grow: s.grow + r.grow, runTgt: s.runTgt + r.runTgt, changeTgt: s.changeTgt + r.changeTgt, growTgt: s.growTgt + r.growTgt }; }, { run: 0, change: 0, grow: 0, runTgt: 0, changeTgt: 0, growTgt: 0 });
              const n = FIN_FUNCS.length || 1;
              const avgR = Math.round(totals.runTgt / n); const avgC = Math.round(totals.changeTgt / n); const avgG = Math.round(totals.growTgt / n);
              return <div className="glass-card p-4 mb-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-[15px] text-[var(--text-muted)]">Target Avg: <span className="font-bold font-data" style={{ color: "var(--accent-primary)" }}>Run {avgR}%</span> · <span className="font-bold font-data" style={{ color: "#0EA5E9" }}>Change {avgC}%</span> · <span className="font-bold font-data" style={{ color: "var(--success)" }}>Grow {avgG}%</span></div>
                  <div className="flex gap-3 text-[13px] text-[var(--text-muted)]">
                    <span>Benchmark: 60/25/15</span>
                    <span className="font-semibold" style={{ color: avgR <= 60 ? "var(--success)" : "var(--warning)" }}>Run {avgR > 60 ? `+${avgR - 60}%` : `${avgR - 60}%`}</span>
                    <span className="font-semibold" style={{ color: avgG >= 15 ? "var(--success)" : "var(--warning)" }}>Grow {avgG >= 15 ? "✓" : `${avgG - 15}%`}</span>
                  </div>
                </div>
              </div>;
            })()}
            {/* Function cards as vertical allocation bars */}
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
              {FIN_FUNCS.map(f => {
                const r = finRcg[f] || { run: 65, change: 20, grow: 15, runTgt: 55, changeTgt: 25, growTgt: 20 };
                const update = (field: keyof FinRcgEntry, val: number) => setFinRcg(prev => ({...prev, [f]: {...r, [field]: val}}));
                // Benchmark overlay
                const benchRun = 60, benchChange = 25, benchGrow = 15;
                return <div key={f} className="glass-card p-3 flex flex-col">
                  <div className="text-[14px] font-bold text-[var(--text-primary)] text-center mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>{f.slice(0, 8)}</div>
                  {/* Vertical stacked bar */}
                  <div className="relative flex-1 min-h-[180px] rounded-xl overflow-hidden border border-[var(--border)]">
                    {/* Grow (top) */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col">
                      <div className="flex items-center justify-center transition-all" style={{ height: `${r.growTgt * 1.8}px`, background: "rgba(16,185,129,0.25)" }}>
                        <span className="text-[12px] font-bold text-[var(--success)]">{r.growTgt}%</span>
                      </div>
                      <div className="flex items-center justify-center transition-all" style={{ height: `${r.changeTgt * 1.8}px`, background: "rgba(14,165,233,0.2)" }}>
                        <span className="text-[12px] font-bold" style={{ color: "#0EA5E9" }}>{r.changeTgt}%</span>
                      </div>
                      <div className="flex items-center justify-center transition-all" style={{ height: `${r.runTgt * 1.8}px`, background: "rgba(212,134,10,0.15)" }}>
                        <span className="text-[12px] font-bold text-[var(--accent-primary)]">{r.runTgt}%</span>
                      </div>
                    </div>
                    {/* Benchmark dashed overlay */}
                    <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                      <div style={{ height: `${benchGrow * 1.8}px` }} className="border-t border-dashed border-white/10" />
                      <div style={{ height: `${benchChange * 1.8}px` }} className="border-t border-dashed border-white/10" />
                    </div>
                  </div>
                  {/* Inline editors */}
                  <div className="mt-2 space-y-1">
                    {(["run", "change", "grow"] as const).map(k => {
                      const colors = { run: "var(--accent-primary)", change: "#0EA5E9", grow: "var(--success)" };
                      return <div key={k} className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase" style={{ color: colors[k] }}>{k[0]}</span>
                        <input type="number" value={r[`${k}Tgt` as keyof FinRcgEntry]} onChange={e => update(`${k}Tgt` as keyof FinRcgEntry, Number(e.target.value) || 0)} className="w-10 bg-transparent border-b border-transparent hover:border-[var(--border)] text-[12px] text-right outline-none font-data text-[var(--text-primary)]" />
                      </div>;
                    })}
                  </div>
                </div>;
              })}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 text-[13px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(212,134,10,0.15)" }} />Run (BAU)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(14,165,233,0.2)" }} />Change</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "rgba(16,185,129,0.25)" }} />Grow</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t border-dashed border-white/30" style={{ width: 12 }} />Benchmark</span>
            </div>
          </Card>}

          {/* ─── 4. OM COST COMPARISON ─── */}
          {finView === "compare" && <Card title="Operating Model Cost Comparison">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Side-by-side comparison: Current State vs. Target State. Costs aggregated from Activity-Based Costing.</div>
            {(() => {
              const curPeople = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.people || 0), 0);
              const curTech = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.technology || 0), 0);
              const curOut = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.outsourcing || 0), 0);
              const curFac = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.facilities || 0), 0);
              const curTotal = curPeople + curTech + curOut + curFac;
              const tgtPeople = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.peopleTgt || 0), 0);
              const tgtTech = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.technologyTgt || 0), 0);
              const tgtOut = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.outsourcingTgt || 0), 0);
              const tgtFac = FIN_FUNCS.reduce((s, f) => s + (finCosts[f]?.facilitiesTgt || 0), 0);
              const tgtTotal = tgtPeople + tgtTech + tgtOut + tgtFac;
              const netDelta = tgtTotal - curTotal;
              const peopleSav = curPeople - tgtPeople;
              const techInv = tgtTech - curTech;
              const rows = [
                { label: "People", cur: curPeople, tgt: tgtPeople, color: "var(--accent-primary)" },
                { label: "Technology", cur: curTech, tgt: tgtTech, color: "var(--purple)" },
                { label: "Outsourcing", cur: curOut, tgt: tgtOut, color: "var(--warning)" },
                { label: "Facilities", cur: curFac, tgt: tgtFac, color: "var(--success)" },
              ];
              const upfront = techInv > 0 ? techInv * 0.8 : 500; // estimate upfront from tech investment
              const annualSav = netDelta < 0 ? Math.abs(netDelta) : 0;
              const paybackMonths = annualSav > 0 ? Math.round((upfront / annualSav) * 12) : 0;
              return <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  {/* Current */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-3">Current State</div>
                    <div className="text-[28px] font-extrabold text-[var(--text-primary)] mb-3">${fmtK(curTotal)}<span className="text-[14px] text-[var(--text-muted)] font-normal ml-1">/year</span></div>
                    {rows.map(r => <div key={r.label} className="mb-2">
                      <div className="flex justify-between text-[14px] mb-1"><span className="text-[var(--text-secondary)]">{r.label}</span><span className="font-semibold">${fmtK(r.cur)}</span></div>
                      <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.cur / curTotal) * 100}%`, background: r.color }} /></div>
                    </div>)}
                  </div>
                  {/* Target */}
                  <div className="rounded-xl border-2 border-[var(--accent-primary)]/30 bg-[var(--surface-2)] p-4">
                    <div className="text-[14px] font-bold text-[var(--accent-primary)] uppercase mb-3">Target State</div>
                    <div className="text-[28px] font-extrabold text-[var(--accent-primary)] mb-3">${fmtK(tgtTotal)}<span className="text-[14px] text-[var(--text-muted)] font-normal ml-1">/year</span></div>
                    {rows.map(r => { const d = r.tgt - r.cur; return <div key={r.label} className="mb-2">
                      <div className="flex justify-between text-[14px] mb-1"><span className="text-[var(--text-secondary)]">{r.label}</span><span className="font-semibold">${fmtK(r.tgt)} <span className="text-[12px]" style={{ color: d <= 0 ? "var(--success)" : "var(--risk)" }}>({d <= 0 ? "" : "+"}{fmtK(d)})</span></span></div>
                      <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(r.tgt / Math.max(curTotal, tgtTotal)) * 100}%`, background: r.color }} /></div>
                    </div>; })}
                  </div>
                </div>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-4 text-center" style={{ background: netDelta <= 0 ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${netDelta <= 0 ? "var(--success)" : "var(--risk)"}20` }}>
                    <div className="text-[24px] font-extrabold" style={{ color: netDelta <= 0 ? "var(--success)" : "var(--risk)" }}>{netDelta <= 0 ? "-" : "+"}${fmtK(Math.abs(netDelta))}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">{netDelta <= 0 ? "Annual Savings" : "Additional Cost"}</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center border border-[var(--border)]">
                    <div className="text-[24px] font-extrabold text-[var(--warning)]">${fmtK(upfront)}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">Est. Upfront Investment</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--surface-2)] text-center border border-[var(--border)]">
                    <div className="text-[24px] font-extrabold text-[var(--accent-primary)]">{paybackMonths > 0 ? `${paybackMonths} mo` : "—"}</div>
                    <div className="text-[13px] text-[var(--text-muted)] uppercase">Payback Period</div>
                  </div>
                </div>
                {annualSav > 0 && <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-4 text-[14px] text-[var(--text-secondary)]">
                  <strong className="text-[var(--accent-primary)]">Summary:</strong> Target operating model saves <strong>${fmtK(annualSav)}</strong> annually{peopleSav > 0 && <> (primarily from <strong>${fmtK(peopleSav)}</strong> people cost reduction)</>}{techInv > 0 && <>, requiring <strong>${fmtK(techInv)}</strong> additional technology investment</>}. Estimated upfront cost of <strong>${fmtK(upfront)}</strong> yields a <strong>{paybackMonths}-month</strong> payback.
                </div>}
              </div>;
            })()}
          </Card>}

          {/* ─── 5. BUSINESS CASE BUILDER ─── */}
          {finView === "bizcase" && <Card title="Business Case Builder">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Aggregate all financial impacts into a single business case. Edit inputs to model scenarios.</div>
            {(() => {
              // Auto-calculate from other tabs
              const curTotal = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.people||0) + (c?.technology||0) + (c?.outsourcing||0) + (c?.facilities||0); }, 0);
              const tgtTotal = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; return s + (c?.peopleTgt||0) + (c?.technologyTgt||0) + (c?.outsourcingTgt||0) + (c?.facilitiesTgt||0); }, 0);
              const autoSavings = Math.max(0, curTotal - tgtTotal);
              const autoInvestment = FIN_FUNCS.reduce((s, f) => { const c = finCosts[f]; const techDelta = (c?.technologyTgt||0) - (c?.technology||0); return s + (techDelta > 0 ? techDelta : 0); }, 0) * 0.8;

              const investment = Number(finBizCase.investment) || autoInvestment || 0;
              const annualSavings = Number(finBizCase.annualSavings) || autoSavings || 0;
              const revenueImpact = Number(finBizCase.revenueImpact) || 0;
              const discountRate = Number(finBizCase.discountRate) || 10;
              const totalAnnualBenefit = annualSavings + revenueImpact;
              const paybackMonths = totalAnnualBenefit > 0 ? Math.round((investment / totalAnnualBenefit) * 12) : 0;
              const roi = investment > 0 ? Math.round(((totalAnnualBenefit * 3 - investment) / investment) * 100) : 0;
              // Simple NPV over 3 years
              const npv = -investment + totalAnnualBenefit / (1 + discountRate/100) + totalAnnualBenefit / Math.pow(1 + discountRate/100, 2) + totalAnnualBenefit / Math.pow(1 + discountRate/100, 3);
              const riskAdjustedRoi = Math.round(roi * 0.75); // 25% risk haircut

              return <div className="grid grid-cols-2 gap-5">
                {/* Left: Inputs */}
                <div className="space-y-4">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase">Inputs</div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                    <div><label className="text-[13px] text-[var(--text-muted)] block mb-1">One-Time Investment ($K) {autoInvestment > 0 && <span className="text-[11px] text-[var(--accent-primary)]">auto: {autoInvestment.toFixed(0)}</span>}</label>
                    <input type="number" value={finBizCase.investment} onChange={e => setFinBizCase(p => ({...p, investment: e.target.value}))} placeholder={autoInvestment.toFixed(0)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div><label className="text-[13px] text-[var(--text-muted)] block mb-1">Annual Recurring Savings ($K) {autoSavings > 0 && <span className="text-[11px] text-[var(--accent-primary)]">auto: {autoSavings.toFixed(0)}</span>}</label>
                    <input type="number" value={finBizCase.annualSavings} onChange={e => setFinBizCase(p => ({...p, annualSavings: e.target.value}))} placeholder={autoSavings.toFixed(0)} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div><label className="text-[13px] text-[var(--text-muted)] block mb-1">Annual Revenue Impact ($K)</label>
                    <input type="number" value={finBizCase.revenueImpact} onChange={e => setFinBizCase(p => ({...p, revenueImpact: e.target.value}))} placeholder="0" className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div><label className="text-[13px] text-[var(--text-muted)] block mb-1">Discount Rate (%)</label>
                    <input type="number" value={finBizCase.discountRate} onChange={e => setFinBizCase(p => ({...p, discountRate: e.target.value}))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none" /></div>
                  </div>
                </div>
                {/* Right: Outputs */}
                <div className="space-y-4">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase">Business Case Summary</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center"><div className="text-[22px] font-extrabold text-[var(--warning)]">${fmtK(investment)}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Investment</div></div>
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center"><div className="text-[22px] font-extrabold text-[var(--success)]">${fmtK(annualSavings)}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Annual Savings</div></div>
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center"><div className="text-[22px] font-extrabold text-[var(--accent-primary)]">{paybackMonths > 0 ? `${paybackMonths} mo` : "—"}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Payback Period</div></div>
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center"><div className="text-[22px] font-extrabold" style={{ color: roi > 0 ? "var(--success)" : "var(--risk)" }}>{roi}%</div><div className="text-[12px] text-[var(--text-muted)] uppercase">3-Year ROI</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4 border text-center" style={{ background: npv > 0 ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", borderColor: npv > 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)" }}>
                      <div className="text-[22px] font-extrabold" style={{ color: npv > 0 ? "var(--success)" : "var(--risk)" }}>${fmtK(Math.round(npv))}</div>
                      <div className="text-[12px] text-[var(--text-muted)] uppercase">3-Year NPV</div>
                    </div>
                    <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center">
                      <div className="text-[22px] font-extrabold text-[var(--purple)]">{riskAdjustedRoi}%</div>
                      <div className="text-[12px] text-[var(--text-muted)] uppercase">Risk-Adj. ROI (75%)</div>
                    </div>
                  </div>
                  {/* Narrative */}
                  <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-4 text-[14px] text-[var(--text-secondary)]">
                    <strong className="text-[var(--accent-primary)]">Executive Summary:</strong> {investment > 0 && annualSavings > 0 ? <>This transformation requires a <strong>${fmtK(investment)}</strong> one-time investment and delivers <strong>${fmtK(annualSavings)}</strong> in annual recurring savings{revenueImpact > 0 && <> plus <strong>${fmtK(revenueImpact)}</strong> in annual revenue impact</>}. The investment pays back in <strong>{paybackMonths} months</strong> with a 3-year NPV of <strong>${fmtK(Math.round(npv))}</strong> (at {discountRate}% discount rate). Risk-adjusted 3-year ROI is <strong>{riskAdjustedRoi}%</strong>.</> : "Enter investment and savings figures to generate the business case narrative."}
                  </div>
                </div>
              </div>;
            })()}
          </Card>}
        </div>}

        {/* ── PERFORMANCE TAB ── */}
        {omView === "4.2" && <div className="animate-tab-enter space-y-5">
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "scorecard" as const, label: "Balanced Scorecard", icon: "📋" },
              { id: "okr" as const, label: "OKR Framework", icon: "🎯" },
              { id: "indicators" as const, label: "Leading/Lagging", icon: "⚡" },
              { id: "healthcheck" as const, label: "OM Health Check", icon: "🩺" },
            ]).map(v => <button key={v.id} onClick={() => setPerfView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: perfView === v.id ? "rgba(212,134,10,0.12)" : "transparent",
              color: perfView === v.id ? "#e09040" : "var(--text-muted)",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. BALANCED SCORECARD ─── */}
          {perfView === "scorecard" && <Card title="Balanced Scorecard Dashboard">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">KPIs across 4 perspectives. Click RAG status to cycle. Linked to your strategic priorities from the Strategy tab.</div>
            {/* Summary */}
            {(() => {
              const rag = { Red: perfKpis.filter(k => k.status === "Red").length, Amber: perfKpis.filter(k => k.status === "Amber").length, Green: perfKpis.filter(k => k.status === "Green").length };
              return <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{perfKpis.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Total KPIs</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{rag.Green}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">On Track</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--warning)]">{rag.Amber}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">At Risk</div></div>
                <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--risk)]">{rag.Red}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Off Track</div></div>
              </div>;
            })()}
            {/* Perspectives */}
            {(["Financial", "Customer", "Process", "Learning"] as const).map(perspective => {
              const pColors: Record<string, string> = { Financial: "var(--accent-primary)", Customer: "var(--success)", Process: "var(--purple)", Learning: "var(--warning)" };
              const pIcons: Record<string, string> = { Financial: "💰", Customer: "🎯", Process: "⚙️", Learning: "📚" };
              const kpis = perfKpis.filter(k => k.perspective === perspective);
              return <div key={perspective} className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-3" style={{ borderLeftColor: pColors[perspective] }}>
                <div className="flex items-center gap-2 mb-3"><span>{pIcons[perspective]}</span><span className="text-[15px] font-bold uppercase tracking-wider" style={{ color: pColors[perspective] }}>{perspective === "Learning" ? "Learning & Growth" : perspective === "Customer" ? "Customer / Stakeholder" : perspective === "Process" ? "Internal Process" : perspective}</span><span className="text-[13px] text-[var(--text-muted)]">{kpis.length} KPIs</span></div>
                <div className="overflow-x-auto"><table className="w-full text-[14px]"><thead><tr>
                  <th className="px-2 py-1 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase">KPI</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Current</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Target</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Owner</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Freq</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">Strategy</th>
                  <th className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--text-muted)]">RAG</th>
                </tr></thead><tbody>
                  {kpis.map(kpi => {
                    const ragColors: Record<string, string> = { Red: "var(--risk)", Amber: "var(--warning)", Green: "var(--success)" };
                    const stratP = STRAT_PRIORITIES_ALL.find(p => p.id === kpi.stratLink);
                    return <tr key={kpi.id} className="border-t border-[var(--border)]/50">
                      <td className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">{kpi.name}</td>
                      <td className="px-2 py-1.5 text-center"><input value={kpi.current} onChange={e => setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, current: e.target.value} : k))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] text-center outline-none w-14" /></td>
                      <td className="px-2 py-1.5 text-center"><input value={kpi.target} onChange={e => setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, target: e.target.value} : k))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[13px] text-center outline-none w-14" /></td>
                      <td className="px-2 py-1.5 text-center text-[13px] text-[var(--text-muted)]">{kpi.owner}</td>
                      <td className="px-2 py-1.5 text-center text-[12px] text-[var(--text-muted)]">{kpi.frequency}</td>
                      <td className="px-2 py-1.5 text-center">{stratP ? <span className="text-[11px]" title={stratP.label}>{stratP.icon}</span> : <span className="text-[11px] text-[var(--text-muted)]">—</span>}</td>
                      <td className="px-2 py-1.5 text-center"><button onClick={() => { const cycle: PerfKpi["status"][] = ["Green", "Amber", "Red"]; setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, status: cycle[(cycle.indexOf(k.status) + 1) % 3]} : k)); }} className="w-6 h-6 rounded-full cursor-pointer" style={{ background: ragColors[kpi.status], border: `2px solid ${ragColors[kpi.status]}` }} title={kpi.status} /></td>
                    </tr>;
                  })}
                </tbody></table></div>
              </div>;
            })}
          </Card>}

          {/* ─── 2. OKR FRAMEWORK ─── */}
          {perfView === "okr" && <Card title="OKR Framework — Objectives & Key Results">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Objectives cascade from Enterprise → Function → Team. Drag the progress slider for each Key Result.</div>
            {/* OKR tree */}
            {(() => {
              const renderOkr = (okr: PerfOkr, depth: number): React.ReactNode => {
                const children = perfOkrs.filter(o => o.parentId === okr.id);
                const avgProgress = okr.keyResults.length ? Math.round(okr.keyResults.reduce((s, kr) => s + kr.progress, 0) / okr.keyResults.length) : 0;
                const levelColors: Record<string, string> = { Enterprise: "var(--accent-primary)", Function: "var(--purple)", Team: "var(--success)" };
                return <div key={okr.id} style={{ marginLeft: depth * 20 }} className="mb-3">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {depth > 0 && <span className="text-[var(--text-muted)]">↳</span>}
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${levelColors[okr.level]}15`, color: levelColors[okr.level] }}>{okr.level}</span>
                        <span className="text-[15px] font-bold text-[var(--text-primary)]">{okr.objective}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold" style={{ color: avgProgress >= 70 ? "var(--success)" : avgProgress >= 40 ? "var(--warning)" : "var(--risk)" }}>{avgProgress}%</span>
                        <button onClick={() => setPerfOkrs(prev => prev.filter(o => o.id !== okr.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-[var(--bg)] rounded-full overflow-hidden mb-3"><div className="h-full rounded-full transition-all" style={{ width: `${avgProgress}%`, background: avgProgress >= 70 ? "var(--success)" : avgProgress >= 40 ? "var(--warning)" : "var(--risk)" }} /></div>
                    {/* Key Results */}
                    <div className="space-y-2 ml-2">
                      {okr.keyResults.map(kr => <div key={kr.id} className="flex items-center gap-3">
                        <span className="text-[13px] text-[var(--text-muted)] shrink-0">KR</span>
                        <span className="text-[14px] text-[var(--text-secondary)] flex-1">{kr.text}</span>
                        <input type="range" min={0} max={100} value={kr.progress} onChange={e => setPerfOkrs(prev => prev.map(o => o.id === okr.id ? {...o, keyResults: o.keyResults.map(k => k.id === kr.id ? {...k, progress: Number(e.target.value)} : k)} : o))} className="w-24 h-1.5 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, ${kr.progress >= 70 ? "var(--success)" : kr.progress >= 40 ? "var(--warning)" : "var(--risk)"} ${kr.progress}%, var(--bg) ${kr.progress}%)` }} />
                        <span className="text-[13px] font-bold w-10 text-right" style={{ color: kr.progress >= 70 ? "var(--success)" : kr.progress >= 40 ? "var(--warning)" : "var(--risk)" }}>{kr.progress}%</span>
                      </div>)}
                    </div>
                  </div>
                  {children.map(c => renderOkr(c, depth + 1))}
                </div>;
              };
              return perfOkrs.filter(o => !o.parentId).map(o => renderOkr(o, 0));
            })()}
            {/* Add OKR */}
            {perfAddingOkr ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add Objective</div>
              <div className="grid grid-cols-3 gap-3">
                <select value={perfNewOkr.level} onChange={e => setPerfNewOkr(p => ({...p, level: e.target.value as PerfOkr["level"]}))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none"><option>Enterprise</option><option>Function</option><option>Team</option></select>
                <input value={perfNewOkr.objective} onChange={e => setPerfNewOkr(p => ({...p, objective: e.target.value}))} placeholder="Objective..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              {perfNewOkr.level !== "Enterprise" && <select value={perfNewOkr.parentId} onChange={e => setPerfNewOkr(p => ({...p, parentId: e.target.value}))} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none">
                <option value="">No parent</option>{perfOkrs.filter(o => o.level === "Enterprise" || (perfNewOkr.level === "Team" && o.level === "Function")).map(o => <option key={o.id} value={o.id}>{o.objective}</option>)}
              </select>}
              <div className="flex gap-2">
                <button onClick={() => { if (!perfNewOkr.objective.trim()) return; setPerfOkrs(prev => [...prev, { id: `o${Date.now()}`, level: perfNewOkr.level, objective: perfNewOkr.objective, parentId: perfNewOkr.parentId, keyResults: [{ id: `kr${Date.now()}`, text: "Key Result 1", progress: 0 }] }]); setPerfNewOkr({ level: "Function", objective: "", parentId: "" }); setPerfAddingOkr(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Add</button>
                <button onClick={() => setPerfAddingOkr(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setPerfAddingOkr(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Objective</button>}
          </Card>}

          {/* ─── 3. LEADING VS. LAGGING INDICATORS ─── */}
          {perfView === "indicators" && <Card title="Leading vs. Lagging Indicator Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Each lagging indicator (outcome) should have at least one leading indicator (driver) paired. Click to toggle type and set pairs.</div>
            {(() => {
              const leading = perfKpis.filter(k => k.indicator === "Leading");
              const lagging = perfKpis.filter(k => k.indicator === "Lagging");
              const unpairedLagging = lagging.filter(k => !k.pairedWith || !perfKpis.find(p => p.id === k.pairedWith));
              return <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--success)]">{leading.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Leading (Drivers)</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{lagging.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Lagging (Outcomes)</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: unpairedLagging.length > 0 ? "var(--risk)" : "var(--success)" }}>{unpairedLagging.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Unpaired Lagging</div></div>
                </div>
                {/* Unpaired warning */}
                {unpairedLagging.length > 0 && <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(245,158,11,0.04)] p-3">
                  <div className="text-[14px] font-bold text-[var(--warning)] mb-1">⚠ Measuring outcomes without drivers</div>
                  <div className="text-[14px] text-[var(--text-secondary)]">{unpairedLagging.map(k => k.name).join(", ")} — these lagging indicators have no paired leading indicator. You{"'"}re seeing results but can{"'"}t predict or influence them.</div>
                </div>}
                {/* Paired view */}
                <div className="space-y-3">
                  {perfKpis.map(kpi => {
                    const paired = kpi.pairedWith ? perfKpis.find(k => k.id === kpi.pairedWith) : null;
                    const typeColor = kpi.indicator === "Leading" ? "var(--success)" : "var(--accent-primary)";
                    return <div key={kpi.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 flex items-center gap-3">
                      <button onClick={() => setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, indicator: k.indicator === "Leading" ? "Lagging" : "Leading"} : k))} className="px-2 py-0.5 rounded-full text-[12px] font-bold shrink-0" style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>{kpi.indicator}</button>
                      <span className="text-[14px] font-semibold text-[var(--text-primary)] flex-1">{kpi.name}</span>
                      <span className="text-[12px] text-[var(--text-muted)]">{kpi.perspective}</span>
                      {kpi.indicator === "Lagging" && <><span className="text-[var(--text-muted)]">←</span>
                        <select value={kpi.pairedWith} onChange={e => setPerfKpis(prev => prev.map(k => k.id === kpi.id ? {...k, pairedWith: e.target.value} : k))} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-40">
                          <option value="">No pair</option>{leading.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </>}
                      {kpi.indicator === "Leading" && paired && <><span className="text-[var(--text-muted)]">→</span><span className="text-[12px] text-[var(--accent-primary)]">{paired.name}</span></>}
                    </div>;
                  })}
                </div>
                {/* Example pairs */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-2">Example Leading → Lagging Pairs</div>
                  <div className="space-y-1 text-[14px] text-[var(--text-secondary)]">
                    {[
                      ["Employee engagement score", "Voluntary attrition rate"],
                      ["Training completion rate", "Skills coverage index"],
                      ["Automation coverage %", "Operating cost reduction"],
                      ["First contact resolution %", "Net Promoter Score"],
                      ["Cross-functional handoffs", "Process cycle time"],
                    ].map(([lead, lag], i) => <div key={i}><span className="text-[var(--success)]">{lead}</span> <span className="text-[var(--text-muted)]">→</span> <span className="text-[var(--accent-primary)]">{lag}</span></div>)}
                  </div>
                </div>
              </div>;
            })()}
          </Card>}

          {/* ─── 4. OM HEALTH CHECK ─── */}
          {perfView === "healthcheck" && <Card title="Operating Model Health Check">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Periodic assessment across 5 dimensions. Recommended: quarterly for Year 1, then annually. Score each dimension 1-5.</div>
            {/* Radar */}
            {(() => {
              const hasData = Object.values(perfHealth).some(v => v > 0);
              const avg = hasData ? (Object.values(perfHealth).reduce((s, v) => s + v, 0) / Math.max(Object.values(perfHealth).filter(v => v > 0).length, 1)) : 0;
              return <>
                {hasData && <div className="grid grid-cols-2 gap-5 mb-4">
                  <div className="h-[260px]"><RadarViz data={PERF_HEALTH_DIMS.map(d => ({ subject: d.name, current: perfHealth[d.id] || 0, benchmark: 3.5, max: 5 }))} /></div>
                  <div className="flex flex-col justify-center">
                    <div className="text-center mb-4"><div className="text-[42px] font-extrabold" style={{ color: avg >= 4 ? "var(--success)" : avg >= 3 ? "var(--warning)" : "var(--risk)" }}>{avg.toFixed(1)}</div><div className="text-[14px] text-[var(--text-muted)] uppercase">Overall OM Health</div><div className="text-[14px] font-semibold" style={{ color: avg >= 4 ? "var(--success)" : avg >= 3 ? "var(--accent-primary)" : "var(--risk)" }}>{avg >= 4 ? "Strong" : avg >= 3 ? "Developing" : avg >= 2 ? "Needs Attention" : "Critical"}</div></div>
                    <div className="grid grid-cols-2 gap-2">{PERF_HEALTH_DIMS.map(d => <div key={d.id} className="rounded-lg p-2 bg-[var(--bg)] text-center"><div className="text-[16px] font-bold" style={{ color: (perfHealth[d.id]||0) >= 4 ? "var(--success)" : (perfHealth[d.id]||0) >= 3 ? "var(--warning)" : "var(--risk)" }}>{perfHealth[d.id] || "—"}</div><div className="text-[11px] text-[var(--text-muted)]">{d.name}</div></div>)}</div>
                  </div>
                </div>}
              </>;
            })()}
            {/* Dimension cards */}
            <div className="space-y-4">
              {PERF_HEALTH_DIMS.map(dim => {
                const score = perfHealth[dim.id] || 0;
                return <div key={dim.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="text-[15px] font-bold text-[var(--text-primary)]">{dim.name}</div><div className="text-[13px] text-[var(--text-muted)]">{dim.desc}</div></div>
                    <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} onClick={() => setPerfHealth(p => ({...p, [dim.id]: p[dim.id] === n ? 0 : n}))} className="w-9 h-7 rounded-lg text-[14px] font-bold transition-all" style={{
                      background: score >= n ? `${n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)"}15` : "var(--bg)",
                      color: score >= n ? (n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)") : "var(--text-muted)",
                      border: score >= n ? `1px solid ${n <= 2 ? "var(--risk)" : n <= 3 ? "var(--warning)" : "var(--success)"}` : "1px solid var(--border)",
                    }}>{n}</button>)}</div>
                  </div>
                  {/* Checklist */}
                  <div className="grid grid-cols-2 gap-1 mt-2">{dim.questions.map((q, i) => <div key={i} className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><span style={{ color: score >= 3 ? "var(--success)" : score > 0 ? "var(--warning)" : "var(--text-muted)" }}>{score >= 3 ? "✓" : score > 0 ? "~" : "○"}</span>{q}</div>)}</div>
                </div>;
              })}
            </div>
            {/* Review cadence */}
            <div className="mt-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[rgba(212,134,10,0.04)] p-4 text-[14px] text-[var(--text-secondary)]">
              <strong className="text-[var(--accent-primary)]">Review Cadence:</strong> Conduct this health check <strong>quarterly</strong> during the first year of operating model transformation, then shift to <strong>annually</strong> once the model stabilizes. Track scores over time to identify regression.
            </div>
          </Card>}
        </div>}

        {/* ── TRANSITION PLAN TAB ── */}
        {omView === "4.3" && <div className="animate-tab-enter space-y-5">
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "migration" as const, label: "Migration Map", icon: "🗺" },
              { id: "waves" as const, label: "Wave Planning", icon: "🌊" },
              { id: "dependencies" as const, label: "Dependencies", icon: "🔗" },
              { id: "parallel" as const, label: "Parallel Running", icon: "⚡" },
              { id: "signoff" as const, label: "Sign-off Tracker", icon: "✅" },
            ]).map(v => <button key={v.id} onClick={() => setTransView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: transView === v.id ? "rgba(212,134,10,0.12)" : "transparent",
              color: transView === v.id ? "#e09040" : "var(--text-muted)",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. MIGRATION MAP ─── */}
          {transView === "migration" && <Card title="Current → Future State Migration Map">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">All operating model changes, categorized by type. Click the status to cycle, × to remove.</div>
            {/* Category summary */}
            <div className="flex gap-2 flex-wrap mb-4">
              {(["Structure", "Process", "Technology", "People", "Governance"] as const).map(cat => {
                const count = transChanges.filter(c => c.category === cat).length;
                return <div key={cat} className="rounded-xl px-3 py-2 text-center" style={{ background: `${TRANS_CAT_COLORS[cat]}08`, border: `1px solid ${TRANS_CAT_COLORS[cat]}25` }}>
                  <div className="text-[16px] font-extrabold" style={{ color: TRANS_CAT_COLORS[cat] }}>{count}</div>
                  <div className="text-[12px] font-semibold" style={{ color: TRANS_CAT_COLORS[cat] }}>{cat}</div>
                </div>;
              })}
              <div className="rounded-xl px-3 py-2 bg-[var(--surface-2)] text-center ml-auto"><div className="text-[16px] font-extrabold text-[var(--text-primary)]">{transChanges.length}</div><div className="text-[12px] text-[var(--text-muted)]">Total</div></div>
            </div>
            {/* Change cards */}
            <div className="space-y-3">
              {transChanges.map(change => {
                const statusColors: Record<string, string> = { "Not Started": "var(--text-muted)", "In Progress": "var(--warning)", Complete: "var(--success)" };
                const deps = change.dependencies.map(dId => transChanges.find(c => c.id === dId)?.name).filter(Boolean);
                return <div key={change.id} className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: TRANS_CAT_COLORS[change.category] }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${TRANS_CAT_COLORS[change.category]}15`, color: TRANS_CAT_COLORS[change.category] }}>{change.category}</span>
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{change.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[var(--text-muted)]">{TRANS_WAVE_LABELS[change.wave]?.split("(")[0]}</span>
                      <button onClick={() => { const cycle: TransChange["status"][] = ["Not Started", "In Progress", "Complete"]; setTransChanges(prev => prev.map(c => c.id === change.id ? {...c, status: cycle[(cycle.indexOf(c.status) + 1) % 3]} : c)); }} className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${statusColors[change.status]}15`, color: statusColors[change.status] }}>{change.status}</button>
                      <button onClick={() => setTransChanges(prev => prev.filter(c => c.id !== change.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[14px]">
                    <div className="flex gap-2"><span className="text-[var(--text-muted)] shrink-0">From:</span><span className="text-[var(--text-secondary)]">{change.from}</span></div>
                    <div className="flex gap-2"><span className="text-[var(--text-muted)] shrink-0">To:</span><span className="text-[var(--accent-primary)]">{change.to}</span></div>
                    <div className="flex gap-2"><span className="text-[var(--text-muted)] shrink-0">Affected:</span><span className="text-[var(--text-secondary)]">{change.affected}</span></div>
                    <div className="flex gap-2"><span className="text-[var(--text-muted)] shrink-0">Owner:</span><span className="text-[var(--text-secondary)]">{change.owner}</span></div>
                  </div>
                  {deps.length > 0 && <div className="flex gap-1 mt-2 flex-wrap"><span className="text-[12px] text-[var(--text-muted)]">Depends on:</span>{deps.map(d => <span key={d} className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--bg)] text-[var(--text-secondary)]">{d}</span>)}</div>}
                  <div className="flex items-center gap-2 mt-1"><span className="text-[12px] text-[var(--text-muted)]">Risk:</span><span className="text-[12px] font-semibold" style={{ color: change.risk === "High" ? "var(--risk)" : change.risk === "Medium" ? "var(--warning)" : "var(--success)" }}>{change.risk}</span></div>
                </div>;
              })}
            </div>
            {/* Add change */}
            {transAddingChange ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 mt-3 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Add Change</div>
              {(() => { const els: Record<string, string> = {}; return <>
                <div className="grid grid-cols-2 gap-3">
                  <input id="trans-name" placeholder="Change name..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                  <select id="trans-cat" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none"><option>Structure</option><option>Process</option><option>Technology</option><option>People</option><option>Governance</option></select>
                  <select id="trans-wave" className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none"><option value="0">Wave 0</option><option value="1">Wave 1</option><option value="2">Wave 2</option><option value="3">Wave 3</option></select>
                  <input id="trans-from" placeholder="From (current state)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="trans-to" placeholder="To (target state)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="trans-affected" placeholder="Who's affected..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                  <input id="trans-owner" placeholder="Owner..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { void els; const el = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || ""; const name = el("trans-name"); if (!name) return; setTransChanges(prev => [...prev, { id: `tc${Date.now()}`, name, category: el("trans-cat") as TransChange["category"], from: el("trans-from"), to: el("trans-to"), affected: el("trans-affected"), wave: Number(el("trans-wave")), dependencies: [], risk: "Medium", owner: el("trans-owner"), status: "Not Started" }]); setTransAddingChange(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Add</button>
                  <button onClick={() => setTransAddingChange(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
                </div>
              </>; })()}
            </div> : <button onClick={() => setTransAddingChange(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all mt-3">+ Add Change</button>}
          </Card>}

          {/* ─── 2. WAVE PLANNING ─── */}
          {transView === "waves" && <Card title="Wave Planning — Implementation Timeline">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Changes organized into implementation waves. Click wave buttons to reassign. Timeline shows parallel execution.</div>
            {/* Timeline visualization */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-4">
              <div className="flex items-end gap-0 h-32">
                {[0,1,2,3].map(wave => {
                  const changes = transChanges.filter(c => c.wave === wave);
                  const maxHeight = Math.max(...[0,1,2,3].map(w => transChanges.filter(c => c.wave === w).length), 1);
                  const height = (changes.length / maxHeight) * 100;
                  const waveColors = ["var(--text-muted)", "var(--success)", "var(--accent-primary)", "var(--purple)"];
                  return <div key={wave} className="flex-1 flex flex-col items-center">
                    <div className="text-[13px] font-bold mb-1" style={{ color: waveColors[wave] }}>{changes.length}</div>
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(height, 8)}%`, background: `${waveColors[wave]}20`, borderTop: `3px solid ${waveColors[wave]}` }} />
                  </div>;
                })}
              </div>
              <div className="flex gap-0 mt-2">{TRANS_WAVE_LABELS.map((label, i) => <div key={i} className="flex-1 text-center text-[12px] text-[var(--text-muted)]">{label.split("(")[0]}<div className="text-[11px]">({label.split("(")[1]?.replace(")", "") || ""})</div></div>)}</div>
            </div>
            {/* Wave details */}
            {[0,1,2,3].map(wave => {
              const changes = transChanges.filter(c => c.wave === wave);
              const waveColors = ["var(--text-muted)", "var(--success)", "var(--accent-primary)", "var(--purple)"];
              const waveIcons = ["🏗", "⚡", "🔧", "🔬"];
              return <div key={wave} className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-3" style={{ borderLeftColor: waveColors[wave] }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><span>{waveIcons[wave]}</span><span className="text-[15px] font-bold" style={{ color: waveColors[wave] }}>{TRANS_WAVE_LABELS[wave]}</span></div>
                  <span className="text-[14px] text-[var(--text-muted)]">{changes.length} changes</span>
                </div>
                {changes.length === 0 ? <div className="text-[14px] text-[var(--text-muted)] italic">No changes assigned to this wave</div> : <div className="space-y-2">{changes.map(ch => {
                  const highRisk = ch.risk === "High";
                  return <div key={ch.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)]">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: `${TRANS_CAT_COLORS[ch.category]}15`, color: TRANS_CAT_COLORS[ch.category] }}>{ch.category}</span>
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">{ch.name}</span>
                      {highRisk && <span className="text-[11px] text-[var(--risk)]">⚠ High risk</span>}
                    </div>
                    <div className="flex items-center gap-1">{[0,1,2,3].map(w => <button key={w} onClick={() => setTransChanges(prev => prev.map(c => c.id === ch.id ? {...c, wave: w} : c))} className="w-6 h-5 rounded text-[11px] font-bold" style={{ background: ch.wave === w ? `${waveColors[w]}20` : "transparent", color: ch.wave === w ? waveColors[w] : "var(--text-muted)", border: ch.wave === w ? `1px solid ${waveColors[w]}` : "1px solid var(--border)" }}>W{w}</button>)}</div>
                  </div>;
                })}</div>}
              </div>;
            })}
          </Card>}

          {/* ─── 3. INTERDEPENDENCY MAPPING ─── */}
          {transView === "dependencies" && <Card title="Interdependency Mapping">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Map dependencies between changes. Flag circular dependencies and identify the critical path.</div>
            {(() => {
              // Build dependency graph
              const depMap: Record<string, string[]> = {};
              transChanges.forEach(c => { depMap[c.id] = c.dependencies; });
              // Detect circular
              const circular: string[][] = [];
              const visited = new Set<string>();
              const checkCircular = (id: string, path: string[]): void => {
                if (path.includes(id)) { circular.push([...path, id]); return; }
                if (visited.has(id)) return;
                visited.add(id);
                (depMap[id] || []).forEach(depId => checkCircular(depId, [...path, id]));
              };
              transChanges.forEach(c => { visited.clear(); checkCircular(c.id, []); });
              // Critical path (longest chain)
              const chainLength = (id: string, seen = new Set<string>()): number => {
                if (seen.has(id)) return 0;
                seen.add(id);
                const deps = depMap[id] || [];
                if (deps.length === 0) return 1;
                return 1 + Math.max(...deps.map(d => chainLength(d, new Set(seen))));
              };
              const chains = transChanges.map(c => ({ change: c, length: chainLength(c.id) })).sort((a, b) => b.length - a.length);
              const criticalPath = chains[0]?.length || 0;
              // Orphans (no dependencies and nothing depends on them)
              const dependedOn = new Set(transChanges.flatMap(c => c.dependencies));
              const orphans = transChanges.filter(c => c.dependencies.length === 0 && !dependedOn.has(c.id));

              return <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-primary)]">{transChanges.reduce((s, c) => s + c.dependencies.length, 0)}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Dependencies</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--accent-primary)]">{criticalPath}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Critical Path Depth</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold" style={{ color: circular.length > 0 ? "var(--risk)" : "var(--success)" }}>{circular.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Circular Deps</div></div>
                  <div className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[20px] font-extrabold text-[var(--text-muted)]">{orphans.length}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">Independent</div></div>
                </div>
                {circular.length > 0 && <div className="rounded-xl border border-[var(--risk)]/20 bg-[rgba(239,68,68,0.04)] p-3">
                  <div className="text-[14px] font-bold text-[var(--risk)] mb-1">⚠ Circular Dependencies Detected</div>
                  {circular.slice(0, 3).map((chain, i) => <div key={i} className="text-[14px] text-[var(--text-secondary)]">{chain.map(id => transChanges.find(c => c.id === id)?.name || id).join(" → ")}</div>)}
                </div>}
                {/* Dependency table */}
                <div className="space-y-2">
                  {transChanges.map(change => {
                    const deps = change.dependencies.map(dId => transChanges.find(c => c.id === dId)).filter(Boolean) as TransChange[];
                    const dependents = transChanges.filter(c => c.dependencies.includes(change.id));
                    const depth = chainLength(change.id);
                    const isCritical = depth === criticalPath;
                    return <div key={change.id} className="rounded-lg border bg-[var(--surface-2)] p-3 flex items-center gap-3" style={{ borderColor: isCritical ? "var(--accent-primary)" : "var(--border)", borderLeftWidth: isCritical ? 3 : 1, borderLeftColor: isCritical ? "var(--accent-primary)" : undefined }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="text-[14px] font-semibold text-[var(--text-primary)]">{change.name}</span>{isCritical && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[rgba(212,134,10,0.1)] text-[var(--accent-primary)]">Critical Path</span>}</div>
                        <div className="flex gap-3 mt-1 text-[12px]">
                          {deps.length > 0 && <span className="text-[var(--text-muted)]">Needs: {deps.map(d => d.name).join(", ")}</span>}
                          {dependents.length > 0 && <span className="text-[var(--success)]">Enables: {dependents.map(d => d.name).join(", ")}</span>}
                          {deps.length === 0 && dependents.length === 0 && <span className="text-[var(--text-muted)]">Independent — can start anytime</span>}
                        </div>
                      </div>
                      <select value="" onChange={e => { if (e.target.value) setTransChanges(prev => prev.map(c => c.id === change.id ? {...c, dependencies: [...c.dependencies, e.target.value]} : c)); e.target.value = ""; }} className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] outline-none w-28">
                        <option value="">+ Depends on</option>
                        {transChanges.filter(c => c.id !== change.id && !change.dependencies.includes(c.id)).map(c => <option key={c.id} value={c.id}>{c.name.slice(0, 25)}</option>)}
                      </select>
                    </div>;
                  })}
                </div>
              </div>;
            })()}
          </Card>}

          {/* ─── 4. PARALLEL RUNNING ─── */}
          {transView === "parallel" && <Card title="Parallel Running Model">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">For major changes, define a period where old and new models run simultaneously with exit criteria and rollback plans.</div>
            {(() => {
              const majorChanges = transChanges.filter(c => c.risk === "High");
              if (majorChanges.length === 0) return <div className="text-center py-10 text-[var(--text-muted)]">No high-risk changes identified. Parallel running is recommended for high-risk transitions.</div>;
              return <div className="space-y-4">{majorChanges.map(change => {
                const existing = transParallels.find(p => p.changeId === change.id);
                const par = existing || { changeId: change.id, duration: "", exitCriteria: "", rollback: "" };
                const update = (field: string, val: string) => {
                  setTransParallels(prev => { const idx = prev.findIndex(p => p.changeId === change.id); if (idx >= 0) return prev.map((p, i) => i === idx ? {...p, [field]: val} : p); return [...prev, {...par, [field]: val}]; });
                };
                return <div key={change.id} className="rounded-xl border-l-4 border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderLeftColor: "var(--risk)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[14px] text-[var(--risk)]">⚠</span>
                    <span className="text-[15px] font-bold text-[var(--text-primary)]">{change.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[rgba(239,68,68,0.1)] text-[var(--risk)]">High Risk</span>
                  </div>
                  <div className="text-[14px] text-[var(--text-muted)] mb-3">{change.from} → {change.to}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Parallel Run Duration</label><input value={par.duration} onChange={e => update("duration", e.target.value)} placeholder="e.g. 4 weeks, 1 month..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Exit Criteria — Switch Off Old Model When</label><input value={par.exitCriteria} onChange={e => update("exitCriteria", e.target.value)} placeholder="e.g. 99% accuracy for 2 weeks..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                    <div className="col-span-2"><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Rollback Plan</label><input value={par.rollback} onChange={e => update("rollback", e.target.value)} placeholder="e.g. Revert to legacy ERP within 48 hours, restore backup..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                  </div>
                </div>;
              })}</div>;
            })()}
          </Card>}

          {/* ─── 5. STAKEHOLDER SIGN-OFF ─── */}
          {transView === "signoff" && <Card title="Stakeholder Sign-off Tracker">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Track approvals from key stakeholders. All approvals required before go-live.</div>
            {/* Progress */}
            {(() => {
              const approved = transStakeholders.filter(s => s.status === "Approved").length;
              const total = transStakeholders.length;
              const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
              return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[15px] font-bold text-[var(--text-primary)]">Approval Progress</span>
                  <span className="text-[16px] font-extrabold" style={{ color: pct === 100 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--text-muted)" }}>{approved}/{total} approved</span>
                </div>
                <div className="h-3 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--accent-primary)" }} /></div>
                {pct === 100 && <div className="mt-2 text-[14px] text-[var(--success)] font-semibold">✓ All stakeholders have approved — ready for go-live</div>}
              </div>;
            })()}
            {/* Stakeholder cards */}
            <div className="space-y-2">
              {transStakeholders.map(sh => {
                const statusColors: Record<string, string> = { "Not Started": "var(--text-muted)", "In Review": "var(--warning)", Approved: "var(--success)", Rejected: "var(--risk)" };
                const statusIcons: Record<string, string> = { "Not Started": "○", "In Review": "◐", Approved: "✓", Rejected: "✗" };
                return <div key={sh.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] w-6 text-center" style={{ color: statusColors[sh.status] }}>{statusIcons[sh.status]}</span>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold text-[var(--text-primary)]">{sh.name}</div>
                      <div className="text-[13px] text-[var(--text-muted)]">{sh.role}</div>
                    </div>
                    <select value={sh.status} onChange={e => setTransStakeholders(prev => prev.map(s => s.id === sh.id ? {...s, status: e.target.value as TransStakeholder["status"]} : s))} className="bg-[var(--bg)] border rounded-lg px-2 py-1 text-[13px] font-semibold outline-none" style={{ borderColor: `${statusColors[sh.status]}40`, color: statusColors[sh.status] }}>
                      <option>Not Started</option><option>In Review</option><option>Approved</option><option>Rejected</option>
                    </select>
                    <button onClick={() => setTransStakeholders(prev => prev.filter(s => s.id !== sh.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>
                  </div>
                  <input value={sh.conditions} onChange={e => setTransStakeholders(prev => prev.map(s => s.id === sh.id ? {...s, conditions: e.target.value} : s))} placeholder="Conditions or comments..." className="w-full mt-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
                </div>;
              })}
            </div>
            {/* Add stakeholder */}
            {transAddingStakeholder ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input id="sh-name" placeholder="Name/Title..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="sh-role" placeholder="Approval role..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const el = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || ""; const name = el("sh-name"); if (!name) return; setTransStakeholders(prev => [...prev, { id: `s${Date.now()}`, name, role: el("sh-role"), status: "Not Started", conditions: "" }]); setTransAddingStakeholder(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Add</button>
                <button onClick={() => setTransAddingStakeholder(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setTransAddingStakeholder(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all mt-3">+ Add Stakeholder</button>}
          </Card>}
        </div>}

        {/* ── MODEL GOVERNANCE TAB ── */}
        {omView === "4.4" && <div className="animate-tab-enter space-y-5">
          <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 border border-[var(--border)]">
            {([
              { id: "ownership" as const, label: "Model Ownership", icon: "👤" },
              { id: "cadence" as const, label: "Review Cadence", icon: "📅" },
              { id: "changes" as const, label: "Change Control", icon: "📝" },
              { id: "versions" as const, label: "Version Control", icon: "🔢" },
            ]).map(v => <button key={v.id} onClick={() => setMgovView(v.id)} className="flex-1 px-3 py-2 rounded-lg text-[14px] font-semibold transition-all" style={{
              background: mgovView === v.id ? "rgba(212,134,10,0.12)" : "transparent",
              color: mgovView === v.id ? "#e09040" : "var(--text-muted)",
            }}>{v.icon} {v.label}</button>)}
          </div>

          {/* ─── 1. MODEL OWNERSHIP ─── */}
          {mgovView === "ownership" && <div className="space-y-5">
            <Card title="Operating Model Ownership">
              <div className="text-[15px] text-[var(--text-secondary)] mb-4">Define who owns and governs the operating model post-implementation.</div>
              <div className="space-y-3">
                {mgovOwners.map((owner, i) => {
                  const isGlobal = i < 2;
                  return <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{isGlobal ? (i === 0 ? "👑" : "🛡") : "🏢"}</span>
                      <span className="text-[15px] font-bold" style={{ color: isGlobal ? "var(--accent-primary)" : "var(--text-primary)" }}>{owner.role}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Name / Title</label>
                      <input value={owner.name} onChange={e => setMgovOwners(prev => prev.map((o, j) => j === i ? {...o, name: e.target.value} : o))} placeholder="Assign owner..." className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
                      <div><label className="text-[12px] text-[var(--text-muted)] uppercase block mb-1">Scope & Accountability</label>
                      <input value={owner.scope} onChange={e => setMgovOwners(prev => prev.map((o, j) => j === i ? {...o, scope: e.target.value} : o))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-secondary)] outline-none" /></div>
                    </div>
                  </div>;
                })}
                <button onClick={() => setMgovOwners(prev => [...prev, { role: "Function Owner", name: "", scope: "" }])} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ Add Owner</button>
              </div>
            </Card>
            <Card title="RACI for Model Governance Activities">
              <div className="text-[15px] text-[var(--text-secondary)] mb-4">Assign R/A/C/I roles for key governance activities. Click cells to cycle.</div>
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] min-w-[180px]">Activity</th>
                {mgovOwners.slice(0, 6).map((o, i) => <th key={i} className="px-2 py-2 text-center text-[11px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)] min-w-[70px]">{o.role.replace("Owner", "").trim() || `Owner ${i+1}`}</th>)}
              </tr></thead><tbody>
                {MGOV_RACI_ACTIVITIES.map(activity => <tr key={activity} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 text-[14px] font-semibold text-[var(--text-primary)]">{activity}</td>
                  {mgovOwners.slice(0, 6).map((_, oi) => {
                    const key = `${activity}__${oi}`;
                    const val = mgovRaci[key]?.[activity] || mgovRaci[key] as unknown as string || "";
                    const realVal = typeof val === "string" ? val : "";
                    const raciColors: Record<string, string> = { R: "var(--accent-primary)", A: "var(--risk)", C: "var(--purple)", I: "var(--text-muted)" };
                    return <td key={oi} className="px-2 py-2 text-center">
                      <button onClick={() => {
                        const cycle = ["", "R", "A", "C", "I"];
                        const next = cycle[(cycle.indexOf(realVal) + 1) % cycle.length];
                        setMgovRaci(prev => ({...prev, [key]: next as unknown as Record<string, string>}));
                      }} className="w-7 h-7 rounded-lg text-[14px] font-bold inline-flex items-center justify-center transition-all" style={{
                        background: realVal ? `${raciColors[realVal] || "var(--text-muted)"}15` : "var(--surface-2)",
                        color: realVal ? raciColors[realVal] || "var(--text-muted)" : "var(--border)",
                        border: realVal ? `1px solid ${raciColors[realVal] || "var(--text-muted)"}30` : "1px solid var(--border)",
                      }}>{realVal || "·"}</button>
                    </td>;
                  })}
                </tr>)}
              </tbody></table></div>
              <div className="flex gap-4 mt-2 text-[13px] text-[var(--text-muted)]">{[{l:"R",n:"Responsible",c:"var(--accent-primary)"},{l:"A",n:"Accountable",c:"var(--risk)"},{l:"C",n:"Consulted",c:"var(--purple)"},{l:"I",n:"Informed",c:"var(--text-muted)"}].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-5 h-5 rounded text-[13px] font-bold flex items-center justify-center" style={{background:`${x.c}15`,color:x.c}}>{x.l}</span>{x.n}</span>)}</div>
            </Card>
          </div>}

          {/* ─── 2. REVIEW CADENCE ─── */}
          {mgovView === "cadence" && <Card title="Review Cadence & Calendar">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Schedule formal operating model reviews. Quarterly for the first year, then annually.</div>
            {/* Timeline */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
              {mgovReviews.sort((a, b) => a.date.localeCompare(b.date)).map(rev => {
                const typeColors: Record<string, string> = { Quarterly: "var(--accent-primary)", Annual: "var(--purple)", Triggered: "var(--warning)" };
                const statusColors: Record<string, string> = { Scheduled: "var(--text-muted)", Complete: "var(--success)", Overdue: "var(--risk)" };
                return <div key={rev.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 min-w-[200px] shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${typeColors[rev.type]}15`, color: typeColors[rev.type] }}>{rev.type}</span>
                    <button onClick={() => { const cycle: MgovReview["status"][] = ["Scheduled", "Complete", "Overdue"]; setMgovReviews(prev => prev.map(r => r.id === rev.id ? {...r, status: cycle[(cycle.indexOf(r.status) + 1) % 3]} : r)); }} className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${statusColors[rev.status]}15`, color: statusColors[rev.status] }}>{rev.status}</button>
                  </div>
                  <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1">{rev.name}</div>
                  <div className="text-[13px] text-[var(--text-muted)] mb-1">{rev.date}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">{rev.participants}</div>
                  <input value={rev.notes} onChange={e => setMgovReviews(prev => prev.map(r => r.id === rev.id ? {...r, notes: e.target.value} : r))} placeholder="Notes..." className="w-full mt-2 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[12px] outline-none placeholder:text-[var(--text-muted)]" />
                  <button onClick={() => setMgovReviews(prev => prev.filter(r => r.id !== rev.id))} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--risk)] mt-1">Remove</button>
                </div>;
              })}
              <button onClick={() => setMgovReviews(prev => [...prev, { id: `mr${Date.now()}`, name: "New Review", type: "Quarterly", date: new Date().toISOString().split("T")[0], status: "Scheduled", participants: "Model Owner, Steward", notes: "" }])} className="rounded-xl border-2 border-dashed border-[var(--border)] min-w-[120px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-all shrink-0">+ Add Review</button>
            </div>
            {/* Review checklist */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase mb-3">Standard Review Checklist</div>
              <div className="grid grid-cols-2 gap-2">{MGOV_REVIEW_CHECKLIST.map((q, i) => <div key={i} className="flex items-center gap-2 text-[14px] text-[var(--text-secondary)]"><span className="text-[var(--text-muted)]">☐</span>{q}</div>)}</div>
            </div>
            {/* Trigger conditions */}
            <div className="rounded-xl border border-[var(--warning)]/20 bg-[rgba(245,158,11,0.04)] p-4 mt-4">
              <div className="text-[14px] font-bold text-[var(--warning)] uppercase mb-2">Triggered Review Conditions</div>
              <div className="space-y-1 text-[14px] text-[var(--text-secondary)]">
                {["Strategy changes (new priorities, pivot, or M&A)", "Major market disruption or competitive shift", "Health check score drops below 3.0", "2+ KPIs move to Red status", "Senior leadership change (new CEO, COO, CHRO)"].map((cond, i) => <div key={i} className="flex items-center gap-2"><span className="text-[var(--warning)]">⚡</span>{cond}</div>)}
              </div>
            </div>
          </Card>}

          {/* ─── 3. CHANGE CONTROL ─── */}
          {mgovView === "changes" && <Card title="Operating Model Change Control">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Formal process for requesting and approving changes to the operating model. All changes are logged.</div>
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total Requests", val: mgovChangeReqs.length, color: "var(--text-primary)" },
                { label: "Under Review", val: mgovChangeReqs.filter(r => r.status === "Under Review").length, color: "var(--warning)" },
                { label: "Approved", val: mgovChangeReqs.filter(r => r.status === "Approved" || r.status === "Implemented").length, color: "var(--success)" },
                { label: "Rejected", val: mgovChangeReqs.filter(r => r.status === "Rejected").length, color: "var(--risk)" },
              ].map(k => <div key={k.label} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[12px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}
            </div>
            {/* Change log */}
            {mgovChangeReqs.length > 0 && <div className="overflow-x-auto rounded-lg border border-[var(--border)] mb-4"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
              {["Title", "Reason", "Impact", "Cost", "Requested By", "Date", "Status", "Approver", ""].map(h => <th key={h} className="px-2 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] whitespace-nowrap">{h}</th>)}
            </tr></thead><tbody>
              {mgovChangeReqs.map(cr => {
                const statusColors: Record<string, string> = { Draft: "var(--text-muted)", "Under Review": "var(--warning)", Approved: "var(--success)", Rejected: "var(--risk)", Implemented: "var(--purple)" };
                return <tr key={cr.id} className="border-b border-[var(--border)]">
                  <td className="px-2 py-2 font-semibold text-[var(--text-primary)]">{cr.title}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)] max-w-[150px] truncate">{cr.reason}</td>
                  <td className="px-2 py-2 text-[var(--text-muted)] max-w-[120px] truncate">{cr.impact}</td>
                  <td className="px-2 py-2 text-[var(--text-secondary)]">{cr.cost}</td>
                  <td className="px-2 py-2 text-[var(--text-muted)]">{cr.requestedBy}</td>
                  <td className="px-2 py-2 text-[var(--text-muted)]">{cr.date}</td>
                  <td className="px-2 py-2"><button onClick={() => { const cycle: MgovChangeReq["status"][] = ["Draft", "Under Review", "Approved", "Rejected", "Implemented"]; setMgovChangeReqs(prev => prev.map(r => r.id === cr.id ? {...r, status: cycle[(cycle.indexOf(r.status) + 1) % cycle.length]} : r)); }} className="px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${statusColors[cr.status]}12`, color: statusColors[cr.status] }}>{cr.status}</button></td>
                  <td className="px-2 py-2"><input value={cr.approver} onChange={e => setMgovChangeReqs(prev => prev.map(r => r.id === cr.id ? {...r, approver: e.target.value} : r))} placeholder="Approver..." className="bg-[var(--bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[12px] w-20 outline-none placeholder:text-[var(--text-muted)]" /></td>
                  <td className="px-2 py-2"><button onClick={() => setMgovChangeReqs(prev => prev.filter(r => r.id !== cr.id))} className="text-[13px] text-[var(--text-muted)] hover:text-[var(--risk)]">×</button></td>
                </tr>;
              })}
            </tbody></table></div>}
            {/* Add change request */}
            {mgovAddingCr ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">New Change Request</div>
              <div className="grid grid-cols-2 gap-3">
                <input id="cr-title" placeholder="What change is requested..." className="col-span-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="cr-reason" placeholder="Why (business justification)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="cr-impact" placeholder="Impact on other model areas..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="cr-cost" placeholder="Estimated cost..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="cr-by" placeholder="Requested by..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const el = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || ""; const title = el("cr-title"); if (!title) return; setMgovChangeReqs(prev => [...prev, { id: `cr${Date.now()}`, title, reason: el("cr-reason"), impact: el("cr-impact"), cost: el("cr-cost"), requestedBy: el("cr-by"), date: new Date().toISOString().split("T")[0], status: "Draft", approver: "" }]); setMgovAddingCr(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Submit</button>
                <button onClick={() => setMgovAddingCr(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setMgovAddingCr(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">+ New Change Request</button>}
          </Card>}

          {/* ─── 4. VERSION CONTROL ─── */}
          {mgovView === "versions" && <Card title="Operating Model Version History">
            <div className="text-[15px] text-[var(--text-secondary)] mb-4">Track model evolution over time. Each version captures what changed and why.</div>
            {/* Timeline */}
            <div className="space-y-4">
              {mgovVersions.sort((a, b) => b.date.localeCompare(a.date)).map((ver, vi) => {
                const isLatest = vi === 0;
                const prevVer = mgovVersions.sort((a, b) => b.date.localeCompare(a.date))[vi + 1];
                return <div key={ver.id} className="relative">
                  {/* Timeline line */}
                  {vi < mgovVersions.length - 1 && <div className="absolute left-[18px] top-[40px] w-0.5 h-[calc(100%+16px)] bg-[var(--border)]" />}
                  <div className="flex gap-4">
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 z-10" style={{ background: isLatest ? "var(--accent-primary)" : "var(--surface-2)", borderColor: isLatest ? "var(--accent-primary)" : "var(--border)", color: isLatest ? "white" : "var(--text-muted)" }}>
                      <span className="text-[12px] font-bold">{ver.version}</span>
                    </div>
                    <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4" style={{ borderColor: isLatest ? "var(--accent-primary)" : undefined }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[16px] font-bold text-[var(--text-primary)]">v{ver.version}</span>
                          {isLatest && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[rgba(212,134,10,0.1)] text-[var(--accent-primary)]">Current</span>}
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                          <span>{ver.date}</span>
                          <span>by {ver.author}</span>
                          {!isLatest && <button onClick={() => setMgovVersions(prev => prev.filter(v => v.id !== ver.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)]">×</button>}
                        </div>
                      </div>
                      <div className="text-[14px] text-[var(--text-secondary)] mb-2">{ver.summary}</div>
                      <div className="space-y-1">{ver.changes.map((ch, ci) => <div key={ci} className="flex items-center gap-2 text-[14px]"><span className="text-[var(--success)]">+</span><span className="text-[var(--text-secondary)]">{ch}</span></div>)}</div>
                      {prevVer && <div className="mt-2 text-[12px] text-[var(--text-muted)]">Previous: v{prevVer.version} ({prevVer.date})</div>}
                    </div>
                  </div>
                </div>;
              })}
            </div>
            {/* Add version */}
            {mgovAddingVersion ? <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[rgba(212,134,10,0.04)] p-4 mt-4 space-y-3">
              <div className="text-[15px] font-bold text-[var(--accent-primary)]">Release New Version</div>
              <div className="grid grid-cols-3 gap-3">
                <input id="ver-num" placeholder="Version (e.g. 1.1)..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="ver-author" placeholder="Author..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="ver-date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none" />
                <input id="ver-summary" placeholder="Summary of changes..." className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
                <input id="ver-changes" placeholder="Changes (comma-separated)..." className="col-span-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const el = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || ""; const version = el("ver-num"); if (!version) return; setMgovVersions(prev => [...prev, { id: `v${Date.now()}`, version, date: el("ver-date") || new Date().toISOString().split("T")[0], summary: el("ver-summary"), changes: el("ver-changes").split(",").map(c => c.trim()).filter(Boolean), author: el("ver-author") || "Model Steward" }]); setMgovAddingVersion(false); }} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white" style={{ background: "var(--accent-primary)" }}>Release</button>
                <button onClick={() => setMgovAddingVersion(false)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setMgovAddingVersion(true)} className="w-full px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all mt-4">+ Release New Version</button>}
          </Card>}
        </div>}

      </div>{/* end content area */}
    </div>{/* end flex layout */}
  </div>;

}

/* ═══════════════════════════════════════════════════════════════
   ROLE COMPARISON VIEW — Side-by-side current vs redesigned roles
   ═══════════════════════════════════════════════════════════════ */


export function RoleComparison({ model, f, onBack, jobs, jobStates }: { model: string; f: Filters; onBack: () => void; jobs?: string[]; jobStates?: Record<string, JobDesignState> }) {
  const [data] = useApiData(() => api.getOverview(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [deconData, setDeconData] = useState<Record<string, Record<string, unknown> | null>>({});

  const availableJobs = jobs || [];
  const toggleJob = (j: string) => {
    setSelectedJobs(prev => prev.includes(j) ? prev.filter(x => x !== j) : prev.length < 4 ? [...prev, j] : prev);
  };

  // Fetch deconstruction data for selected jobs
  useEffect(() => {
    selectedJobs.forEach(j => {
      if (!deconData[j]) {
        api.getDeconstruction(model, j, f).then(d => setDeconData(prev => ({ ...prev, [j]: d }))).catch(() => setDeconData(prev => ({ ...prev, [j]: null })));
      }
    });
  }, [selectedJobs, model]);

  const getJobState = (j: string) => jobStates?.[j] || null;

  return <div>
    <PageHeader icon="⚖️" title="Role Comparison" subtitle="Compare current vs. redesigned roles side-by-side" onBack={onBack} moduleId="rolecompare" />

    {/* Job selector */}
    <Card title="Select Roles to Compare (max 4)">
      <div className="flex gap-2 flex-wrap mb-3">
        {selectedJobs.map(j => <button key={j} onClick={() => toggleJob(j)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer flex items-center gap-1">{j} <span className="opacity-50">✕</span></button>)}
        {selectedJobs.length === 0 && <span className="text-[15px] text-[var(--text-muted)]">Select up to 4 jobs below</span>}
      </div>
      <div className="flex gap-1.5 flex-wrap">{availableJobs.slice(0, 30).map(j => <button key={j} onClick={() => toggleJob(j)} className="px-2 py-1 rounded text-[14px] font-semibold transition-all cursor-pointer" style={{ background: selectedJobs.includes(j) ? "rgba(212,134,10,0.15)" : "var(--surface-2)", color: selectedJobs.includes(j) ? "var(--accent-primary)" : "var(--text-muted)", border: `1px solid ${selectedJobs.includes(j) ? "rgba(212,134,10,0.3)" : "var(--border)"}` }}>{j}</button>)}</div>
    </Card>

    {/* Comparison grid */}
    {selectedJobs.length > 0 && <div className={`grid gap-4 ${selectedJobs.length === 1 ? "grid-cols-1" : selectedJobs.length === 2 ? "grid-cols-2" : selectedJobs.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
      {selectedJobs.map(j => {
        const decon = deconData[j] as Record<string, unknown> | null;
        const js = getJobState(j);
        const tasks = ((decon as Record<string, unknown>)?.tasks || []) as Record<string, unknown>[];
        const highAi = tasks.filter(t => String(t["AI Impact"] || "").toLowerCase() === "high").length;
        const totalTime = tasks.reduce((s, t) => s + Number(t["Current Time Spent %"] || 0), 0);
        const aiTime = tasks.filter(t => String(t["AI Impact"] || "").toLowerCase() !== "low").reduce((s, t) => s + Number(t["Time Saved %"] || t["Current Time Spent %"] || 0) * 0.3, 0);
        const hasRedesign = js && js.recon;

        return <div key={j} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--accent-primary)]/5 to-transparent">
            <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1 truncate">{j}</div>
            <div className="flex gap-2">
              <Badge color="indigo">{tasks.length} tasks</Badge>
              {hasRedesign && <Badge color="green">Redesigned</Badge>}
              {!hasRedesign && <Badge color="gray">Current</Badge>}
            </div>
          </div>

          {/* Current state metrics */}
          <div className="p-4">
            <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Current State</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--accent-primary)]">{tasks.length}</div><div className="text-[15px] text-[var(--text-muted)]">Tasks</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--warning)]">{highAi}</div><div className="text-[15px] text-[var(--text-muted)]">High AI</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--success)]">{Math.round(aiTime)}%</div><div className="text-[15px] text-[var(--text-muted)]">AI Saveable</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--text-primary)]">{totalTime}%</div><div className="text-[15px] text-[var(--text-muted)]">Utilized</div></div>
            </div>

            {/* Task breakdown */}
            <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Top Tasks</div>
            <div className="space-y-1">
              {tasks.slice(0, 5).map((t, i) => <div key={i} className="flex items-center gap-2 text-[15px]">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: String(t["AI Impact"]).toLowerCase() === "high" ? "var(--risk)" : String(t["AI Impact"]).toLowerCase() === "moderate" ? "var(--warning)" : "var(--success)" }} />
                <span className="text-[var(--text-secondary)] truncate flex-1">{String(t["Task Name"] || "—")}</span>
                <span className="text-[var(--text-muted)] shrink-0">{t["Current Time Spent %"]}%</span>
              </div>)}
            </div>

            {/* Redesigned state if available */}
            {hasRedesign && js.recon && <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="text-[14px] font-bold text-[var(--success)] uppercase tracking-wider mb-1">↓ After Redesign ({js.scenario})</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2 bg-[rgba(16,185,129,0.06)] text-center"><div className="text-[15px] font-extrabold text-[var(--success)]">{String((js.recon as Record<string, unknown>).human_pct || "—")}%</div><div className="text-[15px] text-[var(--text-muted)]">Human</div></div>
                <div className="rounded-lg p-2 bg-[rgba(139,92,246,0.06)] text-center"><div className="text-[15px] font-extrabold text-[var(--purple)]">{String((js.recon as Record<string, unknown>).ai_pct || "—")}%</div><div className="text-[15px] text-[var(--text-muted)]">AI</div></div>
              </div>
            </div>}
          </div>
        </div>;
      })}
    </div>}

    {selectedJobs.length === 0 && <Empty text="Select roles above to compare their current state, AI impact, and redesign outcomes side by side." icon="⚖️" />}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   QUICK-WIN IDENTIFIER — Highest ROI, lowest effort AI opportunities
   ═══════════════════════════════════════════════════════════════ */


export function QuickWinIdentifier({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, loading] = useApiData(() => api.getAIPriority(model, f), [model, f.func, f.jf, f.sf, f.cl]);
  const [sortBy, setSortBy] = useState<"roi"|"effort"|"combined">("combined");

  const priorities = ((data as Record<string, unknown>)?.priorities || []) as Record<string, unknown>[];

  // Score each opportunity: ROI = time_saved * high_impact, Effort = inverse of automation readiness
  const scored = useMemo(() => {
    return priorities.map(p => {
      const timeSaved = Number(p.avg_time_saved || p.time_saved_pct || 0);
      const impact = String(p.ai_impact || p.impact || "").toLowerCase();
      const impactScore = impact === "high" ? 3 : impact === "moderate" ? 2 : 1;
      const taskType = String(p.task_type || "").toLowerCase();
      const effortScore = taskType === "repetitive" ? 1 : taskType === "variable" ? 2 : 3;
      const logic = String(p.logic || "").toLowerCase();
      const logicMult = logic === "deterministic" ? 1.3 : logic === "probabilistic" ? 1.0 : 0.7;
      const roi = timeSaved * impactScore * logicMult;
      const combined = roi / Math.max(effortScore, 0.5);
      return { ...p, _roi: Math.round(roi * 10) / 10, _effort: effortScore, _combined: Math.round(combined * 10) / 10, _impactScore: impactScore };
    }).sort((a, b) => sortBy === "roi" ? b._roi - a._roi : sortBy === "effort" ? a._effort - b._effort : b._combined - a._combined);
  }, [priorities, sortBy]);

  const quickWins = scored.filter(s => s._effort <= 1.5 && s._impactScore >= 2).slice(0, 8);
  const strategicBets = scored.filter(s => s._effort > 1.5 && s._impactScore >= 2).slice(0, 5);
  const easyAutomations = scored.filter(s => s._effort <= 1 && s._impactScore <= 1).slice(0, 5);

  const effortColor = (e: number) => e <= 1 ? "var(--success)" : e <= 2 ? "var(--warning)" : "var(--risk)";
  const roiColor = (r: number) => r >= 20 ? "var(--success)" : r >= 10 ? "var(--accent-primary)" : "var(--text-muted)";

  return <div>
    <PageHeader icon="⚡" title="Quick-Win Identifier" subtitle="Highest ROI, lowest effort AI transformation opportunities" onBack={onBack} moduleId="quickwins" />

    {loading && <LoadingBar />}

    {/* Summary KPIs */}
    <div className="grid grid-cols-4 gap-3 mb-4">
      <KpiCard label="Total Opportunities" value={scored.length} accent />
      <KpiCard label="Quick Wins" value={quickWins.length} />
      <KpiCard label="Strategic Bets" value={strategicBets.length} />
      <KpiCard label="Avg ROI Score" value={scored.length ? (scored.reduce((s, x) => s + x._roi, 0) / scored.length).toFixed(1) : "—"} />
    </div>

    {/* Sort controls */}
    <div className="flex gap-2 mb-4">
      {(["combined","roi","effort"] as const).map(s => <button key={s} onClick={() => setSortBy(s)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold transition-all cursor-pointer" style={{ background: sortBy === s ? "rgba(212,134,10,0.15)" : "var(--surface-2)", color: sortBy === s ? "var(--accent-primary)" : "var(--text-muted)", border: `1px solid ${sortBy === s ? "rgba(212,134,10,0.3)" : "var(--border)"}` }}>{s === "combined" ? "Best Overall" : s === "roi" ? "Highest ROI" : "Lowest Effort"}</button>)}
    </div>

    {/* Quick Wins section */}
    {quickWins.length > 0 && <Card title="⚡ Quick Wins — High Impact, Low Effort">
      <div className="text-[15px] text-[var(--text-secondary)] mb-3">These opportunities offer the best return for minimal implementation complexity. Start here.</div>
      <div className="grid grid-cols-2 gap-3">
        {quickWins.map((w, i) => <div key={i} className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] border-l-[3px] border-l-[var(--success)] transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[15px] font-bold text-[var(--text-primary)] truncate flex-1 mr-2">{String(w["Task Name"] || w.task_name || "—")}</div>
            <span className="text-[14px] font-bold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.15)] text-[var(--success)] shrink-0">Quick Win</span>
          </div>
          <div className="text-[15px] text-[var(--text-muted)] mb-2">{String(w["Job Title"] || w.job_title || "—")}</div>
          <div className="flex gap-3">
            <div><span className="text-[15px] text-[var(--text-muted)] uppercase">ROI</span><div className="text-[15px] font-extrabold" style={{ color: roiColor(w._roi) }}>{w._roi}</div></div>
            <div><span className="text-[15px] text-[var(--text-muted)] uppercase">Effort</span><div className="text-[15px] font-extrabold" style={{ color: effortColor(w._effort) }}>{w._effort === 1 ? "Low" : "Med"}</div></div>
            <div><span className="text-[15px] text-[var(--text-muted)] uppercase">Time Saved</span><div className="text-[15px] font-extrabold text-[var(--accent-primary)]">{String(w.avg_time_saved || w.time_saved_pct || "—")}%</div></div>
          </div>
        </div>)}
      </div>
    </Card>}

    {/* Strategic Bets */}
    {strategicBets.length > 0 && <Card title="🎯 Strategic Bets — High Impact, Higher Effort">
      <div className="space-y-2">
        {strategicBets.map((w, i) => <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="flex-1"><div className="text-[15px] font-bold text-[var(--text-primary)]">{String(w["Task Name"] || w.task_name || "—")}</div><div className="text-[14px] text-[var(--text-muted)]">{String(w["Job Title"] || w.job_title || "—")}</div></div>
          <div className="text-center"><div className="text-[15px] font-extrabold" style={{ color: roiColor(w._roi) }}>{w._roi}</div><div className="text-[15px] text-[var(--text-muted)]">ROI</div></div>
          <div className="text-center"><div className="text-[15px] font-extrabold" style={{ color: effortColor(w._effort) }}>{w._effort <= 2 ? "Med" : "High"}</div><div className="text-[15px] text-[var(--text-muted)]">Effort</div></div>
        </div>)}
      </div>
    </Card>}

    {/* All scored — compact table */}
    <Card title="All Opportunities — Ranked">
      <div className="overflow-x-auto"><table className="w-full text-[15px]"><thead><tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
        <th className="text-left px-2 py-1.5 font-semibold">#</th>
        <th className="text-left px-2 py-1.5 font-semibold">Task</th>
        <th className="text-left px-2 py-1.5 font-semibold">Role</th>
        <th className="text-center px-2 py-1.5 font-semibold">ROI</th>
        <th className="text-center px-2 py-1.5 font-semibold">Effort</th>
        <th className="text-center px-2 py-1.5 font-semibold">Score</th>
      </tr></thead><tbody>
        {scored.slice(0, 20).map((w, i) => <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
          <td className="px-2 py-1.5 text-[var(--text-muted)]">{i + 1}</td>
          <td className="px-2 py-1.5 text-[var(--text-primary)] font-semibold truncate max-w-[200px]">{String(w["Task Name"] || w.task_name || "—")}</td>
          <td className="px-2 py-1.5 text-[var(--text-secondary)] truncate max-w-[150px]">{String(w["Job Title"] || w.job_title || "—")}</td>
          <td className="px-2 py-1.5 text-center font-bold" style={{ color: roiColor(w._roi) }}>{w._roi}</td>
          <td className="px-2 py-1.5 text-center font-bold" style={{ color: effortColor(w._effort) }}>{w._effort <= 1 ? "Low" : w._effort <= 2 ? "Med" : "High"}</td>
          <td className="px-2 py-1.5 text-center font-extrabold text-[var(--accent-primary)]">{w._combined}</td>
        </tr>)}
      </tbody></table></div>
    </Card>

    {scored.length === 0 && !loading && <Empty text="Upload Work Design data to identify quick-win AI automation opportunities. The identifier scores every task by ROI and implementation effort." icon="⚡" />}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MAIN TOOL SHELL — scoped to a project
   ═══════════════════════════════════════════════════════════════ */


export type OMNodeType2   = "org-unit"|"coe"|"shared-service"|"ai-node"|"role"|"governance";
export type OMEdgeType2   = "reporting"|"service"|"advisory"|"data-flow";
export type OMDesignMode2 = "current"|"target";

export interface OMNode2 {
  id: string; type: OMNodeType2; label: string;
  x: number; y: number; w: number; h: number; color: string;
  currentFte?: number; targetFte?: number; aiMaturity?: string;
  notes?: string; wave?: number; kpiIds?: string[];
}
export interface OMEdge2  { id: string; fromId: string; toId: string; type: OMEdgeType2; }
export interface OMLayer2 { id: string; label: string; y: number; height: number; color: string; }
export interface OMVersion2 { id: string; name: string; ts: string; nodes: OMNode2[]; edges: OMEdge2[]; layers: OMLayer2[]; }
export interface OMKpi2 { id: string; objectiveId: string; name: string; category: string; unit: string; currentValue: number; targetValue: number; baselineValue: number; timeframe: string; direction: "increase"|"decrease"|"maintain"; linkedNodeIds: string[]; status: "on-track"|"at-risk"|"off-track"|"achieved"; notes?: string; }
export interface OMObjective2 { id: string; name: string; description: string; priority: "critical"|"high"|"medium"|"low"; owner: string; targetDate: string; status: "on-track"|"at-risk"|"off-track"|"achieved"; }

// ── Constants ─────────────────────────────────────────────────────────────────
export const OM_NODE_CFG: Record<OMNodeType2,{icon:string;color:string;defaultW:number;defaultH:number}> = {
  "org-unit":       { icon:"⬜", color:"#D4860A", defaultW:148, defaultH:52 },
  "coe":            { icon:"◈",  color:"#D4860A", defaultW:148, defaultH:52 },
  "shared-service": { icon:"◉",  color:"#4A9E6B", defaultW:148, defaultH:52 },
  "ai-node":        { icon:"⬡",  color:"#E8C547", defaultW:148, defaultH:52 },
  "role":           { icon:"○",  color:"#C0622A", defaultW:120, defaultH:44 },
  "governance":     { icon:"◇",  color:"#8B5CF6", defaultW:140, defaultH:52 },
};
export const OM_EDGE_CFG: Record<OMEdgeType2,{label:string;dash:string;color:string}> = {
  "reporting": { label:"Reporting",  dash:"none",    color:"#A0967A" },
  "service":   { label:"Service",    dash:"6,3",     color:"#D4860A" },
  "advisory":  { label:"Advisory",   dash:"3,3",     color:"#6B6355" },
  "data-flow": { label:"Data Flow",  dash:"8,2,2,2", color:"#E8C547" },
};
export const OM_WAVE_COLOR: Record<number,string> = { 0:"#3d3930",1:"#4a9e6b",2:"#4a82c4",3:"#d4860a",4:"#8b5cf6" };
export const OM_STATUS_COLOR: Record<string,string> = { "on-track":"#4a9e6b","at-risk":"#f0a500","off-track":"#e06c75","achieved":"#4a82c4" };

/* ═══════════════════════════════════════════════════════════════
   OM DICTIONARY — Function-scoped operating model presets
   Each entry is a real-world OM pattern a Mercer consultant might use.
   Organized by: function → industry-specific variants
   ═══════════════════════════════════════════════════════════════ */

export type OMPreset = { label: string; desc: string; industry?: string; company?: string; layers: Omit<OMLayer2,"id">[]; nodes: Omit<OMNode2,"id">[] };

export const OM_FUNCTION_PRESETS: Record<string, OMPreset[]> = {
  "HR": [
    { label: "HR Federated CoE", desc: "CoE-led centers of expertise + embedded HRBPs in business units. Most common in large multinationals.", industry: "General",
      layers: [
        {label:"CHRO Office",y:16,height:80,color:"rgba(212,134,10,0.07)"},
        {label:"Centres of Excellence",y:108,height:80,color:"rgba(74,130,196,0.07)"},
        {label:"HR Business Partners",y:200,height:80,color:"rgba(192,98,42,0.07)"},
        {label:"Shared Services / GBS",y:292,height:80,color:"rgba(74,158,107,0.07)"},
        {label:"AI & Analytics Layer",y:384,height:70,color:"rgba(232,197,71,0.07)"},
      ],
      nodes: [
        {type:"governance",label:"CHRO",x:200,y:32,w:130,h:48,color:"#D4860A",currentFte:1,targetFte:1},
        {type:"coe",label:"Total Rewards CoE",x:30,y:124,w:148,h:48,color:"#D4860A",currentFte:8,targetFte:6},
        {type:"coe",label:"Talent & L&D CoE",x:200,y:124,w:148,h:48,color:"#D4860A",currentFte:12,targetFte:10},
        {type:"coe",label:"People Analytics",x:370,y:124,w:148,h:48,color:"#D4860A",currentFte:4,targetFte:8},
        {type:"org-unit",label:"BU HRBP — Corp",x:50,y:216,w:140,h:48,color:"#C0622A",currentFte:6,targetFte:4},
        {type:"org-unit",label:"BU HRBP — Ops",x:220,y:216,w:140,h:48,color:"#C0622A",currentFte:8,targetFte:5},
        {type:"org-unit",label:"BU HRBP — Tech",x:390,y:216,w:140,h:48,color:"#C0622A",currentFte:5,targetFte:3},
        {type:"shared-service",label:"HR Ops / GBS",x:60,y:308,w:150,h:48,color:"#4A9E6B",currentFte:25,targetFte:16},
        {type:"shared-service",label:"Payroll & Benefits",x:240,y:308,w:150,h:48,color:"#4A9E6B",currentFte:12,targetFte:8},
        {type:"shared-service",label:"Recruiting Ops",x:420,y:308,w:140,h:48,color:"#4A9E6B",currentFte:10,targetFte:6},
        {type:"ai-node",label:"AI Copilot Layer",x:150,y:396,w:150,h:44,color:"#E8C547",currentFte:0,targetFte:4,aiMaturity:"Piloting"},
        {type:"ai-node",label:"Predictive Analytics",x:330,y:396,w:150,h:44,color:"#E8C547",currentFte:0,targetFte:3,aiMaturity:"Exploring"},
      ],
    },
    { label: "HR Centralized GBS", desc: "Single global business services center with thin HRBP layer. Efficiency-first model.", industry: "Manufacturing",
      layers: [{label:"HR Leadership",y:16,height:80,color:"rgba(212,134,10,0.07)"},{label:"Central HR Functions",y:108,height:90,color:"rgba(74,130,196,0.07)"},{label:"Global Business Services",y:210,height:90,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"CHRO",x:200,y:32,w:130,h:48,color:"#D4860A",currentFte:1,targetFte:1},
        {type:"coe",label:"Comp & Benefits",x:40,y:124,w:148,h:48,color:"#D4860A",currentFte:10,targetFte:7},
        {type:"coe",label:"Talent Mgmt",x:210,y:124,w:130,h:48,color:"#D4860A",currentFte:8,targetFte:6},
        {type:"coe",label:"L&D / Academy",x:360,y:124,w:130,h:48,color:"#D4860A",currentFte:6,targetFte:5},
        {type:"shared-service",label:"GBS — Transactional HR",x:80,y:230,w:180,h:50,color:"#4A9E6B",currentFte:40,targetFte:25},
        {type:"shared-service",label:"GBS — Recruiting",x:290,y:230,w:150,h:50,color:"#4A9E6B",currentFte:15,targetFte:8},
      ],
    },
  ],
  "IT": [
    { label: "IT Operating Model (ITOC)", desc: "IT Operations Center model — NOC, SOC, service desk, platform teams. Standard for enterprise IT.", industry: "General",
      layers: [
        {label:"CIO / CTO Office",y:16,height:70,color:"rgba(212,134,10,0.07)"},
        {label:"Platform & Architecture",y:98,height:80,color:"rgba(74,130,196,0.07)"},
        {label:"IT Operations Center",y:190,height:80,color:"rgba(192,98,42,0.07)"},
        {label:"Service Delivery",y:282,height:80,color:"rgba(74,158,107,0.07)"},
        {label:"Security Operations",y:374,height:70,color:"rgba(139,92,246,0.07)"},
      ],
      nodes: [
        {type:"governance",label:"CIO / CTO",x:200,y:28,w:130,h:44,color:"#D4860A",currentFte:1,targetFte:1},
        {type:"coe",label:"Enterprise Arch",x:40,y:110,w:148,h:48,color:"#D4860A",currentFte:5,targetFte:4},
        {type:"coe",label:"Cloud Platform",x:210,y:110,w:130,h:48,color:"#D4860A",currentFte:12,targetFte:15},
        {type:"coe",label:"Data Platform",x:360,y:110,w:130,h:48,color:"#D4860A",currentFte:8,targetFte:12},
        {type:"org-unit",label:"NOC",x:40,y:205,w:120,h:48,color:"#C0622A",currentFte:15,targetFte:8},
        {type:"org-unit",label:"ITOC Command",x:180,y:205,w:148,h:48,color:"#C0622A",currentFte:8,targetFte:6},
        {type:"org-unit",label:"Release Mgmt",x:348,y:205,w:140,h:48,color:"#C0622A",currentFte:6,targetFte:4},
        {type:"shared-service",label:"Service Desk L1/L2",x:60,y:298,w:170,h:48,color:"#4A9E6B",currentFte:30,targetFte:15},
        {type:"shared-service",label:"App Support",x:260,y:298,w:130,h:48,color:"#4A9E6B",currentFte:18,targetFte:12},
        {type:"ai-node",label:"SOC / SIEM",x:120,y:386,w:130,h:44,color:"#8B5CF6",currentFte:8,targetFte:10},
        {type:"ai-node",label:"AIOps",x:280,y:386,w:130,h:44,color:"#E8C547",currentFte:0,targetFte:5,aiMaturity:"Piloting"},
      ],
    },
  ],
  "Finance": [
    { label: "Finance Federated OM", desc: "CFO-led with FP&A CoE, treasury, controllership, and shared transactional processing.", industry: "General",
      layers: [{label:"CFO Office",y:16,height:70,color:"rgba(212,134,10,0.07)"},{label:"Finance CoEs",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Business Finance",y:190,height:80,color:"rgba(192,98,42,0.07)"},{label:"Shared Services",y:282,height:80,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"CFO",x:200,y:28,w:130,h:44,color:"#D4860A",currentFte:1,targetFte:1},
        {type:"coe",label:"FP&A CoE",x:40,y:110,w:130,h:48,color:"#D4860A",currentFte:10,targetFte:8},
        {type:"coe",label:"Treasury",x:190,y:110,w:120,h:48,color:"#D4860A",currentFte:6,targetFte:5},
        {type:"coe",label:"Tax & Compliance",x:330,y:110,w:148,h:48,color:"#D4860A",currentFte:8,targetFte:7},
        {type:"org-unit",label:"BU Finance BP",x:60,y:206,w:150,h:48,color:"#C0622A",currentFte:12,targetFte:8},
        {type:"org-unit",label:"Controller",x:240,y:206,w:120,h:48,color:"#C0622A",currentFte:8,targetFte:6},
        {type:"shared-service",label:"AP / AR / GL",x:60,y:298,w:150,h:48,color:"#4A9E6B",currentFte:20,targetFte:10},
        {type:"shared-service",label:"Financial Reporting",x:240,y:298,w:160,h:48,color:"#4A9E6B",currentFte:8,targetFte:5},
        {type:"ai-node",label:"AI Close Automation",x:430,y:298,w:148,h:48,color:"#E8C547",currentFte:0,targetFte:3,aiMaturity:"Piloting"},
      ],
    },
    { label: "Finance OM — Banking", desc: "Three Lines of Defense model with front/middle/back office. Regulatory-driven.", industry: "Financial Services", company: "jpmorgan",
      layers: [{label:"CFO / Group Finance",y:16,height:70,color:"rgba(212,134,10,0.07)"},{label:"1st Line — Business",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"2nd Line — Risk & Control",y:190,height:80,color:"rgba(192,98,42,0.07)"},{label:"3rd Line — Audit",y:282,height:70,color:"rgba(139,92,246,0.07)"},{label:"Shared / GBS",y:364,height:70,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"Group CFO",x:200,y:28,w:130,h:44,color:"#D4860A",currentFte:1,targetFte:1},
        {type:"org-unit",label:"Front Office Finance",x:40,y:110,w:170,h:48,color:"#D4860A",currentFte:30,targetFte:25},
        {type:"org-unit",label:"Product Control",x:240,y:110,w:140,h:48,color:"#D4860A",currentFte:18,targetFte:14},
        {type:"org-unit",label:"Risk Finance",x:100,y:206,w:130,h:48,color:"#C0622A",currentFte:15,targetFte:12},
        {type:"org-unit",label:"Regulatory Reporting",x:260,y:206,w:160,h:48,color:"#C0622A",currentFte:12,targetFte:8},
        {type:"governance",label:"Internal Audit",x:180,y:294,w:148,h:44,color:"#8B5CF6",currentFte:8,targetFte:7},
        {type:"shared-service",label:"Finance GBS",x:120,y:376,w:150,h:44,color:"#4A9E6B",currentFte:40,targetFte:25},
        {type:"ai-node",label:"RegTech / AI",x:300,y:376,w:130,h:44,color:"#E8C547",currentFte:0,targetFte:6,aiMaturity:"Scaling"},
      ],
    },
  ],
  "Legal": [
    { label: "Legal Ops OM", desc: "General Counsel led with practice groups, legal ops, and outsourced discovery.", industry: "General",
      layers: [{label:"GC Office",y:16,height:70,color:"rgba(212,134,10,0.07)"},{label:"Practice Groups",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Legal Operations",y:190,height:80,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"General Counsel",x:180,y:28,w:160,h:44,color:"#D4860A",currentFte:1,targetFte:1},
        {type:"coe",label:"Corporate / M&A",x:30,y:110,w:140,h:48,color:"#D4860A",currentFte:6,targetFte:5},
        {type:"coe",label:"Regulatory",x:190,y:110,w:120,h:48,color:"#D4860A",currentFte:5,targetFte:4},
        {type:"coe",label:"Employment Law",x:330,y:110,w:140,h:48,color:"#D4860A",currentFte:4,targetFte:3},
        {type:"shared-service",label:"CLM & Contracts",x:40,y:206,w:150,h:48,color:"#4A9E6B",currentFte:8,targetFte:4},
        {type:"shared-service",label:"eDiscovery",x:220,y:206,w:120,h:48,color:"#4A9E6B",currentFte:6,targetFte:3},
        {type:"ai-node",label:"AI Contract Review",x:370,y:206,w:148,h:48,color:"#E8C547",currentFte:0,targetFte:3,aiMaturity:"Piloting"},
      ],
    },
  ],
  "Supply Chain": [
    { label: "Supply Chain OM", desc: "End-to-end supply chain with planning, procurement, manufacturing, and logistics.", industry: "Manufacturing", company: "toyota",
      layers: [{label:"SVP Supply Chain",y:16,height:70,color:"rgba(212,134,10,0.07)"},{label:"Planning & Procurement",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Manufacturing & Quality",y:190,height:80,color:"rgba(192,98,42,0.07)"},{label:"Logistics & Distribution",y:282,height:80,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"SVP Supply Chain",x:180,y:28,w:160,h:44,color:"#D4860A",currentFte:1,targetFte:1},
        {type:"coe",label:"Demand Planning",x:40,y:110,w:140,h:48,color:"#D4860A",currentFte:10,targetFte:8},
        {type:"coe",label:"Strategic Procurement",x:200,y:110,w:160,h:48,color:"#D4860A",currentFte:8,targetFte:6},
        {type:"coe",label:"Supplier Quality",x:380,y:110,w:140,h:48,color:"#D4860A",currentFte:6,targetFte:5},
        {type:"org-unit",label:"Plant Operations",x:60,y:206,w:150,h:48,color:"#C0622A",currentFte:200,targetFte:180},
        {type:"org-unit",label:"Quality Control",x:240,y:206,w:140,h:48,color:"#C0622A",currentFte:30,targetFte:22},
        {type:"org-unit",label:"EHS",x:400,y:206,w:100,h:48,color:"#C0622A",currentFte:12,targetFte:10},
        {type:"shared-service",label:"Logistics Hub",x:80,y:298,w:150,h:48,color:"#4A9E6B",currentFte:40,targetFte:30},
        {type:"shared-service",label:"Warehouse Ops",x:260,y:298,w:140,h:48,color:"#4A9E6B",currentFte:35,targetFte:25},
        {type:"ai-node",label:"AI Demand Forecast",x:430,y:298,w:148,h:48,color:"#E8C547",currentFte:0,targetFte:4,aiMaturity:"Scaling"},
      ],
    },
  ],
  "Technology (Product)": [
    { label: "Product & Eng OM", desc: "Product-led org with squads, platform teams, and SRE. Spotify-influenced.", industry: "Technology", company: "spotify",
      layers: [{label:"CPO / CTO",y:16,height:70,color:"rgba(212,134,10,0.07)"},{label:"Product Tribes",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Platform & SRE",y:190,height:80,color:"rgba(74,158,107,0.07)"},{label:"Enablement",y:282,height:70,color:"rgba(232,197,71,0.07)"}],
      nodes: [
        {type:"governance",label:"CPO / CTO",x:200,y:28,w:130,h:44,color:"#D4860A",currentFte:2,targetFte:2},
        {type:"org-unit",label:"Tribe: Growth",x:30,y:110,w:140,h:48,color:"#D4860A",currentFte:25,targetFte:28},
        {type:"org-unit",label:"Tribe: Platform",x:190,y:110,w:140,h:48,color:"#D4860A",currentFte:20,targetFte:25},
        {type:"org-unit",label:"Tribe: Content",x:350,y:110,w:140,h:48,color:"#D4860A",currentFte:18,targetFte:22},
        {type:"shared-service",label:"Platform Eng",x:60,y:206,w:140,h:48,color:"#4A9E6B",currentFte:12,targetFte:15},
        {type:"shared-service",label:"SRE / DevOps",x:220,y:206,w:140,h:48,color:"#4A9E6B",currentFte:8,targetFte:10},
        {type:"shared-service",label:"Data Infra",x:380,y:206,w:120,h:48,color:"#4A9E6B",currentFte:6,targetFte:10},
        {type:"ai-node",label:"ML Platform",x:140,y:294,w:130,h:44,color:"#E8C547",currentFte:4,targetFte:12,aiMaturity:"Scaling"},
        {type:"ai-node",label:"AI Features",x:300,y:294,w:130,h:44,color:"#E8C547",currentFte:3,targetFte:8,aiMaturity:"Piloting"},
      ],
    },
    { label: "Netflix Tech OM", desc: "Full freedom & responsibility. Minimal hierarchy, strong platform.", industry: "Technology", company: "netflix",
      layers: [{label:"Leadership",y:16,height:70,color:"rgba(212,134,10,0.07)"},{label:"Product Teams",y:98,height:90,color:"rgba(74,130,196,0.07)"},{label:"Platform",y:200,height:80,color:"rgba(74,158,107,0.07)"}],
      nodes: [
        {type:"governance",label:"VP Eng",x:200,y:28,w:130,h:44,color:"#D4860A",currentFte:3,targetFte:3},
        {type:"org-unit",label:"Studio Tech",x:30,y:116,w:140,h:48,color:"#D4860A",currentFte:60,targetFte:65},
        {type:"org-unit",label:"Streaming",x:190,y:116,w:130,h:48,color:"#D4860A",currentFte:45,targetFte:50},
        {type:"org-unit",label:"Data & ML",x:340,y:116,w:130,h:48,color:"#D4860A",currentFte:35,targetFte:45},
        {type:"shared-service",label:"Core Platform",x:100,y:216,w:150,h:48,color:"#4A9E6B",currentFte:30,targetFte:35},
        {type:"ai-node",label:"Personalization AI",x:280,y:216,w:160,h:48,color:"#E8C547",currentFte:15,targetFte:25,aiMaturity:"Optimizing"},
      ],
    },
  ],
  "Risk & Compliance": [
    { label: "Three Lines Model", desc: "Industry standard for financial services — business ownership, risk oversight, independent audit.", industry: "Financial Services", company: "jpmorgan",
      layers: [{label:"Board / Risk Committee",y:16,height:60,color:"rgba(212,134,10,0.07)"},{label:"1st Line — Business",y:88,height:80,color:"rgba(74,130,196,0.07)"},{label:"2nd Line — Risk & Compliance",y:180,height:80,color:"rgba(192,98,42,0.07)"},{label:"3rd Line — Internal Audit",y:272,height:70,color:"rgba(139,92,246,0.07)"}],
      nodes: [
        {type:"governance",label:"CRO / Board",x:180,y:24,w:148,h:40,color:"#D4860A",currentFte:2,targetFte:2},
        {type:"org-unit",label:"Business Risk Owners",x:40,y:104,w:170,h:48,color:"#D4860A",currentFte:20,targetFte:18},
        {type:"org-unit",label:"Operational Risk",x:240,y:104,w:150,h:48,color:"#D4860A",currentFte:12,targetFte:10},
        {type:"org-unit",label:"ERM",x:60,y:196,w:120,h:48,color:"#C0622A",currentFte:8,targetFte:7},
        {type:"org-unit",label:"Compliance",x:200,y:196,w:120,h:48,color:"#C0622A",currentFte:15,targetFte:12},
        {type:"org-unit",label:"Model Risk",x:340,y:196,w:120,h:48,color:"#C0622A",currentFte:6,targetFte:5},
        {type:"governance",label:"Internal Audit",x:160,y:284,w:148,h:44,color:"#8B5CF6",currentFte:10,targetFte:9},
        {type:"ai-node",label:"AI Surveillance",x:340,y:284,w:148,h:44,color:"#E8C547",currentFte:0,targetFte:5,aiMaturity:"Piloting"},
      ],
    },
  ],
  "Clinical Operations": [
    { label: "Clinical OM", desc: "Hospital system operating model — clinical, administrative, revenue cycle.", industry: "Healthcare",
      layers: [{label:"CMO / CNO Office",y:16,height:70,color:"rgba(212,134,10,0.07)"},{label:"Clinical Departments",y:98,height:80,color:"rgba(74,130,196,0.07)"},{label:"Clinical Support",y:190,height:80,color:"rgba(74,158,107,0.07)"},{label:"Revenue Cycle",y:282,height:70,color:"rgba(192,98,42,0.07)"}],
      nodes: [
        {type:"governance",label:"CMO / CNO",x:180,y:28,w:148,h:44,color:"#D4860A",currentFte:2,targetFte:2},
        {type:"org-unit",label:"Medicine",x:30,y:110,w:120,h:48,color:"#D4860A",currentFte:80,targetFte:80},
        {type:"org-unit",label:"Surgery",x:170,y:110,w:110,h:48,color:"#D4860A",currentFte:60,targetFte:58},
        {type:"org-unit",label:"Emergency",x:300,y:110,w:120,h:48,color:"#D4860A",currentFte:45,targetFte:45},
        {type:"org-unit",label:"Pharmacy",x:440,y:110,w:110,h:48,color:"#D4860A",currentFte:20,targetFte:18},
        {type:"shared-service",label:"Health IT / EHR",x:60,y:206,w:150,h:48,color:"#4A9E6B",currentFte:15,targetFte:18},
        {type:"shared-service",label:"Quality & Safety",x:240,y:206,w:148,h:48,color:"#4A9E6B",currentFte:10,targetFte:8},
        {type:"shared-service",label:"Coding & Billing",x:100,y:294,w:148,h:48,color:"#C0622A",currentFte:25,targetFte:15},
        {type:"ai-node",label:"AI Clinical Decision",x:280,y:294,w:170,h:44,color:"#E8C547",currentFte:0,targetFte:4,aiMaturity:"Exploring"},
      ],
    },
  ],
};

// Company → which function presets apply
export const OM_COMPANY_FUNCTIONS: Record<string, string[]> = {
  toyota:    ["HR","Finance","IT","Supply Chain","Legal"],
  tesla:     ["HR","Finance","IT","Technology (Product)","Supply Chain"],
  netflix:   ["HR","Finance","IT","Technology (Product)"],
  amazon:    ["HR","Finance","IT","Technology (Product)","Supply Chain"],
  jpmorgan:  ["HR","Finance","IT","Risk & Compliance","Legal"],
  spotify:   ["HR","Finance","IT","Technology (Product)"],
  microsoft: ["HR","Finance","IT","Technology (Product)","Legal"],
};

export const OM_ARCHETYPES_2: Record<string,{label:string;desc:string;layers:Omit<OMLayer2,"id">[];nodes:Omit<OMNode2,"id">[]}> = {
  federated: {
    label:"Federated",desc:"CoE guidance + BU autonomy",
    layers:[
      {label:"Executive",           y:16, height:90,  color:"rgba(212,134,10,0.07)"},
      {label:"Centres of Excellence",y:122,height:90,  color:"rgba(74,130,196,0.07)"},
      {label:"Business Units",       y:228,height:90,  color:"rgba(74,158,107,0.07)"},
      {label:"Shared Services",      y:334,height:90,  color:"rgba(139,92,246,0.07)"},
    ],
    nodes:[
      {type:"org-unit",label:"CHRO",         x:90,  y:38,  w:130,h:48,color:"#D4860A",currentFte:1, targetFte:1},
      {type:"org-unit",label:"CDO",          x:270, y:38,  w:130,h:48,color:"#D4860A",currentFte:1, targetFte:1},
      {type:"coe",     label:"AI CoE",       x:90,  y:143, w:130,h:48,color:"#D4860A",currentFte:0, targetFte:8},
      {type:"coe",     label:"People Analytics",x:268,y:143,w:148,h:48,color:"#D4860A",currentFte:2, targetFte:5},
      {type:"org-unit",label:"BU HR BP",     x:68,  y:249, w:130,h:48,color:"#D4860A",currentFte:5, targetFte:3},
      {type:"org-unit",label:"BU HR BP",     x:248, y:249, w:130,h:48,color:"#D4860A",currentFte:5, targetFte:3},
      {type:"shared-service",label:"Ops & Admin",x:68,y:355,w:138,h:48,color:"#4A9E6B",currentFte:18,targetFte:12},
      {type:"shared-service",label:"Tech & Data", x:252,y:355,w:138,h:48,color:"#4A9E6B",currentFte:8, targetFte:8},
    ],
  },
  centralized: {
    label:"Centralized",desc:"Central command model",
    layers:[
      {label:"Leadership",         y:16, height:90,  color:"rgba(212,134,10,0.07)"},
      {label:"Central Functions",  y:122,height:90,  color:"rgba(74,130,196,0.07)"},
      {label:"Delivery",           y:228,height:90,  color:"rgba(74,158,107,0.07)"},
    ],
    nodes:[
      {type:"org-unit",     label:"CPO / CHRO",    x:188,y:38,  w:158,h:48,color:"#D4860A",currentFte:1,targetFte:1},
      {type:"coe",          label:"AI & Analytics", x:82, y:143, w:148,h:48,color:"#D4860A",currentFte:3,targetFte:8},
      {type:"coe",          label:"Talent CoE",     x:278,y:143, w:138,h:48,color:"#D4860A",currentFte:14,targetFte:10},
      {type:"shared-service",label:"GBS Delivery",  x:148,y:249, w:148,h:48,color:"#4A9E6B",currentFte:28,targetFte:20},
    ],
  },
  "hub-spoke": {
    label:"Hub & Spoke",desc:"Global hub + regional spokes",
    layers:[
      {label:"Global Hub",    y:16, height:90,  color:"rgba(212,134,10,0.07)"},
      {label:"Regional Hubs", y:122,height:90,  color:"rgba(192,98,42,0.07)"},
      {label:"Local Spokes",  y:228,height:90,  color:"rgba(74,158,107,0.07)"},
      {label:"Enablement",    y:334,height:90,  color:"rgba(139,92,246,0.07)"},
    ],
    nodes:[
      {type:"org-unit",label:"Global HR Hub", x:194,y:38,  w:170,h:48,color:"#D4860A",currentFte:5,targetFte:5},
      {type:"org-unit",label:"Americas Hub",  x:52, y:143, w:138,h:48,color:"#C0622A",currentFte:10,targetFte:8},
      {type:"org-unit",label:"EMEA Hub",      x:234,y:143, w:138,h:48,color:"#C0622A",currentFte:10,targetFte:8},
      {type:"org-unit",label:"APAC Hub",      x:416,y:143, w:138,h:48,color:"#C0622A",currentFte:10,targetFte:8},
      {type:"ai-node", label:"AI Platform",   x:234,y:355, w:138,h:48,color:"#E8C547",currentFte:0, targetFte:6,aiMaturity:"Scaling"},
    ],
  },
};


export function omUid() { return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`; }
export function omSnap(v: number) { return Math.round(v / 8) * 8; }

// ── Node renderer ─────────────────────────────────────────────────────────────

export function OMNodeEl({ n, selected, mode, onDown, onEnter, onLeave, kpis }: {
  n: OMNode2; selected: boolean; mode: OMDesignMode2;
  onDown:(e:React.MouseEvent)=>void; onEnter:()=>void; onLeave:()=>void;
  kpis: OMKpi2[];
}) {
  const delta  = (n.targetFte??0)-(n.currentFte??0);
  const hasKpi = (n.kpiIds??[]).some(id=>kpis.find(k=>k.id===id));
  const isAi   = n.type==="ai-node";

  return (
    <g transform={`translate(${n.x},${n.y})`} onMouseDown={onDown} onMouseEnter={onEnter} onMouseLeave={onLeave} style={{cursor:"grab",userSelect:"none"}}>
      {selected && <rect x={-5} y={-5} width={n.w+10} height={n.h+10} rx={10} fill="none" stroke="#E8C547" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.6} />}
      {isAi ? (
        (() => {
          const cx=n.w/2,cy=n.h/2,r=Math.min(cx,cy)-5;
          const pts=Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i-Math.PI/6;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(" ");
          return <polygon points={pts} fill={`${n.color}20`} stroke={selected?"#E8C547":n.color} strokeWidth={selected?2:1.5} />;
        })()
      ) : n.type==="governance" ? (
        <polygon points={`${n.w/2},4 ${n.w-4},${n.h/2} ${n.w/2},${n.h-4} 4,${n.h/2}`} fill={`${n.color}20`} stroke={selected?"#E8C547":n.color} strokeWidth={selected?2:1.5} />
      ) : n.type==="role" ? (
        <ellipse cx={n.w/2} cy={n.h/2} rx={n.w/2-3} ry={n.h/2-3} fill={`${n.color}20`} stroke={selected?"#E8C547":n.color} strokeWidth={selected?2:1.5} />
      ) : (
        <rect x={2} y={2} width={n.w-4} height={n.h-4} rx={6} fill={`${n.color}20`} stroke={selected?"#E8C547":n.color} strokeWidth={selected?2:1.5} />
      )}

      {/* Wave badge */}
      {(n.wave??0)>0 && <>
        <rect x={5} y={4} width={18} height={13} rx={3} fill={OM_WAVE_COLOR[n.wave!]} />
        <text x={14} y={13} textAnchor="middle" fontSize={7} fontWeight={800} fill="#fff" fontFamily="'IBM Plex Mono',monospace" style={{pointerEvents:"none"}}>W{n.wave}</text>
      </>}

      {/* KPI dot */}
      {hasKpi && <circle cx={n.w-7} cy={7} r={5} fill="#4A9E6B" opacity={0.9} />}

      {/* Label */}
      <text x={n.w/2} y={n.h/2-(n.currentFte!=null?5:0)} textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fontWeight={600} fill="#f0ece4" fontFamily="'Outfit',sans-serif" style={{pointerEvents:"none"}}>
        {n.label.length>18?n.label.slice(0,17)+"…":n.label}
      </text>

      {/* FTE line */}
      {n.currentFte!=null && (
        <text x={n.w-5} y={n.h-5} textAnchor="end" fontSize={9}
          fill={mode==="target"?(delta<0?"#e06c75":delta>0?"#4a9e6b":"#7a7368"):"#D4860A"}
          fontFamily="'IBM Plex Mono',monospace" style={{pointerEvents:"none"}}>
          {mode==="target"?`${n.targetFte??0} FTE${delta!==0?` (${delta>0?"+":""}${delta})`:""}`:
                           `${n.currentFte} FTE`}
        </text>
      )}

      {/* AI maturity */}
      {n.aiMaturity && <text x={6} y={n.h-5} fontSize={8} fill="#E8C547" fontFamily="'IBM Plex Mono',monospace" style={{pointerEvents:"none"}}>⬡ {n.aiMaturity}</text>}
    </g>
  );
}

// ── Edge renderer ──────────────────────────────────────────────────────────────

export function OMEdgeEl({ e, nodes, selected, onSelect }: { e:OMEdge2; nodes:OMNode2[]; selected:boolean; onSelect:()=>void; }) {
  const from=nodes.find(n=>n.id===e.fromId);
  const to  =nodes.find(n=>n.id===e.toId);
  if (!from||!to) return null;
  const x1=from.x+from.w/2, y1=from.y+from.h;
  const x2=to.x+to.w/2,    y2=to.y;
  const my=(y1+y2)/2;
  const {dash,color}=OM_EDGE_CFG[e.type];
  return (
    <g onClick={ev=>{ev.stopPropagation();onSelect();}}>
      <path d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`} fill="none" stroke="transparent" strokeWidth={12} style={{cursor:"pointer"}} />
      <path d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`} fill="none" stroke={selected?"#E8C547":color} strokeWidth={selected?2:1.5} strokeDasharray={dash} markerEnd={`url(#omarr2-${e.type})`} opacity={0.75} />
    </g>
  );
}

// ── Properties Panel ──────────────────────────────────────────────────────────

export function OMProps({ n, kpis, onChange, onDelete, onClose }: {
  n:OMNode2; kpis:OMKpi2[];
  onChange:(u:Partial<OMNode2>)=>void; onDelete:()=>void; onClose:()=>void;
}) {
  const IS: React.CSSProperties = {background:"#1a1814",border:"1px solid #2e2b24",borderRadius:5,color:"#f0ece4",padding:"5px 8px",fontSize: 15,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"'Outfit',sans-serif"};
  const LB: React.CSSProperties = {fontSize: 14,fontWeight:800,color:"#7a7368",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3,display:"block"};
  return (
    <div style={{position:"absolute",top:0,right:0,width:248,height:"100%",background:"#1a1814",borderLeft:"1px solid #2e2b24",display:"flex",flexDirection:"column",zIndex:25,fontFamily:"'Outfit',sans-serif",boxShadow:"-4px 0 20px rgba(0,0,0,0.35)"}}>
      <div style={{padding:"10px 12px",borderBottom:"1px solid #2e2b24",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize: 14,fontWeight:800,color:"#D4860A",letterSpacing:"0.12em",textTransform:"uppercase"}}>Properties</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#6B6355",cursor:"pointer",fontSize:17,padding:0,lineHeight:1}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:9}}>
        <div><label style={LB}>Label</label><input value={n.label} onChange={e=>onChange({label:e.target.value})} style={IS} /></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
          <div><label style={LB}>FTE (Now)</label><input type="number" min={0} value={n.currentFte??""} onChange={e=>onChange({currentFte:Number(e.target.value)||undefined})} style={IS} /></div>
          <div><label style={LB}>FTE (Target)</label><input type="number" min={0} value={n.targetFte??""} onChange={e=>onChange({targetFte:Number(e.target.value)||undefined})} style={IS} /></div>
        </div>
        <div><label style={LB}>Type</label>
          <select value={n.type} onChange={e=>onChange({type:e.target.value as OMNodeType2,color:OM_NODE_CFG[e.target.value as OMNodeType2].color})} style={IS}>
            {(Object.entries(OM_NODE_CFG) as [OMNodeType2,{icon:string;color:string}][]).map(([k,v])=><option key={k} value={k}>{v.icon} {k}</option>)}
          </select>
        </div>
        <div><label style={LB}>Color</label>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {["#D4860A","#D4860A","#4A9E6B","#E8C547","#C0622A","#8B5CF6","#e06c75","#C07030"].map(c=>(
              <button key={c} onClick={()=>onChange({color:c})} style={{width:20,height:20,borderRadius:4,background:c,border:"none",cursor:"pointer",outline:n.color===c?"2px solid #E8C547":"none",outlineOffset:2}} />
            ))}
          </div>
        </div>
        <div><label style={LB}>Wave</label>
          <select value={n.wave??0} onChange={e=>onChange({wave:Number(e.target.value)})} style={IS}>
            <option value={0}>Unassigned</option>
            {[1,2,3,4].map(w=><option key={w} value={w}>Wave {w}</option>)}
          </select>
        </div>
        <div><label style={LB}>AI Maturity</label>
          <select value={n.aiMaturity??""} onChange={e=>onChange({aiMaturity:e.target.value||undefined})} style={IS}>
            <option value="">—</option>
            {["Exploring","Piloting","Scaling","Optimizing"].map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {kpis.length>0&&<div><label style={LB}>Linked KPIs</label>
          {kpis.map(k=>{const linked=(n.kpiIds??[]).includes(k.id);return (
            <label key={k.id} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",marginBottom:4,fontSize: 15,color:linked?"#4A9E6B":"#7a7368"}}>
              <input type="checkbox" checked={linked} style={{accentColor:"#4A9E6B",width:11,height:11}}
                onChange={()=>{const ids=n.kpiIds??[];onChange({kpiIds:linked?ids.filter(x=>x!==k.id):[...ids,k.id]});}} />
              {k.name.length>26?k.name.slice(0,25)+"…":k.name}
            </label>
          );})}
        </div>}
        <div><label style={LB}>Width</label>
          <input type="range" min={80} max={280} value={n.w} onChange={e=>onChange({w:Number(e.target.value)})} style={{width:"100%",accentColor:"#D4860A"}} />
        </div>
        <div><label style={LB}>Notes</label><textarea value={n.notes??""} onChange={e=>onChange({notes:e.target.value})} rows={3} style={{...IS,resize:"vertical",minHeight:56}} /></div>
      </div>
      <div style={{padding:10,borderTop:"1px solid #2e2b24"}}>
        <button onClick={onDelete} style={{width:"100%",padding:"6px 0",borderRadius:5,background:"rgba(224,108,117,0.12)",border:"1px solid rgba(224,108,117,0.3)",color:"#e06c75",fontSize: 15,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Delete Node</button>
      </div>
    </div>
  );
}

// ── Main Canvas Component ──────────────────────────────────────────────────────

export function OMDesignCanvas({ projectId, onBack, onNavigateLab }: { projectId: string; onBack: ()=>void; onNavigateLab?: ()=>void }) {
  const [nodes,    setNodes]    = usePersisted<OMNode2[]>(`${projectId}_om_nodes`, []);
  const [edges,    setEdges]    = usePersisted<OMEdge2[]>(`${projectId}_om_edges`, []);
  const [layers,   setLayers]   = usePersisted<OMLayer2[]>(`${projectId}_om_layers`, []);
  const [versions, setVersions] = usePersisted<OMVersion2[]>(`${projectId}_om_versions`, []);
  const [kpis]                  = usePersisted<OMKpi2[]>(`${projectId}_kpis`, []);
  const [canvasFunc, setCanvasFunc] = useState<string>("HR");
  const [showDict,   setShowDict]   = useState(false);
  const [dictFilter, setDictFilter] = useState("");

  const [selId,     setSelId]     = useState<string|null>(null);
  const [selEdge,   setSelEdge]   = useState<string|null>(null);
  const [multiSel,  setMultiSel]  = useState<string[]>([]);
  const [hovered,   setHovered]   = useState<string|null>(null);
  const [mode,      setMode]      = useState<OMDesignMode2>("target");
  const [edgeMode,  setEdgeMode]  = useState<OMEdgeType2|null>(null);
  const [edgeStart, setEdgeStart] = useState<string|null>(null);
  const [zoom,      setZoom]      = useState(1);
  const [pan,       setPan]       = useState({x:24,y:24});
  const [isPanning, setIsPanning] = useState(false);
  const [panStart,  setPanStart]  = useState({x:0,y:0});
  const [snapOn,    setSnapOn]    = useState(true);
  const [showLayers,setShowLayers]= useState(false);
  const [showVers,  setShowVers]  = useState(false);
  const [vName,     setVName]     = useState("");
  const [saved,     setSaved]     = useState(false);
  const [activeArch,setActiveArch]= useState<string|null>(null);
  const [dragState, setDragState] = useState<{ids:string[];offsets:{id:string;ox:number;oy:number}[]}|null>(null);
  const svgRef  = useRef<SVGSVGElement>(null);
  const contRef = useRef<HTMLDivElement>(null);

  const selNode = nodes.find(n=>n.id===selId);
  const totCur  = nodes.reduce((s,n)=>s+(n.currentFte??0),0);
  const totTgt  = nodes.reduce((s,n)=>s+(n.targetFte??0),0);

  // Keyboard shortcuts
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==="Escape"){setEdgeMode(null);setEdgeStart(null);setSelId(null);setMultiSel([]);}
      if((e.key==="Delete"||e.key==="Backspace")&&selId&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement)){
        setNodes(prev=>prev.filter(n=>n.id!==selId));
        setEdges(prev=>prev.filter(ed=>ed.fromId!==selId&&ed.toId!==selId));
        setSelId(null);
      }
    };
    window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h);
  },[selId,setNodes,setEdges]);

  const loadArch = (key:string)=>{
    const a=OM_ARCHETYPES_2[key]; if(!a) return;
    const ns=a.nodes.map(n=>({...n,id:omUid()}));
    const ls=a.layers.map(l=>({...l,id:omUid()}));
    setNodes(ns); setEdges([]); setLayers(ls); setSelId(null); setMultiSel([]); setActiveArch(key);
  };

  const loadPreset = (preset: OMPreset) => {
    const ns = preset.nodes.map(n => ({...n, id: omUid()}));
    const ls = preset.layers.map(l => ({...l, id: omUid()}));
    setNodes(ns); setEdges([]); setLayers(ls); setSelId(null); setMultiSel([]); setActiveArch(null); setShowDict(false);
  };

  // Get presets for current function
  const funcPresets = OM_FUNCTION_PRESETS[canvasFunc] || [];
  // Get all presets matching a filter
  const allPresets = Object.entries(OM_FUNCTION_PRESETS).flatMap(([func, presets]) => presets.map(p => ({...p, _func: func})));
  const filteredDict = dictFilter ? allPresets.filter(p => `${p.label} ${p.desc} ${p.industry||""} ${p.company||""} ${p._func}`.toLowerCase().includes(dictFilter.toLowerCase())) : allPresets;

  const addNode=(type:OMNodeType2)=>{
    const cfg=OM_NODE_CFG[type];
    const n:OMNode2={id:omUid(),type,label:type.replace("-"," "),x:omSnap(80+Math.random()*160),y:omSnap(60+Math.random()*160),w:cfg.defaultW,h:cfg.defaultH,color:cfg.color};
    setNodes(prev=>[...prev,n]); setSelId(n.id);
  };

  const updateNode=(id:string,u:Partial<OMNode2>)=>setNodes(prev=>prev.map(n=>n.id===id?{...n,...u}:n));
  const deleteNode=(id:string)=>{setNodes(prev=>prev.filter(n=>n.id!==id));setEdges(prev=>prev.filter(e=>e.fromId!==id&&e.toId!==id));setSelId(null);};

  const onNodeDown=useCallback((e:React.MouseEvent,id:string)=>{
    e.stopPropagation();
    if(edgeMode){
      if(!edgeStart){setEdgeStart(id);return;}
      if(edgeStart!==id){setEdges(prev=>[...prev,{id:omUid(),fromId:edgeStart,toId:id,type:edgeMode}]);setEdgeStart(null);setEdgeMode(null);}
      return;
    }
    setSelEdge(null);
    if(e.shiftKey||e.metaKey||e.ctrlKey){setMultiSel(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);return;}
    setSelId(id); setMultiSel([]);
    const activeIds=[id];
    if(!svgRef.current) return;
    const rect=svgRef.current.getBoundingClientRect();
    const offs=activeIds.map(nid=>{const nn=nodes.find(x=>x.id===nid)!;return {id:nid,ox:(e.clientX-rect.left)/zoom-pan.x/zoom-nn.x,oy:(e.clientY-rect.top)/zoom-pan.y/zoom-nn.y};});
    setDragState({ids:activeIds,offsets:offs});
  },[edgeMode,edgeStart,nodes,zoom,pan,setEdges]);

  const onSvgMove=useCallback((e:React.MouseEvent)=>{
    if(dragState&&svgRef.current){
      const rect=svgRef.current.getBoundingClientRect();
      const mx=(e.clientX-rect.left)/zoom-pan.x/zoom;
      const my=(e.clientY-rect.top)/zoom-pan.y/zoom;
      setNodes(prev=>prev.map(n=>{
        const o=dragState.offsets.find(x=>x.id===n.id); if(!o) return n;
        const nx=mx-o.ox, ny=my-o.oy;
        return {...n,x:snapOn?omSnap(nx):nx,y:snapOn?omSnap(ny):ny};
      }));
    }
    if(isPanning) setPan({x:panStart.x+e.clientX,y:panStart.y+e.clientY});
  },[dragState,isPanning,panStart,zoom,pan,snapOn,setNodes]);

  const onSvgUp=()=>{setDragState(null);setIsPanning(false);};
  const onSvgDown=(e:React.MouseEvent)=>{
    if(e.button===1||e.altKey){setIsPanning(true);setPanStart({x:pan.x-e.clientX,y:pan.y-e.clientY});}
    else{setSelId(null);setSelEdge(null);if(!e.shiftKey&&!e.metaKey)setMultiSel([]);}
  };
  const onWheel=(e:React.WheelEvent)=>{e.preventDefault();setZoom(z=>Math.min(2.5,Math.max(0.25,z-e.deltaY*0.001)));};

  const fitView=()=>{
    if(!nodes.length||!contRef.current) return;
    const xs=nodes.flatMap(n=>[n.x,n.x+n.w]); const ys=nodes.flatMap(n=>[n.y,n.y+n.h]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const pw=maxX-minX+80,ph=maxY-minY+80;
    const cw=contRef.current.offsetWidth,ch=contRef.current.offsetHeight;
    const nz=Math.min(2,Math.max(0.3,Math.min(cw/pw,ch/ph)*0.85));
    setZoom(nz); setPan({x:cw/2-(minX+pw/2)*nz,y:ch/2-(minY+ph/2)*nz});
  };

  const saveVersion=()=>{
    if(!vName.trim()) return;
    setVersions(prev=>[...prev,{id:omUid(),name:vName.trim(),ts:new Date().toISOString(),nodes,edges,layers}]);
    setVName(""); setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const exportSVG=()=>{
    if(!svgRef.current) return;
    const blob=new Blob([new XMLSerializer().serializeToString(svgRef.current)],{type:"image/svg+xml"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="operating-model.svg"; a.click();
  };

  const IB=(extra?:React.CSSProperties):React.CSSProperties=>({background:"none",border:"1px solid #2e2b24",borderRadius:4,color:"#b8b0a0",cursor:"pointer",fontSize: 15,padding:"3px 8px",fontFamily:"'Outfit',sans-serif",...extra});
  const delta=totTgt-totCur;

  return (
    <div style={{height:"calc(100vh - 96px)",display:"flex",flexDirection:"column",background:"#0f0e0c",fontFamily:"'Outfit',sans-serif",color:"#f0ece4",borderRadius:12,overflow:"hidden",border:"1px solid #2e2b24"}}>
      {/* Header */}
      <div style={{padding:"7px 12px",borderBottom:"1px solid #2e2b24",display:"flex",alignItems:"center",gap:8,background:"#1a1814",flexShrink:0,flexWrap:"wrap"}}>
        <span style={{fontSize: 15,fontWeight:800,color:"#D4860A",letterSpacing:"0.04em",marginRight:4}}>OM CANVAS</span>
        {onNavigateLab && <button onClick={onNavigateLab} style={{padding:"2px 9px",borderRadius:4,fontSize: 14,fontWeight:700,background:"transparent",border:"1px solid #2e2b24",color:"#6B6355",cursor:"pointer",marginRight:4}} title="Switch to Analysis Lab">🧬 Lab</button>}
        <div style={{display:"flex",background:"#211f1b",borderRadius:6,padding:2,border:"1px solid #2e2b24"}}>
          {(["current","target"] as OMDesignMode2[]).map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{padding:"2px 9px",borderRadius:4,fontSize: 15,fontWeight:700,background:mode===m?(m==="current"?"#D4860A":"#D4860A"):"transparent",border:"none",color:mode===m?"#fff":"#6B6355",cursor:"pointer"}}>
              {m==="current"?"Current":"Target"}
            </button>
          ))}
        </div>
        <div style={{width:1,height:14,background:"#2e2b24"}} />
        {(Object.entries(OM_EDGE_CFG) as [OMEdgeType2,{label:string;dash:string;color:string}][]).map(([k,v])=>(
          <button key={k} onClick={()=>{setEdgeMode(edgeMode===k?null:k);setEdgeStart(null);}}
            style={{...IB(),padding:"2px 7px",fontSize: 14,border:`1px solid ${edgeMode===k?v.color:"#2e2b24"}`,background:edgeMode===k?`${v.color}22`:"transparent",color:edgeMode===k?v.color:"#6B6355"}}>
            {v.label}
          </button>
        ))}
        <div style={{flex:1}} />
        <button onClick={()=>setZoom(z=>Math.min(2.5,z+0.1))} style={IB()}>+</button>
        <span style={{fontSize: 15,fontFamily:"'IBM Plex Mono',monospace",color:"#6B6355",minWidth:30,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
        <button onClick={fitView} style={IB()} title="Fit to screen">⌂</button>
        <button onClick={()=>setZoom(z=>Math.max(0.25,z-0.1))} style={IB()}>−</button>
        <button onClick={()=>setSnapOn(s=>!s)} style={IB({color:snapOn?"#D4860A":"#6B6355",border:`1px solid ${snapOn?"#D4860A":"#2e2b24"}`})} title="Snap to grid">⊞</button>
        <div style={{width:1,height:14,background:"#2e2b24"}} />
        <button onClick={exportSVG} style={IB()}>↓ SVG</button>
        <button onClick={()=>{setShowVers(v=>!v);setShowLayers(false);}} style={IB({color:showVers?"#D4860A":"#b8b0a0"})}>◷</button>
        <button onClick={()=>{setNodes(nodes);setEdges(edges);setLayers(layers);setSaved(true);setTimeout(()=>setSaved(false),2000);}}
          style={{padding:"4px 12px",borderRadius:5,fontSize: 15,fontWeight:700,background:saved?"#4A9E6B":"#D4860A",border:"none",color:"#fff",cursor:"pointer",transition:"background 0.3s"}}>
          {saved?"✓":"Save"}
        </button>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative"}}>
        {/* Left palette */}
        <div style={{width:180,flexShrink:0,background:"#1a1814",borderRight:"1px solid #2e2b24",display:"flex",flexDirection:"column",overflowY:"auto"}}>
          {/* Function Scope Selector */}
          <OMPalSec label="Function Scope">
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              {Object.keys(OM_FUNCTION_PRESETS).map(f=>(
                <button key={f} onClick={()=>setCanvasFunc(f)} style={{padding:"2px 7px",borderRadius:4,fontSize: 15,fontWeight:700,background:canvasFunc===f?"rgba(212,134,10,0.2)":"transparent",border:`1px solid ${canvasFunc===f?"#D4860A":"#2e2b24"}`,color:canvasFunc===f?"#D4860A":"#6B6355",cursor:"pointer"}}>{f}</button>
              ))}
            </div>
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />

          {/* Function-specific presets */}
          <OMPalSec label={`${canvasFunc} Models`}>
            {funcPresets.length > 0 ? funcPresets.map((p,i)=>(
              <OMPalBtn key={i} onClick={()=>loadPreset(p)}>
                <div style={{fontSize: 15,fontWeight:700,color:"#f0ece4"}}>{p.label}</div>
                <div style={{fontSize: 15,color:"#6B6355",marginTop:1}}>{p.industry||"General"}</div>
              </OMPalBtn>
            )) : <div style={{fontSize: 14,color:"#6B6355",padding:"4px 8px"}}>No presets for {canvasFunc}</div>}
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />

          {/* OM Dictionary button */}
          <OMPalSec label="Dictionary">
            <OMPalBtn onClick={()=>setShowDict(d=>!d)}>
              <span style={{color:"#E8C547",marginRight:6,fontSize: 15}}>📖</span>
              <span style={{fontSize: 15,fontWeight:700}}>{showDict?"Close":"Browse All Models"}</span>
            </OMPalBtn>
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />

          <OMPalSec label="Start from">
            {Object.entries(OM_ARCHETYPES_2).map(([k,v])=>(
              <OMPalBtn key={k} active={activeArch===k} onClick={()=>loadArch(k)}>
                <div style={{fontSize: 15,fontWeight:700}}>{v.label}</div>
                <div style={{fontSize: 14,color:"#6B6355",marginTop:1}}>{v.desc}</div>
              </OMPalBtn>
            ))}
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />
          <OMPalSec label="Add Node">
            {(Object.entries(OM_NODE_CFG) as [OMNodeType2,{icon:string;color:string}][]).map(([k,v])=>(
              <OMPalBtn key={k} onClick={()=>addNode(k)}>
                <span style={{color:v.color,marginRight:6,fontSize: 15}}>{v.icon}</span>
                <span style={{fontSize: 15}}>{k.replace("-"," ")}</span>
              </OMPalBtn>
            ))}
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />
          <OMPalSec label="Layers">
            <OMPalBtn onClick={()=>{setShowLayers(l=>!l);setShowVers(false);}}>
              <span style={{color:"#D4860A",marginRight:6}}>⊟</span>
              <span style={{fontSize: 15}}>Edit Layers</span>
            </OMPalBtn>
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />
          <OMPalSec label="Legend">
            {(Object.entries(OM_EDGE_CFG) as [OMEdgeType2,{label:string;dash:string;color:string}][]).map(([k,v])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <svg width={24} height={8}><line x1={2} y1={4} x2={22} y2={4} stroke={v.color} strokeWidth={1.5} strokeDasharray={v.dash}/></svg>
                <span style={{fontSize: 14,color:"#6B6355"}}>{v.label}</span>
              </div>
            ))}
          </OMPalSec>
          {edgeMode&&<div style={{margin:"6px 8px",padding:"7px 9px",borderRadius:5,background:"rgba(212,134,10,0.1)",border:"1px solid rgba(212,134,10,0.3)",fontSize: 14,color:"#D4860A"}}>{edgeStart?"Click target":"Click source"}</div>}
        </div>

        {/* OM Dictionary Panel — slides over canvas */}
        {showDict && <div style={{width:320,flexShrink:0,background:"#1a1814",borderRight:"1px solid #2e2b24",display:"flex",flexDirection:"column",overflowY:"auto"}}>
          <div style={{padding:"10px 12px",borderBottom:"1px solid #2e2b24",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize: 15,fontWeight:800,color:"#E8C547",letterSpacing:"0.03em"}}>📖 OM Dictionary</span>
            <button onClick={()=>setShowDict(false)} style={{background:"none",border:"none",color:"#6B6355",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <div style={{padding:"6px 10px"}}>
            <input value={dictFilter} onChange={e=>setDictFilter(e.target.value)} placeholder="Search models, industries, companies..." style={{width:"100%",background:"#0f0e0c",border:"1px solid #2e2b24",borderRadius:5,padding:"5px 8px",fontSize: 15,color:"#f0ece4",outline:"none",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box"}} />
          </div>
          <div style={{padding:"4px 10px",fontSize: 14,color:"#6B6355"}}>{filteredDict.length} operating model patterns</div>
          <div style={{flex:1,overflowY:"auto",padding:"0 8px 8px"}}>
            {Object.entries(OM_FUNCTION_PRESETS).map(([func, presets])=>{
              const filtered = dictFilter ? presets.filter(p=>`${p.label} ${p.desc} ${p.industry||""} ${p.company||""} ${func}`.toLowerCase().includes(dictFilter.toLowerCase())) : presets;
              if(filtered.length===0) return null;
              return <div key={func}>
                <div style={{fontSize: 14,fontWeight:800,color:"#D4860A",letterSpacing:"0.08em",textTransform:"uppercase",padding:"8px 0 4px",borderBottom:"1px solid #2e2b24",marginBottom:4}}>{func}</div>
                {filtered.map((p,i)=>(
                  <div key={i} onClick={()=>loadPreset(p)} style={{padding:"8px 10px",marginBottom:4,borderRadius:6,background:"#211f1b",border:"1px solid #2e2b24",cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#D4860A";e.currentTarget.style.background="#2a2720";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#2e2b24";e.currentTarget.style.background="#211f1b";}}>
                    <div style={{fontSize: 15,fontWeight:700,color:"#f0ece4",marginBottom:2}}>{p.label}</div>
                    <div style={{fontSize: 14,color:"#7a7368",lineHeight:1.4,marginBottom:4}}>{p.desc}</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {p.industry && <span style={{fontSize: 15,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"rgba(74,130,196,0.15)",color:"#D4860A"}}>{p.industry}</span>}
                      {p.company && <span style={{fontSize: 15,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"rgba(212,134,10,0.15)",color:"#D4860A"}}>{p.company}</span>}
                      <span style={{fontSize: 15,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"rgba(74,158,107,0.15)",color:"#4A9E6B"}}>{p.nodes.length} nodes · {p.layers.length} layers</span>
                      {(() => { const delta = p.nodes.reduce((s,n)=>(n.targetFte??0)-(n.currentFte??0)+s,0); return delta !== 0 ? <span style={{fontSize: 15,fontWeight:700,padding:"1px 5px",borderRadius:3,background:delta<0?"rgba(224,108,117,0.15)":"rgba(74,158,107,0.15)",color:delta<0?"#e06c75":"#4a9e6b"}}>{delta>0?"+":""}{delta} FTE</span> : null; })()}
                    </div>
                  </div>
                ))}
              </div>;
            })}
          </div>
        </div>}

        {/* Canvas area */}
        <div ref={contRef} style={{flex:1,position:"relative",overflow:"hidden",background:"#0f0e0c"}} onWheel={onWheel}>
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
            <defs><pattern id="omg2" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x%(8*zoom)},${pan.y%(8*zoom)}) scale(${zoom})`}><path d="M 8 0 L 0 0 0 8" fill="none" stroke="#2e2b24" strokeWidth={0.4} opacity={0.6} /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#omg2)" />
          </svg>

          {!nodes.length&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,pointerEvents:"none"}}><div style={{fontSize:36,opacity:0.12}}>⬡</div><div style={{fontSize: 15,color:"#6B6355"}}>Select an archetype or add nodes</div></div>}

          <svg ref={svgRef} style={{width:"100%",height:"100%",cursor:edgeMode?"crosshair":isPanning?"grabbing":"default"}}
            onMouseMove={onSvgMove} onMouseUp={onSvgUp} onMouseDown={onSvgDown}>
            <defs>
              {(Object.entries(OM_EDGE_CFG) as [OMEdgeType2,{label:string;dash:string;color:string}][]).map(([k,v])=>(
                <marker key={k} id={`omarr2-${k}`} markerWidth={7} markerHeight={7} refX={5} refY={3} orient="auto">
                  <path d="M0,0 L0,6 L7,3 z" fill={v.color} opacity={0.85} />
                </marker>
              ))}
            </defs>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {layers.map(l=>(
                <g key={l.id}>
                  <rect x={0} y={l.y} width={900} height={l.height} fill={l.color} stroke="#2e2b24" strokeWidth={0.5} rx={4} />
                  <text x={8} y={l.y+12} fontSize={8} fontWeight={800} fill="#6B6355" fontFamily="'IBM Plex Mono',monospace" letterSpacing="0.1em">{l.label.toUpperCase()}</text>
                </g>
              ))}
              {edges.map(e=><OMEdgeEl key={e.id} e={e} nodes={nodes} selected={selEdge===e.id} onSelect={()=>{setSelEdge(e.id);setSelId(null);}} />)}
              {multiSel.map(id=>{const n=nodes.find(x=>x.id===id);if(!n)return null;return <rect key={id} x={n.x-4} y={n.y-4} width={n.w+8} height={n.h+8} rx={8} fill="rgba(232,197,71,0.06)" stroke="#E8C547" strokeWidth={1} strokeDasharray="3,2" />;}) }
              {nodes.map(n=><OMNodeEl key={n.id} n={n} selected={selId===n.id} mode={mode} kpis={kpis}
                onDown={e=>onNodeDown(e,n.id)} onEnter={()=>setHovered(n.id)} onLeave={()=>setHovered(null)} />)}
            </g>
          </svg>

          {/* Delta strip */}
          {nodes.length>0&&(
            <div style={{position:"absolute",bottom:10,left:172,display:"flex",gap:7}}>
              {[{k:"Current FTE",v:totCur,c:"#D4860A"},{k:"Target FTE",v:totTgt,c:"#D4860A"},{k:"Net Δ",v:delta>0?`+${delta}`:String(delta),c:delta<0?"#e06c75":"#4A9E6B"},{k:"Nodes",v:nodes.length,c:"#b8b0a0"}].map(({k,v,c})=>(
                <div key={k} style={{padding:"3px 9px",borderRadius:5,background:"#1a1814",border:"1px solid #2e2b24"}}>
                  <div style={{fontSize: 15,color:"#6B6355",textTransform:"uppercase",fontFamily:"'IBM Plex Mono',monospace"}}>{k}</div>
                  <div style={{fontSize: 15,fontWeight:700,color:c,fontFamily:"'IBM Plex Mono',monospace"}}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Layer editor */}
          {showLayers&&(
            <div style={{position:"absolute",top:48,left:170,zIndex:30,background:"#1a1814",border:"1px solid #2e2b24",borderRadius:8,padding:14,width:240,boxShadow:"0 10px 28px rgba(0,0,0,0.45)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize: 14,fontWeight:800,color:"#D4860A",letterSpacing:"0.1em",textTransform:"uppercase"}}>Edit Layers</span>
                <button onClick={()=>setShowLayers(false)} style={{background:"none",border:"none",color:"#6B6355",cursor:"pointer",fontSize:16}}>×</button>
              </div>
              {layers.map((l,i)=>(
                <div key={l.id} style={{display:"flex",gap:5,marginBottom:5,alignItems:"center"}}>
                  <input value={l.label} onChange={e=>{const u=[...layers];u[i]={...l,label:e.target.value};setLayers(u);}} style={{flex:1,background:"#211f1b",border:"1px solid #2e2b24",borderRadius:4,color:"#f0ece4",padding:"4px 7px",fontSize: 15,outline:"none"}} />
                  <button onClick={()=>setLayers(layers.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#e06c75",cursor:"pointer",fontSize: 15}}>×</button>
                </div>
              ))}
              <button onClick={()=>{const lastY=layers.length?layers[layers.length-1].y+layers[layers.length-1].height+16:16;setLayers([...layers,{id:omUid(),label:"New Layer",y:lastY,height:90,color:"rgba(255,255,255,0.04)"}]);}}
                style={{width:"100%",marginTop:4,padding:"5px 0",background:"rgba(212,134,10,0.12)",border:"1px solid rgba(212,134,10,0.4)",borderRadius:5,color:"#D4860A",fontSize: 15,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                + Add Layer
              </button>
            </div>
          )}

          {/* Versions panel */}
          {showVers&&(
            <div style={{position:"absolute",top:0,right:selNode?248:0,width:240,height:"100%",background:"#1a1814",borderLeft:"1px solid #2e2b24",display:"flex",flexDirection:"column",zIndex:24,boxShadow:"-4px 0 16px rgba(0,0,0,0.3)"}}>
              <div style={{padding:"10px 12px",borderBottom:"1px solid #2e2b24",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize: 14,fontWeight:800,color:"#D4860A",letterSpacing:"0.1em",textTransform:"uppercase"}}>Versions</span>
                <button onClick={()=>setShowVers(false)} style={{background:"none",border:"none",color:"#6B6355",cursor:"pointer",fontSize:17}}>×</button>
              </div>
              <div style={{padding:"9px 10px",borderBottom:"1px solid #2e2b24",background:"#211f1b"}}>
                <input value={vName} onChange={e=>setVName(e.target.value)} placeholder='Snapshot name…' style={{width:"100%",background:"#1a1814",border:"1px solid #2e2b24",borderRadius:4,color:"#f0ece4",padding:"4px 7px",fontSize: 15,outline:"none",boxSizing:"border-box",marginBottom:5}} />
                <button onClick={saveVersion} disabled={!vName.trim()} style={{width:"100%",padding:"5px 0",borderRadius:4,background:vName.trim()?"rgba(212,134,10,0.15)":"transparent",border:`1px solid ${vName.trim()?"rgba(212,134,10,0.5)":"#2e2b24"}`,color:vName.trim()?"#D4860A":"#6B6355",fontSize: 15,fontWeight:700,cursor:vName.trim()?"pointer":"default",fontFamily:"'Outfit',sans-serif"}}>Save Snapshot</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:8}}>
                {versions.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"#6B6355",fontSize: 15}}>No snapshots yet</div>}
                {[...versions].reverse().map(v=>(
                  <div key={v.id} style={{padding:"9px 10px",borderRadius:6,marginBottom:5,background:"#211f1b",border:"1px solid #2e2b24"}}>
                    <div style={{fontSize: 15,fontWeight:700,color:"#f0ece4",marginBottom:2}}>{v.name}</div>
                    <div style={{fontSize: 15,color:"#6B6355",fontFamily:"'IBM Plex Mono',monospace",marginBottom:5}}>{new Date(v.ts).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                    <div style={{display:"flex",gap:3,marginBottom:5}}>
                      {[{k:"N",val:v.nodes.length},{k:"E",val:v.edges.length}].map(({k,val})=><span key={k} style={{padding:"1px 5px",borderRadius:2,background:"#2e2b24",fontSize: 15,color:"#6B6355",fontFamily:"'IBM Plex Mono',monospace"}}>{k}:{val}</span>)}
                    </div>
                    <button onClick={()=>{setNodes(v.nodes);setEdges(v.edges);setLayers(v.layers);setShowVers(false);}}
                      style={{width:"100%",padding:"4px 0",borderRadius:4,background:"rgba(212,134,10,0.1)",border:"1px solid rgba(212,134,10,0.4)",color:"#D4860A",fontSize: 14,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Properties panel */}
        {selNode&&(
          <OMProps n={selNode} kpis={kpis}
            onChange={u=>updateNode(selNode.id,u)}
            onDelete={()=>deleteNode(selNode.id)}
            onClose={()=>setSelId(null)} />
        )}
      </div>
    </div>
  );
}


export function OMPalSec({label,children}:{label:string;children:React.ReactNode}) {
  return (
    <div style={{padding:"8px 8px 5px"}}>
      <div style={{fontSize: 15,fontWeight:800,color:"#6B6355",letterSpacing:"0.12em",marginBottom:5,textTransform:"uppercase"}}>{label}</div>
      {children}
    </div>
  );
}
export function OMPalBtn({children,onClick,active}:{children:React.ReactNode;onClick:()=>void;active?:boolean}) {
  return (
    <button onClick={onClick} style={{width:"100%",padding:"5px 7px",marginBottom:2,borderRadius:5,textAlign:"left",display:"flex",alignItems:"center",background:active?"rgba(212,134,10,0.12)":"#211f1b",border:`1px solid ${active?"rgba(212,134,10,0.5)":"#2e2b24"}`,color:active?"#D4860A":"#b8b0a0",cursor:"pointer"}}>
      {children}
    </button>
  );
}


/* ═══════════════════════════════════════════════════════════════
   KPI ALIGNMENT INLINE — Embedded within OM Lab as a tab
   Strategic objectives + KPI library + traceability
   ═══════════════════════════════════════════════════════════════ */


export function KPIAlignmentInline({ projectId }: { projectId: string }) {
  const [objectives, setObjectives] = usePersisted<OMObjective2[]>(`${projectId}_objectives`, []);
  const [kpis, setKpis]             = usePersisted<OMKpi2[]>(`${projectId}_kpis`, []);
  const [subTab, setSubTab]         = useState<"objectives"|"kpis"|"traceability">("objectives");
  const [addingObj, setAddingObj]    = useState(false);
  const [addingKpi, setAddingKpi]    = useState(false);
  const [newObj, setNewObj]          = useState<Partial<OMObjective2>>({priority:"high",status:"on-track"});
  const [newKpi, setNewKpi]          = useState<Partial<OMKpi2>>({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]});

  const IS: React.CSSProperties = {background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-primary)",padding:"6px 10px",fontSize: 15,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"'Outfit',sans-serif"};
  const FL: React.CSSProperties = {fontSize: 14,fontWeight:800,color:"var(--text-muted)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3};

  const loadSamples = () => {
    const objs = KPI_DEFAULT_OBJECTIVES.map(o=>({...o,id:omUid()}));
    const kpiArr: OMKpi2[] = [
      {id:omUid(),objectiveId:objs[0].id,name:"HR cost as % of revenue",category:"Cost & Efficiency",unit:"%",currentValue:2.8,targetValue:1.9,baselineValue:3.2,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[1].id,name:"AI tool adoption rate",category:"AI & Technology",unit:"%",currentValue:22,targetValue:70,baselineValue:8,timeframe:"18 months",direction:"increase",linkedNodeIds:[],status:"at-risk"},
      {id:omUid(),objectiveId:objs[2].id,name:"Time-to-hire (days)",category:"People & Talent",unit:"days",currentValue:48,targetValue:29,baselineValue:58,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[0].id,name:"Process automation coverage",category:"Process & Speed",unit:"%",currentValue:15,targetValue:60,baselineValue:5,timeframe:"24 months",direction:"increase",linkedNodeIds:[],status:"at-risk"},
    ];
    setObjectives(objs); setKpis(kpiArr);
  };
  const progress = (k:OMKpi2) => { const total=Math.abs(k.targetValue-k.baselineValue); const done=Math.abs(k.currentValue-k.baselineValue); return total>0?Math.min(100,Math.round(done/total*100)):0; };
  const addObj = () => { if (!newObj.name?.trim()) return; setObjectives(prev=>[...prev,{id:omUid(),name:newObj.name,description:newObj.description??"",priority:newObj.priority??"high",owner:newObj.owner??"",targetDate:newObj.targetDate??"",status:newObj.status??"on-track"}]); setNewObj({priority:"high",status:"on-track"}); setAddingObj(false); };
  const addKpi = () => { if (!newKpi.name?.trim()||!newKpi.objectiveId) return; setKpis(prev=>[...prev,{id:omUid(),objectiveId:newKpi.objectiveId,name:newKpi.name,category:newKpi.category??"People & Talent",unit:newKpi.unit??"",currentValue:Number(newKpi.currentValue)||0,targetValue:Number(newKpi.targetValue)||0,baselineValue:Number(newKpi.baselineValue)||0,timeframe:newKpi.timeframe??"12 months",direction:newKpi.direction??"increase",linkedNodeIds:[],status:newKpi.status??"on-track"}]); setNewKpi({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]}); setAddingKpi(false); };

  return <Card title="KPI & Strategic Alignment">
    <div className="text-[15px] text-[var(--text-secondary)] mb-4">Link your operating model design to measurable strategic outcomes — the measurement layer of your OM.</div>
    {/* KPI summary strip */}
    <div className="flex gap-3 mb-4">{[
      {k:"Objectives",v:objectives.length,c:"var(--accent-primary)"},
      {k:"KPIs",v:kpis.length,c:"var(--success)"},
      {k:"On Track",v:kpis.filter(k=>k.status==="on-track").length,c:"#4a9e6b"},
      {k:"At Risk",v:kpis.filter(k=>k.status==="at-risk").length,c:"#f0a500"},
    ].map(s=><div key={s.k} className="flex-1 rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold" style={{color:s.c}}>{s.v}</div><div className="text-[14px] text-[var(--text-muted)] uppercase">{s.k}</div></div>)}</div>
    {objectives.length===0 && kpis.length===0 && <div className="text-center py-6"><button onClick={loadSamples} className="px-4 py-2 rounded-xl text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">Load Sample KPIs & Objectives</button></div>}
    {/* Sub-tabs */}
    <div className="flex gap-1 mb-4">{(["objectives","kpis","traceability"] as const).map(t=><button key={t} onClick={()=>setSubTab(t)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold" style={{background:subTab===t?"rgba(74,158,107,0.15)":"var(--surface-2)",color:subTab===t?"#4a9e6b":"var(--text-muted)"}}>{t==="objectives"?`Objectives (${objectives.length})`:t==="kpis"?`KPIs (${kpis.length})`:"Traceability"}</button>)}</div>
    {subTab==="objectives" && <div>
      <div className="flex justify-end mb-2"><button onClick={()=>setAddingObj(a=>!a)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add Objective</button></div>
      {addingObj && <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--surface-2)] mb-3 border border-[var(--border)]">
        <div><div style={FL}>Name *</div><input value={newObj.name??""} onChange={e=>setNewObj((s:Record<string,unknown>)=>({...s,name:e.target.value}))} style={IS} /></div>
        <div><div style={FL}>Owner</div><input value={newObj.owner??""} onChange={e=>setNewObj((s:Record<string,unknown>)=>({...s,owner:e.target.value}))} style={IS} /></div>
        <div className="col-span-2"><div style={FL}>Description</div><input value={newObj.description??""} onChange={e=>setNewObj((s:Record<string,unknown>)=>({...s,description:e.target.value}))} style={IS} /></div>
        <div className="col-span-2 flex gap-2"><button onClick={addObj} className="flex-1 py-1.5 rounded-lg text-[15px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save</button><button onClick={()=>setAddingObj(false)} className="flex-1 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)] cursor-pointer border border-[var(--border)]">Cancel</button></div>
      </div>}
      {objectives.map(o=>{const objKpis=kpis.filter(k=>k.objectiveId===o.id);return <div key={o.id} className="p-3 rounded-xl mb-2 bg-[var(--surface-2)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[o.status]}`}}>
        <div className="flex items-center justify-between"><div className="text-[15px] font-bold text-[var(--text-primary)]">{o.name}</div><div className="flex items-center gap-2"><span className="text-[15px] px-1.5 py-0.5 rounded font-bold" style={{background:`${KPI_STATUS_COLOR[o.status]}18`,color:KPI_STATUS_COLOR[o.status]}}>{o.status.replace("-"," ")}</span><button onClick={()=>setObjectives(p=>p.filter(x=>x.id!==o.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px] cursor-pointer">✕</button></div></div>
        <div className="text-[15px] text-[var(--text-muted)] mt-1">{o.description}</div>
        <div className="text-[14px] text-[var(--text-muted)] mt-1">{objKpis.length} KPI{objKpis.length!==1?"s":""} linked · {o.owner && `Owner: ${o.owner}`}</div>
      </div>;})}
    </div>}
    {subTab==="kpis" && <div>
      <div className="flex justify-end mb-2"><button onClick={()=>setAddingKpi(a=>!a)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add KPI</button></div>
      {addingKpi && objectives.length>0 && <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--surface-2)] mb-3 border border-[var(--border)]">
        <div><div style={FL}>KPI Name *</div><input value={newKpi.name??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,name:e.target.value}))} style={IS} /></div>
        <div><div style={FL}>Objective *</div><select value={newKpi.objectiveId??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,objectiveId:e.target.value}))} style={IS}><option value="">Select...</option>{objectives.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
        <div><div style={FL}>Category</div><select value={newKpi.category} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,category:e.target.value}))} style={IS}>{KPI_CAT_LIST.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div><div style={FL}>Unit</div><input value={newKpi.unit??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,unit:e.target.value}))} style={IS} placeholder="%, days, $..." /></div>
        <div><div style={FL}>Current</div><input value={newKpi.currentValue??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,currentValue:e.target.value}))} style={IS} type="number" /></div>
        <div><div style={FL}>Target</div><input value={newKpi.targetValue??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,targetValue:e.target.value}))} style={IS} type="number" /></div>
        <div className="col-span-2 flex gap-2"><button onClick={addKpi} className="flex-1 py-1.5 rounded-lg text-[15px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save KPI</button><button onClick={()=>setAddingKpi(false)} className="flex-1 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)] cursor-pointer border border-[var(--border)]">Cancel</button></div>
      </div>}
      {kpis.map(k=>{const pct=progress(k);return <div key={k.id} className="p-3 rounded-xl mb-2 bg-[var(--surface-2)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[k.status]}`}}>
        <div className="flex items-center justify-between"><div className="text-[15px] font-bold text-[var(--text-primary)]">{k.name}</div><div className="flex items-center gap-2"><Badge color={k.status==="on-track"?"green":k.status==="at-risk"?"amber":"red"}>{k.status.replace("-"," ")}</Badge><button onClick={()=>setKpis(p=>p.filter(x=>x.id!==k.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px] cursor-pointer">✕</button></div></div>
        <div className="flex items-center gap-3 mt-2"><div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:KPI_STATUS_COLOR[k.status]}} /></div><span className="text-[15px] font-bold" style={{color:KPI_STATUS_COLOR[k.status]}}>{pct}%</span></div>
        <div className="flex gap-4 mt-1 text-[14px] text-[var(--text-muted)]"><span>Baseline: {k.baselineValue}{k.unit}</span><span>Current: {k.currentValue}{k.unit}</span><span>Target: {k.targetValue}{k.unit}</span><span>{k.category}</span></div>
      </div>;})}
    </div>}
    {subTab==="traceability" && <div>
      <div className="text-[15px] text-[var(--text-secondary)] mb-3">How objectives, KPIs, and operating model components connect.</div>
      {objectives.map(o=>{const objKpis=kpis.filter(k=>k.objectiveId===o.id);return <div key={o.id} className="mb-4">
        <div className="text-[15px] font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:KPI_STATUS_COLOR[o.status]}} />{o.name}</div>
        {objKpis.length===0?<div className="text-[15px] text-[var(--text-muted)] ml-4">No KPIs linked</div>:
        <div className="ml-4 space-y-1">{objKpis.map(k=><div key={k.id} className="flex items-center gap-2 text-[15px]"><span className="text-[var(--text-muted)]">↳</span><span className="font-semibold text-[var(--text-primary)]">{k.name}</span><span className="text-[var(--text-muted)]">{k.currentValue}{k.unit} → {k.targetValue}{k.unit}</span><span className="font-bold" style={{color:KPI_STATUS_COLOR[k.status]}}>{progress(k)}%</span></div>)}</div>}
      </div>;})}
    </div>}
  </Card>;
}


/* ═══════════════════════════════════════════════════════════════
   KPI ALIGNMENT MODULE — Strategic objectives + KPI library
   + Traceability matrix + Coverage heatmap
   Links OM canvas nodes → KPIs → Strategic objectives
   ═══════════════════════════════════════════════════════════════ */

export const KPI_CAT_LIST = ["People & Talent","Cost & Efficiency","AI & Technology","Process & Speed","Quality & Risk","Revenue & Growth"] as const;
export const KPI_STATUS_COLOR: Record<string,string> = { "on-track":"#4a9e6b","at-risk":"#f0a500","off-track":"#e06c75","achieved":"#4a82c4" };

export const KPI_DEFAULT_OBJECTIVES: {name:string;description:string;priority:"critical"|"high"|"medium"|"low";owner:string;targetDate:string;status:"on-track"|"at-risk"|"off-track"|"achieved"}[] = [
  {name:"Reduce cost-to-serve",description:"Achieve $12M reduction in HR operating cost through AI automation and structural efficiency",priority:"critical",owner:"CHRO",targetDate:"Q4 2026",status:"on-track"},
  {name:"Accelerate AI adoption",description:"Reach 70% active AI tool usage across all functions within 18 months",priority:"high",owner:"CDO",targetDate:"Q2 2027",status:"at-risk"},
  {name:"Improve talent velocity",description:"Reduce time-to-hire by 40% and time-to-productivity by 30%",priority:"high",owner:"VP Talent",targetDate:"Q1 2027",status:"on-track"},
  {name:"Strengthen governance",description:"Establish clear decision rights and accountability across all OM layers",priority:"medium",owner:"COO",targetDate:"Q3 2026",status:"on-track"},
];

export function KPIAlignmentModule({ projectId, canvasNodes, onBack }: {
  projectId: string;
  canvasNodes: OMNode2[];
  onBack: ()=>void;
}) {
  const [objectives, setObjectives] = usePersisted<OMObjective2[]>(`${projectId}_objectives`, []);
  const [kpis, setKpis]             = usePersisted<OMKpi2[]>(`${projectId}_kpis`, []);
  const [tab, setTab]               = useState<"objectives"|"kpis"|"traceability"|"coverage">("objectives");
  const [addingObj,  setAddingObj]  = useState(false);
  const [addingKpi,  setAddingKpi]  = useState(false);
  const [newObj, setNewObj]         = useState<Partial<OMObjective2>>({priority:"high",status:"on-track"});
  const [newKpi, setNewKpi]         = useState<Partial<OMKpi2>>({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]});

  const IS: React.CSSProperties = {background:"#1a1814",border:"1px solid #2e2b24",borderRadius:5,color:"#f0ece4",padding:"5px 8px",fontSize: 15,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"'Outfit',sans-serif"};
  const FL: React.CSSProperties = {fontSize: 14,fontWeight:800,color:"#7a7368",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3};

  const loadSamples = () => {
    const objs = KPI_DEFAULT_OBJECTIVES.map(o=>({...o,id:omUid()}));
    const kpiArr: OMKpi2[] = [
      {id:omUid(),objectiveId:objs[0].id,name:"HR cost as % of revenue",category:"Cost & Efficiency",unit:"%",currentValue:2.8,targetValue:1.9,baselineValue:3.2,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[1].id,name:"AI tool adoption rate",category:"AI & Technology",unit:"%",currentValue:22,targetValue:70,baselineValue:8,timeframe:"18 months",direction:"increase",linkedNodeIds:[],status:"at-risk"},
      {id:omUid(),objectiveId:objs[2].id,name:"Time-to-hire (days)",category:"People & Talent",unit:"days",currentValue:48,targetValue:29,baselineValue:58,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[0].id,name:"FTE reduction — Ops & Admin",category:"Cost & Efficiency",unit:"FTE",currentValue:18,targetValue:12,baselineValue:20,timeframe:"18 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
      {id:omUid(),objectiveId:objs[0].id,name:"Process automation coverage",category:"Process & Speed",unit:"%",currentValue:15,targetValue:60,baselineValue:5,timeframe:"24 months",direction:"increase",linkedNodeIds:[],status:"at-risk"},
      {id:omUid(),objectiveId:objs[3].id,name:"Decision cycle time (days)",category:"Process & Speed",unit:"days",currentValue:14,targetValue:7,baselineValue:18,timeframe:"12 months",direction:"decrease",linkedNodeIds:[],status:"on-track"},
    ];
    setObjectives(objs); setKpis(kpiArr);
  };

  const progress = (k:OMKpi2) => {
    const total=Math.abs(k.targetValue-k.baselineValue);
    const done=Math.abs(k.currentValue-k.baselineValue);
    return total>0?Math.min(100,Math.round(done/total*100)):0;
  };

  const addObj = () => {
    if (!newObj.name?.trim()) return;
    setObjectives(prev=>[...prev,{id:omUid(),name:newObj.name,description:newObj.description??"",priority:newObj.priority??"high",owner:newObj.owner??"",targetDate:newObj.targetDate??"",status:newObj.status??"on-track"}]);
    setNewObj({priority:"high",status:"on-track"}); setAddingObj(false);
  };
  const addKpi = () => {
    if (!newKpi.name?.trim()||!newKpi.objectiveId) return;
    setKpis(prev=>[...prev,{id:omUid(),objectiveId:newKpi.objectiveId,name:newKpi.name,category:newKpi.category??"People & Talent",unit:newKpi.unit??"",currentValue:Number(newKpi.currentValue)||0,targetValue:Number(newKpi.targetValue)||0,baselineValue:Number(newKpi.baselineValue)||0,timeframe:newKpi.timeframe??"12 months",direction:newKpi.direction??"increase",linkedNodeIds:[],status:newKpi.status??"on-track"}]);
    setNewKpi({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]}); setAddingKpi(false);
  };

  const toggleKpiNode=(kpiId:string,nodeId:string)=>{
    setKpis(prev=>prev.map(k=>{if(k.id!==kpiId)return k;const linked=k.linkedNodeIds.includes(nodeId);return {...k,linkedNodeIds:linked?k.linkedNodeIds.filter(x=>x!==nodeId):[...k.linkedNodeIds,nodeId]};}));
  };

  const orphanKpis  = kpis.filter(k=>k.linkedNodeIds.length===0);
  const coveredNodes= canvasNodes.filter(n=>(n.kpiIds??[]).length>0||kpis.some(k=>k.linkedNodeIds.includes(n.id))).length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex items-center gap-1">← Back</button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A9E6B] to-[#2d6e4e] flex items-center justify-center text-xl">◎</div>
        <div><h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">KPI & Strategic Alignment</h1><p className="text-[15px] text-[var(--text-secondary)]">Link your operating model design to measurable strategic outcomes</p></div>
        <div className="flex-1" />
        {objectives.length===0&&<button onClick={loadSamples} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5 transition-all">Load sample data</button>}
      </div>

      {/* Summary strip */}
      {(objectives.length>0||kpis.length>0)&&(
        <div className="grid grid-cols-6 gap-3 mb-5">
          {[
            {k:"Objectives",  v:objectives.length,                 c:"var(--accent-primary)"},
            {k:"KPIs",        v:kpis.length,                       c:"var(--info,#D4860A)"},
            {k:"Coverage",    v:`${kpis.length?Math.round(kpis.filter(k=>k.linkedNodeIds.length>0).length/kpis.length*100):0}%`, c:kpis.every(k=>k.linkedNodeIds.length>0)&&kpis.length>0?"var(--success)":"var(--warning)"},
            {k:"At Risk",     v:kpis.filter(k=>k.status==="at-risk").length, c:"var(--warning)"},
            {k:"Off Track",   v:kpis.filter(k=>k.status==="off-track").length, c:"var(--risk)"},
            {k:"Nodes w/ KPI",v:`${canvasNodes.length?Math.round(coveredNodes/canvasNodes.length*100):0}%`, c:"var(--success)"},
          ].map(({k,v,c})=>(
            <div key={k} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-4 py-3">
              <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{k}</div>
              <div className="text-xl font-extrabold" style={{color:c}}>{v}</div>
            </div>
          ))}
        </div>
      )}

      <TabBar tabs={[
        {id:"objectives",   label:`Objectives (${objectives.length})`},
        {id:"kpis",         label:`KPIs (${kpis.length})`},
        {id:"traceability", label:"Traceability"},
        {id:"coverage",     label:"Coverage"},
      ]} active={tab} onChange={t=>setTab(t as typeof tab)} />

      {/* ── OBJECTIVES ── */}
      {tab==="objectives"&&(
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={()=>setAddingObj(a=>!a)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add Objective</button>
          </div>
          {addingObj&&(
            <div className="p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--accent-primary)]/30 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2"><div style={FL}>Name *</div><input value={newObj.name??""} onChange={e=>setNewObj((s)=>({...s,name:e.target.value}))} style={IS} /></div>
                <div className="col-span-2"><div style={FL}>Description</div><textarea value={newObj.description??""} onChange={e=>setNewObj((s)=>({...s,description:e.target.value}))} rows={2} style={{...IS,resize:"vertical"}} /></div>
                <div><div style={FL}>Priority</div><select value={newObj.priority} onChange={e=>setNewObj((s)=>({...s,priority:e.target.value}))} style={IS}>{["critical","high","medium","low"].map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                <div><div style={FL}>Owner</div><input value={newObj.owner??""} onChange={e=>setNewObj((s)=>({...s,owner:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Target Date</div><input value={newObj.targetDate??""} onChange={e=>setNewObj((s)=>({...s,targetDate:e.target.value}))} placeholder="Q4 2026" style={IS} /></div>
                <div><div style={FL}>Status</div><select value={newObj.status} onChange={e=>setNewObj((s)=>({...s,status:e.target.value}))} style={IS}>{["on-track","at-risk","off-track","achieved"].map(s=><option key={s} value={s}>{s.replace("-"," ")}</option>)}</select></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addObj} className="flex-1 py-1.5 rounded-lg text-[15px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save</button>
                <button onClick={()=>setAddingObj(false)} className="px-4 py-1.5 rounded-lg text-[15px] text-[var(--text-muted)] border border-[var(--border)] cursor-pointer bg-transparent">Cancel</button>
              </div>
            </div>
          )}
          {objectives.length===0&&!addingObj&&<div className="text-center py-12 text-[var(--text-muted)]"><div className="text-2xl mb-2 opacity-30">◎</div>No objectives yet. Add them or load sample data.</div>}
          {objectives.map(o=>{
            const objKpis=kpis.filter(k=>k.objectiveId===o.id);
            const onTrack=objKpis.filter(k=>k.status==="on-track"||k.status==="achieved").length;
            return (
              <div key={o.id} className="p-4 rounded-xl mb-3 bg-[var(--surface-1)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[o.status]}`}}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{o.name}</span>
                      <span className="text-[15px] px-1.5 py-0.5 rounded font-bold" style={{background:`${KPI_STATUS_COLOR[o.status]}18`,color:KPI_STATUS_COLOR[o.status]}}>{o.status.replace("-"," ")}</span>
                      <span className="text-[15px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] capitalize">{o.priority}</span>
                    </div>
                    <div className="text-[15px] text-[var(--text-muted)] mb-2">{o.description}</div>
                    <div className="flex gap-4 text-[15px] text-[var(--text-muted)]">
                      {o.owner&&<span>Owner: <strong className="text-[var(--text-secondary)]">{o.owner}</strong></span>}
                      {o.targetDate&&<span>Target: <strong className="text-[var(--text-secondary)]">{o.targetDate}</strong></span>}
                      <span>{objKpis.length} KPI{objKpis.length!==1?"s":""} · {onTrack} on track</span>
                    </div>
                  </div>
                  <button onClick={()=>setObjectives(prev=>prev.filter(x=>x.id!==o.id))} className="text-[var(--risk)] text-sm border-none bg-transparent cursor-pointer">×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── KPIS ── */}
      {tab==="kpis"&&(
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={()=>setAddingKpi(a=>!a)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add KPI</button>
          </div>
          {addingKpi&&(
            <div className="p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--accent-primary)]/30 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><div style={FL}>KPI Name *</div><input value={newKpi.name??""} onChange={e=>setNewKpi((s)=>({...s,name:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Objective *</div><select value={newKpi.objectiveId??""} onChange={e=>setNewKpi((s)=>({...s,objectiveId:e.target.value}))} style={IS}><option value="">Select…</option>{objectives.map(o=><option key={o.id} value={o.id}>{o.name.slice(0,32)}</option>)}</select></div>
                <div><div style={FL}>Category</div><select value={newKpi.category} onChange={e=>setNewKpi((s)=>({...s,category:e.target.value}))} style={IS}>{KPI_CAT_LIST.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><div style={FL}>Unit</div><input value={newKpi.unit??""} onChange={e=>setNewKpi((s)=>({...s,unit:e.target.value}))} placeholder="%, days, $M, FTE…" style={IS} /></div>
                <div><div style={FL}>Baseline</div><input type="number" value={newKpi.baselineValue??""} onChange={e=>setNewKpi((s)=>({...s,baselineValue:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Current</div><input type="number" value={newKpi.currentValue??""} onChange={e=>setNewKpi((s)=>({...s,currentValue:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Target</div><input type="number" value={newKpi.targetValue??""} onChange={e=>setNewKpi((s)=>({...s,targetValue:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Direction</div><select value={newKpi.direction} onChange={e=>setNewKpi((s)=>({...s,direction:e.target.value}))} style={IS}><option value="increase">Increase</option><option value="decrease">Decrease</option><option value="maintain">Maintain</option></select></div>
                <div><div style={FL}>Timeframe</div><input value={newKpi.timeframe??""} onChange={e=>setNewKpi((s)=>({...s,timeframe:e.target.value}))} placeholder="12 months" style={IS} /></div>
                <div><div style={FL}>Status</div><select value={newKpi.status} onChange={e=>setNewKpi((s)=>({...s,status:e.target.value}))} style={IS}>{["on-track","at-risk","off-track","achieved"].map(s=><option key={s} value={s}>{s.replace("-"," ")}</option>)}</select></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addKpi} className="flex-1 py-1.5 rounded-lg text-[15px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save KPI</button>
                <button onClick={()=>setAddingKpi(false)} className="px-4 py-1.5 rounded-lg text-[15px] text-[var(--text-muted)] border border-[var(--border)] cursor-pointer bg-transparent">Cancel</button>
              </div>
            </div>
          )}
          {kpis.length===0&&!addingKpi&&<div className="text-center py-12 text-[var(--text-muted)]"><div className="text-2xl mb-2 opacity-30">◎</div>No KPIs yet.</div>}
          {kpis.map(k=>{
            const pct=progress(k);
            const obj=objectives.find(o=>o.id===k.objectiveId);
            return (
              <div key={k.id} className="p-4 rounded-xl mb-3 bg-[var(--surface-1)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[k.status]}`}}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-bold text-[var(--text-primary)]">{k.name}</span>
                      <span className="text-[15px] px-1.5 py-0.5 rounded font-bold" style={{background:`${KPI_STATUS_COLOR[k.status]}18`,color:KPI_STATUS_COLOR[k.status]}}>{k.status.replace("-"," ")}</span>
                      <span className="text-[15px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">{k.category}</span>
                      {k.linkedNodeIds.length>0&&<span className="text-[14px] text-[var(--success)]">⬡ {k.linkedNodeIds.length} node{k.linkedNodeIds.length!==1?"s":""}</span>}
                    </div>
                    {obj&&<div className="text-[14px] text-[var(--text-muted)] mb-2">→ {obj.name}</div>}
                    <div className="flex gap-4 text-[15px] mb-2">
                      <span className="text-[var(--text-muted)]">Base: <strong className="text-[var(--text-primary)]">{k.baselineValue}{k.unit}</strong></span>
                      <span className="text-[var(--text-muted)]">Now: <strong style={{color:KPI_STATUS_COLOR[k.status]}}>{k.currentValue}{k.unit}</strong></span>
                      <span className="text-[var(--text-muted)]">Target: <strong className="text-[var(--accent-primary)]">{k.targetValue}{k.unit}</strong></span>
                      <span className="text-[var(--text-muted)]">{k.timeframe}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,background:KPI_STATUS_COLOR[k.status],transition:"width 0.4s"}} /></div>
                    <div className="text-[14px] text-[var(--text-muted)] mt-1">{pct}% to target</div>
                  </div>
                  <button onClick={()=>setKpis(prev=>prev.filter(x=>x.id!==k.id))} className="text-[var(--risk)] text-sm border-none bg-transparent cursor-pointer">×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TRACEABILITY MATRIX ── */}
      {tab==="traceability"&&(
        <div>
          {objectives.length===0||kpis.length===0?(
            <div className="text-center py-12 text-[var(--text-muted)] text-[15px]">Add objectives and KPIs first.</div>
          ):(
            <>
              <div className="text-[15px] text-[var(--text-secondary)] mb-3">Click a cell to link a KPI to an objective. Click canvas node buttons to assign accountability.</div>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-[15px] border-collapse">
                  <thead>
                    <tr className="bg-[var(--surface-1)]">
                      <th className="px-3 py-2.5 text-left font-bold text-[14px] text-[var(--accent-primary)] uppercase tracking-widest border border-[var(--border)] min-w-[200px]">KPI</th>
                      {objectives.map(o=>(
                        <th key={o.id} className="px-2 py-1 text-center text-[14px] font-bold border border-[var(--border)] min-w-[80px]" style={{color:KPI_STATUS_COLOR[o.status]}}>
                          <div style={{writingMode:"vertical-rl",transform:"rotate(180deg)",maxHeight:80,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{o.name}</div>
                        </th>
                      ))}
                      <th className="px-2 py-1 text-center text-[14px] text-[var(--text-muted)] border border-[var(--border)] min-w-[100px]">OM Nodes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.map((k,ri)=>{
                      const obj=objectives.find(o=>o.id===k.objectiveId);
                      return (
                        <tr key={k.id} className={ri%2===0?"bg-[var(--bg)]":"bg-[var(--surface-1)]"}>
                          <td className="px-3 py-2 border border-[var(--border)]">
                            <div className="font-semibold text-[var(--text-primary)]">{k.name}</div>
                            <div className="text-[14px] text-[var(--text-muted)]">{k.currentValue}{k.unit} → {k.targetValue}{k.unit}</div>
                          </td>
                          {objectives.map(o=>{
                            const isLinked=k.objectiveId===o.id;
                            return (
                              <td key={o.id} className="text-center border border-[var(--border)] cursor-pointer"
                                style={{background:isLinked?`${KPI_STATUS_COLOR[o.status]}12`:undefined}}
                                onClick={()=>setKpis(prev=>prev.map(x=>x.id!==k.id?x:{...x,objectiveId:isLinked?"":o.id}))}>
                                {isLinked&&<span style={{fontSize:14,color:KPI_STATUS_COLOR[o.status]}}>●</span>}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 border border-[var(--border)]">
                            <div className="flex gap-1 flex-wrap">
                              {canvasNodes.slice(0,5).map((n)=>{
                                const linked=k.linkedNodeIds.includes(n.id);
                                return (
                                  <button key={n.id} onClick={()=>toggleKpiNode(k.id,n.id)}
                                    className="text-[15px] px-1.5 py-0.5 rounded cursor-pointer font-semibold transition-all"
                                    style={{background:linked?`${n.color||"#D4860A"}20`:"transparent",border:`1px solid ${linked?n.color||"#D4860A":"#2e2b24"}`,color:linked?n.color||"#D4860A":"#6B6355"}}>
                                    {(n.label||"").slice(0,7)}
                                  </button>
                                );
                              })}
                              {canvasNodes.length>5&&<span className="text-[15px] text-[var(--text-muted)] self-center">+{canvasNodes.length-5}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── COVERAGE HEATMAP ── */}
      {tab==="coverage"&&(
        <div>
          {orphanKpis.length>0&&(
            <div className="p-3 rounded-xl border mb-4" style={{background:"rgba(240,165,0,0.07)",borderColor:"rgba(240,165,0,0.25)"}}>
              <div className="text-[15px] font-bold mb-2" style={{color:"#f0a500"}}>⚠ {orphanKpis.length} KPI{orphanKpis.length!==1?"s":""} not linked to any org node</div>
              {orphanKpis.map(k=><div key={k.id} className="text-[15px] text-[var(--text-muted)] mb-1">· {k.name}</div>)}
            </div>
          )}
          {canvasNodes.length===0?(
            <div className="text-center py-12 text-[var(--text-muted)] text-[15px]"><div className="text-2xl mb-2 opacity-30">⬡</div>No canvas nodes — open OM Design Canvas first and create your operating model.</div>
          ):(
            <div className="grid grid-cols-3 gap-4">
              {canvasNodes.map((n)=>{
                const linkedKpis=kpis.filter(k=>k.linkedNodeIds.includes(n.id));
                const atRisk=linkedKpis.filter(k=>k.status==="at-risk"||k.status==="off-track").length;
                const hasAny=linkedKpis.length>0;
                const nodeColor=n.color||"#D4860A";
                return (
                  <div key={n.id} className="p-3 rounded-xl border transition-all" style={{background:"var(--surface-1)",borderColor:hasAny?`${nodeColor}40`:"var(--border)",borderLeft:`3px solid ${hasAny?nodeColor:"var(--border)"}`}}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:nodeColor}} />
                      <span className="text-[15px] font-bold text-[var(--text-primary)] truncate flex-1">{n.label||n.type}</span>
                      {!hasAny&&<span className="text-[15px] text-[var(--text-muted)]">—</span>}
                    </div>
                    {linkedKpis.length===0&&<div className="text-[14px] text-[var(--text-muted)] italic">No KPIs assigned</div>}
                    {linkedKpis.map(k=>(
                      <div key={k.id} className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:KPI_STATUS_COLOR[k.status]}} />
                        <span className="text-[15px] text-[var(--text-secondary)] flex-1 truncate">{k.name}</span>
                        <span className="text-[14px] font-semibold shrink-0" style={{color:KPI_STATUS_COLOR[k.status],fontFamily:"'IBM Plex Mono',monospace"}}>{k.currentValue}{k.unit}</span>
                      </div>
                    ))}
                    {atRisk>0&&<div className="text-[14px] mt-1" style={{color:"#f0a500"}}>⚠ {atRisk} at risk</div>}
                  </div>
                );
              })}
            </div>
          )}
          {kpis.length>0&&canvasNodes.length>0&&(
            <div className="mt-6 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
              <div className="text-[15px] font-bold text-[var(--text-primary)] mb-3">Design Health: KPI Coverage</div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--success)] transition-all" style={{width:`${Math.round(kpis.filter(k=>k.linkedNodeIds.length>0).length/kpis.length*100)}%`}} />
                </div>
                <span className="text-[15px] font-extrabold text-[var(--success)]">{Math.round(kpis.filter(k=>k.linkedNodeIds.length>0).length/kpis.length*100)}%</span>
              </div>
              <div className="text-[15px] text-[var(--text-muted)] mt-1">{kpis.filter(k=>k.linkedNodeIds.length>0).length} of {kpis.length} KPIs assigned to org nodes — {orphanKpis.length>0?`${orphanKpis.length} orphaned (design gap)`:"all covered ✓"}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
