"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as api from "../../../lib/api";
import type { Filters } from "../../../lib/api";
import { VideoBackground } from "../VideoBackground";
import { CDN_BASE, cb } from "../../../lib/cdn";
import { trackExportGenerated, trackAIFeatureUsed } from "../../../lib/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedModal, AnimatedNumber, AnimatedBar } from "./animations";
import { GlossaryTip } from "../GlossaryTip";
import { Kbd, showToast, usePersisted } from "./hooks";
import { COLORS, TT, MODULE_HELP, MODULES, PHASES, CAREER_FRAMEWORKS, MODULE_QUICK_PROMPTS, MODULE_AI_PROMPTS } from "./constants";

export type ViewContext = { mode: string; employee: string; job: string; custom: Record<string, string> };

// ── Command Palette ──
export type CmdAction = { id: string; icon: string; label: string; desc?: string; category: string; shortcut?: string; action: () => void; keywords?: string };

function fuzzyMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  // Fuzzy: all chars of query appear in order in text
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) { if (t[ti] === q[qi]) qi++; }
  if (qi === q.length) return 40;
  // Initials match: "wdl" matches "Work Design Lab"
  const initials = text.split(/\s+/).map(w => w[0]?.toLowerCase()).join("");
  if (initials.includes(q)) return 50;
  return 0;
}

export function CommandPalette({ actions, recentIds, onClose }: { actions: CmdAction[]; recentIds: string[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previously focused element and auto-focus input on open
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      // Restore focus when palette unmounts
      previousFocusRef.current?.focus();
    };
  }, []);

  // Focus trap: cycle Tab within the palette
  const handleTrapKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const container = containerRef.current;
    if (!container) return;
    const focusable = container.querySelectorAll<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"]), a[href], [role="option"]'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show recent + top actions
      const recent = recentIds.map(id => actions.find(a => a.id === id)).filter(Boolean).slice(0, 5) as CmdAction[];
      const nav = actions.filter(a => a.category === "Navigation").slice(0, 4);
      const acts = actions.filter(a => a.category === "Actions").slice(0, 3);
      return [
        ...(recent.length ? [{ header: "Recent" }] : []),
        ...recent.map(a => ({ ...a, _cat: "Recent" })),
        { header: "Navigation" },
        ...nav.map(a => ({ ...a, _cat: "Navigation" })),
        { header: "Actions" },
        ...acts.map(a => ({ ...a, _cat: "Actions" })),
      ];
    }
    // Score and rank
    const scored = actions.map(a => ({
      ...a,
      score: Math.max(
        fuzzyMatch(query, a.label),
        fuzzyMatch(query, a.desc || ""),
        fuzzyMatch(query, a.keywords || ""),
        fuzzyMatch(query, a.category),
      ),
    })).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    // Group by category, max 4 per group
    const groups: Record<string, typeof scored> = {};
    scored.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      if (groups[s.category].length < 4) groups[s.category].push(s);
    });

    const out: (CmdAction & { _cat?: string } | { header: string })[] = [];
    Object.entries(groups).forEach(([cat, items]) => {
      out.push({ header: cat });
      items.forEach(item => out.push({ ...item, _cat: cat }));
    });

    // Add AI fallback if few results
    if (scored.length < 3) {
      out.push({ header: "AI" });
      out.push({ id: "_ai", icon: "🤖", label: `Ask AI: "${query}"`, desc: "Send this question to AI Espresso", category: "AI", action: () => { onClose(); /* AI action handled by parent */ }, _cat: "AI" });
    }
    return out;
  }, [query, actions, recentIds, onClose]);

  const actionItems = results.filter((r): r is CmdAction & { _cat?: string } => !("header" in r));

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, actionItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && actionItems[selectedIdx]) { actionItems[selectedIdx].action(); onClose(); }
    else if (e.key === "Escape") { onClose(); }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
  const mod = isMac ? "⌘" : "Ctrl+";

  let actionIdx = -1;

  return <motion.div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} onKeyDown={handleTrapKey}>
    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }} />
    <motion.div ref={containerRef} className="relative w-[580px] max-h-[60vh] flex flex-col rounded-2xl border border-[var(--border)] overflow-hidden" style={{ background: "var(--surface-1)", boxShadow: "var(--shadow-4)" }} initial={{ opacity: 0, scale: 0.96, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()}>
      {/* Search input */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
        <span className="text-[18px] text-[var(--text-muted)]">🔍</span>
        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey} placeholder="Search anything..." title="Command Palette (Cmd+K)" className="flex-1 bg-transparent text-[18px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] font-heading" />
        <span className="text-[12px] text-[var(--text-muted)] px-1.5 py-0.5 rounded border border-[var(--border)] font-data">ESC</span>
      </div>
      {/* Results */}
      <div ref={listRef} className="overflow-y-auto flex-1 py-2" style={{ maxHeight: "calc(60vh - 70px)" }}>
        {results.length === 0 && <div className="px-5 py-8 text-center text-[var(--text-muted)]">No results for &ldquo;{query}&rdquo;</div>}
        {results.map((item, i) => {
          if ("header" in item) {
            return <div key={`h-${item.header}-${i}`} className="px-5 pt-3 pb-1"><span className="text-[12px] font-bold text-[var(--accent-primary)] uppercase tracking-[1px] font-heading">{item.header}</span></div>;
          }
          actionIdx++;
          const idx = actionIdx;
          const isSelected = idx === selectedIdx;
          return <div key={item.id} data-idx={idx} className="px-3 mx-2 py-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-colors" style={{ background: isSelected ? "rgba(212,134,10,0.1)" : "transparent", borderLeft: isSelected ? "2px solid var(--accent-primary)" : "2px solid transparent" }} onClick={() => { item.action(); onClose(); }} onMouseEnter={() => setSelectedIdx(idx)}>
            <span className="text-[18px] w-7 text-center shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-[var(--text-primary)] truncate">{item.label}</div>
              {item.desc && <div className="text-[13px] text-[var(--text-muted)] truncate">{item.desc}</div>}
            </div>
            {item.shortcut && <div className="flex items-center gap-0.5 shrink-0">{item.shortcut.split("+").map((k, ki) => <Kbd key={ki}>{k === "Cmd" ? mod.replace("+", "") : k}</Kbd>)}</div>}
          </div>;
        })}
      </div>
    </motion.div>
  </motion.div>;
}

// ── Annotation System ──
export type Annotation = {
  id: string; moduleId: string; tabId: string; xPct: number; yPct: number;
  text: string; color: string; tag: string; priority: "Low" | "Medium" | "High";
  resolved: boolean; createdAt: string; author: string;
};

const ANNO_COLORS = [
  { id: "amber", hex: "var(--accent-primary)", label: "Insight" },
  { id: "red", hex: "var(--risk)", label: "Risk" },
  { id: "green", hex: "var(--success)", label: "Opportunity" },
  { id: "blue", hex: "#3B82F6", label: "Question" },
  { id: "purple", hex: "var(--purple)", label: "Action" },
];

