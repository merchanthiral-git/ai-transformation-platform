'use client';

import { useEffect, useRef, useState } from 'react';
import { useVista } from '../hooks/useVista';

type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'storm';

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function Raindrops({ count }: { count: number }) {
  const drops = useRef(
    Array.from({ length: count }, () => ({
      left: `${Math.random() * 100}%`,
      height: randomBetween(15, 25),
      duration: randomBetween(0.4, 0.8),
      delay: randomBetween(0, 2),
    }))
  );

  return (
    <>
      {drops.current.map((d, i) => (
        <div
          key={i}
          className="vista-raindrop"
          style={{
            position: 'absolute',
            left: d.left,
            top: -30,
            width: 1,
            height: d.height,
            background: 'rgba(255,255,255,0.3)',
            transform: 'rotate(15deg)',
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function Snowflakes() {
  const flakes = useRef(
    Array.from({ length: 60 }, () => ({
      left: `${Math.random() * 100}%`,
      size: randomBetween(3, 6),
      opacity: randomBetween(0.4, 0.7),
      duration: randomBetween(8, 16),
      delay: randomBetween(0, 8),
      driftX: randomBetween(-30, 30),
    }))
  );

  return (
    <>
      {flakes.current.map((f, i) => (
        <div
          key={i}
          className="vista-snowflake"
          style={{
            position: 'absolute',
            left: f.left,
            top: -10,
            width: f.size,
            height: f.size,
            borderRadius: '50%',
            background: 'white',
            opacity: f.opacity,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            '--drift-x': `${f.driftX}px`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function FogClouds() {
  const clouds = useRef(
    Array.from({ length: 3 }, (_, i) => ({
      width: randomBetween(40, 60),
      top: randomBetween(10, 60),
      left: randomBetween(-10, 60),
      opacity: randomBetween(0.08, 0.15),
      delay: i * 2,
    }))
  );

  return (
    <>
      {clouds.current.map((c, i) => (
        <div
          key={i}
          className="vista-fog-cloud"
          style={{
            position: 'absolute',
            top: `${c.top}%`,
            left: `${c.left}%`,
            width: `${c.width}vw`,
            height: `${c.width * 0.5}vw`,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.9), transparent 70%)',
            opacity: c.opacity,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function Lightning() {
  const [flashOpacity, setFlashOpacity] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.4) {
        // Stutter flash pattern: 0 -> 0.6 -> 0.1 -> 0.8 -> 0 over 400ms
        setFlashOpacity(0.6);
        setTimeout(() => setFlashOpacity(0.1), 100);
        setTimeout(() => setFlashOpacity(0.8), 200);
        setTimeout(() => setFlashOpacity(0), 400);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'white',
        mixBlendMode: 'screen',
        opacity: flashOpacity,
        pointerEvents: 'none',
        transition: 'opacity 50ms linear',
      }}
    />
  );
}

export default function Weather() {
  const { weather } = useVista();
  const [visible, setVisible] = useState<WeatherType>(weather);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    // Fade in when weather changes
    setEntering(true);
    const timeout = setTimeout(() => {
      setVisible(weather);
      setEntering(false);
    }, 50);
    return () => clearTimeout(timeout);
  }, [weather]);

  const isActive = (type: WeatherType) => visible === type || visible === 'storm' && type === 'rain';

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Rain layer */}
      <div
        className="vista-weather-layer vista-weather-reduced-rain"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: visible === 'rain' || visible === 'storm' ? 1 : 0,
          transition: 'opacity 2s ease',
        }}
      >
        <Raindrops count={80} />
      </div>

      {/* Snow layer */}
      <div
        className="vista-weather-layer vista-weather-reduced-snow"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: visible === 'snow' ? 1 : 0,
          transition: 'opacity 2s ease',
        }}
      >
        <Snowflakes />
      </div>

      {/* Fog layer */}
      <div
        className="vista-weather-layer vista-weather-reduced-fog"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: visible === 'fog' ? 1 : 0,
          transition: 'opacity 2s ease',
        }}
      >
        <FogClouds />
      </div>

      {/* Storm lightning */}
      {visible === 'storm' && <Lightning />}

      <style>{`
        .vista-raindrop {
          animation: vista-rain-fall linear infinite;
        }

        .vista-snowflake {
          animation: vista-snow-fall linear infinite;
        }

        .vista-fog-cloud {
          animation: vista-fog-drift 12s ease-in-out infinite alternate;
        }

        @keyframes vista-rain-fall {
          from { transform: rotate(15deg) translateY(0); }
          to { transform: rotate(15deg) translateY(110vh); }
        }

        @keyframes vista-snow-fall {
          0% { transform: translate(0, 0); }
          50% { transform: translate(var(--drift-x, 0px), 55vh); }
          100% { transform: translate(0, 110vh); }
        }

        @keyframes vista-fog-drift {
          from { transform: translateX(0); }
          to { transform: translateX(5vw); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vista-raindrop,
          .vista-snowflake,
          .vista-fog-cloud {
            animation: none !important;
          }

          /* Static overlay tints for reduced motion */
          .vista-weather-reduced-rain {
            background: rgba(100, 120, 180, 0.08);
          }
          .vista-weather-reduced-snow {
            background: rgba(255, 255, 255, 0.06);
          }
          .vista-weather-reduced-fog {
            background: rgba(255, 255, 255, 0.1);
          }

          .vista-weather-reduced-rain .vista-raindrop,
          .vista-weather-reduced-snow .vista-snowflake,
          .vista-weather-reduced-fog .vista-fog-cloud {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
