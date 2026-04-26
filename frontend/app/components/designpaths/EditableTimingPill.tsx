"use client";
import React, { useState, useRef, useEffect } from "react";
import type { StepTiming } from "../../lib/designpaths/types";

interface Props {
  timing: StepTiming;
  onSave: (newTiming: Partial<StepTiming>) => void;
}

function formatTiming(t: StepTiming): string {
  if (t.minWeeks === t.maxWeeks) return `${t.minWeeks}wk`;
  return `${t.minWeeks}–${t.maxWeeks}wk`;
}

function parseTimingInput(raw: string): { min: number; max: number } | null {
  const cleaned = raw.replace(/\s*(weeks?|wk|wks)\s*/gi, "").trim();
  // "3-4" or "3–4"
  const rangeMatch = cleaned.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (min > 0 && max >= min && max <= 52) return { min, max };
    return null;
  }
  // "3"
  const single = parseInt(cleaned, 10);
  if (!isNaN(single) && single > 0 && single <= 52) return { min: single, max: single };
  return null;
}

export function EditableTimingPill({ timing, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleOpen = () => {
    setValue(timing.minWeeks === timing.maxWeeks ? `${timing.minWeeks}` : `${timing.minWeeks}-${timing.maxWeeks}`);
    setError(false);
    setEditing(true);
  };

  const handleSave = () => {
    const parsed = parseTimingInput(value);
    if (!parsed) { setError(true); return; }
    onSave({ minWeeks: parsed.min, maxWeeks: parsed.max });
    setEditing(false);
  };

  if (editing) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => { setValue(e.target.value); setError(false); }}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          style={{
            width: 56, padding: "2px 6px", fontSize: 12, fontWeight: 600,
            background: error ? "rgba(239,68,68,0.06)" : "var(--surface-2)",
            border: `1px solid ${error ? "#ef4444" : "var(--accent-primary)"}`,
            borderRadius: 6, color: "var(--text-primary)", outline: "none",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>weeks</span>
        {error && <span style={{ fontSize: 10, color: "#ef4444" }}>Invalid</span>}
      </span>
    );
  }

  return (
    <button
      onClick={handleOpen}
      title="Click to edit timing"
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "2px 10px", fontSize: 12, fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        background: timing.edited ? "rgba(83,74,183,0.08)" : "var(--surface-2)",
        border: `1px solid ${timing.edited ? "rgba(83,74,183,0.2)" : "var(--border)"}`,
        borderRadius: 6, color: timing.edited ? "#534AB7" : "var(--text-secondary)",
        cursor: "pointer", transition: "all 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-primary)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = timing.edited ? "rgba(83,74,183,0.2)" : "var(--border)")}
    >
      {formatTiming(timing)}
      {timing.edited && <span style={{ fontSize: 9, opacity: 0.6 }}>✎</span>}
    </button>
  );
}
