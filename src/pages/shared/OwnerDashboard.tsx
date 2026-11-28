import { useEffect, useState } from "react"
import {
  apiAbsensi,
  apiKasir,
  apiLaporan,
  apiTransaksi,
  getToken,
  AbsensiRow,
  LaporanKeuangan,
} from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import {
  rupiah,
  ErrorState,
  LoadingState,
} from "../../components/common/UI"

const pad = (n: number) => String(n).padStart(2, "0")
const toIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** "09.30" atau "09:30" jadi menit sejak tengah malam; "-" jadi -1. */
const keMenit = (jam: string) => {
  const [h, m] = jam.replace(":", ".").split(".")
  const menit = Number(h) * 60 + Number(m)
  return Number.isFinite(menit) ? menit : -1
}

const persen = (bagian: number, total: number) =>
  total > 0 ? Math.round((bagian / total) * 100) : 0

const MAKS_TRANSAKSI = 8

interface DailyServiceItem {
  id: string
  time: string
  serviceName: string
  kapsterName: string
  price: number
  method: "Tunai" | "QRIS"
  batal: boolean
}

type StatusKapster = "Hadir" | "Tidak Hadir" | "Sakit"

export function OwnerDashboard({ onNavigate, navigate }: {
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  const nav = onNavigate ?? navigate ?? (() => {})
  // Beranda selalu menampilkan hari ini; tanggal lain dilihat lewat Riwayat/Laporan.
  const [todayIso] = useState(() => toIso(new Date()))

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
      apiLaporan.keuangan({ dari: todayIso, sampai: todayIso }),
      apiTransaksi.list({ dari: todayIso, sampai: todayIso }),
      apiAbsensi.list({ tanggal: todayIso }).catch(() => null),
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
            batal: String(t.status ?? "").toUpperCase() === "BATAL",
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
  }, [todayIso, reloadKey])

  const dailyIncome = liveData?.pemasukan ?? 0
  const dailyCash = liveData?.tunai ?? 0
  const dailyQris = liveData?.qris ?? 0
  const dailyExpense = liveData?.pengeluaran ?? 0
  const dailyCommission = liveData?.komisi ?? 0
  const dailyNet = dailyIncome - dailyExpense - dailyCommission

  // Kehadiran dari absensi asli (Masuk/Pulang) per kapster; jumlah layanan dari laporan keuangan.
  const kapsterList = kapsterAll
    .map((k) => {
      const rows = (liveAbsensi ?? []).filter((r) => r.userId === k.id)
      const terbaru = [...rows].sort((a, b) => b.waktu.localeCompare(a.waktu))[0]
      const sakit = terbaru?.status === "Sakit" ? terbaru : undefined
      const masuk = sakit
        ? undefined
        : rows.find(
            (r) => r.tipe === "Masuk" || (r.status === "Hadir" && r.tipe !== "Pulang"),
          )
      let status: StatusKapster = "Tidak Hadir"
      if (sakit) {
        status = "Sakit"
      } else if (masuk) {
        status = "Hadir"
      }
      return {
        id: k.id,
        nama: k.nama,
        jamMasuk: masuk?.jam ?? "",
        fotoUrl: masuk?.fotoUrl ?? "",
        catatanSakit: sakit?.catatan ?? "",
        status,
        layananCount:
          liveData?.perKapster.find((p) => p.kapsterId === k.id)?.pelanggan ??
          0,
      }
    })
    // yang sudah masuk di atas (paling awal dulu), yang belum di bawah
    .sort((a, b) => {
      if (!a.jamMasuk !== !b.jamMasuk) return a.jamMasuk ? -1 : 1
      if (a.status === "Sakit" && b.status !== "Sakit") return -1
      if (b.status === "Sakit" && a.status !== "Sakit") return 1
      return keMenit(a.jamMasuk) - keMenit(b.jamMasuk)
    })

  // Terbaru di atas
  const servicesList = [...liveServices].sort(
    (a, b) => keMenit(b.time) - keMenit(a.time),
  )
  const jumlahKapsterBerkomisi = (liveData?.perKapster ?? []).filter(
    (p) => p.komisi > 0,
  ).length
  const jumlahTransaksi = servicesList.filter((s) => !s.batal).length

  if (punyaToken && !liveData && liveError) {
    return (
      <div className="content">
        <ErrorState
          title="Beranda gagal dimuat"
          message={liveError}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    )
  }

  if (punyaToken && !liveData) {
    return (
      <div className="content">
        <LoadingState message="Memuat beranda…" />
      </div>
    )
  }

  const kpis = [
    {
      key: "pemasukan",
      icon: "cash",
      tone: "sage",
      label: "Pemasukan",
      value: dailyIncome,
      detail: `${jumlahTransaksi} transaksi`,
      to: "RiwayatTransaksi",
    },
    {
      key: "pengeluaran",
      icon: "expense",
      tone: "amber",
      label: "Pengeluaran",
      value: dailyExpense,
      detail:
        dailyIncome > 0
          ? `${persen(dailyExpense, dailyIncome)}% pemasukan`
          : "Belum ada",
      to: "LaporanKeuangan",
    },
    {
      key: "komisi",
      icon: "people",
      tone: "brass",
      label: "Komisi",
      value: dailyCommission,
      // jumlah kapster, bukan persen: persen total mirip tarif komisi (40%/50%) dan menyesatkan
      detail:
        jumlahKapsterBerkomisi > 0
          ? `untuk ${jumlahKapsterBerkomisi} kapster`
          : "Belum ada",
      to: "GajiKasbon",
    },
    {
      key: "bersih",
      icon: "wallet",
      tone: "dark",
      label: "Sisa Bersih",
      value: dailyNet,
      detail:
        dailyIncome > 0
          ? `${persen(dailyNet, dailyIncome)}% pemasukan`
          : "Belum ada",
      to: "LaporanKeuangan",
    },
  ] as const

  const absenTersedia = liveAbsensi !== null

  return (
    <div className="content od-page">
      <DemoNotice live={Boolean(liveData)} error={liveError} />

      <div className="od-kpis" style={loading ? { opacity: 0.6 } : undefined}>
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            className="od-kpi"
            aria-label={`${k.label} ${rupiah(k.value)}, buka detail`}
            onClick={() => nav(k.to)}
          >
            <span className="od-kpi-body">
              <span className={`kpi-icon ${k.tone}`}>
                <Icon name={k.icon} />
              </span>
              <span className="od-kpi-text">
                <span className="od-kpi-label">{k.label}</span>
                <strong className="od-kpi-value">{rupiah(k.value)}</strong>
                <span className="od-kpi-detail">{k.detail}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="od-lower">
        <section
          className="od-panel od-trx"
          role="link"
          tabIndex={0}
          aria-label="Transaksi terbaru, buka Riwayat Transaksi"
          onClick={() => nav("RiwayatTransaksi")}
          onKeyDown={(e) => {
            if (e.key === "Enter") nav("RiwayatTransaksi")
          }}
        >
          <div className="od-head">
            <h3>Transaksi terbaru</h3>
            <Icon name="chevron" className="od-turn-right od-go" />
          </div>
          {servicesList.length === 0 ? (
            <p className="od-empty">Belum ada transaksi di tanggal ini.</p>
          ) : (
            <ul className="od-list">
              {servicesList.slice(0, MAKS_TRANSAKSI).map((s) => (
                <li key={s.id}>
                  <div className="od-row od-row-trx">
                    <time className="od-time">{s.time}</time>
                    <span className="od-main">
                      <strong>{s.serviceName}</strong>
                      <small className={s.batal ? "od-void" : undefined}>
                        {s.batal
                          ? "Dibatalkan"
                          : `${s.kapsterName}, ${s.method}`}
                      </small>
                    </span>
                    <b className={`od-amount${s.batal ? " is-void" : ""}`}>
                      {rupiah(s.price)}
                    </b>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="od-panel od-tim"
          role="link"
          tabIndex={0}
          aria-label="Kehadiran tim, buka Riwayat Absensi"
          onClick={() => nav("RiwayatAbsensi")}
          onKeyDown={(e) => {
            if (e.key === "Enter") nav("RiwayatAbsensi")
          }}
        >
          <div className="od-head">
            <h3>Kehadiran tim</h3>
            <Icon name="chevron" className="od-turn-right od-go" />
          </div>
          {!absenTersedia ? (
            <p className="od-empty">Data absensi belum bisa dimuat.</p>
          ) : kapsterList.length === 0 ? (
            <p className="od-empty">Belum ada kapster terdaftar.</p>
          ) : (
            <ul className="od-list">
              {kapsterList.map((k) => {
                const tone =
                  k.status === "Sakit"
                    ? "sick"
                    : k.status === "Hadir"
                      ? "ok"
                      : "off"
                return (
                  <li key={k.id}>
                    <div className="od-row od-row-tim">
                      <span className={`od-avatar ${tone}`}>
                        {k.nama.slice(0, 2).toUpperCase()}
                        {k.fotoUrl && (
                          <img
                            src={k.fotoUrl}
                            alt=""
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        )}
                      </span>
                      <span className="od-main">
                        <strong>{k.nama}</strong>
                        <small>
                          {k.status === "Sakit"
                            ? `Sakit${k.catatanSakit ? ` · ${k.catatanSakit}` : ""}`
                            : k.jamMasuk
                            ? `Masuk ${k.jamMasuk} WIB, ${k.layananCount} layanan`
                            : "Belum absen masuk"}
                        </small>
                      </span>
                      <span className={`od-chip ${tone}`}>
                        {k.status === "Tidak Hadir" ? "Belum hadir" : k.status}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default OwnerDashboard
