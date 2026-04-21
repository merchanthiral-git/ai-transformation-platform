"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, X, RefreshCw, Eye, EyeOff,
  AlertTriangle, Check, GitBranch, Clock, ExternalLink,
  MoreHorizontal, ArrowLeft, Sparkles, Layers3,
} from "@/lib/icons";
import * as api from "../../../lib/api";
import StageContext from "./StageContext";
import StageDeconstruction from "./StageDeconstruction";
import StageReconstruction from "./StageReconstruction";
import StageRedeployment from "./StageRedeployment";
import StageImpact from "./StageImpact";
import StageOrgLink from "./StageOrgLink";
import StageHandoff from "./StageHandoff";
import ConflictResolutionModal from "./ConflictResolutionModal";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface WDJobFull {
  id: string; title: string; function: string; family: string;
  sub_family: string; track_code: string; level_code: string;
  ja_source_job_id: string | null; sync_state: string;
  ja_source_version: number | null; wave: string; wd_status: string;
  current_stage: string | null; stage_completion: Record<string, number>;
  context_data: Record<string, unknown>; decon_rows: unknown[];
  redeploy_rows: unknown[]; recon_data: Record<string, unknown>;
  scenario: string; handoff_data: Record<string, unknown>;
  org_link_data: Record<string, unknown>;
  inherited_fields: string[]; last_synced_at: string | null;
  assigned_to: string; decon_submitted: boolean;
  redeploy_submitted: boolean; finalized: boolean;
  hours_freed: number; cost_delta: number; skill_shift_index: number;
  updated_at: string | null; created_at: string | null;
}

interface Props {
  jobId: string;
  jobTitle: string;
  projectId: string;
  model: string;
  onBackToQueue: () => void;
}

/* ═══════════════════════════════════════════════════════════════
   STAGES
   ═══════════════════════════════════════════════════════════════ */

const STAGES = [
  { key: "context", label: "Context", num: 1 },
  { key: "deconstruction", label: "Deconstruction", num: 2 },
  { key: "reconstruction", label: "Reconstruction", num: 3 },
  { key: "redeployment", label: "Redeployment", num: 4 },
  { key: "impact", label: "Impact", num: 5 },
  { key: "org_link", label: "Org Link", num: 6 },
  { key: "handoff", label: "Handoff", num: 7 },
] as const;

type StageKey = typeof STAGES[number]["key"];

