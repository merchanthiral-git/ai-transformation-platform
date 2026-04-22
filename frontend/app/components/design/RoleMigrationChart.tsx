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
    text: "Reservoir Engineering sunsets 1 management layer, transitioning a department manager role. The 3 restructured roles reflect direct reports absorbing supervisory responsibilities as span widens from 6 to 9.",
  },
  {
    id: "4",
    type: "new",
    text: "Land & Commercial is the primary growth area — 2 new roles created to support expanded regulatory compliance functions, offsetting 1 transitioning administrative position.",
  },
];

/* Phase 4 color palette */
const TEAL = "#14B8A6";
const AMBER = "#fbbf24";
const CORAL = "#D85A30";

/* Navy reference for text */
const NAVY = "rgba(28,43,58,1)";
const NAVY_65 = "rgba(28,43,58,0.65)";
const NAVY_55 = "rgba(28,43,58,0.55)";
const NAVY_20 = "rgba(28,43,58,0.20)";
const NAVY_15 = "rgba(28,43,58,0.15)";

const ICON_CONFIG = {
  new: { bg: "#E1F5EE", color: "#085041", symbol: "+" },
  restructured: { bg: "#FFF3E0", color: "#7C4400", symbol: "\u2192" },
  eliminated: { bg: "#FAECE7", color: "#712B13", symbol: "\u21BB" },
} as const;

