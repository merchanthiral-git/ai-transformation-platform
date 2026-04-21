"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Plus, Settings2, ChevronDown, ChevronRight, Check,
  X, Filter, RefreshCw, Square, CheckSquare, AlertTriangle,
  Sparkles, ArrowUpRight, GitBranch, Clock, Minus,
  ChevronLeft, ExternalLink, MoreHorizontal, Loader2,
} from "@/lib/icons";
import * as api from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface WDJob {
  id: string; title: string; function: string; family: string;
  sub_family: string; track_code: string; level_code: string;
  ja_source_job_id: string | null; sync_state: string;
  ja_source_version: number | null; wave: string; wd_status: string;
  current_stage: string | null; stage_completion: Record<string, number>;
  assigned_to: string; hours_freed: number; cost_delta: number;
  skill_shift_index: number; decon_submitted: boolean; finalized: boolean;
  updated_at: string | null;
}

interface FunctionGroup {
  function: string; jobs: WDJob[]; total: number;
  redesigned: number; in_progress: number; not_started: number;
  deferred: number; out_of_scope: number;
}

interface Props {
  projectId: string;
  model: string;
  onJobSelect: (job: WDJob) => void;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  redesigned: { icon: "●", color: "#22C55E" },
  in_progress: { icon: "◐", color: "#3B82F6" },
  not_started: { icon: "○", color: "var(--text-muted)" },
  deferred: { icon: "⊘", color: "#9CA3AF" },
  out_of_scope: { icon: "ⓘ", color: "#9CA3AF" },
};

const SYNC_BADGES: Record<string, { label: string; color: string }> = {
  synced: { label: "↑ JA", color: "var(--text-muted)" },
  stale: { label: "⚠ JA update", color: "#F97316" },
  conflict: { label: "⚡ Conflict", color: "#F97316" },
  manual: { label: "✎ Manual", color: "var(--text-muted)" },
  uploaded: { label: "⬆ CSV", color: "var(--text-muted)" },
  broken: { label: "⚬ Broken", color: "var(--text-muted)" },
};

const WAVE_LABELS: Record<string, string> = {
  wave_1: "Wave 1", wave_2: "Wave 2", wave_3: "Wave 3",
  deferred: "Deferred", unassigned: "Unassigned",
};

