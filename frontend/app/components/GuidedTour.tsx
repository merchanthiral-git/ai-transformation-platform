"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   GUIDED TOUR — first-time user spotlight walkthrough
   Lightweight, no external libraries. Spotlight overlay with
   cutout around target element + positioned tooltip card.
   ═══════════════════════════════════════════════════════════════ */

const TOUR_COMPLETED_KEY = "guidedTourCompleted";
const TOUR_STEP_KEY = "guidedTourStep";

export interface TourStep {
  target: string | null;       // data-tour attribute value, null = centered modal
  title: string;
  description: string;
  position?: "bottom" | "top" | "right" | "left";  // tooltip position relative to target
}

const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: "Welcome to the AI Transformation Platform!",
    description: "This tour will show you how to navigate the tool and run your first workforce analysis. It takes about 2 minutes. Let's get started.",
  },
  {
    target: "sidebar",
    title: "Your Navigation Hub",
    description: "This sidebar is your command center. Upload data, select models, apply filters, and access every module from here. The six modules guide you through a complete transformation lifecycle.",
    position: "right",
  },
  {
    target: "overview",
    title: "Start with the Overview",
    description: "The Overview gives you a snapshot of your organization's workforce, AI readiness score, and transformation progress. It's your home base between deep-dives.",
    position: "bottom",
  },
  {
    target: "upload",
    title: "Upload Your Data",
    description: "Upload workforce data here — Excel, CSV, or JSON. The platform auto-detects your data type (workforce, work design, skills, etc.) and maps it to the right structure automatically.",
    position: "right",
  },
  {
    target: "sidebar",
    title: "Diagnose Your Organization",
    description: "The Diagnose module analyzes your org health, identifies AI automation opportunities across every role, assesses change readiness, and flags structural risks in your workforce.",
    position: "right",
  },
  {
    target: "sidebar",
    title: "Job Architecture",
    description: "Explore and redesign your job architecture. Browse the job catalogue, validate structural integrity, compare roles side by side, and map current roles to a future state.",
    position: "right",
  },
  {
    target: "sidebar",
    title: "The Work Design Lab",
    description: "This is where the real transformation happens. Deconstruct jobs into tasks, score each task's AI impact, then reconstruct redesigned roles with the optimal human-AI split.",
    position: "right",
  },
  {
    target: "sidebar",
    title: "Simulate Impact",
    description: "Model the impact of your transformation decisions — headcount changes, cost savings, skill gaps created, ROI projections, and break-even timelines across multiple scenarios.",
    position: "right",
  },
  {
    target: "sidebar",
    title: "Mobilize for Change",
    description: "Build your change management plan — transformation roadmaps, stakeholder mapping with drag-and-drop, risk registers, communication plans, and readiness archetypes.",
    position: "right",
  },
  {
    target: "sidebar",
    title: "Export Deliverables",
    description: "Generate client-ready deliverables in one click — Word reports, PowerPoint decks, PDF executive summaries, and Excel workbooks. All branded and data-rich.",
    position: "right",
  },
  {
    target: "ai-espresso",
    title: "Your AI Assistant",
    description: "AI Espresso lives here. Ask questions about any module, get data-driven recommendations, or generate insights on the fly. It has full context of your current view.",
    position: "left",
  },
  {
    target: "platform-hub",
    title: "Platform Hub & Account",
    description: "Access your account settings, the knowledge base, video tutorials, use case library, and release notes here. Everything you need to become a platform expert.",
    position: "right",
  },
  {
    target: null,
    title: "You're All Set!",
    description: "Start by selecting a sandbox company to explore, or upload your own data. You can relaunch this tour anytime from the Platform Hub or the ? icon in the toolbar. Happy transforming!",
  },
];

