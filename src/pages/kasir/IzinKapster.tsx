import { FormEvent, useEffect, useMemo, useState } from "react"
import { AbsensiRow, apiAbsensi, apiAbsensiKapster, apiKasir, getToken } from "../../api"
import { CalendarPicker } from "../../components/common/CalendarPicker"
import { DemoNotice } from "../../components/common/DemoNotice"
import { SearchSelect } from "../../components/common/SearchSelect"
import { Button, LoadingState } from "../../components/common/UI"
import { formatTanggal, tanggalIsoLokal } from "../../utils/tanggal"

const JENIS = ["Izin", "Sakit", "Cuti"] as const
type Jenis = (typeof JENIS)[number]

const HARI = new Intl.DateTimeFormat("id-ID", { weekday: "long" })
const BULAN_TAHUN = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
})

const dariIso = (iso: string) => new Date(`${iso}T12:00:00`)

// Kasir mencatat izin/sakit/cuti kapster. Berlaku untuk besok atau setelahnya (H-1),
// dan tidak terkait absen foto, jadi bisa dicatat kapan saja.
export function IzinKapster() {
  const besokIso = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return tanggalIsoLokal(d)
  }, [])
  const [kapster, setKapster] = useState<{ id: string; nama: string }[]>([])
  const [daftar, setDaftar] = useState<AbsensiRow[]>([])
  const [kapsterId, setKapsterId] = useState("")
  const [tanggal, setTanggal] = useState(besokIso)
  const [jenis, setJenis] = useState<Jenis>("Izin")
  const [catatan, setCatatan] = useState("")
  const [loading, setLoading] = useState(() => Boolean(getToken()))
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const bisaKirim = Boolean(kapsterId) && catatan.trim() !== "" && !saving
  const tgl = dariIso(tanggal)
  const selisih = Math.round(
    (tgl.getTime() - dariIso(besokIso).getTime()) / 86400000,
  )

  async function muat() {
    if (!getToken()) {
      setLoadError("belum login ke server (token tidak ada)")
      setLoading(false)
      return
    }
    try {
      const [kap, rows] = await Promise.all([
        apiKasir.kapster(),
        apiAbsensi.list(),
      ])
      setKapster(kap)
      setDaftar(rows.filter((r) => r.status && r.status !== "Hadir"))
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
      await apiAbsensiKapster.catatAbsensiKapster({
        targetUserId: target.id,
        tanggal,
        status: jenis,
        fotoUrl: "",
        catatan: catatan.trim(),
      })
      setSuccess(
        `${jenis} ${target.nama} untuk ${formatTanggal(tanggal)} tercatat.`,
      )
      setKapsterId("")
      setCatatan("")
      await muat()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencatat izin.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="content izin-kapster-page">
        <LoadingState message="Memuat data izin…" />
      </div>
    )
  }

  return (
    <div className="content izin-kapster-page">
      <DemoNotice live={!loadError} error={loadError} />

      <form className="panel form-panel" onSubmit={kirim}>
        <h3>Catat izin kapster</h3>
        <p className="kasbon-kapster-hint">
          Izin, sakit, dan cuti dicatat paling cepat untuk besok. Tidak perlu
          foto dan bisa dicatat kapan saja.
        </p>

        <div className="izin-date-hero">
          <b className="izin-date-day">{tgl.getDate()}</b>
          <div className="izin-date-meta">
            <strong>{HARI.format(tgl)}</strong>
            <span>{BULAN_TAHUN.format(tgl)}</span>
            <small>
              {selisih === 0 ? "Besok" : `${selisih + 1} hari lagi`}
            </small>
          </div>
          <div className="izin-date-picker">
            <CalendarPicker
              align="right"
              min={besokIso}
              onChange={setTanggal}
              showToday={false}
              value={tanggal}
            />
          </div>
        </div>

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
          <div className="form-grid-field">
            <span>Jenis</span>
            <div className="segmented" role="group" aria-label="Jenis izin">
              {JENIS.map((j) => (
                <Button
                  className={jenis === j ? "active" : ""}
                  key={j}
                  onClick={() => setJenis(j)}
                >
                  {j}
                </Button>
              ))}
            </div>
          </div>
          <label className="kasbon-kapster-note">
            <span>
              Catatan <b className="req-mark">*</b>
            </span>
            <input
              maxLength={120}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: acara keluarga di luar kota"
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
            {saving ? "Menyimpan…" : `Catat ${jenis}`}
          </Button>
        </div>
      </form>

      <section className="panel form-panel kasbon-kapster-history">
        <div className="section-title">
          <h3>Izin tercatat</h3>
          <span className="nota-count">{daftar.length} catatan</span>
        </div>
        {daftar.length === 0 ? (
          <p className="history-empty">Belum ada izin tercatat.</p>
        ) : (
          <div className="kasbon-kapster-list">
            {daftar.map((r) => (
              <article className="kasbon-kapster-row" key={r.id}>
                <div className="kasbon-kapster-info">
                  <strong>{r.nama}</strong>
                  <small>
                    {formatTanggal(r.tanggal)}
                    {r.catatan ? ` · ${r.catatan}` : ""}
                  </small>
                </div>
                <i className={`chip ${r.status.toLowerCase()}`}>{r.status}</i>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default IzinKapster