const STAGE_LABELS: Record<string, string> = {
  context: "Context", deconstruction: "Deconstruction",
  reconstruction: "Reconstruction", redeployment: "Redeployment",
  impact: "Impact", org_link: "Org Link", handoff: "Handoff",
};

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  page: { padding: "20px 24px", maxWidth: 1200, margin: "0 auto" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 } as React.CSSProperties,
  h2: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", margin: 0 } as React.CSSProperties,
  headerActions: { display: "flex", gap: 6 } as React.CSSProperties,
  summaryBar: { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 16 } as React.CSSProperties,
  filterBar: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, marginBottom: 10 } as React.CSSProperties,
  searchBox: { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, minWidth: 200 } as React.CSSProperties,
  searchInput: { flex: 1, background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "var(--text-xs)", outline: "none" } as React.CSSProperties,
  select: { padding: "5px 10px", fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-secondary)", outline: "none", appearance: "none" as const, paddingRight: 20 } as React.CSSProperties,
  wavePills: { display: "flex", gap: 4, marginBottom: 14 } as React.CSSProperties,
  wavePill: (active: boolean) => ({ padding: "5px 14px", fontSize: 11, fontWeight: active ? "var(--fw-semi)" : "var(--fw-medium)", border: `1px solid ${active ? "#3B82F6" : "var(--border)"}`, borderRadius: 14, background: active ? "rgba(59,130,246,0.08)" : "var(--surface-2)", color: active ? "#3B82F6" : "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap" as const }) as React.CSSProperties,
  funcSection: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 10, overflow: "hidden" } as React.CSSProperties,
  funcHeader: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", userSelect: "none" as const } as React.CSSProperties,
  funcName: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", flex: 1 } as React.CSSProperties,
  funcMeta: { fontSize: 11, color: "var(--text-muted)" } as React.CSSProperties,
  jobRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 16px 9px 28px", borderTop: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" } as React.CSSProperties,
  jobRowHover: { background: "rgba(59,130,246,0.03)" } as React.CSSProperties,
  statusIcon: (color: string) => ({ fontSize: 13, color, flexShrink: 0, width: 16, textAlign: "center" as const }) as React.CSSProperties,
  jobTitle: { fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const } as React.CSSProperties,
  trackBadge: { display: "inline-flex", padding: "1px 6px", fontSize: 10, fontWeight: 600, borderRadius: 3, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" } as React.CSSProperties,
  syncBadge: (color: string) => ({ fontSize: 10, fontWeight: "var(--fw-medium)", color, whiteSpace: "nowrap" as const }) as React.CSSProperties,
  waveBadge: { fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" as const } as React.CSSProperties,
  stageBadge: { fontSize: 10, color: "var(--text-muted)", padding: "1px 6px", background: "var(--surface-2)", borderRadius: 3 } as React.CSSProperties,
  sparkline: { width: 48, height: 14, display: "flex", alignItems: "flex-end", gap: 1 } as React.CSSProperties,
  sparkBar: (pct: number) => ({ width: 4, height: `${Math.max(pct * 100, 5)}%`, background: "#3B82F6", borderRadius: 1, opacity: 0.6 }) as React.CSSProperties,
  miniProgress: { display: "flex", gap: 2, alignItems: "center" } as React.CSSProperties,
  miniDot: (pct: number) => ({ width: 6, height: 6, borderRadius: "50%", background: pct >= 100 ? "#22C55E" : pct > 0 ? "#3B82F6" : "var(--border)" }) as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 14px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#3B82F6", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  bulkBar: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, marginBottom: 10, fontSize: "var(--text-xs)" } as React.CSSProperties,
  emptyState: { textAlign: "center" as const, padding: "60px 24px", color: "var(--text-muted)" } as React.CSSProperties,
  quickActions: { display: "flex", gap: 3, opacity: 0, transition: "opacity 0.15s" } as React.CSSProperties,
  quickBtn: { padding: "2px 6px", fontSize: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 3, color: "var(--text-muted)", cursor: "pointer" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function WorkDesignQueue({ projectId, model, onJobSelect }: Props) {
  const [functions, setFunctions] = useState<FunctionGroup[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [waves, setWaves] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [waveFilter, setWaveFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [functionFilter, setFunctionFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  // UI state
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getWDQueue(projectId, {
        wave: waveFilter, status: statusFilter,
        function: functionFilter, search, source: sourceFilter,
      });
      setFunctions(data.functions || []);
      setSummary(data.summary || {});
      setWaves(data.waves || {});

      // Auto-expand if ≤20 total jobs
      const total = (data.summary?.total || 0) as number;
      if (total <= 20) {
        setExpanded(new Set((data.functions || []).map((f: FunctionGroup) => f.function)));
      }
    } catch { /* empty */ }
    setLoading(false);
  }, [projectId, waveFilter, statusFilter, functionFilter, search, sourceFilter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Populate from data (first-time setup)
  const populate = useCallback(async () => {
    await api.populateWDFromData(projectId, model);
    fetchQueue();
  }, [projectId, model, fetchQueue]);

  // Scan sync
  const scanSync = useCallback(async () => {
    setSyncing(true);
    await api.scanWDSync(projectId);
    await fetchQueue();
    setSyncing(false);
  }, [projectId, fetchQueue]);

  // Expand/collapse
  const toggle = (func: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(func) ? next.delete(func) : next.add(func);
    return next;
  });
  const expandAll = () => setExpanded(new Set(functions.map(f => f.function)));
  const collapseAll = () => setExpanded(new Set());

  // Selection
  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAllInFunction = (func: FunctionGroup) => {
    const ids = func.jobs.map(j => j.id);
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  // Batch actions
  const batchWave = async (wave: string) => {
    await api.batchUpdateWDWave([...selected], wave);
    setSelected(new Set());
    fetchQueue();
  };
  const batchStatus = async (status: string) => {
    await api.batchUpdateWDStatus([...selected], status);
    setSelected(new Set());
    fetchQueue();
  };

  // Quick wave change on single job
  const quickWave = async (jobId: string, wave: string) => {
    await api.updateWDWave(jobId, wave);
    fetchQueue();
  };

  const totalJobs = summary.total || 0;
  const allFunctions = useMemo(() => functions.map(f => f.function).sort(), [functions]);

  // Stage completion mini-dots
  const STAGES = ["context", "deconstruction", "reconstruction", "redeployment", "impact", "org_link", "handoff"];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h2 style={S.h2}>Work Design Queue</h2>
        <div style={S.headerActions}>
          <button style={S.btn} onClick={scanSync} disabled={syncing}>
            <RefreshCw size={12} style={syncing ? { animation: "spin 1s linear infinite" } : undefined} />
            {syncing ? "Scanning…" : "Scan Sync"}
          </button>
          <button style={S.btnPrimary} onClick={populate}><Plus size={12} /> Add Jobs</button>
        </div>
      </div>

      {/* Summary */}
      <div style={S.summaryBar}>
        {totalJobs} jobs · {summary.redesigned || 0} redesigned · {summary.in_progress || 0} in progress · {summary.not_started || 0} not started
        {(summary.deferred || 0) > 0 && ` · ${summary.deferred} deferred`}
      </div>

      {/* Filter bar */}
      <div style={S.filterBar}>
        <div style={S.searchBox}>
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input style={S.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs…" />
          {search && <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }} onClick={() => setSearch("")}><X size={12} /></button>}
        </div>

        {allFunctions.length > 1 && (
          <select style={S.select} value={functionFilter} onChange={e => setFunctionFilter(e.target.value)}>
            <option value="">All Functions</option>
            {allFunctions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}

        <select style={S.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="redesigned">Redesigned</option>
          <option value="deferred">Deferred</option>
          <option value="out_of_scope">Out of Scope</option>
        </select>

        <select style={S.select} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          <option value="ja">From JA</option>
          <option value="manual">Manual</option>
          <option value="csv">CSV Upload</option>
        </select>

        <button style={{ ...S.btn, marginLeft: "auto", fontSize: 10 }} onClick={expanded.size > 0 ? collapseAll : expandAll}>
          {expanded.size > 0 ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Wave pills */}
      <div style={S.wavePills}>
        <button style={S.wavePill(waveFilter === "")} onClick={() => setWaveFilter("")}>
          All ({totalJobs})
        </button>
        {Object.entries(WAVE_LABELS).map(([key, label]) => {
          const count = waves[key] || 0;
          if (count === 0 && key !== "unassigned") return null;
          return (
            <button key={key} style={S.wavePill(waveFilter === key)} onClick={() => setWaveFilter(waveFilter === key ? "" : key)}>
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={S.bulkBar}>
          <span style={{ fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>{selected.size} selected</span>
          <select style={S.select} onChange={e => { if (e.target.value) batchWave(e.target.value); e.target.value = ""; }}>
            <option value="">Assign wave…</option>
            {Object.entries(WAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select style={S.select} onChange={e => { if (e.target.value) batchStatus(e.target.value); e.target.value = ""; }}>
            <option value="">Set status…</option>
            <option value="deferred">Deferred</option>
            <option value="out_of_scope">Out of Scope</option>
            <option value="not_started">Not Started</option>
          </select>
          <button style={{ ...S.btn, marginLeft: "auto" }} onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={S.emptyState}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
          <div>Loading queue…</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && totalJobs === 0 && (
        <div style={S.emptyState}>
          <Sparkles size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)", marginBottom: 4 }}>
            Your queue is empty
          </div>
          <div style={{ fontSize: "var(--text-xs)", marginBottom: 16 }}>
            Populate from your workforce data to get started, or add jobs manually.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button style={S.btnPrimary} onClick={populate}><Plus size={12} /> Populate from Data</button>
            <button style={S.btn}><Plus size={12} /> Add Manually</button>
          </div>
        </div>
      )}

      {/* No matches */}
      {!loading && totalJobs > 0 && functions.length === 0 && (
        <div style={S.emptyState}>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", marginBottom: 4 }}>No jobs match these filters</div>
          <button style={S.btn} onClick={() => { setSearch(""); setWaveFilter(""); setStatusFilter(""); setFunctionFilter(""); setSourceFilter(""); }}>Clear filters</button>
        </div>
      )}

      {/* Function accordions */}
      {!loading && functions.map(func => (
        <div key={func.function} style={S.funcSection}>
          {/* Function header */}
          <div style={S.funcHeader} onClick={() => toggle(func.function)}>
            <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>
              {expanded.has(func.function) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <span style={S.funcName}>{func.function || "Unassigned"}</span>
            <span style={S.funcMeta}>
              {func.total} job{func.total !== 1 ? "s" : ""}
              {func.redesigned > 0 && <> · <span style={{ color: "#22C55E" }}>{func.redesigned} redesigned</span></>}
              {func.in_progress > 0 && <> · <span style={{ color: "#3B82F6" }}>{func.in_progress} in progress</span></>}
              {func.not_started > 0 && <> · {func.not_started} not started</>}
            </span>
            <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2, fontSize: 10 }}
              onClick={e => { e.stopPropagation(); selectAllInFunction(func); }}>
              {func.jobs.every(j => selected.has(j.id)) ? <CheckSquare size={13} style={{ color: "#3B82F6" }} /> : <Square size={13} />}
            </button>
          </div>

          {/* Job rows */}
          {expanded.has(func.function) && func.jobs.map(job => {
            const si = STATUS_ICONS[job.wd_status] || STATUS_ICONS.not_started;
            const sb = SYNC_BADGES[job.sync_state] || SYNC_BADGES.manual;
            const isHovered = hoveredRow === job.id;
            const isSelected = selected.has(job.id);

            return (
              <div key={job.id}
                style={{ ...S.jobRow, ...(isHovered ? S.jobRowHover : {}), ...(isSelected ? { background: "rgba(59,130,246,0.05)" } : {}) }}
                onMouseEnter={() => setHoveredRow(job.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onJobSelect(job)}
              >
                {/* Checkbox */}
                <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); toggleSelect(job.id); }}>
                  {isSelected ? <CheckSquare size={13} style={{ color: "#3B82F6" }} /> : <Square size={13} />}
                </button>

                {/* Status icon */}
                <span style={S.statusIcon(si.color)}>{si.icon}</span>

                {/* Title */}
                <span style={S.jobTitle}>{job.title}</span>

                {/* Track/level badge */}
                {job.track_code && job.level_code && (
                  <span style={S.trackBadge}>{job.track_code}{job.level_code}</span>
                )}

                {/* Sync badge */}
                <span style={S.syncBadge(sb.color)}>{sb.label}{job.ja_source_version ? ` v${job.ja_source_version}` : ""}</span>

                {/* Wave */}
                <span style={S.waveBadge}>{WAVE_LABELS[job.wave] || job.wave}</span>

                {/* Current stage */}
                {job.current_stage && (
                  <span style={S.stageBadge}>{STAGE_LABELS[job.current_stage] || job.current_stage}</span>
                )}

                {/* Mini stage progress dots */}
                <div style={S.miniProgress}>
                  {STAGES.map(st => (
                    <div key={st} style={S.miniDot((job.stage_completion || {})[st] || 0)} title={`${STAGE_LABELS[st]}: ${(job.stage_completion || {})[st] || 0}%`} />
                  ))}
                </div>

                {/* Sparkline (hours freed) */}
                {job.hours_freed > 0 && (
                  <div style={{ fontSize: 10, fontFamily: "var(--ff-mono)", color: "#22C55E", minWidth: 40, textAlign: "right" }}>
                    {job.hours_freed.toFixed(1)}h
                  </div>
                )}

                {/* Quick actions (on hover) */}
                <div style={{ ...S.quickActions, opacity: isHovered ? 1 : 0 }}>
                  <select style={{ ...S.quickBtn, appearance: "none", paddingRight: 12, cursor: "pointer" }}
                    value={job.wave}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { e.stopPropagation(); quickWave(job.id, e.target.value); }}>
                    {Object.entries(WAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
