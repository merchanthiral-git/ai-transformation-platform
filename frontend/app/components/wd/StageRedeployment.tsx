"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AlertTriangle, Search, Sparkles, ArrowRight, Check,
} from "@/lib/icons";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface ReconResult {
  reconstruction?: Record<string, unknown>[];
  redeployment?: Record<string, unknown>[];
  total_current_hrs?: number;
  total_future_hrs?: number;
  waterfall?: Record<string, number>;
  evolution?: string;
  [key: string]: unknown;
}

interface Props {
  reconData: ReconResult | null;
  redeployRows: Record<string, unknown>[];
  isRedeploySubmitted: boolean;
  showSources: boolean;
  onStageCompletion: (pct: number) => void;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const DEST_TYPES = [
  { key: "optimized", label: "Same Role (Optimized)", color: "#22C55E" },
  { key: "adjacent", label: "Adjacent Role", color: "#f4a83a" },
  { key: "upskilled", label: "Upskilled", color: "#a78bb8" },
  { key: "redeployed", label: "New Function", color: "#f4a83a" },
  { key: "exit", label: "Exit Path", color: "#e87a5d" },
] as const;

const DECISION_TO_DEST: Record<string, string> = {
  Retain: "optimized",
  Augment: "upskilled",
  Automate: "exit",
  Redesign: "adjacent",
  Transfer: "redeployed",
  Eliminate: "exit",
};

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  locked: { textAlign: "center" as const, padding: "60px 24px", color: "var(--text-muted)" } as React.CSSProperties,
  summaryBar: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" as const } as React.CSSProperties,
  metric: (accent: string) => ({ background: "var(--surface-1)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: "12px 16px", minWidth: 120 }) as React.CSSProperties,
  metricLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" } as React.CSSProperties,
  metricValue: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-bold)", fontFamily: "var(--ff-mono)", color: "var(--text-primary)", marginTop: 2 } as React.CSSProperties,
  metricSub: { fontSize: 11, color: "var(--text-muted)", marginTop: 1 } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 16 } as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "separate" as const, borderSpacing: 0, fontSize: "var(--text-xs)" } as React.CSSProperties,
  th: { padding: "7px 8px", fontSize: 11, fontWeight: 600, color: "#fff", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "2px solid var(--border)", background: "#161822", whiteSpace: "nowrap" as const } as React.CSSProperties,
  td: { padding: "6px 8px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const, fontSize: "var(--text-xs)" } as React.CSSProperties,
  destDot: (color: string) => ({ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 6 }) as React.CSSProperties,
  skillBadge: (intensity: number) => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 22, borderRadius: 3, fontSize: 11, fontWeight: 600,
    background: intensity > 0.6 ? "rgba(244,168,58,0.2)" : intensity > 0.3 ? "rgba(244,168,58,0.1)" : intensity > 0 ? "rgba(244,168,58,0.05)" : "var(--surface-2)",
    color: intensity > 0 ? "#f4a83a" : "var(--border)",
  }) as React.CSSProperties,
  insightItem: { display: "flex", alignItems: "flex-start", gap: 6, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" } as React.CSSProperties,
  legend: { display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" as const } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   SANKEY — lightweight custom SVG
   ═══════════════════════════════════════════════════════════════ */

function SankeyFlow({ flows }: { flows: { dest: string; label: string; pct: number; color: string }[] }) {
  const total = flows.reduce((s, f) => s + f.pct, 0) || 1;
  const W = 520, H = 220, LX = 40, RX = W - 100, LW = 80, RW = 90;
  const gap = 4;
  const usable = H - gap * (flows.length - 1);

  let yOff = 0;
  const bands = flows.map(f => {
    const h = Math.max((f.pct / total) * usable, 12);
    const band = { ...f, y: yOff, h };
    yOff += h + gap;
    return band;
  });

  const srcMid = H / 2;

  return (
    <svg width={W} height={H + 10} style={{ display: "block", margin: "0 auto" }}>
      {/* Source block */}
      <rect x={LX} y={4} width={LW} height={H} rx={6} fill="#161822" />
      <text x={LX + LW / 2} y={srcMid + 4} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>Current</text>
      <text x={LX + LW / 2} y={srcMid + 18} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={9}>100%</text>

      {/* Flows */}
      {bands.map((b, i) => {
        const srcY1 = 4 + (b.y / (yOff - gap)) * H;
        const srcY2 = 4 + ((b.y + b.h) / (yOff - gap)) * H;
        const dstY1 = b.y + 4;
        const dstY2 = b.y + b.h + 4;
        const cx1 = LX + LW + (RX - LX - LW) * 0.4;
        const cx2 = LX + LW + (RX - LX - LW) * 0.6;

        return (
          <g key={i}>
            {/* Flow path */}
            <path
              d={`M${LX + LW},${srcY1} C${cx1},${srcY1} ${cx2},${dstY1} ${RX},${dstY1}
                  L${RX},${dstY2}
                  C${cx2},${dstY2} ${cx1},${srcY2} ${LX + LW},${srcY2} Z`}
              fill={b.color} opacity={0.2}
            />
            <path
              d={`M${LX + LW},${(srcY1 + srcY2) / 2} C${cx1},${(srcY1 + srcY2) / 2} ${cx2},${(dstY1 + dstY2) / 2} ${RX},${(dstY1 + dstY2) / 2}`}
              stroke={b.color} strokeWidth={2} fill="none" opacity={0.6}
            />
            {/* Destination block */}
            <rect x={RX} y={dstY1} width={RW} height={Math.max(dstY2 - dstY1, 12)} rx={4} fill={b.color} opacity={0.15} stroke={b.color} strokeWidth={1} />
            <text x={RX + RW / 2} y={(dstY1 + dstY2) / 2 + 1} textAnchor="middle" fill={b.color} fontSize={9} fontWeight={600}>
              {b.pct >= 5 ? `${b.label}` : ""}
            </text>
            <text x={RX + RW / 2} y={(dstY1 + dstY2) / 2 + 12} textAnchor="middle" fill={b.color} fontSize={8} opacity={0.7}>
              {b.pct >= 5 ? `${b.pct}%` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function StageRedeployment({ reconData, redeployRows, isRedeploySubmitted, showSources, onStageCompletion }: Props) {
  if (!isRedeploySubmitted || !reconData) {
    return (
      <div style={S.locked}>
        <AlertTriangle size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
        <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)", marginBottom: 4 }}>
          Reconstruction Required
        </div>
        <div style={{ fontSize: "var(--text-xs)" }}>Submit Reconstruction in Stage 3 to see the redeployment analysis.</div>
      </div>
    );
  }

  const rc = reconData;
  const recon = (rc.reconstruction || []) as Record<string, unknown>[];
  const detail = (rc.redeployment || recon) as Record<string, unknown>[];
  const totalCurrent = rc.total_current_hrs || 0;
  const totalFuture = rc.total_future_hrs || 0;
  const released = Math.max(totalCurrent - totalFuture, 0);
  const evolution = rc.evolution || "—";

  // Stage completion — view-only stage, 100% when opened with data
  useEffect(() => { onStageCompletion(100); }, [onStageCompletion]);

  // ── Sankey flows ──
  const flows = useMemo(() => {
    const destPcts: Record<string, number> = {};
    const rows = redeployRows.length > 0 ? redeployRows : recon;
    rows.forEach(r => {
      const decision = String(r["Decision"] || r["Action"] || "Retain");
      const destKey = DECISION_TO_DEST[decision] || "optimized";
      const pct = Number(r["Current Time Spent %"] || r["Current Hrs"] || 0);
      destPcts[destKey] = (destPcts[destKey] || 0) + pct;
    });
    // Normalize to 100
    const total = Object.values(destPcts).reduce((s, v) => s + v, 0) || 1;
    return DEST_TYPES
      .map(dt => ({ dest: dt.key, label: dt.label, pct: Math.round((destPcts[dt.key] || 0) / total * 100), color: dt.color }))
      .filter(f => f.pct > 0);
  }, [redeployRows, recon]);

  // ── Skill shift matrix ──
  const skillShift = useMemo(() => {
    const currentSkills = new Set<string>();
    const futureSkills = new Set<string>();
    const matrix: Record<string, Record<string, number>> = {};

    const rows = redeployRows.length > 0 ? redeployRows : recon;
    rows.forEach(r => {
      const cur = String(r["Primary Skill"] || "");
      const fut = String(r["Future Skill"] || r["Primary Skill"] || "");
      if (cur) currentSkills.add(cur);
      if (fut) futureSkills.add(fut);
      if (cur && fut) {
        if (!matrix[cur]) matrix[cur] = {};
        matrix[cur][fut] = (matrix[cur][fut] || 0) + 1;
      }
    });

    const curArr = [...currentSkills].sort().slice(0, 8);
    const futArr = [...futureSkills].sort().slice(0, 8);
    const maxVal = Math.max(...Object.values(matrix).flatMap(r => Object.values(r)), 1);

    return { current: curArr, future: futArr, matrix, maxVal };
  }, [redeployRows, recon]);

  // ── Detail table rows ──
  const detailRows = useMemo(() => {
    return detail.map(r => ({
      task: String(r["Task Name"] || ""),
      workstream: String(r["Workstream"] || ""),
      action: String(r["Action"] || r["Redeployment Focus"] || ""),
      futureState: String(r["Future State"] || ""),
      releasedPct: Number(r["Released %"] || 0),
      releasedHrs: Number(r["Released Hrs"] || 0),
      destination: String(r["Capacity Destination"] || r["Redeployment Destination"] || ""),
      skill: String(r["Primary Skill"] || ""),
    }));
  }, [detail]);

  // Insights
  const insights = useMemo(() => {
    const msgs: string[] = [];
    const retainPct = flows.find(f => f.dest === "optimized")?.pct || 0;
    const exitPct = flows.find(f => f.dest === "exit")?.pct || 0;
    const upskillPct = flows.find(f => f.dest === "upskilled")?.pct || 0;
    if (retainPct > 50) msgs.push(`${retainPct}% of capacity stays in the optimized current role — this is a refinement, not a restructure.`);
    if (exitPct > 20) msgs.push(`${exitPct}% of capacity is on an exit path — plan change management conversations early.`);
    if (upskillPct > 30) msgs.push(`${upskillPct}% requires upskilling — budget for training and transition time.`);
    if (released > 5) msgs.push(`${released.toFixed(1)} hours/week freed — redeploy to higher-value analytical and advisory work.`);
    if (msgs.length === 0) msgs.push("Redeployment analysis complete. Review the flow and detail table for specifics.");
    return msgs;
  }, [flows, released]);

  return (
    <div>
      {/* ── Summary metrics ── */}
      <div style={S.summaryBar}>
        <div style={S.metric("#f4a83a")}>
          <div style={S.metricLabel}>Current Hours</div>
          <div style={S.metricValue}>{totalCurrent.toFixed(1)}h</div>
          <div style={S.metricSub}>per week</div>
        </div>
        <div style={S.metric("#22C55E")}>
          <div style={S.metricLabel}>Future Hours</div>
          <div style={S.metricValue}>{totalFuture.toFixed(1)}h</div>
        </div>
        <div style={S.metric("#f4a83a")}>
          <div style={S.metricLabel}>Released</div>
          <div style={{ ...S.metricValue, color: "#f4a83a" }}>{released.toFixed(1)}h</div>
          <div style={S.metricSub}>{totalCurrent > 0 ? `${Math.round(released / totalCurrent * 100)}% capacity freed` : ""}</div>
        </div>
        <div style={S.metric("var(--text-muted)")}>
          <div style={S.metricLabel}>Evolution</div>
          <div style={{ ...S.metricValue, fontSize: "var(--text-sm)" }}>{evolution}</div>
        </div>
      </div>

      {/* ── Sankey + side panel ── */}
      <div style={S.grid}>
        {/* Sankey flow */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Capacity Redeployment Flow</div>
          {flows.length > 0 ? (
            <>
              <SankeyFlow flows={flows} />
              <div style={S.legend}>
                {DEST_TYPES.map(dt => {
                  const f = flows.find(fl => fl.dest === dt.key);
                  if (!f) return null;
                  return (
                    <span key={dt.key}>
                      <span style={S.destDot(dt.color)} />{dt.label} ({f.pct}%)
                    </span>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 32, fontSize: 11, color: "var(--text-muted)" }}>No redeployment flows yet. Complete the Reconstruct stage to generate capacity flow data.</div>
          )}
        </div>

        {/* Skill shift matrix + insights */}
        <div>
          <div style={S.section}>
            <div style={S.sectionTitle}>Skill Shift Matrix</div>
            {skillShift.current.length > 0 && skillShift.future.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "separate", borderSpacing: 2, fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: 4, fontSize: 8, color: "var(--text-muted)", textAlign: "left" }}>Current ↓ / Future →</th>
                      {skillShift.future.map(fs => (
                        <th key={fs} style={{ padding: 4, fontSize: 8, color: "var(--text-muted)", textAlign: "center", maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fs}>{fs.slice(0, 8)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {skillShift.current.map(cs => (
                      <tr key={cs}>
                        <td style={{ padding: 4, fontSize: 8, color: "var(--text-muted)", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cs}>{cs.slice(0, 10)}</td>
                        {skillShift.future.map(fs => {
                          const val = skillShift.matrix[cs]?.[fs] || 0;
                          return (
                            <td key={fs} style={{ textAlign: "center" }}>
                              <span style={S.skillBadge(val / skillShift.maxVal)}>
                                {val > 0 ? val : ""}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: 16 }}>
                Insufficient skill data for matrix
              </div>
            )}
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}><Sparkles size={13} /> Redeployment Insights</div>
            {insights.map((ins, i) => (
              <div key={i} style={S.insightItem}>
                <ArrowRight size={11} style={{ color: "#f4a83a", flexShrink: 0, marginTop: 1 }} />
                <span>{ins}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Detail table ── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>Redeployment Detail</div>
        <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid var(--border)" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Task", "Workstream", "Action", "Future State", "Released %", "Released Hrs", "Capacity Destination", "Skill"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailRows.map((r, i) => (
                <tr key={i}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,168,58,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}>
                  <td style={{ ...S.td, fontWeight: "var(--fw-medium)", color: "var(--text-primary)", minWidth: 140 }}>{r.task}</td>
                  <td style={S.td}>{r.workstream}</td>
                  <td style={S.td}>{r.action}</td>
                  <td style={S.td}>{r.futureState}</td>
                  <td style={{ ...S.td, fontFamily: "var(--ff-mono)", textAlign: "center" }}>{r.releasedPct > 0 ? `${r.releasedPct}%` : "—"}</td>
                  <td style={{ ...S.td, fontFamily: "var(--ff-mono)", textAlign: "center", color: r.releasedHrs > 0 ? "#22C55E" : "var(--text-muted)" }}>{r.releasedHrs > 0 ? `${r.releasedHrs.toFixed(1)}h` : "—"}</td>
                  <td style={{ ...S.td, maxWidth: 200 }}>{r.destination}</td>
                  <td style={{ ...S.td, color: "var(--text-muted)" }}>{r.skill}</td>
                </tr>
              ))}
              {detailRows.length === 0 && (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No redeployment matches yet. Complete the Reconstruct stage to generate role transition data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
