"use client";
import React, { useState, useMemo, useRef } from "react";

export interface DepartmentMigration {
  name: string;
  totalHeadcount: number;
  newRoles: number;
  restructured: number;
  eliminated: number;
}

export interface Insight {
  id: string;
  type: "new" | "restructured" | "eliminated";
  text: string;
}

const defaultData: DepartmentMigration[] = [
  { name: "Engineering", totalHeadcount: 2445, newRoles: 1, restructured: 11, eliminated: 1 },
  { name: "Finance", totalHeadcount: 461, newRoles: 1, restructured: 4, eliminated: 1 },
  { name: "Land & Commercial", totalHeadcount: 972, newRoles: 2, restructured: 2, eliminated: 1 },
  { name: "Reservoir Eng.", totalHeadcount: 1143, newRoles: 1, restructured: 3, eliminated: 1 },
  { name: "Legal", totalHeadcount: 297, newRoles: 2, restructured: 2, eliminated: 1 },
  { name: "IT & Infrastructure", totalHeadcount: 810, newRoles: 2, restructured: 1, eliminated: 1 },
  { name: "HSE", totalHeadcount: 476, newRoles: 1, restructured: 2, eliminated: 1 },
  { name: "Operations", totalHeadcount: 991, newRoles: 0, restructured: 2, eliminated: 1 },
  { name: "HR & People", totalHeadcount: 390, newRoles: 1, restructured: 1, eliminated: 1 },
];

const defaultInsights: Insight[] = [
  {
    id: "1",
    type: "restructured",
    text: "Engineering adds 11 restructured roles as layer compression converts senior individual contributors into team leads with broader spans — the largest single-department restructuring in the scenario.",
  },
  {
    id: "2",
    type: "restructured",
    text: 'Finance sees the most role evolution (4 restructured) as manual reporting roles shift to analytics-focused positions. "Data Entry Clerk" becomes "AI Operations Analyst" in 2 instances.',
  },
  {
    id: "3",
    type: "eliminated",
    text: "Reservoir Engineering eliminates 1 management layer, displacing a department manager role. The 3 restructured roles reflect direct reports absorbing supervisory responsibilities as span widens from 6 to 9.",
  },
  {
    id: "4",
    type: "new",
    text: "Land & Commercial is the primary growth area — 2 new roles created to support expanded regulatory compliance functions, offsetting 1 eliminated administrative position.",
  },
];

const TEAL = "#1D9E75";
const CORAL = "#D85A30";
const RED = "#E24B4A";

const ICON_CONFIG = {
  new: { bg: "#E1F5EE", color: "#085041", symbol: "+" },
  restructured: { bg: "#FAECE7", color: "#712B13", symbol: "\u2192" },
  eliminated: { bg: "#FCEBEB", color: "#791F1F", symbol: "\u00D7" },
} as const;