export function AnnotationLayer({ annotations, moduleId, onAdd, onUpdate, onDelete, annotateMode, children }: {
  annotations: Annotation[]; moduleId: string;
  onAdd: (a: Annotation) => void; onUpdate: (a: Annotation) => void; onDelete: (id: string) => void;
  annotateMode: boolean; children?: React.ReactNode;
}) {
  const [creating, setCreating] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [newColor, setNewColor] = useState("amber");
  const [newTag, setNewTag] = useState("");
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const containerRef = useRef<HTMLDivElement>(null);

  const moduleAnnos = annotations.filter(a => a.moduleId === moduleId && !a.resolved);
  const resolvedAnnos = annotations.filter(a => a.moduleId === moduleId && a.resolved);

  const handleClick = (e: React.MouseEvent) => {
    if (!annotateMode || creating || editingId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setCreating({ x: xPct, y: yPct });
    setNewText(""); setNewColor("amber"); setNewTag(""); setNewPriority("Medium");
  };

  const saveNew = () => {
    if (!creating || !newText.trim()) return;
    onAdd({
      id: `anno_${Date.now()}`, moduleId, tabId: "", xPct: creating.x, yPct: creating.y,
      text: newText.trim(), color: newColor, tag: newTag, priority: newPriority,
      resolved: false, createdAt: new Date().toISOString().split("T")[0], author: "You",
    });
    setCreating(null);
  };

  const colorHex = (id: string) => ANNO_COLORS.find(c => c.id === id)?.hex || "var(--accent-primary)";
  const pinSize = (p: string) => p === "High" ? 20 : p === "Medium" ? 16 : 13;

  return <div ref={containerRef} className="relative" style={{ cursor: annotateMode ? "crosshair" : undefined }} onClick={handleClick}>
    {/* Pins */}
    {[...moduleAnnos, ...resolvedAnnos].map(a => {
      const isEditing = editingId === a.id;
      return <div key={a.id} className="absolute z-30 group" style={{ left: `${a.xPct}%`, top: `${a.yPct}%`, transform: "translate(-50%, -50%)" }}>
        {/* Pin dot */}
        <motion.div className="cursor-pointer" style={{ width: pinSize(a.priority), height: pinSize(a.priority), borderRadius: "50%", background: a.resolved ? "var(--text-muted)" : colorHex(a.color), boxShadow: `0 2px 6px ${a.resolved ? "rgba(0,0,0,0.2)" : colorHex(a.color)}40`, opacity: a.resolved ? 0.55 : 1, border: "2px solid rgba(255,255,255,0.3)" }}
          whileHover={{ scale: 1.3 }} onClick={e => { e.stopPropagation(); setEditingId(isEditing ? null : a.id); }} />
        {/* Hover tooltip */}
        {!isEditing && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" style={{ width: 200 }}>
          <div className="rounded-xl p-3 text-[13px]" style={{ background: "var(--surface-1)", border: `1px solid ${colorHex(a.color)}30`, boxShadow: "var(--shadow-2)" }}>
            <div className="font-semibold text-[var(--text-primary)] mb-1" style={{ textDecoration: a.resolved ? "line-through" : "none" }}>{a.text.slice(0, 80)}{a.text.length > 80 ? "..." : ""}</div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">{a.tag && <span>{a.tag}</span>}<span>{a.createdAt}</span><span className="font-semibold" style={{ color: colorHex(a.color) }}>{a.priority}</span></div>
          </div>
        </div>}
        {/* Edit panel */}
        {isEditing && <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-40" style={{ width: 280 }} onClick={e => e.stopPropagation()}>
          <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--surface-1)", border: `1px solid ${colorHex(a.color)}30`, boxShadow: "var(--shadow-3)" }}>
            <textarea value={a.text} onChange={e => onUpdate({ ...a, text: e.target.value })} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none resize-none" rows={3} />
            <div className="flex gap-1">{ANNO_COLORS.map(c => <button key={c.id} onClick={() => onUpdate({ ...a, color: c.id })} className="w-6 h-6 rounded-full border-2 transition-all" style={{ background: c.hex, borderColor: a.color === c.id ? "white" : "transparent", transform: a.color === c.id ? "scale(1.2)" : "scale(1)" }} title={c.label} />)}</div>
            <div className="flex gap-2">
              <button onClick={() => onUpdate({ ...a, resolved: !a.resolved })} className="flex-1 px-2 py-1 rounded-lg text-[12px] font-semibold border border-[var(--border)]" style={{ color: a.resolved ? "var(--success)" : "var(--text-muted)" }}>{a.resolved ? "✓ Resolved" : "Mark Resolved"}</button>
              <button onClick={() => { onDelete(a.id); setEditingId(null); }} className="px-2 py-1 rounded-lg text-[12px] font-semibold text-[var(--risk)] border border-[var(--border)]">Delete</button>
              <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded-lg text-[12px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Close</button>
            </div>
          </div>
        </div>}
      </div>;
    })}
    {/* Creation popup */}
    {creating && <div className="absolute z-40" style={{ left: `${creating.x}%`, top: `${creating.y}%`, transform: "translate(-50%, 10px)" }} onClick={e => e.stopPropagation()}>
      <motion.div className="rounded-xl p-4 space-y-3" style={{ width: 280, background: "var(--surface-1)", border: "1px solid var(--accent-primary)", boxShadow: "var(--shadow-3)" }} initial={{ opacity: 0, y: -5, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }}>
        <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Add your observation..." className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] outline-none resize-none placeholder:text-[var(--text-muted)]" rows={3} maxLength={500} autoFocus />
        <div className="flex items-center gap-2">
          <div className="flex gap-1">{ANNO_COLORS.map(c => <button key={c.id} onClick={() => setNewColor(c.id)} className="w-5 h-5 rounded-full border-2 transition-all" style={{ background: c.hex, borderColor: newColor === c.id ? "white" : "transparent", transform: newColor === c.id ? "scale(1.2)" : "scale(1)" }} title={c.label} />)}</div>
          <select value={newPriority} onChange={e => setNewPriority(e.target.value as Annotation["priority"])} className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[12px] text-[var(--text-primary)] outline-none"><option>Low</option><option>Medium</option><option>High</option></select>
        </div>
        <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Tag (CEO, CHRO, HRBP...)" className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
        <div className="flex gap-2">
          <button onClick={saveNew} disabled={!newText.trim()} className="flex-1 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "var(--accent-primary)", opacity: newText.trim() ? 1 : 0.4 }}>Save Note</button>
          <button onClick={() => setCreating(null)} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Cancel</button>
        </div>
      </motion.div>
    </div>}
    {children}
  </div>;
}

export function AnnotationPanel({ annotations, onUpdate, onDelete, onClose, onScrollTo }: {
  annotations: Annotation[]; onUpdate: (a: Annotation) => void; onDelete: (id: string) => void; onClose: () => void; onScrollTo?: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [colorFilter, setColorFilter] = useState("all");
  const filtered = annotations.filter(a => {
    if (filter === "open" && a.resolved) return false;
    if (filter === "resolved" && !a.resolved) return false;
    if (colorFilter !== "all" && a.color !== colorFilter) return false;
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return <motion.div className="fixed top-0 right-0 bottom-0 w-[340px] z-[9998] flex flex-col" style={{ background: "var(--surface-1)", borderLeft: "1px solid var(--border)", boxShadow: "-4px 0 20px rgba(0,0,0,0.15)" }} initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} transition={{ duration: 0.25, ease: "easeOut" }}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
      <span className="text-[16px] font-bold text-[var(--text-primary)] font-heading">Notes ({annotations.length})</span>
      <button onClick={onClose} className="text-[16px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
    </div>
    <div className="flex gap-1 px-4 py-2 border-b border-[var(--border)]">
      {(["all", "open", "resolved"] as const).map(f => <button key={f} onClick={() => setFilter(f)} className="px-2 py-1 rounded text-[12px] font-semibold transition-all" style={{ background: filter === f ? "rgba(212,134,10,0.12)" : "transparent", color: filter === f ? "var(--accent-primary)" : "var(--text-muted)" }}>{f === "all" ? "All" : f === "open" ? "Open" : "Resolved"}</button>)}
      <div className="ml-auto flex gap-0.5">{ANNO_COLORS.map(c => <button key={c.id} onClick={() => setColorFilter(colorFilter === c.id ? "all" : c.id)} className="w-4 h-4 rounded-full transition-all" style={{ background: c.hex, opacity: colorFilter === "all" || colorFilter === c.id ? 1 : 0.3, border: colorFilter === c.id ? "2px solid white" : "none" }} />)}</div>
    </div>
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {filtered.length === 0 && <div className="text-center py-8 text-[var(--text-muted)] text-[14px]">No notes yet. Toggle annotate mode and click on any content to add notes.</div>}
      {filtered.map(a => <div key={a.id} className="rounded-xl p-3 cursor-pointer transition-all hover:border-[var(--accent-primary)]/30" style={{ background: "var(--surface-2)", borderLeft: `3px solid ${ANNO_COLORS.find(c => c.id === a.color)?.hex || "#888"}`, border: `1px solid "var(--border)"` }} onClick={() => onScrollTo?.(a.id)}>
        <div className="text-[14px] text-[var(--text-primary)]" style={{ textDecoration: a.resolved ? "line-through" : "none", opacity: a.resolved ? 0.5 : 1 }}>{a.text}</div>
        <div className="flex items-center gap-2 mt-1.5 text-[12px] text-[var(--text-muted)]">
          {a.tag && <span className="px-1.5 py-0.5 rounded bg-[var(--bg)] text-[11px]">{a.tag}</span>}
          <span>{a.priority}</span><span>{a.createdAt}</span><span className="ml-auto">{a.moduleId}</span>
        </div>
        <div className="flex gap-1 mt-2">
          <button onClick={e => { e.stopPropagation(); onUpdate({ ...a, resolved: !a.resolved }); }} className="text-[11px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--success)]">{a.resolved ? "Reopen" : "Resolve"}</button>
          <button onClick={e => { e.stopPropagation(); onDelete(a.id); }} className="text-[11px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--risk)]">Delete</button>
        </div>
      </div>)}
    </div>
  </motion.div>;
}

/** Smart number formatting: currency ($1.2M), headcount (1,200), percentage (45.3%) */
export { fmt } from "../../../lib/formatters";
export function fmtNum(value: number | string | null | undefined, type: "currency" | "headcount" | "percentage" = "currency"): string {
  const n = Number(value ?? 0);
  if (!isFinite(n)) return "\u2014";
  if (type === "percentage") { const s = n.toFixed(1); return `${s.replace(/\.0$/, "")}%`; }
  if (type === "headcount") return n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : Math.round(n).toLocaleString();
  // currency
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs < 1000) return `${sign}$${Math.round(abs).toLocaleString()}`;
  if (abs < 1e6) return `${sign}$${(abs / 1000).toFixed(abs < 10000 ? 1 : 0).replace(/\.0$/, "")}K`;
  if (abs < 1e9) return `${sign}$${(abs / 1e6).toFixed(abs < 100e6 ? 1 : 0).replace(/\.0$/, "")}M`;
  return `${sign}$${(abs / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
}

/* ── AI Helper — routes all AI calls through backend Claude API proxy ── */
let _aiRemaining = 200;
export function getAiRemaining() { return _aiRemaining; }

export async function callAI(system: string, message: string, retries = 1): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const resp = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ system, message }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1500)); continue; }
        return "[AI is temporarily unavailable — check that your backend is running and try again]";
      }
      const data = await resp.json();
      // Track remaining requests
      if (typeof data.remaining === "number") _aiRemaining = data.remaining;
      if (!data.error) trackAIFeatureUsed("ai_generate");
      if (data.error) {
        // Don't retry on key/rate errors — they won't resolve
        if (data.text?.includes("ANTHROPIC_API_KEY") || data.text?.includes("Rate limit") || data.text?.includes("API key")) {
          return data.text;
        }
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1500)); continue; }
        return data.text || "[AI error — try again]";
      }
      return data.text || "";
    } catch (e) {
      console.error(`AI call attempt ${attempt + 1} failed:`, e);
      if (attempt < retries) { await new Promise(r => setTimeout(r, 1500)); continue; }
      return "[Couldn't reach the AI service — check your connection and try again]";
    }
  }
  return "";
}

// ── AI Insight Card — reusable collapsible card for Claude-powered insights ──
export function AiInsightCard({ title, contextData, systemPrompt, moduleId }: { title: string; contextData: string; systemPrompt?: string; moduleId?: string }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    const sys = systemPrompt || "You are an AI transformation consultant. Provide 3 concise, actionable insights based on the data. Be specific with numbers. No markdown formatting.";
    const result = await callAI(sys, `Analyze this data and provide key insights: ${contextData.slice(0, 3000)}`);
    setInsight(result);
    setGenerated(true);
    setExpanded(true);
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(insight).then(() => showToast("Copied to clipboard"));
  };

  return <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl overflow-hidden mb-3 transition-all hover:border-[var(--accent-primary)]/20">
    <button onClick={() => generated ? setExpanded(!expanded) : generate()} className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[var(--hover)]">
      <span className="text-[14px]">{loading ? "⏳" : "✨"}</span>
      <span className="text-[15px] font-semibold text-[var(--text-primary)] flex-1 font-heading">{title}</span>
      {loading && <span className="text-[15px] text-[var(--accent-primary)]">Generating...</span>}
      {generated && !loading && <span className="text-[15px] text-[var(--text-muted)]">{expanded ? "▲" : "▼"}</span>}
      {!generated && !loading && <span className="text-[15px] text-[var(--accent-primary)] font-semibold">Generate</span>}
    </button>
    {expanded && insight && <div className="px-4 pb-3 border-t border-[var(--border)]">
      <div className="text-[15px] text-[var(--text-secondary)] leading-relaxed mt-3 whitespace-pre-line">{insight}</div>
      <div className="flex gap-2 mt-3">
        <button onClick={copy} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">📋 Copy</button>
        <button onClick={generate} disabled={loading} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">↻ Regenerate</button>
      </div>
    </div>}
  </div>;
}

// Global toast notification
export function ModuleExportButton({ model, module, label }: { model: string; module: string; label?: string }) {
  const [exporting, setExporting] = useState(false);
  return <button onClick={async () => {
    setExporting(true);
    try {
      const resp = await api.apiFetch(`/api/export/module/${model}/${module}`);
      if (resp.ok) { const blob = await resp.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${module}_export.xlsx`; a.click(); URL.revokeObjectURL(url); showToast(`📥 ${label || module} exported`); trackExportGenerated("xlsx"); }
      else showToast("Couldn't export — try again in a moment");
    } catch { showToast("Couldn't export — check that the backend is running"); }
    setExporting(false);
  }} disabled={exporting} className="btn-interactive px-3 py-1 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent-primary)]/30 hover:text-[var(--accent-primary)]" style={{opacity: exporting ? 0.5 : 1}}>
    {exporting ? "..." : "↓ Export"}
  </button>;
}

/* ═══════════════════════════════════════════════════════════════
   ERROR BOUNDARY — prevents white screen crashes
   ═══════════════════════════════════════════════════════════════ */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode; onBack?: () => void; onNavigate?: (id: string) => void; onExitProject?: () => void }, { hasError: boolean; error: Error | null; retryCount: number }> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode; onBack?: () => void; onNavigate?: (id: string) => void; onExitProject?: () => void }) { super(props); this.state = { hasError: false, error: null, retryCount: 0 }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return this.props.fallback || <div className="p-8 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Something went wrong</h3>
      <p className="text-[15px] text-[var(--text-secondary)] mb-4 max-w-md mx-auto">{this.state.error?.message || "An unexpected error occurred."}</p>
      <div className="flex gap-3 justify-center flex-wrap mb-4">
        {this.props.onBack && <button onClick={() => { this.setState({ hasError: false, error: null, retryCount: 0 }); this.props.onBack!(); }} className="px-4 py-2 rounded-lg text-[15px] font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)] transition-colors">← Back to Overview</button>}
        <button onClick={() => { if (this.state.retryCount >= 2) { if (this.props.onBack) this.props.onBack(); else this.setState({ hasError: false, error: null, retryCount: 0 }); } else { this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 })); } }} className="px-4 py-2 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white">{this.state.retryCount >= 2 ? "Go to Overview (retry limit)" : "Clear & Retry"}</button>
        {this.props.onExitProject && <button onClick={() => { this.setState({ hasError: false, error: null, retryCount: 0 }); this.props.onExitProject!(); }} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-[var(--risk)] border border-[var(--risk)]/30 hover:bg-[var(--risk)]/5 transition-colors">Exit Project</button>}
      </div>
      {this.props.onNavigate && <div className="border-t border-[var(--border)] pt-4 mt-4">
        <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Switch Module</div>
        <div className="flex gap-2 justify-center flex-wrap">{[
          { id: "snapshot", label: "Overview", icon: "📊" },
          { id: "jobarch", label: "Jobs", icon: "🏗️" },
          { id: "scan", label: "AI Scan", icon: "🔬" },
          { id: "design", label: "Design", icon: "✏️" },
          { id: "simulate", label: "Simulate", icon: "⚡" },
          { id: "plan", label: "Mobilize", icon: "🚀" },
        ].map(m => <button key={m.id} onClick={() => { this.setState({ hasError: false, error: null, retryCount: 0 }); this.props.onNavigate!(m.id); }} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--hover)] transition-all">{m.icon} {m.label}</button>)}</div>
      </div>}
    </div>;
    return this.props.children;
  }
}

