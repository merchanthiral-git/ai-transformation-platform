"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, Search, FileDown, MoreHorizontal } from "@/lib/icons";
import type { DataTableProps, Column, SortDirection } from "./DataTable.types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCellValue(row: any, accessor: Column["accessor"]): any {
  if (typeof accessor === "function") return accessor(row);
  return (accessor as string).split(".").reduce((obj, key) => obj?.[key], row);
}

function rowId(row: any): string {
  return row.id ?? row._id ?? JSON.stringify(row);
}

function exportCSV(columns: Column[], data: any[], caption?: string) {
  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns.map((c) => `"${String(getCellValue(row, c.accessor) ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `${caption ?? "export"}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SortCaret({ active, dir }: { active: boolean; dir: SortDirection }) {
  const color = active ? "var(--accent-primary)" : "var(--text-muted)";
  return active && dir === "asc"
    ? <ChevronUp size={12} style={{ color, flexShrink: 0 }} />
    : <ChevronDown size={12} style={{ color, flexShrink: 0 }} />;
}

const cellBase: React.CSSProperties = {
  color: "var(--text-secondary)",
  verticalAlign: "middle",
};

// ── Main ──────────────────────────────────────────────────────────────────────

export function DataTable({
  data, columns, density = "comfortable", rowActions, onRowClick,
  selection, pagination, sort, onSortChange, search,
  emptyState, loading = false, exportable = false, caption,
}: DataTableProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(pagination?.pageSize ?? 20);
  const [openActionRow, setOpenActionRow] = useState<number | null>(null);

  const pad = density === "compact" ? "6px 10px" : "10px 12px";
  const fs = density === "compact" ? "var(--text-xs)" : "var(--text-sm)";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      columns.some((col) => String(getCellValue(row, col.accessor) ?? "").toLowerCase().includes(q))
    );
  }, [data, columns, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const handleSort = useCallback((colId: string) => {
    if (!onSortChange) return;
    onSortChange(colId, sort?.by === colId && sort.direction === "asc" ? "desc" : "asc");
  }, [sort, onSortChange]);

  const handleSearch = (q: string) => { setQuery(q); setPage(0); search?.onSearch?.(q); };

  const handleSelectRow = (row: any) => {
    if (!selection || selection.mode === "none") return;
    const id = rowId(row);
    if (selection.mode === "single") {
      selection.onChange(selection.selected.includes(id) ? [] : [id]);
    } else {
      selection.onChange(
        selection.selected.includes(id)
          ? selection.selected.filter((s) => s !== id)
          : [...selection.selected, id]
      );
    }
  };

  const showSel = selection && selection.mode !== "none";
  const pageSizes = pagination?.pageSizes ?? [10, 20, 50, 100];
  const colSpan = columns.length + (showSel ? 1 : 0) + (rowActions ? 1 : 0);

  const thBase: React.CSSProperties = {
    padding: pad, fontWeight: "var(--fw-medium)", fontSize: "var(--text-xs)",
    color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px",
    whiteSpace: "nowrap", borderBottom: "1px solid var(--border)", userSelect: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Toolbar */}
      {(search || exportable) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
          {search ? (
            <div style={{ position: "relative", maxWidth: 280 }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input type="search" placeholder={search.placeholder} value={query}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontSize: fs, color: "var(--text-primary)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, outline: "none" }}
              />
            </div>
          ) : <div />}
          {exportable && (
            <button onClick={() => exportCSV(columns, filtered, caption)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", color: "var(--text-secondary)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }}>
              <FileDown size={13} /> Export CSV
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: fs, color: "var(--text-primary)" }}>
          {caption && <caption style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "left", padding: "6px 12px", captionSide: "top" }}>{caption}</caption>}
          <thead>
            <tr style={{ backgroundColor: "var(--surface-2)", position: "sticky", top: 0, zIndex: 1 }}>
              {showSel && (
                <th style={{ ...thBase, width: 36, textAlign: "center" }}>
                  {selection!.mode === "multi" && (
                    <input type="checkbox"
                      onChange={() => {
                        const allIds = pageData.map(rowId);
                        const allSelected = allIds.every((id) => selection!.selected.includes(id));
                        selection!.onChange(allSelected ? [] : allIds);
                      }}
                      checked={pageData.length > 0 && pageData.every((r) => selection!.selected.includes(rowId(r)))}
                      style={{ cursor: "pointer" }}
                    />
                  )}
                </th>
              )}
              {columns.map((col) => {
                const isActive = sort?.by === col.id;
                const align = col.align ?? (col.type === "numeric" ? "right" : "left");
                return (
                  <th key={col.id} onClick={() => col.sortable && handleSort(col.id)}
                    style={{ ...thBase, width: col.width, textAlign: align, color: isActive ? "var(--accent-primary)" : "var(--text-muted)", cursor: col.sortable ? "pointer" : "default" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      {col.header}
                      {col.sortable && <SortCaret active={isActive} dir={sort?.direction ?? "asc"} />}
                    </span>
                  </th>
                );
              })}
              {rowActions && <th style={{ ...thBase, width: 48 }} />}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={colSpan} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading...</td></tr>
            ) : pageData.length === 0 ? (
              <tr><td colSpan={colSpan} style={{ padding: 32, textAlign: "center" }}>{emptyState ?? <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>No data to display</span>}</td></tr>
            ) : pageData.map((row, idx) => {
              const id = rowId(row);
              const isSelected = selection?.selected.includes(id) ?? false;
              return (
                <tr key={idx}
                  onClick={() => { handleSelectRow(row); onRowClick?.(row); }}
                  style={{ backgroundColor: isSelected ? "var(--active-bg)" : undefined, borderTop: idx > 0 ? "1px solid var(--border-light)" : undefined, cursor: onRowClick || showSel ? "pointer" : "default", transition: "background var(--duration-fast) var(--ease-out)" }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hover)"; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                >
                  {showSel && (
                    <td style={{ ...cellBase, padding: pad, textAlign: "center" }}>
                      <input type={selection!.mode === "single" ? "radio" : "checkbox"}
                        checked={isSelected} onChange={() => handleSelectRow(row)}
                        onClick={(e) => e.stopPropagation()} style={{ cursor: "pointer" }} />
                    </td>
                  )}
                  {columns.map((col) => {
                    const value = getCellValue(row, col.accessor);
                    const align = col.align ?? (col.type === "numeric" ? "right" : "left");
                    return (
                      <td key={col.id} style={{ ...cellBase, padding: pad, textAlign: align, fontVariantNumeric: col.type === "numeric" ? "tabular-nums" : undefined }}>
                        {col.render ? col.render(value, row) : (value ?? "—")}
                      </td>
                    );
                  })}
                  {rowActions && (
                    <td style={{ ...cellBase, padding: pad, textAlign: "right", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <button onClick={() => setOpenActionRow(openActionRow === idx ? null : idx)}
                          aria-label="Row actions"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "none", border: "none", borderRadius: 4, color: "var(--text-muted)", cursor: "pointer" }}>
                          <MoreHorizontal size={14} />
                        </button>
                        {openActionRow === idx && (
                          <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 50, backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-3)", minWidth: 150, padding: "4px 0" }}>
                            {rowActions(row).map((action, i) => (
                              <button key={i}
                                onClick={() => { action.onClick(row); setOpenActionRow(null); }}
                                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 12px", background: "none", border: "none", color: "var(--text-secondary)", fontSize: "var(--text-sm)", cursor: "pointer", textAlign: "left" }}
                                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--hover)")}
                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "")}>
                                {action.icon && <span style={{ display: "flex", color: "var(--text-muted)" }}>{action.icon}</span>}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 4, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          <span>
            {filtered.length} row{filtered.length !== 1 ? "s" : ""}
            {selection && selection.selected.length > 0 && <> &middot; {selection.selected.length} selected</>}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 4px", cursor: "pointer" }}>
              {pageSizes.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
            <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}
              style={{ padding: "3px 8px", fontSize: "var(--text-xs)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-secondary)", cursor: safePage === 0 ? "not-allowed" : "pointer", opacity: safePage === 0 ? 0.5 : 1 }}>
              Prev
            </button>
            <span>{safePage + 1} / {totalPages}</span>
            <button disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}
              style={{ padding: "3px 8px", fontSize: "var(--text-xs)", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-secondary)", cursor: safePage >= totalPages - 1 ? "not-allowed" : "pointer", opacity: safePage >= totalPages - 1 ? 0.5 : 1 }}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
