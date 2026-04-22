"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, X, Sparkles, BookOpen, ChevronDown, ChevronUp,
  AlertTriangle, Check, Search, Filter, FileText, Clock,
  Trash2, Copy, GitBranch,
} from "@/lib/icons";
import { TASK_DICTIONARY, findTaskDictEntries } from "../design/WorkDesignLab";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface TaskRow {
  "Task ID": string;
  "Task Name": string;
  Workstream: string;
  "AI Impact": string;
  "Est Hours/Week": number;
  "Current Time Spent %": number;
  "Time Saved %": number;
  "Task Type": string;
  Interaction: string;
  Logic: string;
  "Primary Skill": string;
  "Secondary Skill": string;
  [key: string]: unknown;
}

interface Props {
  deconRows: TaskRow[];
  weeklyHours: number;
  jobTitle: string;
  showSources: boolean;
  onRowsChange: (rows: TaskRow[]) => void;
  onWeeklyHoursChange: (hrs: number) => void;
  onSubmit: () => void;
  onStageCompletion: (pct: number) => void;
  isSubmitted: boolean;
  isFinalized: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const IMPACT_COLORS: Record<string, string> = { High: "#EF4444", Moderate: "#F59E0B", Low: "#22C55E" };

const S = {
  summaryBar: { display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" as const } as React.CSSProperties,
  metric: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", minWidth: 100 } as React.CSSProperties,
  metricLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" } as React.CSSProperties,
  metricValue: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-bold)", fontFamily: "var(--ff-mono)", color: "var(--text-primary)", marginTop: 2 } as React.CSSProperties,
  metricSub: { fontSize: 11, color: "var(--text-muted)", marginTop: 1 } as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  toolbar: { display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" as const } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 5, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 11, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 5, background: "#3B82F6", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  btnAccent: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 11, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 5, background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "separate" as const, borderSpacing: 0, fontSize: "var(--text-xs)" } as React.CSSProperties,
  th: { padding: "7px 8px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "2px solid var(--border)", background: "#1C2B3A", color2: "#fff", whiteSpace: "nowrap" as const, cursor: "pointer", userSelect: "none" as const } as React.CSSProperties,
  td: { padding: "6px 8px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const } as React.CSSProperties,
  input: { width: "100%", padding: "4px 6px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid transparent", borderRadius: 4, color: "var(--text-primary)", outline: "none" } as React.CSSProperties,
  inputNum: { width: 52, padding: "4px 6px", fontSize: "var(--text-xs)", fontFamily: "var(--ff-mono)", background: "var(--surface-2)", border: "1px solid transparent", borderRadius: 4, color: "var(--text-primary)", outline: "none", textAlign: "center" as const } as React.CSSProperties,
  select: { padding: "4px 6px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid transparent", borderRadius: 4, color: "var(--text-primary)", outline: "none", appearance: "none" as const } as React.CSSProperties,
  impactDot: (impact: string) => ({ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: IMPACT_COLORS[impact] || "#9CA3AF", marginRight: 4 }) as React.CSSProperties,
  inlineBar: (pct: number, color: string) => ({ display: "inline-block", width: `${Math.min(pct, 100)}%`, height: 4, background: color, borderRadius: 2, transition: "width 0.2s" }) as React.CSSProperties,
  barBg: { width: 50, height: 4, background: "var(--border)", borderRadius: 2, display: "inline-block", verticalAlign: "middle", marginLeft: 4 } as React.CSSProperties,
  footer: { padding: "8px", background: "#1C2B3A", fontWeight: "var(--fw-bold)" } as React.CSSProperties,
  budgetBar: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 } as React.CSSProperties,
  progressTrack: { height: 8, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden", display: "flex" } as React.CSSProperties,
  progressSeg: (pct: number, color: string) => ({ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }) as React.CSSProperties,
  chartGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 } as React.CSSProperties,
  treemapCell: (pct: number, color: string) => ({ flex: `${Math.max(pct, 3)}`, height: 32, background: color, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", overflow: "hidden", whiteSpace: "nowrap" as const, padding: "0 4px", minWidth: 0 }) as React.CSSProperties,
  ringContainer: { position: "relative" as const, width: 100, height: 100, margin: "0 auto" } as React.CSSProperties,
  emptyPrompt: { textAlign: "center" as const, padding: "32px 20px", background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 10, marginBottom: 16 } as React.CSSProperties,
  dictPanel: { background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "16px 18px", marginBottom: 16 } as React.CSSProperties,
  dictEntry: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", marginBottom: 8 } as React.CSSProperties,
};

const TREEMAP_COLORS = ["#3B82F6", "#8B5CF6", "#14B8A6", "#F97316", "#EF4444", "#22C55E", "#EC4899", "#6366F1"];

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function StageDeconstruction({
  deconRows, weeklyHours, jobTitle, showSources,
  onRowsChange, onWeeklyHoursChange, onSubmit,
  onStageCompletion, isSubmitted, isFinalized,
}: Props) {
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterWS, setFilterWS] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterImpact, setFilterImpact] = useState("");
  const [showDict, setShowDict] = useState(false);
  const [searchTask, setSearchTask] = useState("");

  const rows = deconRows as TaskRow[];

  // ── Computed metrics ──
  const totalPct = useMemo(() => rows.reduce((s, r) => s + Number(r["Current Time Spent %"] || 0), 0), [rows]);
  const totalHrs = useMemo(() => Math.round(totalPct * weeklyHours / 100 * 10) / 10, [totalPct, weeklyHours]);
  const workstreams = useMemo(() => [...new Set(rows.map(r => r.Workstream).filter(Boolean))], [rows]);
  const taskTypes = useMemo(() => [...new Set(rows.map(r => r["Task Type"]).filter(Boolean))], [rows]);

  const impactCounts = useMemo(() => {
    const c = { High: 0, Moderate: 0, Low: 0 };
    rows.forEach(r => { const imp = r["AI Impact"] as keyof typeof c; if (c[imp] !== undefined) c[imp]++; });
    return c;
  }, [rows]);

  const hoursByImpact = useMemo(() => {
    const h = { High: 0, Moderate: 0, Low: 0 };
    rows.forEach(r => { const imp = r["AI Impact"] as keyof typeof h; if (h[imp] !== undefined) h[imp] += Number(r["Current Time Spent %"] || 0) * weeklyHours / 100; });
    return h;
  }, [rows, weeklyHours]);

  const wsByHours = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach(r => { const ws = r.Workstream || "Other"; m[ws] = (m[ws] || 0) + Number(r["Current Time Spent %"] || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const typeByPct = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach(r => { const t = r["Task Type"] || "Other"; m[t] = (m[t] || 0) + Number(r["Current Time Spent %"] || 0); });
    return Object.entries(m);
  }, [rows]);

  // Validation
  const blankRequired = useMemo(() => rows.filter(r => !r["Task Name"]?.toString().trim() || !r["AI Impact"]).length, [rows]);
  const isValid = totalPct === 100 && blankRequired === 0 && rows.length > 0;

  // Stage completion
  useEffect(() => {
    if (rows.length === 0) { onStageCompletion(0); return; }
    const classified = rows.filter(r => r.Workstream && r["Task Type"] && r["AI Impact"] && r["Current Time Spent %"]).length;
    onStageCompletion(Math.round((classified / rows.length) * 100));
  }, [rows, onStageCompletion]);

  // ── Cell update ──
  const updateCell = useCallback((idx: number, field: string, value: unknown) => {
    const next = rows.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    onRowsChange(next);
  }, [rows, onRowsChange]);

  const addTask = useCallback(() => {
    const maxId = rows.reduce((m, r) => { const n = parseInt(String(r["Task ID"] || "T0").replace("T", ""), 10); return n > m ? n : m; }, 0);
    onRowsChange([...rows, {
      "Task ID": `T${String(maxId + 1).padStart(3, "0")}`, "Task Name": "", Workstream: "",
      "AI Impact": "Low", "Est Hours/Week": 0, "Current Time Spent %": 0, "Time Saved %": 0,
      "Task Type": "Variable", Interaction: "Interactive", Logic: "Probabilistic",
      "Primary Skill": "", "Secondary Skill": "",
    }]);
  }, [rows, onRowsChange]);

  const deleteTask = useCallback((idx: number) => {
    onRowsChange(rows.filter((_, i) => i !== idx));
  }, [rows, onRowsChange]);

  const duplicateTask = useCallback((idx: number) => {
    const src = rows[idx];
    const maxId = rows.reduce((m, r) => { const n = parseInt(String(r["Task ID"] || "T0").replace("T", ""), 10); return n > m ? n : m; }, 0);
    const dup = { ...src, "Task ID": `T${String(maxId + 1).padStart(3, "0")}`, "Task Name": src["Task Name"] + " (copy)" };
    onRowsChange([...rows.slice(0, idx + 1), dup, ...rows.slice(idx + 1)]);
  }, [rows, onRowsChange]);

  // ── Sort + filter ──
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const visibleRows = useMemo(() => {
    let result = [...rows];
    if (filterWS) result = result.filter(r => r.Workstream === filterWS);
    if (filterType) result = result.filter(r => r["Task Type"] === filterType);
    if (filterImpact) result = result.filter(r => r["AI Impact"] === filterImpact);
    if (searchTask) { const s = searchTask.toLowerCase(); result = result.filter(r => r["Task Name"]?.toString().toLowerCase().includes(s)); }
    if (sortCol) {
      result.sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av || "").localeCompare(String(bv || ""));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, filterWS, filterType, filterImpact, searchTask, sortCol, sortDir]);

  // Dictionary
  const dictEntries = useMemo(() => findTaskDictEntries(jobTitle), [jobTitle]);

  const loadDict = (entry: typeof dictEntries[0]) => {
    const newRows = entry.tasks.map((t, i) => ({
      "Task ID": `T${i + 1}`, "Task Name": t.name, Workstream: t.workstream,
      "AI Impact": t.impact, "Est Hours/Week": Math.round(40 * t.pct / 100),
      "Current Time Spent %": t.pct, "Time Saved %": 0,
      "Task Type": t.type, Interaction: t.interaction, Logic: t.logic,
      "Primary Skill": t.skill1, "Secondary Skill": t.skill2,
    }));
    onRowsChange(newRows as TaskRow[]);
    setShowDict(false);
  };

  const allocHrs = Math.round(totalPct * weeklyHours / 100 * 10) / 10;
  const remainHrs = Math.round((weeklyHours - allocHrs) * 10) / 10;

  return (
    <div>
      {/* ── Summary metrics bar ── */}
      <div style={S.summaryBar}>
        <div style={S.metric}>
          <div style={S.metricLabel}>Tasks</div>
          <div style={S.metricValue}>{rows.length}</div>
        </div>
        <div style={S.metric}>
          <div style={S.metricLabel}>Hours / Week</div>
          <div style={S.metricValue}>{totalHrs}h</div>
          <div style={S.metricSub}>of {weeklyHours}h budget</div>
        </div>
        <div style={S.metric}>
          <div style={S.metricLabel}>Workstreams</div>
          <div style={S.metricValue}>{workstreams.length}</div>
        </div>
        <div style={{ ...S.metric, borderLeft: `3px solid ${IMPACT_COLORS.High}` }}>
          <div style={S.metricLabel}>High AI Impact</div>
          <div style={S.metricValue}>{impactCounts.High}</div>
          <div style={S.metricSub}>{hoursByImpact.High.toFixed(1)}h automated</div>
        </div>
        <div style={{ ...S.metric, borderLeft: `3px solid ${IMPACT_COLORS.Moderate}` }}>
          <div style={S.metricLabel}>Moderate</div>
          <div style={S.metricValue}>{impactCounts.Moderate}</div>
          <div style={S.metricSub}>{hoursByImpact.Moderate.toFixed(1)}h augmented</div>
        </div>
        <div style={{ ...S.metric, borderLeft: `3px solid ${IMPACT_COLORS.Low}` }}>
          <div style={S.metricLabel}>Human-Led</div>
          <div style={S.metricValue}>{impactCounts.Low}</div>
          <div style={S.metricSub}>{hoursByImpact.Low.toFixed(1)}h retained</div>
        </div>
      </div>

      {/* ── Hours budget control ── */}
      <div style={S.budgetBar}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)" }}>Hours Budget:</span>
            <input type="number" value={weeklyHours} onChange={e => onWeeklyHoursChange(Math.max(1, Number(e.target.value) || 40))}
              style={{ width: 52, padding: "4px 6px", fontSize: "var(--text-xs)", fontFamily: "var(--ff-mono)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-primary)", textAlign: "center", outline: "none" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>hrs/wk</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
            <span>Allocated: <strong style={{ fontFamily: "var(--ff-mono)" }}>{allocHrs}h</strong></span>
            <span style={{ color: remainHrs >= 0 ? "#22C55E" : "#EF4444" }}>Remaining: <strong style={{ fontFamily: "var(--ff-mono)" }}>{remainHrs}h</strong></span>
            <span style={{ fontWeight: "var(--fw-bold)", fontFamily: "var(--ff-mono)", color: totalPct === 100 ? "#22C55E" : totalPct > 100 ? "#EF4444" : "#F97316" }}>{totalPct}%</span>
          </div>
        </div>
        <div style={S.progressTrack}>
          {hoursByImpact.Low > 0 && <div style={S.progressSeg(hoursByImpact.Low / weeklyHours * 100, "#22C55E")} />}
          {hoursByImpact.Moderate > 0 && <div style={S.progressSeg(hoursByImpact.Moderate / weeklyHours * 100, "#F59E0B")} />}
          {hoursByImpact.High > 0 && <div style={S.progressSeg(hoursByImpact.High / weeklyHours * 100, "#EF4444")} />}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
          <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#22C55E", marginRight: 3 }} />Human: {hoursByImpact.Low.toFixed(1)}h</span>
          <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", marginRight: 3 }} />AI-Augmented: {hoursByImpact.Moderate.toFixed(1)}h</span>
          <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#EF4444", marginRight: 3 }} />Automated: {hoursByImpact.High.toFixed(1)}h</span>
        </div>
        {totalPct !== 100 && totalPct > 0 && <div style={{ marginTop: 4, fontSize: 11, fontWeight: "var(--fw-semi)", color: "#EF4444" }}>Total is {totalPct}% — must equal 100% to proceed</div>}
      </div>

      {/* ── Visual charts row ── */}
      <div style={S.chartGrid}>
        {/* Workstream treemap */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Workstream Breakdown</div>
          <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
            {wsByHours.map(([ws, pct], i) => (
              <div key={ws} style={S.treemapCell(pct, TREEMAP_COLORS[i % TREEMAP_COLORS.length])} title={`${ws}: ${pct}%`}>
                {pct >= 8 ? `${ws} ${pct}%` : ""}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {wsByHours.map(([ws, pct], i) => (
              <span key={ws} style={{ marginRight: 8 }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 2, background: TREEMAP_COLORS[i % TREEMAP_COLORS.length], marginRight: 3 }} />
                {ws} ({pct}%)
              </span>
            ))}
          </div>
        </div>

        {/* Task type distribution */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Task Type Distribution</div>
          {typeByPct.map(([type, pct]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ width: 70, fontSize: 11, color: "var(--text-secondary)" }}>{type}</span>
              <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: type === "Repetitive" ? "#EF4444" : "#3B82F6", borderRadius: 3, transition: "width 0.3s" }} />
              </div>
              <span style={{ width: 32, fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text-muted)", textAlign: "right" }}>{pct}%</span>
            </div>
          ))}
        </div>

        {/* Validation */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Validation</div>
          {[
            { ok: totalPct === 100, text: `Time allocation = ${totalPct}%`, req: "100%" },
            { ok: blankRequired === 0, text: blankRequired === 0 ? "All fields filled" : `${blankRequired} blank fields`, req: "0 blank" },
            { ok: rows.length >= 5, text: `${rows.length} tasks defined`, req: "≥5 tasks" },
            { ok: isValid, text: isValid ? "Ready to submit" : "Fix issues above", req: "" },
          ].map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 11 }}>
              {v.ok ? <Check size={12} style={{ color: "#22C55E" }} /> : <AlertTriangle size={12} style={{ color: "#F97316" }} />}
              <span style={{ color: v.ok ? "#22C55E" : "var(--text-secondary)" }}>{v.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Empty state prompt ── */}
      {rows.length === 0 && (
        <div style={S.emptyPrompt}>
          <Sparkles size={28} style={{ color: "#F97316", marginBottom: 8, opacity: 0.6 }} />
          <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)", marginBottom: 4 }}>
            No tasks yet for {jobTitle}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 12 }}>
            Generate a task breakdown with AI, load from the dictionary, or add tasks manually.
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            <button style={S.btnAccent}><Sparkles size={11} /> Auto-Generate Tasks</button>
            {dictEntries.length > 0 && <button style={S.btn} onClick={() => setShowDict(true)}><BookOpen size={11} /> Dictionary ({dictEntries.length})</button>}
            <button style={S.btn} onClick={addTask}><Plus size={11} /> Add Manually</button>
          </div>
        </div>
      )}

      {/* ── Task dictionary panel ── */}
      {showDict && dictEntries.length > 0 && (
        <div style={S.dictPanel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "#8B5CF6", display: "flex", alignItems: "center", gap: 6 }}><BookOpen size={14} /> Task Dictionary — {jobTitle}</span>
            <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => setShowDict(false)}><X size={14} /></button>
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 10 }}>Pre-built task portfolios. Loading replaces your current tasks.</div>
          {dictEntries.map((entry, ei) => (
            <div key={ei} style={S.dictEntry}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ padding: "2px 8px", fontSize: 11, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 4, color: "#8B5CF6", fontWeight: 600 }}>{entry.industry}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{entry.tasks.length} tasks</span>
                </div>
                <button style={{ ...S.btn, color: "#8B5CF6", borderColor: "rgba(139,92,246,0.3)" }} onClick={() => loadDict(entry)}>Load Tasks</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                {entry.tasks.map((t, ti) => (
                  <div key={ti} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
                    <span style={S.impactDot(t.impact)} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{t.name}</span>
                    <span style={{ fontFamily: "var(--ff-mono)", flexShrink: 0 }}>{t.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Task portfolio table ── */}
      {rows.length > 0 && (
        <div style={S.section}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{rows.length} tasks · {totalHrs}h/wk</span>
            <div style={S.toolbar}>
              {/* Filters */}
              {workstreams.length > 1 && (
                <select style={{ ...S.select, minWidth: 90 }} value={filterWS} onChange={e => setFilterWS(e.target.value)}>
                  <option value="">All WS</option>
                  {workstreams.map(ws => <option key={ws} value={ws}>{ws}</option>)}
                </select>
              )}
              <select style={{ ...S.select, minWidth: 80 }} value={filterImpact} onChange={e => setFilterImpact(e.target.value)}>
                <option value="">All Impact</option>
                <option value="High">High</option>
                <option value="Moderate">Moderate</option>
                <option value="Low">Low</option>
              </select>

              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 5 }}>
                <Search size={11} style={{ color: "var(--text-muted)" }} />
                <input style={{ width: 100, background: "transparent", border: "none", fontSize: 11, color: "var(--text-primary)", outline: "none" }}
                  value={searchTask} onChange={e => setSearchTask(e.target.value)} placeholder="Filter tasks…" />
              </div>

              <button style={S.btnAccent} disabled={isFinalized}><Sparkles size={11} /> Auto-Generate</button>
              {dictEntries.length > 0 && <button style={S.btn} onClick={() => setShowDict(!showDict)} disabled={isFinalized}><BookOpen size={11} /> Dictionary</button>}
              <button style={S.btn} onClick={addTask} disabled={isFinalized}><Plus size={11} /> Add Task</button>
              <button style={{ ...S.btnPrimary, opacity: !isValid || isFinalized ? 0.5 : 1 }} onClick={onSubmit} disabled={!isValid || isFinalized}>
                {isSubmitted ? "Update" : "Submit"} Deconstruction
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid var(--border)" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {[
                    { key: "Task ID", label: "ID", w: 50 },
                    { key: "Task Name", label: "Task", w: 200 },
                    { key: "Workstream", label: "WS", w: 90 },
                    { key: "Current Time Spent %", label: "Time %", w: 65 },
                    { key: "est_hrs", label: "Hrs", w: 50 },
                    { key: "AI Impact", label: "AI Impact", w: 85 },
                    { key: "Task Type", label: "Type", w: 80 },
                    { key: "Interaction", label: "Interaction", w: 90 },
                    { key: "Logic", label: "Logic", w: 95 },
                    { key: "Primary Skill", label: "Skill", w: 100 },
                    { key: "actions", label: "", w: 50 },
                  ].map(c => (
                    <th key={c.key} style={{ ...S.th, color: "#fff", width: c.w, minWidth: c.w }} onClick={() => c.key !== "actions" && c.key !== "est_hrs" && toggleSort(c.key)}>
                      {c.label} {sortCol === c.key && (sortDir === "asc" ? "↑" : "↓")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, _vi) => {
                  const idx = rows.indexOf(row);
                  const timePct = Number(row["Current Time Spent %"] || 0);
                  const estHrs = Math.round(timePct * weeklyHours / 100 * 10) / 10;
                  return (
                    <tr key={row["Task ID"] || idx} style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ ...S.td, fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--text-muted)" }}>{row["Task ID"]}</td>
                      <td style={S.td}><input style={{ ...S.input, minWidth: 160 }} value={row["Task Name"] || ""} onChange={e => updateCell(idx, "Task Name", e.target.value)} /></td>
                      <td style={S.td}><input style={{ ...S.input, width: 80 }} value={row.Workstream || ""} onChange={e => updateCell(idx, "Workstream", e.target.value)} /></td>
                      <td style={S.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input style={S.inputNum} type="number" value={timePct} onChange={e => updateCell(idx, "Current Time Spent %", Math.max(0, Number(e.target.value) || 0))} />
                          <div style={S.barBg}><div style={S.inlineBar(timePct, "#3B82F6")} /></div>
                        </div>
                      </td>
                      <td style={{ ...S.td, fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--text-muted)" }}>{estHrs}h</td>
                      <td style={S.td}>
                        <select style={S.select} value={row["AI Impact"] || "Low"} onChange={e => updateCell(idx, "AI Impact", e.target.value)}>
                          {["High", "Moderate", "Low"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={S.td}>
                        <select style={S.select} value={row["Task Type"] || "Variable"} onChange={e => updateCell(idx, "Task Type", e.target.value)}>
                          {["Repetitive", "Variable"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={S.td}>
                        <select style={S.select} value={row.Interaction || "Interactive"} onChange={e => updateCell(idx, "Interaction", e.target.value)}>
                          {["Independent", "Interactive", "Collaborative"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={S.td}>
                        <select style={S.select} value={row.Logic || "Probabilistic"} onChange={e => updateCell(idx, "Logic", e.target.value)}>
                          {["Deterministic", "Probabilistic", "Judgment-heavy"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={S.td}><input style={{ ...S.input, width: 90 }} value={row["Primary Skill"] || ""} onChange={e => updateCell(idx, "Primary Skill", e.target.value)} /></td>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                        <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }} onClick={() => duplicateTask(idx)} title="Duplicate"><Copy size={11} /></button>
                        <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }} onClick={() => deleteTask(idx)} title="Delete"><X size={11} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ ...S.footer, color: "#fff", fontSize: 11 }}>Total</td>
                  <td style={{ ...S.footer, color: totalPct === 100 ? "#22C55E" : "#EF4444", fontFamily: "var(--ff-mono)", fontSize: 12 }}>{totalPct}%</td>
                  <td style={{ ...S.footer, color: "#fff", fontFamily: "var(--ff-mono)", fontSize: 11 }}>{totalHrs}h</td>
                  <td colSpan={6} style={S.footer} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
