"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
  CartesianGrid, ZAxis,
} from "recharts";

// ── Types ──

interface LogEntry {
  id: string; timestamp: string;
  actor: "bot" | "user" | "system";
  type: "narration" | "finding" | "question" | "correction" | "command" | "status" | "visualization";
  content: string;
  metadata?: Record<string, unknown>;
}

interface Finding {
  id: string; category: string; severity: "critical" | "warning" | "info";
  title: string; detail: string; metric_value?: unknown; benchmark_value?: unknown;
  function?: string | null; confidence: number;
  user_status: "pending" | "acknowledged" | "dismissed" | "corrected";
}

interface BotState {
  session_id: string;
  status: "idle" | "running" | "paused" | "waiting_for_user" | "completed" | "error";
  mode: string; speed: string; current_action: string | null;
  activity_log: LogEntry[]; findings: Finding[]; completed_actions: string[];
  progress: { completed: number; total: number; percentage: number; current_action: string | null };
  analysis_results?: Record<string, unknown>;
}

// ── Constants ──

const COLORS = ["var(--accent-primary)", "var(--purple)", "#f4a83a", "var(--success)", "var(--warning)", "var(--risk)", "#EC4899", "#14B8A6"];
const TT: React.CSSProperties = { background: "rgba(15,12,8,0.95)", border: "1px solid rgba(255,200,150,0.1)", borderRadius: 10, fontSize: 12, color: "#f5e6d0" };

const ACTION_LABELS: Record<string, string> = {
  profile_workforce: "Workforce Profile", analyze_org_structure: "Org Structure",
  assess_ai_readiness: "AI Readiness", identify_opportunities: "AI Opportunities",
  analyze_skills: "Skills Analysis", assess_change_readiness: "Change Readiness",
  build_scenarios: "Scenario Modeling", generate_roadmap: "Roadmap", synthesize_findings: "Synthesis",
};

// Finding category → module deep link
const CATEGORY_MODULE: Record<string, string> = {
  structural: "build", talent: "snapshot", opportunity: "scan",
  skills: "skills", change: "changeready", general: "snapshot",
};

const CHAR_SPEEDS: Record<string, number> = { slow: 25, normal: 12, fast: 0 };
const SESSION_STORAGE_KEY = "bot_session_";

