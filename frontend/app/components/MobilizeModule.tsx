"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as api from "../../lib/api";
import type { Filters } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, CartesianGrid } from "recharts";
import {
  ViewContext, COLORS, TT,
  KpiCard, Card, Empty, Badge, InsightPanel, NarrativePanel, DataTable,
  BarViz, DonutViz, RadarViz, TabBar, PageHeader, LoadingBar, LoadingSkeleton,
  ModuleExportButton, NextStepBar, ContextStrip, InfoButton,
  useApiData, usePersisted, callAI, showToast, logDec,
  exportToCSV, EmptyWithAction, JobDesignState, fmtNum
} from "./shared";

export function ReskillingPathways({ model, f, onBack, onNavigate, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; viewCtx?: ViewContext }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const [bbbaOverrides2] = usePersisted<Record<string, string>>(`${model}_bbba_overrides`, {});
  useEffect(() => { if (!model) return; setLoading(true); api.getReskillingPathways(model, f).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, [model, f.func, f.jf, f.sf, f.cl, bbbaOverrides2]);

  const pathways = (data?.pathways || []) as { employee: string; target_role: string; readiness_score: number; readiness_band: string; skills_to_develop: { skill: string; current: number; target: number; delta: number; intervention: string; months: number }[]; total_months: number; estimated_cost: number; priority: string }[];
  const summary = (data?.summary || {}) as Record<string, unknown>;

  return <div>
    <PageHeader icon="📚" title={viewCtx?.mode === "employee" ? "My Learning Path" : "Reskilling Pathways"} subtitle="Per-employee learning plans and timelines" onBack={onBack} moduleId="reskill" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="reskilling" label="Reskilling Plans" /></div>}
    {loading && <LoadingBar />}
    <div className="grid grid-cols-5 gap-3 mb-5">
      <KpiCard label="Employees" value={Number(summary.total_employees || 0)} /><KpiCard label="High Priority" value={Number(summary.high_priority || 0)} accent /><KpiCard label="Medium" value={Number(summary.medium_priority || 0)} /><KpiCard label="Avg Duration" value={`${summary.avg_months || "—"}mo`} /><KpiCard label="Investment" value={fmtNum(summary.total_investment || 0)} />
    </div>

    {pathways.slice(0, 20).map((p, i) => <Card key={i} title={`${p.employee} → ${p.target_role}`}>
      <div className="flex items-center gap-3 mb-3">
        <Badge color={p.priority==="High"?"green":p.priority==="Medium"?"amber":"gray"}>{p.priority} Priority</Badge>
        <Badge color={p.readiness_band==="Ready Now"?"green":p.readiness_band==="Coachable"?"amber":"red"}>Readiness: {p.readiness_score}/5</Badge>
        <span className="text-[15px] text-[var(--text-muted)]">{p.total_months} months · {fmtNum(p.estimated_cost)}</span>
      </div>
      {/* Skills timeline */}
      <div className="space-y-2">{(p.skills_to_develop || []).map(s => <div key={s.skill} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-2)]">
        <span className="text-[15px] font-semibold w-36 shrink-0">{s.skill}</span>
        <div className="flex items-center gap-1 text-[15px]"><span style={{color:"var(--warning)"}}>{s.current}</span><span className="text-[var(--text-muted)]">→</span><span style={{color:"var(--success)"}}>{s.target}</span></div>
        <div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${(s.current/s.target)*100}%`,background:"var(--accent-primary)"}} /></div>
        <Badge color={s.intervention==="Course"?"green":s.intervention.includes("Coaching")?"amber":"red"}>{s.intervention}</Badge>
        <span className="text-[15px] text-[var(--text-muted)] w-10 text-right">{s.months}mo</span>
      </div>)}</div>
    </Card>)}
    {pathways.length === 0 && !loading && <Card><Empty text="Complete Skills Gap Analysis and BBBA to generate reskilling pathways" icon="📚" /></Card>}

    {/* Cohort Grouping */}
    {pathways.length > 0 && <Card title="Training Cohorts — Batch by Skill Gap">
      {(() => {
        const cohorts: Record<string, typeof pathways> = {};
        pathways.forEach(p => {
          (p.skills_to_develop || []).forEach(s => {
            if (!cohorts[s.skill]) cohorts[s.skill] = [];
            if (!cohorts[s.skill].some(c => c.employee === p.employee)) cohorts[s.skill].push(p);
          });
        });
        return <div className="grid grid-cols-3 gap-3">{Object.entries(cohorts).sort((a,b) => b[1].length - a[1].length).slice(0,6).map(([skill, members]) => {
          const avgMonths = Math.round(members.reduce((s,m) => s + m.total_months, 0) / members.length);
          const totalCost = members.reduce((s,m) => s + m.estimated_cost, 0);
          return <div key={skill} className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] transition-all hover:border-[var(--accent-primary)]/30">
            <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1">{skill}</div>
            <div className="text-[20px] font-extrabold text-[var(--accent-primary)] mb-1">{members.length} <span className="text-[15px] font-normal text-[var(--text-muted)]">employees</span></div>
            <div className="text-[15px] text-[var(--text-muted)]">Avg {avgMonths}mo · {fmtNum(totalCost)} total</div>
            <div className="flex gap-1 flex-wrap mt-2">{members.slice(0,4).map(m => <span key={m.employee} className="px-1.5 py-0.5 rounded text-[15px] bg-[var(--surface-1)] text-[var(--text-muted)]">{m.employee.split(" ")[0]}</span>)}{members.length > 4 && <span className="text-[15px] text-[var(--text-muted)]">+{members.length-4}</span>}</div>
          </div>;
        })}</div>;
      })()}
    </Card>}

    {/* Budget Allocation */}
    {pathways.length > 0 && <Card title="Budget Allocation by Priority">
      <div className="grid grid-cols-3 gap-4">{[
        {label:"High Priority",filter:(p: typeof pathways[0]) => p.priority==="High",color:"var(--success)"},
        {label:"Medium Priority",filter:(p: typeof pathways[0]) => p.priority==="Medium",color:"var(--warning)"},
        {label:"Low Priority",filter:(p: typeof pathways[0]) => p.priority==="Low",color:"var(--text-muted)"},
      ].map(tier => {
        const group = pathways.filter(tier.filter);
        const cost = group.reduce((s,p) => s + p.estimated_cost, 0);
        return <div key={tier.label} className="rounded-xl p-4 text-center border border-[var(--border)]">
          <div className="text-[15px] font-semibold mb-1" style={{color:tier.color}}>{tier.label}</div>
          <div className="text-[22px] font-extrabold text-[var(--text-primary)]">{fmtNum(cost)}</div>
          <div className="text-[15px] text-[var(--text-muted)]">{group.length} employees</div>
        </div>;
      })}</div>
    </Card>}

    <InsightPanel title="Reskilling Strategy" items={[
      `${pathways.length} employees need reskilling across ${new Set(pathways.map(p => p.target_role)).size} target roles`,
      `High priority: ${pathways.filter(p => p.priority === "High").length} employees — start these immediately`,
      `Average pathway duration: ${Number(summary.avg_months || 0)} months`,
      `Total reskilling investment: ${fmtNum(summary.total_investment || 0)} — invest in high-priority cohorts first`,
    ]} icon="📚" />

    <NextStepBar currentModuleId="reskill" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: TALENT MARKETPLACE
   ═══════════════════════════════════════════════════════════════ */

export function TalentMarketplace({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [shortlisted, setShortlisted] = usePersisted<Record<string, string[]>>(`${model}_mp_shortlist`, {});

  // Read adjacency shortlists to pre-populate
  const [adjShortlists] = usePersisted<Record<string, string[]>>(`${model}_shortlisted`, {});
  useEffect(() => {
    if (!model) return; setLoading(true);
    api.getTalentMarketplace(model, f).then(d => {
      // Merge adjacency shortlists into marketplace shortlists
      if (Object.keys(adjShortlists).length > 0) {
        setShortlisted(prev => {
          const merged = { ...prev };
          Object.entries(adjShortlists).forEach(([role, emps]) => {
            merged[role] = [...new Set([...(merged[role] || []), ...emps])];
          });
          return merged;
        });
      }
      setData(d); setLoading(false);
    }).catch(() => setLoading(false));
  }, [model, f.func, f.jf, f.sf, f.cl, adjShortlists]);

  const marketplace = (data?.marketplace || []) as { target_role: string; candidates: { employee: string; adjacency_pct: number; matching_skills: string[]; gap_skills: string[]; reskill_months: number; readiness_score: number; readiness_band: string; has_pathway: boolean; pathway_cost: number; composite_score: number }[]; fill_recommendation: string }[];
  const summary = (data?.summary || {}) as Record<string, unknown>;

  return <div>
    <PageHeader icon="🏪" title="Talent Marketplace" subtitle="Match internal candidates to redesigned roles" onBack={onBack} moduleId="marketplace" />
    {model && <div className="flex justify-end mb-2"><ModuleExportButton model={model} module="marketplace" label="Marketplace Data" /></div>}
    {loading && <LoadingBar />}
    <div className="grid grid-cols-4 gap-3 mb-5">
      <KpiCard label="Roles to Fill" value={Number(summary.total_roles || 0)} /><KpiCard label="Internal Fill" value={Number(summary.internal_fill || 0)} accent /><KpiCard label="External Fill" value={Number(summary.external_fill || 0)} /><KpiCard label="Match Rate" value={`${Number(summary.total_roles) ? Math.round(Number(summary.internal_fill || 0) / Number(summary.total_roles) * 100) : 0}%`} />
    </div>

    {marketplace.map(m => <Card key={m.target_role} title={m.target_role}>
      <div className="flex items-center gap-2 mb-3">
        <Badge color={m.fill_recommendation==="Internal"?"green":"amber"}>{m.fill_recommendation} Fill Recommended</Badge>
        <span className="text-[15px] text-[var(--text-muted)]">{m.candidates.length} candidates evaluated</span>
      </div>
      <div className="grid grid-cols-4 gap-2">{m.candidates.slice(0, 6).map(c => { const isSl = (shortlisted[m.target_role]||[]).includes(c.employee); return <div key={c.employee} className="bg-[var(--surface-2)] rounded-xl p-3 border transition-all" style={{borderColor:isSl?"var(--success)":"var(--border)"}}>
        <div className="flex items-center justify-between mb-1"><span className="text-[15px] font-semibold truncate flex-1">{c.employee}</span><span className="text-[15px] font-extrabold" style={{color:c.composite_score>=70?"var(--success)":c.composite_score>=50?"var(--warning)":"var(--risk)"}}>{c.composite_score}</span></div>
        <div className="grid grid-cols-3 gap-1 mb-1 text-[15px]">
          <div className="text-center"><span className="font-bold" style={{color:c.adjacency_pct>=70?"var(--success)":"var(--warning)"}}>{c.adjacency_pct}%</span><br/>Adjacency</div>
          <div className="text-center"><span className="font-bold" style={{color:c.readiness_score>=3.5?"var(--success)":"var(--warning)"}}>{c.readiness_score}</span><br/>Readiness</div>
          <div className="text-center"><span className="font-bold">{c.reskill_months}mo</span><br/>Reskill</div>
        </div>
        <div className="text-[15px] text-[var(--success)] truncate">✓ {c.matching_skills.slice(0,2).join(", ")}</div>
        {c.gap_skills.length > 0 && <div className="text-[15px] text-[var(--risk)] truncate">✗ {c.gap_skills.slice(0,2).join(", ")}</div>}
        {c.has_pathway && <div className="text-[15px] text-[var(--purple)]">📚 Pathway: {fmtNum(c.pathway_cost)}</div>}
        <button onClick={() => setShortlisted(prev => { const l = prev[m.target_role]||[]; return {...prev, [m.target_role]: isSl ? l.filter(e=>e!==c.employee) : [...l, c.employee]}; })} className="mt-1 text-[14px] font-semibold w-full py-1 rounded text-center" style={{background:isSl?"rgba(16,185,129,0.1)":"var(--surface-1)",color:isSl?"var(--success)":"var(--text-muted)",border:`1px solid ${isSl?"var(--success)":"var(--border)"}`}}>{isSl?"★ Shortlisted":"☆ Shortlist"}</button>
      </div>; })}</div>
    </Card>)}
    {marketplace.length === 0 && !loading && <Card><Empty text="Complete Skills Adjacency Map to populate the marketplace" icon="🏪" /></Card>}

    {/* Score Methodology */}
    <Card title="How Composite Scores Work">
      <div className="grid grid-cols-3 gap-4 mb-3">{[
        {label:"Adjacency",weight:"50%",desc:"How much current skills overlap with target role requirements",color:"var(--accent-primary)"},
        {label:"Readiness",weight:"30%",desc:"AI readiness score — how prepared the person is for change",color:"var(--success)"},
        {label:"Reskill Time",weight:"20%",desc:"Inverse of months needed — faster reskilling scores higher",color:"var(--purple)"},
      ].map(f => <div key={f.label} className="rounded-xl p-3 text-center border border-[var(--border)]">
        <div className="text-[18px] font-extrabold" style={{color:f.color}}>{f.weight}</div>
        <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1">{f.label}</div>
        <div className="text-[14px] text-[var(--text-muted)]">{f.desc}</div>
      </div>)}</div>
      <div className="text-[15px] text-[var(--text-muted)] text-center">Score ≥70 = strong internal candidate · 50-69 = reskillable · &lt;50 = consider external hire</div>
    </Card>

    {/* Internal Mobility Summary */}
    {marketplace.length > 0 && <Card title="Internal Mobility Summary">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[22px] font-extrabold text-[var(--success)]">{marketplace.filter(m => m.fill_recommendation === "Internal").length}</div><div className="text-[15px] text-[var(--text-muted)]">Fillable Internally</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[22px] font-extrabold text-[var(--risk)]">{marketplace.filter(m => m.fill_recommendation === "External").length}</div><div className="text-[15px] text-[var(--text-muted)]">Need External Hire</div></div>
        <div className="rounded-xl p-4 text-center border border-[var(--border)]"><div className="text-[22px] font-extrabold text-[var(--accent-primary)]">{Object.values(shortlisted).reduce((s, l) => s + l.length, 0)}</div><div className="text-[15px] text-[var(--text-muted)]">Candidates Shortlisted</div></div>
      </div>
    </Card>}

    <NextStepBar currentModuleId="marketplace" onNavigate={onNavigate || onBack} />
  </div>;
}




/* ═══════════════════════════════════════════════════════════════
   MODULE: MANAGER CAPABILITY ASSESSMENT
   ═══════════════════════════════════════════════════════════════ */

const CHANGE_PLAYBOOKS = [
  { name: "AI-First Transformation", desc: "12-month playbook for organizations going heavy on AI adoption across core operations", industry: "Cross-Industry",
    waves: [
      { wave: "Foundation", time: "M1-M3", initiatives: [{ name: "AI readiness assessment" }, { name: "Data infrastructure audit" }, { name: "Change champion network setup" }, { name: "Executive alignment workshop" }] },
      { wave: "Pilot", time: "M3-M6", initiatives: [{ name: "2-3 high-impact pilot deployments" }, { name: "Skills gap analysis for affected roles" }, { name: "Quick-win communication campaign" }] },
      { wave: "Scale", time: "M6-M10", initiatives: [{ name: "Enterprise-wide AI tool rollout" }, { name: "Reskilling program execution" }, { name: "Process redesign implementation" }, { name: "Manager capability building" }] },
      { wave: "Optimize", time: "M10-M12", initiatives: [{ name: "ROI measurement and reporting" }, { name: "Continuous improvement framework" }, { name: "Knowledge transfer to BAU teams" }] },
    ]},
  { name: "Restructuring & Delayering", desc: "Playbook for organizational redesign — flattening layers, adjusting spans, and restructuring reporting lines", industry: "Cross-Industry",
    waves: [
      { wave: "Diagnose", time: "M1-M2", initiatives: [{ name: "Current state org analysis" }, { name: "Span of control benchmarking" }, { name: "Layer count assessment" }] },
      { wave: "Design", time: "M2-M4", initiatives: [{ name: "Target operating model design" }, { name: "Role mapping (current → future)" }, { name: "Impact assessment per function" }] },
      { wave: "Consult", time: "M4-M6", initiatives: [{ name: "Manager notification and coaching" }, { name: "Employee communication" }, { name: "Selection and placement process" }] },
      { wave: "Implement", time: "M6-M9", initiatives: [{ name: "Reporting line changes effective" }, { name: "Transition support programs" }, { name: "Performance monitoring" }] },
    ]},
  { name: "Skills-Based Transformation", desc: "Shift from job-based to skills-based talent architecture — rethinking how work gets done", industry: "Cross-Industry",
    waves: [
      { wave: "Taxonomy", time: "M1-M3", initiatives: [{ name: "Enterprise skills taxonomy build" }, { name: "Skills-to-job mapping" }, { name: "Assessment framework design" }] },
      { wave: "Assessment", time: "M3-M6", initiatives: [{ name: "Organization-wide skills assessment" }, { name: "Gap analysis and prioritization" }, { name: "Career pathway design" }] },
      { wave: "Integration", time: "M6-M9", initiatives: [{ name: "Skills in hiring processes" }, { name: "Skills-based development plans" }, { name: "Internal marketplace launch" }] },
      { wave: "Maturity", time: "M9-M12", initiatives: [{ name: "Skills governance model" }, { name: "Continuous assessment cadence" }, { name: "Skills analytics dashboard" }] },
    ]},
  { name: "Digital Transformation", desc: "Technology modernization playbook focused on workforce impact of digital tools and automation", industry: "Cross-Industry",
    waves: [
      { wave: "Vision", time: "M1-M2", initiatives: [{ name: "Digital maturity assessment" }, { name: "Technology roadmap alignment" }, { name: "Workforce impact modeling" }] },
      { wave: "Build", time: "M2-M5", initiatives: [{ name: "Platform selection and procurement" }, { name: "Integration architecture" }, { name: "Digital skills baseline" }] },
      { wave: "Adopt", time: "M5-M8", initiatives: [{ name: "Phased user rollout" }, { name: "Digital champions program" }, { name: "Change resistance management" }] },
      { wave: "Scale", time: "M8-M12", initiatives: [{ name: "Advanced feature adoption" }, { name: "Process automation expansion" }, { name: "ROI realization tracking" }] },
    ]},
];

export function ChangePlanner({ model, f, onBack, onNavigate, jobStates, viewCtx }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void; jobStates?: Record<string, JobDesignState>; viewCtx?: ViewContext }) {
  const [sub, setSub] = useState("road");
  const [aiChangePlan, setAiChangePlan] = useState<Record<string, unknown>[]>([]);
  // Gantt chart state
  const defaultGanttPhases = [
    { id: "assess", label: "Assess", start: 0, duration: 3, color: "#D4860A", activities: ["Workforce baseline", "AI readiness scan", "Stakeholder mapping", "Risk assessment"], status: "on_track" as string },
    { id: "design", label: "Design", start: 2, duration: 4, color: "#E8C547", activities: ["Role redesign", "Job architecture", "Operating model", "Skill gap analysis"], status: "on_track" as string },
    { id: "pilot", label: "Pilot", start: 5, duration: 3, color: "#C07030", activities: ["Wave 1 rollout", "Training delivery", "Tool deployment", "Feedback collection"], status: "not_started" as string },
    { id: "scale", label: "Scale", start: 7, duration: 5, color: "#D97706", activities: ["Wave 2-3 rollout", "Process optimization", "Manager development", "Performance tracking"], status: "not_started" as string },
    { id: "sustain", label: "Sustain", start: 11, duration: 4, color: "#B8602A", activities: ["Continuous improvement", "Capability maturity", "Knowledge transfer", "BAU transition"], status: "not_started" as string },
  ];
  const [ganttPhases, setGanttPhases] = usePersisted<typeof defaultGanttPhases>(`${model}_ganttPhases`, defaultGanttPhases);
  const [ganttDuration, setGanttDuration] = useState(18);
  const [ganttMilestones, setGanttMilestones] = usePersisted<{ id: string; label: string; month: number }[]>(`${model}_ganttMilestones`, [
    { id: "m1", label: "Steering Committee Approval", month: 1 },
    { id: "m2", label: "Go-Live (Wave 1)", month: 6 },
    { id: "m3", label: "Phase 1 Complete", month: 9 },
  ]);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const ganttEdited = JSON.stringify(ganttPhases) !== JSON.stringify(defaultGanttPhases);
  // Workstream state
  type WsActivity = { id: string; activity: string; owner: string; status: string; priority: string; pct: number };
  type Workstream = { id: string; name: string; icon: string; color: string; collapsed: boolean; items: WsActivity[] };
  const defaultWorkstreams: Workstream[] = [
    { id: "tech", name: "Technology", icon: "💻", color: "#D4860A", collapsed: false, items: [
      { id: "t1", activity: "AI tool selection & procurement", owner: "CTO", status: "In Progress", priority: "High", pct: 40 },
      { id: "t2", activity: "Data pipeline modernization", owner: "VP Engineering", status: "Planned", priority: "High", pct: 0 },
      { id: "t3", activity: "Integration testing", owner: "QA Lead", status: "Not Started", priority: "Medium", pct: 0 },
      { id: "t4", activity: "Security review & compliance", owner: "CISO", status: "In Progress", priority: "High", pct: 30 },
    ]},
    { id: "people", name: "People & Change", icon: "👥", color: "#C07030", collapsed: false, items: [
      { id: "p1", activity: "Reskilling program design", owner: "L&D Director", status: "In Progress", priority: "High", pct: 50 },
      { id: "p2", activity: "Change champion network activation", owner: "Change Lead", status: "Complete", priority: "High", pct: 100 },
      { id: "p3", activity: "Role transition planning", owner: "HRBPs", status: "Planned", priority: "Medium", pct: 0 },
      { id: "p4", activity: "Employee communication rollout", owner: "Comms Director", status: "In Progress", priority: "Medium", pct: 25 },
    ]},
    { id: "process", name: "Process & Operations", icon: "⚙️", color: "#E8C547", collapsed: false, items: [
      { id: "r1", activity: "Process mapping & documentation", owner: "Process Excellence", status: "Complete", priority: "Medium", pct: 100 },
      { id: "r2", activity: "AI workflow design", owner: "Process Lead", status: "In Progress", priority: "High", pct: 60 },
      { id: "r3", activity: "Standard operating procedure updates", owner: "Operations", status: "Not Started", priority: "Medium", pct: 0 },
    ]},
    { id: "gov", name: "Governance & Compliance", icon: "🏛️", color: "#D97706", collapsed: false, items: [
      { id: "g1", activity: "AI governance framework", owner: "Chief Risk Officer", status: "In Progress", priority: "High", pct: 35 },
      { id: "g2", activity: "Decision rights matrix (RACI)", owner: "COO", status: "Planned", priority: "Medium", pct: 0 },
      { id: "g3", activity: "KPI & measurement framework", owner: "Strategy Lead", status: "Planned", priority: "Medium", pct: 0 },
    ]},
  ];
  const [workstreams, setWorkstreams] = usePersisted<Workstream[]>(`${model}_workstreams`, defaultWorkstreams);
  const [wsFilter, setWsFilter] = useState("All");
  const [wsSearch, setWsSearch] = useState("");
  // Stakeholder state (moved from IIFE to prevent hooks violation)
  const [stakeholders, setStakeholders] = usePersisted<{name:string;role:string;quadrant:string;influence:number;sentiment:string}[]>(`${model}_stakeholders`, [
    { name: "CEO", role: "Executive Sponsor", quadrant: "manage", influence: 5, sentiment: "Supportive" },
    { name: "CHRO", role: "Transformation Lead", quadrant: "manage", influence: 5, sentiment: "Champion" },
    { name: "CFO", role: "Budget Holder", quadrant: "satisfy", influence: 4, sentiment: "Cautious" },
    { name: "CTO", role: "Technology Lead", quadrant: "manage", influence: 4, sentiment: "Supportive" },
    { name: "VP Operations", role: "Most Impacted", quadrant: "manage", influence: 3, sentiment: "Resistant" },
    { name: "Union Rep", role: "Employee Voice", quadrant: "inform", influence: 3, sentiment: "Concerned" },
    { name: "Middle Managers", role: "Change Agents", quadrant: "inform", influence: 2, sentiment: "Mixed" },
    { name: "Board Members", role: "Governance", quadrant: "satisfy", influence: 5, sentiment: "Neutral" },
  ]);
  const [dragOverQuad, setDragOverQuad] = useState<string | null>(null);
  // Risk register state (moved from IIFE)
  const [riskItems, setRiskItems] = usePersisted<{id:string;name:string;category:string;prob:number;impact:number;mitigation:string;contingency:string;owner:string;status:string}[]>(`${model}_risk_register`, [
    { id: "r1", name: "Workforce resistance to AI adoption exceeds projections", category: "People", prob: 4, impact: 4, mitigation: "Deploy change champions at 1:5 ratio, run pilot programs", contingency: "Slow rollout timeline, increase training budget", owner: "CHRO", status: "Open" },
    { id: "r2", name: "Critical skill gaps cannot be closed internally", category: "People", prob: 3, impact: 5, mitigation: "Identify external hiring needs early, partner with training providers", contingency: "Engage contractors for bridge period", owner: "L&D Director", status: "Open" },
    { id: "r3", name: "Technology integration delays", category: "Technology", prob: 3, impact: 4, mitigation: "Parallel workstreams for integration testing", contingency: "Manual workarounds during transition", owner: "CTO", status: "Open" },
    { id: "r4", name: "Budget overrun on reskilling investment", category: "Financial", prob: 2, impact: 4, mitigation: "Phase investments across quarters, track ROI monthly", contingency: "Prioritize highest-impact cohorts only", owner: "CFO", status: "Open" },
    { id: "r5", name: "Regulatory compliance gaps during transition", category: "Regulatory", prob: 2, impact: 5, mitigation: "Early engagement with legal and compliance teams", contingency: "Pause AI deployment in regulated areas", owner: "General Counsel", status: "Open" },
  ]);
  const [riskSortCol, setRiskSortCol] = useState("score");
  const [addingRisk, setAddingRisk] = useState(false);
  const [newRiskForm, setNewRiskForm] = useState({name:"",category:"People",prob:3,impact:3,mitigation:"",contingency:"",owner:""});
  const [data, cpLoading] = useApiData(() => sub === "road" ? api.getRoadmap(model, f) : api.getRisk(model, f), [sub, model, f.func, f.jf, f.sf, f.cl]);
  // Job view: filter to this role
  if (viewCtx?.mode === "job" && viewCtx?.job) return <div>
    <PageHeader icon="💼" title={`Change Plan — ${viewCtx.job}`} subtitle="Initiatives affecting this role" onBack={onBack} moduleId="plan" />
    <ContextStrip items={[`Showing change initiatives relevant to ${viewCtx.job}. Switch to Org View to see the full roadmap.`]} />
    <TabBar tabs={[{ id: "road", label: "Role Roadmap" }, { id: "risk", label: "Role Risks" }]} active={sub} onChange={setSub} />
    {sub === "road" ? (() => { const d = data as Record<string, unknown> | null; const roadmap = ((d?.roadmap ?? []) as Record<string, unknown>[]).filter(r => String(r["Job Title"] || r.initiative || "").toLowerCase().includes((viewCtx.job || "").toLowerCase().split(" ")[0])); return <div>
      <div className="grid grid-cols-3 gap-3 mb-5"><KpiCard label="Initiatives" value={roadmap.length || "All"} accent /><KpiCard label="Source" value={String((d?.summary as Record<string, unknown>)?.source ?? "—")} /><KpiCard label="Status" value="Planned" /></div>
      <Card title={`Initiatives for ${viewCtx.job}`}>{roadmap.length ? <DataTable data={roadmap} /> : <div className="text-[15px] text-[var(--text-secondary)] py-4">No specific initiatives found for this role. Showing the full roadmap below.</div>}</Card>
      {roadmap.length === 0 && <Card title="Full Roadmap"><DataTable data={((d?.roadmap ?? []) as Record<string, unknown>[])} /></Card>}
    </div>; })() : (() => { const d = data as Record<string, unknown> | null; return <div>
      <Card title="Risks Affecting This Role"><DataTable data={((d?.high_risk_tasks ?? []) as Record<string, unknown>[]).filter(r => String(r["Job Title"] || r.Task || "").toLowerCase().includes((viewCtx.job || "").toLowerCase().split(" ")[0]))} /></Card>
    </div>; })()}
    <NextStepBar currentModuleId="plan" onNavigate={onNavigate || onBack} />
  </div>;

  // Employee view: personal change journey
  if (viewCtx?.mode === "employee" && viewCtx?.employee) return <div>
    <PageHeader icon="👤" title="My Change Journey" subtitle={`What's changing for ${viewCtx.employee}`} onBack={onBack} moduleId="plan" />
    <Card title="Your Transformation Timeline">
      <div className="space-y-4">
        {[{ wave: "Wave 1", time: "Month 1-3", title: "Awareness & Training", items: ["AI tool introduction workshops", "New process documentation shared", "Pilot group participation opportunity"], color: "var(--accent-primary)" },
          { wave: "Wave 2", time: "Month 4-6", title: "Transition & Practice", items: ["AI tools integrated into daily workflow", "Reduced manual task load", "Coaching sessions with change champion"], color: "var(--success)" },
          { wave: "Wave 3", time: "Month 7-12", title: "New Normal", items: ["Full adoption of AI-augmented processes", "Role evolution complete", "Focus shifts to higher-value activities"], color: "var(--purple)" }
        ].map((w, i) => <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center shrink-0"><div className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-bold text-white" style={{ background: w.color }}>{i + 1}</div>{i < 2 && <div className="w-px h-full mt-1" style={{ background: w.color, opacity: 0.2 }} />}</div>
          <div className="flex-1 pb-2"><div className="flex items-baseline gap-2 mb-1"><span className="text-[15px] font-bold text-[var(--text-primary)]">{w.title}</span><Badge color="gray">{w.time}</Badge></div><div className="space-y-1">{w.items.map((item, j) => <div key={j} className="text-[15px] text-[var(--text-secondary)] pl-3 relative"><span className="absolute left-0 text-[var(--text-muted)]">·</span>{item}</div>)}</div></div>
        </div>)}
      </div>
    </Card>
    <InsightPanel title="Support Available" items={["Your manager will be your primary support during the transition.", "Change champions in each department can answer questions.", "Weekly office hours with the transformation team.", "Self-paced learning modules available on the company LMS."]} icon="🛡️" />
    <NextStepBar currentModuleId="plan" onNavigate={onNavigate || onBack} />
  </div>;

  return <div>
    <ContextStrip items={["Phase 3: Deliver — Your transformation roadmap. Auto-generates from Phase 2 decisions or upload your own change plan."]} />
    <PageHeader icon="🚀" title="Change Planner" subtitle="Sequence initiatives and manage transformation risk" onBack={onBack} moduleId="plan" />
    <TabBar tabs={[{ id: "road", label: "Roadmap" }, { id: "gantt", label: "📅 Gantt" }, { id: "workstreams", label: "🔧 Workstreams" }, { id: "stakeholders", label: "👥 Stakeholders" }, { id: "risks", label: "⚠️ Risk Register" }, { id: "comms", label: "📣 Comms Plan" }, { id: "playbook", label: "📖 Playbooks" }]} active={sub} onChange={setSub} />
    {sub === "road" && <div className="bg-gradient-to-r from-[rgba(224,144,64,0.06)] to-transparent border border-[rgba(224,144,64,0.15)] rounded-xl p-4 mb-4 flex items-center justify-between">
      <div><div className="text-[15px] font-bold text-[var(--text-primary)]">☕ AI can build your change roadmap</div><div className="text-[15px] text-[var(--text-muted)]">Generates initiatives, waves, owners, and risks from your transformation decisions</div></div>
      <button onClick={async () => {
        const context = Object.entries(jobStates).filter(([,s]) => s.finalized || s.deconSubmitted).map(([role, s]) => {
          const decisions = s.redeployRows.map(r => `${r["Task Name"]}: ${r.Decision}`).join(", ");
          return `${role}: ${decisions || "tasks defined but not deployed"}`;
        }).join("; ");
        if (!context) return;
        // Fetch change readiness data to inform the plan
        let readinessContext = "";
        try {
          const crData = await api.getChangeReadiness(model);
          const cr = crData as Record<string, unknown>;
          const segments = cr?.segments as Record<string, unknown>[] | undefined;
          if (segments?.length) {
            const highRisk = segments.filter(s => String(s.quadrant || "").toLowerCase().includes("risk")).length;
            const champions = segments.filter(s => String(s.quadrant || "").toLowerCase().includes("champion")).length;
            readinessContext = ` Change Readiness: ${highRisk} high-risk employees needing intensive support, ${champions} champions available as advocates.`;
          }
          const summary = cr?.summary as Record<string, unknown> | undefined;
          if (summary) {
            readinessContext += ` Avg readiness: ${summary.avg_readiness || "—"}/5. High-impact segment: ${summary.high_impact_pct || "—"}%.`;
          }
        } catch {}
        const raw = await callAI("Return ONLY valid JSON array.", `Based on these work design decisions, generate 6-8 change management initiatives.${readinessContext} Context: ${context}. Return JSON array: [{"initiative":"name","description":"what","owner":"role title","priority":"High/Medium/Low","wave":"Wave 1/Wave 2/Wave 3","start":"2026-Q1","end":"2026-Q2","risk":"main risk","dependency":"what it depends on"}]`);
        try {
          const initiatives = JSON.parse(raw.replace(/\`\`\`json\n?/g,"").replace(/\`\`\`\n?/g,"").trim());
          if (Array.isArray(initiatives)) setAiChangePlan(initiatives);
        } catch {}
      }} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>☕ Auto-Build Plan</button>
    </div>}
    {aiChangePlan.length > 0 && sub === "road" && <Card title="☕ AI-Generated Change Plan">
      <div className="flex justify-end mb-2"><button onClick={() => setAiChangePlan([])} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--risk)]">Clear Plan ✕</button></div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]"><table className="w-full text-left text-[15px]"><thead><tr className="bg-[var(--surface-2)]">{["Initiative","Owner","Priority","Wave","Risk",""].map(h => <th key={h} className="px-3 py-2 border-b border-[var(--border)] text-[15px] uppercase text-[var(--text-muted)] font-semibold">{h}</th>)}</tr></thead><tbody>{aiChangePlan.map((row, i) => <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
        <td className="px-3 py-2 min-w-[180px]"><EditableCell value={String(row.initiative || "")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], initiative: v }; setAiChangePlan(n); }} /></td>
        <td className="px-3 py-2 min-w-[120px]"><EditableCell value={String(row.owner || "")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], owner: v }; setAiChangePlan(n); }} /></td>
        <td className="px-3 py-2 min-w-[90px]"><SelectCell value={String(row.priority || "Medium")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], priority: v }; setAiChangePlan(n); }} options={["High","Medium","Low"]} /></td>
        <td className="px-3 py-2 min-w-[90px]"><SelectCell value={String(row.wave || "Wave 1")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], wave: v }; setAiChangePlan(n); }} options={["Wave 1","Wave 2","Wave 3","Wave 4"]} /></td>
        <td className="px-3 py-2 min-w-[140px]"><EditableCell value={String(row.risk || "")} onChange={v => { const n = [...aiChangePlan]; n[i] = { ...n[i], risk: v }; setAiChangePlan(n); }} /></td>
        <td className="px-3 py-2"><button onClick={() => setAiChangePlan(aiChangePlan.filter((_, j) => j !== i))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px]">✕</button></td>
      </tr>)}</tbody></table></div>
      <button onClick={() => setAiChangePlan([...aiChangePlan, { initiative: "New Initiative", owner: "", priority: "Medium", wave: "Wave 1", risk: "" }])} className="mt-2 text-[15px] text-[var(--accent-primary)] hover:underline">+ Add Initiative</button>
    </Card>}
    {/* Gantt Chart — visual timeline of AI-generated initiatives */}
    {aiChangePlan.length > 0 && sub === "road" && <Card title="📊 Initiative Gantt Chart">
      <div className="text-[15px] text-[var(--text-muted)] mb-3">Each bar represents an initiative positioned by wave and colored by priority.</div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 600 }}>
          {/* Timeline header */}
          <div className="flex items-center mb-2">
            <div style={{ width: 180, flexShrink: 0 }} />
            {["Wave 1", "Wave 2", "Wave 3", "Wave 4"].map((w, i) => <div key={w} className="flex-1 text-center text-[15px] font-bold uppercase tracking-wider" style={{ color: COLORS[i % COLORS.length] }}>{w}</div>)}
          </div>
          {/* Grid lines */}
          <div className="relative">
            <div className="absolute inset-0 flex" style={{ pointerEvents: "none" }}>
              <div style={{ width: 180, flexShrink: 0 }} />
              {[0,1,2,3].map(i => <div key={i} className="flex-1 border-l border-[var(--border)]" style={{ borderStyle: "dashed" }} />)}
            </div>
            {/* Bars */}
            <div className="space-y-1.5 relative">
              {aiChangePlan.map((row, i) => {
                const wave = String(row.wave || "Wave 1");
                const waveIdx = ["Wave 1","Wave 2","Wave 3","Wave 4"].indexOf(wave);
                const startPct = Math.max(0, waveIdx) * 25;
                const widthPct = wave.includes("4") ? 25 : (row.end && String(row.end).includes("Q") ? 
                  Math.max(25, (["Wave 1","Wave 2","Wave 3","Wave 4"].indexOf(wave) + 2) * 25 - startPct) : 25);
                const priColor = row.priority === "High" ? "var(--risk)" : row.priority === "Low" ? "var(--success)" : "var(--accent-primary)";
                return <div key={i} className="flex items-center" style={{ height: 28 }}>
                  <div className="text-[15px] font-semibold text-[var(--text-primary)] truncate" style={{ width: 180, flexShrink: 0, paddingRight: 8 }} title={String(row.initiative || "")}>{String(row.initiative || "").length > 22 ? String(row.initiative || "").slice(0,20) + "…" : String(row.initiative || "")}</div>
                  <div className="flex-1 relative h-full flex items-center">
                    <div className="absolute rounded-md flex items-center px-2" style={{ 
                      left: `${startPct}%`, width: `${Math.min(widthPct, 100 - startPct)}%`, 
                      height: 20, background: `${priColor}20`, border: `1px solid ${priColor}40`,
                      transition: "all 0.3s"
                    }}>
                      <span className="text-[14px] font-semibold truncate" style={{ color: priColor }}>{String(row.owner || "")}</span>
                    </div>
                  </div>
                </div>;
              })}
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 pt-2 border-t border-[var(--border)]">
            {[{l:"High Priority",c:"var(--risk)"},{l:"Medium",c:"var(--accent-primary)"},{l:"Low",c:"var(--success)"}].map(x => <div key={x.l} className="flex items-center gap-1.5 text-[14px] text-[var(--text-muted)]"><div className="w-3 h-2 rounded-sm" style={{ background: `${x.c}30`, border: `1px solid ${x.c}50` }} />{x.l}</div>)}
          </div>
        </div>
      </div>
    </Card>}
    {sub === "road" ? (() => { const d = data as Record<string, unknown> | null; const s = ((d?.summary ?? {}) as Record<string, unknown>);
      const wd = ((d?.wave_distribution ?? {}) as Record<string, number>);
      const waves = Object.entries(wd); const pd = ((d?.priority_distribution ?? {}) as Record<string, number>); return <div><div className="grid grid-cols-4 gap-3 mb-5"><KpiCard label="Initiatives" value={s.total as number ?? 0} accent /><KpiCard label="High Priority" value={s.high_priority as number ?? 0} /><KpiCard label="Waves" value={s.waves as number ?? 0} /><KpiCard label="Source" value={String(s.source ?? "—")} /></div>
      {/* Timeline visualization */}
      {waves.length > 0 && <Card title="Transformation Timeline">
        <div className="flex items-end gap-1 h-32 mb-2">{waves.map(([name, count], i) => <div key={name} className="flex-1 flex flex-col items-center justify-end">
          <div className="text-[15px] font-bold mb-1" style={{ color: COLORS[i % COLORS.length] }}>{count}</div>
          <div className="w-full rounded-t transition-all" style={{ height: `${Math.max((count / Math.max(...Object.values(wd), 1)) * 100, 8)}%`, background: `${COLORS[i % COLORS.length]}40`, border: `1px solid ${COLORS[i % COLORS.length]}60` }} />
          <div className="text-[15px] text-[var(--text-muted)] mt-2 font-semibold">{name}</div>
        </div>)}</div>
        <div className="flex gap-0">{waves.map(([name], i) => <div key={name} className="flex-1 h-2 first:rounded-l last:rounded-r" style={{ background: COLORS[i % COLORS.length] }} />)}</div>
        <div className="flex justify-between mt-1 text-[15px] text-[var(--text-muted)]"><span>Start</span><span>End</span></div>
      </Card>}<div className="grid grid-cols-12 gap-4"><div className="col-span-7"><Card title="Change Plan"><DataTable data={((d?.roadmap ?? []) as Record<string, unknown>[])} /></Card></div><div className="col-span-5"><Card title="Priority"><DonutViz data={Object.entries(pd).map(([n, v]) => ({ name: n, value: v }))} /></Card><Card title="Waves"><BarViz data={Object.entries(wd).map(([n, v]) => ({ Wave: n, Count: v }))} labelKey="Wave" valueKey="Count" color="var(--warning)" /></Card></div></div></div>; })() : <div><Empty text="Build a roadmap using the AI button above, or go to the Risk Register tab to manage risks" icon="🚀" /></div>}
    {/* ═══ INTERACTIVE GANTT CHART ═══ */}
    {sub === "gantt" && <div>
      <Card title={ganttEdited ? "Custom Transformation Roadmap" : "Transformation Gantt Chart"}>
        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-[var(--text-muted)]">Duration:</span>
            <select value={ganttDuration} onChange={e => setGanttDuration(Number(e.target.value))} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none">
              {[12, 15, 18, 24, 36].map(m => <option key={m} value={m}>{m} months</option>)}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => { const id = `p${Date.now()}`; const colors = ["#D4860A","#E8C547","#C07030","#D97706","#B8602A","#8B5CF6"]; setGanttPhases(prev => [...prev, { id, label: "New Phase", start: Math.max(0, ...prev.map(p => p.start + p.duration)), duration: 2, color: colors[prev.length % colors.length], activities: ["Define activities..."], status: "not_started" }]); }} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5 transition-all">+ Add Phase</button>
            <button onClick={() => { const id = `m${Date.now()}`; setGanttMilestones(prev => [...prev, { id, label: "New Milestone", month: 6 }]); }} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent-primary)]/30 transition-all">+ Milestone</button>
            {ganttEdited && <button onClick={() => setGanttPhases(defaultGanttPhases)} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Reset</button>}
          </div>
        </div>

        {/* Month headers */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(800, ganttDuration * 50) }}>
            {/* Milestones row */}
            <div className="flex mb-1 ml-32 relative h-6">
              {ganttMilestones.map(ms => <div key={ms.id} className="absolute flex flex-col items-center group" style={{ left: `${(ms.month / ganttDuration) * 100}%`, transform: "translateX(-50%)" }}>
                <div style={{ width: 10, height: 10, background: "#EF4444", transform: "rotate(45deg)" }} />
                <div className="text-[13px] text-[var(--risk)] font-semibold whitespace-nowrap mt-1 opacity-70 group-hover:opacity-100">{ms.label}</div>
              </div>)}
            </div>

            {/* Month labels */}
            <div className="flex mb-2 ml-32">
              {Array.from({ length: ganttDuration }, (_, i) => {
                const d = new Date(); d.setMonth(d.getMonth() + i);
                return <div key={i} className="flex-1 text-[13px] text-[var(--text-muted)] text-center font-data border-l border-[var(--border)]" style={{ borderColor: i === 0 ? "transparent" : undefined }}>{d.toLocaleDateString("en", { month: "short", year: "2-digit" })}</div>;
              })}
            </div>

            {/* Phase bars */}
            <div className="space-y-2">
              {ganttPhases.map((p, pi) => {
                const statusTint = p.status === "complete" ? "rgba(16,185,129,0.08)" : p.status === "at_risk" ? "rgba(239,68,68,0.06)" : "transparent";
                return <div key={p.id} style={{ background: statusTint, borderRadius: 8, padding: "4px 0" }}>
                  <div className="flex items-center">
                    <div className="w-32 shrink-0 flex items-center gap-2 px-2">
                      <span className="text-[15px] font-semibold truncate" style={{ color: p.color }}>{p.label}</span>
                      <button onClick={() => setEditingPhase(editingPhase === p.id ? null : p.id)} className="text-[14px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] shrink-0 opacity-0 group-hover:opacity-100" style={{ opacity: editingPhase === p.id ? 1 : undefined }} title="Edit">✎</button>
                    </div>
                    <div className="flex-1 relative h-8">
                      {/* Grid lines */}
                      {Array.from({ length: ganttDuration }, (_, i) => <div key={i} className="absolute top-0 bottom-0 border-l border-[var(--border)]" style={{ left: `${(i / ganttDuration) * 100}%`, opacity: 0.3 }} />)}
                      {/* Phase bar */}
                      <div className="absolute h-full rounded-lg flex items-center px-3 text-[14px] font-bold text-white cursor-pointer transition-all hover:brightness-110" style={{ left: `${(p.start / ganttDuration) * 100}%`, width: `${Math.max((p.duration / ganttDuration) * 100, 3)}%`, background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)`, boxShadow: `0 2px 8px ${p.color}30` }} onClick={() => setEditingPhase(editingPhase === p.id ? null : p.id)}>
                        {p.duration}mo
                      </div>
                    </div>
                  </div>
                  {/* Inline edit panel */}
                  {editingPhase === p.id && <div className="ml-32 mt-2 mb-2 p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div><div className="text-[13px] text-[var(--text-muted)] mb-1">Name</div><input value={p.label} onChange={e => setGanttPhases(prev => prev.map(x => x.id === p.id ? { ...x, label: e.target.value } : x))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none" /></div>
                      <div><div className="text-[13px] text-[var(--text-muted)] mb-1">Start Month</div><input type="number" min={0} max={ganttDuration - 1} value={p.start} onChange={e => setGanttPhases(prev => prev.map(x => x.id === p.id ? { ...x, start: Math.max(0, Number(e.target.value)) } : x))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none" /></div>
                      <div><div className="text-[13px] text-[var(--text-muted)] mb-1">Duration (months)</div><input type="number" min={1} max={24} value={p.duration} onChange={e => setGanttPhases(prev => prev.map(x => x.id === p.id ? { ...x, duration: Math.max(1, Number(e.target.value)) } : x))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none" /></div>
                      <div><div className="text-[13px] text-[var(--text-muted)] mb-1">Status</div><select value={p.status} onChange={e => setGanttPhases(prev => prev.map(x => x.id === p.id ? { ...x, status: e.target.value } : x))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none">
                        <option value="not_started">Not Started</option><option value="on_track">On Track</option><option value="at_risk">At Risk</option><option value="delayed">Delayed</option><option value="complete">Complete</option>
                      </select></div>
                    </div>
                    <div className="text-[13px] text-[var(--text-muted)] mb-1">Activities</div>
                    <div className="space-y-1 mb-2">{p.activities.map((a, ai) => <div key={ai} className="flex items-center gap-2">
                      <input value={a} onChange={e => { const acts = [...p.activities]; acts[ai] = e.target.value; setGanttPhases(prev => prev.map(x => x.id === p.id ? { ...x, activities: acts } : x)); }} className="flex-1 bg-[var(--surface-1)] border border-[var(--border)] rounded px-2 py-1 text-[14px] text-[var(--text-primary)] outline-none" />
                      <button onClick={() => { const acts = p.activities.filter((_, i) => i !== ai); setGanttPhases(prev => prev.map(x => x.id === p.id ? { ...x, activities: acts } : x)); }} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px]">✕</button>
                    </div>)}</div>
                    <div className="flex gap-2">
                      <button onClick={() => setGanttPhases(prev => prev.map(x => x.id === p.id ? { ...x, activities: [...x.activities, "New activity"] } : x))} className="text-[14px] text-[var(--accent-primary)]">+ Add activity</button>
                      <button onClick={() => { if (confirm("Delete this phase?")) setGanttPhases(prev => prev.filter(x => x.id !== p.id)); setEditingPhase(null); }} className="ml-auto text-[14px] text-[var(--risk)]">Delete Phase</button>
                    </div>
                  </div>}
                  {/* Activities (read-only when not editing) */}
                  {editingPhase !== p.id && <div className="flex ml-32 mt-1 flex-wrap gap-x-4">
                    {p.activities.slice(0, 4).map((a, i) => <div key={i} className="text-[14px] text-[var(--text-muted)]">{"·"} {a}</div>)}
                    {p.activities.length > 4 && <span className="text-[14px] text-[var(--text-muted)] opacity-50">+{p.activities.length - 4} more</span>}
                  </div>}
                </div>;
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 pt-3 border-t border-[var(--border)] flex-wrap">
              {ganttPhases.map(p => <div key={p.id} className="flex items-center gap-1.5 text-[14px] text-[var(--text-muted)]"><div className="w-3 h-2 rounded-sm" style={{ background: p.color }} />{p.label} ({p.duration}mo)</div>)}
              <div className="flex items-center gap-1.5 text-[14px] text-[var(--text-muted)] ml-auto"><div style={{ width: 8, height: 8, background: "#EF4444", transform: "rotate(45deg)" }} /> Milestone</div>
            </div>
          </div>
        </div>
      </Card>
    </div>}

    {/* ═══ WORKSTREAMS ═══ */}
    {sub === "workstreams" && (() => {
      const totalActs = workstreams.reduce((s, ws) => s + ws.items.length, 0);
      const completedActs = workstreams.reduce((s, ws) => s + ws.items.filter(a => a.status === "Complete").length, 0);
      const atRiskActs = workstreams.reduce((s, ws) => s + ws.items.filter(a => a.status === "At Risk" || a.status === "Blocked").length, 0);
      const overallPct = totalActs > 0 ? Math.round((completedActs / totalActs) * 100) : 0;
      const statuses = ["Not Started", "Planned", "In Progress", "Complete", "At Risk", "Blocked"];
      const statusColors: Record<string, string> = { Complete: "var(--success)", "In Progress": "var(--accent-primary)", Planned: "var(--warning)", "Not Started": "var(--text-muted)", "At Risk": "var(--risk)", Blocked: "var(--risk)" };
      const priorities = ["High", "Medium", "Low"];
      const priColors: Record<string, string> = { High: "var(--risk)", Medium: "var(--warning)", Low: "var(--success)" };
      const updateActivity = (wsId: string, actId: string, field: string, value: string | number) => {
        setWorkstreams(prev => prev.map(ws => ws.id === wsId ? { ...ws, items: ws.items.map(a => a.id === actId ? { ...a, [field]: value } : a) } : ws));
      };

      return <div>
        {/* Summary KPIs */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          <KpiCard label="Workstreams" value={workstreams.length} /><KpiCard label="Activities" value={totalActs} /><KpiCard label="Complete" value={`${overallPct}%`} accent /><KpiCard label="At Risk" value={atRiskActs} /><KpiCard label="High Priority" value={workstreams.reduce((s, ws) => s + ws.items.filter(a => a.priority === "High").length, 0)} />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input value={wsSearch} onChange={e => setWsSearch(e.target.value)} placeholder="Search activities..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none w-48" />
          <select value={wsFilter} onChange={e => setWsFilter(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[15px] text-[var(--text-primary)] outline-none">
            <option value="All">All Statuses</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            <button onClick={() => { const id = `ws${Date.now()}`; const colors = ["#8B5CF6","#D4860A","#C07030","#E8C547","#D97706"]; setWorkstreams(prev => [...prev, { id, name: "New Workstream", icon: "📋", color: colors[prev.length % colors.length], collapsed: false, items: [{ id: `${id}_a1`, activity: "Define activities...", owner: "TBD", status: "Not Started", priority: "Medium", pct: 0 }] }]); }} className="px-3 py-1.5 rounded-lg text-[14px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">+ Workstream</button>
          </div>
        </div>

        {/* Workstream cards */}
        {workstreams.map(ws => {
          const wsComplete = ws.items.length > 0 ? Math.round(ws.items.filter(a => a.status === "Complete").length / ws.items.length * 100) : 0;
          const filtered = ws.items.filter(a => (wsFilter === "All" || a.status === wsFilter) && (!wsSearch || a.activity.toLowerCase().includes(wsSearch.toLowerCase())));
          return <div key={ws.id} className="mb-4 rounded-xl border overflow-hidden" style={{ borderColor: `${ws.color}20`, borderLeft: `4px solid ${ws.color}` }}>
            {/* Header — click to collapse */}
            <button onClick={() => setWorkstreams(prev => prev.map(w => w.id === ws.id ? { ...w, collapsed: !w.collapsed } : w))} className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--surface-1)] hover:bg-[var(--hover)] transition-all text-left">
              <span className="text-xl">{ws.icon}</span>
              <span className="text-[16px] font-bold text-[var(--text-primary)] flex-1">{ws.name}</span>
              <span className="text-[14px] text-[var(--text-muted)]">{ws.items.length} activities</span>
              <div className="w-16 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden"><div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${wsComplete}%` }} /></div>
              <span className="text-[14px] font-bold" style={{ color: wsComplete === 100 ? "var(--success)" : "var(--text-muted)" }}>{wsComplete}%</span>
              <span className="text-[14px] text-[var(--text-muted)]">{ws.collapsed ? "▸" : "▾"}</span>
            </button>
            {/* Activities table */}
            {!ws.collapsed && <div className="px-4 pb-3">
              <table className="w-full text-[15px]"><thead><tr className="bg-[var(--surface-2)]">
                {["Activity", "Owner", "Status", "Priority", "Progress"].map(h => <th key={h} className="px-2 py-1.5 text-left text-[14px] font-semibold text-[var(--text-muted)] uppercase">{h}</th>)}
                <th className="w-8" />
              </tr></thead>
              <tbody>{filtered.map(item => <tr key={item.id} className="border-t border-[var(--border)] hover:bg-[var(--hover)]">
                <td className="px-2 py-2"><input value={item.activity} onChange={e => updateActivity(ws.id, item.id, "activity", e.target.value)} className="bg-transparent text-[var(--text-primary)] outline-none w-full text-[15px]" /></td>
                <td className="px-2 py-2"><input value={item.owner} onChange={e => updateActivity(ws.id, item.id, "owner", e.target.value)} className="bg-transparent text-[var(--text-secondary)] outline-none w-full text-[15px]" style={{ maxWidth: 140 }} /></td>
                <td className="px-2 py-2"><select value={item.status} onChange={e => updateActivity(ws.id, item.id, "status", e.target.value)} className="bg-[var(--surface-2)] border-none rounded px-2 py-1 text-[14px] font-semibold outline-none" style={{ color: statusColors[item.status] || "var(--text-muted)" }}>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                <td className="px-2 py-2"><select value={item.priority} onChange={e => updateActivity(ws.id, item.id, "priority", e.target.value)} className="bg-[var(--surface-2)] border-none rounded px-2 py-1 text-[14px] font-semibold outline-none" style={{ color: priColors[item.priority] || "var(--text-muted)" }}>{priorities.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                <td className="px-2 py-2"><div className="flex items-center gap-2"><div className="w-16 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden"><div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${item.pct}%` }} /></div><span className="text-[14px] text-[var(--text-muted)] w-8">{item.pct}%</span></div></td>
                <td><button onClick={() => setWorkstreams(prev => prev.map(w => w.id === ws.id ? { ...w, items: w.items.filter(a => a.id !== item.id) } : w))} className="text-[var(--text-muted)] hover:text-[var(--risk)] text-[15px]">{"×"}</button></td>
              </tr>)}</tbody></table>
              <button onClick={() => { const newId = `${ws.id}_${Date.now()}`; setWorkstreams(prev => prev.map(w => w.id === ws.id ? { ...w, items: [...w.items, { id: newId, activity: "New activity", owner: "TBD", status: "Not Started", priority: "Medium", pct: 0 }] } : w)); }} className="text-[14px] text-[var(--accent-primary)] mt-2">+ Add Activity</button>
            </div>}
          </div>;
        })}
      </div>;
    })()}

    {/* ═══ STAKEHOLDER MAP — Draggable ═══ */}
    {sub === "stakeholders" && (() => {
      const quads = [
        { id: "manage", label: "Manage Closely", desc: "High Power + High Interest", color: "#EF4444", bg: "rgba(239,68,68,0.05)" },
        { id: "satisfy", label: "Keep Satisfied", desc: "High Power + Low Interest", color: "#D4860A", bg: "rgba(212,134,10,0.05)" },
        { id: "inform", label: "Keep Informed", desc: "Low Power + High Interest", color: "#D97706", bg: "rgba(217,119,6,0.05)" },
        { id: "monitor", label: "Monitor", desc: "Low Power + Low Interest", color: "#10B981", bg: "rgba(16,185,129,0.05)" },
      ];
      const sentColor = (s: string) => s === "Champion" || s === "Supportive" ? "var(--success)" : s === "Resistant" || s === "Opposed" ? "var(--risk)" : s === "Concerned" || s === "Cautious" ? "var(--warning)" : "var(--text-muted)";
      const handleDrop = (quadId: string, e: React.DragEvent) => {
        e.preventDefault();
        setDragOverQuad(null);
        try {
          const { name } = JSON.parse(e.dataTransfer.getData("text/plain"));
          setStakeholders(prev => prev.map(s => s.name === name ? { ...s, quadrant: quadId } : s));
          showToast(`Moved ${name} to ${quads.find(q => q.id === quadId)?.label}`);
        } catch { /* ignore bad drag data */ }
      };
      return <div className="animate-tab-enter">
        <Card title="Stakeholder Power/Interest Grid">
          <div className="text-[15px] text-[var(--text-secondary)] mb-4">Drag stakeholder cards between quadrants to reposition them. Changes are saved automatically.</div>
          <div className="grid grid-cols-2 gap-3">
            {quads.map(q => <div key={q.id} className="rounded-xl p-4 min-h-[160px] transition-all"
              style={{ background: dragOverQuad === q.id ? `${q.color}15` : q.bg, border: `2px ${dragOverQuad === q.id ? "dashed" : "solid"} ${dragOverQuad === q.id ? q.color : q.color + "25"}` }}
              onDragOver={e => { e.preventDefault(); setDragOverQuad(q.id); }}
              onDragLeave={() => setDragOverQuad(null)}
              onDrop={e => handleDrop(q.id, e)}>
              <div className="flex items-center justify-between mb-3">
                <div><div className="text-[15px] font-bold font-heading" style={{ color: q.color }}>{q.label}</div><div className="text-[14px] text-[var(--text-muted)]">{q.desc}</div></div>
                <span className="text-[15px] font-data" style={{ color: q.color }}>{stakeholders.filter(s => s.quadrant === q.id).length}</span>
              </div>
              <div className="space-y-1.5">
                {stakeholders.filter(s => s.quadrant === q.id).map((s, i) => <div key={i}
                  className="flex items-center gap-2 bg-[var(--surface-1)] rounded-lg px-2 py-1.5 border border-[var(--border)] cursor-grab active:cursor-grabbing hover:border-[var(--accent-primary)]/40 transition-all"
                  draggable
                  onDragStart={e => { e.dataTransfer.setData("text/plain", JSON.stringify({ name: s.name })); e.dataTransfer.effectAllowed = "move"; }}>
                  <span className="text-[var(--text-muted)] text-[15px] cursor-grab select-none" title="Drag to move">⠿</span>
                  <div className="flex-1"><div className="text-[15px] font-semibold text-[var(--text-primary)]">{s.name}</div><div className="text-[14px] text-[var(--text-muted)]">{s.role}</div></div>
                  <span className="text-[15px] px-1.5 py-0.5 rounded-full font-semibold" style={{ color: sentColor(s.sentiment), background: `${sentColor(s.sentiment)}15` }}>{s.sentiment}</span>
                </div>)}
              </div>
              {stakeholders.filter(s => s.quadrant === q.id).length === 0 && <div className="text-center py-4 text-[15px] text-[var(--text-muted)] opacity-50">Drop stakeholders here</div>}
            </div>)}
          </div>
        </Card>
      </div>;
    })()}

    {/* ═══ RISK REGISTER ═══ */}
    {sub === "risks" && (() => {
      const risks = riskItems; const setRisks = setRiskItems;
      const sortCol = riskSortCol; const setSortCol = setRiskSortCol;
      const newRisk = newRiskForm; const setNewRisk = setNewRiskForm;
      const sorted = [...risks].sort((a, b) => sortCol === "score" ? (b.prob * b.impact) - (a.prob * a.impact) : a.name.localeCompare(b.name));
      const riskColor = (score: number) => score >= 16 ? "var(--risk)" : score >= 9 ? "var(--warning)" : "var(--success)";
      const addRisk = () => {
        if (!newRisk.name.trim()) return;
        const id = `R${risks.length + 1}`;
        setRisks(prev => [...prev, { ...newRisk, id, status: "Open" }]);
        setNewRisk({name:"",category:"People",prob:3,impact:3,mitigation:"",contingency:"",owner:""});
        setAddingRisk(false);
        showToast(`Risk ${id} added`);
        logDec("Risk Register", "Risk Added", newRisk.name);
      };
      const deleteRisk = (id: string) => {
        if (!confirm(`Delete risk ${id}?`)) return;
        setRisks(prev => prev.filter(r => r.id !== id));
        showToast(`Risk ${id} removed`);
      };

      return <div className="animate-tab-enter">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Risks" value={risks.length} />
          <KpiCard label="Critical (16+)" value={risks.filter(r => r.prob * r.impact >= 16).length} accent />
          <KpiCard label="Open" value={risks.filter(r => r.status === "Open").length} />
          <KpiCard label="Mitigating" value={risks.filter(r => r.status === "Mitigating").length} />
        </div>
        <Card title="Risk Register">
          <div className="flex justify-end mb-3">
            <button onClick={() => setAddingRisk(!addingRisk)} className="px-4 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90">{addingRisk ? "Cancel" : "+ Add Risk"}</button>
          </div>
          {addingRisk && <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-4 border border-[var(--accent-primary)]/20 grid grid-cols-4 gap-3">
            <div className="col-span-2"><label className="text-[14px] text-[var(--text-muted)] uppercase block mb-1">Risk Name</label><input value={newRisk.name} onChange={e => setNewRisk(p=>({...p,name:e.target.value}))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded px-2 py-1.5 text-[15px] text-[var(--text-primary)] outline-none" /></div>
            <div><label className="text-[14px] text-[var(--text-muted)] uppercase block mb-1">Category</label><select value={newRisk.category} onChange={e=>setNewRisk(p=>({...p,category:e.target.value}))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded px-2 py-1.5 text-[15px] text-[var(--text-primary)]"><option>People</option><option>Technology</option><option>Process</option><option>Governance</option></select></div>
            <div className="grid grid-cols-2 gap-2"><div><label className="text-[14px] text-[var(--text-muted)] uppercase block mb-1">Prob (1-5)</label><input type="number" min={1} max={5} value={newRisk.prob} onChange={e=>setNewRisk(p=>({...p,prob:+e.target.value}))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded px-2 py-1.5 text-[15px] text-[var(--text-primary)] outline-none" /></div><div><label className="text-[14px] text-[var(--text-muted)] uppercase block mb-1">Impact (1-5)</label><input type="number" min={1} max={5} value={newRisk.impact} onChange={e=>setNewRisk(p=>({...p,impact:+e.target.value}))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded px-2 py-1.5 text-[15px] text-[var(--text-primary)] outline-none" /></div></div>
            <div className="col-span-2"><label className="text-[14px] text-[var(--text-muted)] uppercase block mb-1">Mitigation</label><input value={newRisk.mitigation} onChange={e=>setNewRisk(p=>({...p,mitigation:e.target.value}))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded px-2 py-1.5 text-[15px] text-[var(--text-primary)] outline-none" /></div>
            <div><label className="text-[14px] text-[var(--text-muted)] uppercase block mb-1">Owner</label><input value={newRisk.owner} onChange={e=>setNewRisk(p=>({...p,owner:e.target.value}))} className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded px-2 py-1.5 text-[15px] text-[var(--text-primary)] outline-none" /></div>
            <div className="flex items-end"><button onClick={addRisk} disabled={!newRisk.name.trim()} className="px-4 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white disabled:opacity-40">Save Risk</button></div>
          </div>}
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]"><thead><tr className="bg-[var(--surface-2)]">
              {["ID","Risk","Category","P","I","Score","Mitigation","Owner","Status",""].map(h => <th key={h} className="px-2 py-2 text-left text-[14px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)] cursor-pointer hover:text-[var(--accent-primary)]" onClick={() => h && setSortCol(h === "Score" ? "score" : "name")}>{h}</th>)}
            </tr></thead>
            <tbody>{sorted.map(r => {
              const score = r.prob * r.impact;
              return <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
                <td className="px-2 py-2 font-bold text-[var(--text-muted)] font-data">{r.id}</td>
                <td className="px-2 py-2 text-[var(--text-primary)] font-semibold max-w-[180px]">{r.name}</td>
                <td className="px-2 py-2"><Badge color={r.category === "People" ? "amber" : r.category === "Technology" ? "indigo" : "gray"}>{r.category}</Badge></td>
                <td className="px-2 py-2 text-center font-data">{r.prob}</td>
                <td className="px-2 py-2 text-center font-data">{r.impact}</td>
                <td className="px-2 py-2 text-center"><span className="font-bold font-data" style={{ color: riskColor(score) }}>{score}</span></td>
                <td className="px-2 py-2 text-[var(--text-secondary)] text-[15px] max-w-[200px]">{r.mitigation}</td>
                <td className="px-2 py-2 text-[var(--text-secondary)]">{r.owner}</td>
                <td className="px-2 py-2"><span className="text-[15px] px-2 py-0.5 rounded-full font-semibold" style={{ color: r.status === "Mitigating" ? "var(--success)" : r.status === "Closed" ? "var(--text-muted)" : "var(--warning)", background: r.status === "Mitigating" ? "rgba(16,185,129,0.1)" : r.status === "Closed" ? "var(--surface-2)" : "rgba(245,158,11,0.1)" }}>{r.status}</span></td>
                <td className="px-2 py-1"><button onClick={() => deleteRisk(r.id)} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--risk)] transition-colors">✕</button></td>
              </tr>;
            })}</tbody></table>
          </div>
        </Card>
      </div>;
    })()}

    {/* ═══ COMMUNICATION PLAN ═══ */}
    {sub === "comms" && <div className="animate-tab-enter">
      <Card title="Communication Cadence">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">{aiChangePlan.length > 0 ? "Generated from your roadmap and stakeholder data." : "Default template — build a roadmap to customize."} Edit as needed.</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]"><thead><tr className="bg-[var(--surface-2)]">
            {["Audience","Message Type","Channel","Frequency","Owner","Phase"].map(h => <th key={h} className="px-3 py-2 text-left text-[14px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">{h}</th>)}
          </tr></thead>
          <tbody>{[
            { audience: "Executive Team", type: "Progress Update", channel: "Steering Committee", freq: "Bi-weekly", owner: "PMO Lead", phase: "All" },
            { audience: "Board of Directors", type: "Strategic Update", channel: "Board Deck", freq: "Quarterly", owner: "CHRO", phase: "All" },
            { audience: "People Managers", type: "Change Briefing", channel: "Manager Cascade", freq: "Monthly", owner: "Change Lead", phase: "Design–Scale" },
            { audience: "All Employees", type: "Transformation Update", channel: "Town Hall + Email", freq: "Monthly", owner: "Comms Director", phase: "Design–Sustain" },
            { audience: "Impacted Teams", type: "Role Change Details", channel: "Team Meeting", freq: "As needed", owner: "HRBPs", phase: "Pilot–Scale" },
            { audience: "Champions Network", type: "Enablement Session", channel: "Workshop", freq: "Bi-weekly", owner: "L&D", phase: "Pilot–Scale" },
            { audience: "Union/Works Council", type: "Consultation", channel: "Formal Meeting", freq: "Monthly", owner: "ER Lead", phase: "Design–Scale" },
            { audience: "External (Investors)", type: "Strategic Narrative", channel: "Investor Update", freq: "Quarterly", owner: "IR", phase: "All" },
          ].map((row, i) => <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
            <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{row.audience}</td>
            <td className="px-3 py-2 text-[var(--text-secondary)]">{row.type}</td>
            <td className="px-3 py-2 text-[var(--text-secondary)]">{row.channel}</td>
            <td className="px-3 py-2"><Badge color="amber">{row.freq}</Badge></td>
            <td className="px-3 py-2 text-[var(--text-muted)]">{row.owner}</td>
            <td className="px-3 py-2 text-[var(--text-muted)] text-[15px]">{row.phase}</td>
          </tr>)}</tbody></table>
        </div>
      </Card>
      <InsightPanel title="Communication Best Practices" items={[
        "Executive audience: lead with outcomes and ROI, keep details in appendix",
        "Manager audience: focus on 'what changes for my team' and 'how to support my people'",
        "Employee audience: lead with 'what changes for me' and available support",
        "Always pair bad news with a support plan — never communicate impact without a path forward",
        "Build in feedback loops — every communication should include a way to ask questions",
      ]} icon="📣" />
    </div>}

    {sub === "playbook" && <div>
      <Card title="📖 Change Playbook Dictionary">
        <div className="text-[15px] text-[var(--text-secondary)] mb-4">Pre-built transformation playbooks. Click &quot;Load Plan&quot; to populate the roadmap — then customize for your client.</div>
        <div className="space-y-4">
          {CHANGE_PLAYBOOKS.map((pb, pi) => <div key={pi} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div><div className="text-[15px] font-bold text-[var(--text-primary)]">{pb.name}</div><div className="text-[15px] text-[var(--text-muted)] mt-0.5">{pb.desc}</div></div>
              <div className="flex items-center gap-2">
                <Badge color="purple">{pb.industry}</Badge>
                <button onClick={() => {
                  const flat = pb.waves.flatMap(w => w.initiatives.map(init => ({ ...init, wave: w.wave, start: w.time.split("-")[0]?.trim() || "", end: w.time.split("-")[1]?.trim() || "", initiative: init.name, description: `From ${pb.name} playbook` })));
                  setAiChangePlan(flat); setSub("road");
                  showToast(`📖 Loaded ${flat.length} initiatives from "${pb.name}"`);
                }} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] cursor-pointer">Load Plan →</button>
              </div>
            </div>
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
              {pb.waves.map((w, wi) => <div key={wi} className="flex-shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5 min-w-[180px]">
                <div className="flex items-center justify-between mb-1.5"><span className="text-[15px] font-bold" style={{color:COLORS[wi % COLORS.length]}}>{w.wave}</span><span className="text-[15px] text-[var(--text-muted)]">{w.time}</span></div>
                {w.initiatives.map((init, ii) => <div key={ii} className="text-[14px] text-[var(--text-secondary)] mb-0.5 flex items-start gap-1"><span className="text-[var(--text-muted)]">·</span>{init.name}</div>)}
              </div>)}
            </div>
          </div>)}
        </div>
      </Card>
    </div>}
    <NextStepBar currentModuleId="plan" onNavigate={onNavigate || onBack} />
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   TRANSFORMATION STORY BUILDER — auto-generated executive narrative
   ═══════════════════════════════════════════════════════════════ */

export function TransformationStoryBuilder({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("board");
  const [edited, setEdited] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const [overview, readiness, roadmap] = await Promise.all([
        api.getOverview(model, f), api.getReadiness(model, f), api.getRoadmap(model, f),
      ]);
      const ovKpis = (overview as Record<string, unknown>)?.kpis as Record<string, unknown> || {};
      const rdScore = (readiness as Record<string, unknown>)?.score || 0;
      const rmSummary = ((roadmap as Record<string, unknown>)?.summary || {}) as Record<string, unknown>;
      const toneGuide = tone === "board" ? "Formal, metric-heavy, suitable for board of directors" : tone === "allhands" ? "Inspiring, people-focused, suitable for all-hands meeting" : "ROI-focused, strategic, suitable for investor update";
      const raw = await callAI(
        `Write a 3-paragraph executive transformation narrative. Tone: ${toneGuide}. Return plain text, no markdown.`,
        `Data: ${JSON.stringify({employees: ovKpis.employees, roles: ovKpis.roles, readiness_score: rdScore, high_ai_pct: ovKpis.high_ai_pct, roadmap_initiatives: rmSummary.total, high_priority: rmSummary.high_priority}).slice(0, 2000)}. Paragraph 1: Current state. Paragraph 2: Transformation design. Paragraph 3: Path forward.`
      );
      setStory(raw);
      setEdited(false);
      showToast("Narrative generated");
    } catch { showToast("Generation failed"); }
    setLoading(false);
  };

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Transformation Narrative</title><style>body{font-family:Outfit,sans-serif;max-width:700px;margin:40px auto;color:#333;line-height:1.8}h1{color:#C07030;font-size:22px}p{font-size:14px;margin-bottom:16px}</style></head><body><h1>AI Transformation Narrative</h1>${story.split("\n").filter(Boolean).map(p => `<p>${p}</p>`).join("")}<p style="font-size:10px;color:#999;margin-top:40px">Generated by AI Transformation Platform · ${new Date().toLocaleDateString()}</p></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return <div>
    <ContextStrip items={["Auto-generated executive narrative synthesizing all platform outputs"]} />
    <PageHeader icon="📖" title="Transformation Story Builder" subtitle="Executive-ready narrative for board, all-hands, or investor presentations" onBack={onBack} moduleId="story" />

    <div className="flex gap-2 mb-4">
      {([["board", "Board Presentation"], ["allhands", "All-Hands"], ["investor", "Investor Update"]] as const).map(([id, label]) => <button key={id} onClick={() => setTone(id)} className={`px-3 py-1.5 rounded-lg text-[15px] font-semibold ${tone === id ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>{label}</button>)}
    </div>

    {!story && !loading && <Card><div className="text-center py-12">
      <div className="text-4xl mb-3 opacity-40">📖</div>
      <h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Generate Your Transformation Story</h3>
      <p className="text-[15px] text-[var(--text-secondary)] mb-5 max-w-md mx-auto">AI will synthesize data from Overview, Diagnose, Simulate, and Mobilize into a polished executive narrative.</p>
      <button onClick={generate} className="px-6 py-3 rounded-2xl text-[14px] font-bold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>📖 Generate Narrative</button>
    </div></Card>}

    {loading && <Card><div className="text-center py-12"><LoadingBar /><div className="text-[15px] text-[var(--text-secondary)] mt-4">Crafting your transformation story...</div></div></Card>}

    {story && <Card>
      <div className="flex justify-between items-center mb-4">
        <Badge color="amber">{tone === "board" ? "Board Tone" : tone === "allhands" ? "All-Hands Tone" : "Investor Tone"}</Badge>
        <div className="flex gap-2">
          <button onClick={exportPdf} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">📄 Export PDF</button>
          <button onClick={generate} disabled={loading} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">↻ Regenerate</button>
        </div>
      </div>
      <textarea value={story} onChange={e => { setStory(e.target.value); setEdited(true); }} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 text-[15px] text-[var(--text-secondary)] leading-relaxed outline-none focus:border-[var(--accent-primary)] resize-y" rows={12} />
      {edited && <div className="text-[15px] text-[var(--accent-primary)] mt-1">Edited — your changes will be preserved</div>}
    </Card>}

    <NextStepBar currentModuleId="plan" onNavigate={onNavigate || onBack} />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   READINESS ARCHETYPES — consultant-grade workforce segmentation
   ═══════════════════════════════════════════════════════════════ */

export function ReadinessArchetypes({ model, f, onBack, onNavigate }: { model: string; f: Filters; onBack: () => void; onNavigate?: (id: string) => void }) {
  const [data] = useApiData(() => model ? api.getChangeReadiness(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);

  // Calculate archetype distribution from change readiness quadrant data
  const readinessData = data as Record<string, unknown> | null;
  const quadrants = (readinessData?.quadrants || null) as Record<string, Record<string, unknown>> | null;
  const summary = (readinessData?.summary || {}) as Record<string, unknown>;
  const total = Number(summary.total_assessed || 0);

  // Map backend quadrants (willingness × ability) to archetypes:
  //   Early Adopter = high_ready_high_impact (high willingness + high ability)
  //   Eager Learner = high_ready_low_impact  (high willingness + low ability)
  //   Skeptic       = low_ready_low_impact   (low willingness + high ability)
  //   At-Risk       = low_ready_high_impact  (low willingness + low ability)
  let earlyPct = 0, eagerPct = 0, skepticPct = 0, atriskPct = 0;
  const hasArchetypeData = quadrants !== null && total > 0;
  if (hasArchetypeData) {
    const champCount = Number((quadrants.high_ready_high_impact as Record<string, unknown>)?.count || 0);
    const supportCount = Number((quadrants.high_ready_low_impact as Record<string, unknown>)?.count || 0);
    const monitorCount = Number((quadrants.low_ready_low_impact as Record<string, unknown>)?.count || 0);
    const highRiskCount = Number((quadrants.low_ready_high_impact as Record<string, unknown>)?.count || 0);
    const t = Math.max(total, 1);
    earlyPct = Math.round(champCount / t * 100);
    eagerPct = Math.round(supportCount / t * 100);
    skepticPct = Math.round(monitorCount / t * 100);
    atriskPct = Math.max(0, 100 - earlyPct - eagerPct - skepticPct);
  }

  type Archetype = { id: string; label: string; icon: string; color: string; bgColor: string; desc: string; engagement: string[]; pct: number };
  const archetypes: Archetype[] = [
    { id: "early", label: "Early Adopter", icon: "🚀", color: "#10B981", bgColor: "rgba(16,185,129,0.08)", desc: "High willingness + High ability — your champions", engagement: ["Empower as peer trainers and AI ambassadors", "Give early access to new AI tools", "Feature in internal success stories", "Involve in design decisions as co-creators"], pct: earlyPct },
    { id: "eager", label: "Eager Learner", icon: "📚", color: "#D4860A", bgColor: "rgba(212,134,10,0.08)", desc: "High willingness + Low ability — motivated but need upskilling", engagement: ["Prioritize for training programs", "Pair with Early Adopters as mentors", "Provide sandbox environments", "Celebrate learning milestones"], pct: eagerPct },
    { id: "skeptic", label: "Skeptic with Expertise", icon: "🔍", color: "#F59E0B", bgColor: "rgba(245,158,11,0.08)", desc: "Low willingness + High ability — critical group with deep knowledge", engagement: ["Involve in design decisions (ownership, not orders)", "Address specific concerns directly with data", "Position as quality gatekeepers for AI outputs", "Respect their expertise — they see risks others miss"], pct: skepticPct },
    { id: "atrisk", label: "At-Risk Anchor", icon: "⚠️", color: "#EF4444", bgColor: "rgba(239,68,68,0.08)", desc: "Low willingness + Low ability — highest intervention need", engagement: ["One-on-one career conversations", "Clear personal impact assessment", "Explore redeployment options early", "Connect with support resources (EAP, coaching)"], pct: atriskPct },
  ];

  const [expanded, setExpanded] = useState<string | null>(null);

  return <div>
    <ContextStrip items={["Consultant-grade workforce archetypes with targeted engagement playbooks"]} />
    <PageHeader icon="🎭" title="Readiness Archetypes" subtitle="Qualitative workforce segmentation with engagement strategies" onBack={onBack} moduleId="archetypes" />

    {!hasArchetypeData && <div className="text-center py-16"><div className="text-4xl mb-3 opacity-40">🎭</div><h3 className="text-[16px] font-bold font-heading text-[var(--text-primary)] mb-2">Complete Change Readiness First</h3><p className="text-[15px] text-[var(--text-secondary)] max-w-md mx-auto">Readiness Archetypes are derived from the Change Readiness assessment. Complete AI Readiness (Diagnose phase) → Change Readiness to populate the workforce segmentation data.</p></div>}

    {hasArchetypeData && <><div className="grid grid-cols-2 gap-4 mb-6">
      {archetypes.map(a => <div key={a.id} onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="rounded-xl border cursor-pointer transition-all card-hover" style={{ background: a.bgColor, borderColor: `${a.color}30` }}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><span className="text-2xl">{a.icon}</span><div><div className="text-[14px] font-bold font-heading" style={{ color: a.color }}>{a.label}</div><div className="text-[15px] text-[var(--text-muted)]">{a.desc}</div></div></div>
            <div className="text-[28px] font-black font-data" style={{ color: a.color }}>{a.pct}%</div>
          </div>
          {expanded === a.id && <div className="mt-3 pt-3 border-t animate-tab-enter" style={{ borderColor: `${a.color}20` }}>
            <div className="text-[15px] font-bold uppercase tracking-wider mb-2" style={{ color: a.color }}>Engagement Playbook</div>
            <ul className="space-y-1.5">{a.engagement.map((e, i) => <li key={i} className="flex gap-2 text-[15px] text-[var(--text-secondary)]"><span style={{ color: a.color }}>→</span>{e}</li>)}</ul>
          </div>}
        </div>
      </div>)}
    </div>

    <InsightPanel title="Migration Targets" items={[
      "Goal: Move 60% of Skeptics to Early Adopters within 6 months through involvement and training",
      "Goal: Move 80% of Eager Learners to Early Adopters within 3 months through focused upskilling",
      "Goal: Move 50% of At-Risk Anchors to Eager Learners within 6 months through career conversations and support",
      "Key lever: Manager capability — high-scoring managers accelerate archetype migration by 1.8x",
    ]} icon="🎯" />

    <NextStepBar currentModuleId="changeready" onNavigate={onNavigate || onBack} /></>}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   MODULE 8: OPERATING MODEL LAB
   The full design sandbox from previous build
   ═══════════════════════════════════════════════════════════════ */

