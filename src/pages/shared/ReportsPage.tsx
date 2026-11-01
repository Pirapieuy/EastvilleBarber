import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser, Role } from "../../types"

export const barberReport = [
  ["Seva", 124, 12480000, 4992000],
  ["Tata", 97, 9730000, 3892000],
  ["Faisal", 57, 6040000, 2416000],
  ["Fadhil", 111, 11250000, 4500000],
  ["Ferdi", 86, 8750000, 3500000],
]

export function WhatsAppDialog({
  onClose,
  title,
  text,
}: {
  onClose: () => void
  title: string
  text: string
}) {
  return (
    <div className="modal-overlay">
      <section className="simple-modal whatsapp-modal">
        <header>
          <h2>{title}</h2>
          <Button onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>
        <pre>
          *Eastville Barbershop*{"\n"}
          {text}
          {"\n\n"}Penjualan batal tidak dihitung.
        </pre>
        <footer>
          <Button className="secondary-button" onClick={onClose}>
            Kembali
          </Button>
          <Button className="whatsapp-button" onClick={onClose}>
            <Icon name="whatsapp" /> Buka WhatsApp
          </Button>
        </footer>
      </section>
    </div>
  )
}

export function ReportsPage({
  currentUser,
  role,
}: {
  currentUser?: AppUser
  role?: Role
} = {}) {
  const [wa, setWa] = useState(false)
  const isManager = (role ?? currentUser?.role) === "Manajer"

  return (
    <div className="content">
      <div className="report-toolbar">
        <div className="segmented">
          <Button>Harian</Button>
          <Button className="active">Bulanan</Button>
        </div>
        <select>
          <option>Oktober 2026</option>
        </select>
        <div>
          <Button className="secondary-button">Excel</Button>
          <Button className="secondary-button">PDF</Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>
      <div className="kpi-grid">
        <Kpi
          icon="cash"
          label="Pemasukan"
          tone="sage"
          value="Rp 48.750.000"
          detail="Tunai 31,42 jt · QRIS 17,33 jt"
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value="Rp 8.420.000"
          detail="Oktober 2026"
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
          label={isManager ? "Laba Bersih" : "Sisa Owner"}
          tone="dark"
          value="Rp 21.680.000"
          detail="Setelah semua biaya"
        />
      </div>
      <section className="panel report-chart">
        <PageTitle eyebrow="Tren pemasukan" title="Pemasukan per hari" />
        <div className="bar-chart large">
          {[42, 58, 46, 72, 62, 84, 54, 91, 66, 78, 96, 74, 82, 59, 89, 71].map(
            (_, i) => (
              <span className={`chart-bar b${(i % 12) + 1}`} key={i}>
                <i />
                <b />
              </span>
            ),
          )}
        </div>
      </section>
      <section className="panel report-table">
        <PageTitle eyebrow="Kinerja tim" title="Rincian per kapster" />
        <div className="report-head">
          <span>Kapster</span>
          <span>Pelanggan</span>
          <span>Omzet</span>
          <span>Komisi</span>
        </div>
        {barberReport.map((x) => (
          <div className="report-row" key={x[0]}>
            <strong>{x[0]}</strong>
            <span>{x[1]} orang</span>
            <b>{rupiah(Number(x[2]))}</b>
            <b>{rupiah(Number(x[3]))}</b>
          </div>
        ))}
      </section>
      {wa && (
        <WhatsAppDialog
          onClose={() => setWa(false)}
          title="Laporan Bulanan"
          text={`Pemasukan: Rp 48.750.000\nPengeluaran: Rp 8.420.000\nKomisi: Rp 18.650.000\nSisa Owner: Rp 21.680.000`}
        />
      )}
    </div>
  )
}

export default ReportsPage
