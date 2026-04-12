"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
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
    if (!containerRef.current || !animatedEnabled || videoFailed) return;
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
  }, [animatedEnabled, videoFailed]);

  // Handle video errors silently
  const handleError = useCallback(() => {
    setVideoFailed(true);
  }, []);

  const showVideo = animatedEnabled && !videoFailed;
  const gradient = fallbackGradient || DEFAULT_GRADIENT;
  const posterUrl = poster || `/videos/optimized/${name}-poster.jpg`;
  const filterStyle = blur > 0 ? `blur(${blur}px)` : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ isolation: "isolate" }}
    >
      {/* Layer 1: Video, poster image, or gradient fallback */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={posterUrl}
          onError={handleError}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            willChange: "transform",
            filter: filterStyle,
          }}
        >
          <source src={`/videos/optimized/${name}.webm`} type="video/webm" />
          <source src={`/videos/optimized/${name}.mp4`} type="video/mp4" />
        </video>
      ) : (
        /* When animated is off: try poster image, fall back to gradient */
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
        >
          {/* Gradient underneath poster in case poster 404s */}
          <div style={{ position: "absolute", inset: 0, background: gradient }} />
        </div>
      )}

      {/* Layer 2: Overlay for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `rgba(${hexToRgb(overlayColor)}, ${overlay})`,
          zIndex: 1,
        }}
      />

      {/* Layer 3: Content */}
      <div style={{ position: "relative", zIndex: 2 }}>
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
