"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { AnimatedModal } from "./animations";

// ── Theme System ──
export function useTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  useEffect(() => {
    // Read saved preference or system preference
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved || (systemDark ? "dark" : "dark"); // default to dark
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);
  const setTheme = useCallback((t: "dark" | "light") => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
  }, []);
  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);
  return { theme, setTheme, toggle };
}

export function ThemeToggle({ theme, onToggle }: { theme: "dark" | "light"; onToggle: () => void }) {
  return React.createElement(motion.button, { onClick: onToggle, className: "w-8 h-8 rounded-xl flex items-center justify-center border border-[var(--border)] transition-colors", style: { background: "var(--surface-2)" }, whileHover: { scale: 1.1 }, whileTap: { scale: 0.95 }, title: theme === "dark" ? "Switch to light mode" : "Switch to dark mode" },
    React.createElement(motion.span, { key: theme, initial: { rotate: -30, opacity: 0 }, animate: { rotate: 0, opacity: 1 }, exit: { rotate: 30, opacity: 0 }, transition: { duration: 0.3 }, style: { fontSize: 15 } },
      theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"
    )
  );
}

// ── Keyboard Shortcuts ──
export type ShortcutDef = { key: string; ctrl?: boolean; shift?: boolean; label: string; action: () => void; category: string };

export function useKeyboardShortcuts(shortcuts: ShortcutDef[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      const editable = (e.target as HTMLElement).isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable) {
        // Only allow Escape in inputs
        if (e.key !== "Escape") return;
      }
      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        if (e.key === s.key && ctrlMatch && shiftMatch) {
          e.preventDefault();
          e.stopPropagation();
          s.action();
          return;
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [shortcuts, enabled]);
}

const KBD_STYLE: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 24, height: 22, padding: "0 6px", borderRadius: 5, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: "var(--text-muted)", boxShadow: "var(--shadow-1)", lineHeight: 1 };

export function Kbd({ children }: { children: React.ReactNode }) {
  return React.createElement("span", { style: KBD_STYLE }, children);
}

export function KeyboardShortcutsPanel({ shortcuts, onClose }: { shortcuts: { key: string; ctrl?: boolean; shift?: boolean; label: string; category: string }[]; onClose: () => void }) {
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
  const mod = isMac ? "\u2318" : "Ctrl";
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));
  return React.createElement(AnimatedModal, { onClose },
    React.createElement("div", { className: "bg-[var(--bg)] rounded-2xl border border-[var(--border)] w-[520px] max-h-[80vh] overflow-y-auto", style: { boxShadow: "var(--shadow-4)" } },
      React.createElement("div", { className: "flex items-center justify-between px-6 py-4 border-b border-[var(--border)]" },
        React.createElement("div", { className: "text-[18px] font-bold text-[var(--text-primary)] font-heading" }, "Keyboard Shortcuts"),
        React.createElement("button", { onClick: onClose, className: "text-[18px] text-[var(--text-muted)] hover:text-[var(--text-primary)]" }, "\u00D7")
      ),
      React.createElement("div", { className: "px-6 py-4 space-y-5" },
        ...categories.map(cat => React.createElement("div", { key: cat },
          React.createElement("div", { className: "text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 font-heading" }, cat),
          React.createElement("div", { className: "space-y-1.5" },
            ...shortcuts.filter(s => s.category === cat).map(s => React.createElement("div", { key: `${s.key}-${s.ctrl}-${s.shift}`, className: "flex items-center justify-between py-1.5" },
              React.createElement("span", { className: "text-[14px] text-[var(--text-secondary)]" }, s.label),
              React.createElement("div", { className: "flex items-center gap-1" },
                s.ctrl ? React.createElement(Kbd, null, mod) : null,
                s.shift ? React.createElement(Kbd, null, "\u21E7") : null,
                React.createElement(Kbd, null, s.key === " " ? "Space" : s.key === "?" ? "?" : s.key === "/" ? "/" : s.key.length === 1 ? s.key.toUpperCase() : s.key)
              )
            ))
          )
        ))
      )
    )
  );
}

// ── Global toast/decision wiring ──
let _globalToast: ((msg: string, variant?: "success" | "error" | "info" | "warning") => void) | null = null;
export function setGlobalToast(fn: (msg: string, variant?: "success" | "error" | "info" | "warning") => void) { _globalToast = fn; }
export function showToast(msg: string, variant?: "success" | "error" | "info" | "warning") { if (_globalToast) _globalToast(msg, variant); }
let _globalLogDecision: ((module: string, action: string, detail: string) => void) | null = null;
export function setGlobalLogDecision(fn: (module: string, action: string, detail: string) => void) { _globalLogDecision = fn; }
export function logDec(module: string, action: string, detail: string) { if (_globalLogDecision) _globalLogDecision(module, action, detail); }

