// Padanan KASBON, GAJI, RINGKASAN LAPORAN, ABSENSI, AUDIT di Kode.js.
import {
  ApiError, db, gagal, jamHhmm, ok, penggunaDariToken, simpanFoto, tanggalIso, tulisAudit, verifyPin, wajibRole, type Pengguna,
} from "../util.ts"

type B = Record<string, any> // deno-lint-ignore-line no-explicit-any
const toInt = (v: unknown) => parseInt(String(v), 10)
const ID = (p: string) => p + "-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8)

async function wajibLogin(token?: string) {
  const u = await penggunaDariToken(token)
  if (!u || u.status !== "Aktif") throw new ApiError("Session tidak valid.", "UNAUTHORIZED")
  return u
}
const forbidden = (m = "Akses ditolak.") => new ApiError(m, "FORBIDDEN")

// ================= KASBON =================
export async function listKasbon(body: B) {
  const user = await wajibLogin(body.token)
  let q = db.from("kasbon").select("*")
  if (user.role === "Kapster") q = q.eq("user_id", user.id)
  if (user.role === "Kasir") q = q.eq("dibuat_oleh", user.nama)
  const { data } = await q.order("urut", { ascending: false }) // terbaru dulu, seperti GAS
  return ok((data ?? []).map((r) => ({
    id: r.id, tanggal: r.tanggal || "", userId: r.user_id, nama: r.nama, role: r.role,
    jumlah: toInt(r.jumlah) || 0, status: r.status, catatan: r.catatan || "", dibuatOleh: r.dibuat_oleh || "",
    lunasWaktu: r.lunas_waktu ? tanggalIso(new Date(r.lunas_waktu)) : "",
  })))
}

export async function createKasbon(body: B) {
  const user = await wajibLogin(body.token)
  let userId = String(body.userId || user.id).trim()
  let nama = String(body.nama || user.nama).trim()
  let role = String(body.role || user.role).trim()
  const jumlah = toInt(body.jumlah)
  const catatan = String(body.catatan ?? "").trim()
  const tanggal = body.tanggal || tanggalIso()
  if (user.role === "Kapster" && userId !== user.id)
    throw forbidden("Kapster hanya dapat mengajukan kasbon untuk dirinya sendiri.")
  if (isNaN(jumlah) || jumlah <= 0) return gagal("Jumlah kasbon harus angka lebih dari 0.")

  let status = "Aktif"
  if (user.role === "Kasir") {
    status = "Menunggu"
    const { data: k } = await db.from("users").select("nama,role,status").eq("id", userId).maybeSingle()
    if (!k || k.role !== "Kapster" || k.status !== "Aktif") return gagal("Kapster tidak ditemukan atau tidak aktif.")
    nama = k.nama; role = "Kapster"
  }
  const id = ID("ksb")
  const { error } = await db.from("kasbon").insert({
    id, tanggal, user_id: userId, nama, role, jumlah, status, catatan, dibuat_oleh: user.nama,
  })
  if (error) throw new Error(error.message)
  await tulisAudit(user.id, user.nama, status === "Menunggu" ? "AJUKAN_KASBON" : "TAMBAH_KASBON",
    `Kasbon baru untuk ${nama} sebesar Rp ${jumlah}`)
  return ok({ id, tanggal, userId, nama, role, jumlah, status, catatan }, "Kasbon berhasil dicatat.")
}

export async function lunasiKasbon(body: B) {
  const user = await wajibRole(body.token, ["Owner"])
  const id = String(body.id ?? "").trim()
  const { data } = await db.from("kasbon").update({ status: "Lunas", lunas_waktu: new Date().toISOString() }).eq("id", id).select("id")
  if (!data?.length) return gagal("Kasbon tidak ditemukan.")
  await tulisAudit(user.id, user.nama, "LUNASI_KASBON", "Melunasi kasbon ID " + id)
  return ok(undefined, "Kasbon berhasil dilunasi.")
}

