"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
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

  return <div>
    <PageHeader icon="🔀" title="Build / Buy / Borrow / Automate" subtitle="Talent sourcing strategy per redesigned role" onBack={onBack} moduleId="bbba" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="bbba" label="BBBA Decisions" /></div>}
    {loading && <LoadingBar />}
    {!loading && roles.length === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">🔀</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Complete Skills Gap Analysis First</h3><p className="text-[13px] text-[var(--text-secondary)]">BBBA dispositions are generated from gap analysis and adjacency results.</p></div>}
    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Total Roles" value={Number(summary.total_roles || 0)} /><KpiCard label="Build" value={Number(summary.build || 0)} accent /><KpiCard label="Buy" value={Number(summary.buy || 0)} /><KpiCard label="Borrow" value={Number(summary.borrow || 0)} /><KpiCard label="Automate" value={Number(summary.automate || 0)} />
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <Card title="Disposition Mix"><DonutViz data={[{name:"Build",value:Number(summary.build||0)},{name:"Buy",value:Number(summary.buy||0)},{name:"Borrow",value:Number(summary.borrow||0)},{name:"Automate",value:Number(summary.automate||0)}]} /></Card>
      <Card title="Investment Summary"><div className="space-y-3">
        <div className="flex justify-between p-3 rounded-lg bg-[var(--surface-2)]"><span className="text-[13px]">Reskilling (Build)</span><span className="text-[15px] font-extrabold text-[var(--success)]">{fmtNum(summary.reskilling_investment||0)}</span></div>
        <div className="flex justify-between p-3 rounded-lg bg-[var(--surface-2)]"><span className="text-[13px]">Hiring (Buy)</span><span className="text-[15px] font-extrabold text-[var(--accent-primary)]">{fmtNum(summary.hiring_cost||0)}</span></div>
        <div className="flex justify-between p-3 rounded-lg bg-[var(--surface-2)] border-t-2 border-[var(--text-primary)]"><span className="text-[13px] font-bold">Total Investment</span><span className="text-[17px] font-extrabold text-[var(--text-primary)]">{fmtNum(summary.total_investment||0)}</span></div>
      </div></Card>
    </div>

    <Card title="Role-by-Role Decision Matrix">
      <div className="text-[12px] text-[var(--text-secondary)] mb-3">Click the disposition badge to override AI recommendation. All dispositions are current recommendations until locked.</div>
      <div className="overflow-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Role</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Disposition</th><th className="px-2 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Reason</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Internal</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">FTE</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Cost</th><th className="px-2 py-2 text-center font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Timeline</th></tr></thead>
      <tbody>{roles.map(r => { const disp = overrides[r.role] || r.disposition; return <tr key={r.role} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
        <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{r.role}</td>
        <td className="px-2 py-2 text-center"><button onClick={() => { const opts = ["Build","Buy","Borrow","Automate"]; const idx = opts.indexOf(disp); setOverrides(prev => ({...prev, [r.role]: opts[(idx+1)%4]})); }} className="px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer" style={{background:`${dispColors[disp]}15`,color:dispColors[disp],border:`1px solid ${dispColors[disp]}30`}}>{dispIcons[disp]} {disp}</button></td>
        <td className="px-2 py-2 text-[var(--text-secondary)] text-[10px]">{r.reason}</td>
        <td className="px-2 py-2 text-center">{r.strong_candidates}+{r.reskillable_candidates}</td>
        <td className="px-2 py-2 text-center font-bold">{r.fte_needed}</td>
        <td className="px-2 py-2 text-center font-semibold">{fmtNum(r.total_cost)}</td>
        <td className="px-2 py-2 text-center">{r.timeline_months}mo</td>
      </tr>; })}</tbody></table></div>
    </Card>

    {/* Cost Comparison by Disposition */}
    <Card title="Cost Comparison by Sourcing Strategy">
      <div className="flex items-end gap-2 h-40 px-4 mb-4">{[
        {label:"Build",value:roles.filter(r => (overrides[r.role] || r.disposition) === "Build").reduce((s,r) => s+r.total_cost, 0),color:"var(--success)"},
        {label:"Buy",value:roles.filter(r => (overrides[r.role] || r.disposition) === "Buy").reduce((s,r) => s+r.total_cost, 0),color:"var(--accent-primary)"},
        {label:"Borrow",value:roles.filter(r => (overrides[r.role] || r.disposition) === "Borrow").reduce((s,r) => s+r.total_cost, 0),color:"var(--warning)"},
        {label:"Automate",value:roles.filter(r => (overrides[r.role] || r.disposition) === "Automate").reduce((s,r) => s+r.total_cost, 0),color:"var(--purple)"},
      ].map(bar => {
        const maxVal = Math.max(...roles.map(r => r.total_cost), 1);
        const totalByType = bar.value;
        const h = (totalByType / (maxVal * roles.length || 1)) * 100;
        return <div key={bar.label} className="flex-1 flex flex-col items-center justify-end">
          <div className="text-[10px] font-bold mb-1" style={{color:bar.color}}>{fmtNum(totalByType)}</div>
          <div className="w-full rounded-t-lg" style={{height:`${Math.max(h*3, 8)}%`, background:`${bar.color}30`, border:`1px solid ${bar.color}50`}} />
          <div className="text-[9px] text-[var(--text-muted)] mt-1">{bar.label}</div>
        </div>;
      })}</div>
    </Card>

    {/* Risk per Disposition */}
    <Card title="Risk Assessment per Decision">
      <div className="space-y-2">{roles.map(r => {
        const disp = overrides[r.role] || r.disposition;
        const riskMap: Record<string,{risk:string;color:string}> = {
          Build: {risk:"Reskilling may take longer than planned; employee may not reach target proficiency",color:"var(--warning)"},
          Buy: {risk:"Market competition for this role; longer time-to-fill; cultural integration risk",color:"var(--risk)"},
          Borrow: {risk:"Contractor dependency; knowledge transfer gaps; higher ongoing cost",color:"var(--warning)"},
          Automate: {risk:"Implementation complexity; change resistance; ongoing maintenance cost",color:"var(--purple)"},
        };
        const rk = riskMap[disp] || riskMap.Build;
        return <div key={r.role} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)]">
          <span className="text-[11px] font-semibold w-40 shrink-0 text-[var(--text-primary)]">{r.role}</span>
          <Badge color={disp==="Build"?"green":disp==="Buy"?"indigo":disp==="Borrow"?"amber":"purple"}>{disp}</Badge>
          <span className="text-[10px] text-[var(--text-secondary)] flex-1">{rk.risk}</span>
        </div>;
      })}</div>
    </Card>

    <InsightPanel title="Sourcing Strategy Insights" items={[
      `${roles.filter(r => (overrides[r.role]||r.disposition)==="Build").length} Build roles — total reskilling: ${fmtNum(roles.filter(r => (overrides[r.role]||r.disposition)==="Build").reduce((s,r) => s+r.total_cost,0))}`,
      `${roles.filter(r => (overrides[r.role]||r.disposition)==="Buy").length} Buy roles — hiring cost: ${fmtNum(roles.filter(r => (overrides[r.role]||r.disposition)==="Buy").reduce((s,r) => s+r.total_cost,0))}`,
      `Build is ${Math.round(20000/85000*100)}% the cost of Buy per role — favor internal mobility where adjacency > 60%`,
      `Average transition timeline: ${Math.round(roles.reduce((s,r) => s+r.timeline_months,0)/Math.max(roles.length,1))} months across all roles`,
    ]} icon="🔀" />

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
    {!loading && Number(wf.starting_headcount || 0) === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">👥</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Upload Data for Headcount Planning</h3><p className="text-[13px] text-[var(--text-secondary)]">Complete BBBA to generate headcount waterfall.</p></div>}
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
        <div className="text-[10px] font-bold mb-1" style={{ color: bar.color }}>{bar.value > 0 ? "+" : ""}{bar.value}</div>
        <div className="w-full rounded-t" style={{ height: `${Math.max(h, 5)}%`, background: `${bar.color}30`, border: `1px solid ${bar.color}50` }} />
        <div className="text-[8px] text-[var(--text-muted)] mt-1 text-center">{bar.label}</div>
      </div>; })}</div>
    </Card>

    {/* Department breakdown */}
    <Card title="Department Breakdown">
      <div className="overflow-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[11px]"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Department</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Current</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Eliminated</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Redeployed</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">New Hires</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Future</th><th className="px-2 py-2 text-center border-b border-[var(--border)]">Change</th></tr></thead>
      <tbody>{depts.map(d => <tr key={d.department} className="border-b border-[var(--border)]"><td className="px-3 py-2 font-semibold">{d.department}</td><td className="px-2 py-2 text-center">{d.current_fte}</td><td className="px-2 py-2 text-center text-[var(--risk)]">-{d.eliminated}</td><td className="px-2 py-2 text-center text-[var(--success)]">{d.redeployed}</td><td className="px-2 py-2 text-center text-[var(--accent-primary)]">+{d.new_hires}</td><td className="px-2 py-2 text-center font-bold">{d.future_fte}</td><td className="px-2 py-2 text-center" style={{color: d.pct_change >= 0 ? "var(--success)" : "var(--risk)"}}>{d.pct_change > 0 ? "+" : ""}{d.pct_change}%</td></tr>)}</tbody></table></div>
    </Card>

    {/* Timeline */}
    <Card title="Transition Timeline">
      <div className="space-y-3">{[{phase:"Phase 1",time:timeline.phase_1_months,action:timeline.phase_1_actions,color:"var(--accent-primary)"},{phase:"Phase 2",time:timeline.phase_2_months,action:timeline.phase_2_actions,color:"var(--success)"},{phase:"Phase 3",time:timeline.phase_3_months,action:timeline.phase_3_actions,color:"var(--purple)"}].map((p,i) => <div key={i} className="flex gap-3 p-3 rounded-xl bg-[var(--surface-2)]"><div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{background:p.color}}>{i+1}</div><div><div className="text-[12px] font-bold text-[var(--text-primary)]">{p.phase} <span className="text-[var(--text-muted)] font-normal">Month {p.time}</span></div><div className="text-[11px] text-[var(--text-secondary)]">{p.action}</div></div></div>)}</div>
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
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Annual Savings</div><div className="text-[22px] font-extrabold text-[var(--success)]">{fmtNum(savings)}</div><div className="text-[9px] text-[var(--text-muted)]">From {eliminated} role eliminations</div></div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Hiring Cost</div><div className="text-[22px] font-extrabold text-[var(--risk)]">{fmtNum(hireCost)}</div><div className="text-[9px] text-[var(--text-muted)]">For {newHires} new roles</div></div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Transition Cost</div><div className="text-[22px] font-extrabold text-[var(--warning)]">{fmtNum(severance)}</div><div className="text-[9px] text-[var(--text-muted)]">Severance & onboarding</div></div>
          <div className="rounded-xl p-4 text-center border-2" style={{borderColor: netYear1 >= 0 ? "var(--success)" : "var(--risk)"}}><div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Net Year 1</div><div className="text-[22px] font-extrabold" style={{color: netYear1 >= 0 ? "var(--success)" : "var(--risk)"}}>{netYear1 >= 0 ? "" : "-"}{fmtNum(Math.abs(netYear1))}</div><div className="text-[9px] text-[var(--text-muted)]">{netYear1 >= 0 ? "Net positive" : "Investment year"}</div></div>
        </div>;
      })()}
    </Card>

    {/* Workforce Composition Shift */}
    <Card title="Workforce Composition Shift">
      <div className="grid grid-cols-2 gap-6">
        <div className="text-center"><div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-2">Before</div><div className="flex justify-center gap-8"><div><div className="text-[28px] font-extrabold text-[var(--text-primary)]">{Number(wf.starting_headcount || 0)}</div><div className="text-[10px] text-[var(--text-muted)]">Total HC</div></div></div></div>
        <div className="text-center"><div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-2">After</div><div className="flex justify-center gap-8"><div><div className="text-[28px] font-extrabold" style={{color: Number(wf.net_change || 0) >= 0 ? "var(--success)" : "var(--risk)"}}>{Number(wf.target_headcount || 0)}</div><div className="text-[10px] text-[var(--text-muted)]">Target HC ({Number(wf.net_change_pct || 0) > 0 ? "+" : ""}{Number(wf.net_change_pct || 0)}%)</div></div></div></div>
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
  const [wdTab, setWdTab] = useState("inventory");
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
    return <div className="relative"><input ref={inputRef} value={local} type={type === "number" ? "number" : "text"} step={type === "number" ? "1" : undefined} min={type === "number" ? "0" : undefined} onChange={(e) => { setLocal(e.target.value); if (type !== "number") onChange(e.target.value); }} onBlur={() => { if (type === "number") { const v = Math.round(Math.abs(parseInt(local, 10) || 0)); setLocal(String(v)); onChange(String(v)); } else onChange(local); }} onKeyDown={(e) => { if (e.key === "Enter" && type === "number") { const v = Math.round(Math.abs(parseInt(local, 10) || 0)); setLocal(String(v)); onChange(String(v)); (e.target as HTMLInputElement).blur(); } }} className="w-full border border-[var(--border)] rounded-md px-2 py-1 text-[13px] bg-[var(--surface-2)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]" />{suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] pointer-events-none">{suffix}</span>}</div>;
  };
  const SelectCell = ({ value, onChange, options }: { value: unknown; onChange: (v: string) => void; options: string[] }) => <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="w-full border border-[var(--border)] rounded-md px-2 py-1 text-[13px] bg-[var(--surface-2)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;

  // Completed / in-progress / not-started counts
  const completedJobs = jobs.filter(j => jobStates[j]?.finalized);
  const inProgressJobs = jobs.filter(j => jobStates[j]?.deconSubmitted && !jobStates[j]?.finalized);
  const notStartedJobs = jobs.filter(j => !jobStates[j]?.deconSubmitted && !jobStates[j]?.finalized);

  return <div>
    <ContextStrip items={[
      jobs.length ? `${jobs.length} jobs available from your uploaded data` : "No jobs found — upload Work Design data with Job Titles",
      Object.values(jobStates || {}).filter(s => s.finalized).length > 0 ? `${Object.values(jobStates || {}).filter(s => s.finalized).length}/${jobs.length} jobs finalized` : "",
      Object.values(jobStates || {}).filter(s => s.deconSubmitted && !s.finalized).length > 0 ? `${Object.values(jobStates || {}).filter(s => s.deconSubmitted && !s.finalized).length} in progress` : "",
    ].filter(Boolean)} />
    {!job && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 mb-5 text-center"><div className="text-3xl mb-3 opacity-40">✏️</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Select a Job to Begin</h3><p className="text-[13px] text-[var(--text-secondary)]">Choose a job from the sidebar to start deconstructing tasks and redesigning roles.</p></div>}
    <PageHeader icon="✏️" title="Work Design Lab" subtitle={`Redesign tasks, roles, and time allocation${ctxLoading || deconLoading ? " · Loading..." : ""}`} onBack={onBack} moduleId="design" />

    {/* Job Inventory */}
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold font-heading text-[var(--text-primary)]">Job Inventory</h3>
        <span className="text-[13px] text-[var(--text-secondary)]">{completedJobs.length}/{jobs.length} complete</span>
      </div>
      <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden mb-4">
        <div className="h-full bg-[var(--success)] rounded-full transition-all" style={{ width: `${jobs.length ? (completedJobs.length / jobs.length) * 100 : 0}%` }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {jobs.map(j => {
          const st = jobStates[j];
          const status = st?.finalized ? "complete" : st?.deconSubmitted ? "in_progress" : "not_started";
          const dot = status === "complete" ? "●" : status === "in_progress" ? "◐" : "○";
          const dotColor = status === "complete" ? "var(--success)" : status === "in_progress" ? "var(--accent-primary)" : "var(--text-muted)";
          const label = status === "complete" ? "Finalized" : status === "in_progress" ? (st?.redeploySubmitted ? "Redeployed" : "Decon submitted") : "Not started";
          const isActive = j === job;
          return <div key={j} onClick={() => onSelectJob(j)} className={`px-3 py-2 rounded-lg border text-[12px] cursor-pointer hover:border-[var(--accent-primary)]/50 transition-all ${isActive ? "border-[var(--accent-primary)] bg-[rgba(212,134,10,0.08)]" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
            <div className="flex items-center gap-2"><span style={{ color: dotColor }} className="text-[14px]">{dot}</span><span className={`font-semibold truncate ${isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"}`}>{j}</span></div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 pl-5">{label}</div>
          </div>;
        })}
      </div>
      {!jobs.length && <Empty text="No jobs found — upload Work Design data with Job Titles" icon="📭" />}
    </div>

    {!job ? <Empty text="Select a job from the sidebar to begin" icon="✏️" /> : <>
      {/* Active job bar */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-5 py-3 mb-4 flex items-center gap-4 flex-wrap">
        <span className="font-semibold text-[14px] text-[var(--accent-primary)]">{job}</span>
        <span className="text-[13px] text-[var(--text-secondary)]">{js.deconRows.length} tasks · {String(k.hours_week ?? 0)}h/wk · Scenario: {js.scenario}</span>
        <div className="ml-auto flex items-center gap-2"><Badge color={js.deconSubmitted ? "green" : "gray"}>Decon {js.deconSubmitted ? "✓" : "○"}</Badge><Badge color={js.redeploySubmitted ? "green" : "gray"}>Redeploy {js.redeploySubmitted ? "✓" : "○"}</Badge><Badge color={js.finalized ? "green" : "gray"}>Final {js.finalized ? "✓" : "○"}</Badge></div>
      </div>

      <TabBar tabs={[{ id: "ctx", label: "① Context" }, { id: "decon", label: "② Deconstruction" }, { id: "redeploy", label: "③ Redeployment" }, { id: "recon", label: "④ Reconstruction" }, { id: "impact", label: "⑤ Impact" }]} active={wdTab} onChange={setWdTab} />

      {wdTab === "ctx" && <div>
        {js.deconRows.length === 0 && <div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-xl px-5 py-3 mb-4 flex items-center justify-between">
          <div className="text-[13px] text-[var(--text-secondary)]">Ready to break down <strong className="text-[var(--text-primary)]">{job}</strong> into tasks?</div>
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
            <button onClick={() => { generateTasks(); setWdTab("decon"); }} disabled={aiGenerating} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>{aiGenerating ? "Generating..." : "Quick Generate"}</button>
            <button onClick={() => setWdTab("decon")} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)]">Manual Entry →</button>
          </div>
        </div>}
        <div className="grid grid-cols-6 gap-3 mb-5"><KpiCard label="Hours/Week" value={k.hours_week as number ?? 0} accent /><KpiCard label="Tasks" value={k.tasks as number ?? 0} /><KpiCard label="Workstreams" value={k.workstreams as number ?? 0} /><KpiCard label="Released" value={`${k.released_hrs ?? 0}h`} delta={`${k.released_pct ?? 0}%`} /><KpiCard label="Future Hrs" value={k.future_hrs as number ?? 0} /><KpiCard label="Evolution" value={String(k.evolution ?? "—")} /></div>
        <div className="grid grid-cols-12 gap-4"><div className="col-span-5"><Card title="Role Summary"><div className="flex flex-wrap gap-1.5 mb-3">{Object.entries(meta).map(([x, v]) => <Badge key={x} color="indigo">{x}: {v}</Badge>)}</div><p className="text-[13px] text-[var(--text-secondary)]">{String(ctx?.description ?? "No description.")}</p></Card></div><div className="col-span-4"><Card title="Time by Workstream"><BarViz data={ws} labelKey="Workstream" valueKey="Current Time Spent %" /></Card></div><div className="col-span-3"><Card title="Quick Profile"><DataTable data={ds} cols={["Metric", "Value"]} /></Card></div></div>
      </div>}

      {wdTab === "decon" && <div>
        {/* AI generation prompt when no tasks */}
        {js.deconRows.length === 0 && !aiGenerating && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.08)] to-[rgba(192,112,48,0.04)] border border-[rgba(224,144,64,0.2)] rounded-xl p-6 mb-4 text-center">
          <div className="text-2xl mb-2">✨</div>
          <h3 className="text-[15px] font-bold font-heading text-[var(--text-primary)] mb-1">No tasks yet for {job}</h3>
          <p className="text-[13px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">Let AI generate a detailed task breakdown, or add tasks manually below.</p>
          <button onClick={generateTasks} className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", boxShadow: "0 4px 20px rgba(200,120,40,0.3)" }}>✨ Auto-Generate Task Breakdown</button>
        </div>}
        {aiGenerating && <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6 mb-4 text-center animate-pulse">
          <div className="text-2xl mb-2">🧠</div>
          <h3 className="text-[15px] font-bold font-heading text-[var(--text-primary)] mb-1">AI is analyzing the {job} role...</h3>
          <p className="text-[13px] text-[var(--text-secondary)]">Generating task breakdown with AI impact scores, time estimates, and skill requirements</p>
        </div>}
        {/* Time tracker */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl px-5 py-3 mb-4">
          <div className="flex items-center justify-between mb-2"><span className="text-[14px] font-semibold">Time Allocation</span><span className="text-[15px] font-bold" style={{ color: deconTotal === 100 ? "var(--success)" : deconTotal > 100 ? "var(--risk)" : "var(--accent-primary)" }}>{deconTotal}% <span className="text-[12px] font-normal text-[var(--text-muted)]">/ 100%</span></span></div>
          <div className="h-3 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(deconTotal, 100)}%`, background: deconTotal === 100 ? "var(--success)" : deconTotal > 100 ? "var(--risk)" : "var(--accent-primary)" }} /></div>
        </div>
        <div className="grid grid-cols-12 gap-4 mb-5"><div className="col-span-4"><Card title="AI Impact"><DonutViz data={aid} /></Card></div><div className="col-span-4"><Card title="AI Priority"><BarViz data={aip} labelKey="Task Name" valueKey="AI Priority" color="var(--accent-scenario)" /></Card></div><div className="col-span-4"><InsightPanel title="Validation" items={[deconTotal === 100 ? "✓ Time = 100%" : `✗ Time = ${deconTotal}%`, blankRequired === 0 ? "✓ All fields filled" : `✗ ${blankRequired} blank`, deconValid ? "✓ Ready to submit" : "○ Fix issues above"]} icon="📋" /></div></div>
        <Card title="Task Inventory — Editable">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] text-[var(--text-muted)]">{js.deconRows.length} tasks · {totalEstHours}h/wk</span>
            <div className="flex gap-2">
              <button onClick={generateTasks} disabled={aiGenerating || js.finalized} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${aiGenerating ? "animate-pulse" : ""}`} style={{ background: "linear-gradient(135deg, #e09040, #c07030)", color: "#fff", opacity: aiGenerating || js.finalized ? 0.5 : 1 }}>{aiGenerating ? "✨ Generating..." : "✨ Auto-Generate Tasks"}</button>
              {dictEntries.length > 0 && <button onClick={() => setShowTaskDict(d => !d)} className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.3)] text-[var(--purple)]" style={{ opacity: js.finalized ? 0.5 : 1 }}>📖 Dictionary ({dictEntries.length})</button>}
              <button onClick={() => setJobState(job, { deconRows: [...js.deconRows, { "Task ID": `T${js.deconRows.length + 1}`, "Task Name": "", Workstream: "", "AI Impact": "Low", "Est Hours/Week": 0, "Current Time Spent %": 0, "Time Saved %": 0, "Task Type": "Variable", Interaction: "Interactive", Logic: "Probabilistic", "Primary Skill": "", "Secondary Skill": "" }], deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] })} className="px-3 py-1.5 bg-[var(--surface-3)] rounded-md text-[12px] font-semibold text-[var(--text-secondary)]">+ Add Task</button>
              <button disabled={!deconValid || js.finalized} onClick={() => { setJobState(job, { deconSubmitted: true, redeploySubmitted: false, finalized: false, recon: null, redeployRows: [] }); setWdTab("redeploy"); }} className={`px-3 py-1.5 rounded-md text-[12px] font-semibold ${!deconValid || js.finalized ? "bg-[var(--border)] text-[var(--text-muted)]" : "bg-[var(--accent-primary)] text-white hover:opacity-90"}`}>{js.deconSubmitted ? "Update" : "Submit"} Deconstruction</button>
            </div>
          </div>
          {/* Task Dictionary Panel */}
          {showTaskDict && dictEntries.length > 0 && <div className="mb-4 rounded-xl border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.04)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-bold text-[var(--purple)]">📖 Task Dictionary — {job}</div>
              <button onClick={() => setShowTaskDict(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer text-[12px]">✕</button>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] mb-3">Pre-built task portfolios for this role. Click an industry variant to load its tasks. This replaces your current task inventory.</div>
            <div className="grid grid-cols-1 gap-2">
              {dictEntries.map((entry, ei) => <div key={ei} className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Badge color="purple">{entry.industry}</Badge><span className="text-[11px] text-[var(--text-muted)]">{entry.tasks.length} tasks</span></div>
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
                  }} className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-[var(--purple)]/15 border border-[var(--purple)]/30 text-[var(--purple)] cursor-pointer hover:bg-[var(--purple)]/25 transition-all">Load Tasks</button>
                </div>
                <div className="grid grid-cols-2 gap-1">{entry.tasks.map((t, ti) => <div key={ti} className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)]">
                  <div className="w-1 h-1 rounded-full" style={{background: t.impact === "High" ? "var(--risk)" : t.impact === "Moderate" ? "var(--warning)" : "var(--success)"}} />
                  <span className="truncate">{t.name}</span>
                  <span className="text-[8px] shrink-0">{t.pct}%</span>
                </div>)}</div>
              </div>)}
            </div>
          </div>}
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-left text-[13px]"><thead><tr className="bg-[var(--surface-2)]">{["Task ID","Task Name","Workstream","AI Impact","Est Hrs/Wk","Time %","Type","Interaction","Logic","Skill 1","Skill 2"].map(c => <th key={c} className="px-2 py-2 border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)] whitespace-nowrap font-semibold">{c}</th>)}</tr></thead><tbody>{js.deconRows.map((row, idx) => <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--hover)]"><td className="px-2 py-2 min-w-[70px]"><EditableCell value={row["Task ID"]} onChange={v => updateDeconCell(idx, "Task ID", v)} /></td><td className="px-2 py-2 min-w-[160px]"><EditableCell value={row["Task Name"]} onChange={v => updateDeconCell(idx, "Task Name", v)} /></td><td className="px-2 py-2 min-w-[110px]"><EditableCell value={row.Workstream} onChange={v => updateDeconCell(idx, "Workstream", v)} /></td><td className="px-2 py-2 min-w-[90px]"><SelectCell value={row["AI Impact"]} onChange={v => updateDeconCell(idx, "AI Impact", v)} options={["High","Moderate","Low"]} /></td><td className="px-2 py-2 min-w-[80px]"><EditableCell type="number" value={row["Est Hours/Week"]} onChange={v => updateDeconCell(idx, "Est Hours/Week", v)} suffix="h" /></td><td className="px-2 py-2 min-w-[80px]"><EditableCell type="number" value={row["Current Time Spent %"]} onChange={v => updateDeconCell(idx, "Current Time Spent %", v)} suffix="%" /></td><td className="px-2 py-2 min-w-[90px]"><SelectCell value={row["Task Type"]} onChange={v => updateDeconCell(idx, "Task Type", v)} options={["Repetitive","Variable"]} /></td><td className="px-2 py-2 min-w-[100px]"><SelectCell value={row.Interaction} onChange={v => updateDeconCell(idx, "Interaction", v)} options={["Independent","Interactive","Collaborative"]} /></td><td className="px-2 py-2 min-w-[110px]"><SelectCell value={row.Logic} onChange={v => updateDeconCell(idx, "Logic", v)} options={["Deterministic","Probabilistic","Judgment-heavy"]} /></td><td className="px-2 py-2 min-w-[100px]"><EditableCell value={row["Primary Skill"]} onChange={v => updateDeconCell(idx, "Primary Skill", v)} /></td><td className="px-2 py-2 min-w-[100px]"><EditableCell value={row["Secondary Skill"]} onChange={v => updateDeconCell(idx, "Secondary Skill", v)} /></td></tr>)}</tbody></table></div>
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
          }} disabled={js.finalized} className="w-full py-2 rounded-md text-[12px] font-semibold text-white mb-2" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Auto-Recommend</button><div className="text-[10px] text-[var(--text-muted)]">AI assigns Retain/Augment/Automate based on task characteristics</div></Card>
          <Card title="Submit"><button disabled={!redeployValid || js.finalized} onClick={() => { setJobState(job, { redeploySubmitted: true, finalized: false, recon: null }); setWdTab("recon"); }} className={`w-full py-2 rounded-md text-[13px] font-semibold ${!redeployValid ? "bg-[var(--border)] text-[var(--text-muted)]" : "bg-[var(--accent-primary)] text-white"}`}>{js.redeploySubmitted ? "Update" : "Submit"} Redeployment</button></Card>
        </div>
        <Card title="Redeployment Plan — Editable">
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-left text-[13px]"><thead><tr className="bg-[var(--surface-2)]">{["Task ID","Task Name","Decision","Technology","Current %","New %","Destination","Future Skill","Notes"].map(c => <th key={c} className="px-2 py-2 border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)] whitespace-nowrap">{c}</th>)}</tr></thead><tbody>{js.redeployRows.map((row, idx) => <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--hover)]"><td className="px-2 py-2 text-[var(--text-secondary)]">{String(row["Task ID"] ?? "")}</td><td className="px-2 py-2 min-w-[160px] text-[var(--text-secondary)]">{String(row["Task Name"] ?? "")}</td><td className="px-2 py-2 min-w-[120px]"><SelectCell value={row.Decision} onChange={v => updateRedeployCell(idx, "Decision", v)} options={["Retain","Augment","Automate","Redesign","Transfer"]} /></td><td className="px-2 py-2 min-w-[120px]"><SelectCell value={row.Technology} onChange={v => updateRedeployCell(idx, "Technology", v)} options={["Human-led","GenAI","RPA","Agentic AI","ML","Shared Service"]} /></td><td className="px-2 py-2 text-[var(--text-secondary)]">{String(row["Current Time Spent %"] ?? "")}</td><td className="px-2 py-2 min-w-[80px]"><EditableCell type="number" value={row["New Time %"]} onChange={v => updateRedeployCell(idx, "New Time %", v)} /></td><td className="px-2 py-2 min-w-[160px]"><EditableCell value={row["Redeployment Destination"]} onChange={v => updateRedeployCell(idx, "Redeployment Destination", v)} /></td><td className="px-2 py-2 min-w-[120px]"><EditableCell value={row["Future Skill"]} onChange={v => updateRedeployCell(idx, "Future Skill", v)} /></td><td className="px-2 py-2 min-w-[120px]"><EditableCell value={row.Notes} onChange={v => updateRedeployCell(idx, "Notes", v)} /></td></tr>)}</tbody></table></div>
        </Card>
      </>}</div>}

      {wdTab === "recon" && (() => { const r = js.recon; const ac = ((r?.action_counts ?? {}) as Record<string, number>); const wf = ((r?.waterfall ?? {}) as Record<string, number>); const detail = ((r?.reconstruction ?? []) as Record<string, unknown>[]); const rollup = ((r?.rollup ?? []) as Record<string, unknown>[]); const recs = ((r?.recommendations ?? []) as string[]); return !js.redeploySubmitted ? <Empty text="Submit Redeployment first" icon="🔒" /> : <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Automate" value={ac.Automate ?? 0} accent /><KpiCard label="Augment" value={ac.Augment ?? 0} /><KpiCard label="Redesign" value={ac.Redesign ?? 0} /><KpiCard label="Retain" value={ac.Retain ?? 0} /></div><div className="grid grid-cols-12 gap-4 mb-5"><div className="col-span-5"><Card title="Reconstruction Rollup">{rollup.length ? <DataTable data={rollup} /> : <Empty text="Building..." icon="🧱" />}</Card></div><div className="col-span-3"><Card title="Capacity Waterfall">{Object.keys(wf).length ? <div className="flex items-end gap-2 h-40">{Object.entries(wf).map(([n, v], i) => <div key={n} className="flex-1 flex flex-col items-center justify-end"><div className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">{Number(v).toFixed(1)}h</div><div className="w-full rounded-t" style={{ height: `${Math.max((Number(v) / Math.max(Number(wf.current) || 1, 1)) * 100, 4)}%`, background: COLORS[i % COLORS.length] }} /><div className="text-[10px] text-[var(--text-muted)] mt-1 truncate w-full text-center">{n}</div></div>)}</div> : <Empty text="Building..." icon="📊" />}</Card></div><div className="col-span-4"><InsightPanel title="Recommendations" items={recs.length ? recs : ["Building..."]} icon="🎯" /></div></div><Card title="Future-State Detail"><DataTable data={detail} /></Card><div className="mt-4 flex justify-end"><button disabled={!js.redeploySubmitted || js.finalized} onClick={() => setJobState(job, { finalized: true })} className={`px-4 py-2 rounded-md text-[13px] font-semibold ${js.finalized ? "bg-[var(--success)] text-white" : "bg-[var(--success)] text-white hover:opacity-90"}`}>{js.finalized ? "✓ Finalized" : "Finalize Work Design"}</button></div></div>; })()}

      {wdTab === "impact" && (() => { const r = js.recon; const ins = ((r?.insights ?? []) as Record<string, unknown>[]); const vm = ((r?.value_model ?? {}) as Record<string, unknown>); return !js.redeploySubmitted ? <Empty text="Submit Redeployment to unlock" icon="🔒" /> : <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Current" value={r?.total_current_hrs as number ?? 0} /><KpiCard label="Future" value={r?.total_future_hrs as number ?? 0} /><KpiCard label="Released" value={((r?.total_current_hrs as number ?? 0) - (r?.total_future_hrs as number ?? 0)).toFixed(1)} accent /><KpiCard label="Evolution" value={String(r?.evolution ?? "—")} /></div><div className="grid grid-cols-2 gap-4"><Card title="Transformation Insights"><DataTable data={ins} cols={["Category", "Metric", "Value", "Interpretation"]} /></Card><Card title="Value Model">{Object.keys(vm).length ? <div className="space-y-2">{Object.entries(vm).map(([n, v]) => <div key={n} className="flex justify-between text-[13px]"><span className="text-[var(--text-secondary)]">{n}</span><span className="font-semibold">{String(v)}</span></div>)}</div> : <Empty text="Computing..." />}</Card></div></div>; })()}
    </>}
    <NextStepBar currentModuleId="design" onNavigate={onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 5: IMPACT SIMULATOR
   Converted from simulate-full.html — scenarios, custom builder,
   redeployment, ROI, AI readiness with 5-dimension rubric
   ═══════════════════════════════════════════════════════════════ */


const ODS_DEPTS = ["Executive Office","Finance & Accounting","Human Resources","Marketing","Product Design","Supply Chain","IT & Digital","Sales & Commercial","Legal & Compliance","Operations"];
const ODS_LEVELS = ["C-Suite","SVP","VP","Director","Manager","IC"];
const ODS_AVG_COMP: Record<string, number> = { "C-Suite": 420000, SVP: 310000, VP: 235000, Director: 175000, Manager: 125000, IC: 85000 };
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
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ color: c, background: pos ? "rgba(16,185,129,0.1)" : neg ? "rgba(239,68,68,0.1)" : "transparent" }}>{ar}{Math.abs(diff).toFixed(1)}</span>;
  };

  const HBar = ({ value, max, color }: { value: number; max: number; color: string }) => <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: `${color}12` }}><div className="h-full rounded-full transition-all" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} /></div>;

  const OdsKpi = ({ label, current, future, inv }: { label: string; current: number; future: number; inv?: boolean }) => (
    <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-baseline gap-3">
        <div><div className="text-[10px] text-[var(--text-muted)]">Current</div><div className="text-xl font-extrabold text-[var(--accent-primary)]">{current.toFixed(current > 100 ? 0 : 1)}</div></div>
        <span className="text-[var(--text-muted)]">→</span>
        <div><div className="text-[10px] text-[var(--text-muted)]">Scenario</div><div className="text-xl font-extrabold text-[var(--success)]">{future.toFixed(future > 100 ? 0 : 1)}</div></div>
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
              <span className="text-[13px] text-[var(--text-secondary)]">{r.label}</span>
              <div className="flex items-center gap-3 text-[13px]"><span className="text-[var(--accent-primary)] font-semibold">{r.c || 0}</span><span className="text-[var(--text-muted)]">→</span><span className="text-[var(--success)] font-semibold">{r.f || 0}</span><DChip a={Number(r.c || 0)} b={Number(r.f || 0)} inv /></div>
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
    {hasRealData ? <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--success)]">✓ Using your uploaded workforce data to model departments</div> : <div className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--warning)]">Using generated sample data — upload workforce data for your real org structure</div>}

    {/* Scenario selector — dropdown to save space */}
    <div className="flex gap-3 mb-4 items-center">
      <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Scenario:</span>
      <select value={activeScenario} onChange={e => setActiveScenario(Number(e.target.value))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] min-w-[180px]">
        {scenarios.map((s, i) => <option key={s.id} value={i}>{s.label} — {odsAgg(s.departments).hc} HC, {fmtNum(odsAgg(s.departments).cost)}</option>)}
      </select>
      <button onClick={async () => {
        setAiOdsLoading(true);
        try {
          const context = currentData.map(d => `${d.name}: ${d.headcount}hd, span ${d.avgSpan}, ${d.layers} layers, ${d.managers} mgrs`).join("; ");
          const aiText1 = await callAI("Return ONLY a valid JSON array of strings.", `Analyze this org structure and give 4-5 specific restructuring recommendations. Current state: ${context}. Return ONLY a JSON array of strings.`);
          setAiOdsInsights(JSON.parse(aiText1.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()));
      } catch {} setAiOdsLoading(false); }} disabled={aiOdsLoading} className="px-3 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: aiOdsLoading ? 0.5 : 1 }}>{aiOdsLoading ? "Analyzing..." : "✨ AI Recommendations"}</button>
      <button onClick={() => { realDataBuilt.current = false; const c = odsGenDept(); setCurrentData(c); setScenarios([odsGenScenario(c, "Optimized", 0.5, 0), odsGenScenario(c, "Aggressive", 0.9, 1), odsGenScenario(c, "Conservative", 0.25, 2)]); }} className="px-3 py-2 rounded-lg text-[12px] font-semibold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-primary)]">↻ Reset</button>
    </div>

    {/* View tabs */}
    <TabBar tabs={[{ id: "overview", label: "Overview" }, { id: "soc", label: "Span Detail" }, { id: "layers", label: "Layers" }, { id: "cost", label: "Cost Model" }, { id: "roles", label: "Role Migration" }, { id: "drill", label: "Dept Drill-Down" }, { id: "compare", label: "Compare All" }, { id: "insights", label: "Insights" }, { id: "benchmarks", label: "📖 Benchmarks" }]} active={view} onChange={setView} />

    {aiOdsInsights.length > 0 && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.06)] to-transparent border border-[rgba(224,144,64,0.15)] rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2 text-[13px] font-bold" style={{ color: "#f0a050" }}>✨ AI Restructuring Recommendations</div>
      <div className="space-y-1.5">{aiOdsInsights.map((ins, i) => <div key={i} className="text-[13px] text-[var(--text-secondary)] pl-4 relative"><span className="absolute left-0 text-[#f0a050] font-bold">{i+1}.</span>{ins}</div>)}</div>
    </div>}

    {view === "overview" && <div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <OdsKpi label="Total Headcount" current={cA.hc} future={fA.hc} inv /><OdsKpi label="Avg Span" current={cA.avgS} future={fA.avgS} /><OdsKpi label="Avg Layers" current={cA.avgL} future={fA.avgL} inv /><OdsKpi label="Managers" current={cA.mgr} future={fA.mgr} inv /><OdsKpi label="ICs" current={cA.ic} future={fA.ic} /><OdsKpi label="Est. Cost ($M)" current={cA.cost / 1e6} future={fA.cost / 1e6} inv />
      </div>
      {/* Span by dept */}
      <Card title="Span of Control by Department">
        {(() => { const maxSpan = Math.max(...currentData.map(d => d.avgSpan), ...sc.departments.map(d => d.avgSpan)) * 1.15; return <div className="space-y-2">{currentData.map((d, i) => { const f = sc.departments[i]; return <div key={d.name} className="flex items-center gap-3"><div className="w-32 text-[12px] text-[var(--text-muted)] text-right shrink-0">{d.name}</div><div className="flex-1 space-y-1"><HBar value={d.avgSpan} max={maxSpan} color="var(--accent-primary)" /><HBar value={f?.avgSpan || 0} max={maxSpan} color="var(--success)" /></div><div className="w-16 shrink-0"><DChip a={d.avgSpan} b={f?.avgSpan || 0} /></div></div>; })}</div>; })()}
        <div className="flex gap-4 mt-3 text-[11px] text-[var(--text-muted)]"><span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[var(--accent-primary)]" />Current</span><span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[var(--success)]" />{sc.label}</span></div>
      </Card>
    </div>}

    {view === "soc" && <Card title="Span of Control Detail">
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]">{["Department","HC (C)","HC (F)","Mgrs (C)","Mgrs (F)","ICs (C)","ICs (F)","SoC (C)","SoC (F)","Δ"].map(h => <th key={h} className="px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] text-center">{h}</th>)}</tr></thead>
      <tbody>{currentData.map((d, i) => { const f = sc.departments[i]; return <tr key={d.name} className="border-b border-[var(--border)] hover:bg-[var(--hover)]"><td className="px-3 py-2 text-[13px] font-semibold">{d.name}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.headcount}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.headcount}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.managers}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.managers}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.ics}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.ics}</td><td className="px-3 py-2 text-center text-[var(--accent-primary)]">{d.avgSpan}</td><td className="px-3 py-2 text-center text-[var(--success)]">{f?.avgSpan}</td><td className="px-3 py-2 text-center"><DChip a={d.avgSpan} b={f?.avgSpan || 0} /></td></tr>; })}</tbody></table></div>
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
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Scope:</span>
          <select value={layerScope} onChange={e => setLayerScope(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--text-primary)] outline-none">
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
                  <div className="w-20 text-right text-[12px] font-semibold text-[var(--text-secondary)] shrink-0">{level}</div>
                  <div className="flex-1 flex flex-col gap-1">
                    {/* Current bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-6 bg-[var(--surface-2)] rounded overflow-hidden"><div className="h-full rounded transition-all" style={{ width: `${Math.max((cur / maxCount) * 100, 1)}%`, background: `linear-gradient(90deg, ${layerColors[li]}dd, ${layerColors[li]}90)` }} /></div>
                      <span className="text-[10px] font-data text-[var(--text-muted)] w-16 text-right">{cur} ({curPct}%)</span>
                    </div>
                    {/* Future bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-5 bg-[var(--surface-2)] rounded overflow-hidden"><div className="h-full rounded transition-all" style={{ width: `${Math.max((fut / maxCount) * 100, 1)}%`, background: `linear-gradient(90deg, rgba(16,185,129,0.7), rgba(16,185,129,0.4))` }} /></div>
                      <span className="text-[10px] font-data w-16 text-right" style={{ color: delta < 0 ? "var(--success)" : delta > 0 ? "var(--risk)" : "var(--text-muted)" }}>{delta !== 0 ? `${delta > 0 ? "+" : ""}${delta}` : "—"}</span>
                    </div>
                  </div>
                  <div className="w-6 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full" style={{ background: health === "green" ? "var(--success)" : health === "amber" ? "var(--warning)" : "var(--risk)" }} /></div>
                </div>
              </div>;
            })}
            <div className="flex items-center gap-3 text-[9px] text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border)]">
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
              <div className="text-center"><div className="text-[28px] font-extrabold text-[var(--risk)]">{maxChain}</div><div className="text-[10px] text-[var(--text-muted)]">Deepest Chain</div><div className="text-[9px] text-[var(--text-muted)]">{deepest?.name || "—"}</div></div>
              <div className="text-center"><div className="text-[28px] font-extrabold text-[var(--accent-primary)]">{avgChain}</div><div className="text-[10px] text-[var(--text-muted)]">Average Depth</div></div>
              <div className="text-center"><div className="text-[28px] font-extrabold text-[var(--success)]">{minChain < 99 ? minChain : 0}</div><div className="text-[10px] text-[var(--text-muted)]">Shallowest</div><div className="text-[9px] text-[var(--text-muted)]">{shallowest?.name || "—"}</div></div>
            </div>
            {/* Visual chains */}
            <div className="flex gap-6 justify-center">
              {[{ label: "Deepest", dept: deepest, count: maxChain, color: "var(--risk)" }, { label: "Shallowest", dept: shallowest, count: minChain < 99 ? minChain : 0, color: "var(--success)" }].map(ch => <div key={ch.label} className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: ch.color }}>{ch.label}</div>
                {Array.from({ length: ch.count }, (_, j) => <div key={j} className="w-12 h-4 rounded-md flex items-center justify-center text-[7px] font-bold" style={{ background: `${ch.color}15`, border: `1px solid ${ch.color}30`, color: ch.color }}>{ODS_LEVELS[Math.min(j, ODS_LEVELS.length - 1)]?.slice(0, 3)}</div>)}
              </div>)}
            </div>
          </Card>

          {/* Layer distribution shape */}
          <Card title="Distribution Shape Analysis">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[13px] font-bold" style={{ color: shape === "balanced" ? "var(--success)" : shape === "top-heavy" ? "var(--warning)" : "var(--accent-primary)" }}>Your org is {shape}</div>
              <Badge color={shape === "balanced" ? "green" : shape === "top-heavy" ? "amber" : "indigo"}>{topHeavyPct.toFixed(0)}% above Director</Badge>
            </div>
            <div className="flex items-end gap-1 h-24 mb-3">
              {curLevels.map((l, i) => <div key={l.level} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full rounded-t" style={{ height: `${Math.max((l.count / maxCount) * 100, 4)}%`, background: layerColors[i], opacity: 0.7, minHeight: 4 }} />
                <div className="text-[7px] text-[var(--text-muted)] mt-1">{l.level.slice(0, 3)}</div>
              </div>)}
            </div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              {shape === "top-heavy" && "Consider de-layering senior levels to improve decision speed and reduce management overhead. Target: <15% of headcount above Director level."}
              {shape === "balanced" && "Healthy pyramid distribution. Senior layers are proportionate to the overall workforce. Continue monitoring as transformation progresses."}
              {shape === "bottom-heavy" && "Strong IC base with lean management. Ensure sufficient leadership coverage — may need to add management capacity in growing functions."}
            </div>
          </Card>
        </div>

        {/* Layer health table */}
        <Card title="Layer Health Indicators">
          <div className="overflow-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-[11px]">
              <thead><tr className="bg-[var(--surface-2)]">
                {["Layer", "Current HC", "% of Org", "Benchmark", "Gap", "Avg Tenure", "Health"].map(h => <th key={h} className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase text-[9px]">{h}</th>)}
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
          {curLevels.some((l, li) => l.count === 0 && li > 0 && li < ODS_LEVELS.length - 1) && <div className="mt-3 p-3 rounded-lg bg-[var(--risk)]/5 border border-[var(--risk)]/15 text-[11px] text-[var(--risk)]">⚠ Gap detected: {curLevels.filter((l, li) => l.count === 0 && li > 0 && li < ODS_LEVELS.length - 1).map(l => l.level).join(", ")} has no employees — creates a career progression gap.</div>}
        </Card>
      </div>;
    })()}

    {view === "cost" && <div>
      {/* Cost methodology */}
      <Card title="Cost Model — Methodology">
        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <div className="text-[13px] font-bold text-[var(--text-primary)] mb-2">How Current Cost is Calculated</div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-3">Total labor cost is computed by multiplying headcount at each career level by the average fully-loaded compensation for that level. This includes base salary, benefits (est. 25%), and overhead allocation.</div>
            <div className="space-y-1.5">{ODS_LEVELS.map(l => { const n = currentData.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0); const comp = ODS_AVG_COMP[l] || 85000; return <div key={l} className="flex items-center justify-between text-[12px] p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[var(--text-secondary)]">{l}</span>
              <span className="text-[var(--text-muted)]">{n} × {fmtNum(comp)}</span>
              <span className="font-semibold text-[var(--accent-primary)]">{fmtNum((n * comp))}</span>
            </div>; })}</div>
            <div className="flex justify-between mt-2 p-2 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[13px] font-bold"><span className="text-[var(--accent-primary)]">Current Total</span><span className="text-[var(--accent-primary)]">{fmtNum(cA.cost)}</span></div>
          </div>
          <div>
            <div className="text-[13px] font-bold text-[var(--text-primary)] mb-2">How Future Cost is Derived ({sc.label})</div>
            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-3">Future cost reflects scenario adjustments: layer removal reduces management headcount, span optimization redistributes ICs, and structural changes shift the level mix. Each change is applied per-department.</div>
            <div className="space-y-1.5">{ODS_LEVELS.map(l => { const n = sc.departments.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0); const cN = currentData.reduce((s, d) => s + (d.levelDist?.[l] || 0), 0); const comp = ODS_AVG_COMP[l] || 85000; const delta = n - cN; return <div key={l} className="flex items-center justify-between text-[12px] p-2 rounded-lg bg-[var(--surface-2)]">
              <span className="text-[var(--text-secondary)]">{l}</span>
              <span className="text-[var(--text-muted)]">{n} × {fmtNum(comp)} {delta !== 0 && <span style={{ color: delta < 0 ? "var(--success)" : "var(--risk)", fontSize: 10 }}>({delta > 0 ? "+" : ""}{delta})</span>}</span>
              <span className="font-semibold text-[var(--success)]">{fmtNum((n * comp))}</span>
            </div>; })}</div>
            <div className="flex justify-between mt-2 p-2 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-[13px] font-bold"><span className="text-[var(--success)]">{sc.label} Total</span><span className="text-[var(--success)]">{fmtNum(fA.cost)}</span></div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Net Change</div><div className="text-2xl font-extrabold" style={{ color: fA.cost < cA.cost ? "var(--success)" : "var(--risk)" }}>{fmtNum((fA.cost - cA.cost))}</div></div>
          <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Percent Change</div><div className="text-2xl font-extrabold" style={{ color: fA.cost < cA.cost ? "var(--success)" : "var(--risk)" }}>{cA.cost > 0 ? (((fA.cost - cA.cost) / cA.cost) * 100).toFixed(1) : "0"}%</div></div>
          <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">HC Change</div><div className="text-2xl font-extrabold" style={{ color: fA.hc < cA.hc ? "var(--success)" : "var(--risk)" }}>{fA.hc - cA.hc}</div></div>
          <div className="text-center"><div className="text-[10px] text-[var(--text-muted)] uppercase">Cost per Head</div><div className="text-lg font-extrabold text-[var(--text-primary)]">${cA.hc > 0 ? ((cA.cost / cA.hc) / 1000).toFixed(0) : "0"}K → ${fA.hc > 0 ? ((fA.cost / fA.hc) / 1000).toFixed(0) : "0"}K</div></div>
        </div>
      </Card>
      <Card title="Cost by Department">
        {(() => { const cCosts = currentData.map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const fCosts = (sc.departments || []).map(d => { let c = 0; if (d.levelDist) Object.entries(d.levelDist).forEach(([l, n]) => { c += n * (ODS_AVG_COMP[l] || 85000); }); return c; }); const maxCost = Math.max(...cCosts, ...fCosts, 1); return <div className="space-y-3">{currentData.map((d, i) => { const delta = (fCosts[i] ?? 0) - (cCosts[i] ?? 0); return <div key={d.name} className="flex items-center gap-3"><div className="w-36 text-[12px] font-semibold text-[var(--text-secondary)] text-right shrink-0">{d.name}</div><div className="flex-1 space-y-1"><HBar value={cCosts[i] ?? 0} max={maxCost} color="var(--accent-primary)" /><HBar value={fCosts[i] ?? 0} max={maxCost} color="var(--success)" /></div><div className="w-24 text-right shrink-0"><div className="text-[12px] font-semibold text-[var(--text-primary)]">{fmtNum(cCosts[i] ?? 0)}</div><div className="text-[10px]" style={{ color: delta < 0 ? "var(--success)" : delta > 0 ? "var(--risk)" : "var(--text-muted)" }}>{delta < 0 ? "↓" : delta > 0 ? "↑" : "→"} ${Math.abs(delta / 1e3).toFixed(0)}K</div></div></div>; })}</div>; })()}
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
          <div className="grid grid-cols-4 gap-3 mb-5">{[{ label: "New Roles", val: tn, color: "var(--success)", desc: "Created by restructuring" }, { label: "Eliminated", val: tr, color: "var(--risk)", desc: "Removed or automated" }, { label: "Restructured", val: ts, color: "var(--warning)", desc: "Scope or level changed" }, { label: "Retained", val: tRet, color: "var(--accent-primary)", desc: "Unchanged in scope" }].map(k => <div key={k.label} className="bg-[var(--surface-2)] rounded-xl p-4 border-l-[3px] border border-[var(--border)]" style={{ borderLeftColor: k.color }}><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{k.label}</div><div className="text-2xl font-extrabold" style={{ color: k.color }}>{k.val}</div><div className="text-[10px] text-[var(--text-muted)] mt-1">{k.desc}</div></div>)}</div>

          {/* How these numbers were derived */}
          <div className="bg-gradient-to-r from-[rgba(212,134,10,0.06)] to-transparent border border-[rgba(212,134,10,0.12)] rounded-xl p-5 mb-4">
            <div className="text-[13px] font-bold text-[var(--accent-primary)] mb-2">📊 How Role Migration is Calculated</div>
            <div className="grid grid-cols-2 gap-4 text-[12px] text-[var(--text-secondary)] leading-relaxed">
              <div><strong className="text-[var(--text-primary)]">New roles</strong> emerge when a department grows headcount or the scenario adds specialized functions. {mostNew?.name} generates the most ({mostNew?.newRoles}) due to its headcount expansion from {mostNew?.currentHC} → {mostNew?.futureHC}.</div>
              <div><strong className="text-[var(--text-primary)]">Eliminated roles</strong> result from layer compression and span widening. When a {mostElim?.name} department loses a management layer, the displaced manager positions are removed ({mostElim?.removedRoles} roles).</div>
              <div><strong className="text-[var(--text-primary)]">Restructured roles</strong> keep the same headcount but change in scope — e.g., a "Data Entry Clerk" becoming an "AI Operations Analyst." The {sc.label} scenario restructures {ts} roles across {gaps.filter(g => g.restructuredRoles > 0).length} departments.</div>
              <div><strong className="text-[var(--text-primary)]">Retained roles</strong> ({Math.round(tRet / totalHC * 100)}% of current workforce) continue unchanged. Higher retention is lower-risk but may limit transformation speed.</div>
            </div>
          </div>

          {/* Migration flow bars — taller */}
          <div className="space-y-3">{gaps.map(g => { const total = g.retained + g.newRoles + g.removedRoles + g.restructuredRoles; return <div key={g.name} className="flex items-center gap-3"><div className="w-36 text-[12px] font-semibold text-[var(--text-secondary)] text-right shrink-0">{g.name}</div><div className="flex-1 flex h-7 rounded-lg overflow-hidden"><div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${g.retained / total * 100}%`, background: "var(--accent-primary)", minWidth: g.retained > 0 ? 20 : 0 }}>{g.retained}</div><div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${g.newRoles / total * 100}%`, background: "var(--success)", minWidth: g.newRoles > 0 ? 16 : 0 }}>{g.newRoles}</div><div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${g.restructuredRoles / total * 100}%`, background: "var(--warning)", minWidth: g.restructuredRoles > 0 ? 16 : 0 }}>{g.restructuredRoles}</div><div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${g.removedRoles / total * 100}%`, background: "var(--risk)", minWidth: g.removedRoles > 0 ? 16 : 0 }}>{g.removedRoles}</div></div><div className="w-16 text-[11px] text-[var(--text-muted)] text-right">{g.currentHC}→{g.futureHC}</div></div>; })}</div>
          <div className="flex gap-4 mt-3 justify-center text-[11px] text-[var(--text-muted)]">{[{ c: "var(--accent-primary)", l: "Retained" }, { c: "var(--success)", l: "New" }, { c: "var(--warning)", l: "Restructured" }, { c: "var(--risk)", l: "Eliminated" }].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: x.c }} />{x.l}</span>)}</div>
        </div>;
      })()}
    </Card>}

    {/* Dept Drill-Down — expanded */}
    {view === "drill" && <div>
        <Card title="Department Deep Dive">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Department:</span>
            <select value={selDept} onChange={e => setSelDept(Number(e.target.value))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] min-w-[200px]">
              {currentData.map((d, i) => <option key={d.name} value={i}>{d.name} — {d.headcount} HC</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            <OdsKpi label="Headcount" current={currentData[selDept]?.headcount || 0} future={sc.departments[selDept]?.headcount || 0} inv /><OdsKpi label="Avg Span" current={currentData[selDept]?.avgSpan || 0} future={sc.departments[selDept]?.avgSpan || 0} /><OdsKpi label="Layers" current={currentData[selDept]?.layers || 0} future={sc.departments[selDept]?.layers || 0} inv /><OdsKpi label="Managers" current={currentData[selDept]?.managers || 0} future={sc.departments[selDept]?.managers || 0} inv /><OdsKpi label="FTE Ratio %" current={(currentData[selDept]?.fteRatio || 0) * 100} future={(sc.departments[selDept]?.fteRatio || currentData[selDept]?.fteRatio || 0) * 100} /><OdsKpi label="Est. Cost ($M)" current={Object.entries(currentData[selDept]?.levelDist || {}).reduce((s, [l, n]) => s + n * (ODS_AVG_COMP[l] || 85000), 0) / 1e6} future={Object.entries(sc.departments[selDept]?.levelDist || {}).reduce((s, [l, n]) => s + n * (ODS_AVG_COMP[l] || 85000), 0) / 1e6} inv />
          </div>
        </Card>
        <Card title={`Level Distribution — ${currentData[selDept]?.name || ""}`}>
          <div className="grid grid-cols-6 gap-3">{ODS_LEVELS.map(l => { const cN = currentData[selDept]?.levelDist?.[l] || 0; const fN = sc.departments[selDept]?.levelDist?.[l] || 0; const comp = ODS_AVG_COMP[l] || 85000; return <div key={l} className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--border)]">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-3">{l}</div>
            <div className="flex justify-between text-[16px] font-extrabold mb-1"><span className="text-[var(--accent-primary)]">{cN}</span><span className="text-[var(--text-muted)]">→</span><span className="text-[var(--success)]">{fN}</span></div>
            <DChip a={cN} b={fN} inv />
            <div className="mt-2 pt-2 border-t border-[var(--border)]"><div className="text-[9px] text-[var(--text-muted)]">Avg comp: {fmtNum(comp)}</div><div className="text-[9px] text-[var(--text-muted)]">Cost: {fmtNum((cN * comp))}</div></div>
          </div>; })}</div>
        </Card>
        <Card title={`${currentData[selDept]?.name || ""} — Workforce Composition`}>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">FTE vs Contractors</div><div className="flex gap-3 mb-2"><div><div className="text-xl font-extrabold text-[var(--accent-primary)]">{currentData[selDept]?.ftes || 0}</div><div className="text-[10px] text-[var(--text-muted)]">Full-Time</div></div><div><div className="text-xl font-extrabold text-[var(--warning)]">{currentData[selDept]?.contractors || 0}</div><div className="text-[10px] text-[var(--text-muted)]">Contractors</div></div></div><HBar value={currentData[selDept]?.ftes || 0} max={currentData[selDept]?.headcount || 1} color="var(--accent-primary)" /></div>
            <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Manager to IC Ratio</div><div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">1 : {((currentData[selDept]?.ics || 0) / Math.max(currentData[selDept]?.managers || 1, 1)).toFixed(1)}</div><div className="text-[10px] text-[var(--text-muted)]">{currentData[selDept]?.managers || 0} managers overseeing {currentData[selDept]?.ics || 0} individual contributors</div></div>
            <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Dept Share</div><div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">{cA.hc > 0 ? Math.round((currentData[selDept]?.headcount || 0) / cA.hc * 100) : 0}%</div><div className="text-[10px] text-[var(--text-muted)]">{currentData[selDept]?.headcount || 0} of {cA.hc} total headcount</div><HBar value={currentData[selDept]?.headcount || 0} max={cA.hc || 1} color="var(--purple)" /></div>
          </div>
        </Card>
      </div>}

    {/* Scenario Compare — all scenarios side by side */}
    {view === "compare" && <Card title="Multi-Scenario Comparison">
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Metric</th><th className="px-3 py-2 text-center text-[11px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Current</th>{scenarios.map((s, i) => <th key={s.id} className="px-3 py-2 text-center text-[11px] font-semibold border-b border-[var(--border)]" style={{ color: COLORS[i % COLORS.length] }}>{s.label}</th>)}</tr></thead>
      <tbody>{[{ label: "Headcount", key: "hc", inv: true }, { label: "Avg Span", key: "avgS" }, { label: "Avg Layers", key: "avgL", inv: true }, { label: "Managers", key: "mgr", inv: true }, { label: "Est. Cost ($M)", key: "cost", inv: true, fmt: (v: number) => `${fmtNum(v)}` }].map(m => {
        const cVal = cA[m.key as keyof typeof cA] as number;
        return <tr key={m.label} className="border-b border-[var(--border)]"><td className="px-3 py-2 text-[13px] font-semibold">{m.label}</td><td className="px-3 py-2 text-center text-[var(--text-secondary)]">{m.fmt ? m.fmt(cVal) : cVal.toFixed(1)}</td>{scenarios.map((s, i) => { const a = odsAgg(s.departments); const v = a[m.key as keyof typeof a] as number; return <td key={s.id} className="px-3 py-2 text-center"><span className="font-bold" style={{ color: COLORS[i % COLORS.length] }}>{m.fmt ? m.fmt(v) : v.toFixed(1)}</span> <DChip a={cVal} b={v} inv={m.inv} /></td>; })}</tr>;
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
      insights.push({ type: mgrRatio > 15 ? "warning" : "info", title: `Manager Ratio: ${mgrRatio.toFixed(1)}% → ${fMgrRatio.toFixed(1)}%`, body: `Current org has 1 manager per ${Math.round(cA.hc / Math.max(cA.mgr, 1))} employees. ${mgrRatio > 15 ? "Above the 12-15% benchmark — indicates over-management." : mgrRatio < 8 ? "Below 8% — may indicate insufficient leadership coverage." : "Within healthy 8-15% range."} The ${sc.label} scenario ${fMgrRatio < mgrRatio ? "improves" : "maintains"} this to ${fMgrRatio.toFixed(1)}%.`, color: mgrRatio > 15 ? "var(--warning)" : "var(--accent-primary)", metric: `${mgrRatio.toFixed(0)}%` });
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
      insights.push({ type: "info", title: `${sc.label} Scenario Summary`, body: `This scenario changes headcount from ${cA.hc} → ${fA.hc} (${fA.hc > cA.hc ? "+" : ""}${fA.hc - cA.hc}), adjusts average span from ${cA.avgS.toFixed(1)} → ${fA.avgS.toFixed(1)}, and shifts cost from ${fmtNum(cA.cost)} → ${fmtNum(fA.cost)}. The primary lever is ${fA.avgL < cA.avgL ? "layer compression" : fA.hc < cA.hc ? "headcount reduction" : "span optimization"}.`, color: "var(--accent-primary)" });

      if (!insights.length) insights.push({ type: "info", title: "No Major Flags", body: "Current scenario changes are within normal ranges.", color: "var(--accent-primary)" });
      return <div>
        <div className="text-[12px] text-[var(--text-secondary)] mb-4">{insights.length} insights generated from structural analysis of {currentData.length} departments, {cA.hc.toLocaleString()} employees, comparing current state to {sc.label} scenario.</div>
        <div className="space-y-3">{insights.map((ins, i) => <div key={i} className="rounded-xl p-5 border" style={{ background: `${ins.color}08`, borderColor: `${ins.color}20`, borderLeftWidth: 4, borderLeftColor: ins.color }}>
          <div className="flex items-center justify-between mb-1"><div className="text-[14px] font-bold" style={{ color: ins.color }}>{ins.title}</div>{ins.metric && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${ins.color}15`, color: ins.color }}>{ins.metric}</span>}</div>
          <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{ins.body}</div>
        </div>)}</div>
      </div>;
    })()}

    {view === "benchmarks" && <Card title="📖 Span & Layer Benchmarks by Industry">
      <div className="text-[12px] text-[var(--text-secondary)] mb-4">Industry benchmarks for optimal spans of control, management layers, and manager-to-IC ratios. Use as design targets when restructuring.</div>
      <div className="space-y-5">
        {SPAN_BENCHMARKS.map((bm, bi) => <div key={bi} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">{bm.icon}</span><span className="text-[14px] font-bold text-[var(--text-primary)]">{bm.industry}</span></div>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg p-2 bg-[var(--surface-1)] text-center"><div className="text-[16px] font-extrabold text-[var(--accent-primary)]">{bm.optimalSpan}</div><div className="text-[8px] text-[var(--text-muted)] uppercase">Optimal Span</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-1)] text-center"><div className="text-[16px] font-extrabold text-[var(--success)]">{bm.optimalLayers}</div><div className="text-[8px] text-[var(--text-muted)] uppercase">Optimal Layers</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-1)] text-center"><div className="text-[16px] font-extrabold text-[var(--purple)]">{bm.mgrRatio}</div><div className="text-[8px] text-[var(--text-muted)] uppercase">Mgr:IC Ratio</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-1)] text-center"><div className="text-[16px] font-extrabold text-[var(--warning)]">{bm.avgSpan}</div><div className="text-[8px] text-[var(--text-muted)] uppercase">Avg Span (Actual)</div></div>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-2 italic">{bm.notes}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">By Function</div>
            <div className="overflow-x-auto"><table className="w-full text-[10px]"><thead><tr className="border-b border-[var(--border)]">
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
        <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Your Org vs Industry Benchmarks</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-4 bg-[var(--surface-1)] border border-[var(--border)] text-center">
            <div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Your Avg Span</div>
            <div className="text-[22px] font-extrabold text-[var(--text-primary)]">{(cA.hc / Math.max(cA.mgr, 1)).toFixed(1)}</div>
            <div className="text-[9px] text-[var(--text-muted)] mt-1">vs benchmark 6-10</div>
          </div>
          <div className="rounded-xl p-4 bg-[var(--surface-1)] border border-[var(--border)] text-center">
            <div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Your Avg Layers</div>
            <div className="text-[22px] font-extrabold text-[var(--text-primary)]">{(currentData.reduce((s, d) => s + d.layers, 0) / currentData.length).toFixed(1)}</div>
            <div className="text-[9px] text-[var(--text-muted)] mt-1">vs benchmark 4-6</div>
          </div>
          <div className="rounded-xl p-4 bg-[var(--surface-1)] border border-[var(--border)] text-center">
            <div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Mgr Ratio</div>
            <div className="text-[22px] font-extrabold text-[var(--text-primary)]">1:{Math.round(cA.hc / Math.max(cA.mgr, 1))}</div>
            <div className="text-[9px] text-[var(--text-muted)] mt-1">vs benchmark 1:6 to 1:10</div>
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
    <div style={{ color: highlight ? "#FFFFFF" : c.text, fontWeight: 600, fontSize: 12, lineHeight: 1.4 }}>{label}</div>
    {note && <div className="text-[10px] text-[var(--text-muted)] mt-0.5 italic">{note}</div>}
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
    } catch { showToast("Sandbox seeding failed — check backend"); }
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
  const [omView, setOmView] = useState("blueprint");
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

  return <div>
    <PageHeader icon="🧬" title="Operating Model Lab" subtitle="Design your target operating model with AI-era frameworks" onBack={onBack} moduleId="opmodel" />
    {/* OM Lab ↔ Canvas Toggle */}
    <div className="flex items-center gap-2 mb-4">
      <div className="flex rounded-xl overflow-hidden border border-[var(--border)]" style={{ background: "var(--surface-2)" }}>
        <button className="px-4 py-2 text-[12px] font-semibold transition-all" style={{ background: "rgba(224,144,64,0.15)", color: "#e09040", borderRight: "1px solid var(--border)" }}>
          🧬 Analysis Lab
        </button>
        <button onClick={() => onNavigateCanvas && onNavigateCanvas()} className="px-4 py-2 text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
          ⬡ Design Canvas
        </button>
        <button onClick={() => setOmView("kpi")} className="px-4 py-2 text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all" style={{ borderLeft: "1px solid var(--border)" }}>
          ◎ KPI Alignment
        </button>
      </div>
      <div className="text-[10px] text-[var(--text-muted)] ml-2">Switch between analysis, visual design, and KPI tracking</div>
    </div>
    {hasUploadedOM ? <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--success)]">✓ Operating model data detected</div> : <div className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-4 text-[12px] text-[var(--warning)]">Exploring with sample patterns — upload Operating Model data for custom blueprint</div>}
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-3 space-y-3">
        <Card title="Function"><div className="space-y-1">{Object.entries(OM_FUNCTIONS).map(([k,v]) => <button key={k} onClick={() => setFn(k)} className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-all flex items-center gap-2" style={{ background: fn===k ? "rgba(212,134,10,0.1)" : "transparent", border: fn===k ? "1px solid var(--accent-primary)" : "1px solid transparent", color: fn===k ? "var(--accent-primary)" : "var(--text-muted)" }}><span>{v.icon}</span>{v.label}</button>)}</div></Card>
        <Card title="Archetype"><div className="space-y-1">{Object.entries(OM_ARCHETYPES).map(([k,v]) => <button key={k} onClick={() => setArch(k)} className="w-full text-left px-3 py-1 rounded-lg text-[10px] transition-all" style={{ background: arch===k ? "rgba(139,92,246,0.1)" : "transparent", border: arch===k ? "1px solid var(--purple)" : "1px solid transparent", color: arch===k ? "var(--purple)" : "var(--text-muted)" }}>{v.label}</button>)}</div></Card>
        <Card title="Model"><div className="flex gap-1 flex-wrap mb-2">{["centralized","decentralized","federated","hub_spoke"].map(m => <button key={m} onClick={() => setOpModel(m)} className="px-2 py-1 rounded text-[9px] font-semibold" style={{ background: opModel===m ? "rgba(16,185,129,0.15)" : "var(--surface-2)", color: opModel===m ? "var(--success)" : "var(--text-muted)" }}>{m.replace("_"," ")}</button>)}</div><div className="flex gap-1">{["tight","balanced","light"].map(g => <button key={g} onClick={() => setGov(g)} className="px-2 py-1 rounded text-[9px] font-semibold flex-1" style={{ background: gov===g ? "rgba(249,115,22,0.15)" : "var(--surface-2)", color: gov===g ? "var(--warning)" : "var(--text-muted)" }}>{g}</button>)}</div></Card>
        <button onClick={async () => { setAiOmLoading(true); try { const r = await callAI("Return ONLY valid JSON.", `For ${fnD.label}, recommend: {"archetype":"functional|divisional|matrix|platform|network","opModel":"centralized|decentralized|federated|hub_spoke","governance":"tight|balanced|light","reasoning":"2 sentences"}`); const p = JSON.parse(r.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim()); if (p.archetype) setArch(p.archetype); if (p.opModel) setOpModel(p.opModel); if (p.governance) setGov(p.governance); setAiOmReasoning(p.reasoning||""); } catch {} setAiOmLoading(false); }} disabled={aiOmLoading} className="w-full px-3 py-2 rounded-xl text-[11px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: aiOmLoading ? 0.5 : 1 }}>{aiOmLoading ? "..." : "☕ Recommend"}</button>
        {aiOmReasoning && <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--surface-2)] rounded-lg p-2">{aiOmReasoning}</div>}
        <div className="flex gap-1"><input value={aiCompanyInput} onChange={e => setAiCompanyInput(e.target.value)} placeholder="e.g. Chipotle..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" onKeyDown={e => { if (e.key==="Enter") generateCompanyModel(); }} /><button onClick={generateCompanyModel} disabled={aiCompanyGenerating} className="px-2 py-1 rounded-lg text-[9px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕</button></div>
        <div className="flex gap-1 flex-wrap">{Object.entries({...OM_COMPANIES,...aiCompanies}).map(([k,c]) => { const co = c as Record<string,string>; return <button key={k} onClick={() => seedCompanySandbox(k, co)} disabled={sandboxLoading===k} className="px-2 py-0.5 rounded text-[8px] font-semibold transition-all" style={{ background: sandboxLoading===k ? "rgba(224,144,64,0.2)" : "var(--surface-2)", color: sandboxLoading===k ? "var(--accent-primary)" : "var(--text-muted)", opacity: sandboxLoading && sandboxLoading!==k ? 0.4 : 1 }}>{sandboxLoading===k ? "⏳" : ""}{co.name||k}</button>; })}</div>
      </div>
      <div className="col-span-9">
        <TabBar tabs={[{id:"configurator",label:"🏗 Configurator"},{id:"blueprint",label:"Blueprint"},{id:"capability",label:"Capability Maturity"},{id:"service",label:"Service Model"},{id:"decisions",label:"Decision Rights"},{id:"ai_tier",label:"AI Service Layer"},{id:"traits",label:"Archetype Fit"},{id:"valuechain",label:"Value Chain"},{id:"capmap",label:"Capability Map"},{id:"processflow",label:"Process Flows"},{id:"techstack",label:"Technology Layer"},{id:"kpi",label:"◎ KPI Alignment"}]} active={omView} onChange={setOmView} />

        {/* ── CONFIGURATOR TAB ── */}
        {omView === "configurator" && <div className="animate-tab-enter">
          {/* Industry Selector */}
          <Card title="Step 1 — Select Industries">
            <div className="text-[12px] text-[var(--text-secondary)] mb-3">Select all industries that apply to this organization. Universal functions are always included.</div>
            <div className="flex flex-wrap gap-2">
              {((omTaxonomy as Record<string,unknown>)?.available_industries as {id:string;label:string;icon:string;examples:string;function_count:number;unit_count:number}[] || []).map(ind => {
                const selected = omIndustries.includes(ind.id);
                return <button key={ind.id} onClick={() => setOmIndustries(prev => selected ? prev.filter(i => i !== ind.id) : [...prev, ind.id])}
                  className="px-3 py-2 rounded-xl text-[11px] font-semibold transition-all" style={{
                    border: selected ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                    background: selected ? "rgba(212,134,10,0.08)" : "transparent",
                    color: selected ? "var(--accent-primary)" : "var(--text-muted)",
                  }}>
                  <span className="mr-1">{ind.icon}</span> {ind.label}
                  <span className="ml-1 opacity-50">({ind.unit_count})</span>
                </button>;
              })}
            </div>
            {omIndustries.length > 0 && <div className="mt-2 text-[11px] text-[var(--accent-primary)]">{omIndustries.length} industrie(s) selected</div>}
          </Card>

          {/* Search */}
          <Card title="Step 2 — Browse & Select Operating Units">
            <div className="flex gap-3 mb-4">
              <input value={omSearch} onChange={e => setOmSearch(e.target.value)} placeholder="Search operating units..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-data">
                {(() => { const t = omTaxonomy as Record<string,unknown>; const s = t?.stats as Record<string,number>; return s ? `${omSelectedUnits.length} selected · ${s.total_units || 0} total` : ""; })()}
              </div>
            </div>

            {/* Search results */}
            {omSearchResults.length > 0 && <div className="mb-4 bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--accent-primary)]/20">
              <div className="text-[10px] font-bold text-[var(--accent-primary)] uppercase mb-2">Search Results</div>
              {omSearchResults.map((r: Record<string,unknown>) => {
                const uid = String(r.id);
                const isSelected = omSelectedUnits.includes(uid);
                return <div key={uid} className="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0">
                  <input type="checkbox" checked={isSelected} onChange={() => setOmSelectedUnits(prev => isSelected ? prev.filter(u => u !== uid) : [...prev, uid])} style={{ accentColor: "#D4860A" }} />
                  <span className="text-[12px] text-[var(--text-primary)] flex-1">{String(r.name)}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-[var(--text-muted)]">{String(r.layer)}</span>
                  <span className="text-[9px] text-[var(--text-muted)]">{String(r.function_label)}</span>
                  <span className="text-[9px] font-data text-[var(--accent-primary)]">{(Number(r.score) * 100).toFixed(0)}%</span>
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
                      <span className="text-[13px]">{fdata.icon}</span>
                      <span className="text-[13px] font-semibold text-[var(--text-primary)] flex-1 font-heading">{fdata.label}</span>
                      <span className="text-[10px] font-data" style={{ color: selectedCount > 0 ? "var(--accent-primary)" : "var(--text-muted)" }}>{selectedCount}/{fdata.units.length}</span>
                      <input type="checkbox" checked={allSelected} onChange={() => {
                        const ids = fdata.units.map(u => u.id);
                        setOmSelectedUnits(prev => allSelected ? prev.filter(u => !ids.includes(u)) : [...new Set([...prev, ...ids])]);
                      }} onClick={e => e.stopPropagation()} style={{ accentColor: "#D4860A" }} />
                      {fdata.source !== "universal" && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">Industry</span>}
                      <span className="text-[var(--text-muted)] text-[10px]" style={{ transform: `rotate(${expanded ? 90 : 0}deg)`, transition: "transform 0.2s" }}>▸</span>
                    </div>
                    {expanded && <div className="px-4 pb-3 space-y-1">
                      {fdata.units.map(u => {
                        const isSelected = omSelectedUnits.includes(u.id);
                        const scope = omScopedUnits[u.id] || "in";
                        const displayName = omRenames[u.id] || u.name;
                        const layerColors: Record<string,string> = { "Governance": "var(--risk)", "Core": "var(--accent-primary)", "Shared Services": "var(--success)", "Enabling": "var(--warning)", "Interface": "var(--purple)" };
                        return <div key={u.id} className="flex items-center gap-2 py-1 group">
                          <input type="checkbox" checked={isSelected} onChange={() => setOmSelectedUnits(prev => isSelected ? prev.filter(x => x !== u.id) : [...prev, u.id])} style={{ accentColor: "#D4860A" }} />
                          <span className={`text-[12px] flex-1 ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{displayName}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold" style={{ color: layerColors[u.layer] || "var(--text-muted)", background: `${layerColors[u.layer] || "var(--text-muted)"}15` }}>{u.layer}</span>
                          {isSelected && <button onClick={() => setOmScopedUnits(prev => ({...prev, [u.id]: scope === "in" ? "out" : "in"}))} className="text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: scope === "in" ? "var(--success)" : "var(--text-muted)", border: `1px solid ${scope === "in" ? "var(--success)" : "var(--border)"}` }}>{scope === "in" ? "In Scope" : "Out of Scope"}</button>}
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
            <div className="text-[12px] text-[var(--text-secondary)] mb-3">Add operating units not in the taxonomy, or rename existing ones to match your client's terminology.</div>
            {omCustomUnits.length > 0 && <div className="space-y-1 mb-3">
              {omCustomUnits.map((cu, i) => <div key={cu.id} className="flex items-center gap-2 bg-[var(--surface-2)] rounded-lg px-3 py-2">
                <span className="text-[12px] text-[var(--text-primary)] flex-1">{cu.name}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{cu.func}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">{cu.layer}</span>
                <button onClick={() => setOmCustomUnits(prev => prev.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[11px]">✕</button>
              </div>)}
            </div>}
            {omAddingCustom ? <div className="bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--accent-primary)]/20 space-y-3">
              <input value={omCustomName} onChange={e => setOmCustomName(e.target.value)} placeholder="Operating unit name" className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none" />
              <div className="flex gap-2">
                <input value={omCustomFunc} onChange={e => setOmCustomFunc(e.target.value)} placeholder="Function (e.g. Finance)" className="flex-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none" />
                <select value={omCustomLayer} onChange={e => setOmCustomLayer(e.target.value)} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--text-primary)]">
                  {["Governance","Core","Shared Services","Enabling","Interface"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { if (omCustomName.trim()) { setOmCustomUnits(prev => [...prev, {id:`cust_${Date.now()}`,name:omCustomName.trim(),func:omCustomFunc||"Custom",layer:omCustomLayer}]); setOmCustomName(""); setOmCustomFunc(""); setOmAddingCustom(false); }}} className="px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--accent-primary)] text-white">Add</button>
                <button onClick={() => setOmAddingCustom(false)} className="px-4 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
              </div>
            </div> : <button onClick={() => setOmAddingCustom(true)} className="px-4 py-2 rounded-lg text-[11px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5 transition-all">+ Add Custom Unit</button>}
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
              }} className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all">💾 Save Configuration</button>
              <button onClick={() => { setOmSelectedUnits([]); setOmCustomUnits([]); setOmRenames({}); setOmScopedUnits({}); setOmIndustries([]); showToast("Configuration reset"); }} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--risk)]">Reset</button>
            </div>
          </Card>
        </div>}

        {omView === "blueprint" && <Card title={`${fnD.label} — ${archD.label} Architecture`}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] text-[var(--text-secondary)]">{archD.desc} · {opModel.replace("_"," ")} · {gov} governance</div>
            <button onClick={async () => {
              setAiOmLoading(true);
              try {
                const raw = await callAI("Return ONLY valid JSON.", `Generate a detailed operating model blueprint for a ${fnD.label} function using a ${archD.label} archetype. Return JSON: {"governance":["3-4 governance bodies"],"core":["10-15 core capabilities specific to ${fnD.label}"],"shared":["3-5 shared services"],"enabling":["3-4 enabling platforms/tools"],"interface":["3-4 interface touchpoints"]}. Be specific to ${fnD.label} — not generic.`);
                const parsed = JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim());
                if (parsed.core) setAiBlueprint(parsed);
              } catch {} setAiOmLoading(false);
            }} disabled={aiOmLoading} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>{aiOmLoading ? "..." : "☕ AI Custom Blueprint"}</button>
          </div>

          {aiBlueprint && <div className="bg-[rgba(224,144,64,0.06)] border border-[rgba(224,144,64,0.15)] rounded-lg px-3 py-2 mb-3 flex items-center justify-between"><span className="text-[11px]" style={{ color: "#f0a050" }}>☕ Showing AI-generated blueprint</span><button onClick={() => setAiBlueprint(null)} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Reset to default</button></div>}
          <div className="space-y-2">
            {[{label:"Governance",items:aiBlueprint?.governance || govLayer,color:"var(--risk)"},{label:"Core Components",items:aiBlueprint?.core || coreLayer,color:"var(--accent-primary)",grid:true},{label:"Shared Services",items:aiBlueprint?.shared || sharedLayer,color:"var(--success)"},{label:"Enabling",items:aiBlueprint?.enabling || enableLayer,color:"var(--purple)"},{label:"Interface",items:aiBlueprint?.interface || interfaceLayer,color:"var(--warning)"}].map(layer => <div key={layer.label} className="rounded-xl p-3 border-l-4" style={{ background: `${layer.color}06`, borderColor: layer.color }}>
              <div className="flex items-center justify-between mb-2"><div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: layer.color }}>{layer.label}</div><div className="text-[9px]" style={{ color: `${layer.color}80` }}>{layer.items.length} capabilities</div></div>
              <div className={layer.grid ? `grid gap-2 ${layer.items.length <= 4 ? "grid-cols-4" : layer.items.length <= 6 ? "grid-cols-3" : layer.items.length <= 9 ? "grid-cols-3 lg:grid-cols-4" : "grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}` : "flex gap-2 flex-wrap"}>{layer.items.map(t => { const ai = getAiTier(t); return <div key={t} className={`rounded-lg p-2.5 border ${layer.grid ? "" : "px-3 py-2"}`} style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}><div className="text-[11px] font-semibold text-[var(--text-primary)]">{t.replace(archD.coreSuffix, "")}</div>{archD.coreSuffix && layer.grid && <div className="text-[8px] italic mt-0.5" style={{ color: `${layer.color}80` }}>{archD.coreSuffix.replace(" — ", "").replace(" as a ", "").trim()}</div>}{layer.grid && <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: ai.color }} /><span className="text-[8px]" style={{ color: ai.color }}>{ai.tier}</span></div>}</div>; })}</div>
            </div>)}
          </div>
        </Card>}

        {omView === "capability" && <Card title="Capability Maturity Assessment">
          {(() => { const scores = Object.values(maturityScores).filter(v => v > 0); const avg = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1) : "—"; const tScores = Object.values(targetScores).filter(v => v > 0); const tAvg = tScores.length ? (tScores.reduce((a,b) => a+b, 0) / tScores.length).toFixed(1) : "—"; return <div className="flex gap-4 mb-4">{[{label:"Current Avg",val:avg,color:"var(--accent-primary)"},{label:"Target Avg",val:tAvg,color:"var(--success)"},{label:"Capabilities Rated",val:`${scores.length}/${allCaps.length}`,color:"var(--text-secondary)"},{label:"Gap",val:scores.length && tScores.length ? (Number(tAvg)-Number(avg)).toFixed(1) : "—",color:"var(--warning)"}].map(k => <div key={k.label} className="flex-1 rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold" style={{color:k.color}}>{k.val}</div><div className="text-[9px] text-[var(--text-muted)] uppercase">{k.label}</div></div>)}</div>; })()}
          <div className="text-[12px] text-[var(--text-secondary)] mb-3">Rate current state (left) and target state (right) for each capability.</div>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Capability</th><th className="px-2 py-2 text-center text-[10px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Layer</th>{[1,2,3,4,5].map(n => <th key={n} className="px-2 py-2 text-center text-[10px] border-b border-[var(--border)] text-[var(--text-muted)]">{n}</th>)}<th className="px-1 py-2 text-center text-[9px] border-b border-[var(--border)] text-[var(--text-muted)]">|</th>{[1,2,3,4,5].map(n => <th key={`t${n}`} className="px-2 py-2 text-center text-[10px] border-b border-[var(--border)] text-[var(--success)]">{n}</th>)}<th className="px-2 py-2 text-center text-[10px] border-b border-[var(--border)] text-[var(--text-muted)]">AI</th></tr></thead>
          <tbody>{allCaps.map(cap => { const sc = maturityScores[cap.name]||0; const ai = getAiTier(cap.name); return <tr key={cap.name} className="border-b border-[var(--border)]"><td className="px-3 py-1.5 text-[11px] font-semibold">{cap.name}</td><td className="px-2 py-1.5 text-center"><span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${layerColors[cap.layer]}12`, color: layerColors[cap.layer] }}>{cap.layer}</span></td>{[1,2,3,4,5].map(n => <td key={n} className="px-2 py-1.5 text-center"><button onClick={() => setMaturityScores(p => ({...p,[cap.name]:n}))} className="w-6 h-6 rounded text-[10px] font-bold" style={{ background: sc>=n ? `${n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)"}20` : "var(--surface-2)", color: sc>=n ? (n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)") : "var(--text-muted)" }}>{n}</button></td>)}<td className="px-1 py-1.5 text-center text-[var(--border)]">│</td>{[1,2,3,4,5].map(n => <td key={`t${n}`} className="px-2 py-1.5 text-center"><button onClick={() => setTargetScores(p => ({...p,[cap.name]:n}))} className="w-6 h-6 rounded text-[10px] font-bold" style={{ background: (targetScores[cap.name]||0)>=n ? `${n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)"}20` : "var(--surface-2)", color: (targetScores[cap.name]||0)>=n ? (n<=2?"var(--risk)":n<=3?"var(--warning)":"var(--success)") : "var(--text-muted)" }}>{n}</button></td>)}<td className="px-2 py-1.5 text-center"><span className="text-[9px]" style={{ color: ai.color }}>{ai.tier}</span></td></tr>; })}</tbody></table></div>
          <div className="flex gap-3 mt-2 text-[9px] text-[var(--text-muted)]">{["1=Ad Hoc","2=Emerging","3=Defined","4=Managed","5=Optimized"].map(l => <span key={l}>{l}</span>)}</div>
        </Card>}

        {omView === "service" && <Card title="Service Delivery Model">
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">Click the service type to change. Options: Shared, Embedded, CoE, Outsourced, AI-Automated.</div>
          <div className="grid grid-cols-2 gap-4">
            <div><DonutViz data={["Shared","Embedded","CoE","Outsourced","AI-Auto"].map(s => ({name:s,value:activeCoreLayer.filter(t => (serviceOverrides[t.replace(archD.coreSuffix,"")] || getSM(t)) === s).length})).filter(d => d.value > 0)} /></div>
            <div className="space-y-1.5">{activeCoreLayer.map(t => { const cleanName = t.replace(archD.coreSuffix,""); const sm = serviceOverrides[cleanName] || getSM(t); const ai = getAiTier(t); const smColors: Record<string,string> = {Shared:"indigo",Embedded:"green",CoE:"purple",Outsourced:"gray","AI-Auto":"amber"}; const smOpts = ["Shared","Embedded","CoE","Outsourced","AI-Auto"]; return <div key={t} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)]"><span className="text-[11px] text-[var(--text-primary)] truncate flex-1 mr-2">{cleanName}</span><div className="flex items-center gap-2"><button onClick={() => { const idx = smOpts.indexOf(sm); setServiceOverrides(prev => ({...prev, [cleanName]: smOpts[(idx+1) % smOpts.length]})); }} className="px-2 py-0.5 rounded-full text-[9px] font-semibold cursor-pointer" style={{background: `var(--${smColors[sm] || "gray"})15`, color: `var(--${smColors[sm] || "text-muted"})`, border: "1px solid var(--border)"}}>{sm}</button><span className="text-[8px] w-10 text-right" style={{color:ai.color}}>{ai.pct}%</span></div></div>; })}</div>
          </div>
        </Card>}

        {omView === "decisions" && <Card title="Decision Rights (RAPID)">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] text-[var(--text-secondary)]">Click any cell to cycle through R→A→P→I→D</div>
            <button onClick={async () => {
              setAiOmLoading(true);
              try { const raw = await callAI("Return ONLY valid JSON.", `Generate 8 key decisions for a ${fnD.label} function with ${archD.label} archetype. For each decision, assign RAPID roles to these 4 columns: ${govLayer[0] || "Executive"}, ${govLayer[1] || "Board"}, Function Head, Team Lead. Return JSON: {"decisions":[{"d":"decision name","r":["D","A","R","P"]}]} — use only letters R,A,P,I,D`); const p = JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim()); if (p.decisions) setRapidRows(p.decisions); } catch {} setAiOmLoading(false);
            }} disabled={aiOmLoading} className="px-3 py-1 rounded-lg text-[10px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Generate RAPID</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Decision</th>{[govLayer[0] || "Executive", govLayer[1] || "Board", "Function Head", "Team Lead"].map(r => <th key={r} className="px-2 py-2 text-center text-[9px] font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">{r.length > 20 ? r.slice(0,18)+"..." : r}</th>)}</tr></thead>
          <tbody>{rapidRows.map((row, ri) => <tr key={ri} className="border-b border-[var(--border)]"><td className="px-3 py-2 text-[11px] font-semibold">{row.d}</td>{row.r.map((r: string, ci: number) => { const cl: Record<string,string> = {R:"var(--accent-primary)",A:"var(--success)",P:"var(--purple)",I:"var(--text-muted)",D:"var(--warning)"}; const cycle = ["R","A","P","I","D"]; return <td key={ci} className="px-2 py-2 text-center"><button onClick={() => { const next = cycle[(cycle.indexOf(r)+1) % 5]; setRapidRows(prev => prev.map((row2,ri2) => ri2===ri ? {...row2, r: row2.r.map((v: string,ci2: number) => ci2===ci ? next : v)} : row2)); }} className="w-6 h-6 rounded items-center justify-center text-[10px] font-bold inline-flex cursor-pointer" style={{background:`${cl[r]||cl.I}15`,color:cl[r]||cl.I}}>{r}</button></td>; })}</tr>)}</tbody></table></div>
          <div className="flex gap-3 mt-2 text-[9px] text-[var(--text-muted)]">{[{l:"R",n:"Recommend",c:"var(--accent-primary)"},{l:"A",n:"Agree",c:"var(--success)"},{l:"P",n:"Perform",c:"var(--purple)"},{l:"I",n:"Input",c:"var(--text-muted)"},{l:"D",n:"Decide",c:"var(--warning)"}].map(x => <span key={x.l} className="flex items-center gap-1"><span className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center" style={{background:`${x.c}15`,color:x.c}}>{x.l}</span>{x.n}</span>)}</div>
        </Card>}

        {omView === "ai_tier" && <Card title="AI Service Layer">
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">Human-AI interaction model per capability.</div>
          <div className="grid grid-cols-4 gap-3 mb-4">{[{tier:"Human-Led",color:"#10B981",icon:"👤"},{tier:"Hybrid",color:"#F97316",icon:"🤝"},{tier:"AI-Augmented",color:"#D4860A",icon:"🤖"},{tier:"AI-First",color:"#8B5CF6",icon:"⚡"}].map(t => <div key={t.tier} className="rounded-xl p-3 border text-center" style={{background:`${t.color}06`,borderColor:`${t.color}20`}}><div className="text-lg">{t.icon}</div><div className="text-[11px] font-bold" style={{color:t.color}}>{t.tier}</div><div className="text-[18px] font-extrabold" style={{color:t.color}}>{teams.filter(tm => getAiTier(tm).tier===t.tier).length}</div></div>)}</div>
          <div className="space-y-1.5">{teams.map(t => { const ai=getAiTier(t); return <div key={t} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)]"><span className="text-[11px] font-semibold w-36 shrink-0">{t}</span><div className="flex-1 h-3 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${ai.pct}%`,background:ai.color}} /></div><span className="text-[9px] font-semibold w-14 text-right" style={{color:ai.color}}>{ai.pct}%</span><Badge color={ai.tier==="AI-First"?"purple":ai.tier==="AI-Augmented"?"indigo":ai.tier==="Hybrid"?"amber":"green"}>{ai.tier}</Badge></div>; })}</div>
        </Card>}

        {omView === "traits" && <Card title={`${archD.label} — Archetype Fit`}>
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">{archD.desc}</div>
          <div className="grid grid-cols-2 gap-4"><div><RadarViz data={Object.entries(archD.traits).map(([k,v]) => ({subject:k.charAt(0).toUpperCase()+k.slice(1),current:v,max:5}))} /></div><div className="space-y-2">{Object.entries(archD.traits).map(([k,v]) => <div key={k}><div className="flex justify-between text-[11px] mb-0.5"><span className="text-[var(--text-secondary)] capitalize">{k}</span><span className="font-bold" style={{color:v>=4?"var(--success)":v>=3?"var(--accent-primary)":"var(--warning)"}}>{v}/5</span></div><div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${v/5*100}%`,background:v>=4?"var(--success)":v>=3?"var(--accent-primary)":"var(--warning)"}} /></div></div>)}
            <div className="mt-3 p-3 rounded-xl bg-[var(--surface-2)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Best For</div><div className="text-[11px] text-[var(--text-secondary)]">{arch==="functional"?"Stable industries, deep specialization":arch==="divisional"?"Multi-product, P&L ownership":arch==="matrix"?"Complex orgs, dual expertise":arch==="platform"?"Tech-forward, autonomous teams":"Innovation-heavy, project-based"}</div></div>
            <div className="p-3 rounded-xl bg-[var(--surface-2)]"><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Watch Out</div><div className="text-[11px] text-[var(--text-secondary)]">{arch==="functional"?"Silos, slow cross-functional work":arch==="divisional"?"Duplication, higher costs":arch==="matrix"?"Dual reporting tension":arch==="platform"?"Requires strong eng culture":"Accountability gaps"}</div></div>
          </div></div>
        </Card>}

        {omView === "kpi" && <KPIAlignmentInline projectId={projectId || "default"} />}

        {/* ── Value Chain ── */}
        {omView === "valuechain" && <Card title={`${fnD.label} — Value Chain`}>
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">End-to-end value chain showing how {fnD.label} creates and delivers value across lifecycle stages.</div>
          <div className="flex items-stretch gap-0 mb-6 overflow-x-auto">
            {(OM_LIFECYCLES[fn] || ["Plan","Execute","Deliver","Measure","Optimize","Improve"]).map((stage, i, arr) => {
              const ai = getAiTier(stage); const isLast = i === arr.length - 1;
              return <div key={stage} className="flex-1 min-w-[120px] relative group">
                <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] mx-0.5 transition-all hover:border-[var(--accent-primary)]/30 hover:-translate-y-1 h-full">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-1">Stage {i+1}</div>
                  <div className="text-[13px] font-bold text-[var(--text-primary)] mb-2">{stage}</div>
                  <div className="flex items-center gap-1 mb-2"><div className="w-1.5 h-1.5 rounded-full" style={{background:ai.color}} /><span className="text-[9px] font-semibold" style={{color:ai.color}}>{ai.tier} · {ai.pct}%</span></div>
                  <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${ai.pct}%`,background:ai.color}} /></div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-2">{fnD.core[i] || fnD.core[0]}</div>
                </div>
                {!isLast && <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 z-10 text-[var(--text-muted)] text-[14px]">→</div>}
              </div>;
            })}
          </div>
          {/* Support activities */}
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Support Activities</div>
          <div className="grid grid-cols-3 gap-2">
            {[...fnD.shared, ...fnD.enabling.slice(0,3)].map(s => <div key={s} className="px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />{s}
            </div>)}
          </div>
        </Card>}

        {/* ── Capability Map ── */}
        {omView === "capmap" && <Card title={`${fnD.label} — Capability Map`}>
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">Strategic capability map organized by layer — identify strengths, gaps, and investment priorities.</div>
          {[
            {layer:"Governance",items:govLayer,color:"var(--teal,#0891B2)"},
            {layer:"Core Capabilities",items:activeCoreLayer,color:"var(--accent-primary)"},
            {layer:"Shared Services",items:activeSharedLayer,color:"var(--success)"},
            {layer:"Enabling Platforms",items:activeEnableLayer,color:"var(--purple)"},
            {layer:"Interface / Touchpoints",items:activeInterfaceLayer,color:"var(--warning)"},
          ].map(l => <div key={l.layer} className="mb-4">
            <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full" style={{background:l.color}} /><span className="text-[11px] font-bold uppercase tracking-wider" style={{color:l.color}}>{l.layer}</span><span className="text-[9px] text-[var(--text-muted)]">({l.items.length})</span></div>
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">{l.items.map(cap => {
              const ai = getAiTier(cap); const score = maturityScores[cap] || 0;
              return <div key={cap} className="rounded-lg p-2.5 bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30">
                <div className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">{cap.replace(archD.coreSuffix,"")}</div>
                <div className="flex items-center justify-between"><div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{background:ai.color}} /><span className="text-[8px]" style={{color:ai.color}}>{ai.tier}</span></div>
                {score > 0 && <span className="text-[8px] font-bold" style={{color:score>=4?"var(--success)":score>=3?"var(--warning)":"var(--risk)"}}>{score}/5</span>}</div>
              </div>;
            })}</div>
          </div>)}
        </Card>}

        {/* ── Process Flows ── */}
        {omView === "processflow" && <Card title={`${fnD.label} — Process Flows`}>
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">Key process flows across the {fnD.label} function — from trigger to outcome, with AI automation opportunities marked.</div>
          {(OM_LIFECYCLES[fn] || ["Plan","Execute","Deliver"]).slice(0,4).map((process, pi) => {
            const steps = fnD.core.slice(pi*3, pi*3+3).length > 0 ? fnD.core.slice(pi*3, pi*3+3) : fnD.core.slice(0,3);
            return <div key={process} className="mb-5 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="text-[12px] font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{background:"var(--accent-primary)"}}>{pi+1}</span>{process} Process</div>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {["Trigger","Input","Process","Review","Output","Archive"].map((step, si, arr) => {
                  const ai = getAiTier(step); const isLast = si === arr.length - 1;
                  return <React.Fragment key={step}>
                    <div className="flex-shrink-0 rounded-lg px-3 py-2 text-center min-w-[90px]" style={{background:`${ai.color}12`,border:`1px solid ${ai.color}30`}}>
                      <div className="text-[10px] font-bold" style={{color:ai.color}}>{step}</div>
                      <div className="text-[8px] text-[var(--text-muted)] mt-0.5">{steps[si % steps.length]?.split(" ").slice(0,2).join(" ") || "—"}</div>
                      <div className="flex items-center justify-center gap-1 mt-1"><div className="w-1 h-1 rounded-full" style={{background:ai.color}} /><span className="text-[7px]" style={{color:ai.color}}>{ai.pct}%</span></div>
                    </div>
                    {!isLast && <span className="text-[var(--text-muted)] text-[12px] shrink-0">→</span>}
                  </React.Fragment>;
                })}
              </div>
            </div>;
          })}
        </Card>}

        {/* ── Technology Layer ── */}
        {omView === "techstack" && <Card title={`${fnD.label} — Technology Stack`}>
          <div className="text-[12px] text-[var(--text-secondary)] mb-4">Technology landscape underpinning {fnD.label} — from core platforms to AI/ML layer.</div>
          {[
            {tier:"Core Platforms",desc:"Foundation systems of record",items:fnD.enabling,color:"var(--accent-primary)",icon:"🏗️"},
            {tier:"Integration Layer",desc:"APIs, middleware, data pipelines",items:["API Gateway","Event Bus","ETL Pipeline","Master Data Mgmt"].map(i => `${fnD.label.split(" ")[0]} ${i}`),color:"var(--teal,#0891B2)",icon:"🔗"},
            {tier:"Analytics & BI",desc:"Reporting, dashboards, insights",items:fnD.interface_.filter(i => i.toLowerCase().includes("dashboard") || i.toLowerCase().includes("analytics") || i.toLowerCase().includes("report")).concat(["Performance Dashboard","Executive Reporting"]).slice(0,4),color:"var(--purple)",icon:"📊"},
            {tier:"AI & Automation",desc:"ML models, RPA, intelligent workflows",items:["Predictive Models","NLP Processing","Process Automation (RPA)","Intelligent Document Processing","Decision Support Engine","Anomaly Detection"].slice(0, arch === "platform" ? 6 : 4),color:"#E8C547",icon:"🤖"},
            {tier:"Interface & UX",desc:"End-user touchpoints",items:fnD.interface_,color:"var(--success)",icon:"💻"},
          ].map(t => <div key={t.tier} className="mb-4">
            <div className="flex items-center gap-2 mb-2"><span className="text-sm">{t.icon}</span><span className="text-[11px] font-bold uppercase tracking-wider" style={{color:t.color}}>{t.tier}</span><span className="text-[9px] text-[var(--text-muted)] normal-case">— {t.desc}</span></div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">{t.items.map(item => {
              const ai = getAiTier(item);
              return <div key={item} className="rounded-lg px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between transition-all hover:border-[var(--accent-primary)]/30">
                <span className="text-[10px] font-semibold text-[var(--text-primary)] truncate">{item}</span>
                <div className="flex items-center gap-1 shrink-0 ml-2"><div className="w-1.5 h-1.5 rounded-full" style={{background:ai.color}} /><span className="text-[8px] font-semibold" style={{color:ai.color}}>{ai.pct}%</span></div>
              </div>;
            })}</div>
          </div>)}
        </Card>}
      </div>
    </div>

    {/* Current → Target Transition */}
    <Card title="Operating Model Transition Roadmap">
      <div className="grid grid-cols-3 gap-4">{[
        {phase:"Phase 1: Foundation",time:"Months 1-3",items:["Define target operating model","Assess current capability maturity","Map governance structures","Identify quick-win capability improvements"],color:"var(--accent-primary)"},
        {phase:"Phase 2: Build",time:"Months 4-9",items:["Implement new service delivery model","Deploy decision rights framework","Begin capability development programs","Launch AI service layer pilots"],color:"var(--success)"},
        {phase:"Phase 3: Scale",time:"Months 10-18",items:["Scale successful pilots org-wide","Embed new governance routines","Measure maturity improvements","Iterate and optimize model"],color:"var(--purple)"},
      ].map(p => <div key={p.phase} className="rounded-xl p-4 border-l-4 bg-[var(--surface-2)]" style={{borderColor:p.color}}>
        <div className="text-[13px] font-bold mb-1" style={{color:p.color}}>{p.phase}</div>
        <div className="text-[10px] text-[var(--text-muted)] mb-2">{p.time}</div>
        <div className="space-y-1">{p.items.map((it,i) => <div key={i} className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1"><span className="text-[var(--text-muted)] shrink-0">•</span>{it}</div>)}</div>
      </div>)}</div>
    </Card>

    <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
      <div className="text-2xl mb-2">🎉</div>
      <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1">Journey Complete</div>
      <div className="text-[13px] text-[var(--text-secondary)] mb-3">Generate your full transformation report.</div>
      <button onClick={async () => {
        const report = await callAI("Write a comprehensive executive transformation report.", "Generate a full AI Transformation Report. Format as professional narrative.");
        if (report) { const blob = new Blob([report], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "AI_Transformation_Report.txt"; a.click(); URL.revokeObjectURL(url); }
      }} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Generate Full Report</button>
    </div>
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
        {selectedJobs.map(j => <button key={j} onClick={() => toggleJob(j)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer flex items-center gap-1">{j} <span className="opacity-50">✕</span></button>)}
        {selectedJobs.length === 0 && <span className="text-[11px] text-[var(--text-muted)]">Select up to 4 jobs below</span>}
      </div>
      <div className="flex gap-1.5 flex-wrap">{availableJobs.slice(0, 30).map(j => <button key={j} onClick={() => toggleJob(j)} className="px-2 py-1 rounded text-[9px] font-semibold transition-all cursor-pointer" style={{ background: selectedJobs.includes(j) ? "rgba(212,134,10,0.15)" : "var(--surface-2)", color: selectedJobs.includes(j) ? "var(--accent-primary)" : "var(--text-muted)", border: `1px solid ${selectedJobs.includes(j) ? "rgba(212,134,10,0.3)" : "var(--border)"}` }}>{j}</button>)}</div>
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
            <div className="text-[13px] font-bold text-[var(--text-primary)] mb-1 truncate">{j}</div>
            <div className="flex gap-2">
              <Badge color="indigo">{tasks.length} tasks</Badge>
              {hasRedesign && <Badge color="green">Redesigned</Badge>}
              {!hasRedesign && <Badge color="gray">Current</Badge>}
            </div>
          </div>

          {/* Current state metrics */}
          <div className="p-4">
            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Current State</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--accent-primary)]">{tasks.length}</div><div className="text-[8px] text-[var(--text-muted)]">Tasks</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--warning)]">{highAi}</div><div className="text-[8px] text-[var(--text-muted)]">High AI</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--success)]">{Math.round(aiTime)}%</div><div className="text-[8px] text-[var(--text-muted)]">AI Saveable</div></div>
              <div className="rounded-lg p-2 bg-[var(--surface-2)] text-center"><div className="text-[14px] font-extrabold text-[var(--text-primary)]">{totalTime}%</div><div className="text-[8px] text-[var(--text-muted)]">Utilized</div></div>
            </div>

            {/* Task breakdown */}
            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Top Tasks</div>
            <div className="space-y-1">
              {tasks.slice(0, 5).map((t, i) => <div key={i} className="flex items-center gap-2 text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: String(t["AI Impact"]).toLowerCase() === "high" ? "var(--risk)" : String(t["AI Impact"]).toLowerCase() === "moderate" ? "var(--warning)" : "var(--success)" }} />
                <span className="text-[var(--text-secondary)] truncate flex-1">{String(t["Task Name"] || "—")}</span>
                <span className="text-[var(--text-muted)] shrink-0">{t["Current Time Spent %"]}%</span>
              </div>)}
            </div>

            {/* Redesigned state if available */}
            {hasRedesign && js.recon && <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="text-[9px] font-bold text-[var(--success)] uppercase tracking-wider mb-1">↓ After Redesign ({js.scenario})</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2 bg-[rgba(16,185,129,0.06)] text-center"><div className="text-[12px] font-extrabold text-[var(--success)]">{String((js.recon as Record<string, unknown>).human_pct || "—")}%</div><div className="text-[8px] text-[var(--text-muted)]">Human</div></div>
                <div className="rounded-lg p-2 bg-[rgba(139,92,246,0.06)] text-center"><div className="text-[12px] font-extrabold text-[var(--purple)]">{String((js.recon as Record<string, unknown>).ai_pct || "—")}%</div><div className="text-[8px] text-[var(--text-muted)]">AI</div></div>
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
      {(["combined","roi","effort"] as const).map(s => <button key={s} onClick={() => setSortBy(s)} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer" style={{ background: sortBy === s ? "rgba(212,134,10,0.15)" : "var(--surface-2)", color: sortBy === s ? "var(--accent-primary)" : "var(--text-muted)", border: `1px solid ${sortBy === s ? "rgba(212,134,10,0.3)" : "var(--border)"}` }}>{s === "combined" ? "Best Overall" : s === "roi" ? "Highest ROI" : "Lowest Effort"}</button>)}
    </div>

    {/* Quick Wins section */}
    {quickWins.length > 0 && <Card title="⚡ Quick Wins — High Impact, Low Effort">
      <div className="text-[11px] text-[var(--text-secondary)] mb-3">These opportunities offer the best return for minimal implementation complexity. Start here.</div>
      <div className="grid grid-cols-2 gap-3">
        {quickWins.map((w, i) => <div key={i} className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] border-l-[3px] border-l-[var(--success)] transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12px] font-bold text-[var(--text-primary)] truncate flex-1 mr-2">{String(w["Task Name"] || w.task_name || "—")}</div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.15)] text-[var(--success)] shrink-0">Quick Win</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mb-2">{String(w["Job Title"] || w.job_title || "—")}</div>
          <div className="flex gap-3">
            <div><span className="text-[8px] text-[var(--text-muted)] uppercase">ROI</span><div className="text-[13px] font-extrabold" style={{ color: roiColor(w._roi) }}>{w._roi}</div></div>
            <div><span className="text-[8px] text-[var(--text-muted)] uppercase">Effort</span><div className="text-[13px] font-extrabold" style={{ color: effortColor(w._effort) }}>{w._effort === 1 ? "Low" : "Med"}</div></div>
            <div><span className="text-[8px] text-[var(--text-muted)] uppercase">Time Saved</span><div className="text-[13px] font-extrabold text-[var(--accent-primary)]">{String(w.avg_time_saved || w.time_saved_pct || "—")}%</div></div>
          </div>
        </div>)}
      </div>
    </Card>}

    {/* Strategic Bets */}
    {strategicBets.length > 0 && <Card title="🎯 Strategic Bets — High Impact, Higher Effort">
      <div className="space-y-2">
        {strategicBets.map((w, i) => <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
          <div className="flex-1"><div className="text-[11px] font-bold text-[var(--text-primary)]">{String(w["Task Name"] || w.task_name || "—")}</div><div className="text-[9px] text-[var(--text-muted)]">{String(w["Job Title"] || w.job_title || "—")}</div></div>
          <div className="text-center"><div className="text-[12px] font-extrabold" style={{ color: roiColor(w._roi) }}>{w._roi}</div><div className="text-[7px] text-[var(--text-muted)]">ROI</div></div>
          <div className="text-center"><div className="text-[12px] font-extrabold" style={{ color: effortColor(w._effort) }}>{w._effort <= 2 ? "Med" : "High"}</div><div className="text-[7px] text-[var(--text-muted)]">Effort</div></div>
        </div>)}
      </div>
    </Card>}

    {/* All scored — compact table */}
    <Card title="All Opportunities — Ranked">
      <div className="overflow-x-auto"><table className="w-full text-[11px]"><thead><tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
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
  const IS: React.CSSProperties = {background:"#1a1814",border:"1px solid #2e2b24",borderRadius:5,color:"#f0ece4",padding:"5px 8px",fontSize:11,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"'Outfit',sans-serif"};
  const LB: React.CSSProperties = {fontSize:9,fontWeight:800,color:"#7a7368",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3,display:"block"};
  return (
    <div style={{position:"absolute",top:0,right:0,width:248,height:"100%",background:"#1a1814",borderLeft:"1px solid #2e2b24",display:"flex",flexDirection:"column",zIndex:25,fontFamily:"'Outfit',sans-serif",boxShadow:"-4px 0 20px rgba(0,0,0,0.35)"}}>
      <div style={{padding:"10px 12px",borderBottom:"1px solid #2e2b24",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:9,fontWeight:800,color:"#D4860A",letterSpacing:"0.12em",textTransform:"uppercase"}}>Properties</span>
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
            <label key={k.id} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",marginBottom:4,fontSize:10,color:linked?"#4A9E6B":"#7a7368"}}>
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
        <button onClick={onDelete} style={{width:"100%",padding:"6px 0",borderRadius:5,background:"rgba(224,108,117,0.12)",border:"1px solid rgba(224,108,117,0.3)",color:"#e06c75",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Delete Node</button>
      </div>
    </div>
  );
}

// ── Main Canvas Component ──────────────────────────────────────────────────────

export function OMDesignCanvas({ projectId, onBack, onNavigateLab }: { projectId: string; onBack: ()=>void; onNavigateLab?: ()=>void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes,    setNodes]    = usePersisted<OMNode2[]>(`${projectId}_om_nodes`, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const IB=(extra?:React.CSSProperties):React.CSSProperties=>({background:"none",border:"1px solid #2e2b24",borderRadius:4,color:"#b8b0a0",cursor:"pointer",fontSize:11,padding:"3px 8px",fontFamily:"'Outfit',sans-serif",...extra});
  const delta=totTgt-totCur;

  return (
    <div style={{height:"calc(100vh - 96px)",display:"flex",flexDirection:"column",background:"#0f0e0c",fontFamily:"'Outfit',sans-serif",color:"#f0ece4",borderRadius:12,overflow:"hidden",border:"1px solid #2e2b24"}}>
      {/* Header */}
      <div style={{padding:"7px 12px",borderBottom:"1px solid #2e2b24",display:"flex",alignItems:"center",gap:8,background:"#1a1814",flexShrink:0,flexWrap:"wrap"}}>
        <span style={{fontSize:11,fontWeight:800,color:"#D4860A",letterSpacing:"0.04em",marginRight:4}}>OM CANVAS</span>
        {onNavigateLab && <button onClick={onNavigateLab} style={{padding:"2px 9px",borderRadius:4,fontSize:9,fontWeight:700,background:"transparent",border:"1px solid #2e2b24",color:"#6B6355",cursor:"pointer",marginRight:4}} title="Switch to Analysis Lab">🧬 Lab</button>}
        <div style={{display:"flex",background:"#211f1b",borderRadius:6,padding:2,border:"1px solid #2e2b24"}}>
          {(["current","target"] as OMDesignMode2[]).map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{padding:"2px 9px",borderRadius:4,fontSize:10,fontWeight:700,background:mode===m?(m==="current"?"#D4860A":"#D4860A"):"transparent",border:"none",color:mode===m?"#fff":"#6B6355",cursor:"pointer"}}>
              {m==="current"?"Current":"Target"}
            </button>
          ))}
        </div>
        <div style={{width:1,height:14,background:"#2e2b24"}} />
        {(Object.entries(OM_EDGE_CFG) as [OMEdgeType2,{label:string;dash:string;color:string}][]).map(([k,v])=>(
          <button key={k} onClick={()=>{setEdgeMode(edgeMode===k?null:k);setEdgeStart(null);}}
            style={{...IB(),padding:"2px 7px",fontSize:9,border:`1px solid ${edgeMode===k?v.color:"#2e2b24"}`,background:edgeMode===k?`${v.color}22`:"transparent",color:edgeMode===k?v.color:"#6B6355"}}>
            {v.label}
          </button>
        ))}
        <div style={{flex:1}} />
        <button onClick={()=>setZoom(z=>Math.min(2.5,z+0.1))} style={IB()}>+</button>
        <span style={{fontSize:10,fontFamily:"'IBM Plex Mono',monospace",color:"#6B6355",minWidth:30,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
        <button onClick={fitView} style={IB()} title="Fit to screen">⌂</button>
        <button onClick={()=>setZoom(z=>Math.max(0.25,z-0.1))} style={IB()}>−</button>
        <button onClick={()=>setSnapOn(s=>!s)} style={IB({color:snapOn?"#D4860A":"#6B6355",border:`1px solid ${snapOn?"#D4860A":"#2e2b24"}`})} title="Snap to grid">⊞</button>
        <div style={{width:1,height:14,background:"#2e2b24"}} />
        <button onClick={exportSVG} style={IB()}>↓ SVG</button>
        <button onClick={()=>{setShowVers(v=>!v);setShowLayers(false);}} style={IB({color:showVers?"#D4860A":"#b8b0a0"})}>◷</button>
        <button onClick={()=>{setNodes(nodes);setEdges(edges);setLayers(layers);setSaved(true);setTimeout(()=>setSaved(false),2000);}}
          style={{padding:"4px 12px",borderRadius:5,fontSize:10,fontWeight:700,background:saved?"#4A9E6B":"#D4860A",border:"none",color:"#fff",cursor:"pointer",transition:"background 0.3s"}}>
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
                <button key={f} onClick={()=>setCanvasFunc(f)} style={{padding:"2px 7px",borderRadius:4,fontSize:8,fontWeight:700,background:canvasFunc===f?"rgba(212,134,10,0.2)":"transparent",border:`1px solid ${canvasFunc===f?"#D4860A":"#2e2b24"}`,color:canvasFunc===f?"#D4860A":"#6B6355",cursor:"pointer"}}>{f}</button>
              ))}
            </div>
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />

          {/* Function-specific presets */}
          <OMPalSec label={`${canvasFunc} Models`}>
            {funcPresets.length > 0 ? funcPresets.map((p,i)=>(
              <OMPalBtn key={i} onClick={()=>loadPreset(p)}>
                <div style={{fontSize:10,fontWeight:700,color:"#f0ece4"}}>{p.label}</div>
                <div style={{fontSize:8,color:"#6B6355",marginTop:1}}>{p.industry||"General"}</div>
              </OMPalBtn>
            )) : <div style={{fontSize:9,color:"#6B6355",padding:"4px 8px"}}>No presets for {canvasFunc}</div>}
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />

          {/* OM Dictionary button */}
          <OMPalSec label="Dictionary">
            <OMPalBtn onClick={()=>setShowDict(d=>!d)}>
              <span style={{color:"#E8C547",marginRight:6,fontSize:12}}>📖</span>
              <span style={{fontSize:10,fontWeight:700}}>{showDict?"Close":"Browse All Models"}</span>
            </OMPalBtn>
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />

          <OMPalSec label="Start from">
            {Object.entries(OM_ARCHETYPES_2).map(([k,v])=>(
              <OMPalBtn key={k} active={activeArch===k} onClick={()=>loadArch(k)}>
                <div style={{fontSize:11,fontWeight:700}}>{v.label}</div>
                <div style={{fontSize:9,color:"#6B6355",marginTop:1}}>{v.desc}</div>
              </OMPalBtn>
            ))}
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />
          <OMPalSec label="Add Node">
            {(Object.entries(OM_NODE_CFG) as [OMNodeType2,{icon:string;color:string}][]).map(([k,v])=>(
              <OMPalBtn key={k} onClick={()=>addNode(k)}>
                <span style={{color:v.color,marginRight:6,fontSize:13}}>{v.icon}</span>
                <span style={{fontSize:11}}>{k.replace("-"," ")}</span>
              </OMPalBtn>
            ))}
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />
          <OMPalSec label="Layers">
            <OMPalBtn onClick={()=>{setShowLayers(l=>!l);setShowVers(false);}}>
              <span style={{color:"#D4860A",marginRight:6}}>⊟</span>
              <span style={{fontSize:11}}>Edit Layers</span>
            </OMPalBtn>
          </OMPalSec>
          <div style={{height:1,background:"#2e2b24",margin:"2px 0"}} />
          <OMPalSec label="Legend">
            {(Object.entries(OM_EDGE_CFG) as [OMEdgeType2,{label:string;dash:string;color:string}][]).map(([k,v])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <svg width={24} height={8}><line x1={2} y1={4} x2={22} y2={4} stroke={v.color} strokeWidth={1.5} strokeDasharray={v.dash}/></svg>
                <span style={{fontSize:9,color:"#6B6355"}}>{v.label}</span>
              </div>
            ))}
          </OMPalSec>
          {edgeMode&&<div style={{margin:"6px 8px",padding:"7px 9px",borderRadius:5,background:"rgba(212,134,10,0.1)",border:"1px solid rgba(212,134,10,0.3)",fontSize:9,color:"#D4860A"}}>{edgeStart?"Click target":"Click source"}</div>}
        </div>

        {/* OM Dictionary Panel — slides over canvas */}
        {showDict && <div style={{width:320,flexShrink:0,background:"#1a1814",borderRight:"1px solid #2e2b24",display:"flex",flexDirection:"column",overflowY:"auto"}}>
          <div style={{padding:"10px 12px",borderBottom:"1px solid #2e2b24",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:12,fontWeight:800,color:"#E8C547",letterSpacing:"0.03em"}}>📖 OM Dictionary</span>
            <button onClick={()=>setShowDict(false)} style={{background:"none",border:"none",color:"#6B6355",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <div style={{padding:"6px 10px"}}>
            <input value={dictFilter} onChange={e=>setDictFilter(e.target.value)} placeholder="Search models, industries, companies..." style={{width:"100%",background:"#0f0e0c",border:"1px solid #2e2b24",borderRadius:5,padding:"5px 8px",fontSize:10,color:"#f0ece4",outline:"none",fontFamily:"'Outfit',sans-serif",boxSizing:"border-box"}} />
          </div>
          <div style={{padding:"4px 10px",fontSize:9,color:"#6B6355"}}>{filteredDict.length} operating model patterns</div>
          <div style={{flex:1,overflowY:"auto",padding:"0 8px 8px"}}>
            {Object.entries(OM_FUNCTION_PRESETS).map(([func, presets])=>{
              const filtered = dictFilter ? presets.filter(p=>`${p.label} ${p.desc} ${p.industry||""} ${p.company||""} ${func}`.toLowerCase().includes(dictFilter.toLowerCase())) : presets;
              if(filtered.length===0) return null;
              return <div key={func}>
                <div style={{fontSize:9,fontWeight:800,color:"#D4860A",letterSpacing:"0.08em",textTransform:"uppercase",padding:"8px 0 4px",borderBottom:"1px solid #2e2b24",marginBottom:4}}>{func}</div>
                {filtered.map((p,i)=>(
                  <div key={i} onClick={()=>loadPreset(p)} style={{padding:"8px 10px",marginBottom:4,borderRadius:6,background:"#211f1b",border:"1px solid #2e2b24",cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#D4860A";e.currentTarget.style.background="#2a2720";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#2e2b24";e.currentTarget.style.background="#211f1b";}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#f0ece4",marginBottom:2}}>{p.label}</div>
                    <div style={{fontSize:9,color:"#7a7368",lineHeight:1.4,marginBottom:4}}>{p.desc}</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {p.industry && <span style={{fontSize:7,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"rgba(74,130,196,0.15)",color:"#D4860A"}}>{p.industry}</span>}
                      {p.company && <span style={{fontSize:7,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"rgba(212,134,10,0.15)",color:"#D4860A"}}>{p.company}</span>}
                      <span style={{fontSize:7,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"rgba(74,158,107,0.15)",color:"#4A9E6B"}}>{p.nodes.length} nodes · {p.layers.length} layers</span>
                      {(() => { const delta = p.nodes.reduce((s,n)=>(n.targetFte??0)-(n.currentFte??0)+s,0); return delta !== 0 ? <span style={{fontSize:7,fontWeight:700,padding:"1px 5px",borderRadius:3,background:delta<0?"rgba(224,108,117,0.15)":"rgba(74,158,107,0.15)",color:delta<0?"#e06c75":"#4a9e6b"}}>{delta>0?"+":""}{delta} FTE</span> : null; })()}
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

          {!nodes.length&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,pointerEvents:"none"}}><div style={{fontSize:36,opacity:0.12}}>⬡</div><div style={{fontSize:13,color:"#6B6355"}}>Select an archetype or add nodes</div></div>}

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
                  <div style={{fontSize:8,color:"#6B6355",textTransform:"uppercase",fontFamily:"'IBM Plex Mono',monospace"}}>{k}</div>
                  <div style={{fontSize:12,fontWeight:700,color:c,fontFamily:"'IBM Plex Mono',monospace"}}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Layer editor */}
          {showLayers&&(
            <div style={{position:"absolute",top:48,left:170,zIndex:30,background:"#1a1814",border:"1px solid #2e2b24",borderRadius:8,padding:14,width:240,boxShadow:"0 10px 28px rgba(0,0,0,0.45)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:9,fontWeight:800,color:"#D4860A",letterSpacing:"0.1em",textTransform:"uppercase"}}>Edit Layers</span>
                <button onClick={()=>setShowLayers(false)} style={{background:"none",border:"none",color:"#6B6355",cursor:"pointer",fontSize:16}}>×</button>
              </div>
              {layers.map((l,i)=>(
                <div key={l.id} style={{display:"flex",gap:5,marginBottom:5,alignItems:"center"}}>
                  <input value={l.label} onChange={e=>{const u=[...layers];u[i]={...l,label:e.target.value};setLayers(u);}} style={{flex:1,background:"#211f1b",border:"1px solid #2e2b24",borderRadius:4,color:"#f0ece4",padding:"4px 7px",fontSize:10,outline:"none"}} />
                  <button onClick={()=>setLayers(layers.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#e06c75",cursor:"pointer",fontSize:13}}>×</button>
                </div>
              ))}
              <button onClick={()=>{const lastY=layers.length?layers[layers.length-1].y+layers[layers.length-1].height+16:16;setLayers([...layers,{id:omUid(),label:"New Layer",y:lastY,height:90,color:"rgba(255,255,255,0.04)"}]);}}
                style={{width:"100%",marginTop:4,padding:"5px 0",background:"rgba(212,134,10,0.12)",border:"1px solid rgba(212,134,10,0.4)",borderRadius:5,color:"#D4860A",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                + Add Layer
              </button>
            </div>
          )}

          {/* Versions panel */}
          {showVers&&(
            <div style={{position:"absolute",top:0,right:selNode?248:0,width:240,height:"100%",background:"#1a1814",borderLeft:"1px solid #2e2b24",display:"flex",flexDirection:"column",zIndex:24,boxShadow:"-4px 0 16px rgba(0,0,0,0.3)"}}>
              <div style={{padding:"10px 12px",borderBottom:"1px solid #2e2b24",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:9,fontWeight:800,color:"#D4860A",letterSpacing:"0.1em",textTransform:"uppercase"}}>Versions</span>
                <button onClick={()=>setShowVers(false)} style={{background:"none",border:"none",color:"#6B6355",cursor:"pointer",fontSize:17}}>×</button>
              </div>
              <div style={{padding:"9px 10px",borderBottom:"1px solid #2e2b24",background:"#211f1b"}}>
                <input value={vName} onChange={e=>setVName(e.target.value)} placeholder='Snapshot name…' style={{width:"100%",background:"#1a1814",border:"1px solid #2e2b24",borderRadius:4,color:"#f0ece4",padding:"4px 7px",fontSize:10,outline:"none",boxSizing:"border-box",marginBottom:5}} />
                <button onClick={saveVersion} disabled={!vName.trim()} style={{width:"100%",padding:"5px 0",borderRadius:4,background:vName.trim()?"rgba(212,134,10,0.15)":"transparent",border:`1px solid ${vName.trim()?"rgba(212,134,10,0.5)":"#2e2b24"}`,color:vName.trim()?"#D4860A":"#6B6355",fontSize:10,fontWeight:700,cursor:vName.trim()?"pointer":"default",fontFamily:"'Outfit',sans-serif"}}>Save Snapshot</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:8}}>
                {versions.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"#6B6355",fontSize:10}}>No snapshots yet</div>}
                {[...versions].reverse().map(v=>(
                  <div key={v.id} style={{padding:"9px 10px",borderRadius:6,marginBottom:5,background:"#211f1b",border:"1px solid #2e2b24"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#f0ece4",marginBottom:2}}>{v.name}</div>
                    <div style={{fontSize:8,color:"#6B6355",fontFamily:"'IBM Plex Mono',monospace",marginBottom:5}}>{new Date(v.ts).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                    <div style={{display:"flex",gap:3,marginBottom:5}}>
                      {[{k:"N",val:v.nodes.length},{k:"E",val:v.edges.length}].map(({k,val})=><span key={k} style={{padding:"1px 5px",borderRadius:2,background:"#2e2b24",fontSize:8,color:"#6B6355",fontFamily:"'IBM Plex Mono',monospace"}}>{k}:{val}</span>)}
                    </div>
                    <button onClick={()=>{setNodes(v.nodes);setEdges(v.edges);setLayers(v.layers);setShowVers(false);}}
                      style={{width:"100%",padding:"4px 0",borderRadius:4,background:"rgba(212,134,10,0.1)",border:"1px solid rgba(212,134,10,0.4)",color:"#D4860A",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
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
      <div style={{fontSize:7,fontWeight:800,color:"#6B6355",letterSpacing:"0.12em",marginBottom:5,textTransform:"uppercase"}}>{label}</div>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [newObj, setNewObj]          = useState<any>({priority:"high",status:"on-track"});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [newKpi, setNewKpi]          = useState<any>({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]});

  const IS: React.CSSProperties = {background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-primary)",padding:"6px 10px",fontSize:11,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"'Outfit',sans-serif"};
  const FL: React.CSSProperties = {fontSize:9,fontWeight:800,color:"var(--text-muted)",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3};

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
    <div className="text-[12px] text-[var(--text-secondary)] mb-4">Link your operating model design to measurable strategic outcomes — the measurement layer of your OM.</div>
    {/* KPI summary strip */}
    <div className="flex gap-3 mb-4">{[
      {k:"Objectives",v:objectives.length,c:"var(--accent-primary)"},
      {k:"KPIs",v:kpis.length,c:"var(--success)"},
      {k:"On Track",v:kpis.filter(k=>k.status==="on-track").length,c:"#4a9e6b"},
      {k:"At Risk",v:kpis.filter(k=>k.status==="at-risk").length,c:"#f0a500"},
    ].map(s=><div key={s.k} className="flex-1 rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold" style={{color:s.c}}>{s.v}</div><div className="text-[9px] text-[var(--text-muted)] uppercase">{s.k}</div></div>)}</div>
    {objectives.length===0 && kpis.length===0 && <div className="text-center py-6"><button onClick={loadSamples} className="px-4 py-2 rounded-xl text-[11px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">Load Sample KPIs & Objectives</button></div>}
    {/* Sub-tabs */}
    <div className="flex gap-1 mb-4">{(["objectives","kpis","traceability"] as const).map(t=><button key={t} onClick={()=>setSubTab(t)} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold" style={{background:subTab===t?"rgba(74,158,107,0.15)":"var(--surface-2)",color:subTab===t?"#4a9e6b":"var(--text-muted)"}}>{t==="objectives"?`Objectives (${objectives.length})`:t==="kpis"?`KPIs (${kpis.length})`:"Traceability"}</button>)}</div>
    {subTab==="objectives" && <div>
      <div className="flex justify-end mb-2"><button onClick={()=>setAddingObj(a=>!a)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add Objective</button></div>
      {addingObj && <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--surface-2)] mb-3 border border-[var(--border)]">
        <div><div style={FL}>Name *</div><input value={newObj.name??""} onChange={e=>setNewObj((s:Record<string,unknown>)=>({...s,name:e.target.value}))} style={IS} /></div>
        <div><div style={FL}>Owner</div><input value={newObj.owner??""} onChange={e=>setNewObj((s:Record<string,unknown>)=>({...s,owner:e.target.value}))} style={IS} /></div>
        <div className="col-span-2"><div style={FL}>Description</div><input value={newObj.description??""} onChange={e=>setNewObj((s:Record<string,unknown>)=>({...s,description:e.target.value}))} style={IS} /></div>
        <div className="col-span-2 flex gap-2"><button onClick={addObj} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save</button><button onClick={()=>setAddingObj(false)} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)] cursor-pointer border border-[var(--border)]">Cancel</button></div>
      </div>}
      {objectives.map(o=>{const objKpis=kpis.filter(k=>k.objectiveId===o.id);return <div key={o.id} className="p-3 rounded-xl mb-2 bg-[var(--surface-2)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[o.status]}`}}>
        <div className="flex items-center justify-between"><div className="text-[12px] font-bold text-[var(--text-primary)]">{o.name}</div><div className="flex items-center gap-2"><span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{background:`${KPI_STATUS_COLOR[o.status]}18`,color:KPI_STATUS_COLOR[o.status]}}>{o.status.replace("-"," ")}</span><button onClick={()=>setObjectives(p=>p.filter(x=>x.id!==o.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[10px] cursor-pointer">✕</button></div></div>
        <div className="text-[10px] text-[var(--text-muted)] mt-1">{o.description}</div>
        <div className="text-[9px] text-[var(--text-muted)] mt-1">{objKpis.length} KPI{objKpis.length!==1?"s":""} linked · {o.owner && `Owner: ${o.owner}`}</div>
      </div>;})}
    </div>}
    {subTab==="kpis" && <div>
      <div className="flex justify-end mb-2"><button onClick={()=>setAddingKpi(a=>!a)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add KPI</button></div>
      {addingKpi && objectives.length>0 && <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--surface-2)] mb-3 border border-[var(--border)]">
        <div><div style={FL}>KPI Name *</div><input value={newKpi.name??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,name:e.target.value}))} style={IS} /></div>
        <div><div style={FL}>Objective *</div><select value={newKpi.objectiveId??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,objectiveId:e.target.value}))} style={IS}><option value="">Select...</option>{objectives.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
        <div><div style={FL}>Category</div><select value={newKpi.category} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,category:e.target.value}))} style={IS}>{KPI_CAT_LIST.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div><div style={FL}>Unit</div><input value={newKpi.unit??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,unit:e.target.value}))} style={IS} placeholder="%, days, $..." /></div>
        <div><div style={FL}>Current</div><input value={newKpi.currentValue??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,currentValue:e.target.value}))} style={IS} type="number" /></div>
        <div><div style={FL}>Target</div><input value={newKpi.targetValue??""} onChange={e=>setNewKpi((s:Record<string,unknown>)=>({...s,targetValue:e.target.value}))} style={IS} type="number" /></div>
        <div className="col-span-2 flex gap-2"><button onClick={addKpi} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save KPI</button><button onClick={()=>setAddingKpi(false)} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)] cursor-pointer border border-[var(--border)]">Cancel</button></div>
      </div>}
      {kpis.map(k=>{const pct=progress(k);return <div key={k.id} className="p-3 rounded-xl mb-2 bg-[var(--surface-2)] border border-[var(--border)]" style={{borderLeft:`3px solid ${KPI_STATUS_COLOR[k.status]}`}}>
        <div className="flex items-center justify-between"><div className="text-[12px] font-bold text-[var(--text-primary)]">{k.name}</div><div className="flex items-center gap-2"><Badge color={k.status==="on-track"?"green":k.status==="at-risk"?"amber":"red"}>{k.status.replace("-"," ")}</Badge><button onClick={()=>setKpis(p=>p.filter(x=>x.id!==k.id))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[10px] cursor-pointer">✕</button></div></div>
        <div className="flex items-center gap-3 mt-2"><div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:KPI_STATUS_COLOR[k.status]}} /></div><span className="text-[10px] font-bold" style={{color:KPI_STATUS_COLOR[k.status]}}>{pct}%</span></div>
        <div className="flex gap-4 mt-1 text-[9px] text-[var(--text-muted)]"><span>Baseline: {k.baselineValue}{k.unit}</span><span>Current: {k.currentValue}{k.unit}</span><span>Target: {k.targetValue}{k.unit}</span><span>{k.category}</span></div>
      </div>;})}
    </div>}
    {subTab==="traceability" && <div>
      <div className="text-[11px] text-[var(--text-secondary)] mb-3">How objectives, KPIs, and operating model components connect.</div>
      {objectives.map(o=>{const objKpis=kpis.filter(k=>k.objectiveId===o.id);return <div key={o.id} className="mb-4">
        <div className="text-[12px] font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:KPI_STATUS_COLOR[o.status]}} />{o.name}</div>
        {objKpis.length===0?<div className="text-[10px] text-[var(--text-muted)] ml-4">No KPIs linked</div>:
        <div className="ml-4 space-y-1">{objKpis.map(k=><div key={k.id} className="flex items-center gap-2 text-[10px]"><span className="text-[var(--text-muted)]">↳</span><span className="font-semibold text-[var(--text-primary)]">{k.name}</span><span className="text-[var(--text-muted)]">{k.currentValue}{k.unit} → {k.targetValue}{k.unit}</span><span className="font-bold" style={{color:KPI_STATUS_COLOR[k.status]}}>{progress(k)}%</span></div>)}</div>}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvasNodes: any[];
  onBack: ()=>void;
}) {
  const [objectives, setObjectives] = usePersisted<OMObjective2[]>(`${projectId}_objectives`, []);
  const [kpis, setKpis]             = usePersisted<OMKpi2[]>(`${projectId}_kpis`, []);
  const [tab, setTab]               = useState<"objectives"|"kpis"|"traceability"|"coverage">("objectives");
  const [addingObj,  setAddingObj]  = useState(false);
  const [addingKpi,  setAddingKpi]  = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [newObj, setNewObj]         = useState<any>({priority:"high",status:"on-track"});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [newKpi, setNewKpi]         = useState<any>({direction:"increase",status:"on-track",category:"People & Talent",linkedNodeIds:[]});

  const IS: React.CSSProperties = {background:"#1a1814",border:"1px solid #2e2b24",borderRadius:5,color:"#f0ece4",padding:"5px 8px",fontSize:11,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"'Outfit',sans-serif"};
  const FL: React.CSSProperties = {fontSize:9,fontWeight:800,color:"#7a7368",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3};

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
        <button onClick={onBack} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex items-center gap-1">← Back</button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A9E6B] to-[#2d6e4e] flex items-center justify-center text-xl">◎</div>
        <div><h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">KPI & Strategic Alignment</h1><p className="text-[13px] text-[var(--text-secondary)]">Link your operating model design to measurable strategic outcomes</p></div>
        <div className="flex-1" />
        {objectives.length===0&&<button onClick={loadSamples} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5 transition-all">Load sample data</button>}
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
              <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{k}</div>
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
            <button onClick={()=>setAddingObj(a=>!a)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add Objective</button>
          </div>
          {addingObj&&(
            <div className="p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--accent-primary)]/30 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2"><div style={FL}>Name *</div><input value={newObj.name??""} onChange={e=>setNewObj((s:any)=>({...s,name:e.target.value}))} style={IS} /></div>
                <div className="col-span-2"><div style={FL}>Description</div><textarea value={newObj.description??""} onChange={e=>setNewObj((s:any)=>({...s,description:e.target.value}))} rows={2} style={{...IS,resize:"vertical"}} /></div>
                <div><div style={FL}>Priority</div><select value={newObj.priority} onChange={e=>setNewObj((s:any)=>({...s,priority:e.target.value}))} style={IS}>{["critical","high","medium","low"].map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                <div><div style={FL}>Owner</div><input value={newObj.owner??""} onChange={e=>setNewObj((s:any)=>({...s,owner:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Target Date</div><input value={newObj.targetDate??""} onChange={e=>setNewObj((s:any)=>({...s,targetDate:e.target.value}))} placeholder="Q4 2026" style={IS} /></div>
                <div><div style={FL}>Status</div><select value={newObj.status} onChange={e=>setNewObj((s:any)=>({...s,status:e.target.value}))} style={IS}>{["on-track","at-risk","off-track","achieved"].map(s=><option key={s} value={s}>{s.replace("-"," ")}</option>)}</select></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addObj} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save</button>
                <button onClick={()=>setAddingObj(false)} className="px-4 py-1.5 rounded-lg text-[11px] text-[var(--text-muted)] border border-[var(--border)] cursor-pointer bg-transparent">Cancel</button>
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
                      <span className="text-[13px] font-bold text-[var(--text-primary)]">{o.name}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{background:`${KPI_STATUS_COLOR[o.status]}18`,color:KPI_STATUS_COLOR[o.status]}}>{o.status.replace("-"," ")}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] capitalize">{o.priority}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mb-2">{o.description}</div>
                    <div className="flex gap-4 text-[10px] text-[var(--text-muted)]">
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
            <button onClick={()=>setAddingKpi(a=>!a)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">+ Add KPI</button>
          </div>
          {addingKpi&&(
            <div className="p-4 bg-[var(--surface-1)] rounded-xl border border-[var(--accent-primary)]/30 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><div style={FL}>KPI Name *</div><input value={newKpi.name??""} onChange={e=>setNewKpi((s:any)=>({...s,name:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Objective *</div><select value={newKpi.objectiveId??""} onChange={e=>setNewKpi((s:any)=>({...s,objectiveId:e.target.value}))} style={IS}><option value="">Select…</option>{objectives.map(o=><option key={o.id} value={o.id}>{o.name.slice(0,32)}</option>)}</select></div>
                <div><div style={FL}>Category</div><select value={newKpi.category} onChange={e=>setNewKpi((s:any)=>({...s,category:e.target.value}))} style={IS}>{KPI_CAT_LIST.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><div style={FL}>Unit</div><input value={newKpi.unit??""} onChange={e=>setNewKpi((s:any)=>({...s,unit:e.target.value}))} placeholder="%, days, $M, FTE…" style={IS} /></div>
                <div><div style={FL}>Baseline</div><input type="number" value={newKpi.baselineValue??""} onChange={e=>setNewKpi((s:any)=>({...s,baselineValue:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Current</div><input type="number" value={newKpi.currentValue??""} onChange={e=>setNewKpi((s:any)=>({...s,currentValue:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Target</div><input type="number" value={newKpi.targetValue??""} onChange={e=>setNewKpi((s:any)=>({...s,targetValue:e.target.value}))} style={IS} /></div>
                <div><div style={FL}>Direction</div><select value={newKpi.direction} onChange={e=>setNewKpi((s:any)=>({...s,direction:e.target.value}))} style={IS}><option value="increase">Increase</option><option value="decrease">Decrease</option><option value="maintain">Maintain</option></select></div>
                <div><div style={FL}>Timeframe</div><input value={newKpi.timeframe??""} onChange={e=>setNewKpi((s:any)=>({...s,timeframe:e.target.value}))} placeholder="12 months" style={IS} /></div>
                <div><div style={FL}>Status</div><select value={newKpi.status} onChange={e=>setNewKpi((s:any)=>({...s,status:e.target.value}))} style={IS}>{["on-track","at-risk","off-track","achieved"].map(s=><option key={s} value={s}>{s.replace("-"," ")}</option>)}</select></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addKpi} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--accent-primary)] text-white cursor-pointer border-none">Save KPI</button>
                <button onClick={()=>setAddingKpi(false)} className="px-4 py-1.5 rounded-lg text-[11px] text-[var(--text-muted)] border border-[var(--border)] cursor-pointer bg-transparent">Cancel</button>
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
                      <span className="text-[12px] font-bold text-[var(--text-primary)]">{k.name}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{background:`${KPI_STATUS_COLOR[k.status]}18`,color:KPI_STATUS_COLOR[k.status]}}>{k.status.replace("-"," ")}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">{k.category}</span>
                      {k.linkedNodeIds.length>0&&<span className="text-[9px] text-[var(--success)]">⬡ {k.linkedNodeIds.length} node{k.linkedNodeIds.length!==1?"s":""}</span>}
                    </div>
                    {obj&&<div className="text-[9px] text-[var(--text-muted)] mb-2">→ {obj.name}</div>}
                    <div className="flex gap-4 text-[10px] mb-2">
                      <span className="text-[var(--text-muted)]">Base: <strong className="text-[var(--text-primary)]">{k.baselineValue}{k.unit}</strong></span>
                      <span className="text-[var(--text-muted)]">Now: <strong style={{color:KPI_STATUS_COLOR[k.status]}}>{k.currentValue}{k.unit}</strong></span>
                      <span className="text-[var(--text-muted)]">Target: <strong className="text-[var(--accent-primary)]">{k.targetValue}{k.unit}</strong></span>
                      <span className="text-[var(--text-muted)]">{k.timeframe}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,background:KPI_STATUS_COLOR[k.status],transition:"width 0.4s"}} /></div>
                    <div className="text-[9px] text-[var(--text-muted)] mt-1">{pct}% to target</div>
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
            <div className="text-center py-12 text-[var(--text-muted)] text-[12px]">Add objectives and KPIs first.</div>
          ):(
            <>
              <div className="text-[11px] text-[var(--text-secondary)] mb-3">Click a cell to link a KPI to an objective. Click canvas node buttons to assign accountability.</div>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[var(--surface-1)]">
                      <th className="px-3 py-2.5 text-left font-bold text-[9px] text-[var(--accent-primary)] uppercase tracking-widest border border-[var(--border)] min-w-[200px]">KPI</th>
                      {objectives.map(o=>(
                        <th key={o.id} className="px-2 py-1 text-center text-[9px] font-bold border border-[var(--border)] min-w-[80px]" style={{color:KPI_STATUS_COLOR[o.status]}}>
                          <div style={{writingMode:"vertical-rl",transform:"rotate(180deg)",maxHeight:80,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{o.name}</div>
                        </th>
                      ))}
                      <th className="px-2 py-1 text-center text-[9px] text-[var(--text-muted)] border border-[var(--border)] min-w-[100px]">OM Nodes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.map((k,ri)=>{
                      const obj=objectives.find(o=>o.id===k.objectiveId);
                      return (
                        <tr key={k.id} className={ri%2===0?"bg-[var(--bg)]":"bg-[var(--surface-1)]"}>
                          <td className="px-3 py-2 border border-[var(--border)]">
                            <div className="font-semibold text-[var(--text-primary)]">{k.name}</div>
                            <div className="text-[9px] text-[var(--text-muted)]">{k.currentValue}{k.unit} → {k.targetValue}{k.unit}</div>
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
                              {canvasNodes.slice(0,5).map((n:any)=>{
                                const linked=k.linkedNodeIds.includes(n.id);
                                return (
                                  <button key={n.id} onClick={()=>toggleKpiNode(k.id,n.id)}
                                    className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer font-semibold transition-all"
                                    style={{background:linked?`${n.color||"#D4860A"}20`:"transparent",border:`1px solid ${linked?n.color||"#D4860A":"#2e2b24"}`,color:linked?n.color||"#D4860A":"#6B6355"}}>
                                    {(n.label||"").slice(0,7)}
                                  </button>
                                );
                              })}
                              {canvasNodes.length>5&&<span className="text-[8px] text-[var(--text-muted)] self-center">+{canvasNodes.length-5}</span>}
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
              <div className="text-[11px] font-bold mb-2" style={{color:"#f0a500"}}>⚠ {orphanKpis.length} KPI{orphanKpis.length!==1?"s":""} not linked to any org node</div>
              {orphanKpis.map(k=><div key={k.id} className="text-[10px] text-[var(--text-muted)] mb-1">· {k.name}</div>)}
            </div>
          )}
          {canvasNodes.length===0?(
            <div className="text-center py-12 text-[var(--text-muted)] text-[12px]"><div className="text-2xl mb-2 opacity-30">⬡</div>No canvas nodes — open OM Design Canvas first and create your operating model.</div>
          ):(
            <div className="grid grid-cols-3 gap-4">
              {canvasNodes.map((n:any)=>{
                const linkedKpis=kpis.filter(k=>k.linkedNodeIds.includes(n.id));
                const atRisk=linkedKpis.filter(k=>k.status==="at-risk"||k.status==="off-track").length;
                const hasAny=linkedKpis.length>0;
                const nodeColor=n.color||"#D4860A";
                return (
                  <div key={n.id} className="p-3 rounded-xl border transition-all" style={{background:"var(--surface-1)",borderColor:hasAny?`${nodeColor}40`:"var(--border)",borderLeft:`3px solid ${hasAny?nodeColor:"var(--border)"}`}}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:nodeColor}} />
                      <span className="text-[11px] font-bold text-[var(--text-primary)] truncate flex-1">{n.label||n.type}</span>
                      {!hasAny&&<span className="text-[8px] text-[var(--text-muted)]">—</span>}
                    </div>
                    {linkedKpis.length===0&&<div className="text-[9px] text-[var(--text-muted)] italic">No KPIs assigned</div>}
                    {linkedKpis.map(k=>(
                      <div key={k.id} className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:KPI_STATUS_COLOR[k.status]}} />
                        <span className="text-[10px] text-[var(--text-secondary)] flex-1 truncate">{k.name}</span>
                        <span className="text-[9px] font-semibold shrink-0" style={{color:KPI_STATUS_COLOR[k.status],fontFamily:"'IBM Plex Mono',monospace"}}>{k.currentValue}{k.unit}</span>
                      </div>
                    ))}
                    {atRisk>0&&<div className="text-[9px] mt-1" style={{color:"#f0a500"}}>⚠ {atRisk} at risk</div>}
                  </div>
                );
              })}
            </div>
          )}
          {kpis.length>0&&canvasNodes.length>0&&(
            <div className="mt-6 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
              <div className="text-[11px] font-bold text-[var(--text-primary)] mb-3">Design Health: KPI Coverage</div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--success)] transition-all" style={{width:`${Math.round(kpis.filter(k=>k.linkedNodeIds.length>0).length/kpis.length*100)}%`}} />
                </div>
                <span className="text-[12px] font-extrabold text-[var(--success)]">{Math.round(kpis.filter(k=>k.linkedNodeIds.length>0).length/kpis.length*100)}%</span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">{kpis.filter(k=>k.linkedNodeIds.length>0).length} of {kpis.length} KPIs assigned to org nodes — {orphanKpis.length>0?`${orphanKpis.length} orphaned (design gap)`:"all covered ✓"}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
