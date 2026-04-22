"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../../lib/api";
import { Badge, usePersisted, showToast } from "./shared";

/* ── Types ─────────────────────────────────────────────────────────────── */

type Mode = "assessment" | "roadmap" | "ask";
type Depth = "quick" | "standard" | "comprehensive";

interface AssessmentQuestion {
  id: string;
  text: string;
  dimension: string;
}

interface DimScore {
  dimension: string;
  score: number;
  gap: string;
}

interface AssessmentResult {
  dimensions: DimScore[];
  overallScore: number;
}

interface RoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  tools: { name: string; timeEstimate: string; pageId: string }[];
  milestone: string;
}

interface QuickWin {
  title: string;
  pageId: string;
}

interface RoadmapData {
  summary: string;
  quickWins: QuickWin[];
  phases: RoadmapPhase[];
  currentPhase: number;
  completionPercent: number;
}

interface ConciergeResponse {
  text: string;
  navigationActions?: { label: string; pageId: string }[];
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const DEPTH_CFG: Record<Depth, { label: string; count: number; desc: string }> = {
  quick:         { label: "Quick",         count: 7,  desc: "7 questions — ~3 min" },
  standard:      { label: "Standard",      count: 15, desc: "15 questions — ~7 min" },
  comprehensive: { label: "Comprehensive", count: 25, desc: "25 questions — ~12 min" },
};

const LIKERT = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

const DIMS = [
  "Strategy & Vision", "Data Readiness", "Technology Infrastructure",
  "Talent & Skills", "Process Maturity", "Culture & Change",
  "Governance & Ethics", "Innovation Capacity",
];

function sevColor(s: number) {
  if (s <= 2) return "var(--coral)";
  if (s <= 3) return "#f59e0b";
  if (s <= 4) return "var(--amber)";
  return "var(--sage)";
}

function sevLabel(s: number) {
  if (s <= 2) return "Critical Gap";
  if (s <= 3) return "Significant Gap";
  if (s <= 4) return "Moderate";
  return "Strong";
}

/* ── Shared CSS-variable tokens ────────────────────────────────────────── */

const C = {
  txt:   "var(--text-primary, #f5f0eb)",
  txt2:  "var(--text-secondary, #a8a29e)",
  acc:   "var(--accent-primary, #e8a74e)",
  brd:   "var(--border-subtle, #3a3530)",
  surf:  "var(--surface-elevated, #2a2520)",
  surfH: "var(--surface-hover, #332e28)",
  warm:  "var(--surface-warm, #231f1a)",
  dark:  "#1a1510",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 20px", borderRadius: 8, border: "none",
  background: C.acc, color: C.dark, fontWeight: 600, fontSize: 14, cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 20px", borderRadius: 8,
  border: `1px solid ${C.brd}`, background: "none",
  color: C.txt2, fontWeight: 500, fontSize: 14, cursor: "pointer",
};

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: C.acc,
  cursor: "pointer", fontSize: 13, fontWeight: 500, padding: 0, textDecoration: "underline",
};

const goBtn: React.CSSProperties = {
  padding: "4px 12px", borderRadius: 6,
  border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.1)",
  color: "var(--sage)", fontWeight: 600, fontSize: 12, cursor: "pointer",
};

const hoverBg = (e: React.MouseEvent<HTMLElement>, bg: string) => {
  e.currentTarget.style.background = bg;
};

/* ── Component ─────────────────────────────────────────────────────────── */

