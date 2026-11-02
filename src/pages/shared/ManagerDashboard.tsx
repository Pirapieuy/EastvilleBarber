import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser } from "../../types"
import { apiLaporan, getToken, RingkasanLaporan } from "../../api"

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
  const [data, setData] = useState<RingkasanLaporan>({
    totalOmset: 2450000,
    totalDiskon: 0,
    totalBayarTunai: 1150000,
    totalBayarQris: 1300000,
    totalKomisi: 980000,
    totalPengeluaran: 320000,
    sisaOwner: 1150000,
    jumlahTransaksi: 14,
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
        eyebrow="Operasional Harian"
        title={`Selamat pagi, ${firstName}.`}
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
          detail={`Tunai ${rupiah(data.totalBayarTunai)} · QRIS ${rupiah(data.totalBayarQris)}`}
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
          label="Komisi Kapster"
          tone="brass"
          value={rupiah(data.totalKomisi)}
          detail="Total komisi tim"
        />
        <Kpi
          icon="wallet"
          label="Laba Bersih"
          tone="dark"
          value={rupiah(data.sisaOwner)}
          detail={`${data.jumlahTransaksi} transaksi sukses`}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <PageTitle eyebrow="Operasional" title="Arus Pemasukan" />
          <div className="split-summary">
            <div>
              <i className="dot sage-dot" />
              <span>
                Tunai: <strong>{rupiah(data.totalBayarTunai)}</strong>
              </span>
            </div>
            <div>
              <i className="dot brass-dot" />
              <span>
                QRIS: <strong>{rupiah(data.totalBayarQris)}</strong>
              </span>
            </div>
          </div>
          <div className="bar-chart">
            {[45, 60, 52, 70, 85, 65, 78].map((h, i) => (
              <div key={i} className="bar-col">
                <div className="bar-fill" style={{ height: `${h}%` }} />
                <span>Hari {i + 1}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel attention">
          <PageTitle eyebrow="Tindakan Diperlukan" title="Perhatian Toko" />
          <div className="attention-item">
            <span className="dot amber-dot" />
            <div>
              <strong>Stok Produk</strong>
              <small>Pantau stok pomade & perlengkapan</small>
            </div>
            <Button className="text-button" onClick={() => nav("MasterProduk")}>
              Lihat
            </Button>
          </div>
          <div className="attention-item">
            <span className="dot sage-dot" />
            <div>
              <strong>Absensi & Jadwal</strong>
              <small>Cek kehadiran kapster hari ini</small>
            </div>
            <Button className="text-button" onClick={() => nav("AbsensiTim")}>
              Lihat
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ManagerDashboard