export async function keputusanKasbon(body: B, keputusan: "Aktif" | "Ditolak") {
  const user = await wajibRole(body.token, ["Owner"])
  const id = String(body.id ?? "").trim()
  const { data: r } = await db.from("kasbon").select("*").eq("id", id).maybeSingle()
  if (!r) return gagal("Kasbon tidak ditemukan.")
  if (r.status !== "Menunggu") return gagal("Hanya pengajuan berstatus Menunggu yang bisa diputuskan.")
  await db.from("kasbon").update({ status: keputusan }).eq("id", id)
  await tulisAudit(user.id, user.nama, keputusan === "Aktif" ? "SETUJUI_KASBON" : "TOLAK_KASBON",
    `Kasbon ${r.nama} Rp ${r.jumlah} (${id})`)
  return ok(undefined, keputusan === "Aktif" ? "Kasbon disetujui." : "Pengajuan kasbon ditolak.")
}

// ================= GAJI =================
export async function hitungGaji(body: B) {
  const user = await wajibLogin(body.token)
  const target = String(body.userId || user.id).trim()
  if (user.role === "Kapster" && target !== user.id) throw forbidden()

  // Komisi dihitung sejak gaji terakhir dibayar supaya yang sudah dibayar tidak terhitung lagi.
  const { data: dibayar } = await db.from("gaji").select("tanggal_bayar").eq("user_id", target).eq("status", "Dibayar")
    .not("tanggal_bayar", "is", null).order("tanggal_bayar", { ascending: false }).limit(1)
  const sejak = dibayar?.[0]?.tanggal_bayar ?? null

  let qt = db.from("transaksi").select("id").in("status", ["Lunas", "Selesai"])
  if (sejak) qt = qt.gt("waktu", sejak)
  const { data: trx } = await qt.limit(50000)
  const ok_ = new Set((trx ?? []).map((t) => t.id))
  let totalKomisi = 0, countTrx = 0
  const { data: items } = await db.from("transaksi_item").select("trx_id,nama,komisi").eq("kapster_id", target).limit(50000)
  for (const i of items ?? []) {
    if (!ok_.has(i.trx_id)) continue
    totalKomisi += parseInt(i.komisi, 10) || 0; countTrx++
  }
  const { data: kas } = await db.from("kasbon").select("id,tanggal,jumlah,catatan").eq("user_id", target).eq("status", "Aktif")
  let totalKasbon = 0
  const kasbonAktif = (kas ?? []).map((k) => {
    const jml = toInt(k.jumlah) || 0
    totalKasbon += jml
    return { id: k.id, tanggal: k.tanggal, jumlah: jml, catatan: k.catatan }
  })
  return ok({
    userId: target, totalKomisi, totalKasbon, gajiBersih: Math.max(0, totalKomisi - totalKasbon),
    transaksiSelesai: countTrx, kasbonAktif,
  })
}

export async function bayarGaji(body: B) {
  const user = await wajibRole(body.token, ["Owner"])
  const target = String(body.userId ?? "").trim()
  const nama = String(body.nama ?? "").trim()
  const role = String(body.role || "Kapster").trim()
  const periode = String(body.periode || tanggalIso().slice(0, 7)).trim()
  const totalKomisi = toInt(body.totalKomisi) || 0
  const totalKasbon = toInt(body.totalKasbon) || 0
  const gajiBersih = toInt(body.gajiBersih) || Math.max(0, totalKomisi - totalKasbon)
  const catatan = String(body.catatan ?? "").trim()
  if (!target || !nama) return gagal("User penerima gaji wajib diisi.")
  const id = ID("gji")
  const now = new Date().toISOString()
  const { error } = await db.from("gaji").insert({
    id, periode, user_id: target, nama, role, total_komisi: totalKomisi, total_kasbon: totalKasbon,
    gaji_bersih: gajiBersih, status: "Dibayar", tanggal_bayar: now, dibayar_oleh: user.nama, catatan,
  })
  if (error) throw new Error(error.message)
  await db.from("kasbon").update({ status: "Lunas", lunas_waktu: now }).eq("user_id", target).eq("status", "Aktif")
  await tulisAudit(user.id, user.nama, "BAYAR_GAJI", `Membayar gaji periode ${periode} untuk ${nama} sebesar Rp ${gajiBersih}`)
  return ok({ id, gajiBersih, status: "Dibayar" }, `Pembayaran gaji untuk ${nama} berhasil dicatat.`)
}

