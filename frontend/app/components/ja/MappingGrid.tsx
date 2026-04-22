"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Check, X, ArrowUpRight, AlertTriangle, Filter, SlidersHorizontal,
  Sparkles, ChevronDown, MoreHorizontal, CheckSquare, Square,
  GitMerge, GitBranch, Plus, Minus,
} from "@/lib/icons";
import { apiFetch } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface RoleData {
  id: string; title: string; function_group: string; family: string;
  sub_family: string; track_code: string; level_code: string;
  people_manager: boolean; incumbent_count: number;
  grade_code?: string; location?: string; source_job_code?: string;
}

interface GridRow {
  current: RoleData;
  future: RoleData | null;
  mapping_group_id: string | null;
  mapping_status: string;
  confidence_score: number;
  ai_rationale: Record<string, unknown>;
  pattern: string | null;
  changes: string[];
  track_change: boolean;
  change_count: number;
  flags: string[];
  future_flags: string[];
}

interface Props {
  model: string;
  projectId: string;
  scenarioId: string;
  onRoleClick?: (row: GridRow) => void;
  frameworkTracks?: { code: string; name: string; levels: string[] }[];
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#34d399",
  ai_suggested: "#fbbf24",
  unmapped: "#9CA3AF",
  rejected: "#fb7185",
  changes_requested: "#EAB308",
};

