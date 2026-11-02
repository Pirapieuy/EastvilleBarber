import { useEffect, useState } from "react"
import { apiLaporan, getToken, LaporanKeuangan } from "../../api"
import { BarChart } from "../../components/common/BarChart"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { eksporExcel, eksporPdf, TabelEkspor } from "../../components/common/exportTable"
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

const demoLaporan: LaporanKeuangan = {
  pemasukan: 48750000,
  tunai: 31420000,
  qris: 17330000,
  pengeluaran: 8420000,
  komisi: 18650000,
  sisa: 21680000,
  jumlahTransaksi: 475,
  perHari: [],
  perKapster: barberReport.map((r) => ({
    kapsterId: String(r[0]),
    kapster: String(r[0]),
    pelanggan: Number(r[1]),
    omzet: Number(r[2]),
    komisi: Number(r[3]),
  })),
  stokMenipis: [],
}

const pad = (n: number) => String(n).padStart(2, "0")
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Rentang yyyy-MM-dd untuk mode harian (tanggal) atau bulanan (yyyy-MM). */
export function rentangLaporan(mode: "Harian" | "Bulanan", tanggal: string, bulan: string) {
  if (mode === "Harian") return { dari: tanggal, sampai: tanggal }
  const [y, m] = bulan.split("-").map(Number)
  const akhir = new Date(y, m, 0).getDate()
  return { dari: `${bulan}-01`, sampai: `${bulan}-${pad(akhir)}` }
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
  const [mode, setMode] = useState<"Harian" | "Bulanan">("Bulanan")
  const [tanggal, setTanggal] = useState(() => isoDate(new Date()))
  const [bulan, setBulan] = useState(() => isoDate(new Date()).slice(0, 7))
  const [data, setData] = useState<LaporanKeuangan>(demoLaporan)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    let batal = false
    setFetching(true)
    apiLaporan
      .keuangan(rentangLaporan(mode, tanggal, bulan))
      .then((d) => {
        if (batal) return
        setData(d)
        setLive(true)
        setLiveError("")
      })
      .catch((e) => {
        console.error("Gagal memuat laporan keuangan:", e)
        if (!batal) setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
      .finally(() => !batal && setFetching(false))
    return () => {
      batal = true
    }
  }, [mode, tanggal, bulan])

  if (Boolean(getToken()) && !live && !liveError) {
    return (
      <div className="content">
        <p>Memuat laporan...</p>
      </div>
    )
  }

  const juta = (n: number) => rupiah(n)
  const periode = mode === "Harian" ? tanggal : bulan
  const chart = data.perHari.map((h) => ({ label: h.tanggal.slice(8), value: h.total }))
  const ringkasWa = `Periode: ${periode}\nPemasukan: ${juta(data.pemasukan)}\nPengeluaran: ${juta(data.pengeluaran)}\nKomisi: ${juta(data.komisi)}\n${isManager ? "Laba Bersih" : "Sisa Owner"}: ${juta(data.sisa)}`

  const tabelEkspor = (): TabelEkspor => ({
    berkas: `laporan-keuangan-${periode}`,
    judul: "Laporan Keuangan",
    keterangan: `Periode ${periode} · ${data.jumlahTransaksi} transaksi · Pemasukan ${data.pemasukan} · Pengeluaran ${data.pengeluaran} · Komisi ${data.komisi} · ${isManager ? "Laba Bersih" : "Sisa Owner"} ${data.sisa}`,
    kolom: ["Kapster", "Transaksi", "Omzet", "Komisi"],
    baris: data.perKapster.map((k) => [k.kapster, k.pelanggan, k.omzet, k.komisi]),
  })

  return (
    <div className="content">
      <DemoNotice live={live} error={liveError} />
      <div className="report-toolbar">
        <div className="segmented">
          <Button className={mode === "Harian" ? "active" : ""} onClick={() => setMode("Harian")}>
            Harian
          </Button>
          <Button className={mode === "Bulanan" ? "active" : ""} onClick={() => setMode("Bulanan")}>
            Bulanan
          </Button>
        </div>
        {mode === "Harian" ? (
          <input type="date" value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)} />
        ) : (
          <input type="month" value={bulan} onChange={(e) => e.target.value && setBulan(e.target.value)} />
        )}
        <div>
          <Button className="secondary-button" onClick={() => eksporExcel(tabelEkspor())}>Excel</Button>
          <Button className="secondary-button" onClick={() => eksporPdf(tabelEkspor())}>PDF</Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>
      <div className="kpi-grid" style={fetching ? { opacity: 0.6 } : undefined}>
        <Kpi
          icon="cash"
          label="Pemasukan"
          tone="sage"
          value={rupiah(data.pemasukan)}
          detail={`Tunai ${rupiah(data.tunai)} · QRIS ${rupiah(data.qris)}`}
        />
        <Kpi
          icon="expense"
          label="Pengeluaran"
          tone="amber"
          value={rupiah(data.pengeluaran)}
          detail={periode}
        />
        <Kpi
          icon="people"
          label="Total Komisi"
          tone="brass"
          value={rupiah(data.komisi)}
          detail="Layanan + produk"
        />
        <Kpi
          icon="wallet"
          label={isManager ? "Laba Bersih" : "Sisa Owner"}
          tone="dark"
          value={rupiah(data.sisa)}
          detail="Setelah komisi & pengeluaran"
        />
      </div>
      <section className="panel report-chart">
        <PageTitle eyebrow="Tren pemasukan" title="Pemasukan per hari" />
        {live ? <BarChart data={chart} /> : <p style={{ color: "var(--slate)" }}>Grafik tersedia setelah login ke server.</p>}
      </section>
      <section className="panel report-table">
        <PageTitle eyebrow="Kinerja tim" title="Rincian per kapster" />
        <div className="report-head">
          <span>Kapster</span>
          <span>Pelanggan</span>
          <span>Omzet</span>
          <span>Komisi</span>
        </div>
        {data.perKapster.map((k) => (
          <div className="report-row" key={k.kapsterId + k.kapster}>
            <strong>{k.kapster}</strong>
            <span>{k.pelanggan} transaksi</span>
            <b>{rupiah(k.omzet)}</b>
            <b>{rupiah(k.komisi)}</b>
          </div>
        ))}
        {data.perKapster.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--slate)" }}>
            Belum ada transaksi pada periode ini.
          </div>
        )}
      </section>
      {wa && <WhatsAppDialog onClose={() => setWa(false)} title="Laporan Keuangan" text={ringkasWa} />}
    </div>
  )
}

export default ReportsPage
