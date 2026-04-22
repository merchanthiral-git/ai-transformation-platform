'use client';

import { useVista } from './hooks/useVista';
import type { Speed } from './engine/timeEngine';

const WEATHER_EMOJI: Record<string, string> = {
  clear: '☀️', rain: '🌧️', snow: '❄️', fog: '🌫️', storm: '⛈️',
};

export default function VistaHud() {
  const { hour, speed, weather, phaseName, sun, moon, setSpeed, toggleWeather } = useVista();

  const hh = Math.floor(hour);
  const mm = Math.floor((hour - hh) * 60);
  const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const celestialIcon = sun > 0.3 ? '☀' : moon > 0.3 ? '☾' : '✦';

  const speeds: Speed[] = [1, 60, 600];

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-full pointer-events-auto"
      style={{
        background: 'var(--paper)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--ink-soft)',
      }}
    >
      <span style={{ fontSize: 14 }}>{celestialIcon}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{timeStr}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {phaseName}
      </span>

      {weather !== 'clear' && (
        <>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ fontSize: 10, textTransform: 'uppercase' }}>{weather}</span>
        </>
      )}

      <span style={{ opacity: 0.2 }}>│</span>

      {speeds.map(s => (
        <button
          key={s}
          onClick={() => setSpeed(s)}
          className="px-1.5 py-0.5 rounded transition-all"
          style={{
            background: speed === s ? 'rgba(244,168,58,0.15)' : 'transparent',
            color: speed === s ? 'var(--amber)' : 'var(--ink-faint)',
            border: speed === s ? '1px solid rgba(244,168,58,0.3)' : '1px solid transparent',
            fontSize: 10,
            fontWeight: speed === s ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {s}×
        </button>
      ))}

      <button
        onClick={toggleWeather}
        className="ml-1 text-sm cursor-pointer"
        style={{ background: 'none', border: 'none', fontSize: 14, lineHeight: 1 }}
        title={`Weather: ${weather}`}
      >
        {WEATHER_EMOJI[weather] || '☀️'}
      </button>
    </div>
  );
}
