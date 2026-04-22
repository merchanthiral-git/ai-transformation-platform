'use client';

import { useEffect, useRef, useState } from 'react';

const HOVER_SELECTORS = 'a, button, [role="button"], .role-card, .family, .nav-item, .kpi, .tab, input, select, textarea';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const [isTouch, setIsTouch] = useState(false);
  const [hovering, setHovering] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Detect touch device
    const mq = window.matchMedia('(hover: none)');
    if (mq.matches) { setIsTouch(true); return; }
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mq.addEventListener('change', onChange);

    const handleMove = (e: MouseEvent) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(HOVER_SELECTORS)) setHovering(true);
    };
    const handleOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(HOVER_SELECTORS)) setHovering(false);
    };

    const animateRing = () => {
      ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.18;
      ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate(${ringPos.current.x}px, ${ringPos.current.y}px) translate(-50%, -50%)`;
      }
      rafRef.current = requestAnimationFrame(animateRing);
    };

    document.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('mouseover', handleOver, { passive: true });
    document.addEventListener('mouseout', handleOut, { passive: true });
    rafRef.current = requestAnimationFrame(animateRing);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseover', handleOver);
      document.removeEventListener('mouseout', handleOut);
      mq.removeEventListener('change', onChange);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (isTouch) return null;

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: hovering ? 12 : 8,
          height: hovering ? 12 : 8,
          borderRadius: '50%',
          background: hovering ? 'var(--coral)' : 'var(--amber)',
          boxShadow: hovering
            ? '0 0 12px rgba(232,122,93,0.4)'
            : '0 0 8px var(--amber-glow)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
          zIndex: 99999,
          transition: 'width 0.2s, height 0.2s, background 0.2s, box-shadow 0.2s',
          willChange: 'transform',
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: hovering ? 56 : 36,
          height: hovering ? 56 : 36,
          borderRadius: '50%',
          border: '1px solid var(--amber)',
          opacity: 0.5,
          pointerEvents: 'none',
          zIndex: 99998,
          transition: 'width 0.3s var(--ease-spring), height 0.3s var(--ease-spring), opacity 0.2s',
          willChange: 'transform',
        }}
      />
      <style jsx global>{`
        @media (hover: hover) {
          body:not(:has(.marketing-root)) { cursor: none !important; }
          body:not(:has(.marketing-root)) a,
          body:not(:has(.marketing-root)) button,
          body:not(:has(.marketing-root)) [role="button"],
          body:not(:has(.marketing-root)) input,
          body:not(:has(.marketing-root)) select,
          body:not(:has(.marketing-root)) textarea { cursor: none !important; }
          .marketing-root, .marketing-root * { cursor: auto !important; }
        }
      `}</style>
    </>
  );
}
