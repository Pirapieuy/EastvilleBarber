import { FormEvent, useEffect, useRef, useState } from "react"
import { apiPengeluaran, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { ConfirmModal } from "../../components/common/ConfirmModal"
import { Icon } from "../../components/common/Icon"
import { ExportModal } from "../../components/common/ExportModal"
import { dokumenPengeluaran } from "../../utils/dokumenEkspor"
import {
  Button,
  CalendarPicker,
  rupiah,
} from "../../components/common/UI"
import { TANGGAL_MAKS, TANGGAL_MULAI } from "../../utils/tanggal"
import { ReasonDialog } from "../shared/HistoryPage"
import { KalenderBesar } from "./IzinKapster"

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

const pad = (n: number) => String(n).padStart(2, "0")
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

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
    amount: 350000,
    status: "Aktif",
  },
]

export function PengeluaranKasir() {
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const simpanPengeluaran = useRef(false)

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
  const [expenseRestoreId, setExpenseRestoreId] = useState<string | null>(null)
  const [eksporPengeluaran, setEksporPengeluaran] = useState(false)

  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null)
  const [editDate, setEditDate] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editAmount, setEditAmount] = useState("")

  function formatShortDate(iso: string) {
    try {
      const d = new Date(`${iso}T12:00:00`)
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
      }).format(d)
    } catch {
      return iso
    }
  }

  function handleOpenEditExpense(row: ExpenseRecord) {
    setEditingExpense(row)
    setEditDate(row.dateIso || isoDate(new Date()))
    setEditDesc(row.description)
    setEditAmount(rupiah(row.amount))
  }

  async function handleSaveEditExpense(e: FormEvent) {
    e.preventDefault()
    if (!editingExpense) return
    const parsedAmount = Number(editAmount.replace(/\D/g, "")) || 0
    if (!parsedAmount || !editDesc.trim()) return
    if (simpanPengeluaran.current) return
    simpanPengeluaran.current = true

    const targetId = editingExpense.id

    if (live) {
      try {
        await apiPengeluaran.update({
          id: targetId,
          tanggal: editDate,
          deskripsi: editDesc.trim(),
          jumlah: parsedAmount,
        })
        const updated = await apiPengeluaran.list()
        setExpensesList(updated as ExpenseRecord[])
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Gagal menyimpan perubahan.",
        )
      } finally {
        setEditingExpense(null)
        simpanPengeluaran.current = false
      }
      return
    }

    setExpensesList((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? {
              ...item,
              date: formatShortDate(editDate),
              dateIso: editDate,
              description: editDesc.trim(),
              amount: parsedAmount,
            }
          : item,
      ),
    )
    setEditingExpense(null)
    simpanPengeluaran.current = false
  }

  useEffect(() => {
    if (!getToken()) return
    let batal = false
    apiPengeluaran
      .list()
      .then((exp) => {
        if (batal) return
        if (Array.isArray(exp)) setExpensesList(exp as ExpenseRecord[])
        setLive(true)
      })
      .catch((err) => {
        if (!batal) setLiveError(err instanceof Error ? err.message : "Gagal memuat data.")
      })
    return () => {
      batal = true
    }
  }, [])

  async function handleCreateExpense(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = Number(expAmount.replace(/\D/g, "")) || 0
    if (!parsedAmount || !expDescription.trim()) return
    if (simpanPengeluaran.current) return
    simpanPengeluaran.current = true

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
      } finally {
        simpanPengeluaran.current = false
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
    simpanPengeluaran.current = false
  }

  function handleToggleExpenseStatus(id: string) {
    const item = expensesList.find((expense) => expense.id === id)
    if (!item) return

    if (item.status === "BATAL") {
      setExpenseRestoreId(id)
      return
    }

    if (live) {
      setExpenseCancelId(id)
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

  const filteredExpenses = expensesList
    .filter((r) => {
      const matchSearch =
        r.description.toLowerCase().includes(expSearch.toLowerCase()) ||
        r.category.toLowerCase().includes(expSearch.toLowerCase())
      return matchSearch
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "Aktif" ? -1 : 1
      }
      return 0
    })

  const expenseToRestore =
    expensesList.find((expense) => expense.id === expenseRestoreId) ?? null

  const expenseTableRef = useRef<HTMLDivElement>(null)
  const [expenseScrollable, setExpenseScrollable] = useState(
    () => filteredExpenses.length > 6,
  )

  useEffect(() => {
    const el = expenseTableRef.current
    if (!el) {
      setExpenseScrollable(filteredExpenses.length > 6)
      return
    }
    setExpenseScrollable(el.scrollHeight > 360 || filteredExpenses.length > 6)
  }, [filteredExpenses])

  return (
    <div className="content report-content">
      <DemoNotice live={live} error={liveError} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <section className="panel lk-panel report-pengeluaran">
          <div className="lk-head">
            <h3>Pengeluaran</h3>
            <Button className="secondary-button lk-head-ekspor" onClick={() => setEksporPengeluaran(true)}>
              <Icon name="download" /> Ekspor
            </Button>
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
              <Icon name="plus" />
              <span>Tambah</span>
            </Button>
          </div>

          <div
            ref={expenseTableRef}
            className={`expense-table-scroll expense-table-compact${expenseScrollable ? " is-scrollable" : ""}`}
          >
            <div className="expense-head">
              <span>Tanggal</span>
              <span>Keterangan</span>
              <span>Harga</span>
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
                <div className="expense-actions">
                  {row.status === "BATAL" ? (
                    <Button
                      className="secondary-button"
                      onClick={() => handleToggleExpenseStatus(row.id)}
                      title="Pulihkan pengeluaran"
                    >
                      <Icon name="restore" /> Pulihkan
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="secondary-button"
                        onClick={() => handleOpenEditExpense(row)}
                        title="Ubah pengeluaran"
                      >
                        <Icon name="pencil" /> Ubah
                      </Button>
                      <Button
                        className="danger-button"
                        onClick={() => handleToggleExpenseStatus(row.id)}
                        title="Hapus pengeluaran"
                      >
                        <Icon name="trash" /> Hapus
                      </Button>
                    </>
                  )}
                </div>
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
                  <span>Harga (Rp)</span>
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
                <div className="lk-exp-actions is-single">
                  <Button className="primary-button" type="submit">
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {editingExpense && (
        <div className="modal-overlay">
          <form
            className="simple-modal expense-form lk-exp-form"
            onSubmit={handleSaveEditExpense}
          >
            <header>
              <h2>Koreksi Pengeluaran</h2>
              <Button type="button" onClick={() => setEditingExpense(null)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="lk-exp-body">
              <div className="lk-exp-cal">
                <KalenderBesar
                  izin={{}}
                  min={TANGGAL_MULAI}
                  onChange={setEditDate}
                  value={editDate}
                />
              </div>
              <label className="lk-exp-date">
                <span>Tanggal</span>
                <CalendarPicker
                  max={TANGGAL_MAKS()}
                  min={TANGGAL_MULAI}
                  value={editDate}
                  onChange={(d) => d && setEditDate(d)}
                />
              </label>
              <div className="lk-exp-fields">
                <label>
                  <span>Keterangan</span>
                  <input
                    placeholder="Misal: Beli sabun cuci rambut 2 botol"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Harga (Rp)</span>
                  <input
                    inputMode="numeric"
                    placeholder="Contoh: 150.000"
                    value={editAmount}
                    onChange={(e) => {
                      const num = Number(e.target.value.replace(/\D/g, ""))
                      setEditAmount(num ? rupiah(num) : "")
                    }}
                    required
                  />
                </label>
                <div className="lk-exp-actions is-single">
                  <Button className="primary-button" type="submit">
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {expenseCancelId && (
        <ReasonDialog
          title="Hapus Pengeluaran"
          warning="Pengeluaran tidak dihapus permanen, hanya ditandai BATAL dan bisa dipulihkan."
          onClose={() => setExpenseCancelId(null)}
          showCloseButton={true}
          onConfirm={async (alasan) => {
            await apiPengeluaran.batalkan(expenseCancelId, alasan)
            const updated = await apiPengeluaran.list()
            setExpensesList(updated as ExpenseRecord[])
          }}
        />
      )}

      {expenseRestoreId && expenseToRestore && (
        <ConfirmModal
          title="Pulihkan pengeluaran?"
          eyebrow="Pulihkan Pengeluaran"
          requireReason
          reasonLabel="Alasan pemulihan"
          reasonPlaceholder="Contoh: pengeluaran sebelumnya dibatalkan karena salah input..."
          minReasonLength={3}
          validateReasonOnSubmit
          confirmText="Pulihkan Pengeluaran"
          confirmTone="primary"
          compact
          onClose={() => setExpenseRestoreId(null)}
          onConfirm={async (alasan) => {
            if (live) {
              await apiPengeluaran.aktifkan(expenseToRestore.id, alasan)
              const updated = await apiPengeluaran.list()
              setExpensesList(updated as ExpenseRecord[])
            } else {
              setExpensesList((prev) =>
                prev.map((expense) =>
                  expense.id === expenseToRestore.id
                    ? { ...expense, status: "Aktif", cancelReason: undefined }
                    : expense,
                ),
              )
            }
            setExpenseRestoreId(null)
          }}
        />
      )}

      {eksporPengeluaran && (
        <ExportModal
          judul="Ekspor Pengeluaran"
          onBuat={dokumenPengeluaran}
          onClose={() => setEksporPengeluaran(false)}
        />
      )}
    </div>
  )
}

export default PengeluaranKasir
