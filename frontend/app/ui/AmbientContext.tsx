"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { usePersisted } from "@/app/components/shared/hooks";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AmbientLevel = "minimal" | "standard" | "immersive";

interface AmbientContextValue {
  ambientLevel: AmbientLevel;
  setAmbientLevel: (level: AmbientLevel) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AmbientContext = createContext<AmbientContextValue>({
  ambientLevel: "standard",
  setAmbientLevel: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

interface AmbientProviderProps {
  children: ReactNode;
}

export function AmbientProvider({ children }: AmbientProviderProps) {
  const [ambientLevel, setAmbientRaw] = usePersisted<AmbientLevel>(
    "pref_ambient_level",
    "standard"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-ambient", ambientLevel);
  }, [ambientLevel]);

  const setAmbientLevel = (level: AmbientLevel) => {
    setAmbientRaw(level);
    document.documentElement.setAttribute("data-ambient", level);
  };

  return (
    <AmbientContext.Provider value={{ ambientLevel, setAmbientLevel }}>
      {children}
    </AmbientContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAmbientLevel(): AmbientContextValue {
  return useContext(AmbientContext);
}