function authH(): Record<string, string> {
  const t = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// ═══════════════════════════════════════════════════════════════
//  TYPING ANIMATION
// ═══════════════════════════════════════════════════════════════

function TypingText({ text, speed }: { text: string; speed: number }) {
  const [displayed, setDisplayed] = useState(speed === 0 ? text : "");
  const idx = useRef(0);
  useEffect(() => {
    if (speed === 0) { setDisplayed(text); return; }
    idx.current = 0; setDisplayed("");
    const iv = setInterval(() => {
      idx.current++;
      if (idx.current >= text.length) { setDisplayed(text); clearInterval(iv); return; }
      setDisplayed(text.slice(0, idx.current));
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  const typing = displayed.length < text.length;
  return <span>{displayed}{typing && <span style={{ borderRight: "2px solid var(--accent-primary)", marginLeft: 1, animation: "blink 0.8s step-end infinite" }}>&thinsp;</span>}</span>;
}

// ═══════════════════════════════════════════════════════════════
//  VISUALIZATIONS (left panel)
// ═══════════════════════════════════════════════════════════════

function BotViz({ action, results }: { action: string | null; results: Record<string, unknown> }) {
  if (!action || !results[action]) return <EmptyViz />;
  const data = results[action] as Record<string, unknown>;
  switch (action) {
    case "profile_workforce": return <ProfileViz data={data} />;
    case "analyze_org_structure": return <OrgViz data={data} />;
    case "assess_ai_readiness": return <ReadinessViz data={data} />;
    case "identify_opportunities": return <OppsViz data={data} />;
    case "build_scenarios": return <ScenariosViz data={data} />;
    case "generate_roadmap": return <RoadmapViz data={data} />;
    case "synthesize_findings": return <SynthViz data={data} />;
    default: return <EmptyViz />;
  }
}

function EmptyViz() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,200,150,0.15)", fontSize: 14, fontFamily: "'Inter Tight', sans-serif" }}>
    Visualizations appear here as the analysis runs
  </div>;
}

function ProfileViz({ data }: { data: Record<string, unknown> }) {
  const byFunc = data.headcount_by_function as Record<string, number> | undefined;
  if (!byFunc) return <EmptyViz />;
  const barData = Object.entries(byFunc).slice(0, 10).map(([name, value]) => ({ name, value }));
  const mgrCount = (data.manager_count as number) || 0;
  const icCount = (data.ic_count as number) || 0;
  const pieData = [{ name: "Managers", value: mgrCount }, { name: "ICs", value: icCount }];
  return <div style={{ display: "flex", gap: 24, height: "100%", alignItems: "center", padding: 24 }}>
    <div style={{ flex: 2 }}>
      <VizLabel>Headcount by Function</VizLabel>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData} layout="vertical" margin={{ left: 80, right: 20 }}>
          <XAxis type="number" tick={{ fill: "rgba(255,200,150,0.3)", fontSize: 11 }} axisLine={false} />
          <YAxis dataKey="name" type="category" tick={{ fill: "rgba(255,200,150,0.6)", fontSize: 12 }} axisLine={false} width={80} />
          <Tooltip contentStyle={TT} /><Bar dataKey="value" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <VizLabel>Manager vs IC</VizLabel>
      <ResponsiveContainer width={200} height={200}>
        <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} strokeWidth={0} animationDuration={800}>
          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
        </Pie><Tooltip contentStyle={TT} /></PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>{pieData.map((d, i) => <Legend2 key={d.name} color={COLORS[i]} label={`${d.name}: ${d.value}`} />)}</div>
    </div>
  </div>;
}

function OrgViz({ data }: { data: Record<string, unknown> }) {
  const span = data.span_of_control as Record<string, number> | undefined;
  const byLevel = data.span_by_level as Record<string, number> | undefined;
  if (!span) return <EmptyViz />;
  const metrics = [
    { label: "Layers", value: data.total_layers, bench: data.layer_benchmark },
    { label: "Avg Span", value: span.avg }, { label: "Min Span", value: span.min },
    { label: "Max Span", value: span.max }, { label: "Narrow (<3)", value: data.narrow_span_managers },
    { label: "Wide (>15)", value: data.wide_span_managers },
  ];
  const levelData = byLevel ? Object.entries(byLevel).map(([name, value]) => ({ name, value: Number(value) })) : [];
  return <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
    <VizLabel>Org Structure Metrics</VizLabel>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
      {metrics.map(m => <MetricCard key={m.label} label={m.label} value={String(m.value ?? "—")} bench={m.bench ? String(m.bench) : undefined} />)}
    </div>
    {levelData.length > 0 && <>
      <VizLabel>Span by Level</VizLabel>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={levelData} margin={{ left: 20, right: 20 }}>
          <XAxis dataKey="name" tick={{ fill: "rgba(255,200,150,0.4)", fontSize: 11 }} axisLine={false} />
          <YAxis tick={{ fill: "rgba(255,200,150,0.3)", fontSize: 11 }} axisLine={false} />
          <Tooltip contentStyle={TT} /><Bar dataKey="value" fill="var(--purple)" radius={[4, 4, 0, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </>}
  </div>;
}

function ReadinessViz({ data }: { data: Record<string, unknown> }) {
  const scores = data.scores_by_function as Record<string, Record<string, unknown>> | undefined;
  if (!scores) return <EmptyViz />;
  const radarData = Object.entries(scores).slice(0, 8).map(([name, s]) => ({
    subject: name.length > 12 ? name.slice(0, 10) + "…" : name,
    technology: Number(s.technology), process: Number(s.process), people: Number(s.people), data: Number(s.data), max: 100,
  }));
  return <div style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}>
    <VizLabel>AI Readiness by Function</VizLabel>
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={radarData}>
        <PolarGrid stroke="rgba(255,255,255,0.06)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,200,150,0.5)", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Technology" dataKey="technology" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.15} animationDuration={800} />
        <Radar name="Process" dataKey="process" stroke="var(--purple)" fill="var(--purple)" fillOpacity={0.1} animationDuration={800} />
        <Radar name="People" dataKey="people" stroke="var(--success)" fill="var(--success)" fillOpacity={0.1} animationDuration={800} />
        <Tooltip contentStyle={TT} />
      </RadarChart>
    </ResponsiveContainer>
    <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
      {[["Technology", "var(--accent-primary)"], ["Process", "var(--purple)"], ["People", "var(--success)"], ["Data", "#f4a83a"]].map(([l, c]) => <Legend2 key={l} color={c as string} label={l as string} />)}
    </div>
  </div>;
}

function OppsViz({ data }: { data: Record<string, unknown> }) {
  const opps = (data.opportunities as Array<Record<string, unknown>> || []).slice(0, 20);
  if (!opps.length) return <EmptyViz />;
  const scatterData = opps.map(o => ({ x: Number(o.automation_pct || 0), y: Number(o.fte_count || 0), z: Number(o.cost_savings_potential || 0), name: String(o.job_title || "") }));
  return <div style={{ padding: 24, height: "100%" }}>
    <VizLabel>Opportunities: Automation % vs FTE Count</VizLabel>
    <ResponsiveContainer width="100%" height={350}>
      <ScatterChart margin={{ left: 20, right: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="x" name="Automation %" tick={{ fill: "rgba(255,200,150,0.4)", fontSize: 11 }} />
        <YAxis dataKey="y" name="FTEs" tick={{ fill: "rgba(255,200,150,0.4)", fontSize: 11 }} />
        <ZAxis dataKey="z" range={[40, 400]} />
        <Tooltip contentStyle={TT} /><Scatter data={scatterData} fill="var(--accent-primary)" fillOpacity={0.7} animationDuration={800} />
      </ScatterChart>
    </ResponsiveContainer>
  </div>;
}

function ScenariosViz({ data }: { data: Record<string, unknown> }) {
  const scenarios = data.scenarios as Record<string, Record<string, unknown>> | undefined;
  if (!scenarios) return <EmptyViz />;
  const colors: Record<string, string> = { conservative: "var(--success)", moderate: "var(--accent-primary)", aggressive: "var(--risk)" };
  return <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
    <VizLabel>Scenario Comparison</VizLabel>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {(["conservative", "moderate", "aggressive"] as const).map(key => {
        const s = scenarios[key] as Record<string, unknown> | undefined;
        if (!s) return null;
        const c = colors[key]; const inv = s.investment as Record<string, unknown> | undefined;
        return <div key={key} style={{ padding: 20, borderRadius: 16, background: `${c}08`, border: `1px solid ${c}25` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c, textTransform: "capitalize", marginBottom: 12 }}>{key}</div>
          {([["Net FTE", s.net_fte_reduction, ""], ["Year 1 Savings", s.year1_savings, "$"], ["Investment", inv?.total, "$"], ["Net Benefit", s.net_year1_benefit, "$"], ["Payback", s.payback_months, "", " mo"]] as const).map(([label, val, pre, suf]) =>
            <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 12, color: "rgba(255,200,150,0.4)" }}>{String(label)}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: "monospace" }}>{pre}{typeof val === "number" ? val.toLocaleString() : "—"}{suf || ""}</span>
            </div>)}
        </div>;
      })}
    </div>
  </div>;
}

