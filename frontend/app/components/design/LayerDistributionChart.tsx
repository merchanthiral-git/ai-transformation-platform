"use client";
import React, { useState, useMemo } from "react";

export interface LayerData {
  layer: string;
  current: number;
  future: number;
}

const defaultData: LayerData[] = [
  { layer: "E5", current: 275, future: 210 },
  { layer: "E4", current: 327, future: 280 },
  { layer: "E3", current: 822, future: 740 },
  { layer: "E2", current: 763, future: 700 },
  { layer: "E1", current: 1128, future: 1050 },
  { layer: "M6", current: 1137, future: 1100 },
  { layer: "M5", current: 1175, future: 1250 },
  { layer: "M4", current: 1255, future: 1400 },
  { layer: "M3", current: 984, future: 1100 },
  { layer: "M2", current: 134, future: 300 },
  { layer: "M1", current: 0, future: 50 },
];

const GRAY = "#888780";
const TEAL = "#1D9E75";
const RED = "#E24B4A";

function LayerRow({
  d,
  maxValue,
  totalCur,
  totalFut,
  mode,
}: {
  d: LayerData;
  maxValue: number;
  totalCur: number;
  totalFut: number;
  mode: "headcount" | "percent";
}) {
  const [hovered, setHovered] = useState(false);

  const curVal = mode === "headcount" ? d.current : totalCur > 0 ? (d.current / totalCur) * 100 : 0;
  const futVal = mode === "headcount" ? d.future : totalFut > 0 ? (d.future / totalFut) * 100 : 0;
  const scaleMax = mode === "headcount" ? maxValue : Math.max(totalCur > 0 ? (maxValue / totalCur) * 100 : 0, totalFut > 0 ? (maxValue / totalFut) * 100 : 0, 0.1);

  const delta = mode === "headcount" ? d.future - d.current : futVal - curVal;
  const deltaColor = delta >= 0 ? TEAL : RED;

  const barStart = 44;
  const barMaxW = 420;
  const curBarW = scaleMax > 0 ? (curVal / scaleMax) * barMaxW : 0;
  const futBarW = scaleMax > 0 ? (futVal / scaleMax) * barMaxW : 0;
  const curBarEnd = barStart + curBarW;
  const futBarEnd = barStart + futBarW;
  const biggerEnd = Math.max(curBarEnd, futBarEnd);

  const curBarY = 6;
  const curBarH = 18;
  const futBarY = 30;
  const futBarH = 18;

  const bracketX = biggerEnd + 12;
  const bracketW = 16;
  const bracketTop = 10;
  const bracketBot = 44;
  const bracketMid = 27;

  const curLabel = mode === "headcount" ? d.current.toLocaleString() : `${curVal.toFixed(1)}%`;
  const futLabel = mode === "headcount" ? d.future.toLocaleString() : `${futVal.toFixed(1)}%`;
  const deltaLabel = mode === "headcount"
    ? `${delta >= 0 ? "+" : ""}${delta.toLocaleString()}`
    : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}pp`;

  const minBarForLabel = 50;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "var(--hover, rgba(255,255,255,0.03))" : "transparent",
        borderRadius: 6,
        transition: "background 0.15s ease",
      }}
    >
      <svg
        width="100%"
        viewBox="0 0 700 64"
        preserveAspectRatio="xMinYMid meet"
        style={{ display: "block" }}
      >
        {/* Layer label */}
        <text
          x={0}
          y={32}
          dominantBaseline="central"
          style={{
            fontSize: 13,
            fontWeight: 500,
            fill: "var(--text-primary, #e8ecf4)",
          }}
        >
          {d.layer}
        </text>

        {/* Current bar (gray) */}
        <rect
          x={barStart}
          y={curBarY}
          width={Math.max(curBarW, 0)}
          height={curBarH}
          rx={3}
          ry={3}
          fill={GRAY}
          style={{ transition: "width 0.5s ease" }}
        />
        {/* Current label */}
        {curBarW >= minBarForLabel ? (
          <text
            x={barStart + 8}
            y={curBarY + curBarH / 2}
            dominantBaseline="central"
            style={{ fontSize: 12, fontWeight: 700, fill: "#fff", fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}
          >
            {curLabel}
          </text>
        ) : (
          <text
            x={curBarEnd + 6}
            y={curBarY + curBarH / 2}
            dominantBaseline="central"
            style={{ fontSize: 12, fontWeight: 700, fill: "var(--text-muted, #7b8ba2)", fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}
          >
            {curLabel}
          </text>
        )}

        {/* Future bar (teal) */}
        <rect
          x={barStart}
          y={futBarY}
          width={Math.max(futBarW, 0)}
          height={futBarH}
          rx={3}
          ry={3}
          fill={TEAL}
          style={{ transition: "width 0.5s ease" }}
        />
        {/* Future label */}
        {futBarW >= minBarForLabel ? (
          <text
            x={barStart + 8}
            y={futBarY + futBarH / 2}
            dominantBaseline="central"
            style={{ fontSize: 12, fontWeight: 700, fill: "#fff", fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}
          >
            {futLabel}
          </text>
        ) : (
          <text
            x={futBarEnd + 6}
            y={futBarY + futBarH / 2}
            dominantBaseline="central"
            style={{ fontSize: 12, fontWeight: 700, fill: "var(--text-muted, #7b8ba2)", fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}
          >
            {futLabel}
          </text>
        )}

        {/* Bracket connector ] shape */}
        {(d.current > 0 || d.future > 0) && (
          <>
            <path
              d={`M ${bracketX},${bracketTop} L ${bracketX + bracketW},${bracketTop} L ${bracketX + bracketW},${bracketBot} L ${bracketX},${bracketBot}`}
              fill="none"
              stroke={deltaColor}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Connector line to delta label */}
            <line
              x1={bracketX + bracketW}
              y1={bracketMid}
              x2={bracketX + bracketW + 6}
              y2={bracketMid}
              stroke={deltaColor}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            {/* Delta label */}
            <text
              x={bracketX + bracketW + 10}
              y={bracketMid + 4}
              style={{ fontSize: 13, fontWeight: 700, fill: deltaColor, fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}
            >
              {deltaLabel}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export default function LayerDistributionChart({ data }: { data?: LayerData[] }) {
  const rows = data ?? defaultData;
  const [mode, setMode] = useState<"headcount" | "percent">("headcount");

  const execLayers = useMemo(() => rows.filter((d) => d.layer.startsWith("E")), [rows]);
  const mgtLayers = useMemo(() => rows.filter((d) => d.layer.startsWith("M")), [rows]);

  const maxValue = useMemo(
    () => Math.max(...rows.map((d) => d.current), ...rows.map((d) => d.future), 1),
    [rows]
  );
  const totalCur = useMemo(() => rows.reduce((s, d) => s + d.current, 0), [rows]);
  const totalFut = useMemo(() => rows.reduce((s, d) => s + d.future, 0), [rows]);

  const execCurTotal = execLayers.reduce((s, d) => s + d.current, 0);
  const execFutTotal = execLayers.reduce((s, d) => s + d.future, 0);
  const execDeltaPct = execCurTotal > 0 ? ((execFutTotal - execCurTotal) / execCurTotal) * 100 : 0;

  const mgtCurTotal = mgtLayers.reduce((s, d) => s + d.current, 0);
  const mgtFutTotal = mgtLayers.reduce((s, d) => s + d.future, 0);
  const mgtDeltaPct = mgtCurTotal > 0 ? ((mgtFutTotal - mgtCurTotal) / mgtCurTotal) * 100 : 0;

  const renderSection = (title: string, layers: LayerData[]) => (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted, #7b8ba2)",
          marginBottom: 8,
          paddingLeft: 2,
        }}
      >
        {title}
      </div>
      {layers.map((d) => (
        <LayerRow
          key={d.layer}
          d={d}
          maxValue={maxValue}
          totalCur={totalCur}
          totalFut={totalFut}
          mode={mode}
        />
      ))}
    </div>
  );

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {(["headcount", "percent"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid var(--border, #2a3350)",
              background: mode === m ? "var(--accent-primary, #D4860A)" : "transparent",
              color: mode === m ? "#fff" : "var(--text-secondary, #a3b1c6)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {m === "headcount" ? "Headcount" : "% of Org"}
          </button>
        ))}
      </div>

      {/* Executive layers */}
      {renderSection("Executive layers", execLayers)}

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "var(--border, #2a3350)",
          margin: "12px 0",
        }}
      />

      {/* Management layers */}
      {renderSection("Management layers", mgtLayers)}

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginTop: 20,
        }}
      >
        <div
          style={{
            background: "var(--surface-2, #1a2340)",
            borderRadius: 8,
            padding: "12px 16px",
            border: "1px solid var(--border, #2a3350)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted, #7b8ba2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Total Org
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary, #e8ecf4)", fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>
            {totalCur.toLocaleString()} → {totalFut.toLocaleString()}
          </div>
        </div>
        <div
          style={{
            background: "var(--surface-2, #1a2340)",
            borderRadius: 8,
            padding: "12px 16px",
            border: "1px solid var(--border, #2a3350)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted, #7b8ba2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Executive (E1-E5)
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: execDeltaPct < 0 ? RED : TEAL, fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>
            {execDeltaPct >= 0 ? "+" : ""}{execDeltaPct.toFixed(1)}%
          </div>
        </div>
        <div
          style={{
            background: "var(--surface-2, #1a2340)",
            borderRadius: 8,
            padding: "12px 16px",
            border: "1px solid var(--border, #2a3350)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted, #7b8ba2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Management (M1-M6)
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: mgtDeltaPct >= 0 ? TEAL : RED, fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>
            {mgtDeltaPct >= 0 ? "+" : ""}{mgtDeltaPct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
