"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Check, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw,
  ChevronRight, Download, Layers3, Users, BarChart3, Sparkles,
  Eye, Clock,
} from "@/lib/icons";
import { apiFetch } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface Metric {
  name: string; value: string; numeric: number;
  status: string; benchmark: string;
}

interface Dimension {
  score: number;
  metrics: Metric[];
}

interface ScorecardData {
  overall_score: number;
  dimensions: Record<string, Dimension>;
  top_issues: { dimension: string; issue: string }[];
  top_strengths: { dimension: string; strength: string }[];
  employee_count: number;
  role_count: number;
  snapshot_id?: string;
}

interface Snapshot {
  id: string; tag: string; overall_score: number;
  dimensions: Record<string, number>;
  created_at: string;
}

interface Props {
  model: string;
  projectId: string;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const DIM_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  structural_clarity: { label: "Structural Clarity", icon: "◆", color: "#3B82F6" },
  span_layer_discipline: { label: "Span & Layer", icon: "◇", color: "#8B5CF6" },
  leveling_integrity: { label: "Leveling Integrity", icon: "◈", color: "#14B8A6" },
  workforce_composition: { label: "Workforce Composition", icon: "◉", color: "#F97316" },
  career_mobility: { label: "Career Mobility", icon: "◎", color: "#22C55E" },
  transformation_readiness: { label: "Transformation Readiness", icon: "◍", color: "#EF4444" },
};

