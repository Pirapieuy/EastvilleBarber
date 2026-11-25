import {
  labelPeriode,
  ModePeriode,
  rentangPeriode,
  TANGGAL_MAKS,
  TANGGAL_MULAI,
} from "../../utils/tanggal"
import { ReactNode, useEffect, useMemo, useState } from "react"
import { apiKapster, apiLaporan, AktivitasKapster, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  CalendarPicker,
  LoadingState,
  MonthPicker,
  PageTitle,
  rupiah,
  ErrorState,
} from "../../components/common/UI"
import { AppUser, IconName, Role } from "../../types"
import {
  eksporExcel,
  eksporPdf,
  TabelEkspor,
} from "../../components/common/exportTable"
import { WhatsAppDialog } from "./ReportsPage"
import { SearchSelect } from "../../components/common/SearchSelect"

export interface ProductTransactionRecord {
  id: string
  time: string
  product: string
  qty: number
  unitPrice: number
  totalOmzet: number
  barber: string
  seller: string
  barberShare: number
  sellerShare: number
  eastvilleShare: number
  status: "Lunas" | "Batal"
  voidReason?: string
  voidBy?: string
  voidAt?: string
}

export const INITIAL_PRODUCT_TRANSACTIONS: ProductTransactionRecord[] = [
  {
    id: "TRX-P29-001",
    time: "29 Okt 10.15",
    product: "Free Style Dust",
    qty: 2,
    unitPrice: 70000,
    totalOmzet: 140000,
    barber: "Seva",
    seller: "HAIRPRO Official",
    barberShare: 14000,
    sellerShare: 84000,
    eastvilleShare: 42000,
    status: "Lunas",
  },
  {
    id: "TRX-P29-002",
    time: "29 Okt 11.40",
    product: "Hair Paste Pomade",
    qty: 1,
    unitPrice: 70000,
    totalOmzet: 70000,
    barber: "Tata",
    seller: "HAIRPRO Official",
    barberShare: 10000,
    sellerShare: 42000,
    eastvilleShare: 18000,
    status: "Lunas",
  },
  {
    id: "TRX-P29-003",
    time: "29 Okt 13.10",
    product: "Water Based Pomade",
    qty: 1,
    unitPrice: 70000,
    totalOmzet: 70000,
    barber: "Faisal",
    seller: "HAIRPRO Official",
    barberShare: 10000,
    sellerShare: 42000,
    eastvilleShare: 18000,
    status: "Lunas",
  },
  {
    id: "TRX-P29-004",
    time: "29 Okt 14.25",
    product: "Miracle Treatment",
    qty: 1,
    unitPrice: 70000,
    totalOmzet: 70000,
    barber: "Fadhil",
    seller: "Mitra Grooming",
    barberShare: 10000,
    sellerShare: 40000,
    eastvilleShare: 20000,
    status: "Batal",
    voidReason: "Salah input varian produk pomade oleh kasir saat pembayaran",
    voidBy: "Ardi Pradana · Owner",
    voidAt: "29 Okt 14.30",
  },
]

export function ProductDetail({
  rows = [
    ["Free Style Dust", "46 unit", "Rp 3.220.000"],
    ["Hair Paste Pomade", "38 unit", "Rp 2.660.000"],
    ["Water Based Pomade", "34 unit", "Rp 2.380.000"],
    ["Miracle Treatment", "29 unit", "Rp 2.030.000"],
  ],
}: { rows?: string[][] } = {}) {
  return (
    <section className="panel product-detail">
      <PageTitle eyebrow="Rincian" title="Per produk" />
      {rows.map((x) => (
        <div key={x[0]}>
          <strong>{x[0]}</strong>
          <span>{x[1]}</span>
          <b>{x[2]}</b>
        </div>
      ))}
    </section>
  )
}

export function CompactDetail({
  title,
  icon,
  rows,
}: {
  title: string
  icon: IconName
  rows: string[][]
}) {
  return (
    <section className="panel compact-detail">
      <PageTitle eyebrow="Rincian" title={title} />
      {rows.map((x) => (
        <div key={x[0]}>
          <span>
            <Icon name={icon} />
          </span>
          <strong>{x[0]}</strong>
          <small>{x[1]}</small>
          <b>{x[2]}</b>
        </div>
      ))}
    </section>
  )
}

const pad2 = (n: number) => String(n).padStart(2, "0")
const isoLokal = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

