'use client';

import { useMemo } from 'react';
import { useVista } from '../hooks/useVista';

interface CloudDef {
  id: number;
  top: string;
  duration: number;
  delay: number;
  scale: number;
  blobs: { cx: number; cy: number; rx: number; ry: number }[];
}

const CLOUD_DEFS: CloudDef[] = [
  {
    id: 1,
    top: '4%',
    duration: 62,
    delay: 0,
    scale: 1,
    blobs: [
      { cx: 0, cy: 0, rx: 50, ry: 28 },
      { cx: 36, cy: -8, rx: 40, ry: 24 },
      { cx: -30, cy: -4, rx: 36, ry: 22 },
    ],
  },
  {
    id: 2,
    top: '12%',
    duration: 48,
    delay: -18,
    scale: 0.8,
    blobs: [
      { cx: 0, cy: 0, rx: 44, ry: 24 },
      { cx: 30, cy: -6, rx: 36, ry: 20 },
    ],
  },
  {
    id: 3,
    top: '22%',
    duration: 74,
    delay: -40,
    scale: 1.2,
    blobs: [
      { cx: 0, cy: 0, rx: 56, ry: 30 },
      { cx: 42, cy: -10, rx: 44, ry: 26 },
      { cx: -36, cy: -6, rx: 38, ry: 22 },
    ],
  },
  {
    id: 4,
    top: '8%',
    duration: 56,
    delay: -30,
    scale: 0.7,
    blobs: [
      { cx: 0, cy: 0, rx: 38, ry: 20 },
      { cx: 26, cy: -6, rx: 32, ry: 18 },
    ],
  },
  {
    id: 5,
    top: '32%',
    duration: 42,
    delay: -10,
    scale: 0.9,
    blobs: [
      { cx: 0, cy: 0, rx: 48, ry: 26 },
      { cx: 34, cy: -8, rx: 40, ry: 22 },
      { cx: -28, cy: -4, rx: 34, ry: 20 },
    ],
  },
];

function weatherOpacity(weather: string): number {
  switch (weather) {
    case 'rain':
    case 'storm':
      return 0.6;
    case 'fog':
      return 0.3;
    default:
      return 0.4;
  }
}

export default function Clouds() {
  const { weather } = useVista();
  const opacity = weatherOpacity(weather);

  const keyframes = useMemo(
    () =>
      typeof document !== 'undefined' && !document.getElementById('cloud-drift-kf')
        ? (() => {
            const style = document.createElement('style');
            style.id = 'cloud-drift-kf';
            style.textContent = `
              @keyframes cloud-drift {
                from { transform: translateX(-200px); }
                to   { transform: translateX(calc(100vw + 200px)); }
              }
            `;
            document.head.appendChild(style);
            return true;
          })()
        : true,
    [],
  );
  void keyframes;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {CLOUD_DEFS.map((cloud) => (
        <div
          key={cloud.id}
          style={{
            position: 'absolute',
            top: cloud.top,
            left: 0,
            animation: `cloud-drift ${cloud.duration}s linear ${cloud.delay}s infinite`,
            willChange: 'transform',
          }}
        >
          <div
            style={{
              position: 'relative',
              transform: `scale(${cloud.scale})`,
            }}
          >
            {cloud.blobs.map((blob, i) => (
              <div
                key={i}
                style={{
                  position: i === 0 ? 'relative' : 'absolute',
                  left: i === 0 ? 0 : `calc(50% + ${blob.cx - blob.rx}px)`,
                  top: i === 0 ? 0 : `calc(50% + ${blob.cy - blob.ry}px)`,
                  width: blob.rx * 2,
                  height: blob.ry * 2,
                  borderRadius: '50%',
                  background: 'var(--sky-haze, rgba(255,255,255,0.35))',
                  opacity,
                  transition: 'opacity 2s ease',
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Reduced motion: freeze animations */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [aria-hidden] > div {
            animation-play-state: paused !important;
          }
        }
      `}</style>
    </div>
  );
}
