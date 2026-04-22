'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function Mountains() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const targetRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;  // -1..1
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetRef.current = { x: nx, y: ny };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const tick = () => {
      setOffset((prev) => ({
        x: prev.x + (targetRef.current.x - prev.x) * 0.08,
        y: prev.y + (targetRef.current.y - prev.y) * 0.08,
      }));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45%',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Far mountains - gentle rolling hills */}
      <svg
        viewBox="0 0 1600 400"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translateX(${offset.x * 2}px)`,
          willChange: 'transform',
        }}
      >
        <path
          d="M0 400 L0 280 Q100 240 200 260 Q320 220 400 240 Q500 200 600 220 Q720 180 800 200 Q920 170 1000 190 Q1120 160 1200 180 Q1320 200 1400 210 Q1500 230 1600 250 L1600 400 Z"
          fill="#0a0a14"
        />
      </svg>

      {/* Mid mountains - taller peaks with snow caps */}
      <svg
        viewBox="0 0 1600 400"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translateX(${offset.x * 6}px)`,
          willChange: 'transform',
        }}
      >
        <path
          d="M0 400 L0 320 Q80 290 160 300 L300 180 Q340 160 380 180 L500 280 Q560 260 620 270 L780 140 Q820 120 860 140 L980 260 Q1040 240 1100 250 L1240 160 Q1280 140 1320 160 L1440 280 Q1520 300 1600 310 L1600 400 Z"
          fill="#0e0e1a"
        />
        {/* Snow caps */}
        <path d="M300 180 L340 160 L380 180 L360 185 L320 178 Z" fill="#c8cad4" opacity="0.7" />
        <path d="M780 140 L820 120 L860 140 L845 146 L798 138 Z" fill="#c8cad4" opacity="0.7" />
        <path d="M1240 160 L1280 140 L1320 160 L1305 165 L1255 158 Z" fill="#c8cad4" opacity="0.6" />
      </svg>

      {/* Near hills - rounded with dashed detail lines */}
      <svg
        viewBox="0 0 1600 400"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translateX(${offset.x * 12}px)`,
          willChange: 'transform',
        }}
      >
        <path
          d="M0 400 L0 340 Q120 280 280 300 Q440 260 600 290 Q760 270 900 300 Q1060 260 1200 290 Q1380 270 1600 320 L1600 400 Z"
          fill="#12121e"
        />
        {/* Dashed detail lines on hills */}
        <path
          d="M100 330 Q200 300 340 310 Q460 290 580 305"
          fill="none"
          stroke="#1a1a28"
          strokeWidth="1.5"
          strokeDasharray="8 6"
        />
        <path
          d="M700 310 Q850 285 1000 300 Q1140 280 1300 295"
          fill="none"
          stroke="#1a1a28"
          strokeWidth="1.5"
          strokeDasharray="8 6"
        />
      </svg>
    </div>
  );
}
