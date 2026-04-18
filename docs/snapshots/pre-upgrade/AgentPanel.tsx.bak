"use client";
import React, { useState, useCallback } from "react";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ═══════════════════════════════════════════════════════════════
   AGENT PANEL — reusable side panel for individual agents
   ═══════════════════════════════════════════════════════════════ */

interface AgentPanelProps {
  agentName: "diagnosis" | "design" | "skills_gap" | "scenario" | "readiness";
  projectId: string;
  sessionData: Record<string, unknown>;
  title?: string;
  dataChanged?: boolean;
}

interface AgentFindings {
  from_memory?: boolean;
  cached_at?: string;
  confidence?: number;
  reasoning_chain?: string[];
  clarifying_question?: string | null;
  executive_summary?: string;
  error?: boolean;
  message?: string;
  [key: string]: unknown;
}

const AGENT_LABELS: Record<string, { label: string; icon: string; endpoint: string }> = {
  diagnosis: { label: "Organizational Diagnosis", icon: "🩺", endpoint: "/api/agents/diagnose" },
  design: { label: "Role Design", icon: "✏️", endpoint: "/api/agents/design" },
  skills_gap: { label: "Skills Gap Analysis", icon: "📊", endpoint: "/api/agents/skills-gap" },
  scenario: { label: "Scenario Modeling", icon: "🎯", endpoint: "/api/agents/scenario" },
  readiness: { label: "Readiness Assessment", icon: "🏁", endpoint: "/api/agents/readiness" },
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color = confidence >= 0.8 ? "var(--success)" : confidence >= 0.6 ? "var(--warning)" : "var(--risk)";
  return <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${confidence * 100}%`, background: color }} />
  </div>;
}

export function AgentPanel({ agentName, projectId, sessionData, title, dataChanged }: AgentPanelProps) {
  const [state, setState] = useState<"idle" | "loading" | "complete">("idle");
  const [findings, setFindings] = useState<AgentFindings | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [answeringQuestion, setAnsweringQuestion] = useState(false);

  const config = AGENT_LABELS[agentName];

  const runAgent = useCallback(async () => {
    setState("loading");
    try {
      const resp = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ project_id: projectId, session_data: sessionData }),
      });
      const data = await resp.json();
      setFindings(data);
      setState("complete");
    } catch {
      setFindings({ error: true, message: "Could not reach the backend. Is it running?" });
      setState("complete");
    }
  }, [projectId, sessionData, config.endpoint]);

  const submitAnswer = async () => {
    if (!questionAnswer.trim() || !findings?.clarifying_question) return;
    setAnsweringQuestion(true);
    try {
      await fetch("/api/agents/answer-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          project_id: projectId,
          agent: agentName,
          question: findings.clarifying_question,
          answer: questionAnswer,
          session_data: sessionData,
        }),
      });
      setQuestionAnswer("");
      // Re-run the agent with the answer
      runAgent();
    } catch {
      setAnsweringQuestion(false);
    }
  };

  return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
    {/* Header */}
    <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
      <span className="text-[16px]">{config.icon}</span>
      <span className="text-[14px] font-bold text-[var(--text-primary)] font-heading flex-1">{title || config.label}</span>
      {findings?.from_memory && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(139,92,246,0.1)] text-[var(--purple)]">from memory</span>}
    </div>

    {/* Data changed banner */}
    {dataChanged && state !== "loading" && <div className="px-4 py-2.5 bg-[rgba(245,158,11,0.08)] border-b border-[var(--warning)]/20 flex items-center gap-2">
      <span className="text-[13px] text-[var(--warning)] flex-1">New data detected — your last analysis may be outdated.</span>
      <button onClick={runAgent} className="text-[12px] font-bold text-[var(--warning)] hover:text-[var(--amber)] transition-colors">Re-run</button>
    </div>}

    <div className="p-4">
      {/* Idle state */}
      {state === "idle" && <div className="text-center py-6">
        <button onClick={runAgent} className="px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, rgba(212,134,10,0.15), rgba(192,112,48,0.15))", color: "var(--accent-primary)", border: "1px solid rgba(212,134,10,0.2)" }}>
          Run Analysis
        </button>
        <div className="text-[12px] text-[var(--text-muted)] mt-2">Powered by Claude Sonnet</div>
      </div>}

      {/* Loading state */}
      {state === "loading" && <div className="py-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent-primary)" }} />
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent-primary)", animationDelay: "0.2s" }} />
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent-primary)", animationDelay: "0.4s" }} />
        </div>
        <div className="text-[13px] text-[var(--text-muted)]">Analyzing...</div>
      </div>}

      {/* Complete state */}
      {state === "complete" && findings && <>
        {/* Error */}
        {findings.error && <div className="text-[13px] text-[var(--risk)] bg-[rgba(239,68,68,0.06)] rounded-lg p-3 border border-[var(--risk)]/20">
          {findings.message || "Analysis failed"}
        </div>}

        {/* Clarifying question — show before findings */}
        {findings.clarifying_question && !findings.error && <div className="mb-4 rounded-lg border border-[var(--warning)]/30 bg-[rgba(245,158,11,0.06)] p-3">
          <div className="text-[12px] font-bold text-[var(--warning)] uppercase mb-1">Clarifying Question</div>
          <div className="text-[13px] text-[var(--text-primary)] mb-3">{findings.clarifying_question}</div>
          <div className="flex gap-2">
            <input value={questionAnswer} onChange={e => setQuestionAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && submitAnswer()} placeholder="Your answer..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none" />
            <button onClick={submitAnswer} disabled={answeringQuestion || !questionAnswer.trim()} className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-[var(--accent-primary)] text-white disabled:opacity-40">Submit</button>
          </div>
        </div>}

        {/* Confidence bar */}
        {typeof findings.confidence === "number" && !findings.error && <div className="mb-3">
          <ConfidenceBar confidence={findings.confidence} />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-[var(--text-muted)]">Confidence: {Math.round(findings.confidence * 100)}%</span>
            {findings.from_memory && findings.cached_at && <span className="text-[11px] text-[var(--text-muted)]">{findings.cached_at.slice(0, 10)}</span>}
          </div>
        </div>}

        {/* Executive summary */}
        {findings.executive_summary && <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-3 p-3 rounded-lg bg-[var(--surface-2)]">{findings.executive_summary}</div>}

        {/* Findings body — render key sections */}
        {!findings.error && <FindingsBody findings={findings} />}

        {/* Reasoning chain */}
        {findings.reasoning_chain && findings.reasoning_chain.length > 0 && <div className="mt-3">
          <button onClick={() => setShowReasoning(!showReasoning)} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1">
            <span>{showReasoning ? "▼" : "▶"}</span> How I reached this
          </button>
          {showReasoning && <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-[var(--border)]">
            {findings.reasoning_chain.map((step, i) => <div key={i} className="text-[12px] text-[var(--text-muted)]"><span className="font-bold text-[var(--text-secondary)]">{i + 1}.</span> {step}</div>)}
          </div>}
        </div>}

        {/* Re-run button */}
        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-2">
          <button onClick={runAgent} className="text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">↻ Re-run Analysis</button>
          {findings.from_memory && <span className="text-[11px] text-[var(--text-muted)]">· Showing cached results</span>}
        </div>
      </>}
    </div>
  </div>;
}


/* ── Findings Body — renders structured agent output ── */

function FindingsBody({ findings }: { findings: AgentFindings }) {
  return <div className="space-y-3">
    {/* Opportunity areas (Diagnosis) */}
    {Array.isArray(findings.opportunity_areas) && <Section title="Opportunity Areas" items={findings.opportunity_areas.map((o: Record<string, unknown>) => ({
      label: String(o.area || ""),
      detail: String(o.rationale || ""),
      badge: o.quick_win ? "Quick Win" : undefined,
      score: Number(o.impact_score || 0),
    }))} />}

    {/* Risks */}
    {Array.isArray(findings.risks) && findings.risks.length > 0 && <Section title="Risks" items={(findings.risks as Record<string, unknown>[]).map(r => ({
      label: String(r.risk || ""),
      detail: String(r.mitigation || r.impact || ""),
      badge: String(r.severity || r.likelihood || ""),
    }))} />}

    {/* Data gaps */}
    {Array.isArray(findings.data_gaps) && findings.data_gaps.length > 0 && <Section title="Data Gaps" items={(findings.data_gaps as Record<string, unknown>[]).map(d => ({
      label: String(d.field || ""),
      detail: String(d.why_it_matters || ""),
    }))} />}

    {/* Role reconstruction (Design) */}
    {findings.role_reconstruction && <div>
      <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-2">Role Reconstruction</div>
      {["automate", "augment", "keep_human", "new_tasks"].map(cat => {
        const items = (findings.role_reconstruction as Record<string, unknown[]>)[cat];
        if (!Array.isArray(items) || items.length === 0) return null;
        const catLabels: Record<string, string> = { automate: "Automate", augment: "Augment with AI", keep_human: "Keep Human", new_tasks: "New Tasks" };
        const catColors: Record<string, string> = { automate: "var(--risk)", augment: "var(--warning)", keep_human: "var(--success)", new_tasks: "var(--purple)" };
        return <div key={cat} className="mb-2">
          <div className="text-[11px] font-bold mb-1" style={{ color: catColors[cat] }}>{catLabels[cat]} ({items.length})</div>
          {items.map((t: unknown, i: number) => {
            const task = t as Record<string, string>;
            return <div key={i} className="text-[12px] text-[var(--text-secondary)] pl-3 py-0.5 border-l-2" style={{ borderColor: catColors[cat] }}>{task.task}</div>;
          })}
        </div>;
      })}
    </div>}

    {/* Evolved role profile (Design) */}
    {findings.evolved_role_profile && <div className="p-3 rounded-lg bg-[var(--surface-2)]">
      <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-1">Evolved Role</div>
      <div className="text-[14px] font-bold text-[var(--text-primary)]">{String((findings.evolved_role_profile as Record<string, unknown>).title || "")}</div>
      <div className="text-[12px] text-[var(--text-secondary)] mt-1">{String((findings.evolved_role_profile as Record<string, unknown>).summary || "")}</div>
    </div>}

    {/* Skills gaps */}
    {Array.isArray(findings.gaps) && <Section title="Skills Gaps" items={(findings.gaps as Record<string, unknown>[]).map(g => ({
      label: String(g.skill || ""),
      detail: String(g.build_buy_borrow || ""),
      badge: String(g.severity || ""),
    }))} />}

    {/* Scenario narrative */}
    {typeof findings.narrative === "string" && findings.narrative.length > 20 && <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed p-3 rounded-lg bg-[var(--surface-2)]">{findings.narrative}</div>}

    {/* FTE waterfall */}
    {Array.isArray(findings.fte_waterfall) && <Section title="FTE Impact" items={(findings.fte_waterfall as Record<string, unknown>[]).map(f => ({
      label: String(f.stage || ""),
      detail: `${Number(f.fte_change) > 0 ? "+" : ""}${Number(f.fte_change)} FTE — ${String(f.driver || "")}`,
    }))} />}

    {/* Overall score (Readiness) */}
    {typeof findings.overall_score === "number" && <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-2)]">
      <div className="text-[28px] font-extrabold" style={{ color: (findings.overall_score as number) >= 70 ? "var(--success)" : (findings.overall_score as number) >= 40 ? "var(--warning)" : "var(--risk)" }}>{findings.overall_score}</div>
      <div><div className="text-[13px] font-bold text-[var(--text-primary)]">Overall Readiness</div><div className="text-[12px] text-[var(--text-muted)]">{String(findings.maturity_level || "")}</div></div>
    </div>}

    {/* Blockers (Readiness) */}
    {Array.isArray(findings.blockers) && findings.blockers.length > 0 && <Section title="Blockers" items={(findings.blockers as Record<string, unknown>[]).map(b => ({
      label: String(b.blocker || ""),
      detail: String(b.unlock_action || ""),
      badge: String(b.severity || ""),
    }))} />}

    {/* Action plan */}
    {Array.isArray(findings.action_plan) && <Section title="Action Plan" items={(findings.action_plan as Record<string, unknown>[]).map(a => ({
      label: String(a.action || ""),
      detail: `${a.timeline_weeks}w · ${a.expected_impact || ""}`,
      score: Number(a.priority || 0),
    }))} />}

    {/* Next steps */}
    {Array.isArray(findings.recommended_next_steps) && <Section title="Next Steps" items={(findings.recommended_next_steps as Record<string, unknown>[]).map(s => ({
      label: String(s.action || ""),
      detail: `${s.timeline || ""} · ${s.owner_role || ""}`,
    }))} />}

    {/* Trajectory note */}
    {typeof findings.trajectory_note === "string" && <div className="text-[12px] text-[var(--text-muted)] italic mt-2">{findings.trajectory_note}</div>}
  </div>;
}

function Section({ title, items }: { title: string; items: { label: string; detail: string; badge?: string; score?: number }[] }) {
  if (!items.length) return null;
  return <div>
    <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase mb-2">{title}</div>
    <div className="space-y-1.5">
      {items.map((item, i) => <div key={i} className="flex items-start gap-2 text-[12px]">
        {typeof item.score === "number" && item.score > 0 && <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(212,134,10,0.1)", color: "var(--accent-primary)" }}>{item.score}</span>}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--text-primary)]">{item.label}</div>
          {item.detail && <div className="text-[var(--text-muted)] mt-0.5">{item.detail}</div>}
        </div>
        {item.badge && <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
          background: item.badge === "Quick Win" ? "rgba(16,185,129,0.1)" : item.badge === "critical" || item.badge === "high" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
          color: item.badge === "Quick Win" ? "var(--success)" : item.badge === "critical" || item.badge === "high" ? "var(--risk)" : "var(--warning)",
        }}>{item.badge}</span>}
      </div>)}
    </div>
  </div>;
}


/* ═══════════════════════════════════════════════════════════════
   AGENT ORCHESTRATOR — floating button + modal with intent cards
   ═══════════════════════════════════════════════════════════════ */

interface OrchestratorProps {
  projectId: string;
  sessionData: Record<string, unknown>;
}

interface ChainEntry {
  agent: string;
  status: string;
  duration_ms: number;
  from_memory: boolean;
}

const INTENT_CARDS = [
  { id: "full_analysis", icon: "🔬", title: "Full Analysis", desc: "Run all agents in chain: Diagnosis → Design → Skills → Scenario" },
  { id: "quick_read", icon: "⚡", title: "Quick Read", desc: "Diagnosis only — fast organizational scan" },
  { id: "what_changed", icon: "🔄", title: "What Changed", desc: "Compare current data to last analysis, show deltas" },
  { id: "what_should_i_do_next", icon: "🎯", title: "What Should I Do Next", desc: "Prioritized action list from all agent memories" },
];

const AGENT_ICONS: Record<string, string> = { diagnosis: "🩺", design: "✏️", skills_gap: "📊", scenario: "🎯", readiness: "🏁" };

export function AgentOrchestrator({ projectId, sessionData }: OrchestratorProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [intent, setIntent] = useState<string | null>(null);
  const [result, setResult] = useState<{ agents_run: string[]; findings: Record<string, AgentFindings>; clarifying_question: string | null; trajectory: string; chain_log: ChainEntry[] } | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const runIntent = async (intentId: string) => {
    setIntent(intentId);
    setRunning(true);
    setResult(null);
    try {
      const resp = await fetch("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ project_id: projectId, intent: intentId, session_data: sessionData }),
      });
      const data = await resp.json();
      setResult(data);
    } catch {
      setResult({ agents_run: [], findings: {}, clarifying_question: null, trajectory: "error", chain_log: [] });
    }
    setRunning(false);
  };

  if (!open) {
    return <button onClick={() => setOpen(true)} className="fixed bottom-24 right-6 z-30 w-12 h-12 rounded-full flex items-center justify-center text-[18px] shadow-lg transition-all hover:scale-110" style={{ background: "linear-gradient(135deg, rgba(212,134,10,0.9), rgba(192,112,48,0.9))", color: "white" }} title="AI Analysis">
      🤖
    </button>;
  }

  return <>
    {/* Backdrop */}
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => { if (!running) setOpen(false); }} />
    {/* Modal */}
    <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[640px] z-50 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] flex flex-col overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
        <span className="text-[20px]">🤖</span>
        <div className="flex-1"><div className="text-[16px] font-bold text-[var(--text-primary)] font-heading">AI Agent Analysis</div><div className="text-[12px] text-[var(--text-muted)]">Claude-powered organizational intelligence</div></div>
        <button onClick={() => { if (!running) setOpen(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[18px]">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Intent cards — show if no intent selected */}
        {!intent && <div className="grid grid-cols-2 gap-3">
          {INTENT_CARDS.map(card => <button key={card.id} onClick={() => runIntent(card.id)} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-left hover:border-[var(--accent-primary)]/40 transition-all hover:scale-[1.01]">
            <div className="text-[20px] mb-2">{card.icon}</div>
            <div className="text-[14px] font-bold text-[var(--text-primary)] mb-1">{card.title}</div>
            <div className="text-[12px] text-[var(--text-muted)] leading-relaxed">{card.desc}</div>
          </button>)}
        </div>}

        {/* Running state — chain visualization */}
        {intent && running && <div>
          <div className="text-[14px] font-bold text-[var(--text-primary)] mb-4">{INTENT_CARDS.find(c => c.id === intent)?.title}</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(intent === "full_analysis" ? ["diagnosis", "design", "skills_gap", "scenario"] : ["diagnosis"]).map((agent, i, arr) => <React.Fragment key={agent}>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                <span className="text-[14px]">{AGENT_ICONS[agent] || "⏳"}</span>
                <span className="text-[12px] font-semibold text-[var(--text-muted)]">{agent}</span>
                <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: "var(--accent-primary)" }} />
              </div>
              {i < arr.length - 1 && <span className="text-[var(--text-muted)] text-[12px]">→</span>}
            </React.Fragment>)}
          </div>
          <div className="mt-6 text-center text-[13px] text-[var(--text-muted)]">Agents are analyzing your data...</div>
        </div>}

        {/* Results */}
        {intent && !running && result && <div>
          {/* Chain log */}
          {result.chain_log && result.chain_log.length > 0 && <div className="flex items-center gap-2 mb-4 flex-wrap">
            {result.chain_log.map((entry, i) => <React.Fragment key={entry.agent}>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: entry.status === "complete" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}>
                <span className="text-[14px]">{AGENT_ICONS[entry.agent] || "✓"}</span>
                <span className="text-[12px] font-semibold" style={{ color: entry.status === "complete" ? "var(--success)" : "var(--risk)" }}>{entry.agent}</span>
                <span className="text-[10px] text-[var(--text-muted)]">{entry.duration_ms}ms</span>
                {entry.from_memory && <span className="text-[9px] text-[var(--purple)]">cached</span>}
              </div>
              {i < result.chain_log.length - 1 && <span className="text-[var(--success)] text-[12px]">→</span>}
            </React.Fragment>)}
          </div>}

          {/* Trajectory */}
          {result.trajectory && <div className="text-[12px] text-[var(--text-muted)] mb-3 flex items-center gap-1">
            Trajectory: <span className="font-bold" style={{ color: result.trajectory === "improving" ? "var(--success)" : result.trajectory === "declining" ? "var(--risk)" : "var(--text-muted)" }}>
              {result.trajectory === "improving" ? "↑" : result.trajectory === "declining" ? "↓" : "→"} {result.trajectory}
            </span>
          </div>}

          {/* Clarifying question */}
          {result.clarifying_question && <div className="mb-4 p-3 rounded-lg border border-[var(--warning)]/30 bg-[rgba(245,158,11,0.06)]">
            <div className="text-[12px] font-bold text-[var(--warning)] mb-1">Agent has a question</div>
            <div className="text-[13px] text-[var(--text-primary)]">{result.clarifying_question}</div>
          </div>}

          {/* Agent findings — collapsible */}
          {result.agents_run && result.agents_run.length > 0 && <div className="space-y-2">
            {result.agents_run.map(agent => {
              const agentFindings = result.findings[agent];
              if (!agentFindings) return null;
              const isExpanded = expandedAgent === agent;
              return <div key={agent} className="rounded-lg border border-[var(--border)] overflow-hidden">
                <button onClick={() => setExpandedAgent(isExpanded ? null : agent)} className="w-full px-4 py-3 flex items-center gap-2 hover:bg-[var(--hover)] transition-colors text-left">
                  <span className="text-[14px]">{AGENT_ICONS[agent]}</span>
                  <span className="text-[13px] font-bold text-[var(--text-primary)] flex-1 capitalize">{agent.replace("_", " ")}</span>
                  {typeof agentFindings.confidence === "number" && <span className="text-[11px] text-[var(--text-muted)]">{Math.round(agentFindings.confidence * 100)}%</span>}
                  {agentFindings.from_memory && <span className="text-[9px] text-[var(--purple)] font-bold">CACHED</span>}
                  <span className="text-[12px] text-[var(--text-muted)]">{isExpanded ? "▼" : "▶"}</span>
                </button>
                {isExpanded && <div className="px-4 pb-4 border-t border-[var(--border)]">
                  {agentFindings.executive_summary && <div className="text-[13px] text-[var(--text-secondary)] mt-3 mb-3 leading-relaxed">{agentFindings.executive_summary}</div>}
                  <FindingsBody findings={agentFindings} />
                  {agentFindings.reasoning_chain && <div className="mt-3 space-y-1 pl-3 border-l-2 border-[var(--border)]">
                    {(agentFindings.reasoning_chain as string[]).map((step: string, i: number) => <div key={i} className="text-[11px] text-[var(--text-muted)]"><span className="font-bold">{i + 1}.</span> {step}</div>)}
                  </div>}
                </div>}
              </div>;
            })}
          </div>}

          {/* Delta/actions for non-agent intents */}
          {result.findings.delta && <div className="p-4 rounded-lg bg-[var(--surface-2)]">
            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{String((result.findings.delta as Record<string, unknown>).narrative || "")}</div>
            {Array.isArray((result.findings.delta as Record<string, unknown>).changes) && ((result.findings.delta as Record<string, unknown>).changes as Record<string, unknown>[]).map((c, i) => <div key={i} className="flex items-center gap-2 mt-2 text-[12px]">
              <span>{AGENT_ICONS[String(c.agent || "")]}</span>
              <span className="text-[var(--text-primary)] font-semibold capitalize">{String(c.agent || "").replace("_", " ")}</span>
              <span style={{ color: c.direction === "improved" ? "var(--success)" : c.direction === "declined" ? "var(--risk)" : "var(--text-muted)" }}>{String(c.direction || "")}</span>
            </div>)}
          </div>}

          {result.findings.actions && <div className="p-4 rounded-lg bg-[var(--surface-2)]">
            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-3">{String((result.findings.actions as Record<string, unknown>).narrative || "")}</div>
            {Array.isArray((result.findings.actions as Record<string, unknown>).priority_actions) && ((result.findings.actions as Record<string, unknown>).priority_actions as Record<string, unknown>[]).map((a, i) => <div key={i} className="flex items-start gap-2 text-[12px] py-1.5 border-t border-[var(--border)]">
              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[rgba(212,134,10,0.1)] text-[var(--accent-primary)] shrink-0">{i + 1}</span>
              <div><div className="font-semibold text-[var(--text-primary)]">{String(a.action || "")}</div>{a.rationale && <div className="text-[var(--text-muted)] mt-0.5">{String(a.rationale)}</div>}</div>
            </div>)}
          </div>}

          {/* Run again */}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => { setIntent(null); setResult(null); }} className="text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent-primary)]">← Back to intents</button>
            <button onClick={() => runIntent(intent)} className="text-[12px] font-semibold text-[var(--accent-primary)] hover:underline">↻ Run again</button>
          </div>
        </div>}
      </div>
    </div>
  </>;
}
