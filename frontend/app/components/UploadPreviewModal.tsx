"use client";
import React, { useState, useEffect, useCallback } from "react";
import * as api from "../../lib/api";
import { Badge, showToast } from "./shared";

// ── Types ──────────────────────────────────────────────────
interface ColumnMapping { source: string; target: string; status: "mapped" | "unmapped" | "missing"; required: boolean; }
interface ValidationIssue { severity: "error" | "warning" | "info"; message: string; }
interface SheetPreview {
  name: string; detectedType: string; confidence: number;
  rowCount: number; columnCount: number; headers: string[]; rows: string[][];
  columnMappings: ColumnMapping[]; validationIssues: ValidationIssue[];
  availableTypes: string[]; expectedColumns: string[];
}
interface PreviewData { fileName: string; fileSize: number; sheets: SheetPreview[]; }

// ── Helpers ────────────────────────────────────────────────
function fmtSize(b: number) { return b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`; }
const SEV = {
  error:   { bg: "rgba(251,113,133,0.12)", text: "#f87171", border: "#dc2626", icon: "\u2717" },
  warning: { bg: "rgba(251,191,36,0.12)", text: "#fbbf24", border: "#d97706", icon: "\u26A0" },
  info:    { bg: "rgba(96,165,250,0.12)", text: "#93c5fd", border: "#3b82f6", icon: "\u2139" },
};
const MONO = "monospace";
const BORDER = "1px solid rgba(255,255,255,0.06)";
const DATA_TYPES = ["Workforce", "Jobs", "Tasks", "Org Structure", "Skills", "Compensation"];

function buildFallback(fl: FileList): PreviewData[] {
  return Array.from(fl).map((f) => ({
    fileName: f.name, fileSize: f.size,
    sheets: [{ name: "Sheet 1", detectedType: "Unknown", confidence: 0, rowCount: 0, columnCount: 0,
      headers: [], rows: [], columnMappings: [], expectedColumns: [], availableTypes: DATA_TYPES,
      validationIssues: [{ severity: "info" as const, message: "Preview not available \u2014 file will be analyzed on import." }],
    }],
  }));
}

// ── Tab button ─────────────────────────────────────────────
function Tab({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontFamily: MONO,
      border: `1px solid ${active ? color : "rgba(255,255,255,0.08)"}`,
      background: active ? `${color}22` : "transparent", color: active ? color : "#94a3b8",
    }}>{label}</button>
  );
}

// ── Action button ──────────────────────────────────────────
function Btn({ label, bg, disabled, onClick }: { label: string; bg: string; disabled?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600,
      background: disabled ? "#374151" : bg, color: disabled ? "#6b7280" : "#fff",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1,
    }}>{label}</button>
  );
}

// ════════════════════════════════════════════════════════════
//  Main Component
// ════════════════════════════════════════════════════════════
export function UploadPreviewModal({ files, onClose, onImport }: {
  files: FileList; onClose: () => void; onImport: (files: FileList) => Promise<void>;
}) {
  const [previews, setPreviews] = useState<PreviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileIdx, setFileIdx] = useState(0);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});

  // Escape key
  const onKey = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => { document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onKey]);

  // Fetch preview on mount
  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await (api as any).previewUpload(files);
        if (dead) return;
        if (res?.previews && Array.isArray(res.previews)) setPreviews(res.previews);
        else if (Array.isArray(res)) setPreviews(res);
        else setPreviews(buildFallback(files));
      } catch { if (!dead) setPreviews(buildFallback(files)); }
      finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mapping overrides
  function setMapping(src: string, tgt: string) {
    const k = `${fileIdx}-${sheetIdx}`;
    setOverrides((p) => ({ ...p, [k]: { ...(p[k] || {}), [src]: tgt } }));
  }
  function getMapping(m: ColumnMapping) { return overrides[`${fileIdx}-${sheetIdx}`]?.[m.source] ?? m.target; }

  // Import
  async function doImport() {
    setImporting(true);
    try { await onImport(files); onClose(); }
    catch { showToast("Import failed \u2014 please try again"); }
    finally { setImporting(false); }
  }

  // Derived
  const preview = previews[fileIdx] ?? null;
  const sheet = preview?.sheets?.[sheetIdx] ?? null;
  const allIssues = previews.flatMap((p) => p.sheets.flatMap((s) => s.validationIssues));
  const hasErr = allIssues.some((i) => i.severity === "error");
  const hasWarn = allIssues.some((i) => i.severity === "warning");

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter Tight', sans-serif",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
        width: "100%", maxWidth: 900, maxHeight: "80vh", overflow: "hidden",
        display: "flex", flexDirection: "column", color: "#e2e8f0",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: BORDER, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#fff" }}>Upload Preview</h2>
            {preview && <span style={{ fontSize: 13, color: "#94a3b8", marginTop: 4, display: "block" }}>{preview.fileName} &middot; {fmtSize(preview.fileSize)}</span>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: "transparent", border: "none", color: "#94a3b8", fontSize: 22,
            cursor: "pointer", padding: "4px 8px", borderRadius: 6, lineHeight: 1,
          }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
          {loading ? <LoadingSkeleton /> : error ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <p style={{ color: "#f87171", fontSize: 15, marginBottom: 8 }}>Failed to load preview</p>
              <p style={{ color: "#64748b", fontSize: 13 }}>{error}</p>
            </div>
          ) : (
            <>
              {/* File tabs */}
              {previews.length > 1 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  {previews.map((p, i) => <Tab key={i} active={i === fileIdx} color="#d97706" label={p.fileName} onClick={() => { setFileIdx(i); setSheetIdx(0); }} />)}
                </div>
              )}
              {preview && sheet && (
                <>
                  {/* Sheet tabs */}
                  {preview.sheets.length > 1 && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                      {preview.sheets.map((s, i) => <Tab key={i} active={i === sheetIdx} color="#3b82f6" label={s.name} onClick={() => setSheetIdx(i)} />)}
                    </div>
                  )}

                  {/* Detection */}
                  <DetectionCard sheet={sheet} onTypeChange={(t) => {
                    setPreviews((prev) => {
                      const n = [...prev];
                      const updated = { ...n[fileIdx].sheets[sheetIdx], detectedType: t };
                      n[fileIdx] = { ...n[fileIdx], sheets: n[fileIdx].sheets.map((sh, i) => i === sheetIdx ? updated : sh) };
                      return n;
                    });
                  }} />

                  {/* Preview table */}
                  {sheet.headers.length > 0 && <DataPreview headers={sheet.headers} rows={sheet.rows} />}

                  {/* Column mapping */}
                  {sheet.columnMappings.length > 0 && (
                    <MappingTable mappings={sheet.columnMappings} expected={sheet.expectedColumns} getTarget={getMapping} onChange={setMapping} />
                  )}

                  {/* Validation */}
                  <ValidationCard sheet={sheet} open={issuesOpen} toggle={() => setIssuesOpen((v) => !v)} />
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, padding: "16px 24px", borderTop: BORDER, flexShrink: 0 }}>
            {hasErr && <span style={{ marginRight: "auto", fontSize: 13, color: "#f87171", cursor: "pointer" }}>Fix and re-upload</span>}
            <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            {hasWarn && !hasErr && <Btn label={importing ? "Importing\u2026" : "Import with Warnings"} bg={importing ? "#78350f" : "#d97706"} disabled={importing} onClick={doImport} />}
            {!hasErr && !hasWarn && <Btn label={importing ? "Importing\u2026" : "Confirm & Import"} bg={importing ? "#1e3a5f" : "#3b82f6"} disabled={importing} onClick={doImport} />}
            {hasErr && <Btn label="Confirm & Import" bg="#374151" disabled />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────
function LoadingSkeleton() {
  const bar = { borderRadius: 8, background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)", animation: "upm-pulse 1.5s ease-in-out infinite" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "32px 0" }}>
      <p style={{ color: "#94a3b8", textAlign: "center", fontSize: 15 }}>Analyzing your file...</p>
      {[200, 300, 160].map((w, i) => <div key={i} style={{ ...bar, height: 16, width: w }} />)}
      <div style={{ ...bar, height: 120, borderRadius: 10 }} />
      <style>{`@keyframes upm-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}

