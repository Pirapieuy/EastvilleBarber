import { formatTanggal, TANGGAL_MAKS, TANGGAL_MULAI } from "../../utils/tanggal"
import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { SearchSelect } from "../../components/common/SearchSelect"
import {
  Button,
  CalendarPicker,
  LoadingState,
  rupiah,
} from "../../components/common/UI"
import { AppUser, Role } from "../../types"
import { apiKasir, apiTransaksi, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { CartLine, ReceiptView } from "./CashierPage"

export interface HistoryItemDetail {
  name: string
  qty: number
  price: number
  type: "Layanan" | "Produk"
  refId?: string
  kapsterId?: string
  kapster?: string
}

export interface HistoryTransactionRecord {
  id: string
  time: string
  date: string
  items: HistoryItemDetail[]
  barber: string
  method: "Tunai" | "QRIS" | "Gabungan"
  commission: number
  commissionNote: string
  total: number
  subtotal?: number
  discount?: number
  bayarTunai?: number
  bayarQris?: number
  gratis?: string
  status: "Lunas" | "BATAL" | "Manual"
  createdTime: string
  createdBy: string
  voidReason?: string
  voidBy?: string
  voidTime?: string
}

export const INITIAL_HISTORY_TRANSACTIONS: HistoryTransactionRecord[] = [
  {
    id: "INV-291026-0084",
    time: "10.24",
    date: "29 Okt 2026",
    items: [
      { name: "Haircut", qty: 1, price: 40000, type: "Layanan" },
      { name: "Shaving", qty: 1, price: 20000, type: "Layanan" },
    ],
    barber: "Seva",
    method: "Gabungan",
    commission: 24000,
    commissionNote: "40% total layanan Rp 60.000",
    total: 60000,
    status: "Lunas",
    createdTime: "29 Okt 2026, 10:24 WIB",
    createdBy: "Siti Rahma · Kasir",
  },
  {
    id: "INV-291026-0083",
    time: "09.46",
    date: "29 Okt 2026",
    items: [{ name: "Hair Coloring", qty: 1, price: 120000, type: "Layanan" }],
    barber: "Tata",
    method: "QRIS",
    commission: 48000,
    commissionNote: "40% total layanan Rp 120.000",
    total: 120000,
    status: "Lunas",
    createdTime: "29 Okt 2026, 09:46 WIB",
    createdBy: "Siti Rahma · Kasir",
  },
  {
    id: "INV-291026-0082",
    time: "09.05",
    date: "29 Okt 2026",
    items: [
      { name: "Haircut", qty: 1, price: 40000, type: "Layanan" },
      { name: "Free Style Dust", qty: 1, price: 70000, type: "Produk" },
    ],
    barber: "Faisal",
    method: "Tunai",
    commission: 23000,
    commissionNote: "Layanan Rp 16.000 + Produk Rp 7.000",
    total: 110000,
    status: "BATAL",
    createdTime: "29 Okt 2026, 09:05 WIB",
    createdBy: "Siti Rahma · Kasir",
    voidReason: "Salah input varian produk pomade oleh kasir saat pembayaran",
    voidBy: "Ardi Pradana · Owner",
    voidTime: "29 Okt 2026, 09:12 WIB",
  },
  {
    id: "INV-291026-0041",
    time: "08.51",
    date: "29 Okt 2026",
    items: [{ name: "Haircut + Cuci", qty: 1, price: 50000, type: "Layanan" }],
    barber: "Seva",
    method: "Tunai",
    commission: 20000,
    commissionNote: "Rekap manual shift pagi",
    total: 50000,
    status: "Manual",
    createdTime: "29 Okt 2026, 08:51 WIB",
    createdBy: "Dian Setiawan · Rekap Manual",
  },
  {
    id: "INV-291026-0038",
    time: "08.15",
    date: "29 Okt 2026",
    items: [
      { name: "Haircut", qty: 1, price: 40000, type: "Layanan" },
      { name: "Hair Paste Pomade", qty: 1, price: 70000, type: "Produk" },
    ],
    barber: "Fadhil",
    method: "QRIS",
    commission: 26000,
    commissionNote: "Layanan Rp 16.000 + Produk Rp 10.000",
    total: 110000,
    status: "Lunas",
    createdTime: "29 Okt 2026, 08:15 WIB",
    createdBy: "Siti Rahma · Kasir",
  },
]

export function ReasonDialog({
  title,
  warning,
  onClose,
  onConfirm,
  showCloseButton = true,
}: {
  title: string
  warning: string
  onClose: () => void
  onConfirm?: (reason: string) => void | Promise<void>
  showCloseButton?: boolean
}) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return (
    <div className="modal-overlay modal-centered">
      <section className="reason-dialog">
        <header>
          <div>
            <p className="eyebrow">Aksi berisiko</p>
            <h2>{title}</h2>
          </div>
          {showCloseButton && (
            <Button onClick={onClose}>
              <Icon name="close" />
            </Button>
          )}
        </header>
        <div className="info-banner">
          <Icon name="alert" />
          {warning}
        </div>
        <label>
          <span>
            Alasan <b>Wajib</b>
          </span>
          <textarea
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tuliskan alasan..."
            value={reason}
          />
        </label>
        <footer>
          <Button className="secondary-button" onClick={onClose}>
            Kembali
          </Button>
          <Button
            className="danger-button"
            disabled={reason.trim().length < 5 || busy}
            onClick={async () => {
              setError("")
              setBusy(true)
              try {
                await onConfirm?.(reason.trim())
                onClose()
              } catch (e) {
                setError(e instanceof Error ? e.message : "Aksi gagal.")
                setBusy(false)
              }
            }}
          >
            {busy ? "Memproses..." : "Konfirmasi"}
          </Button>
        </footer>
        {error && (
          <div className="info-banner" role="alert">
            <Icon name="alert" />
            {error}
          </div>
        )}
      </section>
    </div>
  )
}

