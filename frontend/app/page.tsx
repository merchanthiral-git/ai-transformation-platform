"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as api from "../lib/api";
import * as authApi from "../lib/auth-api";
import type { Filters } from "../lib/api";
import { useWorkspaceController } from "../lib/workspace";

// ── Shared components & hooks ──
import {
  ViewContext, COLORS, TT, PHASES, MODULES,
  SIM_PRESETS, SIM_DIMS, SIM_JOBS, SIM_READINESS,
  KpiCard, Card, Empty, Badge, InsightPanel, NarrativePanel, DataTable,
  BarViz, DonutViz, RadarViz, TabBar, SidebarSelect, ReadinessDot,
  PageHeader, LoadingBar, LoadingSkeleton, ModuleExportButton, NextStepBar,
  ContextStrip, InfoButton, ErrorBoundary, EmptyWithAction,
  ViewToggle, HelpBookAccordion, CareerFrameworkAccordion,
  AiEspressoPanel, AiEspressoButton, ViewSelector, ViewJobPicker, ViewEmployeePicker,
  usePersisted, useDebounce, useApiData, useDecisionLog, useRiskRegister,
  callAI, showToast, logDec, exportToCSV,
  setGlobalToast, setGlobalLogDecision,
  JobDesignState, Toast, useToast,
} from "./components/shared";

// ── Tab Module Components ──
import {
  LandingPage, WorkforceSnapshot, JobArchitecture,
  TransformationDashboard, TransformationExecDashboard,
  EmployeeProfileCard, EmployeeOrgChart, PersonalImpactCard,
  SkillShiftIndex,
} from "./components/OverviewModule";

import {
  AiOpportunityScan, AIReadiness, ManagerCapability,
  SkillsTalent, ChangeReadiness, ManagerDevelopment,
  AiRecommendationsEngine, OrgHealthScorecard, AIImpactHeatmap, RoleClustering,
} from "./components/DiagnoseModule";

import {
  WorkDesignLab, OrgDesignStudio, OperatingModelLab, OMDesignCanvas,
  RoleComparison, QuickWinIdentifier, BBBAFramework, HeadcountPlanning,
  KPIAlignmentModule,
} from "./components/DesignModule";

import { ImpactSimulator } from "./components/SimulateModule";

import {
  ChangePlanner, ReskillingPathways, TalentMarketplace,
  TransformationStoryBuilder, ReadinessArchetypes,
} from "./components/MobilizeModule";

import { ExportReport } from "./components/ExportModule";

import { JobArchitectureModule } from "./components/JobArchModule";
import { PlatformHub } from "./components/PlatformHub";
import { useGuidedTour, GuidedTourOverlay, TourHelpButton } from "./components/GuidedTour";


/* ═══════════════════════════════════════════════════════════════
   MUSIC PLAYER — Modern, genre-organized, frosted glass
   ═══════════════════════════════════════════════════════════════ */
type Genre = { id: string; label: string; icon: string };
type Track = { id: number; name: string; file: string; genre: string };

const GENRES: Genre[] = [
  { id: "chill", label: "Chill Lo-Fi", icon: "🌙" },
  { id: "focus", label: "Deep Focus", icon: "🎯" },
  { id: "ambient", label: "Ambient", icon: "🌊" },
  { id: "jazz", label: "Jazz", icon: "🎷" },
  { id: "electronic", label: "Electronic", icon: "⚡" },
];

const ALL_TRACKS: Track[] = [
  // Chill Lo-Fi (1-6)
  { id: 1, name: "Late Night Study", file: "/track1.mp3", genre: "chill" },
  { id: 2, name: "Rainy Window", file: "/track2.mp3", genre: "chill" },
  { id: 3, name: "Morning Garden", file: "/track3.mp3", genre: "chill" },
  { id: 4, name: "Warm Coffee", file: "/track4.mp3", genre: "chill" },
  { id: 5, name: "Cozy Blanket", file: "/track5.mp3", genre: "chill" },
  { id: 6, name: "Sunset Porch", file: "/track6.mp3", genre: "chill" },
  // Deep Focus (7-12)
  { id: 7, name: "Flow State", file: "/track7.mp3", genre: "focus" },
  { id: 8, name: "The Mountain", file: "/track8.mp3", genre: "focus" },
  { id: 9, name: "Deep Work", file: "/track9.mp3", genre: "focus" },
  { id: 10, name: "Clear Mind", file: "/track10.mp3", genre: "focus" },
  { id: 11, name: "Concentration", file: "/track11.mp3", genre: "focus" },
  { id: 12, name: "Productive Hours", file: "/track12.mp3", genre: "focus" },
  // Ambient (13-18)
  { id: 13, name: "Morning Fog", file: "/track13.mp3", genre: "ambient" },
  { id: 14, name: "Dreamscape", file: "/track14.mp3", genre: "ambient" },
  { id: 15, name: "Floating", file: "/track15.mp3", genre: "ambient" },
  { id: 16, name: "Summer Breeze", file: "/track16.mp3", genre: "ambient" },
  { id: 17, name: "Cloud Drift", file: "/track17.mp3", genre: "ambient" },
  { id: 18, name: "Still Water", file: "/track18.mp3", genre: "ambient" },
  // Jazz (19-23)
  { id: 19, name: "Urban Jazz Cafe", file: "/track19.mp3", genre: "jazz" },
  { id: 20, name: "Coffee Shop Piano", file: "/track20.mp3", genre: "jazz" },
  { id: 21, name: "Smoky Lounge", file: "/track21.mp3", genre: "jazz" },
  { id: 22, name: "Midnight Sax", file: "/track22.mp3", genre: "jazz" },
  { id: 23, name: "Blue Note", file: "/track23.mp3", genre: "jazz" },
  // Electronic (24-28)
  { id: 24, name: "Digital Pulse", file: "/track24.mp3", genre: "electronic" },
  { id: 25, name: "Neon Lights", file: "/track25.mp3", genre: "electronic" },
  { id: 26, name: "Synthwave Drive", file: "/track26.mp3", genre: "electronic" },
  { id: 27, name: "Tropical Beats", file: "/track27.mp3", genre: "electronic" },
  { id: 28, name: "Dream Cloud", file: "/track28.mp3", genre: "electronic" },
];

