"use client";
import React, { useState, useRef } from "react";
import { GLOSSARY } from "../../lib/glossary";

/**
 * GlossaryTip — wrap any text to add a hover tooltip with glossary definition.
 * Usage: <GlossaryTip term="AI Readiness">AI Readiness</GlossaryTip>
 * If the term is not in the glossary, renders children without tooltip.
 */
export function GlossaryTip({ term, children }: { term: string; children: React.ReactNode }) {
  const entry = GLOSSARY[term];
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const tipRef = useRef<HTMLDivElement>(null);

  if (!entry) return <>{children}</>;

  const onEnter = () => { timerRef.current = setTimeout(() => setShow(true), 400); };
  const onLeave = () => { clearTimeout(timerRef.current); setShow(false); };

  return (
    <span className="relative inline-flex items-center gap-0.5 cursor-help" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-30 shrink-0">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <text x="8" y="12" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="600">?</text>
      </svg>
      {show && (
        <div ref={tipRef} className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none" style={{ width: 280 }}>
          <div className="rounded-xl p-3 text-left" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", boxShadow: "var(--shadow-3)" }}>
            <div className="text-[13px] text-[var(--text-primary)] leading-relaxed mb-1">{entry.definition}</div>
            {entry.action && <div className="text-[12px] text-[var(--accent-primary)] leading-relaxed mt-1.5 pt-1.5 border-t border-[var(--border)]">💡 {entry.action}</div>}
          </div>
        </div>
      )}
    </span>
  );
}
