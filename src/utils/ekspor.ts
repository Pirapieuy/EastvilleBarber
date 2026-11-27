// Pembuat berkas PDF dan Excel dari satu model dokumen (dipakai popup Ekspor di banyak halaman).
// Pustaka jspdf dan xlsx dimuat saat tombol Ekspor ditekan, jadi tidak membebani halaman lain.

export type JenisKolom = "teks" | "angka" | "rupiah"
export type Sel = string | number

export interface KolomEkspor {
  judul: string
  jenis?: JenisKolom
}

export interface BagianEkspor {
  judul: string
  /** Catatan kecil di bawah judul bagian (mis. arti angka) */
  catatan?: string
  kolom: KolomEkspor[]
  baris: Sel[][]
  /** Baris total di kaki tabel, sejajar dengan kolom */
  total?: Sel[]
}

export interface RingkasanEkspor {
  label: string
  nilai: Sel
  jenis?: JenisKolom
}

export interface DokumenEkspor {
  /** Nama berkas tanpa ekstensi */
  berkas: string
  judul: string
  /** Mis. "1 Nov 2026 - 30 Nov 2026 · Kategori: Layanan" */
  keterangan: string
  ringkasan?: RingkasanEkspor[]
  bagian: BagianEkspor[]
}

export type FormatEkspor = "PDF" | "Excel"

