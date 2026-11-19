import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  CalendarPicker,
  LoadingState,
  PageTitle,
  rupiah, ErrorState } from "../../components/common/UI"
import {
  AktivitasKapster,
  apiGaji,
  apiKapster,
  getToken,
  HitungGajiResult,
} from "../../api"
import { tanggalIsoLokal } from "../../utils/tanggal"

const demoAktivitas: AktivitasKapster[] = [
  {
    item: "Haircut Classic",
    qty: 1,
    type: "Layanan",
    time: "10.15",
    fee: 50000,
    comm: 20000,
    trx: "TRX-001",
  },
  {
    item: "Haircut + Wash + Tonic",
    qty: 1,
    type: "Layanan",
    time: "11.30",
    fee: 70000,
    comm: 28000,
    trx: "TRX-002",
  },
  {
    item: "Free Style Dust",
    qty: 1,
    type: "Produk",
    time: "14.05",
    fee: 80000,
    comm: 10000,
    trx: "TRX-003",
  },
]

export function MySalaryPage() {
  const [infoTerbuka, setInfoTerbuka] = useState(false)
  const punyaToken = Boolean(getToken())
  const [data, setData] = useState<HitungGajiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [tanggalAktivitas, setTanggalAktivitas] = useState(() =>
    tanggalIsoLokal(new Date()),
  )
  const [aktivitas, setAktivitas] = useState<AktivitasKapster[]>(
    punyaToken ? [] : demoAktivitas,
  )
  const [loadingAktivitas, setLoadingAktivitas] = useState(false)

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

  function fetchAktivitas(tgl: string) {
    if (!getToken()) return
    setLoadingAktivitas(true)
    apiKapster
      .aktivitas(tgl)
      .then((rows) => setAktivitas(rows))
      .catch((e) => console.error("Gagal memuat aktivitas kapster:", e))
      .finally(() => setLoadingAktivitas(false))
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchAktivitas(tanggalAktivitas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggalAktivitas])

  const totalKomisiHariIni = aktivitas.reduce((s, r) => s + (r.comm || 0), 0)
  const totalLayananHariIni = aktivitas.filter((r) => r.type === "Layanan").length
  const totalProdukHariIni = aktivitas.filter((r) => r.type === "Produk").length

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
                  <span className="product-commission-info-popover" role="status">
                    Hanya data komisi dan transaksi milik akun Anda yang ditampilkan.
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
        <section className="panel customer-list" style={{ marginTop: 16 }}>
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

      <section className="panel kapster-activity-panel" style={{ marginTop: 16, padding: 15 }}>
        <PageTitle
          eyebrow="Aktivitas pribadi"
          title="Rincian Transaksi Layanan"
          action={
            <div style={{ maxWidth: 170 }}>
              <CalendarPicker
                value={tanggalAktivitas}
                onChange={setTanggalAktivitas}
                align="right"
              />
            </div>
          }
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
            padding: "8px 12px",
            background: "rgb(20 17 15 / 3%)",
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          <span style={{ color: "var(--slate)" }}>
            {totalLayananHariIni} layanan · {totalProdukHariIni} produk
          </span>
          <strong style={{ color: "var(--sage)" }}>
            Komisi: +{rupiah(totalKomisiHariIni)}
          </strong>
        </div>

        {loadingAktivitas ? (
          <LoadingState message="Memuat rincian aktivitas..." />
        ) : aktivitas.length === 0 ? (
          <p
            style={{
              padding: "24px 0",
              textAlign: "center",
              color: "var(--slate)",
              fontSize: 13,
            }}
          >
            Belum ada pengerjaan layanan/produk pada tanggal ini.
          </p>
        ) : (
          <div className="recent-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {aktivitas.map((row, idx) => (
              <div key={idx} className="recent-row">
                <div className="recent-icon">
                  <Icon name={row.type === "Produk" ? "product" : "cashier"} />
                </div>
                <div className="recent-info">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong>
                      {row.item}
                      {row.qty > 1 ? ` (${row.qty}x)` : ""}
                    </strong>
                    {row.lembur && (
                      <span
                        className="chip"
                        style={{
                          fontSize: 9,
                          padding: "1px 5px",
                          background: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fde68a",
                        }}
                      >
                        Lembur
                      </span>
                    )}
                  </div>
                  <small>
                    {row.time} WIB {row.trx ? `· Nota ${row.trx}` : ""} · Tarif {rupiah(row.fee)}
                  </small>
                </div>
                <div className="recent-amount">
                  <small className="comm-label">Komisi</small>
                  <strong>+{rupiah(row.comm)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default MySalaryPage
