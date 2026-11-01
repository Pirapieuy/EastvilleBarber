import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, rupiah } from "../../components/common/UI"
import { AppUser } from "../../types"
import { apiKasir, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"

export type CatalogItem = {
  id: number | string
  name: string
  price: number
  type: "Layanan" | "Produk"
  stock?: number
  consignment?: boolean
}

export const catalog: CatalogItem[] = [
  { id: 1, name: "Haircut", price: 40000, type: "Layanan" },
  { id: 2, name: "Haircut + Cuci", price: 50000, type: "Layanan" },
  { id: 3, name: "Shaving", price: 25000, type: "Layanan" },
  { id: 4, name: "Hair Coloring", price: 120000, type: "Layanan" },
  { id: 5, name: "Treatment", price: 60000, type: "Layanan" },
  { id: 6, name: "Free Style Dust", price: 70000, type: "Produk", stock: 3 },
  { id: 7, name: "Hair Paste Pomade", price: 70000, type: "Produk", stock: 8 },
  {
    id: 8,
    name: "Water Based Pomade",
    price: 70000,
    type: "Produk",
    stock: 5,
    consignment: true,
  },
  {
    id: 9,
    name: "Miracle Treatment",
    price: 70000,
    type: "Produk",
    stock: 0,
    consignment: true,
  },
]

export type CartLine = CatalogItem & {
  lineId: string
  qty: number
  barber: string
}

export function ReceiptView({
  cart,
  subtotal,
  discount,
  total,
  method,
  cash,
  qris,
  change,
  cashier,
  invoice = "INV-291026-0084",
  onClose,
}: {
  cart: CartLine[]
  subtotal: number
  discount: number
  total: number
  method: "Tunai" | "QRIS" | "Gabungan"
  cash: number
  qris: number
  change: number
  cashier: string
  invoice?: string
  onClose: () => void
}) {
  const [size, setSize] = useState<"58" | "80">("58")
  return (
    <div className="flow-page">
      <div className="flow-toolbar">
        <Button onClick={onClose}>
          <Icon name="back" /> Kembali
        </Button>
        <div className="segmented">
          <Button
            className={size === "58" ? "active" : ""}
            onClick={() => setSize("58")}
          >
            58 mm
          </Button>
          <Button
            className={size === "80" ? "active" : ""}
            onClick={() => setSize("80")}
          >
            80 mm
          </Button>
        </div>
        <Button className="primary-button" onClick={() => window.print()}>
          <Icon name="print" /> Cetak
        </Button>
      </div>
      <div className="receipt-stage">
        <article className={`thermal-receipt size-${size}`} id="print-receipt">
          <header>
            <div>E</div>
            <h2>EASTVILLE</h2>
            <p>EASTVILLE BARBERSHOP</p>
          </header>
          <hr />
          <dl>
            <div>
              <dt>Tanggal</dt>
              <dd>29 Okt 2026 · 10.24</dd>
            </div>
            <div>
              <dt>No. nota</dt>
              <dd>{invoice}</dd>
            </div>
            <div>
              <dt>Kasir</dt>
              <dd>{cashier}</dd>
            </div>
          </dl>
          <hr />
          {cart.map((line) => (
            <div className="receipt-item" key={line.lineId}>
              <span>
                <strong>{line.name}</strong>
                <small>
                  Kapster: {line.barber} · {line.qty} ×{" "}
                  {new Intl.NumberFormat("id-ID").format(line.price)}
                </small>
              </span>
              <b>
                {new Intl.NumberFormat("id-ID").format(line.price * line.qty)}
              </b>
            </div>
          ))}
          <hr />
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{new Intl.NumberFormat("id-ID").format(subtotal)}</dd>
            </div>
            <div>
              <dt>Diskon</dt>
              <dd>− {new Intl.NumberFormat("id-ID").format(discount)}</dd>
            </div>
            <div className="receipt-total">
              <dt>TOTAL</dt>
              <dd>{rupiah(total)}</dd>
            </div>
          </dl>
          <hr />
          <dl>
            <div>
              <dt>Metode</dt>
              <dd>{method}</dd>
            </div>
            {method !== "QRIS" && (
              <div>
                <dt>Tunai</dt>
                <dd>{new Intl.NumberFormat("id-ID").format(cash)}</dd>
              </div>
            )}
            {method !== "Tunai" && (
              <div>
                <dt>QRIS</dt>
                <dd>{new Intl.NumberFormat("id-ID").format(qris)}</dd>
              </div>
            )}
            <div>
              <dt>Kembalian</dt>
              <dd>{new Intl.NumberFormat("id-ID").format(change)}</dd>
            </div>
          </dl>
          <hr />
          <footer>
            <strong>TERIMA KASIH</strong>
            <p>Sudah mempercayakan gaya Anda kepada Eastville.</p>
            <small>@eastvillebarbershop</small>
          </footer>
        </article>
      </div>
    </div>
  )
}

export function CashierPage({
  currentUser,
  onNavigate,
}: {
  currentUser?: AppUser
  onNavigate?: (page: string) => void
} = {}) {
  const [tab, setTab] = useState<"Layanan" | "Produk">("Layanan")
  const [selectedBarber, setSelectedBarber] = useState("Seva")
  const [cart, setCart] = useState<CartLine[]>([
    { ...catalog[0], lineId: `${catalog[0].id}-Seva`, qty: 1, barber: "Seva" },
    {
      ...catalog[2],
      lineId: `${catalog[2].id}-Tata`,
      qty: 1,
      barber: "Tata",
    },
  ])
  const [method, setMethod] = useState<"Tunai" | "QRIS" | "Gabungan">("Tunai")
  const [cash, setCash] = useState(catalog[0].price + catalog[2].price)
  const [qris, setQris] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [discountMode, setDiscountMode] = useState<"Nominal" | "Persen">("Nominal")
  const [discountDraft, setDiscountDraft] = useState(0)
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState<number | null>(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [receipt, setReceipt] = useState(false)

  // Mode live: katalog & kapster dari backend (butuh token login). Tanpa token
  // halaman tetap memakai data demo.
  const [live, setLive] = useState(false)
  const [catalogData, setCatalogData] = useState<CatalogItem[]>(catalog)
  const [barberList, setBarberList] = useState<{ id?: string; name: string }[]>(
    ["Seva", "Tata", "Faisal", "Fadhil", "Ferdi"].map((name) => ({ name })),
  )
  const [invoice, setInvoice] = useState<string | undefined>()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [liveError, setLiveError] = useState("")

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    Promise.all([apiKasir.layanan(), apiKasir.produk(), apiKasir.kapster()])
      .then(([layanan, produk, kapster]) => {
        setCatalogData([
          ...layanan
            .filter((l) => l.status === "Aktif")
            .map((l): CatalogItem => ({ id: l.id, name: l.nama, price: l.harga, type: "Layanan" })),
          ...produk
            .filter((p) => p.status === "Aktif")
            .map((p): CatalogItem => ({
              id: p.kode,
              name: p.nama,
              price: p.harga,
              type: "Produk",
              stock: p.stok,
            })),
        ])
        setBarberList(kapster.map((k) => ({ id: k.id, name: k.nama })))
        setSelectedBarber(kapster[0]?.nama ?? "")
        setCart([])
        setCash(0)
        setLive(true)
      })
      .catch((e) => {
        console.error("Gagal memuat data kasir:", e)
        setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
  }, [])

  async function pay() {
    if (!live) return setReceipt(true)
    setPayError("")
    setPaying(true)
    try {
      const res = await apiKasir.checkout({
        metode: method,
        diskon: effectiveDiscount,
        bayarTunai: method === "QRIS" ? 0 : cash,
        bayarQris: method === "Tunai" ? 0 : qris,
        items: cart.map((l) => ({
          tipe: l.type,
          refId: l.id,
          qty: l.qty,
          kapsterId: barberList.find((b) => b.name === l.barber)?.id ?? "",
        })),
      })
      setInvoice(res.id)
      setReceipt(true)
      // Segarkan stok produk setelah terjual
      apiKasir.produk().then((produk) =>
        setCatalogData((cur) =>
          cur.map((c) => {
            const p = produk.find((x) => x.kode === c.id)
            return p ? { ...c, stock: p.stok } : c
          }),
        ),
      )
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Transaksi gagal.")
    } finally {
      setPaying(false)
    }
  }

  const items = catalogData.filter((x) => x.type === tab)
  const total = cart.reduce((s, x) => s + x.price * x.qty, 0)
  const effectiveDiscount =
    appliedDiscountPercent === null
      ? discount
      : Math.round((total * appliedDiscountPercent) / 100)
  const payableTotal = Math.max(0, total - effectiveDiscount)
  const paid =
    method === "Tunai" ? cash : method === "QRIS" ? qris : cash + qris
  const shortage = Math.max(0, payableTotal - paid)
  const change =
    method === "QRIS" ? 0 : Math.max(0, cash - (payableTotal - qris))

  if (currentUser && currentUser.role !== "Kasir") {
    return (
      <div className="content">
        <div className="role-denied-box">
          <Icon name="lock" />
          <h3>Akses Dibatasi: Khusus Kasir</h3>
          <p>
            Halaman Kasir (POS input transaksi) hanya dapat diakses oleh peran{" "}
            <strong>Kasir</strong>. Peran Anda saat ini adalah{" "}
            <strong>{currentUser.role}</strong>.
          </p>
          {onNavigate && (
            <Button
              className="primary-button"
              onClick={() => onNavigate("BerandaManajer")}
            >
              Kembali ke Beranda
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Ada token = data asli sedang dimuat: jangan tampilkan data dummy dulu.
  const loading = Boolean(getToken()) && !live && !liveError
  if (loading) {
    return (
      <div className="content">
        <p>Memuat kasir...</p>
      </div>
    )
  }

  if (receipt) {
    return (
      <ReceiptView
        cart={cart}
        subtotal={total}
        discount={effectiveDiscount}
        total={payableTotal}
        method={method}
        cash={cash}
        qris={qris}
        change={change}
        cashier={currentUser?.name ?? "Siti Rahma"}
        invoice={invoice}
        onClose={() => {
          setReceipt(false)
          if (live) {
            setCart([])
            setCash(0)
            setQris(0)
            setDiscount(0)
            setAppliedDiscountPercent(null)
          }
        }}
      />
    )
  }

  return (
    <div className="cashier-page">
      <section className="catalog">
        <DemoNotice live={live} error={liveError} />
        <div className="cashier-heading">
          <small>KASIR</small>
          <span>Pilih layanan</span>
        </div>
        <section className="barber-picker">
          <div className="barber-picker-label">
            <span className="item-icon">
              <Icon name="user" />
            </span>
            <small>Kapster aktif</small>
          </div>
          <div className="barber-options">
            {barberList.map(({ name: barber }) => (
              <Button
                className={`barber-btn ${selectedBarber === barber ? "active" : ""}`}
                key={barber}
                onClick={() => setSelectedBarber(barber)}
              >
                <i>{barber.charAt(0)}</i>
                <span>{barber}</span>
              </Button>
            ))}
          </div>
        </section>
        <div className="catalog-tools">
          <div className="segmented">
            <Button
              className={tab === "Layanan" ? "active" : ""}
              onClick={() => setTab("Layanan")}
            >
              Layanan
            </Button>
            <Button
              className={tab === "Produk" ? "active" : ""}
              onClick={() => setTab("Produk")}
            >
              Produk
            </Button>
          </div>
          <div className="search">
            <Icon name="search" />
            <input placeholder={`Cari ${tab.toLowerCase()}...`} />
          </div>
        </div>
        <div className="catalog-grid">
          {items.map((item) => (
            <Button
              className={`catalog-item ${item.stock === 0 ? "disabled" : ""}`}
              disabled={item.stock === 0}
              key={item.id}
              onClick={() =>
                setCart((c) => {
                  const found = c.find(
                    (x) => x.id === item.id && x.barber === selectedBarber,
                  )
                  return found
                    ? c.map((x) =>
                        x.lineId === found.lineId
                          ? { ...x, qty: x.qty + 1 }
                          : x,
                      )
                    : [
                        ...c,
                        {
                          ...item,
                          lineId: `${item.id}-${selectedBarber}`,
                          qty: 1,
                          barber: selectedBarber,
                        },
                      ]
                })
              }
            >
              <span className="item-icon">
                <Icon name={item.type === "Produk" ? "product" : "cashier"} />
              </span>
              <strong>{item.name}</strong>
              <b>{rupiah(item.price)}</b>
              {item.type === "Produk" && (
                <small>
                  <i>
                    {item.stock === 0 ? "Stok habis" : `Stok ${item.stock}`}
                  </i>
                  {item.consignment && <em>Titipan</em>}
                </small>
              )}
            </Button>
          ))}
        </div>
      </section>
      <aside className="cart">
        <div className="cart-panel">
          <div className="cart-tabs">
            <span className="cart-tab-active">
              <Icon name="receipt" /> Pesanan saat ini
            </span>
            <b className="cart-tab-count">
              {cart.reduce((sum, line) => sum + line.qty, 0)} item
            </b>
          </div>
          <div className="cart-lines">
            {cart.length === 0 ? (
              <div className="empty">
                <Icon name="receipt" />
                <strong>Keranjang kosong</strong>
                <span>Ketuk item untuk memulai.</span>
              </div>
            ) : (
              cart.map((line) => (
                <article key={line.lineId}>
                  <div>
                    <span className="cart-line-title">
                      <strong>{line.name}</strong>
                      <small>
                        <Icon name="user" /> Kapster: {line.barber}
                      </small>
                    </span>
                    <Button
                      onClick={() =>
                        setCart((c) =>
                          c.filter((x) => x.lineId !== line.lineId),
                        )
                      }
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                  <div>
                    <div className="stepper">
                      <Button
                        onClick={() =>
                          setCart((c) =>
                            c.map((x) =>
                              x.lineId === line.lineId
                                ? { ...x, qty: Math.max(1, x.qty - 1) }
                                : x,
                            ),
                          )
                        }
                      >
                        <Icon name="minus" />
                      </Button>
                      <span>{line.qty}</span>
                      <Button
                        onClick={() =>
                          setCart((c) =>
                            c.map((x) =>
                              x.lineId === line.lineId
                                ? { ...x, qty: x.qty + 1 }
                                : x,
                            ),
                          )
                        }
                      >
                        <Icon name="plus" />
                      </Button>
                    </div>
                    <b>{rupiah(line.price * line.qty)}</b>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="cart-total">
            <div>
              <span>Subtotal</span>
              <strong>{rupiah(total)}</strong>
            </div>
            <Button
              className="discount-button"
              onClick={() => {
                setDiscountDraft(
                  discountMode === "Persen"
                    ? (appliedDiscountPercent ?? 0)
                    : discount,
                )
                setDiscountOpen(!discountOpen)
              }}
            >
              <Icon name="lock" /> Beri diskon
            </Button>
            {discountOpen && (
              <div className="cart-discount-panel">
                <div className="discount-mode segmented">
                  {(["Nominal", "Persen"] as const).map((mode) => (
                    <Button
                      className={discountMode === mode ? "active" : ""}
                      key={mode}
                      onClick={() => {
                        setDiscountMode(mode)
                        setDiscountDraft(
                          mode === "Persen"
                            ? (appliedDiscountPercent ?? 0)
                            : discount,
                        )
                      }}
                    >
                      {mode === "Nominal" ? "Nominal (Rp)" : "Persen (%)"}
                    </Button>
                  ))}
                </div>
                <label>
                  <span>PIN Owner/Manajer</span>
                  <div className="input-shell">
                    <Icon name="lock" />
                    <input defaultValue="123456" type="password" />
                  </div>
                </label>
                <label>
                  <span>
                    {discountMode === "Persen"
                      ? "Persentase diskon"
                      : "Nilai diskon"}
                  </span>
                  <div className="input-shell">
                    <b>{discountMode === "Persen" ? "%" : "Rp"}</b>
                    <input
                      inputMode="numeric"
                      onChange={(e) =>
                        setDiscountDraft(
                          Number(e.target.value.replace(/\D/g, "")),
                        )
                      }
                      value={discountDraft}
                    />
                  </div>
                </label>
                <div>
                  <Button
                    className="text-button"
                    onClick={() => setDiscountOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    className="secondary-button"
                    onClick={() => {
                      const normalizedDiscount =
                        discountMode === "Persen"
                          ? Math.min(discountDraft, 100)
                          : Math.min(discountDraft, total)
                      const appliedDiscount =
                        discountMode === "Persen"
                          ? Math.round((total * normalizedDiscount) / 100)
                          : normalizedDiscount
                      const updatedTotal = Math.max(0, total - appliedDiscount)
                      setDiscount(appliedDiscount)
                      setAppliedDiscountPercent(
                        discountMode === "Persen" ? normalizedDiscount : null,
                      )
                      if (method === "Tunai") {
                        setCash(updatedTotal)
                        setQris(0)
                      } else if (method === "QRIS") {
                        setCash(0)
                        setQris(updatedTotal)
                      } else {
                        const cashPart = Math.min(cash, updatedTotal)
                        setCash(cashPart)
                        setQris(updatedTotal - cashPart)
                      }
                      setDiscountOpen(false)
                    }}
                  >
                    Terapkan
                  </Button>
                </div>
              </div>
            )}
            {discount > 0 && (
              <div className="discount-applied">
                <span>
                  Diskon terotorisasi
                  {appliedDiscountPercent !== null &&
                    ` (${appliedDiscountPercent}%)`}
                </span>
                <strong>− {rupiah(effectiveDiscount)}</strong>
              </div>
            )}
            <div className="grand">
              <span>Total</span>
              <strong>{rupiah(payableTotal)}</strong>
            </div>
            <section className="cart-payment">
              <div className="cart-payment-heading">
                <small>Pembayaran</small>
                <Icon name="wallet" />
              </div>
              <div className="method-grid">
                {(["Tunai", "QRIS", "Gabungan"] as const).map((value) => (
                  <Button
                    className={method === value ? "active" : ""}
                    key={value}
                    onClick={() => {
                      setMethod(value)
                      if (value === "Tunai") {
                        setCash(payableTotal)
                        setQris(0)
                      } else if (value === "QRIS") {
                        setCash(0)
                        setQris(payableTotal)
                      } else {
                        const cashPart = Math.min(30000, payableTotal)
                        setCash(cashPart)
                        setQris(payableTotal - cashPart)
                      }
                    }}
                  >
                    <Icon name={value === "QRIS" ? "qris" : "cash"} />
                    <strong>{value}</strong>
                  </Button>
                ))}
              </div>
              <div className="money-fields">
                {method !== "QRIS" && (
                  <label>
                    <span>Jumlah Tunai</span>
                    <div className="input-shell">
                      <b>Rp</b>
                      <input
                        inputMode="numeric"
                        onChange={(e) =>
                          setCash(Number(e.target.value.replace(/\D/g, "")))
                        }
                        value={cash}
                      />
                    </div>
                  </label>
                )}
                {method !== "Tunai" && (
                  <label>
                    <span>Jumlah QRIS</span>
                    <div className="input-shell">
                      <b>Rp</b>
                      <input
                        inputMode="numeric"
                        onChange={(e) =>
                          setQris(Number(e.target.value.replace(/\D/g, "")))
                        }
                        value={qris}
                      />
                    </div>
                  </label>
                )}
              </div>
              {method !== "Tunai" && (
                <div className="cart-qris-note">
                  <Icon name="qris" /> Pastikan pembayaran QRIS sudah masuk.
                </div>
              )}
              <div
                className={`payment-result ${shortage ? "danger" : "success"}`}
              >
                <span>{shortage ? "Pembayaran kurang" : "Kembalian"}</span>
                <strong>
                  {shortage ? `Kurang ${rupiah(shortage)}` : rupiah(change)}
                </strong>
              </div>
              <Button
                className="primary-button cart-submit"
                disabled={!cart.length || shortage > 0 || paying}
                onClick={pay}
              >
                {paying ? "Memproses..." : "Bayar"} <Icon name="cash" />
              </Button>
              {payError && <small className="pin-helper">{payError}</small>}
            </section>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default CashierPage
