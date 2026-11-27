// Penyusun dokumen ekspor per halaman: mengambil data dari server lalu membentuk bagian-bagian tabel.
// Dipakai lewat ExportModal; halaman hanya menyerahkan fungsi di sini sebagai `onBuat`.
import {
  apiLaporan,
  apiPengeluaran,
  apiTransaksi,
  GajiRow,
  KasbonRow,
  LaporanLayanan,
} from "../api"
import type { OpsiEkspor } from "../components/common/ExportModal"
import { formatTanggal, labelRentang } from "./tanggal"
import type { BagianEkspor, DokumenEkspor, Sel } from "./ekspor"

const TEKS_KATEGORI = { Layanan: "Layanan saja", Produk: "Produk saja", Semua: "Layanan dan produk" } as const

function periodeTeks(o: OpsiEkspor) {
  const rentang =
    o.dari === o.sampai ? formatTanggal(o.dari) : labelRentang(o.dari, o.sampai) || `${o.dari} s/d ${o.sampai}`
  return `Periode ${rentang} · ${TEKS_KATEGORI[o.kategori]}`
}

const namaBerkas = (awalan: string, o: OpsiEkspor) =>
  `${awalan}-${o.dari}${o.dari === o.sampai ? "" : `_${o.sampai}`}-${o.kategori.toLowerCase()}`

const rataRata = (omzet: number, jumlah: number) => (jumlah > 0 ? Math.round(omzet / jumlah) : 0)

/** Bagian rincian layanan: per layanan, per layanan dan kapster, per kapster. */
function bagianLayanan(d: LaporanLayanan): BagianEkspor[] {
  return [
    {
      judul: "Rincian per layanan",
      catatan: "Omzet = harga layanan x jumlah, sebelum diskon. Komisi = bagian kapster dari layanan itu.",
      kolom: [
        { judul: "Layanan" },
        { judul: "Jumlah", jenis: "angka" },
        { judul: "Omzet", jenis: "rupiah" },
        { judul: "Rata-rata", jenis: "rupiah" },
        { judul: "Komisi kapster", jenis: "rupiah" },
      ],
      baris: d.layanan.map((l) => [l.nama, l.jumlah, l.omzet, rataRata(l.omzet, l.jumlah), l.komisi]),
      total: ["Total", d.totalJumlah, d.totalOmzet, rataRata(d.totalOmzet, d.totalJumlah), d.totalKomisi],
    },
    {
      judul: "Layanan per kapster",
      kolom: [
        { judul: "Layanan" },
        { judul: "Kapster" },
        { judul: "Jumlah", jenis: "angka" },
        { judul: "Omzet", jenis: "rupiah" },
        { judul: "Komisi", jenis: "rupiah" },
      ],
      baris: d.layanan.flatMap((l) =>
        l.kapster.map((k): Sel[] => [l.nama, k.kapster, k.jumlah, k.omzet, k.komisi]),
      ),
    },
    {
      judul: "Ringkasan per kapster",
      kolom: [
        { judul: "Kapster" },
        { judul: "Layanan dikerjakan", jenis: "angka" },
        { judul: "Omzet", jenis: "rupiah" },
        { judul: "Komisi", jenis: "rupiah" },
      ],
      baris: d.perKapster.map((k) => [k.kapster, k.jumlah, k.omzet, k.komisi]),
      total: ["Total", d.totalJumlah, d.totalOmzet, d.totalKomisi],
    },
  ]
}

async function dokumenLayanan(judul: string, berkas: string, o: OpsiEkspor): Promise<DokumenEkspor> {
  const d = await apiLaporan.layanan({ dari: o.dari, sampai: o.sampai })
  return {
    berkas,
    judul,
    keterangan: periodeTeks(o),
    ringkasan: [
      { label: "Transaksi berisi layanan", nilai: d.jumlahTransaksi, jenis: "angka" },
      { label: "Layanan dikerjakan", nilai: d.totalJumlah, jenis: "angka" },
      { label: "Omzet layanan", nilai: d.totalOmzet, jenis: "rupiah" },
      { label: "Komisi kapster", nilai: d.totalKomisi, jenis: "rupiah" },
    ],
    bagian: bagianLayanan(d),
  }
}

