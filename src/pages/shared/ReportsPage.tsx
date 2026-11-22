import { formatTanggal, TANGGAL_MAKS, TANGGAL_MULAI } from "../../utils/tanggal"
import { FormEvent, useEffect, useState } from "react"
import {
  apiLaporan,
  apiPengeluaran,
  apiTransaksi,
  getToken,
  LaporanKeuangan,
} from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import {
  eksporExcel,
  eksporPdf,
  TabelEkspor,
} from "../../components/common/exportTable"
import {
  Button,
  CalendarPicker,
  MonthPicker,
  PageTitle,
  rupiah,
  ErrorState,
} from "../../components/common/UI"
import { AppUser, Role } from "../../types"
import {
  ProductDetail,
  CompactDetail,
  ProductTransactionRecord,
  INITIAL_PRODUCT_TRANSACTIONS,
} from "./ProductReportsPage"
import { ReasonDialog } from "./HistoryPage"
import { KalenderBesar } from "../kasir/IzinKapster"

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
              window.open(
                `https://wa.me/?text=${encodeURIComponent(pesan)}`,
                "_blank",
                "noopener",
              )
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
  pemasukan: 0,
  tunai: 0,
  qris: 0,
  pengeluaran: 0,
  komisi: 0,
  sisa: 0,
  jumlahTransaksi: 0,
  perHari: [],
  perKapster: [],
  stokMenipis: [],
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
  {
    id: "exp-1",
    date: "29 Okt",
    category: "Perlengkapan",
    description: "Pisau cukur dan sarung tangan",
    amount: 485000,
    status: "Aktif",
  },
  {
    id: "exp-2",
    date: "28 Okt",
    category: "Listrik",
    description: "Token listrik Oktober",
    amount: 750000,
    status: "Aktif",
  },
  {
    id: "exp-3",
    date: "26 Okt",
    category: "Air",
    description: "Tagihan PDAM Oktober",
    amount: 215000,
    status: "Aktif",
  },
  {
    id: "exp-4",
    date: "24 Okt",
    category: "Sewa",
    description: "Sewa tempat bulan November",
    amount: 3500000,
    status: "Aktif",
  },
  {
    id: "exp-5",
    date: "22 Okt",
    category: "Lain-lain",
    description: "Konsumsi rapat tim",
    amount: 280000,
    status: "BATAL",
    cancelReason: "Salah nominal",
  },
  {
    id: "exp-6",
    date: "15 Okt",
    category: "Perlengkapan",
    description: "Handuk dan shampoo salon",
    amount: 640000,
    status: "Aktif",
  },
]