export async function listGaji(body: B) {
  const user = await wajibLogin(body.token)
  let q = db.from("gaji").select("*").order("urut", { ascending: false })
  if (user.role === "Kapster") q = q.eq("user_id", user.id)
  const { data } = await q
  return ok((data ?? []).map((r) => ({
    id: r.id, periode: r.periode, userId: r.user_id, nama: r.nama, role: r.role,
    totalKomisi: toInt(r.total_komisi) || 0, totalKasbon: toInt(r.total_kasbon) || 0, gajiBersih: toInt(r.gaji_bersih) || 0,
    status: r.status, tanggalBayar: r.tanggal_bayar ? tanggalIso(new Date(r.tanggal_bayar)) : "",
    dibayarOleh: r.dibayar_oleh || "", catatan: r.catatan || "",
  })))
}

// ================= RINGKASAN LAPORAN (versi lama Tim B) =================
export async function ringkasanLaporan(body: B) {
  await wajibRole(body.token, ["Owner"])
  const dari = String(body.dari ?? "").trim(), sampai = String(body.sampai ?? "").trim()
  let qt = db.from("transaksi").select("tanggal,total,diskon,bayar_tunai,bayar_qris,komisi_total").in("status", ["Lunas", "Selesai"])
  if (dari) qt = qt.gte("tanggal", dari)
  if (sampai) qt = qt.lte("tanggal", sampai)
  const { data: trx } = await qt.limit(20000)
  let totalOmset = 0, totalDiskon = 0, totalBayarTunai = 0, totalBayarQris = 0, totalKomisi = 0
  const daily: Record<string, B> = {}
  for (const t of trx ?? []) {
    const total = parseInt(t.total, 10) || 0, tunai = parseInt(t.bayar_tunai, 10) || 0, qris = parseInt(t.bayar_qris, 10) || 0
    totalOmset += total; totalDiskon += parseInt(t.diskon, 10) || 0
    totalBayarTunai += tunai; totalBayarQris += qris; totalKomisi += parseInt(t.komisi_total, 10) || 0
    const d = (daily[t.tanggal] ??= { tanggal: t.tanggal, omset: 0, tunai: 0, qris: 0, count: 0 })
    d.omset += total; d.tunai += tunai; d.qris += qris; d.count++
  }
  let qe = db.from("pengeluaran").select("tanggal,kategori,jumlah").eq("status", "Aktif")
  if (dari) qe = qe.gte("tanggal", dari)
  if (sampai) qe = qe.lte("tanggal", sampai)
  const { data: peng } = await qe
  let totalPengeluaran = 0
  const pengeluaranKategori: Record<string, number> = {}
  for (const e of peng ?? []) {
    const j = parseInt(e.jumlah, 10) || 0, k = e.kategori || "Lain-lain"
    totalPengeluaran += j; pengeluaranKategori[k] = (pengeluaranKategori[k] || 0) + j
  }
  return ok({
    totalOmset, totalDiskon, totalBayarTunai, totalBayarQris, totalKomisi, totalPengeluaran,
    sisaOwner: totalOmset - totalPengeluaran - totalKomisi, jumlahTransaksi: (trx ?? []).length,
    pengeluaranKategori, harian: Object.values(daily),
  })
}

// ================= ABSENSI =================
const bentukAbsensi = (r: B) => ({
  id: r.id, waktu: r.waktu, tanggal: r.tanggal, jam: r.jam || "", userId: r.user_id, nama: r.nama,
  role: r.role, tipe: r.tipe, fotoUrl: r.foto_url || "", status: r.status, catatan: r.catatan || "",
})

export async function catatAbsensi(body: B) {
  const user = await wajibLogin(body.token)
  const tipe = body.tipe === "Pulang" ? "Pulang" : "Masuk"
  const fotoUrl = String(body.fotoUrl ?? "").trim()
  const catatan = String(body.catatan ?? "").trim()
  const now = new Date(), tgl = tanggalIso(now), jam = jamHhmm(now)
  const id = ID("abs")
  const foto = await simpanFoto(fotoUrl, user.id)
  const { error } = await db.from("absensi").insert({
    id, waktu: now.toISOString(), tanggal: tgl, jam, user_id: user.id, nama: user.nama, role: user.role,
    tipe, foto_url: foto, status: "Hadir", catatan,
  })
  if (error) throw new Error(error.message)
  await tulisAudit(user.id, user.nama, "ABSENSI", `Absensi ${tipe} pada ${jam}`)
  return ok({ id, waktu: now.toISOString(), tanggal: tgl, jam, nama: user.nama, tipe, status: "Hadir" }, `Absensi ${tipe} berhasil dicatat.`)
}