function RoadmapViz({ data }: { data: Record<string, unknown> }) {
  const phases = data.phases as Array<Record<string, unknown>> | undefined;
  if (!phases) return <EmptyViz />;
  const pc = ["var(--accent-primary)", "var(--purple)", "#f4a83a", "var(--success)"];
  const totalEnd = Number((phases[phases.length - 1] as Record<string, unknown>).end_month || 18);
  return <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
    <VizLabel>Implementation Roadmap</VizLabel>
    <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
      {phases.map((p, i) => {
        const start = Number(p.start_month || 0); const end = Number(p.end_month || 0);
        return <div key={i} style={{ width: `${((end - start + 1) / totalEnd) * 100}%`, padding: "12px 14px", borderRadius: 10, background: `${pc[i % 4]}15`, border: `1px solid ${pc[i % 4]}30` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: pc[i % 4], marginBottom: 4 }}>{String(p.name)}</div>
          <div style={{ fontSize: 11, color: "rgba(255,200,150,0.35)" }}>Mo {start}-{end}</div>
          <div style={{ fontSize: 11, color: "rgba(255,200,150,0.25)", marginTop: 4 }}>{(p.workstreams as unknown[])?.length || 0} workstreams</div>
        </div>;
      })}
    </div>
    {phases.map((p, i) => <div key={i} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: pc[i % 4], marginBottom: 6 }}>{String(p.name)} — Milestones</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {((p.milestones as string[]) || []).map((m, j) => <span key={j} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: `${pc[i % 4]}10`, border: `1px solid ${pc[i % 4]}20`, color: `${pc[i % 4]}aa` }}>{m}</span>)}
      </div>
    </div>)}
  </div>;
}