export function EditTransactionModal({
  transaction,
  onClose,
  onSave,
  catalog,
  barberList,
}: {
  transaction: HistoryTransactionRecord
  onClose: () => void
  onSave: (payload: {
    items: HistoryItemDetail[]
    method: "Tunai" | "QRIS" | "Gabungan"
    reason: string
  }) => Promise<void>
  catalog: { id: string; name: string; price: number; type: "Layanan" | "Produk" }[]
  barberList: { id: string; name: string }[]
}) {
  const [items, setItems] = useState<HistoryItemDetail[]>(() =>
    transaction.items.map((it) => {
      const barberName =
        it.kapster ||
        transaction.barber.split(", ")[0] ||
        barberList[0]?.name ||
        "Kapster"
      const bObj = barberList.find((b) => b.name === barberName)
      return {
        ...it,
        kapster: barberName,
        kapsterId: it.kapsterId || bObj?.id || barberList[0]?.id || "",
        refId:
          it.refId ||
          catalog.find((c) => c.name === it.name)?.id ||
          it.name,
      }
    }),
  )
  const [method, setMethod] = useState<"Tunai" | "QRIS" | "Gabungan">(
    transaction.method,
  )
  const [reason, setReason] = useState("Koreksi varian/item transaksi")
  const [newItemId, setNewItemId] = useState("")
  const [newItemBarber, setNewItemBarber] = useState(
    () => barberList[0]?.name || "",
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0)
  const diskon = Math.min(transaction.discount ?? 0, subtotal)
  const total = Math.max(0, subtotal - diskon)

  function updateItemQty(idx: number, delta: number) {
    setItems((cur) =>
      cur.map((it, i) =>
        i === idx ? { ...it, qty: Math.max(1, it.qty + delta) } : it,
      ),
    )
  }

  function updateItemBarber(idx: number, barberName: string) {
    const bObj = barberList.find((b) => b.name === barberName)
    setItems((cur) =>
      cur.map((it, i) =>
        i === idx
          ? {
              ...it,
              kapster: barberName,
              kapsterId: bObj?.id || it.kapsterId,
            }
          : it,
      ),
    )
  }

  function removeItem(idx: number) {
    if (items.length <= 1) {
      setError("Transaksi harus memiliki minimal 1 item.")
      return
    }
    setError("")
    setItems((cur) => cur.filter((_, i) => i !== idx))
  }

  function handleAddItem() {
    if (!newItemId) return
    const catItem = catalog.find((c) => c.id === newItemId)
    if (!catItem) return
    const bName = newItemBarber || barberList[0]?.name || "Kapster"
    const bId = barberList.find((b) => b.name === bName)?.id || ""

    setItems((cur) => [
      ...cur,
      {
        name: catItem.name,
        price: catItem.price,
        qty: 1,
        type: catItem.type,
        refId: catItem.id,
        kapster: bName,
        kapsterId: bId,
      },
    ])
    setNewItemId("")
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) {
      setError("Item transaksi tidak boleh kosong.")
      return
    }
    if (!reason.trim()) {
      setError("Alasan perubahan wajib diisi untuk log audit.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave({ items, method, reason: reason.trim() })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.")
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay modal-centered">
      <section className="simple-modal edit-trx-modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <p className="eyebrow">Koreksi Transaksi</p>
            <h2>Ubah Nota {transaction.id}</h2>
          </div>
          <Button onClick={onClose} disabled={saving} aria-label="Tutup">
            <Icon name="close" />
          </Button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div className="edit-trx-body">
            {error && (
              <div className="info-banner" role="alert">
                <Icon name="alert" />
                {error}
              </div>
            )}

            <div>
              <label style={{ margin: "0 0 8px 0", fontWeight: 700, fontSize: 13 }}>
                Item Transaksi ({items.length})
              </label>
              <div className="edit-trx-items-list">
                {items.map((it, idx) => (
                  <div key={idx} className="edit-trx-item-row">
                    <div className="edit-trx-item-info">
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <strong>{it.name}</strong>
                        <span className={`chip ${it.type.toLowerCase()}`} style={{ fontSize: 10, padding: "1px 6px" }}>
                          {it.type}
                        </span>
                      </div>
                      <small>@ {rupiah(it.price)}</small>
                    </div>

                    <div className="edit-trx-item-kapster">
                      <select
                        aria-label={`Kapster untuk ${it.name}`}
                        value={it.kapster || barberList[0]?.name}
                        onChange={(e) => updateItemBarber(idx, e.target.value)}
                        style={{ height: 36, fontSize: 12, padding: "0 8px", width: "100%", borderRadius: 7 }}
                      >
                        {barberList.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="edit-trx-item-stepper">
                      <div className="stepper" style={{ minHeight: 36, height: 36 }}>
                        <Button
                          aria-label="Kurangi kuantitas"
                          disabled={it.qty <= 1}
                          onClick={() => updateItemQty(idx, -1)}
                          style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
                        >
                          <Icon name="minus" />
                        </Button>
                        <span style={{ minWidth: 28, fontSize: 13, fontWeight: 700 }}>{it.qty}</span>
                        <Button
                          aria-label="Tambah kuantitas"
                          onClick={() => updateItemQty(idx, 1)}
                          style={{ width: 34, height: 34, minWidth: 34, minHeight: 34 }}
                        >
                          <Icon name="plus" />
                        </Button>
                      </div>
                    </div>

                    <div className="edit-trx-item-price">
                      {rupiah(it.price * it.qty)}
                    </div>

                    <div className="edit-trx-item-del">
                      <Button
                        className="cart-remove-button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        title="Hapus item"
                        style={{ width: 34, height: 34 }}
                      >
                        <Icon name="trash" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ margin: "0 0 6px 0", fontWeight: 700, fontSize: 12, color: "var(--slate)" }}>
                + Tambah Item Pengganti / Tambahan
              </label>
              <div className="edit-trx-add-box">
                <select
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  style={{ height: 38, fontSize: 13, borderRadius: 8 }}
                >
                  <option value="">-- Pilih Layanan / Produk --</option>
                  <optgroup label="Layanan">
                    {catalog
                      .filter((c) => c.type === "Layanan")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({rupiah(c.price)})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Produk">
                    {catalog
                      .filter((c) => c.type === "Produk")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({rupiah(c.price)})
                        </option>
                      ))}
                  </optgroup>
                </select>

                <select
                  value={newItemBarber}
                  onChange={(e) => setNewItemBarber(e.target.value)}
                  style={{ height: 38, fontSize: 13, borderRadius: 8 }}
                >
                  {barberList.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <Button
                  className="secondary-button"
                  onClick={handleAddItem}
                  disabled={!newItemId}
                  style={{ height: 38, minHeight: 38, paddingInline: 14 }}
                >
                  <Icon name="plus" /> Tambah
                </Button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ margin: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Metode Pembayaran</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as "Tunai" | "QRIS" | "Gabungan")}
                  style={{ height: 40, borderRadius: 8 }}
                >
                  <option value="Tunai">Tunai</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Gabungan">Gabungan</option>
                </select>
              </label>

              <label style={{ margin: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Alasan Perubahan *</span>
                <input
                  type="text"
                  required
                  placeholder="Misal: Salah varian pomade"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ height: 40, borderRadius: 8 }}
                />
              </label>
            </div>

            <div className="edit-trx-summary">
              <div>
                <span>Subtotal Item Baru</span>
                <b>{rupiah(subtotal)}</b>
              </div>
              {diskon > 0 && (
                <div style={{ color: "var(--oxblood)" }}>
                  <span>Diskon Nota</span>
                  <b>− {rupiah(diskon)}</b>
                </div>
              )}
              <div className="total">
                <span>Total Akhir Tagihan</span>
                <strong>{rupiah(total)}</strong>
              </div>
            </div>
          </div>

          <footer>
            <Button className="secondary-button" onClick={onClose} disabled={saving}>
              Kembali
            </Button>
            <Button
              className="primary-button"
              type="submit"
              disabled={items.length === 0 || !reason.trim() || saving}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function TransactionDetailBody({
  selected,
  userRole,
  onPrintReceipt,
  onVoid,
  onRestore,
  onEdit,
}: {
  selected: HistoryTransactionRecord
  userRole: string
  onPrintReceipt: () => void
  onVoid?: () => void
  onRestore?: () => void
  onEdit?: () => void
}) {
  const isVoided = selected.status === "BATAL"
  const canVoid = userRole === "Owner" || userRole === "Kasir" || userRole === "Manajer"
  const canRestore = userRole === "Owner"
  const canEdit = !isVoided && (userRole === "Owner" || userRole === "Kasir" || userRole === "Manajer")

  return (
    <>
      {isVoided && (
        <div className="detail-void-notice" role="alert">
          <div className="detail-void-header">
            <Icon name="alert" />
            <strong>Transaksi Ini Telah Dibatalkan</strong>
          </div>
          {selected.voidReason && (
            <p className="detail-void-reason">
              Alasan: <span>{selected.voidReason}</span>
            </p>
          )}
          {(selected.voidBy || selected.voidTime) && (
            <small className="detail-void-meta">
              Dibatalkan oleh {selected.voidBy ?? "-"} · {selected.voidTime ?? ""}
            </small>
          )}
        </div>
      )}

      <div className="detail-section detail-items-section">
        <h3>Item Layanan & Produk ({selected.items.length})</h3>
        <div className="detail-items-list">
          {selected.items.map((item, idx) => (
            <div key={idx} className="detail-item-line">
              <div className="detail-item-info">
                <div className="detail-item-title-row">
                  <strong>{item.name}</strong>
                  <span
                    className={`item-type-badge ${item.type.toLowerCase()}`}
                  >
                    {item.type}
                  </span>
                </div>
                <small>
                  {item.qty} × {rupiah(item.price)}
                </small>
              </div>
              <b className="detail-item-price">
                {rupiah(item.qty * item.price)}
              </b>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-pinned">
        {(selected.discount ?? 0) > 0 && (
          <div className="detail-money-rows">
            <div>
              <span>Subtotal</span>
              <b>
                {rupiah(
                  selected.subtotal ??
                    selected.items.reduce((n, it) => n + it.price * it.qty, 0),
                )}
              </b>
            </div>
            <div className="diskon">
              <span>Diskon</span>
              <b>− {rupiah(selected.discount ?? 0)}</b>
            </div>
          </div>
        )}
        <div className="detail-total-bar">
          <span>Total Akhir</span>
          <strong>{rupiah(selected.total)}</strong>
        </div>

        <div className="detail-section">
          <h3>Info Operasional</h3>
          <div className="detail-cards">
            <div>
              <Icon name={selected.method === "QRIS" ? "qris" : "cash"} />
              <small>Metode Pembayaran</small>
              <strong>{selected.method}</strong>
            </div>
            <div>
              <Icon name="user" />
              <small>Kapster</small>
              <strong>{selected.barber}</strong>
            </div>
            <div>
              <Icon name="wallet" />
              <small>Rincian Komisi</small>
              <strong>{rupiah(selected.commission)}</strong>
              <span className="commission-hint">
                {(selected.commissionNote || "")
                  .replace("(lembur)", "")
                  .replace("50%", "")
                  .trim()}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-actions-group">
          <div className="detail-actions-row">
            <Button className="secondary-button" onClick={onPrintReceipt}>
              <Icon name="print" /> Cetak Struk
            </Button>
            {canEdit && onEdit && (
              <Button className="secondary-button" onClick={onEdit}>
                <Icon name="pencil" /> Ubah Transaksi
              </Button>
            )}
          </div>
          {!isVoided && canVoid && onVoid && (
            <Button className="danger-button action-btn-full" onClick={onVoid}>
              <Icon name="alert" /> Batalkan Transaksi
            </Button>
          )}
          {isVoided && canRestore && onRestore && (
            <Button className="secondary-button restore-btn action-btn-full" onClick={onRestore}>
              <Icon name="restore" /> Pulihkan Transaksi
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

export function HistoryPage({ currentUser, role }: {
  currentUser?: AppUser
  role?: Role
} = {}) {
  const userRole = role ?? currentUser?.role ?? "Owner"
  const [txList, setTxList] = useState<HistoryTransactionRecord[]>(
    INITIAL_HISTORY_TRANSACTIONS,
  )
  const [selectedId, setSelectedId] = useState(
    INITIAL_HISTORY_TRANSACTIONS[0].id,
  )
  const [action, setAction] = useState<null | "void" | "restore">(null)
  const [editingTx, setEditingTx] = useState<HistoryTransactionRecord | null>(null)
  const [returnToMobileDetail, setReturnToMobileDetail] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const [catalog, setCatalog] = useState<{ id: string; name: string; price: number; type: "Layanan" | "Produk" }[]>([
    { id: "1", name: "Haircut", price: 40000, type: "Layanan" },
    { id: "2", name: "Haircut + Cuci", price: 50000, type: "Layanan" },
    { id: "3", name: "Shaving", price: 20000, type: "Layanan" },
    { id: "4", name: "Hair Coloring", price: 120000, type: "Layanan" },
    { id: "5", name: "Free Style Dust", price: 70000, type: "Produk" },
    { id: "6", name: "Hair Paste Pomade", price: 70000, type: "Produk" },
  ])
  const [barberList, setBarberList] = useState<{ id: string; name: string }[]>([
    { id: "1", name: "Seva" },
    { id: "2", name: "Tata" },
    { id: "3", name: "Faisal" },
    { id: "4", name: "Fadhil" },
    { id: "5", name: "Ferdi" },
  ])

  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [barberFilter, setBarberFilter] = useState("Semua kapster")
  const [methodFilter, setMethodFilter] = useState<"Semua" | "Tunai" | "QRIS">(
    "Semua",
  )

  const barberOptions = Array.from(
    new Set(txList.flatMap((tx) => tx.barber.split(", ").filter(Boolean))),
  ).sort()
  // Kapster yang dipilih bisa hilang saat tanggal diganti: kembali ke semua.
  const activeBarber = barberOptions.includes(barberFilter)
    ? barberFilter
    : "Semua kapster"
  const visibleTx = txList.filter(
    (tx) =>
      (activeBarber === "Semua kapster" ||
        tx.barber.split(", ").includes(activeBarber)) &&
      (methodFilter === "Semua" ||
        tx.method === methodFilter ||
        tx.method === "Gabungan"),
  )

  const selected = visibleTx.find((tx) => tx.id === selectedId) || visibleTx[0]
  const selectedDateTime = selected
    ? `${formatTanggal(selected.date)}, ${selected.time.replace(".", ":")}`
    : ""

  // Dengan token login, riwayat diambil dari backend; tanpa token tetap data demo.
  function loadLive(isStale: () => boolean = () => false) {
    return apiTransaksi
      .list(dateFilter ? { dari: dateFilter, sampai: dateFilter } : {})
      .then((rows) => {
        if (isStale()) return
        const list = rows as HistoryTransactionRecord[]
        setTxList(list)
        setSelectedId((cur) =>
          list.some((t) => t.id === cur) ? cur : (list[0]?.id ?? ""),
        )
        setLive(true)
      })
  }
  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    let stale = false
    loadLive(() => stale).catch((e) => {
      if (stale) return
      console.error("Gagal memuat riwayat:", e)
      setTxList([])
      setLiveError(e instanceof Error ? e.message : "gagal memuat data")
    })
    return () => {
      stale = true
    }
  }, [dateFilter])

  useEffect(() => {
    if (getToken()) {
      Promise.all([
        apiKasir.layanan().catch(() => []),
        apiKasir.produk().catch(() => []),
        apiKasir.kapster().catch(() => []),
      ]).then(([lay, prod, kap]) => {
        if (lay.length || prod.length) {
          setCatalog([
            ...lay
              .filter((l) => l.status === "Aktif")
              .map((l) => ({ id: String(l.id), name: l.nama, price: l.harga, type: "Layanan" as const })),
            ...prod
              .filter((p) => p.status === "Aktif")
              .map((p) => ({ id: p.kode, name: p.nama, price: p.harga, type: "Produk" as const })),
          ])
        }
        if (kap.length) {
          setBarberList(kap.map((k) => ({ id: k.id, name: k.nama })))
        }
      })
    }
  }, [])

  async function handleSaveEdit(payload: {
    items: HistoryItemDetail[]
    method: "Tunai" | "QRIS" | "Gabungan"
    reason: string
  }) {
    if (!editingTx) return
    if (live) {
      await apiTransaksi.update({
        id: editingTx.id,
        items: payload.items.map((it) => ({
          refId: it.refId,
          nama: it.name,
          name: it.name,
          qty: it.qty,
          price: it.price,
          harga: it.price,
          type: it.type,
          tipe: it.type,
          kapsterId: it.kapsterId,
          kapster: it.kapster,
        })),
        metode: payload.method,
        alasanEdit: payload.reason,
      })
      await loadLive()
      return
    }

    const subtotal = payload.items.reduce((s, it) => s + it.price * it.qty, 0)
    const diskon = Math.min(editingTx.discount ?? 0, subtotal)
    const total = Math.max(0, subtotal - diskon)
    const barbers = Array.from(
      new Set(payload.items.map((i) => i.kapster).filter(Boolean)),
    ).join(", ")

    setTxList((prev) =>
      prev.map((t) =>
        t.id === editingTx.id
          ? {
              ...t,
              items: payload.items,
              method: payload.method,
              subtotal,
              discount: diskon,
              total,
              barber: barbers || t.barber,
            }
          : t,
      ),
    )
  }

  async function handleConfirmAction(reason: string) {
    if (live && selected) {
      // Error dilempar ke dialog (ditampilkan inline, dialog tetap terbuka)
      if (action === "void") await apiTransaksi.batalkan(selected.id, reason)
      else if (action === "restore")
        await apiTransaksi.pulihkan(selected.id, reason)
      await loadLive()
      return
    }
    if (action === "void") {
      setTxList((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                status: "BATAL",
                voidReason: reason,
                voidBy: `${currentUser?.name || userRole} · ${userRole}`,
                voidTime: "Baru saja",
              }
            : t,
        ),
      )
    } else if (action === "restore") {
      setTxList((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                status: "Lunas",
                voidReason: undefined,
                voidBy: undefined,
                voidTime: undefined,
              }
            : t,
        ),
      )
    }
  }

  // Ada token = data asli sedang dimuat: jangan tampilkan data dummy dulu.
  const loading = Boolean(getToken()) && !live && !liveError
  if (loading) {
    return (
      <div className="content">
        <LoadingState message="Memuat riwayat transaksi…" />
      </div>
    )
  }

  if (showReceipt && selected) {
    const subtotal =
      selected.subtotal ??
      selected.items.reduce((s, it) => s + it.price * it.qty, 0)
    // Server lama belum mengirim rincian bayar: pakai perkiraan dari metode.
    const adaRincian = selected.bayarTunai !== undefined
    const tunai = adaRincian
      ? (selected.bayarTunai ?? 0)
      : selected.method === "QRIS"
        ? 0
        : selected.total
    const qrisBayar = adaRincian
      ? (selected.bayarQris ?? 0)
      : selected.method === "Tunai"
        ? 0
        : selected.method === "QRIS"
          ? selected.total
          : selected.total / 2
    const cartLines: CartLine[] = selected.items.map((it, idx) => ({
      id: idx + 100,
      lineId: `${selected.id}-${idx}`,
      name: it.name,
      price: it.price,
      type: it.type,
      qty: it.qty,
      barber: selected.barber,
    }))
    return (
      <ReceiptView
        cart={cartLines}
        subtotal={subtotal}
        discount={selected.discount ?? 0}
        total={selected.total}
        method={selected.method}
        cash={tunai}
        qris={qrisBayar}
        change={Math.max(0, tunai + qrisBayar - selected.total)}
        cashier={selected.createdBy}
        invoice={selected.id}
        tanggal={selectedDateTime}
        contoh={!live}
        backLabel="Kembali ke Riwayat"
        onClose={() => setShowReceipt(false)}
      />
    )
  }

  return (
    <div className="content history-page-content history-no-scrollbar">
      <DemoNotice live={live} error={liveError} />
      <div className="filters">
        <CalendarPicker
          value={dateFilter}
          onChange={setDateFilter}
          allowClear
          clearLabel="Semua Tanggal"
          placeholder="Semua Tanggal"
          max={TANGGAL_MAKS()}
          min={TANGGAL_MULAI}
        />
        <SearchSelect
          aria-label="Filter kapster"
          className="history-kapster-select"
          onChange={(e) => setBarberFilter(e.target.value)}
          value={activeBarber}
        >
          <option value="Semua kapster">Semua kapster</option>
          {barberOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </SearchSelect>
        <div className="segmented history-method-filter" role="group" aria-label="Filter metode">
          {(["Semua", "Tunai", "QRIS"] as const).map((m) => (
            <Button
              className={methodFilter === m ? "active" : ""}
              key={m}
              onClick={() => setMethodFilter(m)}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>
      <div className="master-detail">
        <section className="panel transaction-list">
          <div className="table-head">
            <span>Nota</span>
            <span>Kapster</span>
            <span>Item</span>
          </div>
          {visibleTx.length === 0 && (
            <p className="history-empty">
              Belum ada transaksi
              {dateFilter ? " pada tanggal ini" : ""}
              {activeBarber !== "Semua kapster" ? ` untuk ${activeBarber}` : ""}
              .
            </p>
          )}
          {visibleTx.map((tx) => (
            <Button
              className={`transaction-row ${
                tx.status === "BATAL" ? "voided" : ""
              } ${selected?.id === tx.id ? "selected" : ""}`}
              key={tx.id}
              onClick={() => {
                setSelectedId(tx.id)
                if (
                  typeof window !== "undefined" &&
                  window.innerWidth <= 1024
                ) {
                  setMobileDetailOpen(true)
                }
              }}
            >
              <div className="tx-cell-col-nota">
                <strong className="tx-cell-nota">{tx.id}</strong>
                <small className="tx-cell-time">
                  {tx.date} · {tx.time}
                </small>
              </div>
              <span className="tx-cell-kapster">{tx.barber}</span>
              <span
                className="tx-cell-items"
                title={tx.items
                  .map((it) => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ""}`)
                  .join(", ")}
              >
                {tx.items
                  .map((it) => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ""}`)
                  .join(", ")}
              </span>
            </Button>
          ))}
        </section>

        {selected && (
          <aside className="panel detail desktop-only-detail">
            <div className="detail-header-row">
              <div>
                <p className="eyebrow">Detail Transaksi</p>
                <h2>{selected.id}</h2>
                <small className="detail-timestamp">
                  {selectedDateTime} WIB
                </small>
              </div>
              {selected.status !== "Lunas" && (
                <i
                  className={`chip ${
                    selected.status === "BATAL"
                      ? "batal"
                      : selected.status === "Manual"
                        ? "manual"
                        : "lunas"
                  }`}
                >
                  {selected.status === "BATAL" ? "Batal" : selected.status}
                </i>
              )}
            </div>

            <TransactionDetailBody
              selected={selected}
              userRole={userRole}
              onPrintReceipt={() => setShowReceipt(true)}
              onEdit={() => setEditingTx(selected)}
              onVoid={() => setAction("void")}
              onRestore={() => setAction("restore")}
            />
          </aside>
        )}
      </div>

      {mobileDetailOpen && selected && (
        <div
          className="modal-overlay mobile-only-modal"
          onClick={() => setMobileDetailOpen(false)}
        >
          <div
            className="transaction-modal-box"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="md:hidden mx-auto my-2 h-1.5 w-12 rounded-full bg-[var(--line)]" />
            <div className="transaction-modal-header">
              <div>
                <p className="eyebrow">Detail Transaksi</p>
                <h2>{selected.id}</h2>
                <small className="detail-timestamp">
                  {selectedDateTime} WIB
                </small>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {selected.status !== "Lunas" && (
                  <i
                    className={`chip ${
                      selected.status === "BATAL"
                        ? "batal"
                        : selected.status === "Manual"
                          ? "manual"
                          : "lunas"
                    }`}
                  >
                    {selected.status === "BATAL" ? "Batal" : selected.status}
                  </i>
                )}
                <Button
                  className="modal-close-icon-btn"
                  onClick={() => setMobileDetailOpen(false)}
                  aria-label="Tutup detail transaksi"
                >
                  <Icon name="close" />
                </Button>
              </div>
            </div>

            <div className="transaction-modal-body">
              <TransactionDetailBody
                selected={selected}
                userRole={userRole}
                onPrintReceipt={() => {
                  setMobileDetailOpen(false)
                  setShowReceipt(true)
                }}
                onEdit={() => {
                  setReturnToMobileDetail(true)
                  setMobileDetailOpen(false)
                  setEditingTx(selected)
                }}
                onVoid={() => {
                  setReturnToMobileDetail(true)
                  setMobileDetailOpen(false)
                  setAction("void")
                }}
                onRestore={() => {
                  setReturnToMobileDetail(true)
                  setMobileDetailOpen(false)
                  setAction("restore")
                }}
              />
            </div>
          </div>
        </div>
      )}
      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          catalog={catalog}
          barberList={barberList}
          onClose={() => {
            setEditingTx(null)
            if (returnToMobileDetail) {
              setReturnToMobileDetail(false)
              setMobileDetailOpen(true)
            }
          }}
          onSave={handleSaveEdit}
        />
      )}
      {action && selected && (
        <ReasonDialog
          title={
            action === "restore" ? "Pulihkan transaksi?" : "Batalkan transaksi?"
          }
          warning={
            action === "restore"
              ? "Laporan periode lama akan berubah."
              : "Data tetap tersimpan dalam riwayat."
          }
          onClose={() => {
            setAction(null)
            if (returnToMobileDetail) {
              setReturnToMobileDetail(false)
              setMobileDetailOpen(true)
            }
          }}
          onConfirm={async (reason) => {
            setReturnToMobileDetail(false)
            await handleConfirmAction(reason)
          }}
        />
      )}
    </div>
  )
}

export default HistoryPage
