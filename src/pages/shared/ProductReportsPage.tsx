import { TANGGAL_MAKS, TANGGAL_MULAI } from "../../utils/tanggal"
import { useEffect, useMemo, useState } from "react"
import { apiLaporan, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  CalendarPicker,
  Kpi,
  LoadingState,
  MonthPicker,
  PageTitle,
  rupiah,
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
    voidBy: "Dian Setiawan · Manajer",
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

/** Rentang yyyy-MM-dd: satu hari, satu pekan (Senin-Minggu) yang memuat tanggal, atau satu bulan. */
function rentangProduk(
  mode: "Harian" | "Mingguan" | "Bulanan",
  tanggal: string,
  bulan: string,
) {
  if (mode === "Harian") return { dari: tanggal, sampai: tanggal }
  if (mode === "Mingguan") {
    const d = new Date(`${tanggal}T00:00:00`)
    const mundur = (d.getDay() + 6) % 7
    const senin = new Date(d.getFullYear(), d.getMonth(), d.getDate() - mundur)
    const minggu = new Date(
      senin.getFullYear(),
      senin.getMonth(),
      senin.getDate() + 6,
    )
    return { dari: isoLokal(senin), sampai: isoLokal(minggu) }
  }
  const [y, m] = bulan.split("-").map(Number)
  return {
    dari: `${bulan}-01`,
    sampai: `${bulan}-${pad2(new Date(y, m, 0).getDate())}`,
  }
}

export function ProductReportsPage({ currentUser, role: forcedRole }: {
  currentUser?: AppUser
  role?: Role
} = {}) {
  const [role, setRole] = useState<"Owner" | "Kapster">(
    forcedRole === "Kapster" || currentUser?.role === "Kapster"
      ? "Kapster"
      : "Owner",
  )
  const [wa, setWa] = useState(false)
  const [cari, setCari] = useState("")
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Lunas" | "Batal">(
    "Semua",
  )
  const [activeTab, setActiveTab] = useState<
    "transaksi" | "omzet" | "komisi" | "pemasok" | "eastville" | "ringkasan"
  >("transaksi")
  const [expandedTx, setExpandedTx] = useState<Record<string, boolean>>({})
  const toggleExpand = (id: string) => {
    setExpandedTx((prev) => ({ ...prev, [id]: !prev[id] }))
  }
  const [txList, setTxList] = useState<ProductTransactionRecord[]>(
    INITIAL_PRODUCT_TRANSACTIONS,
  )
  const [mode, setMode] = useState<"Harian" | "Mingguan" | "Bulanan">("Bulanan")
  const [tanggal, setTanggal] = useState(() => isoLokal(new Date()))
  const [bulan, setBulan] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [fetching, setFetching] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const isKapsterView =
    role === "Kapster" ||
    forcedRole === "Kapster" ||
    currentUser?.role === "Kapster"

  const rentang = rentangProduk(mode, tanggal, bulan)

  // Tampilan Owner/Manajer memakai data backend; tampilan Kapster (komisi pribadi) belum tersambung.
  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    let batal = false
    setFetching(true)
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
          // Jangan biarkan data periode sebelumnya/demo tampil sebagai data periode ini
          setLive(false)
          setTxList([])
          setLiveError(e instanceof Error ? e.message : "gagal memuat data")
        }
      })
      .finally(() => !batal && setFetching(false))
    return () => {
      batal = true
    }
  }, [rentang.dari, rentang.sampai, reloadKey])

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
      "Status",
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
      tx.status,
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
    const map: Record<
      string,
      { product: string; qty: number; omzet: number }
    > = {}
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
    const map: Record<
      string,
      {
        barber: string
        txCount: number
        qty: number
        omzet: number
        komisi: number
      }
    > = {}
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
    const map: Record<
      string,
      {
        seller: string
        qty: number
        omzet: number
        sellerShare: number
        products: Set<string>
      }
    > = {}
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
    const map: Record<
      string,
      {
        product: string
        qty: number
        omzet: number
        barberShare: number
        sellerShare: number
        eastvilleShare: number
      }
    > = {}
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
    return Object.values(map).sort((a, b) => b.eastvilleShare - a.eastvilleShare)
  }, [validTransactions])

  const voidCount = useMemo(
    () => txList.filter((tx) => tx.status === "Batal").length,
    [txList],
  )
  const voidAmount = useMemo(
    () =>
      txList
        .filter((tx) => tx.status === "Batal")
        .reduce((acc, tx) => acc + tx.totalOmzet, 0),
    [txList],
  )

  // Dengan token: jangan tampilkan angka demo saat memuat atau gagal memuat.
  if (getToken() && !live && liveError) {
    return (
      <div className="content">
        <DemoNotice live={live} error={liveError} />
        <p>Laporan produk gagal dimuat: {liveError}</p>
        <Button
          className="primary-button"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          Coba lagi
        </Button>
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
      <div className="mobile-content">
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
        <div className="segmented full">
          {(["Harian", "Mingguan", "Bulanan"] as const).map((m) => (
            <Button
              className={mode === m ? "active" : ""}
              key={m}
              onClick={() => setMode(m)}
            >
              {m}
            </Button>
          ))}
        </div>
        {mode === "Bulanan" ? (
          <div className="commission-month-shell">
            <span className="commission-month-label">Periode komisi</span>
            <MonthPicker
              max={TANGGAL_MAKS()}
              min={TANGGAL_MULAI}
              value={bulan}
              onChange={(b) => b && setBulan(b)}
            />
          </div>
        ) : (
          <CalendarPicker
            max={TANGGAL_MAKS()}
            min={TANGGAL_MULAI}
            value={tanggal}
            onChange={(d) => d && setTanggal(d)}
          />
        )}
        {(() => {
          const lunas = live ? txList.filter((t) => t.status === "Lunas") : null
          const perProduk: Record<string, number> = {}
          lunas?.forEach(
            (t) =>
              (perProduk[t.product] =
                (perProduk[t.product] ?? 0) + t.barberShare),
          )
          const daftar: [string, number][] = lunas
            ? Object.entries(perProduk).sort((x, y) => y[1] - x[1])
            : [
                ["Free Style Dust", 10000],
                ["Hair Paste Pomade", 20000],
                ["Water Based Pomade", 10000],
                ["Miracle Treatment", 10000],
              ]
          return (
            <>
              <article className="my-salary-hero">
                <span>Komisi</span>
                <strong>
                  {lunas
                    ? rupiah(lunas.reduce((n, t) => n + t.barberShare, 0))
                    : "Rp 520.000"}
                </strong>
                <p>
                  {lunas
                    ? `${lunas.reduce((n, t) => n + t.qty, 0)} unit · ${new Set(lunas.map((t) => t.id)).size} transaksi`
                    : "44 unit · 18 transaksi"}
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
              <section className="panel customer-list">
                <PageTitle
                  eyebrow="Penjualan pribadi"
                  title="Komisi per produk"
                />
                {daftar.map((x) => (
                  <div key={x[0]}>
                    <i>
                      <Icon name="product" />
                    </i>
                    <strong>{x[0]}</strong>
                    <b>+{rupiah(x[1])}</b>
                  </div>
                ))}
                {lunas && daftar.length === 0 && (
                  <p style={{ color: "var(--slate)", padding: "12px 0" }}>
                    Belum ada penjualan produk pada periode ini.
                  </p>
                )}
              </section>
            </>
          )
        })()}
        <div className="privacy">
          <Icon name="lock" /> Bagian seller dan Eastville tidak ditampilkan.
        </div>
      </div>
    )
  }

  // Tidak blocking — tampilan langsung muncul dengan data sementara;
  // data server otomatis menggantikan saat selesai dimuat.

  return (
    <div className="content">
      <DemoNotice live={live} error={liveError} />
      <div className="report-toolbar">
        <div className="report-filter-row">
          <div className="segmented">
            {(["Harian", "Mingguan", "Bulanan"] as const).map((m) => (
              <Button
                className={mode === m ? "active" : ""}
                key={m}
                onClick={() => setMode(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          {mode === "Bulanan" ? (
            <MonthPicker
              max={TANGGAL_MAKS()}
              min={TANGGAL_MULAI}
              value={bulan}
              onChange={(b) => b && setBulan(b)}
            />
          ) : (
            <CalendarPicker
              max={TANGGAL_MAKS()}
              min={TANGGAL_MULAI}
              value={tanggal}
              onChange={(d) => d && setTanggal(d)}
            />
          )}
        </div>
        {!forcedRole && !getToken() && (
          <div className="role-preview">
            <span>Peran</span>
            <SearchSelect
              onChange={(e) => setRole(e.target.value as "Owner" | "Kapster")}
              value={role}
            >
              <option>Owner</option>
              <option>Kapster</option>
            </SearchSelect>
          </div>
        )}
        <div className="report-export-buttons">
          <Button
            className="secondary-button"
            onClick={() => eksporExcel(tabelEkspor())}
          >
            Excel
          </Button>
          <Button
            className="secondary-button"
            onClick={() => eksporPdf(tabelEkspor())}
          >
            PDF
          </Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>
      <div className="kpi-grid">
        <div
          onClick={() => setActiveTab("omzet")}
          style={{
            cursor: "pointer",
            borderRadius: 12,
            transition: "all 0.15s ease",
            boxShadow:
              activeTab === "omzet"
                ? "0 0 0 2px var(--sage), 0 4px 12px rgba(0,0,0,0.08)"
                : "none",
            transform: activeTab === "omzet" ? "translateY(-2px)" : "none",
          }}
          title="Klik untuk melihat detail total omzet produk"
        >
          <Kpi
            icon="product"
            label="Total Omzet Produk"
            tone="sage"
            value={rupiah(totalOmzet)}
            detail={`${validTransactions.length} transaksi lunas`}
          />
        </div>

        <div
          onClick={() => setActiveTab("komisi")}
          style={{
            cursor: "pointer",
            borderRadius: 12,
            transition: "all 0.15s ease",
            boxShadow:
              activeTab === "komisi"
                ? "0 0 0 2px var(--brass), 0 4px 12px rgba(0,0,0,0.08)"
                : "none",
            transform: activeTab === "komisi" ? "translateY(-2px)" : "none",
          }}
          title="Klik untuk melihat detail total komisi kapster"
        >
          <Kpi
            icon="people"
            label="Total Komisi Kapster"
            tone="brass"
            value={rupiah(totalBarber)}
            detail={`${
              totalOmzet > 0 ? ((totalBarber / totalOmzet) * 100).toFixed(1) : 0
            }% bagian kapster`}
          />
        </div>

        <div
          onClick={() => setActiveTab("pemasok")}
          style={{
            cursor: "pointer",
            borderRadius: 12,
            transition: "all 0.15s ease",
            boxShadow:
              activeTab === "pemasok"
                ? "0 0 0 2px var(--amber), 0 4px 12px rgba(0,0,0,0.08)"
                : "none",
            transform: activeTab === "pemasok" ? "translateY(-2px)" : "none",
          }}
          title="Klik untuk melihat detail total bagian pemasok"
        >
          <Kpi
            icon="home"
            label="Total Bagian Pemasok"
            tone="amber"
            value={rupiah(totalSeller)}
            detail={`${
              totalOmzet > 0 ? ((totalSeller / totalOmzet) * 100).toFixed(1) : 0
            }% bagian pemasok`}
          />
        </div>

        <div
          onClick={() => setActiveTab("eastville")}
          style={{
            cursor: "pointer",
            borderRadius: 12,
            transition: "all 0.15s ease",
            boxShadow:
              activeTab === "eastville"
                ? "0 0 0 2px var(--ink), 0 4px 12px rgba(0,0,0,0.08)"
                : "none",
            transform: activeTab === "eastville" ? "translateY(-2px)" : "none",
          }}
          title="Klik untuk melihat detail total bagian Eastville"
        >
          <Kpi
            icon="wallet"
            label="Total Bagian Eastville"
            tone="dark"
            value={rupiah(totalEastville)}
            detail={`${
              totalOmzet > 0
                ? ((totalEastville / totalOmzet) * 100).toFixed(1)
                : 0
            }% sisa barbershop`}
          />
        </div>
      </div>

      <div className="void-protection-banner">
        <Icon name="check" />
        <span>
          <strong>Sistem Proteksi Omzet & Komisi Aktif:</strong> Transaksi yang
          dibatalkan otomatis dikecualikan dari perhitungan total omzet dan
          komisi (tercatat {voidCount} pembatalan: {rupiah(voidAmount)}).
        </span>
      </div>

      <div className="report-subnav-row">
        <div className="segmented">
          <Button
            className={activeTab === "transaksi" ? "active" : ""}
            onClick={() => setActiveTab("transaksi")}
          >
            <Icon name="receipt" />
            <span>Riwayat Transaksi</span>
          </Button>
          <Button
            className={activeTab === "omzet" ? "active" : ""}
            onClick={() => setActiveTab("omzet")}
          >
            <Icon name="product" />
            <span>Detail Omzet Produk</span>
          </Button>
          <Button
            className={activeTab === "komisi" ? "active" : ""}
            onClick={() => setActiveTab("komisi")}
          >
            <Icon name="people" />
            <span>Detail Komisi Kapster</span>
          </Button>
          <Button
            className={activeTab === "pemasok" ? "active" : ""}
            onClick={() => setActiveTab("pemasok")}
          >
            <Icon name="home" />
            <span>Detail Bagian Pemasok</span>
          </Button>
          <Button
            className={activeTab === "eastville" ? "active" : ""}
            onClick={() => setActiveTab("eastville")}
          >
            <Icon name="wallet" />
            <span>Detail Bagian Eastville</span>
          </Button>
          <Button
            className={activeTab === "ringkasan" ? "active" : ""}
            onClick={() => setActiveTab("ringkasan")}
          >
            <Icon name="chart" />
            <span>Ringkasan Performa</span>
          </Button>
        </div>
      </div>

      {activeTab === "transaksi" && (
        <section className="panel product-tx-panel">
          <div className="product-tx-toolbar">
            <PageTitle
              eyebrow="Rincian Transaksi"
              title="Riwayat Transaksi Produk"
            />
            <div className="search">
              <Icon name="search" />
              <input
                placeholder="Cari nota, produk, kapster, pemasok..."
                value={cari}
                onChange={(e) => setCari(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 10,
              overflow: "hidden",
              marginTop: 14,
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <div
                style={{
                  minWidth: 700,
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1.8fr 1.2fr 1fr 100px",
                  alignItems: "center",
                  padding: "10px 16px",
                  background: "var(--bone)",
                  color: "var(--slate)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  gap: 12,
                }}
              >
                <span>Nota &amp; Waktu</span>
                <span>Produk &amp; Qty</span>
                <span>Total Omzet</span>
                <span>Status</span>
                <span style={{ textAlign: "right" }}>Rincian</span>
              </div>

              {filteredTransactions.map((tx) => {
                const isOpen = Boolean(expandedTx[tx.id])
                return (
                  <div
                    key={tx.id}
                    style={{
                      borderTop: "1px solid var(--line)",
                      minWidth: 700,
                    }}
                  >
                    <div
                      onClick={() => toggleExpand(tx.id)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.3fr 1.8fr 1.2fr 1fr 100px",
                        alignItems: "center",
                        padding: "12px 16px",
                        gap: 12,
                        cursor: "pointer",
                        background: isOpen
                          ? "rgba(0, 0, 0, 0.02)"
                          : tx.status === "Batal"
                            ? "rgb(140 47 42 / 3%)"
                            : "transparent",
                        transition: "background 0.15s ease",
                      }}
                      title="Klik untuk melihat rincian transaksi"
                    >
                      <div>
                        <strong
                          style={{
                            display: "block",
                            color: "var(--ink)",
                            fontSize: 13,
                          }}
                        >
                          {tx.id}
                        </strong>
                        <small style={{ color: "var(--muted)", fontSize: 11 }}>
                          {tx.time}
                        </small>
                      </div>

                      <div>
                        <strong
                          style={{
                            color: "var(--ink)",
                            fontSize: 13,
                            display: "block",
                          }}
                        >
                          {tx.product}
                        </strong>
                        <span style={{ color: "var(--slate)", fontSize: 12 }}>
                          {tx.qty} unit
                        </span>
                      </div>

                      <div>
                        <strong
                          style={{
                            fontSize: 13,
                            color:
                              tx.status === "Batal"
                                ? "var(--muted)"
                                : "var(--ink)",
                            textDecoration:
                              tx.status === "Batal"
                                ? "line-through"
                                : "none",
                          }}
                        >
                          {rupiah(tx.totalOmzet)}
                        </strong>
                      </div>

                      <div>
                        <span
                          className={`chip ${
                            tx.status === "Lunas" ? "lunas" : "batal"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "var(--brass-dark)",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <span>{isOpen ? "Tutup" : "Detail"}</span>
                          <span
                            style={{
                              transform: isOpen
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                              display: "inline-flex",
                            }}
                          >
                            <Icon name="chevron" />
                          </span>
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <div
                        style={{
                          padding: "16px 20px",
                          background: "var(--paper-soft, #f8fafc)",
                          borderTop: "1px dashed var(--line)",
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: 16,
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--muted)",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              display: "block",
                            }}
                          >
                            Harga Satuan
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--ink)",
                            }}
                          >
                            {rupiah(tx.unitPrice)} × {tx.qty} unit
                          </span>
                        </div>

                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--muted)",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              display: "block",
                            }}
                          >
                            Kapster Penjual
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--ink)",
                            }}
                          >
                            {tx.barber}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: "var(--brass-dark)",
                              fontWeight: 600,
                            }}
                          >
                            Komisi: {rupiah(tx.barberShare)} (
                            {tx.totalOmzet > 0
                              ? (
                                  (tx.barberShare / tx.totalOmzet) *
                                  100
                                ).toFixed(0)
                              : 0}
                            %)
                          </span>
                        </div>

                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--muted)",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              display: "block",
                            }}
                          >
                            Mitra Pemasok
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--ink)",
                            }}
                          >
                            {tx.seller}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: "var(--amber)",
                              fontWeight: 600,
                            }}
                          >
                            Hak Pemasok: {rupiah(tx.sellerShare)} (
                            {tx.totalOmzet > 0
                              ? (
                                  (tx.sellerShare / tx.totalOmzet) *
                                  100
                                ).toFixed(0)
                              : 0}
                            %)
                          </span>
                        </div>

                        <div>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--muted)",
                              textTransform: "uppercase",
                              fontWeight: 700,
                              display: "block",
                            }}
                          >
                            Bagian Eastville
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "var(--ink)",
                            }}
                          >
                            {rupiah(tx.eastvilleShare)} (
                            {tx.totalOmzet > 0
                              ? (
                                  (tx.eastvilleShare / tx.totalOmzet) *
                                  100
                                ).toFixed(0)
                              : 0}
                            %)
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: 11,
                              color: "var(--slate)",
                            }}
                          >
                            Laba toko barbershop
                          </span>
                        </div>

                        {tx.status === "Batal" && (
                          <div
                            style={{
                              gridColumn: "1 / -1",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "8px 12px",
                              background: "var(--oxblood-soft)",
                              color: "var(--oxblood)",
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          >
                            <Icon name="alert" />
                            <span>
                              Dibatalkan oleh {tx.voidBy} · {tx.voidAt}:{" "}
                              {tx.voidReason}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {filteredTransactions.length === 0 && (
                <div
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--slate)",
                  }}
                >
                  Tidak ada data transaksi yang cocok dengan pencarian.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* DETAIL HALAMAN 1: TOTAL OMZET PRODUK */}
      {activeTab === "omzet" && (
        <section className="panel" style={{ padding: 20 }}>
          <PageTitle
            eyebrow="Penjualan Produk"
            title="Detail Total Omzet Produk"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginTop: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Total Omzet Produk
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginTop: 4,
                }}
              >
                {rupiah(totalOmzet)}
              </div>
              <small style={{ color: "var(--slate)" }}>
                Dari {validTransactions.length} transaksi lunas
              </small>
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Total Unit Terjual
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#166534",
                  marginTop: 4,
                }}
              >
                {validTransactions.reduce((acc, tx) => acc + tx.qty, 0)} unit
              </div>
              <small style={{ color: "var(--slate)" }}>
                {omzetPerProduk.length} varian produk terjual
              </small>
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Rata-rata per Unit
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginTop: 4,
                }}
              >
                {rupiah(
                  validTransactions.reduce((acc, tx) => acc + tx.qty, 0) > 0
                    ? Math.round(
                        totalOmzet /
                          validTransactions.reduce(
                            (acc, tx) => acc + tx.qty,
                            0,
                          ),
                      )
                    : 0,
                )}
              </div>
              <small style={{ color: "var(--slate)" }}>
                Nilai rata-rata produk
              </small>
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <div
                style={{
                  minWidth: 650,
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1.2fr 1.5fr 1fr",
                  padding: "10px 16px",
                  background: "var(--bone)",
                  color: "var(--slate)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  gap: 12,
                }}
              >
                <span>Nama Produk</span>
                <span>Unit Terjual</span>
                <span>Harga Rata-rata</span>
                <span>Total Omzet</span>
                <span>Kontribusi</span>
              </div>
              {omzetPerProduk.map((p) => {
                const pct =
                  totalOmzet > 0
                    ? ((p.omzet / totalOmzet) * 100).toFixed(1)
                    : "0"
                return (
                  <div
                    key={p.product}
                    style={{
                      minWidth: 650,
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1.2fr 1.5fr 1fr",
                      padding: "12px 16px",
                      borderTop: "1px solid var(--line)",
                      gap: 12,
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <strong style={{ color: "var(--ink)" }}>{p.product}</strong>
                    <span>{p.qty} unit</span>
                    <span style={{ color: "var(--slate)" }}>
                      {rupiah(Math.round(p.omzet / p.qty))}
                    </span>
                    <strong style={{ color: "var(--ink)" }}>
                      {rupiah(p.omzet)}
                    </strong>
                    <span className="chip lunas" style={{ width: "fit-content" }}>
                      {pct}%
                    </span>
                  </div>
                )
              })}
              {omzetPerProduk.length === 0 && (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    color: "var(--slate)",
                  }}
                >
                  Belum ada penjualan produk lunas pada periode ini.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* DETAIL HALAMAN 2: TOTAL KOMISI KAPSTER */}
      {activeTab === "komisi" && (
        <section className="panel" style={{ padding: 20 }}>
          <PageTitle
            eyebrow="Penjualan Produk"
            title="Detail Total Komisi Kapster"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginTop: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Total Komisi Kapster
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--brass-dark)",
                  marginTop: 4,
                }}
              >
                {rupiah(totalBarber)}
              </div>
              <small style={{ color: "var(--slate)" }}>
                Bagian yang diterima kapster
              </small>
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Porsi Komisi dari Omzet
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginTop: 4,
                }}
              >
                {totalOmzet > 0
                  ? ((totalBarber / totalOmzet) * 100).toFixed(1)
                  : 0}
                %
              </div>
              <small style={{ color: "var(--slate)" }}>
                Persentase bagi hasil kapster
              </small>
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Kapster Berhasil Jual
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginTop: 4,
                }}
              >
                {komisiPerKapster.length} orang
              </div>
              <small style={{ color: "var(--slate)" }}>
                Kapster dengan penjualan aktif
              </small>
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <div
                style={{
                  minWidth: 650,
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1.5fr",
                  padding: "10px 16px",
                  background: "var(--bone)",
                  color: "var(--slate)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  gap: 12,
                }}
              >
                <span>Nama Kapster</span>
                <span>Transaksi</span>
                <span>Unit Terjual</span>
                <span>Omzet Dihasilkan</span>
                <span>Total Komisi</span>
              </div>
              {komisiPerKapster.map((k) => {
                const pct =
                  k.omzet > 0
                    ? ((k.komisi / k.omzet) * 100).toFixed(0)
                    : 0
                return (
                  <div
                    key={k.barber}
                    style={{
                      minWidth: 650,
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1.5fr",
                      padding: "12px 16px",
                      borderTop: "1px solid var(--line)",
                      gap: 12,
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--ink)", display: "block" }}>
                        {k.barber}
                      </strong>
                      <small style={{ color: "var(--muted)" }}>
                        Porsi komisi: ~{pct}%
                      </small>
                    </div>
                    <span>{k.txCount} nota</span>
                    <span>{k.qty} unit</span>
                    <span style={{ color: "var(--slate)" }}>
                      {rupiah(k.omzet)}
                    </span>
                    <strong style={{ color: "var(--brass-dark)" }}>
                      {rupiah(k.komisi)}
                    </strong>
                  </div>
                )
              })}
              {komisiPerKapster.length === 0 && (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    color: "var(--slate)",
                  }}
                >
                  Belum ada data komisi kapster pada periode ini.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* DETAIL HALAMAN 3: TOTAL BAGIAN PEMASOK */}
      {activeTab === "pemasok" && (
        <section className="panel" style={{ padding: 20 }}>
          <PageTitle
            eyebrow="Penjualan Produk"
            title="Detail Total Bagian Pemasok"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginTop: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Total Hak Pemasok
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--amber)",
                  marginTop: 4,
                }}
              >
                {rupiah(totalSeller)}
              </div>
              <small style={{ color: "var(--slate)" }}>
                Kewajiban bayar ke supplier
              </small>
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Porsi dari Total Omzet
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginTop: 4,
                }}
              >
                {totalOmzet > 0
                  ? ((totalSeller / totalOmzet) * 100).toFixed(1)
                  : 0}
                %
              </div>
              <small style={{ color: "var(--slate)" }}>
                Persentase bagi vendor
              </small>
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Jumlah Mitra Pemasok
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginTop: 4,
                }}
              >
                {bagianPerPemasok.length} mitra
              </div>
              <small style={{ color: "var(--slate)" }}>
                Vendor aktif periode ini
              </small>
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <div
                style={{
                  minWidth: 650,
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1.5fr",
                  padding: "10px 16px",
                  background: "var(--bone)",
                  color: "var(--slate)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  gap: 12,
                }}
              >
                <span>Nama Pemasok</span>
                <span>Produk Dipasok</span>
                <span>Unit Terjual</span>
                <span>Omzet Kotor</span>
                <span>Hak Pemasok</span>
              </div>
              {bagianPerPemasok.map((s) => {
                const pct =
                  s.omzet > 0
                    ? ((s.sellerShare / s.omzet) * 100).toFixed(1)
                    : "0"
                return (
                  <div
                    key={s.seller}
                    style={{
                      minWidth: 650,
                      display: "grid",
                      gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1.5fr",
                      padding: "12px 16px",
                      borderTop: "1px solid var(--line)",
                      gap: 12,
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--ink)", display: "block" }}>
                        {s.seller}
                      </strong>
                      <small style={{ color: "var(--muted)" }}>
                        Bagi hasil supplier: {pct}%
                      </small>
                    </div>
                    <span style={{ color: "var(--slate)", fontSize: 12 }}>
                      {s.productsList}
                    </span>
                    <span>{s.qty} unit</span>
                    <span style={{ color: "var(--slate)" }}>
                      {rupiah(s.omzet)}
                    </span>
                    <strong style={{ color: "var(--amber)" }}>
                      {rupiah(s.sellerShare)}
                    </strong>
                  </div>
                )
              })}
              {bagianPerPemasok.length === 0 && (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    color: "var(--slate)",
                  }}
                >
                  Belum ada data pemasok pada periode ini.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* DETAIL HALAMAN 4: TOTAL BAGIAN EASTVILLE */}
      {activeTab === "eastville" && (
        <section className="panel" style={{ padding: 20 }}>
          <PageTitle
            eyebrow="Penjualan Produk"
            title="Detail Total Bagian Eastville"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginTop: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Total Bagian Toko
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginTop: 4,
                }}
              >
                {rupiah(totalEastville)}
              </div>
              <small style={{ color: "var(--slate)" }}>
                Laba kotor barbershop
              </small>
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Margin Toko dari Omzet
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#15803d",
                  marginTop: 4,
                }}
              >
                {totalOmzet > 0
                  ? ((totalEastville / totalOmzet) * 100).toFixed(1)
                  : 0}
                %
              </div>
              <small style={{ color: "var(--slate)" }}>
                Setelah komisi kapster &amp; pemasok
              </small>
            </div>
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--paper)",
              }}
            >
              <small
                style={{
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Total Omzet Penjualan
              </small>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginTop: 4,
                }}
              >
                {rupiah(totalOmzet)}
              </div>
              <small style={{ color: "var(--slate)" }}>
                Basis perhitungan bagi hasil
              </small>
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <div
                style={{
                  minWidth: 700,
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1.3fr 1.3fr 1.3fr 1.3fr",
                  padding: "10px 16px",
                  background: "var(--bone)",
                  color: "var(--slate)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  gap: 12,
                }}
              >
                <span>Nama Produk</span>
                <span>Unit</span>
                <span>Omzet</span>
                <span>Porsi Kapster</span>
                <span>Porsi Pemasok</span>
                <span>Bersih Eastville</span>
              </div>
              {bagianEastvillePerProduk.map((item) => {
                const pct =
                  item.omzet > 0
                    ? ((item.eastvilleShare / item.omzet) * 100).toFixed(1)
                    : "0"
                return (
                  <div
                    key={item.product}
                    style={{
                      minWidth: 700,
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1.3fr 1.3fr 1.3fr 1.3fr",
                      padding: "12px 16px",
                      borderTop: "1px solid var(--line)",
                      gap: 12,
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--ink)", display: "block" }}>
                        {item.product}
                      </strong>
                      <small style={{ color: "var(--muted)" }}>
                        Margin: {pct}%
                      </small>
                    </div>
                    <span>{item.qty} unit</span>
                    <span style={{ color: "var(--slate)" }}>
                      {rupiah(item.omzet)}
                    </span>
                    <span style={{ color: "var(--brass-dark)" }}>
                      - {rupiah(item.barberShare)}
                    </span>
                    <span style={{ color: "var(--amber)" }}>
                      - {rupiah(item.sellerShare)}
                    </span>
                    <strong style={{ color: "var(--ink)" }}>
                      + {rupiah(item.eastvilleShare)}
                    </strong>
                  </div>
                )
              })}
              {bagianEastvillePerProduk.length === 0 && (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    color: "var(--slate)",
                  }}
                >
                  Belum ada data bagi hasil produk pada periode ini.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "ringkasan" && (
        <>
          <section className="panel distribution">
            <div>
              <PageTitle
                eyebrow="Pembagian tiga pihak"
                title="Distribusi hasil penjualan"
              />
              <div className="legend">
                <span>
                  <i className="sage-dot" />
                  Kapster{" "}
                  {totalOmzet > 0
                    ? ((totalBarber / totalOmzet) * 100).toFixed(1)
                    : 0}
                  %
                </span>
                <span>
                  <i className="brass-dot" />
                  Pemasok{" "}
                  {totalOmzet > 0
                    ? ((totalSeller / totalOmzet) * 100).toFixed(1)
                    : 0}
                  %
                </span>
                <span>
                  <i className="dark-dot" />
                  Eastville{" "}
                  {totalOmzet > 0
                    ? ((totalEastville / totalOmzet) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
            <div className="donut">
              <span>
                <small>Total dibagi</small>
                <strong>{rupiah(totalOmzet)}</strong>
              </span>
            </div>
            <div className="success-banner">
              <Icon name="check" />
              <span>
                <strong>Hanya penjualan aktif</strong>
                <small>Penjualan batal tidak dihitung</small>
              </span>
            </div>
          </section>
          <div className="product-detail-grid">
            <ProductDetail
              rows={live ? ringkas((tx) => tx.product) : undefined}
            />
            <CompactDetail
              title="Per kapster"
              icon="user"
              rows={
                live
                  ? ringkas((tx) => tx.barber)
                  : [
                      ["Seva", "44 unit", "Rp 520.000"],
                      ["Tata", "36 unit", "Rp 420.000"],
                    ]
              }
            />
            <CompactDetail
              title="Per pemasok"
              icon="home"
              rows={
                live
                  ? ringkas((tx) => tx.seller)
                  : [
                      ["HAIRPRO Official", "118 unit", "Rp 5.840.000"],
                      ["Mitra Grooming", "29 unit", "Rp 1.160.000"],
                    ]
              }
            />
          </div>
        </>
      )}
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