interface BarisProduk {
  product: string
  qty: number
  totalOmzet: number
  barber: string
  barberShare: number
  sellerShare: number
  eastvilleShare: number
  status: string
  time: string
}

async function bagianProdukLaporan(o: OpsiEkspor) {
  const rows = ((await apiLaporan.produk({ dari: o.dari, sampai: o.sampai })) as BarisProduk[]).filter(
    (r) => r.status === "Lunas",
  )
  const per = new Map<string, { qty: number; omzet: number; kapster: number; penjual: number; eastville: number }>()
  for (const r of rows) {
    const p = per.get(r.product) ?? { qty: 0, omzet: 0, kapster: 0, penjual: 0, eastville: 0 }
    per.set(r.product, p)
    p.qty += r.qty
    p.omzet += r.totalOmzet
    p.kapster += r.barberShare
    p.penjual += r.sellerShare
    p.eastville += r.eastvilleShare
  }
  const daftar = [...per.entries()].sort((a, b) => b[1].omzet - a[1].omzet)
  const jumlah = daftar.reduce((a, [, p]) => a + p.qty, 0)
  const omzet = daftar.reduce((a, [, p]) => a + p.omzet, 0)
  const ringkas: BagianEkspor = {
    judul: "Penjualan produk",
    catatan: "Omzet = harga x jumlah, sebelum diskon nota. Hanya transaksi Lunas. Bagian kapster, penjual, dan Eastville mengikuti skema tiap produk.",
    kolom: [
      { judul: "Produk" },
      { judul: "Terjual", jenis: "angka" },
      { judul: "Omzet", jenis: "rupiah" },
      { judul: "Kapster", jenis: "rupiah" },
      { judul: "Penjual", jenis: "rupiah" },
      { judul: "Eastville", jenis: "rupiah" },
    ],
    baris: daftar.map(([nama, p]) => [nama, p.qty, p.omzet, p.kapster, p.penjual, p.eastville]),
    total: [
      "Total",
      jumlah,
      omzet,
      daftar.reduce((a, [, p]) => a + p.kapster, 0),
      daftar.reduce((a, [, p]) => a + p.penjual, 0),
      daftar.reduce((a, [, p]) => a + p.eastville, 0),
    ],
  }
  return { ringkas, jumlah, omzet }
}

