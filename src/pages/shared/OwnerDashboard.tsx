import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle } from "../../components/common/UI"
import { IconName } from "../../types"

export function OwnerDashboard({
  onNavigate,
  navigate,
}: {
  onNavigate?: (page: string) => void
  navigate?: (page: string) => void
} = {}) {
  const nav = onNavigate ?? navigate ?? (() => {})

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
          value="Rp 48.750.000"
          detail="+12,4% dari bulan lalu"
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value="Rp 8.420.000"
          detail="Turun 4,8%"
        />
        <Kpi
          icon="people"
          label="Total Komisi"
          tone="brass"
          value="Rp 18.650.000"
          detail="Layanan + produk"
        />
        <Kpi
          icon="wallet"
          label="Sisa untuk Owner"
          tone="dark"
          value="Rp 21.680.000"
          detail="+16,1% bulan ini"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <PageTitle eyebrow="Arus pemasukan" title="Pemasukan harian" />
          <div className="split-summary">
            <div>
              <i className="dot sage-dot" />
              <span>
                Tunai<strong>Rp 31.420.000</strong>
              </span>
            </div>
            <div>
              <i className="dot brass-dot" />
              <span>
                QRIS<strong>Rp 17.330.000</strong>
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
          {[
            {
              icon: "product" as IconName,
              title: "Stok produk menipis",
              text: "2 produk perlu ditambah",
            },
            {
              icon: "camera" as IconName,
              title: "Kendala absensi",
              text: "1 laporan menunggu",
            },
            {
              icon: "wallet" as IconName,
              title: "Gaji belum dibayar",
              text: "3 kapster periode ini",
            },
          ].map((x) => (
            <button key={x.title}>
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
