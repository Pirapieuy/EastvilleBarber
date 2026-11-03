import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, rupiah } from "../../components/common/UI"
import { apiGaji, apiKapster, AktivitasKapster, getToken, HitungGajiResult } from "../../api"

const isoHariIni = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function MySalaryPage() {
  const punyaToken = Boolean(getToken())
  const [data, setData] = useState<HitungGajiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [tanggal, setTanggal] = useState(isoHariIni)
  const [layanan, setLayanan] = useState<AktivitasKapster[] | null>(null)
  const [layananError, setLayananError] = useState("")

  function fetchData() {
    if (!getToken()) return
    setLoading(true)
    setError("")
    apiGaji
      .hitung()
      .then((res) => setData(res))
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat data gaji."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rincian nota layanan yang dikerjakan pada tanggal terpilih (dari aktivitas-kapster)
  useEffect(() => {
    if (!getToken()) return
    let batal = false
    setLayanan(null)
    setLayananError("")
    apiKapster
      .aktivitas(tanggal)
      .then((rows) => !batal && setLayanan(rows.filter((r) => r.type === "Layanan")))
      .catch((e) => !batal && setLayananError(e instanceof Error ? e.message : "Gagal memuat rincian layanan."))
    return () => {
      batal = true
    }
  }, [tanggal])

  if (!punyaToken) {
    return (
      <div className="mobile-content">
        <PageTitle eyebrow="Pendapatan pribadi" title="Gaji Saya" />
        <p>Silakan login untuk melihat gaji dan komisi Anda.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mobile-content">
        <PageTitle eyebrow="Pendapatan pribadi" title="Gaji Saya" />
        {error ? (
          <>
            <p>Data gaji gagal dimuat: {error}</p>
            <Button className="primary-button" onClick={fetchData}>
              Coba lagi
            </Button>
          </>
        ) : (
          <p>Memuat data gaji...</p>
        )}
      </div>
    )
  }

  const totalKomisiLayanan = (layanan ?? []).reduce((n, r) => n + r.comm, 0)

  return (
    <div className="mobile-content">
      <PageTitle
        eyebrow="Pendapatan pribadi"
        title="Gaji Saya"
        action={
          <Button className="secondary-button" onClick={fetchData} disabled={loading}>
            <Icon name="history" /> {loading ? "Memperbarui..." : "Refresh"}
          </Button>
        }
      />

      <article className="my-salary-hero">
        <span>Komisi periode berjalan</span>
        <strong>{rupiah(data.totalKomisi)}</strong>
        <p>{data.transaksiSelesai} transaksi selesai</p>
        <i>
          <b />
        </i>
        <small>{loading ? "Memperbarui dari server..." : "Dihitung live dari transaksi selesai"}</small>
      </article>

      <section className="panel salary-breakdown">
        <PageTitle eyebrow="Perincian pendapatan" title="Rincian gaji & kasbon" />
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

      <section className="panel customer-list" style={{ marginTop: 16 }}>
        <PageTitle
          eyebrow="Rincian nota layanan"
          title="Layanan yang Anda kerjakan"
          action={
            <input
              aria-label="Tanggal"
              max={isoHariIni()}
              type="date"
              value={tanggal}
              onChange={(e) => e.target.value && setTanggal(e.target.value)}
            />
          }
        />
        {layananError ? (
          <p>{layananError}</p>
        ) : layanan === null ? (
          <p>Memuat rincian layanan...</p>
        ) : layanan.length === 0 ? (
          <p style={{ color: "var(--slate)" }}>Belum ada layanan yang Anda kerjakan pada tanggal ini.</p>
        ) : (
          <>
            {layanan.map((r, idx) => (
              <div key={`${r.trx}-${idx}`}>
                <span>{r.time} WIB</span>
                <i>
                  <Icon name="cashier" />
                </i>
                <strong>
                  {r.item}
                  <small style={{ display: "block", color: "var(--slate)" }}>
                    {r.trx}
                    {r.lembur ? " · Lembur" : ""}
                  </small>
                </strong>
                <b>{rupiah(r.comm)}</b>
              </div>
            ))}
            <footer>
              <span>Total komisi layanan ({layanan.length} pengerjaan)</span>
              <strong>{rupiah(totalKomisiLayanan)}</strong>
            </footer>
          </>
        )}
      </section>

      <div className="privacy" style={{ marginTop: 20 }}>
        <Icon name="lock" /> Hanya data komisi dan transaksi milik akun Anda yang ditampilkan.
      </div>
    </div>
  )
}

export default MySalaryPage
