'use client';

import { useRef } from 'react';

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function Embers() {
  const particles = useRef(
    Array.from({ length: 20 }, () => ({
      left: `${Math.random() * 100}%`,
      size: randomBetween(2, 4),
      duration: randomBetween(6, 14),
      delay: randomBetween(0, 8),
      driftX: randomBetween(-20, 20),
    }))
  );

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: 'var(--ember-opacity)',
      }}
    >
      {particles.current.map((p, i) => (
        <div
          key={i}
          className="vista-ember"
          style={{
            position: 'absolute',
            left: p.left,
            bottom: -10,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'var(--lamp, #f4a83a)',
            boxShadow: '0 0 6px 2px var(--lamp, #f4a83a)',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--drift-x': `${p.driftX}px`,
          } as React.CSSProperties}
        />
      ))}

      <style>{`
        .vista-ember {
          animation: vista-ember-rise ease-in-out infinite;
          will-change: transform, opacity;
        }

        @keyframes vista-ember-rise {
          0% {
            transform: translate(0, 0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translate(var(--drift-x, 0px), -55vh);
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translate(0, -110vh);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vista-ember {
            animation: none !important;
            bottom: auto !important;
            top: 30%;
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