function SynthViz({ data }: { data: Record<string, unknown> }) {
  const big3 = data.big_3 as Array<Record<string, unknown>> | undefined;
  const themes = data.themes as Record<string, Array<unknown>> | undefined;
  return <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
    <VizLabel>Top 3 Priorities</VizLabel>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
      {(big3 || []).map((b, i) => <div key={i} style={{ padding: "16px 20px", borderRadius: 14, background: `${COLORS[i]}10`, border: `1px solid ${COLORS[i]}25`, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${COLORS[i]}20`, color: COLORS[i], fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
        <div style={{ fontSize: 13, color: "rgba(255,200,150,0.7)", lineHeight: 1.5 }}>{String(b.text || "")}</div>
      </div>)}
    </div>
    {themes && <><VizLabel>Findings by Theme</VizLabel>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(themes).map(([theme, items]) => <div key={theme} style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}>
          <span style={{ color: "rgba(255,200,150,0.6)", fontWeight: 600 }}>{theme}</span>
          <span style={{ color: "rgba(255,200,150,0.25)", marginLeft: 6 }}>{items.length}</span>
        </div>)}
      </div></>}
  </div>;
}

// Shared tiny components
function VizLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,200,150,0.5)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>{children}</div>;
}
function MetricCard({ label, value, bench }: { label: string; value: string; bench?: string }) {
  return <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div style={{ fontSize: 11, color: "rgba(255,200,150,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-primary)", fontFamily: "monospace" }}>{value}</div>
    {bench && <div style={{ fontSize: 11, color: "rgba(255,200,150,0.25)" }}>Benchmark: {bench}</div>}
  </div>;
}
function Legend2({ color, label }: { color: string; label: string }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,200,150,0.5)" }}><div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />{label}</div>;
}

// ═══════════════════════════════════════════════════════════════
//  EXPORT LOG
// ═══════════════════════════════════════════════════════════════

function exportLog(state: BotState, results: Record<string, unknown>) {
  const synthesis = results.synthesize_findings as Record<string, unknown> | undefined;
  const scenarios = (results.build_scenarios as Record<string, unknown>)?.scenarios as Record<string, Record<string, unknown>> | undefined;
  const criticalFindings = state.findings.filter(f => f.severity === "critical" && f.user_status !== "dismissed");
  const warningFindings = state.findings.filter(f => f.severity === "warning" && f.user_status !== "dismissed");
  const infoFindings = state.findings.filter(f => f.severity === "info" && f.user_status !== "dismissed");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AI Analyst Report</title>
<style>body{font-family:'Inter Tight',system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#1a1a2e;line-height:1.6}
h1{font-family:'Inter Tight',sans-serif;font-size:32px;color:var(--accent-primary);border-bottom:2px solid var(--accent-primary);padding-bottom:8px}
h2{font-family:'Inter Tight',sans-serif;font-size:22px;color:#333;margin-top:32px;border-bottom:1px solid #eee;padding-bottom:6px}
h3{font-family:'Inter Tight',sans-serif;font-size:16px;color:#555;margin-top:20px}
.finding{padding:12px 16px;margin:8px 0;border-radius:8px;border-left:4px solid}
.critical{border-color:var(--risk);background:#FEF2F2}.warning{border-color:var(--warning);background:#FFFBEB}.info{border-color:#f4a83a;background:#EFF6FF}
.corrected{opacity:0.6;text-decoration:line-through}.acknowledged{opacity:0.8}
.metric{font-family:monospace;font-weight:700;color:var(--accent-primary)}
table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #eee}th{background:#f8f8f8;font-weight:600;font-size:13px}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center}
</style></head><body>
<h1>AI Transformation Analysis Report</h1>
<p style="color:#666">Generated ${new Date().toLocaleDateString()} | ${state.progress.completed}/${state.progress.total} analysis steps completed</p>

${synthesis?.executive_summary ? `<h2>Executive Summary</h2><p>${synthesis.executive_summary}</p>` : ""}

<h2>Key Findings</h2>
${criticalFindings.length ? `<h3>Critical (${criticalFindings.length})</h3>${criticalFindings.map(f => `<div class="finding critical"><strong>${f.title}</strong><br>${f.detail}${f.user_status === "corrected" ? " <em>[User correction applied]</em>" : f.user_status === "acknowledged" ? " <em>[Acknowledged]</em>" : ""}</div>`).join("")}` : ""}
${warningFindings.length ? `<h3>Warnings (${warningFindings.length})</h3>${warningFindings.map(f => `<div class="finding warning"><strong>${f.title}</strong><br>${f.detail}</div>`).join("")}` : ""}
${infoFindings.length ? `<h3>Observations (${infoFindings.length})</h3>${infoFindings.map(f => `<div class="finding info">${f.detail}</div>`).join("")}` : ""}

${scenarios ? `<h2>Scenario Comparison</h2><table><thead><tr><th></th><th>Conservative</th><th>Moderate</th><th>Aggressive</th></tr></thead><tbody>
${[["Adoption", "adoption_rate"], ["Net FTE Impact", "net_fte_reduction"], ["Year 1 Savings", "year1_savings"], ["Net Year 1", "net_year1_benefit"], ["Payback (months)", "payback_months"]].map(([label, key]) => `<tr><td>${label}</td>${["conservative", "moderate", "aggressive"].map(s => `<td class="metric">${typeof (scenarios[s] as Record<string, unknown>)?.[key] === "number" ? (key.includes("savings") || key.includes("benefit") ? "$" : "") + (scenarios[s] as Record<string, unknown>)[key]?.toLocaleString() : "—"}</td>`).join("")}</tr>`).join("")}
</tbody></table>` : ""}

${synthesis?.big_3 ? `<h2>Top 3 Priorities</h2><ol>${(synthesis.big_3 as Array<Record<string, unknown>>).map(b => `<li><strong>${b.text}</strong></li>`).join("")}</ol>` : ""}

<div class="footer">Generated by AI Transformation Platform — AI Analyst</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "ai-analyst-report.html"; a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
//  INTRO SCREEN
// ═══════════════════════════════════════════════════════════════

function IntroScreen({ onStart }: { onStart: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1000);
    const t2 = setTimeout(() => setStep(2), 2200);
    const t3 = setTimeout(() => setStep(3), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0B1120", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
    <AnimatePresence>
      {step >= 0 && <motion.div key="s0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 8 }}>🤖</motion.div>}
      {step >= 1 && <motion.div key="s1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "'Inter Tight', sans-serif" }}>Meet your AI Analyst</motion.div>}
      {step >= 2 && <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 15, color: "rgba(255,200,150,0.45)", maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>It analyzes your organization while you watch and guide. You're always in control.</motion.div>}
      {step >= 3 && <motion.button key="s3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={onStart} style={{ marginTop: 16, padding: "14px 36px", borderRadius: 14, background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", boxShadow: "0 4px 20px rgba(224,144,64,0.3)" }}>Start Analysis</motion.button>}
    </AnimatePresence>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
//  STATS BAR
// ═══════════════════════════════════════════════════════════════

function StatsBar({ state, elapsed }: { state: BotState; elapsed: number }) {
  const crit = state.findings.filter(f => f.severity === "critical" && f.user_status !== "dismissed").length;
  const warn = state.findings.filter(f => f.severity === "warning" && f.user_status !== "dismissed").length;
  const info = state.findings.filter(f => f.severity === "info" && f.user_status !== "dismissed").length;
  const corrections = state.findings.filter(f => f.user_status === "corrected").length;
  const mins = Math.floor(elapsed / 60); const secs = elapsed % 60;
  return <div style={{ height: 32, display: "flex", alignItems: "center", gap: 20, padding: "0 20px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 11, color: "rgba(255,200,150,0.3)", fontFamily: "monospace", flexShrink: 0 }}>
    <span>Findings: {crit + warn + info} ({crit > 0 ? <span style={{ color: "var(--risk)" }}>{crit} critical</span> : null}{crit > 0 && warn > 0 ? ", " : ""}{warn > 0 ? <span style={{ color: "var(--warning)" }}>{warn} warnings</span> : null}{(crit > 0 || warn > 0) && info > 0 ? ", " : ""}{info > 0 ? `${info} info` : ""})</span>
    <span>Steps: {state.progress.completed}/{state.progress.total}</span>
    {corrections > 0 && <span>Corrections: {corrections}</span>}
    <span style={{ marginLeft: "auto" }}>{mins}m {secs < 10 ? "0" : ""}{secs}s</span>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function BotWorkspace({ projectId, modelId, onClose }: { projectId: string; modelId: string; onClose: () => void }) {
  const [state, setState] = useState<BotState | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [mode, setMode] = useState<"autopilot" | "guided" | "question">("guided");
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [input, setInput] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevLogLen = useRef(0);
  const analysisResults = useRef<Record<string, unknown>>({});
  const lastCompletedAction = useRef<string | null>(null);
  const startTimeRef = useRef(Date.now());

  // Check for existing session
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY + projectId);
    if (saved) {
      try {
        const sid = JSON.parse(saved);
        if (typeof sid === "string" && sid.length > 10) {
          sessionRef.current = sid;
          setShowIntro(false);
          // Load existing session
          fetch(`/api/bot/${sid}/status`, { headers: authH() })
            .then(r => r.json()).then(data => {
              if (data.session_id) {
                setState(data);
                prevLogLen.current = (data.activity_log || []).length;
                if (data.analysis_results) analysisResults.current = data.analysis_results;
                if (data.completed_actions?.length) lastCompletedAction.current = data.completed_actions[data.completed_actions.length - 1];
                // Add resume message
                const lastAction = data.completed_actions?.[data.completed_actions.length - 1];
                if (lastAction && data.status !== "completed") {
                  fetch(`/api/bot/${sid}/command`, { method: "POST", headers: authH(), body: JSON.stringify({ text: "resume" }) }).catch((e) => { console.error("[BotWorkspace] resume command error", e); });
                }
              } else {
                localStorage.removeItem(SESSION_STORAGE_KEY + projectId);
                setShowIntro(true);
              }
            }).catch((e) => { console.error("[BotWorkspace] session restore error", e); localStorage.removeItem(SESSION_STORAGE_KEY + projectId); setShowIntro(true); });
        }
      } catch (e) { console.error("[BotWorkspace] session parse error", e); localStorage.removeItem(SESSION_STORAGE_KEY + projectId); }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Elapsed timer
  useEffect(() => {
    if (showIntro) return;
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [showIntro]);

  // Start session
  const startSession = useCallback(async () => {
    setShowIntro(false);
    if (sessionRef.current) return; // Already loaded from persistence
    try {
      const res = await fetch("/api/bot/start", { method: "POST", headers: authH(), body: JSON.stringify({ project_id: projectId, model_id: modelId, mode }) });
      const data = await res.json();
      if (data.session_id) {
        sessionRef.current = data.session_id;
        localStorage.setItem(SESSION_STORAGE_KEY + projectId, JSON.stringify(data.session_id));
        setState({ session_id: data.session_id, status: data.status, mode, speed, current_action: null, activity_log: data.activity_log || [], findings: [], completed_actions: [], progress: { completed: 0, total: 9, percentage: 0, current_action: null } });
        prevLogLen.current = (data.activity_log || []).length;
      }
    } catch (e) { console.error("[Bot] Start failed:", e); }
  }, [projectId, modelId, mode, speed]);

  // SSE stream with polling fallback
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionRef.current || showIntro) return;
    const sid = sessionRef.current;

    // Try SSE first
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/bot/${sid}/stream`);
      sseRef.current = es;

      es.onopen = () => setSseConnected(true);
      es.onerror = () => {
        setSseConnected(false);
        // Fall back to polling on SSE failure
        if (!pollRef.current) {
          pollRef.current = setInterval(pollFn, 2000);
        }
      };

      // Handle events by type
      const handleEvent = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "status") {
            setState(prev => prev ? { ...prev, status: data.status } : prev);
          } else if (data.type === "progress") {
            setState(prev => prev ? { ...prev, progress: data } : prev);
          } else if (data.type === "visualization" && data.action) {
            lastCompletedAction.current = data.action;
            // Fetch full results for visualization
            fetch(`/api/bot/${sid}/status`, { headers: authH() }).then(r => r.json()).then(d => {
              if (d.analysis_results) analysisResults.current = { ...analysisResults.current, ...d.analysis_results };
              if (d.completed_actions) setState(prev => prev ? { ...prev, completed_actions: d.completed_actions, progress: d.progress } : prev);
            }).catch((e) => { console.error("[BotWorkspace] status fetch error", e); });
          } else if (data.type === "done") {
            setState(prev => prev ? { ...prev, status: data.status } : prev);
          }
        } catch (e) { console.error("[BotWorkspace] SSE event parse error", e); }
      };

      // Narration, finding, question, status events → append to activity log
      const handleLogEvent = (e: MessageEvent) => {
        try {
          const entry = JSON.parse(e.data);
          if (entry.id && entry.content) {
            setState(prev => {
              if (!prev) return prev;
              // Deduplicate by id
              if (prev.activity_log.some(l => l.id === entry.id)) return prev;
              return { ...prev, activity_log: [...prev.activity_log, entry] };
            });
            prevLogLen.current++;
          }
        } catch (e) { console.error("[BotWorkspace] log event parse error", e); }
      };

      const handleFinding = (e: MessageEvent) => {
        try {
          const finding = JSON.parse(e.data);
          if (finding.id) {
            setState(prev => {
              if (!prev) return prev;
              if (prev.findings.some(f => f.id === finding.id)) return prev;
              return { ...prev, findings: [...prev.findings, finding] };
            });
          }
        } catch (e) { console.error("[BotWorkspace] finding parse error", e); }
      };

      es.addEventListener("narration", handleLogEvent);
      es.addEventListener("finding", handleLogEvent);
      es.addEventListener("question", handleLogEvent);
      es.addEventListener("status", handleEvent);
      es.addEventListener("progress", handleEvent);
      es.addEventListener("visualization", handleEvent);
      es.addEventListener("done", handleEvent);

      // Also listen for finding events separately for the findings list
      es.addEventListener("finding", handleFinding);
    } catch {
      // SSE not supported — use polling
    }

    // Polling fallback
    const pollFn = async () => {
      try {
        const res = await fetch(`/api/bot/${sid}/status`, { headers: authH() });
        const data = await res.json();
        if (data.session_id) {
          if (data.analysis_results) analysisResults.current = { ...analysisResults.current, ...data.analysis_results };
          setState(prev => {
            prevLogLen.current = (data.activity_log || []).length;
            const nc = data.completed_actions || [];
            if (nc.length > (prev?.completed_actions?.length || 0)) lastCompletedAction.current = nc[nc.length - 1];
            return { ...prev!, ...data, mode: prev?.mode || mode, speed: prev?.speed || speed };
          });
        }
      } catch (e) { console.error("[BotWorkspace] poll error", e); }
    };

    // Start polling as fallback (SSE will supersede if it connects)
    if (!es || es.readyState === 2) {
      pollRef.current = setInterval(pollFn, 2000);
    }

    return () => {
      if (es) { es.close(); sseRef.current = null; }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setSseConnected(false);
    };
  }, [showIntro, mode, speed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [state?.activity_log?.length]);

  // Keyboard shortcuts
  useEffect(() => {
    if (showIntro || minimized) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case " ": e.preventDefault(); togglePlayPause(); break;
        case "1": setSpeed("slow"); break;
        case "2": setSpeed("normal"); break;
        case "3": setSpeed("fast"); break;
        case "a": case "A": setMode("autopilot"); break;
        case "g": case "G": setMode("guided"); break;
        case "q": case "Q": setMode("question"); break;
        case "e": case "E": if (state) exportLog(state, analysisResults.current); break;
        case "m": case "M": setMinimized(true); break;
        case "Escape": onClose(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showIntro, minimized, state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──
  const sendCommand = useCallback(async (text: string) => {
    if (!sessionRef.current || !text.trim()) return;
    setInput("");
    try {
      const res = await fetch(`/api/bot/${sessionRef.current}/command`, { method: "POST", headers: authH(), body: JSON.stringify({ text: text.trim() }) });
      const data = await res.json();
      if (data.new_log_entries) {
        setState(prev => prev ? { ...prev, activity_log: [...prev.activity_log, ...data.new_log_entries], status: data.status || prev.status } : prev);
        prevLogLen.current += data.new_log_entries.length;
      }
    } catch (e) { console.error("[Bot] Command failed:", e); }
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!sessionRef.current || !state) return;
    if (state.status === "running") {
      await fetch(`/api/bot/${sessionRef.current}/pause`, { method: "POST", headers: authH() });
    } else if (state.status === "paused") {
      await fetch(`/api/bot/${sessionRef.current}/resume`, { method: "POST", headers: authH() });
    } else if (state.status === "waiting_for_user" || state.status === "idle") {
      if (mode === "autopilot") {
        fetch(`/api/bot/${sessionRef.current}/autopilot`, { method: "POST", headers: authH() });
      } else {
        sendCommand("go");
      }
    }
  }, [state, mode, sendCommand]);

  const charSpeed = CHAR_SPEEDS[speed] || 12;
  const vizAction = lastCompletedAction.current || state?.current_action;

  // ── Intro ──
  if (showIntro && !sessionRef.current) return <IntroScreen onStart={startSession} />;

  // ── Minimized ──
  if (minimized) {
    const newFindings = state?.findings?.filter(f => f.user_status === "pending").length || 0;
    return <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={() => setMinimized(false)}
      style={{ position: "fixed", bottom: 80, right: 20, width: 300, zIndex: 9998, borderRadius: 20, padding: "16px 20px", background: "rgba(11,17,32,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(224,144,64,0.15)", cursor: "pointer", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "'Inter Tight', sans-serif" }}>AI Analyst</div>
          <div style={{ fontSize: 11, color: "rgba(255,200,150,0.4)" }}>{state?.status === "running" ? "Analyzing..." : state?.status === "completed" ? "Complete" : "Waiting"}</div>
        </div>
        {newFindings > 0 && <div style={{ padding: "2px 8px", borderRadius: 10, background: "rgba(224,144,64,0.2)", fontSize: 11, fontWeight: 700, color: "var(--accent-primary)" }}>{newFindings} new</div>}
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: "var(--accent-primary)", width: `${state?.progress?.percentage || 0}%`, transition: "width 0.5s ease" }} />
      </div>
    </motion.div>;
  }

  if (!state) return null;

  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "#0B1120", display: "flex", flexDirection: "column" }}>
    <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes statusPulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>

    {/* ── CONTROL BAR ── */}
    <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 20px", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "'Inter Tight', sans-serif" }}>AI Analyst</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: state.status === "running" ? "var(--success)" : state.status === "waiting_for_user" ? "var(--accent-primary)" : state.status === "completed" ? "var(--purple)" : "#6B7280", animation: state.status === "running" ? "statusPulse 1.5s infinite" : "none" }} />
            <span style={{ fontSize: 12, color: "rgba(255,200,150,0.4)" }}>
              {state.current_action ? ACTION_LABELS[state.current_action] || state.current_action : state.status === "completed" ? "Analysis complete" : state.status === "waiting_for_user" ? "Awaiting input" : state.status}
              {sseConnected && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--success)", fontWeight: 700 }}>LIVE</span>}
              {!sseConnected && sessionRef.current && <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(255,200,150,0.25)" }}>polling</span>}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={togglePlayPause} style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(224,144,64,0.3)" }}>{state.status === "running" ? "⏸" : "▶"}</button>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["autopilot", "guided", "question"] as const).map(m => <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: mode === m ? 700 : 500, background: mode === m ? "rgba(224,144,64,0.15)" : "transparent", color: mode === m ? "var(--accent-primary)" : "rgba(255,200,150,0.35)", border: "none", cursor: "pointer", textTransform: "capitalize" }}>{m}</button>)}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" }}>
        <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(["slow", "normal", "fast"] as const).map(s => <button key={s} onClick={() => setSpeed(s)} style={{ padding: "4px 10px", fontSize: 11, fontWeight: speed === s ? 700 : 400, background: speed === s ? "rgba(255,255,255,0.06)" : "transparent", color: speed === s ? "rgba(255,200,150,0.6)" : "rgba(255,200,150,0.25)", border: "none", cursor: "pointer", textTransform: "capitalize" }}>{s}</button>)}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "rgba(255,200,150,0.4)", fontFamily: "monospace" }}>Step {state.progress.completed}/{state.progress.total}</div>
          <div style={{ width: 80, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: 2 }}><div style={{ height: "100%", borderRadius: 2, background: "var(--accent-primary)", width: `${state.progress.percentage}%`, transition: "width 0.5s ease" }} /></div>
        </div>
        <button onClick={() => exportLog(state, analysisResults.current)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,200,150,0.35)", cursor: "pointer" }} title="Export (E)">Export</button>
        <button onClick={() => setMinimized(true)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,200,150,0.4)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Minimize (M)">▾</button>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,200,150,0.4)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Close (Esc)">✕</button>
      </div>
    </div>

    {/* ── MAIN CONTENT ── */}
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* LEFT — Visualization */}
      <div style={{ width: "60%", borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "auto" }}>
        <AnimatePresence mode="wait">
          <motion.div key={vizAction || "empty"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ height: "100%" }}>
            <BotViz action={vizAction || null} results={analysisResults.current} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* RIGHT — Activity Feed + Input */}
      <div style={{ width: "40%", display: "flex", flexDirection: "column" }}>
        <div ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
          {state.activity_log.map((entry, i) => {
            const isBot = entry.actor === "bot";
            const isQuestion = entry.type === "question";
            const isFinding = entry.type === "finding";
            const severity = entry.metadata?.severity as string;
            const findingType = entry.metadata?.finding_type as string | undefined;
            const borderColor = severity === "critical" ? "var(--risk)" : severity === "warning" ? "var(--warning)" : isBot ? "var(--accent-primary)" : "#f4a83a";
            const isRecent = i >= (state.activity_log.length - 6);
            const linkedModule = isFinding && severity ? CATEGORY_MODULE[findingType || severity] || CATEGORY_MODULE[entry.metadata?.category as string || ""] : null;

            return <div key={entry.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ width: 3, borderRadius: 2, background: borderColor, flexShrink: 0, alignSelf: "stretch", opacity: 0.6 }} />
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: isBot ? "rgba(224,144,64,0.15)" : "rgba(244,168,58,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, marginTop: 2, color: isBot ? "var(--accent-primary)" : "#f4a83a" }}>
                {isBot ? "🤖" : entry.actor === "system" ? "⚙" : "U"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: isBot ? "rgba(255,200,150,0.8)" : "rgba(147,197,253,0.8)", lineHeight: 1.6, wordBreak: "break-word" }}>
                  {isBot && isRecent ? <TypingText text={entry.content} speed={charSpeed} /> : entry.content}
                </div>
                {/* Finding deep link + confidence */}
                {isFinding && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    {linkedModule && <button onClick={() => sendCommand(`show me ${entry.content.slice(0, 30)}`)} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(224,144,64,0.06)", border: "1px solid rgba(224,144,64,0.12)", color: "rgba(224,144,64,0.5)", cursor: "pointer" }}>View in detail →</button>}
                    {entry.metadata?.confidence != null && (() => {
                      const conf = Number(entry.metadata!.confidence);
                      const color = conf >= 0.8 ? "var(--success)" : conf >= 0.5 ? "var(--warning)" : "var(--risk)";
                      const style = conf >= 0.8 ? "solid" : conf >= 0.5 ? "dashed" : "dotted";
                      return <span style={{ fontSize: 11, color, borderLeft: `2px ${style} ${color}`, paddingLeft: 6, fontFamily: "monospace" }}>{Math.round(conf * 100)}% confidence</span>;
                    })()}
                  </div>
                )}
                {/* Question buttons */}
                {isQuestion && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <button onClick={() => sendCommand("go")} style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(224,144,64,0.1)", border: "1px solid rgba(224,144,64,0.2)", color: "var(--accent-primary)", cursor: "pointer" }}>Go →</button>
                    <button onClick={() => sendCommand("skip")} style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,200,150,0.4)", cursor: "pointer" }}>Skip</button>
                    <button onClick={() => sendCommand("tell me more")} style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,200,150,0.4)", cursor: "pointer" }}>Tell me more</button>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "rgba(255,200,150,0.15)", marginTop: 4, fontFamily: "monospace" }}>{new Date(entry.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>;
          })}
        </div>

        {/* Quick chips + Input */}
        <div style={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 16px 12px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {["Go", "Skip this", "Summarize", "Go deeper"].map(chip => (
              <button key={chip} onClick={() => sendCommand(chip.toLowerCase())} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,200,150,0.35)", cursor: "pointer" }}>{chip}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendCommand(input); }}
              placeholder="Type a command or ask a question..."
              style={{ flex: 1, padding: "10px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none", fontFamily: "'Inter Tight', sans-serif" }} />
            <button onClick={() => sendCommand(input)} style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
          </div>
        </div>
      </div>
    </div>

    {/* ── STATS BAR ── */}
    <StatsBar state={state} elapsed={elapsed} />
  </div>;
}