function MusicPlayer() {
  const [genre, setGenre] = useState("chill");
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(() => { try { return Number(localStorage.getItem("music_track") || "0"); } catch { return 0; } });
  const [volume, setVolume] = useState(() => { try { return Number(localStorage.getItem("music_vol") || "0.25"); } catch { return 0.25; } });
  const [viewState, setViewState] = useState<"mini" | "collapsed" | "expanded">("mini");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurTime] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [showList, setShowList] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);

  const genreTracks = useMemo(() => ALL_TRACKS.filter(t => t.genre === genre), [genre]);
  const track = genreTracks[trackIdx % genreTracks.length] || genreTracks[0];

  const fmt = (s: number) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec < 10 ? "0" : ""}${sec}`; };

  // Initialize audio
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.preload = "auto";
    audioRef.current = audio;

    const onEnd = () => {
      if (repeat) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
      setTrackIdx(prev => {
        const gt = ALL_TRACKS.filter(t => t.genre === genre);
        const next = shuffle ? Math.floor(Math.random() * gt.length) : (prev + 1) % gt.length;
        return next;
      });
    };
    const onMeta = () => setDuration(audio.duration || 0);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("loadedmetadata", onMeta);

    const updateProgress = () => {
      if (audio.duration) { setProgress(audio.currentTime / audio.duration); setCurTime(audio.currentTime); }
      animRef.current = requestAnimationFrame(updateProgress);
    };
    animRef.current = requestAnimationFrame(updateProgress);

    return () => { audio.pause(); audio.removeEventListener("ended", onEnd); audio.removeEventListener("loadedmetadata", onMeta); cancelAnimationFrame(animRef.current); audio.src = ""; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load track when trackIdx or genre changes
  useEffect(() => {
    const a = audioRef.current; if (!a || !track) return;
    a.src = track.file; a.volume = volume;
    setProgress(0); setCurTime(0); setDuration(0);
    if (playing) a.play().catch(() => {});
    try { localStorage.setItem("music_track", String(trackIdx)); } catch {}
  }, [trackIdx, genre, track?.file]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); } else { a.play().catch(() => {}); }
    setPlaying(!playing);
  };
  const changeTrack = (idx: number) => { setTrackIdx(idx); setPlaying(true); };
  const nextTrack = () => { const gt = genreTracks; changeTrack(shuffle ? Math.floor(Math.random() * gt.length) : (trackIdx + 1) % gt.length); };
  const prevTrack = () => { const gt = genreTracks; changeTrack((trackIdx - 1 + gt.length) % gt.length); };
  const changeVolume = (v: number) => { setVolume(v); if (audioRef.current) audioRef.current.volume = v; try { localStorage.setItem("music_vol", String(v)); } catch {} };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); if (audioRef.current?.duration) audioRef.current.currentTime = pct * audioRef.current.duration; };

  const btnBase: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" };

  // ── Mini state: small floating icon ──
  if (viewState === "mini") return <button onClick={() => { setViewState("collapsed"); if (!playing) toggle(); }}
    style={{ position: "fixed", bottom: 20, right: 20, zIndex: 40, width: 36, height: 36, borderRadius: 18, background: "linear-gradient(135deg, rgba(224,144,64,0.9), rgba(192,112,48,0.9))", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, cursor: "pointer", boxShadow: "0 4px 20px rgba(224,144,64,0.3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}
    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>♪</button>;

  // ── Collapsed state: slim bar at bottom ──
  if (viewState === "collapsed") return <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, height: 44, background: "rgba(15,12,8,0.85)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(212,134,10,0.1)", display: "flex", alignItems: "center", paddingLeft: 12, paddingRight: 12, gap: 10 }}>
    {/* Art placeholder */}
    <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #D4860A, #C07030)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0, cursor: "pointer" }} onClick={() => setViewState("expanded")}>♪</div>
    {/* Track info */}
    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setViewState("expanded")}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#f5e6d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track?.name || "—"}</div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{GENRES.find(g => g.id === genre)?.label}</div>
    </div>
    {/* Mini progress */}
    <div onClick={seek} style={{ width: 80, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, cursor: "pointer", flexShrink: 0, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 2, background: "#D4860A", width: `${progress * 100}%` }} />
    </div>
    {/* Controls */}
    <button onClick={toggle} style={{ ...btnBase, color: "#f5e6d0", fontSize: 16, width: 32, height: 32 }}>{playing ? "⏸" : "▶"}</button>
    <button onClick={nextTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>⏭</button>
    <button onClick={() => setViewState("mini")} style={{ ...btnBase, color: "rgba(255,255,255,0.25)", fontSize: 10 }}>✕</button>
  </div>;

  // ── Expanded state: full player panel ──
  return <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "rgba(10,8,6,0.92)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(212,134,10,0.12)", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 24px 20px" }}>
      {/* Top row: art + info + controls */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
        {/* Album art placeholder with decorative equalizer */}
        <div style={{ width: 64, height: 64, borderRadius: 12, background: "linear-gradient(135deg, #D4860A, #8B4513)", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, padding: 8, flexShrink: 0, boxShadow: "0 4px 16px rgba(212,134,10,0.2)" }}>
          {[3,5,4,6,3,4,5].map((h, i) => <div key={i} style={{ width: 4, borderRadius: 2, background: "rgba(255,255,255,0.6)", height: playing ? `${h * 4 + Math.sin(Date.now() / 300 + i) * 4}px` : "4px", transition: "height 0.3s", animation: playing ? `eqBar 0.8s ease-in-out ${i * 0.1}s infinite alternate` : "none" }} />)}
        </div>
        <style>{`@keyframes eqBar { 0% { height: 6px; } 100% { height: 24px; } }`}</style>

        {/* Track info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track?.name || "—"}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{GENRES.find(g => g.id === genre)?.icon} {GENRES.find(g => g.id === genre)?.label} · Track {(trackIdx % genreTracks.length) + 1} of {genreTracks.length}</div>
        </div>

        {/* Main controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setShuffle(!shuffle)} style={{ ...btnBase, color: shuffle ? "#D4860A" : "rgba(255,255,255,0.3)", fontSize: 13 }} title="Shuffle">⇄</button>
          <button onClick={prevTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.5)", fontSize: 16 }}>⏮</button>
          <button onClick={toggle} style={{ width: 42, height: 42, borderRadius: 21, background: "linear-gradient(135deg, #e09040, #c07030)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(224,144,64,0.3)", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{playing ? "⏸" : "▶"}</button>
          <button onClick={nextTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.5)", fontSize: 16 }}>⏭</button>
          <button onClick={() => setRepeat(!repeat)} style={{ ...btnBase, color: repeat ? "#D4860A" : "rgba(255,255,255,0.3)", fontSize: 13 }} title="Repeat">↻</button>
        </div>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, width: 110, flexShrink: 0 }}>
          <button onClick={() => changeVolume(volume > 0 ? 0 : 0.25)} style={{ ...btnBase, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{volume === 0 ? "🔇" : volume < 0.3 ? "🔈" : "🔊"}</button>
          <input type="range" min={0} max={1} step={0.02} value={volume} onChange={e => changeVolume(Number(e.target.value))} style={{ flex: 1, accentColor: "#e09040", height: 3 }} />
        </div>

        {/* Collapse/close */}
        <button onClick={() => setViewState("collapsed")} style={{ ...btnBase, color: "rgba(255,255,255,0.3)", fontSize: 10 }}>▼</button>
        <button onClick={() => { setViewState("mini"); if (playing) { /* keep playing */ } }} style={{ ...btnBase, color: "rgba(255,255,255,0.2)", fontSize: 10 }}>✕</button>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace", width: 32, textAlign: "right" }}>{fmt(currentTime)}</span>
        <div onClick={seek} style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, cursor: "pointer", overflow: "hidden", position: "relative" }}>
          <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #D4860A, #E8C547)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} />
        </div>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace", width: 32 }}>{fmt(duration)}</span>
      </div>

      {/* Genre pills + track list */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {GENRES.map(g => <button key={g.id} onClick={() => { setGenre(g.id); setTrackIdx(0); }}
          style={{ padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 600, cursor: "pointer", border: genre === g.id ? "1px solid rgba(212,134,10,0.4)" : "1px solid rgba(255,255,255,0.06)", background: genre === g.id ? "rgba(212,134,10,0.12)" : "transparent", color: genre === g.id ? "#e09040" : "rgba(255,255,255,0.35)", transition: "all 0.2s", fontFamily: "'Outfit', sans-serif" }}>{g.icon} {g.label}</button>)}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowList(!showList)} style={{ ...btnBase, fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace" }}>{showList ? "Hide" : "Tracks"} ▾</button>
      </div>

      {/* Track list */}
      {showList && <div style={{ marginTop: 8, maxHeight: 140, overflowY: "auto", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
        {genreTracks.map((t, i) => <button key={t.id} onClick={() => changeTrack(i)}
          style={{ width: "100%", padding: "6px 12px", background: i === trackIdx % genreTracks.length ? "rgba(212,134,10,0.1)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: i === trackIdx % genreTracks.length ? "#e09040" : "rgba(255,255,255,0.5)", transition: "all 0.15s", fontFamily: "'Outfit', sans-serif" }}
          onMouseEnter={e => { if (i !== trackIdx % genreTracks.length) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          onMouseLeave={e => { if (i !== trackIdx % genreTracks.length) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ width: 16, fontSize: 9, textAlign: "right", opacity: 0.4, fontFamily: "'IBM Plex Mono', monospace" }}>{i === trackIdx % genreTracks.length && playing ? "♫" : `${i + 1}`}</span>
          <span style={{ flex: 1, textAlign: "left" }}>{t.name}</span>
        </button>)}
      </div>}
    </div>
  </div>;
}



/* ═══════════════════════════════════════════════════════════════
   EXPORT HELPER — downloads data as CSV
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   HOME — Main workspace
   ═══════════════════════════════════════════════════════════════ */
function Home({ projectId, projectName, projectMeta, onBackToHub, user, onShowProfile, onShowPlatformHub }: { projectId: string; projectName: string; projectMeta: string; onBackToHub: () => void; user?: authApi.AuthUser; onShowProfile?: () => void; onShowPlatformHub?: () => void }) {
  const [viewMode, setViewMode] = usePersisted<string>(`${projectId}_viewMode`, "");
  const [viewEmployee, setViewEmployee] = usePersisted<string>(`${projectId}_viewEmployee`, "");
  const [viewJob, setViewJob] = usePersisted<string>(`${projectId}_viewJob`, "");
  const [viewCustom, setViewCustom] = usePersisted<Record<string, string>>(`${projectId}_viewCustom`, { func: "All", jf: "All", sf: "All", cl: "All", ct: "All" });
  const [employees, setEmployees] = useState<string[]>([]);
  const [page, setPage] = usePersisted(`${projectId}_page`, "home");
  const fileRef = useRef<HTMLInputElement>(null);

  // Guided tour for first-time users
  const { tourActive, tourStep, startTour, nextStep, prevStep, skipTour, dismissTour, totalSteps } = useGuidedTour();

  // On fresh login, reset to home (Overview) instead of restoring stale tab
  useEffect(() => {
    if (sessionStorage.getItem("fresh_login")) {
      // Don't remove fresh_login here — the guided tour checks it
      setPage("home");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const workspace = useWorkspaceController();
  const { models, model, jobs, job, filters: f, filterOptions: fo, message: msg, backendOk, loadingModels, uploadFiles, resetWorkspace, setModel, setJob, setFilter, clearFilters } = workspace;
  const { toast, ToastContainer } = useToast();
  const { log: decisionLog, logDecision } = useDecisionLog(projectId);
  const { risks: riskRegister, addRisk, updateRisk } = useRiskRegister(projectId);
  const [showDecLog, setShowDecLog] = useState(false);
  const [decLogFilter, setDecLogFilter] = useState("All");
  setGlobalToast(toast);
  setGlobalLogDecision(logDecision);
  // Wire up API-level toast notifications
  api.setApiToast(toast);

  // Toast when model loads  
  const prevModelRef = useRef(model);
  useEffect(() => {
    if (model && model !== prevModelRef.current && backendOk) {
      prevModelRef.current = model;
      showToast(`Model loaded: ${model}`);
    }
  }, [model, backendOk]);

  // Tutorial mode — must be declared before the useEffect that references it
  const [isTutorial] = useState(() => { try { return JSON.parse(localStorage.getItem(`${projectId}_isTutorial`) || "false"); } catch { return false; } });

  // Auto-select Tutorial model for tutorial projects
  useEffect(() => {
    // Two paths to set the model:
    // 1. isTutorial flag from localStorage (set by seedTutorialData)
    // 2. projectId starts with "tutorial_" (direct detection)
    const shouldAutoSelect = isTutorial || projectId.startsWith("tutorial_");
    if (shouldAutoSelect && backendOk) {
      // Read the stored model name
      try {
        const lm = JSON.parse(localStorage.getItem("lastModel") || "null");
        if (lm && String(lm).startsWith("Tutorial_") && model !== lm) {
          setModel(lm);
        }
      } catch {}
      // Also try to derive model name from projectId if lastModel isn't set
      if (!model || model === "Demo_Model") {
        const derivedModel = projectId.replace("tutorial_", "Tutorial_").split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("_");
        if (derivedModel.startsWith("Tutorial_")) {
          setModel(derivedModel);
          // Also re-trigger the backend seed in case it wasn't seeded yet
          fetch(`/api/tutorial/seed?industry=${projectId.split("_").slice(2).join("_")}&size=${projectId.split("_")[1]}`).catch(() => {});
        }
      }
    }
  }, [isTutorial, backendOk, model, setModel, projectId]);

  // Fetch employee names for employee view picker
  useEffect(() => {
    if (!model || !backendOk) return;
    api.getOverview(model, f).then(d => {
      const names = ((d as Record<string, unknown>)?.employee_names ?? []) as string[];
      if (names.length) setEmployees(names);
    }).catch(() => {});
  }, [model, backendOk]);

  // ── Persistent work design state — scoped to project ──
  const [jobStates, setJobStates] = usePersisted<Record<string, JobDesignState>>(`${projectId}_jobStates`, {});
  const setJobState = useCallback((jobTitle: string, partial: Partial<JobDesignState>) => {
    setJobStates(prev => ({ ...prev, [jobTitle]: { ...(prev[jobTitle] || { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false }), ...partial } }));
  }, [setJobStates]);

  // ── Persistent simulator state — scoped to project ──
  const [simState, setSimState] = usePersisted(`${projectId}_simState`, { scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 });

  // ── Persistent ODS state — scoped to project ──
  const [odsState, setOdsState] = usePersisted(`${projectId}_odsState`, { activeScenario: 0, view: "overview" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [omNodes] = usePersisted<any[]>(`${projectId}_om_nodes`, []);

  // ── Track visited modules — scoped to project ──
  const [visited, setVisited] = usePersisted<Record<string, boolean>>(`${projectId}_visited`, {});
  const navigate = useCallback((id: string) => { setPage(id); setVisited(prev => ({ ...prev, [id]: true })); }, [setPage, setVisited]);

  const upload = async (files: FileList) => {
    try {
      await uploadFiles(files);
      toast("Data uploaded successfully", "success");
      // Validate data quality after upload
      if (model) {
        try {
          const dq = await api.getDataQuality(model);
          const summary = (dq as Record<string, unknown>)?.summary as Record<string, unknown>;
          const missing = Number(summary?.missing ?? 0);
          const issues = Number(summary?.total_issues ?? 0);
          if (missing > 0) toast(`${missing} dataset(s) still missing — check Data Quality in AI Opportunity Scan`, "warning");
          else if (issues > 0) toast(`${issues} data issue(s) detected — review in AI Opportunity Scan > Data Quality`, "warning");
        } catch { /* data quality check is optional */ }
      }
    } catch { toast("Upload failed — check file format and required columns", "error"); }
  };
  const reset = async () => { await resetWorkspace(); setPage("home"); setJobStates({}); setVisited({}); setSimState({ scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 }); setOdsState({ activeScenario: 0, view: "overview" }); };
  const af = Object.values(f).filter(v => v !== "All").length;
  const hasJobs = jobs.length > 0;
  const hasData = !!model;

  // Module status for landing page
  const moduleStatus: Record<string, string> = {};
  const completedJobCount = jobs.filter(j => jobStates[j]?.finalized).length;
  if (completedJobCount === jobs.length && jobs.length > 0) moduleStatus.design = "complete";
  else if (Object.values(jobStates).some(s => s.deconSubmitted)) moduleStatus.design = "in_progress";
  // Smart module completion with phase awareness
  if (hasData) { 
    moduleStatus.snapshot = "in_progress"; 
    moduleStatus.jobs = "in_progress";
    moduleStatus.scan = "in_progress";
  }
  if (Object.values(jobStates).some(s => s.deconRows.length > 0)) moduleStatus.design = "in_progress";
  if (Object.values(jobStates).some(s => s.finalized)) { 
    moduleStatus.design = "complete";
    moduleStatus.simulate = "in_progress";
  }
  if (Object.values(jobStates).filter(s => s.finalized).length >= 3) moduleStatus.simulate = "complete";
  Object.entries(visited).forEach(([k, v]) => { if (v && !moduleStatus[k]) moduleStatus[k] = "in_progress"; });

  const goHome = () => setPage("home");

  // Fetch overview data for TransformationDashboard
  const [overviewData] = useApiData(() => model ? api.getOverview(model, f) : Promise.resolve(null), [model, f.func, f.jf, f.sf, f.cl]);

  // Build context string for AI assistant based on current page
  const buildAiContext = useCallback(() => {
    const parts: string[] = [];
    if (viewMode) parts.push(`View: ${viewMode}${viewMode === "job" ? ` (${viewJob})` : viewMode === "employee" ? ` (${viewEmployee})` : ""}`);
    if (model) parts.push(`Model: ${model}`);
    if (job) parts.push(`Active job: ${job}`);
    if (jobs.length) parts.push(`${jobs.length} jobs in scope`);
    const completedCount = Object.values(jobStates).filter(s => s.finalized).length;
    if (completedCount > 0) parts.push(`${completedCount}/${jobs.length} jobs finalized in Work Design`);
    const deconCount = Object.values(jobStates).filter(s => s.deconSubmitted).length;
    if (deconCount > 0) parts.push(`${deconCount} jobs deconstructed`);
    if (Object.keys(f).some(k => f[k as keyof typeof f] !== "All")) {
      parts.push(`Filters active: ${Object.entries(f).filter(([,v]) => v !== "All").map(([k,v]) => `${k}=${v}`).join(", ")}`);
    }
    // Add module-specific context
    if (page === "simulate") {
      const cfg = simState.custom ? `Custom (${simState.custAdopt}% adoption, ${simState.custTimeline}mo)` : simState.scenario;
      parts.push(`Scenario: ${cfg}, Investment: $${simState.investment}/role`);
    }
    return parts.join(". ");
  }, [model, job, jobs, jobStates, f, page, simState]);

  const viewCtx: ViewContext = { mode: viewMode || "org", employee: viewEmployee, job: viewJob, custom: viewCustom };

  // Tutorial mode (isTutorial declared earlier, before auto-select effect)
  const [tutorialStep, setTutorialStep] = useState(() => { try { return JSON.parse(localStorage.getItem(`${projectId}_tutorialStep`) || "0"); } catch { return 0; } });
  const [tutorialVisible, setTutorialVisible] = useState(isTutorial);
  const tutorialSteps = useMemo(() => buildTutorialSteps(projectId), [projectId]);

  useEffect(() => {
    if (isTutorial) { try { localStorage.setItem(`${projectId}_tutorialStep`, JSON.stringify(tutorialStep)); } catch {} }
  }, [tutorialStep, projectId, isTutorial]);

  const tutorialNext = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      const nextStep = tutorialStep + 1;
      setTutorialStep(nextStep);
      const nextPage = tutorialSteps[nextStep].page;
      if (nextPage !== "home") setPage(nextPage);
      else setPage("home");
    } else {
      setTutorialVisible(false);
    }
  };
  const tutorialPrev = () => {
    if (tutorialStep > 0) {
      const prevStep = tutorialStep - 1;
      setTutorialStep(prevStep);
      const prevPage = tutorialSteps[prevStep].page;
      if (prevPage !== "home") setPage(prevPage);
      else setPage("home");
    }
  };
  const tutorialJump = (s: number) => {
    setTutorialStep(s);
    const pg = tutorialSteps[s].page;
    if (pg !== "home") setPage(pg);
    else setPage("home");
  };

  // Escape key goes back to home
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && page !== "home") setPage("home"); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, setPage]);

  // View selector pages — full screen, no sidebar
  if (!viewMode || viewMode === "job_select" || viewMode === "employee_select") {
    return <div style={{ minHeight: "100vh", background: "#0B1120" }}>
      {!viewMode && <ViewSelector 
        onBack={onBackToHub}
        onSelect={(mode, detail) => {
          if (mode === "org") { setViewMode("org"); }
          else if (mode === "job_select") { setViewMode("job_select"); }
          else if (mode === "employee_select") { setViewMode("employee_select"); }
          else if (mode === "custom" && detail) { setViewMode("custom"); setViewCustom(detail); Object.entries(detail).forEach(([k, v]) => { if (k !== "ct") setFilter(k as keyof Filters, v); }); }
        }} 
        employees={employees} 
        jobs={jobs}
        filterOptions={fo}
      />}
      {viewMode === "job_select" && <ViewJobPicker jobs={jobs} onSelect={j => { setViewMode("job"); setViewJob(j); setJob(j); }} onBack={() => setViewMode("")} />}
      {viewMode === "employee_select" && <ViewEmployeePicker employees={employees} onSelect={e => { setViewMode("employee"); setViewEmployee(e); }} onBack={() => setViewMode("")} />}
    </div>;
  }

  // Platform Hub — handled by parent Page component now
  if (page === "hub" && onShowPlatformHub) { onShowPlatformHub(); setPage("home"); }

  return <div className="flex min-h-screen w-full">
    {/* ── SIDEBAR ── */}
    <aside data-tour="sidebar" className="w-[220px] min-h-screen bg-[var(--surface-1)] flex flex-col px-4 py-5 shrink-0 overflow-y-auto sticky top-0 border-r border-[var(--border)]" style={{ height: "100vh" }}>
      <div className="mb-1 cursor-pointer" onClick={goHome}><div className="text-sm font-extrabold text-[var(--text-primary)]">AI Transformation</div><div className="text-[10px] font-semibold text-[var(--accent-primary)] uppercase tracking-[1.5px]">PLATFORM</div></div>
      <button onClick={() => { if (page === "home" && viewMode) { setViewMode(""); } else { onBackToHub(); } }} className="w-full text-left text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1 mb-1 flex items-center gap-1 transition-colors">{page === "home" && viewMode ? "← Back to Views" : page !== "home" ? "← Back to Home" : "← Back to Projects"}</button>
      <div className="bg-[var(--surface-2)] rounded-lg px-3 py-2 mb-2 border border-[var(--border)]"><div className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-0.5">Active Project</div><div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{projectName}</div>{projectMeta && <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 italic">{projectMeta}</div>}</div>
      <div className="h-px bg-[var(--border)] my-3" />
      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Data Intake</div>
      <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv" onChange={e => e.target.files && upload(e.target.files)} className="hidden" />
      <button data-tour="upload" onClick={() => fileRef.current?.click()} className="w-full bg-[var(--accent-primary)] hover:opacity-90 text-white text-[12px] font-semibold py-1.5 rounded-md mb-1.5">⬆ Upload Files</button>
      <a href="/api/template" download className="block w-full bg-[var(--surface-3)] hover:bg-[var(--hover)] border border-[var(--accent-primary)] text-[var(--accent-primary)] text-[12px] font-semibold py-1.5 rounded-md mb-1.5 text-center no-underline">⬇ Export Template</a>
      <button onClick={reset} className="w-full bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-semibold py-1 rounded-md">Reset</button>
      {msg && <div className="mt-1.5 text-[11px] text-[var(--accent-primary)] bg-[rgba(212,134,10,0.1)] rounded px-2 py-1">{msg}</div>}
      {!backendOk && <div className="mt-1.5 text-[11px] text-[var(--risk)] bg-[rgba(239,68,68,0.1)] rounded px-2 py-1.5 border border-[var(--risk)]/20">⚠ Backend offline<br/><span className="text-[10px] text-[var(--text-muted)]">Run: uvicorn main:app --port 8000</span></div>}
      {backendOk && model && <div className="mt-1.5 text-[11px] text-[var(--success)] bg-[rgba(16,185,129,0.1)] rounded px-2 py-1">✓ Connected · {model}</div>}
      <div className="h-px bg-[var(--border)] my-3" />
      {viewMode !== "employee" && <><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Model</div>
      <SidebarSelect options={models.length ? models : [loadingModels ? "Loading..." : "No models"]} value={model || (models[0] || (loadingModels ? "Loading..." : "No models"))} onChange={setModel} />
      <div className="h-px bg-[var(--border)] my-3" /></>}
      {viewMode !== "employee" && <><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Active Job</div>
      <SidebarSelect options={hasJobs ? jobs : ["No jobs available"]} value={job || (jobs[0] || "No jobs available")} onChange={v => setJob(v === "No jobs available" ? "" : v)} />
      {job && <div className="mt-1"><Badge color="indigo">{job}</Badge></div>}</>}
      <div className="h-px bg-[var(--border)] my-3" />
      {viewMode === "employee" && viewEmployee && <div className="bg-[rgba(139,92,246,0.1)] border border-[var(--purple)]/20 rounded-lg px-3 py-2 mb-2"><div className="text-[10px] font-bold text-[var(--purple)] uppercase tracking-wider mb-0.5">Employee View</div><div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{viewEmployee}</div><button onClick={() => setViewMode("")} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode === "job" && viewJob && <div className="bg-[rgba(16,185,129,0.1)] border border-[var(--success)]/20 rounded-lg px-3 py-2 mb-2"><div className="text-[10px] font-bold text-[var(--success)] uppercase tracking-wider mb-0.5">Job View</div><div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{viewJob}</div><button onClick={() => setViewMode("")} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode !== "employee" && <><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px]">Filters</span>{af > 0 && <span className="bg-[rgba(212,134,10,0.2)] text-[var(--accent-primary)] text-[11px] font-bold px-2 py-0.5 rounded-full">{af}</span>}</div>
      <SidebarSelect label="Function" options={fo.functions || ["All"]} value={f.func} onChange={v => setFilter("func", v)} />
      <SidebarSelect label="Job Family" options={fo.job_families || ["All"]} value={f.jf} onChange={v => setFilter("jf", v)} />
      <SidebarSelect label="Sub-Family" options={fo.sub_families || ["All"]} value={f.sf} onChange={v => setFilter("sf", v)} />
      <SidebarSelect label="Career Level" options={fo.career_levels || ["All"]} value={f.cl} onChange={v => setFilter("cl", v)} />
      {af > 0 && <button onClick={clearFilters} className="w-full bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-semibold py-1 rounded-md mt-1">Clear All</button>}</>}
      {/* Decision Log + Platform Hub */}
      <div className="mt-auto">
        <div className="h-px bg-[var(--border)] my-3" />
        <button onClick={() => setShowDecLog(!showDecLog)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] mb-1 flex items-center gap-2 transition-all ${showDecLog ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[13px]">📝</span> Decision Log {decisionLog.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold">{decisionLog.length}</span>}
        </button>
        <button data-tour="platform-hub" onClick={() => { if (onShowPlatformHub) onShowPlatformHub(); }} className="w-full rounded-xl p-2.5 text-left transition-all group" style={{ background: "rgba(212,134,10,0.03)", border: "1px solid rgba(212,134,10,0.08)" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,134,10,0.2)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(212,134,10,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(212,134,10,0.08)"; e.currentTarget.style.boxShadow = "none"; }}>
          <div className="text-[10px] font-bold font-heading group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: "rgba(212,134,10,0.6)" }}>AI Transformation</div>
          <div className="text-[9px]" style={{ color: "rgba(212,134,10,0.3)" }}>Account & Info</div>
        </button>
      </div>

      {/* Account controls — anchored at sidebar bottom */}
      <div className="pt-3 border-t border-[var(--border)]">
        {user && <div className="flex items-center gap-2 mb-2">
          <button onClick={onShowProfile} className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: "linear-gradient(135deg, rgba(212,134,10,0.2), rgba(192,112,48,0.15))", border: "1px solid rgba(224,144,64,0.2)", color: "#e09040", cursor: "pointer", fontFamily: "'Outfit', sans-serif" }} title="Profile Settings">{(user.display_name || user.username || "U")[0].toUpperCase()}</button>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{user.display_name || user.username}</div>
            {user.last_login && <div className="text-[8px] text-[var(--text-muted)] font-data truncate">Last: {new Date(user.last_login).toLocaleDateString()}</div>}
          </div>
          <TourHelpButton onClick={startTour} />
        </div>}
        <button onClick={() => authApi.logout()} className="w-full text-[10px] font-semibold py-1.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--risk)] hover:border-[var(--risk)]/30 transition-colors">Sign Out</button>
        <div className="text-center text-[9px] text-[var(--text-muted)] mt-2 opacity-50">v4.0</div>
      </div>
    </aside>

    {/* ── MAIN ── */}
    <main data-tour="main-content" className="flex-1 min-h-screen bg-[var(--bg)]">
      {page === "home" && <div data-tour="overview">
        <LandingPage onNavigate={navigate} moduleStatus={moduleStatus} hasData={hasData} viewMode={viewMode} />
      </div>}
      {page !== "home" && <div className="px-7 py-6">
      {page === "snapshot" && model && <ErrorBoundary><WorkforceSnapshot model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "jobs" && model && <ErrorBoundary><JobArchitecture model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobs={jobs} /></ErrorBoundary>}
      {page === "jobarch" && model && <ErrorBoundary><JobArchitectureModule model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "scan" && model && <ErrorBoundary><AiOpportunityScan model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "mgrcap" && model && <ErrorBoundary><ManagerCapability model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "changeready" && model && <ErrorBoundary><ChangeReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "mgrdev" && model && <ErrorBoundary><ManagerDevelopment model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "recommendations" && model && <ErrorBoundary><AiRecommendationsEngine model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "orghealth" && model && <ErrorBoundary><OrgHealthScorecard model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "heatmap" && model && <ErrorBoundary><AIImpactHeatmap model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "clusters" && model && <ErrorBoundary><RoleClustering model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "skillshift" && model && <ErrorBoundary><SkillShiftIndex model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "story" && model && <ErrorBoundary><TransformationStoryBuilder model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "archetypes" && model && <ErrorBoundary><ReadinessArchetypes model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "export" && model && <ErrorBoundary><ExportReport model={model} f={f} onBack={goHome} /></ErrorBoundary>}
      {page === "dashboard" && model && <ErrorBoundary><TransformationExecDashboard model={model} f={f} onBack={goHome} onNavigate={navigate} decisionLog={decisionLog} riskRegister={riskRegister} addRisk={addRisk} updateRisk={updateRisk} /></ErrorBoundary>}
      {page === "readiness" && model && <ErrorBoundary><AIReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "bbba" && model && <ErrorBoundary><BBBAFramework model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "headcount" && model && <ErrorBoundary><HeadcountPlanning model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "reskill" && model && <ErrorBoundary><ReskillingPathways model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "marketplace" && model && <ErrorBoundary><TalentMarketplace model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "skills" && model && <ErrorBoundary><SkillsTalent model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "design" && model && viewCtx.mode !== "employee" && <ErrorBoundary><WorkDesignLab model={model} f={f} job={viewCtx.mode === "job" ? viewCtx.job || job : job} jobs={jobs} onBack={goHome} jobStates={jobStates} setJobState={setJobState} onSelectJob={setJob} /></ErrorBoundary>}
      {page === "simulate" && <ErrorBoundary><ImpactSimulator onBack={goHome} onNavigate={navigate} model={model} viewCtx={viewCtx} f={f} jobStates={jobStates} simState={simState} setSimState={setSimState} /></ErrorBoundary>}
      {page === "build" && <ErrorBoundary><OrgDesignStudio onBack={goHome} viewCtx={viewCtx} model={model} f={f} odsState={odsState} setOdsState={setOdsState} /></ErrorBoundary>}
      {page === "plan" && model && <ErrorBoundary><ChangePlanner model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "opmodel" && viewCtx.mode === "job" && <div className="px-7 py-6"><div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Job View</h3><p className="text-[13px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[13px] font-semibold">Change View ↻</button></div></div>}
      {page === "opmodel" && viewCtx.mode !== "employee" && viewCtx.mode !== "job" && <ErrorBoundary><OperatingModelLab onBack={goHome} model={model} f={f} projectId={projectId} onNavigateCanvas={() => navigate("om_canvas")} onModelChange={setModel} /></ErrorBoundary>}
      {(page === "design" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[13px] text-[var(--text-secondary)] mb-2">Work Design Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="green">💼 Job</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[13px] font-semibold">Change View ↻</button></div>}
      {(page === "opmodel" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[13px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[13px] font-semibold">Change View ↻</button></div>}
      {page === "om_canvas" && <ErrorBoundary><OMDesignCanvas projectId={projectId} onBack={goHome} onNavigateLab={() => navigate("opmodel")} /></ErrorBoundary>}
      {page === "rolecompare" && model && <ErrorBoundary><RoleComparison model={model} f={f} onBack={goHome} jobs={jobs} jobStates={jobStates} /></ErrorBoundary>}
      {page === "quickwins" && model && <ErrorBoundary><QuickWinIdentifier model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {!model && page !== "home" && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">📂</div><h3 className="text-lg font-semibold mb-1">Select a model first</h3><p className="text-[13px] text-[var(--text-secondary)]">Upload data or select Demo_Model in the sidebar.</p><button onClick={goHome} className="mt-4 text-[var(--accent-primary)] text-[13px] font-semibold">← Back to Home</button></div>}
      </div>}
    </main>
    {page !== "home" && <div data-tour="ai-espresso"><AiEspressoButton moduleId={page} contextData={buildAiContext()} viewMode={viewMode} /></div>}
    {isTutorial && tutorialVisible && <TutorialOverlay step={tutorialStep} totalSteps={tutorialSteps.length} steps={tutorialSteps} onNext={tutorialNext} onPrev={tutorialPrev} onClose={() => setTutorialVisible(false)} onJump={tutorialJump} />}
    {isTutorial && !tutorialVisible && <TutorialBadge onClick={() => setTutorialVisible(true)} step={tutorialStep} total={tutorialSteps.length} />}
    {tourActive && <GuidedTourOverlay step={tourStep} totalSteps={totalSteps} onNext={nextStep} onPrev={prevStep} onSkip={skipTour} onDismiss={dismissTour} />}

    {/* Decision Log Slide-out Panel */}
    {showDecLog && <div className="fixed top-0 right-0 bottom-0 w-[380px] z-[9998] bg-[var(--surface-1)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-slide-right" style={{ boxShadow: "-8px 0 30px rgba(0,0,0,0.3)" }}>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2"><span className="text-lg">📝</span><h3 className="text-[14px] font-bold font-heading text-[var(--text-primary)]">Decision Log</h3><span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold">{decisionLog.length}</span></div>
        <button onClick={() => setShowDecLog(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">✕</button>
      </div>
      <div className="px-4 py-2 border-b border-[var(--border)] flex gap-1 shrink-0 overflow-x-auto">
        {["All", ...Array.from(new Set(decisionLog.map(d => d.module)))].map(m => <button key={m} onClick={() => setDecLogFilter(m)} className={`px-2 py-1 rounded text-[9px] font-semibold whitespace-nowrap ${decLogFilter === m ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>{m}</button>)}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {decisionLog.length === 0 ? <div className="text-center py-12 text-[var(--text-muted)]"><div className="text-3xl mb-2 opacity-30">📝</div><div className="text-[12px]">No decisions logged yet.<br/>Actions in any module are automatically recorded here.</div></div> :
        <div className="space-y-2">
          {decisionLog.filter(d => decLogFilter === "All" || d.module === decLogFilter).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).map((d, i) => <div key={i} className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold">{d.module}</span>
              <span className="text-[9px] text-[var(--text-muted)] font-data">{new Date(d.ts).toLocaleDateString()} {new Date(d.ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
            </div>
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">{d.action}</div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{d.detail}</div>
          </div>)}
        </div>}
      </div>
    </div>}

    <ToastContainer />
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   TUTORIAL SYSTEM
   ═══════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════
   TUTORIAL SYSTEM — Complete interactive onboarding
   Seeder + 27 micro-steps + spotlight overlay + progress + actions
   ═══════════════════════════════════════════════════════════════ */

