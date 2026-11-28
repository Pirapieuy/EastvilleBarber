// Penyusun dokumen ekspor per halaman: mengambil data dari server lalu membentuk bagian-bagian tabel.
// Dipakai lewat ExportModal; halaman hanya menyerahkan fungsi di sini sebagai `onBuat`.
// Semua tabel penjualan memakai kolom yang sama: Omzet (sebelum diskon), Diskon, Bersih (setelah diskon), Komisi.
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
import type { BagianEkspor, DokumenEkspor, KolomEkspor, RingkasanEkspor, Sel } from "./ekspor"

const rentangTeks = (o: OpsiEkspor) =>
  o.dari === o.sampai ? formatTanggal(o.dari) : labelRentang(o.dari, o.sampai) || `${o.dari} s/d ${o.sampai}`

const TEKS_KATEGORI = { Layanan: "Layanan saja", Produk: "Produk saja", Semua: "Layanan dan produk" } as const

/** Baris keterangan di bawah judul: periode, lalu kategori dan kapster bila dipilih. */
function keteranganDari(o: OpsiEkspor, denganKategori = false) {
  const bagian = [`Periode ${rentangTeks(o)}`]
  if (denganKategori) bagian.push(TEKS_KATEGORI[o.kategori])
  bagian.push(o.kapsterId ? `Kapster ${o.kapsterNama || "terpilih"}` : "")
  return bagian.filter(Boolean).join(" · ")
}

const namaBerkas = (awalan: string, o: OpsiEkspor, denganKategori = false) =>
  [
    awalan,
    o.dari + (o.dari === o.sampai ? "" : `_${o.sampai}`),
    denganKategori ? o.kategori.toLowerCase() : "",
    o.kapsterId ? (o.kapsterNama || "kapster").toLowerCase() : "",
  ]
    .filter(Boolean)
    .join("-")

const rataRata = (omzet: number, jumlah: number) => (jumlah > 0 ? Math.round(omzet / jumlah) : 0)
const jumlahKolom = (baris: Sel[][], i: number) => baris.reduce((a, r) => a + (Number(r[i]) || 0), 0)
const dalamRentang = (tgl: string | undefined, o: OpsiEkspor) => Boolean(tgl) && tgl! >= o.dari && tgl! <= o.sampai

/** Bagian diskon nota untuk satu item, sebanding harga item terhadap subtotal nota (sama dengan aturan server). */
const bagiDiskon = (diskon: number, subtotal: number, nilai: number) =>
  subtotal > 0 ? Math.round((diskon * nilai) / subtotal) : 0

const KOLOM_PENJUALAN: KolomEkspor[] = [
  { judul: "Omzet", jenis: "rupiah" },
  { judul: "Diskon", jenis: "rupiah" },
  { judul: "Bersih", jenis: "rupiah" },
  { judul: "Komisi", jenis: "rupiah" },
]
const CATATAN_OMZET =
  "Omzet = harga x jumlah sebelum diskon. Diskon nota dibagi ke tiap item sebanding harganya. Bersih = Omzet dikurangi Diskon."

/** Bagian rincian layanan: per layanan, per layanan dan kapster, per kapster. */
function bagianLayanan(d: LaporanLayanan): BagianEkspor[] {
  const kolomLayanan: KolomEkspor[] = [{ judul: "Jumlah", jenis: "angka" }, ...KOLOM_PENJUALAN]
  const baris = (x: { jumlah: number; omzet: number; diskon: number; bersih: number; komisi: number }): Sel[] => [
    x.jumlah, x.omzet, x.diskon, x.bersih, x.komisi,
  ]
  return [
    {
      judul: "Rincian per layanan",
      catatan: CATATAN_OMZET,
      kolom: [{ judul: "Layanan" }, ...kolomLayanan, { judul: "Rata-rata", jenis: "rupiah" }],
      baris: d.layanan.map((l) => [l.nama, ...baris(l), rataRata(l.bersih, l.jumlah)]),
      total: ["Total", d.totalJumlah, d.totalOmzet, d.totalDiskon, d.totalBersih, d.totalKomisi, rataRata(d.totalBersih, d.totalJumlah)],
    },
    {
      judul: "Layanan per kapster",
      kolom: [{ judul: "Layanan" }, { judul: "Kapster" }, ...kolomLayanan],
      baris: d.layanan.flatMap((l) => l.kapster.map((k): Sel[] => [l.nama, k.kapster, ...baris(k)])),
    },
    {
      judul: "Ringkasan per kapster",
      kolom: [{ judul: "Kapster" }, ...kolomLayanan],
      baris: d.perKapster.map((k) => [k.kapster, ...baris(k)]),
      total: ["Total", d.totalJumlah, d.totalOmzet, d.totalDiskon, d.totalBersih, d.totalKomisi],
    },
  ]
}