// ── Detection card ─────────────────────────────────────────
function DetectionCard({ sheet, onTypeChange }: { sheet: SheetPreview; onTypeChange: (t: string) => void }) {
  const pct = Math.round(sheet.confidence * 100);
  const barClr = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";
  const types = sheet.availableTypes.length > 0 ? sheet.availableTypes : DATA_TYPES;
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "14px 18px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {pct > 0
          ? <span style={{ fontSize: 14 }}>This looks like <strong style={{ color: "#fbbf24" }}>{sheet.detectedType}</strong> data ({pct}% match)</span>
          : <span style={{ fontSize: 14, color: "#94a3b8" }}>Data type not detected</span>}
        {pct > 0 && (
          <div style={{ width: 100, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: barClr, transition: "width 0.3s" }} />
          </div>
        )}
        <select value={sheet.detectedType} onChange={(e) => onTypeChange(e.target.value)} style={{
          marginLeft: "auto", padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
          background: "#0f172a", color: "#e2e8f0", fontSize: 12, cursor: "pointer",
        }}>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {(sheet.rowCount > 0 || sheet.columnCount > 0) && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", display: "flex", gap: 16 }}>
          <span>{sheet.rowCount.toLocaleString()} rows</span>
          <span>{sheet.columnCount} columns</span>
        </div>
      )}
    </div>
  );
}

