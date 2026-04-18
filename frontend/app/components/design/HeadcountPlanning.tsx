"use client";
import React, { useState, useEffect } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import {
  KpiCard, Card, InsightPanel, DataTable, PageHeader, LoadingBar,
  ModuleExportButton, usePersisted, fmtNum,
} from "../shared";
import { TrendingUp } from "@/lib/icons";
import { EmptyState, FlowNav } from "@/app/ui";

export function HeadcountPlanning({ model, f, onBack, onNavigate, jobStates, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; jobStates?: Record<string, import("./shared").JobDesignState>; viewCtx?: import("./shared").ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  // Read BBBA overrides from localStorage to inform headcount
  const bbbaOverrides = usePersisted<Record<string, string>>(`${model}_bbba_overrides`, {})[0];
  useEffect(() => { if (!model) return; setLoading(true); api.getHeadcountPlan(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl, bbbaOverrides]);

  const wf = (data?.waterfall || {}) as Record<string, unknown>;
  const depts = (data?.departments || []) as { department: string; current_fte: number; eliminated: number; redeployed: number; new_hires: number; future_fte: number; pct_change: number }[];
  const timeline = (data?.timeline || {}) as Record<string, string>;

  return <div>
    <PageHeader icon={<TrendingUp />} title="Headcount Planning" subtitle="Current to future workforce evolution" onBack={onBack} moduleId="headcount" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="headcount" label="Headcount Plan" /></div>}
    {loading && <LoadingBar />}
    {!loading && Number(wf.starting_headcount || 0) === 0 && <EmptyState icon={<TrendingUp />} headline="Headcount plan not yet generated" explanation="This module composes Work Design Lab task decomposition and Org Design Studio scenarios into an 18-month workforce transition plan. Run Work Design Lab on your top 20 roles to unlock." primaryAction={{ label: "Go to Work Design Lab", onClick: () => onNavigate?.("design") }} secondaryAction={{ label: "Load demo dataset", onClick: () => {} }} />}
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
    ]} icon={<TrendingUp />} />

    <FlowNav previous={{ id: "bbba", label: "Talent Strategy" }} next={{ id: "quickwins", label: "Quick Win Identifier" }} onNavigate={onNavigate || onBack} />
  </div>;
}
