import { Fragment, useEffect, useRef, useState } from "react"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  LoadingState,
  rupiah, ErrorState } from "../../components/common/UI"
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

type CashierDraft = {
  /** Tanggal draf dibuat (YYYY-MM-DD); draf hari lain dibuang agar keranjang kemarin tidak terbawa */
  tanggal?: string
  selectedBarber: string
  cart: CartLine[]
  method: "Tunai" | "QRIS" | "Gabungan"
  komisiLayanan: "Normal" | "OT"
  cash: number
  qrisInput: number
  splitTunaiInput: number
  cashReceived: number
  gabunganDari: "tunai" | "qris"
  discount: number
  kodeDiskon: string
  kodeTerpakai: string
  discountReason: string
  appliedDiscountPercent: number | null
  receipt: boolean
  invoice?: string
  isTransactionSaved: boolean
}

function readCashierDraft(key: string): CashierDraft | null {
  try {
    const value = localStorage.getItem(key)
    if (!value) return null
    const draft = JSON.parse(value) as CashierDraft
    if (draft.tanggal !== TANGGAL_MAKS()) {
      localStorage.removeItem(key)
      return null
    }
    return draft
  } catch {
    return null
  }
}

/** Kelompokkan baris keranjang berdasarkan kapster secara berurutan */
export function groupCartByBarber(lines: CartLine[]): CartLine[] {
  const order: string[] = []
  const groups = new Map<string, CartLine[]>()
  for (const line of lines) {
    const b = line.barber || ""
    if (!groups.has(b)) {
      groups.set(b, [])
      order.push(b)
    }
    groups.get(b)!.push(line)
  }
  const result: CartLine[] = []
  for (const b of order) {
    result.push(...groups.get(b)!)
  }
  return result
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
  popup = false,
  tersimpan = false,
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
  /** Tampil sebagai popup di atas halaman (Kasir); default: satu halaman penuh (Riwayat) */
  popup?: boolean
  /** Hanya untuk popup: nota sudah tercatat di server */
  tersimpan?: boolean
}) {
  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n)
  const [size, setSize] = useState<"58" | "80">("58")
  const barberName =
    barber ||
    Array.from(new Set(cart.map((l) => l.barber).filter(Boolean))).join(", ") ||
    "-"
  const multipleBarbers =
    new Set(cart.map((line) => line.barber).filter(Boolean)).size > 1
  const bagian = (
    <>
      {popup ? (
        <div className="receipt-layout">
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
                <dt>Kapster</dt>
                <dd>{barberName}</dd>
              </div>
            </dl>
            <hr />
            {cart.map((line) => (
              <div className="receipt-item" key={line.lineId}>
                <span>
                  <strong>
                    {line.name}
                    {multipleBarbers && line.barber ? ` (${line.barber})` : ""}
                  </strong>
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
                  <dt>{method === "Gabungan" ? "Tunai Diterima" : "Tunai"}</dt>
                  <dd>{new Intl.NumberFormat("id-ID").format(cash)}</dd>
                </div>
              )}
              {method !== "Tunai" && (
                <div>
                  <dt>QRIS</dt>
                  <dd>{new Intl.NumberFormat("id-ID").format(qris)}</dd>
                </div>
              )}
              {change > 0 && (
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
          <aside className="receipt-aksi">
          {popup && (
            <div
              className={`receipt-status ${tersimpan ? "ok" : "warn"}`}
              role="status"
            >
              <Icon name={tersimpan ? "check" : "receipt"} />
              <span>
                {tersimpan
                  ? `Nota ${invoice} sudah tersimpan`
                  : "Belum tersimpan. Tekan Cetak atau Selesai untuk menyimpan."}
              </span>
            </div>
          )}
          <div className="flow-toolbar">
            {onEdit ? (
              <Button className="secondary-button" onClick={onEdit}>
                <Icon name="pencil" /> Ubah
              </Button>
            ) : popup ? null : (
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
          </aside>
        </div>
      ) : (
        <>
        <div className="flow-toolbar">
          {onEdit ? (
            <Button className="secondary-button" onClick={onEdit}>
              <Icon name="pencil" /> Ubah
            </Button>
          ) : popup ? null : (
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
                <dt>Kapster</dt>
                <dd>{barberName}</dd>
              </div>
            </dl>
            <hr />
            {cart.map((line) => (
              <div className="receipt-item" key={line.lineId}>
                <span>
                  <strong>
                    {line.name}
                    {multipleBarbers && line.barber ? ` (${line.barber})` : ""}
                  </strong>
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
                  <dt>{method === "Gabungan" ? "Tunai Diterima" : "Tunai"}</dt>
                  <dd>{new Intl.NumberFormat("id-ID").format(cash)}</dd>
                </div>
              )}
              {method !== "Tunai" && (
                <div>
                  <dt>QRIS</dt>
                  <dd>{new Intl.NumberFormat("id-ID").format(qris)}</dd>
                </div>
              )}
              {change > 0 && (
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
        </>
      )}
    </>
  )
  if (!popup) return <div className="flow-page">{bagian}</div>
  return (
    <div
      aria-label="Nota"
      aria-modal="true"
      className="modal-overlay modal-centered"
      onClick={() => {
        if (!saving) (onEdit ?? onClose)?.()
      }}
      role="dialog"
    >
      <section
        className={`receipt-popup${onEdit ? "" : " sudah-simpan"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {bagian}
      </section>
    </div>
  )
}

export function CashierPage({ currentUser, onNavigate }: {
  currentUser?: AppUser
  onNavigate?: (page: string) => void
} = {}) {
  const draftKey = `eastville_cashier_draft:${currentUser?.id ?? "guest"}`
  const [draft] = useState(() => readCashierDraft(draftKey))
  const [tab, setTab] = useState<"Layanan" | "Produk">("Layanan")
  const [cari, setCari] = useState("")
  const [selectedBarber, setSelectedBarber] = useState(draft?.selectedBarber ?? "")
  const [cart, setCart] = useState<CartLine[]>(draft?.cart ?? [])
  const [method, setMethod] = useState<"Tunai" | "QRIS" | "Gabungan">(draft?.method ?? "Tunai")
  const [komisiLayanan, setKomisiLayanan] = useState<"Normal" | "OT">(draft?.komisiLayanan ?? "Normal")
  const [cash, setCash] = useState(draft?.cash ?? 0)
  const [qrisInput, setQrisInput] = useState(draft?.qrisInput ?? 0)
  const [splitTunaiInput, setSplitTunaiInput] = useState(draft?.splitTunaiInput ?? 0)
  const [cashReceived, setCashReceived] = useState(draft?.cashReceived ?? 0)
  const [gabunganDari, setGabunganDari] = useState<"tunai" | "qris">(draft?.gabunganDari ?? "qris")
  const [discount, setDiscount] = useState(draft?.discount ?? 0)
  const [kodeDiskon, setKodeDiskon] = useState(draft?.kodeDiskon ?? "")
  const [kodeError, setKodeError] = useState("")
  const [kodeChecking, setKodeChecking] = useState(false)
  const [kodeTerpakai, setKodeTerpakai] = useState(draft?.kodeTerpakai ?? "")
  const [discountReason, setDiscountReason] = useState(draft?.discountReason ?? "")
  const [appliedDiscountPercent, setAppliedDiscountPercent] =
    useState<number | null>(draft?.appliedDiscountPercent ?? null)
  const [receipt, setReceipt] = useState(draft?.receipt ?? false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartSwipe, setCartSwipe] = useState<{
    lineId: string
    offset: number
    removing?: boolean
  } | null>(null)
  const [lastAdded, setLastAdded] = useState<{
    id: string
    type: "Layanan" | "Produk"
    timestamp: number
  } | null>(null)
  const lastAddedTimer = useRef<number | null>(null)

  // Mode live: katalog & kapster dari backend (butuh token login). Tanpa token
  // halaman tetap memakai data demo.
  const [live, setLive] = useState(false)
  const [catalogData, setCatalogData] = useState<CatalogItem[]>([])
  const [barberList, setBarberList] = useState<{ id?: string; name: string }[]>(
    [],
  )
  const [attendedBarbers, setAttendedBarbers] = useState<Set<string>>(new Set())
  const [attendanceTarget, setAttendanceTarget] = useState("")
  const [invoice, setInvoice] = useState<string | undefined>(draft?.invoice)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [isTransactionSaved, setIsTransactionSaved] = useState(draft?.isTransactionSaved ?? false)
  const [savingReceipt, setSavingReceipt] = useState(false)
  const [saveReceiptError, setSaveReceiptError] = useState("")
  const [liveError, setLiveError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  // Nota yang sedang terbuka tidak boleh berubah karena pengecekan absensi ulang
  const receiptTerbuka = useRef(false)
  receiptTerbuka.current = receipt
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
    return () => {
      if (lastAddedTimer.current) window.clearTimeout(lastAddedTimer.current)
    }
  }, [])

  useEffect(() => {
    if (cart.length === 0 && !receipt && !isTransactionSaved) {
      localStorage.removeItem(draftKey)
      return
    }
    const value: CashierDraft = {
      tanggal: TANGGAL_MAKS(),
      selectedBarber,
      cart,
      method,
      komisiLayanan,
      cash,
      qrisInput,
      splitTunaiInput,
      cashReceived,
      gabunganDari,
      discount,
      kodeDiskon,
      kodeTerpakai,
      discountReason,
      appliedDiscountPercent,
      receipt,
      invoice,
      isTransactionSaved,
    }
    localStorage.setItem(draftKey, JSON.stringify(value))
  }, [
    draftKey,
    selectedBarber,
    cart,
    method,
    komisiLayanan,
    cash,
    qrisInput,
    splitTunaiInput,
    cashReceived,
    gabunganDari,
    discount,
    kodeDiskon,
    kodeTerpakai,
    discountReason,
    appliedDiscountPercent,
    receipt,
    invoice,
    isTransactionSaved,
  ])

  // Bila seluruh item di keranjang dihapus sampai habis, reset kapster yang dipilih
  // agar kasir harus memilih kapster lagi dan tidak salah kapster pada transaksi berikutnya.
  const prevCartLength = useRef(cart.length)
  useEffect(() => {
    if (prevCartLength.current > 0 && cart.length === 0) {
      setSelectedBarber("")
      setCash(0)
      setQrisInput(0)
      setSplitTunaiInput(0)
      setCashReceived(0)
      setGabunganDari("qris")
      setKomisiLayanan("Normal")
      setDiscount(0)
      setAppliedDiscountPercent(null)
      setDiscountReason("")
      setKodeTerpakai("")
      setKodeDiskon("")
      setKodeError("")
    }
    prevCartLength.current = cart.length
  }, [cart.length])

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    setLiveError("")
    Promise.all([
      apiKasir.layanan(),
      apiKasir.produk(),
      apiKasir.kapster(),
      apiAbsensi.list({ tanggal: TANGGAL_MAKS() }),
    ])
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
        const latestAttendance = new Map<string, typeof attendance[number]>()
        attendance.forEach((row) => {
          const existing = latestAttendance.get(row.userId)
          if (!existing || row.waktu > existing.waktu)
            latestAttendance.set(row.userId, row)
        })
        const present = new Set(
          [...latestAttendance.values()]
            .filter((row) => row.status === "Hadir")
            .map((row) => row.userId),
        )
        setAttendedBarbers(present)
        setBarberList(kapster.map((k) => ({ id: k.id, name: k.nama })))
        // Kapster yang belum absen hari ini tidak boleh tetap terpilih atau punya item di keranjang
        // (mis. draf dari sesi sebelumnya): lepaskan, lalu kasir wajib memilih kapster yang sudah absen.
        const belumAbsen = new Set(
          kapster.filter((k) => !present.has(k.id)).map((k) => k.nama),
        )
        if (!receiptTerbuka.current) {
          setSelectedBarber((cur) => (cur && belumAbsen.has(cur) ? "" : cur))
          setCart((c) =>
            c.some((l) => belumAbsen.has(l.barber))
              ? c.filter((l) => !belumAbsen.has(l.barber))
              : c,
          )
        }
        setLive(true)
      })
      .catch((e) => {
        console.error("Gagal memuat data kasir:", e)
        setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
  }, [reloadKey])

  // Kasir yang membiarkan halaman terbuka sampai hari berikutnya: cek ulang absensi saat tab dibuka
  // kembali dan tiap 5 menit, supaya kapster/keranjang kemarin tidak bertahan tanpa absensi hari ini.
  useEffect(() => {
    const cekUlang = () => {
      if (document.visibilityState === "visible") setReloadKey((k) => k + 1)
    }
    document.addEventListener("visibilitychange", cekUlang)
    window.addEventListener("focus", cekUlang)
    const timer = window.setInterval(cekUlang, 5 * 60 * 1000)
    return () => {
      document.removeEventListener("visibilitychange", cekUlang)
      window.removeEventListener("focus", cekUlang)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 821px)")
    const handleBp = (e: MediaQueryListEvent) => {
      if (e.matches) setIsCartOpen(false)
    }
    mql.addEventListener("change", handleBp)
    return () => mql.removeEventListener("change", handleBp)
  }, [])

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
        komisiLayanan,
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
        e instanceof Error
          ? e.message
          : "Kode tidak dapat diperiksa. Coba lagi.",
      )
    } finally {
      setKodeChecking(false)
    }
  }

  const items = catalogData
    .filter(
      (x) =>
        x.type === tab &&
        x.name.toLowerCase().includes(cari.trim().toLowerCase()),
    )
    .sort((a, b) => {
      if (tab !== "Produk") return 0
      const aHabis = (a.stock ?? 0) <= 0 ? 1 : 0
      const bHabis = (b.stock ?? 0) <= 0 ? 1 : 0
      return aHabis - bHabis
    })
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
          : Math.max(0, payableTotal - Math.min(splitTunaiInput, payableTotal))
  const tunaiTerpakai =
    method === "QRIS"
      ? 0
      : method === "Tunai"
        ? cash
        : gabunganDari === "qris"
          ? Math.max(0, payableTotal - qris)
          : Math.min(splitTunaiInput, payableTotal)
  const paid = tunaiTerpakai + qris
  const shortage =
    method === "Tunai"
      ? Math.max(0, payableTotal - cash)
      : method === "Gabungan"
        ? tunaiTerpakai + qris < payableTotal
          ? payableTotal - (tunaiTerpakai + qris)
          : tunaiTerpakai > 0 && cashReceived > 0 && cashReceived < tunaiTerpakai
            ? tunaiTerpakai - cashReceived
            : 0
        : 0
  const change =
    method === "Tunai"
      ? Math.max(0, cash - payableTotal)
      : method === "Gabungan"
        ? tunaiTerpakai > 0 && cashReceived > tunaiTerpakai
          ? cashReceived - tunaiTerpakai
          : 0
        : 0

  const payDisabledReason = ((): string | null => {
    if (!cart.length) return null
    if (cart.some((l) => !l.barber?.trim()) && !selectedBarber) {
      return "Pilih nama kapster terlebih dahulu."
    }
    if (gagalMuat) return "Data kasir belum selesai dimuat."
    if (paying) return "Sedang memproses pembayaran..."
    if (method === "Tunai" && cash <= 0) return "Masukkan jumlah tunai."
    if (method === "Gabungan") {
      if (tunaiTerpakai + qris <= 0) {
        return "Masukkan jumlah tunai atau QRIS."
      }
      if (tunaiTerpakai + qris < payableTotal) {
        return `Porsi pembayaran masih kurang ${rupiah(payableTotal - (tunaiTerpakai + qris))}.`
      }
      if (tunaiTerpakai > 0 && cashReceived > 0 && cashReceived < tunaiTerpakai) {
        return `Uang tunai masih kurang ${rupiah(tunaiTerpakai - cashReceived)}.`
      }
    }
    if (shortage > 0) {
      return `Pembayaran masih kurang ${rupiah(shortage)}.`
    }
    if (payableTotal === 0 && !discountReason.trim()) {
      return "Tagihan Rp 0. Centang Gratis dan isi kolom alasan transaksi gratis."
    }
    return null
  })()

  if (currentUser && currentUser.role !== "Kasir") {
    const homePage =
      currentUser.role === "Kapster" ? "BerandaKapster" : "BerandaOwner"
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
        <ErrorState
          title="Data kasir gagal dimuat"
          message={liveError}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
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

  const pecahanCepatGabungan = Array.from(
    new Set(
      [10000, 20000, 50000, 100000]
        .map((k) => Math.ceil(tunaiTerpakai / k) * k)
        .concat([50000, 100000, 150000, 200000]),
    ),
  )
    .filter((n) => n > tunaiTerpakai)
    .sort((a, b) => a - b)
    .slice(0, 4)


  function clearCart() {
    setSelectedBarber("")
    setCart([])
    setReceipt(false)
    setInvoice(undefined)
    setIsTransactionSaved(false)
    setCash(0)
    setQrisInput(0)
    setSplitTunaiInput(0)
    setCashReceived(0)
    setGabunganDari("qris")
    setKomisiLayanan("Normal")
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
      setCart((items) => {
        const remaining = items.filter((item) => item.lineId !== lineId)
        if (remaining.length === 0) {
          setSelectedBarber("")
        }
        return remaining
      })
      setCartSwipe((current) => (current?.lineId === lineId ? null : current))
    }, 180)
  }

  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0)

  return (
    <div className="cashier-page">
      <section className="catalog">
        <div className="catalog-sticky">
        <section
          className={`barber-picker ${!selectedBarber ? "needs-selection" : ""}`}
        >
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
                  title={
                    !isAttended
                      ? "Kapster perlu absensi foto terlebih dahulu"
                      : undefined
                  }
                  onClick={() => {
                    if (!isAttended) {
                      if (id) setAttendanceTarget(id)
                      return
                    }
                    if (selectedBarber === barber) {
                      setSelectedBarber("")
                      return
                    }
                    setSelectedBarber(barber)
                  }}
                >
                  <span>{barber}</span>
                </Button>
              )
            })}
          </div>
        </section>
        {attendanceTarget && (
          <AbsensiKapster
            inline
            initialKapsterId={attendanceTarget}
            initialKapsterName={
              barberList.find((barber) => barber.id === attendanceTarget)?.name
            }
            onComplete={(success) => {
              if (success) {
                const kapster = barberList.find(
                  (barber) => barber.id === attendanceTarget,
                )
                setAttendedBarbers((current) =>
                  new Set(current).add(attendanceTarget),
                )
                if (kapster) {
                  setSelectedBarber(kapster.name)
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
        {!selectedBarber && (
          <div className="catalog-locked-card" role="alert">
            <div className="catalog-locked-content">
              <div className="catalog-locked-header">
                <span className="catalog-locked-icon">
                  <Icon name="user" />
                </span>
                <strong>Pilih Nama Anda Dulu</strong>
              </div>
              <p>
                Katalog layanan &amp; produk dikunci sementara. Ketuk tombol nama kapster Anda di atas untuk mulai mencatat transaksi.
              </p>
            </div>
          </div>
        )}
        <div className={`catalog-grid ${!selectedBarber ? "catalog-locked" : ""}`}>
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
              ? "Pilih nama kapster Anda di atas terlebih dahulu"
              : stokHabis(item.id, item.stock)
                ? "Stok habis di keranjang"
                : undefined
            const tambah = () => {
              setLastAdded({
                id: String(item.id),
                type: item.type,
                timestamp: Date.now(),
              })
              if (lastAddedTimer.current) window.clearTimeout(lastAddedTimer.current)
              lastAddedTimer.current = window.setTimeout(() => {
                setLastAdded((cur) =>
                  cur?.id === String(item.id) && cur?.type === item.type ? null : cur,
                )
              }, 600)

              setCart((c) => {
                const found = c.find(
                  (x) => x.id === item.id && x.barber === selectedBarber,
                )
                const updated = found
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
                return groupCartByBarber(updated)
              })
            }
            const isJustAdded =
              lastAdded !== null &&
              lastAdded.id === String(item.id) &&
              lastAdded.type === item.type
            return (
              <button
                type="button"
                className={`catalog-item ${tidakBisa ? "disabled" : ""} ${isJustAdded ? "just-added" : ""}`}
                key={`${item.type}-${item.id}`}
                title={alasan ?? `Tambah ${item.name} ke keranjang`}
                disabled={tidakBisa}
                onClick={tambah}
                aria-label={`Tambah ${item.name} ke keranjang`}
              >
                {isJustAdded && lastAdded && (
                  <>
                    <span
                      key={`ripple-${lastAdded.timestamp}`}
                      className="catalog-click-ripple"
                      aria-hidden="true"
                    />
                    <span
                      key={`badge-${lastAdded.timestamp}`}
                      className="catalog-plus-badge"
                      aria-hidden="true"
                    >
                      +1
                    </span>
                  </>
                )}
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
                <span
                  key={isJustAdded && lastAdded ? `add-${lastAdded.timestamp}` : "add-idle"}
                  aria-hidden="true"
                  className={`catalog-add ${isJustAdded ? "just-added" : ""}`}
                >
                  <Icon name={isJustAdded ? "check" : "plus"} />
                </span>
              </button>
            )
          })}
        </div>
      </section>
      {cart.length > 0 && (
        <div className="mobile-cart-bar fixed bottom-0 inset-x-0 z-40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-[var(--paper)]/95 backdrop-blur border-t border-[var(--line)] shadow-[0_-4px_20px_rgba(20,17,15,0.08)] min-[821px]:hidden">
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
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 min-[821px]:hidden ${
          isCartOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`cart cart-sheet-center fixed z-50 flex flex-col overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl transition-[opacity,transform] duration-200 ease-out overscroll-contain min-[821px]:transition-none min-[821px]:static min-[821px]:w-auto min-[821px]:max-w-none min-[821px]:inset-auto min-[821px]:z-auto min-[821px]:max-h-none min-[821px]:overflow-visible min-[821px]:rounded-none min-[821px]:border-0 min-[821px]:bg-[var(--bone)] min-[821px]:shadow-none min-[821px]:translate-y-0 min-[821px]:scale-100 min-[821px]:transform-none min-[821px]:opacity-100 min-[821px]:pointer-events-auto ${
          isCartOpen
            ? "cart-sheet-open scale-100 opacity-100 pointer-events-auto"
            : "scale-95 opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Pesanan saat ini"
      >
        <div className="cart-panel">
          <div className="min-[821px]:hidden mx-auto my-2.5 h-1.5 w-12 rounded-full bg-[var(--line)]" />
          <div className="cart-tabs flex items-center justify-between">
            <span className="cart-tab-active">
              <Icon name="receipt" /> Pesanan saat ini
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="min-[821px]:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bone)] text-[var(--ink)] active:scale-95 transition cursor-pointer"
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
              cart.map((line, idx) => {
                const isFirstOfBarber =
                  idx === 0 || cart[idx - 1].barber !== line.barber

                return (
                  <Fragment key={line.lineId}>
                    {isFirstOfBarber && line.barber && (
                      <div className="cart-barber-group-header">
                        <Icon name="user" />
                        <span>
                          Kapster: <strong>{line.barber}</strong>
                        </span>
                      </div>
                    )}
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
              </Fragment>
            )
          })
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
                      setSplitTunaiInput(0)
                      setCashReceived(0)
                      setGabunganDari("qris")
                    }}
                  >
                    <Icon name={value === "QRIS" ? "qris" : "cash"} />
                    <strong>{value}</strong>
                  </Button>
                ))}
              </div>
              {cart.some((line) => line.type === "Layanan") && (
                <div className="commission-choice">
                  <span>Komisi layanan</span>
                  <div
                    className="method-grid"
                    role="group"
                    aria-label="Pilih komisi layanan"
                  >
                    {(["Normal", "OT"] as const).map((value) => (
                      <Button
                        className={komisiLayanan === value ? "active" : ""}
                        key={value}
                        onClick={() => setKomisiLayanan(value)}
                      >
                        <strong>{value}</strong>
                        <small>{value === "Normal" ? "40%" : "50%"}</small>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

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
                      className={`payment-result ${
                        shortage ? "danger" : "success"
                      }`}
                    >
                      <span>
                        {shortage ? "Pembayaran kurang" : "Kembalian"}
                      </span>
                      <strong>
                        {shortage
                          ? rupiah(shortage)
                          : rupiah(change)}
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
                    Bagi pembayaran tagihan ke QRIS &amp; Tunai:
                  </p>
                  <div className="pay-split">
                    <label className="pay-field">
                      <span>Porsi QRIS</span>
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
                    <label className="pay-field">
                      <span>Porsi Tunai</span>
                      <div className="input-shell">
                        <b>Rp</b>
                        <input
                          inputMode="numeric"
                          onChange={(e) => {
                            setGabunganDari("tunai")
                            setSplitTunaiInput(
                              Number(e.target.value.replace(/\D/g, "")),
                            )
                          }}
                          placeholder="0"
                          value={
                            gabunganDari === "tunai"
                              ? splitTunaiInput || ""
                              : tunaiTerpakai || ""
                          }
                        />
                      </div>
                    </label>
                  </div>

                  {tunaiTerpakai > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <label className="pay-field">
                        <span>Uang tunai diterima</span>
                        <div className="input-shell">
                          <b>Rp</b>
                          <input
                            inputMode="numeric"
                            onChange={(e) =>
                              setCashReceived(
                                Number(e.target.value.replace(/\D/g, "")),
                              )
                            }
                            placeholder={String(tunaiTerpakai)}
                            value={cashReceived || ""}
                          />
                        </div>
                      </label>
                      <div className="quick-cash">
                        <Button
                          className={`quick-cash-exact ${
                            cashReceived === tunaiTerpakai ? "active" : ""
                          }`}
                          onClick={() => setCashReceived(tunaiTerpakai)}
                        >
                          Uang pas
                        </Button>
                        {pecahanCepatGabungan.map((n) => (
                          <Button
                            key={n}
                            className={cashReceived === n ? "active" : ""}
                            onClick={() => setCashReceived(n)}
                          >
                            {rupiah(n)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {shortage > 0 && (
                    <div className="payment-result danger">
                      <span>Pembayaran kurang</span>
                      <strong>Kurang {rupiah(shortage)}</strong>
                    </div>
                  )}

                  {change > 0 && (
                    <div className="payment-result success">
                      <span>Kembalian tunai</span>
                      <strong>{rupiah(change)}</strong>
                    </div>
                  )}

                  {tunaiTerpakai + qris > 0 && shortage === 0 && change === 0 && (
                    <div className="payment-result success">
                      <span>Tunai {rupiah(tunaiTerpakai)}</span>
                      <strong>QRIS {rupiah(qris)}</strong>
                    </div>
                  )}

                  {qris > 0 && (
                    <div className="cart-qris-note">
                      <Icon name="qris" /> Pastikan pembayaran QRIS sebesar{" "}
                      <strong>{rupiah(qris)}</strong> sudah masuk.
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
                <span>
                  Bayar{" "}
                  {cart.length > 0
                    ? `(${Array.from(new Set(cart.map((l) => l.barber).filter(Boolean))).join(", ")})`
                    : selectedBarber
                      ? `(${selectedBarber})`
                      : ""}
                </span>
                <Icon name="cash" />
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
      {receipt && (
        <ReceiptView
          cart={cart}
          subtotal={total}
          discount={effectiveDiscount}
          total={payableTotal}
          method={method}
          cash={
            method === "Tunai"
              ? cash
              : method === "Gabungan"
                ? cashReceived || tunaiTerpakai
                : 0
          }
          qris={qris}
          change={change}
          cashier={currentUser?.name ?? "Siti Rahma"}
          barber={
            Array.from(new Set(cart.map((l) => l.barber).filter(Boolean))).join(
              ", ",
            ) || selectedBarber
          }
          invoice={invoice ?? "Dibuat saat disimpan"}
          popup
          tersimpan={isTransactionSaved}
          saving={savingReceipt}
          saveError={saveReceiptError}
          onEdit={
            isTransactionSaved
              ? undefined
              : () => {
                  setReceipt(false)
                  setSaveReceiptError("")
                }
          }
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
      )}
    </div>
  )
}

export default CashierPage
