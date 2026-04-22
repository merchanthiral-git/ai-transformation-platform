"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CDN_BASE } from "../../../lib/cdn";

/* ═══════════════════════════════════════════════════════════════
   CSS AUDIO ORB VISUALIZER — replaces Three.js to avoid WebGL
   context-lost errors and deprecated THREE.Clock warnings.
   ═══════════════════════════════════════════════════════════════ */

export function OrbScene({ amplitude, bassEnergy }: { freqData: Uint8Array; bassEnergy: number; midEnergy: number; highEnergy: number; amplitude: number }) {
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

export const GENRES: Genre[] = [
  { id: "chill", label: "Chill Lo-Fi", icon: "🌙" },
  { id: "focus", label: "Deep Focus", icon: "🎯" },
  { id: "ambient", label: "Ambient", icon: "🌊" },
  { id: "jazz", label: "Jazz", icon: "🎷" },
  { id: "electronic", label: "Electronic", icon: "⚡" },
];

export const ALL_TRACKS: Track[] = [
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
export const MOODS = [
  { id: "focus", label: "Deep Focus", icon: "🧘", genres: ["ambient", "focus"], energy: [1, 2, 3] },
  { id: "energy", label: "High Energy", icon: "⚡", genres: ["electronic", "jazz"], energy: [4, 5] },
  { id: "night", label: "Late Night", icon: "🌙", genres: ["chill", "ambient"], energy: [1, 2] },
  { id: "coffee", label: "Coffee Shop", icon: "☕", genres: ["jazz", "chill"], energy: [2, 3] },
  { id: "present", label: "Presentation", icon: "🎯", genres: ["ambient", "focus"], energy: [1, 2] },
  { id: "surprise", label: "Surprise Me", icon: "🔀", genres: [], energy: [] },
];

export function MusicPlayer({ projectActive = false }: { projectActive?: boolean }) {
  const ACID_JAZZ_II_IDX = useMemo(() => {
    const jazzTracks = ALL_TRACKS.filter(t => t.genre === "jazz");
    return jazzTracks.findIndex(t => t.name === "Acid Jazz II");
  }, []);
  const [genre, setGenre] = useState("jazz");
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(() => { try { const saved = localStorage.getItem("music_track"); return saved ? Number(saved) : ACID_JAZZ_II_IDX; } catch (e) { console.error("[Storage]", e); return ACID_JAZZ_II_IDX; } });
  const [volume, setVolume] = useState(() => { try { return Number(localStorage.getItem("music_vol") || "0.5"); } catch (e) { console.error("[Storage]", e); return 0.5; } });
  const [viewState, setViewState] = useState<"prompt" | "mini" | "collapsed" | "expanded">(() => { try { return localStorage.getItem("music_prompted") ? "mini" : "prompt"; } catch (e) { console.error("[Storage]", e); return "prompt"; } });
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
  const [favorites, setFavorites] = useState<Set<number>>(() => { try { const s = localStorage.getItem("music_favs"); return s ? new Set(JSON.parse(s)) : new Set(); } catch (e) { console.error("[Storage]", e); return new Set(); } });
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
    } catch (e) { console.error("[Storage]", e); }
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
      // Ignore errors when no real audio src has been set (src defaults to page URL)
      if (!audio.src || !audio.src.includes("/audio/")) return;
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
            gradient.addColorStop(1, `rgba(244,168,58,${0.6 + val / 400})`);
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
            ctx2d.fillStyle = `rgba(244,168,58,${0.4 + val / 400})`;
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
  useEffect(() => { try { localStorage.setItem("music_favs", JSON.stringify([...favorites])); } catch (e) { console.error("[Storage]", e); } }, [favorites]);
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
    try { localStorage.setItem("music_track", String(idx)); } catch (e) { console.error("[Storage]", e); }
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
      try { localStorage.setItem("music_track", String(idxInGenre >= 0 ? idxInGenre : 0)); } catch (e) { console.error("[Storage]", e); }
    } else {
      const idxInGenre = genreTracks.findIndex(t => t.id === picked.id);
      changeTrack(idxInGenre >= 0 ? idxInGenre : 0);
    }
    setHasPlayedFirst(true);
  }, [genre, genreTracks, changeTrack, playTrack]);

  const nextTrack = () => { if (shuffle) { shuffleAny(); return; } const gt = genreTracks; changeTrack((trackIdx + 1) % gt.length); };
  const prevTrack = () => { if (shuffle) { shuffleAny(); return; } const gt = genreTracks; changeTrack((trackIdx - 1 + gt.length) % gt.length); };
  const changeVolume = (v: number) => { setVolume(v); volumeRef.current = v; if (audioRef.current) { audioRef.current.volume = v; audioRef.current.muted = false; } try { localStorage.setItem("music_vol", String(v)); } catch (e) { console.error("[Storage]", e); } };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); if (audioRef.current?.duration) audioRef.current.currentTime = pct * audioRef.current.duration; };

  const btnBase: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" };
  const expandedRef = useRef<HTMLDivElement>(null);

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
  if (viewState === "prompt") return <>
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
        try { localStorage.setItem("music_prompted", "1"); } catch (e) { console.error("[Storage]", e); }
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
        color: "var(--ink)", cursor: "pointer",
        animation: promptDismissing ? "none" : "soundtrackGlow 3s ease-in-out infinite, soundtrackFadeIn 0.8s ease-out",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
        opacity: promptDismissing ? 0 : 1,
        transform: promptDismissing ? "scale(0.8)" : (promptHovered ? "scale(1.03)" : "scale(1)"),
        fontFamily: "'Inter Tight', sans-serif",
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
  if (viewState === "mini") return <>
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
            <span style={{ display: "inline-block", width: 3, height: 8, borderRadius: 1.5, background: "var(--accent-primary)", animation: "barPulse1 0.8s ease-in-out infinite" }} />
            <span style={{ display: "inline-block", width: 3, height: 12, borderRadius: 1.5, background: "var(--accent-primary)", animation: "barPulse2 0.7s ease-in-out infinite 0.15s" }} />
            <span style={{ display: "inline-block", width: 3, height: 6, borderRadius: 1.5, background: "var(--accent-primary)", animation: "barPulse3 0.9s ease-in-out infinite 0.3s" }} />
          </>
        ) : (
          /* Muted icon */
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>♪</span>
        )}
        {/* Tooltip */}
        {!playing && <span data-tooltip style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, fontSize: 11, fontWeight: 600, color: "var(--ink)", background: "rgba(15,12,8,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(224,144,64,0.15)", padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap", opacity: 0, transition: "opacity 0.2s", pointerEvents: "none", fontFamily: "'Inter Tight', sans-serif" }}>Bring it back</span>}
      </button>
      {/* Expand to full player */}
      <button onClick={() => setViewState("collapsed")} style={{ marginTop: 4, width: 20, height: 20, borderRadius: 10, background: "transparent", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 11, cursor: "pointer", transition: "color 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"} title="Expand player">▲</button>
    </div>
  </>;


  // ── Collapsed state: slim bar with mini visualizer ──
  if (viewState === "collapsed") return <div onClick={() => setViewState("expanded")} style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, height: 44, background: "rgba(15,12,8,0.85)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(244,168,58,0.1)", display: "flex", alignItems: "center", paddingLeft: 12, paddingRight: 12, gap: 10, cursor: "pointer" }}>
    {/* Mini visualizer */}
    <canvas ref={miniCanvasRef} width={60} height={24} style={{ width: 60, height: 24, flexShrink: 0, borderRadius: 4 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: audioError ? "var(--coral)" : "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{audioError || (buffering ? `Loading ${track?.name || ""}...` : track?.name || "—")}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{audioError ? "Click play to retry" : activeMood ? `${MOODS.find(m => m.id === activeMood)?.icon} ${MOODS.find(m => m.id === activeMood)?.label}` : GENRES.find(g => g.id === genre)?.label}{!audioError && focusActive ? ` · ${Math.floor(focusRemaining / 60)}:${String(focusRemaining % 60).padStart(2, "0")}` : ""}</div>
    </div>
    <div onClick={e => { e.stopPropagation(); seek(e); }} style={{ width: 80, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, cursor: "pointer", flexShrink: 0, overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 2, background: "var(--accent-primary)", width: `${progress * 100}%` }} />
    </div>
    <button onClick={e => { e.stopPropagation(); toggle(); }} style={{ ...btnBase, color: "var(--ink)", fontSize: 16, width: 32, height: 32 }}>{playing ? "⏸" : "▶"}</button>
    <button onClick={e => { e.stopPropagation(); nextTrack(); }} style={{ ...btnBase, color: "rgba(255,255,255,0.4)", fontSize: 15 }}>⏭</button>
    <button onClick={e => { e.stopPropagation(); changeVolume(volume > 0 ? 0 : 0.5); }} style={{ ...btnBase, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{volume === 0 ? "🔇" : "🔊"}</button>
    <input type="range" min={0} max={1} step={0.02} value={volume} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); changeVolume(Number(e.target.value)); }} style={{ width: 50, accentColor: "var(--accent-primary)", height: 3, flexShrink: 0 }} />
    <button onClick={e => { e.stopPropagation(); setViewState("mini"); }} style={{ ...btnBase, color: "rgba(255,255,255,0.25)", fontSize: 14 }} title="Hide player">✕</button>
  </div>;

  // ── Expanded state: full player panel ──
  return <>{null}<div ref={expandedRef} style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "rgba(10,8,6,0.92)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(244,168,58,0.12)", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
    {/* Visible collapse/close buttons at top-right of panel */}
    <div style={{ position: "absolute", top: 10, right: 16, display: "flex", gap: 6, zIndex: 1 }}>
      <button onClick={() => setViewState("collapsed")} title="Minimize to bar" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "var(--ink)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>▾</button>
      <button onClick={() => setViewState("mini")} title="Hide player" style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "var(--ink)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>✕</button>
    </div>

    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 24px 20px" }}>
      {/* Top row: visualizer + info + controls */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
        {/* 3D Audio Orb Visualizer */}
        <div style={{ width: 80, height: 80, borderRadius: 16, overflow: "hidden", flexShrink: 0, background: "radial-gradient(circle, rgba(244,168,58,0.08), rgba(0,0,0,0.3))", boxShadow: `0 4px 20px rgba(244,168,58,${0.1 + amplitude * 0.2})`, position: "relative", cursor: "pointer" }} onClick={() => setImmersive(true)} title="Enter Immersive Mode">
          <OrbScene freqData={freqDataRef.current} bassEnergy={bassEnergy} midEnergy={midEnergy} highEnergy={highEnergy} amplitude={amplitude} />
          {focusActive && <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", borderRadius: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--warning)", fontFamily: "monospace" }}>{Math.floor(focusRemaining / 60)}:{String(focusRemaining % 60).padStart(2, "0")}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Focus</div>
          </div>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: audioError ? "var(--coral)" : "var(--ink)", fontFamily: "'Inter Tight', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{audioError || (buffering ? `Loading ${track?.name || ""}...` : track?.name || "—")}</div>
            {!audioError && <button onClick={() => track && toggleFav(track.id)} style={{ ...btnBase, fontSize: 14, color: track && favorites.has(track.id) ? "var(--risk)" : "rgba(255,255,255,0.2)" }}>{track && favorites.has(track.id) ? "♥" : "♡"}</button>}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {audioError ? "Click play to retry" : <>{activeMood ? <span style={{ color: "rgba(244,168,58,0.7)" }}>{MOODS.find(m => m.id === activeMood)?.icon} {MOODS.find(m => m.id === activeMood)?.label} · </span> : ""}{GENRES.find(g => g.id === genre)?.icon} {GENRES.find(g => g.id === genre)?.label} · {(trackIdx % genreTracks.length) + 1}/{genreTracks.length}</>}
          </div>
        </div>

        {/* Main controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setShuffle(!shuffle)} style={{ ...btnBase, color: shuffle ? "var(--accent-primary)" : "rgba(255,255,255,0.25)", fontSize: 14 }} title="Shuffle">⇄</button>
          <button onClick={prevTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.5)", fontSize: 15 }}>⏮</button>
          <button onClick={toggle} style={{ width: 44, height: 44, borderRadius: 22, background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", border: "none", color: "#fff", fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(224,144,64,0.3)", transition: "transform 0.15s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>{playing ? "⏸" : "▶"}</button>
          <button onClick={nextTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.5)", fontSize: 15 }}>⏭</button>
          <button onClick={() => setRepeat(!repeat)} style={{ ...btnBase, color: repeat ? "var(--accent-primary)" : "rgba(255,255,255,0.25)", fontSize: 14 }} title="Repeat">↻</button>
        </div>

        {/* Volume */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, width: 100, flexShrink: 0 }}>
          <button onClick={() => changeVolume(volume > 0 ? 0 : 0.5)} style={{ ...btnBase, fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{volume === 0 ? "🔇" : volume < 0.3 ? "🔈" : "🔊"}</button>
          <input type="range" min={0} max={1} step={0.02} value={volume} onChange={e => changeVolume(Number(e.target.value))} style={{ flex: 1, accentColor: "var(--accent-primary)", height: 3 }} />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", width: 32, textAlign: "right" }}>{fmt(currentTime)}</span>
        <div onClick={seek} style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, cursor: "pointer", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--accent-primary), var(--warning))", width: `${progress * 100}%`, transition: "width 0.1s linear" }} />
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", width: 32 }}>{fmt(duration)}</span>
      </div>

      {/* Mood pills + Focus timer */}
      <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        {MOODS.map(m => <button key={m.id} onClick={() => selectMood(m.id)} style={{ padding: "3px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: activeMood === m.id ? "1px solid rgba(244,168,58,0.4)" : "1px solid rgba(255,255,255,0.06)", background: activeMood === m.id ? "rgba(244,168,58,0.12)" : "transparent", color: activeMood === m.id ? "var(--accent-primary)" : "rgba(255,255,255,0.3)", transition: "all 0.2s", fontFamily: "'Inter Tight', sans-serif" }}>{m.icon} {m.label}</button>)}
        <div style={{ flex: 1 }} />
        {/* Focus timer button */}
        {!focusActive ? <div style={{ display: "flex", gap: 3 }}>
          {[25, 45, 60].map(mins => <button key={mins} onClick={() => startFocus(mins)} style={{ ...btnBase, fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }} title={`${mins}min focus session`}>🎯 {mins}m</button>)}
        </div> : <button onClick={() => { setFocusActive(false); setFocusRemaining(0); }} style={{ ...btnBase, fontSize: 12, color: "var(--warning)", padding: "2px 10px", borderRadius: 6, border: "1px solid rgba(232,197,71,0.2)" }}>🎯 End Focus ({Math.floor(focusRemaining / 60)}:{String(focusRemaining % 60).padStart(2, "0")})</button>}
        <button onClick={() => setImmersive(true)} style={{ ...btnBase, fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }} title="Fullscreen visualizer">🌌 Immersive</button>
      </div>

      {/* Genre pills + track list */}
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        {GENRES.map(g => <button key={g.id} onClick={() => { setGenre(g.id); setTrackIdx(0); setActiveMood(null); }}
          style={{ padding: "3px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: genre === g.id && !activeMood ? "1px solid rgba(244,168,58,0.4)" : "1px solid rgba(255,255,255,0.06)", background: genre === g.id && !activeMood ? "rgba(244,168,58,0.12)" : "transparent", color: genre === g.id && !activeMood ? "var(--accent-primary)" : "rgba(255,255,255,0.3)", transition: "all 0.2s", fontFamily: "'Inter Tight', sans-serif" }}>{g.icon} {g.label}</button>)}
        {favorites.size > 0 && <button onClick={() => { const favTracks = ALL_TRACKS.filter(t => favorites.has(t.id)); if (favTracks.length) { const picked = favTracks[0]; setGenre(picked.genre); const gt = ALL_TRACKS.filter(t => t.genre === picked.genre); setTrackIdx(gt.findIndex(t => t.id === picked.id)); setActiveMood(null); } }} style={{ padding: "3px 10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid rgba(232,122,93,0.15)", background: "transparent", color: "rgba(232,122,93,0.5)", fontFamily: "'Inter Tight', sans-serif" }}>♥ {favorites.size}</button>}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowList(!showList)} style={{ ...btnBase, fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{showList ? "Hide" : "Tracks"} ▾</button>
      </div>

      {showList && <div style={{ marginTop: 6, maxHeight: 130, overflowY: "auto", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
        {genreTracks.map((t, i) => <button key={t.id} onClick={() => changeTrack(i)}
          style={{ width: "100%", padding: "5px 10px", background: i === trackIdx % genreTracks.length ? "rgba(244,168,58,0.1)" : "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: i === trackIdx % genreTracks.length ? "var(--accent-primary)" : "rgba(255,255,255,0.45)", transition: "all 0.15s", fontFamily: "'Inter Tight', sans-serif" }}
          onMouseEnter={e => { if (i !== trackIdx % genreTracks.length) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          onMouseLeave={e => { if (i !== trackIdx % genreTracks.length) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ width: 14, fontSize: 13, textAlign: "right", opacity: 0.4, fontFamily: "monospace" }}>{i === trackIdx % genreTracks.length && playing ? "♫" : `${i + 1}`}</span>
          <span style={{ flex: 1, textAlign: "left" }}>{t.name}</span>
          <button onClick={e => { e.stopPropagation(); toggleFav(t.id); }} style={{ ...btnBase, fontSize: 12, color: favorites.has(t.id) ? "var(--risk)" : "rgba(255,255,255,0.15)", padding: 0 }}>{favorites.has(t.id) ? "♥" : "♡"}</button>
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
        <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter Tight', sans-serif" }}>{track?.name || "—"}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>{activeMood ? `${MOODS.find(m => m.id === activeMood)?.icon} ${MOODS.find(m => m.id === activeMood)?.label}` : GENRES.find(g => g.id === genre)?.label}</div>
      </div>
      {/* Controls */}
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 20, zIndex: 1 }}>
        <button onClick={prevTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.4)", fontSize: 20 }}>⏮</button>
        <button onClick={toggle} style={{ width: 56, height: 56, borderRadius: 28, background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(224,144,64,0.4)" }}>{playing ? "⏸" : "▶"}</button>
        <button onClick={nextTrack} style={{ ...btnBase, color: "rgba(255,255,255,0.4)", fontSize: 20 }}>⏭</button>
      </div>
      {/* Progress */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3 }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, var(--accent-primary), var(--warning))", width: `${progress * 100}%`, transition: "width 0.1s linear" }} />
      </div>
      {/* Time */}
      <div style={{ position: "absolute", bottom: 6, right: 16, fontSize: 13, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", zIndex: 1 }}>{fmt(currentTime)} / {fmt(duration)}</div>
      {/* Exit */}
      <button onClick={() => setImmersive(false)} style={{ position: "absolute", top: 20, right: 20, padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", zIndex: 1 }}>Exit Immersive</button>
    </div>}
  </div></>;
}
