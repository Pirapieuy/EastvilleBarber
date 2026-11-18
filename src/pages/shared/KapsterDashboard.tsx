import { useEffect, useState } from "react"
import {
  apiAbsensi,
  apiKapster,
  apiKomisi,
  AbsensiRow,
  AktivitasKapster,
  getToken,
  KomisiKapsterRow,
} from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  Kpi,
  LoadingState,
  PageTitle,
  rupiah,
  ErrorState,
} from "../../components/common/UI"
import { AppUser } from "../../types"

export function KapsterDashboard({ user, onNavigate, navigate }: {
  user?: AppUser
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  const nav = onNavigate ?? navigate ?? (() => {})
  const firstName = user?.name ? user.name.split(" ")[0] : "Seva"

  const now = new Date()
  const hariIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [komisi, setKomisi] = useState<KomisiKapsterRow | null>(null)
  const [aktivitas, setAktivitas] = useState<AktivitasKapster[] | null>(null)
  const [absensiHariIni, setAbsensiHariIni] = useState<AbsensiRow | null>(null)

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    setLiveError("")
    Promise.all([
      apiKomisi.list({ dari: hariIni, sampai: hariIni }),
      apiKapster.aktivitas(hariIni),
      apiAbsensi.list({ tanggal: hariIni }).catch(() => []),
    ])
      .then(([k, a, abs]) => {
        setKomisi(k[0] ?? null)
        setAktivitas(a)
        const catatanHariIni =
          abs.find((row) => row.userId === user?.id) ?? abs[0] ?? null
        setAbsensiHariIni(catatanHariIni)
        setLive(true)
      })
      .catch((e) => {
        console.error("Gagal memuat beranda kapster:", e)
        setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
  }, [hariIni, reloadKey, user?.id])

  if (Boolean(getToken()) && !live && liveError) {
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

  if (Boolean(getToken()) && !live && !liveError) {
    return (
      <div className="content">
        <LoadingState message="Memuat beranda..." />
      </div>
    )
  }

  const jam = now.getHours()
  const sapaan =
    jam < 11 ? "pagi" : jam < 15 ? "siang" : jam < 18 ? "sore" : "malam"
  const layananRows = (aktivitas ?? []).filter((r) => r.type === "Layanan")
  const produkRows = (aktivitas ?? []).filter((r) => r.type === "Produk")
  const jumlahPelanggan = live ? (komisi?.jumlahTransaksi ?? 0) : 5
  const targetShift = 6
  const totalLayanan = layananRows.reduce((n, r) => n + r.fee, 0)
  const totalProduk = produkRows.reduce((n, r) => n + r.fee, 0)
  const persen = Math.min(
    100,
    Math.round((jumlahPelanggan / targetShift) * 100),
  )
  const komisiLayanan = live
    ? (komisi?.komisiLayanan ?? 0) + (komisi?.komisiLembur ?? 0)
    : 140000
  const komisiProduk = live ? (komisi?.komisiProduk ?? 0) : 30000
  const rows = live
    ? (aktivitas ?? []).map((r) => ({
        item: r.item,
        time: r.time,
        fee: r.fee,
        comm: r.comm,
        type: r.type,
        qty: r.qty,
        trx: r.trx,
        lembur: r.lembur,
      }))
    : null

  return (
    <div className="content kapster-dashboard">
      <DemoNotice live={live} error={liveError} />
      <div className="kpi-grid">
        <Kpi
          icon="people"
          label="Pelanggan Dilayani"
          tone="sage"
          value={`${jumlahPelanggan} orang`}
          detail={`Target shift 8 jam: ${targetShift} orang`}
        />
        <Kpi
          icon="wallet"
          label="Komisi Layanan"
          tone="brass"
          value={rupiah(komisiLayanan)}
          detail={
            live
              ? `${layananRows.length} pengerjaan layanan hari ini`
              : "40% dari 5 pengerjaan"
          }
        />
        <Kpi
          icon="product"
          label="Komisi Produk"
          tone="amber"
          value={rupiah(komisiProduk)}
          detail={
            live
              ? `${produkRows.reduce((n, r) => n + r.qty, 0)} produk terjual hari ini`
              : "3 produk terjual hari ini"
          }
        />
        <Kpi
          icon="check"
          label="Status Kehadiran"
          tone="dark"
          value={live ? absensiHariIni?.status || "Belum Hadir" : "Hadir"}
          detail={
            live
              ? absensiHariIni
                ? `Dicatat kasir${
                    absensiHariIni.jam ? ` · ${absensiHariIni.jam} WIB` : ""
                  }`
                : "Absensi belum dicatat kasir"
              : "Absensi dicatat oleh kasir"
          }
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel kapster-shift-panel">
          <PageTitle
            eyebrow="Target & Proteksi Shift"
            title="Progres Shift 8 Jam Hari Ini"
            action={
              <div className="shift-badges">
                <span className="chip active">Shift 8 Jam</span>
              </div>
            }
          />
          <div className="shift-overview">
            <div>
              <small>Sudah dilayani</small>
              <strong>{jumlahPelanggan}</strong>
              <span>dari {targetShift} pelanggan</span>
            </div>
            <div>
              <small>Sisa target</small>
              <strong>{Math.max(0, targetShift - jumlahPelanggan)}</strong>
              <span>pelanggan</span>
            </div>
          </div>
          <div className="shift-progress">
            <div className="progress-bar-shell">
              <div
                className="progress-bar-fill"
                style={{ width: `${persen}%` }}
              />
            </div>
            <div className="progress-meta">
              <span>
                {jumlahPelanggan} dari {targetShift} pelanggan
              </span>
              <strong>{persen}%</strong>
            </div>
          </div>
        </section>

        <section className="panel kapster-activity-panel">
          <PageTitle
            eyebrow="Pengerjaan Anda hari ini"
            title="Detail Penjualan Saya"
          />
          {live && (
            <div className="kapster-sales-summary">
              <div>
                <small>Total penjualan</small>
                <strong>{rupiah(totalLayanan + totalProduk)}</strong>
              </div>
              <div>
                <small>Layanan</small>
                <strong>{rupiah(totalLayanan)}</strong>
              </div>
              <div>
                <small>Produk</small>
                <strong>{rupiah(totalProduk)}</strong>
              </div>
            </div>
          )}
          <div className="recent-list">
            {(
              rows ?? [
                {
                  item: "Haircut Classic",
                  time: "10.15",
                  fee: 50000,
                  comm: 20000,
                  type: "Layanan",
                },
                {
                  item: "Haircut + Wash + Tonic",
                  time: "11.30",
                  fee: 70000,
                  comm: 28000,
                  type: "Layanan",
                },
                {
                  item: "Beard Trim",
                  time: "13.20",
                  fee: 35000,
                  comm: 14000,
                  type: "Layanan",
                },
                {
                  item: "Free Style Dust",
                  time: "14.05",
                  fee: 80000,
                  comm: 10000,
                  type: "Produk",
                },
                {
                  item: "Haircut Classic",
                  time: "15.40",
                  fee: 50000,
                  comm: 20000,
                  type: "Layanan",
                },
              ]
            ).map((row, idx) => (
              <div key={idx} className="recent-row">
                <div className="recent-icon">
                  <Icon name={row.type === "Produk" ? "product" : "cashier"} />
                </div>
                <div className="recent-info">
                  <strong>
                    {row.item}
                    {"qty" in row && row.qty > 1 ? ` ×${row.qty}` : ""}
                  </strong>
                  <small>
                    {row.time} WIB
                    {"trx" in row && row.trx ? ` · ${row.trx}` : ""}
                    {"lembur" in row && row.lembur ? " · Lembur" : ""} · Total{" "}
                    {rupiah(row.fee)}
                  </small>
                </div>
                <div className="recent-amount">
                  <span className="comm-label">Komisi:</span>
                  <strong>{rupiah(row.comm)}</strong>
                </div>
              </div>
            ))}
            {rows && rows.length === 0 && (
              <p style={{ color: "var(--slate)", padding: "12px 0" }}>
                Belum ada pengerjaan hari ini.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default KapsterDashboard
