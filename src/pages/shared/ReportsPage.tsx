import { TANGGAL_MAKS, TANGGAL_MULAI } from "../../utils/tanggal"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { apiLaporan, apiPengeluaran, getToken, LaporanKeuangan } from "../../api"
import { BarChart } from "../../components/common/BarChart"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { eksporExcel, eksporPdf, TabelEkspor } from "../../components/common/exportTable"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser, Role } from "../../types"
import { ProductDetail, CompactDetail, ProductTransactionRecord, INITIAL_PRODUCT_TRANSACTIONS } from "./ProductReportsPage"

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
          <Button
            className="whatsapp-button"
            onClick={() => {
              const pesan = `*Eastville Barbershop*\n${text}\n\nPenjualan batal tidak dihitung.`
              window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, "_blank", "noopener")
              onClose()
            }}
          >
            <Icon name="whatsapp" /> Buka WhatsApp
          </Button>
        </footer>
      </section>
    </div>
  )
}

// Dengan token (data asli) laporan dimulai dari nol, bukan angka contoh.
const laporanKosong: LaporanKeuangan = {
  pemasukan: 0, tunai: 0, qris: 0, pengeluaran: 0, komisi: 0, sisa: 0,
  jumlahTransaksi: 0, perHari: [], perKapster: [], stokMenipis: [],
}

const demoLaporan: LaporanKeuangan = {
  pemasukan: 48750000,
  tunai: 31420000,
  qris: 17330000,
  pengeluaran: 8420000,
  komisi: 18650000,
  sisa: 21680000,
  jumlahTransaksi: 475,
  perHari: [
    { tanggal: "2026-10-01", total: 1540000, tunai: 980000, qris: 560000 },
    { tanggal: "2026-10-05", total: 1820000, tunai: 1200000, qris: 620000 },
    { tanggal: "2026-10-10", total: 2100000, tunai: 1400000, qris: 700000 },
    { tanggal: "2026-10-15", total: 1650000, tunai: 1050000, qris: 600000 },
    { tanggal: "2026-10-20", total: 1950000, tunai: 1150000, qris: 800000 },
    { tanggal: "2026-10-25", total: 2300000, tunai: 1500000, qris: 800000 },
    { tanggal: "2026-10-29", total: 1850000, tunai: 1050000, qris: 800000 },
  ],
  perKapster: barberReport.map((r) => ({
    kapsterId: String(r[0]),
    kapster: String(r[0]),
    pelanggan: Number(r[1]),
    omzet: Number(r[2]),
    komisi: Number(r[3]),
  })),
  stokMenipis: [],
}

interface ExpenseRecord {
  id: string
  date: string
  category: "Perlengkapan" | "Listrik" | "Air" | "Sewa" | "Lain-lain"
  description: string
  amount: number
  status: "Aktif" | "BATAL"
  cancelReason?: string
  dateIso?: string
}

const initialExpenses: ExpenseRecord[] = [
  { id: "exp-1", date: "29 Okt", category: "Perlengkapan", description: "Pisau cukur dan sarung tangan", amount: 485000, status: "Aktif" },
  { id: "exp-2", date: "28 Okt", category: "Listrik", description: "Token listrik Oktober", amount: 750000, status: "Aktif" },
  { id: "exp-3", date: "26 Okt", category: "Air", description: "Tagihan PDAM Oktober", amount: 215000, status: "Aktif" },
  { id: "exp-4", date: "24 Okt", category: "Sewa", description: "Sewa tempat bulan November", amount: 3500000, status: "Aktif" },
  { id: "exp-5", date: "22 Okt", category: "Lain-lain", description: "Konsumsi rapat tim", amount: 280000, status: "BATAL", cancelReason: "Salah nominal" },
  { id: "exp-6", date: "15 Okt", category: "Perlengkapan", description: "Handuk dan shampoo salon", amount: 640000, status: "Aktif" },
]