export async function dokumenLaporanKeuangan(o: OpsiEkspor): Promise<DokumenEkspor> {
  const berkas = namaBerkas("laporan-keuangan", o)
  if (o.kategori === "Layanan") return dokumenLayanan("Laporan Keuangan: Rincian Layanan", berkas, o)
  if (o.kategori === "Produk") {
    const { ringkas, jumlah, omzet } = await bagianProdukLaporan(o)
    return {
      berkas,
      judul: "Laporan Keuangan: Penjualan Produk",
      keterangan: periodeTeks(o),
      ringkasan: [
        { label: "Produk terjual", nilai: jumlah, jenis: "angka" },
        { label: "Omzet produk", nilai: omzet, jenis: "rupiah" },
      ],
      bagian: [ringkas],
    }
  }

  const [k, peng] = await Promise.all([
    apiLaporan.keuangan({ dari: o.dari, sampai: o.sampai }),
    apiPengeluaran.list(),
  ])
  const pengeluaran = (peng as { dateIso?: string; category: string; description: string; amount: number; status: string }[])
    .filter((e) => e.status === "Aktif" && e.dateIso && e.dateIso >= o.dari && e.dateIso <= o.sampai)
    .sort((a, b) => (a.dateIso ?? "").localeCompare(b.dateIso ?? ""))
  const dihitung = pengeluaran.reduce((a, e) => a + e.amount, 0)
  const ringkasan: DokumenEkspor["ringkasan"] = [
    { label: "Jumlah transaksi", nilai: k.jumlahTransaksi, jenis: "angka" },
    { label: "Pemasukan (setelah diskon)", nilai: k.pemasukan, jenis: "rupiah" },
    { label: "  Tunai", nilai: k.tunai, jenis: "rupiah" },
    { label: "  QRIS", nilai: k.qris, jenis: "rupiah" },
  ]
  if (typeof k.diskon === "number") ringkasan.push({ label: "Diskon yang sudah dipotong", nilai: k.diskon, jenis: "rupiah" })
  ringkasan.push(
    { label: "Pengeluaran", nilai: k.pengeluaran, jenis: "rupiah" },
    { label: "Komisi kapster", nilai: k.komisi, jenis: "rupiah" },
    { label: "Sisa bersih Owner", nilai: k.sisa, jenis: "rupiah" },
  )

  const bagian: BagianEkspor[] = [
    {
      judul: "Pemasukan per hari",
      kolom: [
        { judul: "Tanggal" },
        { judul: "Tunai", jenis: "rupiah" },
        { judul: "QRIS", jenis: "rupiah" },
        { judul: "Total", jenis: "rupiah" },
      ],
      baris: k.perHari.map((h) => [formatTanggal(h.tanggal), h.tunai, h.qris, h.total]),
      total: ["Total", k.tunai, k.qris, k.pemasukan],
    },
    {
      judul: "Komisi per kapster",
      catatan: "Omzet kapster dihitung dari harga item sebelum diskon, jadi jumlahnya bisa lebih besar dari Pemasukan bila ada diskon.",
      kolom: [
        { judul: "Kapster" },
        { judul: "Transaksi", jenis: "angka" },
        { judul: "Omzet item", jenis: "rupiah" },
        { judul: "Komisi", jenis: "rupiah" },
      ],
      baris: k.perKapster.map((p) => [p.kapster, p.pelanggan, p.omzet, p.komisi]),
      total: ["Total", k.perKapster.reduce((a, p) => a + p.pelanggan, 0), k.perKapster.reduce((a, p) => a + p.omzet, 0), k.komisi],
    },
    {
      judul: "Pengeluaran",
      kolom: [
        { judul: "Tanggal" },
        { judul: "Kategori" },
        { judul: "Keterangan" },
        { judul: "Jumlah", jenis: "rupiah" },
      ],
      baris: pengeluaran.map((e) => [formatTanggal(e.dateIso!), e.category, e.description, e.amount]),
      total: ["Total", "", "", dihitung],
    },
  ]
  return { berkas, judul: "Laporan Keuangan", keterangan: periodeTeks(o), ringkasan, bagian }
}

interface ItemRiwayat {
  name: string
  qty: number
  price: number
  type: "Layanan" | "Produk"
  kapster?: string
}
interface Riwayat {
  id: string
  date: string
  time: string
  items: ItemRiwayat[]
  barber: string
  method: string
  commission: number
  subtotal?: number
  discount?: number
  total: number
  status: "Lunas" | "BATAL" | "Manual"
  createdBy?: string
}

