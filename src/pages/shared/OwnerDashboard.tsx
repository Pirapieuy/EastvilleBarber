import { useEffect, useState } from "react"
import { apiLaporan, getToken, LaporanKeuangan } from "../../api"
import { BarChart } from "../../components/common/BarChart"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { IconName } from "../../types"

const pad = (n: number) => String(n).padStart(2, "0")

/** Rentang bulan berjalan (sampai hari ini) dan bulan lalu penuh. */
function rentangBulan() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return {
    ini: { dari: iso(new Date(y, m, 1)), sampai: iso(now) },
    lalu: { dari: iso(new Date(y, m - 1, 1)), sampai: iso(new Date(y, m, 0)) },
    namaBulan: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
  }
}

function selisih(sekarang: number, lalu: number, naik = "dari bulan lalu") {
  if (!lalu) return sekarang ? "Belum ada pembanding bulan lalu" : "Belum ada data"
  const persen = ((sekarang - lalu) / lalu) * 100
  return `${persen >= 0 ? "+" : "−"}${Math.abs(persen).toFixed(1).replace(".", ",")}% ${naik}`
}

export function OwnerDashboard({
  onNavigate,
  navigate,
}: {
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  const nav = onNavigate ?? navigate ?? (() => {})
  const [data, setData] = useState<LaporanKeuangan | null>(null)
  const [lalu, setLalu] = useState<LaporanKeuangan | null>(null)
  const [liveError, setLiveError] = useState("")
  const [{ ini, lalu: rentangLalu, namaBulan }] = useState(rentangBulan)

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    Promise.all([apiLaporan.keuangan(ini), apiLaporan.keuangan(rentangLalu)])
      .then(([a, b]) => {
        setData(a)
        setLalu(b)
      })
      .catch((e) => {
        console.error("Gagal memuat beranda:", e)
        setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
  }, [])

  if (Boolean(getToken()) && !data && !liveError) {
    return (
      <div className="content">
        <p>Memuat beranda...</p>
      </div>
    )
  }

  const d: LaporanKeuangan = data ?? {
    pemasukan: 0, tunai: 0, qris: 0, pengeluaran: 0, komisi: 0, sisa: 0,
    jumlahTransaksi: 0, perHari: [], perKapster: [], stokMenipis: [],
  }
  const b = lalu ?? d
  const perhatian: { icon: IconName; title: string; text: string; page?: string }[] = d.stokMenipis.length
    ? [
        {
          icon: "product",
          title: "Stok produk menipis",
          text: d.stokMenipis.map((p) => `${p.nama} (${p.stok})`).join(", "),
          page: "MasterProduk",
        },
      ]
    : []

  return (
    <div className="content">
      <DemoNotice live={Boolean(data)} error={liveError} />
      <PageTitle
        eyebrow={`Ringkasan operasional · ${namaBulan}`}
        title="Selamat datang, Owner."
        action={
          <div className="page-actions">
            <Button
              className="secondary-button"
              onClick={() => nav("RekapManual")}
            >
              <Icon name="pencil" /> Rekap Manual
            </Button>
            <Button
              className="primary-button"
              onClick={() => nav("Pengeluaran")}
            >
              <Icon name="expense" /> Catat Pengeluaran
            </Button>
          </div>
        }
      />
      <div className="kpi-grid">
        <Kpi
          icon="cash"
          label="Pemasukan"
          tone="sage"
          value={rupiah(d.pemasukan)}
          detail={data ? selisih(d.pemasukan, b.pemasukan) : "Data demo"}
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value={rupiah(d.pengeluaran)}
          detail={data ? selisih(d.pengeluaran, b.pengeluaran) : "Data demo"}
        />
        <Kpi
          icon="people"
          label="Total Komisi"
          tone="brass"
          value={rupiah(d.komisi)}
          detail="Layanan + produk"
        />
        <Kpi
          icon="wallet"
          label="Sisa untuk Owner"
          tone="dark"
          value={rupiah(d.sisa)}
          detail={data ? selisih(d.sisa, b.sisa) : "Data demo"}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <PageTitle eyebrow="Arus pemasukan" title="Pemasukan harian" />
          <div className="split-summary">
            <div>
              <i className="dot sage-dot" />
              <span>
                Tunai<strong>{rupiah(d.tunai)}</strong>
              </span>
            </div>
            <div>
              <i className="dot brass-dot" />
              <span>
                QRIS<strong>{rupiah(d.qris)}</strong>
              </span>
            </div>
          </div>
          <BarChart data={d.perHari.map((h) => ({ label: h.tanggal.slice(8), value: h.total }))} />
        </section>
        <section className="panel attention">
          <PageTitle eyebrow="Tindakan diperlukan" title="Perlu perhatian" />
          {perhatian.length === 0 && (
            <p style={{ color: "var(--slate)", fontSize: 13 }}>Tidak ada yang perlu ditindaklanjuti.</p>
          )}
          {perhatian.map((x) => (
            <button key={x.title} onClick={() => x.page && nav(x.page)}>
              <span>
                <Icon name={x.icon} />
              </span>
              <div>
                <strong>{x.title}</strong>
                <small>{x.text}</small>
              </div>
              <Icon name="arrow" />
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}

export default OwnerDashboard