export async function listAbsensi(body: B) {
  const user = await wajibLogin(body.token)
  let q = db.from("absensi").select("*").order("waktu", { ascending: false })
  if (user.role === "Kapster") q = q.eq("user_id", user.id)
  const uid = String(body.userId ?? "").trim(), tgl = String(body.tanggal ?? "").trim()
  if (uid) q = q.eq("user_id", uid)
  if (tgl) q = q.eq("tanggal", tgl)
  const { data } = await q.limit(5000)
  return ok((data ?? []).map(bentukAbsensi))
}

export async function koreksiAbsensi(body: B) {
  const user = await wajibRole(body.token, ["Owner"])
  const id = String(body.id ?? "").trim(), status = String(body.status ?? "").trim(), catatan = String(body.catatan ?? "").trim()
  if (!id) return gagal("ID absensi wajib disertakan.")
  if (!status) return gagal("Status koreksi wajib diisi.")
  const { data: r } = await db.from("absensi").select("nama,catatan").eq("id", id).maybeSingle()
  if (!r) return gagal("Data absensi dengan ID tersebut tidak ditemukan.")
  const ubah: B = { status }
  if (catatan) ubah.catatan = r.catatan ? `${r.catatan} | Koreksi: ${catatan}` : `Koreksi: ${catatan}`
  await db.from("absensi").update(ubah).eq("id", id)
  await tulisAudit(user.id, user.nama, "KOREKSI_ABSENSI", `Koreksi absensi ${r.nama || id} (${id}) menjadi: ${status}`,
    catatan || "Persetujuan koreksi kehadiran")
  return ok({ id, status, koreksiOleh: user.nama }, "Koreksi absensi berhasil disimpan.")
}

export async function verifikasiPinKapster(body: B) {
  const user = await wajibRole(body.token, ["Kasir"])
  const target = String(body.targetUserId ?? "").trim(), pin = String(body.pin ?? "").trim()
  if (!target) return gagal("ID Kapster wajib disertakan.")
  if (!/^\d{6}$/.test(pin)) return gagal("PIN harus 6 digit angka.")
  const kunci = `pinkap_${user.id}_${target}`
  const { data: c } = await db.from("login_gagal").select("*").eq("username", kunci).maybeSingle()
  if (c?.kunci_sampai && new Date(c.kunci_sampai) > new Date())
    return gagal("PIN Kapster terkunci sementara karena 5 kali salah. Silakan coba lagi dalam 5 menit.")
  const { data: t } = await db.from("users").select("*").eq("id", target).maybeSingle()
  if (!t) return gagal("Kapster tidak ditemukan.")
  if (t.role !== "Kapster") return gagal("Akun yang dipilih bukan Kapster.")
  if (t.status !== "Aktif") return gagal("Akun Kapster sudah dinonaktifkan.")
  if (!(await verifyPin(pin, t.pin_hash || ""))) {
    const segar = c && Date.now() - new Date(c.terakhir).getTime() < 300_000
    const jumlah = (segar ? c!.jumlah : 0) + 1
    if (jumlah >= 5) {
      await db.from("login_gagal").upsert({ username: kunci, jumlah: 0, terakhir: new Date().toISOString(),
        kunci_sampai: new Date(Date.now() + 300_000).toISOString() })
      await tulisAudit(user.id, user.nama, "PIN_KAPSTER_LOCKOUT", `PIN Kapster terkunci 5 menit setelah 5x salah: ${target}`)
      return gagal("PIN salah. Akun terkunci sementara. Coba lagi dalam 5 menit.")
    }
    await db.from("login_gagal").upsert({ username: kunci, jumlah, terakhir: new Date().toISOString(), kunci_sampai: null })
    return gagal("PIN Kapster salah.")
  }
  await db.from("login_gagal").delete().eq("username", kunci)
  await tulisAudit(user.id, user.nama, "PIN_KAPSTER_OK", `PIN Kapster diverifikasi: ${target} (${t.nama})`)
  return ok({ valid: true, targetUserId: target, nama: t.nama })
}

