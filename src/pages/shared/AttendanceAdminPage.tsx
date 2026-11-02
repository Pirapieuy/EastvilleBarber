import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle } from "../../components/common/UI"
import { AppUser, Role } from "../../types"
import { apiAbsensi, apiKasir, getToken, AbsensiRow } from "../../api"

export function AttendanceAdminPage({
  currentUser,
  role,
  title,
}: {
  currentUser?: AppUser
  role?: Role
  title?: string
} = {}) {
  const [tab, setTab] = useState<"Jadwal" | "Riwayat" | "Koreksi">("Riwayat")
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const isManager = (role ?? currentUser?.role) === "Manajer"
  const pageTitle = title ?? (isManager ? "Absensi Tim" : "Absensi Admin")

  const today = new Date().toISOString().slice(0, 10)
  const [filterTanggal, setFilterTanggal] = useState(today)
  const [filterKapster, setFilterKapster] = useState("Semua")
  const [kapsters, setKapsters] = useState<{ id: string; nama: string }[]>([])
  const [list, setList] = useState<AbsensiRow[]>([
    {
      id: "a-01",
      waktu: new Date().toISOString(),
      tanggal: today,
      jam: "09.54",
      userId: "u-kapster",
      nama: "Budi Santoso",
      role: "Kapster",
      tipe: "Masuk",
      status: "Tepat waktu",
    },
    {
      id: "a-02",
      waktu: new Date().toISOString(),
      tanggal: today,
      jam: "08.07",
      userId: "u-kapster2",
      nama: "Zhefitra Ananda",
      role: "Kapster",
      tipe: "Masuk",
      status: "Hadir",
    },
  ])
  const [loading, setLoading] = useState(false)

  async function loadData() {
    if (!getToken()) return
    setLoading(true)
    try {
      const [kaps, abs] = await Promise.all([
        apiKasir.kapster().catch(() => []),
        apiAbsensi.list({ tanggal: filterTanggal || undefined }).catch(() => []),
      ])
      if (kaps.length > 0) setKapsters(kaps)
      if (abs.length > 0) setList(abs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filterTanggal])

  const filtered = list.filter((item) => {
    if (filterKapster !== "Semua" && item.userId !== filterKapster) return false
    return true
  })

  return (
    <div className="content">
      <PageTitle
        eyebrow={isManager ? "Manajer" : "Owner"}
        title={pageTitle}
      />
      <div className="segmented page-segment">
        {(["Riwayat", "Jadwal", "Koreksi"] as const).map((value) => (
          <Button
            className={tab === value ? "active" : ""}
            key={value}
            onClick={() => setTab(value)}
          >
            {value}
          </Button>
        ))}
      </div>

      {tab === "Riwayat" && (
        <section className="panel attendance-admin-list">
          <div className="filters">
            <div className="input-shell">
              <Icon name="calendar" />
              <input
                type="date"
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
              />
            </div>
            <select
              value={filterKapster}
              onChange={(e) => setFilterKapster(e.target.value)}
            >
              <option value="Semua">Semua kapster</option>
              {kapsters.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
            <Button className="secondary-button" onClick={() => loadData()}>
              <Icon name="history" /> Refresh
            </Button>
          </div>

          {loading && <p style={{ padding: 18, color: "var(--muted)" }}>Memuat data absensi...</p>}

          {filtered.length === 0 && !loading && (
            <p style={{ padding: 18, color: "var(--muted)" }}>Tidak ada data absensi untuk filter ini.</p>
          )}

          {filtered.map((row) => (
            <article key={row.id}>
              <span className="photo-thumb">
                <Icon name="user" />
              </span>
              <span>
                <strong>{row.nama}</strong>
                <small>{row.role}</small>
              </span>
              <span>
                <small>Tipe</small>
                <strong>{row.tipe || "Masuk"}</strong>
              </span>
              <span>
                <small>Jam Server</small>
                <strong>{row.jam}</strong>
              </span>
              <i className="chip lunas">
                {row.status || "Hadir"}
              </i>
            </article>
          ))}
        </section>
      )}

      {tab === "Jadwal" && (
        <section className="panel schedule-grid-card">
          <div className="schedule-toolbar">
            <strong>Jadwal Reguler Kapster Eastville</strong>
            <Button className="primary-button">
              <Icon name="plus" /> Atur jadwal
            </Button>
          </div>
          <div className="week-grid">
            <div className="week-head">
              <span>Kapster</span>
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            {[
              ["Budi Santoso", "10.00", "10.00", "10.00", "10.00", "Libur", "08.00", "08.00"],
              ["Zhefitra Ananda", "08.00", "08.00", "Libur", "08.00", "08.00", "10.00", "10.00"],
            ].map((row) => (
              <div className="week-row" key={row[0]}>
                <strong>{row[0]}</strong>
                {row.slice(1).map((time, index) => (
                  <button
                    className={time === "Libur" ? "off" : ""}
                    key={`${row[0]}-${index}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "Koreksi" && (
        <section className="correction-grid">
          <article className="panel correction-card">
            <span className="alert-icon">
              <Icon name="camera" />
            </span>
            <div>
              <strong>Budi Santoso</strong>
              <small>{today} · Kamera perangkat tidak dapat dibuka</small>
              <p>Kendala perangkat telah dilaporkan.</p>
            </div>
            <Button
              className="primary-button"
              onClick={() => setCorrectionOpen(true)}
            >
              Koreksi
            </Button>
          </article>
        </section>
      )}

      {correctionOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(event) => {
              event.preventDefault()
              alert("Koreksi kehadiran berhasil disimpan.")
              setCorrectionOpen(false)
            }}
          >
            <header>
              <h2>Koreksi Kehadiran</h2>
              <Button type="button" onClick={() => setCorrectionOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Status Koreksi</span>
              <select>
                <option>Hadir (Tepat Waktu)</option>
                <option>Terlambat Disetujui</option>
                <option>Izin / Sakit</option>
              </select>
            </label>
            <label>
              <span>Catatan Koreksi</span>
              <textarea placeholder="Alasan persetujuan koreksi..." required />
            </label>
            <footer>
              <Button
                className="secondary-button"
                type="button"
                onClick={() => setCorrectionOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

export default AttendanceAdminPage
