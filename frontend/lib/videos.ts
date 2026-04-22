/**
 * Video Background Registry — single source of truth for all video backgrounds.
 *
 * Adding a new video:
 * 1. Place source MP4 in public/videos/source/{name}.mp4
 * 2. Run: bash scripts/optimize-videos.sh
 * 3. Add entry below
 * 4. Use: <VideoBackground name="your-name">content</VideoBackground>
 *
 * Current videos (matching public/videos/optimized/):
 *   login_bg.mp4    — Login / auth page
 *   hero_bg.mp4     — Project Hub hero
 *   landing_bg.mp4  — Module landing / splash screen
 *   journey_bg.mp4  — Journey map / overview
 *   sandbox_bg.mp4  — Sandbox selection
 *   view_bg.mp4     — View selector / employee picker
 */

import { CDN_BASE } from "./cdn";

export type VideoConfig = {
  name: string;
  overlay: number;
  poster: string;
  fallbackGradient: string;
};

export const VIDEO_BACKGROUNDS = {
  LOGIN: {
    name: "login_bg",
    overlay: 0.5,
    poster: `${CDN_BASE}/login_bg.png`,
    fallbackGradient: "linear-gradient(135deg, #1a1208 0%, #2a1a0a 30%, #0f0d08 70%, #1a1510 100%)",
  },
  PROJECT_HUB: {
    name: "hero_bg",
    overlay: 0.35,
    poster: `${CDN_BASE}/hero_bg.png`,
    fallbackGradient: "linear-gradient(135deg, var(--paper-solid) 0%, #1a1530 35%, #0f1525 65%, #0a0f1a 100%)",
  },
  LANDING: {
    name: "landing_bg",
    overlay: 0.4,
    poster: `${CDN_BASE}/landing_bg.png`,
    fallbackGradient: "linear-gradient(135deg, var(--paper-solid) 0%, #0c1e3a 100%)",
  },
  JOURNEY: {
    name: "journey_bg",
    overlay: 0.4,
    poster: `${CDN_BASE}/journey_bg.png`,
    fallbackGradient: "linear-gradient(135deg, var(--paper-solid) 0%, #1a1040 100%)",
  },
  SANDBOX: {
    name: "sandbox_bg",
    overlay: 0.4,
    poster: `${CDN_BASE}/sandbox_bg.png`,
    fallbackGradient: "linear-gradient(160deg, var(--paper-solid) 0%, #1a1a30 40%, #12182a 100%)",
  },
  VIEW: {
    name: "view_bg",
    overlay: 0.35,
    poster: `${CDN_BASE}/view_bg.png`,
    fallbackGradient: "linear-gradient(135deg, var(--paper-solid) 0%, #1a1530 35%, #0f1525 65%, #0a0f1a 100%)",
  },
} as const;
