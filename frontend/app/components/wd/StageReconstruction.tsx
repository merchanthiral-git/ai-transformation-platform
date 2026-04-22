"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles, Check, AlertTriangle, ChevronDown, Search,
  ArrowRight, ArrowUpRight, ArrowDownRight, Minus as MinusIcon,
} from "@/lib/icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface RedeployRow {
  "Task ID": string; "Task Name": string; Workstream: string;
  "AI Impact": string; "Task Type": string; Interaction: string; Logic: string;
  "Current Time Spent %": number; "New Time %": number;
  Decision: string; Technology: string;
  "Redeployment Destination": string; "Future Skill": string; Notes: string;
  "Primary Skill"?: string; "Secondary Skill"?: string;
  [key: string]: unknown;
}

interface ReconResult {
  action_counts?: Record<string, number>;
  waterfall?: Record<string, number>;
  reconstruction?: Record<string, unknown>[];
  rollup?: Record<string, unknown>[];
  recommendations?: string[];
  insights?: Record<string, unknown>[];
  value_model?: Record<string, unknown>;
  total_current_hrs?: number;
  total_future_hrs?: number;
  evolution?: string;
}

interface Props {
  deconRows: Record<string, unknown>[];
  redeployRows: RedeployRow[];
  reconData: ReconResult | null;
  scenario: string;
  isDeconSubmitted: boolean;
  isRedeploySubmitted: boolean;
  isFinalized: boolean;
  showSources: boolean;
  onRedeployRowsChange: (rows: RedeployRow[]) => void;
  onScenarioChange: (s: string) => void;
  onSubmitRedeploy: () => void;
  onFinalize: () => void;
  onStageCompletion: (pct: number) => void;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const DECISION_COLORS: Record<string, string> = {
  Retain: "#22C55E", Augment: "#f4a83a", Automate: "#e87a5d",
  Redesign: "#f4a83a", Transfer: "#a78bb8", Eliminate: "#9CA3AF",
};

const TECH_MAP: Record<string, string> = {
  Automate: "RPA", Augment: "GenAI", Redesign: "Agentic AI",
  Retain: "Human-led", Transfer: "Shared Service", Eliminate: "N/A",
};

const WATERFALL_COLORS = ["#f4a83a", "#e87a5d", "#f4a83a", "#22C55E", "#a78bb8"];

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  locked: { textAlign: "center" as const, padding: "60px 24px", color: "var(--text-muted)" } as React.CSSProperties,
  scenarioBar: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 } as React.CSSProperties,
  scenarioPill: (active: boolean) => ({ padding: "6px 18px", fontSize: 12, fontWeight: active ? "var(--fw-semi)" : "var(--fw-medium)", border: `1px solid ${active ? "#f4a83a" : "var(--border)"}`, borderRadius: 16, background: active ? "rgba(244,168,58,0.08)" : "var(--surface-2)", color: active ? "#f4a83a" : "var(--text-muted)", cursor: "pointer" }) as React.CSSProperties,
  kpiRow: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" as const } as React.CSSProperties,
  kpi: (accent: string) => ({ background: "var(--surface-1)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: "12px 16px", minWidth: 110 }) as React.CSSProperties,
  kpiLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" } as React.CSSProperties,
  kpiValue: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-bold)", fontFamily: "var(--ff-mono)", color: "var(--text-primary)", marginTop: 2 } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 } as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "separate" as const, borderSpacing: 0, fontSize: "var(--text-xs)" } as React.CSSProperties,
  th: { padding: "7px 8px", fontSize: 11, fontWeight: 600, color: "#fff", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "2px solid var(--border)", background: "#161822", whiteSpace: "nowrap" as const } as React.CSSProperties,
  td: { padding: "6px 8px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const } as React.CSSProperties,
  select: { padding: "4px 6px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid transparent", borderRadius: 4, color: "var(--text-primary)", outline: "none", appearance: "none" as const } as React.CSSProperties,
  inputNum: { width: 50, padding: "4px 6px", fontSize: "var(--text-xs)", fontFamily: "var(--ff-mono)", background: "var(--surface-2)", border: "1px solid transparent", borderRadius: 4, color: "var(--text-primary)", outline: "none", textAlign: "center" as const } as React.CSSProperties,
  input: { width: "100%", padding: "4px 6px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid transparent", borderRadius: 4, color: "var(--text-primary)", outline: "none" } as React.CSSProperties,
  decisionBadge: (d: string) => ({ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", fontSize: 11, fontWeight: 600, borderRadius: 4, background: `${DECISION_COLORS[d] || "#9CA3AF"}15`, color: DECISION_COLORS[d] || "#9CA3AF" }) as React.CSSProperties,
  delta: (v: number) => ({ fontFamily: "var(--ff-mono)", fontSize: 11, color: v < 0 ? "#22C55E" : v > 0 ? "#e87a5d" : "var(--text-muted)" }) as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 5, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 11, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 5, background: "#f4a83a", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  btnSuccess: { display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 16px", fontSize: 12, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#22C55E", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  btnAccent: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 11, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 5, background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  footer: { padding: "8px", background: "#161822", fontWeight: "var(--fw-bold)", color: "#fff" } as React.CSSProperties,
  insightItem: { display: "flex", alignItems: "flex-start", gap: 6, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" } as React.CSSProperties,
  skillRow: { display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)" } as React.CSSProperties,
  confidenceSelect: { padding: "3px 6px", fontSize: 11, background: "var(--surface-2)", border: "1px solid transparent", borderRadius: 3, color: "var(--text-muted)", outline: "none", appearance: "none" as const } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function StageReconstruction({
  deconRows, redeployRows, reconData, scenario,
  isDeconSubmitted, isRedeploySubmitted, isFinalized, showSources,
  onRedeployRowsChange, onScenarioChange, onSubmitRedeploy, onFinalize,
  onStageCompletion,
}: Props) {
  // ── Locked state ──
  if (!isDeconSubmitted) {
    return (
      <div style={S.locked}>
        <AlertTriangle size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
        <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)", marginBottom: 4 }}>
          Deconstruction Required
        </div>
        <div style={{ fontSize: "var(--text-xs)" }}>Complete and submit task decomposition in Stage 2 to unlock Reconstruction.</div>
      </div>
    );
  }

  const rows = redeployRows;

  // ── Cell update ──
  const updateCell = (idx: number, field: string, value: unknown) => {
    const next = rows.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value };
      // Auto-map technology when decision changes
      if (field === "Decision") {
        updated.Technology = TECH_MAP[value as string] || "Human-led";
      }
      return updated;
    });
    onRedeployRowsChange(next);
  };

  // ── AI auto-recommend ──
  const aiRecommend = () => {
    const next = rows.map(row => {
      const impact = String(row["AI Impact"]);
      const taskType = String(row["Task Type"]);
      const logic = String(row.Logic);
      const inter = String(row.Interaction);
      let decision = "Retain";
      if (impact === "High" && taskType === "Repetitive" && logic === "Deterministic") decision = "Automate";
      else if (impact === "High") decision = "Augment";
      else if (impact === "Moderate" && inter === "Independent") decision = "Augment";
      else if (impact === "Moderate") decision = "Redesign";
      return { ...row, Decision: decision, Technology: TECH_MAP[decision] || "Human-led" };
    });
    onRedeployRowsChange(next);
  };

  // ── Computed ──
  const totalCurrentPct = useMemo(() => rows.reduce((s, r) => s + Number(r["Current Time Spent %"] || 0), 0), [rows]);
  const totalNewPct = useMemo(() => rows.reduce((s, r) => s + Number(r["New Time %"] || 0), 0), [rows]);
  const decisionCounts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach(r => { c[r.Decision] = (c[r.Decision] || 0) + 1; });
    return c;
  }, [rows]);
  const isRedeployValid = rows.length > 0 && totalNewPct <= 100;

  // Stage completion
  useEffect(() => {
    if (rows.length === 0) { onStageCompletion(0); return; }
    const decided = rows.filter(r => r.Decision && r.Decision !== "").length;
    const pct = Math.round((decided / rows.length) * 100);
    onStageCompletion(isRedeploySubmitted ? Math.max(pct, 80) : pct);
  }, [rows, isRedeploySubmitted, onStageCompletion]);

  // Recon data
  const rc = reconData || {};
  const wf = (rc.waterfall || {}) as Record<string, number>;
  const recs = (rc.recommendations || []) as string[];

  // Waterfall chart data
  const waterfallData = useMemo(() => {
    if (!Object.keys(wf).length) return [];
    return Object.entries(wf).map(([name, value]) => ({ name, value: Number(value) }));
  }, [wf]);

  // Future skills from redeployment
  const futureSkills = useMemo(() => {
    const skills: Record<string, { source: string; count: number }> = {};
    rows.forEach(r => {
      const fs = r["Future Skill"] || r["Primary Skill"] || "";
      if (fs) {
        const src = r.Decision === "Retain" ? "Current" : r.Decision === "Augment" ? "Upgraded" : "New";
        skills[fs as string] = { source: src, count: (skills[fs as string]?.count || 0) + 1 };
      }
    });
    return Object.entries(skills).sort((a, b) => b[1].count - a[1].count);
  }, [rows]);

  return (
    <div>
      {/* ── Scenario selector ── */}
      <div style={S.scenarioBar}>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginRight: 4 }}>Scenario:</span>
        {["Conservative", "Balanced", "Aggressive"].map(s => (
          <button key={s} style={S.scenarioPill(scenario === s)} onClick={() => onScenarioChange(s)}>{s}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button style={S.btnAccent} onClick={aiRecommend} disabled={isFinalized}>
            <Sparkles size={11} /> Auto-Recommend
          </button>
          <button style={{ ...S.btnPrimary, opacity: !isRedeployValid || isFinalized ? 0.5 : 1 }}
            onClick={onSubmitRedeploy} disabled={!isRedeployValid || isFinalized}>
            {isRedeploySubmitted ? "Re-compute" : "Submit"} Reconstruction
          </button>
        </div>
      </div>

      {/* ── Decision KPIs ── */}
      <div style={S.kpiRow}>
        {Object.entries(DECISION_COLORS).filter(([d]) => d !== "Eliminate").map(([d, color]) => (
          <div key={d} style={S.kpi(color)}>
            <div style={S.kpiLabel}>{d}</div>
            <div style={S.kpiValue}>{decisionCounts[d] || 0}</div>
          </div>
        ))}
        <div style={S.kpi("var(--text-muted)")}>
          <div style={S.kpiLabel}>New Time Total</div>
          <div style={{ ...S.kpiValue, color: totalNewPct <= 100 ? "#22C55E" : "#e87a5d" }}>{totalNewPct}%</div>
        </div>
      </div>

      {/* ── Decision table + side panel ── */}
      <div style={S.grid}>
        {/* Main table */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Reconstruction Decisions</div>
          <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid var(--border)" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["ID", "Task", "Current %", "Decision", "Tech / Tool", "Future %", "Δ", "Confidence", "Destination"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const curPct = Number(row["Current Time Spent %"] || 0);
                  const newPct = Number(row["New Time %"] || 0);
                  const delta = newPct - curPct;
                  return (
                    <tr key={row["Task ID"] || idx}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,168,58,0.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ ...S.td, fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--text-muted)", width: 44 }}>{row["Task ID"]}</td>
                      <td style={{ ...S.td, minWidth: 140, color: "var(--text-primary)", fontWeight: "var(--fw-medium)" }}>{row["Task Name"]}</td>
                      <td style={{ ...S.td, fontFamily: "var(--ff-mono)", textAlign: "center", width: 55 }}>{curPct}%</td>
                      <td style={{ ...S.td, width: 100 }}>
                        <select style={{ ...S.select, color: DECISION_COLORS[row.Decision] || "var(--text-primary)", fontWeight: 600 }}
                          value={row.Decision || "Retain"} onChange={e => updateCell(idx, "Decision", e.target.value)}>
                          {["Retain", "Augment", "Automate", "Redesign", "Transfer", "Eliminate"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={{ ...S.td, width: 100 }}>
                        <input style={{ ...S.input, width: 90 }} value={row.Technology || ""} onChange={e => updateCell(idx, "Technology", e.target.value)} />
                      </td>
                      <td style={{ ...S.td, width: 55 }}>
                        <input style={S.inputNum} type="number" value={newPct} onChange={e => updateCell(idx, "New Time %", Math.max(0, Number(e.target.value) || 0))} />
                      </td>
                      <td style={{ ...S.td, width: 45 }}>
                        <span style={S.delta(delta)}>
                          {delta < 0 ? `${delta}` : delta > 0 ? `+${delta}` : "—"}
                        </span>
                      </td>
                      <td style={{ ...S.td, width: 70 }}>
                        <select style={S.confidenceSelect} value={(row as any).Confidence || "Medium"} onChange={e => updateCell(idx, "Confidence", e.target.value)}>
                          {["High", "Medium", "Low"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td style={S.td}>
                        <input style={{ ...S.input, width: 120 }} value={row["Redeployment Destination"] || ""} onChange={e => updateCell(idx, "Redeployment Destination", e.target.value)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={S.footer}>Total</td>
                  <td style={{ ...S.footer, fontFamily: "var(--ff-mono)", textAlign: "center" }}>{totalCurrentPct}%</td>
                  <td colSpan={2} style={S.footer} />
                  <td style={{ ...S.footer, fontFamily: "var(--ff-mono)", textAlign: "center", color: totalNewPct <= 100 ? "#22C55E" : "#e87a5d" }}>{totalNewPct}%</td>
                  <td style={{ ...S.footer, fontFamily: "var(--ff-mono)" }}>
                    <span style={{ color: totalNewPct - totalCurrentPct < 0 ? "#22C55E" : "#e87a5d" }}>
                      {totalNewPct - totalCurrentPct < 0 ? `${totalNewPct - totalCurrentPct}` : `+${totalNewPct - totalCurrentPct}`}
                    </span>
                  </td>
                  <td colSpan={2} style={S.footer} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Side panel */}
        <div>
          {/* Capacity waterfall */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Capacity Waterfall</div>
            {waterfallData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={waterfallData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {waterfallData.map((_, i) => <Cell key={i} fill={WATERFALL_COLORS[i % WATERFALL_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: "center", padding: 20, fontSize: 11, color: "var(--text-muted)" }}>
                Submit reconstruction to see the waterfall
              </div>
            )}
          </div>

          {/* Future skills */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Future Skills Inventory</div>
            {futureSkills.length > 0 ? futureSkills.slice(0, 10).map(([skill, info]) => (
              <div key={skill} style={S.skillRow}>
                <span style={{ flex: 1, color: "var(--text-primary)" }}>{skill}</span>
                <span style={{
                  padding: "1px 6px", fontSize: 11, fontWeight: 600, borderRadius: 3,
                  background: info.source === "New" ? "rgba(244,168,58,0.1)" : info.source === "Upgraded" ? "rgba(244,168,58,0.1)" : "rgba(34,197,94,0.1)",
                  color: info.source === "New" ? "#f4a83a" : info.source === "Upgraded" ? "#f4a83a" : "#22C55E",
                }}>{info.source}</span>
              </div>
            )) : (
              <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: 12 }}>
                Assign future skills in the decision table
              </div>
            )}
          </div>

          {/* Recommendations */}
          {recs.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Insights</div>
              {recs.slice(0, 5).map((r, i) => (
                <div key={i} style={S.insightItem}>
                  <Sparkles size={11} style={{ color: "#f4a83a", flexShrink: 0, marginTop: 1 }} />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Finalize ── */}
      {isRedeploySubmitted && reconData && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button style={{ ...S.btnSuccess, opacity: isFinalized ? 0.7 : 1 }} onClick={onFinalize} disabled={isFinalized}>
            {isFinalized ? <><Check size={13} /> Finalized</> : "Finalize Work Design"}
          </button>
        </div>
      )}
    </div>
  );
}
