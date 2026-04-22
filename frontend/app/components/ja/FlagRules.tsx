"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle, Shield, Settings, ChevronRight, Check, X,
  ToggleLeft, ToggleRight, Edit3, MessageSquare, Search,
} from "@/lib/icons";
import { apiFetch } from "../../../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface FlagRule {
  id: string; project_id: string; name: string; description: string;
  rule_key: string; operator: string; threshold: number | null;
  severity: string; enabled: boolean;
}

interface Violation {
  id: string; role_id: string; role_type: string;
  detail: string; suppressed: boolean; suppressed_note: string;
}

interface ViolationGroup {
  rule: FlagRule;
  violations: Violation[];
  count: number;
}

interface Props {
  projectId: string;
  scenarioId: string;
  onRoleClick?: (roleId: string) => void;
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════ */

const SEV_COLORS: Record<string, string> = { error: "#e87a5d", warning: "#f4a83a", info: "#f4a83a" };

const S = {
  page: { padding: "24px 28px", maxWidth: 1100, margin: "0 auto" } as React.CSSProperties,
  h2: { fontSize: "var(--text-lg)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)", margin: "0 0 4px" } as React.CSSProperties,
  subtitle: { fontSize: "var(--text-xs)", color: "#8a7f6d", marginBottom: 20 } as React.CSSProperties,
  tabs: { display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 20, gap: 0 } as React.CSSProperties,
  tab: (active: boolean) => ({ padding: "8px 16px", fontSize: "var(--text-xs)", fontWeight: active ? "var(--fw-semi)" : "var(--fw-medium)", color: active ? "var(--amber)" : "#8a7f6d", borderBottom: active ? "2px solid #f4a83a" : "2px solid transparent", background: "none", border: "none", cursor: "pointer" }) as React.CSSProperties,
  section: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 16, overflow: "hidden" } as React.CSSProperties,
  ruleRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--border)" } as React.CSSProperties,
  sevDot: (sev: string) => ({ width: 8, height: 8, borderRadius: "50%", background: SEV_COLORS[sev] || "#c9bfa8", flexShrink: 0 }) as React.CSSProperties,
  ruleInfo: { flex: 1 } as React.CSSProperties,
  ruleName: { fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" } as React.CSSProperties,
  ruleDesc: { fontSize: 11, color: "#8a7f6d", marginTop: 1 } as React.CSSProperties,
  thresholdInput: { width: 60, padding: "4px 8px", fontSize: "var(--text-xs)", background: "#1e2030", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-primary)", outline: "none", textAlign: "center" as const } as React.CSSProperties,
  toggleBtn: { background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" } as React.CSSProperties,
  groupHeader: (sev: string) => ({
    display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
    background: sev === "error" ? "rgba(232,122,93,0.06)" : sev === "warning" ? "rgba(244,168,58,0.06)" : "rgba(244,168,58,0.04)",
    borderBottom: "1px solid var(--border)", cursor: "pointer",
  }) as React.CSSProperties,
  violationRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 18px 8px 44px", borderBottom: "1px solid var(--border)", fontSize: "var(--text-xs)" } as React.CSSProperties,
  suppressBtn: { display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", fontSize: 11, background: "#1e2030", border: "1px solid var(--border)", borderRadius: 4, color: "#8a7f6d", cursor: "pointer" } as React.CSSProperties,
  badge: (count: number, sev: string) => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 20, height: 18, padding: "0 5px", borderRadius: 9,
    fontSize: 11, fontWeight: 700,
    background: `${SEV_COLORS[sev] || "#c9bfa8"}18`,
    color: SEV_COLORS[sev] || "#c9bfa8",
  }) as React.CSSProperties,
  summaryBar: { display: "flex", gap: 16, marginBottom: 20, fontSize: "var(--text-xs)" } as React.CSSProperties,
  summaryItem: (color: string) => ({ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, borderLeft: `3px solid ${color}` }) as React.CSSProperties,
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function FlagRules({ projectId, scenarioId, onRoleClick }: Props) {
  const [activeTab, setActiveTab] = useState<"violations" | "rules">("violations");
  const [rules, setRules] = useState<FlagRule[]>([]);
  const [groups, setGroups] = useState<ViolationGroup[]>([]);
  const [totalFlags, setTotalFlags] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [suppressingId, setSuppressingId] = useState<string | null>(null);
  const [suppressNote, setSuppressNote] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, flagsRes] = await Promise.all([
        apiFetch(`/api/ja/flag-rules?project_id=${projectId}`),
        apiFetch(`/api/ja/flags?project_id=${projectId}&scenario_id=${scenarioId}`),
      ]);
      setRules(await rulesRes.json());
      const flagData = await flagsRes.json();
      setGroups(flagData.groups || []);
      setTotalFlags(flagData.total || 0);
    } catch { /* empty */ }
    setLoading(false);
  }, [projectId, scenarioId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    await apiFetch(`/api/ja/flag-rules/${ruleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, enabled }),
    });
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled } : r));
  };

  const updateThreshold = async (ruleId: string, threshold: number) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    await apiFetch(`/api/ja/flag-rules/${ruleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, threshold }),
    });
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, threshold } : r));
  };

  const suppressViolation = async (violationId: string) => {
    if (!suppressNote.trim()) return;
    await apiFetch(`/api/ja/flags/${violationId}/suppress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: suppressNote }),
    });
    setSuppressingId(null);
    setSuppressNote("");
    fetchData();
  };

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const errorCount = groups.filter(g => g.rule.severity === "error").reduce((s, g) => s + g.count, 0);
  const warnCount = groups.filter(g => g.rule.severity === "warning").reduce((s, g) => s + g.count, 0);
  const infoCount = groups.filter(g => g.rule.severity === "info").reduce((s, g) => s + g.count, 0);

  if (loading) {
    return <div style={S.page}><div style={{ textAlign: "center", padding: 60, color: "#8a7f6d" }}>Loading flags…</div></div>;
  }

  return (
    <div style={S.page}>
      <h2 style={S.h2}>Data Integrity Flags</h2>
      <div style={S.subtitle}>
        {totalFlags} active flags across {groups.length} rules
      </div>

      {/* Summary */}
      <div style={S.summaryBar}>
        <div style={S.summaryItem("var(--coral)")}>
          <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--fw-bold)", color: "var(--coral)" }}>{errorCount}</span>
          <span style={{ color: "#8a7f6d" }}>Errors</span>
        </div>
        <div style={S.summaryItem("var(--amber)")}>
          <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--fw-bold)", color: "var(--amber)" }}>{warnCount}</span>
          <span style={{ color: "#8a7f6d" }}>Warnings</span>
        </div>
        <div style={S.summaryItem("var(--amber)")}>
          <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--fw-bold)", color: "var(--amber)" }}>{infoCount}</span>
          <span style={{ color: "#8a7f6d" }}>Info</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        <button style={S.tab(activeTab === "violations")} onClick={() => setActiveTab("violations")}>
          Violations ({totalFlags})
        </button>
        <button style={S.tab(activeTab === "rules")} onClick={() => setActiveTab("rules")}>
          <Settings size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Rule Configuration ({rules.length})
        </button>
      </div>

      {/* ── Violations tab ── */}
      {activeTab === "violations" && (
        <>
          {groups.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "#8a7f6d" }}>
              <Shield size={32} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-medium)" }}>No violations found</div>
              <div style={{ fontSize: "var(--text-xs)", marginTop: 4 }}>All rules pass — the architecture looks clean</div>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.rule.id} style={S.section}>
                <div style={S.groupHeader(group.rule.severity)} onClick={() => toggle(group.rule.id)}>
                  <div style={S.sevDot(group.rule.severity)} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-semi)", color: "var(--text-primary)" }}>{group.rule.name}</span>
                  </div>
                  <span style={S.badge(group.count, group.rule.severity)}>{group.count}</span>
                  <ChevronRight size={13} style={{ color: "#8a7f6d", transform: expanded.has(group.rule.id) ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                </div>
                {expanded.has(group.rule.id) && group.violations.map(v => (
                  <div key={v.id} style={S.violationRow}>
                    <div style={{ flex: 1, color: "var(--text-secondary)" }}>
                      {v.detail}
                    </div>
                    <button style={{ ...S.suppressBtn, color: "var(--amber)" }}
                      onClick={() => onRoleClick?.(v.role_id)}>
                      View
                    </button>
                    {suppressingId === v.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input style={{ ...S.thresholdInput, width: 160 }} value={suppressNote}
                          onChange={e => setSuppressNote(e.target.value)} placeholder="Required: reason for exception" autoFocus />
                        <button style={{ ...S.suppressBtn, color: "var(--sage)" }} onClick={() => suppressViolation(v.id)} disabled={!suppressNote.trim()}>
                          <Check size={10} />
                        </button>
                        <button style={S.suppressBtn} onClick={() => { setSuppressingId(null); setSuppressNote(""); }}>
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <button style={S.suppressBtn} onClick={() => setSuppressingId(v.id)}>
                        Accept as exception
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}

      {/* ── Rules config tab ── */}
      {activeTab === "rules" && (
        <div style={S.section}>
          {rules.map(rule => (
            <div key={rule.id} style={S.ruleRow}>
              <div style={S.sevDot(rule.severity)} />
              <div style={S.ruleInfo}>
                <div style={S.ruleName}>{rule.name}</div>
                <div style={S.ruleDesc}>{rule.description}</div>
              </div>
              {rule.threshold !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "#8a7f6d" }}>Threshold:</span>
                  <input style={S.thresholdInput} type="number" value={rule.threshold}
                    onChange={e => updateThreshold(rule.id, Number(e.target.value))} />
                </div>
              )}
              <span style={{ fontSize: 11, color: "#8a7f6d", padding: "2px 6px", border: "1px solid var(--border)", borderRadius: 3 }}>
                {rule.severity}
              </span>
              <button style={S.toggleBtn} onClick={() => toggleRule(rule.id, !rule.enabled)}>
                {rule.enabled
                  ? <ToggleRight size={20} style={{ color: "var(--sage)" }} />
                  : <ToggleLeft size={20} style={{ color: "#8a7f6d" }} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
