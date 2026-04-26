"use client";
import React, { useState, useEffect } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import {
  KpiCard, Card, DonutViz, PageHeader, LoadingBar,
  ModuleExportButton, usePersisted, logDec, fmtNum,
} from "../shared";
import { Shuffle, Check } from "@/lib/icons";
import { EmptyState, FlowNav } from "@/app/ui";
import { PathStepBanner } from "../designpaths/PathStepBanner";
import { SoftCompletionWarning } from "../designpaths/SoftCompletionWarning";
import { usePathBanner } from "../../lib/designpaths/usePathBanner";

export function BBBAFramework({ model, f, onBack, onNavigate, jobStates, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; jobStates?: Record<string, import("./shared").JobDesignState>; viewCtx?: import("./shared").ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = usePersisted<Record<string, string>>(`${model}_bbba_overrides`, {});
  const pb = usePathBanner(model, "bbba");

  useEffect(() => { if (!model) return; let cancelled = false; const slow = setTimeout(() => { if (!cancelled) setLoading(true); }, 150); api.getBBBA(model, f).then(d => { if (cancelled) return; clearTimeout(slow); setData(d); setLoading(false); }).catch(() => { if (cancelled) return; clearTimeout(slow); setLoading(false); }); return () => { cancelled = true; clearTimeout(slow); }; }, [model, f.func, f.jf, f.sf, f.cl]);

  const rawRoles = (data?.roles || []) as { role: string; disposition: string; reason: string; strong_candidates: number; reskillable_candidates: number; cost_per_fte: number; fte_needed: number; total_cost: number; required_skills: string[]; timeline_months: number; skill_area?: string }[];

  // Deduplicate: backend may return multiple rows for the same role with identical content
  const roles = React.useMemo(() => {
    const seen = new Set<string>();
    return rawRoles.filter(r => {
      const signature = JSON.stringify({ role: r.role, skills: r.required_skills, fte: r.fte_needed, disposition: r.disposition });
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  }, [rawRoles]);

  const summary = (data?.summary || {}) as Record<string, unknown>;
  const dispColors: Record<string, string> = { Build: "#8ba87a", Buy: "#f4a83a", Borrow: "#f4a83a", Automate: "#a78bb8" };

  // Strategy meta
  const strategies = [
    { id: "Build", color: "#8ba87a", label: "Train your existing people", pros: "Cheapest long-term, retains culture", cons: "Slowest (3-12mo)", best: "Skills adjacent to current", cost: "$", time: "3-12mo" },
    { id: "Buy", color: "#f4a83a", label: "Hire new talent externally", pros: "Exact skills immediately", cons: "Expensive, culture risk", best: "Skills don't exist internally", cost: "$$$", time: "2-6mo" },
    { id: "Borrow", color: "#f4a83a", label: "Use contractors or consultants", pros: "Fastest, no commitment", cons: "No knowledge transfer", best: "Temporary or specialized need", cost: "$$", time: "1mo" },
    { id: "Automate", color: "#a78bb8", label: "Deploy AI or technology", pros: "Scales infinitely, low ongoing cost", cons: "Upfront investment, change mgmt", best: "Repetitive, rule-based tasks", cost: "$$ then $", time: "2-4mo" },
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
    <PageHeader icon={<Shuffle />} title="Talent Strategy" subtitle="For each capability gap, decide the smartest way to close it" onBack={onBack} moduleId="bbba" />
    {pb.bannerPaths.length > 0 && <PathStepBanner paths={pb.bannerPaths} onMarkComplete={pb.handleMarkComplete} onPause={pb.handlePause} onOpenPathDrawer={(srcId) => onNavigate?.(srcId)} />}
    {pb.completionWarning && <SoftCompletionWarning criterion={pb.completionWarning.criterion} onConfirm={pb.confirmComplete} onCancel={pb.cancelComplete} />}
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="bbba" label="Talent Strategy" /></div>}
    {loading && <LoadingBar />}
    {!loading && roles.length === 0 && <EmptyState icon={<Shuffle />} headline="Complete Skills Gap Analysis First" explanation="Every gap has four options — each with different costs, timelines, and risks. This tool helps you choose." primaryAction={onNavigate ? { label: "Go to Work Design Lab", onClick: () => onNavigate("design") } : undefined} secondaryAction={onNavigate ? { label: "Go to AI Scan", onClick: () => onNavigate("scan") } : undefined} />}

    {/* ═══ STRATEGY EXPLAINER CARDS ═══ */}
    {roles.length > 0 && <div className="mb-5">
      <button onClick={() => setShowStratInfo(!showStratInfo)} className="text-[13px] text-[var(--text-muted)] mb-2 hover:text-[var(--accent-primary)]">{showStratInfo ? "▾ Hide" : "▸ Show"} strategy guide</button>
      {showStratInfo && <div className="grid grid-cols-4 gap-3">
        {strategies.map(s => <div key={s.id} className="rounded-xl p-4" style={{ borderLeft: `3px solid ${s.color}`, background: "var(--surface-1)", boxShadow: "var(--shadow-1)" }}>
          <div className="flex items-center gap-2 mb-2"><span className="text-[15px] font-bold" style={{ color: s.color }}>{s.id}</span></div>
          <div className="text-[13px] text-[var(--text-secondary)] mb-2">{s.label}</div>
          <div className="text-[12px] text-[var(--success)] mb-0.5">+ {s.pros}</div>
          <div className="text-[12px] text-[var(--risk)] mb-0.5">- {s.cons}</div>
          <div className="text-[12px] text-[var(--text-muted)] italic mt-1">Best when: {s.best}</div>
          <div className="flex justify-between mt-2 text-[11px] text-[var(--text-muted)]"><span>Cost: {s.cost}</span><span>{s.time}</span></div>
        </div>)}
      </div>}
    </div>}

    {/* ═══ ROLE DECISION CARDS ═══ */}
    {roles.length > 0 && <div className="space-y-4 mb-6">
      {roles.map((r, idx) => {
        const gapId = r.skill_area || r.required_skills?.[0] || `gap-${idx + 1}`;
        const disp = getDisp(r.role, r.disposition);
        return <div key={`${r.role}::${gapId}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden" style={{ boxShadow: "var(--shadow-1)" }}>
          {/* Role header — shows distinguishing skill/gap info */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border)]" style={{ background: "var(--surface-2)" }}>
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-bold text-[var(--text-primary)] font-heading">{r.required_skills?.[0] ? `${r.required_skills[0]} gap in ${r.role}` : r.role}</span>
              <span className="text-[12px] px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold">{r.fte_needed} FTE</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
              <span>AI Recommends:</span>
              <span className="font-bold" style={{ color: dispColors[r.disposition] }}>{r.disposition}</span>
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
                  <span className="text-[14px] font-bold" style={{ color: isSelected ? s.color : "var(--text-primary)" }}>{s.id}</span>
                  {isSelected && <Check size={12} className="ml-auto" style={{ color: s.color }} />}
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
            <span className="font-semibold" style={{ color: dispColors[disp] }}>{disp}:</span> {r.reason}
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
          {[{ l: "Total Investment", v: fmtNum(totalCost), c: "var(--text-primary)" }, { l: "Avg Timeline", v: `${avgTimeline}mo`, c: "var(--amber)" }, { l: "To Reskill", v: String(buildCount), c: "var(--success)" }, { l: "To Hire", v: String(buyCount), c: "var(--accent-primary)" }].map(k => <div key={k.l} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[18px] font-extrabold font-data" style={{ color: k.c }}>{k.v}</div><div className="text-[11px] text-[var(--text-muted)] uppercase">{k.l}</div></div>)}
        </div>
        {/* Insight */}
        {buildCount > buyCount * 1.5 && <div className="rounded-xl p-3 border-l-3" style={{ borderLeft: "3px solid var(--accent-primary)", background: "rgba(244,168,58,0.04)" }}>
          <div className="text-[14px] text-[var(--text-secondary)]">You{"'"}re investing heavily in BUILD ({Math.round(buildCount / Math.max(roles.length, 1) * 100)}%) — cost-effective but extends timeline by ~3 months vs. a BUY-heavy approach.</div>
        </div>}
        {buyCount > buildCount && <div className="rounded-xl p-3 border-l-3" style={{ borderLeft: "3px solid var(--warning)", background: "rgba(244,168,58,0.04)" }}>
          <div className="text-[14px] text-[var(--text-secondary)]">BUY-heavy strategy ({Math.round(buyCount / Math.max(roles.length, 1) * 100)}%) is fast but expensive. Consider shifting 2-3 roles to BUILD where skill adjacency is high.</div>
        </div>}
      </Card>
    </div>}

    <FlowNav previous={{ target: { kind: "module", moduleId: "rolecompare" }, label: "Role Comparison" }} next={{ target: { kind: "module", moduleId: "headcount" }, label: "Headcount Planning" }} />
  </div>;
}
