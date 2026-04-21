"use client";
import React, { useState, useCallback, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle, X, Table2, ArrowRight } from "@/lib/icons";
import { apiFetch } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface ImportResult {
  status: string;
  imported: number;
  columns_mapped: Record<string, string>;
  columns_unmapped: string[];
}

interface Props {
  projectId: string;
  onImportComplete?: (result: ImportResult) => void;
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  page: { padding: "24px 28px", maxWidth: 900, margin: "0 auto" } as React.CSSProperties,
  h2: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", margin: "0 0 4px" } as React.CSSProperties,
  subtitle: { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 24 } as React.CSSProperties,
  dropzone: (dragging: boolean) => ({
    border: `2px dashed ${dragging ? "#3B82F6" : "var(--border)"}`,
    borderRadius: 12, padding: "48px 24px", textAlign: "center" as const,
    background: dragging ? "rgba(59,130,246,0.04)" : "var(--surface-1)",
    cursor: "pointer", transition: "all 0.15s",
  }) as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 } as React.CSSProperties,
  mappingRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  chip: (mapped: boolean) => ({
    display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", fontSize: 11,
    background: mapped ? "rgba(34,197,94,0.1)" : "var(--surface-2)",
    border: `1px solid ${mapped ? "#22C55E" : "var(--border)"}`, borderRadius: 12,
    color: mapped ? "#22C55E" : "var(--text-muted)",
  }) as React.CSSProperties,
  previewTable: { width: "100%", borderCollapse: "collapse" as const, fontSize: "var(--text-xs)" } as React.CSSProperties,
  th: { padding: "8px 10px", background: "#1C2B3A", color: "#fff", fontSize: 11, fontWeight: "var(--fw-semi)", textAlign: "left" as const } as React.CSSProperties,
  td: { padding: "6px 10px", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 16px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#3B82F6", color: "#fff", cursor: "pointer" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function BulkImport({ projectId, onImportComplete }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const parsePreview = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const parsed = lines.slice(0, 6).map(l => {
        // Simple CSV parse (handles quoted fields)
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const ch of l) {
          if (ch === '"') { inQuotes = !inQuotes; continue; }
          if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
          current += ch;
        }
        result.push(current.trim());
        return result;
      });
      if (parsed.length > 0) {
        setHeaders(parsed[0]);
        setPreview(parsed.slice(1));
      }
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.type === "text/csv")) parsePreview(f);
    else setError("Please upload a CSV file");
  }, [parsePreview]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parsePreview(f);
  }, [parsePreview]);

  const doImport = useCallback(async () => {
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/api/ja/import?project_id=${projectId}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Import failed");
        return;
      }
      const data = await res.json();
      setResult(data);
      onImportComplete?.(data);
    } catch (e) {
      setError("Import failed — check file format");
    } finally {
      setImporting(false);
    }
  }, [file, projectId, onImportComplete]);

  const EXPECTED = ["Job Title", "Function", "Family", "Sub-Family", "Track", "Level", "Incumbent Count", "Job Code", "Location", "Grade"];

  return (
    <div style={S.page}>
      <h2 style={S.h2}>Import Current-State Roles</h2>
      <div style={S.subtitle}>
        Upload the client's role catalogue as CSV. The importer will auto-detect columns. Expected columns: {EXPECTED.join(", ")}.
      </div>

      {/* Result banner */}
      {result && (
        <div style={{ ...S.section, borderLeft: "3px solid #22C55E", display: "flex", alignItems: "center", gap: 12 }}>
          <CheckCircle size={20} style={{ color: "#22C55E", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>
              {result.imported} roles imported successfully
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
              {Object.keys(result.columns_mapped).length} columns mapped ·
              {result.columns_unmapped.length > 0 && ` ${result.columns_unmapped.length} unmapped: ${result.columns_unmapped.join(", ")}`}
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ ...S.section, borderLeft: "3px solid #EF4444", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertTriangle size={20} style={{ color: "#EF4444", flexShrink: 0 }} />
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}>{error}</div>
          <button style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {/* Dropzone */}
      {!file && (
        <div
          style={S.dropzone(dragging)}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)", fontWeight: "var(--fw-medium)" }}>
            Drop a CSV file here or click to browse
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
            Supports .csv files with flexible column naming
          </div>
          <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileSelect} />
        </div>
      )}

      {/* Preview */}
      {file && headers.length > 0 && (
        <>
          <div style={S.section}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={15} style={{ color: "#3B82F6" }} />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>{file.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
              <button style={{ background: "none", border: "none", fontSize: "var(--text-xs)", color: "#3B82F6", cursor: "pointer" }}
                onClick={() => { setFile(null); setHeaders([]); setPreview([]); }}>
                Choose different file
              </button>
            </div>

            {/* Column detection */}
            <div style={{ fontSize: 11, fontWeight: "var(--fw-semi)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
              Detected columns ({headers.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {headers.map((h, i) => {
                const isExpected = EXPECTED.some(e => h.toLowerCase().includes(e.toLowerCase().split(" ")[0]));
                return <span key={i} style={S.chip(isExpected)}>{isExpected && <CheckCircle size={10} />}{h}</span>;
              })}
            </div>

            {/* Data preview */}
            <div style={{ fontSize: 11, fontWeight: "var(--fw-semi)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
              Preview (first {preview.length} rows)
            </div>
            <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid var(--border)" }}>
              <table style={S.previewTable}>
                <thead>
                  <tr>
                    {headers.map((h, i) => <th key={i} style={S.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => <td key={j} style={S.td}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          {!result && (
            <div style={{ textAlign: "right" }}>
              <button style={S.btn} onClick={doImport} disabled={importing}>
                {importing ? "Importing…" : <><ArrowRight size={13} /> Import {file.name}</>}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
