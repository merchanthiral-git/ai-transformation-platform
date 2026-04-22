"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CollabUser, ActivityEntry, RemoteChange } from "../../lib/collaboration";

// ── Module label mapping ──
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

// ── Presence Avatars (top bar) ──
export function PresenceAvatars({ users }: { users: CollabUser[] }) {
  const [expanded, setExpanded] = useState(false);

  if (users.length === 0) return null;

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 0 }}
      >
        {users.slice(0, 5).map((u, i) => (
          <div
            key={u.user_id}
            title={`${u.display_name} — ${moduleLabel(u.active_tab)}`}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: u.color,
              border: u.editing ? "2px solid var(--success)" : "2px solid var(--surface-1)",
              color: "#fff", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginLeft: i > 0 ? -8 : 0,
              zIndex: 5 - i,
              position: "relative",
              fontFamily: "'Inter Tight', sans-serif",
              transition: "transform 0.15s ease",
            }}
          >
            {(u.display_name || u.username)[0].toUpperCase()}
            {u.editing && (
              <span style={{
                position: "absolute", bottom: -2, right: -2,
                width: 10, height: 10, borderRadius: "50%",
                background: "var(--success)", border: "2px solid var(--surface-1)",
              }} />
            )}
          </div>
        ))}
        {users.length > 5 && (
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--surface-3)", border: "2px solid var(--surface-1)",
            color: "var(--text-muted)", fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginLeft: -8,
          }}>
            +{users.length - 5}
          </div>
        )}
        <span style={{
          fontSize: 12, color: "var(--text-muted)", marginLeft: 8,
          fontFamily: "monospace",
        }}>
          {users.length} online
        </span>
      </div>

      {/* Expanded dropdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", top: 36, right: 0, minWidth: 240,
              background: "rgba(15,12,8,0.95)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(34,211,238,0.12)",
              borderRadius: 14, padding: 8, zIndex: 100,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, padding: "4px 8px 6px", fontFamily: "'Inter Tight', sans-serif" }}>
              Collaborators
            </div>
            {users.map(u => (
              <div key={u.user_id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "6px 8px",
                borderRadius: 8,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", background: u.color,
                  color: "#fff", fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontFamily: "'Inter Tight', sans-serif",
                }}>
                  {(u.display_name || u.username)[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {u.display_name || u.username}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {u.editing
                      ? <span style={{ color: "var(--success)" }}>Editing {moduleLabel(u.editing.module)}</span>
                      : <>Viewing {moduleLabel(u.active_tab)}</>
                    }
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Editing Indicator Banner ──
export function EditingIndicator({ users }: { users: CollabUser[] }) {
  const editing = users.filter(u => u.editing);
  if (editing.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        style={{
          background: "rgba(52,211,153,0.08)",
          borderBottom: "1px solid rgba(52,211,153,0.15)",
          padding: "6px 20px",
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 13, color: "var(--success)",
          fontFamily: "monospace",
        }}
      >
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--success)", animation: "pulse 1.5s infinite" }} />
        {editing.length === 1
          ? `${editing[0].display_name} is editing ${moduleLabel(editing[0].editing!.module)}...`
          : `${editing.length} collaborators are editing...`
        }
      </motion.div>
    </AnimatePresence>
  );
}

// ── Remote Change Toast ──
export function RemoteChangeToast({ change, onDismiss }: { change: RemoteChange | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!change) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [change, onDismiss]);

  return (
    <AnimatePresence>
      {change && (
        <motion.div
          initial={{ opacity: 0, y: 40, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 40, x: "-50%" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={onDismiss}
          style={{
            position: "fixed", bottom: 24, left: "50%",
            background: "rgba(15,12,8,0.95)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(34,211,238,0.2)",
            borderRadius: 12, padding: "10px 20px",
            zIndex: 10000, cursor: "pointer",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", gap: 10,
            maxWidth: 420,
          }}
        >
          <span style={{ fontSize: 16 }}>
            {change.kind === "filter" ? "🔍" : change.kind === "scenario" ? "🎛️" : change.kind === "design" ? "🏗️" : change.kind === "upload" ? "📤" : "📝"}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {change.display_name} {change.summary}
            </div>
            {change.detail && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {change.detail}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Activity Feed Panel ──
export function ActivityFeedPanel({ activity, onClose }: { activity: ActivityEntry[]; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activity]);

  const icon = (type: string, kind?: string) => {
    if (type === "join") return "🟢";
    if (type === "leave") return "🔴";
    if (kind === "filter") return "🔍";
    if (kind === "scenario") return "🎛️";
    if (kind === "design") return "🏗️";
    if (kind === "decision") return "📝";
    if (kind === "upload") return "📤";
    return "📌";
  };

  const sorted = [...activity].reverse();

  return (
    <motion.div
      className="fixed top-0 right-0 bottom-0 w-[340px] z-[9996] flex flex-col"
      style={{
        background: "var(--surface-1)", borderLeft: "1px solid var(--border)",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
      }}
      initial={{ x: 340 }}
      animate={{ x: 0 }}
      exit={{ x: 340 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)]"
        style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.06), transparent)" }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>📡</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Inter Tight', sans-serif" }}>Activity Feed</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{activity.length} events</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)",
          background: "var(--surface-2)", color: "var(--text-muted)", fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          ✕
        </button>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
            No activity yet. Actions by collaborators will appear here.
          </div>
        )}
        {sorted.map(entry => (
          <div key={entry.id} style={{
            display: "flex", gap: 10, padding: "8px 4px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 2 }}>{icon(entry.type, entry.kind)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>
                {entry.message}
              </div>
              {entry.detail && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{entry.detail}</div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, fontFamily: "monospace" }}>
                {entry.timestamp ? formatTime(entry.timestamp) : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}
