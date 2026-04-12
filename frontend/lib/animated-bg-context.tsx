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
  const [userPref, setUserPref] = useState<"on" | "off">("on");
  const [forced, setForced] = useState(false);
  const [forceReason, setForceReason] = useState("");

  // Read from localStorage on mount + detect device constraints
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Read stored preference
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "on" || stored === "off") {
      setUserPref(stored);
    }

    // Detect device constraints
    const mobile = window.innerWidth < 768;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
    const saveData = nav.connection?.saveData === true;
    const slow = ["slow-2g", "2g"].includes(nav.connection?.effectiveType || "");
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedMotion = mql.matches;

    if (reducedMotion) {
      setForced(true);
      setForceReason("Reduced motion preference detected");
      setUserPref("off");
    } else if (mobile) {
      setForced(true);
      setForceReason("Disabled for performance on mobile");
      setUserPref("off");
    } else if (saveData || slow) {
      setForced(true);
      setForceReason("Disabled for performance on slow connections");
      setUserPref("off");
    }

    // Listen for reduced motion changes
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setForced(true);
        setForceReason("Reduced motion preference detected");
        setUserPref("off");
        localStorage.setItem(STORAGE_KEY, "off");
      } else {
        setForced(false);
        setForceReason("");
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
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
