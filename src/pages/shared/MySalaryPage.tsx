import { useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "../../components/common/Icon"
import {
  CalendarPicker,
  LoadingState,
  PageTitle,
  rupiah,
  ErrorState,
  Button,
} from "../../components/common/UI"
import {
  AktivitasKapster,
  apiKapster,
  apiGaji,
  getToken,
  HitungGajiResult,
} from "../../api"
import {
  formatTanggal,
  labelPeriode,
  ModePeriode,
  rentangPeriode,
  TANGGAL_MAKS,
  TANGGAL_MULAI,
} from "../../utils/tanggal"
import { AppUser } from "../../types"

interface KapsterTransaction {
  id: string
  date: string
  time: string
  items: { name: string; qty: number; price: number; type: "Layanan" | "Produk" }[]
  barber: string
  method?: "Tunai" | "QRIS" | "Gabungan"
  total?: number
  subtotal?: number
  discount?: number
  status: "Lunas" | "BATAL" | "Manual"
}

function KapsterTransactionDetail({
  transaction,
}: {
  transaction: KapsterTransaction
}) {
  return (
    <>
      <div className="detail-section detail-items-section">
        <h3>Item Layanan &amp; Produk ({transaction.items.length})</h3>
        <div className="detail-items-list">
          {transaction.items.map((item, index) => (
            <div
              key={`${transaction.id}-${index}`}
              className="detail-item-line"
            >
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
      {(transaction.discount ?? 0) > 0 && (
        <div className="detail-money-rows">
          <div>
            <span>Subtotal</span>
            <b>
              {rupiah(
                transaction.subtotal ??
                  transaction.items.reduce(
                    (sum, item) => sum + item.price * item.qty,
                    0,
                  ),
              )}
            </b>
          </div>
          <div className="diskon">
            <span>Diskon</span>
            <b>− {rupiah(transaction.discount ?? 0)}</b>
          </div>
        </div>
      )}
      <div className="detail-total-bar">
        <span>Total Akhir</span>
        <strong>
          {rupiah(
            transaction.total ??
              transaction.items.reduce(
                (sum, item) => sum + item.price * item.qty,
                0,
              ),
          )}
        </strong>
      </div>
    </>
  )
}

function KapsterTransactionHistory({ namaKapster }: { namaKapster: string }) {
  const listRef = useRef<HTMLElement | null>(null)
  const [transactions, setTransactions] = useState<KapsterTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [modePeriode, setModePeriode] = useState<ModePeriode>("Harian")
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState<"Semua" | "Tunai" | "QRIS">(
    "Semua",
  )
  const [selected, setSelected] = useState<KapsterTransaction | null>(null)

  useEffect(() => {
    let stale = false
    setLoading(true)
    setError("")
    setSelected(null)
    apiKapster
      .aktivitas(dateFilter ? rentangPeriode(modePeriode, dateFilter) : {})
      .then((rows) => {
        if (stale) return
        const grouped = new Map<string, KapsterTransaction>()
        for (const row of rows as AktivitasKapster[]) {
          const tx = grouped.get(row.trx) ?? {
            id: row.trx,
            date: row.tanggal ? formatTanggal(row.tanggal) : "",
            time: row.time,
            items: [],
            barber: row.barber || namaKapster,
            method: row.method,
            total: row.total,
            subtotal: row.subtotal,
            discount: row.discount,
            status: row.status || "Lunas",
          }
          tx.items.push({
            name: row.item,
            qty: row.qty,
            price: row.qty ? row.fee / row.qty : row.fee,
            type: row.type,
          })
          grouped.set(row.trx, tx)
        }
        setTransactions(Array.from(grouped.values()))
      })
      .catch((reason: unknown) => {
        if (!stale)
          setError(
            reason instanceof Error
              ? reason.message
              : "Gagal memuat rincian transaksi.",
          )
      })
      .finally(() => {
        if (!stale) setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [dateFilter, modePeriode, namaKapster])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [transactions])

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()
    return transactions.filter(
      (tx) =>
        (!query ||
          [
            tx.id,
            tx.date,
            tx.time,
            tx.barber,
            tx.method,
            String(tx.total),
            ...tx.items.map((item) => item.name),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)) &&
        (methodFilter === "Semua" ||
          !tx.method ||
          tx.method === methodFilter ||
          tx.method === "Gabungan"),
    )
  }, [transactions, search, methodFilter])

  useEffect(() => {
    if (selected && !visibleTransactions.some((tx) => tx.id === selected.id)) {
      setSelected(null)
    }
  }, [selected, visibleTransactions])

  return (
    <section className="panel kapster-activity-panel kapster-transaction-history">
      <PageTitle
        eyebrow="Aktivitas pribadi"
        title="Rincian Transaksi Layanan"
      />
      <div className="history-page-content history-no-scrollbar kapster-history-content">
        <div className="filters">
          <div className="search kapster-transaction-search">
            <Icon name="search" />
            <input
              aria-label="Cari transaksi"
              placeholder="Cari nota, kapster, item..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="kapster-transaction-date">
            <CalendarPicker
              value={dateFilter}
              label={labelPeriode(modePeriode, dateFilter)}
              bulanSaja={modePeriode === "Bulanan"}
              popupHeader={
                <div
                  className="segmented history-periode"
                  role="group"
                  aria-label="Periode"
                >
                  {(["Harian", "Mingguan", "Bulanan"] as const).map((mode) => (
                    <Button
                      className={modePeriode === mode ? "active" : ""}
                      key={mode}
                      type="button"
                      onClick={() => setModePeriode(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              }
              onChange={setDateFilter}
              allowClear
              clearLabel="Semua Tanggal"
              placeholder="Semua Tanggal"
              max={TANGGAL_MAKS()}
              min={TANGGAL_MULAI}
              style={{ width: "100%" }}
            />
          </div>
          <div
            className="segmented history-method-filter"
            role="group"
            aria-label="Filter metode pembayaran"
          >
            {(["Semua", "Tunai", "QRIS"] as const).map((method) => (
              <Button
                className={methodFilter === method ? "active" : ""}
                key={method}
                onClick={() => setMethodFilter(method)}
              >
                {method}
              </Button>
            ))}
          </div>
        </div>
        <div className="master-detail">
          <section ref={listRef} className="panel transaction-list">
            <div className="table-head">
              <span>Nota</span>
              <span>Kapster</span>
              <span>Item</span>
            </div>
            {!loading && visibleTransactions.length === 0 && (
              <p className="history-empty">
                {error ||
                  (search
                    ? "Tidak ada nota yang cocok."
                    : "Belum ada transaksi pada tanggal ini.")}
              </p>
            )}
            {loading ? (
              <LoadingState message="Memuat rincian transaksi..." />
            ) : (
              visibleTransactions.map((tx) => (
                <Button
                  className={`transaction-row ${
                    tx.status === "BATAL" ? "voided" : ""
                  } ${selected?.id === tx.id ? "selected" : ""}`}
                  key={tx.id}
                  onClick={() => setSelected(tx)}
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
                      .map(
                        (item) =>
                          `${item.name}${item.qty > 1 ? ` x${item.qty}` : ""}`,
                      )
                      .join(", ")}
                  >
                    {tx.items
                      .map(
                        (item) =>
                          `${item.name}${item.qty > 1 ? ` x${item.qty}` : ""}`,
                      )
                      .join(", ")}
                  </span>
                </Button>
              ))
            )}
          </section>
        </div>
      </div>
      {selected && (
        <div
          className="modal-overlay mobile-only-modal kapster-transaction-modal"
          onClick={() => setSelected(null)}
        >
          <div
            className="transaction-modal-box"
            role="dialog"
            aria-modal="true"
            aria-label={`Detail transaksi ${selected.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="transaction-modal-header">
              <div>
                <p className="eyebrow">Detail Transaksi</p>
                <h2>{selected.id}</h2>
                <small className="detail-timestamp">
                  {formatTanggal(selected.date)},{" "}
                  {selected.time.replace(".", ":")} WIB
                </small>
                {selected.status !== "Lunas" && (
                  <i
                    className={`chip ${
                      selected.status === "BATAL" ? "batal" : "manual"
                    }`}
                  >
                    {selected.status === "BATAL" ? "Batal" : selected.status}
                  </i>
                )}
              </div>
              <Button
                className="modal-close-icon-btn"
                onClick={() => setSelected(null)}
                aria-label="Tutup detail transaksi"
              >
                <Icon name="close" />
              </Button>
            </div>
            <div className="transaction-modal-body">
              <KapsterTransactionDetail transaction={selected} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export function MySalaryPage({ currentUser }: { currentUser: AppUser }) {
  const [infoTerbuka, setInfoTerbuka] = useState(false)
  const punyaToken = Boolean(getToken())
  const [data, setData] = useState<HitungGajiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function fetchData() {
    if (!getToken()) return
    setLoading(true)
    setError("")
    apiGaji
      .hitung()
      .then((res) => setData(res))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Gagal memuat data gaji."),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!punyaToken) {
    return (
      <div className="mobile-content my-salary-page">
        <PageTitle eyebrow="Pendapatan pribadi" title="Gaji Saya" />
        <p>Silakan login untuk melihat gaji dan komisi Anda.</p>
      </div>
    )
  }

  if (!data && !error) {
    return (
      <div className="loading-state-screen">
        <LoadingState message="Menghitung komisi..." />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mobile-content my-salary-page">
        <ErrorState
          title="Data gaji gagal dimuat"
          message={error}
          onRetry={fetchData}
        />
      </div>
    )
  }

  return (
    <div className="mobile-content my-salary-page">
      <article className="my-salary-hero">
        <span>Komisi</span>
        <strong>{rupiah(data.totalKomisi)}</strong>
        <p>{data.transaksiSelesai} transaksi selesai</p>
        <i>
          <b />
        </i>
        <small>
          {loading
            ? "Memperbarui dari server..."
            : "Dihitung saat transaksi selesai"}
        </small>
      </article>

      <section className="panel salary-breakdown">
        <PageTitle
          eyebrow="Perincian pendapatan"
          title={
            <span className="product-commission-title">
              <span>Rincian gaji & kasbon</span>
              <span className="product-commission-info-anchor">
                <button
                  type="button"
                  className="product-commission-info-button"
                  aria-label="Informasi gaji dan komisi"
                  aria-expanded={infoTerbuka}
                  onClick={() => setInfoTerbuka((open) => !open)}
                >
                  <Icon name="alert" />
                </button>
                {infoTerbuka && (
                  <span
                    className="product-commission-info-popover"
                    role="status"
                  >
                    Hanya data komisi dan transaksi milik akun Anda yang
                    ditampilkan.
                  </span>
                )}
              </span>
            </span>
          }
        />
        <div key="komisi">
          <span>
            <Icon name="cashier" />
          </span>
          <strong>Total komisi layanan & produk</strong>
          <b>{rupiah(data.totalKomisi)}</b>
        </div>
        <div key="kasbon">
          <span>
            <Icon name="wallet" />
          </span>
          <strong>Potongan kasbon aktif</strong>
          <b style={{ color: "var(--oxblood)" }}>
            {data.totalKasbon > 0 ? `− ${rupiah(data.totalKasbon)}` : "Rp 0"}
          </b>
        </div>

        <footer>
          <span>Estimasi bersih diterima</span>
          <strong>{rupiah(data.gajiBersih)}</strong>
        </footer>
      </section>

      {data.kasbonAktif.length > 0 && (
        <section className="panel customer-list">
          <PageTitle eyebrow="Kewajiban" title="Daftar Kasbon Aktif" />
          {data.kasbonAktif.map((k) => (
            <div key={k.id}>
              <span>{k.tanggal}</span>
              <i>
                <Icon name="wallet" />
              </i>
              <strong>{k.catatan || "Kasbon"}</strong>
              <b>− {rupiah(k.jumlah)}</b>
            </div>
          ))}
        </section>
      )}

      <KapsterTransactionHistory namaKapster={currentUser.name} />
    </div>
  )
}

export default MySalaryPage
