import { FormEvent, useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle } from "../../components/common/UI"
import { AppUser, Role } from "../../types"
import {
  apiAbsensi,
  apiKasir,
  apiPengaturan,
  getToken,
  AbsensiRow,
  PengaturanKomisi,
} from "../../api"

interface LeaveRecord {
  id: string
  kapsterId: string
  kapsterNama: string
  tanggal: string
  tipe: "Libur Mingguan" | "Cuti" | "Izin"
  alasan: string
}

const DEFAULT_KAPSTERS = [
  { id: "u-kapster-1", nama: "Budi Santoso" },
  { id: "u-kapster-2", nama: "Zhefitra Ananda" },
  { id: "u-kapster-3", nama: "Tata Pratama" },
  { id: "u-kapster-4", nama: "Faisal Rahman" },
]

const DEFAULT_LEAVE_RECORDS: LeaveRecord[] = [
  { id: "lv-1", kapsterId: "u-kapster-1", kapsterNama: "Budi Santoso", tanggal: "2026-11-06", tipe: "Libur Mingguan", alasan: "Jadwal libur rutin Jumat" },
  { id: "lv-2", kapsterId: "u-kapster-2", kapsterNama: "Zhefitra Ananda", tanggal: "2026-11-04", tipe: "Libur Mingguan", alasan: "Jadwal libur rutin Rabu" },
  { id: "lv-3", kapsterId: "u-kapster-4", kapsterNama: "Faisal Rahman", tanggal: "2026-11-02", tipe: "Libur Mingguan", alasan: "Jadwal libur rutin Senin" },
]

const demoPengaturan: PengaturanKomisi = {
  jamMulai: "10:00",
  jamSelesai: "21:00",
  komisiDefault: 40,
  komisiLembur: 50,
  kapster: [],
}

