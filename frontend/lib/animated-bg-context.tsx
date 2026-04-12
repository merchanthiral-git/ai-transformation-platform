"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "animated_backgrounds";

type AnimatedBgState = {
  /** User preference: "on" | "off" */
  enabled: boolean;
  /** Whether the device/browser forces it off (reduced motion, mobile, slow) */
  forced: boolean;
  /** Reason it's forced off, if applicable */
  forceReason: string;
  /** Toggle the user preference */
  toggle: () => void;
};

const AnimatedBgContext = createContext<AnimatedBgState>({
  enabled: true,
  forced: false,
  forceReason: "",
  toggle: () => {},
});

export function useAnimatedBg() {
  return useContext(AnimatedBgContext);
}

export function AnimatedBgProvider({ children }: { children: React.ReactNode }) {
  // Initialise from localStorage synchronously so the very first render is correct.
  // First visit (no key) → "on".  Returning user → whatever they chose last time.
  const [userPref, setUserPref] = useState<"on" | "off">(() => {
    if (typeof window === "undefined") return "on";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "off") return "off";
    return "on"; // default: videos ON for first visit and any non-"off" value
  });
  const [forced, setForced] = useState(false);
  const [forceReason, setForceReason] = useState("");

  // Detect device constraints that override user preference.
  // Only network/bandwidth constraints force videos off — these are real performance
  // concerns. prefers-reduced-motion is NOT checked here because ambient looping
  // video backgrounds are non-distracting and don't constitute UI animation.
  // prefers-reduced-motion should be handled at the CSS level for transitions,
  // slide-ins, bouncing, and other motion-based UI effects.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
    const saveData = nav.connection?.saveData === true;
    const slow = ["slow-2g", "2g"].includes(nav.connection?.effectiveType || "");

    if (saveData || slow) {
      setForced(true);
      setForceReason("Disabled for performance on slow connections");
    }
  }, []);

  const toggle = useCallback(() => {
    if (forced) return;
    setUserPref(prev => {
      const next = prev === "on" ? "off" : "on";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, [forced]);

  return (
    <AnimatedBgContext.Provider value={{
      enabled: userPref === "on" && !forced,
      forced,
      forceReason,
      toggle,
    }}>
      {children}
    </AnimatedBgContext.Provider>
  );
}
