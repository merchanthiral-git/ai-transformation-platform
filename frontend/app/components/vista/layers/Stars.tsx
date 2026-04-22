'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVista } from '../hooks/useVista';

interface Star {
  id: number;
  x: number;   // 0-100 %
  y: number;   // 0-60 %
  size: number; // 0.5-2 px
  duration: number; // 3-6 s
  delay: number;    // 0-6 s
}

interface ShootingStar {
  id: number;
  x: number;
  y: number;
  width: number;
  ts: number;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function Stars() {
  const { hour } = useVista();
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const nextId = useRef(0);

  const stars = useMemo<Star[]>(() => {
    const out: Star[] = [];
    for (let i = 0; i < 120; i++) {
      out.push({
        id: i,
        x: rand(0, 100),
        y: rand(0, 60),
        size: rand(0.5, 2),
        duration: rand(3, 6),
        delay: rand(0, 6),
      });
    }
    return out;
  }, []);

  // Shooting star spawner — 1% chance per second during night hours
  const isNight = hour >= 21 || hour < 5;

  const spawnShootingStar = useCallback(() => {
    const id = nextId.current++;
    setShootingStars(prev => [
      ...prev,
      { id, x: rand(5, 60), y: rand(2, 30), width: rand(60, 100), ts: Date.now() },
    ]);
    // Remove after animation
    setTimeout(() => {
      setShootingStars(prev => prev.filter(s => s.id !== id));
    }, 700);
  }, []);

  useEffect(() => {
    if (!isNight) return;
    // Check for reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.01) {
        spawnShootingStar();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isNight, spawnShootingStar]);

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Static stars */}
      {stars.map(s => (
        <div
          key={s.id}
          className="vista-star"
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: '#fff',
            opacity: 'var(--stars-opacity)',
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* Shooting stars */}
      {shootingStars.map(s => (
        <div
          key={s.id}
          className="vista-shooting-star"
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.width,
            height: 2,
            background: 'linear-gradient(90deg, var(--amber, #f59e0b), transparent)',
            transform: 'rotate(-25deg)',
            borderRadius: 1,
          }}
        />
      ))}

      <style>{`
        @keyframes vista-twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
        @keyframes vista-shoot {
          0% { transform: rotate(-25deg) translateX(0); opacity: 1; }
          100% { transform: rotate(-25deg) translateX(200px); opacity: 0; }
        }
        .vista-star {
          animation-name: vista-twinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        .vista-shooting-star {
          animation: vista-shoot 600ms linear forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .vista-star {
            animation: none !important;
          }
          .vista-shooting-star {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
