"use client";
import React, { useState, useEffect, useMemo } from "react";
import { getLocalMetrics, type LocalMetrics } from "../../../lib/analytics";
import * as authApi from "../../../lib/auth-api";

const MODULE_LABELS: Record<string, string> = {
  home: "Overview", snapshot: "Workforce Snapshot", jobarch: "Job Architecture",
  scan: "AI Opportunity Scan", orghealth: "Org Health", heatmap: "AI Heatmap",
  changeready: "Change Readiness", mgrcap: "Manager Capability", design: "Work Design Lab",
  build: "Org Design Studio", opmodel: "Operating Model", simulate: "Impact Simulator",
  plan: "Change Planner", export: "Export", skills: "Skills & Talent",
  reskill: "Reskilling", marketplace: "Talent Marketplace", dashboard: "Dashboard",
  readiness: "AI Readiness", clusters: "Role Clustering", skillshift: "Skill Shift",
  bbba: "BBBA Framework", headcount: "Headcount Planning", flightrecorder: "Flight Recorder",
};

function moduleLabel(id: string): string {
  return MODULE_LABELS[id] || id;
}

// ── Admin guard ──
const ADMIN_USERNAME = "hiral";

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);
  const [metrics, setMetrics] = useState<LocalMetrics | null>(null);
  const [serverStats, setServerStats] = useState<{ users: Record<string, unknown>[]; stats: Record<string, number> } | null>(null);
  const [tab, setTab] = useState<"overview" | "modules" | "funnel" | "users">("overview");

  useEffect(() => {
    const user = authApi.getStoredUser();
    const token = authApi.getToken();
    if (user && token && user.username === ADMIN_USERNAME) {
      setAuthorized(true);
      setMetrics(getLocalMetrics());
      authApi.adminGetUsers().then(d => setServerStats(d)).catch((e) => { console.error("[AdminPage] failed to fetch users", e); });
    }
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (!authorized) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0C08", color: "#fff", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔒</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Admin Access Required</h1>
          <p style={{ color: "rgba(255,200,150,0.5)", marginBottom: 24 }}>Sign in with an admin account to access analytics.</p>
          <a href="/" style={{ color: "var(--accent-primary)", textDecoration: "none", fontWeight: 600 }}>← Back to Platform</a>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const totalUsersServer = serverStats?.stats?.total_users ?? metrics.totalUsers;
  const activeUsers7d = serverStats?.stats?.active_7d ?? metrics.activeUsers7d;
  const activeUsers30d = serverStats?.stats?.active_30d ?? metrics.activeUsers30d;

  // Sort modules by visit count
  const sortedModules = Object.entries(metrics.moduleVisits)
    .sort(([, a], [, b]) => b - a);

  const maxVisits = sortedModules.length > 0 ? sortedModules[0][1] : 1;

  // Funnel
  const funnelSteps = [
    { key: "landed", label: "Landed", color: "var(--accent-primary)" },
    { key: "signed_up", label: "Signed Up", color: "var(--purple)" },
    { key: "uploaded_data", label: "Uploaded Data", color: "#3B82F6" },
    { key: "used_3_modules", label: "Used 3+ Modules", color: "var(--success)" },
  ];

  const maxFunnel = Math.max(...funnelSteps.map(s => metrics.funnel[s.key] || 0), 1);

  return (
    <div style={{ minHeight: "100vh", background: "#0F0C08", color: "#fff", fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 40px", borderBottom: "1px solid rgba(255,200,150,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--accent-primary)" }}>Analytics Dashboard</h1>
          <p style={{ fontSize: 13, color: "rgba(255,200,150,0.4)", margin: "4px 0 0" }}>Platform usage and engagement metrics</p>
        </div>
        <a href="/" style={{ color: "rgba(255,200,150,0.5)", textDecoration: "none", fontSize: 14, fontWeight: 600, padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,200,150,0.1)", background: "rgba(255,200,150,0.03)" }}>← Back to Platform</a>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 40px", borderBottom: "1px solid rgba(255,200,150,0.06)", display: "flex", gap: 0 }}>
        {(["overview", "modules", "funnel", "users"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "12px 20px", fontSize: 14, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? "var(--accent-primary)" : "rgba(255,200,150,0.4)",
            borderBottom: tab === t ? "2px solid var(--accent-primary)" : "2px solid transparent",
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "'Outfit', sans-serif", textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "32px 40px", maxWidth: 1100 }}>
        {tab === "overview" && <OverviewTab metrics={metrics} totalUsers={totalUsersServer} active7d={activeUsers7d} active30d={activeUsers30d} />}
        {tab === "modules" && <ModulesTab sortedModules={sortedModules} maxVisits={maxVisits} durations={metrics.moduleDurations} />}
        {tab === "funnel" && <FunnelTab steps={funnelSteps} funnel={metrics.funnel} maxFunnel={maxFunnel} />}
        {tab === "users" && <UsersTab users={serverStats?.users || []} />}
      </div>
    </div>
  );
}

// ── KPI Card ──
function KpiCard({ label, value, sub, color = "var(--accent-primary)" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: "rgba(255,200,150,0.03)", border: "1px solid rgba(255,200,150,0.08)",
      borderRadius: 16, padding: "20px 24px", flex: "1 1 200px", minWidth: 180,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,200,150,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "rgba(255,200,150,0.3)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Overview Tab ──
function OverviewTab({ metrics, totalUsers, active7d, active30d }: { metrics: LocalMetrics; totalUsers: number; active7d: number; active30d: number }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <KpiCard label="Total Users" value={totalUsers} />
        <KpiCard label="Active (7d)" value={active7d} color="var(--success)" />
        <KpiCard label="Active (30d)" value={active30d} color="#3B82F6" />
        <KpiCard label="Avg Session" value={`${metrics.avgSessionMinutes}m`} color="var(--purple)" sub="per module visit" />
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,200,150,0.7)", marginBottom: 16 }}>Engagement Counters</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <KpiCard label="Signups" value={metrics.counters.signups || 0} color="var(--purple)" />
        <KpiCard label="Logins" value={metrics.counters.logins || 0} color="var(--accent-primary)" />
        <KpiCard label="Projects Created" value={metrics.counters.projects_created || 0} color="#3B82F6" />
        <KpiCard label="Sandbox Opens" value={metrics.counters.sandbox_selected || 0} color="var(--warning)" />
        <KpiCard label="Data Uploads" value={metrics.counters.data_uploads || 0} color="var(--success)" />
        <KpiCard label="Exports" value={metrics.counters.exports || 0} color="#EC4899" />
        <KpiCard label="AI Uses" value={metrics.counters.ai_uses || 0} color="#6366F1" />
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,200,150,0.7)", marginBottom: 16 }}>Top 5 Modules</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(metrics.moduleVisits)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([mod, count]) => {
            const max = Object.values(metrics.moduleVisits).reduce((a, b) => Math.max(a, b), 1);
            return (
              <div key={mod} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 160, fontSize: 13, fontWeight: 600, color: "rgba(255,200,150,0.6)" }}>{moduleLabel(mod)}</div>
                <div style={{ flex: 1, height: 24, background: "rgba(255,200,150,0.04)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${(count / max) * 100}%`, height: "100%", background: "linear-gradient(90deg, rgba(224,144,64,0.3), rgba(224,144,64,0.6))", borderRadius: 6, transition: "width 0.5s ease" }} />
                </div>
                <div style={{ width: 50, textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "'IBM Plex Mono', monospace" }}>{count}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Modules Tab ──
function ModulesTab({ sortedModules, maxVisits, durations }: { sortedModules: [string, number][]; maxVisits: number; durations: Record<string, { total: number; count: number }> }) {
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,200,150,0.7)", marginBottom: 20 }}>All Module Usage</h3>
      {sortedModules.length === 0 && (
        <p style={{ color: "rgba(255,200,150,0.3)", fontSize: 14 }}>No module visits recorded yet.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sortedModules.map(([mod, count]) => {
          const dur = durations[mod];
          const avg = dur ? Math.round(dur.total / dur.count) : 0;
          return (
            <div key={mod} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,200,150,0.04)" }}>
              <div style={{ width: 180, fontSize: 13, fontWeight: 600, color: "rgba(255,200,150,0.6)" }}>{moduleLabel(mod)}</div>
              <div style={{ flex: 1, height: 20, background: "rgba(255,200,150,0.04)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${(count / maxVisits) * 100}%`, height: "100%", background: "linear-gradient(90deg, rgba(139,92,246,0.3), rgba(139,92,246,0.6))", borderRadius: 5 }} />
              </div>
              <div style={{ width: 60, textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--purple)", fontFamily: "'IBM Plex Mono', monospace" }}>{count}</div>
              <div style={{ width: 80, textAlign: "right", fontSize: 12, color: "rgba(255,200,150,0.35)", fontFamily: "'IBM Plex Mono', monospace" }}>
                {avg > 0 ? `~${avg}s avg` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Funnel Tab ──
function FunnelTab({ steps, funnel, maxFunnel }: { steps: { key: string; label: string; color: string }[]; funnel: Record<string, number>; maxFunnel: number }) {
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,200,150,0.7)", marginBottom: 8 }}>Signup Funnel</h3>
      <p style={{ fontSize: 13, color: "rgba(255,200,150,0.35)", marginBottom: 24 }}>Landed → Signed Up → Uploaded Data → Used 3+ Modules</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {steps.map((step, i) => {
          const count = funnel[step.key] || 0;
          const prevCount = i > 0 ? (funnel[steps[i - 1].key] || 0) : count;
          const conversion = prevCount > 0 && i > 0 ? Math.round((count / prevCount) * 100) : 100;
          return (
            <div key={step.key}>
              {i > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingLeft: 4 }}>
                  <span style={{ fontSize: 14, color: "rgba(255,200,150,0.2)" }}>↓</span>
                  <span style={{ fontSize: 12, color: conversion >= 50 ? "var(--success)" : conversion >= 25 ? "var(--warning)" : "var(--risk)", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{conversion}% conversion</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 160, fontSize: 14, fontWeight: 600, color: step.color }}>{step.label}</div>
                <div style={{ flex: 1, height: 36, background: "rgba(255,200,150,0.04)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
                  <div style={{ width: `${maxFunnel > 0 ? (count / maxFunnel) * 100 : 0}%`, height: "100%", background: `${step.color}30`, borderRadius: 8, minWidth: count > 0 ? 40 : 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12, transition: "width 0.5s ease" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: step.color, fontFamily: "'IBM Plex Mono', monospace" }}>{count}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Users Tab ──
function UsersTab({ users }: { users: Record<string, unknown>[] }) {
  if (users.length === 0) {
    return (
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,200,150,0.7)", marginBottom: 16 }}>Registered Users</h3>
        <p style={{ color: "rgba(255,200,150,0.3)", fontSize: 14 }}>User data is loaded from the server. Make sure the backend is running.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,200,150,0.7)", marginBottom: 16 }}>Registered Users ({users.length})</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,200,150,0.1)" }}>
              {["Username", "Display Name", "Email", "Type", "Last Login", "Created"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "rgba(255,200,150,0.4)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,200,150,0.04)" }}>
                <td style={{ padding: "10px 12px", color: "var(--accent-primary)", fontWeight: 600 }}>{String(u.username || "")}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,200,150,0.6)" }}>{String(u.display_name || "—")}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,200,150,0.4)", fontFamily: "'IBM Plex Mono', monospace" }}>{String(u.email || "—")}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: u.user_type === "consultant" ? "rgba(139,92,246,0.15)" : "rgba(16,185,129,0.15)", color: u.user_type === "consultant" ? "var(--purple)" : "var(--success)", fontWeight: 600 }}>{String(u.user_type || "—")}</span>
                </td>
                <td style={{ padding: "10px 12px", color: "rgba(255,200,150,0.35)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{u.last_login ? new Date(String(u.last_login)).toLocaleDateString() : "—"}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,200,150,0.35)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{u.created ? new Date(String(u.created)).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
