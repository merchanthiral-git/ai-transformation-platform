"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as api from "../lib/api";
import * as authApi from "../lib/auth-api";
import type { Filters } from "../lib/api";
import { useWorkspaceController } from "../lib/workspace";

// ── Shared components & hooks ──
import {
  ViewContext, COLORS, TT, PHASES, MODULES, PHASE_BACKGROUNDS, generateCardBackgrounds,
  SIM_PRESETS, SIM_DIMS, SIM_JOBS, SIM_READINESS,
  KpiCard, Card, Empty, Badge, InsightPanel, NarrativePanel, DataTable,
  BarViz, DonutViz, RadarViz, TabBar, SidebarSelect, ReadinessDot,
  PageHeader, LoadingBar, LoadingSkeleton, ModuleExportButton, NextStepBar,
  ContextStrip, InfoButton, ErrorBoundary, EmptyWithAction,
  ViewToggle, HelpBookAccordion, CareerFrameworkAccordion,
  AiEspressoPanel, AiEspressoButton, ViewSelector, ViewJobPicker, ViewEmployeePicker, GuideModal,
  usePersisted, useDebounce, useApiData, useDecisionLog, useRiskRegister,
  callAI, showToast, logDec, exportToCSV,
  setGlobalToast, setGlobalLogDecision,
  JobDesignState, Toast, useToast,
  PageTransition, AnimatedNumber, AnimatedBar, StaggerGrid, StaggerItem,
  useTheme, ThemeToggle,
  useKeyboardShortcuts, KeyboardShortcutsPanel, ShortcutDef,
  CommandPalette, CmdAction,
  AnnotationLayer, AnnotationPanel, Annotation,
  AiCoPilot, StoryEngine,
} from "./components/shared";
import { motion, AnimatePresence } from "framer-motion";

// ── Tab Module Components ──
import {
  LandingPage, WorkforceSnapshot,
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
  // ── New tracks (29-47) ──
  // Jazz Instrumentals (29-35)
  { id: 29, name: "Le Cirque de Jazz", file: "/track29.mp3", genre: "jazz" },
  { id: 30, name: "Lo-Fi Daydream", file: "/track30.mp3", genre: "chill" },
  { id: 31, name: "Cuban Fusion", file: "/track31.mp3", genre: "jazz" },
  { id: 32, name: "Smooth Swing", file: "/track32.mp3", genre: "jazz" },
  { id: 33, name: "April Morning", file: "/track33.mp3", genre: "chill" },
  { id: 34, name: "Walk Together", file: "/track34.mp3", genre: "chill" },
  { id: 35, name: "Jazz Café", file: "/track35.mp3", genre: "jazz" },
  // Ambient & Focus (36-40)
  { id: 36, name: "Heavenly Raindrops", file: "/track36.mp3", genre: "ambient" },
  { id: 37, name: "Melody of Nature", file: "/track37.mp3", genre: "ambient" },
  { id: 38, name: "Acid Jazz I", file: "/track38.mp3", genre: "jazz" },
  { id: 39, name: "Acid Jazz II", file: "/track39.mp3", genre: "jazz" },
  { id: 40, name: "We Jazz", file: "/track40.mp3", genre: "jazz" },
  // Deep Focus & Piano (41-44)
  { id: 41, name: "Leva Eternity", file: "/track41.mp3", genre: "focus" },
  { id: 42, name: "Sedative", file: "/track42.mp3", genre: "ambient" },
  { id: 43, name: "Field Grass", file: "/track43.mp3", genre: "ambient" },
  { id: 44, name: "Soulful Hip-Hop", file: "/track44.mp3", genre: "chill" },
  // Piano (45-47)
  { id: 45, name: "A Quiet Joy", file: "/track45.mp3", genre: "focus" },
  { id: 46, name: "Plea for Forgiveness", file: "/track46.mp3", genre: "focus" },
  { id: 47, name: "Snow Piano", file: "/track47.mp3", genre: "focus" },
];

