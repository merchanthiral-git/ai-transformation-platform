"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as api from "../../../lib/api";
import * as authApi from "../../../lib/auth-api";
import type { Filters } from "../../../lib/api";
import { useWorkspaceController } from "../../../lib/workspace";
import * as analytics from "../../../lib/analytics";

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
} from "../../components/shared";
import { motion, AnimatePresence } from "framer-motion";

// ── Tab Module Components — dynamic imports for code-splitting ──
import dynamic from "next/dynamic";

// Overview (always loaded — landing page)
import {
  LandingPage, WorkforceSnapshot,
  TransformationDashboard, TransformationExecDashboard,
  EmployeeProfileCard, EmployeeOrgChart, PersonalImpactCard,
  SkillShiftIndex,
} from "../../components/OverviewModule";

// Diagnose — loaded on demand
const AiOpportunityScan = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.AiOpportunityScan })), { ssr: false });
const AIReadiness = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.AIReadiness })), { ssr: false });
const ManagerCapability = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.ManagerCapability })), { ssr: false });
const SkillsTalent = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.SkillsTalent })), { ssr: false });
const ChangeReadiness = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.ChangeReadiness })), { ssr: false });
const ManagerDevelopment = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.ManagerDevelopment })), { ssr: false });
const AiRecommendationsEngine = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.AiRecommendationsEngine })), { ssr: false });
const OrgHealthScorecard = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.OrgHealthScorecard })), { ssr: false });
const AIImpactHeatmap = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.AIImpactHeatmap })), { ssr: false });
const RoleClustering = dynamic(() => import("../../components/DiagnoseModule").then(m => ({ default: m.RoleClustering })), { ssr: false });

// Design — heaviest module (~5500 lines), loaded on demand
const WorkDesignLab = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.WorkDesignLab })), { ssr: false });
const OrgDesignStudio = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.OrgDesignStudio })), { ssr: false });
const OperatingModelLab = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.OperatingModelLab })), { ssr: false });
const OMDesignCanvas = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.OMDesignCanvas })), { ssr: false });
const RoleComparison = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.RoleComparison })), { ssr: false });
const QuickWinIdentifier = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.QuickWinIdentifier })), { ssr: false });
const BBBAFramework = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.BBBAFramework })), { ssr: false });
const HeadcountPlanning = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.HeadcountPlanning })), { ssr: false });
const KPIAlignmentModule = dynamic(() => import("../../components/DesignModule").then(m => ({ default: m.KPIAlignmentModule })), { ssr: false });

// Simulate — loaded on demand
const ImpactSimulator = dynamic(() => import("../../components/SimulateModule").then(m => ({ default: m.ImpactSimulator })), { ssr: false });

// Mobilize — loaded on demand
const ChangePlanner = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.ChangePlanner })), { ssr: false });
const ReskillingPathways = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.ReskillingPathways })), { ssr: false });
const TalentMarketplace = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.TalentMarketplace })), { ssr: false });
const TransformationStoryBuilder = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.TransformationStoryBuilder })), { ssr: false });
const ReadinessArchetypes = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.ReadinessArchetypes })), { ssr: false });
const SkillsNetwork = dynamic(() => import("../../components/MobilizeModule").then(m => ({ default: m.SkillsNetwork })), { ssr: false });

// Export — loaded on demand
const ExportReport = dynamic(() => import("../../components/ExportModule").then(m => ({ default: m.ExportReport })), { ssr: false });

// Guides — loaded on demand (large content files)
const GuideViewer = dynamic(() => import("../../components/guides/GuideViewer"), { ssr: false });
import { consultantGuide } from "../../components/guides/consultantGuide";
import { hrGuide } from "../../components/guides/hrGuide";

// Job Architecture, PlatformHub, supporting modules — loaded on demand
const JobArchitectureModule = dynamic(() => import("../../components/JobArchModule").then(m => ({ default: m.JobArchitectureModule })), { ssr: false });
const PlatformHub = dynamic(() => import("../../components/PlatformHub").then(m => ({ default: m.PlatformHub })), { ssr: false });
const AgentOrchestrator = dynamic(() => import("../../components/AgentPanel").then(m => ({ default: m.AgentOrchestrator })), { ssr: false });
const NLQBar = dynamic(() => import("../../components/NLQBar").then(m => ({ default: m.NLQBar })), { ssr: false });
const FlightRecorder = dynamic(() => import("../../components/FlightRecorder").then(m => ({ default: m.FlightRecorder })), { ssr: false });
const Tutorial = dynamic(() => import("../../components/Tutorial").then(m => ({ default: m.Tutorial })), { ssr: false });
const BotWorkspace = dynamic(() => import("../../components/bot/BotWorkspace"), { ssr: false });
import { VideoBackground } from "../../components/VideoBackground";
import { useAnimatedBg } from "../../../lib/animated-bg-context";
import { CDN_BASE, cb } from "../../../lib/cdn";
import { useCollaboration } from "../../../lib/collaboration";
import type { RemoteChange } from "../../../lib/collaboration";
import { PresenceAvatars, EditingIndicator, RemoteChangeToast, ActivityFeedPanel } from "../../components/CollaborationPanel";
import { AiObservationsPanel } from "../../components/AiIntelligence";
// Three.js removed — was causing "Context Lost" and deprecated Clock warnings.
// Audio orb visualizer now uses pure CSS (see CSSAudioOrb below).

/* ═══════════════════════════════════════════════════════════════
   CSS AUDIO ORB VISUALIZER — replaces Three.js to avoid WebGL
   context-lost errors and deprecated THREE.Clock warnings.
   ═══════════════════════════════════════════════════════════════ */

function OrbScene({ amplitude, bassEnergy }: { freqData: Uint8Array; bassEnergy: number; midEnergy: number; highEnergy: number; amplitude: number }) {
  const scale = 1 + amplitude * 0.15;
  const glow = 20 + bassEnergy * 40;
  const hue = 30 + amplitude * 10; // warm amber shift
  return <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
    {/* Outer glow ring */}
    <div style={{
      position: "absolute", width: 90, height: 90, borderRadius: "50%",
      background: `radial-gradient(circle, hsla(${hue},80%,55%,${0.1 + amplitude * 0.15}) 0%, transparent 70%)`,
      transform: `scale(${scale * 1.6})`, transition: "transform 0.15s ease-out",
    }} />
    {/* Core orb */}
    <div style={{
      width: 56, height: 56, borderRadius: "50%",
      background: `radial-gradient(circle at 35% 35%, hsl(${hue},85%,65%), hsl(${hue},75%,40%) 60%, hsl(${hue},60%,25%))`,
      boxShadow: `0 0 ${glow}px ${glow * 0.4}px hsla(${hue},80%,50%,0.35), inset 0 -4px 12px rgba(0,0,0,0.3)`,
      transform: `scale(${scale})`, transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
    }} />
  </div>;
}

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
  { id: 1, name: "Late Night Study", file: `${CDN_BASE}/audio/optimized/track1.mp3`, genre: "chill" },
  { id: 2, name: "Rainy Window", file: `${CDN_BASE}/audio/optimized/track2.mp3`, genre: "chill" },
  { id: 3, name: "Morning Garden", file: `${CDN_BASE}/audio/optimized/track3.mp3`, genre: "chill" },
  { id: 4, name: "Warm Coffee", file: `${CDN_BASE}/audio/optimized/track4.mp3`, genre: "chill" },
  { id: 5, name: "Cozy Blanket", file: `${CDN_BASE}/audio/optimized/track5.mp3`, genre: "chill" },
  { id: 6, name: "Sunset Porch", file: `${CDN_BASE}/audio/optimized/track6.mp3`, genre: "chill" },
  // Deep Focus (7-12)
  { id: 7, name: "Flow State", file: `${CDN_BASE}/audio/optimized/track7.mp3`, genre: "focus" },
  { id: 8, name: "The Mountain", file: `${CDN_BASE}/audio/optimized/track8.mp3`, genre: "focus" },
  { id: 9, name: "Deep Work", file: `${CDN_BASE}/audio/optimized/track9.mp3`, genre: "focus" },
  { id: 10, name: "Clear Mind", file: `${CDN_BASE}/audio/optimized/track10.mp3`, genre: "focus" },
  { id: 11, name: "Concentration", file: `${CDN_BASE}/audio/optimized/track11.mp3`, genre: "focus" },
  { id: 12, name: "Productive Hours", file: `${CDN_BASE}/audio/optimized/track12.mp3`, genre: "focus" },
  // Ambient (13-18)
  { id: 13, name: "Morning Fog", file: `${CDN_BASE}/audio/optimized/track13.mp3`, genre: "ambient" },
  { id: 14, name: "Dreamscape", file: `${CDN_BASE}/audio/optimized/track14.mp3`, genre: "ambient" },
  { id: 15, name: "Floating", file: `${CDN_BASE}/audio/optimized/track15.mp3`, genre: "ambient" },
  { id: 16, name: "Summer Breeze", file: `${CDN_BASE}/audio/optimized/track16.mp3`, genre: "ambient" },
  { id: 17, name: "Cloud Drift", file: `${CDN_BASE}/audio/optimized/track17.mp3`, genre: "ambient" },
  { id: 18, name: "Still Water", file: `${CDN_BASE}/audio/optimized/track18.mp3`, genre: "ambient" },
  // Jazz (19-23)
  { id: 19, name: "Urban Jazz Cafe", file: `${CDN_BASE}/audio/optimized/track19.mp3`, genre: "jazz" },
  { id: 20, name: "Coffee Shop Piano", file: `${CDN_BASE}/audio/optimized/track20.mp3`, genre: "jazz" },
  { id: 21, name: "Smoky Lounge", file: `${CDN_BASE}/audio/optimized/track21.mp3`, genre: "jazz" },
  { id: 22, name: "Midnight Sax", file: `${CDN_BASE}/audio/optimized/track22.mp3`, genre: "jazz" },
  { id: 23, name: "Blue Note", file: `${CDN_BASE}/audio/optimized/track23.mp3`, genre: "jazz" },
  // Electronic (24-28)
  { id: 24, name: "Digital Pulse", file: `${CDN_BASE}/audio/optimized/track24.mp3`, genre: "electronic" },
  { id: 25, name: "Neon Lights", file: `${CDN_BASE}/audio/optimized/track25.mp3`, genre: "electronic" },
  { id: 26, name: "Synthwave Drive", file: `${CDN_BASE}/audio/optimized/track26.mp3`, genre: "electronic" },
  { id: 27, name: "Tropical Beats", file: `${CDN_BASE}/audio/optimized/track27.mp3`, genre: "electronic" },
  { id: 28, name: "Dream Cloud", file: `${CDN_BASE}/audio/optimized/track28.mp3`, genre: "electronic" },
  // ── New tracks (29-47) ──
  // Jazz Instrumentals (29-35)
  { id: 29, name: "Le Cirque de Jazz", file: `${CDN_BASE}/audio/optimized/track29.mp3`, genre: "jazz" },
  { id: 30, name: "Lo-Fi Daydream", file: `${CDN_BASE}/audio/optimized/track30.mp3`, genre: "chill" },
  { id: 31, name: "Cuban Fusion", file: `${CDN_BASE}/audio/optimized/track31.mp3`, genre: "jazz" },
  { id: 32, name: "Smooth Swing", file: `${CDN_BASE}/audio/optimized/track32.mp3`, genre: "jazz" },
  { id: 33, name: "April Morning", file: `${CDN_BASE}/audio/optimized/track33.mp3`, genre: "chill" },
  { id: 34, name: "Walk Together", file: `${CDN_BASE}/audio/optimized/track34.mp3`, genre: "chill" },
  { id: 35, name: "Jazz Café", file: `${CDN_BASE}/audio/optimized/track35.mp3`, genre: "jazz" },
  // Ambient & Focus (36-40)
  { id: 36, name: "Heavenly Raindrops", file: `${CDN_BASE}/audio/optimized/track36.mp3`, genre: "ambient" },
  { id: 37, name: "Melody of Nature", file: `${CDN_BASE}/audio/optimized/track37.mp3`, genre: "ambient" },
  { id: 38, name: "Acid Jazz I", file: `${CDN_BASE}/audio/optimized/track38.mp3`, genre: "jazz" },
  { id: 39, name: "Acid Jazz II", file: `${CDN_BASE}/audio/optimized/track39.mp3`, genre: "jazz" },
  { id: 40, name: "We Jazz", file: `${CDN_BASE}/audio/optimized/track40.mp3`, genre: "jazz" },
  // Deep Focus & Piano (41-44)
  { id: 41, name: "Leva Eternity", file: `${CDN_BASE}/audio/optimized/track41.mp3`, genre: "focus" },
  { id: 42, name: "Sedative", file: `${CDN_BASE}/audio/optimized/track42.mp3`, genre: "ambient" },
  { id: 43, name: "Field Grass", file: `${CDN_BASE}/audio/optimized/track43.mp3`, genre: "ambient" },
  { id: 44, name: "Soulful Hip-Hop", file: `${CDN_BASE}/audio/optimized/track44.mp3`, genre: "chill" },
  // Piano (45-47)
  { id: 45, name: "A Quiet Joy", file: `${CDN_BASE}/audio/optimized/track45.mp3`, genre: "focus" },
  { id: 46, name: "Plea for Forgiveness", file: `${CDN_BASE}/audio/optimized/track46.mp3`, genre: "focus" },
  { id: 47, name: "Snow Piano", file: `${CDN_BASE}/audio/optimized/track47.mp3`, genre: "focus" },
];

// Mood definitions
const MOODS = [
  { id: "focus", label: "Deep Focus", icon: "🧘", genres: ["ambient", "focus"], energy: [1, 2, 3] },
  { id: "energy", label: "High Energy", icon: "⚡", genres: ["electronic", "jazz"], energy: [4, 5] },
  { id: "night", label: "Late Night", icon: "🌙", genres: ["chill", "ambient"], energy: [1, 2] },
  { id: "coffee", label: "Coffee Shop", icon: "☕", genres: ["jazz", "chill"], energy: [2, 3] },
  { id: "present", label: "Presentation", icon: "🎯", genres: ["ambient", "focus"], energy: [1, 2] },
  { id: "surprise", label: "Surprise Me", icon: "🔀", genres: [], energy: [] },
];

