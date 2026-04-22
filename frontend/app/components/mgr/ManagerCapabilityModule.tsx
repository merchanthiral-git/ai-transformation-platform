"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Search, ChevronDown, ChevronRight, Check, X, AlertTriangle,
  Star, ArrowUpRight, ArrowDownRight, Filter, RefreshCw, Download,
  Sparkles, Eye, Plus, Layers3, BarChart3,
} from "@/lib/icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { apiFetch } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface Assessment {
  id: string; employee_id: string; employee_name: string;
  job_title: string; function: string; family: string;
  track_code: string; level_code: string;
  direct_reports_count: number; tenure_years: number;
  ai_fluency: number; change_leadership: number;
  coaching_development: number; strategic_thinking: number;
  digital_adoption: number; composite_score: number;
  segment: string; team_readiness_score: number; team_size: number;
  is_champion_candidate: boolean; is_blocker_flagged: boolean;
  blocker_reason: string; development_priority: string;
  development_areas: { area: string; gap: number; current: number; target: number }[];
  notes: string;
}

interface Summary {
  total_managers: number; avg_composite: number;
  segments: Record<string, number>; champions: number; blockers: number;
  functions: string[];
  dimension_avgs: Record<string, number>;
}

interface Props {
  model: string;
  projectId: string;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const SEG_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  champion: { label: "Champion", color: "#8ba87a", bg: "rgba(34,197,94,0.08)", icon: "★" },
  capable: { label: "Capable", color: "#f4a83a", bg: "rgba(244,168,58,0.06)", icon: "●" },
  developing: { label: "Developing", color: "#f4a83a", bg: "rgba(244,168,58,0.06)", icon: "◐" },
  blocker: { label: "Blocker", color: "#e87a5d", bg: "rgba(232,122,93,0.08)", icon: "✕" },
  detached: { label: "Detached", color: "#c9bfa8", bg: "rgba(156,163,175,0.08)", icon: "○" },
};

const DIM_LABELS: Record<string, string> = {
  ai_fluency: "AI Fluency", change_leadership: "Change Leadership",
  coaching_development: "Coaching", strategic_thinking: "Strategic Thinking",
  digital_adoption: "Digital Adoption",
};

