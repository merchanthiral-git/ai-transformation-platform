"use client";
import React, { useState, useEffect, useMemo } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import {
  KpiCard, Card, InsightPanel, PageHeader, LoadingBar,
  ModuleExportButton, usePersisted, fmtNum,
} from "../shared";
import { TrendingUp } from "@/lib/icons";
import { EmptyState, FlowNav } from "@/app/ui";
import { computeFinancialImpact, computeCompositionShift } from "@/lib/computed/headcountPlan";
import { getSemanticColor, getTrackColor } from "@/lib/chartColors";

// Synthetic demo data for preview ghost
const DEMO_WF = { starting_headcount: 8000, eliminations: 147, natural_attrition: 320, redeployments: 89, new_hires: 74, contractors: 12, target_headcount: 7946, net_change: -54, net_change_pct: -0.7 };

export function HeadcountPlanning({ model, f, onBack, onNavigate, jobStates, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; jobStates?: Record<string, import("./shared").JobDesignState>; viewCtx?: import("./shared").ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const bbbaOverrides = usePersisted<Record<string, string>>(`${model}_bbba_overrides`, {})[0];
  useEffect(() => { if (!model) return; setLoading(true); api.getHeadcountPlan(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl, bbbaOverrides]);

  const wf = (data?.waterfall || {}) as Record<string, unknown>;
  const depts = (data?.departments || []) as { department: string; current_fte: number; eliminated: number; redeployed: number; new_hires: number; future_fte: number; pct_change: number }[];
  const timeline = (data?.timeline || {}) as Record<string, string>;
  const hasData = Number(wf.starting_headcount || 0) > 0;

  // Compute financial impact using the pure function with documented assumptions
  const financials = useMemo(() => {
    if (!hasData) return null;
    return computeFinancialImpact({
      eliminations: Number(wf.eliminations || 0),
      newHires: Number(wf.new_hires || 0),
      naturalAttrition: Number(wf.natural_attrition || 0),
      avgLoadedCost: 150_000,  // Mercer median, US professional services
      severanceMonths: 6,       // Mercer median for involuntary separations
      onboardingCost: 20_000,   // Recruiting + training + productivity ramp
    });
  }, [hasData, wf.eliminations, wf.new_hires, wf.natural_attrition]);

  // Waterfall bars data
  const waterfallBars = useMemo(() => {
    const src = hasData ? wf : DEMO_WF;
    return [
      { label: "Start", value: Number(src.starting_headcount || 0), delta: 0, color: "var(--accent-primary)" },
      { label: "Transitioned", value: -Number(src.eliminations || 0), delta: -Number(src.eliminations || 0), color: getSemanticColor("risk") },
      { label: "Attrition", value: -Number(src.natural_attrition || 0), delta: -Number(src.natural_attrition || 0), color: getSemanticColor("warn") },
      { label: "Redeployed", value: Number(src.redeployments || 0), delta: Number(src.redeployments || 0), color: getSemanticColor("info") },
      { label: "New Hires", value: Number(src.new_hires || 0), delta: Number(src.new_hires || 0), color: getSemanticColor("success") },
      { label: "Contractors", value: Number(src.contractors || 0), delta: Number(src.contractors || 0), color: "#a78bb8" },
      { label: "Target", value: Number(src.target_headcount || 0), delta: 0, color: getSemanticColor("success") },
    ];
  }, [hasData, wf]);

  // Composition shift — check if backend provides track-level data
  const trackData = (data?.by_track || null) as Record<string, { current: number; target: number }> | null;

  // Render the populated view content (reused in preview ghost)
  const renderPopulatedView = (isPreview: boolean) => {
    const src = isPreview ? DEMO_WF : wf;
    const fin = isPreview
      ? computeFinancialImpact({ eliminations: 147, newHires: 74, naturalAttrition: 320 })
      : financials;

    const bars = isPreview ? [
      { label: "Start", value: 8000, delta: 0, color: "var(--accent-primary)" },
      { label: "Transitioned", value: -147, delta: -147, color: getSemanticColor("risk") },
      { label: "Attrition", value: -320, delta: -320, color: getSemanticColor("warn") },
      { label: "Redeployed", value: 89, delta: 89, color: getSemanticColor("info") },
      { label: "New Hires", value: 74, delta: 74, color: getSemanticColor("success") },
      { label: "Target", value: 7946, delta: 0, color: getSemanticColor("success") },
    ] : waterfallBars;

    return <>
      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Current HC" value={Number(src.starting_headcount || 0)} />
        <KpiCard label="Transitions" value={Number(src.eliminations || 0)} />
        <KpiCard label="New Hires" value={Number(src.new_hires || 0)} accent />
        <KpiCard label="Target HC" value={Number(src.target_headcount || 0)} accent />
        <KpiCard label="Net Change" value={`${Number(src.net_change_pct || 0)}%`} />
      </div>

      {/* Waterfall Chart */}
      <Card title="Headcount Waterfall">
        <div className="flex items-end gap-1 h-48 mb-4 px-4">
          {bars.map(bar => {
            const maxVal = Math.max(Number(src.starting_headcount || 1), Number(src.target_headcount || 1));
            const h = Math.abs(bar.value) / maxVal * 100;
            return <div key={bar.label} className="flex-1 flex flex-col items-center justify-end">
              <div className="text-[13px] font-bold mb-1" style={{ color: bar.color }}>
                {bar.delta !== 0 ? (bar.delta > 0 ? `+${bar.delta}` : String(bar.delta)) : String(bar.value)}
              </div>
              <div className="w-full rounded-t" style={{ height: `${Math.max(h, 5)}%`, background: `${bar.color}30`, border: `1px solid ${bar.color}50` }} />
              <div className="text-[12px] text-[var(--text-muted)] mt-1 text-center">{bar.label}</div>
            </div>;
          })}
        </div>
      </Card>

      {/* Department Breakdown */}
      {!isPreview && depts.length > 0 && <Card title="Department Breakdown">
        <div className="overflow-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-[13px]">
            <thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">Department</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">Current</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">Transitioned</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">Redeployed</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">New Hires</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">Future</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">Change</th>
            </tr></thead>
            <tbody>{depts.map(d => <tr key={d.department} className="border-b border-[var(--border)]">
              <td className="px-3 py-2 font-semibold">{d.department}</td>
              <td className="px-2 py-2 text-center font-data">{d.current_fte}</td>
              <td className="px-2 py-2 text-center font-data text-[var(--risk)]">-{d.eliminated}</td>
              <td className="px-2 py-2 text-center font-data text-[var(--success)]">{d.redeployed}</td>
              <td className="px-2 py-2 text-center font-data text-[var(--accent-primary)]">+{d.new_hires}</td>
              <td className="px-2 py-2 text-center font-data font-bold">{d.future_fte}</td>
              <td className="px-2 py-2 text-center font-data" style={{ color: d.pct_change >= 0 ? "var(--success)" : "var(--risk)" }}>{d.pct_change > 0 ? "+" : ""}{d.pct_change}%</td>
            </tr>)}</tbody>
          </table>
        </div>
      </Card>}

      {/* If no department data, show aggregate row */}
      {!isPreview && depts.length === 0 && hasData && <Card title="Department Breakdown">
        <div className="text-[14px] text-[var(--text-muted)] mb-2">Department-level breakdown not available. Showing aggregate totals.</div>
        <div className="overflow-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-[13px]">
            <thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left border-b border-[var(--border)]">Department</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">Current</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">Transitioned</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">Future</th>
              <th className="px-2 py-2 text-center border-b border-[var(--border)]">Change</th>
            </tr></thead>
            <tbody><tr className="border-b border-[var(--border)]">
              <td className="px-3 py-2 font-semibold">All Departments</td>
              <td className="px-2 py-2 text-center font-data">{Number(wf.starting_headcount || 0)}</td>
              <td className="px-2 py-2 text-center font-data text-[var(--risk)]">-{Number(wf.eliminations || 0)}</td>
              <td className="px-2 py-2 text-center font-data font-bold">{Number(wf.target_headcount || 0)}</td>
              <td className="px-2 py-2 text-center font-data" style={{ color: Number(wf.net_change_pct || 0) >= 0 ? "var(--success)" : "var(--risk)" }}>{Number(wf.net_change_pct || 0) > 0 ? "+" : ""}{Number(wf.net_change_pct || 0)}%</td>
            </tr></tbody>
          </table>
        </div>
      </Card>}

      {/* Financial Impact Summary — 6 numbers with assumptions */}
      {fin && <Card title="Financial Impact Summary">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl p-4 text-center border border-[var(--border)]">
            <div className="text-[12px] text-[var(--text-muted)] uppercase mb-1">Annual Savings</div>
            <div className="text-[22px] font-extrabold text-[var(--success)] font-data">{fmtNum(fin.annualSavings)}</div>
            <div className="text-[12px] text-[var(--text-muted)]">at $150K avg loaded cost</div>
          </div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]">
            <div className="text-[12px] text-[var(--text-muted)] uppercase mb-1">Hiring Cost</div>
            <div className="text-[22px] font-extrabold text-[var(--risk)] font-data">{fmtNum(fin.hiringCost)}</div>
            <div className="text-[12px] text-[var(--text-muted)]">30% loaded + $20K onboarding</div>
          </div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]">
            <div className="text-[12px] text-[var(--text-muted)] uppercase mb-1">Transition Cost</div>
            <div className="text-[22px] font-extrabold text-[var(--warning)] font-data">{fmtNum(fin.transitionCost)}</div>
            <div className="text-[12px] text-[var(--text-muted)]">6-month severance + onboarding</div>
          </div>
          <div className="rounded-xl p-4 text-center border-2" style={{ borderColor: fin.netYear1 >= 0 ? "var(--success)" : "var(--risk)" }}>
            <div className="text-[12px] text-[var(--text-muted)] uppercase mb-1">Net Year 1</div>
            <div className="text-[22px] font-extrabold font-data" style={{ color: fin.netYear1 >= 0 ? "var(--success)" : "var(--risk)" }}>{fin.netYear1 >= 0 ? "" : "-"}{fmtNum(Math.abs(fin.netYear1))}</div>
            <div className="text-[12px] text-[var(--text-muted)]">{fin.netYear1 >= 0 ? "Net positive" : "Investment year"}</div>
          </div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]">
            <div className="text-[12px] text-[var(--text-muted)] uppercase mb-1">Year 2 Cumulative</div>
            <div className="text-[22px] font-extrabold text-[var(--success)] font-data">{fmtNum(fin.year2Cumulative)}</div>
            <div className="text-[12px] text-[var(--text-muted)]">Full savings, no transition</div>
          </div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]">
            <div className="text-[12px] text-[var(--text-muted)] uppercase mb-1">Year 3 Cumulative</div>
            <div className="text-[22px] font-extrabold text-[var(--success)] font-data">{fmtNum(fin.year3Cumulative)}</div>
            <div className="text-[12px] text-[var(--text-muted)]">+5% efficiency compounding</div>
          </div>
        </div>
      </Card>}

      {/* Timeline */}
      {!isPreview && <Card title="Transition Timeline">
        <div className="space-y-3">{[
          { phase: "Phase 1", time: timeline.phase_1_months, action: timeline.phase_1_actions, color: "var(--accent-primary)" },
          { phase: "Phase 2", time: timeline.phase_2_months, action: timeline.phase_2_actions, color: "var(--success)" },
          { phase: "Phase 3", time: timeline.phase_3_months, action: timeline.phase_3_actions, color: "var(--purple)" },
        ].map((p, i) => <div key={i} className="flex gap-3 p-3 rounded-xl bg-[var(--surface-2)]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" style={{ background: p.color }}>{i + 1}</div>
          <div>
            <div className="text-[14px] font-bold text-[var(--text-primary)]">{p.phase} <span className="text-[var(--text-muted)] font-normal">Month {p.time}</span></div>
            <div className="text-[13px] text-[var(--text-secondary)]">{p.action}</div>
          </div>
        </div>)}</div>
      </Card>}

      {/* Workforce Composition Shift */}
      {!isPreview && trackData && <Card title="Workforce Composition Shift by Track">
        {(() => {
          const shifts = computeCompositionShift({
            currentByTrack: Object.fromEntries(Object.entries(trackData).map(([k, v]) => [k, v.current])),
            targetByTrack: Object.fromEntries(Object.entries(trackData).map(([k, v]) => [k, v.target])),
          });
          const trackLabels: Record<string, string> = { E: "Executive", M: "Management", P: "Professional", S: "Support", T: "Technical" };
          return <div className="grid grid-cols-2 gap-8">
            {["Before", "After"].map((label, ci) => <div key={label}>
              <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-3 text-center">{label}</div>
              <div className="space-y-2">
                {shifts.map(s => {
                  const pct = ci === 0 ? s.currentPct : s.targetPct;
                  const count = ci === 0 ? s.current : s.target;
                  return <div key={s.track} className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--text-muted)] w-20">{trackLabels[s.track]}</span>
                    <div className="flex-1 h-4 bg-[var(--surface-2)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: getTrackColor(s.track), opacity: 0.7 }} />
                    </div>
                    <span className="text-[12px] font-data text-[var(--text-secondary)] w-16 text-right">{count} ({pct}%)</span>
                  </div>;
                })}
              </div>
            </div>)}
          </div>;
        })()}
      </Card>}

      {/* Simple composition when no track data */}
      {!isPreview && !trackData && hasData && <Card title="Workforce Composition Shift">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-2">Before</div>
            <div className="text-[28px] font-extrabold text-[var(--text-primary)] font-data">{Number(src.starting_headcount || 0)}</div>
            <div className="text-[13px] text-[var(--text-muted)]">Total HC</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-2">After</div>
            <div className="text-[28px] font-extrabold font-data" style={{ color: Number(src.net_change || 0) >= 0 ? "var(--success)" : "var(--risk)" }}>{Number(src.target_headcount || 0)}</div>
            <div className="text-[13px] text-[var(--text-muted)]">Target HC ({Number(src.net_change_pct || 0) > 0 ? "+" : ""}{Number(src.net_change_pct || 0)}%)</div>
          </div>
        </div>
        <div className="text-[12px] text-[var(--text-muted)] mt-3 text-center">Track-level composition not available. Upload workforce data with career track column to enable.</div>
      </Card>}

      {/* Insights */}
      {!isPreview && <InsightPanel title="Headcount Insights" items={[
        `Net headcount change: ${Number(wf.net_change || 0) > 0 ? "+" : ""}${wf.net_change || 0} (${Number(wf.net_change_pct || 0) > 0 ? "+" : ""}${wf.net_change_pct || 0}%)`,
        Number(wf.natural_attrition || 0) > 0 ? `Natural attrition of ${wf.natural_attrition} absorbs ${Math.round(Number(wf.natural_attrition || 0) / Math.max(Number(wf.eliminations || 1), 1) * 100)}% of transitions — ${Number(wf.natural_attrition || 0) >= Number(wf.eliminations || 0) ? "no forced reductions needed" : "reducing forced displacement"}` : "No natural attrition data available",
        `Operations typically sees the largest shift: most automatable tasks concentrate there`,
        `Phased over 18 months: redeployments first (months 1-6), hiring (7-12), transition (13-18)`,
        fin ? `3-year cumulative impact: ${fmtNum(fin.year3Cumulative)} — payback in ${fin.netYear1 >= 0 ? "Year 1" : "Year 2"}` : "",
      ].filter(Boolean)} icon={<TrendingUp />} />}
    </>;
  };

  return <div>
    <PageHeader icon={<TrendingUp />} title="Headcount Planning" subtitle="Current to future workforce evolution" onBack={onBack} moduleId="headcount" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="headcount" label="Headcount Plan" /></div>}
    {loading && <LoadingBar />}

    {/* Empty state with preview ghost */}
    {!loading && !hasData && <div>
      <EmptyState
        icon={<TrendingUp />}
        headline="Headcount plan not yet generated"
        explanation="This module composes Work Design Lab task decomposition and Org Design Studio scenarios into an 18-month workforce transition plan with financial impact. Run Work Design Lab on your top 20 roles to unlock."
        primaryAction={{ label: "Run Work Design Lab on top 20 roles", onClick: () => onNavigate?.("design") }}
        secondaryAction={{ label: "Load Chesapeake demo", onClick: () => {} }}
      />
      {/* Preview ghost — shows what the populated view looks like */}
      <div className="relative mt-6">
        <div className="absolute top-2 right-4 z-10 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider" style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          Preview — requires data
        </div>
        <div style={{ opacity: 0.3, pointerEvents: "none", userSelect: "none" }}>
          {renderPopulatedView(true)}
        </div>
      </div>
    </div>}

    {/* Populated view */}
    {hasData && renderPopulatedView(false)}

    <FlowNav previous={{ id: "bbba", label: "Talent Strategy" }} next={{ id: "quickwins", label: "Quick Win Identifier" }} onNavigate={onNavigate || onBack} />
  </div>;
}
