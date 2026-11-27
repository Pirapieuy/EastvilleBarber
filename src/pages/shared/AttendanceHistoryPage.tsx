import { useEffect, useMemo, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { CalendarPicker, Button } from "../../components/common/UI"
import { AbsensiRow, apiAbsensi, apiKasir } from "../../api"
import { AbsensiStatus, IconName } from "../../types"
import { SearchSelect } from "../../components/common/SearchSelect"
import { formatTanggal, labelPeriode, rentangPeriode, TANGGAL_MAKS, TANGGAL_MULAI, tanggalIsoLokal, usePeriodeTersimpan } from "../../utils/tanggal"

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
  fromRecord: boolean
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
  const [statusBaru, setStatusBaru] = useState<AbsensiStatus>(row.status)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
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
    <div className="modal-overlay modal-centered" onClick={onClose}>
      <section className="simple-modal attendance-correction-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Koreksi Absensi</h2>
          <button type="button" className="attendance-modal-close" onClick={onClose} aria-label="Tutup koreksi absensi">
            <Icon name="close" />
          </button>
        </header>
        <label>
          <span>Nama</span>
          <input value={row.nama} disabled style={{ background: "var(--bone)", color: "var(--slate)" }} />
        </label>
        <label>
          <span>Status saat ini</span>
          <input value={row.status} disabled style={{ background: "var(--bone)", color: "var(--slate)" }} />
        </label>
        <div className="attendance-correction-field">
          <span>Status baru</span>
          <div className={`attendance-status-dropdown${statusMenuOpen ? " is-open" : ""}`}>
            <button
              type="button"
              className="attendance-status-trigger"
              aria-haspopup="listbox"
              aria-expanded={statusMenuOpen}
              onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            >
              <span>{statusBaru}</span>
              <Icon name="chevron" />
            </button>
            {statusMenuOpen && (
              <div className="attendance-status-menu" role="listbox" aria-label="Pilih status baru">
                {["Hadir", "Tidak Hadir", "Sakit", "Cuti", "Izin"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    role="option"
                    aria-selected={statusBaru === status}
                    className={statusBaru === status ? "selected" : ""}
                    onClick={() => {
                      setStatusBaru(status as AbsensiStatus)
                      setStatusMenuOpen(false)
                    }}
                  >
                    <span>{status}</span>
                    {statusBaru === status ? <Icon name="check" /> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="attendance-correction-field attendance-reason-field">
          <div className="attendance-reason-heading">
            <span>Alasan <span style={{ color: "#b91c1c" }}>*</span></span>
            <button
              type="button"
              className="attendance-reason-toggle"
              aria-pressed={customMode}
              onClick={() => {
                setCustomMode((current) => !current)
                setAlasan("")
              }}
            >
              {customMode ? "Pilih alasan" : "Alasan lainnya"}
            </button>
          </div>
        </div>
        {customMode ? (
          <label className="attendance-custom-reason">
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Tuliskan alasan..."
            />
          </label>
        ) : (
          <div className="attendance-reason-options">
            {pilihanAlasan.map((a) => (
              <button
                key={a}
                type="button"
                className={alasan === a ? "selected" : ""}
                onClick={() => setAlasan(alasan === a ? "" : a)}
              >
                {a}
              </button>
            ))}
          </div>
        )}
        <footer>
          <Button
            className="primary-button attendance-save-button"
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

function AttendanceDetailModal({ row, onClose }: { row: DisplayRow; onClose: () => void }) {
  return (
    <div className="modal-overlay modal-centered" onClick={onClose}>
      <section className="simple-modal attendance-detail-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>Detail Absensi</h2>
          <button type="button" className="attendance-modal-close" onClick={onClose} aria-label="Tutup detail absensi">
            <Icon name="close" />
          </button>
        </header>
        <div className="attendance-detail-content">
          {row.fotoUrl ? (
            <img className="attendance-detail-photo" src={row.fotoUrl} alt={`Foto absensi ${row.nama}`} />
          ) : null}
          <strong className="attendance-detail-name">{row.nama}</strong>
          <dl>
            <div><dt>Tanggal</dt><dd>{formatTanggal(row.tanggal)}</dd></div>
            {row.jam ? <div><dt>Jam</dt><dd>{row.jam}</dd></div> : null}
            <div><dt>Status</dt><dd><span className={statusChipClass(row.status)}>{row.status}</span></dd></div>
            <div><dt>Catatan</dt><dd>{row.catatan?.trim() || "Tidak ada catatan."}</dd></div>
          </dl>
        </div>
      </section>
    </div>
  )
}

/* ── Halaman Utama ── */

export function AttendanceHistoryPage() {
  const today = TANGGAL_MAKS()
  const [{ mode, tanggal }, setMode, setTanggal] = usePeriodeTersimpan("riwayat-absensi")
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
      .list()
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
  }, [refreshKey])

  const periode = useMemo(() => rentangPeriode(mode, tanggal), [mode, tanggal])
  const rowsPeriode = useMemo(
    () => rows.filter((row) => row.tanggal >= periode.dari && row.tanggal <= periode.sampai),
    [rows, periode],
  )

  const displayRows: DisplayRow[] = useMemo(() => {
    const latestByPerson = new Map<string, AbsensiRow>()
    const latestByPersonPerDay = new Map<string, AbsensiRow>()
    const terbaruDulu = [...rowsPeriode].sort((a, b) => {
      const waktuA = a.waktu || `${a.tanggal} ${a.jam || ""}`
      const waktuB = b.waktu || `${b.tanggal} ${b.jam || ""}`
      return waktuB.localeCompare(waktuA)
    })
    for (const row of terbaruDulu) {
      const keyById = (row.userId || "").trim().toLowerCase()
      const keyByNama = (row.nama || "").trim().toLowerCase()
      const key = keyById || keyByNama
      if (key && !latestByPerson.has(key)) latestByPerson.set(key, row)
      const dayKey = `${row.tanggal}:${key}`
      if (key && !latestByPersonPerDay.has(dayKey)) latestByPersonPerDay.set(dayKey, row)
    }

    const selectedRecords = mode === "Harian"
      ? [...latestByPerson.values()]
      : [...latestByPersonPerDay.values()]
    const recordRows: DisplayRow[] = selectedRecords.map((row) => ({
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
      fromRecord: true,
    }))

    const recordedByDay = new Map<string, Set<string>>()
    for (const row of rowsPeriode) {
      const keys = recordedByDay.get(row.tanggal) ?? new Set<string>()
      if (row.userId.trim()) keys.add(row.userId.trim().toLowerCase())
      if (row.nama.trim()) keys.add(row.nama.trim().toLowerCase())
      recordedByDay.set(row.tanggal, keys)
    }

    const missingRows: DisplayRow[] = []
    const mulai = new Date(`${periode.dari}T12:00:00`)
    const akhirPeriode = new Date(`${periode.sampai}T12:00:00`)
    const hariIni = new Date(`${today}T12:00:00`)
    const akhir = akhirPeriode > hariIni ? hariIni : akhirPeriode
    for (const hari = new Date(mulai); hari <= akhir; hari.setDate(hari.getDate() + 1)) {
      const tanggalHari = tanggalIsoLokal(hari)
      const tercatatHariIni = recordedByDay.get(tanggalHari) ?? new Set<string>()
      for (const kapster of kapsters) {
        const id = kapster.id.trim().toLowerCase()
        const nama = kapster.nama.trim().toLowerCase()
        if (tercatatHariIni.has(id) || tercatatHariIni.has(nama)) continue
        missingRows.push({
          id: `missing-${kapster.id}-${tanggalHari}`,
          userId: kapster.id,
          nama: kapster.nama,
          tanggal: tanggalHari,
          jam: "",
          waktu: "",
          status: "Tidak Hadir" as AbsensiStatus,
          fromRecord: false,
        })
      }
    }

    return [...recordRows, ...missingRows]
  }, [rowsPeriode, kapsters, tanggal, today, periode, mode])

  const filteredRows = useMemo(() => {
    return displayRows
      .filter((row) => {
        if (filterStatus && row.status !== filterStatus) return false
        if (filterKapster && row.userId !== filterKapster) return false
        return true
      })
      .sort((a, b) => {
        const byDate = b.tanggal.localeCompare(a.tanggal)
        if (byDate) return byDate
        if (a.fromRecord !== b.fromRecord) return a.fromRecord ? -1 : 1
        return b.waktu.localeCompare(a.waktu) || a.nama.localeCompare(b.nama)
      })
  }, [displayRows, filterStatus, filterKapster])

  const stats = useMemo(() => {
    const counts = { Hadir: 0, "Tidak Hadir": 0, Sakit: 0, Cuti: 0, Izin: 0 }
    for (const row of displayRows) {
      if (row.status === "Hadir") counts.Hadir++
      else if (row.status === "Sakit") counts.Sakit++
      else if (row.status === "Tidak Hadir") counts["Tidak Hadir"]++
      else if (row.status === "Cuti") counts.Cuti++
      else if (row.status === "Izin") counts.Izin++
    }
    return counts
  }, [displayRows])

  const statItems: {
    label: string
    status: AbsensiStatus
    count: number
    tone: string
    icon: IconName
  }[] = [
    { label: "Hadir", status: "Hadir", count: stats.Hadir, tone: "sage", icon: "check" },
    { label: "Tidak Hadir", status: "Tidak Hadir", count: stats["Tidak Hadir"], tone: "amber", icon: "close" },
    { label: "Sakit", status: "Sakit", count: stats.Sakit, tone: "dark", icon: "alert" },
    { label: "Cuti", status: "Cuti", count: stats.Cuti, tone: "brass", icon: "calendar" },
    { label: "Izin", status: "Izin", count: stats.Izin, tone: "purple", icon: "file" },
  ]

  return (
    <div className="mobile-content attendance-history-page fit-page">
      {/* Ringkasan status untuk periode yang dipilih (memakai pola balok Beranda / od-kpi) */}
      <div className="od-kpis attendance-summary-kpis">
        {statItems.map((item) => {
          const isActive = filterStatus === item.status
          return (
            <button
              key={item.status}
              type="button"
              onClick={() => setFilterStatus(isActive ? "" : item.status)}
              className={`od-kpi${isActive ? " is-active" : ""}`}
              data-status={item.status.toLowerCase().replace(" ", "-")}
              aria-pressed={isActive}
              aria-label={`${item.label} ${item.count} catatan, ${isActive ? "filter aktif, klik untuk lepas filter" : "klik untuk filter"}`}
            >
              <span className="od-kpi-body">
                <span className={`kpi-icon ${item.tone}`}>
                  <Icon name={item.icon} />
                </span>
                <span className="od-kpi-text">
                  <span className="od-kpi-label">{item.label}</span>
                  <strong className="od-kpi-value">{item.count}</strong>
                  <span className="od-kpi-detail">{item.count} catatan</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <section className="panel fit-fill attendance-history-panel" style={{ padding: 0 }}>
        {/* Filter */}
        <div className="filters attendance-history-filters" style={{ marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <CalendarPicker
            value={tanggal}
            label={labelPeriode(mode, tanggal)}
            bulanSaja={mode === "Bulanan"}
            popupHeader={
              <div className="segmented history-periode" role="group" aria-label="Periode absensi">
                {(["Harian", "Mingguan", "Bulanan"] as const).map((period) => (
                  <Button
                    className={mode === period ? "active" : ""}
                    key={period}
                    onClick={() => setMode(period)}
                  >
                    {period}
                  </Button>
                ))}
              </div>
            }
            onChange={(value) => value <= today && setTanggal(value)}
            min={TANGGAL_MULAI}
            max={today}
            showToday={false}
          />
          <SearchSelect
            value={filterKapster}
            onChange={(e) => setFilterKapster(e.target.value)}
          >
            <option value="">Semua Kapster</option>
            {kapsters.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </SearchSelect>
        </div>

        {/* Content */}
        {loading ? <p className="attendance-state-message" role="status">Memuat riwayat absensi...</p> : null}
        {error ? (
          <p className="attendance-state-message" role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        ) : null}
        {!loading && !error && filteredRows.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>
            {filterStatus
              ? `Tidak ada data dengan status "${filterStatus}" untuk periode ini.`
              : "Tidak ada riwayat absensi untuk filter ini."}
          </div>
        ) : (
          <div className="attendance-record-list">
            {filteredRows.map((row) => (
              <article
                key={row.id}
                className="panel attendance-record-card"
                data-status={row.status.toLowerCase().replace(" ", "-")}
                style={{ display: "flex", alignItems: "center" }}
                onClick={(event) => {
                  if (!(event.target as HTMLElement).closest("button")) {
                    setDetailRow(row)
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault()
                    setDetailRow(row)
                  }
                }}
                tabIndex={0}
                role="group"
                aria-label={`Lihat detail absensi ${row.nama}`}
              >
                {row.fotoUrl ? (
                  <img
                    src={row.fotoUrl}
                    alt={`Foto absensi ${row.nama}`}
                    className="attendance-record-photo"
                  />
                ) : (
                  <span className="item-icon attendance-record-icon">
                    <Icon name="calendar" />
                  </span>
                )}
                <div className="attendance-record-person" style={{ minWidth: 0, flex: 1 }}>
                  <strong>{row.nama}</strong>
                  <small className="attendance-record-date">
                    {formatTanggal(row.tanggal)}
                    {row.jam ? ` · ${row.jam}` : ""}
                    {row.catatan ? ` · ${row.catatan}` : ""}
                  </small>
                </div>
                <div className="attendance-record-actions">
                  <span className={statusChipClass(row.status)}>{row.status}</span>
                  {row.fromRecord && (
                    <Button
                      onClick={() => setKoreksiRow(row)}
                      title="Ubah absensi"
                      className="secondary-button attendance-edit-button"
                    >
                      <Icon name="pencil" /> Ubah
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
      {detailRow && <AttendanceDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  )
}
