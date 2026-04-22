export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="marketing-root"
      style={{
        background: '#F0EBE1',
        color: '#1C2B3A',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {children}
    </div>
  );
}