const persen = (bagian: number, total: number) =>
  total > 0 ? Math.round((bagian / total) * 100) : 0

type KolomDetail = { label: string; kanan?: boolean; kecil?: boolean }

/** Satu bagian rincian (kartu angka + tabel) yang dibuka dari kartu KPI. Tabel menggulir sendiri. */
function RincianProduk({
  judul,
  statistik,
  kolom,
  lebar,
  lebarHP,
  baris,
  kosong,
  onBuka,
}: {
  judul: string
  statistik: { label: string; nilai: string; catatan: string }[]
  kolom: KolomDetail[]
  lebar: string
  lebarHP: string
  baris: { key: string; sel: ReactNode[] }[]
  kosong: string
  /** Bila ada, baris bisa di-tap untuk membuka halaman rincian (Riwayat Transaksi). */
  onBuka?: (key: string) => void
}) {
  const cls = (k?: KolomDetail) =>
    [k?.kanan && "is-right", k?.kecil && "lp-hide-sm"].filter(Boolean).join(" ") || undefined
  const tabel = { "--lp-cols": lebar, "--lp-cols-sm": lebarHP } as React.CSSProperties
  return (
    <section className="panel lk-panel lp-section">
      <div className="lk-head">
        <h3>{judul}</h3>
      </div>
      <div className="lp-stats">
        {statistik.map((x) => (
          <div className="lp-stat" key={x.label}>
            <span>{x.label}</span>
            <strong>{x.nilai}</strong>
            <small>{x.catatan}</small>
          </div>
        ))}
      </div>
      <div className="lp-table lp-rincian" style={tabel}>
        <div className="lp-table-inner">
          <div className="lp-head lp-grid">
            {kolom.map((k) => (
              <span className={cls(k)} key={k.label}>
                {k.label}
              </span>
            ))}
          </div>
          {baris.map((r) => (
            <div
              className={`lp-row lp-grid${onBuka ? " is-link" : ""}`}
              key={r.key}
              {...(onBuka && {
                role: "button",
                tabIndex: 0,
                onClick: () => onBuka(r.key),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter") onBuka(r.key)
                },
              })}
            >
              {r.sel.map((c, i) => (
                <div className={cls(kolom[i])} key={i}>
                  {c}
                </div>
              ))}
            </div>
          ))}
          {baris.length === 0 && <div className="lk-empty">{kosong}</div>}
        </div>
      </div>
    </section>
  )
}

