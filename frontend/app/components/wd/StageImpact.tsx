"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, ArrowUpRight, ArrowDownRight, Check, Copy,
  Download, Sparkles, Clock, Minus as MinusIcon,
} from "@/lib/icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface ReconResult {
  total_current_hrs?: number;
  total_future_hrs?: number;
  evolution?: string;
  value_model?: Record<string, unknown>;
  insights?: Record<string, unknown>[];
  reconstruction?: Record<string, unknown>[];
  waterfall?: Record<string, number>;
  action_counts?: Record<string, number>;
  recommendations?: string[];
  [key: string]: unknown;
}

interface Props {
  reconData: ReconResult | null;
  redeployRows: Record<string, unknown>[];
  contextData: Record<string, unknown>;
  isRedeploySubmitted: boolean;
  onStageCompletion: (pct: number) => void;
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  locked: { textAlign: "center" as const, padding: "60px 24px", color: "var(--text-muted)" } as React.CSSProperties,
  heroRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 } as React.CSSProperties,
  hero: (accent: string) => ({ background: "var(--surface-1)", border: "1px solid var(--border)", borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: "20px 22px" }) as React.CSSProperties,
  heroLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 } as React.CSSProperties,
  heroValue: { fontSize: 36, fontWeight: 700, fontFamily: "var(--ff-mono)", color: "var(--text-primary)", lineHeight: 1 } as React.CSSProperties,
  heroBench: { fontSize: 11, color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 } as React.CSSProperties,
  heroDir: (up: boolean) => ({ color: up ? "#22C55E" : "#e87a5d", display: "inline-flex", alignItems: "center", gap: 2 }) as React.CSSProperties,
  chartGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 } as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px" } as React.CSSProperties,
  sectionTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  narrative: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 } as React.CSSProperties,
  narrativeText: { fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap" as const } as React.CSSProperties,
  vmRow: { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)" } as React.CSSProperties,
  vmLabel: { color: "var(--text-muted)" } as React.CSSProperties,
  vmValue: { fontWeight: "var(--fw-semi)", fontFamily: "var(--ff-mono)", color: "var(--text-primary)" } as React.CSSProperties,
  insightRow: { display: "flex", gap: 8, padding: "8px 12px", borderRadius: 6, marginBottom: 4, background: "rgba(244,168,58,0.03)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" } as React.CSSProperties,
  actionBar: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 16px", fontSize: 11, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#f4a83a", color: "#fff", cursor: "pointer" } as React.CSSProperties,
};