const SYNC_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  synced: { label: "Synced", color: "#22C55E", bg: "rgba(34,197,94,0.08)" },
  stale: { label: "JA Updated", color: "#F97316", bg: "rgba(249,115,22,0.08)" },
  conflict: { label: "Conflict", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  manual: { label: "Manual", color: "var(--text-muted)", bg: "var(--surface-2)" },
  uploaded: { label: "CSV", color: "var(--text-muted)", bg: "var(--surface-2)" },
  broken: { label: "Broken", color: "var(--text-muted)", bg: "var(--surface-2)" },
};

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const S = {
  wrapper: { display: "flex", flexDirection: "column" as const, height: "calc(100vh - 48px)", overflow: "hidden" } as React.CSSProperties,

  // Top bar
  topBar: { display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "var(--surface-1)" } as React.CSSProperties,
  breadcrumb: { display: "flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "var(--text-muted)", flex: 1 } as React.CSSProperties,
  breadLink: { color: "#3B82F6", cursor: "pointer", background: "none", border: "none", fontSize: "var(--text-xs)" } as React.CSSProperties,
  breadSep: { color: "var(--text-muted)", fontSize: 10 } as React.CSSProperties,
  breadCurrent: { color: "var(--text-primary)", fontWeight: "var(--fw-semi)" } as React.CSSProperties,
  topActions: { display: "flex", alignItems: "center", gap: 6 } as React.CSSProperties,
  topBtn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 11, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 5, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer" } as React.CSSProperties,
  syncPill: (color: string, bg: string) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", fontSize: 10, fontWeight: 600, borderRadius: 10, background: bg, color, cursor: "pointer" }) as React.CSSProperties,

  // Stale/conflict banner
  banner: (color: string) => ({ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", background: `${color}08`, borderBottom: `2px solid ${color}`, fontSize: "var(--text-xs)", color: "var(--text-primary)", flexShrink: 0 }) as React.CSSProperties,
  bannerAction: { padding: "3px 10px", fontSize: 11, fontWeight: "var(--fw-semi)", border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface-1)", color: "#3B82F6", cursor: "pointer" } as React.CSSProperties,

  // Progress spine
  spine: { display: "flex", alignItems: "center", gap: 0, padding: "12px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "var(--surface-1)", overflowX: "auto" as const } as React.CSSProperties,
  spineStage: (state: "current" | "complete" | "incomplete" | "locked") => {
    const bg = state === "current" ? "#3B82F6" : state === "complete" ? "rgba(34,197,94,0.12)" : "var(--surface-2)";
    const border = state === "current" ? "#3B82F6" : state === "complete" ? "#22C55E" : "var(--border)";
    const color = state === "current" ? "#fff" : state === "complete" ? "#22C55E" : state === "locked" ? "var(--border)" : "var(--text-muted)";
    return { display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: `1px solid ${border}`, background: bg, cursor: state === "locked" ? "default" : "pointer", transition: "all 0.15s", minWidth: 0, whiteSpace: "nowrap" as const } as React.CSSProperties;
  },
  spineNum: (state: "current" | "complete" | "incomplete" | "locked") => ({ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: state === "current" ? "rgba(255,255,255,0.2)" : "transparent", color: state === "current" ? "#fff" : state === "complete" ? "#22C55E" : "var(--text-muted)", flexShrink: 0 }) as React.CSSProperties,
  spineLabel: { fontSize: 11, fontWeight: "var(--fw-medium)" } as React.CSSProperties,
  spinePct: { fontSize: 9, marginLeft: 2, opacity: 0.7 } as React.CSSProperties,
  spineConnector: { width: 16, height: 1, background: "var(--border)", flexShrink: 0 } as React.CSSProperties,

  // Main content area
  mainArea: { display: "flex", flex: 1, overflow: "hidden" } as React.CSSProperties,
  canvas: { flex: 1, overflowY: "auto" as const, padding: "20px 24px" } as React.CSSProperties,

  // Right rail
  rail: (open: boolean) => ({ width: open ? 280 : 0, flexShrink: 0, borderLeft: open ? "1px solid var(--border)" : "none", background: "var(--surface-1)", overflowY: "auto" as const, overflowX: "hidden" as const, transition: "width 0.2s", padding: open ? "16px" : 0 }) as React.CSSProperties,
  railSection: { marginBottom: 16 } as React.CSSProperties,
  railTitle: { fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 } as React.CSSProperties,
  railField: { display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "var(--text-xs)", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  railLabel: { color: "var(--text-muted)" } as React.CSSProperties,
  railValue: { color: "var(--text-primary)", fontWeight: "var(--fw-medium)" } as React.CSSProperties,
  railBtn: { display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 10, fontWeight: "var(--fw-medium)", border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer", width: "100%", justifyContent: "center", marginTop: 4 } as React.CSSProperties,
  relatedJob: { padding: "6px 8px", borderRadius: 4, fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", marginBottom: 3 } as React.CSSProperties,

  // Stage placeholder
  placeholder: { textAlign: "center" as const, padding: "60px 24px", color: "var(--text-muted)" } as React.CSSProperties,
  kbd: { display: "inline-block", padding: "1px 5px", fontSize: 10, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 3, fontFamily: "var(--ff-mono)", color: "var(--text-muted)" } as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function WorkflowCanvas({ jobId, jobTitle, projectId, model, onBackToQueue }: Props) {
  const [job, setJob] = useState<WDJobFull | null>(null);
  const [activeStage, setActiveStage] = useState<StageKey>("context");
  const [showSources, setShowSources] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  // Load full job data
  const loadJob = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getWDJob(jobId);
      if (data) {
        setJob(data as WDJobFull);
        if (data.current_stage) setActiveStage(data.current_stage as StageKey);
      }
    } catch { /* empty */ }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { loadJob(); }, [loadJob]);

  // Save stage to backend
  const saveStage = useCallback(async (stage: StageKey) => {
    if (!job) return;
    await api.updateWDJob(jobId, { current_stage: stage });
  }, [job, jobId]);

  // Navigate stages
  const goToStage = useCallback((stage: StageKey) => {
    setActiveStage(stage);
    saveStage(stage);
  }, [saveStage]);

  const stageIdx = STAGES.findIndex(s => s.key === activeStage);
  const goPrev = () => { if (stageIdx > 0) goToStage(STAGES[stageIdx - 1].key); };
  const goNext = () => { if (stageIdx < STAGES.length - 1) goToStage(STAGES[stageIdx + 1].key); };

  // Re-sync
  const handleReSync = useCallback(async () => {
    setSyncing(true);
    try {
      await api.reSyncWDJob(jobId);
      await loadJob();
    } catch { /* empty */ }
    setSyncing(false);
  }, [jobId, loadJob]);

  // Save stage data
  const saveField = useCallback(async (field: string, value: unknown) => {
    await api.updateWDJob(jobId, { [field]: value });
  }, [jobId]);

  const updateStageCompletion = useCallback(async (stage: string, pct: number) => {
    if (!job) return;
    const updated = { ...(job.stage_completion || {}), [stage]: pct };
    setJob(prev => prev ? { ...prev, stage_completion: updated } : prev);
    await api.updateWDJob(jobId, { stage_completion: updated });
  }, [job, jobId]);

  // Break/relink inheritance
  const handleBreak = useCallback(async () => {
    await api.breakWDInheritance(jobId);
    loadJob();
  }, [jobId, loadJob]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;

      if (e.key === "Escape") {
        onBackToQueue();
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (isMeta && e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (isMeta && e.key.toLowerCase() === "p") { e.preventDefault(); setShowSources(v => !v); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [stageIdx, onBackToQueue]);

  // Stage state
  const getStageState = (key: StageKey): "current" | "complete" | "incomplete" | "locked" => {
    if (key === activeStage) return "current";
    const pct = (job?.stage_completion || {})[key] || 0;
    if (pct >= 100) return "complete";
    return "incomplete";
  };

  const syncCfg = SYNC_CONFIG[job?.sync_state || "manual"] || SYNC_CONFIG.manual;
  const isStale = job?.sync_state === "stale";
  const isConflict = job?.sync_state === "conflict";
  const inheritedCount = (job?.inherited_fields || []).length;

  if (loading) {
    return (
      <div style={S.wrapper}>
        <div style={S.topBar}>
          <button style={S.topBtn} onClick={onBackToQueue}><ArrowLeft size={12} /> Queue</button>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Loading {jobTitle}…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrapper}>
      {/* ── Top bar ── */}
      <div style={S.topBar}>
        <div style={S.breadcrumb}>
          <button style={S.breadLink} onClick={onBackToQueue}>Queue</button>
          <span style={S.breadSep}>›</span>
          {job?.function && <><span style={{ color: "var(--text-muted)" }}>{job.function}</span><span style={S.breadSep}>›</span></>}
          <span style={S.breadCurrent}>{jobTitle}</span>
        </div>
        <div style={S.topActions}>
          <span style={S.syncPill(syncCfg.color, syncCfg.bg)}>
            {syncCfg.label}
            {job?.ja_source_version ? ` v${job.ja_source_version}` : ""}
          </span>
          {job?.ja_source_job_id && (
            <button style={S.topBtn} onClick={handleReSync} disabled={syncing}>
              <RefreshCw size={11} style={syncing ? { animation: "spin 1s linear infinite" } : undefined} />
              {syncing ? "Syncing…" : "Re-sync"}
            </button>
          )}
          <button style={S.topBtn} onClick={() => setShowSources(v => !v)} title="Cmd/Ctrl+P">
            {showSources ? <EyeOff size={11} /> : <Eye size={11} />}
            {showSources ? "Hide Sources" : "Show Sources"}
          </button>
          <button style={S.topBtn} onClick={() => setRailOpen(v => !v)}>
            <Layers3 size={11} /> {railOpen ? "Hide Rail" : "Show Rail"}
          </button>
          <button style={S.topBtn} onClick={onBackToQueue}><ArrowLeft size={11} /> Queue</button>
        </div>
      </div>

      {/* ── Stale / Conflict banner ── */}
      {isStale && (
        <div style={S.banner("#F97316")}>
          <AlertTriangle size={14} style={{ color: "#F97316", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            Job Architecture was updated since last sync.
            {job?.last_synced_at && <span style={{ color: "var(--text-muted)" }}> Last synced: {new Date(job.last_synced_at).toLocaleDateString()}</span>}
          </span>
          <button style={S.bannerAction} onClick={handleReSync}>Re-sync</button>
          <button style={{ ...S.bannerAction, color: "var(--text-muted)" }}>Ignore for now</button>
        </div>
      )}
      {isConflict && (
        <div style={S.banner("#F97316")}>
          <AlertTriangle size={14} style={{ color: "#F97316", flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: "var(--fw-semi)" }}>
            JA changed fields that this redesign has also modified. Review needed.
          </span>
          <button style={S.bannerAction} onClick={() => setConflictModalOpen(true)}>Review Changes</button>
          <button style={{ ...S.bannerAction, color: "var(--text-muted)" }}>Ignore</button>
        </div>
      )}

      {/* Conflict resolution modal */}
      <ConflictResolutionModal
        jobId={jobId}
        jobTitle={jobTitle}
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        onResolved={loadJob}
      />

      {/* ── Progress spine ── */}
      <div style={S.spine}>
        {STAGES.map((stage, i) => {
          const state = getStageState(stage.key);
          const pct = (job?.stage_completion || {})[stage.key] || 0;
          return (
            <React.Fragment key={stage.key}>
              {i > 0 && <div style={S.spineConnector} />}
              <button style={S.spineStage(state)} onClick={() => goToStage(stage.key)}>
                <div style={S.spineNum(state)}>
                  {state === "complete" ? <Check size={10} /> : stage.num}
                </div>
                <span style={S.spineLabel}>{stage.label}</span>
                {pct > 0 && pct < 100 && <span style={S.spinePct}>{pct}%</span>}
              </button>
            </React.Fragment>
          );
        })}

        {/* Keyboard hint */}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, paddingLeft: 12 }}>
          <span style={S.kbd}>⌘←</span><span style={S.kbd}>⌘→</span> stages
          <span style={S.kbd}>⌘P</span> sources
          <span style={S.kbd}>Esc</span> queue
        </div>
      </div>

      {/* ── Main content area + right rail ── */}
      <div style={S.mainArea}>
        {/* Canvas */}
        <div style={S.canvas}>
          {/* Stage content — placeholders for Phases 4-10 */}
          {activeStage === "context" && job && (
            <StageContext
              contextData={(job.context_data || {}) as any}
              jobMeta={{
                function: job.function,
                family: job.family,
                sub_family: job.sub_family,
                track_code: job.track_code,
                level_code: job.level_code,
              }}
              showSources={showSources}
              onSave={(data) => saveField("context_data", data)}
              onStageCompletion={(pct) => updateStageCompletion("context", pct)}
            />
          )}
          {activeStage === "deconstruction" && job && (
            <StageDeconstruction
              deconRows={(job.decon_rows || []) as any[]}
              weeklyHours={weeklyHours}
              jobTitle={job.title}
              showSources={showSources}
              onRowsChange={(rows) => {
                setJob(prev => prev ? { ...prev, decon_rows: rows } : prev);
                saveField("decon_rows", rows);
              }}
              onWeeklyHoursChange={setWeeklyHours}
              onSubmit={() => {
                saveField("decon_submitted", true);
                setJob(prev => prev ? { ...prev, decon_submitted: true } : prev);
              }}
              onStageCompletion={(pct) => updateStageCompletion("deconstruction", pct)}
              isSubmitted={job.decon_submitted}
              isFinalized={job.finalized}
            />
          )}
          {activeStage === "reconstruction" && job && (
            <StageReconstruction
              deconRows={job.decon_rows || []}
              redeployRows={(job.redeploy_rows || []) as any[]}
              reconData={(job.recon_data || null) as any}
              scenario={job.scenario || "Balanced"}
              isDeconSubmitted={job.decon_submitted}
              isRedeploySubmitted={job.redeploy_submitted}
              isFinalized={job.finalized}
              showSources={showSources}
              onRedeployRowsChange={(rows) => {
                setJob(prev => prev ? { ...prev, redeploy_rows: rows } : prev);
                saveField("redeploy_rows", rows);
              }}
              onScenarioChange={(s) => {
                setJob(prev => prev ? { ...prev, scenario: s, recon_data: {} } : prev);
                api.updateWDJob(jobId, { scenario: s, redeploy_submitted: false, recon_data: {} });
              }}
              onSubmitRedeploy={async () => {
                const rows = (job.redeploy_rows || []) as any[];
                const tasks = rows.map((r: any) => ({
                  ...r,
                  "Time Saved %": Math.max(Number(r["Current Time Spent %"] || 0) - Number(r["New Time %"] || 0), 0),
                }));
                saveField("redeploy_submitted", true);
                setJob(prev => prev ? { ...prev, redeploy_submitted: true } : prev);
                try {
                  const resp = await api.computeReconstruction(tasks, job.scenario || "Balanced");
                  const actionMix = (resp?.action_mix ?? {}) as Record<string, number>;
                  const recon = (resp?.reconstruction ?? []) as Record<string, unknown>[];
                  const totalCurrent = recon.reduce((s: number, r: any) => s + Number(r["Current Hrs"] || 0), 0);
                  const totalFuture = recon.reduce((s: number, r: any) => s + Number(r["Future Hrs"] || 0), 0);
                  const reconData = { ...resp, action_counts: actionMix, total_current_hrs: Number(totalCurrent.toFixed(1)), total_future_hrs: Number(totalFuture.toFixed(1)) };
                  setJob(prev => prev ? { ...prev, recon_data: reconData } : prev);
                  saveField("recon_data", reconData);
                } catch { /* empty */ }
              }}
              onFinalize={() => {
                setJob(prev => prev ? { ...prev, finalized: true, wd_status: "redesigned" } : prev);
                api.updateWDJob(jobId, { finalized: true });
              }}
              onStageCompletion={(pct) => updateStageCompletion("reconstruction", pct)}
            />
          )}
          {activeStage === "redeployment" && job && (
            <StageRedeployment
              reconData={(job.recon_data || null) as any}
              redeployRows={(job.redeploy_rows || []) as any[]}
              isRedeploySubmitted={job.redeploy_submitted}
              showSources={showSources}
              onStageCompletion={(pct) => updateStageCompletion("redeployment", pct)}
            />
          )}
          {activeStage === "impact" && job && (
            <StageImpact
              reconData={(job.recon_data || null) as any}
              redeployRows={(job.redeploy_rows || []) as any[]}
              contextData={(job.context_data || {}) as any}
              isRedeploySubmitted={job.redeploy_submitted}
              onStageCompletion={(pct) => updateStageCompletion("impact", pct)}
            />
          )}
          {activeStage === "org_link" && job && (
            <StageOrgLink
              orgLinkData={(job.org_link_data || {}) as any}
              jobTitle={job.title}
              trackCode={job.track_code}
              levelCode={job.level_code}
              function_name={job.function}
              showSources={showSources}
              onSave={(data) => saveField("org_link_data", data)}
              onStageCompletion={(pct) => updateStageCompletion("org_link", pct)}
            />
          )}
          {activeStage === "handoff" && job && (
            <StageHandoff
              handoffData={(job.handoff_data || {}) as any}
              jobTitle={job.title}
              jobId={jobId}
              contextData={(job.context_data || {}) as any}
              reconData={(job.recon_data || {}) as any}
              orgLinkData={(job.org_link_data || {}) as any}
              isFinalized={job.finalized}
              onSave={(data) => saveField("handoff_data", data)}
              onMarkRedesigned={() => {
                setJob(prev => prev ? { ...prev, finalized: true, wd_status: "redesigned" } : prev);
                api.updateWDJob(jobId, { finalized: true });
              }}
              onStageCompletion={(pct) => updateStageCompletion("handoff", pct)}
            />
          )}
        </div>

        {/* ── Right rail ── */}
        <div style={S.rail(railOpen)}>
          {railOpen && job && (
            <>
              {/* Provenance section */}
              <div style={S.railSection}>
                <div style={S.railTitle}>Provenance</div>
                <div style={S.railField}>
                  <span style={S.railLabel}>Source</span>
                  <span style={S.railValue}>{job.ja_source_job_id ? "Job Architecture" : "Manual"}</span>
                </div>
                <div style={S.railField}>
                  <span style={S.railLabel}>Sync state</span>
                  <span style={{ ...S.railValue, color: syncCfg.color }}>{syncCfg.label}</span>
                </div>
                {job.ja_source_version && (
                  <div style={S.railField}>
                    <span style={S.railLabel}>JA version</span>
                    <span style={S.railValue}>v{job.ja_source_version}</span>
                  </div>
                )}
                {job.last_synced_at && (
                  <div style={S.railField}>
                    <span style={S.railLabel}>Last synced</span>
                    <span style={S.railValue}>{new Date(job.last_synced_at).toLocaleDateString()}</span>
                  </div>
                )}
                <div style={S.railField}>
                  <span style={S.railLabel}>Inherited fields</span>
                  <span style={S.railValue}>{inheritedCount}</span>
                </div>

                {job.ja_source_job_id && (
                  <>
                    <button style={S.railBtn} onClick={handleReSync}>
                      <RefreshCw size={10} /> Re-sync from JA
                    </button>
                    {job.sync_state !== "broken" ? (
                      <button style={S.railBtn} onClick={handleBreak}>
                        <X size={10} /> Break Inheritance
                      </button>
                    ) : (
                      <button style={S.railBtn} onClick={() => { /* relink modal */ }}>
                        <GitBranch size={10} /> Re-link to JA
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Job identity */}
              <div style={S.railSection}>
                <div style={S.railTitle}>Job Identity</div>
                <div style={S.railField}>
                  <span style={S.railLabel}>Function</span>
                  <span style={S.railValue}>{job.function || "—"}</span>
                </div>
                <div style={S.railField}>
                  <span style={S.railLabel}>Family</span>
                  <span style={S.railValue}>{job.family || "—"}</span>
                </div>
                <div style={S.railField}>
                  <span style={S.railLabel}>Sub-family</span>
                  <span style={S.railValue}>{job.sub_family || "—"}</span>
                </div>
                <div style={S.railField}>
                  <span style={S.railLabel}>Track / Level</span>
                  <span style={S.railValue}>{job.track_code || "—"} {job.level_code || ""}</span>
                </div>
                <div style={S.railField}>
                  <span style={S.railLabel}>Wave</span>
                  <span style={S.railValue}>{job.wave?.replace("_", " ") || "Unassigned"}</span>
                </div>
                <div style={S.railField}>
                  <span style={S.railLabel}>Status</span>
                  <span style={S.railValue}>{job.wd_status?.replace("_", " ") || "—"}</span>
                </div>
                {job.assigned_to && (
                  <div style={S.railField}>
                    <span style={S.railLabel}>Assigned to</span>
                    <span style={S.railValue}>{job.assigned_to}</span>
                  </div>
                )}
              </div>

              {/* KPIs (if available) */}
              {(job.hours_freed > 0 || job.cost_delta !== 0) && (
                <div style={S.railSection}>
                  <div style={S.railTitle}>Redesign KPIs</div>
                  {job.hours_freed > 0 && (
                    <div style={S.railField}>
                      <span style={S.railLabel}>Hours freed</span>
                      <span style={{ ...S.railValue, fontFamily: "var(--ff-mono)", color: "#22C55E" }}>{job.hours_freed.toFixed(1)}h/wk</span>
                    </div>
                  )}
                  {job.cost_delta !== 0 && (
                    <div style={S.railField}>
                      <span style={S.railLabel}>Cost delta</span>
                      <span style={{ ...S.railValue, fontFamily: "var(--ff-mono)" }}>${Math.abs(job.cost_delta).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Updated */}
              <div style={S.railSection}>
                <div style={S.railTitle}>Activity</div>
                {job.updated_at && (
                  <div style={S.railField}>
                    <span style={S.railLabel}>Last updated</span>
                    <span style={S.railValue}>{new Date(job.updated_at).toLocaleString()}</span>
                  </div>
                )}
                {job.created_at && (
                  <div style={S.railField}>
                    <span style={S.railLabel}>Created</span>
                    <span style={S.railValue}>{new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Spin keyframe (reused) */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