const pad = (n: number) => String(n).padStart(2, "0")
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Rentang yyyy-MM-dd untuk mode harian (tanggal) atau bulanan (yyyy-MM). */
export function rentangLaporan(mode: "Harian" | "Mingguan" | "Bulanan", tanggal: string, bulan: string) {
  if (mode === "Harian") return { dari: tanggal, sampai: tanggal }
  if (mode === "Mingguan") {
    // Senin-Minggu pada pekan yang memuat `tanggal`
    const d = new Date(`${tanggal}T00:00:00`)
    const senin = new Date(d)
    senin.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const minggu = new Date(senin)
    minggu.setDate(senin.getDate() + 6)
    return { dari: isoDate(senin), sampai: isoDate(minggu) }
  }
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
  const [mode, setMode] = useState<"Harian" | "Mingguan" | "Bulanan">("Bulanan")
  const [reloadKey, setReloadKey] = useState(0)
  const [tanggal, setTanggal] = useState(() => isoDate(new Date()))
  const [bulan, setBulan] = useState(() => isoDate(new Date()).slice(0, 7))
  const [data, setData] = useState<LaporanKeuangan>(getToken() ? laporanKosong : demoLaporan)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [fetching, setFetching] = useState(false)
  const [productLiveError, setProductLiveError] = useState("")

  // Interactive Tab: pemasukan | pengeluaran | komisi | sisa
  const [subTab, setSubTab] = useState<"pemasukan" | "pengeluaran" | "komisi" | "sisa">("pemasukan")
  const [productTab, setProductTab] = useState<"transaksi" | "koreksi" | "ringkasan">("transaksi")
  const [productList, setProductList] = useState<ProductTransactionRecord[]>(getToken() ? [] : INITIAL_PRODUCT_TRANSACTIONS)
  const [productLive, setProductLive] = useState(false)

  // Expenses management state
  const [expensesList, setExpensesList] = useState<ExpenseRecord[]>(getToken() ? [] : initialExpenses)
  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [expCategory, setExpCategory] = useState<string>("Lain-lain")
  const [expAmount, setExpAmount] = useState("")
  const [expDescription, setExpDescription] = useState("")
  const [expDate, setExpDate] = useState(() => isoDate(new Date()))
  const [expSearch, setExpSearch] = useState("")

  useEffect(() => {
    if (!getToken()) return
    let batal = false
    setFetching(true)
    Promise.all([
      apiLaporan.keuangan(rentangLaporan(mode, tanggal, bulan)),
      apiPengeluaran.list().catch(() => []),
    ])
      .then(([d, exp]) => {
        if (batal) return
        setData(d)
        if (Array.isArray(exp) && exp.length > 0) {
          setExpensesList(exp as ExpenseRecord[])
        }
        setLive(true)
        setLiveError("")
      })
      .catch((e) => {
        console.error("Gagal memuat laporan keuangan:", e)
        // Data periode sebelumnya tidak boleh tampil di bawah periode baru
        if (!batal) {
          setLive(false)
          setLiveError(e instanceof Error ? e.message : "gagal memuat data")
        }
      })
      .finally(() => !batal && setFetching(false))
    return () => {
      batal = true
    }
  }, [mode, tanggal, bulan, reloadKey])

  useEffect(() => {
    if (!getToken()) {
      setProductLiveError("belum login ke server (token tidak ada)")
      return
    }
    let batal = false
    apiLaporan
      .produk({ dari: rentangLaporan(mode, tanggal, bulan).dari, sampai: rentangLaporan(mode, tanggal, bulan).sampai })
      .then((rows) => {
        if (batal) return
        setProductList(rows as ProductTransactionRecord[])
        setProductLive(true)
        setProductLiveError("")
      })
      .catch((e) => {
        console.error("Gagal memuat laporan produk:", e)
        if (!batal) setProductLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
    return () => {
      batal = true
    }
  }, [mode, tanggal, bulan])
  const gagalMuat = Boolean(getToken()) && !live && Boolean(liveError)
  if (gagalMuat) {
    return (
      <div className="content">
        <DemoNotice live={live} error={liveError} />
        <p>Laporan gagal dimuat: {liveError}</p>
        <Button className="primary-button" onClick={() => setReloadKey((k) => k + 1)}>
          Coba lagi
        </Button>
      </div>
    )
  }

  const juta = (n: number) => rupiah(n)
  const rentang = rentangLaporan(mode, tanggal, bulan)
  const periode =
    mode === "Harian" ? tanggal : mode === "Mingguan" ? `${rentang.dari} s/d ${rentang.sampai}` : bulan
  const chart = data.perHari.map((h) => ({ label: h.tanggal.slice(8), value: h.total }))
  const ringkasWa = `Periode: ${periode}\nPemasukan: ${juta(data.pemasukan)}\nPengeluaran: ${juta(data.pengeluaran)}\nKomisi: ${juta(data.komisi)}\n${isManager ? "Laba Bersih" : "Sisa Owner"}: ${juta(data.sisa)}`

  const tabelEkspor = (): TabelEkspor => ({
    berkas: `laporan-keuangan-${periode}`,
    judul: "Laporan Keuangan",
    keterangan: `Periode ${periode} · ${data.jumlahTransaksi} transaksi · Pemasukan ${data.pemasukan} · Pengeluaran ${data.pengeluaran} · Komisi ${data.komisi} · ${isManager ? "Laba Bersih" : "Sisa Owner"} ${data.sisa}`,
    kolom: ["Kapster", "Transaksi", "Omzet", "Komisi"],
    baris: [
      ...data.perKapster.map((k): (string | number)[] => [k.kapster, k.pelanggan, k.omzet, k.komisi]),
      ["", "", "", ""],
      ["Ringkasan", "Tunai", "QRIS", "Total"],
      ["Pemasukan", data.tunai, data.qris, data.pemasukan],
      ["Pengeluaran", "", "", data.pengeluaran],
      ["Komisi", "", "", data.komisi],
      [isManager ? "Laba Bersih" : "Sisa Owner", "", "", data.sisa],
      ["", "", "", ""],
      ["Tanggal", "Pemasukan", "", ""],
      ...data.perHari.map((h): (string | number)[] => [h.tanggal, h.total, "", ""]),
    ],
  })

  // Expense Handlers
  async function handleCreateExpense(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = Number(expAmount.replace(/\D/g, "")) || 0
    if (!parsedAmount || !expDescription.trim()) return

    if (live) {
      try {
        await         apiPengeluaran.create({
          tanggal: expDate,
          kategori: expCategory as any,
          deskripsi: expDescription.trim(),
          jumlah: parsedAmount,
        })
        const updated = await apiPengeluaran.list()
        setExpensesList(updated as ExpenseRecord[])
        setExpAmount("")
        setExpDescription("")
        setExpenseFormOpen(false)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Gagal menyimpan pengeluaran.")
      }
      return
    }

    const newRec: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: expDate.slice(5),
      category: (expCategory as ExpenseRecord["category"]) || "Lain-lain",
      description: expDescription.trim(),
      amount: parsedAmount,
      status: "Aktif",
    }
    setExpensesList([newRec, ...expensesList])
    setExpAmount("")
    setExpDescription("")
    setExpenseFormOpen(false)
  }

  async function handleToggleExpenseStatus(id: string) {
    if (live) {
      const item = expensesList.find((r) => r.id === id)
      if (!item) return
      try {
        if (item.status === "Aktif") {
          const alasan = window.prompt("Alasan pembatalan pengeluaran?")?.trim()
          if (!alasan) return
          await apiPengeluaran.batalkan(id, alasan)
        } else {
          await apiPengeluaran.aktifkan(id)
        }
        const updated = await apiPengeluaran.list()
        setExpensesList(updated as ExpenseRecord[])
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Aksi gagal.")
      }
      return
    }

    setExpensesList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "Aktif" ? "BATAL" : "Aktif",
              cancelReason: item.status === "Aktif" ? "Dibatalkan secara manual" : undefined,
            }
          : item
      )
    )
  }

  const filteredExpenses = expensesList.filter((r) => {
    const matchSearch =
      r.description.toLowerCase().includes(expSearch.toLowerCase()) ||
      r.category.toLowerCase().includes(expSearch.toLowerCase())
    return matchSearch
  })

  // Calculation details for Sisa Owner
  const totalOmzet = data.pemasukan || 1
  const persenTunai = ((data.tunai / totalOmzet) * 100).toFixed(1)
  const persenQris = ((data.qris / totalOmzet) * 100).toFixed(1)
  const persenPengeluaran = ((data.pengeluaran / totalOmzet) * 100).toFixed(1)
  const persenKomisi = ((data.komisi / totalOmzet) * 100).toFixed(1)
  const persenSisa = ((data.sisa / totalOmzet) * 100).toFixed(1)

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
        {mode !== "Bulanan" ? (
          <input type="date" max={TANGGAL_MAKS()} min={TANGGAL_MULAI} value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)} />
        ) : (
          <input type="month" max={TANGGAL_MAKS().slice(0, 7)} min={TANGGAL_MULAI.slice(0, 7)} value={bulan} onChange={(e) => e.target.value && setBulan(e.target.value)} />
        )}
        <div>
          <Button className="secondary-button" onClick={() => eksporExcel(tabelEkspor())}>
            Excel
          </Button>
          <Button className="secondary-button" onClick={() => eksporPdf(tabelEkspor())}>
            PDF
          </Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* Interactive KPI Cards acting as direct Sub-view Tabs */}
      <div className="kpi-grid" style={{ marginBottom: 14, ...(fetching ? { opacity: 0.6 } : {}) }}>
        <div
          onClick={() => setSubTab("pemasukan")}
          style={{
            cursor: "pointer",
            borderRadius: 12,
            transition: "all 0.15s ease",
            boxShadow: subTab === "pemasukan" ? "0 0 0 2px var(--sage), 0 4px 12px rgba(0,0,0,0.08)" : "none",
            transform: subTab === "pemasukan" ? "translateY(-2px)" : "none",
          }}
          title="Klik untuk melihat rincian sumber pemasukan"
        >
          <Kpi
            icon="cash"
            label="Pemasukan (Klik Tab)"
            tone="sage"
            value={rupiah(data.pemasukan)}
            detail={`Tunai ${persenTunai}% · QRIS ${persenQris}%`}
          />
        </div>

        <div
          onClick={() => setSubTab("pengeluaran")}
          style={{
            cursor: "pointer",
            borderRadius: 12,
            transition: "all 0.15s ease",
            boxShadow: subTab === "pengeluaran" ? "0 0 0 2px var(--amber), 0 4px 12px rgba(0,0,0,0.08)" : "none",
            transform: subTab === "pengeluaran" ? "translateY(-2px)" : "none",
          }}
          title="Klik untuk mengelola & melihat rincian pengeluaran"
        >
          <Kpi
            icon="expense"
            label="Pengeluaran (Klik Tab)"
            tone="amber"
            value={rupiah(data.pengeluaran)}
            detail={`${persenPengeluaran}% dari omzet · ${expensesList.length} transaksi`}
          />
        </div>

        <div
          onClick={() => setSubTab("komisi")}
          style={{
            cursor: "pointer",
            borderRadius: 12,
            transition: "all 0.15s ease",
            boxShadow: subTab === "komisi" ? "0 0 0 2px var(--brass), 0 4px 12px rgba(0,0,0,0.08)" : "none",
            transform: subTab === "komisi" ? "translateY(-2px)" : "none",
          }}
          title="Klik untuk melihat detail komisi per kapster"
        >
          <Kpi
            icon="people"
            label="Total Komisi (Klik Tab)"
            tone="brass"
            value={rupiah(data.komisi)}
            detail={`${persenKomisi}% dari omzet · ${data.perKapster.length} kapster`}
          />
        </div>

        <div
          onClick={() => setSubTab("sisa")}
          style={{
            cursor: "pointer",
            borderRadius: 12,
            transition: "all 0.15s ease",
            boxShadow: subTab === "sisa" ? "0 0 0 2px var(--ink), 0 4px 12px rgba(0,0,0,0.08)" : "none",
            transform: subTab === "sisa" ? "translateY(-2px)" : "none",
          }}
          title="Klik untuk melihat kalkulasi sisa bersih owner"
        >
          <Kpi
            icon="wallet"
            label={isManager ? "Laba Bersih (Klik Tab)" : "Sisa Owner (Klik Tab)"}
            tone="dark"
            value={rupiah(data.sisa)}
            detail={`Margin laba bersih ${persenSisa}%`}
          />
        </div>

      </div>

      {/* SUB-VIEW 1: TAB PEMASUKAN */}
      {subTab === "pemasukan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel" style={{ padding: 20 }}>
            <PageTitle eyebrow="Sumber Pendapatan" title="Pemasukan" />
            <p style={{ color: "var(--slate)", fontSize: 13, marginBottom: 16 }}>
              Rincian pemasukan berdasarkan metode pembayaran.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 14 }}>
              <div style={{ padding: 16, borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <i className="dot sage-dot" style={{ width: 10, height: 10 }} />
                  <strong style={{ fontSize: 15 }}>Pembayaran Tunai</strong>
                  <span className="chip lunas" style={{ marginLeft: "auto" }}>{persenTunai}%</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{rupiah(data.tunai)}</div>
                <small style={{ color: "var(--muted)", display: "block", marginTop: 4 }}>
                  Kas fisik diterima langsung di laci kasir
                </small>
              </div>

              <div style={{ padding: 16, borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <i className="dot brass-dot" style={{ width: 10, height: 10 }} />
                  <strong style={{ fontSize: 15 }}>Pembayaran QRIS / Digital</strong>
                  <span className="chip active" style={{ marginLeft: "auto" }}>{persenQris}%</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{rupiah(data.qris)}</div>
                <small style={{ color: "var(--muted)", display: "block", marginTop: 4 }}>
                  Masuk otomatis ke rekening merchant Eastville
                </small>
              </div>
            </div>
          </section>

          <section className="panel report-chart">
            <PageTitle eyebrow="Tren Pemasukan" title="Pemasukan Per Hari" />
            {live ? (
              <BarChart data={chart} />
            ) : (
              <BarChart data={chart.length > 0 ? chart : [{ label: "01", value: 1200000 }, { label: "15", value: 1850000 }, { label: "29", value: 2100000 }]} />
            )}
          </section>
        </div>
      )}

      {/* SUB-VIEW 2: TAB PENGELUARAN (INTEGRASI PENGELUARAN.TSX) */}
      {subTab === "pengeluaran" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel" style={{ padding: 20, overflow: "hidden" }}>
            <div className="page-title expense-page-title">
              <div>
                <h2>Detail Pengeluaran Toko</h2>
                <p className="expense-page-description">
                  Daftar biaya operasional yang tercatat.
                </p>
              </div>
              <Button className="primary-button" onClick={() => setExpenseFormOpen(true)}>
                <Icon name="plus" /> Catat Pengeluaran
              </Button>
            </div>

            <div className="filters">
              <div className="search">
                <Icon name="search" />
                <input
                  placeholder="Cari keterangan..."
                  value={expSearch}
                  onChange={(e) => setExpSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="expense-table-scroll">
              <div className="expense-head">
                <span>Tanggal</span>
                <span>Keterangan</span>
                <span>Jumlah</span>
                <span>Aksi</span>
              </div>

              {filteredExpenses.map((row) => (
                <div
                  className={`expense-row ${row.status === "BATAL" ? "voided" : ""}`}
                  key={row.id}
                >
                  <span>{row.date}</span>
                  <span>
                    {row.description}
                    {row.status === "BATAL" && (
                      <small>{row.cancelReason || "Dibatalkan"}</small>
                    )}
                  </span>
                  <strong>{rupiah(row.amount)}</strong>
                  {row.status === "BATAL" ? (
                    <Button
                      className="secondary-button"
                      onClick={() => handleToggleExpenseStatus(row.id)}
                      title="Pulihkan pengeluaran"
                    >
                      <Icon name="restore" /> Pulihkan
                    </Button>
                  ) : (
                    <Button
                      className="danger-button"
                      onClick={() => handleToggleExpenseStatus(row.id)}
                      title="Batalkan pengeluaran"
                    >
                      Batalkan
                    </Button>
                  )}
                </div>
              ))}

              {filteredExpenses.length === 0 && (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--slate)" }}>
                  Tidak ada data pengeluaran yang cocok dengan pencarian.
                </div>
              )}
            </div>
        </section>
        </div>
      )}

      {/* SUB-VIEW 3: TAB TOTAL KOMISI */}
      {subTab === "komisi" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel" style={{ padding: 20, overflow: "hidden" }}>
          <PageTitle eyebrow="Total Komisi" title="Total Komisi Kapster" />
          <p style={{ color: "var(--slate)", fontSize: 13, marginBottom: 16 }}>
            Rincian akumulasi omzet dan bagian komisi yang berhak diterima setiap kapster.
          </p>

          <div className="commission-table-scroll">
            <div className="report-head">
              <span>Kapster</span>
              <span>Pelanggan</span>
              <span>Omzet Dihasilkan</span>
              <span>Total Komisi</span>
            </div>

            {data.perKapster.map((k) => {
            const pct = k.omzet > 0 ? ((k.komisi / k.omzet) * 100).toFixed(0) : "40"
            return (
              <div className="report-row" key={k.kapsterId + k.kapster}>
                <div>
                  <strong>{k.kapster}</strong>
                  <small style={{ color: "var(--muted)", display: "block" }}>Porsi komisi: ~{pct}%</small>
                </div>
                <span>{k.pelanggan} transaksi</span>
                <b>{rupiah(k.omzet)}</b>
                <b style={{ color: "#8c6014" }}>{rupiah(k.komisi)}</b>
              </div>
            )
            })}

            {data.perKapster.length === 0 && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--slate)" }}>
                Belum ada data komisi kapster pada periode ini.
              </div>
            )}
          </div>
        </section>
        </div>
      )}

      {/* SUB-VIEW 4: TAB SISA OWNER */}
      {subTab === "sisa" && (
        <section className="panel" style={{ padding: 22 }}>
          <PageTitle
            eyebrow="Kalkulasi Keuntungan"
            title={isManager ? "Rincian Laba Bersih Operasional" : "Kalkulasi Sisa Dana Bersih Owner"}
          />
          <p style={{ color: "var(--slate)", fontSize: 13, marginBottom: 20 }}>
            Kalkulasi transparan dana bersih yang dikantongi {isManager ? "Manajemen" : "Owner"} setelah dikurangi
            seluruh biaya operasional dan komisi kapster.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 1000 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <strong style={{ display: "block", color: "var(--ink)", fontSize: 14 }}>(+) Total Pemasukan Kotor</strong>
                <small style={{ color: "var(--slate)" }}>Omzet gabungan tunai &amp; QRIS</small>
              </div>
              <strong style={{ fontSize: 16, color: "#15803d" }}>+ {rupiah(data.pemasukan)}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.06)",
                border: "1px solid rgba(239, 68, 68, 0.18)",
              }}
            >
              <div>
                <strong style={{ display: "block", color: "var(--ink)", fontSize: 14 }}>(-) Total Pengeluaran Toko</strong>
                <small style={{ color: "var(--slate)" }}>Listrik, air, perlengkapan &amp; sewa ({persenPengeluaran}%)</small>
              </div>
              <strong style={{ fontSize: 16, color: "#b91c1c" }}>- {rupiah(data.pengeluaran)}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(200, 150, 62, 0.08)",
                border: "1px solid rgba(200, 150, 62, 0.25)",
              }}
            >
              <div>
                <strong style={{ display: "block", color: "var(--ink)", fontSize: 14 }}>(-) Total Komisi Kapster</strong>
                <small style={{ color: "var(--slate)" }}>Hak komisi kapster layanan &amp; produk ({persenKomisi}%)</small>
              </div>
              <strong style={{ fontSize: 16, color: "#8c6014" }}>- {rupiah(data.komisi)}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                borderRadius: 8,
                background: "var(--ink)",
                color: "#fff",
                marginTop: 6,
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: 15, color: "#fff" }}>
                  (=) {isManager ? "Laba Bersih Akhir" : "Sisa Bersih Dikantongi Owner"}
                </strong>
                <small style={{ color: "#cbd5e1" }}>Margin bersih: {persenSisa}% dari total omzet</small>
              </div>
              <strong style={{ fontSize: 20, color: "#facc15" }}>{rupiah(data.sisa)}</strong>
            </div>
          </div>
        </section>
      )}

      {/* Modal Catat Pengeluaran */}
      {expenseFormOpen && (
        <div className="modal-overlay">
          <form className="simple-modal" onSubmit={handleCreateExpense}>
            <header>
              <h2>Catat Pengeluaran</h2>
              <Button type="button" onClick={() => setExpenseFormOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Judul Pengeluaran</span>
              <input
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                placeholder="Misal: Perlengkapan, Listrik, Air, Sewa..."
              />
            </label>
            <label>
              <span>Tanggal</span>
              <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
            </label>
            <label>
              <span>Keterangan</span>
              <input
                placeholder="Misal: Beli sabun cuci rambut 2 botol"
                value={expDescription}
                onChange={(e) => setExpDescription(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Jumlah (Rp)</span>
              <input
                placeholder="Contoh: 150.000"
                value={expAmount}
                onChange={(e) => {
                  const num = Number(e.target.value.replace(/\D/g, ""))
                  setExpAmount(num ? rupiah(num) : "")
                }}
                required
              />
            </label>
            <footer>
              <Button className="secondary-button" type="button" onClick={() => setExpenseFormOpen(false)}>
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan Pengeluaran
              </Button>
            </footer>
          </form>
        </div>
      )}



      {wa && <WhatsAppDialog onClose={() => setWa(false)} title="Laporan Keuangan" text={ringkasWa} />}
    </div>
  )
}

export default ReportsPage

