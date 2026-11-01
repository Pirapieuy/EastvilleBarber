import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser, Role } from "../../types"
import { CartLine, ReceiptView } from "./CashierPage"

export interface HistoryItemDetail {
  name: string
  qty: number
  price: number
  type: "Layanan" | "Produk"
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
    items: [
      { name: "Hair Coloring", qty: 1, price: 120000, type: "Layanan" },
    ],
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
    voidBy: "Dian Setiawan · Manajer",
    voidTime: "29 Okt 2026, 09:12 WIB",
  },
  {
    id: "INV-291026-0041",
    time: "08.51",
    date: "29 Okt 2026",
    items: [
      { name: "Haircut + Cuci", qty: 1, price: 50000, type: "Layanan" },
    ],
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
}: {
  title: string
  warning: string
  onClose: () => void
  onConfirm?: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  return (
    <div className="modal-overlay">
      <section className="reason-dialog">
        <header>
          <div>
            <p className="eyebrow">Aksi berisiko</p>
            <h2>{title}</h2>
          </div>
          <Button onClick={onClose}>
            <Icon name="close" />
          </Button>
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
            disabled={reason.length < 5}
            onClick={() => {
              if (onConfirm) onConfirm(reason)
              onClose()
            }}
          >
            Konfirmasi
          </Button>
        </footer>
      </section>
    </div>
  )
}

export function HistoryPage({
  currentUser,
  role,
}: {
  currentUser?: AppUser
  role?: Role
} = {}) {
  const userRole = role ?? currentUser?.role ?? "Owner"
  const [txList, setTxList] = useState<HistoryTransactionRecord[]>(
    INITIAL_HISTORY_TRANSACTIONS,
  )
  const [selectedId, setSelectedId] = useState(INITIAL_HISTORY_TRANSACTIONS[0].id)
  const [action, setAction] = useState<null | "void" | "restore">(null)
  const [showReceipt, setShowReceipt] = useState(false)

  const selected = txList.find((tx) => tx.id === selectedId) || txList[0]

  function handleConfirmAction(reason: string) {
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

  if (showReceipt) {
    const subtotal = selected.items.reduce((s, it) => s + it.price * it.qty, 0)
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
        discount={0}
        total={selected.total}
        method={selected.method}
        cash={selected.method === "QRIS" ? 0 : selected.total}
        qris={
          selected.method === "Tunai"
            ? 0
            : selected.method === "QRIS"
              ? selected.total
              : selected.total / 2
        }
        change={0}
        cashier={selected.createdBy}
        onClose={() => setShowReceipt(false)}
      />
    )
  }

  return (
    <div className="content">
      <PageTitle eyebrow="Transaksi" title="Riwayat transaksi" />
      <div className="filters">
        <div className="input-shell">
          <Icon name="calendar" />
          <input defaultValue="2026-10-29" type="date" />
        </div>
        <select defaultValue="Semua kapster">
          <option>Semua kapster</option>
          {["Seva", "Tata", "Faisal", "Fadhil", "Ferdi"].map((barber) => (
            <option key={barber}>{barber}</option>
          ))}
        </select>
      </div>
      <div className="master-detail">
        <section className="panel transaction-list">
          <div className="table-head">
            <span>Nota & Waktu</span>
            <span>Kapster</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {txList.map((tx) => (
            <Button
              className={`transaction-row ${
                tx.status === "BATAL" ? "voided" : ""
              } ${selected.id === tx.id ? "selected" : ""}`}
              key={tx.id}
              onClick={() => setSelectedId(tx.id)}
            >
              <div className="tx-cell-nota">
                <strong>{tx.id}</strong>
                <small>{tx.time}</small>
              </div>
              <span className="tx-cell-kapster">{tx.barber}</span>
              <strong className="tx-cell-total">{rupiah(tx.total)}</strong>
              <i
                className={`chip ${
                  tx.status === "BATAL"
                    ? "batal"
                    : tx.status === "Manual"
                      ? "manual"
                      : "lunas"
                }`}
              >
                {tx.status === "BATAL" ? "Batal" : tx.status}
              </i>
            </Button>
          ))}
        </section>

        <aside className="panel detail">
          <div className="detail-header-row">
            <div>
              <p className="eyebrow">Detail Transaksi</p>
              <h2>{selected.id}</h2>
              <small className="detail-timestamp">
                {selected.date} · {selected.time} WIB
              </small>
            </div>
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
          </div>

          <div className="detail-section">
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
            <div className="detail-total-bar">
              <span>Total Akhir</span>
              <strong>{rupiah(selected.total)}</strong>
            </div>
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
                  {selected.commissionNote}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Log Jejak Audit</h3>
            <div className="audit-timeline">
              <div className="audit-entry">
                <i className="audit-dot created" />
                <div>
                  <strong>Transaksi Dibuat</strong>
                  <small>
                    Dibuat oleh {selected.createdBy} · {selected.createdTime}
                  </small>
                </div>
              </div>
              {selected.status === "BATAL" && (
                <div className="audit-entry voided">
                  <i className="audit-dot voided" />
                  <div>
                    <strong>Transaksi Dibatalkan</strong>
                    <small>
                      Dibatalkan oleh {selected.voidBy} · {selected.voidTime}
                    </small>
                    {selected.voidReason && (
                      <div className="audit-reason-box">
                        Alasan: &ldquo;{selected.voidReason}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="detail-actions-group">
            {selected.status !== "BATAL" ? (
              <>
                <Button
                  className="danger-button"
                  onClick={() => setAction("void")}
                >
                  <Icon name="close" /> Batalkan Transaksi
                </Button>
                <Button
                  className="secondary-button"
                  onClick={() => setShowReceipt(true)}
                >
                  <Icon name="print" /> Cetak Struk
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="secondary-button"
                  onClick={() => setShowReceipt(true)}
                >
                  <Icon name="print" /> Cetak Struk
                </Button>
                {userRole !== "Kasir" && (
                  <Button
                    className="primary-button"
                    onClick={() => setAction("restore")}
                  >
                    <Icon name="restore" /> Pulihkan Transaksi
                  </Button>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
      {action && (
        <ReasonDialog
          title={
            action === "restore" ? "Pulihkan transaksi?" : "Batalkan transaksi?"
          }
          warning={
            action === "restore"
              ? "Laporan periode lama akan berubah."
              : "Data tetap tersimpan dalam riwayat."
          }
          onClose={() => setAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  )
}

export default HistoryPage
