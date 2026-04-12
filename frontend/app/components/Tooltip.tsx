"use client";
import React, { useState, useRef, useCallback } from "react";

/**
 * Tooltip — appears after 400ms hover delay, fades in with scale animation.
 */

export function Tooltip({ children, content, position = "top" }: {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 400);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const posStyle: React.CSSProperties = position === "top"
    ? { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6 }
    : position === "bottom"
    ? { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 6 }
    : position === "left"
    ? { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 6 }
    : { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 6 };

  return <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
    {children}
    {visible && <span className="absolute z-50 pointer-events-none" style={{ ...posStyle, animation: "tooltipIn 0.15s ease-out" }}>
      <span style={{ display: "block", maxWidth: 220, padding: "6px 10px", borderRadius: 8, background: "rgba(15,25,35,0.95)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 1.4, fontFamily: "'Outfit', sans-serif", whiteSpace: "normal", boxShadow: "var(--shadow-2)" }}>{content}</span>
    </span>}
    <style>{`@keyframes tooltipIn { from { opacity: 0; transform: translateX(-50%) scale(0.95); } to { opacity: 1; transform: translateX(-50%) scale(1); } }`}</style>
  </span>;
}
