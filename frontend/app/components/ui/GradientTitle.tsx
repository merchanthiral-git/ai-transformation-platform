import type { ReactNode } from 'react';

interface GradientTitleProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
}

export function GradientTitle({ children, as: Tag = 'h1', className = '' }: GradientTitleProps) {
  return (
    <Tag
      className={`font-heading italic ${className}`}
      style={{
        background: 'linear-gradient(120deg, var(--cyan), var(--violet), var(--cyan))',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmerGradient 8s ease-in-out infinite',
      }}
    >
      {children}
      <style>{`
        @keyframes shimmerGradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes shimmerGradient { 0%, 100% { background-position: 0% 50%; } }
        }
      `}</style>
    </Tag>
  );
}
