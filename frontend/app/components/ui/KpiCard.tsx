'use client';

import { AnimatedNumber } from './AnimatedNumber';

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  delta?: number;
  decimals?: number;
  sparkline?: number[];
  className?: string;
}

export function KpiCard({
  label,
  value,
  suffix = '',
  prefix = '',
  delta,
  decimals = 0,
  sparkline,
  className = '',
}: KpiCardProps) {
  const maxSpark = sparkline ? Math.max(...sparkline, 1) : 1;

  return (
    <div
      className={`kpi-glass group relative overflow-hidden ${className}`}
      style={{ animation: 'fadeIn 0.6s ease-out both' }}
    >
      {/* Label */}
      <div
        className="font-jetbrains uppercase tracking-wider mb-2"
        style={{ fontSize: 11, color: 'var(--ink-soft)' }}
      >
        {label}
      </div>

      {/* Value */}
      <div className="font-heading italic" style={{ fontSize: 48, lineHeight: 1.1, color: 'var(--ink)' }}>
        <AnimatedNumber value={value} suffix={suffix} prefix={prefix} decimals={decimals} />
      </div>

      {/* Delta */}
      {delta !== undefined && (
        <div
          className="mt-2 font-jetbrains text-xs"
          style={{
            color: delta > 0 ? 'var(--sage)' : delta < 0 ? 'var(--coral)' : 'var(--ink-soft)',
          }}
        >
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta)}%
        </div>
      )}

      {/* Sparkline bars */}
      {sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-[2px] mt-3 h-6">
          {sparkline.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${(v / maxSpark) * 100}%`,
                minHeight: 2,
                background: `linear-gradient(to top, var(--amber), var(--coral))`,
                opacity: 0.5 + (i / sparkline.length) * 0.5,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