const S = {
  wrapper: { padding: "16px 20px" } as React.CSSProperties,
  filterBar: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, marginBottom: 14 } as React.CSSProperties,
  searchBox: { display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, minWidth: 220 } as React.CSSProperties,
  searchInput: { flex: 1, background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "var(--text-xs)", outline: "none" } as React.CSSProperties,
  pill: (active: boolean) => ({ padding: "4px 12px", fontSize: 11, fontWeight: "var(--fw-medium)", border: `1px solid ${active ? "#22d3ee" : "var(--border)"}`, borderRadius: 14, background: active ? "rgba(34,211,238,0.1)" : "var(--surface-2)", color: active ? "#22d3ee" : "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap" as const }) as React.CSSProperties,
  autoMapBtn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#22d3ee", color: "#fff", cursor: "pointer", marginLeft: "auto" } as React.CSSProperties,
  bulkBar: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: 8, marginBottom: 10, fontSize: "var(--text-xs)" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "separate" as const, borderSpacing: 0 } as React.CSSProperties,
  thRow: { background: "#05070d" } as React.CSSProperties,
  th: { padding: "8px 10px", fontSize: 11, fontWeight: 600, color: "#fff", textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "nowrap" as const, cursor: "pointer", userSelect: "none" as const, borderBottom: "2px solid #05070d" } as React.CSSProperties,
  groupHeader: { padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" as const, letterSpacing: "0.08em", background: "#05070d", textAlign: "center" as const } as React.CSSProperties,
  dividerTh: { width: 2, background: "#e8ecf5", padding: 0, borderBottom: "2px solid #05070d" } as React.CSSProperties,
  td: { padding: "7px 10px", fontSize: "var(--text-xs)", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const } as React.CSSProperties,
  statusStrip: (status: string) => ({ width: 4, padding: 0, background: STATUS_COLORS[status] || "#9CA3AF", borderBottom: "1px solid var(--border)" }) as React.CSSProperties,
  dividerTd: { width: 2, background: "#05070d", padding: 0, borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  changedCell: { color: "#fbbf24", fontWeight: "var(--fw-semi)" } as React.CSSProperties,
  changeArrow: { color: "#fbbf24", fontSize: 11, marginLeft: 3 } as React.CSSProperties,
  row: (selected: boolean, aiPending: boolean) => ({
    cursor: "pointer",
    background: selected ? "rgba(34,211,238,0.06)" : aiPending ? "#FFFEF7" : "transparent",
    transition: "background 0.1s",
  }) as React.CSSProperties,
  actionBtn: (color: string) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, border: "none", borderRadius: 4, background: "transparent", color, cursor: "pointer", fontSize: 13 }) as React.CSSProperties,
  patternBadge: (pattern: string) => {
    const colors: Record<string, string> = { split: "#a78bfa", merge: "#14B8A6", new: "#22d3ee", sunset: "#fb7185" };
    return { display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", fontSize: 11, fontWeight: 600, borderRadius: 3, background: `${colors[pattern] || "var(--surface-2)"}20`, color: colors[pattern] || "var(--text-muted)" } as React.CSSProperties;
  },
  pager: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" } as React.CSSProperties,
  pageBtn: (disabled: boolean) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface-2)", color: disabled ? "var(--border)" : "var(--text-secondary)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 }) as React.CSSProperties,
  flagIcon: { color: "#fbbf24", marginLeft: 4, verticalAlign: "middle" } as React.CSSProperties,
  summary: { display: "flex", gap: 16, marginBottom: 10, fontSize: "var(--text-xs)", color: "var(--text-muted)" } as React.CSSProperties,
  summaryDot: (color: string) => ({ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 4 }) as React.CSSProperties,
  kbd: { display: "inline-block", padding: "1px 5px", fontSize: 11, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 3, fontFamily: "var(--ff-mono)", color: "var(--text-muted)" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function MappingGrid({ model, projectId, scenarioId, onRoleClick, frameworkTracks }: Props) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [trackFilter, setTrackFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusIdx, setFocusIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const tableRef = useRef<HTMLTableElement>(null);

  // Fetch grid data
  const fetchGrid = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        project_id: projectId, scenario_id: scenarioId,
        page: String(page), page_size: String(pageSize),
        search, status: statusFilter, family: familyFilter,
        track: trackFilter, level: levelFilter,
        sort_by: sortBy, sort_dir: sortDir,
      });
      const res = await apiFetch(`/api/ja/mapping-grid?${params}`);
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setSummary(data.summary || {});
    } catch { /* empty */ }
    setLoading(false);
  }, [projectId, scenarioId, page, pageSize, search, statusFilter, familyFilter, trackFilter, levelFilter, sortBy, sortDir]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  // Sort toggle
  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(0);
  };

  // Selection
  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.current.id)));
  };

  // Bulk actions
  const bulkAction = async (action: string) => {
    const groupIds = rows.filter(r => selected.has(r.current.id) && r.mapping_group_id)
      .map(r => r.mapping_group_id!);
    if (groupIds.length === 0) return;
    await apiFetch("/api/ja/mappings/bulk-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_ids: groupIds, action }),
    });
    setSelected(new Set());
    fetchGrid();
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;

      switch (e.key) {
        case "j": case "ArrowDown":
          e.preventDefault();
          setFocusIdx(prev => Math.min(prev + 1, rows.length - 1));
          break;
        case "k": case "ArrowUp":
          e.preventDefault();
          setFocusIdx(prev => Math.max(prev - 1, 0));
          break;
        case "Enter":
          if (focusIdx >= 0 && focusIdx < rows.length) {
            onRoleClick?.(rows[focusIdx]);
          }
          break;
        case "a":
          if (focusIdx >= 0 && rows[focusIdx]?.mapping_status === "ai_suggested") {
            e.preventDefault();
            const row = rows[focusIdx];
            if (row.mapping_group_id) {
              apiFetch("/api/ja/mappings/bulk-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_ids: [row.mapping_group_id], action: "accept" }),
              }).then(fetchGrid);
            }
          }
          break;
        case "r":
          if (focusIdx >= 0 && rows[focusIdx]?.mapping_status === "ai_suggested") {
            e.preventDefault();
            const row = rows[focusIdx];
            if (row.mapping_group_id) {
              apiFetch("/api/ja/mappings/bulk-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_ids: [row.mapping_group_id], action: "reject" }),
              }).then(fetchGrid);
            }
          }
          break;
        case "/":
          e.preventDefault();
          document.getElementById("ja-grid-search")?.focus();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focusIdx, rows, onRoleClick, fetchGrid]);

  // Unique filter values
  const families = useMemo(() => [...new Set(rows.map(r => r.current.family).filter(Boolean))].sort(), [rows]);
  const tracksInData = useMemo(() => [...new Set(rows.map(r => r.current.track_code).filter(Boolean))].sort(), [rows]);

  const totalPages = Math.ceil(total / pageSize);
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);

  const renderCell = (current: string, future: string | undefined, changed: boolean) => (
    <span style={changed ? S.changedCell : undefined}>
      {future ?? current}
      {changed && <span style={S.changeArrow}>↑</span>}
    </span>
  );

  return (
    <div style={S.wrapper}>
      {/* Summary row */}
      <div style={S.summary}>
        <span><span style={S.summaryDot("#34d399")} />{summary.mapped || 0} mapped</span>
        <span><span style={S.summaryDot("#fbbf24")} />{summary.ai_suggested || 0} AI suggested</span>
        <span><span style={S.summaryDot("#9CA3AF")} />{summary.unmapped || 0} unmapped</span>
        <span><span style={S.summaryDot("#fb7185")} />{summary.rejected || 0} rejected</span>
        {(summary.total_flags || 0) > 0 && <span><AlertTriangle size={11} style={{ color: "#fbbf24" }} /> {summary.total_flags} flags</span>}
        <span style={{ marginLeft: "auto", fontSize: 11 }}>
          <span style={S.kbd}>j</span>/<span style={S.kbd}>k</span> navigate · <span style={S.kbd}>Enter</span> detail · <span style={S.kbd}>a</span> accept · <span style={S.kbd}>r</span> reject · <span style={S.kbd}>/</span> search
        </span>
      </div>

      {/* Filter bar */}
      <div style={S.filterBar}>
        <div style={S.searchBox}>
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input id="ja-grid-search" style={S.searchInput} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search roles…" />
          {search && <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }} onClick={() => setSearch("")}><X size={12} /></button>}
        </div>

        {/* Status pills */}
        {["", "unmapped", "ai_suggested", "confirmed", "rejected"].map(st => (
          <button key={st} style={S.pill(statusFilter === st)} onClick={() => { setStatusFilter(st); setPage(0); }}>
            {st === "" ? "All" : st === "ai_suggested" ? "AI Suggested" : st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}

        {/* Family filter */}
        {families.length > 1 && (
          <select style={{ ...S.pill(!!familyFilter), appearance: "none", paddingRight: 20 }}
            value={familyFilter} onChange={e => { setFamilyFilter(e.target.value); setPage(0); }}>
            <option value="">All Families</option>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}

        {/* Track filter */}
        {tracksInData.length > 1 && (
          <select style={{ ...S.pill(!!trackFilter), appearance: "none", paddingRight: 20 }}
            value={trackFilter} onChange={e => { setTrackFilter(e.target.value); setPage(0); }}>
            <option value="">All Tracks</option>
            {tracksInData.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <button style={S.autoMapBtn} onClick={() => { /* TODO: auto-map endpoint */ }}>
          <Sparkles size={12} /> Auto-map filtered
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={S.bulkBar}>
          <span style={{ fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>{selected.size} selected</span>
          <button style={{ ...S.pill(false), cursor: "pointer" }} onClick={() => bulkAction("accept")}><Check size={11} /> Accept All</button>
          <button style={{ ...S.pill(false), cursor: "pointer" }} onClick={() => bulkAction("reject")}><X size={11} /> Reject All</button>
          <button style={{ ...S.pill(false), cursor: "pointer", marginLeft: "auto" }} onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* Grid table */}
      <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--border)" }}>
        <table ref={tableRef} style={S.table}>
          <thead>
            {/* Group header row */}
            <tr style={S.thRow}>
              <th style={{ ...S.groupHeader, width: 32 }} />
              <th style={{ ...S.groupHeader, width: 4 }} />
              <th style={S.groupHeader} />
              <th colSpan={5} style={S.groupHeader}>Current State</th>
              <th style={S.dividerTh} />
              <th colSpan={5} style={S.groupHeader}>Future State</th>
              <th style={{ ...S.groupHeader, width: 80 }} />
            </tr>
            {/* Column headers */}
            <tr style={S.thRow}>
              <th style={{ ...S.th, width: 32, cursor: "default" }}>
                <button style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }} onClick={selectAll}>
                  {selected.size === rows.length && rows.length > 0 ? <CheckSquare size={13} /> : <Square size={13} />}
                </button>
              </th>
              <th style={{ ...S.th, width: 4, padding: 0 }} />
              <th style={{ ...S.th, position: "sticky", left: 0, background: "#05070d", zIndex: 2, minWidth: 200 }} onClick={() => toggleSort("title")}>
                Role {sortBy === "title" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th style={S.th}>Function</th>
              <th style={S.th}>Family</th>
              <th style={S.th}>Sub-Family</th>
              <th style={S.th}>Track</th>
              <th style={S.th}>Level</th>
              <th style={S.dividerTh} />
              <th style={S.th}>Function</th>
              <th style={S.th}>Family</th>
              <th style={S.th}>Sub-Family</th>
              <th style={S.th}>Track</th>
              <th style={S.th}>Level</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const c = row.current;
              const f = row.future;
              const isFocused = idx === focusIdx;
              const isSelected = selected.has(c.id);
              const isAiPending = row.mapping_status === "ai_suggested";

              return (
                <tr key={c.id}
                  style={{
                    ...S.row(isFocused, isAiPending),
                    outline: isFocused ? "2px solid #22d3ee" : "none",
                    outlineOffset: -2,
                  }}
                  onClick={() => { setFocusIdx(idx); onRoleClick?.(row); }}
                >
                  {/* Checkbox */}
                  <td style={{ ...S.td, width: 32, textAlign: "center" }}>
                    <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                      onClick={e => { e.stopPropagation(); toggleSelect(c.id); }}>
                      {isSelected ? <CheckSquare size={13} style={{ color: "#22d3ee" }} /> : <Square size={13} />}
                    </button>
                  </td>
                  {/* Status strip */}
                  <td style={S.statusStrip(row.mapping_status)} />
                  {/* Role name (sticky) */}
                  <td style={{ ...S.td, position: "sticky", left: 0, background: isFocused ? "rgba(34,211,238,0.06)" : isAiPending ? "#FFFEF7" : "var(--surface-1)", zIndex: 1, fontWeight: "var(--fw-medium)", color: "var(--text-primary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {c.title}
                      {row.flags.length > 0 && <AlertTriangle size={11} style={S.flagIcon} />}
                      {row.pattern && row.pattern !== "one_to_one" && (
                        <span style={S.patternBadge(row.pattern)}>
                          {row.pattern === "split" && <><GitBranch size={9} /> Split</>}
                          {row.pattern === "merge" && <><GitMerge size={9} /> Merge</>}
                          {row.pattern === "new" && <><Plus size={9} /> New</>}
                          {row.pattern === "sunset" && <><Minus size={9} /> Sunset</>}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      {c.incumbent_count} incumbent{c.incumbent_count !== 1 ? "s" : ""}
                      {row.track_change && <span style={{ marginLeft: 6, color: "#fbbf24", fontWeight: "var(--fw-semi)" }}>Track change</span>}
                    </div>
                  </td>
                  {/* Current state cells */}
                  <td style={S.td}>{c.function_group}</td>
                  <td style={S.td}>{c.family}</td>
                  <td style={S.td}>{c.sub_family}</td>
                  <td style={S.td}>{c.track_code}</td>
                  <td style={S.td}>{c.level_code}</td>
                  {/* Divider */}
                  <td style={S.dividerTd} />
                  {/* Future state cells */}
                  <td style={S.td}>{renderCell(c.function_group, f?.function_group, row.changes.includes("function_group"))}</td>
                  <td style={S.td}>{renderCell(c.family, f?.family, row.changes.includes("family"))}</td>
                  <td style={S.td}>{renderCell(c.sub_family, f?.sub_family, row.changes.includes("sub_family"))}</td>
                  <td style={S.td}>{renderCell(c.track_code, f?.track_code, row.changes.includes("track_code"))}</td>
                  <td style={S.td}>{renderCell(c.level_code, f?.level_code, row.changes.includes("level_code"))}</td>
                  {/* Actions */}
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    {isAiPending && (
                      <>
                        <button style={S.actionBtn("#34d399")} title="Accept (a)"
                          onClick={e => { e.stopPropagation(); if (row.mapping_group_id) apiFetch("/api/ja/mappings/bulk-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_ids: [row.mapping_group_id], action: "accept" }) }).then(fetchGrid); }}>
                          <Check size={14} />
                        </button>
                        <button style={S.actionBtn("#fb7185")} title="Reject (r)"
                          onClick={e => { e.stopPropagation(); if (row.mapping_group_id) apiFetch("/api/ja/mappings/bulk-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group_ids: [row.mapping_group_id], action: "reject" }) }).then(fetchGrid); }}>
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={15} style={{ ...S.td, textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                {search || statusFilter ? "No roles match the current filters" : "No roles imported yet. Use the Import tab to load current-state data."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div style={S.pager}>
          <span>Showing {start}–{end} of {total}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={S.pageBtn(page === 0)} onClick={() => setPage(0)} disabled={page === 0}><ChevronsLeft size={13} /></button>
            <button style={S.pageBtn(page === 0)} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft size={13} /></button>
            <span style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}>Page {page + 1} of {totalPages}</span>
            <button style={S.pageBtn(page >= totalPages - 1)} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight size={13} /></button>
            <button style={S.pageBtn(page >= totalPages - 1)} onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}><ChevronsRight size={13} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
