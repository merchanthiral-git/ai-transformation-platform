export default function StatRow({ stats }: { stats: { value: string; label?: string }[] }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap", marginTop: 48 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#F97316" }}>{s.value}</div>
          {s.label && <div style={{ fontSize: 13, color: "rgba(247,245,240,0.35)", marginTop: 4 }}>{s.label}</div>}
        </div>
      ))}
    </div>
  );
}
