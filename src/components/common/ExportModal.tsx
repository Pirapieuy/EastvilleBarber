import { useEffect, useState } from "react"
import { Button } from "./UI"
import { Icon } from "./Icon"
import { CalendarPicker } from "./CalendarPicker"
import { SearchSelect } from "./SearchSelect"
import { apiKasir } from "../../api"
import { TANGGAL_MAKS, TANGGAL_MULAI } from "../../utils/tanggal"
import { DokumenEkspor, eksporDokumen, FormatEkspor } from "../../utils/ekspor"

export type KategoriEkspor = "Layanan" | "Produk" | "Semua"

export interface OpsiEkspor {
  format: FormatEkspor
  dari: string
  sampai: string
  /** "Semua" bila popup tidak menawarkan pilihan kategori */
  kategori: KategoriEkspor
  /** Kosong = semua kapster */
  kapsterId: string
  kapsterNama: string
}

export interface ExportModalProps {
  /** Judul popup, mis. "Ekspor Laporan Keuangan" */
  judul: string
  /** Pilihan kategori yang ditawarkan; kosongkan bila halaman tidak membedakan layanan/produk */
  kategori?: KategoriEkspor[]
  /** Tampilkan pilihan Semua kapster / satu kapster */
  denganKapster?: boolean
  /** Mengambil data dan menyusunnya menjadi dokumen; error yang dilempar tampil di popup */
  onBuat: (opsi: OpsiEkspor) => Promise<DokumenEkspor>
  onClose: () => void
}

const FORMAT: FormatEkspor[] = ["PDF", "Excel"]

export function ExportModal({
  judul,
  kategori: pilihanKategori,
  denganKapster = false,
  onBuat,
  onClose,
}: ExportModalProps) {
  // Rentang awal selalu hari ini, apa pun periode yang sedang tampil di halaman.
  const [dari, setDari] = useState(TANGGAL_MAKS)
  const [sampai, setSampai] = useState(TANGGAL_MAKS)
  const [format, setFormat] = useState<FormatEkspor>("PDF")
  const [kategori, setKategori] = useState<KategoriEkspor>("Semua")
  const [kapsterId, setKapsterId] = useState("")
  const [daftarKapster, setDaftarKapster] = useState<{ id: string; nama: string }[]>([])
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState("")

  useEffect(() => {
    if (!denganKapster) return
    let batal = false
    apiKasir
      .kapster()
      .then((k) => !batal && setDaftarKapster(k))
      .catch(() => {})
    return () => {
      batal = true
    }
  }, [denganKapster])

  const urutSalah = Boolean(dari && sampai && dari > sampai)
  const bisa = Boolean(dari && sampai) && !urutSalah && !sibuk

  async function unduh() {
    if (!bisa) return
    setGalat("")
    setSibuk(true)
    try {
      const dok = await onBuat({
        format,
        dari,
        sampai,
        kategori: pilihanKategori ? kategori : "Semua",
        kapsterId,
        kapsterNama: daftarKapster.find((k) => k.id === kapsterId)?.nama ?? "",
      })
      await eksporDokumen(dok, format)
      onClose()
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Ekspor gagal. Coba lagi.")
      setSibuk(false)
    }
  }

  return (
    <div
      className="modal-overlay modal-centered"
      onClick={() => {
        if (!sibuk) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={judul}
    >
      <section className="simple-modal export-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{judul}</h2>
          <Button onClick={onClose} disabled={sibuk} aria-label="Tutup">
            <Icon name="close" />
          </Button>
        </header>

        <div className="export-body">
          <div className="export-field">
            <span>Format</span>
            <div className="segmented full" role="group" aria-label="Format berkas">
              {FORMAT.map((f) => (
                <Button
                  className={format === f ? "active" : ""}
                  key={f}
                  onClick={() => setFormat(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          <div className="export-field">
            <span>Rentang tanggal</span>
            <div className="export-range">
              <CalendarPicker
                min={TANGGAL_MULAI}
                max={TANGGAL_MAKS()}
                value={dari}
                onChange={(d) => d && setDari(d)}
              />
              <CalendarPicker
                align="right"
                min={TANGGAL_MULAI}
                max={TANGGAL_MAKS()}
                value={sampai}
                onChange={(d) => d && setSampai(d)}
              />
            </div>
            {urutSalah && (
              <small className="export-error" role="alert">
                Tanggal awal tidak boleh setelah tanggal akhir.
              </small>
            )}
          </div>

          {denganKapster && (
            <div className="export-field">
              <span>Kapster</span>
              <SearchSelect
                aria-label="Pilih kapster"
                className="export-kapster"
                value={kapsterId}
                onChange={(e) => setKapsterId(e.target.value)}
              >
                <option value="">Semua kapster</option>
                {daftarKapster.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </SearchSelect>
            </div>
          )}

          {pilihanKategori && (
            <div className="export-field">
              <span>Kategori</span>
              <div className="segmented full" role="group" aria-label="Kategori data">
                {pilihanKategori.map((k) => (
                  <Button
                    className={kategori === k ? "active" : ""}
                    key={k}
                    onClick={() => setKategori(k)}
                  >
                    {k}
                  </Button>
                ))}
              </div>
              {kategori === "Layanan" && (
                <small className="export-hint">
                  Laporan rinci per layanan: jumlah, omzet, diskon, komisi, dan kapster.
                </small>
              )}
            </div>
          )}

          {galat && (
            <div className="info-banner export-error-box" role="alert">
              <Icon name="alert" />
              <span>{galat}</span>
            </div>
          )}
        </div>

        <footer>
          <Button className="primary-button export-submit" disabled={!bisa} onClick={unduh}>
            {sibuk ? (
              "Menyiapkan berkas..."
            ) : (
              <>
                <Icon name="download" /> Unduh {format}
              </>
            )}
          </Button>
        </footer>
      </section>
    </div>
  )
}