export function PlatformConcierge({ projectId, currentPage, onNavigate }: {
  projectId: string; currentPage: string; onNavigate?: (pageId: string) => void;
}) {
  /* ── All hooks at top ───────────────────────────────────────────────── */
  const [isOpen, setIsOpen]       = usePersisted<boolean>("concierge_open", false);
  const [mode, setMode]           = usePersisted<Mode>("concierge_mode", "assessment");
  const [responses, setResponses] = usePersisted<Record<string, number>>("concierge_responses", {});
  const [pulseDone, setPulseDone] = useState(false);

  const [depth, setDepth]         = useState<Depth | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [curQ, setCurQ]           = useState(0);
  const [aLoading, setALoading]   = useState(false);
  const [result, setResult]       = useState<AssessmentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [roadmap, setRoadmap]     = useState<RoadmapData | null>(null);
  const [rmLoading, setRmLoading] = useState(false);

  const [askInput, setAskInput]   = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askResp, setAskResp]     = useState<ConciergeResponse | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Keyboard shortcut: Cmd+K / Ctrl+K ──────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setMode("ask");
        setTimeout(() => inputRef.current?.focus(), 120);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setIsOpen, setMode]);

  /* Pulse animation — dismiss after 4 s */
  useEffect(() => {
    const t = setTimeout(() => setPulseDone(true), 4000);
    return () => clearTimeout(t);
  }, []);

  /* Load roadmap on mount */
  const loadRoadmap = useCallback(async () => {
    setRmLoading(true);
    try {
      const d = await (api as any).getConciergeRoadmap(projectId);
      if (d?.phases) setRoadmap(d as RoadmapData);
    } catch { /* roadmap may not exist yet */ }
    finally { setRmLoading(false); }
  }, [projectId]);

  useEffect(() => { if (projectId) loadRoadmap(); }, [projectId, loadRoadmap]);

  /* Focus input when Ask mode is active */
  useEffect(() => {
    if (isOpen && mode === "ask") setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen, mode]);

  /* ── API: assessment questions ──────────────────────────────────────── */
  const loadQuestions = useCallback(async (d: Depth) => {
    setALoading(true);
    try {
      const data = await (api as any).getAssessmentQuestions(d);
      setQuestions(Array.isArray(data?.questions) ? data.questions : fallbackQs(d));
    } catch {
      showToast("Could not load questions — using defaults");
      setQuestions(fallbackQs(d));
    } finally {
      setALoading(false);
      setCurQ(0);
      setResult(null);
    }
  }, []);

  /* ── API: submit assessment ────────────────────────────────────────── */
  const submitAssessment = useCallback(async () => {
    setSubmitting(true);
    try {
      const data = await (api as any).submitAssessment({ projectId, depth, responses });
      setResult(data?.dimensions ? (data as AssessmentResult) : localResult(questions, responses));
    } catch {
      showToast("Scored locally — backend unavailable");
      setResult(localResult(questions, responses));
    } finally {
      setSubmitting(false);
    }
  }, [projectId, depth, responses, questions]);

  /* ── API: ask concierge ────────────────────────────────────────────── */
  const sendAsk = useCallback(async () => {
    if (!askInput.trim()) return;
    setAskLoading(true);
    try {
      setAskResp(await (api as any).askConcierge(askInput, currentPage) as ConciergeResponse);
    } catch {
      setAskResp({ text: "Connection issue — please try again.", navigationActions: [] });
    } finally {
      setAskLoading(false);
      setAskInput("");
    }
  }, [askInput, currentPage]);

  /* ── Derived state ─────────────────────────────────────────────────── */
  const hasUnstarted = roadmap ? roadmap.completionPercent < 100 && roadmap.phases.length > 0 : false;
  const totalQ = questions.length;
  const progressPct = totalQ > 0 ? ((curQ + 1) / totalQ) * 100 : 0;

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const nav = (p: string) => { onNavigate?.(p); setIsOpen(false); };
  const selectDepth = (d: Depth) => { setDepth(d); setResponses({}); loadQuestions(d); };
  const answer = (v: number) => { const id = questions[curQ]?.id; if (id) setResponses(prev => ({ ...prev, [id]: v })); };
  const nextQ = () => { curQ < totalQ - 1 ? setCurQ(curQ + 1) : submitAssessment(); };

  const reset = () => {
    setDepth(null);
    setQuestions([]);
    setCurQ(0);
    setResponses({});
    setResult(null);
  };

  const tabCss = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "8px 0", fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? C.acc : C.txt2,
    background: "none", border: "none",
    borderBottom: active ? `2px solid ${C.acc}` : "2px solid transparent",
    cursor: "pointer",
  });

  /* ── Render: Assessment ────────────────────────────────────────────── */
  const rAssessment = () => {
    /* Depth selection */
    if (!depth) return (
      <div style={{ padding: "24px 20px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: C.txt }}>AI Readiness Assessment</h3>
        <p style={{ fontSize: 13, color: C.txt2, marginBottom: 20 }}>
          Select the depth of your assessment to get started.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(Object.keys(DEPTH_CFG) as Depth[]).map(d => (
            <button key={d} onClick={() => selectDepth(d)}
              style={{ padding: "16px 20px", borderRadius: 10, border: `1px solid ${C.brd}`, background: C.surf, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s, background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.acc; hoverBg(e, C.surfH); }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.brd; hoverBg(e, C.surf); }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: C.txt }}>{DEPTH_CFG[d].label}</div>
              <div style={{ fontSize: 13, color: C.txt2, marginTop: 4 }}>{DEPTH_CFG[d].desc}</div>
            </button>
          ))}
        </div>
      </div>
    );

    /* Loading / submitting spinner */
    if (aLoading || submitting) return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 1s linear infinite" }}>&#9881;</div>
        <p style={{ color: C.txt2 }}>{submitting ? "Analyzing responses..." : "Loading questions..."}</p>
      </div>
    );

    /* Results screen */
    if (result) return rResults();

    /* No questions edge case */
    if (totalQ === 0) return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: C.txt2 }}>All questions answered. Tap "Start over" to retake the assessment.</p>
        <button onClick={reset} style={linkBtn}>Start over</button>
      </div>
    );

    /* Question display */
    const q = questions[curQ];
    const ans = q ? responses[q.id] : undefined;

    return (
      <div style={{ padding: 20 }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.txt2 }}>
              Question {curQ + 1} of {totalQ} — {q?.dimension}
            </span>
            <button onClick={reset} style={{ ...linkBtn, fontSize: 11 }}>Reset</button>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: C.brd, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: C.acc, borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Question text */}
        <p style={{ fontSize: 15, fontWeight: 500, color: C.txt, lineHeight: 1.5, marginBottom: 24 }}>
          {q?.text}
        </p>

        {/* Likert options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {LIKERT.map((label, i) => {
            const v = i + 1;
            const sel = ans === v;
            return (
              <button key={v} onClick={() => answer(v)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8,
                  border: sel ? `1.5px solid ${C.acc}` : `1px solid ${C.brd}`,
                  background: sel ? "rgba(232,167,78,0.1)" : C.surf, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%",
                  border: sel ? `5px solid ${C.acc}` : "2px solid #5a5550", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: C.txt }}>{v}. {label}</span>
              </button>
            );
          })}
        </div>

        {/* Next / Finish button */}
        <button onClick={nextQ} disabled={ans === undefined}
          style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
            background: ans !== undefined ? C.acc : C.brd,
            color: ans !== undefined ? C.dark : C.txt2,
            fontWeight: 600, fontSize: 14,
            cursor: ans !== undefined ? "pointer" : "not-allowed", transition: "background 0.15s" }}>
          {curQ < totalQ - 1 ? "Next" : "Finish & See Results"}
        </button>
      </div>
    );
  };

  /* ── Render: Assessment results ────────────────────────────────────── */
  const rResults = () => {
    if (!result) return null;
    return (
      <div style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: C.txt }}>Assessment Results</h3>
        <p style={{ fontSize: 13, color: C.txt2, marginBottom: 20 }}>
          Overall score: <strong style={{ color: C.txt }}>{result.overallScore.toFixed(1)}</strong> / 5.0
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {result.dimensions.map(d => (
            <div key={d.dimension}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.txt }}>{d.dimension}</span>
                <Badge color={sevColor(d.score)}>{sevLabel(d.score)}</Badge>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: C.brd, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(d.score / 5) * 100}%`, background: sevColor(d.score), borderRadius: 4, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: 11, color: C.txt2, marginTop: 2 }}>{d.score.toFixed(1)} / 5.0</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
          <button onClick={() => { setMode("roadmap"); loadRoadmap(); }} style={primaryBtn}>
            Generate Roadmap &rarr;
          </button>
          <button onClick={reset} style={secondaryBtn}>Retake</button>
        </div>
      </div>
    );
  };

  /* ── Render: Roadmap ───────────────────────────────────────────────── */
  const rRoadmap = () => {
    if (rmLoading) return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 32, animation: "spin 1s linear infinite" }}>&#9881;</div>
        <p style={{ color: C.txt2, marginTop: 12 }}>Loading roadmap...</p>
      </div>
    );

    if (!roadmap) return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: C.txt2, marginBottom: 16, lineHeight: 1.5 }}>
          Complete the assessment first to generate your roadmap.
        </p>
        <button onClick={() => setMode("assessment")} style={primaryBtn}>Start Assessment</button>
      </div>
    );

    return (
      <div style={{ padding: 20 }}>
        {/* Progress indicator */}
        <div style={{ padding: "12px 16px", borderRadius: 8, background: C.surf, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: C.txt2 }}>Phase {roadmap.currentPhase} of {roadmap.phases.length}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.acc }}>{roadmap.completionPercent}% complete</span>
        </div>

        {/* Executive summary */}
        <p style={{ fontSize: 13, color: C.txt2, lineHeight: 1.6, marginBottom: 20 }}>{roadmap.summary}</p>

        {/* Quick wins */}
        {roadmap.quickWins.length > 0 && (
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sage)", marginBottom: 10 }}>Quick Wins</div>
            {roadmap.quickWins.map((w, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < roadmap.quickWins.length - 1 ? 8 : 0 }}>
                <span style={{ fontSize: 13, color: C.txt }}>{w.title}</span>
                <button onClick={() => nav(w.pageId)} style={goBtn}>Go &rarr;</button>
              </div>
            ))}
          </div>
        )}

        {/* Phase timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {roadmap.phases.map(ph => (
            <div key={ph.phase} style={{ padding: 16, borderRadius: 10, border: `1px solid ${C.brd}`, background: C.surf }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.acc, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Phase {ph.phase}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.txt, marginTop: 2 }}>{ph.title}</div>
                </div>
                <Badge color="var(--amber)">{ph.duration}</Badge>
              </div>

              {/* Duration bar */}
              <div style={{ height: 3, borderRadius: 2, background: C.brd, marginBottom: 12 }}>
                <div style={{ height: "100%", width: ph.phase <= roadmap.currentPhase ? "100%" : "0%", background: C.acc, borderRadius: 2, transition: "width 0.5s" }} />
              </div>

              {/* Tools list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {ph.tools.map((t, j) => (
                  <button key={j} onClick={() => nav(t.pageId)}
                    style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: 6, border: "none", background: "rgba(255,255,255,0.03)", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => hoverBg(e, "rgba(255,255,255,0.07)")}
                    onMouseLeave={e => hoverBg(e, "rgba(255,255,255,0.03)")}>
                    <span style={{ fontSize: 13, color: C.txt }}>{t.name}</span>
                    <span style={{ fontSize: 11, color: C.txt2 }}>{t.timeEstimate}</span>
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 12, color: C.txt2, fontStyle: "italic" }}>Milestone: {ph.milestone}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ── Render: Ask ───────────────────────────────────────────────────── */
  const rAsk = () => (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Input row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input ref={inputRef} type="text" value={askInput}
          onChange={e => setAskInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAsk(); } }}
          placeholder="What do you need help with?"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.brd}`, background: C.surf, color: C.txt, fontSize: 14, outline: "none", transition: "border-color 0.15s" }}
          onFocus={e => { e.currentTarget.style.borderColor = C.acc; }}
          onBlur={e => { e.currentTarget.style.borderColor = C.brd; }} />
        <button onClick={sendAsk} disabled={!askInput.trim() || askLoading}
          style={{ padding: "10px 16px", borderRadius: 8, border: "none",
            background: askInput.trim() ? C.acc : C.brd,
            color: askInput.trim() ? C.dark : C.txt2,
            fontWeight: 600, fontSize: 14,
            cursor: askInput.trim() ? "pointer" : "not-allowed", flexShrink: 0 }}>
          {askLoading ? "..." : "Send"}
        </button>
      </div>

      {/* Keyboard hint */}
      <div style={{ fontSize: 11, color: C.txt2, marginBottom: 16 }}>
        Tip: Press{" "}
        <kbd style={{ padding: "1px 5px", borderRadius: 3, background: C.surf, border: `1px solid ${C.brd}`, fontSize: 11 }}>
          {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "Cmd" : "Ctrl"}+K
        </kbd>{" "}
        to open this from anywhere.
      </div>

      {/* Loading indicator */}
      {askLoading && (
        <div style={{ padding: 20, textAlign: "center" }}>
          <div style={{ animation: "spin 1s linear infinite", fontSize: 24 }}>&#9881;</div>
          <p style={{ color: C.txt2, marginTop: 8, fontSize: 13 }}>Thinking...</p>
        </div>
      )}

      {/* Response */}
      {askResp && !askLoading && (
        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: 16, borderRadius: 10, background: C.surf, border: `1px solid ${C.brd}`, marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: C.txt, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {askResp.text}
            </div>
          </div>
          {askResp.navigationActions && askResp.navigationActions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {askResp.navigationActions.map((a, i) => (
                <button key={i} onClick={() => nav(a.pageId)}
                  style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.acc}`, background: "rgba(232,167,78,0.08)", color: C.acc, fontWeight: 500, fontSize: 13, cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
                  onMouseEnter={e => hoverBg(e, "rgba(232,167,78,0.15)")}
                  onMouseLeave={e => hoverBg(e, "rgba(232,167,78,0.08)")}>
                  {a.label} &rarr;
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!askResp && !askLoading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: C.txt2, textAlign: "center", lineHeight: 1.6 }}>
            Ask about any platform feature, get guidance on your transformation journey, or request navigation help.
          </p>
        </div>
      )}
    </div>
  );

  /* ── Main render ───────────────────────────────────────────────────── */
  return (
    <>
      {/* Global keyframe styles */}
      <style>{`
        @keyframes concierge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232, 167, 78, 0.5); }
          50% { box-shadow: 0 0 0 12px rgba(232, 167, 78, 0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 767px) {
          .concierge-panel { width: 100vw !important; right: 0 !important; }
        }
      `}</style>

      {/* Overlay */}
      {isOpen && (
        <div onClick={() => setIsOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9997 }} />
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label="Toggle Platform Concierge"
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: "50%",
          border: "none", background: C.acc, color: C.dark,
          fontSize: 24, fontWeight: 700, cursor: "pointer",
          zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          animation: !pulseDone ? "concierge-pulse 2s ease-in-out 3" : "none",
          transition: "transform 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {isOpen ? "\u2715" : "\uD83E\uDDED"}
        {!isOpen && hasUnstarted && (
          <span style={{
            position: "absolute", top: 4, right: 4,
            width: 12, height: 12, borderRadius: "50%",
            background: "var(--coral)", border: `2px solid ${C.acc}`,
          }} />
        )}
      </button>

      {/* Slide-in panel */}
      <div ref={panelRef} className="concierge-panel"
        style={{
          position: "fixed", top: 0, right: 0,
          width: 420, height: "100vh",
          background: C.warm,
          borderLeft: `1px solid ${C.brd}`,
          zIndex: 9998,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.txt, margin: 0, fontFamily: "var(--font-heading, 'Inter Tight', sans-serif)" }}>
            Platform Concierge
          </h2>
          <button onClick={() => setIsOpen(false)} aria-label="Close panel"
            style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: C.surf, color: C.txt2, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
            onMouseEnter={e => hoverBg(e, C.surfH)}
            onMouseLeave={e => hoverBg(e, C.surf)}>
            &times;
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.brd}`, flexShrink: 0 }}>
          <button onClick={() => setMode("assessment")} style={tabCss(mode === "assessment")}>Assessment</button>
          <button onClick={() => setMode("roadmap")} style={tabCss(mode === "roadmap")}>Roadmap</button>
          <button onClick={() => setMode("ask")} style={tabCss(mode === "ask")}>Ask</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {mode === "assessment" && rAssessment()}
          {mode === "roadmap" && rRoadmap()}
          {mode === "ask" && rAsk()}
        </div>
      </div>
    </>
  );
}

