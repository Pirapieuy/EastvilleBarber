import { FormEvent, useEffect, useState } from "react"
import { apiKasbon, apiKasir, getToken, KasbonRow } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { SearchSelect } from "../../components/common/SearchSelect"
import {
  Button,
  LoadingState,
  rupiah,
} from "../../components/common/UI"

const STATUS_LABEL: Record<KasbonRow["status"], string> = {
  Menunggu: "Menunggu persetujuan",
  Aktif: "Disetujui",
  Lunas: "Lunas",
  Ditolak: "Ditolak",
}

const STATUS_CHIP: Record<KasbonRow["status"], string> = {
  Menunggu: "pending",
  Aktif: "aktif",
  Lunas: "lunas",
  Ditolak: "batal",
}

// Kasir mencatat pengajuan kasbon atas nama kapster; kasbon baru berlaku setelah
// Owner/Manajer menyetujuinya di halaman Gaji & Kasbon.
export function KasbonKapster() {
  const [kapster, setKapster] = useState<{ id: string; nama: string }[]>([])
  const [daftar, setDaftar] = useState<KasbonRow[]>([])
  const [kapsterId, setKapsterId] = useState("")
  const [jumlah, setJumlah] = useState("")
  const [catatan, setCatatan] = useState("")
  const [loading, setLoading] = useState(() => Boolean(getToken()))
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const jumlahNum = Number(jumlah.replace(/\D/g, "")) || 0
  const daftarKapster = daftar.filter((k) => k.userId === kapsterId)
  const bisaKirim = Boolean(kapsterId) && jumlahNum > 0 && !saving

  async function muat() {
    if (!getToken()) {
      setLoadError("belum login ke server (token tidak ada)")
      setLoading(false)
      return
    }
    try {
      const [kap, list] = await Promise.all([
        apiKasir.kapster(),
        apiKasbon.list(),
      ])
      setKapster(kap)
      setDaftar(list)
      setLoadError("")
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "gagal memuat data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void muat()
  }, [])

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (!bisaKirim) return
    const target = kapster.find((k) => k.id === kapsterId)
    if (!target) return
    setError("")
    setSuccess("")
    setSaving(true)
    try {
      await apiKasbon.create({
        userId: target.id,
        nama: target.nama,
        role: "Kapster",
        jumlah: jumlahNum,
        catatan: catatan.trim(),
      })
      setSuccess(
        `Pengajuan kasbon ${target.nama} sebesar ${rupiah(jumlahNum)} tercatat. Menunggu persetujuan Owner atau Manajer.`,
      )
      setJumlah("")
      setCatatan("")
      await muat()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat kasbon.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="content kasbon-kapster-page">
        <LoadingState message="Memuat data kasbon…" />
      </div>
    )
  }

  return (
    <div className="content kasbon-kapster-page">
      <DemoNotice live={!loadError} error={loadError} />

      <form className="panel form-panel" onSubmit={kirim}>
        <h3>Ajukan kasbon</h3>
        <p className="kasbon-kapster-hint">
          Catat permintaan kasbon kapster di sini. Kasbon baru dipotong dari
          gaji setelah disetujui Owner atau Manajer.
        </p>
        <div className="form-grid manual-info-grid kasbon-kapster-grid">
          <div className="form-grid-field">
            <span>
              Kapster <b className="req-mark">*</b>
            </span>
            <SearchSelect
              aria-label="Kapster"
              onChange={(e) => setKapsterId(e.target.value)}
              value={kapsterId}
            >
              <option value="">Pilih kapster</option>
              {kapster.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </SearchSelect>
          </div>
          <label>
            <span>
              Jumlah kasbon <b className="req-mark">*</b>
            </span>
            <div className="input-shell">
              <b>Rp</b>
              <input
                inputMode="numeric"
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="0"
                value={jumlah}
              />
            </div>
          </label>
          <label className="kasbon-kapster-note">
            <span>Keperluan (opsional)</span>
            <input
              maxLength={120}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: keperluan keluarga"
              value={catatan}
            />
          </label>
        </div>
        {error && (
          <p className="absensi-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="kasbon-kapster-success" role="status">
            {success}
          </p>
        )}
        <div className="kasbon-kapster-actions">
          <Button className="primary-button" disabled={!bisaKirim} type="submit">
            {saving ? "Menyimpan…" : "Ajukan kasbon"}
          </Button>
        </div>
      </form>

      {kapsterId && (
        <section className="panel form-panel kasbon-kapster-history">
          <div className="section-title">
            <h3>Pengajuan tim</h3>
            <span className="nota-count">{daftarKapster.length} pengajuan</span>
          </div>
          {daftarKapster.length === 0 ? (
            <p className="history-empty">Belum ada pengajuan untuk kapster ini.</p>
          ) : (
            <div className="kasbon-kapster-list">
              {daftarKapster.map((k) => (
                <article className="kasbon-kapster-row" key={k.id}>
                  <div className="kasbon-kapster-info">
                    <strong>{k.nama}</strong>
                    <small>
                      {k.tanggal}
                      {k.catatan ? ` · ${k.catatan}` : ""}
                    </small>
                  </div>
                  <strong className="kasbon-kapster-amount">
                    {rupiah(k.jumlah)}
                  </strong>
                  <i className={`chip ${STATUS_CHIP[k.status] ?? ""}`}>
                    {STATUS_LABEL[k.status] ?? k.status}
                  </i>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default KasbonKapster
