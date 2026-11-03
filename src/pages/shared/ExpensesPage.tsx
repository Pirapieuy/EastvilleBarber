import { FormEvent, useEffect, useState } from "react"
import { ReasonDialog } from "./HistoryPage"
import { DemoNotice } from "../../components/common/DemoNotice"
import { apiPengeluaran, getToken } from "../../api"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"

export interface ExpenseRecord {
  id: string
  date: string
  category: "Perlengkapan" | "Listrik" | "Air" | "Sewa" | "Lain-lain"
  description: string
  amount: number
  status: "Aktif" | "BATAL"
  cancelReason?: string
  /** yyyy-MM-dd; hanya ada pada data dari backend */
  dateIso?: string
}

const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

function isoLokal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Angka KPI dari pengeluaran Aktif (BATAL tidak dihitung). */
function hitungKpi(records: ExpenseRecord[]) {
  const now = new Date()
  const hariIni = isoLokal(now)
  const bulanIni = hariIni.slice(0, 7)
  const tahunIni = hariIni.slice(0, 4)
  const mulaiMinggu = new Date(now)
  mulaiMinggu.setDate(now.getDate() - 6)
  const batasMinggu = isoLokal(mulaiMinggu)

  const aktif = records.filter((r) => r.status === "Aktif" && r.dateIso)
  const bulan = aktif.filter((r) => r.dateIso!.startsWith(bulanIni))
  const minggu = aktif.filter((r) => r.dateIso! >= batasMinggu && r.dateIso! <= hariIni)
  const tahun = aktif.filter((r) => r.dateIso!.startsWith(tahunIni))
  const jumlah = (rs: ExpenseRecord[]) => rs.reduce((a, r) => a + r.amount, 0)

  const perKategori: Record<string, number> = {}
  bulan.forEach((r) => (perKategori[r.category] = (perKategori[r.category] ?? 0) + r.amount))
  const teratas = Object.entries(perKategori).sort((a, b) => b[1] - a[1])[0]
  const totalBulan = jumlah(bulan)

  return {
    totalBulan,
    detailBulan: `${BULAN_PANJANG[now.getMonth()]} ${now.getFullYear()} · ${bulan.length} transaksi`,
    totalMinggu: jumlah(minggu),
    detailMinggu: `${mulaiMinggu.getDate()} ${BULAN_PENDEK[mulaiMinggu.getMonth()]} - ${now.getDate()} ${BULAN_PENDEK[now.getMonth()]} · ${minggu.length} transaksi`,
    kategori: teratas ? teratas[0] : "-",
    detailKategori: teratas ? `${rupiah(teratas[1])} (${((teratas[1] / totalBulan) * 100).toFixed(1).replace(".", ",")}%)` : "Belum ada pengeluaran bulan ini",
    totalTahun: jumlah(tahun),
    detailTahun: `Jan - ${BULAN_PENDEK[now.getMonth()]} ${now.getFullYear()} · ${tahun.length} transaksi`,
  }
}

export const expenses = [
  ["29 Okt", "Perlengkapan", "Pisau cukur dan sarung tangan", 485000, "Aktif"],
  ["28 Okt", "Listrik", "Token listrik Oktober", 750000, "Aktif"],
  ["26 Okt", "Air", "Tagihan PDAM Oktober", 215000, "Aktif"],
  ["24 Okt", "Sewa", "Sewa tempat bulan November", 3500000, "Aktif"],
  ["22 Okt", "Lain-lain", "Konsumsi rapat tim", 280000, "BATAL"],
] as const

const initialRecords: ExpenseRecord[] = [
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
    cancelReason: "Dibatalkan oleh Seva · salah nominal",
  },
]

