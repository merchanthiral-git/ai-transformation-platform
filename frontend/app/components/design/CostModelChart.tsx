"use client";
import React, { useState, useMemo } from "react";

export interface LayerCostData {
  layer: string;
  currentHeadcount: number;
  futureHeadcount: number;
  avgComp: number;
  futureAvgComp?: number;
}

const defaultData: LayerCostData[] = [
  { layer: "E5", currentHeadcount: 275, futureHeadcount: 210, avgComp: 650000 },
  { layer: "E4", currentHeadcount: 327, futureHeadcount: 280, avgComp: 450000 },
  { layer: "E3", currentHeadcount: 822, futureHeadcount: 740, avgComp: 375000 },
  { layer: "E2", currentHeadcount: 763, futureHeadcount: 700, avgComp: 310000 },
  { layer: "E1", currentHeadcount: 1128, futureHeadcount: 1050, avgComp: 250000 },
  { layer: "M6", currentHeadcount: 1137, futureHeadcount: 1100, avgComp: 225000 },
  { layer: "M5", currentHeadcount: 1175, futureHeadcount: 1250, avgComp: 190000 },
  { layer: "M4", currentHeadcount: 1255, futureHeadcount: 1400, avgComp: 155000 },
  { layer: "M3", currentHeadcount: 984, futureHeadcount: 1100, avgComp: 120000 },
  { layer: "M2", currentHeadcount: 134, futureHeadcount: 300, avgComp: 95000 },
  { layer: "M1", currentHeadcount: 0, futureHeadcount: 50, avgComp: 75000 },
  { layer: "P8", currentHeadcount: 0, futureHeadcount: 0, avgComp: 340000 },
  { layer: "P7", currentHeadcount: 0, futureHeadcount: 0, avgComp: 260000 },
  { layer: "P6", currentHeadcount: 0, futureHeadcount: 0, avgComp: 218000 },
  { layer: "P5", currentHeadcount: 0, futureHeadcount: 0, avgComp: 175000 },
  { layer: "P4", currentHeadcount: 0, futureHeadcount: 0, avgComp: 142000 },
  { layer: "P3", currentHeadcount: 0, futureHeadcount: 0, avgComp: 115000 },
];

const TRACK_COLORS: Record<string, string> = {
  E: "#ef4444",
  M: "#F97316",
  P: "#3B82F6",
  S: "#22d3ee",
  T: "#a78bfa",
};

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e7) return `${sign}$${Math.round(abs / 1e6)}M`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

interface ComputedRow {
  layer: string;
  currentHeadcount: number;
  futureHeadcount: number;
  avgComp: number;
  futureAvgComp: number;
  currentCost: number;
  futureCost: number;
  deltaCost: number;
  deltaPct: number;
}

const MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";

