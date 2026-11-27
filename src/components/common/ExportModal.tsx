import { useState } from "react"
import { Button } from "./UI"
import { Icon } from "./Icon"
import { CalendarPicker } from "./CalendarPicker"
import { TANGGAL_MAKS, TANGGAL_MULAI } from "../../utils/tanggal"
import { DokumenEkspor, eksporDokumen, FormatEkspor } from "../../utils/ekspor"

export type KategoriEkspor = "Layanan" | "Produk" | "Semua"

export interface OpsiEkspor {
  format: FormatEkspor
  dari: string
  sampai: string
  kategori: KategoriEkspor
}

export interface ExportModalProps {
  /** Judul popup, mis. "Ekspor Laporan Keuangan" */
  judul: string
  /** Rentang tanggal awal, biasanya periode yang sedang tampil di halaman */
  awal: { dari: string; sampai: string }
  /** Tampilkan pilihan kategori Layanan / Produk / Semua */
  denganKategori?: boolean
  /** Mengambil data dan menyusunnya menjadi dokumen; error yang dilempar tampil di popup */
  onBuat: (opsi: OpsiEkspor) => Promise<DokumenEkspor>
  onClose: () => void
}

const FORMAT: FormatEkspor[] = ["PDF", "Excel"]
const KATEGORI: KategoriEkspor[] = ["Layanan", "Produk", "Semua"]

export function ExportModal({
  judul,
  awal,
  denganKategori = false,
  onBuat,
  onClose,
}: ExportModalProps) {
  const [format, setFormat] = useState<FormatEkspor>("PDF")
  const [dari, setDari] = useState(awal.dari)
  const [sampai, setSampai] = useState(awal.sampai)
  const [kategori, setKategori] = useState<KategoriEkspor>("Semua")
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState("")

  const urutSalah = Boolean(dari && sampai && dari > sampai)
  const bisa = Boolean(dari && sampai) && !urutSalah && !sibuk

  async function unduh() {
    if (!bisa) return
    setGalat("")
    setSibuk(true)
    try {
      const dok = await onBuat({ format, dari, sampai, kategori })
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

          {denganKategori && (
            <div className="export-field">
              <span>Kategori</span>
              <div className="segmented full" role="group" aria-label="Kategori data">
                {KATEGORI.map((k) => (
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
                  Laporan rinci per layanan: jumlah, omzet, komisi, dan kapster.
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
