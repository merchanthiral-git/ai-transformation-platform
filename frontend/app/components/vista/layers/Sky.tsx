'use client';

export default function Sky() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(to bottom, var(--sky-top), var(--sky-mid), var(--sky-warm), var(--sky-gold), var(--sky-peach))',
        transition: 'background 2s ease',
      }}
    />
  );
}
