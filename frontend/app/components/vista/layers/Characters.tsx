'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVista } from '../hooks/useVista';
import { pickCharacter, type Character } from '../engine/characters';

const PATH_Y: Record<string, number> = { ridge: 58, bridge: 72, village: 78, road: 85 };
const PATH_SCALE: Record<string, number> = { ridge: 0.6, bridge: 0.9, village: 1, road: 1.1 };

interface ActiveChar {
  char: Character;
  x: number;
  speaking: boolean;
  line: string;
  entering: boolean;
  exiting: boolean;
}

export default function Characters() {
  const { activeWorkstream, lamp } = useVista();
  const [active, setActive] = useState<ActiveChar | null>(null);
  const rafRef = useRef<number>(0);
  const spawnTimeout = useRef<ReturnType<typeof setTimeout>>();
  const speechTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const spawnCharacter = useCallback(() => {
    const char = pickCharacter(activeWorkstream);
    const line = char.dialogueLines[Math.floor(Math.random() * char.dialogueLines.length)];
    setActive({ char, x: -5, speaking: false, line, entering: true, exiting: false });
  }, [activeWorkstream]);

  // Movement loop
  useEffect(() => {
    if (!active || active.exiting) return;
    const startTime = performance.now();
    const startX = active.x;
    const duration = reducedMotion.current ? 0 : ((110 / active.char.speed) * 1000); // time to cross screen
    const speechPoint = 35 + Math.random() * 30; // speak at 35-65% across
    let spoke = false;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = reducedMotion.current ? 0.5 : Math.min(elapsed / duration, 1);
      const x = startX + progress * 110;

      // Trigger speech
      if (!spoke && x >= speechPoint) {
        spoke = true;
        setActive(prev => prev ? { ...prev, speaking: true, x } : null);
        speechTimeout.current = setTimeout(() => {
          setActive(prev => prev ? { ...prev, speaking: false } : null);
        }, 6000);
      } else {
        setActive(prev => prev ? { ...prev, x } : null);
      }

      if (progress < 1 && !reducedMotion.current) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Character done — fade out then schedule next
        setActive(prev => prev ? { ...prev, exiting: true } : null);
        setTimeout(() => {
          setActive(null);
          const delay = 15000 + Math.random() * 15000;
          spawnTimeout.current = setTimeout(spawnCharacter, delay);
        }, reducedMotion.current ? 4000 : 1000);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (speechTimeout.current) clearTimeout(speechTimeout.current);
    };
  }, [active?.char.id, active?.exiting, spawnCharacter]);

  // Initial spawn
  useEffect(() => {
    spawnTimeout.current = setTimeout(spawnCharacter, 3000);
    return () => { if (spawnTimeout.current) clearTimeout(spawnTimeout.current); };
  }, [spawnCharacter]);

  if (!active) return null;

  const y = PATH_Y[active.char.path] || 75;
  const scale = PATH_SCALE[active.char.path] || 1;
  const hasLantern = lamp > 0.5;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {/* Screen reader announcement */}
      {active.speaking && (
        <div className="sr-only" role="status" aria-live="polite">
          {active.char.name}, {active.char.role}: {active.line}
        </div>
      )}

      {/* Character */}
      <div
        style={{
          position: 'absolute',
          left: `${active.x}%`,
          top: `${y}%`,
          transform: `scale(${scale})`,
          transition: active.exiting ? 'opacity 1s ease' : undefined,
          opacity: active.exiting ? 0 : 1,
        }}
      >
        {/* SVG silhouette */}
        <svg width="20" height="28" viewBox="0 0 20 28" fill="none" style={{
          animation: 'char-bob 0.4s ease-in-out infinite alternate',
        }}>
          {active.char.silhouette === 'figure-1' && (
            <>
              <circle cx="10" cy="4" r="3.5" fill="#08080e" />
              <path d="M7 8 L5 26 L8 26 L10 16 L12 26 L15 26 L13 8 Z" fill="#08080e" />
              <path d="M6 9 L4 22 Q10 24 16 22 L14 9 Z" fill="#0c0c14" opacity="0.5" />
            </>
          )}
          {active.char.silhouette === 'figure-2' && (
            <>
              <circle cx="10" cy="4" r="3.5" fill="#08080e" />
              <path d="M7 8 L6 26 L9 26 L10 16 L11 26 L14 26 L13 8 Z" fill="#08080e" />
              <line x1="14" y1="10" x2="18" y2="4" stroke="#08080e" strokeWidth="1.5" />
            </>
          )}
          {active.char.silhouette === 'figure-3' && (
            <>
              <path d="M6 2 Q10 -1 14 2 L13 6 Q10 7 7 6 Z" fill="#08080e" />
              <circle cx="10" cy="5" r="3" fill="#08080e" />
              <path d="M7 8 L6 26 L9 26 L10 16 L11 26 L14 26 L13 8 Z" fill="#08080e" />
            </>
          )}
          {active.char.silhouette === 'figure-4' && (
            <>
              <circle cx="10" cy="4" r="3.5" fill="#08080e" />
              <path d="M7 8 L6 26 L9 26 L10 16 L11 26 L14 26 L13 8 Z" fill="#08080e" />
              <rect x="12" y="12" width="6" height="5" rx="1" fill="#0c0c14" />
            </>
          )}
          {/* Lantern at night */}
          {hasLantern && (
            <>
              <circle cx="4" cy="20" r="3" fill="var(--lamp)" opacity="0.6" />
              <circle cx="4" cy="20" r="1.5" fill="var(--lamp)" />
            </>
          )}
        </svg>

        {/* Dialogue bubble */}
        {active.speaking && (
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%) translateY(4px)',
              background: 'rgba(22, 24, 34, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-hot)',
              borderRadius: 10,
              padding: '10px 14px',
              maxWidth: 240,
              minWidth: 160,
              animation: 'bubble-in 0.3s ease-out forwards',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--amber)',
              marginBottom: 4,
            }}>
              {active.char.name} · {active.char.role}
            </div>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--ink)',
            }}>
              {active.line}
            </div>
            {/* Triangle pointer */}
            <div style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(22, 24, 34, 0.9)',
            }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes char-bob {
          from { transform: translateY(0); }
          to { transform: translateY(-2px); }
        }
        @keyframes bubble-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes char-bob { from, to { transform: translateY(0); } }
        }
      `}</style>
    </div>
  );
}