const rp = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(n)}`
const angka = (n: number) => new Intl.NumberFormat("id-ID").format(n)

function teks(nilai: Sel, jenis: JenisKolom = "teks"): string {
  if (typeof nilai !== "number") return String(nilai)
  return jenis === "rupiah" ? rp(nilai) : angka(nilai)
}

export function namaBerkasAman(s: string) {
  return s.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function simpanBlob(blob: Blob, nama: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function buatPdf(dok: DokumenEkspor) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  const lebar = dok.bagian.some((b) => b.kolom.length > 6)
  const pdf = new jsPDF({ orientation: lebar ? "landscape" : "portrait", unit: "pt", format: "a4" })
  const halaman = pdf.internal.pageSize.getWidth()
  const tinggi = pdf.internal.pageSize.getHeight()
  const tepi = 40
  const dibuat = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date())

  pdf.setFont("helvetica", "bold").setFontSize(16).setTextColor(20, 17, 15)
  pdf.text("Eastville Barbershop", tepi, 46)
  pdf.setFontSize(13).text(dok.judul, tepi, 66)
  pdf.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(90, 90, 90)
  pdf.text(dok.keterangan, tepi, 82)
  pdf.text(`Dibuat ${dibuat}`, tepi, 95)
  let y = 112

  const akhirTabel = () => (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  if (dok.ringkasan?.length) {
    autoTable(pdf, {
      startY: y,
      theme: "grid",
      body: dok.ringkasan.map((r) => [r.label, teks(r.nilai, r.jenis ?? "angka")]),
      margin: { left: tepi, right: tepi },
      styles: { fontSize: 9.5, cellPadding: 5, lineColor: [210, 205, 198], lineWidth: 0.5 },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [244, 241, 236], cellWidth: 190 },
        1: { halign: "right" },
      },
      tableWidth: 190 + 170,
    })
    y = akhirTabel() + 22
  }

  for (const b of dok.bagian) {
    if (y > tinggi - 120) {
      pdf.addPage()
      y = tepi
    }
    pdf.setFont("helvetica", "bold").setFontSize(11.5).setTextColor(20, 17, 15)
    pdf.text(b.judul, tepi, y)
    y += 6
    if (b.catatan) {
      pdf.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(110, 110, 110)
      const baris = pdf.splitTextToSize(b.catatan, halaman - tepi * 2) as string[]
      pdf.text(baris, tepi, y + 8)
      y += 8 + baris.length * 10
    }
    const rata = (i: number) => (b.kolom[i].jenis ?? "teks") === "teks" ? "left" : "right"
    const kolomStyle = Object.fromEntries(b.kolom.map((_, i) => [i, { halign: rata(i) as "left" | "right" }]))
    autoTable(pdf, {
      startY: y + 4,
      theme: "grid",
      head: [b.kolom.map((k) => k.judul)],
      body: b.baris.length
        ? b.baris.map((r) => r.map((c, i) => teks(c, b.kolom[i].jenis)))
        : [[{ content: "Tidak ada data pada periode ini.", colSpan: b.kolom.length, styles: { halign: "center", textColor: [120, 120, 120] } }]],
      foot: b.total && b.baris.length ? [b.total.map((c, i) => teks(c, b.kolom[i].jenis))] : undefined,
      showFoot: "lastPage",
      margin: { left: tepi, right: tepi, bottom: 44 },
      styles: { fontSize: 8.8, cellPadding: 4.5, lineColor: [210, 205, 198], lineWidth: 0.5, overflow: "linebreak" },
      headStyles: { fillColor: [38, 33, 29], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [244, 241, 236], textColor: [20, 17, 15], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [251, 250, 248] },
      columnStyles: kolomStyle,
      // Judul dan baris total ikut rata kolomnya (angka rata kanan)
      didParseCell: (h) => {
        if (h.section !== "body" && h.cell.colSpan === 1) h.cell.styles.halign = rata(h.column.index)
      },
    })
    y = akhirTabel() + 24
  }

  const jumlah = pdf.getNumberOfPages()
  for (let i = 1; i <= jumlah; i++) {
    pdf.setPage(i)
    pdf.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(130, 130, 130)
    pdf.text(`Halaman ${i} dari ${jumlah}`, halaman - tepi, tinggi - 22, { align: "right" })
    pdf.text("Eastville Barbershop", tepi, tinggi - 22)
  }
  simpanBlob(pdf.output("blob"), `${namaBerkasAman(dok.berkas)}.pdf`)
}

const FORMAT_ANGKA = "#,##0"
const FORMAT_RUPIAH = '"Rp" #,##0'

export async function buatExcel(dok: DokumenEkspor) {
  const XLSX = await import("xlsx")
  const buku = XLSX.utils.book_new()

  const lembar = (nama: string, isi: Sel[][], jenisPerKolom: (JenisKolom | undefined)[][] , lebarKolom: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(isi)
    ws["!cols"] = lebarKolom.map((wch) => ({ wch }))
    isi.forEach((baris, r) =>
      baris.forEach((nilai, c) => {
        const jenis = jenisPerKolom[r]?.[c]
        const sel = ws[XLSX.utils.encode_cell({ r, c })]
        if (sel && typeof nilai === "number" && jenis) sel.z = jenis === "rupiah" ? FORMAT_RUPIAH : FORMAT_ANGKA
      }),
    )
    XLSX.utils.book_append_sheet(buku, ws, nama.slice(0, 31).replace(/[\\/?*[\]:]/g, " "))
  }
  const lebarDari = (isi: Sel[][]) => {
    const maks: number[] = []
    for (const baris of isi)
      baris.forEach((c, i) => (maks[i] = Math.min(48, Math.max(maks[i] ?? 8, String(c).length + 2))))
    return maks
  }

  // Lembar pertama: judul, keterangan, dan ringkasan angka
  const awal: Sel[][] = [["Eastville Barbershop"], [dok.judul], [dok.keterangan], []]
  const jenisAwal: (JenisKolom | undefined)[][] = [[], [], [], []]
  for (const r of dok.ringkasan ?? []) {
    awal.push([r.label, r.nilai])
    jenisAwal.push([undefined, r.jenis ?? "angka"])
  }
  if (!dok.ringkasan?.length) awal.push(["Isi dokumen ada di lembar berikutnya."])
  lembar("Ringkasan", awal, jenisAwal, [30, 24])

  dok.bagian.forEach((b, i) => {
    const isi: Sel[][] = [b.kolom.map((k) => k.judul), ...b.baris]
    const jenis: (JenisKolom | undefined)[][] = [[], ...b.baris.map(() => b.kolom.map((k) => k.jenis))]
    if (b.total && b.baris.length) {
      isi.push(b.total)
      jenis.push(b.kolom.map((k) => k.jenis))
    }
    if (b.catatan) {
      isi.push([], [b.catatan])
      jenis.push([], [])
    }
    lembar(`${i + 1} ${b.judul}`, isi, jenis, lebarDari(isi))
  })

  const data = XLSX.write(buku, { bookType: "xlsx", type: "array" }) as ArrayBuffer
  simpanBlob(
    new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${namaBerkasAman(dok.berkas)}.xlsx`,
  )
}

export function eksporDokumen(dok: DokumenEkspor, format: FormatEkspor) {
  return format === "PDF" ? buatPdf(dok) : buatExcel(dok)
}
