"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Check, Download, Copy, ExternalLink, FileText,
  Users, Calendar, AlertTriangle, ArrowRight, Sparkles, Clock,
} from "@/lib/icons";
import * as api from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface HandoffData {
  summary_artifact: string;
  published_jd: string;
  change_impact: string;
  wave_notes: string;
  go_live_date: string;
  dependencies: string[];
}

interface DecisionEntry {
  id: string; stage: string; field: string;
  old_value: unknown; new_value: unknown;
  user_id: string; timestamp: string;
}

interface Props {
  handoffData: HandoffData;
  jobTitle: string;
  jobId: string;
  contextData: Record<string, unknown>;
  reconData: Record<string, unknown>;
  orgLinkData: Record<string, unknown>;
  isFinalized: boolean;
  onSave: (data: Partial<HandoffData>) => void;
  onMarkRedesigned: () => void;
  onStageCompletion: (pct: number) => void;
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  artifact: (expanded: boolean) => ({ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 12, overflow: "hidden" }) as React.CSSProperties,
  artifactHeader: { display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", cursor: "pointer", userSelect: "none" as const } as React.CSSProperties,
  artifactIcon: (color: string) => ({ width: 32, height: 32, borderRadius: 8, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }) as React.CSSProperties,
  artifactTitle: { flex: 1, fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" } as React.CSSProperties,
  artifactStatus: (done: boolean) => ({ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: done ? "rgba(34,197,94,0.1)" : "rgba(249,115,22,0.1)", color: done ? "#22C55E" : "#F97316" }) as React.CSSProperties,
  artifactBody: { padding: "0 18px 18px" } as React.CSSProperties,
  textarea: { width: "100%", padding: "10px 12px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", resize: "vertical" as const, outline: "none", fontFamily: "inherit", minHeight: 100, lineHeight: 1.6 } as React.CSSProperties,
  input: { width: "100%", padding: "7px 10px", fontSize: "var(--text-xs)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", outline: "none" } as React.CSSProperties,
  label: { fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4, marginTop: 10 } as React.CSSProperties,
  actions: { display: "flex", gap: 6, marginTop: 8 } as React.CSSProperties,
  btn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 5, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 16px", fontSize: 12, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#3B82F6", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  btnSuccess: { display: "inline-flex", alignItems: "center", gap: 4, padding: "8px 18px", fontSize: 12, fontWeight: "var(--fw-semi)", border: "none", borderRadius: 6, background: "#22C55E", color: "#fff", cursor: "pointer" } as React.CSSProperties,
  decisionRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)" } as React.CSSProperties,
  decisionStage: { padding: "2px 6px", fontSize: 9, fontWeight: 600, borderRadius: 3, background: "var(--surface-2)", color: "var(--text-muted)", minWidth: 80, textAlign: "center" as const } as React.CSSProperties,
  pushRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8 } as React.CSSProperties,
  section: { marginBottom: 20 } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function StageHandoff({
  handoffData, jobTitle, jobId, contextData, reconData, orgLinkData,
  isFinalized, onSave, onMarkRedesigned, onStageCompletion,
}: Props) {
  const d = handoffData || {};
  const [summary, setSummary] = useState(d.summary_artifact || "");
  const [jd, setJd] = useState(d.published_jd || "");
  const [changeImpact, setChangeImpact] = useState(d.change_impact || "");
  const [waveNotes, setWaveNotes] = useState(d.wave_notes || "");
  const [goLiveDate, setGoLiveDate] = useState(d.go_live_date || "");
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [stageFilter, setStageFilter] = useState("");

  // Load decisions
  useEffect(() => {
    api.getWDDecisions(jobId, stageFilter).then(d => setDecisions(Array.isArray(d) ? d : [])).catch(() => {});
  }, [jobId, stageFilter]);

  // Auto-generate artifacts on first open
  useEffect(() => {
    if (summary || jd || changeImpact) return;
    const rc = reconData || {};
    const ctx = contextData || {};
    const org = orgLinkData || {};
    const evolution = String(rc.evolution || "pending");
    const totalCurrent = Number(rc.total_current_hrs || 0);
    const totalFuture = Number(rc.total_future_hrs || 0);
    const released = Math.max(totalCurrent - totalFuture, 0);
    const vm = (rc.value_model || {}) as Record<string, string>;

    // Summary artifact
    const summaryText = [
      `REDESIGN SUMMARY: ${jobTitle}`,
      ``,
      `Business Case: ${String(ctx.business_case || "Not specified").slice(0, 300)}`,
      ``,
      `Key Changes:`,
      `• ${released.toFixed(1)} hours/week freed (${totalCurrent > 0 ? Math.round(released / totalCurrent * 100) : 0}% capacity)`,
      `• Role evolution: ${evolution}`,
      `• Estimated cost savings: ${vm["Cost Saved / Year"] || "TBD"}`,
      `• ROI: ${vm["ROI %"] || "TBD"}% with ${vm["Payback (months)"] || "TBD"} month payback`,
      ``,
      `Final Role: ${String(org.final_title || jobTitle)}`,
      `Reports to: ${String(org.manager_role || "TBD")}`,
      `Location: ${String(org.location || "TBD")} · ${String(org.work_arrangement || "Hybrid")}`,
    ].join("\n");
    setSummary(summaryText);

    // Published JD
    const jdText = [
      `JOB DESCRIPTION: ${String(org.final_title || jobTitle)}`,
      ``,
      `PURPOSE`,
      `This role delivers ${String(ctx.business_case_type || "analytical and operational")} value within ${String(org.manager_role ? `the team reporting to ${org.manager_role}` : "the organization")}.`,
      ``,
      `KEY RESPONSIBILITIES`,
      `• [Derived from retained and augmented tasks in the reconstruction]`,
      `• [To be customized by the consultant]`,
      ``,
      `REQUIRED SKILLS`,
      `• [Derived from the future skills inventory]`,
      ``,
      `QUALIFICATIONS`,
      `• [To be added]`,
      ``,
      `REPORTING LINE`,
      `Reports to: ${String(org.manager_role || "TBD")}`,
    ].join("\n");
    setJd(jdText);

    // Change impact
    const changeText = [
      `CHANGE IMPACT BRIEF: ${jobTitle}`,
      ``,
      `For the Incumbent:`,
      `• Role evolves to "${evolution}" — ${released > 5 ? "significant" : "moderate"} changes expected`,
      `• New skills to develop: [from future skills inventory]`,
      `• Tasks going away: [automated/eliminated tasks]`,
      `• New tools: [from technology assignments]`,
      ``,
      `For the Manager:`,
      `• ${released.toFixed(1)}h/week capacity freed on this role`,
      `• Conversation guide: frame as role upgrade, not reduction`,
      `• Timeline: align with go-live date`,
      ``,
      `For the Team:`,
      `• Workflow changes where automated tasks are removed`,
      `• Collaboration patterns shift for augmented tasks`,
    ].join("\n");
    setChangeImpact(changeText);
  }, []);

  // Autosave
  useEffect(() => {
    const t = setTimeout(() => {
      onSave({ summary_artifact: summary, published_jd: jd, change_impact: changeImpact, wave_notes: waveNotes, go_live_date: goLiveDate });
    }, 800);
    return () => clearTimeout(t);
  }, [summary, jd, changeImpact, waveNotes, goLiveDate]);

  // Stage completion
  useEffect(() => {
    let filled = 0;
    if (summary.trim()) filled++;
    if (jd.trim()) filled++;
    if (changeImpact.trim()) filled++;
    if (waveNotes.trim() || goLiveDate.trim()) filled++;
    onStageCompletion(Math.round((filled / 4) * 100));
  }, [summary, jd, changeImpact, waveNotes, goLiveDate, onStageCompletion]);

  const toggle = (idx: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    return next;
  });

