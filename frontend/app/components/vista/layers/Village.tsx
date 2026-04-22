'use client';

import { useMemo } from 'react';
import { useVista } from '../hooks/useVista';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function House({ x, w, h, roofH }: { x: number; w: number; h: number; roofH: number }) {
  return (
    <g>
      {/* Roof */}
      <polygon
        points={`${x},${300 - h} ${x + w / 2},${300 - h - roofH} ${x + w},${300 - h}`}
        fill="#08080e"
      />
      {/* Body */}
      <rect x={x} y={300 - h} width={w} height={h} fill="#08080e" />
      {/* Chimney */}
      <rect x={x + w * 0.7} y={300 - h - roofH + 6} width={6} height={roofH - 4} fill="#08080e" />
    </g>
  );
}

function SmokeWisps({ cx, baseY, show }: { cx: number; baseY: number; show: boolean }) {
  if (!show) return null;
  return (
    <g opacity="0.5">
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={cx + (i - 1) * 3}
          cy={baseY}
          r={2.5 + i * 0.6}
          fill="#555"
          style={{
            animation: `smoke-rise 8s ease-out ${i * 2.2}s infinite`,
          }}
        />
      ))}
    </g>
  );
}

function Tree({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 2} y={y - 16} width={4} height={16} fill="#0c0c16" />
      <circle cx={x} cy={y - 24} r={10} fill="#0c0c16" />
    </g>
  );
}

function LampGlow({ cx, cy }: { cx: number; cy: number }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={16}
      fill="url(#lamp-gradient)"
      style={{
        opacity: 'var(--lamp-opacity, 0)',
        animation: 'lamp-flicker 3s ease-in-out infinite',
      }}
    />
  );
}

function Bridge() {
  return (
    <g>
      {/* Bridge deck */}
      <rect x={580} y={290} width={120} height={6} fill="#08080e" rx={2} />
      {/* Arches */}
      {[600, 635, 670].map((ax) => (
        <path
          key={ax}
          d={`M${ax} 296 Q${ax + 15} 320 ${ax + 30} 296`}
          fill="none"
          stroke="#08080e"
          strokeWidth="3"
        />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Houses data                                                        */
/* ------------------------------------------------------------------ */

const HOUSES = [
  { x: 120, w: 36, h: 44, roofH: 18 },
  { x: 170, w: 30, h: 36, roofH: 14 },
  { x: 220, w: 42, h: 52, roofH: 20 },
  { x: 290, w: 32, h: 38, roofH: 16 },
  { x: 340, w: 38, h: 48, roofH: 18 },
  { x: 400, w: 28, h: 32, roofH: 14 },
];

const TREES = [
  { x: 80, y: 300 },
  { x: 102, y: 300 },
  { x: 450, y: 300 },
  { x: 478, y: 300 },
  { x: 540, y: 300 },
  { x: 560, y: 300 },
  { x: 720, y: 300 },
  { x: 748, y: 300 },
];

const LAMPS = [
  { cx: 160, cy: 275 },
  { cx: 260, cy: 265 },
  { cx: 370, cy: 270 },
  { cx: 500, cy: 280 },
  { cx: 640, cy: 280 },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function Village() {
  const { lamp, weather } = useVista();
  const showSmoke = lamp > 0.5;

  const windmillSpeed = useMemo(() => {
    switch (weather) {
      case 'storm': return 8;
      case 'fog': return 14;
      default: return 10;
    }
  }, [weather]);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '30%',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <svg
        viewBox="0 0 800 340"
        preserveAspectRatio="xMidYMax meet"
        style={{ width: '100%', maxWidth: 1200, height: '100%' }}
      >
        <defs>
          <radialGradient id="lamp-gradient">
            <stop offset="0%" stopColor="var(--lamp, #f5c842)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Lamp glows (behind everything) */}
        {LAMPS.map((l, i) => (
          <LampGlow key={i} cx={l.cx} cy={l.cy} />
        ))}

        {/* Trees */}
        {TREES.map((t, i) => (
          <Tree key={i} x={t.x} y={t.y} />
        ))}

        {/* Houses with smoke */}
        {HOUSES.map((h, i) => (
          <g key={i}>
            <House {...h} />
            <SmokeWisps
              cx={h.x + h.w * 0.7 + 3}
              baseY={300 - h.h - h.roofH + 2}
              show={showSmoke}
            />
          </g>
        ))}

        {/* Windmill */}
        <g transform="translate(510, 250)">
          {/* Tower */}
          <polygon points="-8,0 8,0 5,-50 -5,-50" fill="#08080e" />
          {/* Blades (4 rectangular in + shape) */}
          <g
            style={{
              transformOrigin: '0px -50px',
              animation: `windmill-spin ${windmillSpeed}s linear infinite`,
            }}
          >
            <rect x={-3} y={-90} width={6} height={40} rx={2} fill="#08080e" />
            <rect x={-3} y={-50} width={6} height={40} rx={2} fill="#08080e" />
            <rect x={-40} y={-53} width={40} height={6} rx={2} fill="#08080e" />
            <rect x={0} y={-53} width={40} height={6} rx={2} fill="#08080e" />
          </g>
          {/* Hub */}
          <circle cx={0} cy={-50} r={4} fill="#0c0c16" />
        </g>

        {/* Bridge */}
        <Bridge />

        {/* Ground line */}
        <rect x={0} y={300} width={800} height={40} fill="#12121e" />
      </svg>

      <style>{`
        @keyframes smoke-rise {
          0%   { transform: translateY(0) scale(1); opacity: 0.5; }
          50%  { opacity: 0.3; }
          100% { transform: translateY(-28px) scale(1.8); opacity: 0; }
        }

        @keyframes windmill-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes lamp-flicker {
          0%, 100% { filter: brightness(1); }
          30%      { filter: brightness(1.15); }
          50%      { filter: brightness(0.9); }
          70%      { filter: brightness(1.1); }
        }

        @media (prefers-reduced-motion: reduce) {
          svg * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