/* ── Fallback question bank ────────────────────────────────────────────── */

const FALLBACK_STATEMENTS: Record<string, string[]> = {
  "Strategy & Vision": [
    "Our organization has a clearly articulated AI strategy aligned with business goals.",
    "Leadership actively champions AI transformation initiatives.",
    "We have defined measurable KPIs for our AI transformation efforts.",
  ],
  "Data Readiness": [
    "Our organization has centralized, high-quality data accessible for analytics.",
    "We have robust data governance practices in place.",
    "Data pipelines are automated and reliable across the organization.",
  ],
  "Technology Infrastructure": [
    "Our technology stack can support AI/ML workloads at scale.",
    "We have cloud infrastructure capable of elastic scaling for AI workloads.",
    "Our development and deployment pipelines support rapid AI model iteration.",
  ],
  "Talent & Skills": [
    "We have sufficient in-house talent with AI and machine learning expertise.",
    "Our workforce is actively being upskilled in AI-related competencies.",
    "We can attract and retain top AI talent competitively.",
  ],
  "Process Maturity": [
    "Core business processes are well-documented and standardized.",
    "We have identified which processes are best suited for AI augmentation.",
    "Process optimization is driven by data-informed decision making.",
  ],
  "Culture & Change": [
    "Our organizational culture embraces experimentation and calculated risk-taking.",
    "Employees across levels are receptive to AI-driven changes in their work.",
    "We have effective change management practices for technology transformations.",
  ],
  "Governance & Ethics": [
    "We have established AI ethics guidelines and review processes.",
    "AI model decisions are transparent and explainable to stakeholders.",
    "We have clear accountability frameworks for AI system outcomes.",
  ],
  "Innovation Capacity": [
    "We regularly pilot and test new AI use cases across business units.",
    "Cross-functional collaboration is the norm for innovation projects.",
    "We have dedicated resources and budget allocated for AI experimentation.",
  ],
};

