import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser, Role } from "../../types"
import { apiLaporan, getToken, RingkasanLaporan } from "../../api"

export function WhatsAppDialog({
  onClose,
  title,
  text,
}: {
  onClose: () => void
  title: string
  text: string
}) {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(
    `*Eastville Barbershop — ${title}*\n\n${text}\n\n_Dibuat otomatis oleh Sistem Eastville_`,
  )}`

  return (
    <div className="modal-overlay">
      <section className="simple-modal whatsapp-modal">
        <header>
          <h2>{title}</h2>
          <Button type="button" onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>
        <pre style={{ whiteSpace: "pre-wrap", background: "var(--bone)", padding: 12, borderRadius: 8, fontSize: 13 }}>
          *Eastville Barbershop*{"\n"}
          {text}
          {"\n\n"}Penjualan batal/void tidak dihitung.
        </pre>
        <footer>
          <Button className="secondary-button" type="button" onClick={onClose}>
            Kembali
          </Button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-button"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="whatsapp" /> Buka WhatsApp
          </a>
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

  const [mode, setMode] = useState<"Harian" | "Bulanan">("Bulanan")
  const [data, setData] = useState<RingkasanLaporan>({
    totalOmset: 48750000,
    totalDiskon: 0,
    totalBayarTunai: 31420000,
    totalBayarQris: 17330000,
    totalKomisi: 18650000,
    totalPengeluaran: 8420000,
    sisaOwner: 21680000,
    jumlahTransaksi: 124,
    pengeluaranKategori: {
      Perlengkapan: 4200000,
      Listrik: 1500000,
      Sewa: 2000000,
      "Lain-lain": 720000,
    },
    harian: [],
  })
  const [loading, setLoading] = useState(false)

  // Rentang tanggal
  const today = new Date().toISOString().slice(0, 10)
  const [dari, setDari] = useState(
    mode === "Harian" ? today : today.slice(0, 7) + "-01",
  )
  const [sampai, setSampai] = useState(today)

  async function loadReport(fromVal = dari, toVal = sampai) {
    if (!getToken()) return
    setLoading(true)
    try {
      const res = await apiLaporan.ringkasan({ dari: fromVal, sampai: toVal })
      setData(res)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport(dari, sampai)
  }, [dari, sampai])

  function handleModeChange(m: "Harian" | "Bulanan") {
    setMode(m)
    if (m === "Harian") {
      setDari(today)
      setSampai(today)
    } else {
      setDari(today.slice(0, 7) + "-01")
      setSampai(today)
    }
  }

  function exportCsv() {
    let csv = "\uFEFFTanggal,Omset,Tunai,QRIS,Jumlah Transaksi\n"
    if (data.harian.length > 0) {
      data.harian.forEach((h) => {
        csv += `"${h.tanggal}",${h.omset},${h.tunai},${h.qris},${h.count}\n`
      })
    } else {
      csv += `"${dari} s/d ${sampai}",${data.totalOmset},${data.totalBayarTunai},${data.totalBayarQris},${data.jumlahTransaksi}\n`
    }
    csv += `\nRingkasan:\nTotal Omset,${data.totalOmset}\nTotal Pengeluaran,${data.totalPengeluaran}\nTotal Komisi,${data.totalKomisi}\nSisa Bersih,${data.sisaOwner}\n`

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Laporan_Eastville_${dari}_sd_${sampai}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reportText = `Periode: ${dari} s/d ${sampai}
Jumlah Transaksi: ${data.jumlahTransaksi}
Total Pemasukan: ${rupiah(data.totalOmset)}
• Tunai: ${rupiah(data.totalBayarTunai)}
• QRIS: ${rupiah(data.totalBayarQris)}
Total Pengeluaran: ${rupiah(data.totalPengeluaran)}
Total Komisi: ${rupiah(data.totalKomisi)}
-----------------------------
${isManager ? "Laba Bersih" : "Sisa untuk Owner"}: ${rupiah(data.sisaOwner)}`

  return (
    <div className="content">
      <div className="report-toolbar">
        <div className="segmented">
          <Button
            className={mode === "Harian" ? "active" : ""}
            onClick={() => handleModeChange("Harian")}
          >
            Harian
          </Button>
          <Button
            className={mode === "Bulanan" ? "active" : ""}
            onClick={() => handleModeChange("Bulanan")}
          >
            Bulanan
          </Button>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)" }}
          />
          <span>s/d</span>
          <input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)" }}
          />
        </div>

        <div>
          <Button className="secondary-button" onClick={exportCsv}>
            Export Excel (CSV)
          </Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>

      {loading && <p style={{ color: "var(--muted)", margin: "10px 0" }}>Menghitung laporan dari database...</p>}

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
          detail={`${Object.keys(data.pengeluaranKategori).length} kategori aktif`}
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
          label={isManager ? "Laba Bersih" : "Sisa Owner"}
          tone="dark"
          value={rupiah(data.sisaOwner)}
          detail={`${data.jumlahTransaksi} transaksi sukses`}
        />
      </div>

      {data.harian.length > 0 && (
        <section className="panel report-table" style={{ marginTop: 20 }}>
          <PageTitle eyebrow="Rincian tanggal" title="Arus Kas Harian" />
          <div className="report-head">
            <span>Tanggal</span>
            <span>Jumlah Trx</span>
            <span>Tunai / QRIS</span>
            <span>Total Omset</span>
          </div>
          {data.harian.map((h) => (
            <div className="report-row" key={h.tanggal}>
              <strong>{h.tanggal}</strong>
              <span>{h.count} transaksi</span>
              <span>{rupiah(h.tunai)} / {rupiah(h.qris)}</span>
              <b>{rupiah(h.omset)}</b>
            </div>
          ))}
        </section>
      )}

      {Object.keys(data.pengeluaranKategori).length > 0 && (
        <section className="panel report-table" style={{ marginTop: 20 }}>
          <PageTitle eyebrow="Biaya operasional" title="Rincian Pengeluaran per Kategori" />
          <div className="report-head">
            <span>Kategori</span>
            <span>Porsi</span>
            <span>Status</span>
            <span>Nominal</span>
          </div>
          {Object.entries(data.pengeluaranKategori).map(([kat, jml]) => {
            const pct = data.totalPengeluaran > 0 ? Math.round((jml / data.totalPengeluaran) * 100) : 0
            return (
              <div className="report-row" key={kat}>
                <strong>{kat}</strong>
                <span>{pct}% dari total</span>
                <i className="chip lunas">Aktif</i>
                <b style={{ color: "var(--oxblood)" }}>− {rupiah(jml)}</b>
              </div>
            )
          })}
        </section>
      )}

      {wa && (
        <WhatsAppDialog
          onClose={() => setWa(false)}
          title={`Laporan ${mode}`}
          text={reportText}
        />
      )}
    </div>
  )
}

export default ReportsPage