async function dokumenLayanan(judul: string, berkas: string, o: OpsiEkspor): Promise<DokumenEkspor> {
  const d = await apiLaporan.layanan({ dari: o.dari, sampai: o.sampai, kapsterId: o.kapsterId || undefined })
  return {
    berkas,
    judul,
    keterangan: keteranganDari(o, true),
    ringkasan: [
      { label: "Transaksi berisi layanan", nilai: d.jumlahTransaksi, jenis: "angka" },
      { label: "Layanan dikerjakan", nilai: d.totalJumlah, jenis: "angka" },
      { label: "Omzet layanan (sebelum diskon)", nilai: d.totalOmzet, jenis: "rupiah" },
      { label: "Potongan diskon", nilai: d.totalDiskon, jenis: "rupiah" },
      { label: "Layanan bersih (setelah diskon)", nilai: d.totalBersih, jenis: "rupiah" },
      { label: "Komisi kapster", nilai: d.totalKomisi, jenis: "rupiah" },
    ],
    bagian: bagianLayanan(d),
  }
}

// ---------------------------------------------------------------- Laporan Keuangan

export async function dokumenLaporanKeuangan(o: OpsiEkspor): Promise<DokumenEkspor> {
  const [k, peng] = await Promise.all([
    apiLaporan.keuangan({ dari: o.dari, sampai: o.sampai }),
    apiPengeluaran.list(),
  ])
  const pengeluaran = (peng as { dateIso?: string; category: string; description: string; amount: number; status: string }[])
    .filter((e) => e.status === "Aktif" && dalamRentang(e.dateIso, o))
    .sort((a, b) => (a.dateIso ?? "").localeCompare(b.dateIso ?? ""))
  const kotor = k.kotor ?? k.pemasukan + (k.diskon ?? 0)
  const ringkasan: RingkasanEkspor[] = [
    { label: "Jumlah transaksi", nilai: k.jumlahTransaksi, jenis: "angka" },
    { label: "Penjualan sebelum diskon", nilai: kotor, jenis: "rupiah" },
    { label: "Potongan diskon", nilai: k.diskon ?? 0, jenis: "rupiah" },
    { label: "Pemasukan (setelah diskon)", nilai: k.pemasukan, jenis: "rupiah" },
    { label: "  Tunai", nilai: k.tunai, jenis: "rupiah" },
    { label: "  QRIS", nilai: k.qris, jenis: "rupiah" },
    { label: "Pengeluaran", nilai: k.pengeluaran, jenis: "rupiah" },
    { label: "Komisi kapster", nilai: k.komisi, jenis: "rupiah" },
    { label: "Sisa bersih Owner", nilai: k.sisa, jenis: "rupiah" },
  ]
  if (typeof k.omzetLayanan === "number" && typeof k.omzetProduk === "number")
    ringkasan.splice(
      3,
      0,
      { label: "  dari layanan (sebelum diskon)", nilai: k.omzetLayanan, jenis: "rupiah" },
      { label: "  dari produk (sebelum diskon)", nilai: k.omzetProduk, jenis: "rupiah" },
    )

  const hari = k.perHari
  const perHari: Sel[][] = hari.map((h) => [
    formatTanggal(h.tanggal), h.jumlah ?? 0, h.kotor ?? h.total, h.diskon ?? 0, h.total, h.tunai, h.qris, h.komisi ?? 0,
  ])
  const perKategori = new Map<string, { n: number; jumlah: number }>()
  for (const e of pengeluaran) {
    const v = perKategori.get(e.category) ?? { n: 0, jumlah: 0 }
    perKategori.set(e.category, v)
    v.n++; v.jumlah += e.amount
  }
  const totalPengeluaran = pengeluaran.reduce((a, e) => a + e.amount, 0)

  const bagian: BagianEkspor[] = [
    {
      judul: "Pemasukan per hari",
      catatan: "Penjualan = sebelum diskon. Pemasukan = Penjualan dikurangi Diskon, dipecah menjadi Tunai dan QRIS.",
      kolom: [
        { judul: "Tanggal" },
        { judul: "Transaksi", jenis: "angka" },
        { judul: "Penjualan", jenis: "rupiah" },
        { judul: "Diskon", jenis: "rupiah" },
        { judul: "Pemasukan", jenis: "rupiah" },
        { judul: "Tunai", jenis: "rupiah" },
        { judul: "QRIS", jenis: "rupiah" },
        { judul: "Komisi", jenis: "rupiah" },
      ],
      baris: perHari,
      total: ["Total", k.jumlahTransaksi, kotor, k.diskon ?? 0, k.pemasukan, k.tunai, k.qris, k.komisi],
    },
    {
      judul: "Komisi per kapster",
      catatan: "Omzet item dihitung sebelum diskon, jadi jumlahnya bisa lebih besar dari Pemasukan bila ada diskon.",
      kolom: [
        { judul: "Kapster" },
        { judul: "Transaksi", jenis: "angka" },
        { judul: "Omzet item", jenis: "rupiah" },
        { judul: "Komisi", jenis: "rupiah" },
      ],
      baris: k.perKapster.map((p) => [p.kapster, p.pelanggan, p.omzet, p.komisi]),
      total: ["Total", jumlahKolom(k.perKapster.map((p) => [p.pelanggan]), 0), k.perKapster.reduce((a, p) => a + p.omzet, 0), k.komisi],
    },
    {
      judul: "Pengeluaran per kategori",
      kolom: [{ judul: "Kategori" }, { judul: "Jumlah", jenis: "angka" }, { judul: "Total", jenis: "rupiah" }],
      baris: [...perKategori.entries()].sort((a, b) => b[1].jumlah - a[1].jumlah).map(([n, v]) => [n, v.n, v.jumlah]),
      total: ["Total", pengeluaran.length, totalPengeluaran],
    },
    {
      judul: "Daftar pengeluaran",
      kolom: [{ judul: "Tanggal" }, { judul: "Kategori" }, { judul: "Keterangan" }, { judul: "Jumlah", jenis: "rupiah" }],
      baris: pengeluaran.map((e) => [formatTanggal(e.dateIso!), e.category, e.description, e.amount]),
      total: ["Total", "", "", totalPengeluaran],
    },
  ]
  return {
    berkas: namaBerkas("laporan-keuangan", o),
    judul: "Laporan Keuangan",
    keterangan: keteranganDari(o),
    ringkasan,
    bagian,
  }
}