function MusicPlayer({ projectActive = false }: { projectActive?: boolean }) {
  const ACID_JAZZ_II_IDX = useMemo(() => {
    const jazzTracks = ALL_TRACKS.filter(t => t.genre === "jazz");
    return jazzTracks.findIndex(t => t.name === "Acid Jazz II");
  }, []);
  const [genre, setGenre] = useState("jazz");
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(() => { try { const saved = localStorage.getItem("music_track"); return saved ? Number(saved) : ACID_JAZZ_II_IDX; } catch { return ACID_JAZZ_II_IDX; } });
  const [volume, setVolume] = useState(() => { try { return Number(localStorage.getItem("music_vol") || "0.5"); } catch { return 0.5; } });
  const [viewState, setViewState] = useState<"prompt" | "mini" | "collapsed" | "expanded">(() => { try { return localStorage.getItem("music_prompted") ? "mini" : "prompt"; } catch { return "prompt"; } });
  const [promptHovered, setPromptHovered] = useState(false);
  const [promptDismissing, setPromptDismissing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurTime] = useState(0);
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [showList, setShowList] = useState(false);
  const [hasPlayedFirst, setHasPlayedFirst] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [cdnReachable, setCdnReachable] = useState(true);
  const autoPlayTriggeredRef = useRef(false);
  const errorCountRef = useRef(0);
  const userInitiatedRef = useRef(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Audio + Visualizer
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(64));
  // Mood & Favorites
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(() => { try { const s = localStorage.getItem("music_favs"); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); } });
  // Audio band energies for visualizer
  const [bassEnergy, setBassEnergy] = useState(0);
  const [midEnergy, setMidEnergy] = useState(0);
  const [highEnergy, setHighEnergy] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [immersive, setImmersive] = useState(false);
  // Focus Timer
  const [focusActive, setFocusActive] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [focusRemaining, setFocusRemaining] = useState(0);
  const focusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs for stale closures
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const genreRef = useRef(genre);
  genreRef.current = genre;
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const genreTracks = useMemo(() => ALL_TRACKS.filter(t => t.genre === genre), [genre]);
  const track = genreTracks[trackIdx % genreTracks.length] || genreTracks[0];
  const fmt = (s: number) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec < 10 ? "0" : ""}${sec}`; };

  // DO NOT use createMediaElementSource() — it hijacks the audio element's
  // output routing through the Web Audio API graph.  On cross-origin CDN audio
  // (R2 without CORS), Chrome silently captures the routing without throwing,
  // causing the UI to report "playing" while producing zero sound.
  // The visualizer uses simulated energy data from timeupdate instead.
  const webAudioInitRef = useRef(false);
  const ensureWebAudio = useCallback(() => {
    if (webAudioInitRef.current) return;
    webAudioInitRef.current = true;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
    } catch {}
  }, []);

  // CDN reachability check on mount — use no-cors to avoid CORS blocking the check.
  // An opaque response (status 0) still means the server is reachable.
  useEffect(() => {
    fetch(`${CDN_BASE}/audio/optimized/track1.mp3`, { method: "HEAD", mode: "no-cors" })
      .then(() => { console.log("[MusicPlayer] CDN reachable"); })
      .catch(() => { console.error("[MusicPlayer] CDN unreachable"); setCdnReachable(false); });
  }, []);

  // Create Audio element on mount.  Always creates fresh — cleanup nulls the ref,
  // so remounts (Platform Hub round-trip, React strict-mode) get a working Audio.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = volumeRef.current > 0 ? volumeRef.current : 0.5;
    audio.muted = false;
    audioRef.current = audio;
    console.log("[MusicPlayer] Audio element created, volume:", audio.volume);

    // Buffering indicator
    audio.addEventListener("waiting", () => setBuffering(true));
    audio.addEventListener("canplay", () => setBuffering(false));

    // Error handler — skip to next track, but STOP after 3 consecutive failures
    audio.addEventListener("error", () => {
      if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }
      setBuffering(false);
      const errCode = audio.error?.code;
      const errMsg = audio.error?.message || "unknown";
      console.error(`[MusicPlayer] Track error (code=${errCode}): ${errMsg} — src: ${audio.src}`);
      errorCountRef.current += 1;
      if (errorCountRef.current >= 3) {
        console.error("[MusicPlayer] 3 consecutive failures — stopping.");
        setPlaying(false);
        setAudioError("Unable to play audio — check your connection and try again");
        return;
      }
      // Only auto-skip if user has already initiated playback
      if (!userInitiatedRef.current) return;
      const gt = ALL_TRACKS.filter(t => t.genre === genreRef.current);
      if (gt.length > 1) {
        setTrackIdx(prev => {
          const nextIdx = (prev + 1) % gt.length;
          const nextTrack = gt[nextIdx];
          if (nextTrack) {
            console.log(`[MusicPlayer] Skipping to: ${nextTrack.name} — ${nextTrack.file}`);
            audio.src = nextTrack.file;
            audio.load();
            audio.play().catch(() => {});
          }
          return nextIdx;
        });
      }
    });

    // On successful play, reset error counter and clear load timeout
    audio.addEventListener("playing", () => {
      if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }
      errorCountRef.current = 0;
      setAudioError(null);
      setBuffering(false);
      console.log("[MusicPlayer] Audio playing — src:", audio.src, "vol:", audio.volume, "muted:", audio.muted);
    });

    audio.addEventListener("ended", () => {
      if (repeatRef.current) { audio.currentTime = 0; audio.play().catch(e => console.warn("Repeat failed:", e)); return; }
      setHasPlayedFirst(true);
      if (shuffleRef.current) {
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
          const nextIdx = (prev + 1) % gt.length;
          const nextTrack = gt[nextIdx];
          if (nextTrack) {
            audio.src = nextTrack.file;
            audio.load();
            audio.play().catch(e => console.warn("Next track play failed:", e));
          }
          return nextIdx;
        });
      }
    });
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration || 0));

    // Combined progress + visualizer animation loop.
    // Visualizer uses simulated frequency data driven by playback state.
    const tick = () => {
      if (audio.duration > 0) { setProgress(audio.currentTime / audio.duration); setCurTime(audio.currentTime); }

      // Simulate frequency data when audio is playing
      const isPlaying = !audio.paused && !audio.ended && audio.readyState > 2;
      const fd = freqDataRef.current;
      const t = performance.now() / 1000;
      for (let i = 0; i < 64; i++) {
        if (isPlaying) {
          const base = 100 + 60 * Math.sin(t * 1.7 + i * 0.4) + 40 * Math.sin(t * 3.1 + i * 0.7);
          const variation = 30 * Math.sin(t * 5.3 + i * 1.2) + 20 * Math.random();
          const falloff = i < 8 ? 1.0 : i < 24 ? 0.7 : 0.4;
          fd[i] = Math.max(0, Math.min(255, (base + variation) * falloff * (audio.volume || 0.5)));
        } else {
          fd[i] = fd[i] * 0.9;
        }
      }

      let bass = 0, mid = 0, high = 0, total = 0;
      for (let i = 0; i < 4; i++) bass += fd[i] || 0;
      for (let i = 4; i < 32; i++) mid += fd[i] || 0;
      for (let i = 32; i < 64; i++) high += fd[i] || 0;
      for (let i = 0; i < 64; i++) total += fd[i] || 0;
      setBassEnergy(bass / (4 * 255));
      setMidEnergy(mid / (28 * 255));
      setHighEnergy(high / (32 * 255));
      setAmplitude(total / (64 * 255));

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx2d = canvas.getContext("2d");
        if (ctx2d) {
          const w = canvas.width; const h = canvas.height;
          ctx2d.clearRect(0, 0, w, h);
          const bars = 32; const barW = w / bars - 2;
          for (let i = 0; i < bars; i++) {
            const val = fd[i] || 0;
            const barH = (val / 255) * h * 0.9;
            const x = i * (barW + 2) + 1;
            const gradient = ctx2d.createLinearGradient(0, h - barH, 0, h);
            gradient.addColorStop(0, `rgba(232,197,71,${0.4 + val / 500})`);
            gradient.addColorStop(1, `rgba(212,134,10,${0.6 + val / 400})`);
            ctx2d.fillStyle = gradient;
            ctx2d.beginPath();
            ctx2d.roundRect(x, h - barH, barW, barH, [3, 3, 0, 0]);
            ctx2d.fill();
          }
        }
      }
      const mini = miniCanvasRef.current;
      if (mini) {
        const ctx2d = mini.getContext("2d");
        if (ctx2d) {
          const w = mini.width; const h = mini.height;
          ctx2d.clearRect(0, 0, w, h);
          const bars = 10; const barW = w / bars - 1;
          for (let i = 0; i < bars; i++) {
            const val = fd[i * 3] || 0;
            const barH = (val / 255) * h * 0.85;
            ctx2d.fillStyle = `rgba(212,134,10,${0.4 + val / 400})`;
            ctx2d.beginPath();
            ctx2d.roundRect(i * (barW + 1), h - barH, barW, barH, [2, 2, 0, 0]);
            ctx2d.fill();
          }
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      audio.pause();
      audio.src = "";
      audioRef.current = null; // Clear ref so next mount creates fresh Audio
      webAudioInitRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume AudioContext on user gesture (required by browsers).
  // Also lazily creates the Web Audio graph if it hasn't been created yet.
  const resumeAudioCtx = useCallback(() => {
    ensureWebAudio();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
  }, [ensureWebAudio]);

  // Focus timer
  useEffect(() => {
    if (focusActive && focusRemaining > 0) {
      focusIntervalRef.current = setInterval(() => { setFocusRemaining(r => { if (r <= 1) { setFocusActive(false); return 0; } return r - 1; }); }, 1000);
    }
    return () => { if (focusIntervalRef.current) clearInterval(focusIntervalRef.current); };
  }, [focusActive, focusRemaining > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save favorites
  useEffect(() => { try { localStorage.setItem("music_favs", JSON.stringify([...favorites])); } catch {} }, [favorites]);
  const toggleFav = (id: number) => setFavorites(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  // Mood-based track filtering
  const selectMood = (moodId: string) => {
    setActiveMood(moodId);
    const mood = MOODS.find(m => m.id === moodId);
    if (!mood || moodId === "surprise") {
      const idx = Math.floor(Math.random() * ALL_TRACKS.length);
      const picked = ALL_TRACKS[idx];
      setGenre(picked.genre);
      const gt = ALL_TRACKS.filter(t => t.genre === picked.genre);
      setTrackIdx(gt.findIndex(t => t.id === picked.id));
    } else {
      const moodTracks = ALL_TRACKS.filter(t => mood.genres.includes(t.genre));
      if (moodTracks.length > 0) {
        const picked = moodTracks[Math.floor(Math.random() * moodTracks.length)];
        setGenre(picked.genre);
        const gt = ALL_TRACKS.filter(t => t.genre === picked.genre);
        setTrackIdx(gt.findIndex(t => t.id === picked.id));
        playTrack(picked.file);
      }
    }
  };

  const startFocus = (mins: number) => {
    setFocusDuration(mins * 60);
    setFocusRemaining(mins * 60);
    setFocusActive(true);
    selectMood("focus");
    if (!playing) toggle();
  };

  // Pre-load the first track when entering a project so the play button works instantly,
  // but do NOT auto-play — browsers block autoplay with sound and it confuses users.
  useEffect(() => {
    if (projectActive && !autoPlayTriggeredRef.current) {
      autoPlayTriggeredRef.current = true;
      const a = audioRef.current;
      if (a && (!a.src || !a.src.includes("/audio/"))) {
        const t = genreTracks[trackIdx % genreTracks.length] || genreTracks[0];
        if (t) {
          a.src = t.file;
          a.volume = volume > 0 ? volume : 0.5;
          a.muted = false;
          a.load(); // preload only — no play()
        }
      }
    }
    if (!projectActive) autoPlayTriggeredRef.current = false;
  }, [projectActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const playTrack = useCallback((file: string) => {
    const a = audioRef.current;
    if (!a) return;
    console.log(`[MusicPlayer] Playing: ${file}`);
    userInitiatedRef.current = true;
    setAudioError(null);
    setBuffering(true);
    errorCountRef.current = 0;
    // Clear any existing load timeout
    if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; }
    // Set src and prepare BEFORE touching AudioContext
    a.src = file;
    a.muted = false;
    a.volume = volumeRef.current > 0 ? volumeRef.current : 0.5;
    a.load();
    // Resume AudioContext (required for browsers that suspend it)
    resumeAudioCtx();
    // 5-second timeout — if track hasn't started, skip it
    loadTimeoutRef.current = setTimeout(() => {
      if (a.readyState < 3) {
        console.warn("[MusicPlayer] Track load timeout (5s), skipping:", file);
        setBuffering(false);
        const gt = ALL_TRACKS.filter(t => t.genre === genreRef.current);
        if (gt.length > 1) {
          setTrackIdx(prev => {
            const nextIdx = (prev + 1) % gt.length;
            const nextTrack = gt[nextIdx];
            if (nextTrack) { a.src = nextTrack.file; a.load(); a.play().catch(() => {}); }
            return nextIdx;
          });
        }
      }
    }, 5000);
    a.play().then(() => {
      setPlaying(true); setHasPlayedFirst(true);
      console.log("[MusicPlayer] Playing:", { src: a.src, volume: a.volume, muted: a.muted, paused: a.paused, readyState: a.readyState });
    }).catch(e => { console.warn("[MusicPlayer] Play blocked:", e.message); setPlaying(false); setBuffering(false); });
  }, [resumeAudioCtx]);

  const toggle = useCallback(() => {
    const a = audioRef.current; if (!a) { console.error("[MusicPlayer] No audio element"); return; }
    userInitiatedRef.current = true;
    setAudioError(null);
    errorCountRef.current = 0;
    if (playing) { a.pause(); setPlaying(false); console.log("[MusicPlayer] Paused"); }
    else {
      a.muted = false;
      a.volume = volumeRef.current > 0 ? volumeRef.current : 0.5;
      if (!a.src || a.readyState === 0 || !a.src.includes("/track")) { console.log("[MusicPlayer] No src loaded, starting fresh"); playTrack(track?.file || ALL_TRACKS[0].file); }
      else {
        console.log("[MusicPlayer] Resuming:", { src: a.src, volume: a.volume, muted: a.muted, readyState: a.readyState });
        resumeAudioCtx();
        a.play().then(() => setPlaying(true)).catch(e => { console.warn("[MusicPlayer] Resume failed:", e.message); playTrack(track?.file || ALL_TRACKS[0].file); });
      }
    }
  }, [playing, track, playTrack, resumeAudioCtx]);

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
  const changeVolume = (v: number) => { setVolume(v); volumeRef.current = v; if (audioRef.current) { audioRef.current.volume = v; audioRef.current.muted = false; } try { localStorage.setItem("music_vol", String(v)); } catch {} };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); if (audioRef.current?.duration) audioRef.current.currentTime = pct * audioRef.current.duration; };

  const btnBase: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" };
  const expandedRef = useRef<HTMLDivElement>(null);

  // Debug overlay — shows audio state for diagnosing playback issues.
  // TODO: Remove once playback is confirmed working.
  const [debugInfo, setDebugInfo] = useState("");
  useEffect(() => {
    const id = setInterval(() => {
      const a = audioRef.current;
      if (!a) { setDebugInfo("Audio: null"); return; }
      setDebugInfo(`src: ${a.src ? a.src.split("/").pop() : "none"} | vol: ${a.volume.toFixed(2)} | muted: ${a.muted} | paused: ${a.paused} | ready: ${a.readyState} | err: ${a.error?.message || "none"}`);
    }, 500);
    return () => clearInterval(id);
  }, []);
  const debugOverlay = <div style={{ position: "fixed", bottom: viewState === "collapsed" ? 48 : viewState === "expanded" ? "auto" : 60, top: viewState === "expanded" ? 4 : "auto", right: 8, zIndex: 9999, background: "rgba(0,0,0,0.85)", color: "#0f0", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", maxWidth: 420, wordBreak: "break-all", pointerEvents: "none" }}>{debugInfo}</div>;

  // Escape key collapses expanded player or exits immersive
  useEffect(() => {
    if (viewState !== "expanded" && !immersive) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (immersive) setImmersive(false); else setViewState("collapsed"); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewState, immersive]);

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

  // ── Hide player entirely if CDN is unreachable ──
  if (!cdnReachable) return null;

  // ── Prompt state: "This site has a soundtrack" pill ──
  if (viewState === "prompt") return <>{debugOverlay}
    <style>{`
      @keyframes soundtrackGlow { 0%, 100% { box-shadow: 0 4px 20px rgba(224,144,64,0.15), 0 0 0 0 rgba(224,144,64,0.08); } 50% { box-shadow: 0 4px 24px rgba(224,144,64,0.3), 0 0 0 8px rgba(224,144,64,0.04); } }
      @keyframes soundtrackFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes soundtrackShrink { from { width: auto; padding: 10px 20px 10px 16px; border-radius: 24px; } to { width: 40px; padding: 10px; border-radius: 20px; } }
      @keyframes barPulse1 { 0%, 100% { height: 8px; } 50% { height: 14px; } }
      @keyframes barPulse2 { 0%, 100% { height: 12px; } 50% { height: 6px; } }
      @keyframes barPulse3 { 0%, 100% { height: 6px; } 50% { height: 16px; } }
    `}</style>
    <button
      onClick={() => {
        setPromptDismissing(true);
        try { localStorage.setItem("music_prompted", "1"); } catch {}
        toggle();
        setTimeout(() => { setViewState("mini"); setPromptDismissing(false); }, 600);
      }}
      onMouseEnter={() => setPromptHovered(true)}
      onMouseLeave={() => setPromptHovered(false)}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 40,
        display: "flex", alignItems: "center", gap: 10,
        padding: promptDismissing ? "10px" : "10px 20px 10px 16px",
        borderRadius: promptDismissing ? 20 : 24,
        background: "rgba(15,12,8,0.85)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(224,144,64,0.2)",
        color: "#f5e6d0", cursor: "pointer",
        animation: promptDismissing ? "none" : "soundtrackGlow 3s ease-in-out infinite, soundtrackFadeIn 0.8s ease-out",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        opacity: promptDismissing ? 0 : 1,
        transform: promptDismissing ? "scale(0.8)" : (promptHovered ? "scale(1.03)" : "scale(1)"),
        fontFamily: "'Outfit', sans-serif",
        overflow: "hidden", whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 16 }}>♪</span>
      {!promptDismissing && <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.3, transition: "opacity 0.2s" }}>
        {promptHovered ? "Press play" : "This site has a soundtrack"}
      </span>}
    </button>
  </>;

  // ── Mini state: small floating icon with sound bars ──
  if (viewState === "mini") return <>{debugOverlay}
    <div style={{ position: "fixed", bottom: 20, right: 24, zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <button onClick={() => {
        if (!playing && volume === 0) changeVolume(0.5);
        if (!playing) toggle();
        else { changeVolume(0); setPlaying(false); }
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.querySelector<HTMLElement>("[data-tooltip]")?.style.setProperty("opacity", "1"); }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.querySelector<HTMLElement>("[data-tooltip]")?.style.setProperty("opacity", "0"); }}
        style={{ position: "relative", width: 40, height: 40, borderRadius: 20, background: "rgba(15,12,8,0.85)", backdropFilter: "blur(16px)", border: `1px solid ${playing ? "rgba(224,144,64,0.25)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 2, transition: "all 0.3s", boxShadow: playing ? "0 2px 12px rgba(224,144,64,0.15)" : "none" }}
      >
        {playing ? (
          /* Animated sound bars */
          <>
            <span style={{ display: "inline-block", width: 3, height: 8, borderRadius: 1.5, background: "#e09040", animation: "barPulse1 0.8s ease-in-out infinite" }} />
            <span style={{ display: "inline-block", width: 3, height: 12, borderRadius: 1.5, background: "#e09040", animation: "barPulse2 0.7s ease-in-out infinite 0.15s" }} />
            <span style={{ display: "inline-block", width: 3, height: 6, borderRadius: 1.5, background: "#e09040", animation: "barPulse3 0.9s ease-in-out infinite 0.3s" }} />
          </>
        ) : (
          /* Muted icon */
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>♪</span>
        )}
        {/* Tooltip */}
        {!playing && <span data-tooltip style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, fontSize: 11, fontWeight: 600, color: "#f5e6d0", background: "rgba(15,12,8,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(224,144,64,0.15)", padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap", opacity: 0, transition: "opacity 0.2s", pointerEvents: "none", fontFamily: "'Outfit', sans-serif" }}>Bring it back</span>}
      </button>
      {/* Expand to full player */}
      <button onClick={() => setViewState("collapsed")} style={{ marginTop: 4, width: 20, height: 20, borderRadius: 10, background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 10, cursor: "pointer", transition: "color 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"} title="Expand player">▲</button>
    </div>
  </>;


  // ── Collapsed state: slim bar with mini visualizer ──
  if (viewState === "collapsed") return <div onClick={() => setViewState("expanded")} style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, height: 44, background: "rgba(15,12,8,0.85)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(212,134,10,0.1)", display: "flex", alignItems: "center", paddingLeft: 12, paddingRight: 12, gap: 10, cursor: "pointer" }}>
    {/* Mini visualizer */}
    <canvas ref={miniCanvasRef} width={60} height={24} style={{ width: 60, height: 24, flexShrink: 0, borderRadius: 4 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: audioError ? "#f87171" : "#f5e6d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{audioError || (buffering ? `Loading ${track?.name || ""}...` : track?.name || "—")}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{audioError ? "Click play to retry" : activeMood ? `${MOODS.find(m => m.id === activeMood)?.icon} ${MOODS.find(m => m.id === activeMood)?.label}` : GENRES.find(g => g.id === genre)?.label}{!audioError && focusActive ? ` · ${Math.floor(focusRemaining / 60)}:${String(focusRemaining % 60).padStart(2, "0")}` : ""}</div>
    </div>
    <div onClick={e => { e.stopPropagation(); seek(e); }} style={{ width: 80, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, cursor: "pointer", flexShrink: 0, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 2, background: "#D4860A", width: `${progress * 100}%` }} />
    </div>
    <button onClick={e => { e.stopPropagation(); toggle(); }} style={{ ...btnBase, color: "#f5e6d0", fontSize: 16, width: 32, height: 32 }}>{playing ? "⏸" : "▶"}</button>
    <button onClick={e => { e.stopPropagation(); nextTrack(); }} style={{ ...btnBase, color: "rgba(255,255,255,0.4)", fontSize: 15 }}>⏭</button>
    <button onClick={e => { e.stopPropagation(); changeVolume(volume > 0 ? 0 : 0.5); }} style={{ ...btnBase, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{volume === 0 ? "🔇" : "🔊"}</button>
    <input type="range" min={0} max={1} step={0.02} value={volume} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); changeVolume(Number(e.target.value)); }} style={{ width: 50, accentColor: "#e09040", height: 3, flexShrink: 0 }} />
    <button onClick={e => { e.stopPropagation(); setViewState("mini"); }} style={{ ...btnBase, color: "rgba(255,255,255,0.25)", fontSize: 14 }} title="Hide player">✕</button>
    {debugOverlay}
  </div>;

  // ── Expanded state: full player panel ──
  return <>{debugOverlay}<div ref={expandedRef} style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "rgba(10,8,6,0.92)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(212,134,10,0.12)", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
    {/* Visible collapse/close buttons at top-right of panel */}
    <div style={{ position: "absolute", top: 10, right: 16, display: "flex", gap: 6, zIndex: 1 }}>
      <button onClick={() => setViewState("collapsed")} title="Minimize to bar" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#f5e6d0"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>▾</button>
      <button onClick={() => setViewState("mini")} title="Hide player" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#f5e6d0"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>✕</button>
    </div>

    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 24px 20px" }}>
      {/* Top row: visualizer + info + controls */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
        {/* 3D Audio Orb Visualizer */}
        <div style={{ width: 80, height: 80, borderRadius: 16, overflow: "hidden", flexShrink: 0, background: "radial-gradient(circle, rgba(212,134,10,0.08), rgba(0,0,0,0.3))", boxShadow: `0 4px 20px rgba(212,134,10,${0.1 + amplitude * 0.2})`, position: "relative", cursor: "pointer" }} onClick={() => setImmersive(true)} title="Enter Immersive Mode">
          <OrbScene freqData={freqDataRef.current} bassEnergy={bassEnergy} midEnergy={midEnergy} highEnergy={highEnergy} amplitude={amplitude} />
          {focusActive && <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", borderRadius: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#E8C547", fontFamily: "'IBM Plex Mono', monospace" }}>{Math.floor(focusRemaining / 60)}:{String(focusRemaining % 60).padStart(2, "0")}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Focus</div>
          </div>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: audioError ? "#f87171" : "#f5e6d0", fontFamily: "'Outfit', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{audioError || (buffering ? `Loading ${track?.name || ""}...` : track?.name || "—")}</div>
            {!audioError && <button onClick={() => track && toggleFav(track.id)} style={{ ...btnBase, fontSize: 14, color: track && favorites.has(track.id) ? "#EF4444" : "rgba(255,255,255,0.2)" }}>{track && favorites.has(track.id) ? "♥" : "♡"}</button>}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {audioError ? "Click play to retry" : <>{activeMood ? <span style={{ color: "rgba(212,134,10,0.7)" }}>{MOODS.find(m => m.id === activeMood)?.icon} {MOODS.find(m => m.id === activeMood)?.label} · </span> : ""}{GENRES.find(g => g.id === genre)?.icon} {GENRES.find(g => g.id === genre)?.label} · {(trackIdx % genreTracks.length) + 1}/{genreTracks.length}</>}
          </div>
        </div>

        {/* Main controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setShuffle(!shuffle)} style={{ ...btnBase, color: shuffle ? "#D4860A" : "rgba(255,255,255,0.25)", fontSize: 14 }} title="Shuffle">⇄</button>
          <button onClick={prevTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.5)", fontSize: 15 }}>⏮</button>
          <button onClick={toggle} style={{ width: 44, height: 44, borderRadius: 22, background: "linear-gradient(135deg, #e09040, #c07030)", border: "none", color: "#fff", fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(224,144,64,0.3)", transition: "transform 0.15s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{playing ? "⏸" : "▶"}</button>
          <button onClick={nextTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.5)", fontSize: 15 }}>⏭</button>
          <button onClick={() => setRepeat(!repeat)} style={{ ...btnBase, color: repeat ? "#D4860A" : "rgba(255,255,255,0.25)", fontSize: 14 }} title="Repeat">↻</button>
        </div>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, width: 100, flexShrink: 0 }}>
          <button onClick={() => changeVolume(volume > 0 ? 0 : 0.5)} style={{ ...btnBase, fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{volume === 0 ? "🔇" : volume < 0.3 ? "🔈" : "🔊"}</button>
          <input type="range" min={0} max={1} step={0.02} value={volume} onChange={e => changeVolume(Number(e.target.value))} style={{ flex: 1, accentColor: "#e09040", height: 3 }} />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace", width: 32, textAlign: "right" }}>{fmt(currentTime)}</span>
        <div onClick={seek} style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, cursor: "pointer", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #D4860A, #E8C547)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} />
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "'IBM Plex Mono', monospace", width: 32 }}>{fmt(duration)}</span>
      </div>

      {/* Mood pills + Focus timer */}
      <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        {MOODS.map(m => <button key={m.id} onClick={() => selectMood(m.id)} style={{ padding: "3px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: activeMood === m.id ? "1px solid rgba(212,134,10,0.4)" : "1px solid rgba(255,255,255,0.06)", background: activeMood === m.id ? "rgba(212,134,10,0.12)" : "transparent", color: activeMood === m.id ? "#e09040" : "rgba(255,255,255,0.3)", transition: "all 0.2s", fontFamily: "'Outfit', sans-serif" }}>{m.icon} {m.label}</button>)}
        <div style={{ flex: 1 }} />
        {/* Focus timer button */}
        {!focusActive ? <div style={{ display: "flex", gap: 3 }}>
          {[25, 45, 60].map(mins => <button key={mins} onClick={() => startFocus(mins)} style={{ ...btnBase, fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }} title={`${mins}min focus session`}>🎯 {mins}m</button>)}
        </div> : <button onClick={() => { setFocusActive(false); setFocusRemaining(0); }} style={{ ...btnBase, fontSize: 12, color: "#E8C547", padding: "2px 10px", borderRadius: 6, border: "1px solid rgba(232,197,71,0.2)" }}>🎯 End Focus ({Math.floor(focusRemaining / 60)}:{String(focusRemaining % 60).padStart(2, "0")})</button>}
        <button onClick={() => setImmersive(true)} style={{ ...btnBase, fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }} title="Fullscreen visualizer">🌌 Immersive</button>
      </div>

      {/* Genre pills + track list */}
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        {GENRES.map(g => <button key={g.id} onClick={() => { setGenre(g.id); setTrackIdx(0); setActiveMood(null); }}
          style={{ padding: "3px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: genre === g.id && !activeMood ? "1px solid rgba(212,134,10,0.4)" : "1px solid rgba(255,255,255,0.06)", background: genre === g.id && !activeMood ? "rgba(212,134,10,0.12)" : "transparent", color: genre === g.id && !activeMood ? "#e09040" : "rgba(255,255,255,0.3)", transition: "all 0.2s", fontFamily: "'Outfit', sans-serif" }}>{g.icon} {g.label}</button>)}
        {favorites.size > 0 && <button onClick={() => { const favTracks = ALL_TRACKS.filter(t => favorites.has(t.id)); if (favTracks.length) { const picked = favTracks[0]; setGenre(picked.genre); const gt = ALL_TRACKS.filter(t => t.genre === picked.genre); setTrackIdx(gt.findIndex(t => t.id === picked.id)); setActiveMood(null); } }} style={{ padding: "3px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid rgba(239,68,68,0.15)", background: "transparent", color: "rgba(239,68,68,0.5)", fontFamily: "'Outfit', sans-serif" }}>♥ {favorites.size}</button>}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowList(!showList)} style={{ ...btnBase, fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "'IBM Plex Mono', monospace" }}>{showList ? "Hide" : "Tracks"} ▾</button>
      </div>

      {showList && <div style={{ marginTop: 6, maxHeight: 130, overflowY: "auto", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
        {genreTracks.map((t, i) => <button key={t.id} onClick={() => changeTrack(i)}
          style={{ width: "100%", padding: "5px 10px", background: i === trackIdx % genreTracks.length ? "rgba(212,134,10,0.1)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: i === trackIdx % genreTracks.length ? "#e09040" : "rgba(255,255,255,0.45)", transition: "all 0.15s", fontFamily: "'Outfit', sans-serif" }}
          onMouseEnter={e => { if (i !== trackIdx % genreTracks.length) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          onMouseLeave={e => { if (i !== trackIdx % genreTracks.length) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ width: 14, fontSize: 13, textAlign: "right", opacity: 0.4, fontFamily: "'IBM Plex Mono', monospace" }}>{i === trackIdx % genreTracks.length && playing ? "♫" : `${i + 1}`}</span>
          <span style={{ flex: 1, textAlign: "left" }}>{t.name}</span>
          <button onClick={e => { e.stopPropagation(); toggleFav(t.id); }} style={{ ...btnBase, fontSize: 12, color: favorites.has(t.id) ? "#EF4444" : "rgba(255,255,255,0.15)", padding: 0 }}>{favorites.has(t.id) ? "♥" : "♡"}</button>
        </button>)}
      </div>}
    </div>

    {/* ═══ IMMERSIVE MODE — Fullscreen 3D Visualizer ═══ */}
    {immersive && <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <OrbScene freqData={freqDataRef.current} bassEnergy={bassEnergy} midEnergy={midEnergy} highEnergy={highEnergy} amplitude={amplitude} />
      </div>
      {/* Track info — subtle */}
      <div style={{ position: "absolute", bottom: 80, left: 32, zIndex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontFamily: "'Outfit', sans-serif" }}>{track?.name || "—"}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>{activeMood ? `${MOODS.find(m => m.id === activeMood)?.icon} ${MOODS.find(m => m.id === activeMood)?.label}` : GENRES.find(g => g.id === genre)?.label}</div>
      </div>
      {/* Controls */}
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 20, zIndex: 1 }}>
        <button onClick={prevTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.4)", fontSize: 20 }}>⏮</button>
        <button onClick={toggle} style={{ width: 56, height: 56, borderRadius: 28, background: "linear-gradient(135deg, #e09040, #c07030)", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(224,144,64,0.4)" }}>{playing ? "⏸" : "▶"}</button>
        <button onClick={nextTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.4)", fontSize: 20 }}>⏭</button>
      </div>
      {/* Progress */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, #D4860A, #E8C547)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} />
      </div>
      {/* Time */}
      <div style={{ position: "absolute", bottom: 6, right: 16, fontSize: 13, color: "rgba(255,255,255,0.2)", fontFamily: "'IBM Plex Mono', monospace", zIndex: 1 }}>{fmt(currentTime)} / {fmt(duration)}</div>
      {/* Exit */}
      <button onClick={() => setImmersive(false)} style={{ position: "absolute", top: 20, right: 20, padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", zIndex: 1 }}>Exit Immersive</button>
    </div>}
  </div></>;
}



/* ═══════════════════════════════════════════════════════════════
   EXPORT HELPER — downloads data as CSV
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   HOME — Main workspace
   ═══════════════════════════════════════════════════════════════

   CROSS-MODULE DATA FLOW:
   ┌─────────┐  filters (f)   ┌──────────┐  jobStates  ┌──────────┐  simState  ┌──────────┐
   │ Sidebar  │──────────────→ │ ALL      │────────────→│ Simulate │──────────→ │ Mobilize │
   │ Filters  │  model, job    │ MODULES  │             │          │            │ Roadmap  │
   └─────────┘                 └──────────┘             └──────────┘            └──────────┘
       │                            ↑                        ↑                       ↑
       │  viewCtx                   │ API data               │ redeployRows          │ jobStates
       └────────────────────────────┘ (filtered)             │ (design decisions)    │ simState
                                                             │                       │
   ┌─────────┐  jobStates (R/W)  ┌──────────┐               │                       │
   │ Design   │─────────────────→│ jobStates│───────────────┘                       │
   │ WDL      │  decon/redeploy  │ (central)│───────────────────────────────────────┘
   └─────────┘                   └──────────┘
       │                              │
       │  logDec() (global)           │ decisionLog, riskRegister
       └──────────────────────────────┼──────────→ ┌──────────┐
                                      └──────────→ │ Export   │
                                                   │ Dashboard│
                                                   └──────────┘
   State lives in Home component, flows via props.
   Filters cascade: func → jf → sf → cl (workspace.ts).
   All API calls include filters for server-side filtering.
   logDec() is globally available for cross-module decision tracking.
   ═══════════════════════════════════════════════════════════════ */
function Home({ projectId, projectName, projectMeta, onBackToHub, user, onShowProfile, onShowPlatformHub }: { projectId: string; projectName: string; projectMeta: string; onBackToHub: () => void; user?: authApi.AuthUser; onShowProfile?: () => void; onShowPlatformHub?: () => void }) {
  const { theme, toggle: toggleTheme } = useTheme();
  const animatedBg = useAnimatedBg();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [cmdRecentIds, setCmdRecentIds] = usePersisted<string[]>(`${projectId}_cmd_recent`, []);
  const [annotations, setAnnotations] = usePersisted<Annotation[]>(`${projectId}_annotations`, []);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [showAnnoPanel, setShowAnnoPanel] = useState(false);
  const [showCoPilot, setShowCoPilot] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const [showStoryEngine, setShowStoryEngine] = useState(false);
  const [showBotWorkspace, setShowBotWorkspace] = useState(false);
  const [showAgentHub, setShowAgentHub] = useState(false);
  const [agentHistory, setAgentHistory] = usePersisted<{ id: string; agent: string; name: string; action: string; time: string; result?: string }[]>(`${projectId}_agent_history`, []);
  const [agentSettings, setAgentSettings] = usePersisted<Record<string, { enabled: boolean; autonomy: string }>>(`${projectId}_agent_settings`, {
    watcher: { enabled: true, autonomy: "suggest" }, analyst: { enabled: true, autonomy: "suggest" },
    designer: { enabled: true, autonomy: "suggest" }, planner: { enabled: true, autonomy: "suggest" },
    narrator: { enabled: true, autonomy: "suggest" }, quality: { enabled: true, autonomy: "observe" },
  });
  const [agentRunning, setAgentRunning] = useState<string | null>(null);
  const [aiProviders, setAiProviders] = useState<{ claude: boolean; gemini: boolean; no_key_message?: string | null } | null>(null);
  useEffect(() => { api.apiFetch("/api/ai/providers").then(r => r.json()).then(d => setAiProviders(d)).catch(() => {}); }, []);
  const [agentResults, setAgentResults] = usePersisted<{ id: string; agent: string; agentName: string; result: string; time: string; reviewed: boolean }[]>(`${projectId}_agent_results`, []);
  const [presentStartTime, setPresentStartTime] = useState(0);
  const [presentNotes, setPresentNotes] = useState(false);
  // Sync-read viewMode so the first render already has the value set by SandboxViewSelector.
  // usePersisted reads via useEffect (async) which causes a flash of the ViewSelector.
  const _initViewMode = typeof window !== "undefined" ? (() => { try { const s = localStorage.getItem(`${projectId}_viewMode`); if (s) return JSON.parse(s); } catch {} return ""; })() : "";
  const [viewMode, setViewMode] = usePersisted<string>(`${projectId}_viewMode`, _initViewMode);
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
  const [page, setPage] = useState("home");
  const fileRef = useRef<HTMLInputElement>(null);

  // Tutorial mode — must be declared before the useEffect that references it
  const [isTutorial] = useState(() => { try { return JSON.parse(localStorage.getItem(`${projectId}_isTutorial`) || "false"); } catch { return false; } });

  // Page state is intentionally useState (not usePersisted) — on project entry,
  // users always start at "home" (Overview). Navigation state is session-only.
  const workspace = useWorkspaceController();
  const { models, model, jobs, job, filters: f, filterOptions: fo, message: msg, backendOk, loadingModels, uploadFiles, resetWorkspace, setModel, setJob, setFilter, clearFilters } = workspace;
  const { toast, ToastContainer } = useToast();
  const { log: decisionLog, logDecision } = useDecisionLog(projectId);
  const { risks: riskRegister, addRisk, updateRisk } = useRiskRegister(projectId);
  const [showDecLog, setShowDecLog] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [sidebarGuide, setSidebarGuide] = useState<"consultant" | "hr" | null>(() => {
    if (typeof window === "undefined") return null;
    try { const g = sessionStorage.getItem(`${projectId}_openGuide`); if (g === "consultant" || g === "hr") { sessionStorage.removeItem(`${projectId}_openGuide`); return g; } } catch {}
    return null;
  });
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return !sessionStorage.getItem(`${projectId}_splashSeen`); } catch { return true; }
  });
  const [decLogFilter, setDecLogFilter] = useState("All");
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [remoteChange, setRemoteChange] = useState<RemoteChange | null>(null);
  const collab = useCollaboration({
    projectId,
    userId: user?.id || "",
    username: user?.username || "",
    displayName: user?.display_name || user?.username || "",
    currentTab: page,
    onRemoteChange: (change) => setRemoteChange(change),
  });
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
          api.apiFetch(`/api/tutorial/seed?industry=${projectId.split("_").slice(2).join("_")}&size=${projectId.split("_")[1]}`).catch(() => {});
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
  const navigate = useCallback((id: string) => { setPage(id); setVisited(prev => ({ ...prev, [id]: true })); analytics.trackModuleVisited(id); analytics.startModuleSession(id); }, [setPage, setVisited]);
  const funnelFiredRef = useRef(false);
  useEffect(() => {
    if (funnelFiredRef.current) return;
    const distinct = Object.keys(visited).filter(k => visited[k] && k !== "home").length;
    if (distinct >= 3) { analytics.trackFunnelStep("used_3_modules"); funnelFiredRef.current = true; }
  }, [visited]);

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
      for (const wf of wizFiles) {
        const ext = wf.name.split(".").pop() || "unknown";
        analytics.trackDataUploaded(ext, wf.size, wizPreview?.rows);
      }
      analytics.trackFunnelStep("uploaded_data");
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
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split(".").pop() || "unknown";
        analytics.trackDataUploaded(ext, f.size);
      }
      analytics.trackFunnelStep("uploaded_data");
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
    if (decisionLog.length > 0) parts.push(`${decisionLog.length} decisions logged`);
    if (riskRegister.length > 0) parts.push(`${riskRegister.length} risks tracked (${riskRegister.filter(r => r.status === "Open").length} open)`);
    return parts.join(". ");
  }, [model, job, jobs, jobStates, f, page, simState, decisionLog, riskRegister]);

  // Agent system
  const AGENT_DEFS = [
    { id: "watcher", name: "The Watcher", icon: "👁️", desc: "Monitors data changes and inconsistencies" },
    { id: "analyst", name: "The Analyst", icon: "🔬", desc: "Detects patterns and surfaces insights" },
    { id: "designer", name: "The Designer", icon: "✏️", desc: "Autonomously redesigns roles and structures" },
    { id: "planner", name: "The Planner", icon: "📋", desc: "Maintains the living transformation plan" },
    { id: "narrator", name: "The Narrator", icon: "📖", desc: "Keeps the executive narrative current" },
    { id: "quality", name: "Quality Controller", icon: "✅", desc: "Validates consistency across all modules" },
  ];
  const runAgent = useCallback(async (agentId: string) => {
    if (agentRunning) return;
    const agent = AGENT_DEFS.find(a => a.id === agentId);
    if (!agent || !agentSettings[agentId]?.enabled) return;
    setAgentRunning(agentId);
    try {
      const ctx = buildAiContext();
      const prompts: Record<string, string> = {
        watcher: `As The Watcher, analyze for changes and anomalies. Context: ${ctx}. Return 2 observations.`,
        analyst: `As The Analyst, detect patterns in this data. Context: ${ctx}. Return 3 insights with specific numbers.`,
        designer: `As The Designer, identify top 3 roles for AI redesign. Context: ${ctx}. Return role names and reasons.`,
        planner: `As The Planner, check if the plan needs updates. Context: ${ctx}. Return 2 recommendations.`,
        narrator: `As The Narrator, generate a 3-sentence executive summary update. Context: ${ctx}.`,
        quality: `As Quality Controller, check for data inconsistencies. Context: ${ctx}. Return 2 issues found.`,
      };
      const result = await callAI(`You are ${agent.name}, a specialized AI agent. Be specific and concise.`, prompts[agentId] || ctx);
      const entry = { id: `ar_${Date.now()}`, agent: agentId, agentName: agent.name, result: result.slice(0, 500), time: new Date().toISOString(), reviewed: false };
      setAgentResults(prev => [entry, ...prev].slice(0, 50));
      setAgentHistory(prev => [{ id: entry.id, agent: agentId, name: agent.name, action: "Completed analysis", time: entry.time }, ...prev].slice(0, 100));
      showToast(`${agent.icon} ${agent.name} completed analysis`);
    } catch { showToast(`${agent.name} failed — try again`); }
    setAgentRunning(null);
  }, [agentRunning, agentSettings, buildAiContext, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAllAgents = useCallback(async () => {
    for (const agent of AGENT_DEFS) {
      if (agentSettings[agent.id]?.enabled) {
        await runAgent(agent.id);
      }
    }
  }, [agentSettings, runAgent]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewCtx: ViewContext = { mode: viewMode || "org", employee: viewEmployee, job: viewJob, custom: viewCustom };

  // ── Computed transformation summary — derived from all cross-module state ──
  // Provides a unified view of transformation progress that any module can read.
  const transformationSummary = useMemo(() => {
    const designedJobs = Object.entries(jobStates).filter(([, s]) => s.finalized);
    const inProgressJobs = Object.entries(jobStates).filter(([, s]) => s.deconSubmitted && !s.finalized);
    // Aggregate task dispositions from all finalized job designs
    let tasksAutomate = 0, tasksAugment = 0, tasksEliminate = 0, tasksRetain = 0, totalTasks = 0;
    let totalCapacityFreed = 0;
    for (const [, state] of designedJobs) {
      for (const row of (state.deconRows || [])) {
        totalTasks++;
        const disp = (row as Record<string, unknown>).disposition as string || "";
        const pct = Number((row as Record<string, unknown>).ai_impact || (row as Record<string, unknown>).aiImpact || 0);
        const timePct = Number((row as Record<string, unknown>).time_pct || (row as Record<string, unknown>).timePct || 0);
        if (disp === "automate" || disp === "Automate") { tasksAutomate++; totalCapacityFreed += timePct * (pct / 100); }
        else if (disp === "augment" || disp === "Augment") { tasksAugment++; totalCapacityFreed += timePct * (pct / 100) * 0.5; }
        else if (disp === "eliminate" || disp === "Eliminate") { tasksEliminate++; totalCapacityFreed += timePct; }
        else tasksRetain++;
      }
    }
    return {
      designedJobCount: designedJobs.length,
      inProgressJobCount: inProgressJobs.length,
      totalJobCount: jobs.length,
      totalTasks,
      tasksAutomate, tasksAugment, tasksEliminate, tasksRetain,
      capacityFreedPct: totalTasks > 0 ? Math.round(totalCapacityFreed / Math.max(1, designedJobs.length)) : 0,
      scenario: simState.scenario,
      adoptionRate: simState.custom ? simState.custAdopt : (simState.scenario === "conservative" ? 35 : simState.scenario === "aggressive" ? 80 : 55),
      timeline: simState.custom ? simState.custTimeline : (simState.scenario === "conservative" ? 30 : simState.scenario === "aggressive" ? 14 : 20),
      investment: simState.investment,
      decisionCount: decisionLog.length,
      riskCount: riskRegister.length,
      openRiskCount: riskRegister.filter(r => r.status === "Open").length,
    };
  }, [jobStates, jobs, simState, decisionLog, riskRegister]);

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
    { key: "s", ctrl: true, label: "Save current state", action: () => { showToast("State saved"); }, category: "Tools" },
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
      { id: "act_agents", icon: "🤖", label: "Open Agent Hub", desc: "Multi-agent AI system for autonomous analysis", category: "Actions", action: () => { setShowAgentHub(true); setShowCmdPalette(false); }, keywords: "agent hub AI autonomous watcher analyst designer planner" },
      { id: "act_agents_run", icon: "▶️", label: "Run All Agents", desc: "Trigger all AI agents to analyze your project", category: "Actions", action: () => { setShowCmdPalette(false); runAllAgents(); }, keywords: "run agents analyze AI" },
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

  // Presentation mode module sequence (must be before conditional returns)
  const PRESENT_MODULES = ["snapshot", "scan", "heatmap", "jobarch", "design", "opmodel", "simulate", "plan", "export"];
  const presentIdx = PRESENT_MODULES.indexOf(page);
  const presentPrev = useCallback(() => { if (presentIdx > 0) navigate(PRESENT_MODULES[presentIdx - 1]); }, [presentIdx, navigate]); // eslint-disable-line react-hooks/exhaustive-deps
  const presentNext = useCallback(() => { if (presentIdx < PRESENT_MODULES.length - 1) navigate(PRESENT_MODULES[presentIdx + 1]); else if (page === "home") navigate(PRESENT_MODULES[0]); }, [presentIdx, page, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Presentation mode keyboard handler (must be before conditional returns)
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
  }, [presentMode, presentNext, presentPrev]);

  // Set data-present attribute (must be before conditional returns)
  useEffect(() => {
    document.documentElement.setAttribute("data-present", presentMode ? "true" : "false");
    return () => document.documentElement.removeAttribute("data-present");
  }, [presentMode]);

  // View selector pages — full screen, no sidebar
  if (!viewMode || viewMode === "job_select" || viewMode === "employee_select") {
    return <div style={{ minHeight: "100vh", background: "#0B1120", animation: "pageCrossfade 0.2s ease-out" }}>
      {!viewMode && <ViewSelector
        onBack={onBackToHub}
        onSelect={(mode, detail) => {
          if (mode === "org") { setViewMode("org"); }
          else if (mode === "job_select") { setViewMode("job_select"); }
          else if (mode === "employee_select") { setViewMode("employee_select"); }
          else if (mode === "custom" && detail) { setViewMode("custom"); setViewCustom(detail); Object.entries(detail).forEach(([k, v]) => { if (k !== "ct") setFilter(k as keyof Filters, v); }); }
          // Guide modes: set org view and auto-open the guide
          if (mode === "consultant" || mode === "hr") { setViewMode("org"); setSidebarGuide(mode as "consultant" | "hr"); }
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
    return <div onClick={() => { setShowSplash(false); try { sessionStorage.setItem(`${projectId}_splashSeen`, "1"); } catch {} }} style={{ position: "fixed", inset: 0, cursor: "pointer", zIndex: 30, animation: "pageCrossfade 0.2s ease-out", willChange: "opacity" }}>
      <VideoBackground name="landing_bg" overlay={0.15} poster={`${CDN_BASE}/landing_bg.png`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #0c1e3a 100%)" className="absolute inset-0" />
    </div>;
  }

  return <div className="flex min-h-screen w-full overflow-x-hidden">
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
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={wizDoImport} disabled={wizImporting} className="flex-1 px-4 py-3 rounded-xl text-[16px] font-bold text-white" style={{ background: "linear-gradient(135deg, #e09040, #c07030)", opacity: wizImporting ? 0.5 : 1 }}>{wizImporting ? "Importing..." : "🚀 Import Data"}</motion.button>
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
        return <motion.button key={m} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(m)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-all" style={{ background: isCurrent ? "rgba(212,134,10,0.15)" : "transparent", color: isCurrent ? "#f0a050" : "rgba(255,255,255,0.3)", border: isCurrent ? "1px solid rgba(212,134,10,0.3)" : "1px solid transparent" }}>
          <span className="text-[14px]">{mod?.icon}</span>
          <span className="hidden lg:inline">{mod?.title?.split(" ").slice(0, 2).join(" ") || m}</span>
        </motion.button>;
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

    <aside className="min-h-screen bg-[var(--surface-1)] flex flex-col px-4 py-5 shrink-0 overflow-y-auto sticky top-0 border-r border-[var(--border)] transition-all duration-300" style={{ width: "var(--sidebar-width)", height: "100vh", ...(presentMode ? { marginLeft: "calc(var(--sidebar-width) * -1)", opacity: 0, pointerEvents: "none" } : {}) }}>
      <div className="flex items-center justify-between mb-1">
        <div className="cursor-pointer" onClick={goHome}><div className="text-sm font-extrabold text-[var(--text-primary)]">AI Transformation</div><div className="text-[15px] font-semibold text-[var(--accent-primary)] uppercase tracking-[1.5px]">PLATFORM</div></div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <button onClick={() => { if (page === "home" && viewMode) { setViewMode(""); } else { onBackToHub(); } }} className="w-full text-left text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1 mb-1 flex items-center gap-1 transition-colors">{page === "home" && viewMode ? "← Back to Views" : page !== "home" ? "← Back to Home" : "← Back to Projects"}</button>
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-[var(--surface-2)] rounded-lg px-3 py-2 mb-2 border border-[var(--border)]"><div className="text-[15px] font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-0.5">Active Project</div><div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{projectName}</div>{projectMeta && <div className="text-[15px] text-[var(--text-muted)] truncate mt-0.5 italic">{projectMeta}</div>}</motion.div>
      {/* Journey progress bar */}
      <div className="flex items-center gap-1 mb-2 mt-1">
        {PHASES.map((phase, pi) => {
          const ms = phase.modules.map(id => (moduleStatus[id] || "not_started"));
          const pStatus = ms.every(s => s === "complete") ? "complete" : ms.some(s => s !== "not_started") ? "in_progress" : "not_started";
          return <React.Fragment key={phase.id}>
            {pi > 0 && <div className="flex-1 h-px" style={{ background: pStatus !== "not_started" ? `${phase.color}40` : "var(--border)" }} />}
            <motion.button initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: pStatus !== "not_started" ? 1 : 0.4 }} transition={{ delay: pi * 0.1, duration: 0.3 }} onClick={() => { setPage("home"); }} title={`Phase ${pi+1}: ${phase.label}`} className="flex items-center gap-1 shrink-0 transition-all">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[15px] font-bold" style={{ background: pStatus === "complete" ? `${phase.color}20` : pStatus === "in_progress" ? `${phase.color}10` : "transparent", color: phase.color, border: `1px solid ${phase.color}${pStatus !== "not_started" ? "60" : "20"}` }}>{pStatus === "complete" ? "✓" : pStatus === "in_progress" ? "●" : "○"}</div>
            </motion.button>
          </React.Fragment>;
        })}
      </div>
      <div className="text-[15px] text-[var(--text-muted)] mb-1">{(() => { const ci = PHASES.findIndex(p => p.modules.some(id => (moduleStatus[id] || "not_started") !== "complete") || p.modules.every(id => (moduleStatus[id] || "not_started") === "not_started")); return ci >= 0 ? `Phase ${ci+1} of 5 — ${PHASES[ci].label}` : "Journey complete"; })()}</div>
      <div className="h-px bg-[var(--border)] my-3" />
      <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-[1.2px] mb-2">Data Intake</div>
      <input ref={fileRef} type="file" multiple accept=".xlsx,.xls,.csv,.tsv" onChange={e => e.target.files && upload(e.target.files)} className="hidden" />
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { setShowImportWizard(true); setWizStep(1); setWizFiles([]); setWizPreview(null); setWizMappings({}); setWizValidation([]); }} className="w-full bg-[var(--accent-primary)] hover:opacity-90 text-white text-[15px] font-semibold py-1.5 rounded-md mb-1.5">⬆ Smart Import</motion.button>
      <a href="/api/template" download className="block w-full bg-[var(--surface-3)] hover:bg-[var(--hover)] border border-[var(--accent-primary)] text-[var(--accent-primary)] text-[15px] font-semibold py-1.5 rounded-md mb-1.5 text-center no-underline">⬇ Export Template</a>
      <button onClick={reset} className="w-full bg-[var(--surface-2)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] text-[15px] font-semibold py-1 rounded-md">Reset</button>
      {msg && <div className="mt-1.5 text-[15px] text-[var(--accent-primary)] bg-[rgba(212,134,10,0.1)] rounded px-2 py-1">{msg}</div>}
      {!backendOk && <div className="mt-1.5 text-[15px] text-[var(--risk)] bg-[rgba(239,68,68,0.1)] rounded px-2 py-1.5 border border-[var(--risk)]/20">⚠ Can't reach the server<br/><span className="text-[15px] text-[var(--text-muted)]">Start the backend: cd backend && python3 main.py</span></div>}
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
        <button onClick={() => setShowBotWorkspace(true)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showBotWorkspace ? "bg-[rgba(224,144,64,0.12)] text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">✦</span> AI Analyst
        </button>
        <button onClick={() => setShowAgentHub(!showAgentHub)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showAgentHub ? "bg-[rgba(139,92,246,0.1)] text-[var(--purple)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">🤖</span> Agent Hub {agentResults.filter(r => !r.reviewed).length > 0 && <span className="text-[12px] px-1.5 py-0.5 rounded-full bg-[rgba(139,92,246,0.2)] text-[var(--purple)] font-bold">{agentResults.filter(r => !r.reviewed).length}</span>}
        </button>
        <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }} onClick={() => setShowStoryEngine(true)} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">📖</span> Generate Story
        </motion.button>
        <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }} onClick={() => { setPresentMode(true); setPresentStartTime(Date.now()); setShowCoPilot(false); setShowAnnoPanel(false); setAnnotateMode(false); if (page === "home") navigate("snapshot"); }} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">🖥️</span> Present
        </motion.button>
        <button onClick={() => setShowCoPilot(!showCoPilot)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showCoPilot ? "bg-[rgba(212,134,10,0.1)] text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">🤖</span> AI Co-Pilot
        </button>
        <button onClick={() => setAnnotateMode(!annotateMode)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${annotateMode ? "bg-[rgba(59,130,246,0.1)] text-[#3B82F6] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">💬</span> {annotateMode ? "Annotating..." : "Annotate"}
        </button>
        <button onClick={() => setShowAnnoPanel(!showAnnoPanel)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showAnnoPanel ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">📋</span> Notes {annotations.length > 0 && <span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold">{annotations.length}</span>}
        </button>
        <button onClick={() => navigate("flightrecorder")} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${page === "flightrecorder" ? "bg-[rgba(212,134,10,0.08)] text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">🛫</span> Flight Recorder
        </button>
        <button onClick={() => setShowActivityFeed(!showActivityFeed)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showActivityFeed ? "bg-[rgba(16,185,129,0.1)] text-[#10B981] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">📡</span> Activity Feed {collab.presence.length > 0 && <span className="text-[12px] px-1.5 py-0.5 rounded-full bg-[rgba(16,185,129,0.2)] text-[#10B981] font-bold">{collab.presence.length}</span>}
        </button>
        <button onClick={() => setShowDecLog(!showDecLog)} className={`w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 transition-all ${showDecLog ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-semibold" : "text-[var(--text-muted)] hover:bg-[var(--hover)]"}`}>
          <span className="text-[15px]">📝</span> Decision Log {decisionLog.length > 0 && <span className="text-[14px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold">{decisionLog.length}</span>}
        </button>
        <button onClick={() => setSidebarGuide("consultant")} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">📋</span> Consultant Guide
        </button>
        <button onClick={() => setSidebarGuide("hr")} className="w-full text-left px-2 py-1.5 rounded-lg text-[15px] mb-1 flex items-center gap-2 text-[var(--text-muted)] hover:bg-[var(--hover)] transition-all">
          <span className="text-[15px]">👥</span> HR Guide
        </button>
        <button onClick={() => { if (onShowPlatformHub) onShowPlatformHub(); }} className="w-full rounded-xl p-2.5 text-left transition-all group" style={{ background: "rgba(212,134,10,0.03)", border: "1px solid rgba(212,134,10,0.08)" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,134,10,0.2)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(212,134,10,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(212,134,10,0.08)"; e.currentTarget.style.boxShadow = "none"; }}>
          <div className="text-[15px] font-bold font-heading group-hover:text-[var(--accent-primary)] transition-colors" style={{ color: "rgba(212,134,10,0.6)" }}>AI Transformation</div>
          <div className="text-[14px]" style={{ color: "rgba(212,134,10,0.3)" }}>Account & Info</div>
        </button>
      </div>

      {/* Account controls — anchored at sidebar bottom */}
      <div className="pt-3 border-t border-[var(--border)] relative" ref={accountMenuRef}>
        {/* Dropdown menu — pops upward */}
        {accountMenuOpen && <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 8, borderRadius: 14, background: "rgba(15,12,8,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(212,134,10,0.12)", boxShadow: "var(--shadow-4)", padding: "6px", zIndex: 50, animation: "menuFadeIn 0.15s ease" }}>
          {[
            { icon: "👤", label: "My Account", action: () => { setAccountMenuOpen(false); if (onShowPlatformHub) onShowPlatformHub(); } },
            { icon: "🏠", label: "Platform Hub", action: () => { setAccountMenuOpen(false); if (onShowPlatformHub) onShowPlatformHub(); } },
            { icon: "📂", label: "My Projects", action: () => { setAccountMenuOpen(false); onBackToHub(); } },
            ...((user?.username === "hiral") ? [{ icon: "🛡️", label: "Admin Panel", action: () => { setAccountMenuOpen(false); if (onShowPlatformHub) onShowPlatformHub(); } }] : []),
          ].map(item => <button key={item.label} onClick={item.action} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[15px] font-semibold text-[var(--text-secondary)] transition-all" style={{ background: "transparent" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,134,10,0.08)"; e.currentTarget.style.color = "#f5e6d0"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            <span className="text-[15px]">{item.icon}</span>{item.label}
          </button>)}
          <div className="h-px mx-2 my-1" style={{ background: "rgba(212,134,10,0.1)" }} />
          {/* Animated backgrounds toggle */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" title={animatedBg.forced ? animatedBg.forceReason : undefined} style={{ opacity: animatedBg.forced ? 0.4 : 1 }}>
            <span className="text-[15px]">🎬</span>
            <span className="text-[14px] text-[var(--text-secondary)] flex-1">Animated BGs</span>
            <button onClick={animatedBg.toggle} disabled={animatedBg.forced} className="w-8 h-4 rounded-full transition-all relative" style={{ background: animatedBg.enabled ? "var(--accent-primary)" : "var(--surface-3)", border: "1px solid var(--border)", cursor: animatedBg.forced ? "not-allowed" : "pointer" }}>
              <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: animatedBg.enabled ? 16 : 1 }} />
            </button>
          </div>
          {animatedBg.forced && <div className="px-3 pb-1 text-[10px] text-[var(--text-muted)] italic">{animatedBg.forceReason}</div>}
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
        {aiProviders && <div className="text-center text-[12px] mt-0.5 opacity-40" style={{ color: aiProviders.claude ? "var(--success)" : "var(--risk)" }}>{aiProviders.claude ? "🟢 AI: Claude" : "🔴 AI: Offline"}</div>}
        <button onClick={() => setShowShortcuts(true)} className="text-[12px] text-[var(--text-muted)] opacity-40 hover:opacity-80 transition-opacity mt-1 flex items-center justify-center gap-1"><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 16, padding: "0 4px", borderRadius: 4, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>⌘/</span> shortcuts</button>
      </div>
    </aside>

    {/* ── MAIN ── */}
    <main className={`flex-1 min-w-0 min-h-screen bg-[var(--bg)] overflow-x-hidden ${presentMode ? "present-scale" : ""}`} style={presentMode ? { paddingTop: 60, paddingBottom: 56 } : undefined}>
      {/* Collaboration: presence bar + editing indicator */}
      {collab.presence.length > 0 && !presentMode && (
        <div style={{ position: "sticky", top: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px", background: "rgba(var(--bg-rgb, 15,12,8),0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
          <EditingIndicator users={collab.presence} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
            <PresenceAvatars users={collab.presence} />
            <button onClick={() => setShowActivityFeed(!showActivityFeed)} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Outfit', sans-serif" }}>
              <span style={{ fontSize: 13 }}>📡</span> Activity
            </button>
          </div>
        </div>
      )}
      <AnnotationLayer annotations={annotations} moduleId={page} annotateMode={annotateMode} onAdd={a => setAnnotations(prev => [...prev, a])} onUpdate={a => setAnnotations(prev => prev.map(x => x.id === a.id ? a : x))} onDelete={id => setAnnotations(prev => prev.filter(x => x.id !== id))}>
      <AnimatePresence mode="wait">
      <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      {page === "home" && <LandingPage onNavigate={navigate} moduleStatus={moduleStatus} hasData={hasData} viewMode={viewMode} projectName={projectName} onBackToHub={onBackToHub} onBackToSplash={() => { setShowSplash(true); try { sessionStorage.removeItem(`${projectId}_splashSeen`); } catch {} }} cardBackgrounds={cardBgs} phaseBackgrounds={phaseBgs} />}
      {page !== "home" && <div className="module-enter" style={{ padding: "var(--space-6) var(--space-8)", paddingBottom: 80 }}>
      {model && <NLQBar projectId={projectId} modelId={model} currentModule={page} />}
      {model && page !== "flightrecorder" && <AiObservationsPanel module={page} dataSummary={buildAiContext()} context={`Project: ${projectName}. Model: ${model}. Job: ${job || "All"}.`} filters={f} projectId={projectId} onNavigate={navigate} />}
      {page === "snapshot" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><WorkforceSnapshot model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {(page === "jobs" || page === "jobarch") && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><JobArchitectureModule model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "scan" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AiOpportunityScan model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "mgrcap" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ManagerCapability model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "changeready" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ChangeReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} simState={simState} /></ErrorBoundary>}
      {page === "mgrdev" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ManagerDevelopment model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "recommendations" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AiRecommendationsEngine model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "orghealth" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OrgHealthScorecard model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "heatmap" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AIImpactHeatmap model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "clusters" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><RoleClustering model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "skillshift" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><SkillShiftIndex model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "story" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><TransformationStoryBuilder model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} simState={simState} decisionLog={decisionLog} riskRegister={riskRegister} /></ErrorBoundary>}
      {page === "archetypes" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ReadinessArchetypes model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "export" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ExportReport model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} simState={simState} decisionLog={decisionLog} riskRegister={riskRegister} /></ErrorBoundary>}
      {page === "dashboard" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><TransformationExecDashboard model={model} f={f} onBack={goHome} onNavigate={navigate} decisionLog={decisionLog} riskRegister={riskRegister} addRisk={addRisk} updateRisk={updateRisk} jobStates={jobStates} simState={simState} transformationSummary={transformationSummary} /></ErrorBoundary>}
      {page === "readiness" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><AIReadiness model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} /></ErrorBoundary>}
      {page === "bbba" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><BBBAFramework model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "headcount" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><HeadcountPlanning model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "reskill" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ReskillingPathways model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} simState={simState} /></ErrorBoundary>}
      {page === "marketplace" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><TalentMarketplace model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "skillnet" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><SkillsNetwork model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "skills" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><SkillsTalent model={model} f={f} onBack={goHome} onNavigate={navigate} viewCtx={viewCtx} jobStates={jobStates} /></ErrorBoundary>}
      {page === "design" && model && viewCtx.mode !== "employee" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><WorkDesignLab model={model} f={f} job={viewCtx.mode === "job" ? viewCtx.job || job : job} jobs={jobs} onBack={goHome} jobStates={jobStates} setJobState={setJobState} onSelectJob={setJob} /></ErrorBoundary>}
      {page === "simulate" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ImpactSimulator onBack={goHome} onNavigate={navigate} model={model} viewCtx={viewCtx} f={f} jobStates={jobStates} simState={simState} setSimState={setSimState} /></ErrorBoundary>}
      {page === "build" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OrgDesignStudio onBack={goHome} viewCtx={viewCtx} model={model} f={f} odsState={odsState} setOdsState={setOdsState} jobStates={jobStates} /></ErrorBoundary>}
      {page === "plan" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><ChangePlanner model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} simState={simState} viewCtx={viewCtx} /></ErrorBoundary>}
      {page === "opmodel" && viewCtx.mode === "job" && <div className="px-7 py-6"><div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Job View</h3><p className="text-[15px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[15px] font-semibold">Change View ↻</button></div></div>}
      {page === "opmodel" && viewCtx.mode !== "employee" && viewCtx.mode !== "job" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OperatingModelLab onBack={goHome} model={model} f={f} projectId={projectId} onNavigateCanvas={() => navigate("om_canvas")} onModelChange={setModel} /></ErrorBoundary>}
      {(page === "design" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[15px] text-[var(--text-secondary)] mb-2">Work Design Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="green">💼 Job</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[15px] font-semibold">Change View ↻</button></div>}
      {(page === "opmodel" && viewCtx.mode === "employee") && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">🔒</div><h3 className="text-lg font-semibold mb-1">Not available in Employee View</h3><p className="text-[15px] text-[var(--text-secondary)] mb-2">Operating Model Lab is available in these views:</p><div className="flex gap-2 justify-center mb-4"><Badge color="indigo">🏢 Organization</Badge><Badge color="amber">⚙️ Custom</Badge></div><button onClick={() => setViewMode("")} className="text-[var(--accent-primary)] text-[15px] font-semibold">Change View ↻</button></div>}
      {page === "om_canvas" && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><OMDesignCanvas projectId={projectId} onBack={goHome} onNavigateLab={() => navigate("opmodel")} /></ErrorBoundary>}
      {page === "rolecompare" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><RoleComparison model={model} f={f} onBack={goHome} jobs={jobs} jobStates={jobStates} /></ErrorBoundary>}
      {page === "quickwins" && model && <ErrorBoundary onBack={goHome} onNavigate={navigate} onExitProject={onBackToHub}><QuickWinIdentifier model={model} f={f} onBack={goHome} onNavigate={navigate} jobStates={jobStates} /></ErrorBoundary>}
      {page === "flightrecorder" && <FlightRecorder projectId={projectId} projectName={projectName} onBack={goHome} />}
      {!model && page !== "home" && page !== "flightrecorder" && <div className="text-center py-20"><div className="text-4xl mb-3 opacity-30">📂</div><h3 className="text-lg font-semibold mb-1">No workforce data loaded</h3><p className="text-[15px] text-[var(--text-secondary)] max-w-md mx-auto mb-4">This module needs workforce data to function. Upload your data using the Smart Import wizard or select a demo model from the sidebar to explore.</p><div className="flex gap-3 justify-center"><button onClick={goHome} className="px-4 py-2 rounded-xl text-[15px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/5 transition-all">← Back to Overview</button><button onClick={() => setShowImportWizard(true)} className="px-4 py-2 rounded-xl text-[15px] font-semibold text-white bg-[var(--accent-primary)] hover:brightness-110 transition-all">Import Data</button></div></div>}
      </div>}
      </motion.div>
      </AnimatePresence>
      </AnnotationLayer>
    </main>
    {/* AI Co-Pilot sidebar */}
    <AnimatePresence>{showCoPilot && <AiCoPilot moduleId={page} contextData={buildAiContext()} open={showCoPilot} onClose={() => setShowCoPilot(false)} onNavigate={navigate} />}</AnimatePresence>
    <AnimatePresence>{showAnnoPanel && <AnnotationPanel annotations={annotations} onUpdate={a => setAnnotations(prev => prev.map(x => x.id === a.id ? a : x))} onDelete={id => setAnnotations(prev => prev.filter(x => x.id !== id))} onClose={() => setShowAnnoPanel(false)} />}</AnimatePresence>

    {/* ═══ COLLABORATION: Activity Feed + Remote Change Toast ═══ */}
    <AnimatePresence>{showActivityFeed && <ActivityFeedPanel activity={collab.activity} onClose={() => setShowActivityFeed(false)} />}</AnimatePresence>
    <RemoteChangeToast change={remoteChange} onDismiss={() => setRemoteChange(null)} />

    {/* ═══ AGENT ORCHESTRATOR ═══ */}
    <AgentOrchestrator projectId={projectId} sessionData={{ jobs: jobs.slice(0, 20), headcount: jobs.length, tasks: [], skills: [], functions: Array.from(new Set(jobs)), model_id: model || "", current_module: page }} />

    {/* ═══ AGENT HUB PANEL ═══ */}
    <AnimatePresence>{showAgentHub && <motion.div className="fixed top-0 right-0 bottom-0 w-[380px] z-[9997] flex flex-col" style={{ background: "var(--surface-1)", borderLeft: "1px solid var(--border)", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }} initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }} transition={{ duration: 0.25, ease: "easeOut" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.06), transparent)" }}>
        <div className="flex items-center gap-2.5"><span className="text-[18px]">🤖</span><div><div className="text-[15px] font-bold text-[var(--text-primary)] font-heading">Agent Hub</div><div className="text-[12px] text-[var(--text-muted)]">{AGENT_DEFS.filter(a => agentSettings[a.id]?.enabled).length} agents active</div></div></div>
        <div className="flex items-center gap-2">
          <button onClick={runAllAgents} disabled={!!agentRunning} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", opacity: agentRunning ? 0.5 : 1 }}>{agentRunning ? "Running..." : "▶ Run All"}</button>
          <button onClick={() => setShowAgentHub(false)} className="text-[16px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
        </div>
      </div>

      {/* Agent cards */}
      <div className="px-3 py-3 space-y-2 border-b border-[var(--border)] overflow-y-auto" style={{ maxHeight: "40vh" }}>
        {AGENT_DEFS.map(agent => {
          const settings = agentSettings[agent.id] || { enabled: true, autonomy: "suggest" };
          const isRunning = agentRunning === agent.id;
          const recentResult = agentResults.find(r => r.agent === agent.id);
          return <div key={agent.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px]">{agent.icon}</span>
              <div className="flex-1 min-w-0"><div className="text-[14px] font-bold text-[var(--text-primary)]">{agent.name}</div><div className="text-[12px] text-[var(--text-muted)]">{agent.desc}</div></div>
              <div className="flex items-center gap-1.5">
                {isRunning && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--purple)" }} />}
                <button onClick={() => setAgentSettings(prev => ({...prev, [agent.id]: {...settings, enabled: !settings.enabled}}))} className="w-8 h-4 rounded-full transition-all relative" style={{ background: settings.enabled ? "var(--purple)" : "var(--surface-2)", border: "1px solid var(--border)" }}><div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: settings.enabled ? 16 : 1 }} /></button>
              </div>
            </div>
            {settings.enabled && <div className="flex items-center gap-2">
              <div className="flex gap-0.5">{(["observe", "suggest", "auto"] as const).map(a => <button key={a} onClick={() => setAgentSettings(prev => ({...prev, [agent.id]: {...settings, autonomy: a}}))} className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: settings.autonomy === a ? "rgba(139,92,246,0.15)" : "transparent", color: settings.autonomy === a ? "var(--purple)" : "var(--text-muted)" }}>{a}</button>)}</div>
              <div className="flex-1" />
              <button onClick={() => runAgent(agent.id)} disabled={!!agentRunning || !settings.enabled} className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-[var(--purple)] border border-[var(--purple)]/20 hover:bg-[rgba(139,92,246,0.08)] disabled:opacity-30">Run</button>
            </div>}
            {recentResult && !recentResult.reviewed && <div className="mt-2 rounded-lg bg-[rgba(139,92,246,0.04)] border border-[var(--purple)]/10 p-2">
              <div className="text-[12px] text-[var(--text-secondary)] line-clamp-2">{recentResult.result.slice(0, 120)}...</div>
              <div className="flex gap-1 mt-1"><button onClick={() => setAgentResults(prev => prev.map(r => r.id === recentResult.id ? {...r, reviewed: true} : r))} className="text-[11px] text-[var(--success)]">Accept</button><button onClick={() => setAgentResults(prev => prev.filter(r => r.id !== recentResult.id))} className="text-[11px] text-[var(--text-muted)]">Dismiss</button></div>
            </div>}
          </div>;
        })}
      </div>

      {/* Results feed */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Activity Feed</div>
        {agentHistory.length === 0 && <div className="text-center py-8 text-[var(--text-muted)] text-[13px]">No agent activity yet. Click &quot;Run All&quot; to start.</div>}
        <div className="space-y-1.5">{agentHistory.slice(0, 20).map(h => {
          const agent = AGENT_DEFS.find(a => a.id === h.agent);
          return <div key={h.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
            <span className="text-[14px] shrink-0">{agent?.icon || "🤖"}</span>
            <div className="flex-1 min-w-0"><div className="text-[13px] text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">{h.name}</strong> {h.action}</div><div className="text-[11px] text-[var(--text-muted)]">{new Date(h.time).toLocaleTimeString()}</div></div>
          </div>;
        })}</div>
      </div>
    </motion.div>}</AnimatePresence>
    <AnimatePresence>{showStoryEngine && <StoryEngine projectName={projectName} model={model} contextData={buildAiContext()} onClose={() => setShowStoryEngine(false)} onNavigate={navigate} />}</AnimatePresence>

    {/* ═══ BOT WORKSPACE ═══ */}
    {showBotWorkspace && model && <BotWorkspace projectId={projectId} modelId={model} onClose={() => setShowBotWorkspace(false)} />}
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

    {sidebarGuide && <GuideViewer guide={sidebarGuide === "consultant" ? consultantGuide : hrGuide} onBack={() => setSidebarGuide(null)} onNavigate={(moduleId) => { setSidebarGuide(null); navigate(moduleId); }} />}
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

  // Industry-specific primary analyst role and skills
  const INDUSTRY_ROLES: Record<string, { analyst: string; analyst2: string; skills: string[]; omFn: string }> = {
    technology: { analyst: "Data Analyst", analyst2: "Financial Analyst", skills: ["Data Analysis", "Python/SQL", "Cloud Platforms", "AI/ML Tools", "Process Automation", "Communication", "Leadership"], omFn: "engineering" },
    financial_services: { analyst: "Risk Analyst", analyst2: "Fund Accountant", skills: ["Financial Modeling", "Risk Assessment", "Regulatory Knowledge", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "finance" },
    healthcare: { analyst: "Clinical Data Analyst", analyst2: "Revenue Cycle Specialist", skills: ["Clinical Data Analysis", "EHR Systems", "Medical Coding", "Regulatory Knowledge", "Process Automation", "Communication", "Leadership"], omFn: "clinical" },
    retail: { analyst: "Demand Planner", analyst2: "Financial Analyst", skills: ["Demand Forecasting", "Inventory Mgmt", "Customer Experience", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "merchandising" },
    manufacturing: { analyst: "Quality Analyst", analyst2: "Financial Analyst", skills: ["Process Engineering", "Quality Control", "Lean/Six Sigma", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "operations" },
    consulting: { analyst: "Data Consultant", analyst2: "Senior Analyst", skills: ["Strategy Frameworks", "Client Management", "Data Analysis", "Process Design", "Process Automation", "Communication", "Leadership"], omFn: "strategy" },
    energy: { analyst: "Reservoir Analyst", analyst2: "Financial Analyst", skills: ["Process Engineering", "Asset Mgmt", "HSE Knowledge", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "operations" },
    aerospace: { analyst: "Test Engineer", analyst2: "Program Analyst", skills: ["Systems Engineering", "Requirements Analysis", "Program Management", "Data Analysis", "Process Automation", "Communication", "Leadership"], omFn: "engineering" },
  };
  const ind = INDUSTRY_ROLES[industry] || INDUSTRY_ROLES.technology;

  // Work Design: Industry-specific analyst with 8 tasks
  const tasks = [
    { "Task Name": "Data extraction & pipeline maintenance", "Current Time Spent %": 25, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": ind.skills[0], "Secondary Skill": ind.skills[3] },
    { "Task Name": "Report generation & formatting", "Current Time Spent %": 20, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": ind.skills[0], "Secondary Skill": ind.skills[5] },
    { "Task Name": "Ad-hoc stakeholder analysis", "Current Time Spent %": 15, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": ind.skills[2], "Secondary Skill": ind.skills[0] },
    { "Task Name": "Dashboard creation & maintenance", "Current Time Spent %": 10, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": ind.skills[1], "Secondary Skill": ind.skills[0] },
    { "Task Name": "Executive presentations", "Current Time Spent %": 10, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": ind.skills[5], "Secondary Skill": ind.skills[6] },
    { "Task Name": "Data quality monitoring", "Current Time Spent %": 8, "Task Type": "Repetitive", "Logic": "Deterministic", "Interaction": "Independent", "AI Impact": "High", "Primary Skill": ind.skills[0], "Secondary Skill": ind.skills[4] },
    { "Task Name": "Cross-team consulting", "Current Time Spent %": 7, "Task Type": "Variable", "Logic": "Judgment-heavy", "Interaction": "Collaborative", "AI Impact": "Low", "Primary Skill": ind.skills[6], "Secondary Skill": ind.skills[5] },
    { "Task Name": "Tool evaluation", "Current Time Spent %": 5, "Task Type": "Variable", "Logic": "Probabilistic", "Interaction": "Interactive", "AI Impact": "Moderate", "Primary Skill": ind.skills[3], "Secondary Skill": ind.skills[2] },
  ];

  const redeploy = tasks.map(t => ({
    ...t,
    "Time Saved %": t["AI Impact"] === "High" ? Math.round(Number(t["Current Time Spent %"]) * 0.6) : t["AI Impact"] === "Moderate" ? Math.round(Number(t["Current Time Spent %"]) * 0.3) : Math.round(Number(t["Current Time Spent %"]) * 0.1),
    "Decision": t["AI Impact"] === "High" && t["Logic"] === "Deterministic" ? "Automate" : t["AI Impact"] === "Moderate" ? "Augment" : "Retain",
    "Technology": t["AI Impact"] === "High" && t["Logic"] === "Deterministic" ? "RPA / ETL Automation" : t["AI Impact"] === "Moderate" ? "AI-Assisted Analytics" : "Human-led",
    "Destination": t["Logic"] === "Deterministic" && t["AI Impact"] === "High" ? "AI / automation layer" : "Continue in role",
  }));

  // Seed industry-specific job states
  const emptyJob = { deconRows: [], redeployRows: [], scenario: "Balanced", deconSubmitted: false, redeploySubmitted: false, finalized: false, recon: null, initialized: false };
  localStorage.setItem(`${projectId}_jobStates`, JSON.stringify({
    [ind.analyst]: { deconRows: tasks, redeployRows: redeploy, scenario: "Balanced", deconSubmitted: true, redeploySubmitted: true, finalized: false, recon: null, initialized: true },
    [ind.analyst2]: { ...emptyJob, initialized: true },
    "Financial Analyst": { ...emptyJob, initialized: true },
    "HRBP": { ...emptyJob },
  }));

  localStorage.setItem(`${projectId}_simState`, JSON.stringify({ scenario: "balanced", custom: false, custAdopt: 55, custTimeline: 10, investment: 45000 }));
  localStorage.setItem(`${projectId}_omFn`, JSON.stringify(ind.omFn));
  localStorage.setItem(`${projectId}_omArch`, JSON.stringify("platform"));
  localStorage.setItem(`${projectId}_odsState`, JSON.stringify({ activeScenario: 0, view: "overview" }));
  localStorage.setItem(`${projectId}_skillsConfirmed`, JSON.stringify(true));
  // Pre-seed gap dispositions with industry-specific skills
  const gapDisp: Record<string, string> = {};
  ind.skills.slice(0, 3).forEach(s => { gapDisp[s] = "Close Internally"; });
  ind.skills.slice(3, 5).forEach(s => { gapDisp[s] = "Accept Risk"; });
  if (ind.skills[5]) gapDisp[ind.skills[5]] = "Close Internally";
  if (ind.skills[6]) gapDisp[ind.skills[6]] = "Hire Externally";
  localStorage.setItem(`${projectId}_gapDispositions`, JSON.stringify(gapDisp));

  localStorage.setItem(`${projectId}_shortlisted`, JSON.stringify({}));
  localStorage.setItem(`${projectId}_bbba_overrides`, JSON.stringify({}));
  localStorage.setItem(`${projectId}_mp_shortlist`, JSON.stringify({}));

  // Pre-seed maturity scores
  localStorage.setItem(`${ind.omFn}_platform_maturity`, JSON.stringify({
    "Strategy & Planning": 3, "Service Delivery": 2, "Analytics": 2, "Governance": 1,
    "Innovation": 2, "Talent": 2, "Process Excellence": 3, "Technology": 2, "Customer Experience": 3
  }));
  localStorage.setItem(`${ind.omFn}_platform_target`, JSON.stringify({
    "Strategy & Planning": 4, "Service Delivery": 4, "Analytics": 4, "Governance": 3,
    "Innovation": 4, "Talent": 3, "Process Excellence": 4, "Technology": 4, "Customer Experience": 4
  }));

  // Seed decision log with industry-relevant entries
  const co = getTutorialCompany(projectId);
  const empLabel = `${co.employees.toLocaleString()} employees`;
  localStorage.setItem(`${projectId}_decisionLog`, JSON.stringify([
    { ts: new Date(Date.now() - 86400000).toISOString(), module: "Skills", action: "Inventory Confirmed", detail: `${empLabel} × 15 skills confirmed` },
    { ts: new Date(Date.now() - 72000000).toISOString(), module: "Work Design", action: "Deconstruction Submitted", detail: `${ind.analyst}: 8 tasks analyzed` },
    { ts: new Date(Date.now() - 50000000).toISOString(), module: "Work Design", action: "Redeployment Saved", detail: `${ind.analyst}: 45% time released through automation` },
    { ts: new Date(Date.now() - 36000000).toISOString(), module: "Simulate", action: "Scenario Selected", detail: "Balanced scenario — 45% adoption, 10-month timeline" },
    { ts: new Date(Date.now() - 20000000).toISOString(), module: "Skills", action: "Gap Disposition Set", detail: `${ind.skills[0]}: Close Internally` },
  ]));

  // Seed industry-specific risk register
  localStorage.setItem(`${projectId}_riskRegister`, JSON.stringify([
    { id: "R1", source: "Skills Gap", risk: `${ind.skills[3]} gap may be too large to close internally within 6 months`, probability: "High", impact: "High", mitigation: "Consider hybrid Build + Borrow strategy", status: "Open" },
    { id: "R2", source: "Manager Capability", risk: "15% of managers scored below 2.5 — flight risk during transformation", probability: "Medium", impact: "High", mitigation: "Immediate engagement with executive coach", status: "Open" },
    { id: "R3", source: "Change Readiness", risk: "28% of workforce in High Risk quadrant — could slow adoption", probability: "High", impact: "Medium", mitigation: "Deploy change champions at 1:5 ratio", status: "Open" },
    { id: "R4", source: "Headcount", risk: "Natural attrition may not absorb all role eliminations", probability: "Medium", impact: "Medium", mitigation: "Phase transitions over 18 months to allow attrition absorption", status: "Open" },
    { id: "R5", source: "Technology", risk: "Legacy system integration may delay AI deployment by 3-6 months", probability: "Medium", impact: "High", mitigation: "Run parallel systems with phased migration", status: "Open" },
    { id: "R6", source: "Regulatory", risk: `${industry === "healthcare" ? "HIPAA" : industry === "financial_services" ? "SEC/FINRA" : industry === "aerospace" ? "ITAR/DoD" : "Industry"} compliance requirements may restrict AI use cases`, probability: "Medium", impact: "High", mitigation: "Engage legal team early; build compliance into AI governance framework", status: "Open" },
    { id: "R7", source: "Data Quality", risk: "Incomplete or inconsistent data across departments could undermine AI model accuracy", probability: "High", impact: "Medium", mitigation: "Implement data quality framework in Wave 1", status: "Open" },
  ]));

  localStorage.setItem(`${projectId}_isTutorial`, JSON.stringify(false));

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
  technology: { small: { name: "Palantir Technologies", employees: 3800, ticker: "PLTR" }, mid: { name: "ServiceNow", employees: 12000, ticker: "NOW" }, large: { name: "Adobe", employees: 30000, ticker: "ADBE" } },
  financial_services: { small: { name: "Evercore", employees: 2200, ticker: "EVR" }, mid: { name: "Raymond James", employees: 16000, ticker: "RJF" }, large: { name: "Goldman Sachs", employees: 35000, ticker: "GS" } },
  healthcare: { small: { name: "Hims & Hers Health", employees: 1500, ticker: "HIMS" }, mid: { name: "Molina Healthcare", employees: 14000, ticker: "MOH" }, large: { name: "Elevance Health", employees: 32000, ticker: "ELV" } },
  retail: { small: { name: "Five Below", employees: 4500, ticker: "FIVE" }, mid: { name: "Williams-Sonoma", employees: 10000, ticker: "WSM" }, large: { name: "Target", employees: 35000, ticker: "TGT" } },
  manufacturing: { small: { name: "Axon Enterprise", employees: 4000, ticker: "AXON" }, mid: { name: "Parker Hannifin", employees: 13000, ticker: "PH" }, large: { name: "Honeywell", employees: 28000, ticker: "HON" } },
  consulting: { small: { name: "Huron Consulting", employees: 2500, ticker: "HURN" }, mid: { name: "Booz Allen Hamilton", employees: 15000, ticker: "BAH" }, large: { name: "Accenture", employees: 35000, ticker: "ACN" } },
  energy: { small: { name: "Shoals Technologies", employees: 1800, ticker: "SHLS" }, mid: { name: "Chesapeake Energy", employees: 8000, ticker: "CHK" }, large: { name: "Baker Hughes", employees: 25000, ticker: "BKR" } },
  aerospace: { small: { name: "Kratos Defense", employees: 4000, ticker: "KTOS" }, mid: { name: "L3Harris Technologies", employees: 17000, ticker: "LHX" }, large: { name: "Northrop Grumman", employees: 33000, ticker: "NOC" } },
};

function getTutorialCompany(projectId: string): { name: string; employees: number; industry: string; size: string } {
  const parts = projectId.replace("tutorial_", "").split("_");
  const size = parts[0] || "mid";
  const industry = parts.slice(1).join("_") || "technology";
  const co = TUTORIAL_COMPANIES[industry]?.[size] || TUTORIAL_COMPANIES.technology.mid;
  return { ...co, industry, size };
}

type TutorialStep = { page: string; icon: string; title: string; body: string; tip?: string; subtitle?: string };

function buildTutorialSteps(projectId: string): TutorialStep[] {
  const co = getTutorialCompany(projectId);
  const n = co.employees;
  const nm = co.name;

  return [
  { page: "home", icon: "👋", title: "Welcome to the Digital Playground", subtitle: "Getting Started",
    body: `Welcome to the AI Transformation Platform — your command center for workforce transformation. This guided tour will walk you through every module, showing you how to understand your organization, design its future, simulate the impact, and build the plan to make it happen. You're exploring ${nm}, a ${co.industry.replace(/_/g, " ")} organization with ${n.toLocaleString()} employees. Each step explains one capability. Take your time — you can always come back to this tour from the Tutorial badge.`,
    tip: "Complete the Discover phase first. Everything downstream depends on understanding your current state." },

  { page: "home", icon: "🗺️", title: "The Transformation Journey", subtitle: "Navigation",
    body: `The platform follows a proven 5-phase methodology: Discover → Diagnose → Design → Simulate → Mobilize. You can work through these in order or jump to any module. The journey map shows your progress — completed phases light up, and the platform suggests what to do next. Think of it as your GPS for transformation. Use the sidebar to navigate, the Command Palette (⌘K) to search anything, and the AI Co-Pilot for real-time guidance.`,
    tip: "In a real engagement, Discover and Diagnose take 2-3 weeks. Design takes 4-6 weeks. Simulate and Mobilize overlap." },

  { page: "home", icon: "📊", title: "Your Data — The Foundation", subtitle: "Data Intake",
    body: `Everything in this platform runs on your workforce data. Upload your employee data using Smart Import — it auto-maps columns from Workday, SAP, Oracle, or any custom format, validates quality, and flags issues. For sandbox companies like ${nm}, data is pre-loaded. The sidebar shows your active project, model, and global filters. Changing a filter here updates EVERY module instantly.`,
    tip: "Data quality determines output quality. Spend time validating before analysis — garbage in, garbage out." },

  { page: "snapshot", icon: "🔍", title: "Workforce Snapshot — Your Starting Point", subtitle: "Phase 1: Discover",
    body: `The Workforce Snapshot gives you the big picture: total headcount, roles, functions, span of control, management layers, and AI readiness score. This is the first slide in any transformation presentation. The Upload Intelligence panel auto-generates observations about your data — use these as conversation starters with leadership. Click any KPI to drill deeper.`,
    tip: "If span of control is above 8 or below 4, flag it immediately. Both create management problems." },

  { page: "dashboard", icon: "📈", title: "Transformation Dashboard — Your Scoreboard", subtitle: "Phase 1: Discover",
    body: `The Transformation Dashboard aggregates metrics across all three horizons: Discover (where you are), Design (what you've planned), and Deliver (execution status). Every number is clickable — click to see where it comes from. Numbers show '—' until you've completed the relevant module. This dashboard is designed to be screenshot-ready for steering committee meetings.`,
    tip: "Don't present this dashboard until at least the Discover phase is complete. Blank metrics undermine credibility." },

  { page: "skillshift", icon: "🎯", title: "Skill Shift Index — What's Changing", subtitle: "Phase 1: Discover",
    body: `The Skill Shift Index shows which skills are declining (being automated), which are amplified (growing in importance), and which are net-new (didn't exist before). This is critical for reskilling planning — it tells you where to invest in people development. The visualization groups skills by category so you can see patterns: technical skills shifting fastest, leadership skills staying stable.`,
    tip: "Share this with L&D teams early. Reskilling programs take 6-12 months to design and launch." },

  { page: "orghealth", icon: "🏥", title: "Org Health Scorecard — Structural Fitness", subtitle: "Phase 2: Diagnose",
    body: `The Org Health Scorecard evaluates your organization across 6 dimensions: span of control, management layers, AI readiness, high-impact roles, management ratio, and unique roles. Each metric is benchmarked against your industry. Green means healthy, amber needs attention, red is critical. The radar chart at the bottom compares you against industry average and best-in-class.`,
    tip: "The most common issue we see is too many management layers. Every unnecessary layer adds decision latency and cost." },

  { page: "heatmap", icon: "🔥", title: "AI Impact Heatmap — Where AI Hits Hardest", subtitle: "Phase 2: Diagnose",
    body: `The AI Impact Heatmap shows which functions and roles have the highest automation and augmentation potential. Darker cells mean higher impact. Click any cell to drill into the specific tasks affected. This is the most frequently requested slide in AI transformation presentations — it answers 'which parts of our org are most affected?'`,
    tip: "High AI impact doesn't mean job loss. Most roles shift from execution to oversight. Frame it as 'role evolution' not 'role elimination.'" },

  { page: "changeready", icon: "🔄", title: "Change Readiness — Is Your Org Ready?", subtitle: "Phase 2: Diagnose",
    body: `Change Readiness segments your workforce into readiness archetypes: Champions (eager early adopters), Early Adopters, Pragmatists (need proof), Skeptics (need support), and Resistors (need intensive intervention). Each group requires a different engagement strategy. The assessment also feeds into the ADKAR analysis in the Mobilize phase.`,
    tip: "You only need 15-20% Champions to reach critical mass. Focus on activating them as change agents, not converting Resistors." },

  { page: "jobs", icon: "🏗️", title: "Job Architecture — Your Organizational Blueprint", subtitle: "Phase 2: Diagnose",
    body: `Job Architecture is the structural framework of your organization: functions, job family groups, job families, sub-families, career tracks, and levels. Browse the Job Catalogue to explore roles. Use the Org Chart for visual hierarchy. Run Validation to auto-detect structural issues like orphaned roles, inconsistent leveling, or title inflation. The Job Profiles tab lets you generate AI-powered job descriptions.`,
    tip: "A healthy JA has 8-15 job families, consistent leveling across families, and clear IC-to-Manager career forks." },

  { page: "scan", icon: "🔬", title: "AI Opportunity Scan — Finding the Gold", subtitle: "Phase 2: Diagnose",
    body: `The AI Opportunity Scan scores every task in your organization for AI impact — automation potential, augmentation potential, and human-essential classification. It identifies quick wins (high impact, low effort), strategic bets (high impact, high effort), and tasks to leave alone. The scored task table is the input for the Work Design Lab.`,
    tip: "Start with the 'quick wins' quadrant. These build momentum and prove value before tackling complex redesigns." },

  { page: "design", icon: "🛠️", title: "Work Design Lab — Redesigning How Work Gets Done", subtitle: "Phase 3: Design",
    body: `The Work Design Lab is the platform's core differentiator. Select a job, then walk through a guided process: Context → Task Deconstruction → Work Options Analysis → Role Reconstruction → Skills Impact → Redeployment Planning → Impact Summary. For each task, you decide: automate, augment with AI, move to shared services, outsource, or keep. The reconstructed role shows what the job looks like after redesign.`,
    tip: "The Mercer methodology starts with the WORK, not the ORG CHART. Understand tasks first, then redesign roles around them." },

  { page: "opmodel", icon: "🧬", title: "Operating Model Lab — How Value Gets Delivered", subtitle: "Phase 3: Design",
    body: `The Operating Model Lab is your most comprehensive design tool. It covers: Strategic Intent (priorities and design principles), Architecture (capabilities, processes, service delivery, technology, governance), People & Organization (culture, structure, workforce model), and Execution (financials, KPIs, transition planning). The guided step navigator walks you through 14 steps to build a complete Target Operating Model.`,
    tip: "Start with Strategy — design principles constrain all downstream decisions. Don't jump to org structure before defining how value should be delivered." },

  { page: "bbba", icon: "⚖️", title: "BBBA — Build, Buy, Borrow, Automate", subtitle: "Phase 3: Design",
    body: `For every capability gap identified in your transformation, BBBA helps you decide the optimal sourcing strategy: Build (train existing employees), Buy (hire externally), Borrow (use contractors/consultants), or Automate (deploy AI/technology). Each disposition includes cost modeling so you can see the financial impact of your choices.`,
    tip: "Most organizations over-index on 'Buy.' Internal reskilling is 3-5x cheaper than external hiring when you factor in ramp-up time." },

  { page: "build", icon: "📐", title: "Org Design Studio — Reshaping the Structure", subtitle: "Phase 3: Design",
    body: `The Org Design Studio provides analytical views of your organization: span detail, layers analysis, cost modeling, role migration, and department drill-down. Use it to model restructuring scenarios: what if we reduce a layer? What if we widen spans? What if we consolidate functions? Each scenario shows headcount, cost, and structural impact.`,
    tip: "The most impactful restructuring move is usually removing one management layer. It saves cost AND speeds decision-making." },

  { page: "headcount", icon: "📊", title: "Headcount Planning — The Numbers Game", subtitle: "Phase 3: Design",
    body: `Headcount Planning shows a waterfall chart: starting headcount → automated roles → natural attrition → redeployed roles → new roles needed → net ending headcount. This translates your Design decisions into concrete workforce numbers. Green bars are additions, red bars are reductions. The net change bar is what matters for budgeting.`,
    tip: "Always model attrition savings separately. Natural turnover often covers 30-50% of headcount reductions without any layoffs." },

  { page: "simulate", icon: "⚡", title: "Scenario Builder — Testing Your Assumptions", subtitle: "Phase 4: Simulate",
    body: `The Scenario Builder lets you model different transformation approaches: Conservative (minimal disruption, lower savings), Balanced (moderate change, moderate return), and Transformative (maximum transformation, highest savings but highest risk). You can also build custom scenarios. Compare scenarios side by side to find the right balance for your organization.`,
    tip: "Always present three scenarios to leadership. It frames the decision as 'which approach' not 'whether to transform.'" },

  { page: "simulate", icon: "💰", title: "ROI Calculator — The Business Case", subtitle: "Phase 4: Simulate",
    body: `The ROI Calculator aggregates all financial impacts: technology investment, reskilling costs, hiring costs, and projected savings from automation, efficiency gains, and headcount optimization. It calculates: total investment, annual savings, payback period, and 3-year NPV. This is the slide that gets the budget approved.`,
    tip: "CFOs trust bottom-up ROI models (built from specific role-level savings) more than top-down estimates." },

  { page: "simulate", icon: "🔀", title: "Capacity Waterfall & Redeployment", subtitle: "Phase 4: Simulate",
    body: `The Capacity Waterfall shows how freed capacity (from automation and redesign) can be redeployed to higher-value work. Instead of eliminating roles, you're redirecting human effort. The Redeployment tab shows where each displaced employee could be placed based on skill adjacency.`,
    tip: "Position redeployment as career growth, not displacement. '40 hours freed for strategic work' is better than '40 hours automated.'" },

  { page: "plan", icon: "📋", title: "Change Planner — Your Transformation Roadmap", subtitle: "Phase 5: Mobilize",
    body: `The Change Planner brings everything together into an executable plan. The Roadmap shows the high-level phases. The Gantt chart details the timeline. Workstreams organize activities by function. The Stakeholder Map identifies who needs to be managed and how. The Risk Register tracks what could go wrong. The Comms Plan ensures everyone hears the right message at the right time.`,
    tip: "The #1 reason transformations fail is not poor design — it's poor change management. Spend as much time on Mobilize as you did on Design." },

  { page: "plan", icon: "👥", title: "Stakeholder Management — Winning Hearts and Minds", subtitle: "Phase 5: Mobilize",
    body: `The Stakeholder Map uses a Power/Interest grid to categorize stakeholders: Manage Closely (high power, high interest), Keep Satisfied (high power, low interest), Keep Informed (low power, high interest), and Monitor. Each stakeholder has an engagement plan and sentiment tracker. The ADKAR tab scores readiness on Awareness, Desire, Knowledge, Ability, and Reinforcement.`,
    tip: "Identify your biggest skeptic with the most power. Convert them early — they become your most credible champion." },

  { page: "plan", icon: "📊", title: "ADKAR — Structured Change Methodology", subtitle: "Phase 5: Mobilize",
    body: `ADKAR scores your stakeholder groups on five dimensions: Awareness, Desire, Knowledge, Ability, Reinforcement. The magic is in the sequence — you can't build Desire before Awareness. The tool identifies the 'barrier point' for each group and generates targeted interventions. If managers score low on Desire, you need to address their fears before training them.`,
    tip: "The barrier point is where you should spend your budget. Training (Knowledge) is useless if people don't want to change (Desire)." },

  { page: "reskill", icon: "🎓", title: "Reskilling Pathways — Developing Your People", subtitle: "Phase 5: Mobilize",
    body: `Reskilling Pathways creates personalized development plans based on the skills gaps identified in your transformation. For each affected employee group: current skills, required skills, gap analysis, recommended training, estimated duration, and cost. This connects directly to the Skills module and BBBA dispositions.`,
    tip: "Make reskilling voluntary first. Employees who self-select into development programs complete them at 3x the rate of those who are mandated." },

  { page: "export", icon: "📤", title: "Export & Deliverables — Client-Ready Outputs", subtitle: "Phase 5: Mobilize",
    body: `The Export module generates three types of deliverables: Excel workbooks (complete data tables), PowerPoint decks (formatted slides with visualizations), and PDF reports (executive summaries). The AI Narrative feature generates a complete written report from your analysis. The Data Story Engine creates a full executive narrative. Everything is formatted and ready to present.`,
    tip: "Export early and often. A weekly 'data pack' keeps stakeholders engaged and prevents end-of-project surprises." },

  { page: "home", icon: "🤖", title: "AI Features — Your AI Co-Pilot", subtitle: "Platform Features",
    body: `AI is embedded throughout the platform. The AI Co-Pilot sidebar proactively suggests insights as you work. The Command Palette (⌘K) searches everything instantly. Auto-suggest generates job profiles, task lists, and skills. The Story Engine creates executive narratives. All AI features use the Claude API with your actual project data — not generic responses.`,
    tip: "Ask the AI Co-Pilot 'what should I do next?' — it knows which modules you've completed and recommends the logical next step." },

  { page: "home", icon: "🏛️", title: "Platform Hub — Your Command Center", subtitle: "Platform Features",
    body: `The Platform Hub contains your account settings, knowledge base (articles and guides for every module), use cases (real-world transformation examples), tutorials, release notes, and feedback form. The Knowledge Base is especially useful — each article is a comprehensive slideshow covering the What, Who, How, When, Where, Why, and examples for every module.`,
    tip: "Read the Knowledge Base article for a module BEFORE using it. It's like reading the manual — saves time and prevents mistakes." },

  { page: "home", icon: "🎯", title: "You're Ready — What's Next", subtitle: "Next Steps",
    body: `You've completed the full platform tour. Here's your recommended next action: if you're using sandbox data, explore 2-3 modules that interest you most. If you're ready with real data, click Smart Import to upload your workforce file. Start with Discover (Workforce Snapshot), then work through Diagnose. The platform will guide you from there. Welcome to the Digital Playground — let's build something transformative.`,
    tip: "The most successful transformations start small. Pick one function, redesign its top 5 roles, prove the value, then scale." },
  ];
}

// Default fallback for non-tutorial contexts
const TUTORIAL_STEPS = buildTutorialSteps("tutorial_mid_technology");

/* ═══ VIEW SELECTOR SCREEN — shown after sandbox company selection, before tutorial ═══ */
function SandboxViewSelector({ companyName, onSelect }: { companyName: string; onSelect: (mode: string) => void }) {
  const [phase, setPhase] = useState<"splash" | "select" | "entering">("splash");
  const selectedViewRef = useRef<string>("");
  const selectedLabelRef = useRef<string>("");
  const views = [
    { id: "org", icon: "🏢", label: "Organization View", desc: "Explore by organizational structure — functions, departments, teams. See aggregate KPIs, cross-cutting analytics, and the full workforce picture." },
    { id: "job_select", icon: "💼", label: "Job Focus", desc: "Explore by job architecture — families, levels, career tracks. Focus on a single role's task portfolio, AI impact, and redesign." },
    { id: "employee_select", icon: "👤", label: "Employee", desc: "Explore by individual employees — skills, roles, career paths. Track a single person through every module." },
    { id: "custom", icon: "⚙️", label: "Custom Slice", desc: "Create a custom view with your own filters. Narrow by function, job family, career level, or sub-family." },
    { id: "consultant", icon: "📋", label: "Consultant Guide", desc: "Guided pathway for external consultants — structured frameworks, deliverable templates, and client-ready analysis." },
    { id: "hr", icon: "👥", label: "HR Professional Guide", desc: "Tailored for HR and People Analytics teams — workforce planning, skills gaps, change readiness, and talent strategy." },
  ];

  // STEP 1: Splash — video bg + company name + static "Click anywhere"
  if (phase === "splash") {
    return <div onClick={() => setPhase("select")} style={{ position: "fixed", inset: 0, zIndex: 60, cursor: "pointer" }}>
      <VideoBackground name="view_bg" overlay={0.4} poster={`${CDN_BASE}/videos/optimized/view_bg-poster.jpg`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 100%)" className="absolute inset-0" />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", WebkitFontSmoothing: "antialiased" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(224,144,64,0.5)", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>Welcome to</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", fontFamily: "'Outfit', sans-serif", marginBottom: 32, textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>{companyName}</h2>
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", fontFamily: "'Outfit', sans-serif" }}>Click anywhere to continue</div>
      </div>
    </div>;
  }

  // STEP 2: View selector overlay — same video bg, 6 options
  // STEP 3: Post-selection splash — show company + view name, click to continue
  if (phase === "entering") {
    return <div onClick={() => selectedViewRef.current && onSelect(selectedViewRef.current)} style={{ position: "fixed", inset: 0, zIndex: 60, cursor: "pointer" }}>
      <VideoBackground name="hero_bg" overlay={0.45} poster={`${CDN_BASE}/hero_bg.png`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 100%)" className="absolute inset-0" />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", WebkitFontSmoothing: "antialiased" }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: "#ffffff", fontFamily: "'Outfit', sans-serif", marginBottom: 12, textShadow: "0 2px 24px rgba(0,0,0,0.5)" }}>{companyName}</h2>
        <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(224,144,64,0.7)", marginBottom: 48, fontFamily: "'Outfit', sans-serif" }}>{selectedLabelRef.current}</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit', sans-serif" }}>Click anywhere to continue →</div>
      </div>
    </div>;
  }

  // STEP 2: View selector overlay — same video bg, 6 options
  return <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "#0B1120" }}>
    <VideoBackground name="view_bg" overlay={0.5} poster={`${CDN_BASE}/videos/optimized/view_bg-poster.jpg`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 100%)" className="absolute inset-0" />
    <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(8,12,24,0.6)" }} />
    <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ maxWidth: 800, width: "100%", padding: "24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", fontFamily: "'Outfit', sans-serif", textShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>Select Your View</div>
          <p style={{ fontSize: 15, color: "rgba(255,220,180,0.4)", marginTop: 6 }}>Every module adapts to your chosen perspective</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {views.map(v => <button key={v.id} onClick={() => { selectedViewRef.current = v.id; selectedLabelRef.current = v.label; setPhase("entering"); }} style={{ padding: "22px", borderRadius: 16, background: "rgba(15,20,35,0.85)", border: "1px solid rgba(255,200,150,0.08)", cursor: "pointer", textAlign: "left", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)", display: "flex", flexDirection: "column", gap: 10 }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,134,10,0.08)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.3)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(212,134,10,0.1)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(15,20,35,0.85)"; e.currentTarget.style.borderColor = "rgba(255,200,150,0.08)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>{v.icon}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,245,235,0.92)", fontFamily: "'Outfit', sans-serif" }}>{v.label}</span>
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,220,190,0.4)", lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
          </button>)}
        </div>
        <p style={{ fontSize: 14, color: "rgba(255,230,200,0.2)", marginTop: 20, textAlign: "center" }}>You can change your view anytime from the sidebar</p>
      </div>
    </div>
  </div>;
}


/* ═══ TUTORIAL — Fullscreen immersive cinematic experience ═══ */

const TUTORIAL_VISUALS: Record<number, string> = { 0: "👋", 1: "🗺️", 2: "📊", 3: "🔍", 4: "📈", 5: "🎯", 6: "🏥", 7: "🔥", 8: "🔄", 9: "🏗️", 10: "🔬", 11: "🛠️", 12: "🧬", 13: "⚖️", 14: "📐", 15: "📊", 16: "⚡", 17: "💰", 18: "🔀", 19: "📋", 20: "👥", 21: "📊", 22: "🎓", 23: "📤", 24: "🤖", 25: "🏛️", 26: "🎯" };

const TUTORIAL_PHASES = [
  { label: "Start", icon: "👋", range: [0, 2], color: "#D4860A" },
  { label: "Discover", icon: "🔍", range: [3, 5], color: "#E8C547" },
  { label: "Diagnose", icon: "🩺", range: [6, 10], color: "#C07030" },
  { label: "Design", icon: "✏️", range: [11, 15], color: "#10B981" },
  { label: "Simulate", icon: "⚡", range: [16, 18], color: "#8B5CF6" },
  { label: "Mobilize", icon: "🚀", range: [19, 23], color: "#F59E0B" },
  { label: "Platform", icon: "🏛️", range: [24, 26], color: "#0891B2" },
];

function TutorialOverlay({ step, totalSteps, steps, onNext, onPrev, onClose, onJump }: {
  step: number; totalSteps: number; steps: TutorialStep[];
  onNext: () => void; onPrev: () => void; onClose: () => void; onJump: (s: number) => void;
}) {
  const s = steps[step];
  if (!s) return null;
  const isLast = step === totalSteps - 1;
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const phase = TUTORIAL_PHASES.find(p => step >= p.range[0] && step <= p.range[1]) || TUTORIAL_PHASES[0];
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back
  const [animKey, setAnimKey] = useState(0);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => { setAnimKey(k => k + 1); }, [step]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { setDir(1); onNext(); }
      if (e.key === "ArrowLeft") { setDir(-1); onPrev(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onNext, onPrev]);

  const handleNext = () => { if (isLast) { setFinishing(true); setTimeout(() => { onClose(); setFinishing(false); }, 2600); } else { setDir(1); onNext(); } };
  const handlePrev = () => { setDir(-1); onPrev(); };

  // Split body into lines for staggered reveal
  const bodyLines = s.body.split(". ").filter(Boolean).map((line, i, arr) => i < arr.length - 1 ? line + "." : line);

  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column" }}>
    {/* Dark overlay — platform visible but dimmed */}
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", transition: "opacity 0.6s", opacity: finishing ? 0 : 1 }} />

    {/* Finishing message */}
    {finishing && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
      <div style={{ fontSize: 28, fontWeight: 300, color: "rgba(255,230,200,0.8)", fontFamily: "'Outfit', sans-serif", textAlign: "center", animation: "fadeIn 0.6s ease", letterSpacing: 0.5 }}>You{"'"}re ready. Build something transformative.</div>
    </div>}

    {/* Main content area */}
    {!finishing && <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 64px 0" }}>
      <div key={animKey} style={{ maxWidth: 900, width: "100%", display: "flex", gap: 48, alignItems: "center", animation: `tutSlideIn${dir > 0 ? "R" : "L"} 0.4s ease-out` }}>
        <style>{`
          @keyframes tutSlideInR { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes tutSlideInL { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes tutLineIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes tutTipIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        `}</style>

        {/* LEFT: Hero visual (40%) */}
        <div style={{ width: "35%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 220, height: 220, borderRadius: 28, background: `radial-gradient(circle at 40% 40%, ${phase.color}20, transparent 70%), rgba(255,255,255,0.02)`, border: `1px solid ${phase.color}20`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 60px ${phase.color}10`, animation: "tutSlideInR 0.5s ease-out" }}>
            <span style={{ fontSize: 80, filter: `drop-shadow(0 4px 20px ${phase.color}30)`, animation: "tutSlideInR 0.6s ease-out" }}>{TUTORIAL_VISUALS[step] || s.icon}</span>
          </div>
        </div>

        {/* RIGHT: Text content (60%) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Step label */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, animation: "tutLineIn 0.3s ease-out" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(212,134,10,0.6)", letterSpacing: 1.5, textTransform: "uppercase" }}>Step {step + 1} of {totalSteps}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: phase.color, background: `${phase.color}18`, padding: "3px 10px", borderRadius: 6, letterSpacing: 0.5 }}>{phase.label}</span>
          </div>

          {/* Title — cinematic entrance */}
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#f5e6d0", fontFamily: "'Outfit', sans-serif", lineHeight: 1.15, margin: "0 0 6px", animation: "tutLineIn 0.4s ease-out" }}>{s.title}</h2>

          {/* Subtitle */}
          {s.subtitle && <div style={{ fontSize: 16, fontWeight: 600, color: phase.color, marginBottom: 20, animation: "tutLineIn 0.5s ease-out", opacity: 0.7 }}>{s.subtitle}</div>}

          {/* Body — line by line staggered reveal */}
          <div style={{ marginBottom: 20 }}>
            {bodyLines.map((line, i) => <span key={i} style={{ display: "inline", fontSize: 17, lineHeight: 1.75, color: "rgba(255,230,200,0.7)", animation: `tutLineIn 0.4s ease-out ${0.3 + i * 0.08}s both` }}>{line}{i < bodyLines.length - 1 ? " " : ""}</span>)}
          </div>

          {/* Pro tip */}
          {s.tip && <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(212,134,10,0.06)", borderLeft: "3px solid rgba(212,134,10,0.4)", animation: `tutTipIn 0.4s ease-out ${0.5 + bodyLines.length * 0.08}s both` }}>
            <span style={{ fontSize: 15, fontStyle: "italic", color: "rgba(255,230,200,0.55)", lineHeight: 1.65 }}>
              <span style={{ fontWeight: 700, color: "#D4860A", fontStyle: "normal" }}>💡 Pro tip: </span>{s.tip}
            </span>
          </div>}
        </div>
      </div>
    </div>}

    {/* Bottom: Progress timeline + controls */}
    {!finishing && <div style={{ position: "relative", zIndex: 1, flexShrink: 0, padding: "0 64px 32px" }}>
      {/* Phase timeline */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 0, marginBottom: 24, height: 50 }}>
        {TUTORIAL_PHASES.map(p => {
          const phaseSteps = p.range[1] - p.range[0] + 1;
          const phaseWidth = (phaseSteps / totalSteps) * 100;
          const inPhase = step >= p.range[0] && step <= p.range[1];
          const completed = step > p.range[1];
          const phasePct = inPhase ? ((step - p.range[0]) / (phaseSteps - 1)) * 100 : completed ? 100 : 0;
          return <div key={p.label} style={{ width: `${phaseWidth}%`, position: "relative" }}>
            {/* Phase label */}
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: inPhase ? p.color : completed ? `${p.color}80` : "rgba(255,255,255,0.15)", textTransform: "uppercase", letterSpacing: 1, transition: "color 0.3s" }}>{p.icon} {p.label}</span>
            </div>
            {/* Track */}
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", position: "relative", marginLeft: 1, marginRight: 1 }}>
              <div style={{ height: "100%", borderRadius: 2, background: p.color, width: `${phasePct}%`, transition: "width 0.5s ease", boxShadow: inPhase ? `0 0 8px ${p.color}40` : "none" }} />
              {/* Current position dot */}
              {inPhase && <div style={{ position: "absolute", top: -4, left: `calc(${phasePct}% - 6px)`, width: 12, height: 12, borderRadius: 6, background: p.color, border: "2px solid rgba(0,0,0,0.5)", boxShadow: `0 0 12px ${p.color}60`, transition: "left 0.5s ease" }} />}
            </div>
          </div>;
        })}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 900, margin: "0 auto" }}>
        <button onClick={handlePrev} disabled={step === 0} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: step === 0 ? "not-allowed" : "pointer", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,230,200,0.5)", opacity: step === 0 ? 0.3 : 1, transition: "all 0.2s" }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14, color: "rgba(255,230,200,0.2)", fontFamily: "'IBM Plex Mono', monospace" }}>{pct}%</span>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, fontSize: 14, cursor: "pointer", background: "none", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,230,200,0.3)", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,230,200,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,230,200,0.3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>Minimize</button>
        </div>
        <button onClick={handleNext} style={{ padding: "10px 28px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", border: "none", color: "#fff", background: isLast ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #E09040, #C07030)", boxShadow: isLast ? "0 4px 16px rgba(16,185,129,0.3)" : "0 4px 16px rgba(224,144,64,0.25)", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>{isLast ? "Finish" : "Next →"}</button>
      </div>
    </div>}
  </div>;
}

/* ═══ TUTORIAL BADGE — Guide re-entry ═══ */
function TutorialBadge({ onClick, step, total }: { onClick: () => void; step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  const isComplete = step >= total - 1;
  return <button onClick={onClick} style={{ position: "fixed", bottom: 56, right: 16, zIndex: 35, padding: "8px 14px", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "rgba(15,12,8,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(212,134,10,0.15)", color: "#E09040", display: "flex", alignItems: "center", gap: 8, boxShadow: "var(--shadow-2)", transition: "all 0.3s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.35)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"; }}>
    <span>{isComplete ? "📖" : "🎓"}</span>
    <span>{isComplete ? "Guide" : "Tutorial"}</span>
    {!isComplete && <><span style={{ fontSize: 13, opacity: 0.5 }}>{pct}%</span><div style={{ width: 28, height: 3, borderRadius: 2, background: "rgba(212,134,10,0.15)", overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "#D4860A", borderRadius: 2 }} /></div></>}
  </button>;
}





/* ═══════════════════════════════════════════════════════════════
   PROJECT HUB — Hero splash + project management
   ═══════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════
   PROJECT HUB
   ═══════════════════════════════════════════════════════════════ */
function ProjectHub({ user, onOpenProject, onStartTutorial, onOpenSandbox, showSandboxPicker, onCloseSandbox }: { user?: authApi.AuthUser; onOpenProject: (p: { id: string; name: string; meta: string }) => void; onStartTutorial?: () => void; onOpenSandbox?: () => void; showSandboxPicker?: boolean; onCloseSandbox?: () => void }) {
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
  const [sandboxOpen, setSandboxOpen] = useState(!!showSandboxPicker);
  const [sandboxPanelOpen, setSandboxPanelOpen] = useState(false);
  const [pendingSandbox, setPendingSandbox] = useState<{ id: string; name: string; meta: string } | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  // Sync parent's showSandboxPicker prop → local sandboxOpen state
  // Show fullscreen background first; user clicks to reveal the grid panel
  useEffect(() => {
    if (showSandboxPicker) {
      setSandboxOpen(true);
      setSandboxPanelOpen(false);
    }
  }, [showSandboxPicker]);

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
    analytics.trackProjectCreated(p.id, newIndustry);
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
      // Map guide modes to org view (they use the same data, just different framing)
      const isGuide = mode === "consultant" || mode === "hr";
      const resolvedViewMode = isGuide ? "org" : mode;
      localStorage.setItem(`${pendingSandbox.id}_viewMode`, JSON.stringify(resolvedViewMode === "custom" ? "custom" : resolvedViewMode));
      // Skip the Home splash screen — user already saw the sandbox splash
      try { sessionStorage.setItem(`${pendingSandbox.id}_splashSeen`, "1"); } catch {}
      // If a guide was selected, flag it so Home auto-opens the guide viewer
      if (isGuide) { try { sessionStorage.setItem(`${pendingSandbox.id}_openGuide`, mode); } catch {} }
      setPendingSandbox(null);
      setSandboxOpen(false);
      setSandboxPanelOpen(false);
      onCloseSandbox?.();
      onOpenProject(pendingSandbox);
    }} />;
  }

  // ── Sandbox full-screen picker ──
  if (sandboxOpen) {
    return <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0B1120" }}>
      {/* Full-bleed storefront background */}
      <VideoBackground name="sandbox_bg" overlay={0.2} poster={`${CDN_BASE}/sandbox_bg.png`} fallbackGradient="linear-gradient(160deg, #0B1120 0%, #1a1a30 40%, #12182a 100%)" className="absolute inset-0" />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: sandboxPanelOpen ? "rgba(8,12,24,0.55)" : "radial-gradient(ellipse at 35% 40%, rgba(8,12,24,0.1) 0%, rgba(8,12,24,0.35) 50%, rgba(8,12,24,0.6) 100%)", transition: "background 0.5s ease" }} />

      {/* Back button */}
      <button onClick={() => { setSandboxOpen(false); setSandboxPanelOpen(false); onCloseSandbox?.(); }} style={{ position: "absolute", top: 24, left: 24, zIndex: 30, padding: "8px 16px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.12)", color: "rgba(255,230,200,0.8)", transition: "all 0.2s" }}>← Back</button>

      {/* Keyframes — outside conditional to avoid re-inject on every render */}
      <style>{`@keyframes sandboxFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } } @keyframes sandboxGlow { 0%, 100% { border-color: rgba(139,92,246,0.2); } 50% { border-color: rgba(139,92,246,0.45); } }`}</style>

      {/* Click-to-open area */}
      {!sandboxPanelOpen && <div key="sandbox-cta" style={{ position: "absolute", inset: 0, zIndex: 10, cursor: "pointer", animation: "sandboxFadeIn 1.2s ease forwards", opacity: 0 }} onClick={() => setSandboxPanelOpen(true)}>
        <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🎓</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,245,235,0.95)", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>Industry Sandbox</div>
          <div style={{ padding: "10px 24px", borderRadius: 16, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(200,180,255,0.8)", fontSize: 14, fontWeight: 600, animation: "sandboxGlow 3s ease-in-out infinite" }}>Click anywhere to explore →</div>
        </div>
      </div>}

      {/* Slide-in panel from right */}
      <div style={{ position: "absolute", zIndex: 20, top: 0, right: 0, bottom: 0, width: sandboxPanelOpen ? "55%" : "0%", overflow: "hidden", transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ width: "100%", height: "100%", background: "rgba(11,17,32,0.96)", backdropFilter: "blur(8px)", borderLeft: "1px solid rgba(139,92,246,0.1)", display: "flex", flexDirection: "column", padding: sandboxPanelOpen ? "32px" : "32px 0", opacity: sandboxPanelOpen ? 1 : 0, transition: "opacity 0.5s ease 0.2s, padding 0.7s ease", overflowY: "auto", WebkitFontSmoothing: "antialiased" as const }}>
          {/* Panel header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(255,245,235,0.95)" }}>🎓 Industry Sandbox</div>
              <div style={{ fontSize: 15, color: "rgba(200,180,255,0.4)", marginTop: 4 }}>24 real companies · 8 industries × 3 market caps · 1,500–35,000 employees</div>
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
                { id: "technology", icon: "💻", label: "Technology", s: "Palantir · 3,800", m: "ServiceNow · 12,000", l: "Adobe · 30,000" },
                { id: "financial_services", icon: "🏦", label: "Financial Svc", s: "Evercore · 2,200", m: "Raymond James · 16,000", l: "Goldman Sachs · 35,000" },
                { id: "healthcare", icon: "🏥", label: "Healthcare", s: "Hims & Hers · 1,500", m: "Molina · 14,000", l: "Elevance · 32,000" },
                { id: "retail", icon: "🛍️", label: "Retail", s: "Five Below · 4,500", m: "Williams-Sonoma · 10,000", l: "Target · 35,000" },
                { id: "manufacturing", icon: "🏭", label: "Manufacturing", s: "Axon · 4,000", m: "Parker Hannifin · 13,000", l: "Honeywell · 28,000" },
                { id: "consulting", icon: "💼", label: "Consulting", s: "Huron · 2,500", m: "Booz Allen · 15,000", l: "Accenture · 35,000" },
                { id: "energy", icon: "⚡", label: "Energy", s: "Shoals Tech · 1,800", m: "Chesapeake · 8,000", l: "Baker Hughes · 25,000" },
                { id: "aerospace", icon: "🚀", label: "Aerospace", s: "Kratos · 4,000", m: "L3Harris · 17,000", l: "Northrop Grumman · 33,000" },
              ].map(ind => <tr key={ind.id}>
                <td style={{ fontSize: 15, color: "rgba(200,180,255,0.7)", padding: "3px 10px", fontWeight: 600 }}><span style={{ marginRight: 6 }}>{ind.icon}</span>{ind.label}</td>
                {[{size: "small", info: ind.s, color: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#6EE7B7"}, {size: "mid", info: ind.m, color: "rgba(212,134,10,0.12)", border: "rgba(212,134,10,0.25)", text: "#E8C547"}, {size: "large", info: ind.l, color: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", text: "#FCA5A5"}].map(t => <td key={t.size} style={{ padding: 2 }}><button disabled={!!seedingId} onClick={async (e) => {
                  e.stopPropagation();
                  const tid = `tutorial_${t.size}_${ind.id}`;
                  setSeedingId(tid);
                  setSandboxError(null);
                  try {
                    const res = await api.apiFetch(`/api/tutorial/seed?industry=${ind.id}&size=${t.size}`);
                    if (!res.ok) throw new Error(`Server returned ${res.status}`);
                  } catch (err) {
                    console.warn("Backend seed failed, continuing with local data:", err);
                  }
                  seedTutorialData(tid, ind.id);
                  setSeedingId(null);
                  const companyName = t.info.split(" · ")[0] || ind.label;
                  analytics.trackSandboxSelected(companyName);
                  setPendingSandbox({ id: tid, name: companyName, meta: `${ind.label} · ${t.size === "small" ? "Small-Cap" : t.size === "mid" ? "Mid-Cap" : "Large-Cap"} · ${t.info.split(" · ")[1] || ""} employees` });
                }} style={{ width: "100%", padding: "7px 8px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: seedingId ? "wait" : "pointer", background: seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.25)" : t.color, border: `1px solid ${seedingId === `tutorial_${t.size}_${ind.id}` ? "rgba(139,92,246,0.5)" : t.border}`, color: t.text, transition: "all 0.2s", textAlign: "center", lineHeight: 1.4, opacity: seedingId && seedingId !== `tutorial_${t.size}_${ind.id}` ? 0.4 : 1 }} onMouseEnter={e => { if (!seedingId) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.borderColor = t.text; }}} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = t.border; }}>{seedingId === `tutorial_${t.size}_${ind.id}` ? "⏳ Loading..." : t.info}</button></td>)}
              </tr>)}</tbody>
            </table>
          </div>

          {/* Error message */}
          {sandboxError && <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FCA5A5" }}>{sandboxError}</div>
          </div>}

          {/* Guided tour note */}
          <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(139,92,246,0.7)", marginBottom: 4 }}>✨ Each sandbox includes:</div>
            <div style={{ fontSize: 15, color: "rgba(200,180,255,0.4)", lineHeight: 1.6 }}>Full employee roster · Task-level work design · Skills inventory · AI readiness scores · Manager capability · Change readiness</div>
          </div>
        </div>
      </div>
    </div>;
  }

  const tutorialCompleted = typeof window !== "undefined" && localStorage.getItem("tutorial_completed") === "true";
  const displayName = user?.display_name || user?.username || "there";
  const INDUSTRIES_PREVIEW = ["💻", "🏦", "🏥", "🛍️", "🏭", "💼", "⚡", "🚀"];

  return <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#0B1120" }}>
    {/* Keyframes */}
    <style>{`
      @keyframes hubFadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes hubShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes hubPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      .hub-card { transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
      .hub-card:hover { transform: perspective(1000px) rotateY(1.5deg) translateY(-6px) !important; }
      .hub-cta { position: relative; overflow: hidden; }
      .hub-cta::after { content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent); transition: left 0.5s ease; }
      .hub-cta:hover::after { left: 120%; }
    `}</style>

    {/* Video background */}
    <VideoBackground name="hero_bg" overlay={0.35} poster={`${CDN_BASE}/hero_bg.png`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 65%, #0a0f1a 100%)" className="absolute inset-0 w-full h-full" />
    {/* Strong bottom gradient for text readability */}
    <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to bottom, rgba(11,17,32,0.2) 0%, rgba(11,17,32,0.35) 25%, rgba(11,17,32,0.6) 55%, rgba(11,17,32,0.88) 80%, rgba(11,17,32,0.97) 100%)", width: "100%", minHeight: "100%" }} />

    {/* Content */}
    <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", flexDirection: "column", padding: "80px 60px 40px", maxWidth: 1200, margin: "0 auto" }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 48, animation: "hubFadeUp 0.6s ease forwards" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#E09040", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>Welcome back, {displayName}</div>
        <h1 style={{ fontSize: 48, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.15, fontFamily: "'Outfit', sans-serif", textShadow: "0 2px 32px rgba(0,0,0,0.4)" }}>Your Projects</h1>
        <p style={{ fontSize: 17, color: "rgba(255,220,180,0.45)", marginTop: 8, fontFamily: "'Outfit', sans-serif", fontWeight: 400 }}>Select a project or create a new one</p>
      </div>

      {/* ── THREE MAIN CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 48 }}>

        {/* TUTORIAL CARD */}
        <div className="hub-card" onClick={() => onStartTutorial?.()} style={{ borderRadius: 24, cursor: "pointer", padding: "32px 28px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(99,102,241,0.2)", position: "relative", overflow: "hidden", animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.1s", opacity: 0 }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)"; e.currentTarget.style.boxShadow = "none"; }}>
          {/* Animated icon */}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.15))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontSize: 26 }}>🧭</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>Platform Tutorial</div>
          <div style={{ fontSize: 14, color: "rgba(165,180,252,0.6)", lineHeight: 1.6, marginBottom: 20 }}>Learn the platform in ~8 minutes — no data needed</div>
          {tutorialCompleted && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(99,102,241,0.15)", overflow: "hidden" }}><div style={{ width: "100%", height: "100%", borderRadius: 2, background: "#6366F1" }} /></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6366F1", fontFamily: "'IBM Plex Mono', monospace" }}>Complete</span>
          </div>}
          <div className="hub-cta" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 100, background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.2))", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{tutorialCompleted ? "Retake Tutorial" : "Start Tutorial"} <span style={{ fontSize: 16 }}>→</span></div>
        </div>

        {/* SANDBOX CARD — visually dominant */}
        <div className="hub-card" onClick={() => { setSandboxOpen(true); setSandboxPanelOpen(false); onOpenSandbox?.(); }} style={{ borderRadius: 24, cursor: "pointer", padding: "32px 28px", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(224,144,64,0.25)", position: "relative", overflow: "hidden", animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.2s", opacity: 0, boxShadow: "0 0 40px rgba(224,144,64,0.06)" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(224,144,64,0.5)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(224,144,64,0.18), inset 0 1px 0 rgba(255,255,255,0.1)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(224,144,64,0.25)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(224,144,64,0.06)"; }}>
          {/* Ambient glow */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(224,144,64,0.12), transparent 70%)", pointerEvents: "none" }} />
          {/* Animated icon */}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(224,144,64,0.25), rgba(249,115,22,0.2))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontSize: 26 }}>🏢</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>Industry Sandbox</div>
          <div style={{ fontSize: 14, color: "rgba(255,200,150,0.55)", lineHeight: 1.6, marginBottom: 16 }}>Explore 24 real companies across 8 industries with full workforce data</div>
          {/* Industry icons preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
            {INDUSTRIES_PREVIEW.map((icon, i) => <div key={i} style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>)}
            <span style={{ fontSize: 12, color: "rgba(255,200,150,0.35)", fontWeight: 600, marginLeft: 4 }}>8 industries</span>
          </div>
          <div className="hub-cta" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 100, background: "linear-gradient(135deg, #E09040, #C07030)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif", boxShadow: "0 4px 20px rgba(224,144,64,0.3)" }}>Explore Companies <span style={{ fontSize: 16 }}>→</span></div>
        </div>

        {/* NEW PROJECT CARD */}
        <div className="hub-card" onClick={() => setModalOpen(true)} style={{ borderRadius: 24, cursor: "pointer", padding: "32px 28px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(20,184,166,0.2)", position: "relative", overflow: "hidden", animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.3s", opacity: 0 }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.45)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(20,184,166,0.12), inset 0 1px 0 rgba(255,255,255,0.08)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.2)"; e.currentTarget.style.boxShadow = "none"; }}>
          {/* Animated icon */}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(20,184,166,0.2), rgba(16,185,129,0.15))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontSize: 26 }}>✦</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>New Project</div>
          <div style={{ fontSize: 14, color: "rgba(153,246,228,0.5)", lineHeight: 1.6, marginBottom: 20 }}>Upload your organization's data and build a custom transformation strategy</div>
          <div className="hub-cta" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 24px", borderRadius: 100, background: "linear-gradient(135deg, rgba(20,184,166,0.25), rgba(16,185,129,0.2))", border: "1px solid rgba(20,184,166,0.3)", color: "#5eead4", fontSize: 14, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>Create Project <span style={{ fontSize: 16 }}>→</span></div>
        </div>
      </div>

      {/* ── RECENT PROJECTS (horizontal scroll) ── */}
      {projects.length > 0 && <div style={{ marginBottom: 48, animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.4s", opacity: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: "'Outfit', sans-serif" }}>Recent Projects</div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 100, background: "rgba(224,144,64,0.12)", color: "#E09040" }}>{projects.length}</span>
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory" }}>
          {projects.map(p => {
            let pStatus = p.status;
            try { const v = localStorage.getItem(`${p.id}_visited`); if (v && Object.keys(JSON.parse(v)).length > 0) pStatus = "In Progress"; } catch {}
            try { const vm = localStorage.getItem(`${p.id}_viewMode`); if (vm) pStatus = "In Progress"; } catch {}
            const statusColor = pStatus === "In Progress" ? "#E09040" : pStatus === "Complete" ? "#10B981" : "rgba(255,200,150,0.25)";
            let modulesVisited = 0;
            try { const v = localStorage.getItem(`${p.id}_visited`); if (v) modulesVisited = Object.keys(JSON.parse(v)).length; } catch {}
            const progressPct = Math.min(100, Math.round((modulesVisited / 8) * 100));

            return <div key={p.id} onClick={() => onOpenProject(p)} style={{ minWidth: 260, maxWidth: 300, flex: "0 0 auto", scrollSnapAlign: "start", borderRadius: 20, cursor: "pointer", padding: "20px 24px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)", position: "relative" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,200,150,0.06)"; e.currentTarget.style.borderColor = "rgba(224,144,64,0.25)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.2)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
              {/* Delete/clone - top right */}
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4, opacity: 0, transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0"}>
                <button onClick={e => { e.stopPropagation(); cloneProject(p); }} style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Clone">⧉</button>
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(p.id); }} style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.5)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">✕</button>
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 6, paddingRight: 50 }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {p.industry && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(224,144,64,0.12)", color: "rgba(232,197,71,0.7)" }}>{p.industry}</span>}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: statusColor }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: 0.5 }}>{pStatus}</span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 2, background: statusColor, transition: "width 0.5s ease" }} />
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>{modulesVisited}/8</span>
              </div>
              {p.created && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 10, fontFamily: "'IBM Plex Mono', monospace" }}>{p.created}</div>}
            </div>;
          })}
        </div>
      </div>}

      {/* ── BOTTOM STATS BAR ── */}
      <div style={{ marginTop: "auto", paddingTop: 32, textAlign: "center", animation: "hubFadeUp 0.6s ease forwards", animationDelay: "0.5s", opacity: 0 }}>
        <div style={{ fontSize: 12, color: "rgba(255,200,150,0.18)", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5 }}>
          24 sandbox companies · 8 industries · 47 music tracks · Built by Hiral Merchant
        </div>
      </div>
    </div>

    {/* Create modal */}
    {modalOpen && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl p-8 w-full max-w-md" style={{ background: "rgba(15,12,8,0.97)", backdropFilter: "blur(32px)", border: "1px solid rgba(255,200,150,0.1)" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>New Transformation Project</h2>
        <p style={{ fontSize: 14, color: "rgba(255,220,180,0.4)", marginBottom: 24 }}>Fill in the details below to set up your workspace</p>
        <div className="space-y-3">
          <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Project Name *</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Acme Corp AI Transformation" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: nameTaken ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "'Outfit', sans-serif" }} autoFocus />
          {nameTaken && <div style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>A project with this name already exists.</div>}</div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Client / Organization</div>
          <input value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="e.g. Acme Corporation" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "'Outfit', sans-serif" }} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Industry</div>
            <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none" }}>
              <option value="">Select industry...</option>
              {["Financial Services","Technology","Healthcare","Manufacturing","Retail","Energy","Media","Professional Services","Public Sector","Other"].map(i => <option key={i} value={i}>{i}</option>)}
            </select></div>
            <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Org Size</div>
            <select value={newSize} onChange={e => setNewSize(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none" }}>
              <option value="">Select size...</option>
              {["< 500 employees","500 - 2,000","2,000 - 10,000","10,000 - 50,000","50,000+"].map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>
          </div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Project Lead</div>
          <input value={newLead} onChange={e => setNewLead(e.target.value)} placeholder="e.g. Jane Smith, VP Transformation" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "'Outfit', sans-serif" }} /></div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,200,150,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Description / Objectives</div>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What are the goals of this transformation?" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#fff", outline: "none", fontFamily: "'Outfit', sans-serif", resize: "none" }} rows={3} /></div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={() => { setModalOpen(false); setNewName(""); setNewDesc(""); setNewClient(""); setNewIndustry(""); setNewSize(""); setNewLead(""); }} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "rgba(255,200,150,0.5)", border: "1px solid rgba(255,255,255,0.08)", background: "none", cursor: "pointer" }}>Cancel</button>
          <button onClick={createProject} disabled={!newName.trim() || nameTaken} style={{ padding: "10px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", border: "none", background: "linear-gradient(135deg, #E09040, #C07030)", cursor: !newName.trim() || nameTaken ? "not-allowed" : "pointer", opacity: !newName.trim() || nameTaken ? 0.4 : 1, boxShadow: "0 4px 16px rgba(224,144,64,0.25)" }}>Create Project</button>
        </div>
      </div>
    </div>}

    {/* Delete confirmation */}
    {confirmDelete && <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setConfirmDelete(null)}>
      <div style={{ borderRadius: 20, padding: 32, width: "100%", maxWidth: 380, textAlign: "center", background: "rgba(15,12,8,0.97)", backdropFilter: "blur(32px)", border: "1px solid rgba(239,68,68,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>Delete Project?</h3>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Are you sure you want to delete <strong style={{ color: "#fff" }}>{projects.find(p => p.id === confirmDelete)?.name || "this project"}</strong>?</p>
        <p style={{ fontSize: 13, color: "#f87171", marginBottom: 24 }}>This cannot be undone.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => setConfirmDelete(null)} style={{ padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "rgba(255,200,150,0.5)", border: "1px solid rgba(255,255,255,0.08)", background: "none", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => deleteProject(confirmDelete)} style={{ padding: "10px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#fff", border: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", cursor: "pointer" }}>Delete</button>
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
      const u = d.user as authApi.AuthUser;
      analytics.identifyUser(u.id, { username: u.username, display_name: u.display_name });
      analytics.trackLogin(u.id);
      onAuth(u);
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
      const regUser = d.user as authApi.AuthUser;
      analytics.identifyUser(regUser.id, { username: regUser.username, display_name: regUser.display_name, email: cleanEmail });
      analytics.trackSignup(regUser.id, "email");
      analytics.trackFunnelStep("signed_up");
      setSuccessUser(regUser);
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
        <VideoBackground name="login_bg" overlay={0.5} poster={`${CDN_BASE}/login_bg.png`} fallbackGradient="linear-gradient(135deg, #1a1208 0%, #2a1a0a 30%, #0f0d08 70%, #1a1510 100%)" className="absolute inset-0" />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse at center, rgba(10,8,5,0.3) 0%, rgba(10,8,5,0.75) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 420, padding: "0 24px", textAlign: "center" }}>
          <div style={{ background: "rgba(15,12,8,0.7)", backdropFilter: "blur(30px)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", padding: "40px 32px", boxShadow: "var(--shadow-4)" }}>
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
      <VideoBackground name="login_bg" overlay={0.5} poster={`${CDN_BASE}/login_bg.png`} fallbackGradient="linear-gradient(135deg, #1a1208 0%, #2a1a0a 30%, #0f0d08 70%, #1a1510 100%)" className="absolute inset-0" />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse at center, rgba(10,8,5,0.25) 0%, rgba(10,8,5,0.7) 100%)" }} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 400, padding: "0 24px" }}>
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

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 15, marginTop: 20, fontFamily: "'IBM Plex Mono', monospace", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>Secure authentication {"\u00B7"} Your data stays private</p>
        <div style={{ textAlign: "center", marginTop: 12, display: "flex", justifyContent: "center", gap: 16 }}>
          <a href="/privacy" style={{ fontSize: 13, color: "rgba(255,200,150,0.25)", textDecoration: "none", fontFamily: "'IBM Plex Mono', monospace" }}>Privacy Policy</a>
          <a href="/terms" style={{ fontSize: 13, color: "rgba(255,200,150,0.25)", textDecoration: "none", fontFamily: "'IBM Plex Mono', monospace" }}>Terms of Service</a>
        </div>
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSandboxPicker, setShowSandboxPicker] = useState(false);

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
        if (u) { setUser(u); analytics.identifyUser(u.id, { username: u.username, display_name: u.display_name }); } else { authApi.clearToken(); }
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
  if (!user) return <AuthGate onAuth={(u) => { sessionStorage.setItem("fresh_login", "1"); localStorage.removeItem("hub_active"); setActiveProject(null); setUser(u); }} />;
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

  // Tutorial overlay (standalone, no data needed)
  if (showTutorial) return <Tutorial onClose={() => { setShowTutorial(false); setShowSandboxPicker(false); }} onGoToSandbox={() => { setShowTutorial(false); setShowSandboxPicker(true); }} onGoToNewProject={() => { setShowTutorial(false); setShowSandboxPicker(false); }} />;

  const appContent = !activeProject
    ? <>{hubAccountBar}{profileModal}<ProjectHub user={user} onOpenProject={setActiveProject} onStartTutorial={() => setShowTutorial(true)} onOpenSandbox={() => setShowSandboxPicker(true)} showSandboxPicker={showSandboxPicker} onCloseSandbox={() => setShowSandboxPicker(false)} /></>
    : <>{profileModal}<Home key={activeProject.id} projectId={activeProject.id} projectName={activeProject.name} projectMeta={activeProject.meta} onBackToHub={() => setActiveProject(null)} user={user} onShowProfile={() => setShowProfile(true)} onShowPlatformHub={() => setShowPlatformHub(true)} /></>;
  return <>{appContent}<MusicPlayer projectActive={!!activeProject} /></>;
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
    <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px 24px", boxShadow: "var(--shadow-4)" }}>
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