export function ExpensesPage() {
  const [form, setForm] = useState(false)
  const [records, setRecords] = useState<ExpenseRecord[]>(initialRecords)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Semua")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [batalId, setBatalId] = useState<string | null>(null)

  const [newCategory, setNewCategory] = useState<ExpenseRecord["category"]>("Listrik")
  const [newAmount, setNewAmount] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newDate, setNewDate] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })

  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")

  // Dengan token login, data dari backend; tanpa token tetap data demo.
  function loadLive() {
    return apiPengeluaran.list().then((rows) => {
      setRecords(rows as ExpenseRecord[])
      setLive(true)
    })
  }
  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    loadLive().catch((e) => {
      console.error("Gagal memuat pengeluaran:", e)
      setLiveError(e instanceof Error ? e.message : "gagal memuat data")
    })
  }, [])

  const kpi = live ? hitungKpi(records) : null
  // Ada token tapi gagal memuat: jangan tampilkan angka contoh sebagai data asli.
  const gagalMuat = Boolean(getToken()) && !live

  const filteredRecords = records.filter((r) => {
    const matchCategory = category === "Semua" || r.category === category
    const matchSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setFormError("")
    const parsedAmount = Math.round(Number(newAmount))
    if (!parsedAmount || parsedAmount < 1) return setFormError("Jumlah harus lebih dari 0.")
    if (!newDescription.trim()) return setFormError("Keterangan wajib diisi.")
    if (live) {
      setSaving(true)
      try {
        await apiPengeluaran.create({
          tanggal: newDate,
          kategori: newCategory,
          deskripsi: newDescription.trim(),
          jumlah: parsedAmount,
        })
        await loadLive()
        setNewAmount("")
        setNewDescription("")
        setForm(false)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Gagal menyimpan.")
      } finally {
        setSaving(false)
      }
      return
    }
    const dateFormatted = newDate
      ? new Date(newDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })
      : "Hari ini"

    const newRec: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: dateFormatted,
      category: newCategory,
      description: newDescription,
      amount: parsedAmount,
      status: "Aktif",
    }

    setRecords([newRec, ...records])
    setNewAmount("")
    setNewDescription("")
    setForm(false)
  }

  async function handleToggleStatus(id: string) {
    if (live) {
      const item = records.find((r) => r.id === id)
      if (!item) return
      if (item.status === "Aktif") {
        setBatalId(id) // alasan diminta lewat dialog
        return
      }
      if (!window.confirm(`Pulihkan pengeluaran "${item.description}" (${rupiah(item.amount)})?`)) return
      try {
        await apiPengeluaran.aktifkan(id)
        await loadLive()
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Aksi gagal.")
      }
      return
    }
    setRecords((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === "Aktif" ? "BATAL" : "Aktif"
          return {
            ...item,
            status: nextStatus,
            cancelReason:
              nextStatus === "BATAL"
                ? "Dibatalkan secara manual"
                : undefined,
          }
        }
        return item
      }),
    )
  }

  async function konfirmasiBatal(alasan: string) {
    if (!batalId) return
    await apiPengeluaran.batalkan(batalId, alasan)
    await loadLive()
  }

  // Ada token = data asli sedang dimuat: jangan tampilkan data dummy dulu.
  const loading = Boolean(getToken()) && !live && !liveError
  if (loading) {
    return (
      <div className="content">
        <p>Memuat pengeluaran...</p>
      </div>
    )
  }

  return (
    <div className="content">
      <DemoNotice live={live} error={liveError} />
      <PageTitle
        eyebrow="Operasional"
        title="Pengeluaran"
        action={
          <Button className="primary-button" onClick={() => setForm(true)}>
            <Icon name="plus" /> Catat pengeluaran
          </Button>
        }
      />

      <div className="kpi-grid">
        <Kpi
          icon="expense"
          label="Total bulan ini"
          tone="brass"
          value={kpi ? rupiah(kpi.totalBulan) : gagalMuat ? "-" : "Rp 5.840.000"}
          detail={kpi ? kpi.detailBulan : gagalMuat ? "Data gagal dimuat" : "Oktober 2026 · 14 transaksi"}
        />
        <Kpi
          icon="calendar"
          label="Total 7 hari terakhir"
          tone="sage"
          value={kpi ? rupiah(kpi.totalMinggu) : gagalMuat ? "-" : "Rp 1.450.000"}
          detail={kpi ? kpi.detailMinggu : gagalMuat ? "Data gagal dimuat" : "23 - 29 Okt · 4 transaksi"}
        />
        <Kpi
          icon="wallet"
          label="Kategori terbesar"
          tone="dark"
          value={kpi ? kpi.kategori : gagalMuat ? "-" : "Sewa Tempat"}
          detail={kpi ? kpi.detailKategori : gagalMuat ? "Data gagal dimuat" : "Rp 3.500.000 (59,9%)"}
        />
        <Kpi
          icon="chart"
          label="Total tahun ini"
          tone="amber"
          value={kpi ? rupiah(kpi.totalTahun) : gagalMuat ? "-" : "Rp 62.450.000"}
          detail={kpi ? kpi.detailTahun : gagalMuat ? "Data gagal dimuat" : "Jan - Okt 2026 · 10 bulan"}
        />
      </div>

      <section className="panel list-panel">
        <div className="filters">
          <div className="search">
            <Icon name="search" />
            <input
              placeholder="Cari keterangan atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Semua">Semua kategori</option>
            <option value="Perlengkapan">Perlengkapan</option>
            <option value="Listrik">Listrik</option>
            <option value="Air">Air</option>
            <option value="Sewa">Sewa</option>
            <option value="Lain-lain">Lain-lain</option>
          </select>
        </div>

        <div className="expense-head">
          <span>Tanggal</span>
          <span>Kategori</span>
          <span>Keterangan</span>
          <span>Jumlah</span>
          <span>Status</span>
          <span />
        </div>

        {filteredRecords.map((row) => (
          <div
            className={`expense-row ${row.status === "BATAL" ? "voided" : ""}`}
            key={row.id}
          >
            <span>{row.date}</span>
            <strong>{row.category}</strong>
            <span>
              {row.description}
              {row.status === "BATAL" && (
                <small>{row.cancelReason || "Transaksi pengeluaran dibatalkan"}</small>
              )}
            </span>
            <strong>{rupiah(row.amount)}</strong>
            <i className={`chip ${row.status.toLowerCase()}`}>{row.status}</i>
            {row.status === "BATAL" ? (
              <Button
                className="secondary-button"
                onClick={() => handleToggleStatus(row.id)}
                title="Pulihkan pengeluaran"
              >
                <Icon name="restore" /> Pulihkan
              </Button>
            ) : (
              <Button
                onClick={() => handleToggleStatus(row.id)}
                title="Batalkan pengeluaran"
              >
                <Icon name="arrow" />
              </Button>
            )}
          </div>
        ))}

        {filteredRecords.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--slate)" }}>
            Tidak ada data pengeluaran yang cocok dengan pencarian.
          </div>
        )}
      </section>

      {batalId && (
        <ReasonDialog
          title="Batalkan pengeluaran?"
          warning="Pengeluaran tidak dihapus, hanya ditandai BATAL dan bisa dipulihkan."
          onClose={() => setBatalId(null)}
          onConfirm={konfirmasiBatal}
        />
      )}
      {form && (
        <div className="modal-overlay">
          <form className="simple-modal" onSubmit={handleCreate}>
            <header>
              <h2>Catat pengeluaran</h2>
              <Button onClick={() => setForm(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Kategori</span>
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as ExpenseRecord["category"])
                }
              >
                <option value="Listrik">Listrik</option>
                <option value="Air">Air</option>
                <option value="Sewa">Sewa</option>
                <option value="Perlengkapan">Perlengkapan</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </label>
            <label>
              <span>Jumlah</span>
              <div className="input-shell">
                <b>Rp</b>
                <input
                  min={1}
                  placeholder="0"
                  required
                  step={1}
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
            </label>
            <label>
              <span>Keterangan</span>
              <textarea
                placeholder="Keterangan pengeluaran..."
                required
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </label>
            <label>
              <span>Tanggal</span>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </label>
            {formError && (
              <div className="info-banner" role="alert">
                <Icon name="alert" />
                {formError}
              </div>
            )}
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setForm(false)}
                type="button"
              >
                Batal
              </Button>
              <Button className="primary-button" disabled={saving} type="submit">
                Simpan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

export default ExpensesPage
