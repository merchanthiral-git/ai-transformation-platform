"use client";
import React, { useState, useEffect, useMemo } from "react";
import { fmt } from "../../lib/formatters";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type FlightEvent = {
  id: string;
  timestamp: string;
  user_name: string;
  event_type: string;
  module: string;
  title: string;
  description: string;
  data_snapshot: { before?: Record<string, unknown>; after?: Record<string, unknown>; delta?: Record<string, unknown> };
  agent_context: Record<string, unknown> | null;
  tags: string[];
  significance: string;
  is_milestone: boolean;
};

type Summary = {
  total_events: number;
  by_module: Record<string, number>;
  by_type: Record<string, number>;
  first_event: string | null;
  last_event: string | null;
  milestone_count: number;
  most_active_module: string;
  days_active: number;
};

const MODULE_COLORS: Record<string, string> = {
  overview: "#0891B2", diagnose: "#D4860A", design: "#8B5CF6",
  simulate: "#F59E0B", mobilize: "#10B981", export: "#EC4899",
};

const MODULE_ICONS: Record<string, string> = {
  overview: "📊", diagnose: "🩺", design: "✏️",
  simulate: "⚡", mobilize: "🚀", export: "📦",
};

const FILTER_MODULES = ["All", "overview", "diagnose", "design", "simulate", "mobilize", "export"];