const WATERFALL_COLORS = ["#f4a83a", "#e87a5d", "#f4a83a", "#22C55E", "#a78bb8"];
const PIE_COLORS = ["#22C55E", "#f4a83a", "#f4a83a", "#e87a5d"];

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function StageImpact({ reconData, redeployRows, contextData, isRedeploySubmitted, onStageCompletion }: Props) {
  const [reviewed, setReviewed] = useState(false);

  if (!isRedeploySubmitted || !reconData) {
    return (
      <div style={S.locked}>
        <AlertTriangle size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
        <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)", marginBottom: 4 }}>Reconstruction Required</div>
        <div style={{ fontSize: "var(--text-xs)" }}>Submit Reconstruction in Stage 3 to see the impact dashboard.</div>
      </div>
    );
  }

  useEffect(() => { onStageCompletion(reviewed ? 100 : 80); }, [reviewed, onStageCompletion]);

  const rc = reconData;
  const totalCurrent = rc.total_current_hrs || 0;
  const totalFuture = rc.total_future_hrs || 0;
  const released = Math.max(totalCurrent - totalFuture, 0);
  const releasedPct = totalCurrent > 0 ? Math.round(released / totalCurrent * 100) : 0;
  const vm = (rc.value_model || {}) as Record<string, string | number>;
  const insights = (rc.insights || []) as Record<string, unknown>[];
  const wf = (rc.waterfall || {}) as Record<string, number>;
  const ac = (rc.action_counts || {}) as Record<string, number>;
  const recs = (rc.recommendations || []) as string[];

  // Waterfall data
  const waterfallData = useMemo(() => Object.entries(wf).map(([name, value]) => ({ name, value: Number(value) })), [wf]);

  // Task type mix: before and after
  const valueMix = useMemo(() => {
    const before: Record<string, number> = {};
    const after: Record<string, number> = {};
    const rows = redeployRows.length > 0 ? redeployRows : (rc.reconstruction || []) as Record<string, unknown>[];
    rows.forEach(r => {
      const type = String(r["Task Type"] || "Other");
      const cur = Number(r["Current Time Spent %"] || 0);
      const fut = Number(r["New Time %"] || r["Future Time %"] || 0);
      before[type] = (before[type] || 0) + cur;
      after[type] = (after[type] || 0) + fut;
    });
    return {
      before: Object.entries(before).map(([name, value]) => ({ name, value })),
      after: Object.entries(after).map(([name, value]) => ({ name, value })),
    };
  }, [redeployRows, rc.reconstruction]);

  // Cost saved
  const costSaved = String(vm["Cost Saved / Year"] || "$0");
  const roi = String(vm["ROI %"] || "0");
  const payback = vm["Payback (months)"] || 0;
  const productivityGain = String(vm["Productivity Gain %"] || "0");

  // Auto-generated narrative
  const narrative = useMemo(() => {
    const bcText = String((contextData as any)?.business_case || "This role is being redesigned");
    const lines = [
      `Business Context: ${bcText.slice(0, 200)}${bcText.length > 200 ? "…" : ""}`,
      "",
      `Key Changes: The reconstruction analysis identifies ${ac.Automate || 0} tasks for full automation, ${ac.Augment || 0} for AI augmentation, and ${ac.Redesign || 0} for redesign. ${ac.Retain || 0} tasks remain human-led.`,
      "",
      `Quantitative Impact: ${released.toFixed(1)} hours/week freed (${releasedPct}% of current capacity). Estimated annual cost savings of ${costSaved} with a ${payback}-month payback period and ${roi}% ROI.`,
      "",
      `Workforce Impact: Role evolution classified as "${rc.evolution || "pending"}". ${recs.length > 0 ? recs[0] : ""}`,
    ];
    return lines.join("\n");
  }, [contextData, ac, released, releasedPct, costSaved, payback, roi, rc.evolution, recs]);

  return (
    <div>
      {/* ── Hero metrics ── */}
      <div style={S.heroRow}>
        <div style={S.hero("#f4a83a")}>
          <div style={S.heroLabel}>Hours Freed / Week</div>
          <div style={S.heroValue}>{released.toFixed(1)}<span style={{ fontSize: 16, fontWeight: 400, color: "var(--text-muted)" }}>h</span></div>
          <div style={S.heroBench}>
            <span style={S.heroDir(true)}><ArrowUpRight size={11} /> {releasedPct}%</span>
            <span>capacity released</span>
          </div>
        </div>
        <div style={S.hero("#22C55E")}>
          <div style={S.heroLabel}>Cost Saved / Year</div>
          <div style={S.heroValue}>{costSaved}</div>
          <div style={S.heroBench}>
            <span>ROI: {roi}%</span>
          </div>
        </div>
        <div style={S.hero("#f4a83a")}>
          <div style={S.heroLabel}>Productivity Gain</div>
          <div style={S.heroValue}>{productivityGain}</div>
          <div style={S.heroBench}>
            <span>Payback: {payback} months</span>
          </div>
        </div>
        <div style={S.hero("#a78bb8")}>
          <div style={S.heroLabel}>FTE Efficiency</div>
          <div style={S.heroValue}>{totalFuture.toFixed(1)}<span style={{ fontSize: 16, fontWeight: 400, color: "var(--text-muted)" }}>h</span></div>
          <div style={S.heroBench}>
            <span>from {totalCurrent.toFixed(1)}h current</span>
          </div>
        </div>
      </div>

      {/* ── Charts grid ── */}
      <div style={S.chartGrid}>
        {/* Capacity waterfall */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Capacity Waterfall</div>
          {waterfallData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={waterfallData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} unit="h" />
                <Tooltip contentStyle={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((_, i) => <Cell key={i} fill={WATERFALL_COLORS[i % WATERFALL_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: "center", padding: 40, fontSize: 11, color: "var(--text-muted)" }}>No waterfall data</div>}
        </div>

        {/* Value model */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Value Model</div>
          {Object.entries(vm).map(([key, val]) => (
            <div key={key} style={S.vmRow}>
              <span style={S.vmLabel}>{key}</span>
              <span style={S.vmValue}>{String(val)}</span>
            </div>
          ))}
          {Object.keys(vm).length === 0 && <div style={{ textAlign: "center", padding: 20, fontSize: 11, color: "var(--text-muted)" }}>Computing…</div>}
        </div>
      </div>

      <div style={S.chartGrid}>
        {/* Value mix before/after */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Task Type Mix — Before vs After</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[{ label: "Before", data: valueMix.before }, { label: "After", data: valueMix.after }].map(({ label, data }) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", marginBottom: 6 }}>{label}</div>
                {data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={25} paddingAngle={2}>
                        {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div style={{ textAlign: "center", padding: 20, fontSize: 11, color: "var(--text-muted)" }}>Complete the Reconstruct stage to see impact breakdown</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", fontSize: 11, color: "var(--text-muted)" }}>
                  {data.map((d, i) => (
                    <span key={d.name}><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], marginRight: 3 }} />{d.name} {d.value}%</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transformation insights table */}
        <div style={S.section}>
          <div style={S.sectionTitle}><Sparkles size={13} /> Transformation Insights</div>
          {insights.length > 0 ? insights.slice(0, 8).map((ins, i) => (
            <div key={i} style={S.insightRow}>
              <span style={{ fontWeight: "var(--fw-semi)", color: "var(--text-muted)", minWidth: 70 }}>{String(ins.Category || "")}</span>
              <span style={{ flex: 1 }}>{String(ins.Metric || "")}: <strong>{String(ins.Value || "")}</strong></span>
              <span style={{ color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(ins.Interpretation || "")}</span>
            </div>
          )) : recs.length > 0 ? recs.map((r, i) => (
            <div key={i} style={S.insightRow}><ArrowUpRight size={11} style={{ color: "#f4a83a", flexShrink: 0 }} /><span>{r}</span></div>
          )) : <div style={{ textAlign: "center", padding: 16, fontSize: 11, color: "var(--text-muted)" }}>Run the Impact analysis to surface transformation insights</div>}
        </div>
      </div>

      {/* ── Auto-generated narrative ── */}
      <div style={S.narrative}>
        <div style={{ ...S.sectionTitle, justifyContent: "space-between" }}>
          <span>Impact Narrative</span>
          <button style={S.btn} onClick={() => navigator.clipboard?.writeText(narrative)}><Copy size={11} /> Copy</button>
        </div>
        <div style={S.narrativeText}>{narrative}</div>
      </div>

      {/* ── Review action ── */}
      <div style={S.actionBar}>
        <button style={S.btn}><Download size={11} /> Export to PDF</button>
        <button style={S.btn} onClick={() => {
          const points = [
            `${released.toFixed(1)}h/week freed (${releasedPct}% capacity)`,
            `${costSaved} annual cost savings, ${roi}% ROI`,
            `${ac.Automate || 0} tasks automated, ${ac.Augment || 0} augmented`,
            `Role evolution: ${rc.evolution || "pending"}`,
            `Payback period: ${payback} months`,
          ];
          navigator.clipboard?.writeText(points.join("\n"));
        }}><Copy size={11} /> Copy as Talking Points</button>
        <button style={{ ...S.btnPrimary, background: reviewed ? "#22C55E" : "#f4a83a" }} onClick={() => setReviewed(true)}>
          {reviewed ? <><Check size={12} /> Reviewed</> : "Review and Approve"}
        </button>
      </div>
    </div>
  );
}