// ---------------------------------------------------------------- Riwayat Transaksi

interface ItemRiwayat {
  name: string
  qty: number
  price: number
  type: "Layanan" | "Produk"
  kapster?: string
  kapsterId?: string
  komisi?: number
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

/** Satu nota setelah dipersempit ke kapster terpilih (atau utuh bila semua kapster). */
interface NotaRingkas {
  t: Riwayat
  items: ItemRiwayat[]
  omzet: number
  diskon: number
  bersih: number
  komisi: number
}

const nilaiItem = (i: ItemRiwayat) => i.price * i.qty
const subtotalNota = (t: Riwayat) => t.subtotal ?? t.items.reduce((a, i) => a + nilaiItem(i), 0)

function notaRingkas(t: Riwayat, kapsterId: string): NotaRingkas | null {
  if (!kapsterId) {
    const omzet = subtotalNota(t)
    return { t, items: t.items, omzet, diskon: t.discount ?? 0, bersih: t.total, komisi: t.commission }
  }
  const milik = t.items.filter((i) => i.kapsterId === kapsterId)
  if (!milik.length) return null
  const sub = subtotalNota(t)
  const omzet = milik.reduce((a, i) => a + nilaiItem(i), 0)
  const diskon = milik.reduce((a, i) => a + bagiDiskon(t.discount ?? 0, sub, nilaiItem(i)), 0)
  return { t, items: milik, omzet, diskon, bersih: omzet - diskon, komisi: milik.reduce((a, i) => a + (i.komisi ?? 0), 0) }
}

export async function dokumenRiwayatTransaksi(o: OpsiEkspor): Promise<DokumenEkspor> {
  const berkas = namaBerkas("riwayat-transaksi", o, true)
  if (o.kategori === "Layanan") return dokumenLayanan("Riwayat Transaksi: Rincian Layanan", berkas, o)

  const semua = (await apiTransaksi.list({ dari: o.dari, sampai: o.sampai })) as Riwayat[]
  const nota = semua.map((t) => notaRingkas(t, o.kapsterId)).filter((n): n is NotaRingkas => n !== null)
  const sah = nota.filter((n) => n.t.status !== "BATAL")
  const batal = nota.length - sah.length
  const jumlah = (f: (n: NotaRingkas) => number) => sah.reduce((a, n) => a + f(n), 0)

  if (o.kategori === "Produk") {
    const per = new Map<string, { qty: number; omzet: number; diskon: number; komisi: number }>()
    const baris: Sel[][] = []
    for (const n of sah) {
      const sub = subtotalNota(n.t)
      for (const i of n.items.filter((x) => x.type === "Produk")) {
        const omzet = nilaiItem(i)
        const diskon = bagiDiskon(n.t.discount ?? 0, sub, omzet)
        const p = per.get(i.name) ?? { qty: 0, omzet: 0, diskon: 0, komisi: 0 }
        per.set(i.name, p)
        p.qty += i.qty; p.omzet += omzet; p.diskon += diskon; p.komisi += i.komisi ?? 0
        baris.push([n.t.id, n.t.date, n.t.time, i.name, i.qty, i.price, omzet, diskon, omzet - diskon, i.komisi ?? 0, i.kapster ?? n.t.barber])
      }
    }
    const daftar = [...per.entries()].sort((a, b) => b[1].omzet - a[1].omzet)
    const tot = daftar.reduce((a, [, p]) => ({ qty: a.qty + p.qty, omzet: a.omzet + p.omzet, diskon: a.diskon + p.diskon, komisi: a.komisi + p.komisi }), { qty: 0, omzet: 0, diskon: 0, komisi: 0 })
    return {
      berkas,
      judul: "Riwayat Transaksi: Penjualan Produk",
      keterangan: keteranganDari(o, true),
      ringkasan: [
        { label: "Produk terjual", nilai: tot.qty, jenis: "angka" },
        { label: "Omzet produk (sebelum diskon)", nilai: tot.omzet, jenis: "rupiah" },
        { label: "Potongan diskon", nilai: tot.diskon, jenis: "rupiah" },
        { label: "Produk bersih (setelah diskon)", nilai: tot.omzet - tot.diskon, jenis: "rupiah" },
        { label: "Komisi kapster", nilai: tot.komisi, jenis: "rupiah" },
        { label: "Nota dibatalkan (tidak dihitung)", nilai: batal, jenis: "angka" },
      ],
      bagian: [
        {
          judul: "Ringkasan per produk",
          catatan: CATATAN_OMZET,
          kolom: [{ judul: "Produk" }, { judul: "Terjual", jenis: "angka" }, ...KOLOM_PENJUALAN],
          baris: daftar.map(([nama, p]) => [nama, p.qty, p.omzet, p.diskon, p.omzet - p.diskon, p.komisi]),
          total: ["Total", tot.qty, tot.omzet, tot.diskon, tot.omzet - tot.diskon, tot.komisi],
        },
        {
          judul: "Daftar penjualan",
          kolom: [
            { judul: "Nota" }, { judul: "Tanggal" }, { judul: "Jam" }, { judul: "Produk" },
            { judul: "Jumlah", jenis: "angka" }, { judul: "Harga", jenis: "rupiah" },
            { judul: "Omzet", jenis: "rupiah" }, { judul: "Diskon", jenis: "rupiah" },
            { judul: "Bersih", jenis: "rupiah" }, { judul: "Komisi", jenis: "rupiah" }, { judul: "Kapster" },
          ],
          baris,
        },
      ],
    }
  }

  const tunai = sah.filter((n) => n.t.method === "Tunai").reduce((a, n) => a + n.t.total, 0)
  const qris = sah.filter((n) => n.t.method === "QRIS").reduce((a, n) => a + n.t.total, 0)
  const omzet = jumlah((n) => n.omzet), diskon = jumlah((n) => n.diskon), bersih = jumlah((n) => n.bersih), komisi = jumlah((n) => n.komisi)
  const ringkasan: RingkasanEkspor[] = [
    { label: "Jumlah nota", nilai: sah.length, jenis: "angka" },
    { label: "Penjualan sebelum diskon", nilai: omzet, jenis: "rupiah" },
    { label: "Potongan diskon", nilai: diskon, jenis: "rupiah" },
    { label: o.kapsterId ? "Penjualan bersih (setelah diskon)" : "Total penjualan (setelah diskon)", nilai: bersih, jenis: "rupiah" },
  ]
  // Tunai/QRIS hanya bermakna untuk seluruh nota; satu kapster bisa berbagi nota dengan kapster lain.
  if (!o.kapsterId)
    ringkasan.push(
      { label: "  Tunai", nilai: tunai, jenis: "rupiah" },
      { label: "  QRIS", nilai: qris, jenis: "rupiah" },
      { label: "  Gabungan tunai dan QRIS", nilai: bersih - tunai - qris, jenis: "rupiah" },
    )
  ringkasan.push(
    { label: "Komisi kapster", nilai: komisi, jenis: "rupiah" },
    { label: "Nota dibatalkan (tidak dihitung)", nilai: batal, jenis: "angka" },
  )
  return {
    berkas,
    judul: "Riwayat Transaksi",
    keterangan: keteranganDari(o, true),
    ringkasan,
    bagian: [
      {
        judul: "Daftar transaksi",
        catatan: `Nota berstatus BATAL tetap ditampilkan, tetapi tidak masuk total. ${
          o.kapsterId ? "Untuk satu kapster, hanya item kapster itu yang dihitung; diskon nota dibagi sebanding harga item." : ""
        }`.trim(),
        kolom: [
          { judul: "Nota" }, { judul: "Tanggal" }, { judul: "Jam" }, { judul: "Kapster" }, { judul: "Item" }, { judul: "Metode" },
          ...KOLOM_PENJUALAN, { judul: "Status" },
        ],
        baris: nota.map((n) => [
          n.t.id,
          n.t.date,
          n.t.time,
          o.kapsterId ? o.kapsterNama : n.t.barber,
          n.items.map((i) => (i.qty > 1 ? `${i.name} x${i.qty}` : i.name)).join(", "),
          n.t.method,
          n.omzet,
          n.diskon,
          n.bersih,
          n.komisi,
          n.t.status,
        ]),
        total: ["Total", "", "", "", "", "", omzet, diskon, bersih, komisi, ""],
      },
    ],
  }
}

// ---------------------------------------------------------------- Laporan Produk (Owner)

interface BarisProduk {
  id: string
  time: string
  product: string
  qty: number
  totalOmzet: number
  discount?: number
  barber: string
  seller: string
  barberShare: number
  sellerShare: number
  eastvilleShare: number
  status: string
}

export async function dokumenLaporanProduk(o: OpsiEkspor): Promise<DokumenEkspor> {
  const semua = ((await apiLaporan.produk({ dari: o.dari, sampai: o.sampai })) as BarisProduk[]).filter(
    (r) => !o.kapsterNama || r.barber === o.kapsterNama,
  )
  const sah = semua.filter((r) => r.status === "Lunas")
  const per = new Map<string, { qty: number; omzet: number; diskon: number; kapster: number; penjual: number; eastville: number }>()
  for (const r of sah) {
    const p = per.get(r.product) ?? { qty: 0, omzet: 0, diskon: 0, kapster: 0, penjual: 0, eastville: 0 }
    per.set(r.product, p)
    p.qty += r.qty; p.omzet += r.totalOmzet; p.diskon += r.discount ?? 0
    p.kapster += r.barberShare; p.penjual += r.sellerShare; p.eastville += r.eastvilleShare
  }
  const daftar = [...per.entries()].sort((a, b) => b[1].omzet - a[1].omzet)
  const tot = daftar.reduce(
    (a, [, p]) => ({ qty: a.qty + p.qty, omzet: a.omzet + p.omzet, diskon: a.diskon + p.diskon, kapster: a.kapster + p.kapster, penjual: a.penjual + p.penjual, eastville: a.eastville + p.eastville }),
    { qty: 0, omzet: 0, diskon: 0, kapster: 0, penjual: 0, eastville: 0 },
  )
  return {
    berkas: namaBerkas("laporan-produk", o),
    judul: "Laporan Produk",
    keterangan: keteranganDari(o),
    ringkasan: [
      { label: "Produk terjual", nilai: tot.qty, jenis: "angka" },
      { label: "Omzet produk (sebelum diskon)", nilai: tot.omzet, jenis: "rupiah" },
      { label: "Potongan diskon", nilai: tot.diskon, jenis: "rupiah" },
      { label: "Produk bersih (setelah diskon)", nilai: tot.omzet - tot.diskon, jenis: "rupiah" },
      { label: "Bagian kapster", nilai: tot.kapster, jenis: "rupiah" },
      { label: "Bagian penjual", nilai: tot.penjual, jenis: "rupiah" },
      { label: "Bagian Eastville", nilai: tot.eastville, jenis: "rupiah" },
      { label: "Nota dibatalkan (tidak dihitung)", nilai: semua.length - sah.length, jenis: "angka" },
    ],
    bagian: [
      {
        judul: "Ringkasan per produk",
        catatan: `${CATATAN_OMZET} Bagian kapster, penjual, dan Eastville mengikuti skema tiap produk dan dihitung dari Omzet.`,
        kolom: [
          { judul: "Produk" }, { judul: "Terjual", jenis: "angka" }, { judul: "Omzet", jenis: "rupiah" },
          { judul: "Diskon", jenis: "rupiah" }, { judul: "Bersih", jenis: "rupiah" },
          { judul: "Kapster", jenis: "rupiah" }, { judul: "Penjual", jenis: "rupiah" }, { judul: "Eastville", jenis: "rupiah" },
        ],
        baris: daftar.map(([n, p]) => [n, p.qty, p.omzet, p.diskon, p.omzet - p.diskon, p.kapster, p.penjual, p.eastville]),
        total: ["Total", tot.qty, tot.omzet, tot.diskon, tot.omzet - tot.diskon, tot.kapster, tot.penjual, tot.eastville],
      },
      {
        judul: "Daftar penjualan produk",
        catatan: "Nota berstatus BATAL tetap ditampilkan, tetapi tidak masuk total.",
        kolom: [
          { judul: "Nota" }, { judul: "Waktu" }, { judul: "Produk" }, { judul: "Jumlah", jenis: "angka" },
          { judul: "Kapster" }, { judul: "Penjual" }, { judul: "Omzet", jenis: "rupiah" }, { judul: "Diskon", jenis: "rupiah" },
          { judul: "Bersih", jenis: "rupiah" }, { judul: "Status" },
        ],
        baris: semua.map((r) => [
          r.id, r.time, r.product, r.qty, r.barber, r.seller, r.totalOmzet, r.discount ?? 0, r.totalOmzet - (r.discount ?? 0), r.status,
        ]),
      },
    ],
  }
}

const periodeSaja = (o: OpsiEkspor) => `Periode ${rentangTeks(o)}`

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
      { label: "Kasbon masih aktif", nilai: nilai([...per("Aktif"), ...per("Menunggu")]), jenis: "rupiah" },
      { label: "Kasbon lunas", nilai: nilai(per("Lunas")), jenis: "rupiah" },
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
