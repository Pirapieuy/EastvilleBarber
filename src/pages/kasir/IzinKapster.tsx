import { FormEvent, useEffect, useMemo, useState } from "react"
import { AbsensiRow, apiAbsensi, apiAbsensiKapster, apiKasir, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { SearchSelect } from "../../components/common/SearchSelect"
import { Icon } from "../../components/common/Icon"
import { Button, LoadingState } from "../../components/common/UI"
import { formatTanggal, tanggalIsoLokal } from "../../utils/tanggal"

const JENIS = ["Izin", "Sakit", "Cuti"] as const
type Jenis = (typeof JENIS)[number]

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]
const HARI_SINGKAT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
const HARI_PANJANG = new Intl.DateTimeFormat("id-ID", { weekday: "long" })
const pad = (n: number) => String(n).padStart(2, "0")
const dariIso = (iso: string) => new Date(`${iso}T12:00:00`)

// Kalender bulanan yang langsung tampil di halaman; tanggal sebelum `min` abu-abu.
function KalenderBesar({
  value,
  min,
  izin,
  onChange,
}: {
  value: string
  min: string
  izin: Record<string, string[]>
  onChange: (iso: string) => void
}) {
  const [tahun, setTahun] = useState(() => Number(value.slice(0, 4)))
  const [bulan, setBulan] = useState(() => Number(value.slice(5, 7)) - 1)
  const hariIni = tanggalIsoLokal(new Date())

  useEffect(() => {
    if (value && value.length >= 7) {
      setTahun(Number(value.slice(0, 4)))
      setBulan(Number(value.slice(5, 7)) - 1)
    }
  }, [value])

  const offset = (new Date(tahun, bulan, 1).getDay() + 6) % 7
  const jumlahHari = new Date(tahun, bulan + 1, 0).getDate()
  const geser = (arah: number) => {
    const d = new Date(tahun, bulan + arah, 1)
    setTahun(d.getFullYear())
    setBulan(d.getMonth())
  }
  const bisaMundur = `${tahun}-${pad(bulan + 1)}` > min.slice(0, 7)

  return (
    <div className="izin-cal">
      <div className="izin-cal-head">
        <strong>
          {NAMA_BULAN[bulan]} {tahun}
        </strong>
        <div className="izin-cal-nav">
          <button
            aria-label="Bulan sebelumnya"
            disabled={!bisaMundur}
            onClick={() => geser(-1)}
            type="button"
          >
            <Icon name="chevron" />
          </button>
          <button
            aria-label="Bulan berikutnya"
            onClick={() => geser(1)}
            style={{ transform: "rotate(180deg)" }}
            type="button"
          >
            <Icon name="chevron" />
          </button>
        </div>
      </div>
      <div className="izin-cal-week">
        {HARI_SINGKAT.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <div className="izin-cal-grid">
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`k-${i}`} />
        ))}
        {Array.from({ length: jumlahHari }).map((_, i) => {
          const iso = `${tahun}-${pad(bulan + 1)}-${pad(i + 1)}`
          const mati = iso < min
          const yangIzin = izin[iso]
          return (
            <button
              className={`${iso === value ? "sel" : ""} ${iso === hariIni ? "today" : ""} ${yangIzin ? "ada-izin" : ""}`}
              disabled={mati}
              key={iso}
              onClick={() => onChange(iso)}
              title={yangIzin?.join(", ")}
              type="button"
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Kasir mencatat izin/sakit/cuti kapster. Izin dan sakit bisa diajukan untuk hari ini (hari H) atau setelahnya,
// sedangkan cuti berlaku untuk besok atau setelahnya (H-1).
export function IzinKapster() {
  const hariIniIso = useMemo(() => tanggalIsoLokal(new Date()), [])
  const besokIso = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return tanggalIsoLokal(d)
  }, [])
  const [kapster, setKapster] = useState<{ id: string; nama: string }[]>([])
  const [daftar, setDaftar] = useState<AbsensiRow[]>([])
  const [kapsterId, setKapsterId] = useState("")
  const [jenis, setJenis] = useState<Jenis>("Izin")
  const [tanggal, setTanggal] = useState(hariIniIso)
  const [catatan, setCatatan] = useState("")
  const [loading, setLoading] = useState(() => Boolean(getToken()))
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const minTanggal = jenis === "Cuti" ? besokIso : hariIniIso

  const izinPerTanggal = useMemo(() => {
    const peta: Record<string, string[]> = {}
    daftar.forEach((r) => {
      ;(peta[r.tanggal] ??= []).push(`${r.nama} (${r.status})`)
    })
    return peta
  }, [daftar])

  const bisaKirim =
    Boolean(kapsterId) &&
    catatan.trim() !== "" &&
    !saving &&
    (jenis === "Cuti" ? tanggal >= besokIso : tanggal >= hariIniIso)
  const tgl = dariIso(tanggal)
  const selisih = Math.round(
    (tgl.getTime() - dariIso(hariIniIso).getTime()) / 86400000,
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
    if (jenis === "Cuti" && tanggal < besokIso) {
      setError("Cuti hanya bisa diajukan untuk besok atau setelahnya.")
      return
    }
    if (tanggal < hariIniIso) {
      setError("Izin atau sakit tidak bisa diajukan untuk tanggal lampau.")
      return
    }
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
        <div className="izin-layout">
          <div className="izin-layout-cal">
            <KalenderBesar
              izin={izinPerTanggal}
              min={minTanggal}
              onChange={setTanggal}
              value={tanggal}
            />
          </div>
          <div className="izin-layout-form">
            <div className="izin-pilihan">
              <div className="izin-pilihan-teks">
                <strong>{HARI_PANJANG.format(tgl)}</strong>
                <span>
                  {izinPerTanggal[tanggal]?.join(", ") ?? "Belum ada yang izin"}
                </span>
              </div>
              <small>
                {selisih === 0
                  ? "Hari ini"
                  : selisih === 1
                    ? "Besok"
                    : selisih > 1
                      ? `${selisih} hari lagi`
                      : `${Math.abs(selisih)} hari lalu`}
              </small>
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
                  onClick={() => {
                    setJenis(j)
                    if (j === "Cuti" && tanggal < besokIso) {
                      setTanggal(besokIso)
                    }
                  }}
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
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
          </div>
        </div>
      </form>

      <section className="panel form-panel kasbon-kapster-history">
        <div className="section-title">
          <h3>Riwayat</h3>
          <span className="nota-count">{daftar.length}</span>
        </div>
        {daftar.length === 0 ? (
          <p className="history-empty">Belum ada catatan.</p>
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
