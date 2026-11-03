import { useEffect, useRef, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, rupiah } from "../../components/common/UI"
import { AppUser } from "../../types"
import { apiKasir, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { getPromoDiscounts, PromoDiscount } from "../../utils/promoStorage"

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
  tanggal,
  contoh,
  backLabel = "Transaksi Baru (Selesai)",
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
  /** Teks tanggal transaksi; kosong = waktu sekarang (struk baru) */
  tanggal?: string
  /** Struk dari data demo (tidak tersimpan di server) */
  contoh?: boolean
  backLabel?: string
  onClose: () => void
}) {
  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n)
  const teksWa = [
    `*EASTVILLE BARBERSHOP*`,
    `Nota: ${invoice}`,
    ...cart.map((l) => `${l.name} (${l.barber}) ${l.qty} x ${fmt(l.price)} = ${fmt(l.price * l.qty)}`),
    discount > 0 ? `Diskon: -${fmt(discount)}` : "",
    `*TOTAL: Rp ${fmt(total)}* (${method})`,
    `Terima kasih sudah mempercayakan gaya Anda kepada Eastville.`,
  ]
    .filter(Boolean)
    .join("\n")
  const [size, setSize] = useState<"58" | "80">("58")
  return (
    <div className="flow-page">
      <div className="flow-toolbar">
        <Button className="primary-button" onClick={onClose}>
          <Icon name="check" /> {backLabel}
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
        <Button
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(teksWa)}`, "_blank")}
        >
          Kirim WhatsApp
        </Button>
        <div style={{ display: "flex", gap: 8 }}>
          <Button className="primary-button" onClick={() => window.print()}>
            <Icon name="print" /> Cetak
          </Button>
          <Button className="secondary-button" onClick={onClose}>
            <Icon name="arrow" /> Kembali
          </Button>
        </div>
      </div>
      <div className="receipt-stage">
        <article className={`thermal-receipt size-${size}`} id="print-receipt">
          <header>
            <div>E</div>
            <h2>EASTVILLE</h2>
            <p>EASTVILLE BARBERSHOP</p>
            {contoh && <p><strong>*** CONTOH (DEMO) ***</strong></p>}
          </header>
          <hr />
          <dl>
            <div>
              <dt>Tanggal</dt>
              <dd>
                {tanggal ??
                  new Date()
                    .toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
                    .replace(",", " ·")}
              </dd>
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
  const [cari, setCari] = useState("")
  const [selectedBarber, setSelectedBarber] = useState("Budi Santoso")
  const [cart, setCart] = useState<CartLine[]>([
    { ...catalog[0], lineId: `${catalog[0].id}-Budi Santoso`, qty: 1, barber: "Budi Santoso" },
    {
      ...catalog[2],
      lineId: `${catalog[2].id}-Zhefitra Ananda`,
      qty: 1,
      barber: "Zhefitra Ananda",
    },
  ])
  const [method, setMethod] = useState<"Tunai" | "QRIS" | "Gabungan">("Tunai")
  const [cash, setCash] = useState(catalog[0].price + catalog[2].price)
  const [qris, setQris] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [discountMode, setDiscountMode] = useState<"Nominal" | "Persen">("Nominal")
  const [discountDraft, setDiscountDraft] = useState(0)
  const [pinChecking, setPinChecking] = useState(false)
  const [discountPinError, setDiscountPinError] = useState("")
  const [discountReason, setDiscountReason] = useState("")
  const [discountReasonDraft, setDiscountReasonDraft] = useState("")
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState<number | null>(null)
  const [discountTypeTab, setDiscountTypeTab] = useState<"event" | "manual">("event")
  const [promosList, setPromosList] = useState<PromoDiscount[]>([])
  const [discountOpen, setDiscountOpen] = useState(false)
  const [receipt, setReceipt] = useState(false)

  // Mode live: katalog & kapster dari backend (butuh token login). Tanpa token
  // halaman tetap memakai data demo.
  const [live, setLive] = useState(false)
  const [catalogData, setCatalogData] = useState<CatalogItem[]>(catalog)
  const [barberList, setBarberList] = useState<{ id?: string; name: string }[]>(
    ["Budi Santoso", "Zhefitra Ananda", "Seva", "Tata Pratama", "Faisal Rahman", "Ferdi"].map((name) => ({ name })),
  )
  const [invoice, setInvoice] = useState<string | undefined>()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [liveError, setLiveError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [pinAtasan, setPinAtasan] = useState("")
  // Id unik per percobaan bayar: kirim ulang setelah timeout tidak membuat nota ganda.
  const requestId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
  const punyaToken = !!getToken()
  const gagalMuat = punyaToken && !live

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    setLiveError("")
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
  }, [reloadKey])

  async function pay() {
    if (!live) return setReceipt(true)
    setPayError("")
    setPaying(true)
    try {
      const res = await apiKasir.checkout({
        metode: method,
        diskon: effectiveDiscount,
        gratis,
        alasan: discountReason || undefined,
        pinOtorisasi: effectiveDiscount > 0 ? pinAtasan : undefined,
        clientRequestId: requestId.current,
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
      requestId.current = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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

  /** Cek PIN Owner/Manajer saat "Terapkan" diskon (server memakai batas 5x salah); demo memakai 123456. */
  async function cekPinDiskon(): Promise<boolean> {
    const pin = pinAtasan.trim()
    if (!/^\d{6}$/.test(pin)) {
      setDiscountPinError("PIN otorisasi harus 6 digit angka.")
      return false
    }
    if (!live) {
      if (pin === "123456") return true
      setDiscountPinError("PIN otorisasi salah. Default demo: 123456")
      return false
    }
    setPinChecking(true)
    try {
      await apiKasir.verifikasiPin(pin)
      setDiscountPinError("")
      return true
    } catch (e) {
      setDiscountPinError(e instanceof Error ? e.message : "PIN gagal diperiksa. Coba lagi.")
      return false
    } finally {
      setPinChecking(false)
    }
  }

  const items = catalogData.filter(
    (x) => x.type === tab && x.name.toLowerCase().includes(cari.trim().toLowerCase()),
  )
  const total = cart.reduce((s, x) => s + x.price * x.qty, 0)
  // Jumlah produk di keranjang (semua kapster) dibatasi stok yang tersisa.
  const qtyDiKeranjang = (id: number | string) =>
    cart.filter((x) => x.id === id).reduce((s, x) => s + x.qty, 0)
  const stokHabis = (id: number | string, stock?: number) =>
    stock !== undefined && qtyDiKeranjang(id) >= stock
  const effectiveDiscount =
    appliedDiscountPercent === null
      ? discount
      : Math.round((total * appliedDiscountPercent) / 100)
  // Diskon yang menutup seluruh subtotal = transaksi gratis (promo/traktiran): alasan wajib.
  const gratis = total > 0 && effectiveDiscount >= total
  const draftPenuh =
    total > 0 &&
    (discountMode === "Persen" ? discountDraft >= 100 : discountDraft >= total)
  const payableTotal = Math.max(0, total - effectiveDiscount)
  const paid =
    method === "Tunai" ? cash : method === "QRIS" ? qris : cash + qris
  const shortage = Math.max(0, payableTotal - paid)
  const change =
    method === "QRIS" ? 0 : Math.max(0, cash - (payableTotal - qris))

  // Pembayaran mengikuti total otomatis (item/diskon/metode berubah); kasir tetap bisa mengetik manual.
  useEffect(() => {
    if (method === "Tunai") {
      setCash(payableTotal)
      setQris(0)
    } else if (method === "QRIS") {
      setCash(0)
      setQris(payableTotal)
    } else {
      const cashPart = Math.round(payableTotal / 2 / 1000) * 1000
      setCash(cashPart)
      setQris(Math.max(0, payableTotal - cashPart))
    }
  }, [payableTotal, method])

  const payDisabledReason = ((): string | null => {
    if (!cart.length) return null
    if (gagalMuat) return "Data kasir belum termuat. Tekan Coba lagi di atas."
    if (paying) return "Sedang memproses pembayaran..."
    if (shortage > 0) {
      return `Pembayaran masih kurang ${rupiah(shortage)}.`
    }
    if (payableTotal === 0 && !discountReason.trim()) {
      return "Tagihan Rp 0. Masukkan keterangan diskon di menu Beri Diskon."
    }
    return null
  })()

  if (currentUser && currentUser.role !== "Kasir") {
    const homePage =
      currentUser.role === "Owner"
        ? "BerandaOwner"
        : currentUser.role === "Kapster"
          ? "BerandaKapster"
          : "BerandaManajer"
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
              onClick={() => onNavigate(homePage)}
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

  const pinLabel = (
    <label>
      <span>PIN Otorisasi Manajer/Owner</span>
      <div className="input-shell">
        <Icon name="lock" />
        <input
          autoComplete="off"
          inputMode="numeric"
          maxLength={6}
          onChange={(e) => {
            setPinAtasan(e.target.value.replace(/\D/g, ""))
            setDiscountPinError("")
          }}
          placeholder={live ? "6 digit PIN" : "6 digit PIN (demo: 123456)"}
          type="password"
          value={pinAtasan}
        />
      </div>
      {discountPinError && (
        <small style={{ color: "#dc2626", fontSize: 11, marginTop: 4, display: "block" }}>
          {discountPinError}
        </small>
      )}
    </label>
  )

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
        contoh={!live}
        onClose={() => {
          setReceipt(false)
          setCart([])
          setCash(0)
          setQris(0)
          setDiscount(0)
          setAppliedDiscountPercent(null)
          setDiscountReason("")
          setDiscountReasonDraft("")
          setPinAtasan("")
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
            <input
              placeholder={`Cari ${tab.toLowerCase()}...`}
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>
        </div>
        <div className="catalog-grid">
          {items.length === 0 && (
            <p style={{ color: "var(--slate)", gridColumn: "1 / -1", padding: "16px 0" }}>
              Tidak ada {tab.toLowerCase()} yang cocok.
            </p>
          )}
          {items.map((item) => (
            <Button
              className={`catalog-item ${item.stock === 0 ? "disabled" : ""}`}
              disabled={item.stock === 0 || stokHabis(item.id, item.stock) || !selectedBarber}
              title={!selectedBarber ? "Pilih kapster dulu" : stokHabis(item.id, item.stock) ? "Stok habis di keranjang" : undefined}
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
                    <label className="cart-line-kapster">
                      <Icon name="user" />
                      <select
                        aria-label={`Pilih kapster untuk ${line.name}`}
                        onChange={(e) => {
                          const newBarber = e.target.value
                          setCart((c) =>
                            c.map((x) =>
                              x.lineId === line.lineId
                                ? {
                                    ...x,
                                    barber: newBarber,
                                    lineId: `${x.id}-${newBarber}`,
                                  }
                                : x,
                            ),
                          )
                        }}
                        value={line.barber}
                      >
                        {barberList.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </label>
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
                        disabled={
                          line.type === "Produk" &&
                          stokHabis(
                            line.id,
                            catalogData.find((c) => c.id === line.id)?.stock,
                          )
                        }
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
                setDiscountReasonDraft(discountReason)
                setPromosList(getPromoDiscounts())
                setDiscountPinError("")
                setDiscountOpen(!discountOpen)
              }}
            >
              <Icon name="receipt" /> {discount > 0 ? "Ubah diskon" : "Beri diskon"}
            </Button>
            {discountOpen && (
              <div className="cart-discount-panel">
                <div className="segmented" style={{ width: "100%", marginBottom: 10 }}>
                  <Button
                    className={discountTypeTab === "event" ? "active" : ""}
                    onClick={() => setDiscountTypeTab("event")}
                  >
                    <Icon name="cash" /> Diskon Event
                  </Button>
                  <Button
                    className={discountTypeTab === "manual" ? "active" : ""}
                    onClick={() => setDiscountTypeTab("manual")}
                  >
                    <Icon name="lock" /> Diskon Manual
                  </Button>
                </div>

                {discountTypeTab === "event" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {pinLabel}
                    <small style={{ color: "var(--muted)", fontSize: 11 }}>
                      Pilih diskon event yang sedang aktif:
                    </small>
                    {promosList.filter((p) => p.status === "Aktif").length === 0 ? (
                      <p style={{ color: "var(--slate)", fontSize: 12, padding: "8px 0" }}>
                        Belum ada diskon event aktif. Atur di menu Layanan & Produk.
                      </p>
                    ) : (
                      promosList
                        .filter((p) => p.status === "Aktif")
                        .map((p) => (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 10px",
                              borderRadius: 6,
                              border: "1px solid var(--line)",
                              background: "var(--paper)",
                              gap: 8,
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: 12, display: "block" }}>{p.nama}</strong>
                              <small style={{ color: "var(--muted)", fontSize: 11 }}>
                                Diskon {p.persen}% · s/d{" "}
                                {new Date(p.berlakuSampai + "T00:00:00").toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </small>
                            </div>
                            <Button
                              className="secondary-button"
                              disabled={pinChecking}
                              onClick={async () => {
                                if (!(await cekPinDiskon())) return
                                const appliedDiscount = Math.round((total * p.persen) / 100)
                                const updatedTotal = Math.max(0, total - appliedDiscount)
                                setDiscount(appliedDiscount)
                                setAppliedDiscountPercent(p.persen)
                                setDiscountReason(p.nama)
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
                              style={{ padding: "3px 8px", fontSize: 11, height: "auto" }}
                            >
                              Terapkan
                            </Button>
                          </div>
                        ))
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                      <Button
                        className="text-button"
                        onClick={() => setDiscountOpen(false)}
                        style={{ fontSize: 12 }}
                      >
                        Tutup
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="discount-mode segmented" style={{ marginBottom: 10 }}>
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
                    {pinLabel}
                    <label>
                      <span>Keterangan / Alasan Diskon</span>
                      <div className="input-shell">
                        <Icon name="pencil" />
                        <input
                          placeholder="Mis. Diskon Pelajar, Teman Owner"
                          value={discountReasonDraft}
                          onChange={(e) => setDiscountReasonDraft(e.target.value)}
                        />
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
                          onChange={(e) => {
                            setDiscountDraft(
                              Number(e.target.value.replace(/\D/g, "")),
                            )
                            setDiscountPinError("")
                          }}
                          value={discountDraft}
                        />
                      </div>
                    </label>
                    <div>
                      <Button
                        className="text-button"
                        onClick={() => {
                          setDiscountPinError("")
                          setDiscountOpen(false)
                        }}
                      >
                        Batal
                      </Button>
                      <Button
                        className="secondary-button"
                        disabled={pinChecking}
                        onClick={async () => {
                          if (discountDraft <= 0) {
                            setDiscountPinError("Nilai diskon harus lebih dari 0.")
                            return
                          }
                          if (draftPenuh && !discountReasonDraft.trim()) {
                            setDiscountPinError("Diskon penuh (gratis) wajib diisi alasannya.")
                            return
                          }
                          if (!(await cekPinDiskon())) return
                          setDiscountPinError("")
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
                          setDiscountReason(discountReasonDraft.trim() || "Diskon Manual Otorisasi")
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
                        {pinChecking ? "Memeriksa PIN..." : "Terapkan"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {discount > 0 && (
              <div
                className="discount-applied"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <span style={{ fontSize: 12 }}>
                    Diskon: <strong>{discountReason || "Diskon Otorisasi"}</strong>
                    {appliedDiscountPercent !== null && ` (${appliedDiscountPercent}%)`}
                  </span>
                  <strong style={{ display: "block", color: "var(--brass-dark, #b45309)" }}>
                    − {rupiah(effectiveDiscount)}
                  </strong>
                </div>
                <Button
                  className="text-button"
                  onClick={() => {
                    setDiscount(0)
                    setAppliedDiscountPercent(null)
                    setDiscountReason("")
                    setPinAtasan("")
                    if (method === "Tunai") {
                      setCash(total)
                      setQris(0)
                    } else if (method === "QRIS") {
                      setCash(0)
                      setQris(total)
                    } else {
                      setCash(total)
                      setQris(0)
                    }
                  }}
                  style={{ fontSize: 11, color: "#dc2626", padding: "2px 6px" }}
                  title="Batalkan diskon"
                >
                  <Icon name="trash" /> Hapus
                </Button>
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
                    onClick={() => setMethod(value)}
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
                        onChange={(e) => {
                          const val = Number(e.target.value.replace(/\D/g, ""))
                          setCash(val)
                          if (method === "Gabungan") {
                            setQris(Math.max(0, payableTotal - val))
                          }
                        }}
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
                        onChange={(e) => {
                          const val = Number(e.target.value.replace(/\D/g, ""))
                          setQris(val)
                          if (method === "Gabungan") {
                            setCash(Math.max(0, payableTotal - val))
                          }
                        }}
                        value={qris}
                      />
                    </div>
                  </label>
                )}
              </div>
              {method === "Tunai" && payableTotal > 0 && (
                <div className="quick-cash" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
                  <Button onClick={() => setCash(payableTotal)}>Uang pas</Button>
                  {[50000, 100000, 200000].filter((n) => n > payableTotal).map((n) => (
                    <Button key={n} onClick={() => setCash(n)}>
                      {rupiah(n)}
                    </Button>
                  ))}
                </div>
              )}
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
              {payDisabledReason && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    margin: "8px 0",
                  }}
                >
                  <Icon name="alert" />
                  <span>{payDisabledReason}</span>
                </div>
              )}
              <Button
                className="primary-button cart-submit"
                disabled={Boolean(payDisabledReason) || !cart.length}
                onClick={pay}
              >
                {paying ? "Memproses..." : "Bayar"} <Icon name="cash" />
              </Button>
              {gagalMuat && (
                <div className="payment-result danger" role="alert">
                  <span>Data kasir gagal dimuat{liveError ? `: ${liveError}` : ""}</span>
                  <Button onClick={() => setReloadKey((k) => k + 1)}>Coba lagi</Button>
                </div>
              )}
              {payError && (
                <div className="payment-result danger" role="alert">
                  <strong>{payError}</strong>
                </div>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default CashierPage
