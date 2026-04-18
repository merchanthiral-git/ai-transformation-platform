"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──
interface Observation {
  text: string;
  severity?: "info" | "warning" | "critical";
  metric?: string | number | null;
}
interface Action {
  text: string;
  module_link?: string | null;
}
interface InsightsResult {
  observations: Observation[];
  actions: Action[];
  confidence: number;
  source: "ai" | "rules";
}
interface Recommendation {
  title: string;
  description: string;
  action: "navigate" | "workflow" | "info";
  target?: string | null;
  priority: "high" | "medium" | "low";
}

// ── Fetch helpers ──
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// ═══════════════════════════════════════════════════════════════
//  AI OBSERVATIONS PANEL — collapsible, per-module insights
// ═══════════════════════════════════════════════════════════════

export function AiObservationsPanel({ module, dataSummary, context, filters, projectId, onNavigate }: {
  module: string;
  dataSummary: string;
  context: string;
  filters?: Record<string, string>;
  projectId: string;
  onNavigate?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef("");

  const fetchInsights = useCallback(async () => {
    const key = `${module}:${dataSummary.slice(0, 100)}`;
    if (fetchedRef.current === key && insights) return;
    fetchedRef.current = key;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ module, data_summary: dataSummary, context, filters, project_id: projectId }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch {
      // Silently fail — insights are non-critical
    }
    setLoading(false);
  }, [module, dataSummary, context, filters, projectId]);

  // Auto-fetch on expand
  useEffect(() => {
    if (expanded && !insights && !loading) fetchInsights();
  }, [expanded, insights, loading, fetchInsights]);

  const severityIcon = (s?: string) => s === "critical" ? "🔴" : s === "warning" ? "🟡" : "🔵";
  const severityColor = (s?: string) => s === "critical" ? "rgba(239,68,68,0.7)" : s === "warning" ? "rgba(234,179,8,0.7)" : "rgba(59,130,246,0.6)";

  return (
    <div style={{
      borderRadius: 14,
      border: "1px solid rgba(139,92,246,0.12)",
      background: expanded ? "rgba(139,92,246,0.04)" : "transparent",
      transition: "all 0.3s ease",
      marginBottom: 12,
    }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
        background: "none", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 15, opacity: 0.8 }}>🧠</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(139,92,246,0.8)", fontFamily: "'Outfit', sans-serif", flex: 1, letterSpacing: 0.3 }}>
          AI Observations
        </span>
        {insights && !expanded && (
          <span style={{ fontSize: 11, color: "rgba(139,92,246,0.5)", fontFamily: "'IBM Plex Mono', monospace" }}>
            {insights.observations.length} insights
          </span>
        )}
        <span style={{ fontSize: 12, color: "rgba(139,92,246,0.4)", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▾</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 14px" }}>
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                  <div style={{ width: 14, height: 14, border: "2px solid rgba(139,92,246,0.3)", borderTopColor: "var(--purple)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 13, color: "rgba(139,92,246,0.5)" }}>Analyzing...</span>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {insights && (
                <>
                  {insights.observations.map((obs, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < insights.observations.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <span style={{ fontSize: 12, flexShrink: 0, marginTop: 2 }}>{severityIcon(obs.severity)}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{obs.text}</div>
                        {obs.metric && <div style={{ fontSize: 12, fontWeight: 700, color: severityColor(obs.severity), fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{obs.metric}</div>}
                      </div>
                    </div>
                  ))}

                  {insights.actions.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {insights.actions.map((action, i) => (
                        <button key={i} onClick={() => action.module_link && onNavigate?.(action.module_link)} style={{
                          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                          color: "#a78bfa", cursor: action.module_link ? "pointer" : "default",
                          fontFamily: "'Outfit', sans-serif", transition: "all 0.15s",
                        }}>{action.text} {action.module_link ? "→" : ""}</button>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <div style={{ width: 40, height: 3, borderRadius: 2, background: "rgba(139,92,246,0.1)", overflow: "hidden" }}>
                      <div style={{ width: `${insights.confidence * 100}%`, height: "100%", background: "var(--purple)", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, color: "rgba(139,92,246,0.35)", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {insights.source === "ai" ? "AI-powered" : "Rule-based"} · {Math.round(insights.confidence * 100)}% confidence
                    </span>
                    <button onClick={() => { fetchedRef.current = ""; setInsights(null); fetchInsights(); }} style={{ marginLeft: "auto", fontSize: 11, color: "rgba(139,92,246,0.4)", background: "none", border: "none", cursor: "pointer" }}>↻ Refresh</button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SMART RECOMMENDATIONS — next-step cards
// ═══════════════════════════════════════════════════════════════

export function SmartRecommendations({ completedModules, hasWorkforce, hasWorkDesign, currentModule, context, onNavigate }: {
  completedModules: string[];
  hasWorkforce: boolean;
  hasWorkDesign: boolean;
  currentModule: string;
  context: string;
  onNavigate?: (id: string) => void;
}) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const params = new URLSearchParams({
      completed: completedModules.join(","),
      current: currentModule,
      context,
      has_workforce: String(hasWorkforce),
      has_work_design: String(hasWorkDesign),
    });
    fetch(`/api/ai/recommendations?${params}`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.recommendations) setRecs(data.recommendations); })
      .catch(() => {});
  }, [completedModules, hasWorkforce, hasWorkDesign, currentModule, context]);

  const visible = recs.filter(r => !dismissed.has(r.title));
  if (visible.length === 0) return null;

  const priorityColor = (p: string) => p === "high" ? "var(--accent-primary)" : p === "medium" ? "var(--purple)" : "rgba(255,255,255,0.3)";
  const priorityIcon = (p: string) => p === "high" ? "⚡" : p === "medium" ? "💡" : "📌";

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      {visible.map(rec => (
        <motion.div
          key={rec.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            flex: "1 1 260px", maxWidth: 360, padding: "14px 18px", borderRadius: 14,
            background: "rgba(255,255,255,0.03)", border: `1px solid ${priorityColor(rec.priority)}25`,
            cursor: rec.target ? "pointer" : "default", transition: "all 0.2s",
            position: "relative",
          }}
          onClick={() => rec.target && rec.action === "navigate" && onNavigate?.(rec.target)}
          whileHover={rec.target ? { y: -2, borderColor: `${priorityColor(rec.priority)}50` } : undefined}
        >
          <button onClick={e => { e.stopPropagation(); setDismissed(prev => new Set([...prev, rec.title])); }} style={{
            position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 6,
            background: "none", border: "none", color: "rgba(255,255,255,0.15)", fontSize: 12, cursor: "pointer",
          }}>✕</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>{priorityIcon(rec.priority)}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: priorityColor(rec.priority), fontFamily: "'Outfit', sans-serif" }}>{rec.title}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{rec.description}</div>
          {rec.target && rec.action === "navigate" && (
            <div style={{ fontSize: 11, fontWeight: 600, color: priorityColor(rec.priority), marginTop: 8, fontFamily: "'Outfit', sans-serif" }}>Open →</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  WORKFLOW SUGGESTIONS — user-triggered AI workflows
// ═══════════════════════════════════════════════════════════════

const WORKFLOWS = [
  {
    id: "full_diagnostic",
    title: "Run Full Diagnostic",
    description: "Analyze org health, AI opportunity, change readiness, and manager capability in sequence.",
    icon: "🔬",
    steps: ["snapshot", "scan", "orghealth", "changeready", "mgrcap"],
  },
  {
    id: "design_sprint",
    title: "Design Sprint",
    description: "Focus on a single role — decompose tasks, score automation potential, and redesign the role.",
    icon: "✏️",
    steps: ["design"],
  },
  {
    id: "quick_scenario",
    title: "Quick Scenario",
    description: "Generate a baseline simulation from current data — balanced adoption, standard timeline.",
    icon: "🎯",
    steps: ["simulate"],
  },
  {
    id: "exec_brief",
    title: "Executive Brief",
    description: "Generate a stakeholder-ready narrative from whatever analysis you've completed so far.",
    icon: "📊",
    steps: ["export"],
  },
];

export function WorkflowSuggestions({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? WORKFLOWS : WORKFLOWS.slice(0, 2);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(232,197,71,0.6)", fontFamily: "'Outfit', sans-serif", letterSpacing: 0.3 }}>Suggested Workflows</span>
        {WORKFLOWS.length > 2 && (
          <button onClick={() => setShowAll(!showAll)} style={{ fontSize: 11, color: "rgba(232,197,71,0.35)", background: "none", border: "none", cursor: "pointer" }}>
            {showAll ? "Show less" : `+${WORKFLOWS.length - 2} more`}
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {visible.map(wf => (
          <button key={wf.id} onClick={() => wf.steps[0] && onNavigate?.(wf.steps[0])} style={{
            padding: "10px 16px", borderRadius: 12, fontSize: 12,
            background: "rgba(232,197,71,0.04)", border: "1px solid rgba(232,197,71,0.1)",
            color: "rgba(232,197,71,0.7)", cursor: "pointer", textAlign: "left",
            transition: "all 0.2s", display: "flex", alignItems: "flex-start", gap: 10,
            flex: "1 1 220px", maxWidth: 300,
          }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(232,197,71,0.25)"; e.currentTarget.style.background = "rgba(232,197,71,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(232,197,71,0.1)"; e.currentTarget.style.background = "rgba(232,197,71,0.04)"; }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{wf.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif", marginBottom: 2 }}>{wf.title}</div>
              <div style={{ fontSize: 11, color: "rgba(232,197,71,0.4)", lineHeight: 1.4 }}>{wf.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