export async function dokumenRiwayatTransaksi(o: OpsiEkspor): Promise<DokumenEkspor> {
  const berkas = namaBerkas("riwayat-transaksi", o)
  if (o.kategori === "Layanan") return dokumenLayanan("Riwayat Transaksi: Rincian Layanan", berkas, o)

  const semua = (await apiTransaksi.list({ dari: o.dari, sampai: o.sampai })) as Riwayat[]
  const sah = semua.filter((t) => t.status !== "BATAL")
  const batal = semua.length - sah.length

  if (o.kategori === "Produk") {
    const per = new Map<string, { qty: number; omzet: number }>()
    const baris: Sel[][] = []
    for (const t of sah)
      for (const i of t.items.filter((x) => x.type === "Produk")) {
        const p = per.get(i.name) ?? { qty: 0, omzet: 0 }
        per.set(i.name, p)
        p.qty += i.qty
        p.omzet += i.price * i.qty
        baris.push([t.id, t.date, t.time, i.name, i.qty, i.price, i.price * i.qty, i.kapster ?? t.barber])
      }
    const daftar = [...per.entries()].sort((a, b) => b[1].omzet - a[1].omzet)
    const jumlah = daftar.reduce((a, [, p]) => a + p.qty, 0)
    const omzet = daftar.reduce((a, [, p]) => a + p.omzet, 0)
    return {
      berkas,
      judul: "Riwayat Transaksi: Penjualan Produk",
      keterangan: periodeTeks(o),
      ringkasan: [
        { label: "Produk terjual", nilai: jumlah, jenis: "angka" },
        { label: "Omzet produk", nilai: omzet, jenis: "rupiah" },
        { label: "Nota dibatalkan (tidak dihitung)", nilai: batal, jenis: "angka" },
      ],
      bagian: [
        {
          judul: "Ringkasan per produk",
          catatan: "Omzet = harga x jumlah, sebelum diskon nota, jadi bisa lebih besar dari Total penjualan di Riwayat.",
          kolom: [{ judul: "Produk" }, { judul: "Terjual", jenis: "angka" }, { judul: "Omzet", jenis: "rupiah" }],
          baris: daftar.map(([nama, p]) => [nama, p.qty, p.omzet]),
          total: ["Total", jumlah, omzet],
        },
        {
          judul: "Daftar penjualan",
          kolom: [
            { judul: "Nota" },
            { judul: "Tanggal" },
            { judul: "Jam" },
            { judul: "Produk" },
            { judul: "Jumlah", jenis: "angka" },
            { judul: "Harga", jenis: "rupiah" },
            { judul: "Subtotal", jenis: "rupiah" },
            { judul: "Kapster" },
          ],
          baris,
        },
      ],
    }
  }

  const tunai = sah.filter((t) => t.method === "Tunai").reduce((a, t) => a + t.total, 0)
  const qris = sah.filter((t) => t.method === "QRIS").reduce((a, t) => a + t.total, 0)
  const total = sah.reduce((a, t) => a + t.total, 0)
  return {
    berkas,
    judul: "Riwayat Transaksi",
    keterangan: periodeTeks(o),
    ringkasan: [
      { label: "Jumlah nota", nilai: sah.length, jenis: "angka" },
      { label: "Total penjualan", nilai: total, jenis: "rupiah" },
      { label: "  Tunai", nilai: tunai, jenis: "rupiah" },
      { label: "  QRIS", nilai: qris, jenis: "rupiah" },
      { label: "  Gabungan tunai dan QRIS", nilai: total - tunai - qris, jenis: "rupiah" },
      { label: "Total diskon", nilai: sah.reduce((a, t) => a + (t.discount ?? 0), 0), jenis: "rupiah" },
      { label: "Total komisi kapster", nilai: sah.reduce((a, t) => a + t.commission, 0), jenis: "rupiah" },
      { label: "Nota dibatalkan (tidak dihitung)", nilai: batal, jenis: "angka" },
    ],
    bagian: [
      {
        judul: "Daftar transaksi",
        catatan: "Nota berstatus BATAL tetap ditampilkan, tetapi tidak masuk total.",
        kolom: [
          { judul: "Nota" },
          { judul: "Tanggal" },
          { judul: "Jam" },
          { judul: "Kapster" },
          { judul: "Item" },
          { judul: "Metode" },
          { judul: "Diskon", jenis: "rupiah" },
          { judul: "Total", jenis: "rupiah" },
          { judul: "Status" },
        ],
        baris: semua.map((t) => [
          t.id,
          t.date,
          t.time,
          t.barber,
          t.items.map((i) => (i.qty > 1 ? `${i.name} x${i.qty}` : i.name)).join(", "),
          t.method,
          t.discount ?? 0,
          t.total,
          t.status,
        ]),
        total: ["Total", "", "", "", "", "", sah.reduce((a, t) => a + (t.discount ?? 0), 0), total, ""],
      },
    ],
  }
}

const dalamRentang = (tgl: string | undefined, o: OpsiEkspor) => Boolean(tgl) && tgl! >= o.dari && tgl! <= o.sampai
const jumlahKolom = (baris: Sel[][], i: number) => baris.reduce((a, r) => a + (Number(r[i]) || 0), 0)
const periodeSaja = (o: OpsiEkspor) => periodeTeks(o).replace(/ · .*$/, "")

