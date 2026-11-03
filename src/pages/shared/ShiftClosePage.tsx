import { useCallback, useEffect, useState } from "react"
import { apiTutupKasir, getToken, RekapShift, TutupKasirRow } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, Kpi, PageTitle, rupiah } from "../../components/common/UI"
import { AppUser } from "../../types"

function selisihTeks(n: number) {
  if (n === 0) return "Pas"
  return n > 0 ? `Lebih ${rupiah(n)}` : `Kurang ${rupiah(-n)}`
}

export function ShiftClosePage({ currentUser }: { currentUser?: AppUser } = {}) {
  const adalahKasir = currentUser?.role === "Kasir"
  const punyaToken = Boolean(getToken())
  const [rekap, setRekap] = useState<RekapShift | null>(null)
  const [riwayat, setRiwayat] = useState<TutupKasirRow[] | null>(null)
  const [error, setError] = useState("")
  const [fisik, setFisik] = useState("")
  const [catatan, setCatatan] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [hasil, setHasil] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  const muat = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!getToken()) return
    let batal = false
    setError("")
    Promise.all([adalahKasir ? apiTutupKasir.rekap() : Promise.resolve(null), apiTutupKasir.list()])
      .then(([r, list]) => {
        if (batal) return
        setRekap(r)
        setRiwayat(list)
      })
      .catch((e) => !batal && setError(e instanceof Error ? e.message : "Gagal memuat data."))
    return () => {
      batal = true
    }
  }, [adalahKasir, reloadKey])

  if (!punyaToken) {
    return (
      <div className="content">
        <DemoNotice live={false} error="belum login ke server (token tidak ada)" />
        <p>Tutup Kasir hanya tersedia setelah login ke server.</p>
      </div>
    )
  }

  if (error && !riwayat) {
    return (
      <div className="content">
        <p>Tutup Kasir gagal dimuat: {error}</p>
        <Button className="primary-button" onClick={muat}>
          Coba lagi
        </Button>
      </div>
    )
  }

  if (!riwayat) {
    return (
      <div className="content">
        <p>Memuat tutup kasir...</p>
      </div>
    )
  }

  const fisikAngka = Number(fisik.replace(/\D/g, ""))
  const selisih = rekap && fisik !== "" ? fisikAngka - rekap.tunaiSistem : null

  async function simpan() {
    setFormError("")
    setHasil("")
    if (fisik === "") return setFormError("Isi jumlah uang tunai yang ada di laci.")
    if (selisih !== 0 && !catatan.trim()) return setFormError("Uang tidak sama dengan catatan sistem. Isi catatan penyebab selisih.")
    if (!window.confirm(`Tutup kasir sekarang?\nTunai di laci ${rupiah(fisikAngka)} (${selisihTeks(selisih ?? 0)}).`)) return
    setSaving(true)
    try {
      const r = await apiTutupKasir.tutup(fisikAngka, catatan.trim())
      setHasil(`Kasir ditutup (${r.id}). Selisih: ${selisihTeks(r.selisih)}.`)
      setFisik("")
      setCatatan("")
      muat()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Gagal menutup kasir.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="content">
      <PageTitle
        eyebrow={adalahKasir ? "Akhir shift" : "Pemeriksaan uang kasir"}
        title="Tutup Kasir"
        action={
          <Button className="secondary-button" onClick={muat}>
            <Icon name="history" /> Muat ulang
          </Button>
        }
      />

      {adalahKasir && rekap && (
        <>
          <div className="kpi-grid">
            <Kpi icon="receipt" label="Nota sejak" tone="sage" value={`${rekap.jumlahTrx} nota`} detail={`Mulai pukul ${rekap.dariJam} WIB`} />
            <Kpi icon="cash" label="Penjualan" tone="brass" value={rupiah(rekap.penjualan)} detail={`Diskon ${rupiah(rekap.diskon)}`} />
            <Kpi icon="wallet" label="Tunai seharusnya di laci" tone="dark" value={rupiah(rekap.tunaiSistem)} detail="Setelah kembalian" />
            <Kpi icon="qris" label="QRIS masuk" tone="amber" value={rupiah(rekap.qrisSistem)} detail="Cek di aplikasi merchant" />
          </div>

          <section className="panel" style={{ padding: 18, marginTop: 16, maxWidth: 560 }}>
            <p className="eyebrow">Hitung uang di laci</p>
            {rekap.jumlahTrx === 0 ? (
              <p style={{ color: "var(--slate)" }}>Belum ada transaksi baru sejak tutup kasir terakhir.</p>
            ) : (
              <>
                <label style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  <span>Jumlah uang tunai di laci sekarang</span>
                  <div className="input-shell">
                    <b>Rp</b>
                    <input
                      inputMode="numeric"
                      placeholder="Hitung semua uang tunai"
                      value={fisik}
                      onChange={(e) => setFisik(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </label>
                {selisih !== null && (
                  <p style={{ margin: "10px 0", color: selisih === 0 ? "var(--sage)" : "#b45309", fontWeight: 600 }}>
                    {selisih === 0 ? "Uang pas dengan catatan sistem." : `Selisih: ${selisihTeks(selisih)}`}
                  </p>
                )}
                {selisih !== null && selisih !== 0 && (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Catatan penyebab selisih (wajib)</span>
                    <div className="input-shell">
                      <Icon name="pencil" />
                      <input placeholder="Mis. kembalian kurang, uang receh tertukar" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
                    </div>
                  </label>
                )}
                {formError && <p role="alert" style={{ color: "#dc2626", fontSize: 13 }}>{formError}</p>}
                <Button className="primary-button" disabled={saving} onClick={simpan}>
                  {saving ? "Menyimpan..." : "Tutup Kasir"}
                </Button>
              </>
            )}
            {hasil && <p style={{ color: "var(--sage)", marginTop: 10 }}>{hasil}</p>}
          </section>
        </>
      )}

      <section className="panel" style={{ padding: 18, marginTop: 16 }}>
        <PageTitle eyebrow="Catatan sebelumnya" title={adalahKasir ? "Riwayat tutup kasir saya" : "Riwayat tutup kasir semua kasir"} />
        {riwayat.length === 0 ? (
          <p style={{ color: "var(--slate)" }}>Belum ada tutup kasir.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--slate)" }}>
                  <th style={{ padding: "6px 8px" }}>Waktu</th>
                  {!adalahKasir && <th style={{ padding: "6px 8px" }}>Kasir</th>}
                  <th style={{ padding: "6px 8px" }}>Nota</th>
                  <th style={{ padding: "6px 8px" }}>Penjualan</th>
                  <th style={{ padding: "6px 8px" }}>Tunai sistem</th>
                  <th style={{ padding: "6px 8px" }}>Uang di laci</th>
                  <th style={{ padding: "6px 8px" }}>Selisih</th>
                  <th style={{ padding: "6px 8px" }}>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px" }}>{r.tanggal}<br /><small>{r.dariJam}–{r.sampaiJam}</small></td>
                    {!adalahKasir && <td style={{ padding: "8px" }}>{r.kasir}</td>}
                    <td style={{ padding: "8px" }}>{r.jumlahTrx}</td>
                    <td style={{ padding: "8px" }}>{rupiah(r.penjualan)}</td>
                    <td style={{ padding: "8px" }}>{rupiah(r.tunaiSistem)}</td>
                    <td style={{ padding: "8px" }}>{rupiah(r.uangFisik)}</td>
                    <td style={{ padding: "8px", color: r.selisih === 0 ? "var(--sage)" : "#b45309", fontWeight: 600 }}>{selisihTeks(r.selisih)}</td>
                    <td style={{ padding: "8px" }}>{r.catatan || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default ShiftClosePage
