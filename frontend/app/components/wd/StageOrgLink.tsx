"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Check, AlertTriangle, ExternalLink, Users, Layers3, MapPin,
} from "@/lib/icons";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface OrgLinkData {
  final_title: string;
  manager_role: string;
  direct_reports: string[];
  location: string;
  work_arrangement: string;
}

interface Props {
  orgLinkData: OrgLinkData;
  jobTitle: string;
  trackCode: string;
  levelCode: string;
  function_name: string;
  showSources: boolean;
  onSave: (data: Partial<OrgLinkData>) => void;
  onStageCompletion: (pct: number) => void;
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  grid: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" } as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px", marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  fieldRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", width: 120, flexShrink: 0 } as React.CSSProperties,
  input: { flex: 1, padding: "7px 10px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" } as React.CSSProperties,
  checkRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, marginBottom: 4, fontSize: "var(--text-xs)" } as React.CSSProperties,
  checkOk: { background: "rgba(34,197,94,0.06)", color: "var(--sage)" } as React.CSSProperties,
  checkWarn: { background: "rgba(244,168,58,0.06)", color: "var(--amber)" } as React.CSSProperties,
  orgNode: (highlight: boolean) => ({ padding: "10px 14px", border: `1px solid ${highlight ? "var(--amber)" : "var(--border)"}`, borderRadius: 8, background: highlight ? "rgba(244,168,58,0.05)" : "var(--surface-2)", textAlign: "center" as const, fontSize: "var(--text-xs)", minWidth: 120 }) as React.CSSProperties,
  orgLine: { width: 1, height: 24, background: "var(--border)", margin: "0 auto" } as React.CSSProperties,
  metricRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)" } as React.CSSProperties,
  metricLabel: { color: "var(--text-muted)" } as React.CSSProperties,
  metricValue: { fontWeight: "var(--fw-semi)", fontFamily: "var(--ff-mono)", color: "var(--text-primary)" } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function StageOrgLink({ orgLinkData, jobTitle, trackCode, levelCode, function_name, showSources, onSave, onStageCompletion }: Props) {
  const d = orgLinkData || {};
  const [finalTitle, setFinalTitle] = useState(d.final_title || jobTitle);
  const [managerRole, setManagerRole] = useState(d.manager_role || "");
  const [directReports, setDirectReports] = useState(d.direct_reports?.join(", ") || "");
  const [location, setLocation] = useState(d.location || "");
  const [workArrangement, setWorkArrangement] = useState(d.work_arrangement || "Hybrid");

  // Autosave
  const save = useCallback(() => {
    onSave({
      final_title: finalTitle,
      manager_role: managerRole,
      direct_reports: directReports.split(",").map(s => s.trim()).filter(Boolean),
      location,
      work_arrangement: workArrangement,
    });
  }, [finalTitle, managerRole, directReports, location, workArrangement, onSave]);

  useEffect(() => {
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  }, [finalTitle, managerRole, directReports, location, workArrangement]);

  // Stage completion
  useEffect(() => {
    let filled = 0;
    if (finalTitle.trim()) filled++;
    if (managerRole.trim()) filled++;
    if (location.trim()) filled++;
    onStageCompletion(Math.round((filled / 3) * 100));
  }, [finalTitle, managerRole, location, onStageCompletion]);

  // Alignment checks
  const drList = directReports.split(",").map(s => s.trim()).filter(Boolean);
  const spanOk = drList.length <= 12 && drList.length >= 0;
  const titleMatchesJA = finalTitle.toLowerCase().includes(jobTitle.toLowerCase().split(" ")[0]);
  const trackIsManager = trackCode === "M" || trackCode === "E";
  const hasReportsIfManager = !trackIsManager || drList.length > 0;

  return (
    <div style={S.grid}>
      {/* ── Left: Role identity + org chart ── */}
      <div>
        <div style={S.section}>
          <div style={S.sectionTitle}><Users size={14} /> Role Identity</div>

          <div style={S.fieldRow}>
            <div style={S.label}>Final Title</div>
            <input style={S.input} value={finalTitle} onChange={e => setFinalTitle(e.target.value)} placeholder="Role title as it will appear in the org" />
          </div>
          <div style={S.fieldRow}>
            <div style={S.label}>Track / Level</div>
            <div style={{ ...S.input, background: "transparent", border: "none", color: "var(--text-primary)", fontWeight: "var(--fw-semi)" }}>
              {trackCode || "—"} {levelCode || ""}
              {showSources && <span style={{ marginLeft: 6, padding: "1px 6px", fontSize: 11, background: "rgba(244,168,58,0.06)", border: "1px solid rgba(244,168,58,0.12)", borderRadius: 3, color: "var(--amber)" }}>JA</span>}
            </div>
          </div>
          <div style={S.fieldRow}>
            <div style={S.label}>Reports To</div>
            <input style={S.input} value={managerRole} onChange={e => setManagerRole(e.target.value)} placeholder="Manager role title" />
          </div>
          <div style={S.fieldRow}>
            <div style={S.label}>Direct Reports</div>
            <input style={S.input} value={directReports} onChange={e => setDirectReports(e.target.value)} placeholder="Comma-separated role titles" />
          </div>
          <div style={S.fieldRow}>
            <div style={S.label}><MapPin size={11} style={{ verticalAlign: "middle" }} /> Location</div>
            <input style={S.input} value={location} onChange={e => setLocation(e.target.value)} placeholder="Office / region" />
          </div>
          <div style={S.fieldRow}>
            <div style={S.label}>Work Arrangement</div>
            <select style={{ ...S.input, appearance: "none" }} value={workArrangement} onChange={e => setWorkArrangement(e.target.value)}>
              {["On-site", "Hybrid", "Remote", "Flexible"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Mini org chart */}
        <div style={S.section}>
          <div style={S.sectionTitle}><Layers3 size={14} /> Org Position</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0" }}>
            {/* Manager */}
            {managerRole && (
              <>
                <div style={S.orgNode(false)}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Reports to</div>
                  <div style={{ fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginTop: 2 }}>{managerRole}</div>
                </div>
                <div style={S.orgLine} />
              </>
            )}
            {/* Current role */}
            <div style={S.orgNode(true)}>
              <div style={{ fontSize: 11, color: "var(--amber)" }}>This Role</div>
              <div style={{ fontWeight: "var(--fw-semi)", color: "var(--text-primary)", marginTop: 2 }}>{finalTitle || jobTitle}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{trackCode} {levelCode} · {function_name}</div>
            </div>
            {/* Direct reports */}
            {drList.length > 0 && (
              <>
                <div style={S.orgLine} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {drList.slice(0, 6).map(dr => (
                    <div key={dr} style={S.orgNode(false)}>
                      <div style={{ fontWeight: "var(--fw-medium)", color: "var(--text-secondary)" }}>{dr}</div>
                    </div>
                  ))}
                  {drList.length > 6 && <div style={{ ...S.orgNode(false), color: "var(--text-muted)" }}>+{drList.length - 6} more</div>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Push to Org Design Studio */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={S.btn}><ExternalLink size={11} /> Push to Org Design Studio</button>
        </div>
      </div>

      {/* ── Right: Structural metrics + alignment checks ── */}
      <div>
        <div style={S.section}>
          <div style={S.sectionTitle}>Structural Metrics</div>
          <div style={S.metricRow}>
            <span style={S.metricLabel}>Span of Control</span>
            <span style={S.metricValue}>{drList.length}</span>
          </div>
          <div style={S.metricRow}>
            <span style={S.metricLabel}>Benchmark (this level)</span>
            <span style={S.metricValue}>5–8</span>
          </div>
          <div style={S.metricRow}>
            <span style={S.metricLabel}>Peer Group</span>
            <span style={S.metricValue}>{trackCode} {levelCode} in {function_name}</span>
          </div>
          <div style={S.metricRow}>
            <span style={S.metricLabel}>Work Arrangement</span>
            <span style={S.metricValue}>{workArrangement}</span>
          </div>
        </div>

        <div style={S.section}>
          <div style={S.sectionTitle}>Alignment Checks</div>
          {[
            { ok: titleMatchesJA, text: "Title matches JA leveling convention", detail: titleMatchesJA ? "Consistent" : "Title may not align with JA framework" },
            { ok: spanOk, text: `Span within benchmark range (${drList.length} reports)`, detail: spanOk ? "Within 0–12 range" : "Exceeds recommended maximum" },
            { ok: hasReportsIfManager, text: "Manager track has direct reports", detail: hasReportsIfManager ? "Consistent" : "M/E track role should have reports" },
            { ok: !!managerRole, text: "Reporting line defined", detail: managerRole ? `Reports to ${managerRole}` : "No manager specified" },
          ].map((c, i) => (
            <div key={i} style={{ ...S.checkRow, ...(c.ok ? S.checkOk : S.checkWarn) }}>
              {c.ok ? <Check size={12} /> : <AlertTriangle size={12} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "var(--fw-medium)", color: "var(--text-primary)" }}>{c.text}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