/** Pembayaran gaji yang tanggal bayarnya jatuh di rentang (data sudah dimuat halaman Gaji & Kasbon). */
export function dokumenGaji(gaji: GajiRow[], o: OpsiEkspor): DokumenEkspor {
  const daftar = gaji
    .filter((g) => dalamRentang(g.tanggalBayar.slice(0, 10), o))
    .sort((a, b) => a.tanggalBayar.localeCompare(b.tanggalBayar))
  const baris: Sel[][] = daftar.map((g) => [
    formatTanggal(g.tanggalBayar.slice(0, 10)), g.nama, g.status, g.totalKomisi, g.totalKasbon, g.gajiBersih, g.dibayarOleh || "-",
  ])
  const sah = daftar.filter((g) => g.status === "Dibayar")
  const perKapster = new Map<string, { n: number; komisi: number; kasbon: number; bersih: number }>()
  for (const g of sah) {
    const k = perKapster.get(g.nama) ?? { n: 0, komisi: 0, kasbon: 0, bersih: 0 }
    perKapster.set(g.nama, k)
    k.n++; k.komisi += g.totalKomisi; k.kasbon += g.totalKasbon; k.bersih += g.gajiBersih
  }
  const komisi = sah.reduce((a, g) => a + g.totalKomisi, 0)
  const kasbon = sah.reduce((a, g) => a + g.totalKasbon, 0)
  const bersih = sah.reduce((a, g) => a + g.gajiBersih, 0)
  return {
    berkas: `gaji-${o.dari}${o.dari === o.sampai ? "" : `_${o.sampai}`}`,
    judul: "Gaji Kapster",
    keterangan: periodeSaja(o),
    ringkasan: [
      { label: "Pembayaran gaji", nilai: sah.length, jenis: "angka" },
      { label: "Total komisi", nilai: komisi, jenis: "rupiah" },
      { label: "Potongan kasbon", nilai: kasbon, jenis: "rupiah" },
      { label: "Gaji bersih dibayarkan", nilai: bersih, jenis: "rupiah" },
    ],
    bagian: [
      {
        judul: "Daftar pembayaran gaji",
        catatan: "Gaji bersih = komisi dikurangi potongan kasbon. Total hanya menghitung pembayaran berstatus Dibayar.",
        kolom: [
          { judul: "Tanggal bayar" }, { judul: "Kapster" }, { judul: "Status" },
          { judul: "Komisi", jenis: "rupiah" }, { judul: "Potongan kasbon", jenis: "rupiah" },
          { judul: "Gaji bersih", jenis: "rupiah" }, { judul: "Dibayar oleh" },
        ],
        baris,
        total: ["Total", "", "", jumlahKolom(baris, 3), jumlahKolom(baris, 4), jumlahKolom(baris, 5), ""],
      },
      {
        judul: "Ringkasan per kapster",
        kolom: [
          { judul: "Kapster" }, { judul: "Pembayaran", jenis: "angka" }, { judul: "Komisi", jenis: "rupiah" },
          { judul: "Potongan kasbon", jenis: "rupiah" }, { judul: "Gaji bersih", jenis: "rupiah" },
        ],
        baris: [...perKapster.entries()].sort((a, b) => b[1].bersih - a[1].bersih).map(([n, k]) => [n, k.n, k.komisi, k.kasbon, k.bersih]),
        total: ["Total", sah.length, komisi, kasbon, bersih],
      },
    ],
  }
}

