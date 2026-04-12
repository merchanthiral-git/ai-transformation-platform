"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, CartesianGrid } from "recharts";
import {
  ViewContext, COLORS, TT, SIM_PRESETS, SIM_DIMS, SIM_JOBS, SIM_READINESS,
  KpiCard, Card, Empty, Badge, InsightPanel, NarrativePanel, DataTable,
  BarViz, DonutViz, RadarViz, TabBar, PageHeader, LoadingBar, LoadingSkeleton,
  ModuleExportButton, NextStepBar, ContextStrip, InfoButton,
  useApiData, usePersisted, callAI, showToast, logDec,
  exportToCSV, EmptyWithAction, JobDesignState, AiInsightCard, fmtNum, ExpandableChart
} from "./shared";

/* ═══════════════════════════════════════════════════════════════
   SCENARIO NARRATIVE — AI-generated story from simulation data
   ═══════════════════════════════════════════════════════════════ */

function ScenarioNarrative({ scenario, adoption, timeline, totals, totalPct, totalInv, breakEven, activeJobs, scenData, model }: {
  scenario: string; adoption: number; timeline: number;
  totals: { cur: number; rel: number; fut: number; ai: number; fte: number; savings: number };
  totalPct: number; totalInv: number; breakEven: number;
  activeJobs: { role: string; dept: string; currentHrs: number; aiEligibleHrs: number; highAiTasks: number; rate: number }[];
  scenData: { role: string; dept: string; released: number; future: number; pctSaved: number; fte: number; aiTasks: number }[];
  model: string;
}) {
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = usePersisted(`${model}_narrative_collapsed`, false);

  // Top function by impact
  const byDept: Record<string, number> = {};
  scenData.forEach(j => { byDept[j.dept] = (byDept[j.dept] || 0) + j.released; });
  const topDept = Object.entries(byDept).sort(([, a], [, b]) => b - a)[0] || ["Unknown", 0];
  const topDeptPct = topDept ? Math.round(topDept[1] / Math.max(totals.rel, 1) * 100) : 0;

  // Roles enhanced vs redesigned vs consolidated
  const enhanced = scenData.filter(j => j.pctSaved < 30).length;
  const redesigned = scenData.filter(j => j.pctSaved >= 30 && j.pctSaved < 60).length;
  const consolidated = scenData.filter(j => j.pctSaved >= 60).length;

  // 3-year net
  const threeYearNet = totals.savings * 3 - totalInv;

  // Template-based fallback narrative (always available, no AI needed)
  const templateNarrative = useMemo(() => {
    const headline = `The ${scenario} scenario redesigns ${activeJobs.length} roles over ${timeline} months, generating ${fmtNum(totals.savings )} in annual savings at a ${totals.savings > 0 ? (totals.savings / Math.max(totalInv, 1)).toFixed(1) : "0"}x ROI.`;

    const opportunity = `Your highest-impact opportunity is in ${topDept?.[0] || "the organization"}, where ${topDept?.[1]?.toLocaleString() || 0} hours per month can be freed — ${topDeptPct}% of total capacity released. This represents ${totals.fte.toFixed(1)} FTE equivalents that can be redirected to higher-value strategic work.`;

    const people = `This scenario affects ${activeJobs.length} roles. ${enhanced} role${enhanced !== 1 ? "s" : ""} will be enhanced with AI tools, ${redesigned} will be redesigned with shifted responsibilities, and ${consolidated} will see significant consolidation (60%+ task automation). Average retraining timeline: ${Math.round(timeline * 0.4)} months.`;

    const financial = `Total transformation investment: $${totalInv.toLocaleString()}, including technology, reskilling, and change management costs. Projected annual savings of $${totals.savings.toLocaleString()} yield a payback period of ${breakEven} months and a 3-year net value of $${Math.round(threeYearNet).toLocaleString()}.`;

    const risk = `Key risks include adoption resistance (mitigate with change champions at 1:5 ratio), data quality gaps in automation-targeted processes, and skill transition timelines exceeding estimates. At ${adoption}% adoption, ${totalPct}% of current capacity is being released — ${totalPct > 40 ? "this is aggressive and requires strong executive sponsorship" : totalPct > 20 ? "a balanced approach with manageable change impact" : "a conservative start that minimizes disruption"}.`;

    const recommendation = `Based on the analysis, this scenario is ${totalPct > 40 ? "suited for organizations with mature change capabilities and strong executive sponsorship" : totalPct > 20 ? "appropriate for most mid-to-large organizations ready to invest in workforce transformation" : "ideal as a Phase 1 pilot to build confidence before scaling"}. Next steps: finalize role redesigns in the Work Design Lab, then build the change management roadmap in Mobilize.`;

    return { headline, opportunity, people, financial, risk, recommendation };
  }, [scenario, adoption, timeline, totals, totalPct, totalInv, breakEven, activeJobs.length, topDept, topDeptPct, enhanced, redesigned, consolidated, threeYearNet]);

  // Generate AI-powered narrative (or use template fallback)
  const generateNarrative = useCallback(async () => {
    setLoading(true);
    const dataCtx = JSON.stringify({
      scenario, adoption_pct: adoption, timeline_months: timeline,
      roles_affected: activeJobs.length, total_current_hrs: totals.cur,
      released_hrs: totals.rel, fte_freed: totals.fte.toFixed(1),
      annual_savings: totals.savings, investment: totalInv, breakeven_months: breakEven,
      three_year_net: threeYearNet,
      top_function: topDept?.[0], top_function_hrs: topDept?.[1], top_function_pct: topDeptPct,
      enhanced_roles: enhanced, redesigned_roles: redesigned, consolidated_roles: consolidated,
      pct_capacity_released: totalPct,
    });

    const result = await callAI(
      "You are a senior management consultant writing a scenario narrative for a CHRO. Write in clear, authoritative prose with specific numbers. No markdown, no bullet points — flowing paragraphs only. Return exactly 6 paragraphs separated by newlines.",
      `Write a transformation scenario narrative based on this data: ${dataCtx}

Paragraph 1 (HEADLINE — one powerful sentence): Summarize the bottom line — scenario name, roles affected, timeline, savings, ROI.
Paragraph 2 (OPPORTUNITY): Identify the highest-impact function, specific hours freed, FTE equivalents, and what percentage of total capacity this represents.
Paragraph 3 (PEOPLE IMPACT): How many roles enhanced vs redesigned vs consolidated, reskilling needs, typical retraining timeline.
Paragraph 4 (FINANCIAL): Total investment, projected savings, payback period, 3-year net value. Be specific with dollar amounts.
Paragraph 5 (RISK): Top 2-3 risks, change readiness implications, what the adoption rate tells us about organizational readiness.
Paragraph 6 (RECOMMENDATION): Is this scenario right, and what are the specific next steps?`
    );

    // If AI fails or returns error, use template
    if (result.startsWith("[AI") || result.startsWith("[Rate") || result.length < 100) {
      setNarrative(`${templateNarrative.headline}\n\n${templateNarrative.opportunity}\n\n${templateNarrative.people}\n\n${templateNarrative.financial}\n\n${templateNarrative.risk}\n\n${templateNarrative.recommendation}`);
    } else {
      setNarrative(result);
    }
    setLoading(false);
  }, [scenario, adoption, timeline, totals, totalInv, breakEven, threeYearNet, activeJobs.length, topDept, topDeptPct, enhanced, redesigned, consolidated, totalPct, templateNarrative]);

  // Auto-generate on first render with template (instant, no API call)
  useEffect(() => {
    if (!narrative) {
      setNarrative(`${templateNarrative.headline}\n\n${templateNarrative.opportunity}\n\n${templateNarrative.people}\n\n${templateNarrative.financial}\n\n${templateNarrative.risk}\n\n${templateNarrative.recommendation}`);
    }
  }, [templateNarrative]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyToClipboard = () => {
    navigator.clipboard.writeText(narrative).then(() => showToast("Copied to clipboard"));
  };

  // Sync narrative to backend for export integration
  useEffect(() => {
    if (narrative) {
      try { localStorage.setItem(`${model}_scenario_narrative`, narrative); } catch {}
      // Fire-and-forget POST to backend for inclusion in DOCX/PPTX/PDF exports
      fetch(`/api/export/narrative/${model}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrative }),
      }).catch(() => {});
    }
  }, [narrative, model]);

  const roi = totals.savings > 0 ? (totals.savings / Math.max(totalInv, 1)).toFixed(1) : "0";

  return <div className="mb-5">
    <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between px-5 py-3.5 bg-[var(--surface-1)] border border-[var(--border)] hover:bg-[var(--hover)] transition-all" style={{ borderRadius: collapsed ? 16 : undefined, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: collapsed ? 16 : 0, borderBottomRightRadius: collapsed ? 16 : 0, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">📖</span>
        <span className="text-[16px] font-bold text-[var(--text-primary)] font-heading">Scenario Narrative</span>
      </div>
      <span className="text-[var(--text-muted)] text-[14px]">{collapsed ? "▸" : "▾"}</span>
    </button>

    {!collapsed && <div className="border border-[var(--border)] border-t-0 rounded-b-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.015)" }}>

      <div className="px-6 py-6 space-y-5">
        {/* ═══ TOP BANNER ═══ */}
        <div className="rounded-xl p-5 border-l-4" style={{ borderLeftColor: "var(--accent-primary)", background: "var(--surface-1)", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-[20px] font-extrabold text-[var(--text-primary)] font-heading">The {scenario} Scenario</div>
              <div className="text-[15px] text-[var(--text-muted)] mt-0.5">Redesigns {activeJobs.length} roles over {timeline} months</div>
            </div>
            <div className="flex gap-3">
              {[
                { icon: "💰", label: `$${totals.savings.toLocaleString()}`, sub: "savings/yr", color: "var(--success)" },
                { icon: "📈", label: `${roi}x`, sub: "ROI", color: "var(--accent-primary)" },
                { icon: "⏱️", label: `${breakEven}mo`, sub: "payback", color: "#0EA5E9" },
              ].map(b => <div key={b.sub} className="rounded-xl px-4 py-2.5 text-center" style={{ background: `${b.color}08`, border: `1px solid ${b.color}20` }}>
                <div className="text-[11px] opacity-60">{b.icon}</div>
                <div className="text-[18px] font-extrabold font-data" style={{ color: b.color }}>{b.label}</div>
                <div className="text-[11px] text-[var(--text-muted)] uppercase">{b.sub}</div>
              </div>)}
            </div>
          </div>
        </div>

        {/* ═══ THREE INSIGHT CARDS ═══ */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-4 border-l-3" style={{ borderLeft: "3px solid #0EA5E9", background: "var(--surface-1)", boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
            <div className="flex items-center gap-2 mb-2"><span className="text-[16px]">⚡</span><span className="text-[14px] font-bold text-[var(--text-primary)]">Impact</span></div>
            <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{totals.rel.toLocaleString()} hrs/month freed across {activeJobs.length} roles</div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">{totals.fte.toFixed(1)} FTE equivalents → strategic work</div>
          </div>
          <div className="rounded-xl p-4" style={{ borderLeft: "3px solid var(--accent-primary)", background: "var(--surface-1)", boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
            <div className="flex items-center gap-2 mb-2"><span className="text-[16px]">💰</span><span className="text-[14px] font-bold text-[var(--text-primary)]">Investment</span></div>
            <div className="text-[14px] text-[var(--text-secondary)]">Total: ${totalInv.toLocaleString()}</div>
            <div className="text-[13px] text-[var(--text-muted)]">Annual savings: ${totals.savings.toLocaleString()}</div>
            <div className="text-[13px] text-[var(--success)] font-semibold mt-0.5">3yr NPV: ${Math.round(threeYearNet).toLocaleString()}</div>
          </div>
          <div className="rounded-xl p-4" style={{ borderLeft: "3px solid var(--success)", background: "var(--surface-1)", boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
            <div className="flex items-center gap-2 mb-2"><span className="text-[16px]">📅</span><span className="text-[14px] font-bold text-[var(--text-primary)]">Timeline</span></div>
            <div className="text-[14px] text-[var(--text-secondary)]">{enhanced} roles enhanced with AI</div>
            <div className="text-[13px] text-[var(--text-muted)]">{redesigned} roles redesigned</div>
            <div className="text-[13px] text-[var(--text-muted)]">Avg retraining: {Math.round(timeline * 0.4)} months</div>
          </div>
        </div>

        {/* ═══ NARRATIVE SECTION ═══ */}
        {loading && <div className="text-center py-10">
          <div className="text-2xl mb-2 animate-pulse">🧠</div>
          <div className="text-[15px] text-[var(--accent-primary)] font-semibold">Generating scenario narrative...</div>
        </div>}

        {!loading && narrative && <>
          {editing ? (
            <textarea value={narrative} onChange={e => setNarrative(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-5 text-[16px] leading-[1.8] outline-none resize-y text-[var(--text-primary)]"
              style={{ fontFamily: "'Outfit', sans-serif", minHeight: 300 }}
              onBlur={() => setEditing(false)} />
          ) : (
            <div onClick={() => setEditing(true)} className="cursor-text rounded-xl p-5" style={{ borderLeft: "2px solid rgba(212,134,10,0.25)", background: "var(--surface-1)" }} title="Click to edit">
              {narrative.split("\n\n").map((para, i) => {
                if (i === 0) return <p key={i} className="font-heading" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 18 }}>{para}</p>;
                const highlighted = para.replace(/(\$[\d,]+[KMB]?|[\d,]+%|[\d,]+\.\d+x|[\d,]+ (?:roles?|months?|employees?|FTE|hours?))/g, '<span style="color:var(--accent-primary);font-weight:700">$1</span>');
                return <p key={i} style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 16, fontFamily: "'Outfit', sans-serif" }} dangerouslySetInnerHTML={{ __html: highlighted }} />;
              })}
            </div>
          )}

          {/* ═══ ACTION BAR ═══ */}
          <div className="flex items-center gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={generateNarrative} disabled={loading} className="px-4 py-2 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50 glow-pulse" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>
              {loading ? "..." : "✨ Regenerate with AI"}
            </button>
            <button onClick={copyToClipboard} className="px-3 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/30 transition-all">
              📋 Copy
            </button>
            <button onClick={() => setEditing(!editing)} className="px-3 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--accent-primary)] transition-all">
              {editing ? "✓ Done" : "✏️ Edit"}
            </button>
            <div className="flex-1" />
            <span className="text-[12px] text-[var(--text-muted)] opacity-50">Click text to edit</span>
          </div>
        </>}
      </div>
    </div>}
  </div>;
}


export function ImpactSimulator({ onBack, onNavigate, model, f, jobStates, simState, setSimState, viewCtx }: { onBack: () => void; onNavigate?: (id: string) => void; model: string; f: Filters; jobStates: Record<string, JobDesignState>; simState: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number }; setSimState: (s: { scenario: string; custom: boolean; custAdopt: number; custTimeline: number; investment: number }) => void; viewCtx?: ViewContext }) {
  const [tab, setTab] = useState("scenarios");
  const [redeployBuckets, setRedeployBuckets] = useState<Record<string, number>>({ hv: 25, inn: 25, cap: 25, opt: 25 });
  const [scenSub, setScenSub] = useState("impact");
  const [rdSub, setRdSub] = useState("dashboard");
  const [expandDim, setExpandDim] = useState<string | null>(null);

  // Saved scenarios for comparison
  type SavedScenario = { name: string; scenario: string; custom: boolean; adoption: number; timeline: number; investment: number; savedAt: string; totals: { cur: number; rel: number; fte: number; savings: number; breakEven: number; pct: number } };
  const [savedScenarios, setSavedScenarios] = usePersisted<SavedScenario[]>(`${model}_saved_scenarios`, []);

  // HRBP module state (hoisted from render closures to avoid Rules of Hooks violation)
  type MgrAction = { id: string; manager: string; team: number; wave: string; month: number; category: string; action: string; done: boolean; concern: string };
  const [mgrActions, setMgrActions] = usePersisted<MgrAction[]>(`${model}_mgr_actions`, [
    { id: "ma1", manager: "Sarah Chen", team: 42, wave: "Wave 1", month: 1, category: "Champion", action: "Brief on restructuring impact — 12 roles affected", done: false, concern: "Team morale during transition" },
    { id: "ma2", manager: "James Park", team: 28, wave: "Wave 1", month: 1, category: "Needs Dev", action: "Provide talking points and FAQ document", done: false, concern: "Lacks change management experience" },
    { id: "ma3", manager: "Mike Rodriguez", team: 8, wave: "Wave 1", month: 2, category: "Flight Risk", action: "1:1 engagement — assess commitment level", done: false, concern: "May leave before transition completes" },
    { id: "ma4", manager: "Lisa Wang", team: 35, wave: "Wave 2", month: 3, category: "Champion", action: "Activate as change champion for Operations", done: false, concern: "Already leading 2 other initiatives" },
    { id: "ma5", manager: "David Kim", team: 15, wave: "Wave 2", month: 3, category: "Needs Dev", action: "Schedule coaching sessions on AI adoption", done: false, concern: "Low digital literacy" },
    { id: "ma6", manager: "Anna Torres", team: 22, wave: "Wave 2", month: 4, category: "Champion", action: "Coordinate group briefing with 3 other Wave 2 managers", done: false, concern: "None — strong advocate" },
  ]);
  const [qReadyState, setQReadyState] = usePersisted<Record<string, boolean>>(`${model}_q_ready`, {});
  const [selectedChange, setSelectedChange] = useState("automate_close");
  const [teamData] = usePersisted<{ mgr: string; team: number; func: string; wave: string; milestones: { label: string; done: boolean }[]; issues: number }[]>(`${model}_team_track`, [
    { mgr: "Sarah Chen", team: 42, func: "Technology", wave: "Wave 1", milestones: [{ label: "Manager briefed", done: true }, { label: "Team town hall", done: false }, { label: "Reskilling started", done: false }, { label: "Go-live", done: false }], issues: 1 },
    { mgr: "James Park", team: 28, func: "Technology", wave: "Wave 1", milestones: [{ label: "Manager briefed", done: true }, { label: "Team town hall", done: true }, { label: "Reskilling started", done: false }, { label: "Go-live", done: false }], issues: 0 },
    { mgr: "Lisa Wang", team: 35, func: "Operations", wave: "Wave 2", milestones: [{ label: "Manager briefed", done: false }, { label: "Team town hall", done: false }, { label: "Reskilling started", done: false }, { label: "Go-live", done: false }], issues: 2 },
    { mgr: "David Kim", team: 15, func: "Finance", wave: "Wave 2", milestones: [{ label: "Manager briefed", done: false }, { label: "Team town hall", done: false }, { label: "Reskilling started", done: false }, { label: "Go-live", done: false }], issues: 0 },
  ]);
  const [pulseLog, setPulseLog] = usePersisted<{ date: string; person: string; sentiment: number; concern: string }[]>(`${model}_pulse_log`, []);
  const [scenarioName, setScenarioName] = useState("");

  // Use persisted state
  const scenario = simState.scenario;
  const custom = simState.custom;
  const custAdopt = simState.custAdopt;
  const custTimeline = simState.custTimeline;
  const investment = simState.investment;
  const update = (partial: Partial<typeof simState>) => setSimState({ ...simState, ...partial });

  // Build job list from real work design data if available, else fall back to demo
  const realJobs = useMemo(() => {
    const entries = Object.entries(jobStates || {}).filter(([_, s]) => s.deconRows.length > 0);
    if (entries.length === 0) return null;
    return entries.map(([role, s]) => {
      const totalHrs = s.deconRows.reduce((sum, r) => sum + Math.round(Number(r["Est Hours/Week"] || 0)), 0) * 4; // monthly
      const highAiRows = s.deconRows.filter(r => String(r["AI Impact"]) === "High");
      const aiEligibleHrs = Math.round(s.deconRows.filter(r => String(r["AI Impact"]) !== "Low").reduce((sum, r) => sum + Number(r["Est Hours/Week"] || 0), 0) * 4);
      const func = String(s.deconRows[0]?.Workstream || "General");
      return { role, dept: func, currentHrs: totalHrs || 160, aiEligibleHrs: aiEligibleHrs || Math.round(totalHrs * 0.5), highAiTasks: highAiRows.length, rate: 75 };
    });
  }, [jobStates]);
  // Filter jobs by function if filter is active
  const filteredJobs = useMemo(() => {
    const base = realJobs || SIM_JOBS;
    if (f.func && f.func !== "All") return base.filter(j => j.dept.toLowerCase().includes(f.func.toLowerCase()));
    return base;
  }, [realJobs, f.func]);
  const activeJobs = filteredJobs;

  const cfg = custom ? { label: "Custom", adoption: custAdopt / 100, timeline: custTimeline, ramp: 0.75, color: "#D97706" } : SIM_PRESETS[scenario];

  const scenData = activeJobs.map(j => {
    const rel = Math.round(j.aiEligibleHrs * cfg.adoption * cfg.ramp);
    return { ...j, released: rel, future: j.currentHrs - rel, pctSaved: Math.round((rel / j.currentHrs) * 100), aiTasks: Math.round(j.highAiTasks * cfg.adoption), fte: +(rel / 160).toFixed(1) };
  });
  const totals = scenData.reduce((a, j) => ({ cur: a.cur + j.currentHrs, rel: a.rel + j.released, fut: a.fut + j.future, ai: a.ai + j.aiTasks, fte: a.fte + j.fte, savings: a.savings + (j.released * j.rate) }), { cur: 0, rel: 0, fut: 0, ai: 0, fte: 0, savings: 0 });
  const totalPct = Math.round((totals.rel / totals.cur) * 100);
  const totalInv = activeJobs.length * investment;
  const breakEven = totals.savings > 0 ? Math.ceil(totalInv / (totals.savings / 12)) : 999;

  // Try to fetch readiness from backend, fall back to demo
  const [backendReadiness] = useApiData(() => model ? api.getReadiness(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);
  const readinessData = useMemo(() => {
    const br = backendReadiness as Record<string, unknown> | null;
    if (br && br.dimensions && Object.keys(br.dimensions as object).length > 0) {
      // Backend has real readiness data
      return { source: "uploaded", data: br };
    }
    return { source: "demo", data: null };
  }, [backendReadiness]);

  // Readiness scoring
  const dimScores = SIM_DIMS.map(d => {
    const items = SIM_READINESS[d] || [];
    const avg = items.reduce((s, it) => s + it.score, 0) / items.length;
    return { dim: d, score: Math.round((avg / 5) * 20), items };
  });
  const overallScore = Math.round(dimScores.reduce((s, d) => s + d.score, 0) / dimScores.length * 5);
  const maturityLabel = (s: number) => s >= 80 ? "Mature" : s >= 60 ? "Advanced" : s >= 40 ? "Developing" : s >= 20 ? "Early Stage" : "Not Started";
  const maturityColor = (s: number) => s >= 80 ? "var(--success)" : s >= 60 ? "var(--accent-primary)" : s >= 40 ? "var(--warning)" : "var(--risk)";

  // Job view: filter to selected job only
  if (viewCtx?.mode === "job" && viewCtx?.job) {
    const jobData = scenData.filter(j => j.role.toLowerCase().includes(viewCtx.job.toLowerCase()));
    const jd = jobData[0] || scenData[0];
    return <div>
      <PageHeader icon="💼" title={`Role Scenario — ${viewCtx.job}`} subtitle={`Impact under ${cfg.label} scenario`} onBack={onBack} moduleId="simulate" />
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Current Hours" value={`${jd?.currentHrs || 0}h/mo`} /><KpiCard label="Released" value={`${jd?.released || 0}h/mo`} accent /><KpiCard label="Future Hours" value={`${jd?.future || 0}h/mo`} /><KpiCard label="FTE Freed" value={jd?.fte || 0} accent /><KpiCard label="Time Saved" value={`${jd?.pctSaved || 0}%`} />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card title="Scenario Comparison for This Role">
          <div className="space-y-3">{Object.values(SIM_PRESETS).map(p => {
            const rel = Math.round((jd?.aiEligibleHrs || 0) * p.adoption * p.ramp);
            const pct = jd?.currentHrs ? Math.round((rel / jd.currentHrs) * 100) : 0;
            return <div key={p.label} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-[15px] font-semibold" style={{ color: p.color }}>{p.label}</span>
              <div className="flex items-center gap-4 text-[15px]"><span>{rel}h released</span><span>{+(rel/160).toFixed(1)} FTE</span><Badge color={pct > 40 ? "green" : pct > 20 ? "amber" : "gray"}>{pct}%</Badge></div>
            </div>;
          })}</div>
        </Card>
        <Card title="What This Means">
          <InsightPanel title="Role Impact" items={[
            `Under ${cfg.label}, ${jd?.released || 0} hours/month are freed from this role.`,
            `This is equivalent to ${jd?.fte || 0} FTEs worth of capacity.`,
            `${jd?.aiTasks || 0} tasks will be AI-augmented or automated.`,
            jd?.pctSaved && jd.pctSaved > 40 ? "This role is highly transformable — prioritize in Wave 1." : "Moderate transformation — schedule for Wave 2.",
          ]} icon="⚡" />
        </Card>
      </div>
  
    {/* Break-Even Analysis */}
    <Card title="Break-Even Analysis">
      {(() => {
        const totalInvestment = 350000; // Approximate from BBBA
        const annualSavings = 120000; // Approximate from headcount eliminations
        const monthsToBreakeven = annualSavings > 0 ? Math.ceil((totalInvestment / annualSavings) * 12) : 0;
        return <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Total Investment</div><div className="text-[24px] font-extrabold text-[var(--risk)]">{fmtNum(totalInvestment)}</div></div>
          <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Annual Savings</div><div className="text-[24px] font-extrabold text-[var(--success)]">{fmtNum(annualSavings)}</div></div>
          <div className="rounded-xl p-4 text-center border-2 border-[var(--accent-primary)]"><div className="text-[15px] text-[var(--text-muted)] uppercase mb-1">Break-Even</div><div className="text-[24px] font-extrabold text-[var(--accent-primary)]">{monthsToBreakeven > 0 ? `Month ${monthsToBreakeven}` : "—"}</div></div>
        </div>;
      })()}
    </Card>

    <NextStepBar currentModuleId="simulate" onNavigate={onNavigate || onBack} />
    </div>;
  }

  // Employee view: personal impact
  if (viewCtx?.mode === "employee" && viewCtx?.employee) return <div>
    <PageHeader icon="👤" title="How AI Affects Me" subtitle={`${viewCtx.employee}'s transformation impact`} onBack={onBack} moduleId="simulate" />
    <PersonalImpactCard employee={viewCtx.employee} jobStates={jobStates} simState={simState} />
    <Card title="What Will Change">
      <div className="space-y-3">
        {[{ icon: "🤖", title: "AI-Augmented Tasks", desc: "Repetitive data entry, report generation, and routine analysis will be handled by AI tools. You'll review and approve rather than create from scratch." },
          { icon: "📚", title: "New Skills to Learn", desc: "Prompt engineering, AI tool management, and strategic interpretation of AI outputs. Training will be provided in Wave 1." },
          { icon: "⏰", title: "Time Reallocation", desc: "Freed capacity redirected to relationship building, strategic thinking, cross-functional projects, and innovation initiatives." },
          { icon: "🛡️", title: "What Stays the Same", desc: "Client relationships, judgment-heavy decisions, team leadership, and stakeholder management remain human-led." }
        ].map((item, i) => <div key={i} className="flex gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <span className="text-xl shrink-0">{item.icon}</span>
          <div><div className="text-[15px] font-bold text-[var(--text-primary)] mb-0.5">{item.title}</div><div className="text-[15px] text-[var(--text-secondary)]">{item.desc}</div></div>
        </div>)}
      </div>
    </Card>
    <NextStepBar currentModuleId="simulate" onNavigate={onNavigate || onBack} />
  </div>;

  // Empty state when no data
  if (!model) return <div className="px-7 py-6"><div className="bg-[var(--surface-1)] border border-[var(--accent-primary)]/20 rounded-2xl p-8 text-center"><div className="text-3xl mb-3 opacity-40">⚡</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Upload Data to Simulate</h3><p className="text-[15px] text-[var(--text-secondary)]">Upload workforce data and complete at least one job in the Work Design Lab to model transformation scenarios.</p></div></div>;

  return <div>
    <ContextStrip items={[realJobs ? `${realJobs.length} roles from Work Design Lab` : "Using demo data — complete Work Design Lab for real numbers", Object.values(jobStates).filter(s => s.finalized).length > 0 ? `${Object.values(jobStates).filter(s => s.finalized).length} jobs finalized` : ""].filter(Boolean)} />
    <PageHeader icon="⚡" title="Impact Simulator" subtitle="Model transformation scenarios and assess organizational AI readiness" onBack={onBack} moduleId="simulate" />
    {realJobs ? <div className="bg-[rgba(16,185,129,0.08)] border border-[var(--success)]/30 rounded-lg px-4 py-2 mb-4 text-[15px] text-[var(--success)]">✓ Using your Work Design data — {realJobs.length} roles from your submitted jobs</div> : <div className="bg-[rgba(245,158,11,0.08)] border border-[var(--warning)]/30 rounded-lg px-4 py-2 mb-4 text-[15px] text-[var(--warning)]">Using demo data — complete jobs in the Work Design Lab to see your real numbers here</div>}
    <TabBar tabs={[{ id: "scenarios", label: "⚡ Scenarios" }, { id: "readiness", label: "◎ AI Readiness" }, { id: "mgrready", label: "👔 Manager Prep" }, { id: "questions", label: "❓ Question Sim" }, { id: "ripple", label: "🌊 Ripple Effect" }, { id: "teamtrack", label: "📋 Team Tracker" }]} active={tab} onChange={setTab} />

    {tab === "scenarios" && <div>
      {/* Scenario pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(SIM_PRESETS).map(([k, v]) => <button key={k} onClick={() => update({ scenario: k, custom: false })} className="px-4 py-2 rounded-lg text-[15px] font-semibold transition-all" style={{ border: !custom && scenario === k ? `2px solid ${v.color}` : "1px solid var(--border)", background: !custom && scenario === k ? `${v.color}14` : "transparent", color: !custom && scenario === k ? v.color : "var(--text-muted)" }}>{v.label}</button>)}
        <button onClick={() => update({ custom: true })} className="px-4 py-2 rounded-lg text-[15px] font-semibold transition-all" style={{ border: custom ? "2px solid #D97706" : "1px solid var(--border)", background: custom ? "rgba(217,119,6,0.08)" : "transparent", color: custom ? "#D97706" : "var(--text-muted)" }}>+ Custom</button>
      </div>

      {/* Custom builder */}
      {custom && <div className="bg-[var(--surface-1)] border border-[var(--teal)] rounded-xl p-5 mb-4">
        <h3 className="text-[15px] font-bold font-heading mb-3 text-[var(--teal)]">Custom Scenario Builder</h3>
        <div className="grid grid-cols-3 gap-6">
          <div><div className="flex justify-between mb-1"><span className="text-[15px]">Adoption</span><span className="text-[15px] font-bold text-[var(--teal)]">{custAdopt}%</span></div><input type="range" min={10} max={100} value={custAdopt} onChange={e => update({ custAdopt: +e.target.value })} className="w-full" /></div>
          <div><div className="flex justify-between mb-1"><span className="text-[15px]">Timeline</span><span className="text-[15px] font-bold text-[var(--teal)]">{custTimeline}mo</span></div><input type="range" min={3} max={24} value={custTimeline} onChange={e => update({ custTimeline: +e.target.value })} className="w-full" /></div>
          <div><div className="flex justify-between mb-1"><span className="text-[15px]">Per-Role Investment</span><span className="text-[15px] font-bold text-[var(--teal)]">${investment.toLocaleString()}</span></div><input type="range" min={10000} max={200000} step={5000} value={investment} onChange={e => update({ investment: +e.target.value })} className="w-full" /></div>
        </div>
      </div>}

      {/* ═══ PERSISTENT KPI STRIP ═══ */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 mb-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Annual Savings", value: fmtNum(totals.savings), color: "var(--success)", icon: "💰" },
            { label: "ROI", value: `${totals.savings > 0 ? (totals.savings / Math.max(totalInv, 1)).toFixed(1) : "0"}x`, color: "var(--accent-primary)", icon: "📈" },
            { label: "Payback", value: breakEven <= 36 ? `${breakEven}mo` : "36+", color: "#0EA5E9", icon: "⏱️" },
            { label: "FTEs Impacted", value: totals.fte.toFixed(1), color: "var(--purple)", icon: "👥" },
            { label: "Risk Level", value: totalPct > 40 ? "High" : totalPct > 20 ? "Medium" : "Low", color: totalPct > 40 ? "var(--risk)" : totalPct > 20 ? "var(--warning)" : "var(--success)", icon: totalPct > 40 ? "🔴" : totalPct > 20 ? "🟡" : "🟢" },
          ].map(k => <div key={k.label} className="text-center">
            <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{k.icon} {k.label}</div>
            <div className="text-[22px] font-extrabold font-data" style={{ color: k.color }}>{k.value}</div>
          </div>)}
        </div>
      </div>

      {/* ═══ REDESIGNED SUB-TABS ═══ */}
      <TabBar tabs={[{ id: "impact", label: "📊 Impact Model" }, { id: "financial", label: "💰 Financial Case" }, { id: "compare", label: "⚖️ Scenario Comparison" }, { id: "redeploy", label: "🔀 Redeployment" }, { id: "brief", label: "📋 Executive Brief" }]} active={scenSub} onChange={setScenSub} />

      {/* ═══ TAB: IMPACT MODEL (merges role detail + waterfall + FTE) ═══ */}
      {scenSub === "impact" && <div className="space-y-5">
        {/* Capacity Waterfall — visual */}
        <Card title="Capacity Waterfall">
          <div className="flex items-end gap-2 justify-center mb-4" style={{ height: 260 }}>
            {[{ label: "Current", value: totals.cur, color: "var(--accent-primary)" },
              { label: "AI Freed", value: -totals.rel, color: "var(--risk)" },
              { label: "Redesigned", value: Math.round(totals.rel * 0.15), color: "var(--success)" },
              { label: "Future", value: totals.fut, color: "var(--purple)" },
            ].map((seg, i) => {
              const maxH = Math.max(totals.cur, totals.fut, 1);
              const barH = Math.max(Math.abs(seg.value) / maxH * 200, 8);
              return <div key={i} className="flex flex-col items-center group cursor-pointer" style={{ width: 120 }}>
                <div className="text-[14px] font-data font-bold mb-1" style={{ color: seg.color }}>{seg.value > 0 ? "+" : ""}{seg.value.toLocaleString()}h</div>
                <div className="rounded-t-lg transition-all group-hover:opacity-80" style={{ width: 64, height: barH, background: seg.color }} />
                <div className="text-[13px] text-[var(--text-muted)] mt-2 text-center font-heading">{seg.label}</div>
              </div>;
            })}
          </div>
        </Card>
        {/* FTE by Function — table */}
        <Card title={`Impact by Function — ${cfg.label} Scenario`}>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)]">
            {["Function", "Roles", "Current Hrs", "Released", "Future", "FTE Impact", "% Saved"].map(h => <th key={h} className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">{h}</th>)}
          </tr></thead><tbody>
            {(() => {
              const byDept: Record<string, typeof scenData> = {};
              scenData.forEach(j => { if (!byDept[j.dept]) byDept[j.dept] = []; byDept[j.dept].push(j); });
              return Object.entries(byDept).sort(([,a],[,b]) => b.reduce((s,j)=>s+j.released,0) - a.reduce((s,j)=>s+j.released,0)).map(([dept, roles]) => {
                const dCur = roles.reduce((s,j)=>s+j.currentHrs,0);
                const dRel = roles.reduce((s,j)=>s+j.released,0);
                const dFut = roles.reduce((s,j)=>s+j.future,0);
                const dFte = roles.reduce((s,j)=>s+j.fte,0);
                const dPct = dCur > 0 ? Math.round(dRel/dCur*100) : 0;
                return <tr key={dept} className="border-b border-[var(--border)]" style={{ borderLeft: `3px solid ${dPct > 30 ? "var(--risk)" : dPct > 15 ? "var(--warning)" : "var(--success)"}` }}>
                  <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{dept}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{roles.length}</td>
                  <td className="px-3 py-2 font-data text-[var(--text-secondary)]">{dCur.toLocaleString()}</td>
                  <td className="px-3 py-2 font-data font-bold" style={{ color: "var(--risk)" }}>-{dRel.toLocaleString()}</td>
                  <td className="px-3 py-2 font-data text-[var(--text-secondary)]">{dFut.toLocaleString()}</td>
                  <td className="px-3 py-2 font-data font-bold" style={{ color: cfg.color }}>{dFte.toFixed(1)}</td>
                  <td className="px-3 py-2"><Badge color={dPct > 30 ? "red" : dPct > 15 ? "amber" : "green"}>{dPct}%</Badge></td>
                </tr>;
              });
            })()}
          </tbody></table></div>
        </Card>
      </div>}

      {/* ═══ TAB: FINANCIAL CASE (merges ROI + investment) ═══ */}
      {scenSub === "financial" && <div className="space-y-5">
        <div className="grid grid-cols-2 gap-5">
          {/* Investment breakdown */}
          <Card title="Investment Breakdown">
            <div className="space-y-3">
              {[
                { label: "Technology & Tools", pct: 40, amount: Math.round(totalInv * 0.4), color: "var(--purple)" },
                { label: "Reskilling Programs", pct: 25, amount: Math.round(totalInv * 0.25), color: "var(--accent-primary)" },
                { label: "Change Management", pct: 20, amount: Math.round(totalInv * 0.2), color: "#0EA5E9" },
                { label: "Hiring & Transition", pct: 15, amount: Math.round(totalInv * 0.15), color: "var(--success)" },
              ].map(item => <div key={item.label}>
                <div className="flex justify-between text-[14px] mb-1"><span className="text-[var(--text-secondary)]">{item.label}</span><span className="font-bold font-data" style={{ color: item.color }}>${item.amount.toLocaleString()}</span></div>
                <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} /></div>
              </div>)}
              <div className="pt-2 border-t border-[var(--border)] flex justify-between text-[16px] font-bold"><span>Total Investment</span><span className="font-data text-[var(--warning)]">${totalInv.toLocaleString()}</span></div>
            </div>
          </Card>
          {/* Savings breakdown */}
          <Card title="Annual Savings Breakdown">
            <div className="space-y-3">
              {[
                { label: "Automation Savings", pct: 50, amount: Math.round(totals.savings * 0.5), color: "var(--success)" },
                { label: "Efficiency Gains", pct: 30, amount: Math.round(totals.savings * 0.3), color: "var(--accent-primary)" },
                { label: "Headcount Optimization", pct: 20, amount: Math.round(totals.savings * 0.2), color: "#0EA5E9" },
              ].map(item => <div key={item.label}>
                <div className="flex justify-between text-[14px] mb-1"><span className="text-[var(--text-secondary)]">{item.label}</span><span className="font-bold font-data" style={{ color: item.color }}>${item.amount.toLocaleString()}</span></div>
                <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} /></div>
              </div>)}
              <div className="pt-2 border-t border-[var(--border)] flex justify-between text-[16px] font-bold"><span>Annual Savings</span><span className="font-data text-[var(--success)]">${totals.savings.toLocaleString()}</span></div>
            </div>
          </Card>
        </div>
        {/* Business case summary */}
        <Card title="Business Case Summary">
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: "Investment", val: `$${totalInv.toLocaleString()}`, color: "var(--warning)" },
              { label: "Annual Savings", val: `$${totals.savings.toLocaleString()}`, color: "var(--success)" },
              { label: "Net Year 1", val: `$${(totals.savings - totalInv).toLocaleString()}`, color: totals.savings - totalInv > 0 ? "var(--success)" : "var(--risk)" },
              { label: "3-Year NPV", val: `$${Math.round(totals.savings * 3 - totalInv).toLocaleString()}`, color: "var(--success)" },
              { label: "Payback", val: `${breakEven}mo`, color: "#0EA5E9" },
              { label: "ROI", val: `${totals.savings > 0 ? (totals.savings / Math.max(totalInv, 1)).toFixed(1) : "0"}x`, color: "var(--accent-primary)" },
            ].map(k => <div key={k.label} className="rounded-xl p-3 bg-[var(--surface-2)] text-center"><div className="text-[11px] text-[var(--text-muted)] uppercase mb-1">{k.label}</div><div className="text-[20px] font-extrabold font-data" style={{ color: k.color }}>{k.val}</div></div>)}
          </div>
        </Card>
      </div>}

      {/* ═══ TAB: EXECUTIVE BRIEF (replaces narrative) ═══ */}
      {scenSub === "brief" && <ScenarioNarrative scenario={cfg.label} adoption={adoption} timeline={timeline} totals={totals} totalPct={totalPct} totalInv={totalInv} breakEven={breakEven} activeJobs={activeJobs} scenData={scenData} model={model} />}

      {/* ═══ LEGACY TABS (kept for backward compat, hidden from tab bar) ═══ */}
      {scenSub === "detail" && <Card title={`Role Detail — ${cfg.label} Scenario`}>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-left"><thead><tr className="bg-[var(--surface-2)]">{["Role","Dept","Current","Eligible","Released","Future","FTE Freed","Saved %","AI Tasks"].map((h, i) => <th key={h} className={`px-3 py-2 text-[15px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)] ${i >= 2 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
          <tbody>{scenData.map(j => <tr key={j.role} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
            <td className="px-3 py-2 text-[15px] font-semibold">{j.role}</td>
            <td className="px-3 py-2 text-[15px] text-[var(--text-muted)]">{j.dept}</td>
            <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{j.currentHrs}</td>
            <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{j.aiEligibleHrs}</td>
            <td className="px-3 py-2 text-right font-bold" style={{ color: cfg.color }}>{j.released}</td>
            <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{j.future}</td>
            <td className="px-3 py-2 text-right" style={{ color: cfg.color }}>{j.fte}</td>
            <td className="px-3 py-2 text-right"><Badge color={j.pctSaved > 40 ? "green" : j.pctSaved > 20 ? "amber" : "gray"}>{j.pctSaved}%</Badge></td>
            <td className="px-3 py-2 text-right font-semibold">{j.aiTasks}</td>
          </tr>)}</tbody>
          <tfoot><tr className="border-t-2 border-[var(--border)] font-bold"><td className="px-3 py-2" colSpan={2}>Total</td><td className="px-3 py-2 text-right">{totals.cur}</td><td className="px-3 py-2 text-right">{scenData.reduce((s, j) => s + j.aiEligibleHrs, 0)}</td><td className="px-3 py-2 text-right" style={{ color: cfg.color }}>{totals.rel}</td><td className="px-3 py-2 text-right">{totals.fut}</td><td className="px-3 py-2 text-right" style={{ color: cfg.color }}>{totals.fte.toFixed(1)}</td><td className="px-3 py-2 text-right"><Badge color="green">{totalPct}%</Badge></td><td className="px-3 py-2 text-right">{totals.ai}</td></tr></tfoot>
          </table>
        </div>
      </Card>}



      {/* Capacity Waterfall */}
      {scenSub === "waterfall" && <Card title="Capacity Waterfall">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">How capacity flows from current state through AI transformation to future state. Each segment is clickable.</div>
        <div className="flex items-end gap-1 justify-center mb-4" style={{ height: 280 }}>
          {[{ label: "Current", value: totals.cur, color: "#D4860A", detail: `${activeJobs.length} roles, ${totals.cur.toLocaleString()}h/mo total capacity` },
            { label: "AI Removed", value: -totals.rel, color: "#EF4444", detail: `${totals.rel.toLocaleString()}h freed by automation (${totalPct}% of current)` },
            { label: "Redesigned", value: Math.round(totals.rel * 0.15), color: "#10B981", detail: `~${Math.round(totals.rel * 0.15).toLocaleString()}h added through role redesign and new tasks` },
            { label: "Net Future", value: totals.fut, color: "#1A2340", detail: `${totals.fut.toLocaleString()}h/mo future capacity (${Math.round(totals.fut / Math.max(totals.cur, 1) * 100)}% of current)` },
          ].map((seg, i) => {
            const maxH = Math.max(totals.cur, totals.fut);
            const barH = Math.abs(seg.value) / maxH * 220;
            return <div key={i} className="flex flex-col items-center cursor-pointer group" onClick={() => showToast(seg.detail)} style={{ width: 100 }}>
              <div className="text-[15px] font-data font-bold mb-1" style={{ color: seg.color }}>{seg.value > 0 ? seg.value.toLocaleString() : seg.value.toLocaleString()}h</div>
              <div className="rounded-t-lg transition-all group-hover:opacity-80" style={{ width: 60, height: barH, background: seg.color, minHeight: 8 }} />
              <div className="text-[14px] text-[var(--text-muted)] mt-1 text-center font-heading">{seg.label}</div>
            </div>;
          })}
        </div>
        <InsightPanel title="Reading the Waterfall" items={[
          `Current capacity: ${totals.cur.toLocaleString()}h/mo across ${activeJobs.length} roles`,
          `AI automation removes ${totals.rel.toLocaleString()}h (${totalPct}% of capacity)`,
          `Role redesign adds ~${Math.round(totals.rel * 0.15).toLocaleString()}h of new strategic tasks`,
          `Net future capacity: ${totals.fut.toLocaleString()}h/mo — ${totals.fut < totals.cur ? "capacity freed for redeployment" : "capacity expanded"}`,
        ]} icon="📊" />
      </Card>}

      {/* FTE Impact Model */}
      {scenSub === "fte" && <Card title="FTE Impact by Function">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">Headcount changes by department showing positions reduced, redeployed, and created.</div>
        {(() => {
          // Group by department
          const byDept: Record<string, { reduced: number; redeployed: number; created: number; current: number }> = {};
          scenData.forEach(j => {
            const dept = j.dept || "Other";
            if (!byDept[dept]) byDept[dept] = { reduced: 0, redeployed: 0, created: 0, current: 0 };
            byDept[dept].current += 1;
            const fteFreed = j.fte;
            if (fteFreed > 0.5) byDept[dept].reduced += Math.round(fteFreed * 0.4);
            byDept[dept].redeployed += Math.round(fteFreed * 0.5);
            byDept[dept].created += Math.round(fteFreed * 0.1);
          });
          const deptData = Object.entries(byDept).map(([dept, d]) => ({ dept, ...d, net: d.current - d.reduced + d.created }));
          return <>
            <div className="grid grid-cols-4 gap-3 mb-5">
              <KpiCard label="Positions Reduced" value={deptData.reduce((s, d) => s + d.reduced, 0)} />
              <KpiCard label="Redeployed" value={deptData.reduce((s, d) => s + d.redeployed, 0)} accent />
              <KpiCard label="Created" value={deptData.reduce((s, d) => s + d.created, 0)} />
              <KpiCard label="Net Change" value={`${deptData.reduce((s, d) => s + d.net - d.current, 0) >= 0 ? "+" : ""}${deptData.reduce((s, d) => s + d.net - d.current, 0)}`} />
            </div>
          <ExpandableChart title="Capacity Waterfall">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 15, fill: "var(--text-muted)" }} width={100} />
                <Tooltip contentStyle={{ background: "#1A2340", border: "1px solid #2A3555", borderRadius: 8, fontSize: 15, color: "#E8ECF4" }} />
                <Legend wrapperStyle={{ fontSize: 15 }} />
                <Bar dataKey="reduced" name="Reduced" fill="#EF4444" stackId="a" />
                <Bar dataKey="redeployed" name="Redeployed" fill="#D4860A" stackId="a" />
                <Bar dataKey="created" name="Created" fill="#10B981" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </ExpandableChart>
          </>;
        })()}
      </Card>}

      {/* Side-by-side comparison with saved scenarios */}
      {scenSub === "compare" && <div>
        {/* Save current scenario */}
        <Card title="Save & Compare Scenarios">
          <div className="flex items-center gap-3 mb-4">
            <input value={scenarioName} onChange={e => setScenarioName(e.target.value)} placeholder="Name this scenario..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] placeholder:text-[var(--text-muted)]" />
            <button onClick={() => {
              if (!scenarioName.trim()) { showToast("Enter a scenario name"); return; }
              const newScen: SavedScenario = { name: scenarioName.trim(), scenario: custom ? "Custom" : scenario, custom, adoption: custom ? custAdopt : Math.round(cfg.adoption * 100), timeline: custom ? custTimeline : cfg.timeline, investment, savedAt: new Date().toLocaleString(), totals: { cur: totals.cur, rel: totals.rel, fte: totals.fte, savings: totals.savings, breakEven, pct: totalPct } };
              setSavedScenarios(prev => [...prev, newScen]);
              setScenarioName("");
              showToast(`Scenario "${newScen.name}" saved`);
            }} className="px-4 py-2 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-all">💾 Save Current</button>
          </div>
          <div className="text-[15px] text-[var(--text-muted)]">Current: {cfg.label} · {Math.round(cfg.adoption * 100)}% adoption · ${investment.toLocaleString()}/role · {savedScenarios.length} saved</div>
        </Card>

        {/* Preset comparison table */}
        <Card title="Preset Scenario Comparison">
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full"><thead><tr className="bg-[var(--surface-2)]"><th className="px-3 py-2 text-left text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Metric</th>{Object.values(SIM_PRESETS).map(p => <th key={p.label} className="px-3 py-2 text-center text-[15px] font-semibold border-b border-[var(--border)]" style={{ color: p.color }}>{p.label}</th>)}</tr></thead>
            <tbody>{["Released Hours","FTE Equivalent","Time Saved %","Annual Savings","Break-Even"].map(m => {
              return <tr key={m} className="border-b border-[var(--border)]"><td className="px-3 py-2 text-[15px] font-semibold">{m}</td>
                {Object.values(SIM_PRESETS).map(p => {
                  const sd = activeJobs.map(j => ({ ...j, released: Math.round(j.aiEligibleHrs * p.adoption * p.ramp) }));
                  const tt = sd.reduce((a, j) => ({ ...a, rel: (a.rel || 0) + j.released, sav: (a.sav || 0) + j.released * j.rate }), { rel: 0, sav: 0 } as Record<string, number>);
                  const tfte = +(tt.rel / 160).toFixed(1);
                  const tpct = Math.round((tt.rel / totals.cur) * 100);
                  const be = tt.sav > 0 ? Math.ceil(totalInv / (tt.sav / 12)) : 999;
                  let val = "";
                  if (m === "Released Hours") val = `${tt.rel.toLocaleString()}h`;
                  else if (m === "FTE Equivalent") val = String(tfte);
                  else if (m === "Time Saved %") val = `${tpct}%`;
                  else if (m === "Annual Savings") val = `$${tt.sav.toLocaleString()}`;
                  else if (m === "Break-Even") val = be <= 36 ? `${be}mo` : "36mo+";
                  return <td key={p.label} className="px-3 py-2 text-center text-[15px] font-bold" style={{ color: p.color }}>{val}</td>;
                })}
              </tr>;
            })}</tbody></table>
          </div>
        </Card>

        {/* Saved scenarios visual comparison */}
        {savedScenarios.length >= 2 && <Card title="Saved Scenarios — Visual Comparison">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* FTE comparison bar chart */}
            <div>
              <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">FTE Released</div>
          <ExpandableChart title="Savings Comparison">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={savedScenarios.map((s, i) => ({ name: s.name, fte: s.totals.fte, fill: COLORS[i % COLORS.length] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
                  <Tooltip contentStyle={{ background: "#1A2340", border: "1px solid #2A3555", borderRadius: 8, fontSize: 15, color: "#E8ECF4" }} />
                  <Bar dataKey="fte" name="FTE Released">{savedScenarios.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
          </ExpandableChart>
            </div>
            {/* Annual savings comparison */}
            <div>
              <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Annual Savings ($)</div>
          <ExpandableChart title="Scenario Radar">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={savedScenarios.map((s, i) => ({ name: s.name, savings: s.totals.savings, fill: COLORS[i % COLORS.length] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 15, fill: "var(--text-muted)" }} tickFormatter={v => `${fmtNum(v)}`} />
                  <Tooltip contentStyle={{ background: "#1A2340", border: "1px solid #2A3555", borderRadius: 8, fontSize: 15, color: "#E8ECF4" }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="savings" name="Annual Savings">{savedScenarios.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
          </ExpandableChart>
            </div>
          </div>

          {/* Radar comparison */}
          {savedScenarios.length >= 2 && <div className="mb-4">
            <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Multi-Dimension Comparison</div>
          <ExpandableChart title="Readiness Dimensions">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={[
                { dim: "FTE Freed", ...Object.fromEntries(savedScenarios.map(s => [s.name, s.totals.fte])) },
                { dim: "Time Saved %", ...Object.fromEntries(savedScenarios.map(s => [s.name, s.totals.pct])) },
                { dim: "Savings ($K)", ...Object.fromEntries(savedScenarios.map(s => [s.name, Math.round(s.totals.savings / 1000)])) },
                { dim: "Adoption %", ...Object.fromEntries(savedScenarios.map(s => [s.name, s.adoption])) },
                { dim: "Speed (inv mo)", ...Object.fromEntries(savedScenarios.map(s => [s.name, Math.max(0, 36 - s.totals.breakEven)])) },
              ]}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 15, fill: "var(--text-muted)" }} />
                <PolarRadiusAxis tick={{ fontSize: 14, fill: "var(--text-muted)" }} />
                {savedScenarios.map((s, i) => <Radar key={s.name} name={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />)}
                <Legend wrapperStyle={{ fontSize: 15 }} />
                <Tooltip contentStyle={{ background: "#1A2340", border: "1px solid #2A3555", borderRadius: 8, fontSize: 15, color: "#E8ECF4" }} />
              </RadarChart>
            </ResponsiveContainer>
          </ExpandableChart>
          </div>}

          {/* Delta table */}
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
              <th className="px-3 py-2 text-left text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Scenario</th>
              <th className="px-3 py-2 text-center text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Adoption</th>
              <th className="px-3 py-2 text-center text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">FTE</th>
              <th className="px-3 py-2 text-center text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Savings</th>
              <th className="px-3 py-2 text-center text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Break-Even</th>
              <th className="px-3 py-2 text-center text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Δ vs First</th>
              <th className="px-3 py-2 text-center text-[15px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]"></th>
            </tr></thead>
            <tbody>{savedScenarios.map((s, i) => {
              const delta = i === 0 ? null : { fte: s.totals.fte - savedScenarios[0].totals.fte, savings: s.totals.savings - savedScenarios[0].totals.savings };
              return <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
                <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-[15px] font-semibold">{s.name}</span><span className="text-[15px] text-[var(--text-muted)]">{s.savedAt}</span></div></td>
                <td className="px-3 py-2 text-center text-[15px] font-data">{s.adoption}%</td>
                <td className="px-3 py-2 text-center text-[15px] font-bold font-data" style={{ color: COLORS[i % COLORS.length] }}>{s.totals.fte.toFixed(1)}</td>
                <td className="px-3 py-2 text-center text-[15px] font-bold font-data">{fmtNum(s.totals.savings)}</td>
                <td className="px-3 py-2 text-center text-[15px] font-data">{s.totals.breakEven <= 36 ? `${s.totals.breakEven}mo` : "36mo+"}</td>
                <td className="px-3 py-2 text-center">{delta ? <span className={`text-[15px] font-bold ${delta.savings > 0 ? "text-[var(--success)]" : "text-[var(--risk)]"}`}>{delta.savings > 0 ? "+" : ""}${fmtNum(delta.savings)} / {delta.fte > 0 ? "+" : ""}{delta.fte.toFixed(1)} FTE</span> : <span className="text-[15px] text-[var(--text-muted)]">baseline</span>}</td>
                <td className="px-3 py-2 text-center"><button onClick={() => { setSavedScenarios(prev => prev.filter((_, j) => j !== i)); showToast("Removed"); }} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--risk)]">✕</button></td>
              </tr>;
            })}</tbody></table>
          </div>
        </Card>}

        {savedScenarios.length < 2 && <Card>
          <div className="text-center py-8">
            <div className="text-3xl mb-2 opacity-40">📊</div>
            <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">Save at least 2 scenarios to compare</div>
            <div className="text-[15px] text-[var(--text-secondary)]">Adjust scenario settings above, then save each configuration to compare them side by side with charts.</div>
          </div>
        </Card>}
      </div>}

      {/* Redeployment allocation */}
      {scenSub === "redeploy" && <Card title="Released Time Redeployment">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">Decide how released hours ({totals.rel.toLocaleString()}h/mo) should be redirected. Adjust sliders — they must total 100%.</div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[{ id: "hv", label: "Higher-Value Work", color: "var(--accent-primary)", desc: "Strategic analysis, relationship building" },
            { id: "inn", label: "Innovation & R&D", color: "var(--purple)", desc: "New products, experimentation" },
            { id: "cap", label: "Capability Building", color: "var(--success)", desc: "Upskilling, cross-training" },
            { id: "opt", label: "Headcount Optimization", color: "var(--risk)", desc: "Attrition, redeployment, reduction" }
          ].map(b => { const pct = (redeployBuckets as Record<string, number>)[b.id] || 25; return <div key={b.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4" style={{ borderLeftWidth: 3, borderLeftColor: b.color }}>
            <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{b.label}</div>
            <div className="text-2xl font-extrabold" style={{ color: b.color }}>{pct}%</div>
            <input type="range" min={0} max={100} step={5} value={pct} onChange={e => setRedeployBuckets((prev: Record<string, number>) => ({ ...prev, [b.id]: Number(e.target.value) }))} className="w-full mt-2" style={{ accentColor: b.color }} />
            <div className="text-[15px] text-[var(--text-muted)] mt-1">{b.desc}</div>
            <div className="text-[15px] font-semibold mt-1" style={{ color: b.color }}>{Math.round(totals.rel * pct / 100).toLocaleString()}h</div>
          </div>; })}
        </div>
        {Object.values(redeployBuckets as Record<string, number>).reduce((s, v) => s + v, 0) !== 100 && <div className="text-[15px] text-[var(--risk)] mb-3">⚠ Buckets total {Object.values(redeployBuckets as Record<string, number>).reduce((s: number, v: number) => s + v, 0)}% — adjust to reach 100%</div>}
        <InsightPanel title="Redeployment Guidance" items={["Default split is 25% across all four buckets — adjust based on your strategy.", "Higher-Value Work: redirect freed capacity to strategic activities.", "Innovation: fund experimentation and new capability development.", "Headcount Optimization: consider natural attrition before reduction."]} icon="🧭" />
      </Card>}

      {/* Investment & ROI */}
      {scenSub === "roi" && <Card title="Investment & ROI Analysis">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Investment" value={fmtNum(totalInv)} />
          <KpiCard label="Annual Savings" value={fmtNum(totals.savings)} accent />
          <KpiCard label="Year 1 Net" value={fmtNum(totals.savings - totalInv)} delta={totals.savings - totalInv > 0 ? "Positive ROI" : "Investment year"} />
          <KpiCard label="3-Year Net Value" value={fmtNum(totals.savings * 3 - totalInv - Math.round(totalInv * 0.15) * 2)} accent />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card title="Cost Breakdown (Estimated)">
            <div className="space-y-3">
              {[{ label: "Tooling & Licensing", pct: 35, color: "var(--accent-primary)" }, { label: "Training & Upskilling", pct: 25, color: "var(--success)" }, { label: "Change Management", pct: 25, color: "var(--purple)" }, { label: "Productivity Loss (ramp)", pct: 15, color: "var(--warning)" }].map(c => <div key={c.label}>
                <div className="flex justify-between text-[15px] mb-1"><span className="text-[var(--text-secondary)]">{c.label}</span><span className="font-semibold">${Math.round(totalInv * c.pct / 100).toLocaleString()} ({c.pct}%)</span></div>
                <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} /></div>
              </div>)}
            </div>
          </Card>
          <Card title="Payback Timeline">
            <div className="space-y-3">
              <div className="flex justify-between text-[15px]"><span className="text-[var(--text-secondary)]">Break-even point</span><span className="font-bold text-[var(--accent-primary)]">{breakEven <= 36 ? `${breakEven} months` : "36+ months"}</span></div>
              <div className="flex justify-between text-[15px]"><span className="text-[var(--text-secondary)]">Monthly savings run-rate</span><span className="font-bold">${Math.round(totals.savings / 12).toLocaleString()}/mo</span></div>
              <div className="flex justify-between text-[15px]"><span className="text-[var(--text-secondary)]">Per-role investment</span><span className="font-bold">${investment.toLocaleString()}</span></div>
              <div className="flex justify-between text-[15px]"><span className="text-[var(--text-secondary)]">Roles in scope</span><span className="font-bold">{activeJobs.length}</span></div>
              <div className="flex justify-between text-[15px]"><span className="text-[var(--text-secondary)]">Recurring cost (15%/yr)</span><span className="font-bold">${Math.round(totalInv * 0.15).toLocaleString()}/yr</span></div>
            </div>
          </Card>
        </div>
      </Card>}
    </div>}

    {tab === "readiness" && <div>
      <TabBar tabs={[{ id: "dashboard", label: "Dashboard" }, { id: "gap", label: "Gap Analysis" }]} active={rdSub} onChange={setRdSub} />

      {rdSub === "dashboard" && <div className="grid grid-cols-12 gap-4">
        {/* Score gauge */}
        <div className="col-span-4"><Card>
          <div className="flex flex-col items-center py-6">
            <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">Overall Score</div>
            <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center flex-col" style={{ borderColor: maturityColor(overallScore) }}>
              <div className="text-3xl font-black" style={{ color: maturityColor(overallScore) }}>{overallScore}</div>
              <div className="text-[15px] font-semibold" style={{ color: maturityColor(overallScore) }}>{maturityLabel(overallScore)}</div>
            </div>
          </div>
        </Card></div>
        {/* Dimension scores */}
        <div className="col-span-8"><Card title="Dimension Scores">
          {dimScores.map(d => {
            const pct = (d.score / 20) * 100;
            const isExpanded = expandDim === d.dim;
            return <div key={d.dim} className="mb-3">
              <div className="flex justify-between items-center mb-1 cursor-pointer" onClick={() => setExpandDim(isExpanded ? null : d.dim)}>
                <span className="text-[15px] font-semibold">{d.dim}</span>
                <div className="flex items-center gap-2"><span className="text-[15px] font-bold" style={{ color: maturityColor(pct) }}>{d.score}/20</span><span className="text-[15px] text-[var(--text-muted)]" style={{ transform: `rotate(${isExpanded ? 90 : 0}deg)`, display: "inline-block", transition: "transform 0.2s" }}>▸</span></div>
              </div>
              <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: maturityColor(pct) }} /></div>
              {isExpanded && <div className="mt-2 bg-[var(--surface-2)] rounded-lg p-3 space-y-2">
                {d.items.map(it => <div key={it.item} className="flex items-center justify-between">
                  <div><div className="text-[15px] font-semibold">{it.item}</div><div className="text-[15px] text-[var(--text-muted)]">{it.notes}</div></div>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => <div key={n} className="w-5 h-5 rounded text-[14px] font-bold flex items-center justify-center" style={{ background: n <= it.score ? maturityColor((it.score / 5) * 100) : "var(--surface-3)", color: n <= it.score ? "#fff" : "var(--text-muted)" }}>{n}</div>)}</div>
                </div>)}
              </div>}
            </div>;
          })}
        </Card></div>
      </div>}

      {rdSub === "gap" && <div>
        <Card title="Gap Analysis — Where to Improve">
          {dimScores.filter(d => d.score < 14).sort((a, b) => a.score - b.score).map(d => {
            const target = 14;
            const gap = target - d.score;
            return <div key={d.dim} className="mb-5 pb-4 border-b border-[var(--border)]">
              <div className="flex justify-between items-center mb-2"><span className="text-[14px] font-bold">{d.dim}</span><div className="flex items-center gap-2"><span className="text-[15px] text-[var(--text-secondary)]">{d.score}</span><span className="text-[15px] text-[var(--text-muted)]">→</span><span className="text-[15px] font-bold text-[var(--accent-primary)]">{target}</span><Badge color="red">-{gap}</Badge></div></div>
              <div className="h-2.5 bg-[var(--surface-2)] rounded-full overflow-hidden relative mb-2"><div className="h-full rounded-full" style={{ width: `${(d.score / 20) * 100}%`, background: maturityColor((d.score / 20) * 100) }} /><div className="absolute top-0 h-full rounded-full opacity-20" style={{ left: `${(d.score / 20) * 100}%`, width: `${(gap / 20) * 100}%`, background: "var(--risk)" }} /></div>
              <div className="space-y-1">{d.items.filter(it => it.score < 4).map(it => <div key={it.item} className="text-[15px] text-[var(--text-secondary)]">▲ <strong>{it.item}</strong>: {it.score}/5 → needs 4/5</div>)}</div>
            </div>;
          })}
          {dimScores.every(d => d.score >= 14) && <div className="text-center py-8 text-[var(--success)] font-bold text-[15px]">✓ All dimensions meet readiness thresholds</div>}
        </Card>
      </div>}
    </div>}

    {/* ═══ SCENARIO NARRATIVE ═══ */}
    {tab === "scenarios" && <ScenarioNarrative
      scenario={cfg.label}
      adoption={Math.round(cfg.adoption * 100)}
      timeline={custom ? custTimeline : (cfg.timeline || 12)}
      totals={totals}
      totalPct={totalPct}
      totalInv={totalInv}
      breakEven={breakEven}
      activeJobs={activeJobs}
      scenData={scenData}
      model={model}
    />}

    {/* ═══ MANAGER READINESS PLANNER ═══ */}
    {tab === "mgrready" && <div className="space-y-5">
      <Card title="Manager Impact Timeline — HRBP Weekly Action List">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">Your managers, sorted by when their teams are affected. Check off actions as you complete them.</div>
        {(() => {
          const catColors: Record<string, string> = { Champion: "var(--success)", "Needs Dev": "var(--warning)", "Flight Risk": "var(--risk)" };
          return <div className="space-y-2">{mgrActions.sort((a, b) => a.month - b.month).map(ma => <div key={ma.id} className="flex items-center gap-3 rounded-xl p-4" style={{ background: ma.done ? "rgba(16,185,129,0.04)" : "var(--surface-1)", border: `1px solid ${ma.done ? "var(--success)" : "var(--border)"}`, borderLeft: `4px solid ${catColors[ma.category] || "var(--text-muted)"}`, opacity: ma.done ? 0.6 : 1 }}>
            <button onClick={() => setMgrActions(prev => prev.map(a => a.id === ma.id ? { ...a, done: !a.done } : a))} className="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all" style={{ borderColor: ma.done ? "var(--success)" : "var(--border)", background: ma.done ? "var(--success)" : "transparent", color: "white" }}>{ma.done ? "✓" : ""}</button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[15px] font-bold text-[var(--text-primary)]">{ma.manager}</span>
                <span className="text-[13px] text-[var(--text-muted)]">{ma.team} reports</span>
                <Badge color={ma.category === "Champion" ? "green" : ma.category === "Flight Risk" ? "red" : "amber"}>{ma.category}</Badge>
                <span className="text-[12px] font-data text-[var(--text-muted)]">{ma.wave} · Month {ma.month}</span>
              </div>
              <div className="text-[14px] text-[var(--text-secondary)]" style={{ textDecoration: ma.done ? "line-through" : "none" }}>{ma.action}</div>
              {ma.concern && <div className="text-[13px] text-[var(--text-muted)] italic mt-0.5">Concern: {ma.concern}</div>}
            </div>
          </div>)}</div>;
        })()}
      </Card>

      {/* Manager Conversation Toolkit */}
      <Card title="Manager Conversation Toolkit">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">Select a manager to see their prep sheet. Customize before your 1:1.</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { mgr: "Sarah Chen", role: "Dir, Technology", team: 42, changing: "12 of 42 roles redesigned, 4 tasks automated, 8 people reskilling", concerns: "Headcount reduction, team morale, her own role", talking: ["Your team isn't shrinking — 4 tasks are automated but those people are being reskilled into higher-value work", "You'll be involved in deciding reskilling paths for your team", "Your role is expanding — managing a team that works WITH AI"], avoid: "Avoid 'restructuring' — use 'role evolution'", followup: "Schedule skip-level with her top 3 ICs" },
            { mgr: "Mike Rodriguez", role: "Mgr, Finance", team: 8, changing: "3 roles enhanced with AI tools, 2 tasks automated", concerns: "His own future, skill relevance, pace of change", talking: ["The Finance function is getting stronger, not smaller", "We're investing in your development — AI leadership training starts next month", "You're critical to this transition — your team trusts you"], avoid: "Don't discuss other managers' situations", followup: "Check in again in 2 weeks, monitor engagement" },
          ].map(sheet => <div key={sheet.mgr} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="text-[16px] font-bold text-[var(--text-primary)] mb-1">{sheet.mgr}</div>
            <div className="text-[13px] text-[var(--text-muted)] mb-3">{sheet.role} · {sheet.team} reports</div>
            <div className="space-y-2 text-[14px]">
              <div><span className="font-bold text-[var(--accent-primary)]">What{"'"}s changing:</span> <span className="text-[var(--text-secondary)]">{sheet.changing}</span></div>
              <div><span className="font-bold text-[var(--warning)]">Likely concerns:</span> <span className="text-[var(--text-secondary)]">{sheet.concerns}</span></div>
              <div><span className="font-bold text-[var(--success)]">Say:</span>{sheet.talking.map((t, i) => <div key={i} className="text-[var(--text-secondary)] ml-3">• &ldquo;{t}&rdquo;</div>)}</div>
              <div><span className="font-bold text-[var(--risk)]">Don{"'"}t say:</span> <span className="text-[var(--text-secondary)]">{sheet.avoid}</span></div>
              <div><span className="font-bold text-[var(--text-muted)]">Follow-up:</span> <span className="text-[var(--text-secondary)]">{sheet.followup}</span></div>
            </div>
          </div>)}
        </div>
      </Card>
    </div>}

    {/* ═══ QUESTION SIMULATOR ═══ */}
    {tab === "questions" && <div className="space-y-5">
      <Card title="Question Simulator — What Will They Ask?">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">Prepare for the questions you{"'"}ll face. Review answers, customize for your context, mark as ready.</div>
        {(() => {
          const audiences = [
            { group: "Individual Contributors", icon: "👤", questions: [
              { q: "Is my job going away?", a: "Your role is evolving, not disappearing. Specific tasks may change, but the core purpose of your role remains. We'll provide full details about what changes and what support is available." },
              { q: "Will I need to learn new skills?", a: "Yes — and we're investing in your development. Training programs are being designed for every affected role, with dedicated learning time built into your schedule." },
              { q: "When will this affect me?", a: "Your function is in the transformation timeline — your manager will share specific dates in the next briefing. Nothing changes without advance notice and preparation." },
              { q: "What if I don't want to change?", a: "We understand change is hard. We'll work with you individually on options. There's support available including coaching, reskilling, and career advisory." },
              { q: "Will my pay change?", a: "Base compensation is protected during the transition. If your role is re-leveled, that could lead to an adjustment — always communicated transparently in advance." },
            ]},
            { group: "Managers", icon: "👔", questions: [
              { q: "How many people am I losing?", a: "Your team structure is being optimized, not necessarily reduced. Your HRBP will walk through the specific impact on your team in your briefing session." },
              { q: "Do I need to have difficult conversations?", a: "Your HRBP will be present for every sensitive conversation. You won't be alone in this — we'll prepare talking points and support materials together." },
              { q: "What support do I get?", a: "Manager toolkit with talking points, dedicated HRBP support, leadership coaching sessions, and a peer network of other managers going through the same transition." },
              { q: "What's the timeline for my team?", a: "Your team's specific timeline is in the wave plan — your HRBP will share this in your individual briefing. You'll have at least 4 weeks' notice before any changes." },
            ]},
            { group: "Executives", icon: "👑", questions: [
              { q: "What's the ROI?", a: "The business case shows [X]x ROI over 3 years. We can walk through the detailed financial model including phased investment options." },
              { q: "What if we lose key talent?", a: "We've identified retention risks and have engagement plans for each. Our data shows [X] high-performers who need proactive attention." },
              { q: "When do we see results?", a: "Quick wins in Months 1-3, measurable impact by Month 6, full transformation by Month 12-18. Milestone tracking is built into the program." },
            ]},
          ];
          return <div className="space-y-4">{audiences.map(aud => <div key={aud.group} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border)]" style={{ background: "var(--surface-2)" }}>
              <span className="text-[16px] font-bold text-[var(--text-primary)] font-heading">{aud.icon} {aud.group}</span>
              <span className="text-[13px] text-[var(--text-muted)] ml-2">{aud.questions.filter(q => qReadyState[`${aud.group}_${q.q}`]).length}/{aud.questions.length} prepared</span>
            </div>
            <div className="divide-y divide-[var(--border)]">{aud.questions.map(q => {
              const key = `${aud.group}_${q.q}`;
              const ready = qReadyState[key];
              return <div key={q.q} className="px-5 py-3 flex gap-3" style={{ opacity: ready ? 0.7 : 1 }}>
                <button onClick={() => setQReadyState(prev => ({ ...prev, [key]: !ready }))} className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all" style={{ borderColor: ready ? "var(--success)" : "var(--border)", background: ready ? "var(--success)" : "transparent", color: "white" }}>{ready ? "✓" : ""}</button>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-1" style={{ textDecoration: ready ? "line-through" : "none" }}>&ldquo;{q.q}&rdquo;</div>
                  <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{q.a}</div>
                </div>
              </div>;
            })}</div>
          </div>)}</div>;
        })()}
      </Card>
    </div>}

    {/* ═══ RIPPLE EFFECT ANALYZER ═══ */}
    {tab === "ripple" && <div className="space-y-5">
      <Card title="Ripple Effect Analyzer — If We Change THIS, What ELSE Changes?">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">Select a change decision to see all downstream impacts across people, process, finance, and risk.</div>
        {(() => {
          const changes: Record<string, { label: string; direct: string; second: { type: string; desc: string; link: string }[]; conflicts: string[] }> = {
            automate_close: { label: "Automate monthly financial close", direct: "12 Finance Analysts affected, 480 hours/month freed",
              second: [
                { type: "👥 People", desc: "12 Finance Analysts need reskilling to FP&A or advisory roles", link: "reskill" },
                { type: "📊 Org", desc: "Finance Manager span drops from 12 to 8 — consider absorbing adjacent team", link: "build" },
                { type: "🏢 Shared Svc", desc: "Shared Services loses 30% Finance workload — capacity for HR admin absorption", link: "opmodel" },
                { type: "⚙️ Process", desc: "3 downstream processes need redesign for automated inputs", link: "opmodel" },
                { type: "💰 Finance", desc: "Month-end overtime budget ($45K/yr) eliminated", link: "simulate" },
                { type: "🛡️ Compliance", desc: "Internal audit needs to update 4 controls for automated process", link: "plan" },
              ],
              conflicts: ["Reskilling doesn't start until Month 5 but automation goes live Month 3 — 2-month gap", "If analysts reskill to FP&A, that team may be over-staffed by Q3"],
            },
            restructure_tech: { label: "Restructure Technology function (reduce 1 layer)", direct: "340 employees affected, 15 managers impacted",
              second: [
                { type: "👥 People", desc: "15 managers need role redefinition — 5 become senior ICs", link: "build" },
                { type: "📊 Org", desc: "Avg span increases from 5.2 to 7.8 — within healthy range", link: "build" },
                { type: "💰 Finance", desc: "Management overhead reduced by $1.2M annually", link: "simulate" },
                { type: "🔄 Change", desc: "High change fatigue risk — Technology already went through reorg 8 months ago", link: "changeready" },
              ],
              conflicts: ["Technology is your #1 strategic capability — restructuring now may slow delivery", "3 Flight Risk managers in Technology may leave during transition"],
            },
          };
          const sel = changes[selectedChange];
          const typeColors: Record<string, string> = { "👥 People": "#0891B2", "📊 Org": "var(--purple)", "🏢 Shared Svc": "var(--accent-primary)", "⚙️ Process": "var(--warning)", "💰 Finance": "var(--success)", "🛡️ Compliance": "var(--risk)", "🔄 Change": "var(--warning)" };
          return <div>
            <div className="flex gap-2 mb-5">{Object.entries(changes).map(([k, v]) => <button key={k} onClick={() => setSelectedChange(k)} className="px-4 py-2 rounded-xl text-[14px] font-semibold transition-all" style={{ background: selectedChange === k ? "rgba(212,134,10,0.12)" : "var(--surface-2)", color: selectedChange === k ? "var(--accent-primary)" : "var(--text-muted)", border: selectedChange === k ? "1px solid rgba(212,134,10,0.3)" : "1px solid var(--border)" }}>{v.label}</button>)}</div>
            {sel && <div className="space-y-4">
              {/* Direct impact */}
              <div className="rounded-xl p-4 border-l-4" style={{ borderLeftColor: "var(--accent-primary)", background: "rgba(212,134,10,0.04)" }}>
                <div className="text-[13px] font-bold text-[var(--accent-primary)] uppercase mb-1">Direct Impact</div>
                <div className="text-[16px] font-semibold text-[var(--text-primary)]">{sel.direct}</div>
              </div>
              {/* Second-order effects */}
              <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Second-Order Effects</div>
              <div className="space-y-2">{sel.second.map((eff, i) => <div key={i} className="flex items-center gap-3 rounded-xl p-4 bg-[var(--surface-1)] border border-[var(--border)]" style={{ borderLeft: `3px solid ${typeColors[eff.type] || "var(--text-muted)"}` }}>
                <span className="text-[14px] font-bold shrink-0" style={{ color: typeColors[eff.type] }}>{eff.type}</span>
                <div className="flex-1 text-[14px] text-[var(--text-secondary)]">{eff.desc}</div>
                {onNavigate && <button onClick={() => onNavigate(eff.link)} className="text-[12px] text-[var(--accent-primary)] shrink-0 hover:underline">View →</button>}
              </div>)}</div>
              {/* Conflicts */}
              {sel.conflicts.length > 0 && <div className="rounded-xl p-4 border border-[var(--risk)]/20 bg-[rgba(239,68,68,0.04)]">
                <div className="text-[14px] font-bold text-[var(--risk)] mb-2">⚠️ What Breaks</div>
                {sel.conflicts.map((c, i) => <div key={i} className="text-[14px] text-[var(--text-secondary)] mb-1">• {c}</div>)}
              </div>}
            </div>}
          </div>;
        })()}
      </Card>
    </div>}

    {/* ═══ TEAM TRANSITION TRACKER ═══ */}
    {tab === "teamtrack" && <div className="space-y-5">
      <Card title="Team Transition Tracker — Your Working Notebook">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">Track your teams through the transition. Log sentiment, check off milestones, flag issues.</div>
        {(() => {
          return <div className="space-y-3">{teamData.map(t => {
            const doneMilestones = t.milestones.filter(m => m.done).length;
            const pct = Math.round((doneMilestones / t.milestones.length) * 100);
            const status = pct >= 75 ? "🟢" : pct >= 25 ? "🟡" : "🔴";
            return <div key={t.mgr} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3"><span>{status}</span><span className="text-[16px] font-bold text-[var(--text-primary)]">{t.mgr}</span><span className="text-[13px] text-[var(--text-muted)]">{t.func} · {t.team} people · {t.wave}</span></div>
                {t.issues > 0 && <span className="px-2 py-0.5 rounded-full text-[12px] font-bold bg-[rgba(239,68,68,0.1)] text-[var(--risk)]">{t.issues} issue{t.issues > 1 ? "s" : ""}</span>}
              </div>
              <div className="flex gap-2 mb-2">{t.milestones.map(m => <div key={m.label} className="flex-1 text-center">
                <div className="text-[11px] text-[var(--text-muted)] mb-1">{m.label}</div>
                <div className="w-full h-2 rounded-full" style={{ background: m.done ? "var(--success)" : "var(--surface-2)" }} />
              </div>)}</div>
              <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${pct}%` }} /></div>
            </div>;
          })}</div>;
        })()}
      </Card>

      {/* Pulse logger */}
      <Card title="Quick Pulse Logger">
        <div className="text-[14px] text-[var(--text-muted)] mb-3">Log sentiment after every interaction. Build a picture over time.</div>
        {(() => {
          return <div>
            <div className="space-y-1 mb-3 max-h-[200px] overflow-y-auto">{pulseLog.slice().reverse().map((p, i) => <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)] text-[14px]">
              <span className="font-data text-[var(--text-muted)] w-20">{p.date}</span>
              <span className="font-semibold text-[var(--text-primary)] w-28">{p.person}</span>
              <span>{["😢","😟","😐","😊","🤩"][p.sentiment - 1] || "😐"}</span>
              <span className="text-[var(--text-secondary)] flex-1">{p.concern}</span>
            </div>)}</div>
            <button onClick={() => { const person = prompt("Person name:"); if (!person) return; const sentiment = Number(prompt("Sentiment (1-5):") || "3"); const concern = prompt("Key concern or note:") || ""; setPulseLog(prev => [...prev, { date: new Date().toISOString().split("T")[0], person, sentiment, concern }]); }} className="px-4 py-2 rounded-xl text-[14px] font-semibold text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] w-full">+ Log a Pulse Check</button>
          </div>;
        })()}
      </Card>
    </div>}

    <NextStepBar currentModuleId="simulate" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 6: ORG DESIGN STUDIO
   Integrated from org-design-studio.jsx — multi-scenario
   org modeling with span analysis, layers, cost, role migration
   ═══════════════════════════════════════════════════════════════ */

const ODS_DEPTS = ["Executive Office","Finance & Accounting","Human Resources","Marketing","Product Design","Supply Chain","IT & Digital","Sales & Commercial","Legal & Compliance","Operations"];
const ODS_LEVELS = ["C-Suite","SVP","VP","Director","Manager","IC"];
const ODS_AVG_COMP: Record<string, number> = { "C-Suite": 420000, SVP: 310000, VP: 235000, Director: 175000, Manager: 125000, IC: 85000 };

// Seeded PRNG for stable ODS data
let _odsSeed = 42;