  const artifacts = [
    { title: "Redesign Summary", icon: <FileText size={16} style={{ color: "#3B82F6" }} />, color: "#3B82F6", value: summary, setter: setSummary, done: !!summary.trim() },
    { title: "Published Job Description", icon: <FileText size={16} style={{ color: "#8B5CF6" }} />, color: "#8B5CF6", value: jd, setter: setJd, done: !!jd.trim() },
    { title: "Change Impact Brief", icon: <Users size={16} style={{ color: "#F97316" }} />, color: "#F97316", value: changeImpact, setter: setChangeImpact, done: !!changeImpact.trim() },
  ];

  return (
    <div>
      {/* ── Artifacts ── */}
      {artifacts.map((art, i) => (
        <div key={i} style={S.artifact(expanded.has(i))}>
          <div style={S.artifactHeader} onClick={() => toggle(i)}>
            <div style={S.artifactIcon(art.color)}>{art.icon}</div>
            <div style={S.artifactTitle}>{art.title}</div>
            <span style={S.artifactStatus(art.done)}>{art.done ? "Generated" : "Pending"}</span>
            <ArrowRight size={13} style={{ color: "var(--text-muted)", transform: expanded.has(i) ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
          </div>
          {expanded.has(i) && (
            <div style={S.artifactBody}>
              <textarea style={S.textarea} value={art.value} onChange={e => art.setter(e.target.value)} rows={8} />
              <div style={S.actions}>
                <button style={S.btn} onClick={() => navigator.clipboard?.writeText(art.value)}><Copy size={11} /> Copy</button>
                <button style={S.btn}><Download size={11} /> Export</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* ── Wave & sequencing ── */}
      <div style={{ ...S.artifact(true), padding: 0 }}>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Calendar size={14} style={{ color: "#14B8A6" }} /> Wave & Sequencing
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={S.label}>Go-Live Date</div>
              <input type="date" style={S.input} value={goLiveDate} onChange={e => setGoLiveDate(e.target.value)} />
            </div>
            <div>
              <div style={S.label}>Dependencies</div>
              <input style={S.input} value={(d.dependencies || []).join(", ")} placeholder="Other redesigns this depends on" readOnly />
            </div>
          </div>
          <div style={S.label}>Wave Notes</div>
          <textarea style={{ ...S.textarea, minHeight: 60 }} value={waveNotes} onChange={e => setWaveNotes(e.target.value)}
            placeholder="Implementation notes, communication plan outline, sequencing considerations…" />
        </div>
      </div>

      {/* ── Decision log ── */}
      <div style={{ ...S.artifact(true), padding: 0 }}>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={14} style={{ color: "var(--text-muted)" }} /> Decision Log ({decisions.length} entries)
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <select style={{ padding: "3px 8px", fontSize: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-muted)", outline: "none" }}
                value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
                <option value="">All Stages</option>
                {["context", "deconstruction", "reconstruction", "redeployment", "impact", "org_link", "handoff"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button style={S.btn} onClick={() => {
                const csv = ["Stage,Field,Old Value,New Value,Timestamp", ...decisions.map(d => `${d.stage},${d.field},"${JSON.stringify(d.old_value)}","${JSON.stringify(d.new_value)}",${d.timestamp}`)].join("\n");
                navigator.clipboard?.writeText(csv);
              }}><Copy size={11} /> Export CSV</button>
            </div>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {decisions.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, fontSize: 11, color: "var(--text-muted)" }}>No decisions logged yet. Changes are recorded automatically as you work.</div>
            ) : decisions.slice(0, 50).map(d => (
              <div key={d.id} style={S.decisionRow}>
                <span style={S.decisionStage}>{d.stage}</span>
                <span style={{ flex: 1, color: "var(--text-primary)" }}>{d.field}</span>
                <span style={{ color: "var(--text-muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{JSON.stringify(d.old_value)?.slice(0, 30)}</span>
                <ArrowRight size={10} style={{ color: "var(--text-muted)" }} />
                <span style={{ color: "var(--text-primary)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{JSON.stringify(d.new_value)?.slice(0, 30)}</span>
                <span style={{ fontSize: 9, color: "var(--text-muted)", minWidth: 60 }}>{new Date(d.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Push actions ── */}
      <div style={S.section}>
        <div style={S.pushRow}>
          <FileText size={16} style={{ color: "var(--text-muted)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>Push JD to HRIS</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Configure HRIS integration to enable direct push</div>
          </div>
          <button style={S.btn} disabled><ExternalLink size={11} /> Configure</button>
        </div>
        <div style={S.pushRow}>
          <Sparkles size={16} style={{ color: "var(--text-muted)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>Push to Org Design Studio</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Create a proposed role in the org chart</div>
          </div>
          <button style={S.btn}><ExternalLink size={11} /> Push</button>
        </div>
      </div>

      {/* ── Mark redesigned ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button style={{ ...S.btnSuccess, opacity: isFinalized ? 0.7 : 1 }} onClick={onMarkRedesigned} disabled={isFinalized}>
          {isFinalized ? <><Check size={13} /> Marked as Redesigned</> : <><Check size={13} /> Mark Job as Redesigned</>}
        </button>
      </div>
    </div>
  );
}
