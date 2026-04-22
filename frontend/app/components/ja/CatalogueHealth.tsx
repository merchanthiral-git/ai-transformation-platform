"use client";
import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, FileWarning, Users, Tag, Layers, Search, ChevronRight } from "@/lib/icons";
import { apiFetch } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface HealthDiagnostics {
  total_roles: number;
  total_incumbents: number;
  title_inflation_rate: number;
  ghost_roles_count: number;
  duplicate_titles_count: number;
  roles_missing_family: number;
  roles_missing_level: number;
  roles_missing_track: number;
  titles_per_family: Record<string, number>;
  families_count: number;
}

interface Issue {
  severity: string;
  category: string;
  title: string;
  detail: string;
}

interface TitleCluster {
  canonical: string;
  variants: string[];
  total_incumbents: number;
  count: number;
}

interface Props {
  model: string;
  projectId: string;
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  page: { padding: "24px 28px", maxWidth: 1200, margin: "0 auto" } as React.CSSProperties,
  h2: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", margin: "0 0 4px" } as React.CSSProperties,
  subtitle: { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 24 } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 } as React.CSSProperties,
  kpi: (accent: string) => ({ background: "var(--surface-1)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: "16px 18px" }) as React.CSSProperties,
  kpiLabel: { fontSize: 11, fontWeight: "var(--fw-medium)", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.04em" } as React.CSSProperties,
  kpiValue: { fontSize: "var(--text-xl)", fontWeight: "var(--fw-bold)", color: "var(--text-primary)", marginTop: 4 } as React.CSSProperties,
  kpiDetail: { fontSize: 11, color: "var(--text-muted)", marginTop: 2 } as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 } as React.CSSProperties,
  sectionTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  issueRow: (sev: string) => ({
    display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px",
    borderRadius: 6, marginBottom: 6,
    background: sev === "critical" ? "rgba(251,113,133,0.08)" : sev === "warning" ? "rgba(251,191,36,0.08)" : "rgba(34,211,238,0.06)",
    borderLeft: `3px solid ${sev === "critical" ? "#fb7185" : sev === "warning" ? "#fbbf24" : "#22d3ee"}`,
  }) as React.CSSProperties,
  clusterRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  variant: { display: "inline-block", padding: "2px 8px", fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, marginRight: 4, marginBottom: 2 } as React.CSSProperties,
  arrow: { fontSize: "var(--text-sm)", color: "#22d3ee", fontWeight: "var(--fw-semi)" } as React.CSSProperties,
  canonical: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" } as React.CSSProperties,
  familyBar: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } as React.CSSProperties,
  bar: (pct: number) => ({ width: `${Math.max(pct, 2)}%`, height: 18, background: "#22d3ee", borderRadius: 3, transition: "width 0.3s" }) as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function CatalogueHealth({ model, projectId }: Props) {
  const [diagnostics, setDiagnostics] = useState<HealthDiagnostics | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [ghostRoles, setGhostRoles] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<Record<string, number>>({});
  const [clusters, setClusters] = useState<TitleCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapseThreshold, setCollapseThreshold] = useState(0.82);
  const [showCollapse, setShowCollapse] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [healthRes, collapseRes] = await Promise.all([
          apiFetch(`/api/ja/catalogue-health?project_id=${projectId}&model_id=${model}`),
          apiFetch(`/api/ja/title-collapse?project_id=${projectId}&threshold=${collapseThreshold}`),
        ]);
        const health = await healthRes.json();
        const collapse = await collapseRes.json();

        setDiagnostics(health.diagnostics || null);
        setIssues(health.issues || []);
        setGhostRoles(health.ghost_roles || []);
        setDuplicates(health.duplicate_titles || {});
        setClusters(collapse.clusters || []);
      } catch { /* no data yet */ }
      setLoading(false);
    })();
  }, [projectId, model, collapseThreshold]);

  if (loading) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading catalogue health…</div>
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          No role data imported yet. Import a CSV or load demo data to see health diagnostics.
        </div>
      </div>
    );
  }

  const d = diagnostics;
  const maxTitles = Math.max(...Object.values(d.titles_per_family || {}), 1);

  // Health score: simple heuristic
  let healthScore = 100;
  if (d.title_inflation_rate > 30) healthScore -= 25;
  if (d.ghost_roles_count > 10) healthScore -= 15;
  if (d.duplicate_titles_count > 5) healthScore -= 15;
  if (d.roles_missing_family > 0) healthScore -= 10;
  if (d.roles_missing_level > 0) healthScore -= 10;
  healthScore = Math.max(healthScore, 0);

  const scoreColor = healthScore >= 70 ? "#34d399" : healthScore >= 40 ? "#fbbf24" : "#fb7185";
  const scoreLabel = healthScore >= 70 ? "Good — ready to map" : healthScore >= 40 ? "Moderate — cleanup needed first" : "Poor — significant cleanup required";

  return (
    <div style={S.page}>
      <h2 style={S.h2}>Catalogue Health Assessment</h2>
      <div style={S.subtitle}>Diagnostic overview of the client's current-state data. Review before starting mapping work.</div>

      {/* Health Score */}
      <div style={{ ...S.section, display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", border: `4px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: scoreColor }}>{healthScore}</span>
        </div>
        <div>
          <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>Data Readiness Score</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{scoreLabel}</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={S.grid}>
        <div style={S.kpi("#22d3ee")}>
          <div style={S.kpiLabel}>Total Roles</div>
          <div style={S.kpiValue}>{d.total_roles}</div>
          <div style={S.kpiDetail}>across {d.families_count} families</div>
        </div>
        <div style={S.kpi("#22d3ee")}>
          <div style={S.kpiLabel}>Total Incumbents</div>
          <div style={S.kpiValue}>{d.total_incumbents.toLocaleString()}</div>
        </div>
        <div style={S.kpi(d.title_inflation_rate > 30 ? "#fb7185" : "#34d399")}>
          <div style={S.kpiLabel}>Title Inflation</div>
          <div style={S.kpiValue}>{d.title_inflation_rate.toFixed(0)}</div>
          <div style={S.kpiDetail}>titles per 100 employees (healthy: 15–25)</div>
        </div>
        <div style={S.kpi(d.ghost_roles_count > 0 ? "#fbbf24" : "#34d399")}>
          <div style={S.kpiLabel}>Ghost Roles</div>
          <div style={S.kpiValue}>{d.ghost_roles_count}</div>
          <div style={S.kpiDetail}>roles with zero incumbents</div>
        </div>
        <div style={S.kpi(d.duplicate_titles_count > 5 ? "#fbbf24" : "#34d399")}>
          <div style={S.kpiLabel}>Duplicate Titles</div>
          <div style={S.kpiValue}>{d.duplicate_titles_count}</div>
        </div>
        <div style={S.kpi(d.roles_missing_family > 0 ? "#fbbf24" : "#34d399")}>
          <div style={S.kpiLabel}>Missing Data</div>
          <div style={S.kpiValue}>{d.roles_missing_family + d.roles_missing_level + d.roles_missing_track}</div>
          <div style={S.kpiDetail}>{d.roles_missing_family} no family · {d.roles_missing_level} no level · {d.roles_missing_track} no track</div>
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}><AlertTriangle size={15} style={{ color: "#fbbf24" }} /> Issues Found</div>
          {issues.map((issue, i) => (
            <div key={i} style={S.issueRow(issue.severity)}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                {issue.severity === "critical" ? <AlertTriangle size={14} style={{ color: "#fb7185" }} /> : <FileWarning size={14} style={{ color: "#fbbf24" }} />}
              </div>
              <div>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>{issue.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{issue.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Titles per Family */}
      {Object.keys(d.titles_per_family).length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}><Layers size={15} /> Titles per Family</div>
          {Object.entries(d.titles_per_family)
            .sort(([, a], [, b]) => b - a)
            .map(([family, count]) => (
              <div key={family} style={S.familyBar}>
                <div style={{ width: 160, fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{family}</div>
                <div style={{ flex: 1 }}><div style={S.bar((count / maxTitles) * 100)} /></div>
                <div style={{ width: 36, fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>{count}</div>
              </div>
            ))}
        </div>
      )}

      {/* Title-to-Role Collapse Preview */}
      <div style={S.section}>
        <div style={{ ...S.sectionTitle, justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tag size={15} /> Title-to-Role Collapse Preview
            {clusters.length > 0 && <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: "var(--fw-medium)" }}>{clusters.length} clusters found</span>}
          </span>
          <button style={{ background: "none", border: "none", fontSize: "var(--text-xs)", color: "#22d3ee", cursor: "pointer", fontWeight: "var(--fw-medium)" }}
            onClick={() => setShowCollapse(!showCollapse)}>
            {showCollapse ? "Hide" : "Show"} Collapse Suggestions
          </button>
        </div>
        {showCollapse && (
          <>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 12 }}>
              Similar titles that likely represent the same role. Accepting a collapse pre-populates the mapping grid.
            </div>
            {clusters.length === 0 ? (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "center", padding: 20 }}>No similar titles found at threshold {collapseThreshold}</div>
            ) : (
              clusters.slice(0, 30).map((cluster, i) => (
                <div key={i} style={S.clusterRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 4 }}>
                      {cluster.variants.filter(v => v !== cluster.canonical).map(v => (
                        <span key={v} style={S.variant}>{v}</span>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ChevronRight size={12} style={{ color: "#22d3ee" }} />
                      <span style={S.canonical}>{cluster.canonical}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right", minWidth: 80 }}>
                    {cluster.total_incumbents} people
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Ghost Roles */}
      {ghostRoles.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}><Users size={15} /> Ghost Roles (No Incumbents)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ghostRoles.slice(0, 40).map(r => (
              <span key={r} style={{ ...S.variant, color: "var(--text-muted)" }}>{r}</span>
            ))}
            {ghostRoles.length > 40 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{ghostRoles.length - 40} more</span>}
          </div>
        </div>
      )}
    </div>
  );
}