const STATUS_COLORS: Record<string, string> = { green: "#22C55E", amber: "#F59E0B", red: "#EF4444" };

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  page: { padding: "20px 24px", maxWidth: 1200, margin: "0 auto" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } as React.CSSProperties,
  h2: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 } as React.CSSProperties,
  heroScore: { display: "flex", alignItems: "center", gap: 20, padding: "24px 28px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 20 } as React.CSSProperties,
  scoreRing: (score: number) => {
    const color = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444";
    return { width: 90, height: 90, borderRadius: "50%", border: `4px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties;
  },
  scoreNum: (score: number) => ({ fontSize: 32, fontWeight: 700, fontFamily: "var(--ff-mono)", color: score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444" }) as React.CSSProperties,
  scoreLabel: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" } as React.CSSProperties,
  scoreSub: { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 } as React.CSSProperties,
  issueList: { display: "flex", gap: 12, flex: 1, marginLeft: 24 } as React.CSSProperties,
  issueCol: { flex: 1 } as React.CSSProperties,
  issueTitle: { fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6 } as React.CSSProperties,
  issueItem: (isIssue: boolean) => ({ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }) as React.CSSProperties,
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 } as React.CSSProperties,
  card: (color: string) => ({ background: "var(--surface-1)", border: "1px solid var(--border)", borderTop: `3px solid ${color}`, borderRadius: 10, padding: "18px 20px" }) as React.CSSProperties,
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 } as React.CSSProperties,
  cardTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  cardScore: (score: number) => ({ fontSize: 22, fontWeight: 700, fontFamily: "var(--ff-mono)", color: score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444" }) as React.CSSProperties,
  metricRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)" } as React.CSSProperties,
  metricName: { flex: 1, color: "var(--text-secondary)" } as React.CSSProperties,
  metricValue: { fontFamily: "var(--ff-mono)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", minWidth: 50, textAlign: "right" as const } as React.CSSProperties,
  metricBench: { fontSize: 10, color: "var(--text-muted)", minWidth: 40, textAlign: "right" as const } as React.CSSProperties,
  statusDot: (status: string) => ({ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[status] || "#9CA3AF", flexShrink: 0 }) as React.CSSProperties,
  snapList: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" } as React.CSSProperties,
  snapRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)", cursor: "pointer" } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 16px", fontSize: 11, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#3B82F6", color: "#fff", cursor: "pointer" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function OrgHealthScorecard({ model, projectId }: Props) {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/scorecard/compute?project_id=${projectId}&model_id=${model}&save=true`, { method: "POST" });
      const d = await res.json();
      setData(d);
    } catch { /* empty */ }
    setLoading(false);
  }, [projectId, model]);

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/scorecard/snapshots?project_id=${projectId}`);
      const d = await res.json();
      setSnapshots(Array.isArray(d) ? d : []);
    } catch { /* empty */ }
  }, [projectId]);

  useEffect(() => { compute(); loadSnapshots(); }, [compute, loadSnapshots]);

  if (loading || !data) {
    return (
      <div style={S.page}>
        <h2 style={S.h2}>Org Health Scorecard</h2>
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          {loading ? "Computing scorecard from workforce data…" : "No data available. Upload workforce data to compute."}
        </div>
      </div>
    );
  }

  const overall = data.overall_score;
  const verdict = overall >= 70 ? "Healthy — ready for transformation" : overall >= 40 ? "Moderate — address structural gaps before scaling" : "Critical — foundational cleanup needed";

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h2 style={S.h2}>Org Health Scorecard</h2>
          <div style={S.subtitle}>{data.employee_count} employees · {data.role_count} roles · 6 health dimensions</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={S.btn} onClick={() => { compute(); loadSnapshots(); }}><RefreshCw size={11} /> Recompute</button>
          <button style={S.btn}><Download size={11} /> Export PDF</button>
        </div>
      </div>

      {/* Hero score + issues/strengths */}
      <div style={S.heroScore}>
        <div style={S.scoreRing(overall)}>
          <span style={S.scoreNum(overall)}>{Math.round(overall)}</span>
        </div>
        <div>
          <div style={S.scoreLabel}>Overall Health Score</div>
          <div style={S.scoreSub}>{verdict}</div>
        </div>
        <div style={S.issueList}>
          <div style={S.issueCol}>
            <div style={S.issueTitle}>
              <AlertTriangle size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />Top Issues
            </div>
            {data.top_issues.slice(0, 3).map((iss, i) => (
              <div key={i} style={S.issueItem(true)}>
                <span style={S.statusDot("red")} />
                <span><strong>{iss.dimension}:</strong> {iss.issue}</span>
              </div>
            ))}
            {data.top_issues.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No critical issues</div>}
          </div>
          <div style={S.issueCol}>
            <div style={S.issueTitle}>
              <Check size={10} style={{ verticalAlign: "middle", marginRight: 3, color: "#22C55E" }} />Strengths
            </div>
            {data.top_strengths.slice(0, 3).map((str, i) => (
              <div key={i} style={S.issueItem(false)}>
                <span style={S.statusDot("green")} />
                <span><strong>{str.dimension}:</strong> {str.strength}</span>
              </div>
            ))}
            {data.top_strengths.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Computing…</div>}
          </div>
        </div>
      </div>

      {/* Dimension cards grid (3×2) */}
      <div style={S.cardGrid}>
        {Object.entries(DIM_CONFIG).map(([key, cfg]) => {
          const dim = data.dimensions[key];
          if (!dim) return null;
          const isExpanded = expandedDim === key;
          return (
            <div key={key} style={S.card(cfg.color)}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>{cfg.icon} {cfg.label}</div>
                <div style={S.cardScore(dim.score)}>{Math.round(dim.score)}</div>
              </div>
              {dim.metrics.slice(0, isExpanded ? undefined : 3).map((m, i) => (
                <div key={i} style={S.metricRow}>
                  <span style={S.statusDot(m.status)} />
                  <span style={S.metricName}>{m.name}</span>
                  <span style={S.metricValue}>{m.value}</span>
                  <span style={S.metricBench}>{m.benchmark}</span>
                </div>
              ))}
              {dim.metrics.length > 3 && (
                <button style={{ background: "none", border: "none", fontSize: 10, color: "#3B82F6", cursor: "pointer", marginTop: 6, padding: 0 }}
                  onClick={() => setExpandedDim(isExpanded ? null : key)}>
                  {isExpanded ? "Show less" : `+${dim.metrics.length - 3} more metrics`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Historical snapshots */}
      {snapshots.length > 0 && (
        <div style={S.snapList}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={14} /> Snapshot History ({snapshots.length})
          </div>
          {snapshots.slice(0, 10).map(snap => (
            <div key={snap.id} style={S.snapRow}>
              <span style={{ fontWeight: "var(--fw-medium)", color: "var(--text-primary)", flex: 1 }}>{snap.tag}</span>
              <span style={{ fontFamily: "var(--ff-mono)", fontWeight: "var(--fw-bold)", color: snap.overall_score >= 70 ? "#22C55E" : snap.overall_score >= 40 ? "#F59E0B" : "#EF4444" }}>{Math.round(snap.overall_score)}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 80 }}>{new Date(snap.created_at).toLocaleDateString()}</span>
              <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
