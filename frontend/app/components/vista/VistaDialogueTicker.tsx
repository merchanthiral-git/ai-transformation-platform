'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVista } from './hooks/useVista';
import { pickCharacter, type Character } from './engine/characters';

/**
 * A subtle character dialogue ticker that lives in the app chrome (topbar area).
 * Cycles through character lines every 15-20s, biased toward the active workstream.
 * Click the character icon to see who's speaking.
 */
export default function VistaDialogueTicker() {
  const { activeWorkstream } = useVista();
  const [current, setCurrent] = useState<{ char: Character; line: string } | null>(null);
  const [showName, setShowName] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const nextLine = useCallback(() => {
    const char = pickCharacter(activeWorkstream);
    const line = char.dialogueLines[Math.floor(Math.random() * char.dialogueLines.length)];
    setVisible(false);
    setTimeout(() => {
      setCurrent({ char, line });
      setVisible(true);
    }, 500);
  }, [activeWorkstream]);

  useEffect(() => {
    nextLine();
    const schedule = () => {
      const delay = 15000 + Math.random() * 5000;
      timerRef.current = setTimeout(() => { nextLine(); schedule(); }, delay);
    };
    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nextLine]);

  if (!current) return null;

  return (
    <div className="flex items-center gap-2" style={{ maxWidth: 300 }}>
      {/* Character icon */}
      <button
        onClick={() => setShowName(p => !p)}
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
        style={{
          background: 'rgba(244,168,58,0.12)',
          border: '1px solid rgba(244,168,58,0.2)',
          color: 'var(--amber)',
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
        }}
        title={`${current.char.name} · ${current.char.role}`}
      >
        {current.char.name[0]}
      </button>

      {/* Dialogue text */}
      <div
        className="truncate"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--amber)',
          opacity: visible ? 0.7 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        {showName && (
          <span style={{ color: 'var(--ink-faint)', marginRight: 4 }}>
            {current.char.name}:
          </span>
        )}
        <span style={{ fontStyle: 'italic' }}>{current.line}</span>
      </div>

      {/* Screen reader */}
      <div className="sr-only" role="status" aria-live="polite">
        {current.char.name}, {current.char.role}: {current.line}
      </div>
    </div>
  );
}
