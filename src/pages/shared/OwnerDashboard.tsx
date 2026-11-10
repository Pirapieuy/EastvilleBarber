import { useEffect, useState } from "react"
import {
  apiAbsensi,
  apiKasir,
  apiLaporan,
  apiPengeluaran,
  apiTransaksi,
  getToken,
  AbsensiRow,
  LaporanKeuangan,
} from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { TANGGAL_MULAI } from "../../utils/tanggal"
import {
  Button,
  CalendarPicker,
  Kpi,
  PageTitle,
  rupiah,
} from "../../components/common/UI"

const pad = (n: number) => String(n).padStart(2, "0")
const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

interface DailyServiceItem {
  id: string
  time: string
  serviceName: string
  kapsterName: string
  price: number
  method: "Tunai" | "QRIS"
  status: "Selesai" | "Batal"
}

export function OwnerDashboard({ onNavigate, navigate }: {
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  const nav = onNavigate ?? navigate ?? (() => {})
  const todayIso = toIso(new Date())

  const [selectedDate, setSelectedDate] = useState(todayIso)

  const [liveData, setLiveData] = useState<LaporanKeuangan | null>(null)
  // null = data absensi tidak tersedia (modul lain gagal), bukan "tidak ada yang hadir"
  const [liveAbsensi, setLiveAbsensi] = useState<AbsensiRow[] | null>(null)
  const [kapsterAll, setKapsterAll] = useState<{ id: string; nama: string }[]>(
    [],
  )
  const [liveServices, setLiveServices] = useState<DailyServiceItem[]>([])
  const [liveError, setLiveError] = useState("")
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const punyaToken = Boolean(getToken())

  const isToday = selectedDate === todayIso

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    let batal = false
    setLoading(true)
    setLiveError("")
    // Laporan & transaksi wajib berhasil; absensi/daftar kapster milik modul lain boleh gagal.
    Promise.all([
      apiLaporan.keuangan({ dari: selectedDate, sampai: selectedDate }),
      apiTransaksi.list({ dari: selectedDate, sampai: selectedDate }),
      apiAbsensi.list({ tanggal: selectedDate }).catch(() => null),
      apiKasir.kapster().catch(() => []),
    ])
      .then(([lap, trx, abs, kap]) => {
        if (batal) return
        setLiveData(lap)
        setLiveAbsensi(abs)
        setKapsterAll(kap)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setLiveServices(
          (trx as any[]).map((t, idx) => ({
            id: t.id || `trx-${idx}`,
            time: t.time || "-",
            serviceName:
              (t.items ?? []).map((i: { name: string }) => i.name).join(", ") ||
              "-",
            kapsterName: t.barber || "-",
            price: Number(t.total) || 0,
            method: t.method === "QRIS" ? "QRIS" : "Tunai",
            status: t.status === "BATAL" ? "Batal" : "Selesai",
          })),
        )
      })
      .catch((e) => {
        console.error("Gagal memuat beranda:", e)
        if (!batal) {
          setLiveData(null)
          setLiveError(e instanceof Error ? e.message : "Gagal memuat data")
        }
      })
      .finally(() => !batal && setLoading(false))
    return () => {
      batal = true
    }
  }, [selectedDate, reloadKey])

  const dailyIncome = liveData?.pemasukan ?? 0
  const dailyCash = liveData?.tunai ?? 0
  const dailyQris = liveData?.qris ?? 0
  const dailyExpense = liveData?.pengeluaran ?? 0
  const dailyCommission = liveData?.komisi ?? 0
  const dailyNet = dailyIncome - dailyExpense - dailyCommission

  // Kehadiran dari absensi asli (Masuk/Pulang) per kapster; jumlah layanan dari laporan keuangan.
  const kapsterList = kapsterAll.map((k) => {
    const rows = (liveAbsensi ?? []).filter((r) => r.userId === k.id)
    const masuk = rows.find((r) => r.tipe === "Masuk")
    let statusText: "Tepat Waktu" | "Terlambat" | "Tidak Hadir" = "Tidak Hadir"
    if (masuk) {
      const isLate =
        masuk.status?.toLowerCase().includes("terlambat") ||
        (masuk.jam && (masuk.jam > "10.00" || masuk.jam > "10:00"))
      statusText = isLate ? "Terlambat" : "Tepat Waktu"
    }
    return {
      id: k.id,
      nama: k.nama,
      jamMasuk: masuk?.jam ?? "-",
      status: statusText,
      layananCount:
        liveData?.perKapster.find((p) => p.kapsterId === k.id)?.pelanggan ?? 0,
    }
  })
  const servicesList = liveServices

  if (punyaToken && !liveData && liveError) {
    return (
      <div className="content">
        <DemoNotice live={false} error={liveError} />
        <p>Beranda gagal dimuat: {liveError}</p>
        <Button
          className="primary-button"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          Coba lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="content">
      <DemoNotice live={Boolean(liveData)} error={liveError} />

      <PageTitle
        title="Ringkasan Operasional Hari Ini"
        action={
          <div className="page-actions">
            <CalendarPicker
              value={selectedDate}
              onChange={setSelectedDate}
              max={todayIso}
              min={TANGGAL_MULAI}
              align="left"
            />
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
          label="Sisa Bersih Hari Ini"
          tone="dark"
          value={rupiah(dailyNet)}
          detail="Pemasukan − Pengeluaran − Komisi"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 16,
          marginTop: 16,
        }}
      >
        <div className="dashboard-lower-grid">
          {/* Status & Daftar Kapster Hari Ini */}
          <section className="panel" style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>
                Kehadiran Tim
              </h3>
              <span className="chip active">
                {liveAbsensi
                  ? `${kapsterList.filter((k) => k.jamMasuk !== "-").length} dari ${kapsterList.length} Hadir`
                  : ""}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {kapsterList.map((k) => {
                const isLibur = k.jamMasuk === "-"
                return (
                  <div
                    key={k.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: isLibur ? "var(--bg)" : "var(--paper)",
                      opacity: isLibur ? 0.75 : 1,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background:
                            k.status === "Tepat Waktu"
                              ? "rgba(34, 197, 94, 0.15)"
                              : k.status === "Terlambat"
                                ? "rgba(234, 179, 8, 0.15)"
                                : "var(--line)",
                          color:
                            k.status === "Tepat Waktu"
                              ? "#15803d"
                              : k.status === "Terlambat"
                                ? "#b45309"
                                : "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {k.nama.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong
                          style={{
                            fontSize: 14,
                            color: "var(--ink)",
                            display: "block",
                          }}
                        >
                          {k.nama}
                        </strong>
                        <small style={{ color: "var(--muted)", fontSize: 12 }}>
                          {k.jamMasuk !== "-" && `Masuk: ${k.jamMasuk} WIB`}
                        </small>
                      </div>
                    </div>

                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14 }}
                    >
                      {!isLibur && (
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--slate)",
                            fontWeight: 600,
                          }}
                        >
                          {k.layananCount} layanan
                        </span>
                      )}
                      <i
                        className={`chip ${
                          k.status === "Tepat Waktu"
                            ? "lunas"
                            : k.status === "Terlambat"
                              ? "pending"
                              : "batal"
                        }`}
                      >
                        {k.status}
                      </i>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Layanan yang Berjalan Hari Ini */}
          <section className="panel" style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <p className="eyebrow">Aktivitas Pelayanan</p>
                <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>
                  Riwayat Transaksi
                </h3>
              </div>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {servicesList.length} transaksi
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {servicesList.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 24,
                    color: "var(--muted)",
                  }}
                >
                  Belum ada transaksi layanan pada tanggal ini.
                </div>
              ) : (
                servicesList.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "var(--paper)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14 }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 12,
                          color: "var(--muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {s.time}
                      </span>
                      <div>
                        <strong
                          style={{
                            fontSize: 13,
                            color: "var(--ink)",
                            display: "block",
                          }}
                        >
                          {s.serviceName}
                        </strong>
                        <small style={{ color: "var(--slate)", fontSize: 12 }}>
                          Kapster: {s.kapsterName} · Metode: {s.method}
                        </small>
                      </div>
                    </div>

                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <b style={{ fontSize: 13, color: "var(--ink)" }}>
                        {rupiah(s.price)}
                      </b>
                      <span
                        className={`chip ${
                          s.status === "Batal" ? "batal" : "active"
                        }`}
                        style={{ fontSize: 11, padding: "2px 8px" }}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button
              className="text-button"
              onClick={() => nav("RiwayatTransaksi")}
            >
              Selengkapnya <Icon name="arrow" />
            </Button>
          </section>
        </div>
      </div>
    </div>
  )
}

export default OwnerDashboard