export function KpiCard({ label, value, accent, delta }: { label: string; value: string | number; accent?: boolean; delta?: string }) {
  const numVal = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  const isNum = !isNaN(numVal) && typeof value === "number";
  return <motion.div className={`bg-[var(--surface-1)] border rounded-2xl px-5 py-4 ${accent ? "border-l-[3px] border-l-[var(--accent-primary)] border-[var(--border)]" : "border-[var(--border)]"}`} style={{ boxShadow: "var(--shadow-1)" }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -2, boxShadow: "var(--shadow-3)" }}>
    <div className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.5px] mb-1.5 font-heading"><GlossaryTip term={label}>{label}</GlossaryTip></div>
    <div className="text-[24px] font-extrabold text-[var(--text-primary)] tracking-tight font-data">{isNum ? <AnimatedNumber value={numVal} /> : (typeof value === "string" || typeof value === "number" ? value : String(value ?? "\u2014"))}</div>
    {delta && <div className="text-[14px] font-semibold text-[var(--success)] mt-1.5">{delta}</div>}
  </motion.div>;
}

export function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return <motion.div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl mb-5" style={{ padding: "var(--card-padding)", boxShadow: "var(--shadow-1)" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
    {title && <h3 className="text-[18px] font-semibold text-[var(--text-primary)] pb-3 mb-4 border-b border-[var(--border)] font-heading">{title}</h3>}
    {children}
  </motion.div>;
}

export function Empty({ text, icon = "📭", action, onAction }: { text: string; icon?: string; action?: string; onAction?: () => void }) {
  return <div className="text-center py-12 text-[var(--text-secondary)]">
    <div className="relative inline-block mb-3">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="opacity-25 mx-auto"><circle cx="24" cy="24" r="20" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4 4" /><circle cx="24" cy="24" r="10" stroke="var(--accent-primary)" strokeWidth="1" opacity="0.55" /></svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-55">{icon}</div>
    </div>
    <div className="text-sm max-w-sm mx-auto leading-relaxed">{text}</div>
    {action && onAction && <button onClick={onAction} className="btn-interactive mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent-primary)] text-white">{action}</button>}
  </div>;
}

export function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const s: Record<string, string> = { indigo: "bg-[rgba(212,134,10,0.15)] text-[var(--accent-primary)]", green: "bg-[rgba(16,185,129,0.15)] text-[var(--success)]", amber: "bg-[rgba(249,115,22,0.15)] text-[var(--warning)]", red: "bg-[rgba(239,68,68,0.15)] text-[var(--risk)]", purple: "bg-[rgba(139,92,246,0.15)] text-[var(--purple)]", gray: "bg-[rgba(163,177,198,0.12)] text-[var(--text-muted)]", teal: "bg-[rgba(14,165,233,0.15)] text-[#0EA5E9]" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[14px] font-semibold tracking-wide ${s[color] || s.gray}`}>{children}</span>;
}

export function InsightPanel({ title, items, icon = "💡" }: { title: string; items: string[]; icon?: string }) {
  return <Card><div className="flex items-center gap-2 text-[15px] font-bold mb-2">{icon} {title}</div><ul className="list-disc pl-4 space-y-1 text-[15px] text-[var(--text-secondary)] leading-relaxed">{items.map((t, i) => <li key={i}>{t}</li>)}</ul></Card>;
}

export function HelpBookAccordion() {
  const [expandedId, setExpandedId] = useState<string|null>(null);
  return <div className="space-y-1">{Object.entries(MODULE_HELP).map(([id, h]) => <div key={id} className="rounded-xl border border-[var(--border)] overflow-hidden">
    <button onClick={() => setExpandedId(expandedId === id ? null : id)} className="w-full text-left px-4 py-2.5 flex items-center justify-between bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors cursor-pointer">
      <div className="flex items-center gap-2"><span className="text-[15px] font-bold text-[var(--accent-primary)]">{id.toUpperCase()}</span><span className="text-[15px] font-semibold text-[var(--text-primary)]">{h.title}</span></div>
      <span className="text-[var(--text-muted)] text-[15px]">{expandedId === id ? "▲" : "▼"}</span>
    </button>
    {expandedId === id && <div className="px-4 py-3 bg-[var(--surface-1)]">
      <p className="text-[15px] text-[var(--text-secondary)] mb-2">{h.summary}</p>
      {h.pages && h.pages.map((p, i) => <div key={i} className="ml-2 mb-2"><div className="text-[15px] font-bold text-[var(--text-primary)]">{p.heading}</div><div className="text-[15px] text-[var(--text-muted)] leading-relaxed">{p.body}</div></div>)}
    </div>}
  </div>)}</div>;
}

export function CareerFrameworkAccordion() {
  const [expandedIdx, setExpandedIdx] = useState<number|null>(0);
  return <>{CAREER_FRAMEWORKS.map((fw, fi) => <div key={fi} className="mb-3 rounded-xl border border-[var(--border)] overflow-hidden">
    <button onClick={() => setExpandedIdx(expandedIdx === fi ? null : fi)} className="w-full text-left px-4 py-3 flex items-center justify-between bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors cursor-pointer">
      <div className="flex items-center gap-2"><Badge color="purple">{fw.industry}</Badge><span className="text-[15px] font-bold text-[var(--text-primary)]">{fw.name}</span><span className="text-[15px] text-[var(--text-muted)]">{fw.levels.length} levels</span></div>
      <span className="text-[var(--text-muted)] text-[15px]">{expandedIdx === fi ? "▲" : "▼"}</span>
    </button>
    {expandedIdx === fi && <div className="overflow-x-auto"><table className="w-full text-[15px]"><thead><tr className="bg-[var(--surface-2)]">
      {["Level","Title","Track","Span","Focus","Comp Range"].map(h => <th key={h} className="px-3 py-2 text-left border-b border-[var(--border)] text-[var(--text-muted)] font-semibold uppercase text-[14px]">{h}</th>)}
    </tr></thead><tbody>
      {fw.levels.map((l, li) => <tr key={li} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
        <td className="px-3 py-2 font-bold text-[var(--accent-primary)]">{l.code}</td>
        <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">{l.title}</td>
        <td className="px-3 py-2"><Badge color={l.track.includes("Executive")?"purple":l.track.includes("Manager")?"amber":"indigo"}>{l.track}</Badge></td>
        <td className="px-3 py-2 text-[var(--text-muted)]">{l.span}</td>
        <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[200px]">{l.focus}</td>
        <td className="px-3 py-2 font-semibold text-[var(--success)]">{l.comp_range}</td>
      </tr>)}
    </tbody></table></div>}
  </div>)}</>;
}

export function InfoButton({ moduleId }: { moduleId: string }) {
  const [open, setOpen] = useState(false);
  // Check both old MODULE_HELP and new KnowledgeBase for content
  const hasOldHelp = !!MODULE_HELP[moduleId];
  const title = MODULE_HELP[moduleId]?.title || moduleId;
  // Dynamic import to avoid circular dependency
  const [KnowledgeModal, setKM] = useState<React.ComponentType<{moduleId: string; onClose: () => void}> | null>(null);
  const loadModal = () => {
    import("../KnowledgeBase").then(m => { setKM(() => m.KnowledgeModal); setOpen(true); });
  };
  if (!hasOldHelp) return null;
  return <>
    <button onClick={loadModal} className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[15px] cursor-pointer transition-all hover:scale-110" style={{ background: "rgba(212,134,10,0.1)", border: "1px solid rgba(212,134,10,0.2)", color: "var(--accent-primary)" }} title={`Help: ${title}`}>ℹ</button>
    {open && KnowledgeModal && <KnowledgeModal moduleId={moduleId} onClose={() => setOpen(false)} />}
  </>;
}


export function NarrativePanel({ title, items }: { title: string; items: string[] }) {
  return <div className="bg-gradient-to-br from-[var(--surface-2)] via-[rgba(212,134,10,0.06)] to-[var(--surface-1)] rounded-2xl px-7 py-6 text-[var(--text-primary)] border border-[var(--border)] mb-4"><div className="text-sm font-bold mb-3">{title}</div>{items.map((t, i) => <div key={i} className="text-[15px] text-[var(--text-secondary)] mb-1.5 pl-4 relative"><span className="absolute left-0 text-[var(--accent-primary)] font-bold">›</span>{t}</div>)}</div>;
}

export function TabBar({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return <div className="flex border-b-2 border-[var(--border)] mb-6 gap-0 overflow-x-auto">{tabs.map(t => <button key={t.id} onClick={() => onChange(t.id)} className={`px-4 py-3 text-[15px] font-medium whitespace-nowrap -mb-[2px] border-b-2 transition-all btn-press ${active === t.id ? "text-[var(--accent-primary)] font-semibold border-[var(--accent-primary)]" : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--border)]"}`}>{t.label}</button>)}</div>;
}

export function SidebarSelect({ label, options, value, onChange }: { label?: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return <div className="mb-2">{label && <label className="block text-[15px] font-semibold text-[var(--text-muted)] tracking-wide mb-1">{label}</label>}<select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-[15px] text-[var(--text-primary)] focus:border-[var(--accent-primary)] outline-none appearance-none">{options.map(o => <option key={o} value={o} className="bg-[var(--surface-2)]">{o}</option>)}</select></div>;
}

export function ReadinessDot({ ready }: { ready: boolean }) { return <span className={`inline-block w-2 h-2 rounded-full mr-2 ${ready ? "bg-[var(--success)]" : "bg-[var(--risk)]"}`} />; }

export function ViewToggle({ viewCtx, onChangeView }: { viewCtx: ViewContext; onChangeView: () => void }) {
  const colors: Record<string, string> = { org: "var(--accent-primary)", job: "var(--success)", employee: "var(--purple)", custom: "var(--warning)" };
  const icons: Record<string, string> = { org: "🏢", job: "💼", employee: "👤", custom: "⚙️" };
  const labels: Record<string, string> = { org: "Org-Wide", job: viewCtx.job || "Job", employee: viewCtx.employee || "Employee", custom: "Custom" };
  return <button onClick={onChangeView} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[15px] font-semibold transition-all hover:opacity-80" style={{ background: `${colors[viewCtx.mode]}15`, border: `1px solid ${colors[viewCtx.mode]}30`, color: colors[viewCtx.mode] }}>
    {icons[viewCtx.mode]} {labels[viewCtx.mode]} <span className="text-[14px] opacity-60">↻</span>
  </button>;
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data?.length) return;
  const cols = Object.keys(data[0]);
  const csv = [cols.join(","), ...data.map(row => cols.map(c => { const v = String(row[c] ?? ""); return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v; }).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
  trackExportGenerated("csv");
}

export function PageHeader({ icon, title, subtitle, onBack, moduleId, onUpload, viewCtx, onViewChange }: { icon: string; title: string; subtitle: string; onBack: () => void; moduleId?: string; onUpload?: (files: FileList) => void; viewCtx?: ViewContext; onViewChange?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MODULE_DATA_LABELS: Record<string, string> = { snapshot: "Workforce", jobs: "Job Catalog", scan: "Work Design", design: "Work Design", simulate: "Work Design", build: "Org Design", plan: "Change Mgmt", opmodel: "Operating Model" };
  const dataLabel = moduleId ? MODULE_DATA_LABELS[moduleId] : null;
  const noTemplate = moduleId === "opmodel"; // Op Model Lab is a sandbox, no upload needed

  return <div className="mb-6">
    <button onClick={onBack} title="Go back (Escape)" className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-3 flex items-center gap-1 transition-colors">← {(() => { if (!moduleId) return "Back to Home"; const mod = MODULES.find(m => m.id === moduleId); if (!mod) return "Back to Home"; const phase = PHASES.find(p => p.modules.includes(moduleId)); return phase ? `Back to ${phase.label}` : "Back to Home"; })()}</button>
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--teal)] flex items-center justify-center text-xl" style={{ boxShadow: "var(--shadow-1)" }}>{icon}</div>
        <div><h1 className="text-[22px] font-extrabold text-[var(--text-primary)] tracking-tight font-heading">{title}</h1><p className="text-[16px] text-[var(--text-secondary)]">{subtitle}</p></div>
        {moduleId && <InfoButton moduleId={moduleId} />}
      </div>
      <div className="flex items-center gap-2">
        {viewCtx && viewCtx.mode !== "org" && onViewChange && <ViewToggle viewCtx={viewCtx} onChangeView={onViewChange} />}
      {moduleId && !noTemplate && <>
        <a href={`/api/template/${moduleId}`} download className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[15px] font-semibold transition-all bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] no-underline">⬇ {dataLabel} Template</a>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { if (e.target.files && onUpload) onUpload(e.target.files); }} />
        <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[15px] font-semibold transition-all bg-[var(--accent-primary)] text-white hover:opacity-90">⬆ Upload {dataLabel}</button>
      </>}
      </div>
    </div>
  </div>;
}

