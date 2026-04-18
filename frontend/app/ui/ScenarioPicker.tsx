"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, SlidersHorizontal, Sparkle, RefreshCw } from "@/lib/icons";

interface Scenario {
  id: string;
  label: string;
  summary: string;
}

interface ScenarioPickerProps {
  scenarios: Scenario[];
  active: string;
  onChange: (id: string) => void;
  onCustomize?: () => void;
  onRecommend?: () => void;
  onReset?: () => void;
}

export function ScenarioPicker({
  scenarios,
  active,
  onChange,
  onCustomize,
  onRecommend,
  onReset,
}: ScenarioPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeScenario = scenarios.find((s) => s.id === active);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const btnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 10px",
    fontSize: "var(--text-xs)",
    fontWeight: "var(--fw-medium)",
    backgroundColor: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    color: "var(--text-secondary)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background var(--duration-fast) var(--ease-out)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {/* Dropdown trigger */}
        <div ref={containerRef} style={{ position: "relative" }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--fw-medium)",
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              color: "var(--text-primary)",
              cursor: "pointer",
              minWidth: 180,
              justifyContent: "space-between",
            }}
          >
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeScenario?.label ?? "Select scenario"}
            </span>
            <ChevronDown
              size={13}
              style={{
                flexShrink: 0,
                color: "var(--text-muted)",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform var(--duration-fast) var(--ease-out)",
              }}
            />
          </button>

          {/* Dropdown menu */}
          {open && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                zIndex: 100,
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "var(--shadow-3)",
                minWidth: 220,
                padding: "4px 0",
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px 12px",
                    textAlign: "left",
                    background: s.id === active ? "var(--active-bg)" : "none",
                    border: "none",
                    color: s.id === active ? "var(--accent-primary)" : "var(--text-secondary)",
                    fontSize: "var(--text-sm)",
                    fontWeight: s.id === active ? "var(--fw-medium)" : "var(--fw-regular)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (s.id !== active)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (s.id !== active)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {onCustomize && (
          <button onClick={onCustomize} style={btnStyle}>
            <SlidersHorizontal size={12} />
            Customize
          </button>
        )}

        {onRecommend && (
          <button onClick={onRecommend} style={btnStyle}>
            <Sparkle size={12} />
            AI Recommend
          </button>
        )}

        {onReset && (
          <button onClick={onReset} style={btnStyle}>
            <RefreshCw size={12} />
            Reset
          </button>
        )}
      </div>

      {/* Active scenario summary */}
      {activeScenario?.summary && (
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          {activeScenario.summary}
        </p>
      )}
    </div>
  );
}

export default ScenarioPicker;
