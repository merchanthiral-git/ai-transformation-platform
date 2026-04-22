"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { fmt } from "../../lib/formatters";

/* ═══════════════════════════════════════════════════════════════
   NATURAL LANGUAGE QUERY BAR + RESULTS PANEL
   ═══════════════════════════════════════════════════════════════ */

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type NLQResult = {
  answer: string;
  data_type: "number" | "list" | "table" | "chart" | "comparison" | "error";
  data?: unknown;
  sql_like_logic?: string;
  confidence?: number;
  follow_up_questions?: string[];
  elapsed_ms?: number;
};

type HistoryEntry = {
  timestamp: string;
  question: string;
  answer_summary: string;
  data_type: string;
};

const SUGGESTIONS = [
  { category: "Workforce", questions: ["What is our headcount by function?", "Which roles have the most employees?"] },
  { category: "AI Transformation", questions: ["Which functions have highest automation potential?", "Show roles with high AI impact and low readiness"] },
  { category: "Reskilling", questions: ["What is our total reskilling investment?", "How many employees are high priority for reskilling?"] },
];

const CHART_COLORS = ["var(--accent-primary)", "var(--teal)", "var(--warning)", "var(--teal)", "var(--amber)", "var(--warning)", "var(--teal)", "var(--accent-primary)"];

