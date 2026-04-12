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

  // Detect video source failures — <source> errors don't bubble to <video> onError,
  // so we check networkState after the browser has had time to attempt loading.
  useEffect(() => {
    if (!animatedEnabled || videoFailed) return;
    const video = videoRef.current;
    if (!video) return;

    const onSourceError = () => setVideoFailed(true);

    // Listen for error on the last <source> — fires when all sources fail
    const sources = video.querySelectorAll("source");
    const lastSource = sources[sources.length - 1];
    if (lastSource) {
      lastSource.addEventListener("error", onSourceError);
    }

    // Also handle the video element's own error event (e.g. decode errors)
    video.addEventListener("error", onSourceError);

    // Safety net: if after 8s the video has no data and isn't playing, treat as failed
    const timeout = setTimeout(() => {
      if (video.readyState === 0 && video.networkState === 3) {
        setVideoFailed(true);
      }
    }, 8000);

    return () => {
      if (lastSource) lastSource.removeEventListener("error", onSourceError);
      video.removeEventListener("error", onSourceError);
      clearTimeout(timeout);
    };
  }, [animatedEnabled, videoFailed]);

  const showVideo = animatedEnabled && !videoFailed;
  const gradient = fallbackGradient || DEFAULT_GRADIENT;
  const posterUrl = poster || `/videos/optimized/${name}-poster.jpg`;
  const filterStyle = blur > 0 ? `blur(${blur}px)` : undefined;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{ isolation: "isolate", position: "absolute" }}
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

      {/* Layer 1: Video — on top of poster, only when enabled and not failed */}
      {showVideo && (
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
            zIndex: 0,
            willChange: "transform",
            filter: filterStyle,
          }}
        >
          <source src={`/videos/optimized/${name}.webm`} type="video/webm" />
          <source src={`/videos/optimized/${name}.mp4`} type="video/mp4" />
        </video>
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