function CostWaterfallRow({
  row,
  maxCost,
  totalCost,
  mode,
}: {
  row: ComputedRow;
  maxCost: number;
  totalCost: number;
  mode: "absolute" | "perhead";
}) {
  const [hovered, setHovered] = useState(false);
  const trackColor = TRACK_COLORS[row.layer.charAt(0)] || "#3B82F6";
  const costPct = totalCost > 0 ? (row.currentCost / totalCost) * 100 : 0;

  const dispCurrent = mode === "absolute" ? formatCurrency(row.currentCost) : formatCurrency(row.avgComp);
  const dispFuture = mode === "absolute" ? formatCurrency(row.futureCost) : formatCurrency(row.futureAvgComp);

  const currentBarWidth = maxCost > 0 ? (row.currentCost / maxCost) * 100 : 0;
  const futureBarWidth = maxCost > 0 ? (row.futureCost / maxCost) * 100 : 0;

  const delta = mode === "absolute" ? row.deltaCost : (row.futureAvgComp - row.avgComp);
  const deltaSign = delta > 0 ? "+" : "";
  const deltaColor = delta < 0 ? "#34d399" : delta > 0 ? "#F97316" : "#64748b";
  const deltaArrow = delta < 0 ? "↓" : delta > 0 ? "↑" : "—";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "clamp(36px,3.5vw,50px) clamp(70px,7vw,100px) clamp(44px,4vw,60px) 1fr clamp(56px,5.5vw,80px) clamp(56px,5.5vw,80px) clamp(50px,5vw,70px) clamp(70px,7vw,100px)",
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 8,
        background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
        transition: "background 0.15s ease-out",
        position: "relative",
        minHeight: 48,
      }}
    >
      {/* Layer badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "3px 8px", borderRadius: 6,
        background: `${trackColor}15`, color: trackColor,
        fontSize: 12, fontWeight: 700, fontFamily: MONO,
        letterSpacing: "0.03em",
      }}>
        {row.layer}
      </div>

      {/* Headcount shift */}
      <div style={{ fontSize: 13, fontFamily: MONO, fontWeight: 700 }}>
        <span style={{ color: "#e8ecf4" }}>{row.currentHeadcount.toLocaleString()}</span>
        <span style={{ color: "#64748b", margin: "0 4px" }}>&rarr;</span>
        <span style={{ color: row.futureHeadcount < row.currentHeadcount ? "#34d399" : row.futureHeadcount > row.currentHeadcount ? "#F97316" : "#e8ecf4" }}>
          {row.futureHeadcount.toLocaleString()}
        </span>
      </div>

      {/* Avg comp */}
      <div style={{ fontSize: 11, color: "#64748b", fontFamily: MONO, fontWeight: 700 }}>
        {formatCurrency(row.avgComp)}
      </div>

      {/* Cost waterfall bar */}
      <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
        {/* Current cost bar (background, 25% opacity) */}
        <div style={{
          position: "absolute", left: 0, top: 2, height: 20, borderRadius: 4,
          width: `${currentBarWidth}%`,
          background: `${trackColor}40`,
          transition: "width 0.5s ease-out",
        }} />
        {/* Future cost bar (solid, overlaid) */}
        <div style={{
          position: "absolute", left: 0, top: 2, height: 20, borderRadius: 4,
          width: `${futureBarWidth}%`,
          background: trackColor,
          opacity: 0.85,
          transition: "width 0.5s ease-out",
        }} />
        {/* Cost labels on bars */}
        {currentBarWidth > 15 && (
          <div style={{
            position: "absolute", left: 8, top: 4, fontSize: 10, fontFamily: MONO, fontWeight: 700,
            color: "rgba(255,255,255,0.9)", zIndex: 2,
          }}>
            {dispCurrent}
          </div>
        )}
      </div>

      {/* Current $ */}
      <div style={{ fontSize: 13, color: "#e8ecf4", fontFamily: MONO, fontWeight: 700, textAlign: "right" }}>
        {dispCurrent}
      </div>

      {/* Future $ */}
      <div style={{ fontSize: 13, color: "#e8ecf4", fontFamily: MONO, fontWeight: 700, textAlign: "right" }}>
        {dispFuture}
      </div>

      {/* Delta with arrow */}
      <div style={{
        fontSize: 13, fontWeight: 700, fontFamily: MONO,
        color: deltaColor, textAlign: "right",
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4,
      }}>
        <span style={{ fontSize: 14 }}>{deltaArrow}</span>
        <span>{deltaSign}{formatCurrency(Math.abs(delta))}</span>
      </div>

      {/* Impact: cost share progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 8 }}>
        <div style={{
          flex: 1, height: 6, borderRadius: 3,
          background: "rgba(255,255,255,0.06)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${Math.min(costPct, 100)}%`,
            background: trackColor,
            transition: "width 0.5s ease-out",
          }} />
        </div>
        <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: "#64748b", minWidth: 36, textAlign: "right" }}>
          {costPct.toFixed(1)}%
        </span>
      </div>

      {/* Hover tooltip */}
      {hovered && mode === "absolute" && (
        <div style={{
          position: "absolute", top: "100%", left: 50, zIndex: 20,
          background: "#131b2e", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "12px 16px",
          fontSize: 12, color: "#a3b1c6", fontFamily: MONO, fontWeight: 700,
          lineHeight: 1.8, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          <div>Current: {row.currentHeadcount.toLocaleString()} heads &times; {formatCurrency(row.avgComp)} = {formatCurrency(row.currentCost)}</div>
          <div>Future: {row.futureHeadcount.toLocaleString()} heads &times; {formatCurrency(row.futureAvgComp)} = {formatCurrency(row.futureCost)}</div>
          <div style={{ color: row.deltaCost < 0 ? "#34d399" : "#F97316", fontWeight: 700 }}>
            {row.deltaCost < 0 ? "Savings" : "Increase"}: {formatCurrency(Math.abs(row.deltaCost))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, subtotal }: { label: string; subtotal: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 12px 6px",
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "#64748b",
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 1,
        background: "linear-gradient(to right, rgba(255,255,255,0.08), transparent)",
      }} />
      <span style={{
        fontSize: 11, fontWeight: 700, fontFamily: MONO,
        color: "#64748b", whiteSpace: "nowrap",
      }}>
        {subtotal}
      </span>
    </div>
  );
}

function SubtotalRow({ label, rows }: { label: string; rows: ComputedRow[] }) {
  const curTotal = rows.reduce((s, r) => s + r.currentCost, 0);
  const futTotal = rows.reduce((s, r) => s + r.futureCost, 0);
  const delta = futTotal - curTotal;
  const curHC = rows.reduce((s, r) => s + r.currentHeadcount, 0);
  const futHC = rows.reduce((s, r) => s + r.futureHeadcount, 0);
  const deltaColor = delta < 0 ? "#34d399" : delta > 0 ? "#F97316" : "#64748b";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "clamp(36px,3.5vw,50px) clamp(70px,7vw,100px) clamp(44px,4vw,60px) 1fr clamp(56px,5.5vw,80px) clamp(56px,5.5vw,80px) clamp(50px,5vw,70px) clamp(70px,7vw,100px)",
      alignItems: "center",
      padding: "10px 12px",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.02)",
      fontWeight: 700,
    }}>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "#e8ecf4", fontFamily: MONO, fontWeight: 700 }}>
        {curHC.toLocaleString()} <span style={{ color: "#64748b" }}>&rarr;</span> {futHC.toLocaleString()}
      </div>
      <div />
      <div />
      <div style={{ fontSize: 13, color: "#e8ecf4", fontFamily: MONO, fontWeight: 700, textAlign: "right" }}>
        {formatCurrency(curTotal)}
      </div>
      <div style={{ fontSize: 13, color: "#e8ecf4", fontFamily: MONO, fontWeight: 700, textAlign: "right" }}>
        {formatCurrency(futTotal)}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: deltaColor,
        fontFamily: MONO, textAlign: "right",
      }}>
        {delta <= 0 ? "" : "+"}{formatCurrency(delta)}
      </div>
      <div />
    </div>
  );
}