export function ContextStrip({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-2.5 mb-5 flex items-center gap-3 flex-wrap">
    <span className="text-[15px] font-bold text-[var(--accent-primary)]">From prior steps:</span>
    {items.map((t, i) => <span key={i} className="text-[15px] text-[var(--text-secondary)]">{t}</span>)}
  </div>;
}

export function LoadingBar() {
  // Only render after 300ms to prevent flash for fast loads
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return <div className="w-full h-1 bg-[var(--surface-2)] rounded-full overflow-hidden mb-4" style={{ animation: "fadeIn 0.2s ease" }}><div className="h-full bg-[var(--accent-primary)] rounded-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: "40%" }} /></div>;
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return <div className="space-y-3" style={{ animation: "fadeIn 0.2s ease" }}>{Array.from({ length: rows }, (_, i) => <div key={i} className="flex gap-3"><div className="h-4 skeleton w-1/4" /><div className="h-4 skeleton w-1/2" /><div className="h-4 skeleton w-1/4" /></div>)}</div>;
}

export function EmptyWithAction({ text, icon = "📭", actionLabel, onAction }: { text: string; icon?: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="text-center py-12 text-[var(--text-secondary)]">
    <div className="text-3xl mb-2 opacity-55">{icon}</div>
    <div className="text-sm max-w-xs mx-auto leading-relaxed mb-3">{text}</div>
    {actionLabel && onAction && <button onClick={onAction} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">{actionLabel}</button>}
  </div>;
}

export function NextStepBar({ currentModuleId, onNavigate }: { currentModuleId: string; onNavigate: (id: string) => void }) {
  const currentIdx = MODULES.findIndex(m => m.id === currentModuleId);
  const next = currentIdx >= 0 && currentIdx < MODULES.length - 1 ? MODULES[currentIdx + 1] : null;
  const prev = currentIdx > 0 ? MODULES[currentIdx - 1] : null;
  if (!prev && !next) return null;
  return <div className="mt-8 pt-4 border-t border-[var(--border)] flex items-center justify-between">
    {prev ? <button onClick={() => onNavigate(prev.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[15px] font-semibold transition-all hover:opacity-90" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>← {prev.icon} {prev.title}</button> : <div />}
    {next ? <button onClick={() => onNavigate(next.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[15px] font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">Next: {next.icon} {next.title} →</button> : <div />}
  </div>;
}

// ── AI Espresso ──
export interface AiMessage { role: "user" | "assistant"; content: string }

export function AiEspressoPanel({ moduleId, contextData, isGlobal = false }: { moduleId: string; contextData?: string; isGlobal?: boolean }) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePrompt, setActivePrompt] = useState<number | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const prompts = MODULE_QUICK_PROMPTS[moduleId] || [];

  const systemPrompt = isGlobal
    ? `You are the AI Espresso engine for the AI Transformation Platform. You have full context about the user's transformation journey. Provide strategic, actionable recommendations. Be specific with numbers when possible. Context: ${contextData || "No data loaded."}`
    : `You are an expert AI transformation consultant. ${MODULE_AI_PROMPTS[moduleId] || ""} Keep responses concise (2-4 paragraphs), actionable, and specific. Context: ${contextData || "No data loaded."}`;

  const sendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    const userMsg: AiMessage = { role: "user", content: message.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setActivePrompt(null);
    setPromptInput("");
    setEditingPrompt(null);
    setLoading(true);

    const chatHistory = newMessages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    const aiText = await callAI(systemPrompt, chatHistory) || "I couldn't generate a response. Please try again.";
    setMessages(prev => [...prev, { role: "assistant", content: aiText }]);
    setLoading(false);
  };

  const handlePromptClick = (idx: number) => {
    const p = prompts[idx];
    if (p.needsInput) {
      setActivePrompt(idx);
      setEditingPrompt(p.prompt);
    } else {
      setEditingPrompt(null);
      sendMessage(p.prompt);
    }
  };

  return <div className="flex flex-col h-full">
    {/* Quick prompts — toggleable cards */}
    {messages.length === 0 && <div className="px-4 pt-3 pb-2">
      <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{isGlobal ? "Platform-wide actions" : "Quick actions"}</div>
      <div className="space-y-1.5">
        {prompts.map((p, i) => <div key={i}>
          <button onClick={() => handlePromptClick(i)} className="w-full text-left px-3 py-2.5 rounded-xl text-[15px] transition-all flex items-center justify-between group" style={{ background: activePrompt === i ? "rgba(224,144,64,0.1)" : "var(--surface-2)", border: activePrompt === i ? "1px solid rgba(224,144,64,0.3)" : "1px solid var(--border)" }} onMouseEnter={e => { if (activePrompt !== i) e.currentTarget.style.borderColor = "rgba(224,144,64,0.15)"; }} onMouseLeave={e => { if (activePrompt !== i) e.currentTarget.style.borderColor = "var(--border)"; }}>
            <span className="font-semibold" style={{ color: activePrompt === i ? "#f0a050" : "var(--text-primary)" }}>{p.label}</span>
            <span className="text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">{p.needsInput ? "✎" : "→"}</span>
          </button>
          {/* Input dialog for prompts that need user input */}
          {activePrompt === i && p.needsInput && <div className="mt-1.5 ml-3 mr-1 p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid rgba(224,144,64,0.2)" }}>
            <div className="text-[15px] font-semibold text-[var(--text-muted)] mb-1.5">{p.inputLabel}</div>
            <input value={promptInput} onChange={e => setPromptInput(e.target.value)} placeholder={p.inputPlaceholder} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none focus:border-[rgba(224,144,64,0.3)] placeholder:text-[var(--text-muted)] mb-2" onKeyDown={e => { if (e.key === "Enter" && promptInput.trim()) sendMessage(`${p.prompt} ${p.inputLabel}: ${promptInput.trim()}`); }} />
            <div className="text-[15px] text-[var(--text-muted)] mb-2 italic">Prompt: {p.prompt}</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActivePrompt(null)} className="px-3 py-1.5 rounded-lg text-[15px] text-[var(--text-muted)]">Cancel</button>
              <button onClick={() => { if (promptInput.trim()) sendMessage(`${p.prompt} ${p.inputLabel}: ${promptInput.trim()}`); }} disabled={!promptInput.trim()} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: promptInput.trim() ? 1 : 0.4 }}>Run ☕</button>
            </div>
          </div>}
        </div>)}
      </div>
    </div>}

    {/* Messages */}
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: messages.length ? "50vh" : "0", minHeight: messages.length ? 120 : 0 }}>
      {messages.map((m, i) => <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-[15px] leading-relaxed" style={{ background: m.role === "user" ? "linear-gradient(135deg, var(--accent-primary), var(--teal))" : "var(--surface-2)", color: m.role === "user" ? "#fff" : "var(--text-primary)", borderBottomRightRadius: m.role === "user" ? 4 : 12, borderBottomLeftRadius: m.role === "user" ? 12 : 4 }}>
          {m.content.split("\n").map((line, li) => <div key={li} className={li > 0 ? "mt-1.5" : ""}>{line}</div>)}
        </div>
      </div>)}
      {loading && <div className="flex justify-start"><div className="rounded-xl px-4 py-2.5 text-[15px] flex items-center gap-2" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}><span className="inline-block w-4 h-4 rounded-full animate-pulse" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }} /> Brewing your espresso...</div></div>}
      <div ref={messagesEndRef} />
    </div>

    {/* Free-form input */}
    <div className="px-4 py-3 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
      <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendMessage(input); }} placeholder={messages.length ? "Follow up..." : "Or type your own question..."} className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[15px] text-[var(--text-primary)] outline-none focus:border-[rgba(224,144,64,0.3)] placeholder:text-[var(--text-muted)]" />
      <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="px-4 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>☕</button>
    </div>
  </div>;
}

