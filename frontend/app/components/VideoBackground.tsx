"use client";
import React, { useRef, useEffect, useState } from "react";
import { useAnimatedBg } from "../../lib/animated-bg-context";

/**
 * VideoBackground — ambient MP4/WebM background with graceful fallbacks.
 *
 * Respects:
 * - AnimatedBgContext (user preference toggle)
 * - prefers-reduced-motion (OS-level)
 * - Mobile / data saver / slow connection detection
 * - Intersection Observer (pause when off-screen)
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
  const { enabled: animatedEnabled } = useAnimatedBg();

  // Set playback speed
  useEffect(() => {
    if (videoRef.current && speed !== 1) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Intersection Observer — pause/play based on visibility
  useEffect(() => {
    if (!containerRef.current || !animatedEnabled) return;
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
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
  const posterUrl = poster || `/videos/optimized/${name}-poster.jpg`;
  const filterStyle = blur > 0 ? `blur(${blur}px)` : undefined;
  // Video is always in the DOM to survive hydration. Hide via opacity when disabled/failed.
  const videoVisible = animatedEnabled && !videoFailed;

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

      {/* Layer 0.5: Poster image — always present on top of gradient */}
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

      {/* Layer 1: Video — ALWAYS in the DOM (avoids hydration removal).
          Hidden via opacity when user-disabled or all sources failed. */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={posterUrl}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
          willChange: "transform",
          filter: filterStyle,
          opacity: videoVisible ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      >
        <source src={`/videos/optimized/${name}.webm`} type="video/webm" />
        <source src={`/videos/optimized/${name}.mp4`} type="video/mp4" />
      </video>

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
