import type { ReactNode } from 'react';

interface InspectorProps {
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string | number }[];
  tags?: string[];
  insight?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Inspector({ title, subtitle, stats, tags, insight, children, className = '' }: InspectorProps) {
  return (
    <div
      className={`flex flex-col gap-4 p-5 rounded-2xl ${className}`}
      style={{
        background: 'var(--paper)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border)',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}
    >
      {/* Hero block */}
      <div>
        <h3 className="font-heading italic text-xl" style={{ color: 'var(--ink)' }}>{title}</h3>
        {subtitle && (
          <div className="font-jetbrains text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>{subtitle}</div>
        )}
      </div>

      {/* Stats grid */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s, i) => (
            <div
              key={i}
              className="rounded-lg p-3"
              style={{ background: 'rgba(244,235,217,0.03)', border: '1px solid var(--border)' }}
            >
              <div className="font-jetbrains text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-faint)' }}>
                {s.label}
              </div>
              <div className="font-heading italic text-lg mt-0.5" style={{ color: 'var(--ink)' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skill tags */}
      {tags && tags.length > 0 && (
        <div>
          <div className="font-jetbrains text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--ink-faint)' }}>
            Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-xs"
                style={{
                  background: 'rgba(244,168,58,0.08)',
                  border: '1px solid rgba(244,168,58,0.15)',
                  color: 'var(--amber)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Insight section */}
      {insight && (
        <div
          className="rounded-xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(244,168,58,0.04), rgba(167,139,184,0.04))',
            border: '1px solid rgba(244,168,58,0.1)',
          }}
        >
          <div className="font-jetbrains text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--amber)' }}>
            AI Insight
          </div>
          <div className="text-sm" style={{ color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            {insight}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
