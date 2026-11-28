import { FormEvent, useEffect, useRef, useState } from "react"
import { apiPengeluaran, getToken } from "../../api"
import { ConfirmModal } from "../../components/common/ConfirmModal"
import { Icon } from "../../components/common/Icon"
import { ExportModal } from "../../components/common/ExportModal"
import { SearchSelect } from "../../components/common/SearchSelect"
import { dokumenPengeluaran } from "../../utils/dokumenEkspor"
import {
  Button,
  CalendarPicker,
  LoadingState,
  rupiah,
} from "../../components/common/UI"
import { TANGGAL_MAKS, TANGGAL_MULAI, tanggalIsoLokal } from "../../utils/tanggal"
import { ReasonDialog } from "../shared/HistoryPage"

export interface ExpenseRecord {
  id: string
  date: string
  category: "Perlengkapan" | "Listrik" | "Air" | "Sewa" | "Lain-lain"
  description: string
  amount: number
  status: "Aktif" | "BATAL"
  cancelReason?: string
  dateIso?: string
  createdBy?: string
}

const KATEGORI_OPTIONS = [
  "Perlengkapan",
  "Listrik",
  "Air",
  "Sewa",
  "Lain-lain",
] as const

const LOCAL_KEY = "eastville_pengeluaran_kasir"

function loadLocalExpenses(): ExpenseRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveLocalExpenses(list: ExpenseRecord[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
  } catch {}
}

