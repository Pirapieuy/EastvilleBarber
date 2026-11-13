import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  LoadingState,
  PageTitle,
  rupiah,
} from "../../components/common/UI"
import { apiGaji, getToken, HitungGajiResult } from "../../api"

export function MySalaryPage() {
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
        <PageTitle eyebrow="Pendapatan pribadi" title="Gaji Saya" />
        <p>Data gaji gagal dimuat: {error}</p>
        <Button className="primary-button" onClick={fetchData}>
          Coba lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="mobile-content my-salary-page">
      <PageTitle
        eyebrow="Pendapatan pribadi"
        title="Gaji Saya"
        action={
          <Button
            className="secondary-button"
            onClick={fetchData}
            disabled={loading}
          >
            <Icon name="history" /> {loading ? "Memperbarui..." : "Refresh"}
          </Button>
        }
      />

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

    </div>
  )
}

export default MySalaryPage