export function AiEspressoButton({ moduleId, contextData, viewMode: vMode }: { moduleId: string; contextData?: string; viewMode?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"module" | "global">("module");
  const moduleName = MODULES.find(m => m.id === moduleId)?.title || "Platform";

  return <>
    {/* Floating espresso button */}
    <button onClick={() => setOpen(!open)} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl transition-all duration-300 hover:scale-105 group" style={{ background: open ? "var(--risk)" : "linear-gradient(135deg, var(--accent-primary), var(--teal))", boxShadow: open ? "0 8px 30px rgba(239,68,68,0.3)" : "0 8px 30px rgba(200,120,40,0.35)" }} title="AI Espresso">
      {open ? "✕" : "☕"}
    </button>

    {/* Panel */}
    {open && <div className="fixed bottom-24 right-6 z-40 w-[420px] rounded-2xl overflow-hidden shadow-2xl flex flex-col" style={{ background: "var(--surface-1)", border: "1px solid var(--border)", maxHeight: "75vh" }}>
      {/* Header with mode toggle */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, rgba(224,144,64,0.08), rgba(192,112,48,0.03))", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">☕</span>
          <div>
            <div className="text-[14px] font-bold text-[var(--text-primary)]">AI Espresso</div>
            <div className="text-[15px] text-[var(--text-muted)]">{mode === "module" ? moduleName : "Full Platform"} · {getAiRemaining()} requests left</div>
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
          <button onClick={() => setMode("module")} className="px-2.5 py-1 text-[15px] font-semibold transition-all" style={{ background: mode === "module" ? "rgba(224,144,64,0.15)" : "transparent", color: mode === "module" ? "#f0a050" : "var(--text-muted)" }}>This Module</button>
          <button onClick={() => setMode("global")} className="px-2.5 py-1 text-[15px] font-semibold transition-all" style={{ background: mode === "global" ? "rgba(224,144,64,0.15)" : "transparent", color: mode === "global" ? "#f0a050" : "var(--text-muted)" }}>Full Platform</button>
        </div>
      </div>

      {/* Content */}
      <AiEspressoPanel moduleId={mode === "global" ? "snapshot" : (vMode && vMode !== "org" && vMode !== "custom" ? `${moduleId}_${vMode}` : moduleId)} contextData={contextData} isGlobal={mode === "global"} />
    </div>}
  </>;
}

// ── AI Co-Pilot ──

type CoPilotSuggestion = { id: string; icon: string; text: string; action?: string; actionLabel?: string; moduleId: string };

const COPILOT_SUGGESTIONS: Record<string, (ctx: string) => CoPilotSuggestion[]> = {
  snapshot: () => [{ id: "s1", icon: "📊", text: "Review your workforce distribution across functions. Look for top-heavy structures or underrepresented areas.", actionLabel: "See Org Health →", action: "orghealth", moduleId: "snapshot" }],
  scan: () => [{ id: "s2", icon: "🔬", text: "Focus on tasks with >70% AI automation potential first — these are your quick wins for productivity gains.", actionLabel: "View Heatmap →", action: "heatmap", moduleId: "scan" }],
  design: () => [{ id: "s3", icon: "✏️", text: "Start with your highest-headcount roles — redesigning these creates the most organizational impact.", moduleId: "design" }],
  opmodel: () => [{ id: "s4", icon: "🧬", text: "Begin with Strategy (Step 1.1) to anchor all downstream decisions. Without strategic priorities, operating model choices lack direction.", moduleId: "opmodel" }],
  plan: () => [{ id: "s5", icon: "🚀", text: "Run the ADKAR assessment before building your roadmap — understanding resistance patterns prevents implementation failures.", actionLabel: "Open ADKAR →", moduleId: "plan" }],
  simulate: () => [{ id: "s6", icon: "⚡", text: "Compare the Balanced scenario first — it typically offers the best risk-adjusted return. Then stress-test with Conservative and Aggressive.", moduleId: "simulate" }],
  jobarch: () => [{ id: "s7", icon: "🏗️", text: "Check the Validation tab for structural issues — role consolidation opportunities are often hiding in similar titles across functions.", moduleId: "jobarch" }],
  home: () => [{ id: "s8", icon: "🏠", text: "Upload your workforce data to unlock all platform capabilities. The AI Transformation journey starts with understanding your current state.", moduleId: "home" }],
};

const COPILOT_QUICK_PROMPTS = [
  { label: "Summarize findings", prompt: "Summarize the key findings from the data visible in this module. Be specific with numbers." },
  { label: "What should I do next?", prompt: "Based on what I've done so far, what's the most impactful next step?" },
  { label: "Explain this metric", prompt: "Explain the key metrics shown in this module — what do they mean and why do they matter?" },
  { label: "Generate insight", prompt: "Generate a non-obvious insight from the data in this module that a senior consultant would highlight." },
];

export function AiCoPilot({ moduleId, contextData, open, onClose, onNavigate }: { moduleId: string; contextData?: string; open: boolean; onClose: () => void; onNavigate?: (id: string) => void }) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CoPilotSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiSugLoading, setAiSugLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const moduleName = MODULES.find(m => m.id === moduleId)?.title || "Platform";

  // Load proactive suggestions when module changes
  useEffect(() => {
    const gen = COPILOT_SUGGESTIONS[moduleId];
    if (gen) setSuggestions(gen(contextData || "").filter(s => !dismissed.has(s.id)));
    setAiSuggestion(null);
  }, [moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate AI suggestion after a delay
  useEffect(() => {
    if (!open || aiSugLoading || aiSuggestion || !contextData) return;
    const timer = setTimeout(async () => {
      setAiSugLoading(true);
      try {
        const result = await callAI("You are a proactive AI co-pilot. Give ONE specific, actionable suggestion (2 sentences max) based on this context. Be concrete with numbers.", `Module: ${moduleName}. Context: ${contextData?.slice(0, 1500)}`);
        if (result) setAiSuggestion(result);
      } catch (e) { console.error("[AiSuggestion] fetch failed", e); }
      setAiSugLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [open, moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const systemPrompt = `You are an expert AI transformation co-pilot embedded in the ${moduleName} module. ${MODULE_AI_PROMPTS[moduleId] || ""} Be concise (2-3 paragraphs), specific with numbers, and actionable. Context: ${contextData || "No data loaded."}`;

  const sendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    const userMsg: AiMessage = { role: "user", content: message.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput(""); setLoading(true);
    const chatHistory = newMessages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    const aiText = await callAI(systemPrompt, chatHistory) || "I couldn't generate a response. Please try again.";
    setMessages(prev => [...prev, { role: "assistant", content: aiText }]);
    setLoading(false);
  };

  if (!open) return null;

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id)).slice(0, 3);

  return <motion.div className="fixed top-0 right-0 bottom-0 z-[9997] flex flex-col" style={{ width: 380, background: "var(--surface-1)", borderLeft: "1px solid var(--border)", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }} initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }} transition={{ duration: 0.25, ease: "easeOut" }}>
    {/* Header */}
    <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]" style={{ background: "linear-gradient(135deg, rgba(224,144,64,0.06), transparent)" }}>
      <div className="flex items-center gap-2.5">
        <span className="text-[18px]">🤖</span>
        <div><div className="text-[15px] font-bold text-[var(--text-primary)] font-heading">AI Co-Pilot</div><div className="text-[12px] text-[var(--text-muted)]">{moduleName}{aiSugLoading ? " · Thinking..." : ""}</div></div>
      </div>
      <button onClick={onClose} className="text-[16px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
    </div>

    {/* Suggestions zone */}
    {(visibleSuggestions.length > 0 || aiSuggestion) && <div className="px-3 py-3 border-b border-[var(--border)] space-y-2 overflow-y-auto" style={{ maxHeight: "35vh" }}>
      <div className="text-[11px] font-bold text-[var(--accent-primary)] uppercase tracking-wider font-heading">Suggestions</div>
      {visibleSuggestions.map(s => <motion.div key={s.id} className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start gap-2">
          <span className="text-[16px] shrink-0 mt-0.5">{s.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{s.text}</div>
            <div className="flex items-center gap-2 mt-2">
              {s.action && onNavigate && <button onClick={() => onNavigate(s.action!)} className="text-[12px] font-semibold text-[var(--accent-primary)] hover:underline">{s.actionLabel || "Show me →"}</button>}
              <button onClick={() => setDismissed(prev => new Set([...prev, s.id]))} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-auto">Dismiss</button>
            </div>
          </div>
        </div>
      </motion.div>)}
      {aiSuggestion && <motion.div className="rounded-xl p-3" style={{ background: "rgba(212,134,10,0.06)", border: "1px solid rgba(212,134,10,0.15)" }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-2">
          <span className="text-[16px] shrink-0 mt-0.5">✨</span>
          <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{aiSuggestion}</div>
        </div>
      </motion.div>}
      {aiSugLoading && <div className="flex items-center gap-2 px-2 py-1"><div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent-primary)" }} /><span className="text-[12px] text-[var(--text-muted)]">Analyzing your data...</span></div>}
    </div>}

    {/* Quick prompts */}
    {messages.length === 0 && <div className="px-3 py-2 flex gap-1.5 flex-wrap border-b border-[var(--border)]">
      {COPILOT_QUICK_PROMPTS.map(p => <button key={p.label} onClick={() => sendMessage(p.prompt)} className="px-2.5 py-1 rounded-full text-[12px] font-semibold transition-all" style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,134,10,0.3)"; e.currentTarget.style.color = "var(--accent-primary)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>{p.label}</button>)}
    </div>}

    {/* Chat messages */}
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
      {messages.length === 0 && !visibleSuggestions.length && !aiSuggestion && !aiSugLoading && <div className="text-center py-8"><div className="text-[28px] mb-2 opacity-50">🤖</div><div className="text-[14px] text-[var(--text-muted)]">I{"'"}m here if you need me.<br/>Ask anything about your transformation.</div></div>}
      {messages.map((m, i) => <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[85%] rounded-xl px-3.5 py-2 text-[14px] leading-relaxed" style={{ background: m.role === "user" ? "linear-gradient(135deg, var(--accent-primary), var(--teal))" : "var(--surface-2)", color: m.role === "user" ? "#fff" : "var(--text-primary)", borderBottomRightRadius: m.role === "user" ? 4 : 12, borderBottomLeftRadius: m.role === "user" ? 12 : 4 }}>
          {m.content.split("\n").map((line, li) => <div key={li} className={li > 0 ? "mt-1" : ""}>{line}</div>)}
        </div>
      </div>)}
      {loading && <div className="flex justify-start"><div className="rounded-xl px-3.5 py-2 text-[14px] flex items-center gap-2" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}><span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }} /> Thinking...</div></div>}
      <div ref={messagesEndRef} />
    </div>

    {/* Input */}
    <div className="px-3 py-3 flex gap-2 border-t border-[var(--border)]">
      <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendMessage(input); }} placeholder="Ask anything..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
      <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="px-3 py-2 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>☕</button>
    </div>
  </motion.div>;
}

// ── Story Engine ──
type StorySection = { id: string; title: string; icon: string; content: string; metric?: string; metricLabel?: string };
type SavedStory = { id: string; date: string; tone: string; sections: StorySection[] };

const STORY_TONES = [
  { id: "executive", label: "Executive", desc: "Concise, numbers-focused" },
  { id: "board", label: "Board", desc: "High-level, strategic" },
  { id: "detailed", label: "Detailed", desc: "Comprehensive, analytical" },
  { id: "conversational", label: "Conversational", desc: "For town halls" },
];

