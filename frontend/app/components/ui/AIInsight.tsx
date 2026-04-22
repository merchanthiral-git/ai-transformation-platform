import type { ReactNode } from 'react';

interface AIInsightProps {
  children: ReactNode;
  className?: string;
}

export function AIInsight({ children, className = '' }: AIInsightProps) {
  return (
    <div
      className={`relative rounded-2xl p-5 overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(244,168,58,0.06), rgba(167,139,184,0.06))',
        border: '1px solid var(--border)',
      }}
    >
      {/* Animated border shimmer */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          padding: 1,
          background: 'linear-gradient(120deg, transparent 30%, var(--amber-glow) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'insightBorderShimmer 4s ease-in-out infinite',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude' as const,
        }}
      />
      <div className="relative z-10">{children}</div>
      <style>{`
        @keyframes insightBorderShimmer {
          0%, 100% { background-position: -200% 0; }
          50% { background-position: 200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes insightBorderShimmer { 0%, 100% { background-position: 0% 0; } }
        }
      `}</style>
    </div>
  );
}
