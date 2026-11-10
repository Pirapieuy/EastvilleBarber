import { useEffect, useMemo, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { CalendarPicker, PageTitle } from "../../components/common/UI"
import { AbsensiRow, apiAbsensi } from "../../api"

function todayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function AttendanceHistoryPage() {
  const today = todayDate()
  const [tanggal, setTanggal] = useState(today)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<AbsensiRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    apiAbsensi.list({ tanggal: tanggal || undefined })
      .then((result) => { if (active) setRows(result) })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat riwayat absensi.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [tanggal])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID")
    return [...rows]
      .filter((row) => !query || `${row.nama} ${row.status} ${row.tipe} ${row.catatan ?? ""}`.toLocaleLowerCase("id-ID").includes(query))
      .sort((a, b) => (b.waktu || `${b.tanggal} ${b.jam || ""}`).localeCompare(a.waktu || `${a.tanggal} ${a.jam || ""}`))
  }, [rows, search])

  return (
    <div className="mobile-content attendance-history-page">
      <PageTitle eyebrow="ABSENSI" title="Riwayat Absensi" />
      <section className="panel" style={{ padding: 18 }}>
        <div className="filters attendance-history-filters" style={{ marginBottom: 16 }}>
          <CalendarPicker value={tanggal} onChange={(value) => value <= today && setTanggal(value)} max={today} showToday={false} />
          <label className="search" style={{ flex: 1, minWidth: 220 }}>
            <Icon name="search" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau status absensi..." />
          </label>
        </div>
        {loading ? <p style={{ color: "var(--muted)" }}>Memuat riwayat absensi...</p> : null}
        {error ? <p role="alert" style={{ color: "#b91c1c" }}>{error}</p> : null}
        {!loading && !error && filteredRows.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>Tidak ada riwayat absensi untuk filter ini.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filteredRows.map((row) => (
              <article key={row.id} className="panel" style={{ display: "flex", alignItems: "center", gap: 14, padding: 12 }}>
                {row.fotoUrl ? <img src={row.fotoUrl} alt={`Foto absensi ${row.nama}`} style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} /> : <span className="item-icon"><Icon name="calendar" /></span>}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block" }}>{row.nama}</strong>
                  <small style={{ color: "var(--muted)" }}>{row.tanggal} · {row.jam || "Waktu tidak tersedia"}{row.catatan ? ` · ${row.catatan}` : ""}</small>
                </div>
                <span className="chip active">{row.status || row.tipe || "Tercatat"}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