export function AttendanceAdminPage({
  currentUser,
  role,
  title,
}: {
  currentUser?: AppUser
  role?: Role
  title?: string
} = {}) {
  const isManager = (role ?? currentUser?.role) === "Manajer"
  const pageTitle = title ?? "Jadwal Absensi"

  const today = new Date().toISOString().slice(0, 10)
  const [tab, setTab] = useState<"Jadwal" | "Pengaturan">("Jadwal")
  const [filterTanggal, setFilterTanggal] = useState(today)
  const [filterKapster, setFilterKapster] = useState("Semua")
  const [kapsters, setKapsters] = useState<{ id: string; nama: string }[]>(DEFAULT_KAPSTERS)
  const [absensiList, setAbsensiList] = useState<AbsensiRow[]>([
    {
      id: "a-01",
      waktu: new Date().toISOString(),
      tanggal: today,
      jam: "08.54",
      userId: "u-kapster-1",
      nama: "Budi Santoso",
      role: "Kapster",
      tipe: "Masuk",
      status: "Tepat waktu",
    },
    {
      id: "a-02",
      waktu: new Date().toISOString(),
      tanggal: today,
      jam: "08.58",
      userId: "u-kapster-2",
      nama: "Zhefitra Ananda",
      role: "Kapster",
      tipe: "Masuk",
      status: "Hadir",
    },
    {
      id: "a-03",
      waktu: new Date().toISOString(),
      tanggal: today,
      jam: "11.50",
      userId: "u-kapster-3",
      nama: "Tata Pratama",
      role: "Kapster",
      tipe: "Masuk",
      status: "Hadir",
    },
  ])
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>(DEFAULT_LEAVE_RECORDS)
  const [loading, setLoading] = useState(false)

  // Leave Modal State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [leaveKapsterId, setLeaveKapsterId] = useState(DEFAULT_KAPSTERS[0].id)
  const [leaveDate, setLeaveDate] = useState(today)
  const [leaveType, setLeaveType] = useState<LeaveRecord["tipe"]>("Libur Mingguan")
  const [leaveReason, setLeaveReason] = useState("")
  const [leaveError, setLeaveError] = useState("")

  // Jam Kerja & Komisi State
  const [pengaturan, setPengaturan] = useState<PengaturanKomisi>(demoPengaturan)
  const [jamMulai, setJamMulai] = useState(demoPengaturan.jamMulai)
  const [jamSelesai, setJamSelesai] = useState(demoPengaturan.jamSelesai)
  const [komisiDefault, setKomisiDefault] = useState(String(demoPengaturan.komisiDefault))
  const [komisiLembur, setKomisiLembur] = useState(String(demoPengaturan.komisiLembur))
  const [pengaturanAlasan, setPengaturanAlasan] = useState("")
  const [pengaturanMsg, setPengaturanMsg] = useState("")
  const [pengaturanSaving, setPengaturanSaving] = useState(false)

  async function loadData() {
    if (!getToken()) return
    setLoading(true)
    try {
      const [kaps, abs, peng] = await Promise.all([
        apiKasir.kapster().catch(() => []),
        apiAbsensi.list({ tanggal: filterTanggal || undefined }).catch(() => []),
        apiPengaturan.get().catch(() => null),
      ])
      if (kaps.length > 0) {
        setKapsters(kaps)
        if (!leaveKapsterId && kaps[0]) setLeaveKapsterId(kaps[0].id)
      }
      if (abs.length > 0) setAbsensiList(abs)
      if (peng) {
        setPengaturan(peng)
        setJamMulai(peng.jamMulai)
        setJamSelesai(peng.jamSelesai)
        setKomisiDefault(String(peng.komisiDefault))
        setKomisiLembur(String(peng.komisiLembur))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filterTanggal])

  // Hitung jumlah libur bulan ini untuk kapster tertentu (validasi max 4x sebulan)
  function getLeaveCountInMonth(kapsterId: string, dateString: string): number {
    const monthPrefix = dateString.slice(0, 7)
    return leaveRecords.filter(
      (r) => r.kapsterId === kapsterId && r.tanggal.startsWith(monthPrefix)
    ).length
  }

  function handleOpenLeaveModal() {
    setLeaveError("")
    setLeaveReason("")
    setLeaveDate(filterTanggal || today)
    setLeaveModalOpen(true)
  }

  function handleSaveLeave(e: FormEvent) {
    e.preventDefault()
    setLeaveError("")

    const targetKapster = kapsters.find((k) => k.id === leaveKapsterId)
    if (!targetKapster) return

    // VALIDASI: Pembatasan maksimal libur 4 kali dalam sebulan
    const currentCount = getLeaveCountInMonth(leaveKapsterId, leaveDate)
    const monthName = new Date(leaveDate + "T00:00:00").toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    })

    if (currentCount >= 4) {
      setLeaveError(
        `Batas maksimal tercapai: Kapster ${targetKapster.nama} telah mengambil ${currentCount} hari libur pada bulan ${monthName}. Maksimal kuota adalah 4 kali dalam sebulan.`
      )
      return
    }

    const newRecord: LeaveRecord = {
      id: `lv-${Date.now()}`,
      kapsterId: targetKapster.id,
      kapsterNama: targetKapster.nama,
      tanggal: leaveDate,
      tipe: leaveType,
      alasan: leaveReason.trim() || `${leaveType} disetujui`,
    }

    setLeaveRecords((prev) => [newRecord, ...prev])
    setLeaveModalOpen(false)
  }

  async function handleSaveJamKerja(e: FormEvent) {
    e.preventDefault()
    setPengaturanMsg("")
    const baru: PengaturanKomisi = {
      ...pengaturan,
      jamMulai,
      jamSelesai,
      komisiDefault: Number(komisiDefault),
      komisiLembur: Number(komisiLembur),
    }

    if (!getToken()) {
      setPengaturan(baru)
      setPengaturanMsg("Jam kerja berhasil disimpan (mode lokal/demo).")
      return
    }

    setPengaturanSaving(true)
    try {
      const res = await apiPengaturan.simpan({
        jamMulai,
        jamSelesai,
        komisiDefault: baru.komisiDefault,
        komisiLembur: baru.komisiLembur,
        alasan: pengaturanAlasan.trim() || "Perubahan jam kerja operasional",
      })
      setPengaturan(res)
      setPengaturanMsg("Pengaturan jam kerja berhasil disimpan ke server.")
      setPengaturanAlasan("")
    } catch (err) {
      setPengaturanMsg(err instanceof Error ? err.message : "Gagal menyimpan jam kerja.")
    } finally {
      setPengaturanSaving(false)
    }
  }

  async function handleSaveKomisi(e: FormEvent) {
    e.preventDefault()
    setPengaturanMsg("")
    const baru: PengaturanKomisi = {
      ...pengaturan,
      jamMulai,
      jamSelesai,
      komisiDefault: Number(komisiDefault),
      komisiLembur: Number(komisiLembur),
    }

    if (!getToken()) {
      setPengaturan(baru)
      setPengaturanMsg("Skema komisi berhasil disimpan (mode lokal/demo).")
      return
    }

    setPengaturanSaving(true)
    try {
      const res = await apiPengaturan.simpan({
        jamMulai,
        jamSelesai,
        komisiDefault: baru.komisiDefault,
        komisiLembur: baru.komisiLembur,
        alasan: pengaturanAlasan.trim() || "Perubahan skema komisi",
      })
      setPengaturan(res)
      setPengaturanMsg("Pengaturan komisi berhasil disimpan ke server.")
      setPengaturanAlasan("")
    } catch (err) {
      setPengaturanMsg(err instanceof Error ? err.message : "Gagal menyimpan komisi.")
    } finally {
      setPengaturanSaving(false)
    }
  }

  const selectedMonthStr = (filterTanggal || today).slice(0, 7)

  // Gabungkan jadwal masuk per kapster untuk tanggal filter
  const scheduleRows = kapsters.map((k, idx) => {
    const abs = absensiList.find((a) => a.userId === k.id || a.nama.toLowerCase() === k.nama.toLowerCase())
    const leave = leaveRecords.find((l) => l.kapsterId === k.id && l.tanggal === filterTanggal)
    const leavesThisMonth = getLeaveCountInMonth(k.id, filterTanggal)

    let shift = idx % 2 === 0 ? "09:00 - 18:00 (Pagi)" : "12:00 - 21:00 (Siang)"
    let statusText = "Belum Masuk"
    let statusType = "pending"

    if (leave) {
      shift = "-"
      statusText = `${leave.tipe}`
      statusType = "libur"
    } else if (abs) {
      statusText = `${abs.status || "Hadir"} (${abs.jam})`
      statusType = "hadir"
    }

    return {
      kapsterId: k.id,
      nama: k.nama,
      shift,
      jamMasuk: abs ? abs.jam : "-",
      statusText,
      statusType,
      leave,
      leavesThisMonth,
    }
  }).filter((item) => {
    if (filterKapster !== "Semua" && item.kapsterId !== filterKapster) return false
    return true
  })

  return (
    <div className="content">
      <PageTitle eyebrow={isManager ? "Manajer" : "Owner"} title={pageTitle} />

      <div className="segmented page-segment">
        {(["Jadwal", "Pengaturan"] as const).map((value) => (
          <Button
            className={tab === value ? "active" : ""}
            key={value}
            onClick={() => {
              setTab(value)
              setPengaturanMsg("")
            }}
          >
            {value === "Jadwal" ? "Jadwal & Absensi" : value === "Pengaturan" ? "Pengaturan Jam Kerja & Komisi" : value}
          </Button>
        ))}
      </div>

      {/* TAB 1: JADWAL & ABSENSI */}
      {tab === "Jadwal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <p className="eyebrow">Daftar Kehadiran</p>
                <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>
                  Jadwal Masuk Kapster · {new Date(filterTanggal + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Button className="secondary-button" onClick={() => setTab("Pengaturan")}>
                  <Icon name="clock" /> Atur Jam Kerja & Komisi
                </Button>
              </div>
            </div>

            <div className="filters">
              <div className="input-shell">
                <Icon name="calendar" />
                <input
                  type="date"
                  value={filterTanggal}
                  onChange={(e) => e.target.value && setFilterTanggal(e.target.value)}
                  title="Pilih tanggal untuk melihat jadwal atau riwayat hari sebelumnya"
                />
              </div>

              <select value={filterKapster} onChange={(e) => setFilterKapster(e.target.value)}>
                <option value="Semua">Semua kapster</option>
                {kapsters.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>

              <Button
                className="secondary-button"
                onClick={() => setFilterTanggal(today)}
                title="Kembali ke hari ini"
              >
                Hari Ini
              </Button>
            </div>

            {loading && <p style={{ padding: 14, color: "var(--muted)" }}>Memuat jadwal absensi...</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {scheduleRows.map((row) => (
                <div
                  key={row.kapsterId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: row.statusType === "libur" ? "var(--bg)" : "var(--paper)",
                    opacity: row.statusType === "libur" ? 0.8 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background:
                          row.statusType === "hadir"
                            ? "rgba(34, 197, 94, 0.15)"
                            : row.statusType === "libur"
                            ? "rgba(200, 150, 62, 0.15)"
                            : "var(--line)",
                        color:
                          row.statusType === "hadir"
                            ? "#15803d"
                            : row.statusType === "libur"
                            ? "#8c6014"
                            : "var(--muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {row.nama.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: 14, color: "var(--ink)", display: "block" }}>{row.nama}</strong>
                      <small style={{ color: "var(--muted)", fontSize: 12 }}>
                        Shift: {row.shift} · Jam Masuk: {row.jamMasuk}
                      </small>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 11, color: "var(--slate)" }}>
                      Libur bulan ini: <strong>{row.leavesThisMonth}/4 hari</strong>
                    </span>
                    {row.statusType === "libur" ? (
                      <i className="chip inactive">{row.statusText}</i>
                    ) : (
                      <Button
                        className="secondary-button"
                        style={{ padding: "6px 10px" }}
                        onClick={() => {
                          setLeaveKapsterId(row.kapsterId)
                          setLeaveDate(filterTanggal)
                          setLeaveType("Libur Mingguan")
                          setLeaveReason("")
                          setLeaveError("")
                          setLeaveModalOpen(true)
                        }}
                      >
                        Ajukan/Set Libur
                      </Button>
                    )}
                    <i
                      className={`chip ${
                        row.statusType === "hadir"
                          ? "lunas"
                          : row.statusType === "libur"
                          ? "inactive"
                          : "batal"
                      }`}
                    >
                      {row.statusText}
                    </i>
                  </div>
                </div>
              ))}
            </div>
          </section>

            {/* Kuota & Riwayat Libur Bulan Berjalan */}
          <section className="panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <p className="eyebrow">Kebijakan Libur Tim</p>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  Ringkasan Kuota Libur Bulan {new Date(filterTanggal + "T00:00:00").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                </h4>
              </div>
              <span className="chip active">Maks. 4x / Kapster</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
              {kapsters.map((k) => {
                const used = getLeaveCountInMonth(k.id, filterTanggal)
                const sisa = Math.max(0, 4 - used)
                const isMax = used >= 4
                return (
                  <div
                    key={k.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      border: isMax ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--line)",
                      background: isMax ? "rgba(239, 68, 68, 0.05)" : "var(--paper)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{k.nama}</strong>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isMax ? "#b91c1c" : "#15803d",
                        }}
                      >
                        {used} / 4 Hari
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: 6,
                        borderRadius: 3,
                        background: "var(--line)",
                        marginTop: 8,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, (used / 4) * 100)}%`,
                          background: isMax ? "#ef4444" : "var(--brass)",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <small style={{ color: "var(--muted)", display: "block", marginTop: 6, fontSize: 11 }}>
                      {isMax ? "Kuota libur habis bulan ini" : `Sisa kuota: ${sisa} hari`}
                    </small>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}

            {/* TAB 2: PENGATURAN JAM KERJA & KOMISI */}
      {tab === "Pengaturan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel" style={{ padding: 22 }}>
            <PageTitle eyebrow="Operasional Toko" title="Pengaturan Jam Kerja" />
            <p style={{ color: "var(--slate)", fontSize: 13, margin: "6px 0 18px", maxWidth: 640 }}>
              Tentukan batas jam mulai dan jam selesai operasional barbershop.
            </p>
            <form onSubmit={handleSaveJamKerja} style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Jam Mulai Operasional</span>
                  <input required type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Jam Selesai Operasional</span>
                  <input required type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)" }} />
                </label>
              </div>
              {getToken() && (
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Alasan Perubahan</span>
                  <input placeholder="Misal: Penyesuaian jam buka toko" value={pengaturanAlasan} onChange={(e) => setPengaturanAlasan(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)" }} />
                </label>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <Button className="primary-button" disabled={pengaturanSaving} type="submit">{pengaturanSaving ? "Menyimpan..." : "Simpan Jam Kerja"}</Button>
                {pengaturanMsg && <small style={{ color: "var(--slate)", fontSize: 12 }}>{pengaturanMsg}</small>}
              </div>
            </form>
          </section>

          <section className="panel" style={{ padding: 22 }}>
            <PageTitle eyebrow="Insentif Tim" title="Pengaturan Komisi" />
            <p style={{ color: "var(--slate)", fontSize: 13, margin: "6px 0 18px", maxWidth: 640 }}>
              Atur persentase komisi reguler dan lembur untuk layanan.
            </p>
            <form onSubmit={handleSaveKomisi} style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Komisi Layanan Reguler (%)</span>
                  <input max={100} min={0} required type="number" value={komisiDefault} onChange={(e) => setKomisiDefault(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Komisi Lembur (%)</span>
                  <input max={100} min={0} required type="number" value={komisiLembur} onChange={(e) => setKomisiLembur(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)" }} />
                </label>
              </div>
              {getToken() && (
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Alasan Perubahan</span>
                  <input placeholder="Misal: Penyesuaian kebijakan insentif" value={pengaturanAlasan} onChange={(e) => setPengaturanAlasan(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line)" }} />
                </label>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <Button className="primary-button" disabled={pengaturanSaving} type="submit">{pengaturanSaving ? "Menyimpan..." : "Simpan Skema Komisi"}</Button>
                {pengaturanMsg && <small style={{ color: "var(--slate)", fontSize: 12 }}>{pengaturanMsg}</small>}
              </div>
            </form>
          </section>
        </div>
      )}

      {leaveModalOpen && (
        <div className="modal-overlay">
          <form className="simple-modal" onSubmit={handleSaveLeave}>
            <header>
              <h2>Input Libur / Cuti Kapster</h2>
              <Button type="button" onClick={() => setLeaveModalOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            {leaveError && (
              <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(239, 68, 68, 0.1)", color: "#b91c1c", fontSize: 13, border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                {leaveError}
              </div>
            )}
            <label>
              <span>Pilih Kapster</span>
              <select value={leaveKapsterId} onChange={(e) => { setLeaveKapsterId(e.target.value); setLeaveError(""); }}>
                {kapsters.map((k) => {
                  const used = getLeaveCountInMonth(k.id, leaveDate)
                  return <option key={k.id} value={k.id}>{k.nama} (Sudah libur: {used}/4 kali)</option>
                })}
              </select>
            </label>
            <label>
              <span>Tanggal Libur / Cuti</span>
              <input type="date" value={leaveDate} onChange={(e) => { setLeaveDate(e.target.value); setLeaveError(""); }} required />
            </label>
            <label>
              <span>Jenis Izin</span>
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveRecord["tipe"])}>
                <option value="Libur Mingguan">Libur Mingguan</option>
                <option value="Cuti">Cuti Pribadi</option>
                <option value="Izin">Izin Khusus</option>
              </select>
            </label>
            <label>
              <span>Alasan / Keterangan</span>
              <input placeholder="Misal: Keperluan keluarga" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
            </label>
            <div style={{ fontSize: 12, color: "var(--muted)", padding: "4px 0" }}>
              * Setiap kapster dibatasi maksimal 4 kali libur dalam 1 bulan kalender.
            </div>
            <footer>
              <Button className="secondary-button" type="button" onClick={() => setLeaveModalOpen(false)}>Batal</Button>
              <Button className="primary-button" type="submit">Simpan Jadwal Libur</Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

export default AttendanceAdminPage