function DeptRow({
  dept,
  maxImpacted,
}: {
  dept: DepartmentMigration;
  maxImpacted: number;
}) {
  const [hovered, setHovered] = useState(false);
  const impacted = dept.newRoles + dept.restructured + dept.eliminated;
  const barPct = maxImpacted > 0 ? (impacted / maxImpacted) * 80 : 0;
  const retained = dept.totalHeadcount - impacted;

  const segments = [
    { count: dept.newRoles, color: TEAL, label: "New" },
    { count: dept.restructured, color: CORAL, label: "Restructured" },
    { count: dept.eliminated, color: RED, label: "Eliminated" },
  ].filter((s) => s.count > 0);

  const minSegPx = 22;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr 44px",
        alignItems: "center",
        padding: "6px 0",
        borderRadius: 4,
        background: hovered ? "var(--hover, rgba(255,255,255,0.03))" : "transparent",
        transition: "background 0.15s ease",
        position: "relative",
      }}
    >
      {/* Department name */}
      <div
        style={{
          textAlign: "right",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-primary, #e8ecf4)",
          paddingRight: 12,
        }}
      >
        {dept.name}
      </div>

      {/* Bar */}
      <div style={{ width: `${barPct}%`, minWidth: impacted > 0 ? 60 : 0 }}>
        <div
          style={{
            display: "flex",
            borderRadius: 4,
            overflow: "hidden",
            height: 26,
          }}
        >
          {segments.map((seg) => (
            <div
              key={seg.label}
              style={{
                width: `${(seg.count / impacted) * 100}%`,
                minWidth: seg.count > 0 ? minSegPx : 0,
                background: seg.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {seg.count}
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div
        style={{
          textAlign: "right",
          fontSize: 12,
          color: "var(--text-muted, #7b8ba2)",
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {impacted}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 120,
            zIndex: 20,
            background: "var(--surface-1, #131b2e)",
            border: "1px solid var(--border, #2a3350)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            color: "var(--text-secondary, #a3b1c6)",
            lineHeight: 1.8,
            boxShadow: "var(--shadow-3, 0 8px 24px rgba(0,0,0,0.12))",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 500, color: "var(--text-primary, #e8ecf4)", marginBottom: 4 }}>
            {dept.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted, #7b8ba2)", marginBottom: 6 }}>
            {dept.totalHeadcount.toLocaleString()} total headcount
          </div>
          {[
            { label: "New", count: dept.newRoles, color: TEAL },
            { label: "Restructured", count: dept.restructured, color: CORAL },
            { label: "Eliminated", count: dept.eliminated, color: RED },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
              <span>{item.label}: {item.count}</span>
            </div>
          ))}
          <div
            style={{
              borderTop: "1px solid var(--border, #2a3350)",
              marginTop: 6,
              paddingTop: 6,
              color: "var(--text-muted, #7b8ba2)",
            }}
          >
            Retained: {retained.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightItem({
  insight,
  onUpdate,
}: {
  insight: Insight;
  onUpdate: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [hoverEdit, setHoverEdit] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = ICON_CONFIG[insight.type];

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {/* Icon */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          background: cfg.bg,
          color: cfg.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {cfg.symbol}
      </div>

      {/* Text */}
      <div
        style={{ flex: 1, position: "relative" }}
        onMouseEnter={() => setHoverEdit(true)}
        onMouseLeave={() => setHoverEdit(false)}
      >
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setEditing(true)}
          onBlur={(e) => {
            setEditing(false);
            const newText = e.currentTarget.textContent || "";
            if (newText !== insight.text) onUpdate(newText);
          }}
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--text-secondary, #a3b1c6)",
            outline: "none",
            cursor: "text",
            padding: "4px 6px",
            borderRadius: 4,
            border: editing
              ? "1px dashed var(--accent-primary, #D4860A)"
              : hoverEdit
              ? "1px dashed var(--border, #2a3350)"
              : "1px solid transparent",
            transition: "border 0.15s ease",
          }}
        >
          {insight.text}
        </div>
        {/* Pencil hint */}
        {hoverEdit && !editing && (
          <div
            style={{
              position: "absolute",
              top: 2,
              right: 4,
              fontSize: 11,
              color: "var(--text-muted, #7b8ba2)",
              opacity: 0.7,
              pointerEvents: "none",
            }}
          >
            &#9998;
          </div>
        )}
      </div>
    </div>
  );
}

export interface RoleMigrationChartProps {
  data?: DepartmentMigration[];
  insights?: Insight[];
  onInsightsChange?: (insights: Insight[]) => void;
  retainedCount?: number;
}

export default function RoleMigrationChart({
  data,
  insights: insightsProp,
  onInsightsChange,
  retainedCount,
}: RoleMigrationChartProps) {
  const rows = data ?? defaultData;
  const [internalInsights, setInternalInsights] = useState<Insight[]>(insightsProp ?? defaultInsights);
  const insights = insightsProp ?? internalInsights;

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          b.newRoles + b.restructured + b.eliminated - (a.newRoles + a.restructured + a.eliminated)
      ),
    [rows]
  );

  const totalNew = rows.reduce((s, d) => s + d.newRoles, 0);
  const totalRestructured = rows.reduce((s, d) => s + d.restructured, 0);
  const totalEliminated = rows.reduce((s, d) => s + d.eliminated, 0);
  const totalImpacted = totalNew + totalRestructured + totalEliminated;
  const totalHC = rows.reduce((s, d) => s + d.totalHeadcount, 0);
  const retained = retainedCount ?? totalHC - totalImpacted;
  const retainedPct = totalHC > 0 ? ((retained / totalHC) * 100).toFixed(1) : "0";

  const maxImpacted = useMemo(
    () => Math.max(...sorted.map((d) => d.newRoles + d.restructured + d.eliminated), 1),
    [sorted]
  );

  const updateInsight = (id: string, text: string) => {
    const updated = insights.map((ins) => (ins.id === id ? { ...ins, text } : ins));
    setInternalInsights(updated);
    onInsightsChange?.(updated);
  };

  const resetInsights = () => {
    setInternalInsights(defaultInsights);
    onInsightsChange?.(defaultInsights);
  };

  const cardStyle = (dotColor: string): React.CSSProperties => ({
    background: "var(--surface-2, #1a2340)",
    borderRadius: 8,
    padding: "12px 16px",
    border: "1px solid var(--border, #2a3350)",
    flex: 1,
  });

  return (
    <div>
      {/* Section 1: Summary cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {[
          { label: "New roles created", value: totalNew, color: TEAL },
          { label: "Restructured", value: totalRestructured, color: CORAL },
          { label: "Eliminated", value: totalEliminated, color: RED },
        ].map((card) => (
          <div key={card.label} style={cardStyle(card.color)}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: card.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted, #7b8ba2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {card.label}
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Retained footnote */}
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted, #7b8ba2)",
          borderLeft: "2px solid var(--border, #2a3350)",
          paddingLeft: 10,
          marginBottom: 20,
        }}
      >
        {retained.toLocaleString()} roles ({retainedPct}%) retained unchanged — chart shows only the{" "}
        {totalImpacted} impacted roles
      </div>

      {/* Section 2: Department impact bars */}
      <div style={{ marginBottom: 24 }}>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 10, paddingLeft: 122 }}>
          {[
            { label: "New", color: TEAL },
            { label: "Restructured", color: CORAL },
            { label: "Eliminated", color: RED },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted, #7b8ba2)" }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>

        {sorted.map((dept) => (
          <DeptRow key={dept.name} dept={dept} maxImpacted={maxImpacted} />
        ))}
      </div>

      {/* Section 3: Editable insight card */}
      <div
        style={{
          border: "0.5px solid var(--border, #2a3350)",
          borderRadius: 12,
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary, #e8ecf4)",
            marginBottom: 14,
          }}
        >
          Key changes in this scenario
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {insights.map((ins, i) => (
            <React.Fragment key={ins.id}>
              {i > 0 && (
                <div
                  style={{
                    height: 0.5,
                    background: "var(--border, #2a3350)",
                    margin: "10px 0",
                  }}
                />
              )}
              <InsightItem insight={ins} onUpdate={(text) => updateInsight(ins.id, text)} />
            </React.Fragment>
          ))}
        </div>

        <div style={{ marginTop: 14, textAlign: "right" }}>
          <button
            onClick={resetInsights}
            style={{
              fontSize: 11,
              color: "var(--text-muted, #7b8ba2)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Reset to default
          </button>
        </div>
      </div>
    </div>
  );
}
