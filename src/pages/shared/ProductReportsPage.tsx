import { useEffect, useMemo, useState } from "react"
import { apiLaporan, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser, IconName, Role } from "../../types"
import { eksporExcel, eksporPdf, TabelEkspor } from "../../components/common/exportTable"
import { WhatsAppDialog } from "./ReportsPage"

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
const isoLokal = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/** Rentang yyyy-MM-dd: satu hari, satu pekan (Senin-Minggu) yang memuat tanggal, atau satu bulan. */
function rentangProduk(mode: "Harian" | "Mingguan" | "Bulanan", tanggal: string, bulan: string) {
  if (mode === "Harian") return { dari: tanggal, sampai: tanggal }
  if (mode === "Mingguan") {
    const d = new Date(`${tanggal}T00:00:00`)
    const mundur = (d.getDay() + 6) % 7
    const senin = new Date(d.getFullYear(), d.getMonth(), d.getDate() - mundur)
    const minggu = new Date(senin.getFullYear(), senin.getMonth(), senin.getDate() + 6)
    return { dari: isoLokal(senin), sampai: isoLokal(minggu) }
  }
  const [y, m] = bulan.split("-").map(Number)
  return { dari: `${bulan}-01`, sampai: `${bulan}-${pad2(new Date(y, m, 0).getDate())}` }
}