export function NLQBar({ projectId, modelId, currentModule }: { projectId: string; modelId: string; currentModule: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NLQResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Global Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setShowSuggestions(true);
      }
      if (e.key === "Escape" && showResults) {
        setShowResults(false);
        setShowSuggestions(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showResults]);

  // Click outside to close
  useEffect(() => {
    if (!showResults && !showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showResults, showSuggestions]);

  // Load history on mount
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/nlq/history/${projectId}`, { headers: authHeaders() })
      .then(r => r.json()).then(d => setHistory(d.history || [])).catch((e) => { console.error("[NLQBar] history fetch error", e); });
  }, [projectId]);

  const runQuery = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setShowResults(true);
    setShowSuggestions(false);
    setResult(null);
    try {
      const resp = await fetch("/api/nlq/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ project_id: projectId, model_id: modelId, question: q, context: currentModule }),
      });
      const data = await resp.json();
      setResult(data);
      // Update history
      setHistory(prev => [...prev.slice(-9), { timestamp: new Date().toISOString(), question: q, answer_summary: (data.answer || "").slice(0, 200), data_type: data.data_type || "error" }]);
    } catch {
      setResult({ answer: "Could not reach the backend. Is it running?", data_type: "error", confidence: 0 });
    }
    setLoading(false);
  }, [projectId, modelId, currentModule]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); runQuery(query); };

  const [focused, setFocused] = useState(false);

  if (!modelId) return <div className="relative z-30 mb-4">
    <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "rgba(244,168,58,0.3)", zIndex: 2, pointerEvents: "none" }}>⌕</div>
    <input disabled placeholder="Upload data to enable AI search..." style={{ width: "100%", height: 48, paddingLeft: 40, paddingRight: 72, borderRadius: 12, fontSize: 13, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)", outline: "none", cursor: "not-allowed", fontFamily: "'Inter Tight', sans-serif" }} />
  </div>;

  return <div ref={panelRef} className="relative z-30 mb-4">
    {/* Search bar — primary interactive element */}
    <form onSubmit={handleSubmit} className="relative">
      <div style={{
        position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: focused ? "#f4a83a" : "rgba(244,168,58,0.5)", transition: "color 0.15s", zIndex: 2, pointerEvents: "none",
      }}>⌕</div>
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); if (!e.target.value) setShowSuggestions(true); }}
        onFocus={() => { setFocused(true); if (!query && !showResults) setShowSuggestions(true); }}
        onBlur={() => setFocused(false)}
        placeholder="Ask anything about your workforce (⌘K)... e.g. 'Which functions have the highest AI risk?'"
        className="nlq-placeholder"
        style={{
          width: "100%", height: 48, paddingLeft: 40, paddingRight: 72, borderRadius: 12, fontSize: 13,
          background: "rgba(255,255,255,0.05)",
          border: focused ? "1px solid rgba(244,168,58,0.6)" : "1px solid rgba(255,255,255,0.10)",
          boxShadow: focused ? "0 0 12px rgba(244,168,58,0.15)" : "none",
          color: "var(--text-primary)", outline: "none",
          transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
          fontFamily: "'Inter Tight', sans-serif",
        }}
        onMouseEnter={e => { if (!focused) (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.16)"; }}
        onMouseLeave={e => { if (!focused) (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.10)"; }}
      />
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 8 }}>
        {loading && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" /><div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" style={{ animationDelay: "0.15s" }} /><div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" style={{ animationDelay: "0.3s" }} /></div>}
        {!loading && <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface-2)" }}>⌘K</span>}
      </div>
    </form>

    {/* Suggestions dropdown */}
    {showSuggestions && !showResults && <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl overflow-hidden z-40">
      <div className="p-3 space-y-3 max-h-[320px] overflow-y-auto">
        {SUGGESTIONS.map(cat => <div key={cat.category}>
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">{cat.category}</div>
          {cat.questions.map(q => <button key={q} onClick={() => runQuery(q)} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)] transition-colors">{q}</button>)}
        </div>)}
        {history.length > 0 && <div>
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Recent</div>
          {history.slice(-5).reverse().map((h, i) => <button key={i} onClick={() => runQuery(h.question)} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--hover)] transition-colors truncate">{h.question}</button>)}
        </div>}
      </div>
    </div>}

    {/* Results panel */}
    {showResults && <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-2xl overflow-hidden z-40 max-h-[70vh] overflow-y-auto">
      {loading && <div className="p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
        <div className="text-[13px] text-[var(--text-muted)]">Analyzing your data...</div>
      </div>}

      {!loading && result && <div className="p-4 space-y-4">
        {/* Answer card */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[14px] shrink-0" style={{ background: "linear-gradient(135deg, rgba(244,168,58,0.15), rgba(192,112,48,0.1))" }}>🔍</div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] text-[var(--text-primary)] leading-relaxed font-heading">{result.answer}</div>
            {result.confidence !== undefined && result.confidence < 0.7 && <div className="text-[11px] text-[var(--warning)] mt-1 flex items-center gap-1"><span>⚠</span> Based on available data (confidence: {Math.round(result.confidence * 100)}%)</div>}
            {result.sql_like_logic && <div className="text-[11px] text-[var(--text-muted)] mt-1 font-data">{result.sql_like_logic}</div>}
            {result.elapsed_ms && <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{result.elapsed_ms}ms</div>}
          </div>
        </div>

        {/* Data visualization */}
        {result.data_type !== "error" && result.data && <NLQDataViz type={result.data_type} data={result.data} />}

        {/* Follow-up questions */}
        {result.follow_up_questions && result.follow_up_questions.length > 0 && <div>
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Related questions</div>
          <div className="flex flex-wrap gap-1.5">{result.follow_up_questions.map((q, i) => <button key={i} onClick={() => runQuery(q)} className="px-2.5 py-1.5 rounded-lg text-[12px] text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-all">{q}</button>)}</div>
        </div>}

        {/* History */}
        {history.length > 1 && <div className="pt-3 border-t border-[var(--border)]">
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Recent</div>
          <div className="flex flex-wrap gap-1">{history.slice(-5).reverse().filter(h => h.question !== query).slice(0, 3).map((h, i) => <button key={i} onClick={() => runQuery(h.question)} className="px-2 py-1 rounded text-[11px] text-[var(--text-muted)] bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors truncate max-w-[200px]">{h.question}</button>)}</div>
        </div>}
      </div>}
    </div>}
  </div>;
}


/* ── Data Visualization based on type ── */

function NLQDataViz({ type, data }: { type: string; data: unknown }) {
  if (!data) return null;

  if (type === "number") {
    const d = data as { value: number; label?: string };
    return <div className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)] text-center">
      <div className="text-[32px] font-extrabold text-[var(--accent-primary)]">{typeof d.value === "number" ? fmt(d.value) : String(d.value || d)}</div>
      {d.label && <div className="text-[12px] text-[var(--text-muted)] mt-1">{d.label}</div>}
    </div>;
  }

  if (type === "list") {
    const items = (Array.isArray(data) ? data : []) as { label: string; value: unknown }[];
    if (!items.length) return null;
    return <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      {items.map((item, i) => <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--hover)] transition-colors">
        <span className="text-[13px] text-[var(--text-primary)]">{item.label || String(item)}</span>
        {item.value !== undefined && <span className="text-[13px] font-bold text-[var(--accent-primary)] font-data">{typeof item.value === "number" ? fmt(item.value) : String(item.value)}</span>}
      </div>)}
    </div>;
  }

  if (type === "table") {
    const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
    if (!rows.length) return null;
    const cols = Object.keys(rows[0]);
    return <div className="rounded-xl border border-[var(--border)] overflow-x-auto">
      <table className="w-full"><thead><tr className="bg-[var(--surface-2)]">
        {cols.map(c => <th key={c} className="px-3 py-2 text-left text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border)]">{c}</th>)}
      </tr></thead><tbody>
        {rows.slice(0, 10).map((row, ri) => <tr key={ri} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--hover)]">
          {cols.map(c => <td key={c} className="px-3 py-2 text-[13px] text-[var(--text-primary)]">{typeof row[c] === "number" ? fmt(row[c] as number) : String(row[c] ?? "")}</td>)}
        </tr>)}
      </tbody></table>
      {rows.length > 10 && <div className="px-3 py-2 text-[11px] text-[var(--text-muted)] text-center border-t border-[var(--border)]">Showing 10 of {fmt(rows.length)} rows</div>}
    </div>;
  }

  if (type === "chart") {
    const items = (Array.isArray(data) ? data : []) as { name: string; value: number }[];
    if (!items.length) return null;
    const maxVal = Math.max(...items.map(d => Number(d.value) || 0), 1);
    return <div className="space-y-1.5">
      {items.map((item, i) => <div key={i} className="flex items-center gap-3">
        <span className="text-[12px] text-[var(--text-primary)] font-semibold w-32 truncate shrink-0">{item.name}</span>
        <div className="flex-1 h-5 bg-[var(--surface-3)] rounded overflow-hidden">
          <div className="h-full rounded transition-all flex items-center pl-2" style={{ width: `${Math.max(5, (Number(item.value) / maxVal) * 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}>
            <span className="text-[10px] font-bold text-white drop-shadow">{typeof item.value === "number" ? fmt(item.value) : item.value}</span>
          </div>
        </div>
      </div>)}
    </div>;
  }

  if (type === "comparison") {
    const d = data as { left: { label: string; values: Record<string, unknown> }; right: { label: string; values: Record<string, unknown> } };
    if (!d?.left || !d?.right) return null;
    const allKeys = [...new Set([...Object.keys(d.left.values || {}), ...Object.keys(d.right.values || {})])];
    return <div className="grid grid-cols-2 gap-3">
      {[d.left, d.right].map((side, si) => <div key={si} className="rounded-xl p-4 bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="text-[14px] font-bold text-[var(--text-primary)] mb-3 font-heading" style={{ color: CHART_COLORS[si] }}>{side.label}</div>
        <div className="space-y-2">{allKeys.map(k => <div key={k} className="flex items-center justify-between">
          <span className="text-[12px] text-[var(--text-muted)]">{k}</span>
          <span className="text-[13px] font-bold text-[var(--text-primary)] font-data">{typeof side.values[k] === "number" ? fmt(side.values[k] as number) : String(side.values[k] ?? "—")}</span>
        </div>)}</div>
      </div>)}
    </div>;
  }

  return null;
}
