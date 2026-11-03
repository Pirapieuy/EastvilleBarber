import { useEffect, useState } from "react"
import {
  apiAbsensi,
  apiLaporan,
  apiTransaksi,
  getToken,
  AbsensiRow,
  LaporanKeuangan,
} from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser } from "../../types"

const pad = (n: number) => String(n).padStart(2, "0")
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

interface DailyServiceItem {
  id: string
  time: string
  serviceName: string
  kapsterName: string
  price: number
  method: "Tunai" | "QRIS"
  status: "Selesai" | "Berjalan"
}

const DEFAULT_DEMO_KAPSTERS = [
  { id: "k1", nama: "Budi Santoso", shift: "09:00 - 18:00", jamMasuk: "08:54", status: "Hadir (Tepat Waktu)", layananCount: 7 },
  { id: "k2", nama: "Zhefitra Ananda", shift: "09:00 - 18:00", jamMasuk: "08:58", status: "Hadir (Tepat Waktu)", layananCount: 6 },
  { id: "k3", nama: "Tata Pratama", shift: "12:00 - 21:00", jamMasuk: "11:50", status: "Hadir (Tepat Waktu)", layananCount: 5 },
  { id: "k4", nama: "Faisal Rahman", shift: "12:00 - 21:00", jamMasuk: "-", status: "Libur Mingguan", layananCount: 0 },
]

const DEFAULT_DEMO_SERVICES: DailyServiceItem[] = [
  { id: "srv-1", time: "16:45", serviceName: "Haircut + Cuci", kapsterName: "Budi Santoso", price: 50000, method: "QRIS", status: "Selesai" },
  { id: "srv-2", time: "16:15", serviceName: "Haircut", kapsterName: "Tata Pratama", price: 40000, method: "Tunai", status: "Selesai" },
  { id: "srv-3", time: "15:30", serviceName: "Treatment & Grooming", kapsterName: "Zhefitra Ananda", price: 60000, method: "QRIS", status: "Selesai" },
  { id: "srv-4", time: "14:50", serviceName: "Haircut", kapsterName: "Budi Santoso", price: 40000, method: "Tunai", status: "Selesai" },
  { id: "srv-5", time: "14:10", serviceName: "Shaving & Haircut", kapsterName: "Zhefitra Ananda", price: 65000, method: "QRIS", status: "Selesai" },
  { id: "srv-6", time: "13:30", serviceName: "Hair Coloring", kapsterName: "Tata Pratama", price: 120000, method: "Tunai", status: "Selesai" },
]

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]
const HARI_SINGKAT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