export function FlightRecorder({ projectId, projectName, onBack }: { projectId: string; projectName: string; onBack: () => void }) {
  const [events, setEvents] = useState<FlightEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("All");
  const [sigFilter, setSigFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (moduleFilter !== "All") params.set("module", moduleFilter);
    if (sigFilter !== "All") params.set("significance", sigFilter);
    if (searchQuery) params.set("q", searchQuery);

    Promise.all([
      fetch(`/api/flight-recorder/${projectId}?${params}`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`/api/flight-recorder/${projectId}/summary`, { headers: authHeaders() }).then(r => r.json()),
    ]).then(([evData, sumData]) => {
      setEvents(evData.events || []);
      setSummary(sumData);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId, moduleFilter, sigFilter]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery) { load(); return; }
    const timer = setTimeout(() => load(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleMilestone = async (eventId: string) => {
    const resp = await fetch(`/api/flight-recorder/${projectId}/milestone/${eventId}`, { method: "POST", headers: authHeaders() });
    const data = await resp.json();
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, is_milestone: data.is_milestone } : e));
  };

  const exportTimeline = () => {
    window.open(`/api/flight-recorder/${projectId}/export`, "_blank");
  };

  // Group events by date
  const grouped = useMemo(() => {
    const groups: { label: string; events: FlightEvent[] }[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let currentLabel = "";

    events.forEach(e => {
      const date = (e.timestamp || "").slice(0, 10);
      let label = date;
      if (date === today) label = "Today";
      else if (date === yesterday) label = "Yesterday";
      else {
        const d = new Date(date);
        label = d.toLocaleDateString("en-US", { month: "long", year: "numeric", day: "numeric" });
      }
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, events: [] });
      }
      groups[groups.length - 1].events.push(e);
    });
    return groups;
  }, [events]);

  return <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
    {/* Header */}
    <div className="px-7 py-5 border-b border-[var(--border)] bg-[var(--surface-1)] sticky top-0 z-20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] text-[14px]">← Back</button>
          <span className="text-[18px]">🛫</span>
          <div><div className="text-[18px] font-bold text-[var(--text-primary)] font-heading">Flight Recorder</div><div className="text-[13px] text-[var(--text-muted)]">{projectName} · Decision History</div></div>
        </div>
        <button onClick={exportTimeline} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/5">Export Timeline</button>
      </div>

      {/* Summary stats */}
      {summary && summary.total_events > 0 && <div className="flex gap-4 mb-3">
        {[
          { label: "Decisions", value: fmt(summary.total_events) },
          { label: "Milestones", value: fmt(summary.milestone_count) },
          { label: "Days Active", value: fmt(summary.days_active) },
          { label: "Most Active", value: summary.most_active_module },
        ].map(s => <div key={s.label} className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-center">
          <div className="text-[16px] font-extrabold text-[var(--text-primary)]">{s.value}</div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase">{s.label}</div>
        </div>)}
      </div>}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search decisions..." className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] w-48" />
        {FILTER_MODULES.map(m => <button key={m} onClick={() => setModuleFilter(m)} className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all" style={{ background: moduleFilter === m ? (m === "All" ? "rgba(212,134,10,0.1)" : `${MODULE_COLORS[m] || "#888"}15`) : "var(--surface-2)", color: moduleFilter === m ? (m === "All" ? "var(--accent-primary)" : MODULE_COLORS[m] || "#888") : "var(--text-muted)", border: `1px solid ${moduleFilter === m ? (MODULE_COLORS[m] || "var(--accent-primary)") + "40" : "var(--border)"}` }}>{m === "All" ? "All" : (MODULE_ICONS[m] || "") + " " + m}</button>)}
        <div className="ml-2" />
        {["All", "major", "minor"].map(s => <button key={s} onClick={() => setSigFilter(s)} className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all" style={{ background: sigFilter === s ? "rgba(212,134,10,0.1)" : "var(--surface-2)", color: sigFilter === s ? "var(--accent-primary)" : "var(--text-muted)", border: `1px solid ${sigFilter === s ? "rgba(212,134,10,0.3)" : "var(--border)"}` }}>{s === "All" ? "All" : s}</button>)}
      </div>
    </div>

    {/* Timeline */}
    <div className="px-7 py-5 max-w-3xl mx-auto">
      {loading && <div className="text-center py-12 text-[var(--text-muted)]">Loading timeline...</div>}

      {!loading && events.length === 0 && <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">🛫</div>
        <div className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">No events recorded yet</div>
        <div className="text-[14px] text-[var(--text-muted)]">Events are recorded automatically as you use the platform — run an analysis, save a scenario, or upload data to start your decision history.</div>
      </div>}

      {grouped.map(group => <div key={group.label} className="mb-6">
        <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 sticky top-[140px] bg-[var(--bg)] py-1 z-10">{group.label}</div>
        <div className="space-y-2 pl-4 border-l-2 border-[var(--border)]">
          {group.events.map(event => {
            const isExpanded = expandedId === event.id;
            const modColor = MODULE_COLORS[event.module] || "#888";
            const time = event.timestamp?.slice(11, 16) || "";
            const hasSnapshot = event.data_snapshot && (event.data_snapshot.before || event.data_snapshot.after);
            const hasContext = event.agent_context && Object.keys(event.agent_context).length > 0;

            return <div key={event.id} className="relative rounded-xl border bg-[var(--surface-1)] p-4 transition-all hover:border-[var(--accent-primary)]/20" style={{ borderColor: event.is_milestone ? `${modColor}40` : "var(--border)", borderLeftWidth: 3, borderLeftColor: modColor }}>
              {/* Timeline dot */}
              <div className="absolute -left-[21px] top-5 w-3 h-3 rounded-full border-2" style={{ background: event.is_milestone ? modColor : "var(--surface-1)", borderColor: modColor }} />

              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[13px]">{MODULE_ICONS[event.module] || "•"}</span>
                    <span className="text-[14px] font-bold text-[var(--text-primary)]">{event.title}</span>
                    <span className="text-[11px] text-[var(--text-muted)] font-data">{time}</span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `${modColor}15`, color: modColor }}>{event.module}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: event.significance === "major" ? "rgba(212,134,10,0.1)" : "var(--surface-2)", color: event.significance === "major" ? "var(--accent-primary)" : "var(--text-muted)" }}>{event.significance}</span>
                    {event.tags.map(t => <span key={t} className="text-[10px] text-[var(--text-muted)]">#{t}</span>)}
                  </div>

                  {event.description && <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{event.description}</div>}

                  {/* Data snapshot delta */}
                  {hasSnapshot && event.data_snapshot.after && <div className="mt-2 flex gap-3 flex-wrap text-[12px]">
                    {Object.entries(event.data_snapshot.after).map(([k, v]) => {
                      const before = event.data_snapshot.before?.[k];
                      return <span key={k} className="text-[var(--text-muted)]">
                        {k}: <strong className="text-[var(--text-primary)]">{typeof v === "number" ? fmt(v) : String(v)}</strong>
                        {before !== undefined && before !== v && <span className="text-[11px]" style={{ color: "var(--accent-primary)" }}> (was {typeof before === "number" ? fmt(before as number) : String(before)})</span>}
                      </span>;
                    })}
                  </div>}

                  {/* Agent context (collapsible) */}
                  {hasContext && <button onClick={() => setExpandedId(isExpanded ? null : event.id)} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-2 flex items-center gap-1">
                    <span>{isExpanded ? "▼" : "▸"}</span> Agent context
                  </button>}
                  {isExpanded && hasContext && <div className="mt-2 p-2 rounded-lg bg-[var(--surface-2)] text-[11px] text-[var(--text-muted)] font-data">
                    {Object.entries(event.agent_context!).map(([k, v]) => <div key={k}>{k}: {typeof v === "number" ? fmt(v) : JSON.stringify(v)}</div>)}
                  </div>}
                </div>

                {/* Milestone toggle */}
                <button onClick={() => toggleMilestone(event.id)} className="shrink-0 text-[16px] transition-all hover:scale-110" title={event.is_milestone ? "Remove milestone" : "Flag as milestone"} style={{ opacity: event.is_milestone ? 1 : 0.3 }}>⭐</button>
              </div>
            </div>;
          })}
        </div>
      </div>)}
    </div>
  </div>;
}