function seedTutorialData(projectId: string, industry: string = "technology") {
  // Always reset for fresh experience
  const keysToClean = Object.keys(localStorage).filter(k => k.startsWith(projectId));
  keysToClean.forEach(k => localStorage.removeItem(k));

  localStorage.setItem(`${projectId}_viewMode`, JSON.stringify("org"));

  // Visited modules — show progress
  localStorage.setItem(`${projectId}_visited`, JSON.stringify({
    snapshot: true, jobs: true, scan: true, readiness: true, skills: true, design: true, simulate: true, build: true
  }));

  // Work Design: Data Analyst with 8 realistic tasks
  const tasks = [
    { "Task Name": "Data extraction & cleaning", "Current Time Spent %": 25, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Data Analysis", "Secondary Skill": "Python/SQL" },
    { "Task Name": "Report generation & formatting", "Current Time Spent %": 20, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Data Analysis", "Secondary Skill": "Communication" },
    { "Task Name": "Ad-hoc analysis for stakeholders", "Current Time Spent %": 15, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": "Critical Thinking", "Secondary Skill": "Data Analysis" },
    { "Task Name": "Dashboard creation & maintenance", "Current Time Spent %": 10, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Cloud Platforms", "Secondary Skill": "Data Analysis" },
    { "Task Name": "Stakeholder presentations", "Current Time Spent %": 10, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": "Communication", "Secondary Skill": "Stakeholder Mgmt" },
    { "Task Name": "Data quality monitoring", "Current Time Spent %": 8, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Data Analysis", "Secondary Skill": "Process Automation" },
    { "Task Name": "Cross-team consulting", "Current Time Spent %": 7, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": "Leadership", "Secondary Skill": "Communication" },
    { "Task Name": "Tool evaluation", "Current Time Spent %": 5, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": "AI/ML Tools", "Secondary Skill": "Critical Thinking" },
  ];

  const redeploy = tasks.map(t => ({
    ...t,
    "Time Saved %": t["AI Impact"] === "High" ? Math.round(Number(t["Current Time Spent %"]) * 0.6) : t["AI Impact"] === "Moderate" ? Math.round(Number(t["Current Time Spent %"]) * 0.3) : Math.round(Number(t["Current Time Spent %"]) * 0.1),
    "Decision": t["AI Impact"] === "High" && t["Logic"] === "Deterministic" ? "Automate" : t["AI Impact"] === "Moderate" ? "Augment" : "Retain",
    "Technology": t["AI Impact"] === "High" && t["Logic"] === "Deterministic" ? "RPA / ETL Automation" : t["AI Impact"] === "Moderate" ? "AI-Assisted Analytics" : "Human-led",
    "Destination": t["Logic"] === "Deterministic" && t["AI Impact"] === "High" ? "AI / automation layer" : "Continue in role",
  }));

  // Seed multiple roles for realistic job catalog
  localStorage.setItem(`${projectId}_jobStates`, JSON.stringify({
    "Financial Analyst": { deconRows: [
      { "Task Name": "Monthly close reconciliation", "Current Time Spent %": 30, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Data Analysis", "Secondary Skill": "Process Automation" },
      { "Task Name": "Budget variance analysis", "Current Time Spent %": 20, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": "Critical Thinking", "Secondary Skill": "Data Analysis" },
      { "Task Name": "Financial modeling", "Current Time Spent %": 15, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": "Data Analysis", "Secondary Skill": "Critical Thinking" },
      { "Task Name": "Board reporting", "Current Time Spent %": 10, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": "Communication", "Secondary Skill": "Leadership" },
      { "Task Name": "Invoice processing oversight", "Current Time Spent %": 10, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": "Process Automation", "Secondary Skill": "Data Analysis" },
      { "Task Name": "Stakeholder data requests", "Current Time Spent %": 15, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": "Stakeholder Mgmt", "Secondary Skill": "Communication" },
    ], redeployRows: [], scenario: "Balanced", deconSubmitted: true, redeploySubmitted: false, finalized: false, recon: null, initialized: true },
    "Operations Coordinator": { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false },
    "HR Business Partner": { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false },
    "Data Analyst": { deconRows: tasks, redeployRows: redeploy, scenario: "Balanced", deconSubmitted: true, redeploySubmitted: true, finalized: false, recon: null, initialized: true }
  }));

  localStorage.setItem(`${projectId}_simState`, JSON.stringify({ scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 }));
  // Pre-configure Operating Model for tutorial
  localStorage.setItem(`${projectId}_omFn`, JSON.stringify("finance"));
  localStorage.setItem(`${projectId}_omArch`, JSON.stringify("platform"));
  localStorage.setItem(`${projectId}_odsState`, JSON.stringify({ activeScenario: 0, view: "overview" }));
  localStorage.setItem(`${projectId}_skillsConfirmed`, JSON.stringify(true));
  // Pre-seed gap dispositions
  localStorage.setItem(`${projectId}_gapDispositions`, JSON.stringify({
    "AI/ML Tools": "Close Internally",
    "AI Literacy": "Close Internally", 
    "Process Automation": "Close Internally",
    "Digital Fluency": "Close Internally",
    "Data Analysis": "Accept Risk",
    "Python/SQL": "Close Internally",
    "Cloud Platforms": "Hire Externally",
  }));

  // Pre-seed shortlisted candidates
  localStorage.setItem(`${projectId}_shortlisted`, JSON.stringify({
    "AI Operations Analyst": ["Sarah Chen", "James Rodriguez"],
    "AI Change Manager": ["Lisa Patel"],
  }));

  // Pre-seed BBBA overrides
  localStorage.setItem(`${projectId}_bbba_overrides`, JSON.stringify({
    "AI Operations Analyst": "Build",
    "Data Governance Lead": "Buy",
  }));

  // Pre-seed marketplace shortlist
  localStorage.setItem(`${projectId}_mp_shortlist`, JSON.stringify({
    "AI Operations Analyst": ["Sarah Chen"],
  }));

  // Pre-seed maturity scores (Finance + Platform)
  localStorage.setItem(`finance_platform_maturity`, JSON.stringify({
    "Accounting & Close": 3, "FP&A": 2, "Treasury": 2, "Tax": 1, "Audit": 2,
    "Procurement": 2, "AP/AR": 3, "Revenue": 2, "Reporting": 3, "Analytics": 1
  }));
  localStorage.setItem(`finance_platform_target`, JSON.stringify({
    "Accounting & Close": 4, "FP&A": 4, "Treasury": 3, "Tax": 3, "Audit": 3,
    "Procurement": 4, "AP/AR": 4, "Revenue": 3, "Reporting": 4, "Analytics": 4
  }));

  // Seed decision log with tutorial entries
  const co = getTutorialCompany(projectId);
  const empLabel = `${Math.min(co.employees, 500)} employees`;
  localStorage.setItem(`${projectId}_decisionLog`, JSON.stringify([
    { ts: new Date(Date.now() - 86400000).toISOString(), module: "Skills", action: "Inventory Confirmed", detail: `${empLabel} × 15 skills confirmed` },
    { ts: new Date(Date.now() - 72000000).toISOString(), module: "Work Design", action: "Deconstruction Submitted", detail: "Data Analyst: 8 tasks analyzed" },
    { ts: new Date(Date.now() - 50000000).toISOString(), module: "Work Design", action: "Redeployment Saved", detail: "Data Analyst: 45% time released through automation" },
    { ts: new Date(Date.now() - 36000000).toISOString(), module: "BBBA", action: "Disposition Override", detail: "AI Ops Analyst: Changed from Buy to Build" },
    { ts: new Date(Date.now() - 20000000).toISOString(), module: "Skills", action: "Gap Disposition Set", detail: "AI/ML Tools: Close Internally" },
  ]));

  // Seed risk register
  localStorage.setItem(`${projectId}_riskRegister`, JSON.stringify([
    { id: "R1", source: "Skills Gap", risk: "AI/ML Tools gap (delta -1.7) may be too large to close internally within 6 months", probability: "High", impact: "High", mitigation: "Consider hybrid Build + Borrow strategy", status: "Open" },
    { id: "R2", source: "Manager Capability", risk: "VP Operations scored 2.3 — flight risk during transformation", probability: "Medium", impact: "High", mitigation: "Immediate engagement with executive coach", status: "Open" },
    { id: "R3", source: "Change Readiness", risk: "28% of workforce in High Risk quadrant — could slow adoption", probability: "High", impact: "Medium", mitigation: "Deploy change champions at 1:5 ratio", status: "Open" },
    { id: "R4", source: "Headcount", risk: "Natural attrition may not absorb all role eliminations", probability: "Medium", impact: "Medium", mitigation: "Phase transitions over 18 months to allow attrition absorption", status: "Open" },
  ]));

  localStorage.setItem(`${projectId}_isTutorial`, JSON.stringify(true));
  localStorage.setItem(`${projectId}_tutorialStep`, JSON.stringify(0));
  localStorage.setItem(`${projectId}_page`, JSON.stringify("home"));

  // Model ID must match backend format: Tutorial_{Size}_{Industry}
  // _seed_tutorial_store generates: Tutorial_{size_tier.title()}_{industry.title().replace(' ', '_')}
  // projectId format: tutorial_{size}_{industry} e.g. tutorial_mid_technology
  const modelId = projectId.replace("tutorial_", "Tutorial_").split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("_");
  localStorage.setItem("lastModel", JSON.stringify(modelId));
  // NOTE: Backend seed is triggered by the grid click handler BEFORE calling seedTutorialData.
  // Do NOT call /api/tutorial/seed here — it would seed with wrong default params.
}


/* ═══ TUTORIAL STEPS — 27 micro-steps with data-aware copy ═══ */

// Company data mirrors backend COMPANY_DB for dynamic tutorial text
const TUTORIAL_COMPANIES: Record<string, Record<string, { name: string; employees: number }>> = {
  technology: { small: { name: "Spark Labs", employees: 150 }, mid: { name: "Nexus Technology Corp", employees: 2500 }, large: { name: "Titan Digital Systems", employees: 18000 } },
  financial_services: { small: { name: "Pinnacle Wealth Advisors", employees: 200 }, mid: { name: "Global Financial Partners", employees: 4200 }, large: { name: "Meridian Capital Group", employees: 22000 } },
  healthcare: { small: { name: "Valley Medical Center", employees: 350 }, mid: { name: "Meridian Health System", employees: 5500 }, large: { name: "National Health Partners", employees: 45000 } },
  manufacturing: { small: { name: "Precision Components Inc", employees: 180 }, mid: { name: "Atlas Manufacturing Group", employees: 3800 }, large: { name: "Continental Industrial Corp", employees: 28000 } },
  retail: { small: { name: "Urban Threads Boutique", employees: 120 }, mid: { name: "Horizon Retail Group", employees: 6000 }, large: { name: "American Marketplace Inc", employees: 52000 } },
  legal: { small: { name: "Barrett & Associates", employees: 45 }, mid: { name: "Sterling Legal Group", employees: 800 }, large: { name: "Global Law Alliance", employees: 5500 } },
  energy: { small: { name: "SunRidge Renewables", employees: 160 }, mid: { name: "Apex Energy Solutions", employees: 3200 }, large: { name: "Pacific Energy Holdings", employees: 35000 } },
  education: { small: { name: "Westbrook College", employees: 120 }, mid: { name: "Pacific University System", employees: 2800 }, large: { name: "National University Consortium", employees: 15000 } },
};

function getTutorialCompany(projectId: string): { name: string; employees: number; industry: string; size: string } {
  // projectId format: tutorial_{size}_{industry} e.g. tutorial_mid_technology
  const parts = projectId.replace("tutorial_", "").split("_");
  const size = parts[0] || "mid";
  const industry = parts.slice(1).join("_") || "technology";
  const co = TUTORIAL_COMPANIES[industry]?.[size] || TUTORIAL_COMPANIES.technology.mid;
  return { ...co, industry, size };
}

function buildTutorialSteps(projectId: string): { page: string; pos: "center"|"tr"|"tl"; icon: string; title: string; body: string; action?: string; subTab?: string }[] {
  const co = getTutorialCompany(projectId);
  const n = co.employees;
  const nm = co.name;
  // Approximate generated counts (backend caps at 2000)
  const genCount = Math.min(n, 2000);
  const fnCount = n <= 150 ? 4 : n <= 500 ? 6 : n <= 2000 ? 8 : 9;
  const mgrCount = Math.max(3, Math.round(genCount * 0.08));

  return [
  // ═══ WELCOME ═══
  { page: "home", pos: "center", icon: "🎓", title: "Welcome to Your AI Transformation Sandbox", body: `You're inside ${nm} — a ${co.industry.replace(/_/g, " ")} organization with ${n.toLocaleString()} employees, ${fnCount} functions, and multiple analyzed roles. Everything you see is real data flowing through real analytics. Explore freely — nothing you do here affects real projects.`, action: "Click Next to start the guided tour, or close this window and explore on your own" },

  // ═══ PHASE 1: DISCOVER ═══
  { page: "snapshot", pos: "center", icon: "📊", title: `Workforce Snapshot — ${nm} at a Glance`, body: `You're looking at ${nm}'s baseline: ${genCount.toLocaleString()} employees across ${fnCount} functions. The KPI cards show headcount, role count, task coverage, and AI readiness. These metrics are your starting point for any transformation conversation.`, action: "Look at the 6 KPI cards — each represents a key workforce metric" },
  { page: "snapshot", pos: "center", icon: "📊", title: "Understanding the Charts", body: "The function distribution chart shows relative headcount by department. The AI Impact donut will populate once you complete Work Design. The readiness radar shows relative scores across dimensions. These visuals are what you'd put in a steering committee deck.", action: "Click the ☕ button (bottom-right) and ask: 'Give me an executive summary of this workforce'" },

  { page: "jobs", pos: "center", icon: "🗂️", title: `Job Architecture — ${nm}'s Roles`, body: `The Job Catalog lists positions across ${fnCount} functions, from individual contributors to senior leadership. Notice the compensation range and career levels. This architecture feeds the Work Design Lab — every role here can be deconstructed into tasks.`, action: "Scroll down to see the job catalog. Then try the AI Job Profile Generator: type a role name and press Enter" },

  { page: "scan", pos: "center", icon: "🔬", title: "AI Opportunity Scan — Task-Level Scoring", body: `This module scores every task in ${nm}'s work design data. The AI Priority tab ranks tasks by automation potential. Tasks that are Repetitive + Deterministic + Independent score highest — the trifecta of automatable work. Judgment-heavy + Collaborative tasks score lowest.`, action: "Click 'AI Priority' tab — notice how the composite score combines automation potential, time impact, and feasibility" },
  { page: "scan", pos: "center", icon: "🔬", title: "Skills Analysis — Current vs Future", body: "The Skills tab shows current skill demand weighted by time allocation. After transformation, demand shifts: AI Literacy and Process Automation will grow while routine skills decline. This is the reskilling signal.", action: "Click the 'Skills' sub-tab to see the shift from current to future skill demand" },

  { page: "readiness", pos: "center", icon: "🎯", title: `AI Readiness — Who's Ready at ${nm}?`, body: `Each employee is scored on 5 dimensions: AI Awareness, Tool Adoption, Data Literacy, Change Openness, and AI Collaboration. High scorers are 'Ready Now' — they already work with data tools daily. Low scorers are 'At Risk' — they need intervention before transformation begins.`, action: "Switch to Individual Scores, then scroll down to see improvement plans — each dimension gets intervention type and timeline" },

  { page: "mgrcap", pos: "center", icon: "👔", title: `Manager Capability — ${nm}'s ~${mgrCount} Leaders`, body: `${nm} has approximately ${mgrCount} people managers. High-scoring managers become Transformation Champions. Low-scoring managers (below 2.5) are Flight Risks — they need immediate engagement. The correlation panel shows teams under strong managers have significantly higher readiness.`, action: "Click 'Team Correlation' tab — see how teams under strong managers show higher readiness scores" },

  // ═══ PHASE 2: DESIGN ═══
  { page: "skills", pos: "center", icon: "🧠", title: `Skills Inventory — ${nm}'s Proficiency Grid`, body: `You're seeing up to ${Math.min(genCount, 500)} employees × 15 skills. Experts (score 4) in core skills are your strongest assets. Employees at 1-2 in critical areas like AI/ML Tools need training. The coverage percentage shows assessment completeness — some cells may be blank.`, action: "Find any employee row and click a skill cell to update their proficiency. The edit saves instantly." },
  { page: "skills", pos: "center", icon: "🧠", title: "Gap Analysis — Where the Gaps Are", body: "After confirming the inventory, this tab shows gaps between current average and target proficiency. Critical gaps (delta > -1.5) mean significant investment in training. Small gaps (delta < -0.5) indicate existing strength.", action: "Click 'Gap Analysis' tab. Set the disposition for critical gaps: choose 'Close Internally' if you can train up, or 'Hire Externally' if the gap is too large", subTab: "gap" },
  { page: "skills", pos: "center", icon: "🧠", title: "Adjacency Map — Who Can Fill New Roles?", body: "Redesigned target roles are shown with adjacency scores for internal candidates. High matches (>70%) are strong Build candidates. No matches above 50% signal external hire needs. This drives your Build/Buy/Borrow/Automate strategy.", action: "Click 'Adjacency Map' tab. Set threshold to 60%. Shortlist top candidates by clicking ☆", subTab: "adjacency" },

  { page: "design", pos: "center", icon: "✏️", title: "Work Design Lab — Task Deep Dive", body: "Select a role from the sidebar. You'll see tasks with pre-filled time allocations, work characteristics, and AI impact scores. This is the core engine: every task gets analyzed by 4 characteristics (Task Type, Logic, Interaction, AI Impact) that determine what the AI recommends.", action: "Select a role from the Active Job dropdown in the sidebar" },
  { page: "design", pos: "center", icon: "✏️", title: "Deconstruction — How Tasks Break Down", body: "Look at the task table: tasks with Repetitive + Deterministic + Independent characteristics point to HIGH AI Impact — ~60% of time can be saved through automation. Tasks that are Judgment-heavy + Collaborative have LOW AI Impact — only ~10% savings.", action: "Study the pattern: Repetitive + Deterministic + Independent = High AI. Variable + Judgment-heavy + Collaborative = Low AI. This pattern applies to every role you'll ever analyze." },
  { page: "design", pos: "center", icon: "✏️", title: "Redeployment — The Decision Layer", body: "Each task gets a decision: Automate (via RPA), Augment (via GenAI), or Retain (human-led). The Time Saved % column shows freed capacity per task. Total savings vary by role but typically range from 25-45% of the work week.", action: "Try changing a task from Augment to Automate — watch the Time Saved jump. Then change it back to see why Augment may be the better choice for Probabilistic tasks" },
  { page: "design", pos: "center", icon: "✏️", title: "Reconstruction — The Future State", body: "The Impact tab shows the reconstruction: how many hours per week are released and what percentage of the role is freed up. This is the business case: either the person does more strategic work, or you need fewer people in this role.", action: "Review the Impact tab — the time release percentage is the key metric that feeds into the Simulator" },

  { page: "bbba", pos: "center", icon: "🔀", title: "Build/Buy/Borrow/Automate — Sourcing Strategy", body: "Based on gap analysis and adjacency scores, each redesigned role gets a recommendation. Roles with strong internal candidates get 'Build' (reskilling cost). Roles with no internal matches get 'Buy' (hiring cost). The investment summary shows total transformation cost.", action: "Click a disposition badge to override, then scroll down to see cost comparison bars and risk assessment per decision" },

  { page: "headcount", pos: "center", icon: "👥", title: "Headcount Waterfall — The Board View", body: `Starting at ${genCount.toLocaleString()} headcount: automation eliminates some roles, natural attrition absorbs part of the impact, internal redeployments fill new roles, and new hires cover the rest. The Net Change % is what your CFO will focus on — it determines if this is a 'growth transformation' or a 'restructure'.`, action: "Look at the Financial Impact section below — Net Year 1 tells you if this transformation pays for itself" },

  { page: "simulate", pos: "center", icon: "⚡", title: "Impact Simulator — Conservative vs Aggressive", body: "Conservative (30% AI adoption): small impact, safe timeline. Balanced (55%): moderate change, 10-month rollout. Aggressive (80%): maximum automation, fastest ROI but highest risk. Toggle between them and watch released hours swing from minimal to transformative. The Redeployment sliders decide WHERE freed time goes.", action: "Switch to Aggressive, then go to the Redeployment sub-tab. Set Higher-Value Work to 50% and Innovation to 30% — this is the 'growth reinvestment' strategy" },

  { page: "build", pos: "center", icon: "🏗️", title: "Org Design Studio — Structural Modeling", body: `Eight views model ${nm}'s future structure. Span of Control shows manager ratios. The Cost view shows payroll distribution by function. The Scenarios comparison lets you model structural changes like flattening layers or merging functions.`, action: "Click through Overview → Span of Control → Cost — notice which functions dominate headcount and cost" },

  // ═══ PHASE 3: DELIVER ═══
  { page: "reskill", pos: "center", icon: "📚", title: "Reskilling Pathways — Personal Learning Plans", body: "Each employee with skill gaps gets a personalized pathway. High-readiness employees with small gaps get short, low-cost training. Low-readiness employees with large gaps need intensive support. Priority scoring determines who gets trained first.", action: "Compare pathways across employees — notice how readiness level and gap size drive the recommended investment" },

  { page: "marketplace", pos: "center", icon: "🏪", title: "Talent Marketplace — Internal Matching", body: "The composite score combines adjacency percentage, readiness score, and reskilling timeline. Shortlist strong matches to commit them to a pathway. For roles where no one exceeds the threshold, the tool recommends external hire — that's a signal to your TA team.", action: "Shortlist top candidates by clicking ☆. Look for roles that recommend External Fill" },

  { page: "changeready", pos: "center", icon: "📈", title: `Change Readiness — ${nm}'s Risk Map`, body: "The 4-quadrant matrix: High Readiness + High Impact (Champions — deploy as advocates), Low Readiness + High Impact (highest risk — heavily impacted but not ready). Each quadrant has a specific intervention plan. The High Risk group needs intensive support for 6+ months.", action: "Click the red 'High Risk' quadrant to see which employees are in it — these are the people who need the most support" },

  { page: "mgrdev", pos: "center", icon: "🎓", title: "Manager Development — Deploying Champions", body: "High-scoring managers become Change Agents — they lead transformation for their function. Low-scoring managers need immediate engagement: executive coaching on Leading Through Ambiguity. Manager investment is typically the highest-leverage spend in the entire transformation.", action: "Compare high-scoring managers (deploy as agents, minimal cost) vs low-scoring (intensive coaching). Manager investment is high-leverage." },

  { page: "plan", pos: "center", icon: "🚀", title: "Change Planner — Auto-Generated Roadmap", body: "Click 'Auto-Build Plan' and the AI generates a complete roadmap from everything you've configured: which roles change, what skills need building, who needs support, what the timeline looks like. Every row is editable — change owners, priorities, waves. The timeline visualization shows initiatives sequenced across waves.", action: "Click '☕ Auto-Build Plan' — then edit an initiative's owner and priority to see how the tool supports your planning process" },

  { page: "opmodel", pos: "center", icon: "🧬", title: "Operating Model — The Architecture", body: "The Blueprint shows 5 layers: Governance, Core Components, Shared Services, Enabling, and Interface. Switch between archetypes (Functional, Platform, Matrix) to see how each layer transforms. The choice of archetype drives how your functions deliver services.", action: "Switch between archetypes — notice how Core Components and Enabling layers change dramatically" },
  { page: "opmodel", pos: "center", icon: "🧬", title: "Capability Maturity — Rate Each Component", body: "Click the Capability Maturity tab. Rate capabilities from 1 (Ad Hoc) to 5 (Optimized) for both Current and Target state. The tool calculates the gap automatically. A large gap signals heavy investment needed. Scores are persisted.", action: "Rate a few capabilities for Current and Target state — see the gap calculation update live" },

  // ═══ FINISH ═══
  { page: "home", pos: "center", icon: "🎉", title: "You've Mastered the Platform", body: `You've explored all 18 modules with real ${nm} data. You've seen how tasks drive AI impact scores, how skills gaps determine talent strategy, how manager capability multiplies team readiness, and how everything flows into a change plan and operating model. Now go build your own transformation.`, action: "Click '← Back to Projects' and create a New Project with your organization's data. Everything you learned here applies directly." },
];
}

// Default fallback for non-tutorial contexts
const TUTORIAL_STEPS = buildTutorialSteps("tutorial_mid_technology");


/* ═══ TUTORIAL OVERLAY — draggable, minimizable, centered window ═══ */
function TutorialOverlay({ step, totalSteps, steps, onNext, onPrev, onClose, onJump }: {
  step: number; totalSteps: number;
  steps: { page: string; pos: "center"|"tr"|"tl"; icon: string; title: string; body: string; action?: string; subTab?: string }[];
  onNext: () => void; onPrev: () => void; onClose: () => void; onJump: (s: number) => void;
}) {
  const s = steps[step];
  if (!s) return null;
  const isLast = step === totalSteps - 1;
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const phaseIdx = step === 0 ? -1 : step <= 7 ? 0 : step <= 19 ? 1 : 2;
  const phaseName = phaseIdx === 0 ? "Discover" : phaseIdx === 1 ? "Design" : phaseIdx === 2 ? "Deliver" : "";
  const phaseColor = phaseIdx === 0 ? "#D4860A" : phaseIdx === 1 ? "#C07030" : "#E8C547";

  // Mount animation
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(false); const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, [step]);

  // Draggable state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [centered, setCentered] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset to center when step changes
  useEffect(() => { setCentered(true); setMinimized(false); }, [step]);

  // Drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
    setCentered(false);
    if (centered) setPos({ x: rect.left, y: rect.top });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  // Minimized state — small pill in top right
  if (minimized) return <button onClick={() => setMinimized(false)} style={{
    position: "fixed", top: 12, right: 12, zIndex: 50,
    padding: "8px 16px", borderRadius: 14,
    background: "var(--surface-1)", border: "1px solid rgba(139,92,246,0.2)",
    color: "#A78BFA", fontSize: 12, fontWeight: 700,
    display: "flex", alignItems: "center", gap: 8,
    cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    transition: "all 0.3s",
  }} onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)"; }}>
    <span style={{ fontSize: 16 }}>🎓</span>
    <span>Tutorial — Step {step + 1}/{totalSteps}</span>
    <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(139,92,246,0.15)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "#8B5CF6", borderRadius: 2 }} />
    </div>
    <span style={{ fontSize: 10, opacity: 0.5 }}>▼</span>
  </button>;

  const cardWidth = 620;
  const cardStyle: React.CSSProperties = centered
    ? { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: cardWidth, zIndex: 50 }
    : { position: "fixed", left: pos.x, top: pos.y, width: cardWidth, zIndex: 50 };

  return <>
    {/* Light backdrop */}
    <div style={{ position: "fixed", inset: 0, zIndex: 44, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)", transition: "all 0.4s", pointerEvents: "none" }} />

    {/* Card */}
    <div ref={cardRef} style={{
      ...cardStyle,
      borderRadius: 22, overflow: "hidden",
      background: "var(--surface-1)", border: "1px solid rgba(139,92,246,0.2)",
      boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(139,92,246,0.08)",
      cursor: dragging ? "grabbing" : "default",
      transition: dragging ? "none" : "all 0.4s cubic-bezier(0.16,1,0.3,1)",
      pointerEvents: "auto",
      opacity: visible ? 1 : 0,
      transform: centered ? (visible ? "translate(-50%, -50%)" : "translate(-50%, -48%) scale(0.97)") : undefined,
    }}>

      {/* Draggable header bar */}
      <div onMouseDown={onMouseDown} style={{
        padding: "18px 24px 14px",
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))",
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
      }}>
        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 2, background: "var(--surface-3)", marginBottom: 14 }}>
          <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${phaseColor || "#8B5CF6"}, #8B5CF6)`, width: `${pct}%`, transition: "width 0.6s ease" }} />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <span style={{ fontSize: 36 }}>{s.icon}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#8B5CF6", letterSpacing: 1.2 }}>STEP {step + 1} OF {totalSteps}</span>
                {phaseName && <span style={{ fontSize: 10, fontWeight: 700, color: phaseColor, background: `${phaseColor}15`, padding: "2px 8px", borderRadius: 5 }}>{phaseName}</span>}
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{pct}%</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.25 }}>{s.title}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => setMinimized(true)} title="Minimize" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>—</button>
            <button onClick={onClose} title="Close tutorial" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "18px 28px 14px" }}>
        <p style={{ fontSize: 15, lineHeight: 1.85, color: "var(--text-secondary)", margin: 0 }}>{s.body}</p>
        {s.action && <div style={{ fontSize: 14, fontWeight: 600, color: "#A78BFA", background: "rgba(139,92,246,0.05)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(139,92,246,0.1)", marginTop: 14, display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.6 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>👉</span> <span>{s.action}</span>
        </div>}
      </div>

      {/* Step dots */}
      <div style={{ padding: "6px 28px 8px", display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
        {steps.map((ts, i) => <button key={i} onClick={() => onJump(i)} title={`Step ${i+1}: ${ts.title}`} style={{ width: i === step ? 16 : 7, height: 7, borderRadius: 4, background: i === step ? "#8B5CF6" : i < step ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)", border: "none", cursor: "pointer", transition: "all 0.3s", flexShrink: 0 }} />)}
      </div>

      {/* Controls */}
      <div style={{ padding: "8px 28px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onPrev} disabled={step === 0} style={{ padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: step === 0 ? "not-allowed" : "pointer", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", opacity: step === 0 ? 0.25 : 1, transition: "all 0.2s" }}>← Previous</button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setMinimized(true)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", background: "none", border: "1px solid var(--border)", color: "var(--text-muted)" }}>Minimize</button>
          <button onClick={onClose} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)" }}>End Tour</button>
        </div>
        <button onClick={onNext} style={{ padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", color: "#fff", background: isLast ? "linear-gradient(135deg, #10B981, #059669)" : `linear-gradient(135deg, ${phaseColor || "#8B5CF6"}, #8B5CF6)`, boxShadow: `0 4px 14px ${isLast ? "rgba(16,185,129,0.25)" : "rgba(139,92,246,0.25)"}`, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>{isLast ? "🎉 Complete Tutorial" : "Next Step →"}</button>
      </div>
    </div>
  </>;
}

/* ═══ TUTORIAL BADGE — persistent reopener with progress ═══ */
function TutorialBadge({ onClick, step, total }: { onClick: () => void; step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return <button onClick={onClick} style={{ position: "fixed", bottom: 80, left: 24, zIndex: 40, padding: "8px 14px", borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "var(--surface-1)", border: "1px solid rgba(139,92,246,0.15)", color: "#A78BFA", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", transition: "all 0.3s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)"; }}>
    <span>🎓</span>
    <span>Tutorial</span>
    <span style={{ fontSize: 9, opacity: 0.5 }}>{pct}%</span>
    <div style={{ width: 28, height: 3, borderRadius: 2, background: "rgba(139,92,246,0.12)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "#8B5CF6", borderRadius: 2 }} /></div>
  </button>;
}




/* ═══════════════════════════════════════════════════════════════
   PROJECT HUB — Hero splash + project management
   ═══════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════
   PROJECT HUB
   ═══════════════════════════════════════════════════════════════ */
function ProjectHub({ onOpenProject }: { onOpenProject: (p: { id: string; name: string; meta: string }) => void }) {
  const [projects, setProjects] = useState<{ id: string; name: string; meta: string; client?: string; industry?: string; size?: string; lead?: string; created: string; status: string }[]>(() => {
    if (typeof window === "undefined") return [];
    try { const saved = localStorage.getItem("hub_projects"); if (saved) return JSON.parse(saved); } catch {}
    return [];
  });
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newLead, setNewLead] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [seedingId, setSeedingId] = useState<string | null>(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxPanelOpen, setSandboxPanelOpen] = useState(false);

  // Load projects from localStorage (deferred for SSR safety)
  useEffect(() => {
    try { const saved = localStorage.getItem("hub_projects"); if (saved) setProjects(JSON.parse(saved)); } catch {}
    setLoaded(true);
  }, []);

  // Save projects — only after initial load
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("hub_projects", JSON.stringify(projects));
  }, [projects, loaded]);

  const createProject = () => {
    if (!newName.trim()) return;
    const metaParts = [newClient, newIndustry, newSize, newLead, newDesc].filter(Boolean).join(" · ");
    const p = { id: `proj_${Date.now()}`, name: newName.trim(), meta: metaParts.trim(), client: newClient.trim(), industry: newIndustry, size: newSize, lead: newLead.trim(), created: new Date().toLocaleDateString(), status: "Not Started" };
    const updated = [...projects, p];
    setProjects(updated);
    // Save immediately before navigating away
    localStorage.setItem("hub_projects", JSON.stringify(updated));
    setNewName(""); setNewDesc(""); setNewClient(""); setNewIndustry(""); setNewSize(""); setNewLead(""); setModalOpen(false);
    onOpenProject(p);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem("hub_projects", JSON.stringify(updated));
    Object.keys(localStorage).filter(k => k.includes(id)).forEach(k => localStorage.removeItem(k));
    setConfirmDelete(null);
  };

  // Adaptive card sizing
  const count = projects.length + 2; // +2 for sandbox + new project
  const cardWidth = count <= 3 ? 380 : count <= 5 ? 300 : count <= 7 ? 260 : 220;

  // ── Sandbox full-screen picker ──
  if (sandboxOpen) {
    return <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0B1120" }}>
      {/* Full-bleed storefront background */}
      <div className="hub-bg" />
      <div style={{ position: "absolute", inset: 0, background: sandboxPanelOpen ? "rgba(8,12,24,0.55)" : "radial-gradient(ellipse at 35% 40%, rgba(8,12,24,0.1) 0%, rgba(8,12,24,0.35) 50%, rgba(8,12,24,0.6) 100%)", transition: "background 0.5s ease" }} />

      {/* Back button */}
      <button onClick={() => { setSandboxOpen(false); setSandboxPanelOpen(false); }} style={{ position: "absolute", top: 24, left: 24, zIndex: 30, padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.12)", color: "rgba(255,230,200,0.8)", transition: "all 0.2s" }}>← Back</button>

      {/* Click-to-open area */}
      {!sandboxPanelOpen && <div style={{ position: "absolute", inset: 0, zIndex: 10, cursor: "pointer" }} onClick={() => setSandboxPanelOpen(true)}>
        <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🎓</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,245,235,0.95)", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>Industry Sandbox</div>
          <div className="animate-pulse" style={{ padding: "10px 24px", borderRadius: 16, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(200,180,255,0.8)", fontSize: 14, fontWeight: 600 }}>Click anywhere to explore →</div>
        </div>
      </div>}

      {/* Slide-in panel from right */}
      <div style={{ position: "absolute", zIndex: 20, top: 0, right: 0, bottom: 0, width: sandboxPanelOpen ? "55%" : "0%", overflow: "hidden", transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ width: "100%", height: "100%", background: "rgba(11,17,32,0.94)", backdropFilter: "blur(32px)", borderLeft: "1px solid rgba(139,92,246,0.1)", display: "flex", flexDirection: "column", padding: sandboxPanelOpen ? "32px" : "32px 0", opacity: sandboxPanelOpen ? 1 : 0, transition: "opacity 0.5s ease 0.2s, padding 0.7s ease", overflowY: "auto" }}>
          {/* Panel header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,245,235,0.95)" }}>🎓 Industry Sandbox</div>
              <div style={{ fontSize: 12, color: "rgba(200,180,255,0.4)", marginTop: 4 }}>24 pre-built organizations · 8 industries × 3 sizes</div>
            </div>
            <button onClick={() => setSandboxPanelOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,150,0.08)", cursor: "pointer", color: "rgba(255,200,150,0.4)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Industry × Size Grid */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4 }}>
              <thead><tr>
                <th style={{ fontSize: 10, color: "rgba(200,180,255,0.3)", textAlign: "left", padding: "6px 10px", fontWeight: 700 }}>INDUSTRY</th>
                <th style={{ fontSize: 10, color: "rgba(16,185,129,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>SMALL</th>
                <th style={{ fontSize: 10, color: "rgba(212,134,10,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>MID-CAP</th>
                <th style={{ fontSize: 10, color: "rgba(239,68,68,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>LARGE-CAP</th>
              </tr></thead>
              <tbody>{[
                { id: "technology", icon: "💻", label: "Technology", s: "Spark Labs · 150", m: "Nexus Corp · 2,500", l: "Titan Digital · 18,000" },
                { id: "financial_services", icon: "🏦", label: "Financial Svc", s: "Pinnacle · 200", m: "Global FP · 4,200", l: "Meridian Cap · 22,000" },
                { id: "healthcare", icon: "🏥", label: "Healthcare", s: "Valley Med · 350", m: "Meridian Health · 5,500", l: "National HP · 45,000" },
                { id: "manufacturing", icon: "🏭", label: "Manufacturing", s: "Precision · 180", m: "Atlas Mfg · 3,800", l: "Continental · 28,000" },
                { id: "retail", icon: "🛍️", label: "Retail", s: "Urban Threads · 120", m: "Horizon · 6,000", l: "American MP · 52,000" },
                { id: "legal", icon: "⚖️", label: "Legal", s: "Barrett · 45", m: "Sterling · 800", l: "Global Law · 5,500" },
                { id: "energy", icon: "⚡", label: "Energy", s: "SunRidge · 160", m: "Apex Energy · 3,200", l: "Pacific Energy · 35,000" },
                { id: "education", icon: "🎓", label: "Education", s: "Westbrook · 120", m: "Pacific Univ · 2,800", l: "National UC · 15,000" },
              ].map(ind => <tr key={ind.id}>
                <td style={{ fontSize: 12, color: "rgba(200,180,255,0.7)", padding: "3px 10px", fontWeight: 600 }}><span style={{ marginRight: 6 }}>{ind.icon}</span>{ind.label}</td>
                {[{size: "small", info: ind.s, color: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#6EE7B7"}, {size: "mid", info: ind.m, color: "rgba(212,134,10,0.12)", border: "rgba(212,134,10,0.25)", text: "#E8C547"}, {size: "large", info: ind.l, color: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", text: "#FCA5A5"}].map(t => <td key={t.size} style={{ padding: 2 }}><button disabled={!!seedingId} onClick={async (e) => {
                  e.stopPropagation();
                  const tid = `tutorial_${t.size}_${ind.id}`;
                  setSeedingId(tid);
                  try { await fetch(`/api/tutorial/seed?industry=${ind.id}&size=${t.size}`); } catch {}
                  seedTutorialData(tid, ind.id);
                  setSeedingId(null);
                  onOpenProject({ id: tid, name: `${ind.icon} ${ind.label} — ${t.size === "small" ? "Small" : t.size === "mid" ? "Mid-Cap" : "Large-Cap"}`, meta: `${t.info} · Guided Tour` });
                }} style={{ width: "100%", padding: "7px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, cursor: seedingId ? "wait" : "pointer", background: seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.25)" : t.color, border: `1px solid ${seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.5)" : t.border}`, color: t.text, transition: "all 0.2s", textAlign: "center", lineHeight: 1.4, opacity: seedingId && seedingId !== `tutorial_${t.size}_${ind.id}` ? 0.4 : 1 }} onMouseEnter={e => { if (!seedingId) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.borderColor = t.text; }}} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = t.border; }}>{seedingId === `tutorial_${t.size}_${ind.id}` ? "⏳ Loading..." : t.info}</button></td>)}
              </tr>)}</tbody>
            </table>
          </div>

          {/* Guided tour note */}
          <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(139,92,246,0.7)", marginBottom: 4 }}>✨ Each sandbox includes:</div>
            <div style={{ fontSize: 11, color: "rgba(200,180,255,0.4)", lineHeight: 1.6 }}>Full employee roster · Task-level work design · Skills inventory · AI readiness scores · Manager capability · Change readiness · 27-step guided tutorial</div>
          </div>
        </div>
      </div>
    </div>;
  }

  return <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#0B1120" }}>
    {/* Full-bleed background */}
    <div className="hub-bg" />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(11,17,32,0.25) 0%, rgba(11,17,32,0.45) 40%, rgba(11,17,32,0.7) 100%)", width: "100vw", height: "100vh" }} />

    {/* Content */}
    <div style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3" style={{ fontFamily: "Outfit, sans-serif", textShadow: "0 2px 24px rgba(0,0,0,0.3)" }}>Your Projects</h1>
        <p className="text-[15px]" style={{ color: "rgba(255,220,180,0.5)" }}>Select a project or create a new one</p>
      </div>

      <div className="flex gap-5 flex-wrap justify-center" style={{ maxWidth: 1200 }}>
        {/* Sandbox card — opens full-screen picker */}
        <div onClick={() => setSandboxOpen(true)} style={{ width: cardWidth, minHeight: 180, borderRadius: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))", backdropFilter: "blur(20px)", border: "1px solid rgba(139,92,246,0.2)", position: "relative", overflow: "hidden" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(99,102,241,0.15)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)"; }}>
          <div className="text-4xl" style={{ filter: "drop-shadow(0 2px 8px rgba(139,92,246,0.3))" }}>🎓</div>
          <div className="text-[16px] font-bold text-white">Sandbox</div>
          <div className="text-[11px]" style={{ color: "rgba(200,180,255,0.4)" }}>24 pre-built orgs</div>
        </div>

        {/* New Project card — glassmorphic with sparkle */}
        <div onClick={() => setModalOpen(true)} style={{ width: cardWidth, minHeight: 180, borderRadius: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", background: "rgba(255,230,200,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,200,150,0.15)", position: "relative", overflow: "hidden" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.2)"; e.currentTarget.style.background = "rgba(255,230,200,0.18)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "rgba(255,230,200,0.1)"; }}>
          <div className="text-4xl" style={{ filter: "drop-shadow(0 2px 8px rgba(200,120,40,0.3))" }}>✨</div>
          <div className="text-[16px] font-bold text-white">New Project</div>
          <div className="text-[12px]" style={{ color: "rgba(255,220,180,0.4)" }}>Start a transformation</div>
        </div>

        {/* Existing project cards */}
        {projects.map(p => {
          let pStatus = p.status;
          try { const v = localStorage.getItem(`${p.id}_visited`); if (v && Object.keys(JSON.parse(v)).length > 0) pStatus = "In Progress"; } catch {}
          try { const vm = localStorage.getItem(`${p.id}_viewMode`); if (vm) pStatus = "In Progress"; } catch {}
          const statusColor = pStatus === "In Progress" ? "#E09040" : pStatus === "Complete" ? "#10B981" : "rgba(255,200,150,0.3)";
          // Count modules visited
          let modulesVisited = 0;
          try { const v = localStorage.getItem(`${p.id}_visited`); if (v) modulesVisited = Object.keys(JSON.parse(v)).length; } catch {}

          return <div key={p.id} onClick={() => onOpenProject(p)} style={{ width: cardWidth, minHeight: 220, borderRadius: 22, cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "24px 24px 20px", transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", position: "relative" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.2)"; e.currentTarget.style.borderColor = "rgba(255,200,150,0.2)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
            <div>
              <div className="flex items-start justify-between mb-1">
                <div className="text-[17px] font-bold text-white">{p.name}</div>
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(p.id); }} style={{ opacity: 0, transition: "opacity 0.2s", color: "rgba(255,255,255,0.2)", fontSize: 14, background: "none", border: "none", cursor: "pointer" }} onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "#ef4444"; }} onMouseLeave={e => { e.currentTarget.style.opacity = "0"; }}>✕</button>
              </div>
              {p.client && <div className="text-[12px] font-semibold mb-1" style={{ color: "rgba(255,220,180,0.6)" }}>{p.client}</div>}
              <div className="flex gap-1.5 flex-wrap mb-2">
                {p.industry && <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: "rgba(212,134,10,0.15)", color: "rgba(232,197,71,0.8)" }}>{p.industry}</span>}
                {p.size && <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "rgba(100,220,180,0.8)" }}>{p.size}</span>}
              </div>
              {p.lead && <div className="text-[10px] mb-1" style={{ color: "rgba(255,220,180,0.3)" }}>Lead: {p.lead}</div>}
              {p.meta && !p.client && <div className="text-[11px] italic mb-2" style={{ color: "rgba(255,220,180,0.25)" }}>{p.meta}</div>}
            </div>
            <div>
              {/* Progress bar */}
              {modulesVisited > 0 && <div className="mb-2"><div className="flex justify-between text-[9px] mb-0.5" style={{ color: "rgba(255,255,255,0.2)" }}><span>Progress</span><span>{modulesVisited}/8 modules</span></div><div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}><div className="h-full rounded-full" style={{ width: `${(modulesVisited / 8) * 100}%`, background: statusColor }} /></div></div>}
              <div className="flex items-center justify-between">
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.15)" }}>{p.created}</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: statusColor }}>{pStatus}</span>
                </div>
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 20, right: 24, fontSize: 12, fontWeight: 600, color: "rgba(255,200,150,0.25)" }}>OPEN →</div>
          </div>;
        })}
      </div>
    </div>

    {/* Create modal */}
    {modalOpen && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl p-8 w-full max-w-md" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">New Transformation Project</h2>
        <p className="text-[12px] text-[var(--text-muted)] mb-5">Fill in the details below to set up your workspace</p>
        <div className="space-y-3">
          <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Project Name *</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Acme Corp AI Transformation" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" autoFocus /></div>
          <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Client / Organization</div>
          <input value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="e.g. Acme Corporation" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Industry</div>
            <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none">
              <option value="">Select industry...</option>
              {["Financial Services","Technology","Healthcare","Manufacturing","Retail","Energy","Media","Professional Services","Public Sector","Other"].map(i => <option key={i} value={i}>{i}</option>)}
            </select></div>
            <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Org Size</div>
            <select value={newSize} onChange={e => setNewSize(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none">
              <option value="">Select size...</option>
              {["< 500 employees","500 - 2,000","2,000 - 10,000","10,000 - 50,000","50,000+"].map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>
          </div>
          <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Project Lead</div>
          <input value={newLead} onChange={e => setNewLead(e.target.value)} placeholder="e.g. Jane Smith, VP Transformation" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
          <div><div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Description / Objectives</div>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What are the goals of this transformation? What functions are in scope?" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] resize-none" rows={3} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={() => { setModalOpen(false); setNewName(""); setNewDesc(""); setNewClient(""); setNewIndustry(""); setNewSize(""); setNewLead(""); }} className="px-4 py-2.5 text-[13px] text-[var(--text-muted)] rounded-xl border border-[var(--border)]">Cancel</button>
          <button onClick={createProject} disabled={!newName.trim()} className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Create Project</button>
        </div>
      </div>
    </div>}

    {/* Delete confirmation */}
    {confirmDelete && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
      <div className="rounded-2xl p-6 w-full max-w-sm text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <div className="text-3xl mb-2">⚠️</div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">Delete Project?</h3>
        <p className="text-[13px] text-[var(--text-secondary)] mb-4">This will not be recoverable.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setConfirmDelete(null)} className="px-5 py-2 rounded-xl text-[13px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">No</button>
          <button onClick={() => deleteProject(confirmDelete)} className="px-5 py-2 rounded-xl text-[13px] font-semibold bg-[var(--risk)] text-white">Yes, Delete</button>
        </div>
      </div>
    </div>}
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   AUTH GATE — Login / Register screen with Transformation Cafe bg
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   AUTH GATE
   ═══════════════════════════════════════════════════════════════ */
/** Validate email — matches backend _validate_email_strict rules. */
function isValidEmail(email: string): boolean {
  const v = email.trim().toLowerCase();
  if (!v) return false;
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)) return false;
  const atIdx = v.lastIndexOf("@");
  const local = v.slice(0, atIdx);
  const domain = v.slice(atIdx + 1);
  if (local.length < 2) return false;
  if (domain.length < 4) return false;
  const parts = domain.split(".");
  if (parts.length < 2 || parts[parts.length - 1].length < 2) return false;
  if (parts[0].length < 2) return false;
  const fakes = ["test.com", "test.test", "example.com", "example.org", "fake.com", "asdf.com", "aaa.com", "xxx.com", "temp.com"];
  if (fakes.includes(domain)) return false;
  return true;
}

function AuthGate({ onAuth }: { onAuth: (user: authApi.AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [message, setMessage] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwC, setShowPwC] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [successUser, setSuccessUser] = useState<authApi.AuthUser | null>(null);

  // Username availability check (debounced)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Email availability check (debounced)
  const [emailAvailable, setEmailAvailable] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emailValid = isValidEmail(email);
  const showEmailFormatError = emailTouched && email.length > 0 && !emailValid;
  const showEmailFormatOk = emailTouched && email.length > 0 && emailValid;

  // Load remembered credentials on mount
  useEffect(() => {
    setError("");
    const saved = authApi.getRememberedCredentials();
    if (saved) { setUsername(saved.username); setPassword(saved.password); setRememberMe(true); }
  }, []);

  // Debounced username availability check
  useEffect(() => {
    if (mode !== "register" || username.length < 3) {
      setUsernameStatus(username.length > 0 && username.length < 3 ? "invalid" : "idle");
      setUsernameSuggestions([]);
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    usernameTimerRef.current = setTimeout(async () => {
      const result = await authApi.checkUsername(username);
      setUsernameStatus(result.available ? "available" : result.reason === "invalid" ? "invalid" : "taken");
      setUsernameSuggestions(result.suggestions || []);
    }, 500);
    return () => { if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current); };
  }, [username, mode]);

  // Debounced email availability check
  useEffect(() => {
    if (mode !== "register" || !emailValid) { setEmailAvailable("idle"); return; }
    setEmailAvailable("checking");
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    emailTimerRef.current = setTimeout(async () => {
      const result = await authApi.checkEmail(email.trim().toLowerCase());
      setEmailAvailable(result.available ? "available" : "taken");
    }, 500);
    return () => { if (emailTimerRef.current) clearTimeout(emailTimerRef.current); };
  }, [email, emailValid, mode]);

  // Auto-fill display name from username
  useEffect(() => {
    if (mode === "register" && username && !displayName) setDisplayName(username);
  }, [username, mode, displayName]);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const d = await authApi.login(username, password);
      if (rememberMe) authApi.saveRememberedCredentials(username, password);
      else authApi.clearRememberedCredentials();
      onAuth(d.user as authApi.AuthUser);
    }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Login failed"); setShakeError(true); setTimeout(() => setShakeError(false), 600); }
    setLoading(false);
  };

  const handleRegister = async () => {
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError("Email is required"); return; }
    if (!isValidEmail(cleanEmail)) { setError("Please enter a valid email address"); return; }
    if (password !== passwordConfirm) { setError("Passwords do not match"); return; }
    if (!agreeTerms) { setError("Please agree to the Terms of Service"); return; }
    setLoading(true);
    try {
      const d = await authApi.register(username, password, passwordConfirm, cleanEmail, displayName || username);
      setSuccessUser(d.user as authApi.AuthUser);
    }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Registration failed"); setShakeError(true); setTimeout(() => setShakeError(false), 600); }
    setLoading(false);
  };

  const handleForgot = async () => {
    setError(""); setMessage("");
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) { setError("Please enter a valid email address"); return; }
    setLoading(true);
    try {
      const d = await authApi.forgotPassword(cleanEmail);
      if ((d as Record<string, unknown>).token) { setResetToken((d as Record<string, unknown>).token as string); setMessage("Reset token generated. Enter it below with your new password."); setMode("reset"); }
      else { setMessage((d as Record<string, unknown>).message as string); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  };
  const handleReset = async () => {
    setError(""); setMessage(""); setLoading(true);
    try { await authApi.resetPassword(resetToken, password, passwordConfirm); setMessage("Password reset! You can now log in."); setMode("login"); setPassword(""); setPasswordConfirm(""); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Reset failed"); }
    setLoading(false);
  };

  const pwReqs = [
    { ok: password.length >= 8, t: "8+ characters" },
    { ok: /[A-Z]/.test(password), t: "Uppercase" },
    { ok: /[a-z]/.test(password), t: "Lowercase" },
    { ok: /[0-9]/.test(password), t: "Number" },
    { ok: /[!@#$%^&*(),.?":{}|<>]/.test(password), t: "Special char" },
  ];
  const pwScore = pwReqs.filter(r => r.ok).length;
  const pwStrengthLabel = pwScore <= 1 ? "Weak" : pwScore <= 2 ? "Fair" : pwScore <= 3 ? "Good" : pwScore <= 4 ? "Strong" : "Excellent";
  const pwColors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981"];
  const pwStrengthColor = pwScore > 0 ? pwColors[Math.min(pwScore - 1, 4)] : "rgba(255,255,255,0.1)";
  const allPwOk = pwReqs.every(r => r.ok);
  const pwMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const pwMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  const canSubmitRegister = emailValid && emailAvailable !== "taken" && usernameStatus === "available" && allPwOk && pwMatch && agreeTerms && !loading;

  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", color: "#f5e6d0", fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box" as const, backdropFilter: "blur(4px)", transition: "border-color 0.2s" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" as const, letterSpacing: "1.5px" };
  const btnStyle: React.CSSProperties = { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #e09040, #c07030)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.5px", boxShadow: "0 4px 20px rgba(224,144,64,0.3)", transition: "all 0.3s" };
  const hintStyle: React.CSSProperties = { fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", marginTop: 3, display: "flex", alignItems: "center", gap: 4 };
  const focusBorder = "rgba(224,144,64,0.5)";

  // ── Welcome modal after successful registration ──
  if (successUser) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="auth-bg" />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(10,8,5,0.3) 0%, rgba(10,8,5,0.75) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, padding: "0 24px", textAlign: "center" }}>
          <div style={{ background: "rgba(15,12,8,0.7)", backdropFilter: "blur(30px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: "40px 32px", boxShadow: "0 32px 100px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f5e6d0", marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>Welcome, {successUser.display_name || successUser.username}!</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 28, lineHeight: 1.6 }}>Your account is ready. Start exploring the AI Transformation Platform.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { sessionStorage.setItem("fresh_login", "1"); onAuth(successUser); }}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f5e6d0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
                Take the Tour
              </button>
              <button onClick={() => onAuth(successUser)}
                style={{ ...btnStyle, flex: 1, padding: "12px" }}>
                Jump In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="auth-bg" />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(10,8,5,0.15) 0%, rgba(10,8,5,0.6) 100%)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.5px", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>AI Transformation</div>
          <div style={{ fontSize: 11, color: "rgba(224,144,64,0.85)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "5px", textTransform: "uppercase" as const, marginTop: 4, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>Platform</div>
        </div>

        <div style={{ background: "rgba(15,12,8,0.65)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: "32px 28px", boxShadow: "0 32px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)", animation: shakeError ? "shake 0.5s ease" : undefined }}>
          <style>{`@keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
            @keyframes pulseBtn { 0%,100% { box-shadow: 0 4px 20px rgba(224,144,64,0.3); } 50% { box-shadow: 0 4px 28px rgba(224,144,64,0.5); } }`}</style>

          {(mode === "login" || mode === "register") && (
            <div style={{ display: "flex", gap: 3, marginBottom: 22, background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: 3 }}>
              {(["login", "register"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); setMessage(""); }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "'Outfit', sans-serif", border: "none", cursor: "pointer", transition: "all 0.25s",
                    background: mode === m ? "rgba(224,144,64,0.18)" : "transparent",
                    color: mode === m ? "#e09040" : "rgba(255,255,255,0.35)",
                  }}>{m === "login" ? "Sign In" : "Create Account"}</button>
              ))}
            </div>
          )}

          {mode === "forgot" && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>← Back to Sign In</button>
              <h3 style={{ color: "#f5e6d0", fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>Forgot Password</h3>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 4 }}>Enter your email to receive a reset link.</p>
            </div>
          )}
          {mode === "reset" && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>← Back to Sign In</button>
              <h3 style={{ color: "#f5e6d0", fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>Reset Password</h3>
            </div>
          )}

          {error && error.trim() && <div style={{ background: "rgba(220,50,50,0.12)", border: "1px solid rgba(220,50,50,0.25)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, color: "#f08080", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>{error}</div>}
          {message && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, color: "#6ee7b7", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>{message}</div>}

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <form onSubmit={e => { e.preventDefault(); handleLogin(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }} autoComplete="on" noValidate>
              <div><label style={labelStyle}>Username</label><input value={username} onChange={e => setUsername(e.target.value)} onInvalid={e => e.preventDefault()} formNoValidate placeholder="Enter username" style={inputStyle} autoComplete="username" name="username" onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} /></div>
              <div><label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onInvalid={e => e.preventDefault()} formNoValidate placeholder="Enter password" style={{ ...inputStyle, paddingRight: 44 }} autoComplete="off" name="password" onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13 }}>{showPw ? "🙈" : "👁"}</button>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={rememberMe} onChange={e => { setRememberMe(e.target.checked); if (!e.target.checked) authApi.clearRememberedCredentials(); }} style={{ accentColor: "#e09040", width: 14, height: 14 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace" }}>Remember me</span>
              </label>
              <button type="submit" disabled={loading || !username || !password} style={{ ...btnStyle, opacity: loading ? 0.5 : 1, marginTop: 2 }}>{loading ? "Signing in..." : "Sign In"}</button>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>Forgot password?</button>
            </form>
          )}

          {/* ── REGISTER (premium experience) ── */}
          {mode === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Email */}
              <div>
                <label style={labelStyle}>Email</label>
                <div style={{ position: "relative" }}>
                  <input value={email} onChange={e => { setEmail(e.target.value); if (!emailTouched) setEmailTouched(true); }} onBlur={() => setEmailTouched(true)} placeholder="your@email.com" type="email" style={{ ...inputStyle, paddingRight: 36, borderColor: showEmailFormatError || emailAvailable === "taken" ? "rgba(239,68,68,0.5)" : showEmailFormatOk && emailAvailable === "available" ? "rgba(16,185,129,0.4)" : undefined }} autoComplete="email" onFocus={e => { if (!showEmailFormatError) e.currentTarget.style.borderColor = focusBorder; }} />
                  {emailAvailable === "checking" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#f59e0b", fontSize: 11 }}>...</span>}
                  {emailAvailable === "available" && showEmailFormatOk && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#10b981", fontSize: 15 }}>✓</span>}
                  {showEmailFormatError && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 13 }}>✕</span>}
                  {emailAvailable === "taken" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 13 }}>✕</span>}
                </div>
                {showEmailFormatError && <span style={{ ...hintStyle, color: "#ef4444" }}>Please enter a valid email address</span>}
                {emailAvailable === "taken" && <span style={{ ...hintStyle, color: "#ef4444" }}>An account with this email already exists — <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: "#e09040", cursor: "pointer", fontSize: 9, fontFamily: "inherit", textDecoration: "underline" }}>sign in instead?</button></span>}
                {emailAvailable === "available" && showEmailFormatOk && <span style={{ ...hintStyle, color: "#10b981" }}>Valid email</span>}
              </div>

              {/* Username */}
              <div>
                <label style={labelStyle}>Username</label>
                <div style={{ position: "relative" }}>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" style={{ ...inputStyle, paddingRight: 36, borderColor: usernameStatus === "taken" || usernameStatus === "invalid" ? "rgba(239,68,68,0.5)" : usernameStatus === "available" ? "rgba(16,185,129,0.4)" : undefined }} autoComplete="username" name="username" onFocus={e => { if (usernameStatus !== "taken" && usernameStatus !== "invalid") e.currentTarget.style.borderColor = focusBorder; }} />
                  {usernameStatus === "checking" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#f59e0b", fontSize: 11 }}>...</span>}
                  {usernameStatus === "available" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#10b981", fontSize: 15 }}>✓</span>}
                  {usernameStatus === "taken" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 13 }}>✕</span>}
                  {usernameStatus === "invalid" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 13 }}>✕</span>}
                </div>
                {usernameStatus === "available" && <span style={{ ...hintStyle, color: "#10b981" }}>Available</span>}
                {usernameStatus === "taken" && <span style={{ ...hintStyle, color: "#ef4444" }}>Username already taken</span>}
                {usernameStatus === "invalid" && <span style={{ ...hintStyle, color: "#ef4444" }}>3-30 characters, letters, numbers, underscores only</span>}
                {usernameStatus === "taken" && usernameSuggestions.length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {usernameSuggestions.map(s => <button key={s} onClick={() => setUsername(s)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(224,144,64,0.3)", background: "rgba(224,144,64,0.08)", color: "#e09040", fontSize: 10, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>{s}</button>)}
                </div>}
              </div>

              {/* Display Name */}
              <div>
                <label style={labelStyle}>Display Name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How others will see you" style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} />
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" style={{ ...inputStyle, paddingRight: 44 }} autoComplete="new-password" name="password" onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13 }}>{showPw ? "🙈" : "👁"}</button>
                </div>
                {password.length > 0 && <>
                  <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                    {[1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= pwScore ? pwColors[Math.min(pwScore - 1, 4)] : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 5, gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {pwReqs.map(r => <span key={r.t} style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: r.ok ? "#10b981" : "rgba(255,255,255,0.25)", transition: "color 0.2s" }}>{r.ok ? "✓" : "○"} {r.t}</span>)}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: pwStrengthColor, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{pwStrengthLabel}</span>
                  </div>
                </>}
              </div>

              {/* Confirm Password */}
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPwC ? "text" : "password"} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Type password again" style={{ ...inputStyle, paddingRight: 44, borderColor: pwMismatch ? "rgba(239,68,68,0.5)" : pwMatch ? "rgba(16,185,129,0.4)" : undefined }} autoComplete="new-password" name="password_confirm" onFocus={e => { if (!pwMismatch) e.currentTarget.style.borderColor = focusBorder; }} />
                  <button type="button" onClick={() => setShowPwC(!showPwC)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13 }}>{showPwC ? "🙈" : "👁"}</button>
                </div>
                {pwMatch && <span style={{ ...hintStyle, color: "#10b981" }}>Passwords match</span>}
                {pwMismatch && <span style={{ ...hintStyle, color: "#ef4444" }}>Passwords don&apos;t match</span>}
              </div>

              {/* Terms */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginTop: 2 }}>
                <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ accentColor: "#e09040", width: 14, height: 14, marginTop: 1 }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.5 }}>I agree to the <span style={{ color: "#e09040", cursor: "pointer" }}>Terms of Service</span> and <span style={{ color: "#e09040", cursor: "pointer" }}>Privacy Policy</span></span>
              </label>

              {/* Submit */}
              <button onClick={handleRegister} disabled={!canSubmitRegister}
                style={{ ...btnStyle, opacity: canSubmitRegister ? 1 : 0.3, marginTop: 4, animation: canSubmitRegister && !loading ? "pulseBtn 2s ease-in-out infinite" : "none" }}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                    Creating your account...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </span>
                ) : "Create Account"}
              </button>
            </div>
          )}

          {/* ── FORGOT ── */}
          {mode === "forgot" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={labelStyle}>Email</label>
                <div style={{ position: "relative" }}>
                  <input value={email} onChange={e => { setEmail(e.target.value); if (!emailTouched) setEmailTouched(true); }} onBlur={() => setEmailTouched(true)} placeholder="Enter your account email" type="email" style={{ ...inputStyle, paddingRight: 36, borderColor: showEmailFormatError ? "rgba(239,68,68,0.5)" : showEmailFormatOk ? "rgba(16,185,129,0.4)" : undefined }} />
                  {showEmailFormatOk && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#10b981", fontSize: 15 }}>✓</span>}
                  {showEmailFormatError && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 13 }}>✕</span>}
                </div>
                {showEmailFormatError && <span style={{ ...hintStyle, color: "#ef4444" }}>Please enter a valid email address</span>}
              </div>
              <button onClick={handleForgot} disabled={loading || !emailValid} style={{ ...btnStyle, opacity: (loading || !emailValid) ? 0.5 : 1 }}>{loading ? "..." : "Send Reset Link"}</button>
            </div>
          )}

          {/* ── RESET ── */}
          {mode === "reset" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={labelStyle}>Reset Token</label><input value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Paste reset token" style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }} /></div>
              <div><label style={labelStyle}>New Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter new password" style={inputStyle} /></div>
              <div><label style={labelStyle}>Confirm New Password</label><input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Type again" style={inputStyle} /></div>
              <button onClick={handleReset} disabled={loading || !resetToken || !password || password !== passwordConfirm} style={{ ...btnStyle, opacity: loading ? 0.5 : 1 }}>{loading ? "..." : "Reset Password"}</button>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'IBM Plex Mono', monospace" }}>Token expires after 30 minutes</p>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 20, fontFamily: "'IBM Plex Mono', monospace", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>Secure authentication · Your data stays private</p>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   OM DESIGN CANVAS — drag-and-drop operating model builder
   Archetypes · Layers · FTE delta overlay · KPI linkage · Versioning
   ═══════════════════════════════════════════════════════════════ */

// ── Types ─────────────────────────────────────────────────────────────────────

/* ═══════════════════════════════════════════════════════════════
   APP ROOT — Auth gate → ProjectHub → Home
   ═══════════════════════════════════════════════════════════════ */
export default function Page() {
  const [user, setUser] = useState<authApi.AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeProject, setActiveProject] = useState<{ id: string; name: string; meta: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [sessionWarned, setSessionWarned] = useState(false);
  const [showPlatformHub, setShowPlatformHub] = useState(false);

  // Session management — check for inactivity timeout
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      authApi.touchActivity(); // reset on any render cycle with user interaction
    }, 60000); // touch every minute
    // Check session expiry every 30 seconds
    const checkSession = setInterval(() => {
      if (authApi.isSessionExpired()) {
        authApi.clearToken();
        setUser(null);
        setAuthChecked(true);
        alert("Session expired, please sign in again");
      } else if (authApi.isSessionWarning() && !sessionWarned) {
        setSessionWarned(true);
        // Will be shown via toast once app is mounted
      }
    }, 30000);
    // Track activity on user interaction
    const onActivity = () => authApi.touchActivity();
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => { clearInterval(interval); clearInterval(checkSession); window.removeEventListener("click", onActivity); window.removeEventListener("keydown", onActivity); };
  }, [user, sessionWarned]);

  // Check if user is already logged in
  useEffect(() => {
    const stored = authApi.getStoredUser();
    const token = authApi.getToken();
    if (stored && token) {
      // Check session expiry first
      if (authApi.isSessionExpired()) {
        authApi.clearToken();
        setAuthChecked(true);
        return;
      }
      authApi.getMe().then(u => {
        if (u) { setUser(u); } else { authApi.clearToken(); }
        setAuthChecked(true);
      });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Load active project from localStorage
  useEffect(() => {
    if (!user) return;
    try { const saved = localStorage.getItem("hub_active"); if (saved) setActiveProject(JSON.parse(saved)); } catch {}
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!loaded || !user) return;
    if (activeProject) localStorage.setItem("hub_active", JSON.stringify(activeProject));
    else localStorage.removeItem("hub_active");
  }, [activeProject, loaded, user]);

  if (!authChecked) return null;
  if (!user) return <AuthGate onAuth={(u) => { sessionStorage.setItem("fresh_login", "1"); setUser(u); }} />;
  if (!loaded) return null;

  // On ProjectHub (no sidebar), show account controls top-right with Platform Hub link
  const hubAccountBar = (
    <div style={{ position: "fixed", top: 16, right: 20, zIndex: 9999, display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={() => setShowPlatformHub(true)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,200,150,0.15)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", color: "rgba(255,200,150,0.6)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13 }}>🧭</span> Platform Hub</button>
      <button onClick={() => setShowProfile(true)} style={{ width: 30, height: 30, borderRadius: 10, border: "1px solid rgba(224,144,64,0.2)", background: "linear-gradient(135deg, rgba(212,134,10,0.15), rgba(192,112,48,0.1))", color: "#e09040", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }} title="Profile Settings">{(user.display_name || user.username || "U")[0].toUpperCase()}</button>
      <button onClick={() => authApi.logout()} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,200,150,0.15)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", color: "rgba(255,200,150,0.6)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Sign Out</button>
    </div>
  );

  const profileModal = showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} onUpdate={u => { setUser(u); setShowProfile(false); }} />;

  // Platform Hub — accessible from BOTH the project selection page and inside the app
  if (showPlatformHub) return <PlatformHub user={user} onBack={() => setShowPlatformHub(false)} onUpdateUser={u => setUser(u)} />;

  if (!activeProject) return <>{hubAccountBar}{profileModal}<ProjectHub onOpenProject={setActiveProject} /><MusicPlayer /></>;
  return <>{profileModal}<Home key={activeProject.id} projectId={activeProject.id} projectName={activeProject.name} projectMeta={activeProject.meta} onBackToHub={() => setActiveProject(null)} user={user} onShowProfile={() => setShowProfile(true)} onShowPlatformHub={() => setShowPlatformHub(true)} /><MusicPlayer /></>;
}