function MusicPlayer({ projectActive = false }: { projectActive?: boolean }) {
  // Default to jazz genre, start on "Acid Jazz II"
  const ACID_JAZZ_II_IDX = useMemo(() => {
    const jazzTracks = ALL_TRACKS.filter(t => t.genre === "jazz");
    return jazzTracks.findIndex(t => t.name === "Acid Jazz II");
  }, []);
  const [genre, setGenre] = useState("jazz");
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(() => { try { const saved = localStorage.getItem("music_track"); return saved ? Number(saved) : ACID_JAZZ_II_IDX; } catch { return ACID_JAZZ_II_IDX; } });
  const [volume, setVolume] = useState(() => { try { return Number(localStorage.getItem("music_vol") || "0.25"); } catch { return 0.25; } });
  const [viewState, setViewState] = useState<"mini" | "collapsed" | "expanded">("mini");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurTime] = useState(0);
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [showList, setShowList] = useState(false);
  const [hasPlayedFirst, setHasPlayedFirst] = useState(false);
  const autoPlayTriggeredRef = useRef(false);
  // Single Audio element — created once, never destroyed until unmount
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);
  // Refs for values needed inside the "ended" closure (which captures stale state)
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const genreRef = useRef(genre);
  genreRef.current = genre;

  const genreTracks = useMemo(() => ALL_TRACKS.filter(t => t.genre === genre), [genre]);
  const track = genreTracks[trackIdx % genreTracks.length] || genreTracks[0];
  const fmt = (s: number) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec < 10 ? "0" : ""}${sec}`; };

  // Create Audio once on mount. No src, no autoplay.
  useEffect(() => {
    if (audioRef.current) return; // already created
    const audio = new Audio();
    audio.preload = "none"; // don't preload until user plays
    audioRef.current = audio;

    // When track ends, advance to next — shuffle picks from ALL genres
    audio.addEventListener("ended", () => {
      if (repeat) { audio.currentTime = 0; audio.play().catch(e => console.warn("Repeat failed:", e)); return; }
      setHasPlayedFirst(true);
      if (shuffleRef.current) {
        // Cross-genre shuffle: pick any track from the full library
        const idx = Math.floor(Math.random() * ALL_TRACKS.length);
        const picked = ALL_TRACKS[idx];
        const newGenreTracks = ALL_TRACKS.filter(t => t.genre === picked.genre);
        const idxInGenre = newGenreTracks.findIndex(t => t.id === picked.id);
        setGenre(picked.genre);
        setTrackIdx(idxInGenre >= 0 ? idxInGenre : 0);
        audio.src = picked.file;
        audio.load();
        audio.play().catch(e => console.warn("Shuffle play failed:", e));
      } else {
        setTrackIdx(prev => {
          const gt = ALL_TRACKS.filter(t => t.genre === genreRef.current);
          return (prev + 1) % gt.length;
        });
      }
    });
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration || 0));

    // Progress animation loop
    const tick = () => {
      if (audio.duration > 0) { setProgress(audio.currentTime / audio.duration); setCurTime(audio.currentTime); }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(animRef.current); audio.pause(); audio.src = ""; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play when entering a project (or sandbox)
  useEffect(() => {
    if (projectActive && !playing && !autoPlayTriggeredRef.current) {
      autoPlayTriggeredRef.current = true;
      const a = audioRef.current;
      if (a) {
        const t = genreTracks[trackIdx % genreTracks.length] || genreTracks[0];
        if (t) {
          a.src = t.file;
          a.volume = volume;
          a.load();
          a.play()
            .then(() => setPlaying(true))
            .catch(e => console.warn("[MusicPlayer] Auto-play blocked by browser:", e.message));
        }
      }
    }
    if (!projectActive) autoPlayTriggeredRef.current = false;
  }, [projectActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play: set src, load, play — all in one user-gesture handler
  const playTrack = useCallback((file: string) => {
    const a = audioRef.current;
    if (!a) { console.warn("[MusicPlayer] No audio element"); return; }
    console.log("[MusicPlayer] Loading:", file, "→", window.location.origin + file);
    a.src = file;
    a.volume = volume;
    a.load();
    a.play()
      .then(() => { console.log("[MusicPlayer] Playing OK:", file); setPlaying(true); })
      .catch(e => { console.warn("[MusicPlayer] Play failed:", e.message, "src:", a.src); setPlaying(false); });
  }, [volume]);

  // Toggle play/pause — the primary user interaction handler
  const toggle = useCallback(() => {
    const a = audioRef.current; if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      // If audio has no src or a stale src, load the current track
      if (!a.src || a.readyState === 0 || !a.src.includes("/track")) {
        playTrack(track?.file || ALL_TRACKS[0].file);
      } else {
        a.play()
          .then(() => setPlaying(true))
          .catch(e => { console.warn("Resume failed:", e.message); playTrack(track?.file || ALL_TRACKS[0].file); });
      }
    }
  }, [playing, track, playTrack]);

  const changeTrack = useCallback((idx: number) => {
    setTrackIdx(idx);
    const gt = ALL_TRACKS.filter(t => t.genre === genre);
    const t = gt[idx % gt.length];
    if (t) playTrack(t.file);
    try { localStorage.setItem("music_track", String(idx)); } catch {}
  }, [genre, playTrack]);

  // Cross-genre shuffle: pick a random track from ALL_TRACKS, switch genre to match
  const shuffleAny = useCallback(() => {
    const idx = Math.floor(Math.random() * ALL_TRACKS.length);
    const picked = ALL_TRACKS[idx];
    if (picked.genre !== genre) {
      setGenre(picked.genre);
      const newGenreTracks = ALL_TRACKS.filter(t => t.genre === picked.genre);
      const idxInGenre = newGenreTracks.findIndex(t => t.id === picked.id);
      setTrackIdx(idxInGenre >= 0 ? idxInGenre : 0);
      playTrack(picked.file);
      try { localStorage.setItem("music_track", String(idxInGenre >= 0 ? idxInGenre : 0)); } catch {}
    } else {
      const idxInGenre = genreTracks.findIndex(t => t.id === picked.id);
      changeTrack(idxInGenre >= 0 ? idxInGenre : 0);
    }
    setHasPlayedFirst(true);
  }, [genre, genreTracks, changeTrack, playTrack]);

  const nextTrack = () => { if (shuffle) { shuffleAny(); return; } const gt = genreTracks; changeTrack((trackIdx + 1) % gt.length); };
  const prevTrack = () => { if (shuffle) { shuffleAny(); return; } const gt = genreTracks; changeTrack((trackIdx - 1 + gt.length) % gt.length); };
  const changeVolume = (v: number) => { setVolume(v); if (audioRef.current) audioRef.current.volume = v; try { localStorage.setItem("music_vol", String(v)); } catch {} };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); if (audioRef.current?.duration) audioRef.current.currentTime = pct * audioRef.current.duration; };

  const btnBase: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" };
  const expandedRef = useRef<HTMLDivElement>(null);

  // Escape key collapses expanded player
  useEffect(() => {
    if (viewState !== "expanded") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setViewState("collapsed"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewState]);

  // Click outside expanded player to collapse
  useEffect(() => {
    if (viewState !== "expanded") return;
    const onClick = (e: MouseEvent) => {
      if (expandedRef.current && !expandedRef.current.contains(e.target as Node)) setViewState("collapsed");
    };
    // Delay listener so the expand click itself doesn't immediately collapse
    const timer = setTimeout(() => window.addEventListener("click", onClick), 50);
    return () => { clearTimeout(timer); window.removeEventListener("click", onClick); };
  }, [viewState]);

  // ── Mini state: small floating icon ──
  if (viewState === "mini") return <button onClick={() => { setViewState("collapsed"); toggle(); }}
    style={{ position: "fixed", bottom: 20, right: 20, zIndex: 40, width: 36, height: 36, borderRadius: 18, background: "linear-gradient(135deg, rgba(224,144,64,0.9), rgba(192,112,48,0.9))", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, cursor: "pointer", boxShadow: "0 4px 20px rgba(224,144,64,0.3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}
    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>♪</button>;

  // ── Collapsed state: slim bar — entire bar is clickable to expand ──
  if (viewState === "collapsed") return <div onClick={() => setViewState("expanded")} style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, height: 44, background: "rgba(15,12,8,0.85)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(212,134,10,0.1)", display: "flex", alignItems: "center", paddingLeft: 12, paddingRight: 12, gap: 10, cursor: "pointer" }}>
    <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #D4860A, #C07030)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>♪</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#f5e6d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track?.name || "—"}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{GENRES.find(g => g.id === genre)?.label}</div>
    </div>
    <div onClick={e => { e.stopPropagation(); seek(e); }} style={{ width: 80, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, cursor: "pointer", flexShrink: 0, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 2, background: "#D4860A", width: `${progress * 100}%` }} />
    </div>
    <button onClick={e => { e.stopPropagation(); toggle(); }} style={{ ...btnBase, color: "#f5e6d0", fontSize: 16, width: 32, height: 32 }}>{playing ? "⏸" : "▶"}</button>
    <button onClick={e => { e.stopPropagation(); nextTrack(); }} style={{ ...btnBase, color: "rgba(255,255,255,0.4)", fontSize: 15 }}>⏭</button>
    <button onClick={e => { e.stopPropagation(); setViewState("mini"); }} style={{ ...btnBase, color: "rgba(255,255,255,0.25)", fontSize: 14 }} title="Hide player">✕</button>
  </div>;

  // ── Expanded state: full player panel ──
  return <div ref={expandedRef} style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "rgba(10,8,6,0.92)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(212,134,10,0.12)", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
    {/* Visible collapse/close buttons at top-right of panel */}
    <div style={{ position: "absolute", top: 10, right: 16, display: "flex", gap: 6, zIndex: 1 }}>
      <button onClick={() => setViewState("collapsed")} title="Minimize to bar" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#f5e6d0"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>▾</button>
      <button onClick={() => setViewState("mini")} title="Hide player" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#f5e6d0"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>✕</button>
    </div>

    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 24px 20px" }}>
      {/* Top row: art + info + controls */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, background: "linear-gradient(135deg, #D4860A, #8B4513)", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, padding: 8, flexShrink: 0, boxShadow: "0 4px 16px rgba(212,134,10,0.2)" }}>
          {[3,5,4,6,3,4,5].map((h, i) => <div key={i} style={{ width: 4, borderRadius: 2, background: "rgba(255,255,255,0.6)", height: playing ? `${h * 4 + Math.sin(Date.now() / 300 + i) * 4}px` : "4px", transition: "height 0.3s", animation: playing ? `eqBar 0.8s ease-in-out ${i * 0.1}s infinite alternate` : "none" }} />)}
        </div>
        <style>{`@keyframes eqBar { 0% { height: 6px; } 100% { height: 24px; } }`}</style>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track?.name || "—"}</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{GENRES.find(g => g.id === genre)?.icon} {GENRES.find(g => g.id === genre)?.label} · Track {(trackIdx % genreTracks.length) + 1} of {genreTracks.length}</div>
        </div>

        {/* Main controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setShuffle(!shuffle)} style={{ ...btnBase, color: shuffle ? "#D4860A" : "rgba(255,255,255,0.3)", fontSize: 15 }} title="Shuffle">⇄</button>
          <button onClick={prevTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.5)", fontSize: 16 }}>⏮</button>
          <button onClick={toggle} style={{ width: 42, height: 42, borderRadius: 21, background: "linear-gradient(135deg, #e09040, #c07030)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(224,144,64,0.3)", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{playing ? "⏸" : "▶"}</button>
          <button onClick={nextTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.5)", fontSize: 16 }}>⏭</button>
          <button onClick={() => setRepeat(!repeat)} style={{ ...btnBase, color: repeat ? "#D4860A" : "rgba(255,255,255,0.3)", fontSize: 15 }} title="Repeat">↻</button>
        </div>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, width: 110, flexShrink: 0 }}>
          <button onClick={() => changeVolume(volume > 0 ? 0 : 0.25)} style={{ ...btnBase, fontSize: 15, color: "rgba(255,255,255,0.4)" }}>{volume === 0 ? "🔇" : volume < 0.3 ? "🔈" : "🔊"}</button>
          <input type="range" min={0} max={1} step={0.02} value={volume} onChange={e => changeVolume(Number(e.target.value))} style={{ flex: 1, accentColor: "#e09040", height: 3 }} />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace", width: 32, textAlign: "right" }}>{fmt(currentTime)}</span>
        <div onClick={seek} style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, cursor: "pointer", overflow: "hidden", position: "relative" }}>
          <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #D4860A, #E8C547)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} />
        </div>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace", width: 32 }}>{fmt(duration)}</span>
      </div>

      {/* Genre pills + track list */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {GENRES.map(g => <button key={g.id} onClick={() => { setGenre(g.id); setTrackIdx(0); }}
          style={{ padding: "4px 12px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", border: genre === g.id ? "1px solid rgba(212,134,10,0.4)" : "1px solid rgba(255,255,255,0.06)", background: genre === g.id ? "rgba(212,134,10,0.12)" : "transparent", color: genre === g.id ? "#e09040" : "rgba(255,255,255,0.35)", transition: "all 0.2s", fontFamily: "'Outfit', sans-serif" }}>{g.icon} {g.label}</button>)}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowList(!showList)} style={{ ...btnBase, fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace" }}>{showList ? "Hide" : "Tracks"} ▾</button>
      </div>

      {showList && <div style={{ marginTop: 8, maxHeight: 140, overflowY: "auto", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
        {genreTracks.map((t, i) => <button key={t.id} onClick={() => changeTrack(i)}
          style={{ width: "100%", padding: "6px 12px", background: i === trackIdx % genreTracks.length ? "rgba(212,134,10,0.1)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: i === trackIdx % genreTracks.length ? "#e09040" : "rgba(255,255,255,0.5)", transition: "all 0.15s", fontFamily: "'Outfit', sans-serif" }}
          onMouseEnter={e => { if (i !== trackIdx % genreTracks.length) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          onMouseLeave={e => { if (i !== trackIdx % genreTracks.length) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ width: 16, fontSize: 14, textAlign: "right", opacity: 0.4, fontFamily: "'IBM Plex Mono', monospace" }}>{i === trackIdx % genreTracks.length && playing ? "♫" : `${i + 1}`}</span>
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
  const { theme, toggle: toggleTheme } = useTheme();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdRecentIds, setCmdRecentIds] = usePersisted<string[]>(`${projectId}_cmd_recent`, []);
  const [annotations, setAnnotations] = usePersisted<Annotation[]>(`${projectId}_annotations`, []);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [showAnnoPanel, setShowAnnoPanel] = useState(false);
  const [showCoPilot, setShowCoPilot] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const [showStoryEngine, setShowStoryEngine] = useState(false);
  const [presentStartTime, setPresentStartTime] = useState(0);
  const [presentNotes, setPresentNotes] = useState(false);
  const [viewMode, setViewMode] = usePersisted<string>(`${projectId}_viewMode`, "");
  const [viewEmployee, setViewEmployee] = usePersisted<string>(`${projectId}_viewEmployee`, "");
  const [viewJob, setViewJob] = usePersisted<string>(`${projectId}_viewJob`, "");

  // Card & phase background images — generate for existing projects on first load
  const [cardBgs, setCardBgs] = usePersisted<Record<string, string>>(`${projectId}_cardBackgrounds`, {});
  const [phaseBgs, setPhaseBgs] = usePersisted<Record<string, string>>(`${projectId}_phaseBackgrounds`, {});
  useEffect(() => {
    if (!cardBgs || Object.keys(cardBgs).length === 0) setCardBgs(generateCardBackgrounds());
    if (!phaseBgs || Object.keys(phaseBgs).length === 0) setPhaseBgs({ ...PHASE_BACKGROUNDS });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [viewCustom, setViewCustom] = usePersisted<Record<string, string>>(`${projectId}_viewCustom`, { func: "All", jf: "All", sf: "All", cl: "All", ct: "All" });
  const [employees, setEmployees] = useState<string[]>([]);
  const [page, setPage] = usePersisted(`${projectId}_page`, "home");
  const fileRef = useRef<HTMLInputElement>(null);

  // Tutorial mode — must be declared before the useEffect that references it
  const [isTutorial] = useState(() => { try { return JSON.parse(localStorage.getItem(`${projectId}_isTutorial`) || "false"); } catch { return false; } });

  // Always start on home (Overview) when entering a project — avoids landing on an error screen
  // from a previously broken module. Tutorial projects are exempt since they navigate to specific pages.
  const hasResetRef = useRef(false);
  useEffect(() => {
    if (hasResetRef.current) return;
    hasResetRef.current = true;
    if (!isTutorial) setPage("home");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const workspace = useWorkspaceController();
  const { models, model, jobs, job, filters: f, filterOptions: fo, message: msg, backendOk, loadingModels, uploadFiles, resetWorkspace, setModel, setJob, setFilter, clearFilters } = workspace;
  const { toast, ToastContainer } = useToast();
  const { log: decisionLog, logDecision } = useDecisionLog(projectId);
  const { risks: riskRegister, addRisk, updateRisk } = useRiskRegister(projectId);
  const [showDecLog, setShowDecLog] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [sidebarGuide, setSidebarGuide] = useState<"consultant" | "hr" | null>(null);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return !sessionStorage.getItem(`${projectId}_splashSeen`); } catch { return true; }
  });
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

  // Auto-select Tutorial model for sandbox/tutorial projects
  useEffect(() => {
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
  const [omNodes] = usePersisted<Record<string, unknown>[]>(`${projectId}_om_nodes`, []);

  // ── Track visited modules — scoped to project ──
  const [visited, setVisited] = usePersisted<Record<string, boolean>>(`${projectId}_visited`, {});
  const navigate = useCallback((id: string) => { setPage(id); setVisited(prev => ({ ...prev, [id]: true })); }, [setPage, setVisited]);

  // ── Smart Import Wizard ──
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [wizStep, setWizStep] = useState(1);
  const [wizFiles, setWizFiles] = useState<File[]>([]);
  const [wizPreview, setWizPreview] = useState<{ name: string; size: string; rows: number; cols: number; headers: string[]; sample: string[][] } | null>(null);
  const [wizMappings, setWizMappings] = useState<Record<string, string>>({});
  const [wizAutoMapCount, setWizAutoMapCount] = useState(0);
  const [wizValidation, setWizValidation] = useState<{ type: "pass" | "warn" | "error"; msg: string }[]>([]);
  const [wizImporting, setWizImporting] = useState(false);
  const [wizTemplate, setWizTemplate] = useState("custom");
  const [wizImportHistory, setWizImportHistory] = usePersisted<{ date: string; file: string; rows: number; quality: number }[]>(`${projectId}_import_history`, []);

  const WIZ_TARGET_FIELDS = ["Employee ID", "Employee Name", "Job Title", "Function ID", "Job Family", "Sub-Family", "Career Track", "Career Level", "Manager ID", "Manager Name", "Base Pay", "FTE", "Hire Date", "Geography", "Performance", "Skills", "Model ID", "Job Code", "Job Family Group", "Gender", "Age Band", "Tenure"];
  const WIZ_ALIASES: Record<string, string> = {
    "employee_id": "Employee ID", "emp_id": "Employee ID", "worker_id": "Employee ID", "employee id": "Employee ID", "employee number": "Employee ID", "employee_number": "Employee ID", "emplid": "Employee ID",
    "employee_name": "Employee Name", "full_name": "Employee Name", "name": "Employee Name", "worker": "Employee Name", "employee name": "Employee Name", "preferred name": "Employee Name",
    "job_title": "Job Title", "position": "Job Title", "role": "Job Title", "title": "Job Title", "job title": "Job Title", "position title": "Job Title",
    "department": "Function ID", "dept": "Function ID", "function": "Function ID", "org_unit": "Function ID", "business_unit": "Function ID", "cost_center": "Function ID",
    "job_family": "Job Family", "job family": "Job Family", "family": "Job Family", "job_family_group": "Job Family Group",
    "sub_family": "Sub-Family", "sub family": "Sub-Family", "sub-function": "Sub-Family", "sub function": "Sub-Family", "subfamily": "Sub-Family",
    "career_track": "Career Track", "track": "Career Track", "track_type": "Career Track", "career track": "Career Track", "job_category": "Career Track",
    "career_level": "Career Level", "level": "Career Level", "grade": "Career Level", "pay_grade": "Career Level", "job_level": "Career Level", "career level": "Career Level",
    "manager_id": "Manager ID", "supervisor_id": "Manager ID", "reports_to_id": "Manager ID", "manager id": "Manager ID", "mgr_id": "Manager ID",
    "manager_name": "Manager Name", "supervisor": "Manager Name", "reports_to": "Manager Name", "manager": "Manager Name", "manager name": "Manager Name",
    "base_pay": "Base Pay", "salary": "Base Pay", "compensation": "Base Pay", "annual_salary": "Base Pay", "base pay": "Base Pay", "base salary": "Base Pay",
    "fte": "FTE", "headcount": "FTE",
    "hire_date": "Hire Date", "start_date": "Hire Date", "date_of_hire": "Hire Date", "original_hire_date": "Hire Date", "hire date": "Hire Date",
    "geography": "Geography", "location": "Geography", "region": "Geography", "country": "Geography", "work_location": "Geography", "office": "Geography",
    "performance": "Performance", "performance_rating": "Performance", "rating": "Performance", "review_rating": "Performance",
    "skills": "Skills", "competencies": "Skills", "skill_set": "Skills",
    "model_id": "Model ID", "scenario": "Model ID", "company": "Model ID",
    "gender": "Gender", "sex": "Gender",
    "age_band": "Age Band", "age": "Age Band", "age_group": "Age Band",
    "tenure": "Tenure", "years_of_service": "Tenure", "service_years": "Tenure",
  };

  const wizAutoMap = (headers: string[]) => {
    const mappings: Record<string, string> = {};
    let count = 0;
    headers.forEach(h => {
      const norm = h.toLowerCase().replace(/[^a-z0-9_ ]/g, "").trim();
      const match = WIZ_ALIASES[norm];
      if (match) { mappings[h] = match; count++; }
      else {
        // Fuzzy: check if header contains a target field name
        const fuzzy = WIZ_TARGET_FIELDS.find(t => norm.includes(t.toLowerCase().replace(/ /g, "_")) || norm.includes(t.toLowerCase().replace(/ /g, "")));
        if (fuzzy) { mappings[h] = fuzzy; count++; }
      }
    });
    setWizMappings(mappings);
    setWizAutoMapCount(count);
  };

  const wizParseFile = async (file: File) => {
    // Read file to get headers and row count
    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    const delim = file.name.endsWith(".tsv") ? "\t" : ",";
    const headers = lines[0]?.split(delim).map(h => h.replace(/"/g, "").trim()) || [];
    const sampleRows = lines.slice(1, 6).map(l => l.split(delim).map(c => c.replace(/"/g, "").trim()));
    setWizPreview({ name: file.name, size: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`, rows: lines.length - 1, cols: headers.length, headers, sample: sampleRows });
    wizAutoMap(headers);
  };

  const wizRunValidation = () => {
    const checks: { type: "pass" | "warn" | "error"; msg: string }[] = [];
    const mapped = Object.values(wizMappings);
    if (mapped.includes("Employee ID")) checks.push({ type: "pass", msg: "Employee ID mapped" });
    else checks.push({ type: "error", msg: "Employee ID not mapped — required field" });
    if (mapped.includes("Employee Name")) checks.push({ type: "pass", msg: "Employee Name mapped" });
    else checks.push({ type: "error", msg: "Employee Name not mapped — required field" });
    if (mapped.includes("Job Title")) checks.push({ type: "pass", msg: "Job Title mapped" });
    else checks.push({ type: "warn", msg: "Job Title not mapped — recommended for analysis" });
    if (mapped.includes("Function ID")) checks.push({ type: "pass", msg: "Function mapped" });
    else checks.push({ type: "warn", msg: "Function not mapped — org structure will be limited" });
    if (mapped.includes("Manager ID") || mapped.includes("Manager Name")) checks.push({ type: "pass", msg: "Manager relationship mapped" });
    else checks.push({ type: "warn", msg: "No manager field mapped — org hierarchy unavailable" });
    if (mapped.includes("Career Level")) checks.push({ type: "pass", msg: "Career Level mapped" });
    else checks.push({ type: "warn", msg: "Career Level not mapped — leveling analysis unavailable" });
    const unmapped = (wizPreview?.headers || []).filter(h => !wizMappings[h]).length;
    if (unmapped > 0) checks.push({ type: "pass", msg: `${unmapped} column(s) skipped — not needed for analysis` });
    checks.push({ type: "pass", msg: `${wizPreview?.rows || 0} rows ready for import` });
    setWizValidation(checks);
  };

  const wizDoImport = async () => {
    if (wizFiles.length === 0) return;
    setWizImporting(true);
    try {
      const dt = new DataTransfer();
      wizFiles.forEach(f => dt.items.add(f));
      await uploadFiles(dt.files);
      const quality = Math.round((wizValidation.filter(v => v.type === "pass").length / Math.max(wizValidation.length, 1)) * 100);
      setWizImportHistory(prev => [...prev, { date: new Date().toISOString().split("T")[0], file: wizFiles[0]?.name || "", rows: wizPreview?.rows || 0, quality }]);
      toast("Data imported successfully", "success");
      setShowImportWizard(false);
      setWizStep(1); setWizFiles([]); setWizPreview(null);
    } catch { toast("Import failed — check file format", "error"); }
    setWizImporting(false);
  };

  const upload = async (files: FileList) => {
    try {
      await uploadFiles(files);
      toast("Data uploaded successfully", "success");
      if (model) {
        try {
          const dq = await api.getDataQuality(model);
          const summary = (dq as Record<string, unknown>)?.summary as Record<string, unknown>;
          const missing = Number(summary?.missing ?? 0);
          const issues = Number(summary?.total_issues ?? 0);
          if (missing > 0) toast(`${missing} dataset(s) still missing — check Data Quality in AI Opportunity Scan`, "warning");
          else if (issues > 0) toast(`${issues} data issue(s) detected — review in AI Opportunity Scan > Data Quality`, "warning");
        } catch {}
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
    moduleStatus.jobarch = "in_progress";
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

  // Tutorial mode state and handlers
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

  // ── Keyboard shortcuts ──
  const PHASE_FIRST_MODULES: Record<string, string> = { "1": "snapshot", "2": "scan", "3": "design", "4": "simulate", "5": "plan" };
  const shortcutDefs: ShortcutDef[] = useMemo(() => [
    // Command palette
    { key: "k", ctrl: true, label: "Open command palette", action: () => setShowCmdPalette(true), category: "Tools" },
    { key: "p", ctrl: true, label: "Toggle presentation mode", action: () => { if (presentMode) { setPresentMode(false); } else { setPresentMode(true); setPresentStartTime(Date.now()); setShowCoPilot(false); setShowAnnoPanel(false); setAnnotateMode(false); } }, category: "Tools" },
    // Global navigation
    { key: "h", ctrl: true, label: "Go to Home", action: () => setPage("home"), category: "Navigation" },
    { key: "1", ctrl: true, label: "Discover phase", action: () => navigate("snapshot"), category: "Navigation" },
    { key: "2", ctrl: true, label: "Diagnose phase", action: () => navigate("scan"), category: "Navigation" },
    { key: "3", ctrl: true, label: "Design phase", action: () => navigate("design"), category: "Navigation" },
    { key: "4", ctrl: true, label: "Simulate phase", action: () => navigate("simulate"), category: "Navigation" },
    { key: "5", ctrl: true, label: "Mobilize phase", action: () => navigate("plan"), category: "Navigation" },
    { key: "e", ctrl: true, label: "Export", action: () => navigate("export"), category: "Navigation" },
    { key: "Escape", label: "Close / Go back", action: () => { if (showCmdPalette) setShowCmdPalette(false); else if (showShortcuts) setShowShortcuts(false); else if (showImportWizard) setShowImportWizard(false); else if (page !== "home") setPage("home"); }, category: "Navigation" },
    // Tools
    { key: "d", ctrl: true, label: "Toggle dark/light mode", action: toggleTheme, category: "Tools" },
    { key: "/", ctrl: true, label: "Show keyboard shortcuts", action: () => setShowShortcuts(true), category: "Tools" },
    { key: "?", label: "Show keyboard shortcuts", action: () => setShowShortcuts(true), category: "Tools" },
    { key: "f", ctrl: true, label: "Focus search/filter", action: () => { const el = document.querySelector<HTMLInputElement>("input[placeholder*='earch'], input[placeholder*='ilter']"); if (el) el.focus(); }, category: "Tools" },
  ], [navigate, setPage, toggleTheme, showShortcuts, showImportWizard, showCmdPalette, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useKeyboardShortcuts(shortcutDefs);

  // Command palette actions catalog
  const cmdActions: CmdAction[] = useMemo(() => {
    const navAction = (id: string, label: string, icon: string, desc: string, shortcut?: string, kw?: string): CmdAction => ({
      id: `nav_${id}`, icon, label, desc, category: "Navigation", shortcut,
      action: () => { navigate(id); setCmdRecentIds(prev => [id, ...prev.filter(x => x !== id)].slice(0, 8)); },
      keywords: kw,
    });
    const items: CmdAction[] = [
      // Navigation — all modules
      ...MODULES.map(m => navAction(m.id, m.title, m.icon, m.desc, undefined, `${m.phase} ${m.id}`)),
      navAction("home", "Home", "🏠", "Go to the landing page", "Cmd+H"),
      // Phase shortcuts
      { id: "phase_discover", icon: "🔍", label: "Discover Phase", desc: "Workforce snapshot, job architecture, skill shift", category: "Navigation", shortcut: "Cmd+1", action: () => navigate("snapshot"), keywords: "discover phase 1" },
      { id: "phase_diagnose", icon: "🩺", label: "Diagnose Phase", desc: "AI scan, heatmap, org health, readiness", category: "Navigation", shortcut: "Cmd+2", action: () => navigate("scan"), keywords: "diagnose phase 2" },
      { id: "phase_design", icon: "✏️", label: "Design Phase", desc: "Work design, operating model, BBBA, headcount", category: "Navigation", shortcut: "Cmd+3", action: () => navigate("design"), keywords: "design phase 3" },
      { id: "phase_simulate", icon: "⚡", label: "Simulate Phase", desc: "Impact modeling, scenarios, ROI", category: "Navigation", shortcut: "Cmd+4", action: () => navigate("simulate"), keywords: "simulate phase 4" },
      { id: "phase_mobilize", icon: "🚀", label: "Mobilize Phase", desc: "Change planner, reskilling, talent marketplace", category: "Navigation", shortcut: "Cmd+5", action: () => navigate("plan"), keywords: "mobilize phase 5" },
      // Actions
      { id: "act_upload", icon: "📂", label: "Upload Data", desc: "Open the smart import wizard", category: "Actions", action: () => { setShowImportWizard(true); setShowCmdPalette(false); } },
      { id: "act_theme", icon: theme === "dark" ? "☀️" : "🌙", label: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode", desc: "Toggle the color theme", category: "Actions", shortcut: "Cmd+D", action: toggleTheme, keywords: "dark light mode theme toggle" },
      { id: "act_shortcuts", icon: "⌨️", label: "Keyboard Shortcuts", desc: "View all keyboard shortcuts", category: "Actions", shortcut: "Cmd+/", action: () => { setShowCmdPalette(false); setShowShortcuts(true); } },
      { id: "act_export", icon: "📤", label: "Export Report", desc: "Generate and download deliverables", category: "Actions", action: () => navigate("export"), keywords: "export download pdf pptx docx" },
      { id: "act_story", icon: "📖", label: "Generate Executive Story", desc: "AI-generated data narrative for client presentation", category: "Actions", action: () => { setShowStoryEngine(true); setShowCmdPalette(false); }, keywords: "story narrative executive report generate AI" },
      { id: "act_present", icon: "🖥️", label: "Enter Presentation Mode", desc: "Full-screen client-ready presentation", category: "Actions", shortcut: "Cmd+P", action: () => { setPresentMode(true); setPresentStartTime(Date.now()); setShowCmdPalette(false); setShowCoPilot(false); if (page === "home") navigate("snapshot"); }, keywords: "present presentation slides client meeting" },
      { id: "act_reset", icon: "🔄", label: "Reset Data", desc: "Clear all data and start fresh", category: "Actions", action: () => { if (confirm("Reset all data? This cannot be undone.")) reset(); }, keywords: "reset clear" },
      // Data — jobs
      ...jobs.slice(0, 50).map(j => ({
        id: `job_${j}`, icon: "💼", label: j, desc: "Job title — click to view in Work Design Lab", category: "Data",
        action: () => { setJob(j); navigate("design"); setCmdRecentIds(prev => [`job_${j}`, ...prev.filter(x => x !== `job_${j}`)].slice(0, 8)); },
        keywords: `job role title ${j}`,
      })),
    ];
    return items;
  }, [navigate, jobs, theme, toggleTheme, setJob, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Account dropdown close-on-click-outside
  useEffect(() => {
    if (!accountMenuOpen) return;
    const close = (e: MouseEvent) => { if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) setAccountMenuOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAccountMenuOpen(false); };
    const t = setTimeout(() => { window.addEventListener("click", close); window.addEventListener("keydown", esc); }, 50);
    return () => { clearTimeout(t); window.removeEventListener("click", close); window.removeEventListener("keydown", esc); };
  }, [accountMenuOpen]);

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

  // ── Landing splash screen — pure full-screen background image, click to enter ──
  if (showSplash && page === "home") {
    return <div onClick={() => { setShowSplash(false); try { sessionStorage.setItem(`${projectId}_splashSeen`, "1"); } catch {} }} style={{ position: "fixed", inset: 0, cursor: "pointer", zIndex: 30 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/landing_bg.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", animation: "splashIn 0.8s ease" }} />
      <style>{`@keyframes splashIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>;
  }

  // Presentation mode module sequence
  const PRESENT_MODULES = ["snapshot", "scan", "heatmap", "jobarch", "design", "opmodel", "simulate", "plan", "export"];
  const presentIdx = PRESENT_MODULES.indexOf(page);
  const presentPrev = () => { if (presentIdx > 0) navigate(PRESENT_MODULES[presentIdx - 1]); };
  const presentNext = () => { if (presentIdx < PRESENT_MODULES.length - 1) navigate(PRESENT_MODULES[presentIdx + 1]); else if (page === "home") navigate(PRESENT_MODULES[0]); };

  // Presentation mode keyboard handler
  useEffect(() => {
    if (!presentMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); presentNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); presentPrev(); }
      else if (e.key === "n" || e.key === "N") { if ((e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") setPresentNotes(p => !p); }
      else if (e.key === "Escape") { setPresentMode(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presentMode, presentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set data-present attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-present", presentMode ? "true" : "false");
    return () => document.documentElement.removeAttribute("data-present");
  }, [presentMode]);

  return <div className="flex min-h-screen w-full">
    {/* ── COMMAND PALETTE ── */}
    <AnimatePresence>{showCmdPalette && <CommandPalette actions={cmdActions} recentIds={cmdRecentIds} onClose={() => setShowCmdPalette(false)} />}</AnimatePresence>

    {/* ── KEYBOARD SHORTCUTS PANEL ── */}
    {showShortcuts && <KeyboardShortcutsPanel shortcuts={shortcutDefs} onClose={() => setShowShortcuts(false)} />}

    {/* ── SMART IMPORT WIZARD MODAL ── */}
    {showImportWizard && <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
      <div className="bg-[var(--bg)] rounded-2xl border border-[var(--border)] w-full max-w-[800px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div><div className="text-[18px] font-bold text-[var(--text-primary)]">Smart Data Import</div><div className="text-[13px] text-[var(--text-muted)]">Step {wizStep} of 4</div></div>
          <button onClick={() => setShowImportWizard(false)} className="text-[20px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
        </div>
        {/* Progress */}
        <div className="flex gap-1 px-6 pt-3">{[1,2,3,4].map(s => <div key={s} className="flex-1 h-1.5 rounded-full" style={{ background: s <= wizStep ? "var(--accent-primary)" : "var(--surface-2)" }} />)}</div>

        <div className="px-6 py-5">
          {/* STEP 1: File Selection */}
          {wizStep === 1 && <div className="space-y-4">
            <div className="text-[15px] font-bold text-[var(--text-primary)]">Select & Upload Your Data File</div>
            {/* Format templates */}
            <div className="flex gap-2 flex-wrap">
              {[{ id: "custom", label: "Generic / Custom" }, { id: "workday", label: "Workday" }, { id: "sap", label: "SAP SuccessFactors" }, { id: "oracle", label: "Oracle HCM" }, { id: "adp", label: "ADP" }].map(t => <button key={t.id} onClick={() => setWizTemplate(t.id)} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all" style={{ background: wizTemplate === t.id ? "rgba(212,134,10,0.12)" : "var(--surface-2)", color: wizTemplate === t.id ? "#e09040" : "var(--text-muted)", border: wizTemplate === t.id ? "1px solid rgba(212,134,10,0.3)" : "1px solid var(--border)" }}>{t.label}</button>)}
            </div>
            {/* Drop zone */}
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-10 text-center hover:border-[var(--accent-primary)] transition-all cursor-pointer" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length) { setWizFiles(files); wizParseFile(files[0]); } }} onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = ".xlsx,.xls,.csv,.tsv"; input.multiple = true; input.onchange = () => { const files = Array.from(input.files || []); if (files.length) { setWizFiles(files); wizParseFile(files[0]); } }; input.click(); }}>
              <div className="text-[32px] mb-2">📂</div>
              <div className="text-[15px] font-semibold text-[var(--text-primary)]">Drag & drop your file here</div>
              <div className="text-[14px] text-[var(--text-muted)] mt-1">or click to browse · .xlsx, .xls, .csv, .tsv</div>
            </div>
            {/* Preview */}
            {wizPreview && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[15px] font-bold text-[var(--text-primary)]">{wizPreview.name}</div>
                <span className="text-[13px] text-[var(--text-muted)]">{wizPreview.size}</span>
              </div>
              <div className="text-[14px] text-[var(--success)] mb-2">Detected <strong>{wizPreview.rows.toLocaleString()}</strong> rows and <strong>{wizPreview.cols}</strong> columns</div>
              <div className="flex flex-wrap gap-1">{wizPreview.headers.slice(0, 15).map(h => <span key={h} className="px-2 py-0.5 rounded text-[12px] bg-[var(--bg)] text-[var(--text-secondary)]">{h}</span>)}{wizPreview.headers.length > 15 && <span className="text-[12px] text-[var(--text-muted)]">+{wizPreview.headers.length - 15} more</span>}</div>
            </div>}
            {wizPreview && <button onClick={() => setWizStep(2)} className="w-full px-4 py-2.5 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Continue to Column Mapping →</button>}
          </div>}

          {/* STEP 2: Column Mapping */}
          {wizStep === 2 && <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-bold text-[var(--text-primary)]">Column Mapping</div>
              <div className="text-[14px] font-semibold" style={{ color: wizAutoMapCount > 0 ? "var(--success)" : "var(--text-muted)" }}>Mapped {wizAutoMapCount} of {wizPreview?.headers.length || 0} columns automatically ({wizPreview?.headers.length ? Math.round((wizAutoMapCount / wizPreview.headers.length) * 100) : 0}%)</div>
            </div>
            <div className="overflow-y-auto rounded-lg border border-[var(--border)]" style={{ maxHeight: 400 }}>
              <table className="w-full text-[14px]"><thead><tr className="bg-[var(--surface-2)] sticky top-0">
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Your Column</th>
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Sample Data</th>
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border)]">Maps To</th>
              </tr></thead><tbody>
                {(wizPreview?.headers || []).map((h, hi) => {
                  const mapped = wizMappings[h] || "";
                  const samples = (wizPreview?.sample || []).map(r => r[hi] || "").filter(Boolean).slice(0, 3);
                  return <tr key={h} className="border-b border-[var(--border)]">
                    <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{h}</td>
                    <td className="px-3 py-2 text-[13px] text-[var(--text-muted)]">{samples.join(", ") || "—"}</td>
                    <td className="px-3 py-2"><select value={mapped} onChange={e => setWizMappings(prev => ({ ...prev, [h]: e.target.value }))} className="bg-[var(--bg)] border rounded-lg px-2 py-1 text-[13px] outline-none w-full" style={{ borderColor: mapped ? "var(--success)" : "var(--border)", color: mapped ? "var(--success)" : "var(--text-muted)" }}>
                      <option value="">Skip</option>{WIZ_TARGET_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select></td>
                  </tr>;
                })}
              </tbody></table>
            </div>
            {/* Preview mapped */}
            {Object.keys(wizMappings).length > 0 && <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Preview (first 3 rows with mapped names)</div>
              <div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr>{Object.entries(wizMappings).filter(([,v]) => v).slice(0, 8).map(([,v]) => <th key={v} className="px-2 py-1 text-left text-[var(--success)] font-semibold">{v}</th>)}</tr></thead><tbody>{(wizPreview?.sample || []).slice(0, 3).map((row, ri) => <tr key={ri}>{Object.entries(wizMappings).filter(([,v]) => v).slice(0, 8).map(([k,v]) => { const ci = wizPreview?.headers.indexOf(k) ?? -1; return <td key={v} className="px-2 py-1 text-[var(--text-secondary)]">{ci >= 0 ? row[ci] || "—" : "—"}</td>; })}</tr>)}</tbody></table></div>
            </div>}
            <div className="flex gap-2">
              <button onClick={() => setWizStep(1)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">← Back</button>
              <button onClick={() => { wizRunValidation(); setWizStep(3); }} className="flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Validate Data →</button>
            </div>
          </div>}

          {/* STEP 3: Validation */}
          {wizStep === 3 && <div className="space-y-4">
            <div className="text-[15px] font-bold text-[var(--text-primary)]">Data Validation</div>
            <div className="space-y-2">{wizValidation.map((v, i) => {
              const icons = { pass: "✅", warn: "⚠️", error: "❌" };
              const colors = { pass: "var(--success)", warn: "var(--warning)", error: "var(--risk)" };
              return <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: `${colors[v.type]}06`, border: `1px solid ${colors[v.type]}20` }}>
                <span className="text-[16px]">{icons[v.type]}</span>
                <span className="text-[14px] text-[var(--text-secondary)] flex-1">{v.msg}</span>
              </div>;
            })}</div>
            {/* Quality score */}
            {(() => {
              const errors = wizValidation.filter(v => v.type === "error").length;
              const passes = wizValidation.filter(v => v.type === "pass").length;
              const score = wizValidation.length ? Math.round((passes / wizValidation.length) * 100) : 0;
              return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-center">
                <div className="text-[28px] font-extrabold" style={{ color: score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--risk)" }}>{score}%</div>
                <div className="text-[14px] text-[var(--text-muted)]">Data Quality Score</div>
                {errors > 0 && <div className="text-[14px] text-[var(--risk)] mt-2">{errors} error(s) must be resolved before import</div>}
              </div>;
            })()}
            <div className="flex gap-2">
              <button onClick={() => setWizStep(2)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">← Back</button>
              <button onClick={() => setWizStep(4)} disabled={wizValidation.some(v => v.type === "error")} className="flex-1 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: wizValidation.some(v => v.type === "error") ? 0.4 : 1 }}>Confirm & Import →</button>
            </div>
          </div>}

          {/* STEP 4: Confirm & Import */}
          {wizStep === 4 && <div className="space-y-4">
            <div className="text-[15px] font-bold text-[var(--text-primary)]">Confirm Import</div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center"><div className="text-[22px] font-extrabold text-[var(--text-primary)]">{wizPreview?.rows.toLocaleString()}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Rows</div></div>
                <div className="text-center"><div className="text-[22px] font-extrabold text-[var(--accent-primary)]">{Object.values(wizMappings).filter(Boolean).length}</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Fields Mapped</div></div>
                <div className="text-center"><div className="text-[22px] font-extrabold text-[var(--success)]">{Math.round((wizValidation.filter(v => v.type === "pass").length / Math.max(wizValidation.length, 1)) * 100)}%</div><div className="text-[13px] text-[var(--text-muted)] uppercase">Quality</div></div>
              </div>
              <div className="text-[14px] text-[var(--text-secondary)] text-center">Ready to import <strong>{wizPreview?.name}</strong> with {Object.values(wizMappings).filter(Boolean).length} mapped fields.</div>
            </div>
            {/* Import history */}
            {wizImportHistory.length > 0 && <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="text-[13px] font-bold text-[var(--text-muted)] uppercase mb-2">Previous Imports</div>
              {wizImportHistory.slice(-3).reverse().map((h, i) => <div key={i} className="flex justify-between text-[13px] text-[var(--text-secondary)] py-1">{h.date} — {h.file} ({h.rows} rows, {h.quality}% quality)</div>)}
            </div>}
            <div className="flex gap-2">
              <button onClick={() => setWizStep(3)} className="px-4 py-2 rounded-lg text-[14px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">← Back</button>
              <button onClick={wizDoImport} disabled={wizImporting} className="flex-1 px-4 py-3 rounded-xl text-[16px] font-bold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: wizImporting ? 0.5 : 1 }}>{wizImporting ? "Importing..." : "🚀 Import Data"}</button>
            </div>
            {wizImporting && <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden"><div className="h-full rounded-full bg-[var(--accent-primary)] animate-pulse" style={{ width: "80%" }} /></div>}
          </div>}
        </div>
      </div>
    </div>}

    {/* ── SIDEBAR ── */}
    {/* Presentation mode top bar */}
    {presentMode && <div className="fixed top-0 left-0 right-0 z-[9996] flex items-center justify-between px-6 py-3" style={{ background: "linear-gradient(180deg, rgba(6,10,20,0.95), rgba(6,10,20,0.7))", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(212,134,10,0.1)" }}>
      <div className="flex items-center gap-4">
        <button onClick={presentPrev} disabled={presentIdx <= 0} className="text-[18px] text-white/40 hover:text-white disabled:opacity-20 transition-all">←</button>
        <div><div className="text-[18px] font-bold text-white font-heading">{MODULES.find(m => m.id === page)?.title || "Home"}</div><div className="text-[13px] text-white/40">{presentIdx >= 0 ? `Slide ${presentIdx + 1} of ${PRESENT_MODULES.length}` : "Presentation Mode"}</div></div>
        <button onClick={presentNext} disabled={presentIdx >= PRESENT_MODULES.length - 1} className="text-[18px] text-white/40 hover:text-white disabled:opacity-20 transition-all">→</button>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[13px] text-white/30 font-data">{Math.floor((Date.now() - presentStartTime) / 60000)} min</span>
        <button onClick={() => setPresentNotes(p => !p)} className="text-[13px] text-white/40 hover:text-white transition-all px-2 py-1 rounded border border-white/10">Notes (N)</button>
        <button onClick={() => setPresentMode(false)} className="text-[13px] font-semibold text-white/60 hover:text-white transition-all px-3 py-1.5 rounded-lg border border-white/15 hover:border-white/30">Exit Presentation</button>
      </div>
    </div>}

    {/* Presentation mode bottom navigator */}
    {presentMode && <div className="fixed bottom-0 left-0 right-0 z-[9996] h-12 flex items-center justify-center gap-2 px-6" style={{ background: "linear-gradient(0deg, rgba(6,10,20,0.95), rgba(6,10,20,0.7))", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(212,134,10,0.1)" }}>
      {PRESENT_MODULES.map((m, i) => {
        const mod = MODULES.find(x => x.id === m);
        const isCurrent = page === m;
        return <button key={m} onClick={() => navigate(m)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-all" style={{ background: isCurrent ? "rgba(212,134,10,0.15)" : "transparent", color: isCurrent ? "#f0a050" : "rgba(255,255,255,0.3)", border: isCurrent ? "1px solid rgba(212,134,10,0.3)" : "1px solid transparent" }}>
          <span className="text-[14px]">{mod?.icon}</span>
          <span className="hidden lg:inline">{mod?.title?.split(" ").slice(0, 2).join(" ") || m}</span>
        </button>;
      })}
    </div>}

    {/* Presenter notes overlay */}
    {presentMode && presentNotes && <div className="fixed bottom-12 left-0 right-0 z-[9995] px-8 py-4" style={{ background: "rgba(6,10,20,0.85)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(212,134,10,0.1)" }}>
      <div className="text-[14px] text-white/60 italic">
        {page === "snapshot" ? "Key metrics to highlight: total headcount, function distribution, AI readiness score. Note any anomalies in the data." :
         page === "scan" ? "Focus on the top 3 highest-impact findings. Walk through the AI impact matrix — which functions have the most automation potential?" :
         page === "design" ? "Walk through the Work Design Lab results for the top 2 roles. Show before/after time allocation." :
         page === "simulate" ? "Compare Conservative vs. Balanced vs. Transformative. Highlight the risk-adjusted returns." :
         page === "plan" ? "Show the Gantt timeline. Walk through the ADKAR assessment results for leadership buy-in." :
         page === "opmodel" ? "Start with strategic priorities, then walk through the capability maturity gaps." :
         page === "heatmap" ? "The heatmap shows AI impact by function × job family. Red cells = highest transformation priority." :
         page === "export" ? "Offer to generate the deliverable pack: executive summary, detailed report, and transformation roadmap." :
         "Talking points for this module — press N to toggle notes."}
      </div>
    </div>}

    <aside className={`w-[220px] min-h-screen bg-[var(--surface-1)] flex flex-col px-4 py-5 shrink-0 overflow-y-auto sticky top-0 border-r border-[var(--border)] transition-all duration-300 ${presentMode ? "-ml-[220px] opacity-0 pointer-events-none" : ""}`} style={{ height: "100vh" }}>
      <div className="flex items-center justify-between mb-1">
        <div className="cursor-pointer" onClick={goHome}><div className="text-sm font-extrabold text-[var(--text-primary)]">AI Transformation</div><div className="text-[15px] font-semibold text-[var(--accent-primary)] uppercase tracking-[1.5px]">PLATFORM</div></div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <button onClick={() => { if (page === "home" && viewMode) { setViewMode(""); } else { onBackToHub(); } }} className="w-full text-left text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1 mb-1 flex items-center gap-1 transition-colors">{page === "home" && viewMode ? "← Back to Views" : page !== "home" ? "← Back to Home" : "← Back to Projects"}</button>
      <div className="bg-[var(--surface-2)] rounded-lg px-3 py-2 mb-2 border border-[var(--border)]"><div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-0.5">Active Project</div><div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{projectName}</div>{projectMeta && <div className="text-[15px] text-[var(--text-muted)] truncate mt-0.5 italic">{projectMeta}</div>}</div>
      {/* Journey progress bar */}
      <div className="flex items-center gap-1 mb-2 mt-1">
        {PHASES.map((phase, pi) => {
          const ms = phase.modules.map(id => (moduleStatus[id] || "not_started"));
          const pStatus = ms.every(s => s === "complete") ? "complete" : ms.some(s => s !== "not_started") ? "in_progress" : "not_started";
          return <React.Fragment key={phase.id}>
            {pi > 0 && <div className="flex-1 h-px" style={{ background: pStatus !== "not_started" ? `${phase.color}40` : "var(--border)" }} />}
            <button onClick={() => { setPage("home"); }} title={`Phase ${pi+1}: ${phase.label}`} className="flex items-center gap-1 shrink-0 transition-all" style={{ opacity: pStatus !== "not_started" ? 1 : 0.4 }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[15px] font-bold" style={{ background: pStatus === "complete" ? `${phase.color}20` : pStatus === "in_progress" ? `${phase.color}10` : "transparent", color: phase.color, border: `1px solid ${phase.color}${pStatus !== "not_started" ? "60" : "20"}` }}>{pStatus === "complete" ? "✓" : pStatus === "in_progress" ? "●" : "○"}</div>
            </button>
          </React.Fragment>;
        })}
      </div>
      <div className="text-[15px] text-[var(--text-muted)] mb-1">{(() => { const ci = PHASES.findIndex(p => p.modules.some(id => (moduleStatus[id] || "not_started") !== "complete") || p.modules.every(id => (moduleStatus[id] || "not_started") === "not_started")); return ci >= 0 ? `Phase ${ci+1} of 5 — ${PHASES[ci].label}` : "Journey complete"; })()}</div>
      <div className="h-px bg-[var(--border)] my-3" />
      <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Data Intake</div>
      <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv,.tsv" onChange={e => e.target.files && upload(e.target.files)} className="hidden" />
      <button onClick={() => { setShowImportWizard(true); setWizStep(1); setWizFiles([]); setWizPreview(null); setWizMappings({}); setWizValidation([]); }} className="w-full bg-[var(--accent-primary)] hover:opacity-90 text-white text-[15px] font-semibold py-1.5 rounded-md mb-1.5">⬆ Smart Import</button>
      <a href="/api/template" download className="block w-full bg-[var(--surface-3)] hover:bg-[var(--hover)] border border-[var(--accent-primary)] text-[var(--accent-primary)] text-[15px] font-semibold py-1.5 rounded-md mb-1.5 text-center no-underline">⬇ Export Template</a>
      <button onClick={reset} className="w-full bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[15px] font-semibold py-1 rounded-md">Reset</button>
      {msg && <div className="mt-1.5 text-[15px] text-[var(--accent-primary)] bg-[rgba(212,134,10,0.1)] rounded px-2 py-1">{msg}</div>}
      {!backendOk && <div className="mt-1.5 text-[15px] text-[var(--risk)] bg-[rgba(239,68,68,0.1)] rounded px-2 py-1.5 border border-[var(--risk)]/20">⚠ Backend offline<br/><span className="text-[15px] text-[var(--text-muted)]">Run: uvicorn main:app --port 8000</span></div>}
      {backendOk && model && <div className="mt-1.5 text-[15px] text-[var(--success)] bg-[rgba(16,185,129,0.1)] rounded px-2 py-1">✓ Connected · {model}</div>}
      <div className="h-px bg-[var(--border)] my-3" />
      {viewMode !== "employee" && <><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Model</div>
      <SidebarSelect options={models.length ? models : [loadingModels ? "Loading..." : "No models"]} value={model || (models[0] || (loadingModels ? "Loading..." : "No models"))} onChange={setModel} />
      <div className="h-px bg-[var(--border)] my-3" /></>}
      {viewMode !== "employee" && <><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Active Job</div>
      <SidebarSelect options={hasJobs ? ["All Jobs", ...jobs] : ["No jobs available"]} value={job || "All Jobs"} onChange={v => setJob(v === "All Jobs" || v === "No jobs available" ? "" : v)} />
      {job && job !== "All Jobs" && <div className="mt-1"><Badge color="indigo">{job}</Badge></div>}</>}
      <div className="h-px bg-[var(--border)] my-3" />
      {viewMode === "org" && <div className="bg-[rgba(212,134,10,0.06)] border border-[var(--accent-primary)]/15 rounded-lg px-3 py-2 mb-2"><div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-0.5">🏢 Organization View</div><div className="text-[15px] text-[var(--text-muted)]">Full workforce analytics</div><button onClick={() => setViewMode("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode === "employee" && viewEmployee && <div className="bg-[rgba(139,92,246,0.1)] border border-[var(--purple)]/20 rounded-lg px-3 py-2 mb-2"><div className="text-[15px] font-bold text-[var(--purple)] uppercase tracking-wider mb-0.5">👤 Employee View</div><div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{viewEmployee}</div><button onClick={() => setViewMode("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode === "job" && viewJob && <div className="bg-[rgba(16,185,129,0.1)] border border-[var(--success)]/20 rounded-lg px-3 py-2 mb-2"><div className="text-[15px] font-bold text-[var(--success)] uppercase tracking-wider mb-0.5">💼 Job View</div><div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{viewJob}</div><button onClick={() => setViewMode("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode === "custom" && <div className="bg-[rgba(232,197,71,0.08)] border border-[var(--warning)]/15 rounded-lg px-3 py-2 mb-2"><div className="text-[15px] font-bold text-[var(--warning)] uppercase tracking-wider mb-0.5">⚙️ Custom Slice</div><div className="text-[15px] text-[var(--text-muted)]">Filtered view</div><button onClick={() => setViewMode("")} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1">Change View ↻</button></div>}
      {viewMode !== "employee" && <><div className="flex items-center justify-between mb-2"><span className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px]">Filters</span>{af > 0 && <span className="bg-[rgba(212,134,10,0.2)] text-[var(--accent-primary)] text-[15px] font-bold px-2 py-0.5 rounded-full">{af}</span>}</div>
      <SidebarSelect label="Function" options={fo.functions || ["All"]} value={f.func} onChange={v => setFilter("func", v)} />
      <SidebarSelect label="Job Family" options={fo.job_families || ["All"]} value={f.jf} onChange={v => setFilter("jf", v)} />
      <SidebarSelect label="Sub-Family" options={fo.sub_families || ["All"]} value={f.sf} onChange={v => setFilter("sf", v)} />
      <SidebarSelect label="Career Level" options={fo.career_levels || ["All"]} value={f.cl} onChange={v => setFilter("cl", v)} />
      {af > 0 && <button onClick={clearFilters} className="w-full bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[15px] font-semibold py-1 rounded-md mt-1">Clear All</button>}</>}
      {/* Decision Log + Platform Hub */}
      <div className="mt-auto">
        <div className="h-px bg-[var(--border)] my-3" />
        <button onClick={() => setShowStoryEngine(true)} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">📖</span> Generate Story
        </button>
        <button onClick={() => { setPresentMode(true); setPresentStartTime(Date.now()); setShowCoPilot(false); setShowAnnoPanel(false); setAnnotateMode(false); if (page === "home") navigate("snapshot"); }} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">🖥️</span> Present
        </button>
        <button onClick={() => setShowCoPilot(!showCoPilot)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showCoPilot ? "bg-[rgba(212,134,10,0.1)] text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">🤖</span> AI Co-Pilot
        </button>
        <button onClick={() => setAnnotateMode(!annotateMode)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${annotateMode ? "bg-[rgba(59,130,246,0.1)] text-[#3B82F6] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">💬</span> {annotateMode ? "Annotating..." : "Annotate"}
        </button>
        <button onClick={() => setShowAnnoPanel(!showAnnoPanel)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showAnnoPanel ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">📋</span> Notes {annotations.length > 0 && <span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold">{annotations.length}</span>}
        </button>
        <button onClick={() => setShowDecLog(!showDecLog)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showDecLog ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">📝</span> Decision Log {decisionLog.length > 0 && <span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold">{decisionLog.length}</span>}
        </button>
        <button onClick={() => setSidebarGuide("consultant")} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">📘</span> Guide
        </button>
        <button onClick={() => { if (onShowPlatformHub) onShowPlatformHub(); }} className="w-full rounded-xl p-2.5 text-left transition-all group" style={{ background: "rgba(212,134,10,0.03)", border: "1px solid rgba(212,134,10,0.08)" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,134,10,0.2)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(212,134,10,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(212,134,10,0.08)"; e.currentTarget.style.boxShadow = "none"; }}>
          <div className="text-[15px] font-bold font-heading group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: "rgba(212,134,10,0.6)" }}>AI Transformation</div>
          <div className="text-[14px]" style={{ color: "rgba(212,134,10,0.3)" }}>Account & Info</div>
        </button>
      </div>

      {/* Account controls — anchored at sidebar bottom */}
      <div className="pt-3 border-t border-[var(--border)] relative" ref={accountMenuRef}>
        {/* Dropdown menu — pops upward */}
        {accountMenuOpen && <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 8, borderRadius: 14, background: "rgba(15,12,8,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(212,134,10,0.12)", boxShadow: "0 -8px 32px rgba(0,0,0,0.4)", padding: "6px", zIndex: 50, animation: "menuFadeIn 0.15s ease" }}>
          {[
            { icon: "👤", label: "My Account", action: () => { setAccountMenuOpen(false); if (onShowPlatformHub) onShowPlatformHub(); } },
            { icon: "🏠", label: "Platform Hub", action: () => { setAccountMenuOpen(false); if (onShowPlatformHub) onShowPlatformHub(); } },
            { icon: "📂", label: "My Projects", action: () => { setAccountMenuOpen(false); onBackToHub(); } },
            ...((user?.username === "hiral") ? [{ icon: "🛡️", label: "Admin Panel", action: () => { setAccountMenuOpen(false); if (onShowPlatformHub) onShowPlatformHub(); } }] : []),
          ].map(item => <button key={item.label} onClick={item.action} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[15px] font-semibold text-[var(--text-secondary)] transition-all" style={{ background: "transparent" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,134,10,0.08)"; e.currentTarget.style.color = "#f5e6d0"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            <span className="text-[15px]">{item.icon}</span>{item.label}
          </button>)}
          <div className="h-px mx-2 my-1" style={{ background: "rgba(212,134,10,0.1)" }} />
          <button onClick={() => { setAccountMenuOpen(false); authApi.logout(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] transition-all" style={{ background: "transparent" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
            <span className="text-[15px]">🚪</span>Sign Out
          </button>
          <style>{`@keyframes menuFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>}

        {/* Avatar + name — clickable to open dropdown */}
        {user && <button onClick={() => setAccountMenuOpen(!accountMenuOpen)} className="w-full flex items-center gap-2 mb-2 rounded-lg px-1 py-1 transition-all" style={{ background: accountMenuOpen ? "rgba(212,134,10,0.06)" : "transparent", cursor: "pointer", border: "none", textAlign: "left" }} onMouseEnter={e => { if (!accountMenuOpen) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }} onMouseLeave={e => { if (!accountMenuOpen) e.currentTarget.style.background = "transparent"; }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[15px] font-bold shrink-0" style={{ background: "linear-gradient(135deg, rgba(212,134,10,0.2), rgba(192,112,48,0.15))", border: "1px solid rgba(224,144,64,0.2)", color: "#e09040", fontFamily: "'Outfit', sans-serif" }}>{(user.display_name || user.username || "U")[0].toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{user.display_name || user.username}</div>
            {user.last_login && <div className="text-[15px] text-[var(--text-muted)] font-data truncate">Last: {new Date(user.last_login).toLocaleDateString()}</div>}
          </div>
          <span className="text-[14px] text-[var(--text-muted)]">{accountMenuOpen ? "▾" : "▸"}</span>
        </button>}
        <div className="text-center text-[14px] text-[var(--text-muted)] mt-1 opacity-50">v4.0</div>
        <button onClick={() => setShowShortcuts(true)} className="text-[12px] text-[var(--text-muted)] opacity-40 hover:opacity-80 transition-opacity mt-1 flex items-center justify-center gap-1"><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 16, padding: "0 4px", borderRadius: 4, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>⌘/</span> shortcuts</button>
      </div>
    </aside>

    {/* ── MAIN ── */}
    <main className={`flex-1 min-h-screen bg-[var(--bg)] ${presentMode ? "present-scale" : ""}`} style={presentMode ? { paddingTop: 60, paddingBottom: 56 } : undefined}>
      <AnnotationLayer annotations={annotations} moduleId={page} annotateMode={annotateMode} onAdd={a => setAnnotations(prev => [...prev, a])} onUpdate={a => setAnnotations(prev => prev.map(x => x.id === a.id ? a : x))} onDelete={id => setAnnotations(prev => prev.filter(x => x.id !== id))}>
      <AnimatePresence mode="wait">
      <motion.div key={page} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
      {page === "home" && <div>
        <LandingPage onNavigate={navigate} moduleStatus={moduleStatus} hasData={hasData} viewMode={viewMode} projectName={projectName} onBackToHub={onBackToHub} onBackToSplash={() => { setShowSplash(true); try { sessionStorage.removeItem(`${projectId}_splashSeen`); } catch {} }} cardBackgrounds={cardBgs} phaseBackgrounds={phaseBgs} />
      </div>}
      {page !== "home" && <div className="px-7 py-6">
      {page === "snapshot" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><WorkforceSnapshot model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {(page === "jobs" || page === "jobarch") && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><JobArchitectureModule model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "scan" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AiOpportunityScan model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "mgrcap" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ManagerCapability model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "changeready" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ChangeReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "mgrdev" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ManagerDevelopment model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "recommendations" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AiRecommendationsEngine model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "orghealth" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OrgHealthScorecard model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "heatmap" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AIImpactHeatmap model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "clusters" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><RoleClustering model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "skillshift" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><SkillShiftIndex model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "story" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><TransformationStoryBuilder model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "archetypes" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ReadinessArchetypes model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "export" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ExportReport model={model} f={f} onBack={goHome} /></ErrorBoundary>}
      {page === "dashboard" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><TransformationExecDashboard model={model} f={f} onBack={goHome} onNavigate={navigate} decisionLog={decisionLog} riskRegister={riskRegister} addRisk={addRisk} updateRisk={updateRisk} /></ErrorBoundary>}
      {page === "readiness" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AIReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "bbba" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><BBBAFramework model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "headcount" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><HeadcountPlanning model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "reskill" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ReskillingPathways model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "marketplace" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><TalentMarketplace model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {page === "skills" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><SkillsTalent model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "design" && model && viewCtx.mode !== "employee" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><WorkDesignLab model={model} f={f} job={viewCtx.mode === "job" ? viewCtx.job || job : job} jobs={jobs} onBack={goHome} jobStates={jobStates} setJobState={setJobState} onSelectJob={setJob} /></ErrorBoundary>}
      {page === "simulate" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ImpactSimulator onBack={goHome} onNavigate={navigate} model={model} viewCtx={viewCtx} f={f} jobStates={jobStates} simState={simState} setSimState={setSimState} /></ErrorBoundary>}
      {page === "build" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OrgDesignStudio onBack={goHome} viewCtx={viewCtx} model={model} f={f} odsState={odsState} setOdsState={setOdsState} /></ErrorBoundary>}
      {page === "plan" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ChangePlanner model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "opmodel" && viewCtx.mode === "job" && <div className="px-7 py-6"><div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Job View</h3><p className="text-[15px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[15px] font-semibold">Change View ↻</button></div></div>}
      {page === "opmodel" && viewCtx.mode !== "employee" && viewCtx.mode !== "job" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OperatingModelLab onBack={goHome} model={model} f={f} projectId={projectId} onNavigateCanvas={() => navigate("om_canvas")} onModelChange={setModel} /></ErrorBoundary>}
      {(page === "design" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[15px] text-[var(--text-secondary)] mb-2">Work Design Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="green">💼 Job</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[15px] font-semibold">Change View ↻</button></div>}
      {(page === "opmodel" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[15px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[15px] font-semibold">Change View ↻</button></div>}
      {page === "om_canvas" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OMDesignCanvas projectId={projectId} onBack={goHome} onNavigateLab={() => navigate("opmodel")} /></ErrorBoundary>}
      {page === "rolecompare" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><RoleComparison model={model} f={f} onBack={goHome} jobs={jobs} jobStates={jobStates} /></ErrorBoundary>}
      {page === "quickwins" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><QuickWinIdentifier model={model} f={f} onBack={goHome} onNavigate={navigate} /></ErrorBoundary>}
      {!model && page !== "home" && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">📂</div><h3 className="text-lg font-semibold mb-1">Select a model first</h3><p className="text-[15px] text-[var(--text-secondary)]">Upload data or select Demo_Model in the sidebar.</p><button onClick={goHome} className="mt-4 text-[var(--accent-primary)] text-[15px] font-semibold">← Back to Home</button></div>}
      </div>}
      </motion.div>
      </AnimatePresence>
      </AnnotationLayer>
    </main>
    {/* AI Co-Pilot sidebar */}
    <AnimatePresence>{showCoPilot && <AiCoPilot moduleId={page} contextData={buildAiContext()} open={showCoPilot} onClose={() => setShowCoPilot(false)} onNavigate={navigate} />}</AnimatePresence>
    <AnimatePresence>{showAnnoPanel && <AnnotationPanel annotations={annotations} onUpdate={a => setAnnotations(prev => prev.map(x => x.id === a.id ? a : x))} onDelete={id => setAnnotations(prev => prev.filter(x => x.id !== id))} onClose={() => setShowAnnoPanel(false)} />}</AnimatePresence>
    <AnimatePresence>{showStoryEngine && <StoryEngine projectName={projectName} model={model} contextData={buildAiContext()} onClose={() => setShowStoryEngine(false)} onNavigate={navigate} />}</AnimatePresence>
    {isTutorial && tutorialVisible && <TutorialOverlay step={tutorialStep} totalSteps={tutorialSteps.length} steps={tutorialSteps} onNext={tutorialNext} onPrev={tutorialPrev} onClose={() => setTutorialVisible(false)} onJump={tutorialJump} />}
    {isTutorial && !tutorialVisible && <TutorialBadge onClick={() => setTutorialVisible(true)} step={tutorialStep} total={tutorialSteps.length} />}

    {/* Decision Log Slide-out Panel */}
    {showDecLog && <div className="fixed top-0 right-0 bottom-0 w-[380px] z-[9998] bg-[var(--surface-1)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-slide-right" style={{ boxShadow: "-8px 0 30px rgba(0,0,0,0.3)" }}>
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2"><span className="text-lg">📝</span><h3 className="text-[14px] font-bold font-heading text-[var(--text-primary)]">Decision Log</h3><span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold">{decisionLog.length}</span></div>
        <button onClick={() => setShowDecLog(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm">✕</button>
      </div>
      <div className="px-4 py-2 border-b border-[var(--border)] flex gap-1 shrink-0 overflow-x-auto">
        {["All", ...Array.from(new Set(decisionLog.map(d => d.module)))].map(m => <button key={m} onClick={() => setDecLogFilter(m)} className={`px-2 py-1 rounded text-[14px] font-semibold whitespace-nowrap ${decLogFilter === m ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-muted)] border border-[var(--border)]"}`}>{m}</button>)}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {decisionLog.length === 0 ? <div className="text-center py-12 text-[var(--text-muted)]"><div className="text-3xl mb-2 opacity-30">📝</div><div className="text-[15px]">No decisions logged yet.<br/>Actions in any module are automatically recorded here.</div></div> :
        <div className="space-y-2">
          {decisionLog.filter(d => decLogFilter === "All" || d.module === decLogFilter).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).map((d, i) => <div key={i} className="bg-[var(--surface-2)] rounded-xl p-3 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-bold">{d.module}</span>
              <span className="text-[14px] text-[var(--text-muted)] font-data">{new Date(d.ts).toLocaleDateString()} {new Date(d.ts).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>
            </div>
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">{d.action}</div>
            <div className="text-[15px] text-[var(--text-secondary)] mt-0.5">{d.detail}</div>
          </div>)}
        </div>}
      </div>
    </div>}

    {sidebarGuide && <GuideModal type={sidebarGuide} onClose={() => setSidebarGuide(null)} />}
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


/* ═══ TUTORIAL STEPS — 27 comprehensive steps ═══ */

// Company data mirrors backend COMPANY_DB for dynamic tutorial text
const TUTORIAL_COMPANIES: Record<string, Record<string, { name: string; employees: number; ticker?: string }>> = {
  technology: { small: { name: "Palantir Technologies", employees: 3800, ticker: "PLTR" }, mid: { name: "ServiceNow", employees: 8000, ticker: "NOW" }, large: { name: "Adobe", employees: 25000, ticker: "ADBE" } },
  financial_services: { small: { name: "Evercore", employees: 2200, ticker: "EVR" }, mid: { name: "Raymond James", employees: 8000, ticker: "RJF" }, large: { name: "Goldman Sachs", employees: 25000, ticker: "GS" } },
  healthcare: { small: { name: "Hims & Hers Health", employees: 1500, ticker: "HIMS" }, mid: { name: "Molina Healthcare", employees: 8000, ticker: "MOH" }, large: { name: "Elevance Health", employees: 25000, ticker: "ELV" } },
  retail: { small: { name: "Five Below", employees: 3000, ticker: "FIVE" }, mid: { name: "Williams-Sonoma", employees: 8000, ticker: "WSM" }, large: { name: "Target", employees: 25000, ticker: "TGT" } },
  manufacturing: { small: { name: "Axon Enterprise", employees: 4000, ticker: "AXON" }, mid: { name: "Parker Hannifin", employees: 8000, ticker: "PH" }, large: { name: "Honeywell", employees: 25000, ticker: "HON" } },
  consulting: { small: { name: "Huron Consulting", employees: 2500, ticker: "HURN" }, mid: { name: "Booz Allen Hamilton", employees: 8000, ticker: "BAH" }, large: { name: "Accenture", employees: 25000, ticker: "ACN" } },
  energy: { small: { name: "Shoals Technologies", employees: 1800, ticker: "SHLS" }, mid: { name: "Chesapeake Energy", employees: 3000, ticker: "CHK" }, large: { name: "Baker Hughes", employees: 25000, ticker: "BKR" } },
  aerospace: { small: { name: "Kratos Defense", employees: 4000, ticker: "KTOS" }, mid: { name: "L3Harris Technologies", employees: 8000, ticker: "LHX" }, large: { name: "Northrop Grumman", employees: 25000, ticker: "NOC" } },
};

function getTutorialCompany(projectId: string): { name: string; employees: number; industry: string; size: string } {
  const parts = projectId.replace("tutorial_", "").split("_");
  const size = parts[0] || "mid";
  const industry = parts.slice(1).join("_") || "technology";
  const co = TUTORIAL_COMPANIES[industry]?.[size] || TUTORIAL_COMPANIES.technology.mid;
  return { ...co, industry, size };
}

type TutorialStep = { page: string; icon: string; title: string; body: string };

function buildTutorialSteps(projectId: string): TutorialStep[] {
  const co = getTutorialCompany(projectId);
  const n = co.employees;
  const nm = co.name;
  const genCount = Math.min(n, 2000);
  const fnCount = n <= 150 ? 4 : n <= 500 ? 6 : n <= 2000 ? 8 : 9;
  const mgrCount = Math.max(3, Math.round(genCount * 0.08));

  return [
  // ═══ Steps 1-3: Welcome & Orientation ═══
  { page: "home", icon: "🎓", title: "Welcome to Your AI Transformation Sandbox",
    body: `Welcome to ${nm}, a ${co.industry.replace(/_/g, " ")} organization with ${n.toLocaleString()} employees across ${fnCount} functions. This sandbox is a fully interactive environment loaded with realistic workforce data, AI readiness scores, skills inventories, and manager capability assessments. Everything you see is generated data flowing through real analytics engines. You can explore, modify, and experiment freely — nothing you do here affects any real project or data. Use the Next button to follow the guided tour, or close this panel and explore on your own at any time.` },

  { page: "home", icon: "🗺️", title: "Platform Overview — Six Module Architecture",
    body: `The platform is organized into six core modules that mirror the phases of an AI transformation engagement. Overview gives you the baseline workforce picture. Diagnose uncovers organizational health, AI readiness, and change risk. Design is where you deconstruct jobs into tasks, redesign roles, and plan talent sourcing. Simulate lets you model different adoption scenarios and see financial impact. Mobilize builds the change management roadmap, reskilling pathways, and stakeholder plans. Export generates the deliverables your steering committee needs. Each module feeds data forward — decisions in Design drive what you see in Simulate, which shapes Mobilize.` },

  { page: "home", icon: "🔬", title: "Sandbox Data & View Modes",
    body: `The sandbox data for ${nm} was generated to be internally consistent: employee skills match their job families, readiness scores correlate with tenure and function, and manager capability reflects team size and seniority. Before entering the platform, you selected a view mode. Organization View shows aggregate data across the entire workforce. Job View focuses on a single role and its task-level detail. Employee View tracks an individual through every module. Custom Slice applies filters (function, job family, career level) so you can narrow to a specific population. You can change your view mode at any time from the sidebar.` },

  // ═══ Steps 4-5: Overview Tab ═══
  { page: "snapshot", icon: "📊", title: "Overview — Workforce Snapshot & KPIs",
    body: `The Workforce Snapshot is your executive summary. Six KPI cards show headcount (${genCount.toLocaleString()} employees), role count, task coverage percentage, average AI readiness score, skills assessment completion, and transformation progress. Below the KPIs, the function distribution chart shows headcount by department, the AI impact donut summarizes how much work is automatable (populated after Work Design), and the readiness radar shows relative scores across five dimensions. The Skill Shift Index tracks how skill demand is changing across the organization. These are the visuals you would put in a steering committee deck to establish the baseline.` },

  { page: "dashboard", icon: "📈", title: "Overview — Executive Dashboard & Decision Log",
    body: `The Transformation Executive Dashboard aggregates signals from every module into a single command center. It shows transformation progress by phase, risk register entries, recent decisions logged across modules, and key metrics trending over time. The Decision Log in the sidebar tracks every significant action you take — confirming a skills inventory, submitting a deconstruction, overriding a BBBA disposition. This audit trail is critical for governance: it shows who decided what and when. The dashboard is designed to be the first thing a program sponsor opens each morning during a live engagement.` },

  // ═══ Steps 6-8: Diagnose ═══
  { page: "orghealth", icon: "🏥", title: "Diagnose — Org Health Scorecard & AI Impact Heatmap",
    body: `The Org Health Scorecard gives you a composite view of organizational readiness across multiple dimensions: leadership alignment, cultural adaptability, digital maturity, process standardization, and data quality. Each dimension is scored and benchmarked. The AI Impact Heatmap (accessible from the Diagnose module) visualizes which functions and job families have the highest automation potential. Hot spots (red/orange) indicate areas where AI can deliver the most value — these are your quick wins. Cool spots (blue/green) indicate human-intensive work that requires augmentation rather than automation. Together, these tools tell you where to focus first.` },

  { page: "readiness", icon: "🎯", title: "Diagnose — AI Readiness & Change Readiness",
    body: `AI Readiness scores every employee on five dimensions: AI Awareness, Tool Adoption, Data Literacy, Change Openness, and AI Collaboration. Scores of 4-5 mean "Ready Now" — these employees already use data tools daily and embrace change. Scores below 2.5 are "At Risk" — they need targeted intervention before any transformation begins. The Change Readiness module adds another lens: a 4-quadrant matrix crossing readiness with impact level. High Impact + Low Readiness employees are your biggest risk — they will be most affected but least prepared. Each quadrant has a specific intervention playbook. The combination of these two assessments drives your entire people strategy.` },

  { page: "recommendations", icon: "🤖", title: "Diagnose — AI Recommendations & Role Clustering",
    body: `The AI Recommendations Engine synthesizes data from every diagnostic module and generates prioritized action items. It identifies which roles should be redesigned first, which skills gaps are most critical, which managers need immediate development, and where quick wins exist. Each recommendation includes an impact estimate and effort level. Role Clustering groups similar roles by their task composition, skill requirements, and AI impact profiles. Clusters reveal hidden patterns — roles in different functions that share 80% of their task DNA and could be consolidated. This analysis often uncovers organizational redundancy that traditional org charts miss entirely.` },

  // ═══ Steps 9-11: Job Architecture ═══
  { page: "jobs", icon: "🗂️", title: "Job Architecture — Catalogue & Role Profiles",
    body: `The Job Catalog lists every position in ${nm} organized by function and job family. Each role shows its career level, compensation range, headcount, and reporting structure. This is the structural backbone of the platform — every other module references this catalog. You can browse roles by function, search by title, and click into any role to see its full profile. The AI Job Profile Generator lets you type any role name and instantly generate a structured profile with typical tasks, skills, and career progression. This is useful when you need to add roles that don't exist in the current catalog, or when you want to compare your organization's role definitions against market standards.` },

  { page: "jobs", icon: "🏗️", title: "Job Architecture — Architecture Map & Career Framework",
    body: `The Architecture Map visualizes the current state of ${nm}'s job structure: how many layers exist between the CEO and individual contributors, which functions have the most roles, and where career paths converge or diverge. The future state overlay (available after completing Work Design) shows how the architecture changes after AI transformation — which roles are eliminated, which are created, and how career ladders shift. This before/after comparison is one of the most powerful visuals for executive buy-in. The Career Framework Accordion shows standardized career levels with expected competencies, typical tenure, and advancement criteria for each band.` },

  { page: "jobs", icon: "🔍", title: "Job Architecture — Validation & Calibration",
    body: `Every role in the catalog carries validation flags that indicate data quality and calibration status. Green flags mean the role has complete task data, confirmed skills, and validated compensation ranges. Yellow flags indicate partial data — the role exists but some fields need enrichment. Red flags mean critical data is missing and the role cannot be reliably analyzed in downstream modules. The calibration panel lets you compare roles side-by-side to ensure consistency: are two roles at the same career level actually equivalent in scope and compensation? This quality check is essential before running any workforce analytics, because garbage in means garbage out in every subsequent module.` },

  // ═══ Steps 12-14: Design ═══
  { page: "design", icon: "✏️", title: "Design — Work Design Lab (Deconstruction & Reconstruction)",
    body: `The Work Design Lab is the analytical engine of the platform. Select a role from the sidebar to see its task portfolio. Each task is characterized by four dimensions: Task Type (Repetitive vs Variable), Logic (Deterministic vs Judgment-heavy), Interaction (Independent vs Collaborative), and AI Impact (High/Moderate/Low). Deconstruction breaks the role into individual tasks with time allocations. The pattern is clear: Repetitive + Deterministic + Independent tasks have high AI impact (60% time savings through automation), while Variable + Judgment-heavy + Collaborative tasks remain human-led. Reconstruction shows the future state — how freed capacity gets redeployed to higher-value work. The Redeployment tab assigns each task a decision: Automate, Augment, or Retain.` },

  { page: "opmodel", icon: "🧬", title: "Design — Operating Model & Capability Maturity",
    body: `The Operating Model Lab configures the target organizational architecture. The Blueprint shows five layers: Governance, Core Components, Shared Services, Enabling, and Interface. Switch between archetypes — Functional (siloed departments), Platform (shared services hub), or Matrix (cross-functional teams) — to see how each layer transforms. The Capability Maturity tab lets you rate each component from 1 (Ad Hoc) to 5 (Optimized) for both current and target state. The gap between current and target drives investment estimates. A function scoring 2 today with a target of 4 needs significant investment in process, technology, and people. The Operating Model Canvas lets you drag-and-drop components to design a custom architecture.` },

  { page: "bbba", icon: "🔀", title: "Design — BBBA Framework, Org Design Studio & Headcount Planning",
    body: `Build/Buy/Borrow/Automate is the sourcing strategy layer. Each redesigned role gets a recommendation based on gap analysis and adjacency scores. Build means reskilling internal candidates (lowest risk, moderate cost). Buy means external hiring (fast but expensive). Borrow means contractors or gig workers (flexible but temporary). Automate means the role is fully replaced by technology. The Org Design Studio models structural changes: span of control ratios, layer reduction, function merges. Headcount Planning shows the waterfall: starting headcount minus automation eliminations, plus natural attrition absorption, plus internal redeployments, plus new hires, equals the net change your CFO cares about. The Financial Impact section shows whether the transformation pays for itself in Year 1.` },

  // ═══ Steps 15-17: Simulate ═══
  { page: "simulate", icon: "⚡", title: "Simulate — Scenarios & Presets",
    body: `The Impact Simulator lets you model three adoption scenarios. Conservative (30% AI adoption) produces small, safe changes over 18 months — ideal for risk-averse organizations. Balanced (55% adoption) delivers moderate transformation over 10 months — the most common starting point. Aggressive (80% adoption) maximizes automation with the fastest ROI but carries the highest change management risk. You can also create a Custom scenario by adjusting adoption rate, timeline, and per-role investment independently. Each scenario instantly recalculates every downstream metric: hours released, FTE equivalents freed, redeployment capacity, and financial returns. Toggle between scenarios to see how the numbers shift — this is the sensitivity analysis your board will ask for.` },

  { page: "simulate", icon: "📊", title: "Simulate — Capacity Waterfall & FTE Impact",
    body: `The Capacity Waterfall visualization shows how time is freed across the organization. Starting from total weekly hours, each bar subtracts automated tasks and augmented tasks, leaving the remaining human hours. The FTE Impact calculation translates freed hours into full-time-equivalent reductions (or reallocations). This is not necessarily a headcount reduction — the Redeployment sub-tab shows how freed time can be redirected: Higher-Value Work, Innovation, Customer Engagement, or Training. The split between these categories determines whether your transformation story is about efficiency (doing the same with less) or growth (doing more with the same). Most successful transformations aim for 60% redeployment to higher-value work and 20% to innovation.` },

  { page: "simulate", icon: "💰", title: "Simulate — Cost/ROI Model & Scenario Comparison",
    body: `The Cost/ROI Model calculates the full financial picture. Investment costs include technology licensing, implementation, reskilling programs, change management, and severance. Returns include labor cost savings from automation, productivity gains from augmentation, and revenue uplift from redeployment to growth activities. The payback period shows when cumulative returns exceed cumulative investment — typically 8-14 months for a balanced scenario. The Scenario Comparison view puts Conservative, Balanced, and Aggressive side by side across every metric. This is the slide that gets the most attention in board presentations, because it shows the trade-off between speed, risk, and return in concrete financial terms.` },

  // ═══ Steps 18-21: Mobilize ═══
  { page: "plan", icon: "🚀", title: "Mobilize — Change Planner & Gantt Chart",
    body: `The Change Planner auto-generates a transformation roadmap from everything you have configured. Click "Auto-Build Plan" and the AI creates initiatives organized into waves: Foundation (assessments, tool setup), Quick Wins (high-impact, low-effort changes), Core Transformation (major role redesigns), and Optimization (fine-tuning). Each initiative has an owner, priority level, dependencies, and timeline. The Gantt chart visualization shows initiatives sequenced across waves with dependency arrows. Every row is fully editable — change owners, shift priorities, move initiatives between waves. The critical path is highlighted to show which delays would push back the entire program. Stakeholder mapping identifies who needs to approve, champion, or be informed for each initiative.` },

  { page: "plan", icon: "⚠️", title: "Mobilize — Risk Register & Communication Plan",
    body: `The Risk Register aggregates risks identified across all modules: skills gaps too large to close internally, managers below capability threshold, functions with low change readiness, and headcount changes that exceed natural attrition capacity. Each risk has a probability rating, impact severity, proposed mitigation, and assigned owner. The Communication Plan outlines what messages need to go to which audiences at each phase of the transformation. It distinguishes between executive sponsors (who need ROI data), middle managers (who need operational detail), and frontline employees (who need reassurance and clarity). The plan includes suggested channels, frequency, and messaging frameworks for each audience segment.` },

  { page: "story", icon: "📖", title: "Mobilize — Story Builder & Readiness Archetypes",
    body: `The Transformation Story Builder helps you craft the narrative that ties together all the analytical work. It takes your data — which roles are changing, what skills are growing, how the operating model shifts — and structures it into a compelling change story with a beginning (why we must transform), middle (what changes and how), and end (the future state and its benefits). Readiness Archetypes segment your workforce into behavioral profiles: Early Adopters (enthusiastic, ready to champion), Pragmatic Majority (willing but need evidence), Skeptics (resistant but persuadable), and Active Resistors (need intensive intervention). Each archetype has a tailored engagement strategy, communication approach, and support plan.` },

  { page: "reskill", icon: "📚", title: "Mobilize — Reskilling Pathways & Talent Marketplace",
    body: `Reskilling Pathways creates personalized learning plans for every employee with skill gaps. The system matches gap severity with readiness level to determine pathway intensity: high-readiness employees with small gaps get short, self-paced modules; low-readiness employees with large gaps need instructor-led intensive programs. Each pathway includes estimated duration, cost, and recommended providers. The Talent Marketplace matches internal candidates to redesigned roles using a composite score of skill adjacency, readiness level, and reskilling timeline. Strong matches (above 70%) are Build candidates — reskilling is cost-effective. Weak matches (below 50%) signal external hire needs. This data directly feeds the BBBA framework's sourcing recommendations.` },

  // ═══ Steps 22-23: Export ═══
  { page: "export", icon: "📦", title: "Export — Excel, PowerPoint & PDF Generation",
    body: `The Export module generates board-ready deliverables from your analysis. Excel exports include the full data tables: employee-level skills inventories, role-by-role task deconstructions, financial models with formulas preserved, and risk registers with status tracking. PowerPoint exports create formatted slide decks with visualizations, key findings, and executive summaries — ready for steering committee presentations. PDF exports produce formatted reports suitable for stakeholder distribution. Each export type lets you select which modules to include, so you can generate a focused Skills Gap Report or a comprehensive Transformation Business Case. Data readiness indicators show which modules have complete data and which need more input before exporting.` },

  { page: "export", icon: "✅", title: "Export — Data Readiness & Deliverable Quality",
    body: `Before generating exports, the Data Readiness panel shows a checklist of what is complete and what is missing. Green checkmarks mean the module has sufficient data for a reliable export. Yellow warnings mean partial data exists but some assumptions will be made. Red flags mean critical inputs are missing and the export may contain gaps. The platform prioritizes honest reporting over impressive-looking slides — if your skills data only covers 60% of employees, the export will clearly state that limitation. Deliverable quality depends on the depth of your analysis: a transformation program that has completed Diagnose, Design, and Simulate will produce a much richer export than one that only completed Overview. The system guides you on what to complete next for maximum deliverable quality.` },

  // ═══ Steps 24-25: AI Features ═══
  { page: "home", icon: "☕", title: "AI Features — AI Espresso Chat Assistant",
    body: `AI Espresso is the platform's built-in AI assistant, accessible via the coffee cup button in the bottom-right corner of any module. It has full context of your current view, selected model, active job, and module state. Ask it questions like "Give me an executive summary of this workforce," "What are the biggest skill gaps?," or "Draft a change communication for the finance team." It can generate analysis narratives, compare scenarios in natural language, identify patterns across modules, and draft stakeholder communications. The assistant understands the domain vocabulary — task deconstruction, BBBA dispositions, readiness archetypes, capacity waterfalls — and responds with consultant-grade language suitable for client deliverables.` },

  { page: "home", icon: "💡", title: "AI Features — Insight Cards & Intelligent Recommendations",
    body: `Throughout the platform, AI-generated insight cards appear when the system detects noteworthy patterns, risks, or opportunities in your data. These are not generic tips — they are computed from your specific workforce data. For example, if the skills gap analysis reveals that 40% of your workforce lacks AI Literacy but your readiness scores show high Change Openness, the system will recommend prioritizing AI literacy training because the workforce is receptive. Insight cards appear in the Workforce Snapshot, AI Opportunity Scan, Skills Analysis, and Change Readiness modules. They surface cross-module connections that might not be obvious when looking at each module in isolation. Think of them as a virtual analyst who has read all your data and is flagging what matters most.` },

  // ═══ Step 26: Platform Hub ═══
  { page: "home", icon: "🏠", title: "Platform Hub — Account, Knowledge Base & Resources",
    body: `The Platform Hub (accessible from the sidebar) is your home base for account management and learning resources. The Account section manages your profile, preferences, and session history. The About section explains the platform's methodology, data model, and analytical frameworks. The Knowledge Base contains deep-dive articles on every module: what it does, how to interpret the outputs, and best practices for client conversations. The Use Cases library shows real-world examples of how the platform has been used across industries — from a 500-person tech startup to a 50,000-employee healthcare system. The Tutorials section (where this guided tour lives) offers self-paced walkthroughs for specific workflows. All resources are searchable and organized by topic.` },

  // ═══ Step 27: Next Steps ═══
  { page: "home", icon: "🎉", title: "Next Steps — You've Completed the Tour",
    body: `Congratulations — you have explored the entire platform across all six modules. You have seen how task-level deconstruction drives AI impact scores, how skills gaps determine talent sourcing strategy, how manager capability multiplies team readiness, and how everything flows into a financial model and change management roadmap. To start a real engagement, click "Back to Projects" and create a New Project with your organization's data. Upload employee rosters, skills assessments, and task inventories using the template (downloadable from the sidebar). The platform will guide you through the same analytical journey you just experienced, but with your real data. If you need help at any point, use AI Espresso or revisit this sandbox to refresh your memory. Good luck with your transformation.` },
  ];
}

// Default fallback for non-tutorial contexts
const TUTORIAL_STEPS = buildTutorialSteps("tutorial_mid_technology");

/* ═══ VIEW SELECTOR SCREEN — shown after sandbox company selection, before tutorial ═══ */
function SandboxViewSelector({ companyName, onSelect }: { companyName: string; onSelect: (mode: string) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, []);
  const views = [
    { id: "org", icon: "🏢", label: "Organization View", desc: "Explore by organizational structure — functions, departments, teams. See aggregate KPIs, cross-cutting analytics, and the full workforce picture. Best for executive-level analysis." },
    { id: "employee_select", icon: "👤", label: "Employee View", desc: "Explore by individual employees — skills, roles, career paths. Track a single person through every module: readiness, reskilling pathway, and impact assessment." },
    { id: "job_select", icon: "💼", label: "Job View", desc: "Explore by job architecture — families, levels, career tracks. Focus on a single role's task portfolio, AI impact, deconstruction, and redesign." },
    { id: "custom", icon: "⚙️", label: "Custom Slice", desc: "Create a custom view with your own filters. Narrow by function, job family, career level, or sub-family. Best for function leads who own a specific part of the org." },
  ];
  return <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "#0B1120", display: "flex", alignItems: "center", justifyContent: "center", opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(212,134,10,0.1) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(192,112,48,0.05) 0%, transparent 50%)" }} />
    <div style={{ position: "relative", zIndex: 1, maxWidth: 720, width: "100%", padding: "0 24px", textAlign: "center", transform: visible ? "translateY(0)" : "translateY(12px)", transition: "transform 0.5s ease" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(224,144,64,0.5)", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>Welcome to</div>
      <h2 style={{ fontSize: 32, fontWeight: 800, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", marginBottom: 8, textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>{companyName}</h2>
      <p style={{ fontSize: 15, color: "rgba(255,230,200,0.45)", marginBottom: 36 }}>How would you like to explore this organization?</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {views.map((v, i) => <button key={v.id} onClick={() => onSelect(v.id)} style={{ padding: "24px", borderRadius: 18, background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", border: "1px solid rgba(212,134,10,0.1)", cursor: "pointer", textAlign: "left", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)", display: "flex", flexDirection: "column", gap: 10, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)", transitionDelay: `${0.15 + i * 0.06}s` }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,134,10,0.08)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.3)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(212,134,10,0.1)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.1)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28, filter: "drop-shadow(0 2px 6px rgba(212,134,10,0.2))" }}>{v.icon}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif" }}>{v.label}</span>
          </div>
          <p style={{ fontSize: 15, color: "rgba(255,230,200,0.35)", lineHeight: 1.7, margin: 0 }}>{v.desc}</p>
        </button>)}
      </div>
      <p style={{ fontSize: 15, color: "rgba(255,230,200,0.2)", marginTop: 24 }}>You can change your view anytime from the sidebar</p>
    </div>
  </div>;
}


/* ═══ TUTORIAL PANEL — fixed-position bottom companion card ═══ */
function TutorialOverlay({ step, totalSteps, steps, onNext, onPrev, onClose, onJump }: {
  step: number; totalSteps: number;
  steps: TutorialStep[];
  onNext: () => void; onPrev: () => void; onClose: () => void; onJump: (s: number) => void;
}) {
  const s = steps[step];
  if (!s) return null;
  const isLast = step === totalSteps - 1;
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  // Phase labels based on step ranges
  const phaseLabel = step < 3 ? "Welcome" : step < 5 ? "Overview" : step < 8 ? "Diagnose" : step < 11 ? "Job Architecture" : step < 14 ? "Design" : step < 17 ? "Simulate" : step < 21 ? "Mobilize" : step < 23 ? "Export" : step < 25 ? "AI Features" : step < 26 ? "Platform Hub" : "Finish";
  const phaseColor = step < 3 ? "#D4860A" : step < 5 ? "#E8C547" : step < 8 ? "#C07030" : step < 11 ? "#D4860A" : step < 14 ? "#E09040" : step < 17 ? "#E8C547" : step < 21 ? "#C07030" : step < 23 ? "#D4860A" : step < 25 ? "#E09040" : step < 26 ? "#E8C547" : "#10B981";

  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(false); const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, [step]);

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return <div style={{
    position: "fixed", bottom: 16, right: 16, zIndex: 50,
    width: 440, maxHeight: "min(420px, calc(100vh - 100px))",
    borderRadius: 18,
    background: "rgba(15,12,8,0.92)",
    backdropFilter: "blur(24px)",
    border: "1px solid rgba(212,134,10,0.15)",
    boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,134,10,0.05)",
    display: "flex", flexDirection: "column",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(8px)",
    transition: "opacity 0.35s ease, transform 0.35s ease",
    overflow: "hidden",
  }}>
    {/* Header */}
    <div style={{ padding: "14px 16px 10px", flexShrink: 0, borderBottom: "1px solid rgba(212,134,10,0.08)" }}>
      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginBottom: 10 }}>
        <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${phaseColor}, #D4860A)`, width: `${pct}%`, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>{s.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#D4860A", letterSpacing: 1 }}>STEP {step + 1}/{totalSteps}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: phaseColor, background: `${phaseColor}18`, padding: "1px 7px", borderRadius: 4 }}>{phaseLabel}</span>
              <span style={{ fontSize: 14, color: "rgba(255,230,200,0.3)" }}>{pct}%</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
          </div>
        </div>
        <button onClick={onClose} title="Close tutorial" style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "rgba(255,230,200,0.35)", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#f5e6d0"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,230,200,0.35)"; }}>✕</button>
      </div>
    </div>

    {/* Body — scrollable */}
    <div style={{ padding: "12px 16px 10px", overflowY: "auto", flex: 1, minHeight: 0 }}>
      <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(255,230,200,0.6)", margin: 0 }}>{s.body}</p>
    </div>

    {/* Step dots */}
    <div style={{ padding: "4px 16px 6px", display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap", flexShrink: 0 }}>
      {steps.map((_ts, i) => <button key={i} onClick={() => onJump(i)} title={`Step ${i+1}: ${steps[i].title}`} style={{ width: i === step ? 14 : 6, height: 6, borderRadius: 3, background: i === step ? "#D4860A" : i < step ? "rgba(212,134,10,0.3)" : "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", transition: "all 0.25s", flexShrink: 0, padding: 0 }} />)}
    </div>

    {/* Controls */}
    <div style={{ padding: "8px 16px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, gap: 8 }}>
      <button onClick={onPrev} disabled={step === 0} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: step === 0 ? "not-allowed" : "pointer", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,230,200,0.5)", opacity: step === 0 ? 0.3 : 1, transition: "all 0.2s" }}>Back</button>
      <button onClick={onClose} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 15, cursor: "pointer", background: "none", border: "none", color: "rgba(255,230,200,0.25)", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,230,200,0.5)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,230,200,0.25)"}>Skip Tour</button>
      <button onClick={onNext} style={{ padding: "8px 20px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", border: "none", color: "#fff", background: isLast ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #E09040, #C07030)", boxShadow: isLast ? "0 3px 10px rgba(16,185,129,0.25)" : "0 3px 10px rgba(224,144,64,0.2)", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>{isLast ? "Finish Tour" : "Next"}</button>
    </div>
  </div>;
}

/* ═══ TUTORIAL BADGE — persistent reopener with progress ═══ */
function TutorialBadge({ onClick, step, total }: { onClick: () => void; step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return <button onClick={onClick} style={{ position: "fixed", bottom: 16, right: 16, zIndex: 40, padding: "8px 14px", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", background: "rgba(15,12,8,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(212,134,10,0.15)", color: "#E09040", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", transition: "all 0.3s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.35)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"; }}>
    <span>🎓</span>
    <span>Tutorial</span>
    <span style={{ fontSize: 14, opacity: 0.5 }}>{pct}%</span>
    <div style={{ width: 28, height: 3, borderRadius: 2, background: "rgba(212,134,10,0.15)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "#D4860A", borderRadius: 2 }} /></div>
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
  const [pendingSandbox, setPendingSandbox] = useState<{ id: string; name: string; meta: string } | null>(null);

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

  // Duplicate name check
  const nameExists = (name: string) => projects.some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  const nameTaken = newName.trim().length > 0 && nameExists(newName);

  const createProject = () => {
    if (!newName.trim() || nameTaken) return;
    const metaParts = [newClient, newIndustry, newSize, newLead, newDesc].filter(Boolean).join(" · ");
    const p = { id: `proj_${Date.now()}`, name: newName.trim(), meta: metaParts.trim(), client: newClient.trim(), industry: newIndustry, size: newSize, lead: newLead.trim(), created: new Date().toLocaleDateString(), status: "Not Started", cardBackgrounds: generateCardBackgrounds(), phaseBackgrounds: { ...PHASE_BACKGROUNDS } };
    const updated = [...projects, p];
    setProjects(updated);
    localStorage.setItem("hub_projects", JSON.stringify(updated));
    setNewName(""); setNewDesc(""); setNewClient(""); setNewIndustry(""); setNewSize(""); setNewLead(""); setModalOpen(false);
    onOpenProject(p);
  };

  const cloneProject = (src: { id: string; name: string; meta: string; client?: string; industry?: string; size?: string; lead?: string; created: string; status: string }) => {
    let ver = 2;
    let cloneName = `${src.name} — v${ver}`;
    while (nameExists(cloneName)) { ver++; cloneName = `${src.name} — v${ver}`; }
    const cloneId = `proj_${Date.now()}`;
    const clone = { ...src, id: cloneId, name: cloneName, created: new Date().toLocaleDateString(), status: "Not Started" };
    // Copy all localStorage data from source project
    Object.keys(localStorage).filter(k => k.startsWith(src.id)).forEach(k => {
      const newKey = k.replace(src.id, cloneId);
      try { localStorage.setItem(newKey, localStorage.getItem(k) || ""); } catch {}
    });
    const updated = [...projects, clone];
    setProjects(updated);
    localStorage.setItem("hub_projects", JSON.stringify(updated));
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem("hub_projects", JSON.stringify(updated));
    Object.keys(localStorage).filter(k => k.startsWith(id) || k.includes(id)).forEach(k => localStorage.removeItem(k));
    setConfirmDelete(null);
  };

  // Adaptive card sizing
  const count = projects.length + 2; // +2 for sandbox + new project
  const cardWidth = count <= 3 ? 380 : count <= 5 ? 300 : count <= 7 ? 260 : 220;

  // ── View selector screen — shown after sandbox company selection ──
  if (pendingSandbox) {
    return <SandboxViewSelector companyName={pendingSandbox.name} onSelect={(mode) => {
      // Store the chosen view mode so Home picks it up
      localStorage.setItem(`${pendingSandbox.id}_viewMode`, JSON.stringify(mode === "custom" ? "custom" : mode));
      setPendingSandbox(null);
      setSandboxOpen(false);
      setSandboxPanelOpen(false);
      onOpenProject(pendingSandbox);
    }} />;
  }

  // ── Sandbox full-screen picker ──
  if (sandboxOpen) {
    return <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0B1120" }}>
      {/* Full-bleed storefront background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/sandbox_bg.png), linear-gradient(160deg, #0B1120 0%, #1a1a30 40%, #12182a 100%)", backgroundSize: "cover, cover", backgroundPosition: "center 60%, center center", backgroundRepeat: "no-repeat, no-repeat" }} />
      <div style={{ position: "absolute", inset: 0, background: sandboxPanelOpen ? "rgba(8,12,24,0.55)" : "radial-gradient(ellipse at 35% 40%, rgba(8,12,24,0.1) 0%, rgba(8,12,24,0.35) 50%, rgba(8,12,24,0.6) 100%)", transition: "background 0.5s ease" }} />

      {/* Back button */}
      <button onClick={() => { setSandboxOpen(false); setSandboxPanelOpen(false); }} style={{ position: "absolute", top: 24, left: 24, zIndex: 30, padding: "8px 16px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.12)", color: "rgba(255,230,200,0.8)", transition: "all 0.2s" }}>← Back</button>

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
              <div style={{ fontSize: 15, color: "rgba(200,180,255,0.4)", marginTop: 4 }}>24 real companies · 8 industries × 3 market caps</div>
            </div>
            <button onClick={() => setSandboxPanelOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,150,0.08)", cursor: "pointer", color: "rgba(255,200,150,0.4)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Industry × Size Grid */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 4 }}>
              <thead><tr>
                <th style={{ fontSize: 15, color: "rgba(200,180,255,0.3)", textAlign: "left", padding: "6px 10px", fontWeight: 700 }}>INDUSTRY</th>
                <th style={{ fontSize: 15, color: "rgba(16,185,129,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>SMALL</th>
                <th style={{ fontSize: 15, color: "rgba(212,134,10,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>MID-CAP</th>
                <th style={{ fontSize: 15, color: "rgba(239,68,68,0.6)", textAlign: "center", padding: "6px", fontWeight: 700 }}>LARGE-CAP</th>
              </tr></thead>
              <tbody>{[
                { id: "technology", icon: "💻", label: "Technology", s: "Palantir · 3,800", m: "ServiceNow · 8,000", l: "Adobe · 25,000" },
                { id: "financial_services", icon: "🏦", label: "Financial Svc", s: "Evercore · 2,200", m: "Raymond James · 8,000", l: "Goldman Sachs · 25,000" },
                { id: "healthcare", icon: "🏥", label: "Healthcare", s: "Hims & Hers · 1,500", m: "Molina · 8,000", l: "Elevance · 25,000" },
                { id: "retail", icon: "🛍️", label: "Retail", s: "Five Below · 3,000", m: "Williams-Sonoma · 8,000", l: "Target · 25,000" },
                { id: "manufacturing", icon: "🏭", label: "Manufacturing", s: "Axon · 4,000", m: "Parker Hannifin · 8,000", l: "Honeywell · 25,000" },
                { id: "consulting", icon: "💼", label: "Consulting", s: "Huron · 2,500", m: "Booz Allen · 8,000", l: "Accenture · 25,000" },
                { id: "energy", icon: "⚡", label: "Energy", s: "Shoals Tech · 1,800", m: "Chesapeake · 3,000", l: "Baker Hughes · 25,000" },
                { id: "aerospace", icon: "🚀", label: "Aerospace", s: "Kratos · 4,000", m: "L3Harris · 8,000", l: "Northrop Grumman · 25,000" },
              ].map(ind => <tr key={ind.id}>
                <td style={{ fontSize: 15, color: "rgba(200,180,255,0.7)", padding: "3px 10px", fontWeight: 600 }}><span style={{ marginRight: 6 }}>{ind.icon}</span>{ind.label}</td>
                {[{size: "small", info: ind.s, color: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#6EE7B7"}, {size: "mid", info: ind.m, color: "rgba(212,134,10,0.12)", border: "rgba(212,134,10,0.25)", text: "#E8C547"}, {size: "large", info: ind.l, color: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", text: "#FCA5A5"}].map(t => <td key={t.size} style={{ padding: 2 }}><button disabled={!!seedingId} onClick={async (e) => {
                  e.stopPropagation();
                  const tid = `tutorial_${t.size}_${ind.id}`;
                  setSeedingId(tid);
                  try { await fetch(`/api/tutorial/seed?industry=${ind.id}&size=${t.size}`); } catch {}
                  seedTutorialData(tid, ind.id);
                  setSeedingId(null);
                  const companyName = t.info.split(" · ")[0] || ind.label;
                  setPendingSandbox({ id: tid, name: companyName, meta: `${ind.label} · ${t.size === "small" ? "Small-Cap" : t.size === "mid" ? "Mid-Cap" : "Large-Cap"} · ${t.info.split(" · ")[1] || ""} employees` });
                }} style={{ width: "100%", padding: "7px 8px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: seedingId ? "wait" : "pointer", background: seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.25)" : t.color, border: `1px solid ${seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.5)" : t.border}`, color: t.text, transition: "all 0.2s", textAlign: "center", lineHeight: 1.4, opacity: seedingId && seedingId !== `tutorial_${t.size}_${ind.id}` ? 0.4 : 1 }} onMouseEnter={e => { if (!seedingId) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.borderColor = t.text; }}} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = t.border; }}>{seedingId === `tutorial_${t.size}_${ind.id}` ? "⏳ Loading..." : t.info}</button></td>)}
              </tr>)}</tbody>
            </table>
          </div>

          {/* Guided tour note */}
          <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(139,92,246,0.7)", marginBottom: 4 }}>✨ Each sandbox includes:</div>
            <div style={{ fontSize: 15, color: "rgba(200,180,255,0.4)", lineHeight: 1.6 }}>Full employee roster · Task-level work design · Skills inventory · AI readiness scores · Manager capability · Change readiness · 27-step guided tutorial</div>
          </div>
        </div>
      </div>
    </div>;
  }

  return <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#0B1120" }}>
    {/* Full-bleed background */}
    <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/hero_bg.png), linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 65%, #0a0f1a 100%)", backgroundSize: "cover, cover", backgroundPosition: "center center, center center", backgroundRepeat: "no-repeat, no-repeat", width: "100vw", height: "100vh" }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(11,17,32,0.25) 0%, rgba(11,17,32,0.45) 40%, rgba(11,17,32,0.7) 100%)", width: "100vw", height: "100vh" }} />

    {/* Content */}
    <div style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3" style={{ fontFamily: "Outfit, sans-serif", textShadow: "0 2px 24px rgba(0,0,0,0.3)" }}>Your Projects</h1>
        <p className="text-[15px]" style={{ color: "rgba(255,220,180,0.5)" }}>Select a project or create a new one</p>
      </div>

      {/* Three-section layout */}
      <div style={{ maxWidth: 900, width: "100%" }}>
        {/* Top row: Sandbox + New Project */}
        <div className="flex gap-5 justify-center mb-8">
          {/* Sandbox card */}
          <div onClick={() => setSandboxOpen(true)} style={{ width: 380, minHeight: 180, borderRadius: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))", backdropFilter: "blur(20px)", border: "1px solid rgba(139,92,246,0.2)", position: "relative", overflow: "hidden" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(99,102,241,0.15)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)"; }}>
            <div className="text-4xl" style={{ filter: "drop-shadow(0 2px 8px rgba(139,92,246,0.3))" }}>🎓</div>
            <div className="text-[18px] font-bold text-white">Sandbox</div>
            <div className="text-[15px]" style={{ color: "rgba(200,180,255,0.4)" }}>24 real companies · 8 industries</div>
          </div>

          {/* New Project card */}
          <div onClick={() => setModalOpen(true)} style={{ width: 380, minHeight: 180, borderRadius: 22, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)", background: "rgba(255,230,200,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,200,150,0.15)", position: "relative", overflow: "hidden" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.2)"; e.currentTarget.style.background = "rgba(255,230,200,0.18)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "rgba(255,230,200,0.1)"; }}>
            <div className="text-4xl" style={{ filter: "drop-shadow(0 2px 8px rgba(200,120,40,0.3))" }}>✨</div>
            <div className="text-[18px] font-bold text-white">New Project</div>
            <div className="text-[15px]" style={{ color: "rgba(255,220,180,0.4)" }}>Start a transformation</div>
          </div>
        </div>

        {/* My Projects section */}
        {projects.length > 0 && <div style={{ borderRadius: 22, background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px", marginTop: 4 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📂</span>
              <span className="text-[15px] font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>My Projects</span>
              <span className="text-[15px] px-2 py-0.5 rounded-full" style={{ background: "rgba(212,134,10,0.12)", color: "rgba(232,197,71,0.7)" }}>{projects.length}</span>
            </div>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: projects.length === 1 ? "1fr" : "1fr 1fr" }}>
            {projects.map(p => {
              let pStatus = p.status;
              try { const v = localStorage.getItem(`${p.id}_visited`); if (v && Object.keys(JSON.parse(v)).length > 0) pStatus = "In Progress"; } catch {}
              try { const vm = localStorage.getItem(`${p.id}_viewMode`); if (vm) pStatus = "In Progress"; } catch {}
              const statusColor = pStatus === "In Progress" ? "#E09040" : pStatus === "Complete" ? "#10B981" : "rgba(255,200,150,0.3)";
              let modulesVisited = 0;
              try { const v = localStorage.getItem(`${p.id}_visited`); if (v) modulesVisited = Object.keys(JSON.parse(v)).length; } catch {}

              return <div key={p.id} onClick={() => onOpenProject(p)} style={{ borderRadius: 16, cursor: "pointer", padding: "16px 20px", transition: "all 0.3s", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", position: "relative" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,200,150,0.05)"; e.currentTarget.style.borderColor = "rgba(255,200,150,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-[15px] font-bold text-white mb-0.5">{p.name}</div>
                    <div className="flex items-center gap-2">
                      {p.industry && <span className="text-[14px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,134,10,0.12)", color: "rgba(232,197,71,0.7)" }}>{p.industry}</span>}
                      <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} /><span className="text-[14px] font-bold uppercase" style={{ color: statusColor }}>{pStatus}</span></div>
                      {modulesVisited > 0 && <span className="text-[14px]" style={{ color: "rgba(255,255,255,0.2)" }}>{modulesVisited}/8 modules</span>}
                    </div>
                  </div>
                  {/* Delete + Clone buttons */}
                  <div className="flex gap-1 shrink-0" style={{ opacity: 0, transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0"}>
                    <button onClick={e => { e.stopPropagation(); cloneProject(p); }} style={{ color: "rgba(255,255,255,0.25)", fontSize: 15, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }} onMouseEnter={e => e.currentTarget.style.color = "#D4860A"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"} title="Clone">⧉</button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(p.id); }} style={{ color: "rgba(255,255,255,0.25)", fontSize: 15, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }} onMouseEnter={e => e.currentTarget.style.color = "#ef4444"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"} title="Delete">✕</button>
                  </div>
                </div>
              </div>;
            })}
          </div>
        </div>}
      </div>
    </div>

    {/* Create modal */}
    {modalOpen && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl p-8 w-full max-w-md" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">New Transformation Project</h2>
        <p className="text-[15px] text-[var(--text-muted)] mb-5">Fill in the details below to set up your workspace</p>
        <div className="space-y-3">
          <div><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Project Name *</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Acme Corp AI Transformation" className={`w-full bg-[var(--surface-2)] border rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] ${nameTaken ? "border-[var(--risk)]" : "border-[var(--border)]"}`} autoFocus />
          {nameTaken && <div className="text-[15px] text-[var(--risk)] mt-1">A project with this name already exists. Please choose a different name.</div>}</div>
          <div><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Client / Organization</div>
          <input value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="e.g. Acme Corporation" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Industry</div>
            <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none">
              <option value="">Select industry...</option>
              {["Financial Services","Technology","Healthcare","Manufacturing","Retail","Energy","Media","Professional Services","Public Sector","Other"].map(i => <option key={i} value={i}>{i}</option>)}
            </select></div>
            <div><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Org Size</div>
            <select value={newSize} onChange={e => setNewSize(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none">
              <option value="">Select size...</option>
              {["< 500 employees","500 - 2,000","2,000 - 10,000","10,000 - 50,000","50,000+"].map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>
          </div>
          <div><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Project Lead</div>
          <input value={newLead} onChange={e => setNewLead(e.target.value)} placeholder="e.g. Jane Smith, VP Transformation" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>
          <div><div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Description / Objectives</div>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What are the goals of this transformation? What functions are in scope?" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] resize-none" rows={3} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={() => { setModalOpen(false); setNewName(""); setNewDesc(""); setNewClient(""); setNewIndustry(""); setNewSize(""); setNewLead(""); }} className="px-4 py-2.5 text-[15px] text-[var(--text-muted)] rounded-xl border border-[var(--border)]">Cancel</button>
          <button onClick={createProject} disabled={!newName.trim() || nameTaken} className="px-6 py-2.5 rounded-xl text-[15px] font-semibold text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg, #e09040, #c07030)" }}>Create Project</button>
        </div>
      </div>
    </div>}

    {/* Delete confirmation */}
    {confirmDelete && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setConfirmDelete(null)}>
      <div className="rounded-2xl p-6 w-full max-w-sm text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
        <div className="text-3xl mb-2">⚠️</div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">Delete Project?</h3>
        <p className="text-[15px] text-[var(--text-secondary)] mb-1">Are you sure you want to delete <strong className="text-[var(--text-primary)]">{projects.find(p => p.id === confirmDelete)?.name || "this project"}</strong>?</p>
        <p className="text-[15px] text-[var(--risk)] mb-4">This cannot be undone. All project data will be permanently removed.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setConfirmDelete(null)} className="px-5 py-2 rounded-xl text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
          <button onClick={() => deleteProject(confirmDelete)} className="px-5 py-2 rounded-xl text-[15px] font-semibold bg-[var(--risk)] text-white">Delete</button>
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
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" as const, letterSpacing: "1.5px" };
  const btnStyle: React.CSSProperties = { width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #e09040, #c07030)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.5px", boxShadow: "0 4px 20px rgba(224,144,64,0.3)", transition: "all 0.3s" };
  const hintStyle: React.CSSProperties = { fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", marginTop: 3, display: "flex", alignItems: "center", gap: 4 };
  const focusBorder = "rgba(224,144,64,0.5)";

  // ── Welcome modal after successful registration ──
  if (successUser) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/login_bg.png), linear-gradient(135deg, #1a1208 0%, #2a1a0a 30%, #0f0d08 70%, #1a1510 100%)", backgroundSize: "cover, cover", backgroundPosition: "center center, center center", backgroundRepeat: "no-repeat, no-repeat" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(10,8,5,0.3) 0%, rgba(10,8,5,0.75) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, padding: "0 24px", textAlign: "center" }}>
          <div style={{ background: "rgba(15,12,8,0.7)", backdropFilter: "blur(30px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: "40px 32px", boxShadow: "0 32px 100px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f5e6d0", marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>Welcome, {successUser.display_name || successUser.username}!</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 28, lineHeight: 1.6 }}>Your account is ready. Start exploring the AI Transformation Platform.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { sessionStorage.setItem("fresh_login", "1"); onAuth(successUser); }}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#f5e6d0", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
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
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/login_bg.png), linear-gradient(135deg, #1a1208 0%, #2a1a0a 30%, #0f0d08 70%, #1a1510 100%)", backgroundSize: "cover, cover", backgroundPosition: "center center, center center", backgroundRepeat: "no-repeat, no-repeat" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(10,8,5,0.25) 0%, rgba(10,8,5,0.7) 100%)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.5px", textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}>AI Transformation</div>
          <div style={{ fontSize: 15, color: "rgba(224,144,64,0.85)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "5px", textTransform: "uppercase" as const, marginTop: 4, textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>Platform</div>
        </div>

        <div style={{ background: "rgba(15,12,8,0.65)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: "32px 28px", boxShadow: "0 32px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)", animation: shakeError ? "shake 0.5s ease" : undefined }}>
          <style>{`@keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
            @keyframes pulseBtn { 0%,100% { box-shadow: 0 4px 20px rgba(224,144,64,0.3); } 50% { box-shadow: 0 4px 28px rgba(224,144,64,0.5); } }`}</style>

          {(mode === "login" || mode === "register") && (
            <div style={{ display: "flex", gap: 3, marginBottom: 22, background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: 3 }}>
              {(["login", "register"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); setMessage(""); }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 15, fontWeight: 600, fontFamily: "'Outfit', sans-serif", border: "none", cursor: "pointer", transition: "all 0.25s",
                    background: mode === m ? "rgba(224,144,64,0.18)" : "transparent",
                    color: mode === m ? "#e09040" : "rgba(255,255,255,0.35)",
                  }}>{m === "login" ? "Sign In" : "Create Account"}</button>
              ))}
            </div>
          )}

          {mode === "forgot" && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>← Back to Sign In</button>
              <h3 style={{ color: "#f5e6d0", fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>Forgot Password</h3>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 15, marginTop: 4 }}>Enter your email to receive a reset link.</p>
            </div>
          )}
          {mode === "reset" && (
            <div style={{ marginBottom: 18 }}>
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>← Back to Sign In</button>
              <h3 style={{ color: "#f5e6d0", fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>Reset Password</h3>
            </div>
          )}

          {error && error.trim() && <div style={{ background: "rgba(220,50,50,0.12)", border: "1px solid rgba(220,50,50,0.25)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, color: "#f08080", fontSize: 15, fontFamily: "'IBM Plex Mono', monospace" }}>{error}</div>}
          {message && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "9px 12px", marginBottom: 14, color: "#6ee7b7", fontSize: 15, fontFamily: "'IBM Plex Mono', monospace" }}>{message}</div>}

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <form onSubmit={e => { e.preventDefault(); handleLogin(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }} autoComplete="on" noValidate>
              <div><label style={labelStyle}>Username</label><input value={username} onChange={e => setUsername(e.target.value)} onInvalid={e => e.preventDefault()} formNoValidate placeholder="Enter username" style={inputStyle} autoComplete="username" name="username" onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} /></div>
              <div><label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onInvalid={e => e.preventDefault()} formNoValidate placeholder="Enter password" style={{ ...inputStyle, paddingRight: 44 }} autoComplete="off" name="password" onFocus={e => e.currentTarget.style.borderColor = focusBorder} onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 15 }}>{showPw ? "🙈" : "👁"}</button>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={rememberMe} onChange={e => { setRememberMe(e.target.checked); if (!e.target.checked) authApi.clearRememberedCredentials(); }} style={{ accentColor: "#e09040", width: 14, height: 14 }} />
                <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace" }}>Remember me</span>
              </label>
              <button type="submit" disabled={loading || !username || !password} style={{ ...btnStyle, opacity: loading ? 0.5 : 1, marginTop: 2 }}>{loading ? "Signing in..." : "Sign In"}</button>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 15, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>Forgot password?</button>
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
                  {emailAvailable === "checking" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#f59e0b", fontSize: 15 }}>...</span>}
                  {emailAvailable === "available" && showEmailFormatOk && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#10b981", fontSize: 15 }}>✓</span>}
                  {showEmailFormatError && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
                  {emailAvailable === "taken" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
                </div>
                {showEmailFormatError && <span style={{ ...hintStyle, color: "#ef4444" }}>Please enter a valid email address</span>}
                {emailAvailable === "taken" && <span style={{ ...hintStyle, color: "#ef4444" }}>An account with this email already exists — <button onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: "#e09040", cursor: "pointer", fontSize: 14, fontFamily: "inherit", textDecoration: "underline" }}>sign in instead?</button></span>}
                {emailAvailable === "available" && showEmailFormatOk && <span style={{ ...hintStyle, color: "#10b981" }}>Valid email</span>}
              </div>

              {/* Username */}
              <div>
                <label style={labelStyle}>Username</label>
                <div style={{ position: "relative" }}>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" style={{ ...inputStyle, paddingRight: 36, borderColor: usernameStatus === "taken" || usernameStatus === "invalid" ? "rgba(239,68,68,0.5)" : usernameStatus === "available" ? "rgba(16,185,129,0.4)" : undefined }} autoComplete="username" name="username" onFocus={e => { if (usernameStatus !== "taken" && usernameStatus !== "invalid") e.currentTarget.style.borderColor = focusBorder; }} />
                  {usernameStatus === "checking" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#f59e0b", fontSize: 15 }}>...</span>}
                  {usernameStatus === "available" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#10b981", fontSize: 15 }}>✓</span>}
                  {usernameStatus === "taken" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
                  {usernameStatus === "invalid" && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
                </div>
                {usernameStatus === "available" && <span style={{ ...hintStyle, color: "#10b981" }}>Available</span>}
                {usernameStatus === "taken" && <span style={{ ...hintStyle, color: "#ef4444" }}>Username already taken</span>}
                {usernameStatus === "invalid" && <span style={{ ...hintStyle, color: "#ef4444" }}>3-30 characters, letters, numbers, underscores only</span>}
                {usernameStatus === "taken" && usernameSuggestions.length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {usernameSuggestions.map(s => <button key={s} onClick={() => setUsername(s)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(224,144,64,0.3)", background: "rgba(224,144,64,0.08)", color: "#e09040", fontSize: 15, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>{s}</button>)}
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
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 15 }}>{showPw ? "🙈" : "👁"}</button>
                </div>
                {password.length > 0 && <>
                  <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                    {[1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= pwScore ? pwColors[Math.min(pwScore - 1, 4)] : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />)}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 5, gap: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {pwReqs.map(r => <span key={r.t} style={{ fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", color: r.ok ? "#10b981" : "rgba(255,255,255,0.25)", transition: "color 0.2s" }}>{r.ok ? "✓" : "○"} {r.t}</span>)}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: pwStrengthColor, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{pwStrengthLabel}</span>
                  </div>
                </>}
              </div>

              {/* Confirm Password */}
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPwC ? "text" : "password"} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Type password again" style={{ ...inputStyle, paddingRight: 44, borderColor: pwMismatch ? "rgba(239,68,68,0.5)" : pwMatch ? "rgba(16,185,129,0.4)" : undefined }} autoComplete="new-password" name="password_confirm" onFocus={e => { if (!pwMismatch) e.currentTarget.style.borderColor = focusBorder; }} />
                  <button type="button" onClick={() => setShowPwC(!showPwC)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 15 }}>{showPwC ? "🙈" : "👁"}</button>
                </div>
                {pwMatch && <span style={{ ...hintStyle, color: "#10b981" }}>Passwords match</span>}
                {pwMismatch && <span style={{ ...hintStyle, color: "#ef4444" }}>Passwords don&apos;t match</span>}
              </div>

              {/* Terms */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginTop: 2 }}>
                <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ accentColor: "#e09040", width: 14, height: 14, marginTop: 1 }} />
                <span style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.5 }}>I agree to the <span style={{ color: "#e09040", cursor: "pointer" }}>Terms of Service</span> and <span style={{ color: "#e09040", cursor: "pointer" }}>Privacy Policy</span></span>
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
                  {showEmailFormatError && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#ef4444", fontSize: 15 }}>✕</span>}
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
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", fontFamily: "'IBM Plex Mono', monospace" }}>Token expires after 30 minutes</p>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 15, marginTop: 20, fontFamily: "'IBM Plex Mono', monospace", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>Secure authentication · Your data stays private</p>
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
      <button onClick={() => setShowPlatformHub(true)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,200,150,0.15)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", color: "rgba(255,200,150,0.6)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 15 }}>🧭</span> Platform Hub</button>
      <button onClick={() => setShowProfile(true)} style={{ width: 30, height: 30, borderRadius: 10, border: "1px solid rgba(224,144,64,0.2)", background: "linear-gradient(135deg, rgba(212,134,10,0.15), rgba(192,112,48,0.1))", color: "#e09040", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }} title="Profile Settings">{(user.display_name || user.username || "U")[0].toUpperCase()}</button>
      <button onClick={() => authApi.logout()} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,200,150,0.15)", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", color: "rgba(255,200,150,0.6)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Sign Out</button>
    </div>
  );

  const profileModal = showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} onUpdate={u => { setUser(u); setShowProfile(false); }} />;

  // Platform Hub — accessible from BOTH the project selection page and inside the app
  if (showPlatformHub) return <PlatformHub user={user} onBack={() => setShowPlatformHub(false)} onUpdateUser={u => setUser(u)} />;

  if (!activeProject) return <>{hubAccountBar}{profileModal}<ProjectHub onOpenProject={setActiveProject} /><MusicPlayer projectActive={false} /></>;
  return <>{profileModal}<Home key={activeProject.id} projectId={activeProject.id} projectName={activeProject.name} projectMeta={activeProject.meta} onBackToHub={() => setActiveProject(null)} user={user} onShowProfile={() => setShowProfile(true)} onShowPlatformHub={() => setShowPlatformHub(true)} /><MusicPlayer projectActive={true} /></>;
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

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box" as const };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 15, color: "var(--text-muted)", marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" as const, letterSpacing: "1px" };

  return <div style={{ position: "fixed", inset: 0, zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
    <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px 24px", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 className="font-heading" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Profile Settings</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 16, cursor: "pointer" }}>✕</button>
      </div>

      {error && <div style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "#f08080", fontSize: 15, fontFamily: "'IBM Plex Mono', monospace" }}>{error}</div>}
      {success && <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "#6ee7b7", fontSize: 15, fontFamily: "'IBM Plex Mono', monospace" }}>{success}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #e09040, #c07030)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{(displayName || "U")[0].toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{user.username}</div>
            <div style={{ fontSize: 15, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace" }}>Member since {user.last_login ? new Date().toLocaleDateString() : "today"}</div>
          </div>
        </div>

        <div><label style={labelStyle}>Display Name</label><input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Email</label>
          <div style={{ position: "relative" }}>
            <input value={email} onChange={e => { setEmail(e.target.value); if (!emailTouched) setEmailTouched(true); }} onBlur={() => setEmailTouched(true)} type="email" style={{ ...inputStyle, paddingRight: 32, borderColor: showEmailError ? "rgba(240,128,128,0.4)" : showEmailOk ? "rgba(110,231,183,0.3)" : undefined }} />
            {showEmailOk && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#6ee7b7", fontSize: 14 }}>✓</span>}
            {showEmailError && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#f08080", fontSize: 15 }}>✕</span>}
          </div>
          {showEmailError && <span style={{ fontSize: 14, color: "#f08080", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2, display: "block" }}>Please enter a valid email address</span>}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "1px" }}>Change Password</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={labelStyle}>Current Password</label><input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Required to change password" style={inputStyle} /></div>
            <div><label style={labelStyle}>New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" style={inputStyle} /></div>
            <div><label style={labelStyle}>Confirm New Password</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Type again" style={inputStyle} /></div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !emailValid} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #e09040, #c07030)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", opacity: (saving || !emailValid) ? 0.5 : 1, marginTop: 4 }}>{saving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  </div>;
}