export function StoryEngine({ projectName, model, contextData, onClose, onNavigate }: { projectName: string; model: string; contextData: string; onClose: () => void; onNavigate?: (id: string) => void }) {
  const [sections, setSections] = usePersisted<StorySection[]>(`${model}_story_sections`, []);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [tone, setTone] = useState("executive");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [history, setHistory] = usePersisted<SavedStory[]>(`${model}_story_history`, []);
  const [regenSectionId, setRegenSectionId] = useState<string | null>(null);

  const SECTION_DEFS = [
    { id: "summary", title: "Executive Summary", icon: "📋", prompt: "Write a 3-sentence executive summary. Lead with the most important finding. Include the headline number." },
    { id: "current", title: "Current State", icon: "📊", prompt: "Describe the current state of the organization in 2 paragraphs. Include specific data: headcount, functions, structure metrics, AI readiness." },
    { id: "findings", title: "Key Findings", icon: "💡", prompt: "List the 5 most important findings, each as a single paragraph. Start each with the key metric in bold. Make findings specific and data-backed." },
    { id: "actions", title: "Recommended Actions", icon: "🎯", prompt: "List 5-7 prioritized recommended actions with rationale. Each should reference a data point that supports it." },
    { id: "financial", title: "Financial Impact", icon: "💰", prompt: "Present the business case: total investment required, projected annual savings, ROI percentage, payback period. Use specific numbers." },
    { id: "risks", title: "Risks & Mitigation", icon: "⚠️", prompt: "Identify the top 3 risks to the transformation with specific mitigation strategies for each." },
    { id: "nextsteps", title: "Next Steps", icon: "🚀", prompt: "Outline immediate actions for the next 90 days, organized by month. Be specific about owners and deliverables." },
  ];

  const generateStory = async () => {
    setGenerating(true); setGenProgress(0);
    const newSections: StorySection[] = [];
    const toneInstruction = tone === "board" ? "Write for a board of directors — high-level, strategic, avoid operational detail." : tone === "conversational" ? "Write in a warm, conversational tone suitable for a company town hall." : tone === "detailed" ? "Write with comprehensive detail including methodology and data sources." : "Write in confident, concise consulting language for C-suite executives.";

    for (let i = 0; i < SECTION_DEFS.length; i++) {
      const def = SECTION_DEFS[i];
      setGenProgress(Math.round(((i) / SECTION_DEFS.length) * 100));
      try {
        const result = await callAI(
          `You are a senior McKinsey/BCG consultant. ${toneInstruction} Never use generic statements — every sentence must reference a specific data point. Do not use markdown headers or bullet symbols.`,
          `Generate the "${def.title}" section for ${projectName}. ${def.prompt}\n\nData context:\n${contextData.slice(0, 3000)}`
        );
        // Extract a headline metric if possible
        const metricMatch = result.match(/(\d[\d,.%$MKBmkb]*)/);
        newSections.push({ id: def.id, title: def.title, icon: def.icon, content: result.replace(/```/g, "").trim(), metric: metricMatch?.[1], metricLabel: def.id === "summary" ? "Headline" : undefined });
      } catch {
        newSections.push({ id: def.id, title: def.title, icon: def.icon, content: `[Generation failed for this section. Click "Regenerate" to try again.]` });
      }
    }
    setSections(newSections);
    setHistory(prev => [...prev, { id: `story_${Date.now()}`, date: new Date().toISOString().split("T")[0], tone, sections: newSections }]);
    setGenProgress(100); setGenerating(false);
  };

  const regenerateSection = async (sectionId: string) => {
    setRegenSectionId(sectionId);
    const def = SECTION_DEFS.find(d => d.id === sectionId);
    if (!def) return;
    const toneInstruction = tone === "board" ? "Write for a board of directors." : tone === "conversational" ? "Write conversationally for a town hall." : tone === "detailed" ? "Write with comprehensive detail." : "Write for C-suite executives.";
    try {
      const result = await callAI(`You are a senior consultant. ${toneInstruction} Every sentence must reference specific data.`, `Regenerate the "${def.title}" section for ${projectName}. ${def.prompt}\n\nContext:\n${contextData.slice(0, 2000)}`);
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, content: result.replace(/```/g, "").trim() } : s));
    } catch (e) { console.error("[regenerateSection] failed", e); }
    setRegenSectionId(null);
  };

  const copyAll = () => {
    const text = sections.map(s => `${s.title}\n${"=".repeat(s.title.length)}\n${s.content}`).join("\n\n");
    navigator.clipboard.writeText(text);
    showToast("Story copied to clipboard");
  };

  return <motion.div className="fixed inset-0 z-[99998] flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <motion.div className="relative mx-auto my-4 w-full max-w-[900px] rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col" style={{ background: "var(--bg)", boxShadow: "var(--shadow-4)", maxHeight: "calc(100vh - 32px)" }} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)]" style={{ background: "linear-gradient(135deg, rgba(212,134,10,0.06), transparent)" }}>
        <div>
          <div className="text-[22px] font-extrabold text-[var(--text-primary)] font-heading">Executive Narrative</div>
          <div className="text-[14px] text-[var(--text-muted)]">{projectName} · AI-generated data story</div>
        </div>
        <div className="flex items-center gap-3">
          <select value={tone} onChange={e => setTone(e.target.value)} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[14px] text-[var(--text-primary)] outline-none">
            {STORY_TONES.map(t => <option key={t.id} value={t.id}>{t.label} — {t.desc}</option>)}
          </select>
          {sections.length === 0 ? <button onClick={generateStory} disabled={generating} className="px-5 py-2 rounded-xl text-[15px] font-bold text-white glow-pulse" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: generating ? 0.5 : 1 }}>{generating ? "Generating..." : "✨ Generate Story"}</button>
          : <><button onClick={copyAll} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">📋 Copy</button><button onClick={generateStory} disabled={generating} className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))", opacity: generating ? 0.5 : 1 }}>✨ Regenerate All</button></>}
          <button onClick={onClose} className="text-[18px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
        </div>
      </div>

      {/* Progress */}
      {generating && <div className="px-8 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-1"><span className="text-[14px] text-[var(--text-muted)]">Generating story...</span><span className="text-[14px] font-bold text-[var(--accent-primary)] font-data">{genProgress}%</span></div>
        <AnimatedBar value={genProgress} color="var(--accent-primary)" height={4} />
      </div>}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
        {sections.length === 0 && !generating && <div className="text-center py-16">
          <div className="text-[48px] mb-4 opacity-50">📖</div>
          <div className="text-[20px] font-bold text-[var(--text-primary)] font-heading mb-2">Generate Your Executive Story</div>
          <div className="text-[16px] text-[var(--text-muted)] max-w-md mx-auto mb-6">The AI will analyze all your platform data and generate a complete executive narrative with findings, recommendations, and a business case.</div>
          <button onClick={generateStory} className="px-8 py-3 rounded-2xl text-[16px] font-bold text-white glow-pulse" style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--teal))" }}>✨ Generate Executive Narrative</button>
        </div>}

        {sections.map((section, si) => {
          const isEditing = editingId === section.id;
          const isRegen = regenSectionId === section.id;
          const isSummary = section.id === "summary";
          return <motion.div key={section.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08, duration: 0.4 }}>
            {/* Section divider */}
            {si > 0 && <div className="flex items-center gap-3 mb-6"><div className="h-px flex-1 bg-[var(--border)]" /><span className="text-[var(--text-muted)] text-[14px]">{section.icon}</span><div className="h-px flex-1 bg-[var(--border)]" /></div>}
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[20px]">{section.icon}</span>
                <h2 className="text-[20px] font-bold text-[var(--text-primary)] font-heading">{section.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => regenerateSection(section.id)} disabled={isRegen} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-all">{isRegen ? "Regenerating..." : "✨ Regenerate"}</button>
                <button onClick={() => setEditingId(isEditing ? null : section.id)} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)]">{isEditing ? "Done" : "Edit"}</button>
              </div>
            </div>
            {/* Section content */}
            <div className={`rounded-2xl p-6 ${isSummary ? "border-l-4" : ""}`} style={{
              background: isSummary ? "rgba(212,134,10,0.04)" : "var(--surface-1)",
              border: `1px solid ${isSummary ? "rgba(212,134,10,0.15)" : "var(--border)"}`,
              borderLeftColor: isSummary ? "var(--accent-primary)" : undefined,
              boxShadow: "var(--shadow-1)",
            }}>
              {/* Headline metric */}
              {section.metric && isSummary && <div className="mb-4 text-center"><span className="text-[36px] font-extrabold font-data" style={{ color: "var(--accent-primary)" }}>{section.metric}</span>{section.metricLabel && <span className="text-[14px] text-[var(--text-muted)] ml-2 uppercase tracking-wider">{section.metricLabel}</span>}</div>}
              {isEditing ? <textarea value={section.content} onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, content: e.target.value } : s))} className="w-full bg-transparent border border-[var(--border)] rounded-xl px-4 py-3 text-[16px] text-[var(--text-primary)] outline-none resize-none leading-relaxed" rows={8} /> :
              <div className={`text-[${isSummary ? "18" : "16"}px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap`} style={{ fontFamily: isSummary ? "'Outfit', sans-serif" : undefined, fontWeight: isSummary ? 500 : 400 }}>
                {section.content}
              </div>}
            </div>
          </motion.div>;
        })}

        {/* History */}
        {history.length > 1 && <div className="mt-8 border-t border-[var(--border)] pt-6">
          <div className="text-[14px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 font-heading">Story History</div>
          <div className="space-y-2">{history.slice().reverse().slice(1).map(h => <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div><span className="text-[14px] font-semibold text-[var(--text-primary)]">{h.date}</span><span className="text-[13px] text-[var(--text-muted)] ml-2">{STORY_TONES.find(t => t.id === h.tone)?.label} tone · {h.sections.length} sections</span></div>
            <button onClick={() => setSections(h.sections)} className="text-[12px] text-[var(--accent-primary)] hover:underline">Restore</button>
          </div>)}</div>
        </div>}
      </div>
    </motion.div>
  </motion.div>;
}

