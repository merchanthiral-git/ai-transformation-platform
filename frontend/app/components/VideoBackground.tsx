"use client";
import React, { useRef, useEffect, useState } from "react";
import { useAnimatedBg } from "../../lib/animated-bg-context";
import { CDN_BASE } from "../../lib/cdn";

/**
 * VideoBackground — ambient MP4/WebM background with graceful fallbacks.
 *
 * Loading strategy:
 * 1. Gradient base renders instantly (CSS, zero cost)
 * 2. Poster image loads next (small JPG, ~100KB, cached immutable)
 * 3. Video starts with preload="metadata" (downloads only headers)
 * 4. IntersectionObserver upgrades to preload="auto" when in viewport
 * 5. Video fades in over 0.6s once it has data to play
 *
 * Never shows a blank/black screen during any transition.
 */

interface VideoBackgroundProps {
  name: string;
  overlay?: number;
  overlayColor?: string;
  blur?: number;
  speed?: number;
  poster?: string;
  fallbackGradient?: string;
  className?: string;
  children?: React.ReactNode;
}

const DEFAULT_GRADIENT = "linear-gradient(135deg, #0B1120 0%, #1a1f3a 40%, #0B1120 100%)";

export function VideoBackground({
  name,
  overlay = 0.4,
  overlayColor = "#0F1923",
  blur = 0,
  speed = 1,
  poster,
  fallbackGradient,
  className = "",
  children,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const { enabled: animatedEnabled } = useAnimatedBg();

  // Set playback speed
  useEffect(() => {
    if (videoRef.current && speed !== 1) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // IntersectionObserver — controls preload upgrade and play/pause.
  // Starts with preload="metadata"; upgrades to "auto" when visible.
  useEffect(() => {
    if (!containerRef.current || !animatedEnabled) return;
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Upgrade preload and start playing when in viewport
          if (video.preload !== "auto") video.preload = "auto";
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [animatedEnabled]);

  // Track when video has enough data to display a frame
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onReady = () => setVideoReady(true);
    // readyState >= 2 means at least one frame is available
    if (video.readyState >= 2) { setVideoReady(true); return; }
    video.addEventListener("canplay", onReady, { once: true });
    return () => video.removeEventListener("canplay", onReady);
  }, []);

  // Detect source failures — only the LAST <source> error event is reliable
  // (fires after the browser has exhausted all sources). A 2-second grace period
  // avoids false positives during React hydration where the DOM is rebuilt.
  useEffect(() => {
    if (!animatedEnabled) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const grace = setTimeout(() => {
      if (cancelled) return;
      const sources = video.querySelectorAll("source");
      const lastSource = sources[sources.length - 1];
      if (!lastSource) return;

      const onSourceError = () => {
        if (!cancelled) {
          console.error(`[VideoBackground] ${name}: all sources failed`);
          setVideoFailed(true);
        }
      };
      lastSource.addEventListener("error", onSourceError, { once: true });
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(grace);
    };
  }, [animatedEnabled, name]);

  const gradient = fallbackGradient || DEFAULT_GRADIENT;
  const posterUrl = poster || `${CDN_BASE}/videos/optimized/${name}-poster.jpg`;
  const filterStyle = blur > 0 ? `blur(${blur}px)` : undefined;
  // Video fades in only when enabled, not failed, AND has data to show
  const videoVisible = animatedEnabled && !videoFailed && videoReady;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{ isolation: "isolate", position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {/* Layer 0: Gradient base — always present, never blank */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: gradient,
          zIndex: 0,
          filter: filterStyle,
        }}
      />

      {/* Layer 0.5: Poster image — loads instantly from cache, shows while video downloads */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${posterUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
          filter: filterStyle,
        }}
      />

      {/* Layer 0.75: Shimmer — subtle pulse while video loads, hidden once video is ready */}
      {animatedEnabled && !videoFailed && !videoReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.015) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "bgShimmer 2s ease-in-out infinite",
          }}
        />
      )}

      {/* Layer 1: Video — ALWAYS in the DOM (avoids hydration removal).
          Starts with preload="metadata"; IntersectionObserver upgrades to "auto".
          Hidden via opacity until ready. */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={posterUrl}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
          willChange: "opacity",
          filter: filterStyle,
          opacity: videoVisible ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      >
        <source src={`${CDN_BASE}/videos/optimized/${name}.webm`} type="video/webm" />
        <source src={`${CDN_BASE}/videos/optimized/${name}.mp4`} type="video/mp4" />
      </video>

      {/* Shimmer keyframes (injected once, deduplicated by browser) */}
      <style>{`@keyframes bgShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      {/* Layer 2: Overlay for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(${hexToRgb(overlayColor)}, ${overlay})`,
          zIndex: 2,
        }}
      />

      {/* Layer 3: Content */}
      <div style={{ position: "relative", zIndex: 3 }}>
        {children}
      </div>
    </div>
  );
}

/** Convert hex color to RGB string for rgba() usage */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) || 15;
  const g = parseInt(h.substring(2, 4), 16) || 25;
  const b = parseInt(h.substring(4, 6), 16) || 35;
  return `${r}, ${g}, ${b}`;
}