function DonutChart({ segments, size = 140 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.6;

  let cumAngle = -Math.PI / 2;
  const paths = segments.filter(s => s.value > 0).map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const largeArc = angle > Math.PI ? 1 : 0;
    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const x1i = cx + innerR * Math.cos(endAngle);
    const y1i = cy + innerR * Math.sin(endAngle);
    const x2i = cx + innerR * Math.cos(startAngle);
    const y2i = cy + innerR * Math.sin(startAngle);

    const d = [
      `M ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      `Z`,
    ].join(" ");

    return <path key={seg.label} d={d} fill={seg.color} opacity={0.85} />;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#e8ecf4" fontSize={16} fontWeight={700} fontFamily={MONO}>
          {formatCurrency(total)}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight={600} letterSpacing="0.05em">
          TOTAL COST
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.filter(s => s.value > 0).map(seg => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color }} />
            <span style={{ fontSize: 11, color: "#a3b1c6", fontWeight: 600 }}>{seg.label}</span>
            <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: "#e8ecf4" }}>
              {((seg.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CostModelChart({ data }: { data?: LayerCostData[] }) {
  const rawRows = data ?? defaultData;
  const [mode, setMode] = useState<"absolute" | "perhead">("absolute");

  const computed: ComputedRow[] = useMemo(
    () =>
      rawRows
        .filter((d) => d.currentHeadcount > 0 || d.futureHeadcount > 0)
        .map((d) => {
          const futComp = d.futureAvgComp ?? d.avgComp;
          const curCost = d.currentHeadcount * d.avgComp;
          const futCost = d.futureHeadcount * futComp;
          return {
            layer: d.layer,
            currentHeadcount: d.currentHeadcount,
            futureHeadcount: d.futureHeadcount,
            avgComp: d.avgComp,
            futureAvgComp: futComp,
            currentCost: curCost,
            futureCost: futCost,
            deltaCost: futCost - curCost,
            deltaPct: curCost > 0 ? ((futCost - curCost) / curCost) * 100 : 0,
          };
        }),
    [rawRows]
  );

  const execRows = computed.filter((r) => r.layer.startsWith("E"));
  const mgtRows = computed.filter((r) => r.layer.startsWith("M"));
  const proRows = computed.filter((r) => r.layer.startsWith("P"));
  const supRows = computed.filter((r) => r.layer.startsWith("S"));
  const hasProRows = proRows.some((r) => r.currentHeadcount > 0 || r.futureHeadcount > 0);
  const hasSupRows = supRows.some((r) => r.currentHeadcount > 0 || r.futureHeadcount > 0);

  const maxCost = useMemo(
    () => Math.max(...computed.map((r) => Math.max(r.currentCost, r.futureCost)), 1),
    [computed]
  );

  const totalCurCost = computed.reduce((s, r) => s + r.currentCost, 0);
  const totalFutCost = computed.reduce((s, r) => s + r.futureCost, 0);
  const netSavings = totalFutCost - totalCurCost;
  const totalCurHC = computed.reduce((s, r) => s + r.currentHeadcount, 0);
  const totalFutHC = computed.reduce((s, r) => s + r.futureHeadcount, 0);
  const costPerHeadCur = totalCurHC > 0 ? totalCurCost / totalCurHC : 0;
  const costPerHeadFut = totalFutHC > 0 ? totalFutCost / totalFutHC : 0;
  const costShiftPct = totalCurCost > 0 ? ((totalFutCost - totalCurCost) / totalCurCost) * 100 : 0;

  // Track cost totals for donut chart
  const execCost = execRows.reduce((s, r) => s + r.currentCost, 0);
  const mgtCost = mgtRows.reduce((s, r) => s + r.currentCost, 0);
  const proCost = proRows.reduce((s, r) => s + r.currentCost, 0);
  const supCost = supRows.reduce((s, r) => s + r.currentCost, 0);

  const donutSegments = [
    { label: "Executive", value: execCost, color: TRACK_COLORS.E },
    { label: "Management", value: mgtCost, color: TRACK_COLORS.M },
    { label: "Professional", value: proCost, color: TRACK_COLORS.P },
    { label: "Support", value: supCost, color: TRACK_COLORS.S },
  ];

  const netColor = netSavings < 0 ? "#34d399" : netSavings > 0 ? "#F97316" : "#64748b";

  const cardBase: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: "16px 20px",
    border: "1px solid rgba(255,255,255,0.08)",
  };
  const cardLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#64748b", marginBottom: 6,
  };
  const cardValue: React.CSSProperties = {
    fontSize: 24, fontWeight: 700, fontFamily: MONO,
    color: "#e8ecf4",
  };

  const headerCols: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "clamp(36px,3.5vw,50px) clamp(70px,7vw,100px) clamp(44px,4vw,60px) 1fr clamp(56px,5.5vw,80px) clamp(56px,5.5vw,80px) clamp(50px,5vw,70px) clamp(70px,7vw,100px)",
    padding: "8px 12px",
    fontSize: 9, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    color: "#64748b",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  };

  const sectionSubtotal = (rows: ComputedRow[]) => {
    const cur = rows.reduce((s, r) => s + r.currentCost, 0);
    const fut = rows.reduce((s, r) => s + r.futureCost, 0);
    const curHC = rows.reduce((s, r) => s + r.currentHeadcount, 0);
    const futHC = rows.reduce((s, r) => s + r.futureHeadcount, 0);
    return `${curHC.toLocaleString()} → ${futHC.toLocaleString()} HC · ${formatCurrency(cur)} → ${formatCurrency(fut)}`;
  };

  const renderSection = (title: string, rows: ComputedRow[], showSubtotal: boolean) => (
    <div>
      <SectionHeader label={title} subtotal={sectionSubtotal(rows)} />
      {rows.map((r) => (
        <CostWaterfallRow key={r.layer} row={r} maxCost={maxCost} totalCost={totalCurCost} mode={mode} />
      ))}
      {showSubtotal && <SubtotalRow label="Sub" rows={rows} />}
    </div>
  );

  return (
    <div>
      {/* Top summary cards + donut */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
        {/* 5 stat cards */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div style={cardBase}>
            <div style={cardLabel}>Current Total Cost</div>
            <div style={cardValue}>{formatCurrency(totalCurCost)}</div>
          </div>
          <div style={cardBase}>
            <div style={cardLabel}>Future Total Cost</div>
            <div style={cardValue}>{formatCurrency(totalFutCost)}</div>
          </div>
          <div style={cardBase}>
            <div style={cardLabel}>Net {netSavings <= 0 ? "Savings" : "Increase"}</div>
            <div style={{ ...cardValue, fontSize: 28, color: netColor }}>
              {netSavings > 0 ? "+" : ""}{formatCurrency(netSavings)}
            </div>
          </div>
          <div style={cardBase}>
            <div style={cardLabel}>Cost Per Head (avg)</div>
            <div style={cardValue}>
              {formatCurrency(costPerHeadCur)}
              <span style={{ color: "#64748b", fontSize: 14, margin: "0 4px" }}>&rarr;</span>
              {formatCurrency(costPerHeadFut)}
            </div>
          </div>
          <div style={cardBase}>
            <div style={cardLabel}>Cost Shift %</div>
            <div style={{ ...cardValue, color: netColor }}>
              {costShiftPct >= 0 ? "+" : ""}{costShiftPct.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Donut chart for cost distribution */}
      {donutSegments.some(s => s.value > 0) && (
        <div style={{
          ...cardBase, marginBottom: 20, display: "flex", alignItems: "center",
          justifyContent: "center", padding: "20px 32px",
        }}>
          <div>
            <div style={cardLabel}>Cost Distribution by Track</div>
            <DonutChart segments={donutSegments} size={140} />
          </div>
        </div>
      )}

      {/* Toggle — segmented pill control */}
      <div style={{
        display: "inline-flex", alignItems: "center",
        background: "rgba(255,255,255,0.04)", borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        padding: 3, marginBottom: 16,
      }}>
        {(["absolute", "perhead"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "6px 18px", borderRadius: 8,
              fontSize: 13, fontWeight: 600, border: "none",
              background: mode === m ? "rgba(59,130,246,0.15)" : "transparent",
              color: mode === m ? "#3B82F6" : "#64748b",
              cursor: "pointer", transition: "all 0.15s ease-out",
            }}
          >
            {m === "absolute" ? "Absolute" : "Per Head"}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div style={headerCols}>
        <div>Layer</div>
        <div>HC Current → Future</div>
        <div>Avg Comp</div>
        <div>Cost Waterfall</div>
        <div style={{ textAlign: "right" }}>{mode === "absolute" ? "Current $" : "Comp (C)"}</div>
        <div style={{ textAlign: "right" }}>{mode === "absolute" ? "Future $" : "Comp (F)"}</div>
        <div style={{ textAlign: "right" }}>Delta</div>
        <div style={{ textAlign: "center" }}>% of Total</div>
      </div>

      {/* Executive layers */}
      {execRows.length > 0 && renderSection("Executive layers", execRows, true)}

      {/* Management layers */}
      {mgtRows.length > 0 && renderSection("Management layers", mgtRows, true)}

      {/* Professional layers */}
      {hasProRows && renderSection("Professional layers", proRows.filter((r) => r.currentHeadcount > 0 || r.futureHeadcount > 0), true)}

      {/* Support layers */}
      {hasSupRows && renderSection("Support layers", supRows.filter((r) => r.currentHeadcount > 0 || r.futureHeadcount > 0), true)}

      {/* Methodology note */}
      <div style={{
        fontSize: 12, color: "#64748b", marginTop: 16, fontStyle: "italic",
      }}>
        Cost = headcount &times; fully-loaded compensation (base + 25% benefits + overhead). Future cost reflects scenario adjustments.
      </div>
    </div>
  );
}