const pad = (n: number) => String(n).padStart(2, "0")
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Rentang yyyy-MM-dd untuk mode harian (tanggal) atau bulanan (yyyy-MM). */
export function rentangLaporan(
  mode: "Harian" | "Mingguan" | "Bulanan",
  tanggal: string,
  bulan: string,
) {
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

/** "16 - 22 Nov 2026" (atau "28 Okt - 3 Nov 2026" bila pekan melewati bulan). */
function labelPekan(dari: string, sampai: string) {
  const d = new Date(`${dari}T00:00:00`)
  const m = new Date(`${sampai}T00:00:00`)
  const bln = (x: Date) =>
    x.toLocaleDateString("id-ID", { month: "short" }).replace(".", "")
  const awal =
    d.getMonth() === m.getMonth()
      ? `${d.getDate()}`
      : `${d.getDate()} ${bln(d)}`
  return `${awal} - ${m.getDate()} ${bln(m)} ${m.getFullYear()}`
}

const persen = (bagian: number, total: number) =>
  total > 0 ? Math.round((bagian / total) * 100) : 0

interface BarisRincian {
  id: string
  date: string
  time: string
  items: string
  omzet: number
}

/** Rincian satu kapster: transaksi pada periode laporan, dikelompokkan per hari. */
function RincianKomisi({ kapster, dari, sampai, periode, onClose }: {
  kapster: LaporanKeuangan["perKapster"][number]
  dari: string
  sampai: string
  periode: string
  onClose: () => void
}) {
  const [rows, setRows] = useState<BarisRincian[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!getToken()) {
      setRows([])
      return
    }
    let batal = false
    apiTransaksi
      .list({ dari, sampai })
      .then((list) => {
        if (batal) return
        const hasil: BarisRincian[] = []
        for (const t of list as {
          id: string
          date: string
          time: string
          status: string
          items: { name: string; qty: number; price: number; kapsterId?: string; kapster?: string }[]
        }[]) {
          if (String(t.status).toUpperCase() === "BATAL") continue
          const milik = t.items.filter(
            (i) => i.kapsterId === kapster.kapsterId || i.kapster === kapster.kapster,
          )
          if (milik.length === 0) continue
          hasil.push({
            id: t.id,
            date: t.date,
            time: t.time,
            items: milik.map((i) => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ""}`).join(", "),
            omzet: milik.reduce((a, i) => a + i.price * i.qty, 0),
          })
        }
        setRows(hasil)
      })
      .catch((e) => !batal && setError(e instanceof Error ? e.message : "Gagal memuat rincian"))
    return () => {
      batal = true
    }
  }, [kapster.kapsterId, kapster.kapster, dari, sampai])

  const perHari = new Map<string, BarisRincian[]>()
  for (const r of rows ?? []) perHari.set(r.date, [...(perHari.get(r.date) ?? []), r])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="simple-modal lk-rincian"
        role="dialog"
        aria-label={`Rincian komisi ${kapster.kapster}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{kapster.kapster}</h2>
          <Button type="button" onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>
        <div className="lk-rincian-body">
          <p className="lk-rincian-periode">{periode}</p>
          <div className="lk-rincian-sum">
            <div><small>Transaksi</small><strong>{kapster.pelanggan}</strong></div>
            <div><small>Omzet</small><strong>{rupiah(kapster.omzet)}</strong></div>
            <div><small>Komisi</small><strong>{rupiah(kapster.komisi)}</strong></div>
          </div>
          <div className="lk-rincian-list">
            {error ? (
              <p className="lk-empty">{error}</p>
            ) : rows === null ? (
              <p className="lk-empty">Memuat rincian…</p>
            ) : rows.length === 0 ? (
              <p className="lk-empty">Tidak ada transaksi pada periode ini.</p>
            ) : (
              [...perHari.entries()].map(([tgl, list]) => (
                <div key={tgl} className="lk-rincian-hari">
                  <div className="lk-rincian-harihead">
                    <strong>{tgl}</strong>
                    <span>
                      {list.length} transaksi, {rupiah(list.reduce((a, r) => a + r.omzet, 0))}
                    </span>
                  </div>
                  {list.map((r) => (
                    <div key={r.id} className="lk-rincian-row">
                      <time>{r.time}</time>
                      <span>
                        <strong>{r.items}</strong>
                        <small>{r.id}</small>
                      </span>
                      <b>{rupiah(r.omzet)}</b>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export function ReportsPage({ currentUser, role, onNavigate }: {
  currentUser?: AppUser
  role?: Role
  onNavigate?: (page: string) => void
} = {}) {
  const [wa, setWa] = useState(false)
  const [mode, setMode] = useState<"Harian" | "Mingguan" | "Bulanan">("Bulanan")
  const [reloadKey, setReloadKey] = useState(0)
  const [tanggal, setTanggal] = useState(() => isoDate(new Date()))
  const [bulan, setBulan] = useState(() => isoDate(new Date()).slice(0, 7))
  const [data, setData] = useState<LaporanKeuangan>(
    getToken() ? laporanKosong : demoLaporan,
  )
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [fetching, setFetching] = useState(false)
  const [productLiveError, setProductLiveError] = useState("")

  const [subTab, setSubTab] =
    useState<"pemasukan" | "pengeluaran" | "komisi" | "omzet">("pemasukan")

  const pilihBagian = (
    bagian: "pemasukan" | "pengeluaran" | "komisi" | "omzet",
  ) => {
    setSubTab(bagian)
    document.getElementById(`laporan-${bagian}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }
  const [productTab, setProductTab] =
    useState<"transaksi" | "koreksi" | "ringkasan">("transaksi")
  const [productList, setProductList] = useState<ProductTransactionRecord[]>(
    getToken() ? [] : INITIAL_PRODUCT_TRANSACTIONS,
  )
  const [productLive, setProductLive] = useState(false)

  // Expenses management state
  const [expensesList, setExpensesList] = useState<ExpenseRecord[]>(
    getToken() ? [] : initialExpenses,
  )
  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [expCategory, setExpCategory] = useState<string>("Lain-lain")
  const [expAmount, setExpAmount] = useState("")
  const [expDescription, setExpDescription] = useState("")
  const [expDate, setExpDate] = useState(() => isoDate(new Date()))
  const [expSearch, setExpSearch] = useState("")
  const [expenseCancelId, setExpenseCancelId] = useState<string | null>(null)
  const [rincianKapster, setRincianKapster] = useState<
    LaporanKeuangan["perKapster"][number] | null
  >(null)

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
      .produk({
        dari: rentangLaporan(mode, tanggal, bulan).dari,
        sampai: rentangLaporan(mode, tanggal, bulan).sampai,
      })
      .then((rows) => {
        if (batal) return
        setProductList(rows as ProductTransactionRecord[])
        setProductLive(true)
        setProductLiveError("")
      })
      .catch((e) => {
        console.error("Gagal memuat laporan produk:", e)
        if (!batal)
          setProductLiveError(
            e instanceof Error ? e.message : "gagal memuat data",
          )
      })
    return () => {
      batal = true
    }
  }, [mode, tanggal, bulan])
  const gagalMuat = Boolean(getToken()) && !live && Boolean(liveError)
  if (gagalMuat) {
    return (
      <div className="content">
        <ErrorState
          title="Laporan gagal dimuat"
          message={liveError}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    )
  }

  const juta = (n: number) => rupiah(n)
  const rentang = rentangLaporan(mode, tanggal, bulan)
  const periode =
    mode === "Harian"
      ? tanggal
      : mode === "Mingguan"
        ? `${rentang.dari} s/d ${rentang.sampai}`
        : bulan

  const ringkasWa = `Periode: ${periode}\nPemasukan: ${juta(data.pemasukan)}\nPengeluaran: ${juta(data.pengeluaran)}\nKomisi: ${juta(data.komisi)}\n${
    "Sisa Owner"
  }: ${juta(data.sisa)}`

  const tabelEkspor = (): TabelEkspor => ({
    berkas: `laporan-keuangan-${periode}`,
    judul: "Laporan Keuangan",
    keterangan: `Periode ${periode} · ${data.jumlahTransaksi} transaksi · Pemasukan ${data.pemasukan} · Pengeluaran ${data.pengeluaran} · Komisi ${data.komisi} · ${
      "Sisa Owner"
    } ${data.sisa}`,
    kolom: ["Kapster", "Transaksi", "Omzet", "Komisi"],
    baris: [
      ...data.perKapster.map((k): (string | number)[] => [
        k.kapster,
        k.pelanggan,
        k.omzet,
        k.komisi,
      ]),
      ["", "", "", ""],
      ["Ringkasan", "Tunai", "QRIS", "Total"],
      ["Pemasukan", data.tunai, data.qris, data.pemasukan],
      ["Pengeluaran", "", "", data.pengeluaran],
      ["Komisi", "", "", data.komisi],
      ["Sisa Owner", "", "", data.sisa],
      ["", "", "", ""],
      ["Tanggal", "Pemasukan", "", ""],
      ...data.perHari.map((h): (string | number)[] => [
        h.tanggal,
        h.total,
        "",
        "",
      ]),
    ],
  })

  // Expense Handlers
  async function handleCreateExpense(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = Number(expAmount.replace(/\D/g, "")) || 0
    if (!parsedAmount || !expDescription.trim()) return

    if (live) {
      try {
        await apiPengeluaran.create({
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
        window.alert(
          err instanceof Error ? err.message : "Gagal menyimpan pengeluaran.",
        )
      }
      return
    }

    const newRec: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: expDate.slice(5),
      category: expCategory as ExpenseRecord["category"] || "Lain-lain",
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
          setExpenseCancelId(id)
          return
        }
        await apiPengeluaran.aktifkan(id)
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
              cancelReason:
                item.status === "Aktif"
                  ? "Dibatalkan secara manual"
                  : undefined,
            }
          : item,
      ),
    )
  }

  const filteredExpenses = expensesList.filter((r) => {
    const matchSearch =
      r.description.toLowerCase().includes(expSearch.toLowerCase()) ||
      r.category.toLowerCase().includes(expSearch.toLowerCase())
    return matchSearch
  })

  // Rincian persen terhadap pemasukan
  const persenTunai = persen(data.tunai, data.pemasukan)
  const persenQris = persen(data.qris, data.pemasukan)
  const persenPengeluaran = persen(data.pengeluaran, data.pemasukan)
  const persenKomisi = persen(data.komisi, data.pemasukan)
  const persenSisa = persen(data.sisa, data.pemasukan)
  const jumlahKapsterBerkomisi = data.perKapster.filter((k) => k.komisi > 0).length

  /** Buka Riwayat Transaksi dengan filter metode (dan tanggal bila mode Harian). */
  function bukaRiwayat(metode: "Tunai" | "QRIS") {
    try {
      sessionStorage.setItem("eastville_riwayat_metode", metode)
      if (mode === "Harian")
        sessionStorage.setItem("eastville_riwayat_tanggal", tanggal)
    } catch {
      /* filter awal hanya kemudahan */
    }
    onNavigate?.("RiwayatTransaksi")
  }

  const kpis = [
    { key: "pemasukan", icon: "cash", tone: "sage", label: "Pemasukan", value: data.pemasukan, detail: `${data.jumlahTransaksi} transaksi` },
    { key: "pengeluaran", icon: "expense", tone: "amber", label: "Pengeluaran", value: data.pengeluaran, detail: data.pemasukan > 0 ? `${persenPengeluaran}% pemasukan` : "Belum ada" },
    { key: "komisi", icon: "people", tone: "brass", label: "Komisi", value: data.komisi, detail: jumlahKapsterBerkomisi > 0 ? `untuk ${jumlahKapsterBerkomisi} kapster` : "Belum ada" },
    { key: "omzet", icon: "wallet", tone: "dark", label: "Sisa Bersih", value: data.sisa, detail: data.pemasukan > 0 ? `${persenSisa}% pemasukan` : "Belum ada" },
  ] as const

  return (
    <div className="content report-page">
      <DemoNotice live={live} error={liveError} />

      <div className="report-toolbar">
        <div className="report-filter-row">
          <div className="segmented">
            <Button
              className={mode === "Harian" ? "active" : ""}
              onClick={() => setMode("Harian")}
            >
              Harian
            </Button>
            <Button
              className={mode === "Mingguan" ? "active" : ""}
              onClick={() => setMode("Mingguan")}
            >
              Mingguan
            </Button>
            <Button
              className={mode === "Bulanan" ? "active" : ""}
              onClick={() => setMode("Bulanan")}
            >
              Bulanan
            </Button>
          </div>
          {mode !== "Bulanan" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarPicker
                max={TANGGAL_MAKS()}
                min={TANGGAL_MULAI}
                value={tanggal}
                onChange={(d) => d && setTanggal(d)}
              />
              {mode === "Mingguan" && (
                <span
                  className="report-week-range"
                  aria-label="Rentang tanggal minggu"
                >
                  <strong>{labelPekan(rentang.dari, rentang.sampai)}</strong>
                </span>
              )}
            </div>
          ) : (
            <MonthPicker
              max={TANGGAL_MAKS()}
              min={TANGGAL_MULAI}
              value={bulan}
              onChange={(b) => b && setBulan(b)}
            />
          )}
        </div>
        <div className="report-export-buttons">
          <Button
            className="secondary-button"
            onClick={() => eksporExcel(tabelEkspor())}
          >
            Excel
          </Button>
          <Button
            className="secondary-button"
            onClick={() => eksporPdf(tabelEkspor())}
          >
            PDF
          </Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>

      <div className="od-kpis" style={fetching ? { opacity: 0.6 } : undefined}>
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            className={`od-kpi${subTab === k.key ? " is-active" : ""}`}
            aria-label={`${k.label} ${rupiah(k.value)}, lihat rincian`}
            onClick={() => pilihBagian(k.key)}
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

      <section id="laporan-pemasukan" className="panel lk-panel report-section">
        <div className="lk-head">
          <h3>Pemasukan</h3>
        </div>
        <div className="lk-pay">
          {([
            ["Tunai", data.tunai, persenTunai, "sage-dot"],
            ["QRIS", data.qris, persenQris, "brass-dot"],
          ] as const).map(([nama, nilai, pct, dot]) => (
            <button
              key={nama}
              type="button"
              className="lk-pay-card"
              aria-label={`Pembayaran ${nama} ${rupiah(nilai)}, buka Riwayat Transaksi ${nama}`}
              onClick={() => bukaRiwayat(nama)}
            >
              <i className={`dot ${dot}`} />
              <span className="lk-pay-main">
                <strong>{nama}</strong>
                <small>{pct}% pemasukan</small>
              </span>
              <b>{rupiah(nilai)}</b>
              <Icon name="chevron" className="od-turn-right od-go" />
            </button>
          ))}
        </div>
      </section>

      {/* SUB-VIEW 2: TAB PENGELUARAN (INTEGRASI PENGELUARAN.TSX) */}
      <div id="laporan-pengeluaran" className="report-section">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel lk-panel report-pengeluaran">
            <div className="lk-head">
              <h3>Pengeluaran</h3>
            </div>

            <div className="expense-toolbar filters">
              <div className="search">
                <Icon name="search" />
                <input
                  placeholder="Cari keterangan..."
                  value={expSearch}
                  onChange={(e) => setExpSearch(e.target.value)}
                />
              </div>
              <Button
                className="primary-button expense-add-button"
                onClick={() => setExpenseFormOpen(true)}
              >
                <Icon name="plus" /> Tambah pengeluaran
              </Button>
            </div>

            <div className="expense-table-scroll expense-table-compact">
              <div className="expense-head">
                <span>Tanggal</span>
                <span>Keterangan</span>
                <span>Jumlah</span>
                <span>Aksi</span>
              </div>

              {filteredExpenses.map((row) => (
                <div
                  className={`expense-row ${
                    row.status === "BATAL" ? "voided" : ""
                  }`}
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
                <div className="lk-empty">
                  Tidak ada data pengeluaran yang cocok dengan pencarian.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* SUB-VIEW 3: TAB TOTAL KOMISI */}
      <div id="laporan-komisi" className="report-section">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel lk-panel report-komisi">
            <div className="lk-head">
              <h3>Komisi kapster</h3>
            </div>

            <div className="commission-table-scroll">
              <div className="report-head">
                <span>Kapster</span>
                <span>Pelanggan</span>
                <span>Omzet Dihasilkan</span>
                <span>Total Komisi</span>
              </div>

              {data.perKapster.map((k) => (
                <div
                  className="report-row is-tap"
                  key={k.kapsterId + k.kapster}
                  role="button"
                  tabIndex={0}
                  aria-label={`Rincian komisi ${k.kapster}`}
                  onClick={() => setRincianKapster(k)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setRincianKapster(k)
                  }}
                >
                  <div>
                    <strong>{k.kapster}</strong>
                  </div>
                  <span>{k.pelanggan} transaksi</span>
                  <b>{rupiah(k.omzet)}</b>
                  <b className="lk-komisi">{rupiah(k.komisi)}</b>
                </div>
              ))}

              {data.perKapster.length === 0 && (
                <div className="lk-empty">
                  Belum ada data komisi kapster pada periode ini.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <section id="laporan-omzet" className="panel lk-panel report-section">
        <div className="lk-head">
          <h3>Sisa bersih</h3>
          <strong className="lk-net">{rupiah(data.sisa)}</strong>
        </div>
        <div className="lk-calc">
          {([
            ["Pemasukan", "+", data.pemasukan, 100, "plus"],
            ["Pengeluaran", "-", data.pengeluaran, persenPengeluaran, "minus"],
            ["Komisi kapster", "-", data.komisi, persenKomisi, "minus"],
          ] as const).map(([nama, tanda, nilai, pct, tone]) => (
            <div key={nama} className={`lk-calc-row ${tone}`}>
              <span>{nama}</span>
              <small>{pct}%</small>
              <b>
                {tanda} {rupiah(nilai)}
              </b>
            </div>
          ))}
          <div className="lk-calc-row total">
            <span>Sisa bersih</span>
            <small>{persenSisa}%</small>
            <b>{rupiah(data.sisa)}</b>
          </div>
        </div>
      </section>

      {/* Modal Tambah Pengeluaran: kalender di kiri, form di kanan (HP: tanggal di atas) */}
      {expenseFormOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal expense-form lk-exp-form"
            onSubmit={handleCreateExpense}
          >
            <header>
              <h2>Tambah pengeluaran</h2>
              <Button type="button" onClick={() => setExpenseFormOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="lk-exp-body">
              <div className="lk-exp-cal">
                <KalenderBesar
                  izin={{}}
                  min={TANGGAL_MULAI}
                  onChange={setExpDate}
                  value={expDate}
                />
              </div>
              <label className="lk-exp-date">
                <span>Tanggal</span>
                <CalendarPicker
                  max={TANGGAL_MAKS()}
                  min={TANGGAL_MULAI}
                  value={expDate}
                  onChange={(d) => d && setExpDate(d)}
                />
              </label>
              <div className="lk-exp-fields">
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
                    inputMode="numeric"
                    placeholder="Contoh: 150.000"
                    value={expAmount}
                    onChange={(e) => {
                      const num = Number(e.target.value.replace(/\D/g, ""))
                      setExpAmount(num ? rupiah(num) : "")
                    }}
                    required
                  />
                </label>
                <div className="lk-exp-actions">
                  <Button
                    className="secondary-button"
                    type="button"
                    onClick={() => setExpenseFormOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button className="primary-button" type="submit">
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {rincianKapster && (
        <RincianKomisi
          kapster={rincianKapster}
          dari={rentang.dari}
          sampai={rentang.sampai}
          periode={
            mode === "Harian"
              ? formatTanggal(rentang.dari)
              : mode === "Mingguan"
                ? labelPekan(rentang.dari, rentang.sampai)
                : new Date(`${bulan}-01T12:00:00`).toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })
          }
          onClose={() => setRincianKapster(null)}
        />
      )}

      {expenseCancelId && (
        <ReasonDialog
          title="Batalkan pengeluaran?"
          warning="Pengeluaran tidak dihapus, hanya ditandai BATAL dan bisa dipulihkan."
          onClose={() => setExpenseCancelId(null)}
          showCloseButton={false}
          onConfirm={async (alasan) => {
            await apiPengeluaran.batalkan(expenseCancelId, alasan)
            const updated = await apiPengeluaran.list()
            setExpensesList(updated as ExpenseRecord[])
          }}
        />
      )}

      {wa && (
        <WhatsAppDialog
          onClose={() => setWa(false)}
          title="Laporan Keuangan"
          text={ringkasWa}
        />
      )}
    </div>
  )
}

export default ReportsPage