const DIM_COLORS = ["var(--amber)", "var(--amber)", "var(--sage)", "var(--dusk)", "var(--sage)"];

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  page: { padding: "20px 24px", maxWidth: 1200, margin: "0 auto" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 } as React.CSSProperties,
  h2: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 16 } as React.CSSProperties,
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 16 } as React.CSSProperties,
  kpi: (accent: string) => ({ background: "var(--surface-1)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: "14px 16px" }) as React.CSSProperties,
  kpiLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" } as React.CSSProperties,
  kpiValue: { fontSize: 22, fontWeight: 700, fontFamily: "var(--ff-mono)", color: "var(--text-primary)", marginTop: 2 } as React.CSSProperties,
  kpiSub: { fontSize: 11, color: "var(--text-muted)", marginTop: 1 } as React.CSSProperties,
  segPills: { display: "flex", gap: 6, marginBottom: 14 } as React.CSSProperties,
  segPill: (active: boolean, color: string) => ({ padding: "5px 14px", fontSize: 11, fontWeight: active ? "var(--fw-semi)" : "var(--fw-medium)", border: `1px solid ${active ? color : "var(--border)"}`, borderRadius: 14, background: active ? `${color}12` : "var(--surface-2)", color: active ? color : "var(--text-muted)", cursor: "pointer" }) as React.CSSProperties,
  filterBar: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" as const } as React.CSSProperties,
  searchBox: { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, minWidth: 200 } as React.CSSProperties,
  searchInput: { flex: 1, background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "var(--text-xs)", outline: "none" } as React.CSSProperties,
  select: { padding: "5px 10px", fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", outline: "none", appearance: "none" as const } as React.CSSProperties,
  chartGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 } as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" } as React.CSSProperties,
  sectionTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "separate" as const, borderSpacing: 0, fontSize: "var(--text-xs)" } as React.CSSProperties,
  th: { padding: "7px 10px", fontSize: 11, fontWeight: 600, color: "#fff", textTransform: "uppercase" as const, letterSpacing: "0.05em", background: "var(--paper-solid)", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" as const, cursor: "pointer", userSelect: "none" as const } as React.CSSProperties,
  td: { padding: "7px 10px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const } as React.CSSProperties,
  segBadge: (seg: string) => {
    const c = SEG_CONFIG[seg] || SEG_CONFIG.capable;
    return { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, borderRadius: 10, background: c.bg, color: c.color } as React.CSSProperties;
  },
  dimBar: (score: number, color: string) => ({ width: `${score}%`, height: 6, background: color, borderRadius: 3, transition: "width 0.3s" }) as React.CSSProperties,
  dimBarBg: { width: "100%", height: 6, background: "var(--border)", borderRadius: 3 } as React.CSSProperties,
  devArea: { display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 11, borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  expandRow: { background: "rgba(244,168,58,0.02)", padding: "12px 16px" } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 14px", fontSize: 11, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "var(--amber)", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  emptyState: { textAlign: "center" as const, padding: "60px 24px", color: "var(--text-muted)" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function ManagerCapabilityModule({ model, projectId }: Props) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [segFilter, setSegFilter] = useState("");
  const [funcFilter, setFuncFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("composite_score");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        project_id: projectId, segment: segFilter, function: funcFilter,
        search, sort_by: sortBy, sort_dir: sortDir,
      });
      const res = await apiFetch(`/api/mgr/assessments?${params}`);
      const data = await res.json();
      setAssessments(data.assessments || []);
      setSummary(data.summary || null);
    } catch { /* empty */ }
    setLoading(false);
  }, [projectId, segFilter, funcFilter, search, sortBy, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const populate = async () => {
    await apiFetch(`/api/mgr/populate?project_id=${projectId}&model_id=${model}`, { method: "POST" });
    fetchData();
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const s = summary;

  // Segment chart data
  const segChartData = useMemo(() => {
    if (!s?.segments) return [];
    return Object.entries(SEG_CONFIG).map(([key, cfg]) => ({
      name: cfg.label, value: s.segments[key] || 0, color: cfg.color,
    }));
  }, [s]);

  // Dimension avg chart data
  const dimChartData = useMemo(() => {
    if (!s?.dimension_avgs) return [];
    return Object.entries(s.dimension_avgs).map(([key, val], i) => ({
      name: DIM_LABELS[key] || key, value: Math.round(val), color: DIM_COLORS[i % DIM_COLORS.length],
    }));
  }, [s]);

  if (!loading && assessments.length === 0 && !s) {
    return (
      <div style={S.page}>
        <h2 style={S.h2}>Manager Capability</h2>
        <div style={S.emptyState}>
          <Users size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)", marginBottom: 4 }}>
            No manager assessments yet
          </div>
          <div style={{ fontSize: "var(--text-xs)", marginBottom: 16 }}>
            Populate from workforce data to identify managers and compute capability scores.
          </div>
          <button style={S.btnPrimary} onClick={populate}><Plus size={12} /> Populate from Data</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h2 style={S.h2}>Manager Capability</h2>
          <div style={S.subtitle}>Assess managers across 5 dimensions · Identify champions and blockers · Target development</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={S.btn} onClick={() => apiFetch(`/api/mgr/snapshots?project_id=${projectId}`, { method: "POST" })}><BarChart3 size={11} /> Save Snapshot</button>
          <button style={S.btn} onClick={populate}><RefreshCw size={11} /> Refresh</button>
        </div>
      </div>

      {/* ── KPI row ── */}
      {s && (
        <div style={S.kpiRow}>
          <div style={S.kpi("var(--amber)")}>
            <div style={S.kpiLabel}>Total Managers</div>
            <div style={S.kpiValue}>{s.total_managers}</div>
          </div>
          <div style={S.kpi("var(--sage)")}>
            <div style={S.kpiLabel}>Champions</div>
            <div style={S.kpiValue}>{s.champions}</div>
            <div style={S.kpiSub}>{s.total_managers > 0 ? `${Math.round(s.champions / s.total_managers * 100)}%` : "0%"} of managers</div>
          </div>
          <div style={S.kpi("var(--coral)")}>
            <div style={S.kpiLabel}>Blockers</div>
            <div style={S.kpiValue}>{s.blockers}</div>
            <div style={S.kpiSub}>need intervention</div>
          </div>
          <div style={S.kpi("var(--amber)")}>
            <div style={S.kpiLabel}>Avg Composite</div>
            <div style={S.kpiValue}>{s.avg_composite}</div>
            <div style={S.kpiSub}>out of 100</div>
          </div>
          <div style={S.kpi("var(--dusk)")}>
            <div style={S.kpiLabel}>Weakest Dimension</div>
            <div style={{ ...S.kpiValue, fontSize: 13 }}>
              {dimChartData.length > 0 ? dimChartData.sort((a, b) => a.value - b.value)[0].name : "—"}
            </div>
          </div>
          <div style={S.kpi("var(--text-muted)")}>
            <div style={S.kpiLabel}>Functions</div>
            <div style={S.kpiValue}>{s.functions?.length || 0}</div>
          </div>
        </div>
      )}

      {/* ── Charts row ── */}
      <div style={S.chartGrid}>
        <div style={S.section}>
          <div style={S.sectionTitle}>Segment Distribution</div>
          {segChartData.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={segChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={2}>
                    {segChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", fontSize: 11, color: "var(--text-muted)" }}>
                {segChartData.filter(d => d.value > 0).map(d => (
                  <span key={d.name}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: d.color, marginRight: 3 }} />{d.name}: {d.value}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={S.section}>
          <div style={S.sectionTitle}>Dimension Averages</div>
          {dimChartData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dimChartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} width={75} />
                <Tooltip contentStyle={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {dimChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Segment filter pills ── */}
      <div style={S.segPills}>
        <button style={S.segPill(segFilter === "", "#f4a83a")} onClick={() => setSegFilter("")}>All ({s?.total_managers || 0})</button>
        {Object.entries(SEG_CONFIG).map(([key, cfg]) => (
          <button key={key} style={S.segPill(segFilter === key, cfg.color)} onClick={() => setSegFilter(segFilter === key ? "" : key)}>
            {cfg.icon} {cfg.label} ({s?.segments?.[key] || 0})
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={S.filterBar}>
        <div style={S.searchBox}>
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input style={S.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search managers…" />
          {search && <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }} onClick={() => setSearch("")}><X size={12} /></button>}
        </div>
        {s?.functions && s.functions.length > 1 && (
          <select style={S.select} value={funcFilter} onChange={e => setFuncFilter(e.target.value)}>
            <option value="">All Functions</option>
            {s.functions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
      </div>

      {/* ── Manager grid ── */}
      <div style={{ ...S.section, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                {[
                  { key: "employee_name", label: "Manager", w: 180 },
                  { key: "job_title", label: "Role", w: 140 },
                  { key: "function", label: "Function", w: 100 },
                  { key: "segment", label: "Segment", w: 90 },
                  { key: "composite_score", label: "Score", w: 60 },
                  { key: "ai_fluency", label: "AI", w: 45 },
                  { key: "change_leadership", label: "Change", w: 50 },
                  { key: "coaching_development", label: "Coach", w: 50 },
                  { key: "strategic_thinking", label: "Strategy", w: 55 },
                  { key: "digital_adoption", label: "Digital", w: 50 },
                  { key: "direct_reports_count", label: "Reports", w: 55 },
                  { key: "development_priority", label: "Dev", w: 40 },
                ].map(col => (
                  <th key={col.key} style={{ ...S.th, width: col.w }} onClick={() => toggleSort(col.key)}>
                    {col.label} {sortBy === col.key && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessments.map(a => {
                const isExpanded = expandedId === a.id;
                const sc = SEG_CONFIG[a.segment] || SEG_CONFIG.capable;
                return (
                  <React.Fragment key={a.id}>
                    <tr style={{ cursor: "pointer" }}
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,168,58,0.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ ...S.td, fontWeight: "var(--fw-medium)", color: "var(--text-primary)" }}>
                        {a.employee_name}
                        {a.is_champion_candidate && <Star size={10} style={{ color: "var(--sage)", marginLeft: 4 }} />}
                        {a.is_blocker_flagged && <AlertTriangle size={10} style={{ color: "var(--coral)", marginLeft: 4 }} />}
                      </td>
                      <td style={{ ...S.td, color: "var(--text-secondary)" }}>{a.job_title}</td>
                      <td style={{ ...S.td, color: "var(--text-muted)" }}>{a.function}</td>
                      <td style={S.td}><span style={S.segBadge(a.segment)}>{sc.icon} {sc.label}</span></td>
                      <td style={{ ...S.td, fontFamily: "var(--ff-mono)", fontWeight: "var(--fw-bold)", color: a.composite_score >= 70 ? "var(--sage)" : a.composite_score >= 50 ? "var(--amber)" : "var(--coral)" }}>{a.composite_score}</td>
                      {["ai_fluency", "change_leadership", "coaching_development", "strategic_thinking", "digital_adoption"].map((dim, i) => (
                        <td key={dim} style={{ ...S.td, width: 50 }}>
                          <div style={S.dimBarBg}><div style={S.dimBar((a as any)[dim], DIM_COLORS[i])} /></div>
                          <div style={{ fontSize: 11, fontFamily: "var(--ff-mono)", color: "var(--text-muted)", textAlign: "center", marginTop: 1 }}>{(a as any)[dim]}</div>
                        </td>
                      ))}
                      <td style={{ ...S.td, fontFamily: "var(--ff-mono)", textAlign: "center" }}>{a.direct_reports_count}</td>
                      <td style={S.td}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                          background: a.development_priority === "high" ? "rgba(232,122,93,0.1)" : a.development_priority === "medium" ? "rgba(244,168,58,0.1)" : "rgba(34,197,94,0.1)",
                          color: a.development_priority === "high" ? "var(--coral)" : a.development_priority === "medium" ? "var(--amber)" : "var(--sage)",
                        }}>{a.development_priority}</span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={12} style={{ padding: 0 }}>
                          <div style={S.expandRow}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                              {/* Profile */}
                              <div>
                                <div style={{ fontSize: 11, fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 6 }}>Profile</div>
                                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.8 }}>
                                  {a.job_title} · {a.track_code} {a.level_code}<br />
                                  {a.function} · {a.family}<br />
                                  {a.direct_reports_count} direct reports · {a.tenure_years}y tenure
                                </div>
                              </div>
                              {/* Development areas */}
                              <div>
                                <div style={{ fontSize: 11, fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 6 }}>Development Areas</div>
                                {a.development_areas.length > 0 ? a.development_areas.map((da, i) => (
                                  <div key={i} style={S.devArea}>
                                    <span style={{ flex: 1, color: "var(--text-secondary)" }}>{da.area}</span>
                                    <span style={{ fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--coral)" }}>gap: {da.gap}</span>
                                    <span style={{ fontFamily: "var(--ff-mono)", fontSize: 11, color: "var(--text-muted)" }}>{da.current}→{da.target}</span>
                                  </div>
                                )) : <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No development gaps identified</div>}
                              </div>
                              {/* Actions */}
                              <div>
                                <div style={{ fontSize: 11, fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 6 }}>Actions</div>
                                {a.segment === "champion" && <div style={{ fontSize: 11, color: "var(--sage)", marginBottom: 4 }}>★ Assign as change champion · Pair with developing managers</div>}
                                {a.segment === "blocker" && <div style={{ fontSize: 11, color: "var(--coral)", marginBottom: 4 }}>⚠ {a.blocker_reason || "Requires targeted intervention"}</div>}
                                {a.development_priority === "high" && <div style={{ fontSize: 11, color: "var(--amber)", marginBottom: 4 }}>Priority development needed before transformation wave</div>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {assessments.length === 0 && !loading && (
                <tr><td colSpan={12} style={{ ...S.td, textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                  {search || segFilter || funcFilter ? "No managers match filters" : "No assessment data"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