function fallbackQs(depth: Depth): AssessmentQuestion[] {
  const count = DEPTH_CFG[depth].count;
  const qs: AssessmentQuestion[] = [];
  let idx = 0;
  while (qs.length < count) {
    const dim = DIMS[idx % DIMS.length];
    const stmts = FALLBACK_STATEMENTS[dim];
    const stmtIdx = Math.floor(idx / DIMS.length) % stmts.length;
    qs.push({ id: `q_${qs.length + 1}`, text: stmts[stmtIdx], dimension: dim });
    idx++;
  }
  return qs;
}

/* ── Local scoring fallback ────────────────────────────────────────────── */

function localResult(questions: AssessmentQuestion[], responses: Record<string, number>): AssessmentResult {
  const acc: Record<string, { total: number; count: number }> = {};
  for (const q of questions) {
    const v = responses[q.id];
    if (v === undefined) continue;
    if (!acc[q.dimension]) acc[q.dimension] = { total: 0, count: 0 };
    acc[q.dimension].total += v;
    acc[q.dimension].count++;
  }

  const dimensions: DimScore[] = DIMS.map(dim => {
    const d = acc[dim];
    const score = d ? d.total / d.count : 0;
    return { dimension: dim, score, gap: sevLabel(score) };
  });

  const scored = dimensions.filter(d => d.score > 0);
  const overallScore = scored.length > 0
    ? scored.reduce((s, d) => s + d.score, 0) / scored.length
    : 0;

  return { dimensions, overallScore };
}

export default PlatformConcierge;
