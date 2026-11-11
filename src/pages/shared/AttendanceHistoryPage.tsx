import { useEffect, useMemo, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { CalendarPicker, Button } from "../../components/common/UI"
import { AbsensiRow, apiAbsensi, apiKasir } from "../../api"
import { AbsensiStatus } from "../../types"

function todayDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function statusChipClass(status: string): string {
  const s = status.toLowerCase()
  if (s === "hadir") return "chip active"
  if (s === "izin") return "chip izin"
  if (s === "sakit") return "chip sakit"
  if (s === "cuti") return "chip cuti"
  if (s === "tidak hadir") return "chip tidak-hadir"
  return "chip manual"
}

interface KapsterInfo {
  id: string
  nama: string
}

interface DisplayRow {
  id: string
  userId: string
  nama: string
  tanggal: string
  jam: string
  waktu: string
  status: AbsensiStatus
  fotoUrl?: string
  catatan?: string
  fullCatatan?: string
  fromRecord: boolean
}

/* ── Modal Detail Absensi ── */

function DetailModal({ row, onClose }: { row: DisplayRow; onClose: () => void }) {
  const koreksiList = (row.fullCatatan || "")
    .split(" | ")
    .filter((s) => s.startsWith("Koreksi:"))

  return (
    <div className="modal-overlay">
      <section className="simple-modal">
        <header>
          <h2>Detail Absensi</h2>
          <Button onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>

        {row.fotoUrl && (
          <div style={{ padding: "16px 18px 0", display: "flex", justifyContent: "center" }}>
            <img
              src={row.fotoUrl}
              alt={`Foto absensi ${row.nama}`}
              style={{
                width: "100%",
                maxWidth: 280,
                borderRadius: 12,
                objectFit: "cover",
              }}
            />
          </div>
        )}

        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <small style={{ color: "var(--muted)", fontSize: 11 }}>Nama</small>
              <div style={{ fontWeight: 600 }}>{row.nama}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <small style={{ color: "var(--muted)", fontSize: 11 }}>Tanggal</small>
                <div>{row.tanggal}</div>
              </div>
              <div>
                <small style={{ color: "var(--muted)", fontSize: 11 }}>Jam</small>
                <div>{row.jam || "-"}</div>
              </div>
            </div>
            <div>
              <small style={{ color: "var(--muted)", fontSize: 11 }}>Status</small>
              <div style={{ marginTop: 4 }}>
                <span className={statusChipClass(row.status)}>{row.status}</span>
              </div>
            </div>
            {koreksiList.length > 0 && (
              <div>
                <small style={{ color: "var(--muted)", fontSize: 11 }}>Riwayat Koreksi</small>
                <div style={{ marginTop: 4, display: "grid", gap: 4 }}>
                  {koreksiList.map((k, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "var(--bone)",
                        fontSize: 12,
                      }}
                    >
                      {k.replace("Koreksi: ", "")}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {row.fullCatatan &&
              !row.fullCatatan.split(" | ").every((s) => s.startsWith("Koreksi:")) && (
                <div>
                  <small style={{ color: "var(--muted)", fontSize: 11 }}>Catatan</small>
                  <div style={{ fontSize: 13 }}>
                    {row.fullCatatan
                      .split(" | ")
                      .filter((s) => !s.startsWith("Koreksi:"))
                      .join(" · ")}
                  </div>
                </div>
              )}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ── Modal Koreksi Absensi ── */

function KoreksiModal({
  row,
  onClose,
  onSuccess,
}: {
  row: DisplayRow
  onClose: () => void
  onSuccess: () => void
}) {
  const statusBaru = row.status === "Hadir" ? "Tidak Hadir" : "Hadir"
  const [alasan, setAlasan] = useState("")
  const [customMode, setCustomMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const pilihanAlasan = [
    "Salah pencet",
    "Lupa absen",
    "Izin mendadak",
    "Kesalahan data",
    "Permintaan atasan",
  ]

  return (
    <div className="modal-overlay">
      <section className="simple-modal">
        <header>
          <h2>Koreksi Absensi</h2>
          <Button onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>
        <label>
          <span>Nama</span>
          <input value={row.nama} disabled style={{ background: "var(--bone)", color: "var(--slate)" }} />
        </label>
        <label>
          <span>Status saat ini</span>
          <input value={row.status} disabled style={{ background: "var(--bone)", color: "var(--slate)" }} />
        </label>
        <label>
          <span>Status baru</span>
          <input value={statusBaru} disabled style={{ background: "var(--bone)", color: "var(--slate)" }} />
        </label>
        <label>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              Alasan koreksi <span style={{ color: "#b91c1c" }}>*</span>
            </span>
            <span
              onClick={() => {
                setCustomMode(!customMode)
                setAlasan("")
              }}
              style={{
                color: "var(--brass)",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {customMode ? "Pilih alasan" : "Alasan lainnya"}
            </span>
          </span>
        </label>
        {customMode ? (
          <label style={{ padding: "0 18px 16px" }}>
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Tuliskan alasan koreksi..."
            />
          </label>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 18px 16px" }}>
            {pilihanAlasan.map((a) => (
              <button
                key={a}
                onClick={() => setAlasan(alasan === a ? "" : a)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: alasan === a ? "2px solid var(--brass)" : "1.5px solid var(--slate)",
                  background: alasan === a ? "rgba(200,150,62,0.1)" : "var(--paper)",
                  fontWeight: alasan === a ? 700 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        )}
        <footer>
          <Button className="secondary-button" onClick={onClose}>
            Batal
          </Button>
          <Button
            className="primary-button"
            disabled={!alasan.trim() || busy}
            onClick={async () => {
              setError("")
              setBusy(true)
              try {
                await apiAbsensi.koreksi({
                  id: row.id,
                  status: statusBaru,
                  catatan: alasan,
                })
                onSuccess()
              } catch (e) {
                setError(e instanceof Error ? e.message : "Gagal menyimpan koreksi.")
                setBusy(false)
              }
            }}
          >
            {busy ? "Menyimpan..." : "Simpan Koreksi"}
          </Button>
        </footer>
        {error && (
          <div className="info-banner" role="alert">
            <Icon name="alert" />
            {error}
          </div>
        )}
      </section>
    </div>
  )
}

/* ── Halaman Utama ── */

export function AttendanceHistoryPage() {
  const today = todayDate()
  const [tanggal, setTanggal] = useState(today)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<AbsensiStatus | "">("")
  const [filterKapster, setFilterKapster] = useState("")
  const [rows, setRows] = useState<AbsensiRow[]>([])
  const [kapsters, setKapsters] = useState<KapsterInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [koreksiRow, setKoreksiRow] = useState<DisplayRow | null>(null)
  const [detailRow, setDetailRow] = useState<DisplayRow | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    apiKasir
      .kapster()
      .then(setKapsters)
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    apiAbsensi
      .list({ tanggal: tanggal || undefined })
      .then((result) => {
        if (active) setRows(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat riwayat absensi.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tanggal, refreshKey])

  const displayRows: DisplayRow[] = useMemo(() => {
    const latestByPerson = new Map<string, AbsensiRow>()
    for (const row of rows) {
      const keyById = (row.userId || "").trim().toLowerCase()
      const keyByNama = (row.nama || "").trim().toLowerCase()
      if (keyById && latestByPerson.has(keyById)) {
        latestByPerson.set(keyById, row)
      } else if (keyByNama && latestByPerson.has(keyByNama)) {
        latestByPerson.set(keyByNama, row)
      } else {
        const key = keyById || keyByNama
        latestByPerson.set(key, row)
      }
    }

    const recordRows: DisplayRow[] = [...latestByPerson.values()].map((row) => ({
      id: row.id,
      userId: row.userId,
      nama: row.nama,
      tanggal: row.tanggal,
      jam: row.jam || "",
      waktu: row.waktu || `${row.tanggal} ${row.jam || ""}`,
      status: (row.status || row.tipe || "Hadir") as AbsensiStatus,
      fotoUrl: row.fotoUrl,
      catatan: row.catatan
        ? row.catatan.split(" | ").filter(Boolean).pop() || row.catatan
        : undefined,
      fullCatatan: row.catatan || undefined,
      fromRecord: true,
    }))

    const recordedKeys = new Set<string>()
    for (const row of latestByPerson.values()) {
      recordedKeys.add(row.userId.trim().toLowerCase())
      recordedKeys.add(row.nama.trim().toLowerCase())
    }
    const missingRows: DisplayRow[] = kapsters
      .filter((k) => !recordedKeys.has(k.id.trim().toLowerCase()) && !recordedKeys.has(k.nama.trim().toLowerCase()))
      .map((k) => ({
        id: `missing-${k.id}`,
        userId: k.id,
        nama: k.nama,
        tanggal,
        jam: "",
        waktu: "",
        status: "Tidak Hadir" as AbsensiStatus,
        fromRecord: false,
      }))

    return [...recordRows, ...missingRows]
  }, [rows, kapsters, tanggal])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID")
    return displayRows
      .filter((row) => {
        if (filterStatus && row.status !== filterStatus) return false
        if (filterKapster && row.userId !== filterKapster) return false
        if (query) {
          const text = `${row.nama} ${row.status} ${row.catatan ?? ""}`.toLocaleLowerCase("id-ID")
          if (!text.includes(query)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (!a.fromRecord && b.fromRecord) return 1
        if (a.fromRecord && !b.fromRecord) return -1
        return b.waktu.localeCompare(a.waktu)
      })
  }, [displayRows, search, filterStatus, filterKapster])

  const stats = useMemo(() => {
    const counts = { Hadir: 0, "Tidak Hadir": 0 }
    for (const row of displayRows) {
      if (row.status === "Hadir") counts.Hadir++
      else counts["Tidak Hadir"]++
    }
    return counts
  }, [displayRows])

  const statItems: { label: string; status: AbsensiStatus; count: number }[] = [
    { label: "Hadir", status: "Hadir", count: stats.Hadir },
    { label: "Tidak Hadir", status: "Tidak Hadir", count: stats["Tidak Hadir"] },
  ]

  return (
    <div className="mobile-content attendance-history-page">
      <section className="panel" style={{ padding: 18 }}>
        {/* Statistik Harian */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {statItems.map((item) => (
            <button
              key={item.status}
              onClick={() => setFilterStatus(filterStatus === item.status ? "" : item.status)}
              style={{
                flex: "1 1 0",
                minWidth: 60,
                padding: "8px 4px",
                borderRadius: 10,
                border: filterStatus === item.status ? "2px solid var(--brass)" : "1px solid var(--rule)",
                background: filterStatus === item.status ? "rgba(200,150,62,0.08)" : "var(--paper)",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700 }}>{item.count}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{item.label}</div>
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="filters attendance-history-filters" style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <CalendarPicker
            value={tanggal}
            onChange={(value) => value <= today && setTanggal(value)}
            max={today}
            showToday={false}
          />
          <select
            value={filterKapster}
            onChange={(e) => setFilterKapster(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--rule)",
              background: "var(--paper)",
              fontSize: 13,
              minWidth: 140,
            }}
          >
            <option value="">Semua Kapster</option>
            {kapsters.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
          <label className="search" style={{ flex: 1, minWidth: 180 }}>
            <Icon name="search" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama..."
            />
          </label>
        </div>

        {/* Content */}
        {loading ? <p style={{ color: "var(--muted)" }}>Memuat riwayat absensi...</p> : null}
        {error ? (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        ) : null}
        {!loading && !error && filteredRows.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>
            {filterStatus
              ? `Tidak ada data dengan status "${filterStatus}" untuk tanggal ini.`
              : "Tidak ada riwayat absensi untuk filter ini."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filteredRows.map((row) => (
              <article
                key={row.id}
                className="panel"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, cursor: "pointer" }}
                onClick={() => row.fromRecord && setDetailRow(row)}
              >
                {row.fotoUrl ? (
                  <img
                    src={row.fotoUrl}
                    alt={`Foto absensi ${row.nama}`}
                    style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }}
                  />
                ) : (
                  <span className="item-icon">
                    <Icon name="calendar" />
                  </span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block" }}>{row.nama}</strong>
                  <small style={{ color: "var(--muted)" }}>
                    {row.tanggal}
                    {row.jam ? ` · ${row.jam}` : ""}
                    {row.catatan ? ` · ${row.catatan}` : ""}
                  </small>
                </div>
                <span className={statusChipClass(row.status)}>{row.status}</span>
                {row.fromRecord && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setKoreksiRow(row)
                    }}
                    title="Koreksi absensi"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--slate)",
                    }}
                  >
                    <Icon name="pencil" />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {detailRow && <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />}

      {koreksiRow && (
        <KoreksiModal
          row={koreksiRow}
          onClose={() => setKoreksiRow(null)}
          onSuccess={() => {
            setKoreksiRow(null)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}
