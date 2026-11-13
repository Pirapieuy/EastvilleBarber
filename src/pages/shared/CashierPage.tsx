import { useEffect, useRef, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, LoadingState, rupiah } from "../../components/common/UI"
import { AppUser } from "../../types"
import { apiAbsensi, apiKasir, getToken } from "../../api"
import { AbsensiKapster } from "../kasir/AbsensiKapster"
import { formatTanggalWaktu, TANGGAL_MAKS } from "../../utils/tanggal"

export type CatalogItem = {
  id: number | string
  name: string
  price: number
  type: "Layanan" | "Produk"
  stock?: number
  consignment?: boolean
}

export type CartLine = CatalogItem & {
  lineId: string
  qty: number
  barber: string
}

function assignCartToBarber(lines: CartLine[], barber: string): CartLine[] {
  const byItem = new Map<string | number, CartLine>()
  lines.forEach((line) => {
    const existing = byItem.get(line.id)
    if (existing) {
      existing.qty += line.qty
      return
    }
    byItem.set(line.id, {
      ...line,
      lineId: `${line.id}-${barber}`,
      barber,
    })
  })
  return [...byItem.values()]
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
  barber,
  invoice = "INV-291026-0084",
  tanggal,
  contoh,
  backLabel = "Transaksi Baru (Selesai)",
  onClose,
  onEdit,
  onPrint,
  onComplete,
  saving,
  saveError,
  /** Teks tanggal transaksi; kosong = waktu sekarang (struk baru) */
  /** Struk dari data demo (tidak tersimpan di server) */
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
  barber?: string
  invoice?: string
  tanggal?: string
  contoh?: boolean
  backLabel?: string
  onClose?: () => void
  onEdit?: () => void
  onPrint?: () => void | Promise<void>
  onComplete?: () => void | Promise<void>
  saving?: boolean
  saveError?: string
}) {
  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n)
  const [size, setSize] = useState<"58" | "80">("58")
  const barberName =
    barber ||
    Array.from(new Set(cart.map((l) => l.barber).filter(Boolean))).join(", ") ||
    "-"
  return (
    <div className="flow-page">
      <div className="flow-toolbar">
        {onEdit ? (
          <Button className="secondary-button" onClick={onEdit}>
            <Icon name="pencil" /> Edit
          </Button>
        ) : (
          <Button className="primary-button" onClick={onClose}>
            <Icon name="check" /> {backLabel}
          </Button>
        )}
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveError && (
            <span style={{ color: "#dc2626", fontSize: 12, fontWeight: 600 }}>
              {saveError}
            </span>
          )}
          <Button
            className="primary-button"
            disabled={saving}
            onClick={async () => {
              if (onPrint) {
                await onPrint()
              } else {
                window.print()
              }
            }}
          >
            <Icon name="print" /> {saving ? "Menyimpan..." : "Cetak"}
          </Button>
          {onComplete ? (
            <Button
              className="primary-button"
              disabled={saving}
              onClick={onComplete}
            >
              <Icon name="check" /> {saving ? "Menyimpan..." : "Selesai"}
            </Button>
          ) : (
            <Button className="secondary-button" onClick={onClose}>
              <Icon name="arrow" /> Kembali
            </Button>
          )}
        </div>
      </div>
      <div className="receipt-stage">
        <article className={`thermal-receipt size-${size}`} id="print-receipt">
          <header>
            <div>E</div>
            <h2>EASTVILLE</h2>
            <p>BARBERSHOP</p>
            {contoh && (
              <p>
                <strong>*** CONTOH (DEMO) ***</strong>
              </p>
            )}
          </header>
          <hr />
          <dl>
            <div>
              <dt>Tanggal</dt>
              <dd>
                {tanggal ? formatTanggalWaktu(tanggal) : formatTanggalWaktu(new Date())}
              </dd>
            </div>
            <div>
              <dt>No. nota</dt>
              <dd>{invoice ?? "Dibuat saat disimpan"}</dd>
            </div>
            <div>
              <dt>Kasir</dt>
              <dd>{cashier}</dd>
            </div>
            <div>
              <dt>Kapster</dt>
              <dd>{barberName}</dd>
            </div>
          </dl>
          <hr />
          {cart.map((line) => (
            <div className="receipt-item" key={line.lineId}>
              <span>
                <strong>{line.name}</strong>
                <small>
                  {line.qty} ×{" "}
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
            {discount > 0 && (
              <div>
                <dt>Diskon</dt>
                <dd>− {new Intl.NumberFormat("id-ID").format(discount)}</dd>
              </div>
            )}
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
            {method === "Tunai" && (
              <div>
                <dt>Kembalian</dt>
                <dd>{new Intl.NumberFormat("id-ID").format(change)}</dd>
              </div>
            )}
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

export function CashierPage({ currentUser, onNavigate }: {
  currentUser?: AppUser
  onNavigate?: (page: string) => void
} = {}) {
  const [tab, setTab] = useState<"Layanan" | "Produk">("Layanan")
  const [cari, setCari] = useState("")
  const [selectedBarber, setSelectedBarber] = useState("")
  const [cart, setCart] = useState<CartLine[]>([])
  const [method, setMethod] = useState<"Tunai" | "QRIS" | "Gabungan">("Tunai")
  const [cash, setCash] = useState(0)
  const [qrisInput, setQrisInput] = useState(0)
  const [gabunganDari, setGabunganDari] = useState<"tunai" | "qris">("tunai")
  const [discount, setDiscount] = useState(0)
  const [kodeDiskon, setKodeDiskon] = useState("")
  const [kodeError, setKodeError] = useState("")
  const [kodeChecking, setKodeChecking] = useState(false)
  const [kodeTerpakai, setKodeTerpakai] = useState("")
  const [discountReason, setDiscountReason] = useState("")
  const [appliedDiscountPercent, setAppliedDiscountPercent] =
    useState<number | null>(null)
  const [receipt, setReceipt] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartSwipe, setCartSwipe] = useState<{
    lineId: string
    offset: number
    removing?: boolean
  } | null>(null)

  // Mode live: katalog & kapster dari backend (butuh token login). Tanpa token
  // halaman tetap memakai data demo.
  const [live, setLive] = useState(false)
  const [catalogData, setCatalogData] = useState<CatalogItem[]>([])
  const [barberList, setBarberList] = useState<{ id?: string; name: string }[]>([])
  const [attendedBarbers, setAttendedBarbers] = useState<Set<string>>(new Set())
  const [attendanceTarget, setAttendanceTarget] = useState("")
  const [invoice, setInvoice] = useState<string | undefined>()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [isTransactionSaved, setIsTransactionSaved] = useState(false)
  const [savingReceipt, setSavingReceipt] = useState(false)
  const [saveReceiptError, setSaveReceiptError] = useState("")
  const [liveError, setLiveError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const cartSwipeStart = useRef<{ lineId: string; x: number; y: number } | null>(
    null,
  )
  const cartWheelSwipe = useRef<{
    lineId: string
    deltaX: number
    timer: number
  } | null>(null)
  // Id unik per percobaan bayar: kirim ulang setelah timeout tidak membuat nota ganda.
  const requestId = useRef(
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  )
  const punyaToken = !!getToken()
  const gagalMuat = !live

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    setLiveError("")
    Promise.all([apiKasir.layanan(), apiKasir.produk(), apiKasir.kapster(), apiAbsensi.list({ tanggal: TANGGAL_MAKS() })])
      .then(([layanan, produk, kapster, attendance]) => {
        setCatalogData([
          ...layanan
            .filter((l) => l.status === "Aktif")
            .map(
              (l): CatalogItem => ({
                id: l.id,
                name: l.nama,
                price: l.harga,
                type: "Layanan",
              }),
            ),
          ...produk
            .filter((p) => p.status === "Aktif")
            .map(
              (p): CatalogItem => ({
                id: p.kode,
                name: p.nama,
                price: p.harga,
                type: "Produk",
                stock: p.stok,
              }),
            ),
        ])
        const latestAttendance = new Map<string, (typeof attendance)[number]>()
        attendance.forEach((row) => {
          const existing = latestAttendance.get(row.userId)
          if (!existing || row.waktu > existing.waktu) latestAttendance.set(row.userId, row)
        })
        const present = new Set([...latestAttendance.values()].filter((row) => row.status === "Hadir").map((row) => row.userId))
        setAttendedBarbers(present)
        const eligible = kapster.filter((k) => present.has(k.id))
        setBarberList(kapster.map((k) => ({ id: k.id, name: k.nama })))
        setSelectedBarber(eligible[0]?.nama ?? "")
        setCart([])
        setCash(0)
        setLive(true)
      })
      .catch((e) => {
        console.error("Gagal memuat data kasir:", e)
        setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
  }, [reloadKey])

  useEffect(() => {
    if (!isCartOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCartOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isCartOpen])

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isCartOpen])

  function pay() {
    if (Boolean(payDisabledReason) || !cart.length) return
    setPayError("")
    setSaveReceiptError("")
    setIsTransactionSaved(false)
    setInvoice(undefined)
    setIsCartOpen(false)
    setReceipt(true)
  }

  async function executeSaveTransaction(): Promise<boolean> {
    if (isTransactionSaved) return true
    if (!live) {
      setSaveReceiptError("Data kasir belum selesai dimuat. Tunggu sebentar lalu coba lagi.")
      return false
    }
    setSaveReceiptError("")
    setSavingReceipt(true)
    try {
      const res = await apiKasir.checkout({
        metode: method,
        diskon: effectiveDiscount,
        gratis,
        alasan: discountReason || undefined,
        kodeDiskon: effectiveDiscount > 0 ? kodeTerpakai : undefined,
        clientRequestId: requestId.current,
        bayarTunai: tunaiTerpakai,
        bayarQris: qris,
        items: cart.map((l) => ({
          tipe: l.type,
          refId: l.id,
          qty: l.qty,
          kapsterId: barberList.find((b) => b.name === l.barber)?.id ?? "",
        })),
      })
      setInvoice(res.id)
      setIsTransactionSaved(true)
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
      return true
    } catch (e) {
      setSaveReceiptError(
        e instanceof Error ? e.message : "Transaksi gagal disimpan.",
      )
      return false
    } finally {
      setSavingReceipt(false)
    }
  }

  async function handlePrintReceipt() {
    const success = await executeSaveTransaction()
    if (success) {
      window.print()
    }
  }

  async function handleCompleteReceipt() {
    const success = await executeSaveTransaction()
    if (success) {
      setReceipt(false)
      clearCart()
      setIsTransactionSaved(false)
    }
  }

  /** Terapkan diskon dari kode unik; kode dicocokkan dengan daftar di server. */
  async function terapkanKode() {
    const kode = kodeDiskon.trim().toUpperCase()
    if (!kode) {
      setKodeError("Masukkan kode diskon.")
      return
    }
    setKodeChecking(true)
    setKodeError("")
    try {
      const promo = await apiKasir.cekKode(kode)
      const discountValue = promo.nilai ?? promo.persen
      setDiscount(
        Math.min(
          total,
          promo.jenis === "nominal"
            ? discountValue
            : Math.round((total * discountValue) / 100),
        ),
      )
      setAppliedDiscountPercent(promo.jenis === "nominal" ? null : discountValue)
      setDiscountReason(promo.nama)
      setKodeTerpakai(promo.kode)
      setKodeDiskon("")
    } catch (e) {
      setKodeError(
        e instanceof Error ? e.message : "Kode tidak dapat diperiksa. Coba lagi.",
      )
    } finally {
      setKodeChecking(false)
    }
  }

  const items = catalogData.filter(
    (x) =>
      x.type === tab &&
      x.name.toLowerCase().includes(cari.trim().toLowerCase()),
  )
  const total = cart.reduce((s, x) => s + x.price * x.qty, 0)
  // Jumlah produk di keranjang (semua kapster) dibatasi stok yang tersisa.
  const qtyDiKeranjang = (id: number | string) =>
    cart.filter((x) => x.id === id).reduce((s, x) => s + x.qty, 0)
  const stokHabis = (id: number | string, stock?: number) =>
    stock !== undefined && qtyDiKeranjang(id) >= stock
  const effectiveDiscount =
    appliedDiscountPercent === null
      ? Math.min(discount, total)
      : Math.round((total * appliedDiscountPercent) / 100)
  // Diskon yang menutup seluruh subtotal = transaksi gratis (promo/traktiran): alasan wajib.
  const gratis = total > 0 && effectiveDiscount >= total
  const payableTotal = Math.max(0, total - effectiveDiscount)
  // Tunai: isi jumlah tunai. QRIS: otomatis sebesar tagihan.
  // Gabungan: isi salah satu (tunai atau QRIS), sisanya dihitung otomatis.
  const qris =
    method === "Tunai"
      ? 0
      : method === "QRIS"
        ? payableTotal
        : gabunganDari === "qris"
          ? Math.min(qrisInput, payableTotal)
          : Math.max(0, payableTotal - Math.min(cash, payableTotal))
  const tunaiTerpakai =
    method === "QRIS"
      ? 0
      : method === "Tunai"
        ? cash
        : gabunganDari === "qris"
          ? Math.max(0, payableTotal - qris)
          : Math.min(cash, payableTotal)
  const paid = tunaiTerpakai + qris
  const shortage = Math.max(0, payableTotal - paid)
  const change = method === "Tunai" ? Math.max(0, cash - payableTotal) : 0

  const payDisabledReason = ((): string | null => {
    if (!cart.length) return null
    if (gagalMuat) return "Data kasir belum selesai dimuat."
    if (paying) return "Sedang memproses pembayaran..."
    if (method === "Tunai" && cash <= 0) return "Masukkan jumlah tunai."
    if (method === "Gabungan" && tunaiTerpakai + qris <= 0) {
      return "Masukkan jumlah tunai atau QRIS."
    }
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

  // Data asli sedang dimuat atau gagal dimuat: jangan tampilkan data contoh.
  if (!live) {
    if (!liveError || liveError === "belum login ke server (token tidak ada)") {
      return (
        <div className="content">
          <LoadingState message="Memuat data kasir…" />
        </div>
      )
    }
    return (
      <div className="content">
        <div className="payment-result danger" role="alert">
          <span>Data kasir gagal dimuat: {liveError}</span>
          <Button onClick={() => setReloadKey((k) => k + 1)}>Coba lagi</Button>
        </div>
      </div>
    )
  }

  const pecahanCepat = Array.from(
    new Set(
      [10000, 20000, 50000, 100000]
        .map((k) => Math.ceil(payableTotal / k) * k)
        .concat([50000, 100000, 150000, 200000, 300000]),
    ),
  )
    .filter((n) => n > payableTotal)
    .sort((a, b) => a - b)
    .slice(0, 5)

  if (receipt) {
    return (
      <ReceiptView
        cart={cart}
        subtotal={total}
        discount={effectiveDiscount}
        total={payableTotal}
        method={method}
        cash={method === "Tunai" ? cash : tunaiTerpakai}
        qris={qris}
        change={change}
        cashier={currentUser?.name ?? "Siti Rahma"}
        barber={
          Array.from(new Set(cart.map((l) => l.barber).filter(Boolean))).join(", ") ||
          selectedBarber
        }
        invoice={invoice}
        saving={savingReceipt}
        saveError={saveReceiptError}
        onEdit={() => {
          setReceipt(false)
          setSaveReceiptError("")
        }}
        onPrint={handlePrintReceipt}
        onComplete={handleCompleteReceipt}
        onClose={() => {
          setReceipt(false)
          if (isTransactionSaved) {
            clearCart()
            setIsTransactionSaved(false)
          }
        }}
      />
    )
  }

  function clearCart() {
    setCart([])
    setCash(0)
    setQrisInput(0)
    setDiscount(0)
    setAppliedDiscountPercent(null)
    setDiscountReason("")
    setKodeTerpakai("")
    setKodeDiskon("")
    setKodeError("")
  }

  /** Atur jumlah item langsung (ketik); produk dibatasi sisa stok. */
  function setLineQty(line: CartLine, raw: string) {
    const digits = raw.replace(/\D/g, "")
    if (digits === "") return
    let next = Math.max(1, Number(digits))
    if (line.type === "Produk") {
      const stok = catalogData.find((c) => c.id === line.id)?.stock
      if (stok !== undefined) {
        const lain = cart
          .filter((x) => x.id === line.id && x.lineId !== line.lineId)
          .reduce((sum, x) => sum + x.qty, 0)
        next = Math.min(next, Math.max(1, stok - lain))
      }
    }
    next = Math.min(next, 999)
    setCart((c) =>
      c.map((x) => (x.lineId === line.lineId ? { ...x, qty: next } : x)),
    )
  }

  function removeCartLineWithAnimation(lineId: string) {
    setCartSwipe({ lineId, offset: -120, removing: true })
    window.setTimeout(() => {
      setCart((items) => items.filter((item) => item.lineId !== lineId))
      setCartSwipe((current) => (current?.lineId === lineId ? null : current))
    }, 180)
  }

  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0)

  return (
    <div className="cashier-page">
      <section className="catalog">
        <div className="catalog-sticky">
        <section className="barber-picker">
          <div className="barber-picker-label">
            <span className="item-icon">
              <Icon name="user" />
            </span>
            <small>Kapster</small>
          </div>
          <div className="barber-options">
            {barberList.map(({ id, name: barber }) => {
              const isAttended = Boolean(id && attendedBarbers.has(id))
              return (
              <Button
                className={`barber-btn ${!isAttended ? "disabled" : ""} ${
                  selectedBarber === barber ? "active" : ""
                }`}
                key={barber}
                aria-disabled={!isAttended}
                title={!isAttended ? "Kapster perlu absensi foto terlebih dahulu" : undefined}
                onClick={() => {
                  if (!isAttended) {
                    if (id) setAttendanceTarget(id)
                    return
                  }
                  setSelectedBarber(barber)
                  setCart((items) => assignCartToBarber(items, barber))
                }}
              >
                <i>{barber.charAt(0)}</i>
                <span>{barber}</span>
              </Button>
            )})}
          </div>
        </section>
        {attendanceTarget && (
          <AbsensiKapster
            inline
            initialKapsterId={attendanceTarget}
            initialKapsterName={barberList.find((barber) => barber.id === attendanceTarget)?.name}
            onComplete={(success) => {
              if (success) {
                const kapster = barberList.find((barber) => barber.id === attendanceTarget)
                setAttendedBarbers((current) => new Set(current).add(attendanceTarget))
                if (kapster) {
                  setSelectedBarber(kapster.name)
                  setCart((items) => assignCartToBarber(items, kapster.name))
                }
              }
              setAttendanceTarget("")
            }}
          />
        )}
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
        </div>
        <div className="catalog-grid">
          {items.length === 0 && (
            <p
              style={{
                color: "var(--slate)",
                gridColumn: "1 / -1",
                padding: "16px 0",
              }}
            >
              Tidak ada {tab.toLowerCase()} yang cocok.
            </p>
          )}
          {items.map((item) => {
            const tidakBisa =
              item.stock === 0 ||
              stokHabis(item.id, item.stock) ||
              !selectedBarber
            const alasan = !selectedBarber
              ? "Kapster belum absen"
              : stokHabis(item.id, item.stock)
                ? "Stok habis di keranjang"
                : undefined
            const tambah = () =>
              setCart((c) => {
                const found = c.find(
                  (x) => x.id === item.id && x.barber === selectedBarber,
                )
                return found
                  ? c.map((x) =>
                      x.lineId === found.lineId ? { ...x, qty: x.qty + 1 } : x,
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
            return (
              <div
                className={`catalog-item ${tidakBisa ? "disabled" : ""}`}
                key={item.id}
                title={alasan}
              >
                <span className="item-icon">
                  <Icon name={item.type === "Produk" ? "product" : "cashier"} />
                </span>
                <strong>{item.name}</strong>
                <b>{rupiah(item.price)}</b>
                {item.type === "Produk" && (
                  <small>
                    <i>
                      {(item.stock ?? 0) - qtyDiKeranjang(item.id) <= 0
                        ? "Stok habis"
                        : `Stok ${(item.stock ?? 0) - qtyDiKeranjang(item.id)}`}
                    </i>
                    {item.consignment && <em>Titipan</em>}
                  </small>
                )}
                <Button
                  aria-label={`Tambah ${item.name} ke keranjang`}
                  className="catalog-add"
                  disabled={tidakBisa}
                  onClick={tambah}
                  title={alasan ?? "Tambah ke keranjang"}
                >
                  <Icon name="plus" />
                </Button>
              </div>
            )
          })}
        </div>
      </section>
      {cart.length > 0 && (
      <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-[var(--paper)]/95 backdrop-blur border-t border-[var(--line)] shadow-[0_-4px_20px_rgba(20,17,15,0.08)] md:hidden">
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--ink)] text-white shadow-md active:scale-[0.99] transition cursor-pointer"
          aria-label="Buka Pesanan Saat Ini"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-[var(--brass)]">
              <Icon name="receipt" />
            </div>
            <span className="font-semibold text-sm text-white">
              Pesanan saat ini
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--brass)] text-[var(--ink)]">
              {itemCount} item
            </span>
            {payableTotal > 0 && (
              <span className="font-bold text-sm text-[var(--brass-soft)]">
                {rupiah(payableTotal)}
              </span>
            )}
            <span
              className="flex items-center justify-center w-6 h-6 text-white/80"
              style={{ transform: "rotate(180deg)" }}
              aria-hidden="true"
            >
              <Icon name="chevron" />
            </span>
          </div>
        </button>
      </div>
      )}

      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isCartOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`cart fixed inset-x-0 bottom-0 z-50 flex w-full max-w-full max-h-[88svh] flex-col overflow-y-auto rounded-t-2xl border-t border-[var(--line)] bg-[var(--paper)] shadow-2xl transition-all duration-300 ease-out overscroll-contain md:static md:w-auto md:max-w-none md:inset-auto md:z-auto md:max-h-none md:overflow-visible md:rounded-none md:border-0 md:bg-[var(--bone)] md:shadow-none md:translate-y-0 md:opacity-100 md:pointer-events-auto ${
          isCartOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Pesanan saat ini"
      >
        <div className="cart-panel">
          <div className="md:hidden mx-auto my-2.5 h-1.5 w-12 rounded-full bg-[var(--line)]" />
          <div className="cart-tabs flex items-center justify-between">
            <span className="cart-tab-active">
              <Icon name="receipt" /> Pesanan saat ini
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bone)] text-[var(--ink)] active:scale-95 transition cursor-pointer"
                aria-label="Tutup pesanan"
              >
                <Icon name="chevron" />
              </button>
            </div>
          </div>
          <div className="cart-lines">
            {cart.length > 0 && (
              <div className="cart-clear-row">
                <span className="cart-list-label">{itemCount} item</span>
                <Button
                  className="cart-clear-button"
                  onClick={clearCart}
                  title="Hapus semua produk dan layanan"
                  aria-label="Hapus semua produk dan layanan"
                >
                  <Icon name="trash" /> Hapus Semua
                </Button>
              </div>
            )}
            {cart.length === 0 ? (
              <div className="empty">
                <Icon name="receipt" />
                <strong>Keranjang kosong</strong>
                <span>Ketuk item untuk memulai.</span>
              </div>
            ) : (
              cart.map((line) => (
                <article
                  className="cart-line-swipe"
                  key={line.lineId}
                  title="Geser ke kiri untuk menghapus item"
                  onWheel={(event) => {
                    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
                    const swipe = cartWheelSwipe.current
                    const next =
                      swipe?.lineId === line.lineId
                        ? swipe
                        : { lineId: line.lineId, deltaX: 0, timer: 0 }
                    next.deltaX += event.deltaX
                    window.clearTimeout(next.timer)
                    next.timer = window.setTimeout(() => {
                      if (cartWheelSwipe.current?.lineId === line.lineId) {
                        cartWheelSwipe.current = null
                      }
                    }, 250)
                    cartWheelSwipe.current = next
                    if (next.deltaX <= -100) {
                      window.clearTimeout(next.timer)
                      cartWheelSwipe.current = null
                      removeCartLineWithAnimation(line.lineId)
                    }
                  }}
                  onPointerDown={(event) => {
                    const target = event.target as HTMLElement
                    if (target.closest("button, select")) {
                      cartSwipeStart.current = null
                      return
                    }
                    cartSwipeStart.current = {
                      lineId: line.lineId,
                      x: event.clientX,
                      y: event.clientY,
                    }
                    event.currentTarget.setPointerCapture(event.pointerId)
                  }}
                  onPointerUp={(event) => {
                    const start = cartSwipeStart.current
                    cartSwipeStart.current = null
                    if (!start || start.lineId !== line.lineId) return
                    const dx = event.clientX - start.x
                    const dy = event.clientY - start.y
                    if (dx < -60 && Math.abs(dx) > Math.abs(dy)) {
                      removeCartLineWithAnimation(line.lineId)
                    } else {
                      setCartSwipe((current) =>
                        current?.lineId === line.lineId ? null : current,
                      )
                    }
                  }}
                  onPointerMove={(event) => {
                    const start = cartSwipeStart.current
                    if (!start || start.lineId !== line.lineId) return
                    const dx = event.clientX - start.x
                    if (dx < 0) {
                      setCartSwipe({
                        lineId: line.lineId,
                        offset: Math.max(dx, -120),
                      })
                    }
                  }}
                  onPointerCancel={() => {
                    cartSwipeStart.current = null
                    setCartSwipe((current) =>
                      current?.lineId === line.lineId ? null : current,
                    )
                  }}
                >
                  {cartSwipe?.lineId === line.lineId && cartSwipe.offset < 0 && (
                    <span
                      className="cart-swipe-delete"
                      aria-hidden="true"
                      style={{ width: Math.abs(cartSwipe.offset) }}
                    >
                      <Icon name="trash" />
                    </span>
                  )}
                  <div
                    className={`cart-line-row ${
                      cartSwipe?.lineId === line.lineId && cartSwipe.removing
                        ? "removing"
                        : ""
                    }`}
                    style={{
                      transform: `translateX(${
                        cartSwipe?.lineId === line.lineId ? cartSwipe.offset : 0
                      }px)`,
                      transition:
                        cartSwipe?.lineId === line.lineId && !cartSwipe.removing
                          ? "none"
                          : undefined,
                    }}
                  >
                    <span className="cart-line-title">
                      <strong>{line.name}</strong>
                      <small>{rupiah(line.price)}</small>
                    </span>
                    <div className="stepper">
                      <Button
                        aria-label={`Kurangi ${line.name}`}
                        disabled={line.qty <= 1}
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
                      <input
                        aria-label={`Jumlah ${line.name}`}
                        inputMode="numeric"
                        onChange={(e) => setLineQty(line, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        value={line.qty}
                      />
                      <Button
                        aria-label={`Tambah ${line.name}`}
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
                    <b className="cart-line-price">
                      {rupiah(line.price * line.qty)}
                    </b>
                  </div>
                </article>
              ))
            )}
          </div>
          {cart.length > 0 && (
          <div className="cart-total">
            <div>
              <span>Subtotal</span>
              <strong>{rupiah(total)}</strong>
            </div>
            {discount === 0 && (
              <div className="cart-discount-panel">
                <label>
                  <span>Kode diskon</span>
                  <div className="input-shell">
                    <Icon name="receipt" />
                    <input
                      autoCapitalize="characters"
                      autoComplete="off"
                      onChange={(e) => {
                        setKodeDiskon(e.target.value.toUpperCase())
                        setKodeError("")
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          void terapkanKode()
                        }
                      }}
                      placeholder="Contoh: JUMAT15"
                      value={kodeDiskon}
                    />
                  </div>
                </label>
                <Button
                  className="primary-button"
                  disabled={!kodeDiskon.trim() || kodeChecking || total <= 0}
                  onClick={() => void terapkanKode()}
                >
                  {kodeChecking ? "Memeriksa…" : "Terapkan"}
                </Button>
                {kodeError && (
                  <small className="cart-error" role="alert">
                    {kodeError}
                  </small>
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
                    Kode <strong>{kodeTerpakai}</strong> ·{" "}
                    <strong>{discountReason}</strong>
                    {appliedDiscountPercent !== null &&
                      ` (${appliedDiscountPercent}%)`}
                  </span>
                  <strong
                    style={{
                      display: "block",
                      color: "var(--brass-dark, #b45309)",
                    }}
                  >
                    − {rupiah(effectiveDiscount)}
                  </strong>
                </div>
                <Button
                  className="text-button"
                  onClick={() => {
                    setDiscount(0)
                    setAppliedDiscountPercent(null)
                    setDiscountReason("")
                    setKodeTerpakai("")
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
                    onClick={() => {
                      if (value === method) return
                      setMethod(value)
                      setCash(0)
                      setQrisInput(0)
                      setGabunganDari("tunai")
                    }}
                  >
                    <Icon name={value === "QRIS" ? "qris" : "cash"} />
                    <strong>{value}</strong>
                  </Button>
                ))}
              </div>

              {method === "Tunai" && (
                <>
                  <label className="pay-field">
                    <span>Jumlah tunai</span>
                    <div className="input-shell">
                      <b>Rp</b>
                      <input
                        inputMode="numeric"
                        onChange={(e) =>
                          setCash(Number(e.target.value.replace(/\D/g, "")))
                        }
                        placeholder="0"
                        value={cash || ""}
                      />
                    </div>
                  </label>
                  {payableTotal > 0 && (
                    <div className="quick-cash">
                      <Button
                        className={cash === payableTotal ? "active" : ""}
                        onClick={() => setCash(payableTotal)}
                      >
                        Uang pas
                      </Button>
                      {pecahanCepat.map((n) => (
                        <Button
                          key={n}
                          className={cash === n ? "active" : ""}
                          onClick={() => setCash(n)}
                        >
                          {rupiah(n)}
                        </Button>
                      ))}
                    </div>
                  )}
                  {cash > 0 && (
                    <div
                      className={`payment-result ${shortage ? "danger" : "success"}`}
                    >
                      <span>{shortage ? "Pembayaran kurang" : "Kembalian"}</span>
                      <strong>
                        {shortage ? `Kurang ${rupiah(shortage)}` : rupiah(change)}
                      </strong>
                    </div>
                  )}
                </>
              )}

              {method === "QRIS" && (
                <div className="cart-qris-note">
                  <Icon name="qris" /> Pastikan pembayaran QRIS sudah masuk.
                </div>
              )}

              {method === "Gabungan" && (
                <>
                  <p className="pay-hint">
                    Isi salah satu saja, sisanya dihitung otomatis.
                  </p>
                  <div className="pay-split">
                    <label className="pay-field">
                      <span>Jumlah tunai</span>
                      <div className="input-shell">
                        <b>Rp</b>
                        <input
                          inputMode="numeric"
                          onChange={(e) => {
                            setGabunganDari("tunai")
                            setCash(Number(e.target.value.replace(/\D/g, "")))
                          }}
                          placeholder="0"
                          value={
                            gabunganDari === "tunai"
                              ? cash || ""
                              : tunaiTerpakai || ""
                          }
                        />
                      </div>
                    </label>
                    <label className="pay-field">
                      <span>Jumlah QRIS</span>
                      <div className="input-shell">
                        <b>Rp</b>
                        <input
                          inputMode="numeric"
                          onChange={(e) => {
                            setGabunganDari("qris")
                            setQrisInput(
                              Number(e.target.value.replace(/\D/g, "")),
                            )
                          }}
                          placeholder="0"
                          value={
                            gabunganDari === "qris"
                              ? qrisInput || ""
                              : qris || ""
                          }
                        />
                      </div>
                    </label>
                  </div>
                  {tunaiTerpakai + qris > 0 && (
                    <div className="payment-result success">
                      <span>Tunai {rupiah(tunaiTerpakai)}</span>
                      <strong>QRIS {rupiah(qris)}</strong>
                    </div>
                  )}
                  {qris > 0 && (
                    <div className="cart-qris-note">
                      <Icon name="qris" /> Pastikan pembayaran QRIS sudah masuk.
                    </div>
                  )}
                </>
              )}
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
                Bayar <Icon name="cash" />
              </Button>
              {gagalMuat && (
                <div className="payment-result danger" role="alert">
                  <span>
                    Data kasir gagal dimuat{liveError ? `: ${liveError}` : ""}
                  </span>
                  <Button onClick={() => setReloadKey((k) => k + 1)}>
                    Coba lagi
                  </Button>
                </div>
              )}
              {payError && (
                <div className="payment-result danger" role="alert">
                  <strong>{payError}</strong>
                </div>
              )}
            </section>
          </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default CashierPage