export function ProductReportsPage({
  currentUser,
  role: forcedRole,
}: {
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
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Lunas" | "Batal">("Semua")
  const [activeTab, setActiveTab] = useState<"transaksi" | "koreksi" | "ringkasan">("transaksi")
  const [txList, setTxList] = useState<ProductTransactionRecord[]>(INITIAL_PRODUCT_TRANSACTIONS)
  const [mode, setMode] = useState<"Harian" | "Mingguan" | "Bulanan">("Bulanan")
  const [tanggal, setTanggal] = useState(() => isoLokal(new Date()))
  const [bulan, setBulan] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const isKapsterView = role === "Kapster" || forcedRole === "Kapster" || currentUser?.role === "Kapster"

  const rentang = rentangProduk(mode, tanggal, bulan)

  // Tampilan Owner/Manajer memakai data backend; tampilan Kapster (komisi pribadi) belum tersambung.
  useEffect(() => {
    if (isKapsterView) return
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    let batal = false
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
        if (!batal) setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
    return () => {
      batal = true
    }
  }, [rentang.dari, rentang.sampai, isKapsterView])

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
        (statusFilter === "Semua" || tx.status === statusFilter) &&
        (!q || [tx.id, tx.product, tx.barber, tx.seller].some((v) => v.toLowerCase().includes(q))),
    )
  }, [txList, statusFilter, cari])

  const tabelEkspor = (): TabelEkspor => ({
    berkas: `laporan-produk-${rentang.dari}_${rentang.sampai}`,
    judul: "Laporan Produk",
    keterangan: `Periode ${rentang.dari} s/d ${rentang.sampai} · transaksi lunas ${validTransactions.length} · batal tidak dihitung dalam total`,
    kolom: ["Nota", "Waktu", "Produk", "Qty", "Kapster", "Pemasok", "Total Omzet", "Bagian Kapster", "Bagian Pemasok", "Bagian Eastville", "Status"],
    baris: txList.map((tx) => [tx.id, tx.time, tx.product, tx.qty, tx.barber, tx.seller, tx.totalOmzet, tx.barberShare, tx.sellerShare, tx.eastvilleShare, tx.status]),
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

  if (isKapsterView) {
    return (
      <div className="mobile-content">
        {!forcedRole && (
          <div className="role-preview">
            <span>Pratinjau peran</span>
            <select
              onChange={(e) => setRole(e.target.value as "Owner" | "Kapster")}
              value={role}
            >
              <option>Owner</option>
              <option>Kapster</option>
            </select>
          </div>
        )}
        <div className="segmented full">
          <Button>Harian</Button>
          <Button>Mingguan</Button>
          <Button className="active">Bulanan</Button>
        </div>
        <article className="my-salary-hero">
          <span>Komisi produk saya</span>
          <strong>Rp 520.000</strong>
          <p>44 unit · 18 transaksi</p>
        </article>
        <section className="panel customer-list">
          <PageTitle eyebrow="Penjualan pribadi" title="Komisi per produk" />
          {[
            ["Free Style Dust", 10000],
            ["Hair Paste Pomade", 20000],
            ["Water Based Pomade", 10000],
            ["Miracle Treatment", 10000],
          ].map((x) => (
            <div key={x[0]}>
              <i>
                <Icon name="product" />
              </i>
              <strong>{x[0]}</strong>
              <b>+{rupiah(Number(x[1]))}</b>
            </div>
          ))}
        </section>
        <div className="privacy">
          <Icon name="lock" /> Bagian seller dan Eastville tidak ditampilkan.
        </div>
      </div>
    )
  }

  if (Boolean(getToken()) && !live && !liveError) {
    return (
      <div className="content">
        <p>Memuat laporan produk...</p>
      </div>
    )
  }

  return (
    <div className="content">
      <DemoNotice live={live} error={liveError} />
      <div className="report-toolbar">
        <div className="segmented">
          {(["Harian", "Mingguan", "Bulanan"] as const).map((m) => (
            <Button className={mode === m ? "active" : ""} key={m} onClick={() => setMode(m)}>
              {m}
            </Button>
          ))}
        </div>
        {mode === "Bulanan" ? (
          <input type="month" value={bulan} onChange={(e) => e.target.value && setBulan(e.target.value)} />
        ) : (
          <input type="date" value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)} />
        )}
        {!forcedRole && (
          <div className="role-preview">
            <span>Peran</span>
            <select
              onChange={(e) => setRole(e.target.value as "Owner" | "Kapster")}
              value={role}
            >
              <option>Owner</option>
              <option>Kapster</option>
            </select>
          </div>
        )}
        <div>
          <Button className="secondary-button" onClick={() => eksporExcel(tabelEkspor())}>Excel</Button>
          <Button className="secondary-button" onClick={() => eksporPdf(tabelEkspor())}>PDF</Button>
          <Button className="whatsapp-button" onClick={() => setWa(true)}>
            <Icon name="whatsapp" /> WhatsApp
          </Button>
        </div>
      </div>
      <div className="kpi-grid">
        <Kpi
          icon="product"
          label="Total Omzet Produk"
          tone="sage"
          value={rupiah(totalOmzet)}
          detail={`${validTransactions.length} transaksi lunas`}
        />
        <Kpi
          icon="people"
          label="Total Komisi Capster"
          tone="brass"
          value={rupiah(totalBarber)}
          detail={`${totalOmzet > 0 ? ((totalBarber / totalOmzet) * 100).toFixed(1) : 0}% bagian capster`}
        />
        <Kpi
          icon="home"
          label="Total Bagian Pemasok"
          tone="amber"
          value={rupiah(totalSeller)}
          detail={`${totalOmzet > 0 ? ((totalSeller / totalOmzet) * 100).toFixed(1) : 0}% bagian pemasok`}
        />
        <Kpi
          icon="wallet"
          label="Total Bagian Eastville"
          tone="dark"
          value={rupiah(totalEastville)}
          detail={`${totalOmzet > 0 ? ((totalEastville / totalOmzet) * 100).toFixed(1) : 0}% sisa barbershop`}
        />
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
            <span>Detail Transaksi Produk</span>
          </Button>
          <Button
            className={activeTab === "koreksi" ? "active" : ""}
            onClick={() => setActiveTab("koreksi")}
          >
            <Icon name="history" />
            <span>Riwayat Pembatalan</span>
            {voidCount > 0 && (
              <span className="tab-count-badge">{voidCount}</span>
            )}
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
              title="Pembagian Komisi Otomatis Per Transaksi"
            />
            <div className="search">
              <Icon name="search" />
              <input
                placeholder="Cari nota, produk, kapster..."
                value={cari}
                onChange={(e) => setCari(e.target.value)}
              />
            </div>
            <div className="tx-filter-group">
              <span className="filter-label">Filter Status:</span>
              <div className="segmented">
                {(["Semua", "Lunas", "Batal"] as const).map((s) => (
                  <Button
                    key={s}
                    className={statusFilter === s ? "active" : ""}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="product-tx-table-wrap">
            <div className="product-tx-head">
              <span>Nota & Waktu</span>
              <span>Produk</span>
              <span>Capster</span>
              <span>Pemasok</span>
              <span>Total Omzet</span>
              <span>Bagian Capster</span>
              <span>Bagian Pemasok</span>
              <span>Bagian Eastville</span>
              <span>Status</span>
            </div>
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className={`product-tx-row ${tx.status === "Batal" ? "voided" : ""}`}
              >
                <span className="tx-meta-col">
                  <strong>{tx.id}</strong>
                  <small>{tx.time}</small>
                </span>
                <span className="tx-product-col">
                  <strong>{tx.product}</strong>
                </span>
                <span>{tx.barber}</span>
                <span>{tx.seller}</span>
                <strong className={tx.status === "Batal" ? "strike-text" : ""}>
                  {rupiah(tx.totalOmzet)}
                </strong>
                <span
                  className={`share-cell barber-cell ${tx.status === "Batal" ? "strike-text" : ""}`}
                >
                  {rupiah(tx.barberShare)}
                </span>
                <span
                  className={`share-cell seller-cell ${tx.status === "Batal" ? "strike-text" : ""}`}
                >
                  {rupiah(tx.sellerShare)}
                </span>
                <span
                  className={`share-cell eastville-cell ${tx.status === "Batal" ? "strike-text" : ""}`}
                >
                  {rupiah(tx.eastvilleShare)}
                </span>
                <span>
                  <i
                    className={`chip ${tx.status === "Lunas" ? "lunas" : "batal"}`}
                  >
                    {tx.status === "Lunas" ? "Lunas" : "Batal"}
                  </i>
                </span>
                {tx.status === "Batal" && (
                  <div className="void-reason-note">
                    <Icon name="alert" /> Dibatalkan oleh {tx.voidBy} · {tx.voidAt}:{" "}
                    {tx.voidReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "koreksi" && (
        <section className="panel correction-panel">
          <PageTitle
            eyebrow="Audit & Kontrol"
            title="Riwayat Pembatalan Transaksi Produk"
          />
          <p className="correction-desc">
            Daftar transaksi produk yang dibatalkan oleh Owner atau Manajer.
            Transaksi yang dibatalkan dipastikan tidak masuk ke dalam
            perhitungan omzet maupun komisi capster dan pemasok.
          </p>
          <div className="correction-table">
            <div className="correction-head">
              <span>Nota & Waktu</span>
              <span>Produk</span>
              <span>Nilai Dibatalkan</span>
              <span>Diotorisasi Oleh</span>
              <span>Alasan Pembatalan</span>
              <span>Status</span>
            </div>
            {txList
              .filter((tx) => tx.status === "Batal")
              .map((tx) => (
                <div key={tx.id} className="correction-row">
                  <span className="tx-meta-col">
                    <strong>{tx.id}</strong>
                    <small>{tx.voidAt || tx.time}</small>
                  </span>
                  <span className="tx-product-col">
                    <strong>{tx.product}</strong>
                  </span>
                  <b className="void-amount">{rupiah(tx.totalOmzet)}</b>
                  <span className="tx-auth-col">{tx.voidBy || "Manajer"}</span>
                  <span className="void-reason-text">
                    {tx.voidReason || "Salah input"}
                  </span>
                  <span>
                    <i className="chip batal">Batal</i>
                  </span>
                </div>
              ))}
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
                  Capster{" "}
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
            <ProductDetail rows={live ? ringkas((tx) => tx.product) : undefined} />
            <CompactDetail
              title="Per kapster"
              icon="user"
              rows={live ? ringkas((tx) => tx.barber) : [
                ["Seva", "44 unit", "Rp 520.000"],
                ["Tata", "36 unit", "Rp 420.000"],
              ]}
            />
            <CompactDetail
              title="Per pemasok"
              icon="home"
              rows={live ? ringkas((tx) => tx.seller) : [
                ["HAIRPRO Official", "118 unit", "Rp 5.840.000"],
                ["Mitra Grooming", "29 unit", "Rp 1.160.000"],
              ]}
            />
          </div>
        </>
      )}
      {wa && (
        <WhatsAppDialog
          onClose={() => setWa(false)}
          title="Laporan Produk"
          text={`Periode: ${rentang.dari === rentang.sampai ? rentang.dari : `${rentang.dari} s/d ${rentang.sampai}`}\nTotal Omzet produk: ${rupiah(totalOmzet)}\nTotal Komisi capster: ${rupiah(totalBarber)}\nTotal Bagian pemasok: ${rupiah(totalSeller)}\nTotal Bagian Eastville: ${rupiah(totalEastville)}`}
        />
      )}
    </div>
  )
}

export default ProductReportsPage