// ── Hooks ──
export function usePersisted<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(initial);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s !== null) setVal(JSON.parse(s)); } catch (e) { console.error("[usePersisted] read failed", e); } }, [key]);
  const setter = useCallback((v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === "function" ? (v as (prev: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) { console.error("[usePersisted] write failed", e); }
      return next;
    });
  }, [key]);
  return [val, setter];
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

// Request dedup cache — prevents identical concurrent fetches
const _apiCache: Record<string, { promise: Promise<unknown>; ts: number }> = {};
const API_CACHE_TTL = 5000; // 5s dedup window

export function useApiData(fetcher: () => Promise<Record<string, unknown> | null>, deps: unknown[]): [Record<string, unknown> | null, boolean, string | null] {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher; // always points to latest fetcher — fixes stale closure

  useEffect(() => {
    let cancelled = false;
    setError(null);
    timerRef.current = setTimeout(() => { if (!cancelled) setLoading(true); }, 300);

    // Use the ref to always call the latest fetcher
    const cacheKey = JSON.stringify(deps);
    const cached = _apiCache[cacheKey];
    const now = Date.now();
    const promise = (cached && now - cached.ts < API_CACHE_TTL)
      ? cached.promise
      : fetcherRef.current();

    if (!cached || now - cached.ts >= API_CACHE_TTL) {
      _apiCache[cacheKey] = { promise, ts: now };
    }

    promise.then((d: unknown) => {
      if (!cancelled) {
        setData(d as Record<string, unknown> | null);
        setLoading(false);
        // Check if the API layer flagged an error
        const { getLastFetchError } = require("../../../lib/api");
        const lastErr = getLastFetchError();
        if (lastErr) setError(lastErr.message);
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    }).catch((err: unknown) => {
      console.error("[useApiData]", err);
      if (!cancelled) {
        setError(String(err));
        setLoading(false);
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    });
    return () => { cancelled = true; if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [data, loading, error];
}

// Global Decision Log — tracks all decisions across modules
export function useDecisionLog(projectId: string) {
  const [log, setLog] = usePersisted<{ts: string; module: string; action: string; detail: string}[]>(`${projectId}_decisionLog`, []);
  const logDecision = useCallback((module: string, action: string, detail: string) => {
    setLog(prev => [...prev, { ts: new Date().toISOString(), module, action, detail }].slice(-100));
  }, [setLog]);
  return { log, logDecision, clearLog: () => setLog([]) };
}

// Global Risk Register — aggregated risks
export function useRiskRegister(projectId: string) {
  const [risks, setRisks] = usePersisted<{id: string; source: string; risk: string; probability: string; impact: string; mitigation: string; status: string}[]>(`${projectId}_riskRegister`, []);
  const addRisk = useCallback((source: string, risk: string, probability: string, impact: string, mitigation: string) => {
    setRisks(prev => [...prev, { id: `R${prev.length+1}`, source, risk, probability, impact, mitigation, status: "Open" }]);
  }, [setRisks]);
  const updateRisk = useCallback((id: string, updates: Partial<{status: string; mitigation: string}>) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, [setRisks]);
  return { risks, addRisk, updateRisk };
}

// ── Toast System ──
export function Toast({ message, type = "info", onDismiss }: { message: string; type?: "info" | "success" | "error" | "warning"; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
  const colors = { info: "var(--accent-primary)", success: "var(--success)", error: "var(--risk)", warning: "var(--warning)" };
  const dotColors = { info: "var(--amber)", success: "var(--sage)", error: "var(--coral)", warning: "var(--amber)" };
  const icons = { info: "\u2139\uFE0F", success: "\u2713", error: "\u2715", warning: "\u26A0" };
  return React.createElement("div", { role: "alert", "aria-live": "polite", className: "fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl", style: { background: "var(--surface-1)", border: `1px solid ${colors[type]}30`, minWidth: 280, maxWidth: 420 } },
    React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: dotColors[type], flexShrink: 0 } }),
    React.createElement("span", { className: "text-lg", style: { color: colors[type] } }, icons[type]),
    React.createElement("span", { className: "text-[15px] text-[var(--text-primary)] flex-1" }, message),
    React.createElement("button", { onClick: onDismiss, "aria-label": "Dismiss notification", className: "text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm ml-2" }, "\u2715")
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "info" | "success" | "error" | "warning" }[]>([]);
  const add = useCallback((message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const remove = useCallback((id: number) => { setToasts(prev => prev.filter(t => t.id !== id)); }, []);
  const ToastContainer = useMemo(() => {
    return function ToastList() {
      return React.createElement(React.Fragment, null, ...toasts.map(t => React.createElement(Toast, { key: t.id, message: t.message, type: t.type, onDismiss: () => remove(t.id) })));
    };
  }, [toasts, remove]);
  return { toast: add, ToastContainer };
}

/** Extract stable dependency array from model + filters — replaces 20+ manual [model, f.func, f.jf, f.sf, f.cl] arrays */
export function useFilterDeps(model: string, f: { func: string; jf: string; sf: string; cl: string }): [string, string, string, string, string] {
  return [model, f.func, f.jf, f.sf, f.cl];
}