/* ═══════════════════════════════════════════════════════════════
   PROFILE MODAL — edit display name, email, password
   ═══════════════════════════════════════════════════════════════ */
function ProfileModal({ user, onClose, onUpdate }: { user: authApi.AuthUser; onClose: () => void; onUpdate: (u: authApi.AuthUser) => void }) {
  const [displayName, setDisplayName] = useState(user.display_name || user.username);
  const [email, setEmail] = useState(user.email || "");
  const [emailTouched, setEmailTouched] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emailValid = email.length === 0 || isValidEmail(email);
  const showEmailError = emailTouched && email.length > 0 && !isValidEmail(email);
  const showEmailOk = emailTouched && email.length > 0 && isValidEmail(email);

  const handleSave = async () => {
    setError(""); setSuccess("");
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && !isValidEmail(cleanEmail)) { setError("Please enter a valid email address"); return; }
    setSaving(true);
    try {
      const updates: Record<string, string> = {};
      if (displayName !== (user.display_name || user.username)) updates.display_name = displayName;
      if (cleanEmail !== (user.email || "")) updates.email = cleanEmail;
      if (newPw) { updates.current_password = currentPw; updates.new_password = newPw; updates.new_password_confirm = confirmPw; }
      if (Object.keys(updates).length === 0) { setSuccess("No changes"); setSaving(false); return; }
      const result = await authApi.updateProfile(updates);
      setSuccess("Profile updated");
      onUpdate({ ...user, ...result });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Update failed"); }
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box" as const };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 10, color: "var(--text-muted)", marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" as const, letterSpacing: "1px" };

  return <div style={{ position: "fixed", inset: 0, zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
    <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px 24px", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 className="font-heading" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Profile Settings</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer" }}>✕</button>
      </div>

      {error && <div style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "#f08080", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>{error}</div>}
      {success && <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "#6ee7b7", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>{success}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #e09040, #c07030)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{(displayName || "U")[0].toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{user.username}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>Member since {user.last_login ? new Date().toLocaleDateString() : "today"}</div>
          </div>
        </div>

        <div><label style={labelStyle}>Display Name</label><input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Email</label>
          <div style={{ position: "relative" }}>
            <input value={email} onChange={e => { setEmail(e.target.value); if (!emailTouched) setEmailTouched(true); }} onBlur={() => setEmailTouched(true)} type="email" style={{ ...inputStyle, paddingRight: 32, borderColor: showEmailError ? "rgba(240,128,128,0.4)" : showEmailOk ? "rgba(110,231,183,0.3)" : undefined }} />
            {showEmailOk && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#6ee7b7", fontSize: 14 }}>✓</span>}
            {showEmailError && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#f08080", fontSize: 12 }}>✕</span>}
          </div>
          {showEmailError && <span style={{ fontSize: 9, color: "#f08080", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2, display: "block" }}>Please enter a valid email address</span>}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "1px" }}>Change Password</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Current Password</label><input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Required to change password" style={inputStyle} /></div>
            <div><label style={labelStyle}>New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" style={inputStyle} /></div>
            <div><label style={labelStyle}>Confirm New Password</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Type again" style={inputStyle} /></div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !emailValid} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #e09040, #c07030)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", opacity: (saving || !emailValid) ? 0.5 : 1, marginTop: 4 }}>{saving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  </div>;
}
