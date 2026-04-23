"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  X, Check, AlertTriangle, ArrowRight, RefreshCw,
} from "@/lib/icons";
import * as api from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface Conflict {
  id: string;
  field_path: string;
  ja_value: unknown;
  wd_value: unknown;
  resolution: string;
  ja_changed_at: string | null;
}

interface Props {
  jobId: string;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
}

/* ═══════════════════════════════════════════════════════════════
   FIELD LABELS
   ═══════════════════════════════════════════════════════════════ */

const FIELD_LABELS: Record<string, string> = {
  family: "Job Family",
  sub_family: "Sub-Family",
  track_code: "Career Track",
  level_code: "Career Level",
  function: "Function",
  function_group: "Function Group",
  title: "Title",
};

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn var(--duration-base) var(--ease-out)" } as React.CSSProperties,
  modal: { width: "min(680px, 94vw)", maxHeight: "80vh", background: "var(--surface-1)", borderRadius: 12, boxShadow: "var(--shadow-4)", display: "flex", flexDirection: "column" as const, overflow: "hidden", animation: "slideUp var(--duration-slow) var(--ease-out)" } as React.CSSProperties,
  header: { display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--paper-solid)", flexShrink: 0 } as React.CSSProperties,
  headerTitle: { flex: 1, fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--ink)" } as React.CSSProperties,
  headerSub: { fontSize: 11, color: "var(--ink-faint)" } as React.CSSProperties,
  closeBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "var(--border)", border: "none", borderRadius: 6, color: "var(--ink-soft)", cursor: "pointer" } as React.CSSProperties,
  body: { flex: 1, overflowY: "auto" as const, padding: "16px 20px" } as React.CSSProperties,
  bulkBar: { display: "flex", gap: 6, marginBottom: 14 } as React.CSSProperties,
  bulkBtn: { padding: "5px 12px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 5, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  conflictRow: { border: "1px solid var(--border)", borderRadius: 8, marginBottom: 10, overflow: "hidden" } as React.CSSProperties,
  conflictHeader: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  fieldName: { fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", flex: 1 } as React.CSSProperties,
  resolvedBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(34,197,94,0.1)", color: "var(--sage)" } as React.CSSProperties,
  columns: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 } as React.CSSProperties,
  col: (active: boolean) => ({ padding: "12px 14px", background: active ? "rgba(244,168,58,0.04)" : "transparent", borderRight: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" }) as React.CSSProperties,
  colLast: (active: boolean) => ({ padding: "12px 14px", background: active ? "rgba(244,168,58,0.04)" : "transparent", cursor: "pointer", transition: "background 0.1s" }) as React.CSSProperties,
  colLabel: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 } as React.CSSProperties,
  colValue: { fontSize: "var(--text-xs)", color: "var(--text-primary)", fontWeight: "var(--fw-medium)", wordBreak: "break-word" as const } as React.CSSProperties,
  colAction: (selected: boolean) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", fontSize: 11, fontWeight: selected ? "var(--fw-semi)" : "var(--fw-medium)", border: `1px solid ${selected ? "var(--amber)" : "var(--border)"}`, borderRadius: 4, background: selected ? "rgba(244,168,58,0.08)" : "transparent", color: selected ? "var(--amber)" : "var(--text-muted)", cursor: "pointer", marginTop: 6 }) as React.CSSProperties,
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 } as React.CSSProperties,
  footerInfo: { fontSize: 11, color: "var(--text-muted)" } as React.CSSProperties,
  commitBtn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 18px", fontSize: 12, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "var(--amber)", color: "#fff", cursor: "pointer" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function ConflictResolutionModal({ jobId, jobTitle, isOpen, onClose, onResolved }: Props) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);

  // Load conflicts
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.getWDConflicts(jobId).then(data => {
      const list = Array.isArray(data) ? data : [];
      setConflicts(list.filter((c: Conflict) => c.resolution === "unresolved"));
      // Pre-populate resolutions
      const res: Record<string, string> = {};
      list.forEach((c: Conflict) => { if (c.resolution === "unresolved") res[c.id] = ""; });
      setResolutions(res);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isOpen, jobId]);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const setResolution = (conflictId: string, resolution: string) => {
    setResolutions(prev => ({ ...prev, [conflictId]: resolution }));
  };

  const bulkAcceptJA = () => {
    const next: Record<string, string> = {};
    conflicts.forEach(c => { next[c.id] = "accepted_ja"; });
    setResolutions(next);
  };

  const bulkKeepWD = () => {
    const next: Record<string, string> = {};
    conflicts.forEach(c => { next[c.id] = "kept_wd"; });
    setResolutions(next);
  };

  const allResolved = conflicts.length > 0 && conflicts.every(c => resolutions[c.id] && resolutions[c.id] !== "");
  const resolvedCount = conflicts.filter(c => resolutions[c.id] && resolutions[c.id] !== "").length;

  const commit = async () => {
    setCommitting(true);
    try {
      for (const conflict of conflicts) {
        const res = resolutions[conflict.id];
        if (res) {
          await api.resolveWDConflict(jobId, conflict.id, res);
        }
      }
      onResolved();
      onClose();
    } catch { /* empty */ }
    setCommitting(false);
  };

  if (!isOpen) return null;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <AlertTriangle size={16} style={{ color: "var(--amber)" }} />
          <div style={{ flex: 1 }}>
            <div style={S.headerTitle}>Resolve Sync Conflicts — {jobTitle}</div>
            <div style={S.headerSub}>{conflicts.length} field{conflicts.length !== 1 ? "s" : ""} changed in JA since last sync</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}><X size={14} /></button>
        </div>

        {/* Body */}
        <div style={S.body}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 11 }}>Loading conflicts…</div>
          ) : conflicts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
              <Check size={24} style={{ color: "var(--sage)", marginBottom: 8 }} />
              <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)" }}>No unresolved conflicts</div>
            </div>
          ) : (
            <>
              {/* Bulk actions */}
              <div style={S.bulkBar}>
                <button style={S.bulkBtn} onClick={bulkAcceptJA}>Accept all from JA</button>
                <button style={S.bulkBtn} onClick={bulkKeepWD}>Keep all WD values</button>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{resolvedCount}/{conflicts.length} resolved</span>
              </div>

              {/* Conflict rows */}
              {conflicts.map(conflict => {
                const res = resolutions[conflict.id] || "";
                const label = FIELD_LABELS[conflict.field_path] || conflict.field_path;
                return (
                  <div key={conflict.id} style={S.conflictRow}>
                    <div style={S.conflictHeader}>
                      <span style={S.fieldName}>{label}</span>
                      {res && <span style={S.resolvedBadge}><Check size={10} /> {res === "accepted_ja" ? "Accept JA" : "Keep WD"}</span>}
                    </div>
                    <div style={S.columns}>
                      {/* JA new value */}
                      <div style={S.col(res === "accepted_ja")} onClick={() => setResolution(conflict.id, "accepted_ja")}>
                        <div style={S.colLabel}>JA (New)</div>
                        <div style={S.colValue}>{String(conflict.ja_value ?? "—")}</div>
                        <button style={S.colAction(res === "accepted_ja")}>
                          {res === "accepted_ja" ? <><Check size={10} /> Selected</> : "Accept JA"}
                        </button>
                      </div>
                      {/* Current WD value */}
                      <div style={S.colLast(res === "kept_wd")} onClick={() => setResolution(conflict.id, "kept_wd")}>
                        <div style={S.colLabel}>WD (Current)</div>
                        <div style={S.colValue}>{String(conflict.wd_value ?? "—")}</div>
                        <button style={S.colAction(res === "kept_wd")}>
                          {res === "kept_wd" ? <><Check size={10} /> Selected</> : "Keep WD"}
                        </button>
                      </div>
                      {/* Preview */}
                      <div style={{ padding: "12px 14px", background: "rgba(34,197,94,0.03)" }}>
                        <div style={S.colLabel}>Result</div>
                        <div style={{ ...S.colValue, color: res ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {res === "accepted_ja" ? String(conflict.ja_value ?? "—") :
                           res === "kept_wd" ? String(conflict.wd_value ?? "—") :
                           "Choose a resolution →"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <div style={S.footerInfo}>
            {allResolved ? "All conflicts resolved. Ready to commit." : `${conflicts.length - resolvedCount} conflict${conflicts.length - resolvedCount !== 1 ? "s" : ""} remaining`}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={S.bulkBtn} onClick={onClose}>Cancel</button>
            <button style={{ ...S.commitBtn, opacity: allResolved && !committing ? 1 : 0.5 }}
              onClick={commit} disabled={!allResolved || committing}>
              {committing ? <><RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> Committing…</> : <><Check size={12} /> Commit Resolution</>}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