// ── Data preview table ─────────────────────────────────────
function DataPreview({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontFamily: MONO, fontSize: 11, fontWeight: 600, color: "#94a3b8", background: "rgba(255,255,255,0.04)", borderBottom: BORDER, whiteSpace: "nowrap", position: "sticky", top: 0 };
  return (
    <div style={{ marginBottom: 16, borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", overflow: "auto", maxHeight: 220 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead><tr>{headers.map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 5).map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => (
              <td key={ci} style={{ padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", color: "#cbd5e1", whiteSpace: "nowrap", fontFamily: MONO, fontSize: 11, background: ri % 2 ? "rgba(255,255,255,0.02)" : "transparent" }}>{cell}</td>
            ))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Column mapping table ───────────────────────────────────
function MappingTable({ mappings, expected, getTarget, onChange }: {
  mappings: ColumnMapping[]; expected: string[];
  getTarget: (m: ColumnMapping) => string; onChange: (src: string, tgt: string) => void;
}) {
  const icon = (m: ColumnMapping) => m.status === "mapped" ? { i: "\u2713", c: "#22c55e" } : m.status === "missing" ? { i: "\u2717", c: "#ef4444" } : { i: "\u26A0", c: "#eab308" };
  const hdr: React.CSSProperties = { padding: "8px 16px", textAlign: "left", color: "#64748b", fontSize: 11, fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.05)" };
  return (
    <div style={{ marginBottom: 16, borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.03)", fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>Column Mapping</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr><th style={hdr}>Your Column</th><th style={hdr}>Maps To</th></tr></thead>
        <tbody>
          {mappings.map((m, i) => {
            const s = icon(m); const eff = getTarget(m);
            return (
              <tr key={i}>
                <td style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontFamily: MONO, fontSize: 12, color: m.status === "missing" ? "#64748b" : "#e2e8f0", fontStyle: m.status === "missing" ? "italic" : "normal" }}>
                  {m.source || "[missing]"}
                </td>
                <td style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: s.c, fontSize: 14, lineHeight: 1 }}>{s.i}</span>
                    <select value={eff} onChange={(e) => onChange(m.source, e.target.value)} style={{
                      padding: "3px 6px", borderRadius: 4, border: `1px solid ${s.c}33`,
                      background: "#0f172a", color: "#e2e8f0", fontSize: 12, cursor: "pointer", minWidth: 160,
                    }}>
                      <option value="">Not mapped</option>
                      {expected.map((ec) => <option key={ec} value={ec}>{ec}</option>)}
                    </select>
                    {m.required && m.status === "missing" && <span style={{ fontSize: 11, color: "#f87171" }}>required</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Validation card ────────────────────────────────────────
function ValidationCard({ sheet, open, toggle }: { sheet: SheetPreview; open: boolean; toggle: () => void }) {
  const issues = sheet.validationIssues;
  const errs = issues.filter((i) => i.severity === "error");
  const warns = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");
  const clr = errs.length ? "#ef4444" : warns.length ? "#eab308" : "#22c55e";
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${clr}22`, background: `${clr}08`, overflow: "hidden" }}>
      <div onClick={issues.length ? toggle : undefined} style={{
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
        cursor: issues.length ? "pointer" : "default", userSelect: "none",
      }}>
        <span style={{ fontSize: 14, color: clr }}>{errs.length ? "\u2717" : warns.length ? "\u26A0" : "\u2713"}</span>
        <span style={{ fontSize: 13, color: "#e2e8f0" }}>
          {sheet.rowCount > 0 && <span style={{ color: "#22c55e" }}>{sheet.rowCount.toLocaleString()} rows</span>}
          {warns.length > 0 && <>{sheet.rowCount > 0 && " \u00B7 "}<span style={{ color: "#eab308" }}>{warns.length} warning{warns.length !== 1 ? "s" : ""}</span></>}
          {errs.length > 0 && <>{(sheet.rowCount > 0 || warns.length > 0) && " \u00B7 "}<span style={{ color: "#ef4444" }}>{errs.length} error{errs.length !== 1 ? "s" : ""}</span></>}
          {sheet.rowCount === 0 && !warns.length && !errs.length && <span style={{ color: "#22c55e" }}>Ready to import</span>}
        </span>
        {issues.length > 0 && <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>{open ? "\u25B2" : "\u25BC"}</span>}
      </div>
      {open && issues.length > 0 && (
        <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {[...errs, ...warns, ...infos].map((issue, i) => {
            const s = SEV[issue.severity];
            return (
              <div key={i} style={{ padding: "6px 10px", borderRadius: 6, background: s.bg, borderLeft: `3px solid ${s.border}`, fontSize: 12, color: s.text, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{s.icon}</span><span>{issue.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
