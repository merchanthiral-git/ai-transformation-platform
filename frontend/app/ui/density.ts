"use client";

import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  createElement,
} from "react";
import { usePersisted } from "@/app/components/shared/hooks";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Density = "comfortable" | "compact";

interface DensityContextValue {
  density: Density;
  setDensity: (d: Density) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const DensityContext = createContext<DensityContextValue>({
  density: "comfortable",
  setDensity: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

interface DensityProviderProps {
  children: ReactNode;
}

export function DensityProvider({ children }: DensityProviderProps) {
  const [density, setDensityRaw] = usePersisted<Density>(
    "pref_density",
    "comfortable"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  const setDensity = (d: Density) => {
    setDensityRaw(d);
    document.documentElement.setAttribute("data-density", d);
  };

  return createElement(
    DensityContext.Provider,
    { value: { density, setDensity } },
    children
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDensity(): DensityContextValue {
  return useContext(DensityContext);
}