export function ProductReportsPage({ currentUser, role: forcedRole, onNavigate }: {
  currentUser?: AppUser
  role?: Role
  onNavigate?: (page: string) => void
} = {}) {
  const [role, setRole] = useState<"Owner" | "Kapster">(
    forcedRole === "Kapster" || currentUser?.role === "Kapster"
      ? "Kapster"
      : "Owner",
  )
  const [wa, setWa] = useState(false)
  const [cari, setCari] = useState("")
  const [subTab, setSubTab] =
    useState<"omzet" | "komisi" | "pemasok" | "eastville">("omzet")
  const pilihBagian = (bagian: "omzet" | "komisi" | "pemasok" | "eastville") => {
    setSubTab(bagian)
    document.getElementById(`lp-${bagian}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }
  /** Buka Riwayat Transaksi untuk satu kapster pada periode laporan ini. */
  const bukaRiwayatKapster = (kapster: string) => {
    try {
      sessionStorage.setItem("eastville_riwayat_mode", mode)
      sessionStorage.setItem("eastville_riwayat_tanggal", tanggal)
      sessionStorage.setItem("eastville_riwayat_kapster", kapster)
    } catch {
      /* filter awal hanya kemudahan */
    }
    onNavigate?.("RiwayatTransaksi")
  }
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  const toggleExpand = (id: string) => {
    setExpandedTxId((prev) => (prev === id ? null : id))
  }
  const [txList, setTxList] = useState<ProductTransactionRecord[]>(
    INITIAL_PRODUCT_TRANSACTIONS,
  )
  const [mode, setMode] = useState<ModePeriode>("Bulanan")
  const [tanggal, setTanggal] = useState(() => isoLokal(new Date()))
  const bulan = tanggal.slice(0, 7)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [fetching, setFetching] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [komisiInfoTerbuka, setKomisiInfoTerbuka] = useState(false)
  const [layananInfoTerbuka, setLayananInfoTerbuka] = useState(false)
  const [layananList, setLayananList] = useState<AktivitasKapster[]>([])
  const isKapsterView =
    role === "Kapster" ||
    forcedRole === "Kapster" ||
    currentUser?.role === "Kapster"

  const rentang = rentangPeriode(mode, tanggal)

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    let batal = false
    setFetching(true)

    if (isKapsterView) {
      Promise.allSettled([
        apiLaporan.produk({ dari: rentang.dari, sampai: rentang.sampai }),
        apiKapster.aktivitas({ dari: rentang.dari, sampai: rentang.sampai }),
      ])
        .then(([prodRes, actRes]) => {
          if (batal) return
          let hasLive = false
          if (prodRes.status === "fulfilled") {
            setTxList(prodRes.value as ProductTransactionRecord[])
            hasLive = true
          }
          if (actRes.status === "fulfilled") {
            setLayananList(actRes.value.filter((r) => r.type === "Layanan"))
            hasLive = true
          }
          if (hasLive) {
            setLive(true)
            setLiveError("")
          } else {
            setLive(false)
            setTxList([])
            setLayananList([])
            const err =
              prodRes.status === "rejected"
                ? prodRes.reason
                : actRes.status === "rejected"
                  ? actRes.reason
                  : null
            setLiveError(err instanceof Error ? err.message : "gagal memuat data")
          }
        })
        .finally(() => !batal && setFetching(false))
    } else {
      apiLaporan
        .produk({ dari: rentang.dari, sampai: rentang.sampai })
        .then((rows) => {
          if (batal) return
          setTxList(rows as ProductTransactionRecord[])
          setLive(true)
          setLiveError("")
        })
        .catch((e) => {
          console.error("Gagal memuat laporan produk:", e)
          if (!batal) {
            setLive(false)
            setTxList([])
            setLiveError(e instanceof Error ? e.message : "gagal memuat data")
          }
        })
        .finally(() => !batal && setFetching(false))
    }

    return () => {
      batal = true
    }
  }, [rentang.dari, rentang.sampai, reloadKey, isKapsterView])

  const ringkas = (kunci: (tx: ProductTransactionRecord) => string) => {
    const per: Record<string, { unit: number; omzet: number }> = {}
    txList
      .filter((tx) => tx.status === "Lunas")
      .forEach((tx) => {
        const r = (per[kunci(tx)] = per[kunci(tx)] ?? { unit: 0, omzet: 0 })
        r.unit += tx.qty
        r.omzet += tx.totalOmzet
      })
    return Object.entries(per)
      .sort((a, b) => b[1].omzet - a[1].omzet)
      .map(([nama, r]) => [nama, `${r.unit} unit`, rupiah(r.omzet)])
  }

  const validTransactions = useMemo(
    () => txList.filter((tx) => tx.status === "Lunas"),
    [txList],
  )

  const filteredTransactions = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return txList.filter(
      (tx) =>
        !q ||
        [tx.id, tx.product, tx.barber, tx.seller].some((v) =>
          v.toLowerCase().includes(q),
        ),
    )
  }, [txList, cari])

  const tabelEkspor = (): TabelEkspor => ({
    berkas: `laporan-produk-${rentang.dari}_${rentang.sampai}`,
    judul: "Laporan Produk",
    keterangan: `Periode ${rentang.dari} s/d ${rentang.sampai} · transaksi lunas ${validTransactions.length} · batal tidak dihitung dalam total`,
    kolom: [
      "Nota",
      "Waktu",
      "Produk",
      "Qty",
      "Kapster",
      "Pemasok",
      "Total Omzet",
      "Bagian Kapster",
      "Bagian Pemasok",
      "Bagian Eastville",
    ],
    baris: filteredTransactions.map((tx) => [
      tx.id,
      tx.time,
      tx.product,
      tx.qty,
      tx.barber,
      tx.seller,
      tx.totalOmzet,
      tx.barberShare,
      tx.sellerShare,
      tx.eastvilleShare,
    ]),
  })

  const totalOmzet = useMemo(
    () => validTransactions.reduce((acc, tx) => acc + tx.totalOmzet, 0),
    [validTransactions],
  )
  const totalBarber = useMemo(
    () => validTransactions.reduce((acc, tx) => acc + tx.barberShare, 0),
    [validTransactions],
  )
  const totalSeller = useMemo(
    () => validTransactions.reduce((acc, tx) => acc + tx.sellerShare, 0),
    [validTransactions],
  )
  const totalEastville = useMemo(
    () => validTransactions.reduce((acc, tx) => acc + tx.eastvilleShare, 0),
    [validTransactions],
  )

  const omzetPerProduk = useMemo(() => {
    const map: Record<string, { product: string; qty: number; omzet: number }> =
      {}
    validTransactions.forEach((tx) => {
      const item = map[tx.product] ?? {
        product: tx.product,
        qty: 0,
        omzet: 0,
      }
      item.qty += tx.qty
      item.omzet += tx.totalOmzet
      map[tx.product] = item
    })
    return Object.values(map).sort((a, b) => b.omzet - a.omzet)
  }, [validTransactions])

  const komisiPerKapster = useMemo(() => {
    const map: Record<string, {
      barber: string
      txCount: number
      qty: number
      omzet: number
      komisi: number
    }> = {}
    validTransactions.forEach((tx) => {
      const item = map[tx.barber] ?? {
        barber: tx.barber,
        txCount: 0,
        qty: 0,
        omzet: 0,
        komisi: 0,
      }
      item.txCount += 1
      item.qty += tx.qty
      item.omzet += tx.totalOmzet
      item.komisi += tx.barberShare
      map[tx.barber] = item
    })
    return Object.values(map).sort((a, b) => b.komisi - a.komisi)
  }, [validTransactions])

  const bagianPerPemasok = useMemo(() => {
    const map: Record<string, {
      seller: string
      qty: number
      omzet: number
      sellerShare: number
      products: Set<string>
    }> = {}
    validTransactions.forEach((tx) => {
      const item = map[tx.seller] ?? {
        seller: tx.seller,
        qty: 0,
        omzet: 0,
        sellerShare: 0,
        products: new Set<string>(),
      }
      item.qty += tx.qty
      item.omzet += tx.totalOmzet
      item.sellerShare += tx.sellerShare
      item.products.add(tx.product)
      map[tx.seller] = item
    })
    return Object.values(map)
      .map((x) => ({
        ...x,
        productsList: Array.from(x.products).join(", "),
      }))
      .sort((a, b) => b.sellerShare - a.sellerShare)
  }, [validTransactions])

  const bagianEastvillePerProduk = useMemo(() => {
    const map: Record<string, {
      product: string
      qty: number
      omzet: number
      barberShare: number
      sellerShare: number
      eastvilleShare: number
    }> = {}
    validTransactions.forEach((tx) => {
      const item = map[tx.product] ?? {
        product: tx.product,
        qty: 0,
        omzet: 0,
        barberShare: 0,
        sellerShare: 0,
        eastvilleShare: 0,
      }
      item.qty += tx.qty
      item.omzet += tx.totalOmzet
      item.barberShare += tx.barberShare
      item.sellerShare += tx.sellerShare
      item.eastvilleShare += tx.eastvilleShare
      map[tx.product] = item
    })
    return Object.values(map).sort(
      (a, b) => b.eastvilleShare - a.eastvilleShare,
    )
  }, [validTransactions])

  // Dengan token: jangan tampilkan angka demo saat memuat atau gagal memuat.
  if (getToken() && !live && liveError) {
    return (
      <div className="content">
        <ErrorState
          title="Laporan produk gagal dimuat"
          message={liveError}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    )
  }

  if (getToken() && !live) {
    return (
      <div className="loading-state-screen">
        <LoadingState message="Memuat komisi produk..." />
      </div>
    )
  }

  if (isKapsterView) {
    return (
      <div className="mobile-content kapster-product-commission">
        {!forcedRole && !getToken() && (
          <div className="role-preview">
            <span>Pratinjau peran</span>
            <SearchSelect
              onChange={(e) => setRole(e.target.value as "Owner" | "Kapster")}
              value={role}
            >
              <option>Owner</option>
              <option>Kapster</option>
            </SearchSelect>
          </div>
        )}
        <DemoNotice live={live} error={liveError} />
        <PageTitle eyebrow="Pendapatan pribadi" title="Komisi Produk Saya" />
        <div className="kapster-date-toolbar">
          <CalendarPicker
            max={TANGGAL_MAKS()}
            min={TANGGAL_MULAI}
            value={tanggal}
            label={labelPeriode(mode, tanggal)}
            bulanSaja={mode === "Bulanan"}
            popupHeader={
              <div
                className="segmented history-periode"
                role="group"
                aria-label="Periode"
              >
                {(["Harian", "Mingguan", "Bulanan"] as const).map((m) => (
                  <Button
                    className={mode === m ? "active" : ""}
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            }
            onChange={(d) => d && setTanggal(d)}
          />
        </div>
        {(() => {
          const lunas = live ? txList.filter((t) => t.status === "Lunas") : null
          const perProduk: Record<string, number> = {}
          lunas?.forEach(
            (t) =>
              (perProduk[t.product] =
                (perProduk[t.product] ?? 0) + t.barberShare),
          )
          const daftarProduk: [string, number][] = lunas
            ? Object.entries(perProduk).sort((x, y) => y[1] - x[1])
            : [
                ["Free Style Dust", 10000],
                ["Hair Paste Pomade", 20000],
                ["Water Based Pomade", 10000],
                ["Miracle Treatment", 10000],
              ]

          const perLayanan: Record<string, number> = {}
          if (live) {
            layananList.forEach((r) => {
              const comm = Number(r.comm) > 0 ? Number(r.comm) : (r.fee > 0 ? Math.round(r.fee * 0.4) : 0)
              perLayanan[r.item] = (perLayanan[r.item] ?? 0) + comm
            })
          }
          const daftarLayanan: [string, number][] = live
            ? Object.entries(perLayanan).sort((x, y) => y[1] - x[1])
            : [
                ["Haircut Classic", 180000],
                ["Haircut + Wash + Tonic", 140000],
                ["Gentlemen Grooming", 90000],
                ["Beard Trim & Shape", 60000],
              ]

          const totalProdukComm = lunas
            ? lunas.reduce((n, t) => n + t.barberShare, 0)
            : 50000
          const totalLayananComm = live
            ? layananList.reduce((n, r) => n + (Number(r.comm) > 0 ? Number(r.comm) : (r.fee > 0 ? Math.round(r.fee * 0.4) : 0)), 0)
            : 470000
          const totalKomisi = totalProdukComm + totalLayananComm

          const totalUnit =
            (lunas ? lunas.reduce((n, t) => n + t.qty, 0) : 10) +
            (live ? layananList.reduce((n, r) => n + r.qty, 0) : 34)
          const totalTrxCount =
            lunas && live
              ? new Set([
                  ...lunas.map((t) => t.id),
                  ...layananList.map((r) => r.trx),
                ]).size
              : 18

          return (
            <>
              <article className="my-salary-hero">
                <span>Komisi</span>
                <strong>{rupiah(totalKomisi)}</strong>
                <p>
                  {totalUnit} unit · {totalTrxCount} transaksi
                </p>
                <i>
                  <b />
                </i>
                <small>
                  {!live && getToken() && !liveError
                    ? "Memuat data dari server..."
                    : live
                      ? "Dihitung saat transaksi selesai"
                      : "Data contoh · belum terhubung ke server"}
                </small>
              </article>

              <div className="kapster-commission-cards-grid">
                <section className="panel customer-list kapster-commission-card">
                  <PageTitle
                    eyebrow="Penjualan pribadi"
                    title={
                      <span className="product-commission-title">
                        <span>Komisi per produk</span>
                        <span className="product-commission-info-anchor">
                          <button
                            type="button"
                            className="product-commission-info-button"
                            aria-label="Informasi komisi per produk"
                            aria-expanded={komisiInfoTerbuka}
                            onClick={() =>
                              setKomisiInfoTerbuka((open) => !open)
                            }
                          >
                            <Icon name="alert" />
                          </button>
                          {komisiInfoTerbuka && (
                            <span
                              className="product-commission-info-popover"
                              role="status"
                            >
                              Bagian seller dan Eastville tidak ditampilkan.
                            </span>
                          )}
                        </span>
                      </span>
                    }
                  />
                  <div className="kapster-commission-list-scroll">
                    {daftarProduk.map((x) => (
                      <div key={x[0]}>
                        <i>
                          <Icon name="product" />
                        </i>
                        <strong>{x[0]}</strong>
                        <b>+{rupiah(x[1])}</b>
                      </div>
                    ))}
                    {lunas && daftarProduk.length === 0 && (
                      <p style={{ color: "var(--slate)", margin: "16px 0 0" }}>
                        Belum ada penjualan produk pada periode ini.
                      </p>
                    )}
                  </div>
                </section>

                <section className="panel customer-list kapster-commission-card">
                  <PageTitle
                    eyebrow="Layanan pribadi"
                    title={
                      <span className="product-commission-title">
                        <span>Komisi per layanan</span>
                        <span className="product-commission-info-anchor">
                          <button
                            type="button"
                            className="product-commission-info-button"
                            aria-label="Informasi komisi per layanan"
                            aria-expanded={layananInfoTerbuka}
                            onClick={() =>
                              setLayananInfoTerbuka((open) => !open)
                            }
                          >
                            <Icon name="alert" />
                          </button>
                          {layananInfoTerbuka && (
                            <span
                              className="product-commission-info-popover"
                              role="status"
                            >
                              Dihitung dari komisi transaksi layanan yang selesai.
                            </span>
                          )}
                        </span>
                      </span>
                    }
                  />
                  <div className="kapster-commission-list-scroll">
                    {daftarLayanan.map((x) => (
                      <div key={x[0]}>
                        <i className="service-icon-box">
                          <Icon name="cashier" />
                        </i>
                        <strong>{x[0]}</strong>
                        <b>+{rupiah(x[1])}</b>
                      </div>
                    ))}
                    {live && daftarLayanan.length === 0 && (
                      <p style={{ color: "var(--slate)", margin: "16px 0 0" }}>
                        Belum ada pengerjaan layanan pada periode ini.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </>
          )
        })()}
      </div>
    )
  }

  const unitTotal = validTransactions.reduce((n, tx) => n + tx.qty, 0)
  const kpis = [
    { key: "omzet", icon: "product", tone: "sage", label: "Omzet Produk", value: totalOmzet, detail: `${validTransactions.length} transaksi lunas` },
    { key: "komisi", icon: "people", tone: "brass", label: "Komisi Kapster", value: totalBarber, detail: totalOmzet > 0 ? `${persen(totalBarber, totalOmzet)}% omzet` : "Belum ada" },
    { key: "pemasok", icon: "home", tone: "amber", label: "Bagian Pemasok", value: totalSeller, detail: totalOmzet > 0 ? `${persen(totalSeller, totalOmzet)}% omzet` : "Belum ada" },
    { key: "eastville", icon: "wallet", tone: "dark", label: "Bagian Eastville", value: totalEastville, detail: totalOmzet > 0 ? `${persen(totalEastville, totalOmzet)}% omzet` : "Belum ada" },
  ] as const

  const bagianTx = (nilai: number, total: number) =>
    `${rupiah(nilai)} (${persen(nilai, total)}%)`

  return (
    <div className="content report-page lp-page">
      <DemoNotice live={live} error={liveError} />

      <div className="report-toolbar">
        <CalendarPicker
          max={TANGGAL_MAKS()}
          min={TANGGAL_MULAI}
          value={tanggal}
          label={labelPeriode(mode, tanggal)}
          bulanSaja={mode === "Bulanan"}
          popupHeader={
            <div className="segmented history-periode" role="group" aria-label="Periode">
              {(["Harian", "Mingguan", "Bulanan"] as const).map((m) => (
                <Button
                  className={mode === m ? "active" : ""}
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          }
          onChange={(d) => d && setTanggal(d)}
        />
        <div className="report-export-buttons">
          <Button className="secondary-button" onClick={() => eksporExcel(tabelEkspor())}>
            Excel
          </Button>
          <Button className="secondary-button" onClick={() => eksporPdf(tabelEkspor())}>
            PDF
          </Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>

      <div className="od-kpis" style={fetching ? { opacity: 0.6 } : undefined}>
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            className={`od-kpi${subTab === k.key ? " is-active" : ""}`}
            aria-label={`${k.label} ${rupiah(k.value)}, lihat rincian`}
            onClick={() => pilihBagian(k.key)}
          >
            <span className="od-kpi-body">
              <span className={`kpi-icon ${k.tone}`}>
                <Icon name={k.icon} />
              </span>
              <span className="od-kpi-text">
                <span className="od-kpi-label">{k.label}</span>
                <strong className="od-kpi-value">{rupiah(k.value)}</strong>
                <span className="od-kpi-detail">{k.detail}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <section id="lp-transaksi" className="panel lk-panel report-section">
        <div className="lk-head">
          <h3>Riwayat Transaksi Produk</h3>
        </div>
        <div className="expense-toolbar filters">
          <div className="search">
            <Icon name="search" />
            <input
              placeholder="Cari nota, produk, kapster, pemasok..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>
        </div>
        <div className="lp-table lp-tx-table">
          <div className="lp-table-inner">
            <div className="lp-head lp-tx-grid">
              <span>Nota &amp; Waktu</span>
              <span>Produk</span>
              <span className="lp-hide-sm">Pemasok</span>
              <span className="is-right">Total</span>
              <span aria-hidden="true" />
            </div>
            {filteredTransactions.map((tx, index) => {
              const rowId = `${tx.id}-${index}`
              const isOpen = expandedTxId === rowId
              const batal = tx.status === "Batal"
              return (
                <div className={`lp-tx${batal ? " is-void" : ""}`} key={rowId}>
                  <button
                    type="button"
                    className="lp-row lp-tx-grid lp-tx-row"
                    aria-expanded={isOpen}
                    onClick={() => toggleExpand(rowId)}
                  >
                    <span className="lp-nota">
                      <strong>{tx.id}</strong>
                      <small>{tx.time}</small>
                    </span>
                    <span className="lp-prod">
                      <strong>{tx.product}</strong>
                      <small>{tx.qty} unit</small>
                    </span>
                    <span className="lp-sup lp-hide-sm">{tx.seller}</span>
                    <b className="lp-total is-right">{rupiah(tx.totalOmzet)}</b>
                    <Icon name="chevron" className={`lp-chev${isOpen ? " is-open" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="lp-detail">
                      <div className="lp-cell">
                        <span>Harga satuan</span>
                        <b>{rupiah(tx.unitPrice)} × {tx.qty} unit</b>
                      </div>
                      <div className="lp-cell">
                        <span>Kapster penjual</span>
                        <b>{tx.barber}</b>
                        <small>Komisi {bagianTx(tx.barberShare, tx.totalOmzet)}</small>
                      </div>
                      <div className="lp-cell">
                        <span>Bagian pemasok</span>
                        <b>{tx.seller}</b>
                        <small>{bagianTx(tx.sellerShare, tx.totalOmzet)}</small>
                      </div>
                      <div className="lp-cell">
                        <span>Bagian Eastville</span>
                        <b>{bagianTx(tx.eastvilleShare, tx.totalOmzet)}</b>
                        <small>Laba toko barbershop</small>
                      </div>
                      {batal && (
                        <div className="lp-void">
                          <Icon name="alert" />
                          <span>
                            Dibatalkan oleh {tx.voidBy} · {tx.voidAt}: {tx.voidReason}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredTransactions.length === 0 && (
              <div className="lk-empty">
                Tidak ada data transaksi yang cocok dengan pencarian.
              </div>
            )}
          </div>
        </div>
      </section>

      <div id="lp-omzet" className="report-section">
        <RincianProduk
          judul="Total omzet produk"
          statistik={[
            { label: "Total omzet", nilai: rupiah(totalOmzet), catatan: `Dari ${validTransactions.length} transaksi lunas` },
            { label: "Unit terjual", nilai: `${unitTotal} unit`, catatan: `${omzetPerProduk.length} varian produk` },
            { label: "Rata-rata per unit", nilai: rupiah(unitTotal > 0 ? Math.round(totalOmzet / unitTotal) : 0), catatan: "Nilai rata-rata produk" },
          ]}
          kolom={[
            { label: "Produk" },
            { label: "Unit" },
            { label: "Harga rata-rata", kecil: true },
            { label: "Omzet", kanan: true },
            { label: "Kontribusi", kecil: true },
          ]}
          lebar="minmax(0,1.6fr) minmax(0,.7fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,.8fr)"
          lebarHP="minmax(0,1.4fr) minmax(0,.8fr) minmax(0,1.1fr)"
          baris={omzetPerProduk.map((x) => ({
            key: x.product,
            sel: [
              <strong key="n">{x.product}</strong>,
              `${x.qty} unit`,
              rupiah(Math.round(x.omzet / x.qty)),
              <b key="o">{rupiah(x.omzet)}</b>,
              `${persen(x.omzet, totalOmzet)}%`,
            ],
          }))}
          kosong="Belum ada penjualan produk lunas pada periode ini."
        />
      </div>

      <div id="lp-komisi" className="report-section">
        <RincianProduk
          judul="Komisi kapster"
          statistik={[
            { label: "Total komisi", nilai: rupiah(totalBarber), catatan: "Bagian yang diterima kapster" },
            { label: "Porsi dari omzet", nilai: `${persen(totalBarber, totalOmzet)}%`, catatan: "Persentase bagi hasil kapster" },
            { label: "Kapster berhasil jual", nilai: `${komisiPerKapster.length} orang`, catatan: "Kapster dengan penjualan aktif" },
          ]}
          kolom={[
            { label: "Kapster" },
            { label: "Transaksi" },
            { label: "Unit", kecil: true },
            { label: "Omzet", kecil: true },
            { label: "Komisi", kanan: true },
          ]}
          lebar="minmax(0,1.6fr) minmax(0,.9fr) minmax(0,.7fr) minmax(0,1.1fr) minmax(0,1.1fr)"
          lebarHP="minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.1fr)"
          baris={komisiPerKapster.map((x) => ({
            key: x.barber,
            sel: [
              <strong key="n">{x.barber}</strong>,
              `${x.txCount} nota`,
              `${x.qty} unit`,
              rupiah(x.omzet),
              <b className="lk-komisi" key="k">{rupiah(x.komisi)}</b>,
            ],
          }))}
          kosong="Belum ada data komisi kapster pada periode ini."
          onBuka={onNavigate ? bukaRiwayatKapster : undefined}
        />
      </div>

      <div id="lp-pemasok" className="report-section">
        <RincianProduk
          judul="Bagian pemasok"
          statistik={[
            { label: "Total hak pemasok", nilai: rupiah(totalSeller), catatan: "Kewajiban bayar ke pemasok" },
            { label: "Porsi dari omzet", nilai: `${persen(totalSeller, totalOmzet)}%`, catatan: "Persentase bagi pemasok" },
            { label: "Jumlah pemasok", nilai: `${bagianPerPemasok.length} mitra`, catatan: "Pemasok aktif periode ini" },
          ]}
          kolom={[
            { label: "Pemasok" },
            { label: "Produk dipasok", kecil: true },
            { label: "Unit" },
            { label: "Omzet kotor", kecil: true },
            { label: "Hak pemasok", kanan: true },
          ]}
          lebar="minmax(0,1.4fr) minmax(0,1.6fr) minmax(0,.7fr) minmax(0,1.1fr) minmax(0,1.1fr)"
          lebarHP="minmax(0,1.3fr) minmax(0,.7fr) minmax(0,1.1fr)"
          baris={bagianPerPemasok.map((x) => ({
            key: x.seller,
            sel: [
              <strong key="n">{x.seller}</strong>,
              x.productsList,
              `${x.qty} unit`,
              rupiah(x.omzet),
              <b className="lp-amber" key="h">{rupiah(x.sellerShare)}</b>,
            ],
          }))}
          kosong="Belum ada data pemasok pada periode ini."
        />
      </div>

      <div id="lp-eastville" className="report-section">
        <RincianProduk
          judul="Bagian Eastville"
          statistik={[
            { label: "Total bagian toko", nilai: rupiah(totalEastville), catatan: "Laba kotor barbershop" },
            { label: "Margin dari omzet", nilai: `${persen(totalEastville, totalOmzet)}%`, catatan: "Setelah komisi kapster & pemasok" },
            { label: "Total omzet", nilai: rupiah(totalOmzet), catatan: "Dasar perhitungan bagi hasil" },
          ]}
          kolom={[
            { label: "Produk" },
            { label: "Unit", kecil: true },
            { label: "Omzet" },
            { label: "Kapster", kecil: true },
            { label: "Pemasok", kecil: true },
            { label: "Eastville", kanan: true },
          ]}
          lebar="minmax(0,1.5fr) minmax(0,.6fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr)"
          lebarHP="minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)"
          baris={bagianEastvillePerProduk.map((x) => ({
            key: x.product,
            sel: [
              <strong key="n">{x.product}</strong>,
              `${x.qty} unit`,
              rupiah(x.omzet),
              `- ${rupiah(x.barberShare)}`,
              `- ${rupiah(x.sellerShare)}`,
              <b key="e">{rupiah(x.eastvilleShare)}</b>,
            ],
          }))}
          kosong="Belum ada data bagi hasil produk pada periode ini."
        />
      </div>
      {wa && (
        <WhatsAppDialog
          onClose={() => setWa(false)}
          title="Laporan Produk"
          text={`Periode: ${
            rentang.dari === rentang.sampai
              ? rentang.dari
              : `${rentang.dari} s/d ${rentang.sampai}`
          }\nTotal Omzet produk: ${rupiah(totalOmzet)}\nTotal Komisi kapster: ${rupiah(totalBarber)}\nTotal Bagian pemasok: ${rupiah(totalSeller)}\nTotal Bagian Eastville: ${rupiah(totalEastville)}`}
        />
      )}
    </div>
  )
}

export default ProductReportsPage
