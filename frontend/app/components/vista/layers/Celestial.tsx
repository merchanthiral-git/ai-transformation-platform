'use client';

import { useMemo } from 'react';
import { useVista } from '../hooks/useVista';

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export default function Celestial() {
  const { hour } = useVista();

  const sun = useMemo(() => {
    // Sun: rises at 6, peaks at noon, sets at 20
    const t = clamp01((hour - 6) / 14);
    const arc = Math.sin(t * Math.PI); // 0 at rise/set, 1 at peak
    const x = 10 + t * 80; // 10% to 90%
    const y = 100 - arc * 85; // bottom(100) to top(15%)
    return { x, y };
  }, [hour]);

  const moon = useMemo(() => {
    // Moon: rises at 20, peaks at ~3am, sets at 6
    // Total arc: 10 hours (20 -> 6 next day)
    let elapsed = hour - 20;
    if (elapsed < 0) elapsed += 24;
    const t = clamp01(elapsed / 10);
    const arc = Math.sin(t * Math.PI);
    const x = 10 + t * 80;
    const y = 100 - arc * 85;
    return { x, y };
  }, [hour]);

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Sun glow halo */}
      <div
        className="vista-celestial-body"
        style={{
          position: 'absolute',
          left: `${sun.x}%`,
          top: `${sun.y}%`,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,248,224,0.4), transparent 70%)',
          opacity: 'var(--sun-opacity)',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform, opacity',
        }}
      />
      {/* Sun disc */}
      <div
        className="vista-celestial-body"
        style={{
          position: 'absolute',
          left: `${sun.x}%`,
          top: `${sun.y}%`,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fff8e0, #f4a83a)',
          opacity: 'var(--sun-opacity)',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Moon disc */}
      <div
        className="vista-celestial-body"
        style={{
          position: 'absolute',
          left: `${moon.x}%`,
          top: `${moon.y}%`,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: '#e8e0d4',
          boxShadow: 'inset -6px -2px 8px rgba(0,0,0,0.3)',
          opacity: 'var(--moon-opacity)',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Reduced-motion + transition styles */}
      <style>{`
        .vista-celestial-body {
          transition: left 1s ease, top 1s ease, opacity 1s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .vista-celestial-body {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
