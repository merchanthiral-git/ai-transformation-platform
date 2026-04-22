'use client';

import { useVista } from '../hooks/useVista';

export default function Water() {
  const { moon, lamp } = useVista();

  const showMoonReflection = moon > 0.5;
  const showAmberGlow = lamp > 0.5;

  return (
    <div
      aria-hidden
      className="vista-water"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '8%',
        background: 'linear-gradient(to top, var(--sky-top), var(--sky-mid), var(--sky-warm))',
        opacity: 0.4,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Wave shimmer overlay */}
      <div className="vista-water-shimmer" />

      {/* Moon reflection */}
      {showMoonReflection && (
        <div
          className="vista-water-moon-reflection"
          style={{ opacity: (moon - 0.5) * 2 }}
        />
      )}

      {/* Golden hour amber reflection */}
      {showAmberGlow && (
        <div
          className="vista-water-amber-glow"
          style={{ opacity: (lamp - 0.5) * 2 }}
        />
      )}

      <style>{`
        .vista-water-shimmer {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.04) 20%,
            transparent 40%
          );
          animation: vista-water-wave 4s ease-in-out infinite;
          will-change: transform;
        }

        .vista-water-moon-reflection {
          position: absolute;
          top: 10%;
          left: 50%;
          width: 60px;
          height: 80%;
          transform: translateX(-50%);
          background: radial-gradient(
            ellipse 30px 100% at center,
            rgba(255, 255, 255, 0.25),
            transparent 70%
          );
          animation: vista-water-moon-shimmer 3s ease-in-out infinite;
          transition: opacity 2s ease;
        }

        .vista-water-amber-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 50% 100% at 50% 0%,
            rgba(255, 180, 60, 0.2),
            transparent 70%
          );
          transition: opacity 2s ease;
        }

        @keyframes vista-water-wave {
          0%, 100% { transform: translateX(-2%); }
          50% { transform: translateX(2%); }
        }

        @keyframes vista-water-moon-shimmer {
          0%, 100% { transform: translateX(-50%) scaleX(1); }
          50% { transform: translateX(-50%) scaleX(1.3); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vista-water-shimmer,
          .vista-water-moon-reflection {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