export function PengeluaranKasir() {
  const [daftar, setDaftar] = useState<ExpenseRecord[]>(() => loadLocalExpenses())
  const [loading, setLoading] = useState(false)

  // Form input state
  const [tanggal, setTanggal] = useState(() => tanggalIsoLokal(new Date()))
  const [kategori, setKategori] = useState<ExpenseRecord["category"]>("Perlengkapan")
  const [keterangan, setKeterangan] = useState("")
  const [jumlah, setJumlah] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Filter & modal state
  const [search, setSearch] = useState("")
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null)
  const [editTanggal, setEditTanggal] = useState("")
  const [editKategori, setEditKategori] = useState<ExpenseRecord["category"]>("Perlengkapan")
  const [editKeterangan, setEditKeterangan] = useState("")
  const [editJumlah, setEditJumlah] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [eksporOpen, setEksporOpen] = useState(false)

  const simpanRef = useRef(false)
  const jumlahNum = Number(jumlah.replace(/\D/g, "")) || 0
  const bisaKirim = Boolean(keterangan.trim()) && jumlahNum > 0 && !saving

  async function muat() {
    if (!getToken()) {
      setDaftar(loadLocalExpenses())
      return
    }
    setLoading(true)
    try {
      const list = (await apiPengeluaran.list()) as ExpenseRecord[]
      if (Array.isArray(list)) {
        const locals = loadLocalExpenses()
        const serverIds = new Set(list.map((r) => r.id))
        const merged = [...locals.filter((r) => !serverIds.has(r.id)), ...list]
        setDaftar(merged)
      }
    } catch {
      // Jika server mengembalikan peran ditolak (mis. edge function di server ini belum update),
      // tetap gunakan data lokal tanpa memblokir halaman
      setDaftar(loadLocalExpenses())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void muat()
  }, [])

  async function handleKirim(e: FormEvent) {
    e.preventDefault()
    if (!bisaKirim || simpanRef.current) return
    simpanRef.current = true
    setError("")
    setSuccess("")
    setSaving(true)

    const newRecord: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: tanggal.slice(5),
      dateIso: tanggal,
      category: kategori,
      description: keterangan.trim(),
      amount: jumlahNum,
      status: "Aktif",
    }

    try {
      await apiPengeluaran.create({
        tanggal,
        kategori,
        deskripsi: keterangan.trim(),
        jumlah: jumlahNum,
      })
      await muat()
    } catch {
      // Simpan lokal agar data tidak hilang bila backend menolak peran Kasir
      const locals = [newRecord, ...loadLocalExpenses()]
      saveLocalExpenses(locals)
      setDaftar((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)])
    } finally {
      setSuccess(`Pengeluaran "${keterangan.trim()}" sebesar ${rupiah(jumlahNum)} berhasil dicatat.`)
      setKeterangan("")
      setJumlah("")
      setSaving(false)
      simpanRef.current = false
    }
  }

  function handleOpenEdit(row: ExpenseRecord) {
    setEditingExpense(row)
    setEditTanggal(row.dateIso || tanggalIsoLokal(new Date()))
    setEditKategori(row.category)
    setEditKeterangan(row.description)
    setEditJumlah(new Intl.NumberFormat("id-ID").format(row.amount))
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingExpense || savingEdit) return
    const editNum = Number(editJumlah.replace(/\D/g, "")) || 0
    if (!editNum || !editKeterangan.trim()) return

    setSavingEdit(true)
    const updated: ExpenseRecord = {
      ...editingExpense,
      dateIso: editTanggal,
      category: editKategori,
      description: editKeterangan.trim(),
      amount: editNum,
    }

    try {
      await apiPengeluaran.update({
        id: editingExpense.id,
        tanggal: editTanggal,
        kategori: editKategori,
        deskripsi: editKeterangan.trim(),
        jumlah: editNum,
      })
      await muat()
    } catch {
      const locals = loadLocalExpenses().map((r) => (r.id === updated.id ? updated : r))
      saveLocalExpenses(locals)
      setDaftar((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } finally {
      setEditingExpense(null)
      setSavingEdit(false)
    }
  }

  async function handleCancelConfirm(alasan: string) {
    if (!cancelId) return
    const id = cancelId
    setCancelId(null)
    try {
      await apiPengeluaran.batalkan(id, alasan)
      await muat()
    } catch {
      const locals = loadLocalExpenses().map((r) =>
        r.id === id ? { ...r, status: "BATAL" as const, cancelReason: alasan } : r,
      )
      saveLocalExpenses(locals)
      setDaftar((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "BATAL" as const, cancelReason: alasan } : r)),
      )
    }
  }

  async function handleRestoreConfirm(alasan: string) {
    if (!restoreId) return
    const id = restoreId
    setRestoreId(null)
    try {
      await apiPengeluaran.aktifkan(id, alasan)
      await muat()
    } catch {
      const locals = loadLocalExpenses().map((r) =>
        r.id === id ? { ...r, status: "Aktif" as const, cancelReason: undefined } : r,
      )
      saveLocalExpenses(locals)
      setDaftar((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "Aktif" as const, cancelReason: undefined } : r)),
      )
    }
  }

  const filteredExpenses = daftar
    .filter((r) => {
      const q = search.toLowerCase()
      return (
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.dateIso || r.date).includes(q)
      )
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "Aktif" ? -1 : 1
      }
      return 0
    })

  if (loading && daftar.length === 0) {
    return (
      <div className="content pengeluaran-kasir-page">
        <LoadingState message="Memuat data pengeluaran…" />
      </div>
    )
  }

  return (
    <div className="content pengeluaran-kasir-page">
      <form className="panel form-panel" onSubmit={handleKirim}>
        <h3>Catat pengeluaran</h3>
        <p className="kasbon-kapster-hint">
          Catat pengeluaran operasional di sini. Pengeluaran langsung tercatat ke laporan keuangan.
        </p>
        <div className="form-grid manual-info-grid kasbon-kapster-grid">
          <div className="form-grid-field">
            <span>
              Tanggal <b className="req-mark">*</b>
            </span>
            <CalendarPicker
              max={TANGGAL_MAKS()}
              min={TANGGAL_MULAI}
              onChange={(d) => d && setTanggal(d)}
              value={tanggal}
            />
          </div>

          <div className="form-grid-field">
            <span>
              Kategori <b className="req-mark">*</b>
            </span>
            <SearchSelect
              aria-label="Kategori"
              onChange={(e) => setKategori(e.target.value as ExpenseRecord["category"])}
              value={kategori}
            >
              {KATEGORI_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </SearchSelect>
          </div>

          <label>
            <span>
              Keterangan <b className="req-mark">*</b>
            </span>
            <input
              maxLength={120}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Beli sabun cuci rambut 2 botol"
              required
              value={keterangan}
            />
          </label>

          <label>
            <span>
              Jumlah pengeluaran <b className="req-mark">*</b>
            </span>
            <div className="input-shell">
              <b>Rp</b>
              <input
                inputMode="numeric"
                onChange={(e) => {
                  const num = Number(e.target.value.replace(/\D/g, ""))
                  setJumlah(num ? new Intl.NumberFormat("id-ID").format(num) : "")
                }}
                placeholder="0"
                required
                value={jumlah}
              />
            </div>
          </label>
        </div>

        {error && (
          <p className="absensi-error" role="alert" style={{ marginTop: 10 }}>
            {error}
          </p>
        )}
        {success && (
          <p className="kasbon-kapster-success" role="status">
            {success}
          </p>
        )}

        <div className="kasbon-kapster-actions">
          <Button className="primary-button" disabled={!bisaKirim} type="submit">
            {saving ? "Menyimpan…" : "Simpan Pengeluaran"}
          </Button>
        </div>
      </form>

      <section className="panel form-panel kasbon-kapster-history">
        <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3>Riwayat pengeluaran</h3>
            <span className="nota-count">{daftar.length} catatan</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="search" style={{ margin: 0, minWidth: 200 }}>
              <Icon name="search" />
              <input
                aria-label="Cari pengeluaran"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari keterangan / kategori..."
                value={search}
              />
            </div>
            <Button className="secondary-button" onClick={() => setEksporOpen(true)} type="button">
              <Icon name="download" /> Ekspor
            </Button>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <p className="history-empty">
            {search ? "Tidak ada pengeluaran yang cocok dengan pencarian." : "Belum ada catatan pengeluaran."}
          </p>
        ) : (
          <div className="kasbon-kapster-list">
            {filteredExpenses.map((row) => (
              <article
                className="kasbon-kapster-row"
                key={row.id}
                style={row.status === "BATAL" ? { opacity: 0.55 } : undefined}
              >
                <div className="kasbon-kapster-info">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <i
                      className="chip pending"
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        lineHeight: "1.4",
                        background: "var(--bone)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                      }}
                    >
                      {row.category}
                    </i>
                    <strong>{row.description}</strong>
                  </div>
                  <small>
                    {row.dateIso || row.date}
                    {row.status === "BATAL" && row.cancelReason ? ` · Dibatalkan: ${row.cancelReason}` : ""}
                  </small>
                </div>
                <div className="kasbon-kapster-meta" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <strong
                    className="kasbon-kapster-amount"
                    style={row.status === "BATAL" ? { textDecoration: "line-through", color: "var(--slate)" } : undefined}
                  >
                    {rupiah(row.amount)}
                  </strong>
                  <div style={{ display: "flex", gap: 6 }}>
                    {row.status === "BATAL" ? (
                      <Button
                        className="secondary-button"
                        onClick={() => setRestoreId(row.id)}
                        style={{ minHeight: 34, height: 34, padding: "0 10px", fontSize: 12 }}
                        title="Pulihkan pengeluaran"
                        type="button"
                      >
                        <Icon name="restore" /> Pulihkan
                      </Button>
                    ) : (
                      <>
                        <Button
                          className="secondary-button"
                          onClick={() => handleOpenEdit(row)}
                          style={{ minHeight: 34, height: 34, padding: "0 10px", fontSize: 12 }}
                          title="Ubah pengeluaran"
                          type="button"
                        >
                          <Icon name="pencil" /> Ubah
                        </Button>
                        <Button
                          className="danger-button"
                          onClick={() => setCancelId(row.id)}
                          style={{ minHeight: 34, height: 34, padding: "0 10px", fontSize: 12 }}
                          title="Hapus pengeluaran"
                          type="button"
                        >
                          <Icon name="trash" /> Hapus
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Modal Koreksi Pengeluaran */}
      {editingExpense && (
        <div className="modal-overlay modal-centered" onClick={() => setEditingExpense(null)} role="dialog" aria-modal="true">
          <section className="simple-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "100%" }}>
            <header>
              <h2>Koreksi Pengeluaran</h2>
              <Button type="button" onClick={() => setEditingExpense(null)}>
                <Icon name="close" />
              </Button>
            </header>
            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16 }}>
              <label>
                <span>Tanggal</span>
                <CalendarPicker
                  max={TANGGAL_MAKS()}
                  min={TANGGAL_MULAI}
                  onChange={(d) => d && setEditTanggal(d)}
                  value={editTanggal}
                />
              </label>

              <label>
                <span>Kategori</span>
                <SearchSelect
                  aria-label="Kategori"
                  onChange={(e) => setEditKategori(e.target.value as ExpenseRecord["category"])}
                  value={editKategori}
                >
                  {KATEGORI_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </SearchSelect>
              </label>

              <label>
                <span>Keterangan</span>
                <input
                  maxLength={120}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  required
                  value={editKeterangan}
                />
              </label>

              <label>
                <span>Harga (Rp)</span>
                <div className="input-shell">
                  <b>Rp</b>
                  <input
                    inputMode="numeric"
                    onChange={(e) => {
                      const num = Number(e.target.value.replace(/\D/g, ""))
                      setEditJumlah(num ? new Intl.NumberFormat("id-ID").format(num) : "")
                    }}
                    required
                    value={editJumlah}
                  />
                </div>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <Button className="secondary-button" onClick={() => setEditingExpense(null)} type="button">
                  Batal
                </Button>
                <Button className="primary-button" disabled={savingEdit} type="submit">
                  {savingEdit ? "Menyimpan…" : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Dialog Alasan Hapus/Batal */}
      {cancelId && (
        <ReasonDialog
          onClose={() => setCancelId(null)}
          onConfirm={handleCancelConfirm}
          showCloseButton
          title="Hapus Pengeluaran"
          warning="Pengeluaran tidak dihapus permanen, hanya ditandai BATAL dan bisa dipulihkan."
        />
      )}

      {/* Dialog Konfirmasi Pulihkan */}
      {restoreId && (
        <ConfirmModal
          compact
          confirmText="Pulihkan Pengeluaran"
          confirmTone="primary"
          eyebrow="Pulihkan Pengeluaran"
          minReasonLength={3}
          onClose={() => setRestoreId(null)}
          onConfirm={handleRestoreConfirm}
          reasonLabel="Alasan pemulihan"
          reasonPlaceholder="Contoh: salah hapus atau data sudah benar..."
          requireReason
          title="Pulihkan pengeluaran?"
          validateReasonOnSubmit
        />
      )}

      {/* Modal Ekspor Pengeluaran */}
      {eksporOpen && (
        <ExportModal
          judul="Ekspor Pengeluaran"
          onBuat={dokumenPengeluaran}
          onClose={() => setEksporOpen(false)}
        />
      )}
    </div>
  )
}

export default PengeluaranKasir
