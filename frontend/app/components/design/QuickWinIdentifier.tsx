"use client";
import React, { useState, useMemo } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import {
  KpiCard, Card, PageHeader, LoadingBar,
  useApiData, JobDesignState,
} from "../shared";
import { Sparkle } from "@/lib/icons";
import { EmptyState, FlowNav } from "@/app/ui";

export function QuickWinIdentifier({ model, f, onBack, onNavigate, jobStates }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; jobStates?: Record<string, JobDesignState> }) {
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
    <PageHeader icon={<Sparkle />} title="Quick-Win Identifier" subtitle="Highest ROI, lowest effort AI transformation opportunities" onBack={onBack} moduleId="quickwins" />

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
      {(["combined","roi","effort"] as const).map(s => <button key={s} onClick={() => setSortBy(s)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold transition-all cursor-pointer" style={{ background: sortBy === s ? "rgba(244,168,58,0.15)" : "var(--surface-2)", color: sortBy === s ? "var(--accent-primary)" : "var(--text-muted)", border: `1px solid ${sortBy === s ? "rgba(244,168,58,0.3)" : "var(--border)"}` }}>{s === "combined" ? "Best Overall" : s === "roi" ? "Highest ROI" : "Lowest Effort"}</button>)}
    </div>

    {/* Quick Wins section */}
    {quickWins.length > 0 && <Card title="Quick Wins — High Impact, Low Effort">
      <div className="text-[15px] text-[var(--text-secondary)] mb-3">These opportunities offer the best return for minimal implementation complexity. Start here.</div>
      <div className="grid grid-cols-2 gap-3">
        {quickWins.map((w, i) => <div key={i} className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] border-l-[3px] border-l-[var(--success)] transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[15px] font-bold text-[var(--text-primary)] truncate flex-1 mr-2">{String(w["Task Name"] || w.task_name || "—")}</div>
            <span className="text-[14px] font-bold px-2 py-0.5 rounded-full bg-[rgba(139,168,122,0.15)] text-[var(--success)] shrink-0">Quick Win</span>
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
    {strategicBets.length > 0 && <Card title="Strategic Bets — High Impact, Higher Effort">
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

    {scored.length === 0 && !loading && <EmptyState icon={<Sparkle />} headline="Quick Wins Require AI Scan Data" explanation="Run the AI Opportunity Scan first to identify high-impact, low-effort automation opportunities." primaryAction={{ label: "Go to Diagnose", onClick: () => onNavigate?.("diagnose") }} />}

    <FlowNav previous={{ id: "headcount", label: "Headcount Planning" }} next={{ id: "opmodel", label: "Operating Model Lab" }} onNavigate={onNavigate || onBack} />
  </div>;
}