/** Kasbon yang tanggalnya jatuh di rentang; total hanya kasbon Aktif/Lunas (bukan Menunggu atau Ditolak). */
export function dokumenKasbon(kasbon: KasbonRow[], o: OpsiEkspor): DokumenEkspor {
  const daftar = kasbon.filter((k) => dalamRentang(k.tanggal.slice(0, 10), o)).sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const hitung = daftar.filter((k) => k.status === "Aktif" || k.status === "Lunas")
  const per = (st: KasbonRow["status"]) => daftar.filter((k) => k.status === st)
  const nilai = (l: KasbonRow[]) => l.reduce((a, k) => a + k.jumlah, 0)
  const baris: Sel[][] = daftar.map((k) => [
    formatTanggal(k.tanggal.slice(0, 10)), k.nama, k.status, k.jumlah, k.catatan || "-", k.lunasWaktu ? formatTanggal(k.lunasWaktu.slice(0, 10)) : "-",
  ])
  return {
    berkas: `kasbon-${o.dari}${o.dari === o.sampai ? "" : `_${o.sampai}`}`,
    judul: "Kasbon Kapster",
    keterangan: periodeSaja(o),
    ringkasan: [
      { label: "Kasbon masih aktif", nilai: nilai(per("Aktif")), jenis: "rupiah" },
      { label: "Kasbon lunas", nilai: nilai(per("Lunas")), jenis: "rupiah" },
      { label: "Pengajuan menunggu", nilai: per("Menunggu").length, jenis: "angka" },
      { label: "Pengajuan ditolak", nilai: per("Ditolak").length, jenis: "angka" },
    ],
    bagian: [
      {
        judul: "Daftar kasbon",
        catatan: "Total hanya menghitung kasbon berstatus Aktif dan Lunas.",
        kolom: [
          { judul: "Tanggal" }, { judul: "Kapster" }, { judul: "Status" },
          { judul: "Jumlah", jenis: "rupiah" }, { judul: "Catatan" }, { judul: "Tanggal lunas" },
        ],
        baris,
        total: ["Total", "", "", nilai(hitung), "", ""],
      },
    ],
  }
}

/** Pengeluaran per tanggal dan per kategori; yang dibatalkan ditampilkan tetapi tidak dihitung. */
export async function dokumenPengeluaran(o: OpsiEkspor): Promise<DokumenEkspor> {
  const semua = (await apiPengeluaran.list()) as {
    dateIso?: string; category: string; description: string; amount: number; status: string; cancelReason?: string
  }[]
  const daftar = semua.filter((e) => dalamRentang(e.dateIso, o)).sort((a, b) => (a.dateIso ?? "").localeCompare(b.dateIso ?? ""))
  const sah = daftar.filter((e) => e.status === "Aktif")
  const total = sah.reduce((a, e) => a + e.amount, 0)
  const per = new Map<string, { n: number; jumlah: number }>()
  for (const e of sah) {
    const k = per.get(e.category) ?? { n: 0, jumlah: 0 }
    per.set(e.category, k)
    k.n++; k.jumlah += e.amount
  }
  return {
    berkas: `pengeluaran-${o.dari}${o.dari === o.sampai ? "" : `_${o.sampai}`}`,
    judul: "Pengeluaran",
    keterangan: periodeSaja(o),
    ringkasan: [
      { label: "Jumlah pengeluaran", nilai: sah.length, jenis: "angka" },
      { label: "Total pengeluaran", nilai: total, jenis: "rupiah" },
      { label: "Dibatalkan (tidak dihitung)", nilai: daftar.length - sah.length, jenis: "angka" },
    ],
    bagian: [
      {
        judul: "Ringkasan per kategori",
        kolom: [{ judul: "Kategori" }, { judul: "Jumlah", jenis: "angka" }, { judul: "Total", jenis: "rupiah" }],
        baris: [...per.entries()].sort((a, b) => b[1].jumlah - a[1].jumlah).map(([k, v]) => [k, v.n, v.jumlah]),
        total: ["Total", sah.length, total],
      },
      {
        judul: "Daftar pengeluaran",
        catatan: "Pengeluaran berstatus BATAL tetap ditampilkan, tetapi tidak masuk total.",
        kolom: [
          { judul: "Tanggal" }, { judul: "Kategori" }, { judul: "Keterangan" }, { judul: "Jumlah", jenis: "rupiah" }, { judul: "Status" },
        ],
        baris: daftar.map((e) => [formatTanggal(e.dateIso!), e.category, e.description, e.amount, e.status === "Aktif" ? "Aktif" : `BATAL${e.cancelReason ? `: ${e.cancelReason}` : ""}`]),
        total: ["Total", "", "", total, ""],
      },
    ],
  }
}
