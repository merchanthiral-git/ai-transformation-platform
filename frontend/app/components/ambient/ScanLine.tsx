'use client';

export default function ScanLine() {
  return (
    <>
      <div aria-hidden="true" className="scan-line" />
      <style jsx>{`
        .scan-line {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, var(--cyan) 30%, var(--cyan) 70%, transparent 100%);
          opacity: 0.15;
          z-index: 99990;
          pointer-events: none;
          animation: scanSweep 8s linear infinite;
        }
        @keyframes scanSweep {
          0%   { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }
        @media (prefers-reduced-motion: reduce) {
          .scan-line { animation: none !important; display: none; }
        }
      `}</style>
    </>
  );
}
