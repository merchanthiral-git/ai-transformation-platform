'use client';

import { useEffect, useRef, useState } from 'react';
import { useVista } from '../hooks/useVista';

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface BirdConfig {
  id: number;
  top: number;       // % from top (5-25)
  duration: number;   // fly-across time (15-25s)
  scale: number;      // size variation
  delay: number;      // initial delay
}

function BirdShape({ config }: { config: BirdConfig }) {
  const [active, setActive] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // When animation ends, wait random 20-40s then reappear
    const handleEnd = () => {
      setActive(false);
      timeoutRef.current = setTimeout(() => {
        setActive(true);
      }, randomBetween(20000, 40000));
    };

    if (active) {
      timeoutRef.current = setTimeout(handleEnd, config.duration * 1000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active, config.duration]);

  if (!active) return null;

  return (
    <svg
      className="vista-bird"
      viewBox="0 0 20 10"
      style={{
        position: 'absolute',
        top: `${config.top}%`,
        left: -30,
        width: 20 * config.scale,
        height: 10 * config.scale,
        animationDuration: `${config.duration}s`,
        animationDelay: `${config.delay}s`,
        overflow: 'visible',
      }}
    >
      <path
        className="vista-bird-wing"
        d="M0 8 Q5 0 10 5 Q15 0 20 8"
        fill="none"
        stroke="rgba(40,35,30,0.6)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Birds() {
  const { sun } = useVista();

  const birds = useRef<BirdConfig[]>(
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      top: randomBetween(5, 25),
      duration: randomBetween(15, 25),
      scale: randomBetween(0.8, 1.4),
      delay: randomBetween(0, 10),
    }))
  );

  if (sun <= 0.5) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: Math.min((sun - 0.5) * 4, 1),
        transition: 'opacity 2s ease',
      }}
    >
      {birds.current.map((b) => (
        <BirdShape key={b.id} config={b} />
      ))}

      <style>{`
        .vista-bird {
          animation: vista-bird-fly linear forwards;
          will-change: transform;
        }

        .vista-bird-wing {
          animation: vista-bird-flap 400ms ease-in-out infinite alternate;
          transform-origin: 50% 100%;
        }

        @keyframes vista-bird-fly {
          from { transform: translateX(0); }
          to { transform: translateX(calc(100vw + 60px)); }
        }

        @keyframes vista-bird-flap {
          0% { d: path("M0 8 Q5 0 10 5 Q15 0 20 8"); }
          100% { d: path("M0 5 Q5 3 10 5 Q15 3 20 5"); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vista-bird {
            animation: none !important;
            left: 40% !important;
          }
          .vista-bird-wing {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