export function ManagerDashboard({
  user,
  onNavigate,
  navigate,
}: {
  user?: AppUser
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  const nav = onNavigate ?? navigate ?? (() => {})
  const firstName = user?.name ? user.name.split(" ")[0] : "Dian"
  const todayIso = toIso(new Date())

  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [liveData, setLiveData] = useState<LaporanKeuangan | null>(null)
  const [liveAbsensi, setLiveAbsensi] = useState<AbsensiRow[]>([])
  const [liveServices, setLiveServices] = useState<DailyServiceItem[]>([])
  const [liveError, setLiveError] = useState("")
  const [loading, setLoading] = useState(false)

  const isToday = selectedDate === todayIso

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    setLoading(true)
    Promise.all([
      apiLaporan.keuangan({ dari: selectedDate, sampai: selectedDate }).catch(() => null),
      apiAbsensi.list({ tanggal: selectedDate }).catch(() => []),
      apiTransaksi.list({ dari: selectedDate, sampai: selectedDate }).catch(() => []),
    ])
      .then(([lap, abs, trx]) => {
        if (lap) setLiveData(lap)
        if (abs) setLiveAbsensi(abs)
        if (Array.isArray(trx)) {
          const mapped: DailyServiceItem[] = trx.map((t: any, idx: number) => ({
            id: t.id || `trx-${idx}`,
            time: t.time || (t.createdTime ? String(t.createdTime).slice(12, 17) : "12:00"),
            serviceName: t.items?.[0]?.name || "Haircut",
            kapsterName: t.barber || "Kapster",
            price: Number(t.total) || 40000,
            method: (t.method === "QRIS" ? "QRIS" : "Tunai"),
            status: t.status === "BATAL" ? "Berjalan" : "Selesai",
          }))
          setLiveServices(mapped)
        }
        setLiveError("")
      })
      .catch((e) => {
        console.error("Gagal load aktivitas hari ini:", e)
        setLiveError(e instanceof Error ? e.message : "Gagal memuat data")
      })
      .finally(() => setLoading(false))
  }, [selectedDate])

  const dailyIncome = liveData ? liveData.pemasukan : (isToday ? 1850000 : 1420000)
  const dailyCash = liveData ? liveData.tunai : (isToday ? 1050000 : 800000)
  const dailyQris = liveData ? liveData.qris : (isToday ? 800000 : 620000)
  const dailyExpense = liveData ? liveData.pengeluaran : (isToday ? 215000 : 150000)
  const dailyCommission = liveData ? liveData.komisi : (isToday ? 740000 : 568000)
  const dailyNet = dailyIncome - dailyExpense - dailyCommission

  const kapsterList = liveAbsensi.length > 0
    ? liveAbsensi.map((a, idx) => ({
        id: a.id || `k-${idx}`,
        nama: a.nama,
        shift: "09:00 - 18:00",
        jamMasuk: a.jam || "09:00",
        status: a.status || (a.tipe === "Masuk" ? "Hadir" : "Pulang"),
        layananCount: isToday ? 5 + (idx % 3) : 4,
      }))
    : DEFAULT_DEMO_KAPSTERS

  const servicesList = liveServices.length > 0 ? liveServices : DEFAULT_DEMO_SERVICES

  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const startOffset = (firstDayOfMonth + 6) % 7

  function handlePrevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1) }
    else setCalMonth((m) => m - 1)
  }
  function handleNextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1) }
    else setCalMonth((m) => m + 1)
  }
  function handleSelectDate(day: number) {
    setSelectedDate(`${calYear}-${pad(calMonth + 1)}-${pad(day)}`)
  }
  function handleJumpToday() {
    const now = new Date()
    setCalMonth(now.getMonth())
    setCalYear(now.getFullYear())
    setSelectedDate(todayIso)
  }

  const dateObj = new Date(selectedDate + "T00:00:00")
  const formattedSelectedDate = dateObj.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className="content">
      <DemoNotice live={Boolean(liveData)} error={liveError} />

      <PageTitle
        eyebrow={`Aktivitas 1 Hari · ${formattedSelectedDate}`}
        title={`Selamat datang, ${firstName}.`}
        action={
          <div className="page-actions" style={{ position: "relative" }}>
            <Button
              className="secondary-button"
              onClick={() => nav("RekapManual")}
            >
              <Icon name="pencil" /> Input Nota Kertas
            </Button>
            <Button
              className="primary-button"
              onClick={() => nav("Pengeluaran")}
            >
              <Icon name="expense" /> Catat Pengeluaran
            </Button>
            <Button
              className="secondary-button"
              onClick={() => setShowDatePicker((v) => !v)}
              title="Pilih tanggal"
            >
              <Icon name="calendar" />
              {formattedSelectedDate}
            </Button>
            {!isToday && (
              <Button className="secondary-button" onClick={handleJumpToday}>
                <Icon name="history" /> Kembali ke Hari Ini
              </Button>
            )}
            {showDatePicker && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  zIndex: 20,
                  width: 280,
                }}
              >
                <section className="panel" style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <strong style={{ fontSize: 13 }}>{NAMA_BULAN[calMonth]} {calYear}</strong>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button type="button" className="secondary-button" style={{ padding: "4px 8px" }} onClick={handlePrevMonth}>
                        <Icon name="chevron" />
                      </button>
                      <button type="button" className="secondary-button" style={{ padding: "4px 8px", transform: "rotate(180deg)" }} onClick={handleNextMonth}>
                        <Icon name="chevron" />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center", fontSize: 10, marginBottom: 6 }}>
                    {HARI_SINGKAT.map((h) => <div key={h}>{h}</div>)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                    {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1
                      const curIso = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`
                      const sel = curIso === selectedDate
                      const tod = curIso === todayIso
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => { handleSelectDate(day); setShowDatePicker(false) }}
                          style={{
                            height: 30, borderRadius: 6,
                            border: sel ? "1px solid var(--ink)" : "1px solid transparent",
                            background: sel ? "var(--ink)" : tod ? "rgba(200,150,62,0.12)" : "transparent",
                            color: sel ? "#fff" : "var(--ink)",
                            fontSize: 11, fontWeight: sel || tod ? 700 : 500, cursor: "pointer",
                          }}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" className="secondary-button" style={{ padding: "4px 8px", fontSize: 11 }} onClick={handleJumpToday}>
                      Hari Ini
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        }
      />

      <div className="kpi-grid" style={loading ? { opacity: 0.6 } : undefined}>
        <Kpi
          icon="cash"
          label={`Pemasukan (${isToday ? "Hari Ini" : "Pilihan"})`}
          tone="sage"
          value={rupiah(dailyIncome)}
          detail={`Tunai ${rupiah(dailyCash)} · QRIS ${rupiah(dailyQris)}`}
        />
        <Kpi
          icon="expense"
          label={`Pengeluaran (${isToday ? "Hari Ini" : "Pilihan"})`}
          tone="amber"
          value={rupiah(dailyExpense)}
          detail="Operasional harian"
        />
        <Kpi
          icon="people"
          label="Total Komisi Hari Ini"
          tone="brass"
          value={rupiah(dailyCommission)}
          detail="Akumulasi komisi kapster"
        />
        <Kpi
          icon="wallet"
          label="Laba Bersih Hari Ini"
          tone="dark"
          value={rupiah(dailyNet)}
          detail="Pemasukan − Pengeluaran − Komisi"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, alignItems: "start" }}>
          {/* Kehadiran Tim */}
          <section className="panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <p className="eyebrow">Kehadiran Tim</p>
                <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>Status Absensi Hari Ini</h3>
              </div>
              <span className="chip active">
                {kapsterList.filter((k) => !k.status.toLowerCase().includes("libur")).length} Aktif Hadir
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {kapsterList.map((k) => {
                const isLibur = k.status.toLowerCase().includes("libur")
                return (
                  <div
                    key={k.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 8, border: "1px solid var(--line)",
                      background: isLibur ? "var(--bg)" : "var(--paper)", opacity: isLibur ? 0.75 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: isLibur ? "var(--line)" : "rgba(34, 197, 94, 0.15)",
                        color: isLibur ? "var(--muted)" : "#15803d",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 13,
                      }}>
                        {k.nama.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: 14, color: "var(--ink)", display: "block" }}>{k.nama}</strong>
                        <small style={{ color: "var(--muted)", fontSize: 12 }}>
                          Shift: {k.shift} · Masuk: {k.jamMasuk}
                        </small>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {!isLibur && (
                        <span style={{ fontSize: 12, color: "var(--slate)", fontWeight: 600 }}>
                          {k.layananCount} layanan
                        </span>
                      )}
                      <i className={`chip ${isLibur ? "inactive" : "lunas"}`}>{k.status}</i>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Aktivitas Layanan */}
          <section className="panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <p className="eyebrow">Aktivitas Pelayanan</p>
                <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>Aktivitas Hari Ini</h3>
              </div>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{servicesList.length} transaksi</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {servicesList.length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  Belum ada transaksi layanan pada tanggal ini.
                </div>
              ) : (
                servicesList.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                        {s.time}
                      </span>
                      <div>
                        <strong style={{ fontSize: 13, color: "var(--ink)", display: "block" }}>{s.serviceName}</strong>
                        <small style={{ color: "var(--slate)", fontSize: 12 }}>
                          Kapster: {s.kapsterName} · Metode: {s.method}
                        </small>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <b style={{ fontSize: 13, color: "var(--ink)" }}>{rupiah(s.price)}</b>
                      <span className="chip active" style={{ fontSize: 11, padding: "2px 8px" }}>{s.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Kalender Interaktif */}
        <div>
          <section className="panel" style={{ padding: 18, position: "sticky", top: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <p className="eyebrow">Navigasi Tanggal</p>
                <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>{NAMA_BULAN[calMonth]} {calYear}</h3>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" className="secondary-button" style={{ padding: "6px 10px", minWidth: 32 }} onClick={handlePrevMonth} aria-label="Bulan sebelumnya">
                  <Icon name="chevron" />
                </button>
                <button type="button" className="secondary-button" style={{ padding: "6px 10px", minWidth: 32, transform: "rotate(180deg)" }} onClick={handleNextMonth} aria-label="Bulan berikutnya">
                  <Icon name="chevron" />
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontWeight: 700, fontSize: 11, color: "var(--slate)", marginBottom: 8 }}>
              {HARI_SINGKAT.map((h) => <div key={h} style={{ padding: "4px 0" }}>{h}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const curIso = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`
                const isCurSelected = curIso === selectedDate
                const isCurToday = curIso === todayIso
                return (
                  <button
                    key={day}
                    onClick={() => handleSelectDate(day)}
                    type="button"
                    style={{
                      height: 38, borderRadius: 8,
                      border: isCurSelected ? "2px solid var(--ink)" : isCurToday ? "1px solid var(--brass)" : "1px solid transparent",
                      background: isCurSelected ? "var(--ink)" : isCurToday ? "rgba(200, 150, 62, 0.12)" : "transparent",
                      color: isCurSelected ? "#fff" : "var(--ink)",
                      fontWeight: isCurSelected || isCurToday ? 700 : 500,
                      fontSize: 13, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{day}</span>
                    {isCurToday && !isCurSelected && (
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--brass)", marginTop: 2 }} />
                    )}
                  </button>
                )
              })}
            </div>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--slate)" }}>Dipilih: <strong>{selectedDate}</strong></span>
              <button type="button" className="secondary-button" style={{ padding: "4px 10px", fontSize: 11 }} onClick={handleJumpToday}>
                Hari Ini
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default ManagerDashboard
