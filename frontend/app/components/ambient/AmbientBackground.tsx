'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';

/* ── Star data ────────────────────────────────────────── */
interface Star { x: number; y: number; size: number; dur: number; delay: number; }

function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      dur: Math.random() * 3 + 3,
      delay: Math.random() * 6,
    });
  }
  return stars;
}

/* ── Grain SVG data URI ──────────────────────────────── */
const GRAIN_SVG = `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="300" height="300" filter="url(#n)" opacity="0.5"/></svg>') : ''}`;

/* ── Component ───────────────────────────────────────── */
export default function AmbientBackground() {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const spotPos = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);

  const stars = useMemo(() => generateStars(80), []);

  const animate = useCallback(() => {
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    // Spotlight follows cursor with heavy lag (0.04 lerp)
    spotPos.current.x += (mx - spotPos.current.x) * 0.04;
    spotPos.current.y += (my - spotPos.current.y) * 0.04;

    if (spotlightRef.current) {
      spotlightRef.current.style.transform =
        `translate(${spotPos.current.x * 100}vw, ${spotPos.current.y * 100}vh) translate(-50%, -50%)`;
    }

    // Aurora parallax — each blob shifts slightly by mouse
    if (auroraRef.current) {
      const children = auroraRef.current.children as HTMLCollectionOf<HTMLElement>;
      for (let i = 0; i < children.length; i++) {
        const factor = (i + 1) * 12;
        const dx = (mx - 0.5) * factor;
        const dy = (my - 0.5) * factor;
        children[i].style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
      {/* Layer 0 — Aurora blobs */}
      <div ref={auroraRef} className="aurora-layer absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* Layer 1 — Starfield */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        {stars.map((s, i) => (
          <div
            key={i}
            className="star-dot"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Layer 2 — Grid */}
      <div className="ambient-grid absolute inset-0" style={{ zIndex: 2 }} />

      {/* Layer 3 — Spotlight */}
      <div
        ref={spotlightRef}
        className="ambient-spotlight"
        style={{ zIndex: 3, willChange: 'transform' }}
      />

      {/* Layer 4 — Grain */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 4,
          backgroundImage: `url("${GRAIN_SVG}")`,
          backgroundRepeat: 'repeat',
          opacity: 0.05,
          mixBlendMode: 'overlay',
        }}
      />

      <style jsx>{`
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          will-change: transform;
        }
        .aurora-blob-1 {
          width: 900px; height: 900px;
          top: -20%; left: -10%;
          background: radial-gradient(circle, rgba(34,130,255,0.15), transparent 70%);
          animation: drift1 22s ease-in-out infinite alternate;
        }
        .aurora-blob-2 {
          width: 800px; height: 800px;
          top: 30%; right: -15%;
          background: radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%);
          animation: drift2 28s ease-in-out infinite alternate;
        }
        .aurora-blob-3 {
          width: 700px; height: 700px;
          bottom: -15%; left: 30%;
          background: radial-gradient(circle, rgba(34,211,238,0.10), transparent 70%);
          animation: drift3 34s ease-in-out infinite alternate;
        }
        @keyframes drift1 { from { transform: translate(0,0); } to { transform: translate(40px, 30px); } }
        @keyframes drift2 { from { transform: translate(0,0); } to { transform: translate(-30px, 40px); } }
        @keyframes drift3 { from { transform: translate(0,0); } to { transform: translate(30px, -20px); } }

        .star-dot {
          position: absolute;
          background: #fff;
          border-radius: 50%;
          animation: twinkle 4s ease-in-out infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }

        .ambient-grid {
          background-image:
            linear-gradient(rgba(130,180,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(130,180,255,0.04) 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent);
          -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent);
        }

        .ambient-spotlight {
          position: fixed;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%);
          mix-blend-mode: screen;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .aurora-blob { animation: none !important; }
          .star-dot { animation: none !important; opacity: 0.4; }
          .ambient-spotlight { display: none; }
        }
      `}</style>
    </div>
  );
}