export function useGuidedTour() {
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Auto-trigger on first login
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    const freshLogin = sessionStorage.getItem("fresh_login");
    if (!completed && freshLogin === "1") {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        setTourActive(true);
        // Check for a saved step (resume)
        const savedStep = localStorage.getItem(TOUR_STEP_KEY);
        if (savedStep) {
          const s = parseInt(savedStep, 10);
          if (s > 0 && s < TOUR_STEPS.length) setTourStep(s);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourActive(true);
    sessionStorage.removeItem("fresh_login");
  }, []);

  // Listen for custom event from PlatformHub "Take the Tour" button
  useEffect(() => {
    const handler = () => startTour();
    window.addEventListener("start-guided-tour", handler);
    return () => window.removeEventListener("start-guided-tour", handler);
  }, [startTour]);

  const endTour = useCallback((completed: boolean) => {
    setTourActive(false);
    if (completed) {
      localStorage.setItem(TOUR_COMPLETED_KEY, "true");
      localStorage.removeItem(TOUR_STEP_KEY);
    }
    sessionStorage.removeItem("fresh_login");
  }, []);

  const nextStep = useCallback(() => {
    if (tourStep >= TOUR_STEPS.length - 1) {
      endTour(true);
    } else {
      const next = tourStep + 1;
      setTourStep(next);
      localStorage.setItem(TOUR_STEP_KEY, String(next));
    }
  }, [tourStep, endTour]);

  const prevStep = useCallback(() => {
    if (tourStep > 0) {
      const prev = tourStep - 1;
      setTourStep(prev);
      localStorage.setItem(TOUR_STEP_KEY, String(prev));
    }
  }, [tourStep]);

  const skipTour = useCallback(() => {
    endTour(true);
  }, [endTour]);

  const dismissTour = useCallback(() => {
    // Save progress but don't mark complete
    localStorage.setItem(TOUR_STEP_KEY, String(tourStep));
    setTourActive(false);
  }, [tourStep]);

  return { tourActive, tourStep, startTour, endTour, nextStep, prevStep, skipTour, dismissTour, totalSteps: TOUR_STEPS.length };
}


/* ═══════════════════════════════════════════════════════════════
   TOUR OVERLAY — spotlight with cutout + tooltip card
   ═══════════════════════════════════════════════════════════════ */

