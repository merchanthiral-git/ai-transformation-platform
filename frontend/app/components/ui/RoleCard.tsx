'use client';

import { useRef, useCallback, type ReactNode } from 'react';

interface RoleCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function RoleCard({ children, className = '', onClick }: RoleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    card.style.transform = `perspective(800px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) scale(1.02)`;
    // Light sweep position
    card.style.setProperty('--light-x', `${(e.clientX - rect.left) / rect.width * 100}%`);
  }, []);

  const handleLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
  }, []);

  return (
    <div
      ref={cardRef}
      className={`role-card relative rounded-2xl overflow-hidden ${className}`}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        background: 'var(--paper)',
        backdropFilter: 'blur(24px)',
        border: '1px solid var(--border)',
        transition: 'transform 0.3s var(--ease-spring), box-shadow 0.3s ease, border-color 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Top-edge light sweep */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--amber-glow), transparent)',
          backgroundPosition: 'var(--light-x, 50%) 0',
          backgroundSize: '200% 100%',
          opacity: 0,
          transition: 'opacity 0.3s ease',
        }}
      />
      {/* Inset glow on hover */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 transition-opacity duration-300"
        style={{
          boxShadow: 'inset 0 0 40px rgba(244,168,58,0.05)',
        }}
      />
      <div className="relative z-10 p-5">{children}</div>

      <style>{`
        .role-card:hover { border-color: var(--border-hot); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .role-card:hover > div:first-child { opacity: 1; }
        .role-card:hover > div:nth-child(2) { opacity: 1; }
      `}</style>
    </div>
  );
}