// ── Guide Modal ──
export function GuideModal({ type, onClose }: { type: "consultant" | "hr"; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);

  const consultantTabs = [
    { label: "Analyst", icon: "📊", content: [
      { title: "Your Role", body: "You're the engine room. Responsible for data integrity, tool execution, and deliverable production. You make sure the right data is loaded, the right analysis runs, and outputs are client-ready." },
      { title: "What You Do in This Tool", body: "Load client data via Upload Files. Run every module in sequence: Overview → Diagnose → Design → Simulate → Mobilize. Export outputs as Excel, PowerPoint, and PDF. Maintain the decision log — document every assumption." },
      { title: "Your Typical Day", body: "Morning: load updated data from client. Mid-day: run Diagnose modules, flag issues to your Associate. Afternoon: build slides from the Export tab, update the project tracker." },
      { title: "Common Mistakes", body: "Not validating data before running analysis. Forgetting to document assumptions in the decision log. Sending raw tool outputs without formatting for the audience." },
      { title: "How to Level Up", body: "Master every module deeply. Be the person who knows the tool cold. Develop a point of view on the data — don't just run it, interpret it." },
    ]},
    { label: "Associate", icon: "💼", content: [
      { title: "Your Role", body: "You own workstream delivery. Running modules, interpreting outputs, and starting to have direct client interaction on your workstream." },
      { title: "What You Do", body: "Everything an Analyst does, PLUS: interpret results and form hypotheses. Present findings in team check-ins. Draft the storyboard for client deliverables. Own specific modules end-to-end." },
      { title: "Managing Down", body: "You may have an Analyst supporting you. Delegate data loading, QA, and formatting. Review their work before it goes to the Senior Associate." },
      { title: "Managing Up", body: "Flag risks and surprises early. Don't wait for the weekly check-in. Come with a recommendation, not just the problem." },
    ]},
    { label: "Principal", icon: "🎯", content: [
      { title: "Your Role", body: "You sell AND deliver. You own the client relationship and are accountable for quality and impact. Your team is in the tool daily — you're in it when you need to QA or prepare for a client meeting." },
      { title: "Selling with This Tool", body: "Use sandbox demos to show prospects what's possible. Walk through a realistic scenario in a sales meeting. Focus on outcomes and insights, not features." },
      { title: "Using Insights", body: "You rarely show the tool in client meetings. Instead, take the insights and weave them into the story: 'Our analysis shows 45% of your Finance tasks have high automation potential.'" },
    ]},
    { label: "Partner", icon: "👔", content: [
      { title: "Your Role", body: "Relationships, strategy, and implications. You're not in the tool — you use the insights to guide clients on strategic decisions." },
      { title: "How You Use This Tool", body: "Review the Transformation Dashboard for headline metrics. Read AI-generated executive summaries. Review the steering committee deck from Export. Ask your Principal: 'What surprised you?'" },
    ]},
  ];

  const hrTabs = [
    { label: "HRBP", icon: "🤝", content: [
      { title: "Your Role", body: "You translate business needs into people strategies. Use this tool to understand your business unit's workforce and plan changes." },
      { title: "Key Modules", body: "Focus on: Workforce Snapshot (filtered to your function), Change Readiness, Skills Gap Analysis, Reskilling Pathways." },
      { title: "Presenting to Leaders", body: "Use the Export tab to generate function-specific reports. The Transformation Dashboard gives you the headline metrics your business leader needs." },
    ]},
    { label: "Transformation Lead", icon: "🚀", content: [
      { title: "Your Role", body: "This is YOUR command center — you'll use every module. Structure your program using the 5 phases: Discover → Diagnose → Design → Simulate → Mobilize." },
      { title: "Program Management", body: "Use the Change Planner Gantt chart to track timelines. The Risk Register captures and monitors program risks. The Decision Log creates accountability." },
      { title: "Reporting", body: "The Transformation Dashboard is your steering committee update. Export it monthly. Use Scenario Comparison to show the board different options." },
    ]},
    { label: "CHRO", icon: "👑", content: [
      { title: "Your Role", body: "You need the 30,000-foot view. Dashboards, executive summaries, and the business case for transformation." },
      { title: "Key Views", body: "Focus on: Transformation Dashboard, Export (executive summary), ROI Calculator in Simulate. Use AI Espresso to ask quick questions about the data." },
      { title: "Board Presentations", body: "The Export tab generates board-ready decks. The PDF executive summary is a one-page overview. Screenshot the Transformation Dashboard for monthly updates." },
    ]},
    { label: "Line Manager", icon: "👥", content: [
      { title: "Your Role", body: "Understand how transformation affects YOUR team. Focus on impact assessments, reskilling plans, and timeline." },
      { title: "Key Modules", body: "Workforce Snapshot (filtered to your function), Change Readiness for your team, Reskilling Pathways for your direct reports." },
    ]},
  ];

  const tabs = type === "consultant" ? consultantTabs : hrTabs;
  const cur = tabs[tab];
  return <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose}>
    <div style={{ width: "90%", maxWidth: 800, maxHeight: "85vh", background: "var(--surface-1)", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{type === "consultant" ? "📘 Consultant Guide" : "📗 HR Professional Guide"}</h2>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "8px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, overflowX: "auto" }}>
        {tabs.map((t, i) => <button key={t.label} onClick={() => setTab(i)} style={{ padding: "6px 14px", borderRadius: 10, fontSize: 14, fontWeight: tab === i ? 700 : 500, background: tab === i ? "rgba(212,134,10,0.1)" : "transparent", color: tab === i ? "var(--accent-primary)" : "var(--text-muted)", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>{t.icon} {t.label}</button>)}
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {cur && cur.content.map((s, i) => <div key={i} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{s.title}</h3>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)" }}>{s.body}</p>
        </div>)}
      </div>
    </div>
  </div>;
}

// ── View Selectors ──
export function ViewSelector({ onSelect, employees, jobs, filterOptions, onBack }: {
  onSelect: (mode: string, detail?: Record<string, string>) => void;
  employees: string[];
  jobs: string[];
  filterOptions: Record<string, string[]>;
  onBack: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [customFilters, setCustomFilters] = useState({ func: "All", jf: "All", sf: "All", cl: "All", ct: "All" });
  const [guideOpen, setGuideOpen] = useState<"consultant" | "hr" | null>(null);

  const views = [
    { id: "org", icon: "🏢", title: "Organization", desc: "Full org analysis — all functions, roles, and employees", color: "var(--accent-primary)", ready: true },
    { id: "job", icon: "💼", title: "Job Focus", desc: "Deep dive into a single role", color: "var(--success)", ready: jobs.length > 0 },
    { id: "employee", icon: "👤", title: "Employee", desc: "One person's world — profile, org chart, impact", color: "var(--purple)", ready: employees.length > 0 },
    { id: "custom", icon: "⚙️", title: "Custom Slice", desc: "Filter by function, family, level, or track", color: "#F97316", ready: true },
    { id: "consultant", icon: "📋", title: "Consultant Guide", desc: "Guided pathway for external consultants — frameworks and deliverables", color: "#0891B2", ready: true },
    { id: "hr", icon: "👥", title: "HR Professional Guide", desc: "Tailored for HR and People Analytics — workforce planning and talent strategy", color: "#EC4899", ready: true },
  ];

  return <div style={{ position: "fixed", inset: 0, overflow: "auto", background: "#0B1120", animation: "pageCrossfade 0.2s ease-out", willChange: "opacity" }}>
    {/* Full bleed background */}
    <VideoBackground name="view_bg" overlay={0.2} poster={`${CDN_BASE}/view_bg.png`} fallbackGradient="linear-gradient(135deg, #0B1120 0%, #1a1530 35%, #0f1525 65%, #0a0f1a 100%)" className="absolute inset-0 w-full h-full" />
    <div style={{ position: "absolute", inset: 0, zIndex: 1, background: revealed ? "rgba(8,12,24,0.75)" : "radial-gradient(ellipse at center, rgba(8,12,24,0.2) 0%, rgba(8,12,24,0.5) 60%, rgba(8,12,24,0.7) 100%)", transition: "background 0.6s ease", width: "100%", height: "100%" }} />

    {/* Back button */}
    <button onClick={onBack} style={{ position: "absolute", top: 20, left: 20, zIndex: 20, fontSize: 15, color: "rgba(255,220,180,0.5)", background: "none", border: "none", cursor: "pointer" }}>← Back to Projects</button>

    {/* Click-to-reveal state */}
    {!revealed && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setRevealed(true)}>
      <div className="text-center">
        <div className="mb-8">
          <div className="text-[28px] font-extrabold text-white mb-2" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>Choose Your Perspective</div>
          <p className="text-[15px]" style={{ color: "rgba(255,220,180,0.5)" }}>The platform adapts to how you want to explore</p>
        </div>
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,200,150,0.15)" }}>
          <span className="text-[14px]" style={{ color: "rgba(255,230,200,0.8)" }}>Click anywhere to continue</span>
          <span className="text-[16px]">→</span>
        </div>
      </div>
    </div>}

    {/* View cards — revealed on click */}
    {revealed && <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="max-w-2xl w-full px-6">
        <div className="text-center mb-6">
          <div className="text-[22px] font-extrabold text-white mb-1" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>Select Your View</div>
          <p className="text-[15px]" style={{ color: "rgba(255,220,180,0.4)" }}>Every module adapts to your chosen perspective</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {views.map(v => <button key={v.id} onClick={() => {
            if (v.id === "org") onSelect("org");
            else if (v.id === "custom") setCustomExpanded(!customExpanded);
            else if (v.id === "job" && jobs.length) onSelect("job_select");
            else if (v.id === "employee" && employees.length) onSelect("employee_select");
            else if (v.id === "consultant" || v.id === "hr") onSelect(v.id);
          }} disabled={!v.ready} className="text-left rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden disabled:opacity-30" style={{ background: "rgba(15,20,35,0.7)", backdropFilter: "blur(20px)", border: v.id === "custom" && customExpanded ? `1px solid ${v.color}50` : "1px solid rgba(255,200,150,0.08)" }} onMouseEnter={e => { if (v.ready) e.currentTarget.style.borderColor = `${v.color}40`; }} onMouseLeave={e => { if (!customExpanded || v.id !== "custom") e.currentTarget.style.borderColor = "rgba(255,200,150,0.08)"; }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{v.icon}</span>
              <span className="text-[16px] font-bold" style={{ color: "rgba(255,245,235,0.92)" }}>{v.title}</span>
            </div>
            <div className="text-[15px]" style={{ color: "rgba(255,220,190,0.4)" }}>{v.desc}</div>
            {!v.ready && <div className="text-[15px] mt-2" style={{ color: "rgba(245,158,11,0.6)" }}>Upload data to enable</div>}
            <div className="absolute top-4 right-4 text-[14px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: v.color }}>→</div>
          </button>)}
        </div>

        {/* Custom filter expansion */}
        {customExpanded && <div className="rounded-xl p-5 mb-3 animate-[slideUp_0.3s_ease]" style={{ background: "rgba(15,20,35,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(249,115,22,0.2)" }}>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[{ key: "func", label: "Function", options: filterOptions.functions || ["All"] },
              { key: "jf", label: "Job Family", options: filterOptions.job_families || ["All"] },
              { key: "sf", label: "Sub-Family", options: filterOptions.sub_families || ["All"] },
              { key: "cl", label: "Career Level", options: filterOptions.career_levels || ["All"] },
              { key: "ct", label: "Career Track", options: ["All", "Executive", "Manager", "IC", "Analyst"] },
            ].map(f => <div key={f.key}>
              <div className="text-[15px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,200,150,0.3)" }}>{f.label}</div>
              <select value={customFilters[f.key as keyof typeof customFilters]} onChange={e => setCustomFilters(prev => ({ ...prev, [f.key]: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-[15px] outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,150,0.1)", color: "rgba(255,245,235,0.85)" }}>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>)}
          </div>
          <div className="flex justify-end">
            <button onClick={() => onSelect("custom", customFilters)} className="px-5 py-2.5 rounded-xl text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>Apply & Enter →</button>
          </div>
        </div>}

        {/* Guide options are included in the main view cards grid */}
      </div>
    </div>}

    {/* Guide modal */}
    {guideOpen && <GuideModal type={guideOpen} onClose={() => setGuideOpen(null)} />}
  </div>;
}

export function ViewJobPicker({ jobs, onSelect, onBack }: { jobs: string[]; onSelect: (job: string) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = jobs.filter(j => j.toLowerCase().includes(search.toLowerCase()));
  return <div className="min-h-[calc(100vh-48px)] flex items-center justify-center" style={{ background: "var(--bg)" }}>
    <div className="max-w-lg w-full px-6">
      <button onClick={onBack} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-4 flex items-center gap-1">← Back to view selection</button>
      <div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">Select a Job</div>
      <p className="text-[15px] text-[var(--text-secondary)] mb-4">The entire platform will focus on this role</p>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] mb-3 placeholder:text-[var(--text-muted)]" />
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">{filtered.map(j => <button key={j} onClick={() => onSelect(j)} className="w-full text-left px-4 py-3 rounded-xl text-[15px] transition-all hover:bg-[rgba(212,134,10,0.06)] border border-transparent hover:border-[var(--accent-primary)]/20" style={{ background: "var(--surface-1)" }}>
        <span className="font-semibold text-[var(--text-primary)]">{j}</span>
      </button>)}</div>
      {filtered.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">No matching jobs</div>}
    </div>
  </div>;
}

export function ViewEmployeePicker({ employees, onSelect, onBack }: { employees: string[]; onSelect: (emp: string) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = employees.filter(e => e.toLowerCase().includes(search.toLowerCase()));
  return <div className="min-h-[calc(100vh-48px)] flex items-center justify-center" style={{ background: "var(--bg)" }}>
    <div className="max-w-lg w-full px-6">
      <button onClick={onBack} className="text-[15px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-4 flex items-center gap-1">← Back to view selection</button>
      <div className="text-xl font-extrabold text-[var(--text-primary)] mb-1">Select an Employee</div>
      <p className="text-[15px] text-[var(--text-secondary)] mb-4">See their world — role, team, org chart, and how AI affects them</p>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] mb-3 placeholder:text-[var(--text-muted)]" />
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">{filtered.slice(0, 50).map(e => <button key={e} onClick={() => onSelect(e)} className="w-full text-left px-4 py-3 rounded-xl text-[15px] transition-all hover:bg-[rgba(139,92,246,0.06)] border border-transparent hover:border-[var(--purple)]/20" style={{ background: "var(--surface-1)" }}>
        <span className="font-semibold text-[var(--text-primary)]">{e}</span>
      </button>)}</div>
      {filtered.length > 50 && <div className="text-center py-3 text-[15px] text-[var(--text-muted)]">Showing 50 of {filtered.length} — narrow your search</div>}
      {filtered.length === 0 && <div className="text-center py-8 text-[var(--text-muted)]">No matching employees</div>}
    </div>
  </div>;
}


// ── AI Job Auto-Suggest ──
export interface AiJobSuggestion {
  tasks: { name: string; hours_per_week: number; ai_impact: string; task_type: string; interaction: string; logic: string }[];
  skills: { category: string; skills: string[] }[];
  kpis: string[];
  responsibilities: string[];
  collaborates_with: string[];
  external_parties: string[];
}

const AI_SUGGEST_CACHE_KEY = "ai_job_suggest_cache";
const AI_SUGGEST_CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function _getCachedSuggestion(title: string, industry: string): AiJobSuggestion | null {
  try {
    const raw = localStorage.getItem(AI_SUGGEST_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, { data: AiJobSuggestion; ts: number }>;
    const key = `${title.toLowerCase().trim()}|${industry.toLowerCase().trim()}`;
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > AI_SUGGEST_CACHE_EXPIRY_MS) {
      delete cache[key];
      localStorage.setItem(AI_SUGGEST_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    return entry.data;
  } catch { return null; }
}

function _setCachedSuggestion(title: string, industry: string, data: AiJobSuggestion) {
  try {
    const raw = localStorage.getItem(AI_SUGGEST_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) as Record<string, { data: AiJobSuggestion; ts: number }> : {};
    const key = `${title.toLowerCase().trim()}|${industry.toLowerCase().trim()}`;
    cache[key] = { data, ts: Date.now() };
    // Prune expired entries
    for (const k of Object.keys(cache)) {
      if (Date.now() - cache[k].ts > AI_SUGGEST_CACHE_EXPIRY_MS) delete cache[k];
    }
    localStorage.setItem(AI_SUGGEST_CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full — skip */ }
}

export function AiJobSuggestButton({ title, industry, onAccept, compact }: {
  title: string;
  industry?: string;
  onAccept: (data: AiJobSuggestion) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!title || title === "New Role") return null;

  return <>
    <button onClick={() => setOpen(true)}
      className={`${compact ? "px-2 py-1 text-[14px]" : "px-3 py-1.5 text-[15px]"} rounded-lg font-semibold bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 transition-all inline-flex items-center gap-1`}>
      <span>✨</span> Auto-suggest
    </button>
    {open && <AiJobSuggestPanel title={title} industry={industry || "technology"} onAccept={d => { onAccept(d); setOpen(false); }} onClose={() => setOpen(false)} />}
  </>;
}

function AiJobSuggestPanel({ title, industry, onAccept, onClose }: {
  title: string; industry: string;
  onAccept: (data: AiJobSuggestion) => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<AiJobSuggestion | null>(null);
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [checkedSkills, setCheckedSkills] = useState<Set<number>>(new Set());
  const [checkedKpis, setCheckedKpis] = useState<Set<number>>(new Set());
  const [checkedResps, setCheckedResps] = useState<Set<number>>(new Set());
  const [editIdx, setEditIdx] = useState<{ section: string; idx: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  // On mount — check cache first, then fetch
  useEffect(() => {
    const cached = _getCachedSuggestion(title, industry);
    if (cached) {
      setSuggestion(cached);
      _selectAll(cached);
      return;
    }
    fetchSuggestion();
  }, [title, industry]);

  function _selectAll(data: AiJobSuggestion) {
    setCheckedTasks(new Set(data.tasks.map((_, i) => i)));
    setCheckedSkills(new Set(data.skills.map((_, i) => i)));
    setCheckedKpis(new Set(data.kpis.map((_, i) => i)));
    setCheckedResps(new Set(data.responsibilities.map((_, i) => i)));
  }

  async function fetchSuggestion() {
    setLoading(true);
    setError("");
    const prompt = `For the job title "${title}" in the ${industry} industry, suggest:
1. 8-10 key tasks with estimated hours per week for each, AI impact level (High/Moderate/Low), task type (Repetitive/Variable), interaction level (Independent/Interactive/Collaborative), and logic type (Deterministic/Probabilistic/Judgment-heavy)
2. 6-8 required skills grouped by category (Technical, Functional, Leadership, Digital/AI)
3. 4-5 typical KPIs used to measure this role
4. 3-5 key responsibilities
5. Internal teams this role typically collaborates with
6. External parties they interact with

Return ONLY valid JSON in this exact format:
{"tasks":[{"name":"task name","hours_per_week":5,"ai_impact":"High","task_type":"Repetitive","interaction":"Independent","logic":"Deterministic"}],"skills":[{"category":"Technical","skills":["skill1","skill2"]}],"kpis":["KPI 1","KPI 2"],"responsibilities":["resp 1"],"collaborates_with":["team 1"],"external_parties":["party 1"]}`;

    const raw = await callAI(
      "You are an expert organizational design consultant. Return ONLY valid JSON, no markdown.",
      prompt
    );

    if (raw.startsWith("[AI") || raw.startsWith("[Rate")) {
      setError("Auto-suggest unavailable right now — you can enter details manually");
      setLoading(false);
      return;
    }

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as AiJobSuggestion;
      // Validate minimum structure
      if (!parsed.tasks || !Array.isArray(parsed.tasks) || parsed.tasks.length === 0) throw new Error("No tasks");
      setSuggestion(parsed);
      _setCachedSuggestion(title, industry, parsed);
      _selectAll(parsed);
    } catch {
      setError("Auto-suggest unavailable right now — you can enter details manually");
    }
    setLoading(false);
  }

  function toggleCheck(set: Set<number>, setFn: (s: Set<number>) => void, idx: number) {
    const next = new Set(set);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setFn(next);
  }

  function handleAcceptSelected() {
    if (!suggestion) return;
    const accepted: AiJobSuggestion = {
      tasks: suggestion.tasks.filter((_, i) => checkedTasks.has(i)),
      skills: suggestion.skills.filter((_, i) => checkedSkills.has(i)),
      kpis: suggestion.kpis.filter((_, i) => checkedKpis.has(i)),
      responsibilities: suggestion.responsibilities.filter((_, i) => checkedResps.has(i)),
      collaborates_with: suggestion.collaborates_with,
      external_parties: suggestion.external_parties,
    };
    onAccept(accepted);
    showToast(`✨ Accepted ${accepted.tasks.length} tasks, ${accepted.skills.reduce((s, g) => s + g.skills.length, 0)} skills for ${title}`);
  }

  function handleEditSave() {
    if (!editIdx || !suggestion) return;
    const updated = { ...suggestion };
    if (editIdx.section === "task") {
      updated.tasks = [...updated.tasks];
      updated.tasks[editIdx.idx] = { ...updated.tasks[editIdx.idx], name: editValue };
    } else if (editIdx.section === "kpi") {
      updated.kpis = [...updated.kpis];
      updated.kpis[editIdx.idx] = editValue;
    } else if (editIdx.section === "resp") {
      updated.responsibilities = [...updated.responsibilities];
      updated.responsibilities[editIdx.idx] = editValue;
    }
    setSuggestion(updated);
    setEditIdx(null);
  }

  const checkboxStyle: React.CSSProperties = { accentColor: "var(--purple)", width: 13, height: 13, cursor: "pointer" };

  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
    <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720, maxHeight: "85vh", overflow: "auto", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 20, padding: "24px", boxShadow: "var(--shadow-4)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-bold font-heading text-[var(--text-primary)] flex items-center gap-2">✨ AI Auto-Suggest <span className="text-[15px] font-normal text-purple-400">{title}</span></h2>
          <p className="text-[15px] text-[var(--text-muted)] mt-0.5">Review suggestions below. Check items to accept, double-click to edit, then confirm.</p>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg">✕</button>
      </div>

      {/* Loading shimmer */}
      {loading && <div className="space-y-3 py-8">
        <div className="text-center text-[15px] text-purple-400 font-semibold mb-4">AI is analyzing this role...</div>
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: `linear-gradient(90deg, "var(--surface-2)" 25%, var(--surface-3, rgba(255,255,255,0.05)) 50%, "var(--surface-2)" 75%)`, backgroundSize: "200% 100%", animation: `shimmer 1.5s infinite ${i * 0.15}s` }} />)}
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      </div>}

      {/* Error state */}
      {error && <div className="text-center py-8">
        <div className="text-2xl mb-3 opacity-40">⚡</div>
        <p className="text-[15px] text-[var(--text-secondary)] mb-2">{error}</p>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent-primary)]">Continue manually</button>
      </div>}

      {/* Results */}
      {suggestion && !loading && <>
        {/* Tasks */}
        <div className="mb-4">
          <div className="text-[15px] font-bold text-purple-400 uppercase tracking-wider mb-2">Tasks ({checkedTasks.size}/{suggestion.tasks.length} selected)</div>
          <div className="space-y-1">
            {suggestion.tasks.map((t, i) => <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--hover)] text-[15px]">
              <input type="checkbox" checked={checkedTasks.has(i)} onChange={() => toggleCheck(checkedTasks, setCheckedTasks, i)} style={checkboxStyle} />
              {editIdx?.section === "task" && editIdx.idx === i ? (
                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleEditSave} onKeyDown={e => e.key === "Enter" && handleEditSave()}
                  className="flex-1 bg-[var(--surface-2)] border border-purple-500/40 rounded px-2 py-0.5 text-[15px] text-[var(--text-primary)] outline-none" />
              ) : (
                <span className="flex-1 text-[var(--text-primary)] cursor-text" onDoubleClick={() => { setEditIdx({ section: "task", idx: i }); setEditValue(t.name); }}>{t.name}</span>
              )}
              <span className="text-[14px] font-data text-[var(--text-muted)] w-12 text-right">{t.hours_per_week}h/wk</span>
              <span className={`text-[15px] px-1.5 py-0.5 rounded-full font-bold ${t.ai_impact === "High" ? "bg-red-500/10 text-red-400" : t.ai_impact === "Moderate" ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"}`}>{t.ai_impact}</span>
            </div>)}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="text-[15px] font-bold text-purple-400 uppercase tracking-wider mb-2">Skills by Category ({checkedSkills.size}/{suggestion.skills.length} groups selected)</div>
          <div className="grid grid-cols-2 gap-2">
            {suggestion.skills.map((g, i) => <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              <input type="checkbox" checked={checkedSkills.has(i)} onChange={() => toggleCheck(checkedSkills, setCheckedSkills, i)} style={{ ...checkboxStyle, marginTop: 2 }} />
              <div>
                <div className="text-[15px] font-semibold text-[var(--accent-primary)]">{g.category}</div>
                <div className="text-[15px] text-[var(--text-secondary)]">{g.skills.join(", ")}</div>
              </div>
            </div>)}
          </div>
        </div>

        {/* KPIs + Responsibilities side by side */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-[15px] font-bold text-purple-400 uppercase tracking-wider mb-2">KPIs</div>
            {suggestion.kpis.map((k, i) => <div key={i} className="flex items-center gap-2 text-[15px] py-0.5">
              <input type="checkbox" checked={checkedKpis.has(i)} onChange={() => toggleCheck(checkedKpis, setCheckedKpis, i)} style={checkboxStyle} />
              {editIdx?.section === "kpi" && editIdx.idx === i ? (
                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleEditSave} onKeyDown={e => e.key === "Enter" && handleEditSave()}
                  className="flex-1 bg-[var(--surface-2)] border border-purple-500/40 rounded px-2 py-0.5 text-[15px] text-[var(--text-primary)] outline-none" />
              ) : (
                <span className="text-[var(--text-secondary)] cursor-text" onDoubleClick={() => { setEditIdx({ section: "kpi", idx: i }); setEditValue(k); }}>{k}</span>
              )}
            </div>)}
          </div>
          <div>
            <div className="text-[15px] font-bold text-purple-400 uppercase tracking-wider mb-2">Responsibilities</div>
            {suggestion.responsibilities.map((r, i) => <div key={i} className="flex items-center gap-2 text-[15px] py-0.5">
              <input type="checkbox" checked={checkedResps.has(i)} onChange={() => toggleCheck(checkedResps, setCheckedResps, i)} style={checkboxStyle} />
              {editIdx?.section === "resp" && editIdx.idx === i ? (
                <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleEditSave} onKeyDown={e => e.key === "Enter" && handleEditSave()}
                  className="flex-1 bg-[var(--surface-2)] border border-purple-500/40 rounded px-2 py-0.5 text-[15px] text-[var(--text-primary)] outline-none" />
              ) : (
                <span className="text-[var(--text-secondary)] cursor-text" onDoubleClick={() => { setEditIdx({ section: "resp", idx: i }); setEditValue(r); }}>{r}</span>
              )}
            </div>)}
          </div>
        </div>

        {/* Collaborators (info only, no checkbox) */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Collaborates With</div>
            <div className="flex flex-wrap gap-1">{suggestion.collaborates_with.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[14px] text-[var(--text-secondary)]">{t}</span>)}</div>
          </div>
          <div>
            <div className="text-[15px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">External Parties</div>
            <div className="flex flex-wrap gap-1">{suggestion.external_parties.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[14px] text-[var(--text-secondary)]">{t}</span>)}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <div className="flex gap-2">
            <button onClick={() => _selectAll(suggestion)} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)] hover:border-purple-400">Select All</button>
            <button onClick={() => { setCheckedTasks(new Set()); setCheckedSkills(new Set()); setCheckedKpis(new Set()); setCheckedResps(new Set()); }} className="px-3 py-1.5 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Deselect All</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-[15px] font-semibold text-[var(--text-muted)] border border-[var(--border)]">Dismiss</button>
            <button onClick={handleAcceptSelected} disabled={checkedTasks.size === 0 && checkedSkills.size === 0}
              className="px-4 py-2 rounded-lg text-[15px] font-semibold text-white disabled:opacity-40 transition-all" style={{ background: "linear-gradient(135deg, var(--purple), #7C3AED)" }}>
              Accept Selected
            </button>
          </div>
        </div>
      </>}
    </div>
  </div>;
}


export interface JobDesignState {
  deconRows: Record<string, unknown>[];
  redeployRows: Record<string, unknown>[];
  scenario: string;
  deconSubmitted: boolean;
  redeploySubmitted: boolean;
  finalized: boolean;
  recon: Record<string, unknown> | null;
  initialized: boolean;
}
