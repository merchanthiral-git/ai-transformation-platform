"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  X, ChevronLeft, ChevronRight, Check, Edit3, XCircle, Upload,
  FileText, Users, Search, ArrowLeft, AlertTriangle, Star,
  MessageSquare, Sparkles, Download, MapPin, Briefcase, Clock,
} from "@/lib/icons";
import { apiFetch } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface RoleData {
  id: string; title: string; function_group: string; family: string;
  sub_family: string; track_code: string; level_code: string;
  people_manager: boolean; incumbent_count: number;
  justification?: string; working_notes?: string; is_anchor?: boolean;
  lifecycle_state?: string;
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

interface Employee {
  id: string; name: string; title: string; function: string;
  family: string; sub_family: string; track: string; level: string;
  location: string; manager: string; department: string;
  tenure: number; employment_type: string;
  working_title_mismatch?: boolean;
}

interface JDData {
  id: string; filename: string; content_text: string;
  content_structured: Record<string, unknown>;
  uploaded_at: string; uploaded_by: string;
}

interface Props {
  row: GridRow | null;
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onAccept?: (groupId: string) => void;
  onReject?: (groupId: string) => void;
  model: string;
  projectId: string;
  allRows?: GridRow[];
  currentIndex?: number;
  levelCriteria?: Record<string, string>;
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 399, animation: "fadeIn var(--duration-base) var(--ease-out)" } as React.CSSProperties,
  drawer: { position: "fixed" as const, top: 0, right: 0, height: "100%", width: "min(600px, 94vw)", background: "var(--surface-1)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-4)", zIndex: 400, display: "flex", flexDirection: "column" as const, animation: "slideInRight var(--duration-slow) var(--ease-out)" } as React.CSSProperties,
  header: { background: "#1C2B3A", padding: "16px 20px", flexShrink: 0 } as React.CSSProperties,
  headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between" } as React.CSSProperties,
  roleName: { fontSize: "var(--text-base)", fontWeight: "var(--fw-semi)", color: "#fff" } as React.CSSProperties,
  headerMeta: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  navRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 } as React.CSSProperties,
  navBtn: { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 10px", fontSize: 11, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "rgba(255,255,255,0.7)", cursor: "pointer" } as React.CSSProperties,
  closeBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, color: "rgba(255,255,255,0.7)", cursor: "pointer" } as React.CSSProperties,
  tabs: { display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 } as React.CSSProperties,
  tab: (active: boolean) => ({ flex: 1, padding: "10px 12px", fontSize: "var(--text-xs)", fontWeight: active ? "var(--fw-semi)" : "var(--fw-medium)", color: active ? "#3B82F6" : "var(--text-muted)", borderBottom: active ? "2px solid #3B82F6" : "2px solid transparent", background: "none", border: "none", cursor: "pointer", textAlign: "center" as const }) as React.CSSProperties,
  body: { flex: 1, overflowY: "auto" as const, padding: "18px 20px" } as React.CSSProperties,
  dimRow: { display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  dimLabel: { fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", width: 90, flexShrink: 0, marginTop: 3 } as React.CSSProperties,
  dimCurrent: { flex: 1, fontSize: "var(--text-xs)", color: "var(--text-secondary)", padding: "4px 0" } as React.CSSProperties,
  dimFuture: (changed: boolean) => ({ flex: 1, fontSize: "var(--text-xs)", color: changed ? "#F97316" : "var(--text-secondary)", fontWeight: changed ? "var(--fw-semi)" : "normal", padding: "4px 0" }) as React.CSSProperties,
  statusDot: (changed: boolean) => ({ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: changed ? "#F97316" : "#22C55E", marginRight: 6, flexShrink: 0, marginTop: 6 }) as React.CSSProperties,
  wasLabel: { fontSize: 10, color: "var(--text-muted)", marginTop: 2 } as React.CSSProperties,
  aiBar: { background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 8, padding: "12px 14px", marginTop: 16 } as React.CSSProperties,
  actionRow: { display: "flex", alignItems: "center", gap: 8, padding: "14px 0", marginTop: 12, borderTop: "1px solid var(--border)" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 16px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#3B82F6", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 16px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnDanger: { display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 16px", fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, background: "rgba(239,68,68,0.05)", color: "#EF4444", cursor: "pointer" } as React.CSSProperties,
  textarea: { width: "100%", padding: "8px 10px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", resize: "vertical" as const, outline: "none", fontFamily: "inherit", minHeight: 60 } as React.CSSProperties,
  fieldLabel: { fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4, marginTop: 14 } as React.CSSProperties,
  empRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer" } as React.CSSProperties,
  avatar: { width: 32, height: 32, borderRadius: "50%", background: "#1C2B3A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 } as React.CSSProperties,
  empDetail: { padding: "18px 20px" } as React.CSSProperties,
  empSection: { marginBottom: 16 } as React.CSSProperties,
  empSectionTitle: { fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 10 } as React.CSSProperties,
  empField: { display: "flex", padding: "6px 0", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  empFieldLabel: { width: 140, fontSize: "var(--text-xs)", color: "var(--text-muted)", flexShrink: 0 } as React.CSSProperties,
  empFieldValue: { fontSize: "var(--text-xs)", color: "var(--text-primary)" } as React.CSSProperties,
  anchorBadge: { display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", fontSize: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 4, color: "#3B82F6", fontWeight: 600 } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function RoleDetailDrawer({ row, isOpen, onClose, onPrev, onNext, onAccept, onReject, model, projectId, allRows, currentIndex, levelCriteria }: Props) {
  const [activeTab, setActiveTab] = useState<"mapping" | "jd" | "employees">("mapping");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empTotal, setEmpTotal] = useState(0);
  const [empPage, setEmpPage] = useState(0);
  const [empSearch, setEmpSearch] = useState("");
  const [jd, setJd] = useState<JDData | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);

  // Esc handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) { document.addEventListener("keydown", handler); document.body.style.overflow = "hidden"; }
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [isOpen, onClose]);

  // Load employees
  useEffect(() => {
    if (!row || activeTab !== "employees") return;
    (async () => {
      setLoading(true);
      try {
        const roleId = row.current.id;
        const res = await apiFetch(`/api/ja/roles/${roleId}/employees?project_id=${projectId}&model_id=${model}&page=${empPage}&search=${empSearch}`);
        const data = await res.json();
        setEmployees(data.employees || []);
        setEmpTotal(data.total || 0);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, [row, activeTab, empPage, empSearch, projectId, model]);

  // Load JD
  useEffect(() => {
    if (!row || activeTab !== "jd") return;
    (async () => {
      try {
        const roleId = row.future?.id || row.current.id;
        const res = await apiFetch(`/api/ja/roles/${roleId}/jd`);
        const data = await res.json();
        setJd(data.jd || null);
      } catch { /* empty */ }
    })();
  }, [row, activeTab]);

  // Reset on row change
  useEffect(() => {
    setSelectedEmployee(null);
    setEmpPage(0);
    setEmpSearch("");
  }, [row]);

  if (!isOpen || !row) return null;

  const c = row.current;
  const f = row.future;
  const dims = [
    { key: "function_group", label: "Function" },
    { key: "family", label: "Family" },
    { key: "sub_family", label: "Sub-Family" },
    { key: "track_code", label: "Track" },
    { key: "level_code", label: "Level" },
  ] as const;

  const archPath = [c.function_group, c.family, c.sub_family].filter(Boolean).join(" › ");
  const initials = (name: string) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <div style={S.overlay} onClick={onClose} />
      <div role="dialog" aria-modal="true" style={S.drawer}>
        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerTop}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={S.roleName}>{c.title}</span>
                {f?.is_anchor && <span style={S.anchorBadge}><Star size={10} /> Anchor</span>}
              </div>
              <div style={S.headerMeta}>
                <span>{c.incumbent_count} incumbent{c.incumbent_count !== 1 ? "s" : ""}</span>
                {archPath && <><span>·</span><span>{archPath} · {c.track_code}{c.level_code}</span></>}
              </div>
            </div>
            <button style={S.closeBtn} onClick={onClose}><X size={14} /></button>
          </div>
          <div style={S.navRow}>
            <button style={S.navBtn} onClick={onPrev} disabled={!onPrev}><ChevronLeft size={12} /> Prev</button>
            <button style={S.navBtn} onClick={onNext} disabled={!onNext}>Next <ChevronRight size={12} /></button>
            {currentIndex !== undefined && allRows && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>
                {currentIndex + 1} of {allRows.length}
              </span>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={S.tabs}>
          <button style={S.tab(activeTab === "mapping")} onClick={() => { setActiveTab("mapping"); setSelectedEmployee(null); }}>Mapping</button>
          <button style={S.tab(activeTab === "jd")} onClick={() => { setActiveTab("jd"); setSelectedEmployee(null); }}>Job Description</button>
          <button style={S.tab(activeTab === "employees")} onClick={() => { setActiveTab("employees"); setSelectedEmployee(null); }}>
            Employees ({c.incumbent_count})
          </button>
        </div>

        {/* ── Body ── */}
        <div style={S.body}>

          {/* ──── Employee Detail View (nested) ──── */}
          {selectedEmployee && (
            <div style={S.empDetail}>
              <button style={{ ...S.btnSecondary, marginBottom: 16 }} onClick={() => setSelectedEmployee(null)}>
                <ArrowLeft size={12} /> Back to Employees
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ ...S.avatar, width: 44, height: 44, fontSize: 14 }}>{initials(selectedEmployee.name)}</div>
                <div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>{selectedEmployee.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{selectedEmployee.id}</div>
                </div>
              </div>

              <div style={S.empSection}>
                <div style={S.empSectionTitle}>Current Job Architecture</div>
                {[
                  ["Working Title", selectedEmployee.title],
                  ["Mapped Role", c.title],
                  ["Function", selectedEmployee.function],
                  ["Family · Sub-Family", `${selectedEmployee.family} · ${selectedEmployee.sub_family}`],
                  ["Track · Level", `${selectedEmployee.track} · ${selectedEmployee.level}`],
                  ["People Manager", c.people_manager ? "Yes" : "No"],
                ].map(([label, value]) => (
                  <div key={label as string} style={S.empField}>
                    <div style={S.empFieldLabel}>{label}</div>
                    <div style={S.empFieldValue}>
                      {value}
                      {label === "Working Title" && selectedEmployee.title !== c.title && (
                        <span style={{ marginLeft: 8, fontSize: 10, color: "#F97316", fontWeight: "var(--fw-medium)" }}>
                          <AlertTriangle size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />
                          Title mismatch
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={S.empSection}>
                <div style={S.empSectionTitle}>Reporting & Structure</div>
                {[
                  ["Manager", selectedEmployee.manager],
                  ["Location", selectedEmployee.location],
                  ["Department", selectedEmployee.department],
                  ["Tenure in Role", `${selectedEmployee.tenure} years`],
                  ["Employment Type", selectedEmployee.employment_type],
                ].map(([label, value]) => (
                  <div key={label as string} style={S.empField}>
                    <div style={S.empFieldLabel}>{label}</div>
                    <div style={S.empFieldValue}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──── Tab 1: Mapping ──── */}
          {activeTab === "mapping" && !selectedEmployee && (
            <>
              {/* Column headers */}
              <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
                <div style={{ width: 90 }} />
                <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current State</div>
                <div style={{ width: 20 }} />
                <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Target State</div>
              </div>

              {/* Dimension rows */}
              {dims.map(({ key, label }) => {
                // Skip function_group if not used
                if (key === "function_group" && !c.function_group && !f?.function_group) return null;
                const curVal = c[key] || "—";
                const futVal = f ? (f[key] || "—") : "—";
                const changed = row.changes.includes(key);
                return (
                  <div key={key} style={S.dimRow}>
                    <div style={S.dimLabel}>{label}</div>
                    <div style={S.dimCurrent}>{curVal}</div>
                    <div style={S.statusDot(changed)} />
                    <div style={S.dimFuture(changed)}>
                      {futVal}
                      {changed && <div style={S.wasLabel}>Was: {curVal}</div>}
                      {key === "track_code" && row.track_change && (
                        <div style={{ marginTop: 3 }}>
                          <span style={{ padding: "2px 6px", fontSize: 9, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 3, color: "#F97316", fontWeight: 600 }}>Track change</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Level criteria reference */}
              {f?.level_code && levelCriteria && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    {f.track_code}{f.level_code} Criteria Reference
                  </div>
                  {Object.entries(levelCriteria).filter(([k]) => k.startsWith(`${f.track_code}|${f.level_code}|`)).map(([k, v]) => (
                    <div key={k} style={{ marginTop: 4 }}>{v}</div>
                  ))}
                </div>
              )}

              {/* Change summary */}
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
                {row.change_count} of 5 dimensions changed
              </div>

              {/* AI rationale */}
              {row.ai_rationale && (row.ai_rationale as any).summary && (
                <div style={S.aiBar}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Sparkles size={13} style={{ color: "#3B82F6" }} />
                    <span style={{ fontSize: 11, fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>AI Rationale</span>
                    {row.confidence_score > 0 && (
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
                        Confidence: {Math.round(row.confidence_score * 100)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {(row.ai_rationale as any).summary}
                  </div>
                  {(row.ai_rationale as any).signals && (
                    <div style={{ marginTop: 8 }}>
                      {((row.ai_rationale as any).signals as any[]).map((sig, i) => (
                        <div key={i} style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                          • {sig.detail} <span style={{ color: "var(--text-muted)", fontSize: 10 }}>({Math.round((sig.weight || 0) * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Role justification */}
              <div style={S.fieldLabel}>Role Justification</div>
              <textarea style={S.textarea} value={f?.justification || ""} placeholder="Why does this role exist / why was it created or changed?" readOnly />

              {/* Working notes */}
              <div style={S.fieldLabel}>
                <MessageSquare size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Working Notes (Consultant Only)
              </div>
              <textarea style={S.textarea} value={f?.working_notes || ""} placeholder="Internal notes — not shared with client" readOnly />

              {/* Action row */}
              <div style={S.actionRow}>
                <button style={S.btnPrimary} onClick={() => row.mapping_group_id && onAccept?.(row.mapping_group_id)}>
                  <Check size={13} /> Accept Mapping
                </button>
                <button style={S.btnSecondary}><Edit3 size={13} /> Edit</button>
                <button style={S.btnDanger} onClick={() => row.mapping_group_id && onReject?.(row.mapping_group_id)}>
                  <XCircle size={13} /> Reject
                </button>
              </div>
            </>
          )}

          {/* ──── Tab 2: Job Description ──── */}
          {activeTab === "jd" && !selectedEmployee && (
            <>
              {jd ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={15} style={{ color: "#3B82F6" }} />
                      <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)" }}>{jd.filename}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Uploaded {new Date(jd.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={S.btnSecondary}><Download size={12} /> Download</button>
                      <button style={S.btnSecondary}><Upload size={12} /> Replace</button>
                    </div>
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {jd.content_text}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 24px" }}>
                  <FileText size={36} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)", marginBottom: 4 }}>No Job Description</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 16 }}>Upload a JD to reference during mapping</div>
                  <button style={S.btnPrimary}><Upload size={13} /> Upload a JD</button>
                </div>
              )}
            </>
          )}

          {/* ──── Tab 3: Employees ──── */}
          {activeTab === "employees" && !selectedEmployee && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, flex: 1 }}>
                  <Search size={13} style={{ color: "var(--text-muted)" }} />
                  <input style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "var(--text-xs)", outline: "none" }}
                    value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Search by name or ID…" />
                </div>
              </div>

              {employees.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                  {loading ? "Loading…" : "No incumbents found for this role"}
                </div>
              ) : (
                <>
                  {employees.map(emp => (
                    <div key={emp.id} style={S.empRow} onClick={() => setSelectedEmployee(emp)}>
                      <div style={S.avatar}>{initials(emp.name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-medium)", color: "var(--text-primary)" }}>{emp.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{emp.id} · {emp.manager && `Reports to ${emp.manager}`}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "var(--text-muted)" }}>
                        {emp.location && <span><MapPin size={10} style={{ verticalAlign: "middle" }} /> {emp.location}</span>}
                        <span><Clock size={10} style={{ verticalAlign: "middle" }} /> {emp.tenure}y</span>
                      </div>
                      <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
                    </div>
                  ))}
                  {empTotal > 25 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "12px 0" }}>
                      <button style={S.btnSecondary} onClick={() => setEmpPage(p => Math.max(0, p - 1))} disabled={empPage === 0}><ChevronLeft size={12} /> Prev</button>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "6px 12px" }}>Page {empPage + 1} of {Math.ceil(empTotal / 25)}</span>
                      <button style={S.btnSecondary} onClick={() => setEmpPage(p => p + 1)} disabled={(empPage + 1) * 25 >= empTotal}>Next <ChevronRight size={12} /></button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