export function GuidedTourOverlay({ step, totalSteps, onNext, onPrev, onSkip, onDismiss }: {
  step: number; totalSteps: number;
  onNext: () => void; onPrev: () => void; onSkip: () => void; onDismiss: () => void;
}) {
  const s = TOUR_STEPS[step];
  if (!s) return null;

  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const EDGE_MARGIN = 20;
  const GAP = 16;
  const TOOLTIP_W = 380;

  // Find target element and get its position
  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => {
      if (s.target) {
        const el = document.querySelector(`[data-tour="${s.target}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
      setVisible(true);
    }, 80);
    return () => clearTimeout(timer);
  }, [step, s.target]);

  // Measure tooltip after render and compute safe position
  useEffect(() => {
    // Run on next frame so the tooltip is rendered and measurable
    const raf = requestAnimationFrame(() => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      const tooltipH = tooltip.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Centered modal when no target
      if (!targetRect || !s.target) {
        setTooltipPos({
          position: "fixed",
          top: Math.max(EDGE_MARGIN, (vh - tooltipH) / 2),
          left: Math.max(EDGE_MARGIN, (vw - TOOLTIP_W) / 2),
        });
        return;
      }

      const preferred = s.position || "bottom";

      // Try each placement and pick the first that fits, starting with preferred
      const placements: Array<"right" | "bottom" | "left" | "top"> =
        preferred === "right" ? ["right", "bottom", "left", "top"] :
        preferred === "left"  ? ["left", "bottom", "right", "top"] :
        preferred === "top"   ? ["top", "right", "bottom", "left"] :
                                ["bottom", "right", "top", "left"];

      for (const place of placements) {
        let top = 0, left = 0;

        if (place === "right") {
          left = targetRect.right + GAP;
          top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
        } else if (place === "left") {
          left = targetRect.left - TOOLTIP_W - GAP;
          top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
        } else if (place === "bottom") {
          left = targetRect.left + targetRect.width / 2 - TOOLTIP_W / 2;
          top = targetRect.bottom + GAP;
        } else {
          left = targetRect.left + targetRect.width / 2 - TOOLTIP_W / 2;
          top = targetRect.top - tooltipH - GAP;
        }

        // Clamp to viewport edges
        left = Math.max(EDGE_MARGIN, Math.min(left, vw - TOOLTIP_W - EDGE_MARGIN));
        top = Math.max(EDGE_MARGIN, Math.min(top, vh - tooltipH - EDGE_MARGIN));

        // Check if the tooltip fits without overlapping the target
        const tooltipBottom = top + tooltipH;
        const tooltipRight = left + TOOLTIP_W;
        const overlapsTarget =
          left < targetRect.right + GAP / 2 &&
          tooltipRight > targetRect.left - GAP / 2 &&
          top < targetRect.bottom + GAP / 2 &&
          tooltipBottom > targetRect.top - GAP / 2;

        // Accept this placement if it doesn't overlap the target OR if it's the last resort
        if (!overlapsTarget || place === placements[placements.length - 1]) {
          setTooltipPos({ position: "fixed", top, left });
          return;
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [targetRect, s.target, s.position, step, visible]);

  // Spotlight cutout dimensions (with padding)
  const spotPad = 8;
  const spotRect = targetRect ? {
    x: targetRect.left - spotPad,
    y: targetRect.top - spotPad,
    w: targetRect.width + spotPad * 2,
    h: targetRect.height + spotPad * 2,
    r: 12,
  } : null;

  return <div style={{ position: "fixed", inset: 0, zIndex: 99990, pointerEvents: "auto", transition: "opacity 0.3s", opacity: visible ? 1 : 0 }}>
    {/* Dark overlay with spotlight cutout */}
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <mask id="tour-spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {spotRect && <rect x={spotRect.x} y={spotRect.y} width={spotRect.w} height={spotRect.h} rx={spotRect.r} fill="black" />}
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#tour-spotlight-mask)" />
      {/* Amber glow around spotlight */}
      {spotRect && <rect x={spotRect.x - 2} y={spotRect.y - 2} width={spotRect.w + 4} height={spotRect.h + 4} rx={spotRect.r + 2} fill="none" stroke="rgba(212,134,10,0.5)" strokeWidth="2">
        <animate attributeName="stroke-opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
      </rect>}
    </svg>

    {/* Click overlay to prevent interaction (except on the tooltip) */}
    <div style={{ position: "absolute", inset: 0 }} onClick={onDismiss} />

    {/* Tooltip card — positioned by computed tooltipPos */}
    <div ref={tooltipRef} onClick={e => e.stopPropagation()} style={{
      ...tooltipPos,
      zIndex: 99991,
      width: TOOLTIP_W,
      maxHeight: `calc(100vh - ${EDGE_MARGIN * 2}px)`,
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(180deg, #faf6f0 0%, #f5ede2 100%)",
      borderRadius: 16,
      boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,134,10,0.15)",
      overflow: "hidden",
      transition: "top 0.4s cubic-bezier(0.16,1,0.3,1), left 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s",
    }}>
      {/* Top amber accent bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #D4860A, #E8C547, #C07030)", flexShrink: 0 }} />

      {/* Scrollable content area */}
      <div style={{ padding: "20px 24px 16px", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#C07030", letterSpacing: 1, fontFamily: "'IBM Plex Mono', monospace" }}>
            {isFirst ? "WELCOME" : isLast ? "ALL DONE" : `STEP ${step} OF ${totalSteps - 2}`}
          </span>
          <button onClick={onSkip} style={{ fontSize: 10, color: "#999", background: "none", border: "none", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
            Skip Tour
          </button>
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 8, lineHeight: 1.3, fontFamily: "'Outfit', sans-serif" }}>
          {s.title}
        </h3>

        {/* Description */}
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#555", margin: 0, fontFamily: "'Outfit', sans-serif" }}>
          {s.description}
        </p>
      </div>

      {/* Progress dots — always visible (not scrollable) */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "0 24px 12px", flexShrink: 0 }}>
        {TOUR_STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 18 : 6,
            height: 6,
            borderRadius: 3,
            background: i === step ? "#D4860A" : i < step ? "rgba(212,134,10,0.35)" : "rgba(0,0,0,0.1)",
            transition: "all 0.3s",
          }} />
        ))}
      </div>

      {/* Navigation buttons — always visible (not scrollable) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px 20px", borderTop: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
        <button onClick={onPrev} disabled={isFirst} style={{
          padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          cursor: isFirst ? "not-allowed" : "pointer",
          background: "white", border: "1px solid #ddd", color: "#666",
          opacity: isFirst ? 0.3 : 1, transition: "all 0.2s",
          fontFamily: "'Outfit', sans-serif",
        }}>
          Back
        </button>

        <button onClick={onNext} style={{
          padding: "8px 24px", borderRadius: 10, fontSize: 12, fontWeight: 700,
          cursor: "pointer", border: "none",
          color: "#fff",
          background: isLast ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #D4860A, #C07030)",
          boxShadow: isLast ? "0 4px 12px rgba(16,185,129,0.3)" : "0 4px 12px rgba(212,134,10,0.3)",
          transition: "all 0.2s",
          fontFamily: "'Outfit', sans-serif",
        }}>
          {isLast ? "Get Started!" : "Next"}
        </button>
      </div>
    </div>
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   TOUR RELAUNCH BUTTON — small "?" icon in top area
   ═══════════════════════════════════════════════════════════════ */

export function TourHelpButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} title="Take the guided tour"
    style={{
      width: 28, height: 28, borderRadius: 8,
      background: "rgba(212,134,10,0.08)",
      border: "1px solid rgba(212,134,10,0.15)",
      color: "#D4860A", fontSize: 13, fontWeight: 700,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.2s", fontFamily: "'Outfit', sans-serif",
    }}
    onMouseEnter={e => { e.currentTarget.style.background = "rgba(212,134,10,0.15)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.3)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "rgba(212,134,10,0.08)"; e.currentTarget.style.borderColor = "rgba(212,134,10,0.15)"; }}>
    ?
  </button>;
}