export async function catatAbsensiKapster(body: B) {
  const user = await wajibRole(body.token, ["Kasir"])
  const target = String(body.targetUserId ?? "").trim(), tanggal = String(body.tanggal ?? "").trim()
  const status = String(body.status ?? "").trim(), fotoUrl = String(body.fotoUrl ?? "").trim()
  const catatan = String(body.catatan ?? "").trim()
  if (!target) return gagal("ID Kapster wajib disertakan.")
  if (!tanggal) return gagal("Tanggal wajib diisi.")
  if (!status) return gagal("Status wajib diisi.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return gagal("Format tanggal tidak valid.")
  const d = new Date(tanggal + "T00:00:00+07:00")
  if (isNaN(d.getTime()) || tanggalIso(d) !== tanggal) return gagal("Tanggal tidak valid.")
  if (!["Hadir", "Izin", "Sakit", "Cuti"].includes(status)) return gagal("Status tidak valid. Pilih Hadir / Izin / Sakit / Cuti.")
  if (status === "Hadir" && (!/^data:image\/jpeg;base64,/.test(fotoUrl) || fotoUrl.length > 45000))
    return gagal("Foto wajah wajib diambil ulang dengan ukuran lebih kecil.")
  if (status !== "Hadir" && !catatan) return gagal("Keterangan wajib diisi.")
  if (status !== "Hadir" && tanggal < tanggalIso())
    return gagal("Izin, sakit, atau cuti tidak bisa diajukan untuk tanggal lampau.")
  if (status === "Cuti" && tanggal <= tanggalIso())
    return gagal("Cuti hanya bisa diajukan untuk besok atau setelahnya.")
  const { data: t } = await db.from("users").select("nama,role").eq("id", target).maybeSingle()
  if (!t) return gagal("Kapster tidak ditemukan.")
  if (t.role !== "Kapster") return gagal("Akun yang dipilih bukan Kapster.")

  if (status !== "Hadir") {
    const { data: ganda } = await db.from("absensi").select("status").eq("user_id", target).eq("tanggal", tanggal)
      .neq("status", "Hadir").limit(1)
    if (ganda?.length) return gagal(`${t.nama} sudah tercatat ${ganda[0].status} pada tanggal itu.`)
  }
  const now = new Date(), jam = jamHhmm(now), id = ID("abs")
  const foto = await simpanFoto(fotoUrl, target)
  const { error } = await db.from("absensi").insert({
    id, waktu: now.toISOString(), tanggal, jam, user_id: target, nama: t.nama, role: "Kapster", tipe: "",
    foto_url: foto, status, catatan,
  })
  if (error) throw new Error(error.message)
  await tulisAudit(user.id, user.nama, "ABSENSI_KASIR",
    `Kasir mencatat absensi Kapster ${t.nama} (${status}) pada ${tanggal}`, catatan || "Absensi harian Kapster")
  return ok({ id, waktu: now.toISOString(), tanggal, jam, userId: target, nama: t.nama, role: "Kapster", tipe: "",
    fotoUrl: foto, status, catatan }, `Absensi ${t.nama} berhasil dicatat (${status}).`)
}

// ================= AUDIT =================
export async function listAudit(body: B) {
  await wajibRole(body.token, ["Owner"])
  const tgl = String(body.tanggal ?? "").trim()
  const aksi = String(body.aksi ?? "").trim().toUpperCase()
  const pengguna = String(body.userId || body.user || "").trim().toLowerCase()
  let q = db.from("audit_log").select("*").order("id", { ascending: false }).limit(3000)
  if (aksi && aksi !== "SEMUA") q = q.ilike("aksi", aksi)
  const { data } = await q
  const hasil = (data ?? []).map((r) => {
    const w = new Date(r.waktu)
    return { waktu: w.toISOString(), tanggal: tanggalIso(w), jam: jamHhmm(w), userId: r.user_id || "",
      namaUser: r.nama_user || "", aksi: r.aksi || "", detail: r.detail || "", alasan: r.alasan || "" }
  }).filter((r) => (!tgl || r.tanggal === tgl) &&
    (!pengguna || pengguna === "semua" || r.userId.toLowerCase() === pengguna || r.namaUser.toLowerCase() === pengguna))
  return ok(hasil)
}