function DeptRow({
  dept,
  maxImpacted,
}: {
  dept: DepartmentMigration;
  maxImpacted: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const impacted = dept.newRoles + dept.restructured + dept.eliminated;
  const barPct = maxImpacted > 0 ? (impacted / maxImpacted) * 75 : 0;
  const retained = dept.totalHeadcount - impacted;
  const showTooltip = hovered || focused;

  const segments = [
    { count: dept.newRoles, color: TEAL, label: "New", shortLabel: "New" },
    { count: dept.restructured, color: AMBER, label: "Restructured", shortLabel: "Restr." },
    { count: dept.eliminated, color: CORAL, label: "Transitioning Out", shortLabel: "Trans." },
  ].filter((s) => s.count > 0);

  const BAR_HEIGHT = 16;

  return (
    <div
      role="row"
      aria-label={`${dept.name}: ${dept.newRoles} new, ${dept.restructured} restructured, ${dept.eliminated} eliminated out of ${dept.totalHeadcount} total`}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr 40px",
        alignItems: "center",
        padding: "5px 0",
        borderRadius: 4,
        background: hovered || focused ? "rgba(28,43,58,0.03)" : "transparent",
        transition: "background 0.15s ease",
        position: "relative",
        outline: focused ? "2px solid #22d3ee" : "none",
        outlineOffset: 1,
      }}
    >
      {/* Department name */}
      <div
        style={{
          textAlign: "right",
          fontSize: 12,
          fontWeight: 500,
          color: NAVY,
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
            borderRadius: 3,
            overflow: "hidden",
            height: BAR_HEIGHT,
          }}
        >
          {segments.map((seg) => {
            const segWidthPct = (seg.count / impacted) * 100;
            const isWide = segWidthPct >= 25;
            const segWidthPx = (barPct / 100) * 600 * (segWidthPct / 100); // approximate px width
            const showLabel = segWidthPx > 30;
            return (
              <div
                key={seg.label}
                style={{
                  width: `${segWidthPct}%`,
                  minWidth: seg.count > 0 ? 20 : 0,
                  background: seg.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  color: isWide ? "#fff" : seg.color,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {isWide ? (showLabel ? `${seg.shortLabel} ${seg.count}` : seg.count) : null}
                {!isWide && (
                  <span
                    style={{
                      position: "absolute",
                      left: "100%",
                      marginLeft: 3,
                      color: seg.color,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {seg.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total */}
      <div
        style={{
          textAlign: "right",
          fontSize: 12,
          fontWeight: 500,
          color: NAVY,
          fontFamily: "monospace",
        }}
      >
        {impacted}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 130,
            zIndex: 20,
            background: "#fff",
            border: `0.5px solid ${NAVY_20}`,
            borderRadius: 6,
            padding: 10,
            fontSize: 12,
            color: NAVY_65,
            lineHeight: 1.8,
            boxShadow: "0 4px 16px rgba(28,43,58,0.08)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 500, color: NAVY, marginBottom: 4 }}>
            {dept.name}
          </div>
          <div style={{ fontSize: 11, color: NAVY_55, marginBottom: 6 }}>
            {dept.totalHeadcount.toLocaleString()} total headcount
          </div>
          {[
            { label: "New", count: dept.newRoles, color: TEAL },
            { label: "Restructured", count: dept.restructured, color: AMBER },
            { label: "Transitioning Out", count: dept.eliminated, color: CORAL },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
              <span>{item.label}: {item.count}</span>
            </div>
          ))}
          <div
            style={{
              borderTop: `0.5px solid ${NAVY_15}`,
              marginTop: 6,
              paddingTop: 6,
              color: NAVY_55,
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
            color: NAVY_65,
            outline: "none",
            cursor: "text",
            padding: "4px 6px",
            borderRadius: 4,
            border: editing
              ? `1px dashed ${AMBER}`
              : hoverEdit
              ? `1px dashed ${NAVY_15}`
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
              color: NAVY_55,
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
  const totalRoles = totalNew + totalRestructured + totalEliminated + (retainedCount ?? 0);
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

  /* Chart container standard: white bg, 0.5px navy-15 border, 8px radius, 20px padding */
  const chartContainerStyle: React.CSSProperties = {
    background: "#fff",
    border: `0.5px solid ${NAVY_15}`,
    borderRadius: 8,
    padding: 20,
  };

  /* KPI summary card style with colored left border */
  const summaryCardStyle = (borderColor: string): React.CSSProperties => ({
    background: "#fff",
    borderRadius: 8,
    padding: "14px 16px",
    border: `0.5px solid ${NAVY_15}`,
    borderLeft: `3px solid ${borderColor}`,
    flex: 1,
    minWidth: 0,
  });

  return (
    <div role="img" aria-label="Role migration chart showing new, restructured, and eliminated roles across departments">
      {/* Section 1: Summary cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {[
          { label: "New Roles Created", value: totalNew, color: TEAL, total: totalRoles },
          { label: "Restructured", value: totalRestructured, color: AMBER, total: totalRoles },
          { label: "Transitioning Out", value: totalEliminated, color: CORAL, total: totalRoles },
        ].map((card) => (
          <div key={card.label} style={summaryCardStyle(card.color)}>
            <div
              style={{
                fontSize: 11,
                color: NAVY_55,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: NAVY,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.2,
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: NAVY_55,
                marginTop: 4,
              }}
            >
              of {card.total} total roles
            </div>
          </div>
        ))}
      </div>

      {/* Impact statement callout */}
      <div
        style={{
          background: "var(--ivory, #FAF9F7)",
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 14,
          fontSize: 12,
          color: NAVY,
          lineHeight: 1.5,
        }}
      >
        {retained.toLocaleString()} roles <span style={{ color: NAVY_55 }}>({retainedPct}%)</span>{" "}
        retained unchanged — chart shows only the {totalImpacted} impacted roles.
        {totalEliminated > 0 && <><br/><span style={{ fontSize: 11, color: NAVY_55, fontStyle: "italic" }}>{totalEliminated} roles transitioning — redeployed, absorbed through attrition, or supported through transition.</span></>}
      </div>

      {/* Section 2: Department impact bars in chart container */}
      <div role="table" aria-label="Department role migration breakdown" style={{ ...chartContainerStyle, marginBottom: 16 }}>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12, paddingLeft: 132 }}>
          {[
            { label: "New", color: TEAL },
            { label: "Restructured", color: AMBER },
            { label: "Transitioning Out", color: CORAL },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: NAVY_55 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>

        {sorted.map((dept) => (
          <DeptRow key={dept.name} dept={dept} maxImpacted={maxImpacted} />
        ))}
      </div>

      {/* Section 3: Key changes narrative card */}
      <div
        style={{
          background: "#fff",
          border: `0.5px solid ${NAVY_15}`,
          borderRadius: 8,
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: NAVY,
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
                    background: NAVY_15,
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
            aria-label="Reset insights to default"
            style={{
              fontSize: 11,
              color: NAVY_55,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Reset to original view
          </button>
        </div>
      </div>
    </div>
  );
}
