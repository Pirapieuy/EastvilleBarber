import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { apiLaporan, getToken, RingkasanLaporan } from "../../api"

export function OwnerDashboard({
  onNavigate,
  navigate,
}: {
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  const nav = onNavigate ?? navigate ?? (() => {})
  const [data, setData] = useState<RingkasanLaporan>({
    totalOmset: 48750000,
    totalDiskon: 0,
    totalBayarTunai: 31420000,
    totalBayarQris: 17330000,
    totalKomisi: 18650000,
    totalPengeluaran: 8420000,
    sisaOwner: 21680000,
    jumlahTransaksi: 124,
    pengeluaranKategori: {},
    harian: [],
  })

  useEffect(() => {
    if (!getToken()) return
    apiLaporan.ringkasan().then(setData).catch(() => {})
  }, [])

  return (
    <div className="content">
      <PageTitle
        eyebrow="Ringkasan operasional"
        title="Selamat pagi, Ardi (Owner Eastville)."
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
          value={rupiah(data.totalOmset)}
          detail={`${data.jumlahTransaksi} transaksi tercatat`}
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value={rupiah(data.totalPengeluaran)}
          detail="Operasional berjalan"
        />
        <Kpi
          icon="people"
          label="Total Komisi"
          tone="brass"
          value={rupiah(data.totalKomisi)}
          detail="Layanan + produk kapster"
        />
        <Kpi
          icon="wallet"
          label="Sisa untuk Owner"
          tone="dark"
          value={rupiah(data.sisaOwner)}
          detail="Laba bersih setelah semua biaya"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <PageTitle eyebrow="Arus pemasukan" title="Pemasukan harian" />
          <div className="split-summary">
            <div>
              <i className="dot sage-dot" />
              <span>
                Tunai<strong>{rupiah(data.totalBayarTunai)}</strong>
              </span>
            </div>
            <div>
              <i className="dot brass-dot" />
              <span>
                QRIS<strong>{rupiah(data.totalBayarQris)}</strong>
              </span>
            </div>
          </div>
          <div className="bar-chart">
            {[42, 58, 46, 72, 62, 84, 54, 91, 66, 78, 96, 74].map((_, i) => (
              <span className={`chart-bar b${i + 1}`} key={i}>
                <i />
                <b />
              </span>
            ))}
          </div>
          <div className="chart-labels">
            <span>1 Okt</span>
            <span>7 Okt</span>
            <span>14 Okt</span>
            <span>21 Okt</span>
            <span>29 Okt</span>
          </div>
        </section>
        <section className="panel attention">
          <PageTitle eyebrow="Tindakan diperlukan" title="Perlu perhatian" />
          <div className="attention-item">
            <span className="dot amber-dot" />
            <div>
              <strong>Stok produk menipis</strong>
              <small>Periksa stok di Master Produk</small>
            </div>
            <Button
              className="text-button"
              onClick={() => nav("MasterProduk")}
            >
              Lihat
            </Button>
          </div>
          <div className="attention-item">
            <span className="dot sage-dot" />
            <div>
              <strong>Absensi & kehadiran tim</strong>
              <small>Pastikan kapster sudah check-in harian</small>
            </div>
            <Button
              className="text-button"
              onClick={() => nav("AbsensiAdmin")}
            >
              Lihat
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default OwnerDashboard
