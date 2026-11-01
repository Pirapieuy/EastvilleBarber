import { rupiah } from "./UI"

/** Diagram batang sederhana (tinggi relatif terhadap nilai terbesar). */
export function BarChart({
  data,
  height = 140,
}: {
  data: { label: string; value: number }[]
  height?: number
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (!data.length) {
    return <p style={{ color: "var(--slate)", fontSize: 12 }}>Belum ada pemasukan pada periode ini.</p>
  }
  return (
    <div style={{ alignItems: "flex-end", display: "flex", gap: 4, height }}>
      {data.map((d) => (
        <div
          key={d.label}
          style={{ alignItems: "center", display: "flex", flex: 1, flexDirection: "column", gap: 4, height: "100%", justifyContent: "flex-end", minWidth: 0 }}
          title={`${d.label}: ${rupiah(d.value)}`}
        >
          <div
            style={{
              background: "var(--brass)",
              borderRadius: "4px 4px 0 0",
              height: `${Math.max(3, (d.value / max) * 100)}%`,
              width: "100%",
            }}
          />
          <small style={{ color: "var(--slate)", fontSize: 10 }}>{d.label}</small>
        </div>
      ))}
    </div>
  )
}
