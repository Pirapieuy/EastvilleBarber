// ============================================================
// EASTVILLE BARBERSHOP - Backend Bisnis (Kasir, Riwayat, Pengeluaran, Stok)
// ============================================================
// File terpisah dari Kode.js (login). Dipanggil lewat routeBisnis()
// dari default-case doPost di Kode.js. Memakai ulang: getSheet, getSpreadsheet,
// jsonResponse, generateId, writeAuditLog.
//
// Semua action WAJIB kirim { token }. Role dicek di server.
// ============================================================

var SHEET_LAYANAN = "Layanan";
var SHEET_PRODUK = "Produk";
var SHEET_TRANSAKSI = "Transaksi";
var SHEET_TRX_ITEM = "TransaksiItem";
var SHEET_PENGELUARAN = "Pengeluaran";
var SHEET_STOK_MUTASI = "StokMutasi";
var SHEET_PRODUK_LOG = "ProdukLog";

var SHEET_PENGATURAN = "Pengaturan";
var SHEET_KOMISI_KAPSTER = "KomisiKapster";

// Nilai awal pengaturan (bisa diubah lewat action simpan-pengaturan / sheet Pengaturan).
// Jam disimpan sebagai angka HHMM (1000 = 10:00) supaya Sheets tidak mengubahnya jadi format waktu.
var PENGATURAN_DEFAULT = {
  jam_mulai: 1000,
  jam_selesai: 2100,
  komisi_default: 40,   // % layanan untuk kapster di jam kerja
  komisi_lembur: 50     // % layanan untuk kapster di luar jam kerja
};
var SCHEMA_VERSION = "5";

var HEADERS = {
  Layanan: ["id", "nama", "harga", "status", "kategori"],
  Produk: [
    "kode", "nama", "penjual", "stok", "skema", "status", "harga", "harga_modal",
    "persen_kapster", "persen_penjual", "persen_eastville",
    "nominal_kapster", "nominal_penjual", "nominal_eastville"
  ],
  Transaksi: [
    "id", "waktu", "tanggal", "jam", "metode", "subtotal", "diskon", "total",
    "bayar_tunai", "bayar_qris", "komisi_total", "status",
    "dibuat_oleh_id", "dibuat_oleh", "void_alasan", "void_oleh", "void_waktu", "lembur",
    "manual", "nota_buku", "gratis"
  ],
  TransaksiItem: [
    "trx_id", "tipe", "ref_id", "nama", "qty", "harga", "kapster_id", "kapster", "komisi", "komisi_persen"
  ],
  Pengeluaran: [
    "id", "tanggal", "kategori", "deskripsi", "jumlah", "status",
    "alasan_batal", "dibuat_oleh", "waktu"
  ],
  StokMutasi: ["waktu", "kode", "delta", "stok_akhir", "alasan", "trx_id", "oleh"],
  ProdukLog: ["waktu", "kode", "produk", "perubahan", "oleh", "alasan"],
  Pengaturan: ["key", "value"],
  KomisiKapster: ["user_id", "persen", "diubah_oleh", "waktu"]
};

var STOK_MENIPIS = 3; // produk aktif dengan stok <= angka ini muncul di "Perlu perhatian"
var KATEGORI_PENGELUARAN = ["Perlengkapan", "Listrik", "Air", "Sewa", "Lain-lain"];

// ---- Hak akses per action ----
var AKSES = {
  "list-layanan":        ["Owner", "Manajer", "Kasir", "Kapster"],
  "list-produk":         ["Owner", "Manajer", "Kasir", "Kapster"],
  "list-kapster":        ["Owner", "Manajer", "Kasir"],
  "create-transaksi":    ["Kasir"],
  "list-transaksi":      ["Owner", "Manajer", "Kasir"],
  "batalkan-transaksi":  ["Owner", "Manajer", "Kasir"],
  "pulihkan-transaksi":  ["Owner", "Manajer"],
  "list-pengeluaran":    ["Owner", "Manajer"],
  "create-pengeluaran":  ["Owner", "Manajer"],
  "batalkan-pengeluaran": ["Owner", "Manajer"],
  "aktifkan-pengeluaran": ["Owner", "Manajer"],
  "simpan-produk":       ["Owner", "Manajer"],
  "adjust-stok":         ["Owner", "Manajer"],
  "log-produk":          ["Owner", "Manajer"],
  "get-pengaturan":      ["Owner", "Manajer"],
  "simpan-pengaturan":   ["Owner", "Manajer"],
  "set-komisi-kapster":  ["Owner", "Manajer"],
  "list-komisi":         ["Owner", "Manajer", "Kapster"],
  "simpan-layanan":      ["Owner", "Manajer"],
  "create-transaksi-manual": ["Owner", "Manajer", "Kasir"],
  "laporan-keuangan":    ["Owner", "Manajer"],
  "laporan-produk":      ["Owner", "Manajer"],
  "backup-buat":         ["Owner"],
  "backup-list":         ["Owner"],
  "backup-pulihkan":     ["Owner"]
};

var KATEGORI_LAYANAN = ["Potong", "Grooming", "Coloring", "Perawatan"];
var KATEGORI_AWAL = { "Haircut": "Potong", "Haircut + Cuci": "Potong", "Shaving": "Grooming", "Hair Coloring": "Coloring", "Treatment": "Perawatan" };


// ============================================================
// SETUP - jalankan sekali: buat sheet bisnis + data awal
// ============================================================
function setupBisnis() {
  var ss = getSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight("bold");
    }
  });

  var layanan = ss.getSheetByName(SHEET_LAYANAN);
  if (layanan.getLastRow() === 1) {
    layanan.getRange(2, 1, 5, 5).setValues([
      [1, "Haircut", 40000, "Aktif", "Potong"],
      [2, "Haircut + Cuci", 50000, "Aktif", "Potong"],
      [3, "Shaving", 25000, "Aktif", "Grooming"],
      [4, "Hair Coloring", 120000, "Aktif", "Coloring"],
      [5, "Treatment", 60000, "Aktif", "Perawatan"]
    ]);
  }
  var produk = ss.getSheetByName(SHEET_PRODUK);
  if (produk.getLastRow() === 1) {
    produk.getRange(2, 1, 4, 14).setValues([
      ["HP-FSD-01", "Free Style Dust", "HAIRPRO Official", 3, "Persentase", "Aktif", 70000, 42000, 10, 60, 30, 7000, 42000, 21000],
      ["HP-HPP-02", "Hair Paste Pomade", "HAIRPRO Official", 8, "Nominal tetap", "Aktif", 70000, 40000, 14.3, 57.1, 28.6, 10000, 40000, 20000],
      ["HP-WBP-03", "Water Based Pomade", "Mitra Grooming", 5, "Persentase", "Aktif", 70000, 42000, 10, 60, 30, 7000, 42000, 21000],
      ["HP-MT-04", "Miracle Treatment", "Mitra Grooming", 0, "Nominal tetap", "Nonaktif", 70000, 40000, 14.3, 57.1, 28.6, 10000, 40000, 20000]
    ]);
  }
  Logger.log("setupBisnis selesai.");
}


// ============================================================
// ROUTER - dipanggil dari doPost (Kode.js) untuk action yang tidak dikenal
// Return ContentService output, atau null kalau bukan action bisnis.
// ============================================================
function routeBisnis(action, body) {
  if (!AKSES[action]) return null;

  var user = authBisnis_(body.token);
  if (!user) {
    return jsonResponse({ success: false, error: "Session tidak valid. Silakan login lagi.", code: "UNAUTHORIZED" });
  }
  if (AKSES[action].indexOf(user.role) === -1) {
    return jsonResponse({ success: false, error: "Peran " + user.role + " tidak boleh melakukan aksi ini.", code: "FORBIDDEN" });
  }

  ensureSchema_();

  // Aksi yang menulis data dikunci supaya stok/ID tidak balapan.
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (action) {
      case "list-layanan":         return ok_(listLayanan_());
      case "list-produk":          return ok_(listProduk_());
      case "list-kapster":         return ok_(listKapster_());
      case "create-transaksi":     return createTransaksi_(body, user);
      case "create-transaksi-manual": return createTransaksi_(body, user, true);
      case "list-transaksi":       return listTransaksi_(body, user);
      case "batalkan-transaksi":   return batalkanTransaksi_(body, user);
      case "pulihkan-transaksi":   return pulihkanTransaksi_(body, user);
      case "list-pengeluaran":     return ok_(listPengeluaran_());
      case "create-pengeluaran":   return createPengeluaran_(body, user);
      case "batalkan-pengeluaran": return batalkanPengeluaran_(body, user);
      case "aktifkan-pengeluaran": return aktifkanPengeluaran_(body, user);
      case "simpan-produk":        return simpanProduk_(body, user);
      case "adjust-stok":          return adjustStok_(body, user);
      case "log-produk":           return ok_(readTable_(SHEET_PRODUK_LOG).reverse());
      case "get-pengaturan":       return ok_(bentukPengaturan_());
      case "simpan-pengaturan":    return simpanPengaturan_(body, user);
      case "set-komisi-kapster":   return setKomisiKapster_(body, user);
      case "list-komisi":          return listKomisi_(body, user);
      case "simpan-layanan":       return simpanLayanan_(body, user);
      case "laporan-keuangan":     return laporanKeuangan_(body);
      case "laporan-produk":       return laporanProduk_(body);
      case "backup-buat":          return backupBuat_(user);
      case "backup-list":          return ok_(backupList_());
      case "backup-pulihkan":      return backupPulihkan_(body, user);
    }
  } finally {
    lock.releaseLock();
  }
  return null;
}


// ============================================================
// HELPER
// ============================================================
function ok_(data) {
  return jsonResponse({ success: true, data: data });
}
function fail_(msg) {
  return jsonResponse({ success: false, error: msg });
}

/** Cek token ke sheet Sessions, balikin {id, nama, role} atau null. */
function authBisnis_(token) {
  token = (token || "").toString().trim();
  if (!token) return null;
  var sessions = getSheet(SHEET_SESSIONS).getDataRange().getValues();
  var userId = null;
  for (var i = 1; i < sessions.length; i++) {
    if (sessions[i][0] === token && sessions[i][4] === "Aktif") {
      if (new Date() > new Date(sessions[i][3])) return null;
      userId = sessions[i][1];
      break;
    }
  }
  if (!userId) return null;
  var users = getSheet(SHEET_USERS).getDataRange().getValues();
  for (var j = 1; j < users.length; j++) {
    if (users[j][0] === userId && users[j][7] === "Aktif") {
      return { id: users[j][0], nama: users[j][1], role: users[j][4] };
    }
  }
  return null;
}

/** Baca satu sheet jadi array objek berdasarkan baris header. */
function readTable_(name) {
  var values = getSheet(name).getDataRange().getValues();
  var head = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var o = { _row: i + 1 };
    for (var c = 0; c < head.length; c++) o[head[c]] = values[i][c];
    rows.push(o);
  }
  return rows;
}

function appendObj_(name, obj) {
  var head = HEADERS[name];
  getSheet(name).appendRow(head.map(function (h) { return obj[h] === undefined ? "" : obj[h]; }));
}

function setCell_(name, row, header, value) {
  getSheet(name).getRange(row, HEADERS[name].indexOf(header) + 1).setValue(value);
}

function fmtTanggal_(d, pola) {
  return Utilities.formatDate(d, "Asia/Jakarta", pola);
}

function toInt_(v) {
  var n = Math.round(Number(v));
  return isNaN(n) ? 0 : n;
}

function stripRow_(o) {
  var c = {};
  Object.keys(o).forEach(function (k) { if (k !== "_row") c[k] = o[k]; });
  return c;
}


// ============================================================
// SKEMA & PENGATURAN
// ============================================================

/**
 * Membuat sheet yang belum ada dan menambah kolom baru di kanan header lama,
 * sekali per SCHEMA_VERSION (ditandai di CacheService). Aman dijalankan berulang.
 */
function ensureSchema_() {
  var cache = CacheService.getScriptCache();
  if (cache.get("bisnis_schema") === SCHEMA_VERSION) return;
  var ss = getSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var head = HEADERS[name];
    var cur = sh.getLastRow() === 0 ? [] : sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
    while (cur.length && cur[cur.length - 1] === "") cur.pop();
    for (var i = cur.length; i < head.length; i++) {
      sh.getRange(1, i + 1).setValue(head[i]).setFontWeight("bold");
    }
  });
  // Isi kategori untuk layanan bawaan yang kolomnya baru ditambahkan (hanya sel kosong).
  readTable_(SHEET_LAYANAN).forEach(function (l) {
    if (l.kategori === "" && KATEGORI_AWAL[l.nama]) setCell_(SHEET_LAYANAN, l._row, "kategori", KATEGORI_AWAL[l.nama]);
  });
  var peng = ss.getSheetByName(SHEET_PENGATURAN);
  if (peng.getLastRow() < 2) {
    Object.keys(PENGATURAN_DEFAULT).forEach(function (k) { peng.appendRow([k, PENGATURAN_DEFAULT[k]]); });
  }
  cache.put("bisnis_schema", SCHEMA_VERSION, 21600);
}

function getPengaturan_() {
  var p = {};
  Object.keys(PENGATURAN_DEFAULT).forEach(function (k) { p[k] = PENGATURAN_DEFAULT[k]; });
  readTable_(SHEET_PENGATURAN).forEach(function (r) {
    if (p.hasOwnProperty(r.key) && r.value !== "") p[r.key] = Number(r.value);
  });
  return p;
}

function komisiOverride_() {
  var m = {};
  readTable_(SHEET_KOMISI_KAPSTER).forEach(function (r) { if (r.persen !== "") m[r.user_id] = Number(r.persen); });
  return m;
}

function hhmm_(n) { return ("0000" + n).slice(-4).replace(/(\d\d)(\d\d)/, "$1:$2"); }
function parseHhmm_(str) {
  var m = /^(\d{1,2}):(\d{2})$/.exec((str || "").toString().trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 100 + Number(m[2]);
}

/** true kalau jam (HHMM) di luar [jam_mulai, jam_selesai). */
function isLembur_(hhmmNow, p) {
  return !(hhmmNow >= p.jam_mulai && hhmmNow < p.jam_selesai);
}

function bentukPengaturan_() {
  var p = getPengaturan_(), ov = komisiOverride_();
  var kapster = getSheet(SHEET_USERS).getDataRange().getValues().slice(1)
    .filter(function (u) { return u[4] === "Kapster" && u[7] === "Aktif"; })
    .map(function (u) { return { id: u[0], nama: u[1], persen: ov[u[0]] === undefined ? null : ov[u[0]] }; });
  return {
    jamMulai: hhmm_(p.jam_mulai), jamSelesai: hhmm_(p.jam_selesai),
    komisiDefault: p.komisi_default, komisiLembur: p.komisi_lembur, kapster: kapster
  };
}

function upsertPengaturan_(key, value) {
  var r = readTable_(SHEET_PENGATURAN).filter(function (x) { return x.key === key; })[0];
  if (r) setCell_(SHEET_PENGATURAN, r._row, "value", value);
  else appendObj_(SHEET_PENGATURAN, { key: key, value: value });
}

/** Body: { jamMulai:"10:00", jamSelesai:"21:00", komisiDefault, komisiLembur, alasan } */
function simpanPengaturan_(body, user) {
  var mulai = parseHhmm_(body.jamMulai), selesai = parseHhmm_(body.jamSelesai);
  if (mulai === null || selesai === null) return fail_("Format jam harus HH:MM, contoh 10:00.");
  if (mulai >= selesai) return fail_("Jam selesai harus setelah jam mulai.");
  var kd = Number(body.komisiDefault), kl = Number(body.komisiLembur);
  if (isNaN(kd) || isNaN(kl) || kd < 0 || kd > 100 || kl < 0 || kl > 100) return fail_("Persen komisi harus 0-100.");
  var alasan = (body.alasan || "").trim();
  if (!alasan) return fail_("Alasan perubahan wajib diisi.");

  var lama = getPengaturan_();
  var baru = { jam_mulai: mulai, jam_selesai: selesai, komisi_default: kd, komisi_lembur: kl };
  var beda = [];
  Object.keys(baru).forEach(function (k) {
    if (Number(lama[k]) !== baru[k]) {
      beda.push(k + " " + lama[k] + " → " + baru[k]);
      upsertPengaturan_(k, baru[k]);
    }
  });
  if (beda.length) writeAuditLog(user.id, user.nama, "UBAH_PENGATURAN", beda.join("; ") + " — " + alasan);
  return ok_(bentukPengaturan_());
}

/** Body: { userId, persen (angka 0-100, atau null untuk kembali ke default), alasan } */
function setKomisiKapster_(body, user) {
  var alasan = (body.alasan || "").trim();
  if (!alasan) return fail_("Alasan perubahan komisi wajib diisi.");
  var kap = getSheet(SHEET_USERS).getDataRange().getValues().slice(1)
    .filter(function (u) { return u[0] === body.userId && u[4] === "Kapster"; })[0];
  if (!kap) return fail_("Kapster tidak ditemukan.");
  var persen = body.persen === null || body.persen === "" || body.persen === undefined ? "" : Number(body.persen);
  if (persen !== "" && (isNaN(persen) || persen < 0 || persen > 100)) return fail_("Persen komisi harus 0-100.");

  var r = readTable_(SHEET_KOMISI_KAPSTER).filter(function (x) { return x.user_id === body.userId; })[0];
  var oleh = user.nama + " · " + user.role;
  if (r) {
    setCell_(SHEET_KOMISI_KAPSTER, r._row, "persen", persen);
    setCell_(SHEET_KOMISI_KAPSTER, r._row, "diubah_oleh", oleh);
    setCell_(SHEET_KOMISI_KAPSTER, r._row, "waktu", new Date());
  } else {
    appendObj_(SHEET_KOMISI_KAPSTER, { user_id: body.userId, persen: persen, diubah_oleh: oleh, waktu: new Date() });
  }
  writeAuditLog(user.id, user.nama, "UBAH_KOMISI_KAPSTER", kap[1] + ": " + (persen === "" ? "default" : persen + "%") + " — " + alasan);
  return ok_(bentukPengaturan_());
}


// ============================================================
// KATALOG
// ============================================================
function listLayanan_() {
  return readTable_(SHEET_LAYANAN).map(stripRow_);
}
/** Kapster aktif dari sheet Users, untuk pilihan kapster di kasir. */
/**
 * Body: { layanan: { id?, nama, harga, status: "Aktif"|"Nonaktif" } }. Tanpa id = layanan baru.
 * Harga baru tidak mengubah transaksi lama (harga tersimpan di TransaksiItem).
 */
function simpanLayanan_(body, user) {
  var l = body.layanan || {};
  var nama = (l.nama || "").toString().trim();
  var harga = toInt_(l.harga);
  var status = l.status === "Nonaktif" ? "Nonaktif" : "Aktif";
  var kategori = KATEGORI_LAYANAN.indexOf(l.kategori) === -1 ? "Potong" : l.kategori;
  if (!nama) return fail_("Nama layanan wajib diisi.");
  if (harga < 0) return fail_("Harga tidak valid.");

  var semua = readTable_(SHEET_LAYANAN);
  var sama = semua.filter(function (x) { return String(x.nama).toLowerCase() === nama.toLowerCase() && String(x.id) !== String(l.id); });
  if (sama.length) return fail_("Layanan dengan nama itu sudah ada.");

  if (l.id !== undefined && l.id !== "") {
    var lama = semua.filter(function (x) { return String(x.id) === String(l.id); })[0];
    if (!lama) return fail_("Layanan tidak ditemukan.");
    setCell_(SHEET_LAYANAN, lama._row, "nama", nama);
    setCell_(SHEET_LAYANAN, lama._row, "harga", harga);
    setCell_(SHEET_LAYANAN, lama._row, "status", status);
    setCell_(SHEET_LAYANAN, lama._row, "kategori", kategori);
    writeAuditLog(user.id, user.nama, "UBAH_LAYANAN", lama.nama + " Rp " + lama.harga + " " + lama.status + " " + lama.kategori + " → " + nama + " Rp " + harga + " " + status + " " + kategori);
    return ok_({ id: lama.id });
  }
  var id = semua.reduce(function (m, x) { return Math.max(m, Number(x.id) || 0); }, 0) + 1;
  appendObj_(SHEET_LAYANAN, { id: id, nama: nama, harga: harga, status: status, kategori: kategori });
  writeAuditLog(user.id, user.nama, "TAMBAH_LAYANAN", nama + " Rp " + harga + " " + kategori);
  return ok_({ id: id });
}

function listKapster_() {
  return getSheet(SHEET_USERS).getDataRange().getValues().slice(1)
    .filter(function (u) { return u[4] === "Kapster" && u[7] === "Aktif"; })
    .map(function (u) { return { id: u[0], nama: u[1] }; });
}
function listProduk_() {
  return readTable_(SHEET_PRODUK).map(stripRow_);
}


// ============================================================
// TRANSAKSI
// ============================================================

/** Nomor invoice: INV-DDMMYY-NNNN, urut per hari. */
function nextInvoiceId_(now) {
  var tgl = fmtTanggal_(now, "ddMMyy");
  var prefix = "INV-" + tgl + "-";
  var last = 0;
  readTable_(SHEET_TRANSAKSI).forEach(function (t) {
    if (t.id.toString().indexOf(prefix) === 0) {
      last = Math.max(last, parseInt(t.id.toString().slice(prefix.length), 10) || 0);
    }
  });
  return prefix + ("0000" + (last + 1)).slice(-4);
}

/** Komisi kapster untuk 1 baris produk (per unit x qty). */
function komisiProduk_(p, qty) {
  var perUnit = p.skema === "Persentase"
    ? Math.round(Number(p.harga) * Number(p.persen_kapster) / 100)
    : Number(p.nominal_kapster);
  return perUnit * qty;
}

/**
 * Body: { token, metode: "Tunai"|"QRIS"|"Gabungan", diskon, bayarTunai, bayarQris,
 *         items: [{ tipe: "Layanan"|"Produk", refId, qty, kapsterId }] }
 * Harga & komisi dihitung dari sheet, bukan dari client.
 */
function createTransaksi_(body, user, manual) {
  var items = body.items || [];
  if (!items.length) return fail_("Keranjang kosong.");
  if (["Tunai", "QRIS", "Gabungan"].indexOf(body.metode) === -1) return fail_("Metode pembayaran tidak valid.");

  var layananMap = {};
  readTable_(SHEET_LAYANAN).forEach(function (l) { layananMap[l.id] = l; });
  var produkMap = {};
  readTable_(SHEET_PRODUK).forEach(function (p) { produkMap[p.kode] = p; });
  var peng = getPengaturan_(), override = komisiOverride_();
  // Rekap manual: transaksi dari buku, waktunya diambil dari tanggal (+ jam, default 12:00) yang diinput.
  var now = new Date(), notaBuku = "";
  if (manual) {
    var tgl = (body.tanggal || "").toString();
    var jamIn = (body.jam || "12:00").toString();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return fail_("Tanggal transaksi tidak valid.");
    if (parseHhmm_(jamIn) === null) return fail_("Format jam harus HH:MM.");
    if (tgl > fmtTanggal_(new Date(), "yyyy-MM-dd")) return fail_("Tanggal tidak boleh di masa depan.");
    notaBuku = (body.nomorNota || "").toString().trim().toUpperCase();
    if (notaBuku.length < 3) return fail_("Nomor nota dari buku wajib diisi.");
    var dipakai = readTable_(SHEET_TRANSAKSI).some(function (t) { return t.id === notaBuku || t.nota_buku === notaBuku; });
    if (dipakai) return fail_("Nomor nota sudah dipakai.");
    now = new Date(tgl + "T" + jamIn + ":00+07:00");
  }
  var nowJam = Number(fmtTanggal_(now, "HHmm"));
  var lembur = isLembur_(nowJam, peng);
  var kapsterMap = {};
  getSheet(SHEET_USERS).getDataRange().getValues().slice(1).forEach(function (u) {
    if (u[4] === "Kapster") kapsterMap[u[0]] = u[1];
  });

  var subtotal = 0, komisiTotal = 0, lines = [], stokBaru = {};
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var qty = toInt_(it.qty);
    if (qty < 1) return fail_("Qty tidak valid.");
    var namaKapster = kapsterMap[it.kapsterId];
    if (!namaKapster) return fail_("Kapster tidak ditemukan untuk item ke-" + (i + 1) + ".");

    if (it.tipe === "Layanan") {
      var l = layananMap[it.refId];
      if (!l || l.status !== "Aktif") return fail_("Layanan tidak tersedia.");
      var hargaL = Number(l.harga) * qty;
      var persenL = lembur ? peng.komisi_lembur
        : (override[it.kapsterId] !== undefined ? override[it.kapsterId] : peng.komisi_default);
      var kom = Math.round(hargaL * persenL / 100);
      subtotal += hargaL; komisiTotal += kom;
      lines.push({ tipe: "Layanan", ref_id: l.id, nama: l.nama, qty: qty, harga: Number(l.harga), kapster_id: it.kapsterId, kapster: namaKapster, komisi: kom, komisi_persen: persenL });
    } else if (it.tipe === "Produk") {
      var p = produkMap[it.refId];
      if (!p || p.status !== "Aktif") return fail_("Produk tidak tersedia.");
      var sisa = (stokBaru[p.kode] === undefined ? Number(p.stok) : stokBaru[p.kode]) - qty;
      if (sisa < 0) return fail_("Stok " + p.nama + " tidak cukup.");
      stokBaru[p.kode] = sisa;
      var hargaP = Number(p.harga) * qty;
      var komP = komisiProduk_(p, qty);
      subtotal += hargaP; komisiTotal += komP;
      lines.push({ tipe: "Produk", ref_id: p.kode, nama: p.nama, qty: qty, harga: Number(p.harga), kapster_id: it.kapsterId, kapster: namaKapster, komisi: komP });
    } else {
      return fail_("Tipe item tidak dikenal.");
    }
  }

  var diskon = Math.min(Math.max(0, toInt_(body.diskon)), subtotal);
  // Transaksi gratis (promo/traktiran) harus eksplisit + beralasan; total Rp0 tanpa itu ditolak.
  var gratis = body.gratis === true;
  var alasanGratis = (body.alasan || "").toString().trim();
  if (gratis) {
    if (!alasanGratis) return fail_("Alasan transaksi gratis wajib diisi.");
    diskon = subtotal;
  }
  var total = subtotal - diskon;
  if (total === 0 && !gratis) return fail_("Total Rp0 hanya untuk transaksi gratis. Pilih Gratis dan isi alasannya.");
  var tunai = toInt_(body.bayarTunai), qris = toInt_(body.bayarQris);
  if (body.metode === "Tunai") qris = 0;
  if (body.metode === "QRIS") { tunai = 0; qris = total; }
  if (gratis) { tunai = 0; qris = 0; }
  if (tunai + qris < total) return fail_("Pembayaran kurang Rp " + (total - tunai - qris) + ".");

  var id = manual ? notaBuku : nextInvoiceId_(now);
  appendObj_(SHEET_TRANSAKSI, {
    id: id, waktu: now, tanggal: fmtTanggal_(now, "yyyy-MM-dd"), jam: fmtTanggal_(now, "HH.mm"),
    metode: body.metode, subtotal: subtotal, diskon: diskon, total: total,
    bayar_tunai: tunai, bayar_qris: qris, komisi_total: komisiTotal, status: "Lunas",
    dibuat_oleh_id: user.id, dibuat_oleh: user.nama + " · " + user.role,
    lembur: lembur ? "Ya" : "Tidak",
    manual: manual ? "Ya" : "", nota_buku: notaBuku,
    gratis: gratis ? alasanGratis : ""
  });
  lines.forEach(function (ln) { ln.trx_id = id; appendObj_(SHEET_TRX_ITEM, ln); });

  Object.keys(stokBaru).forEach(function (kode) {
    mutasiStok_(kode, stokBaru[kode] - Number(produkMap[kode].stok), "Penjualan", id, user);
  });

  writeAuditLog(user.id, user.nama, manual ? "REKAP_MANUAL" : "TRANSAKSI", id + " total " + total + (gratis ? " GRATIS: " + alasanGratis : ""));
  return ok_({ id: id, total: total, kembalian: tunai + qris - total, lembur: lembur });
}

/** Ubah stok produk dengan delta, catat di StokMutasi. Dipanggil dalam lock. */
function mutasiStok_(kode, delta, alasan, trxId, user) {
  var p = readTable_(SHEET_PRODUK).filter(function (x) { return x.kode === kode; })[0];
  if (!p) return;
  var akhir = Number(p.stok) + delta;
  setCell_(SHEET_PRODUK, p._row, "stok", akhir);
  appendObj_(SHEET_STOK_MUTASI, {
    waktu: new Date(), kode: kode, delta: delta, stok_akhir: akhir,
    alasan: alasan, trx_id: trxId || "", oleh: user.nama + " · " + user.role
  });
}

function bentukTransaksi_(t, itemsByTrx) {
  var items = (itemsByTrx[t.id] || []);
  var kapsters = {};
  items.forEach(function (i) { kapsters[i.kapster] = true; });
  var layananTotal = 0;
  items.forEach(function (i) { if (i.tipe === "Layanan") layananTotal += i.harga * i.qty; });
  var adaProduk = items.some(function (i) { return i.tipe === "Produk"; });
  var persenNote = PENGATURAN_DEFAULT.komisi_default;
  items.forEach(function (i) { if (i.tipe === "Layanan" && i.komisi_persen !== "") persenNote = i.komisi_persen; });
  var lemburNote = t.lembur === "Ya" ? " (lembur)" : "";
  var catatan = items.length && !adaProduk
    ? persenNote + "%" + lemburNote + " total layanan Rp " + layananTotal
    : "Layanan + produk" + lemburNote;
  return {
    id: t.id,
    date: fmtTanggal_(new Date(t.waktu), "d MMM yyyy"),
    // dihitung dari waktu; kolom "jam" bisa diubah Sheets jadi nilai waktu otomatis
    time: fmtTanggal_(new Date(t.waktu), "HH.mm"),
    items: items.map(function (i) { return { name: i.nama, qty: i.qty, price: i.harga, type: i.tipe }; }),
    barber: Object.keys(kapsters).join(", "),
    method: t.metode,
    commission: t.komisi_total,
    commissionNote: catatan,
    overtime: t.lembur === "Ya",
    subtotal: t.subtotal,
    discount: t.diskon,
    total: t.total,
    status: t.status === "Lunas" && t.manual === "Ya" ? "Manual" : t.status,
    createdTime: fmtTanggal_(new Date(t.waktu), "d MMM HH.mm"),
    createdBy: t.dibuat_oleh,
    voidReason: t.void_alasan || undefined,
    voidBy: t.void_oleh || undefined,
    voidTime: t.void_waktu ? fmtTanggal_(new Date(t.void_waktu), "d MMM yyyy, HH.mm") + " WIB" : undefined
  };
}

/** Body opsional: { dari: "yyyy-MM-dd", sampai: "yyyy-MM-dd" }. Kasir hanya melihat transaksinya sendiri. */
function listTransaksi_(body, user) {
  var itemsByTrx = {};
  readTable_(SHEET_TRX_ITEM).forEach(function (i) {
    (itemsByTrx[i.trx_id] = itemsByTrx[i.trx_id] || []).push(i);
  });
  var rows = readTable_(SHEET_TRANSAKSI).filter(function (t) {
    var tgl = fmtTanggal_(new Date(t.waktu), "yyyy-MM-dd");
    if (body.dari && tgl < body.dari) return false;
    if (body.sampai && tgl > body.sampai) return false;
    if (user.role === "Kasir" && t.dibuat_oleh_id !== user.id) return false;
    return true;
  });
  rows.sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); });
  return ok_(rows.map(function (t) { return bentukTransaksi_(t, itemsByTrx); }));
}

/**
 * Komisi per kapster untuk satu periode (bahan halaman Gaji).
 * Body: { dari: "yyyy-MM-dd", sampai: "yyyy-MM-dd", kapsterId? }. Hanya transaksi Lunas;
 * yang dibatalkan tidak dihitung. Kapster hanya boleh melihat komisinya sendiri.
 * Hasil: [{ kapsterId, kapster, jumlahTransaksi, komisiLayanan, komisiLembur, komisiProduk,
 *           totalKomisi, penjualanLayanan, penjualanProduk }]
 */
function listKomisi_(body, user) {
  var kapsterId = user.role === "Kapster" ? user.id : (body.kapsterId || "");
  var trxOk = {}, lemburTrx = {};
  readTable_(SHEET_TRANSAKSI).forEach(function (t) {
    if (t.status !== "Lunas") return;
    var tgl = fmtTanggal_(new Date(t.waktu), "yyyy-MM-dd");
    if (body.dari && tgl < body.dari) return;
    if (body.sampai && tgl > body.sampai) return;
    trxOk[t.id] = true;
    if (t.lembur === "Ya") lemburTrx[t.id] = true;
  });

  var per = {};
  readTable_(SHEET_TRX_ITEM).forEach(function (i) {
    if (!trxOk[i.trx_id]) return;
    if (kapsterId && i.kapster_id !== kapsterId) return;
    var r = per[i.kapster_id] = per[i.kapster_id] || {
      kapsterId: i.kapster_id, kapster: i.kapster, jumlahTransaksi: 0, trx: {},
      komisiLayanan: 0, komisiLembur: 0, komisiProduk: 0, totalKomisi: 0,
      penjualanLayanan: 0, penjualanProduk: 0
    };
    var kom = Number(i.komisi) || 0, nilai = Number(i.harga) * Number(i.qty);
    r.trx[i.trx_id] = true;
    if (i.tipe === "Produk") {
      r.komisiProduk += kom; r.penjualanProduk += nilai;
    } else {
      if (lemburTrx[i.trx_id]) r.komisiLembur += kom; else r.komisiLayanan += kom;
      r.penjualanLayanan += nilai;
    }
    r.totalKomisi += kom;
  });

  var hasil = Object.keys(per).map(function (k) {
    var r = per[k];
    r.jumlahTransaksi = Object.keys(r.trx).length;
    delete r.trx;
    return r;
  });
  hasil.sort(function (a, b) { return b.totalKomisi - a.totalKomisi; });
  return ok_(hasil);
}

/** true bila tanggal (yyyy-MM-dd) masuk rentang body.dari..body.sampai (keduanya opsional). */
function dalamRentang_(tgl, body) {
  return !(body.dari && tgl < body.dari) && !(body.sampai && tgl > body.sampai);
}

/**
 * Ringkasan keuangan untuk Laporan Keuangan dan Beranda. Body: { dari, sampai } (yyyy-MM-dd).
 * Hanya transaksi Lunas dan pengeluaran Aktif. sisa = pemasukan - pengeluaran - komisi kapster.
 */
function laporanKeuangan_(body) {
  var trx = {}, perHari = {}, tunai = 0, qris = 0, pemasukan = 0, komisi = 0, jumlah = 0;
  readTable_(SHEET_TRANSAKSI).forEach(function (t) {
    if (t.status !== "Lunas") return;
    var tgl = fmtTanggal_(new Date(t.waktu), "yyyy-MM-dd");
    if (!dalamRentang_(tgl, body)) return;
    trx[t.id] = true;
    var total = Number(t.total) || 0, q = Math.min(Number(t.bayar_qris) || 0, total);
    pemasukan += total; qris += q; tunai += total - q; komisi += Number(t.komisi_total) || 0; jumlah++;
    var h = perHari[tgl] = perHari[tgl] || { tanggal: tgl, total: 0, tunai: 0, qris: 0 };
    h.total += total; h.qris += q; h.tunai += total - q;
  });

  var pengeluaran = 0;
  readTable_(SHEET_PENGELUARAN).forEach(function (e) {
    if (e.status !== "Aktif") return;
    if (dalamRentang_(fmtTanggal_(new Date(e.tanggal), "yyyy-MM-dd"), body)) pengeluaran += Number(e.jumlah) || 0;
  });

  var per = {};
  readTable_(SHEET_TRX_ITEM).forEach(function (i) {
    if (!trx[i.trx_id]) return;
    var k = per[i.kapster_id] = per[i.kapster_id] || { kapsterId: i.kapster_id, kapster: i.kapster, trx: {}, omzet: 0, komisi: 0 };
    k.trx[i.trx_id] = true;
    k.omzet += Number(i.harga) * Number(i.qty);
    k.komisi += Number(i.komisi) || 0;
  });
  var perKapster = Object.keys(per).map(function (id) {
    var k = per[id];
    return { kapsterId: k.kapsterId, kapster: k.kapster, pelanggan: Object.keys(k.trx).length, omzet: k.omzet, komisi: k.komisi };
  }).sort(function (a, b) { return b.omzet - a.omzet; });

  var stokMenipis = readTable_(SHEET_PRODUK)
    .filter(function (p) { return p.status === "Aktif" && Number(p.stok) <= STOK_MENIPIS; })
    .map(function (p) { return { kode: p.kode, nama: p.nama, stok: Number(p.stok) }; });

  return ok_({
    pemasukan: pemasukan, tunai: tunai, qris: qris, pengeluaran: pengeluaran, komisi: komisi,
    sisa: pemasukan - pengeluaran - komisi, jumlahTransaksi: jumlah,
    perHari: Object.keys(perHari).sort().map(function (k) { return perHari[k]; }),
    perKapster: perKapster, stokMenipis: stokMenipis
  });
}

/**
 * Penjualan produk per baris item, lengkap dengan pembagian kapster / pemasok / Eastville.
 * Body: { dari, sampai }. Termasuk transaksi BATAL (ditandai) agar bisa ditampilkan sebagai koreksi.
 */
function laporanProduk_(body) {
  var produk = {};
  readTable_(SHEET_PRODUK).forEach(function (p) { produk[p.kode] = p; });
  var trx = {};
  readTable_(SHEET_TRANSAKSI).forEach(function (t) {
    if (dalamRentang_(fmtTanggal_(new Date(t.waktu), "yyyy-MM-dd"), body)) trx[t.id] = t;
  });
  var rows = [];
  readTable_(SHEET_TRX_ITEM).forEach(function (i) {
    var t = trx[i.trx_id];
    if (!t || i.tipe !== "Produk") return;
    var p = produk[i.ref_id] || {};
    var qty = Number(i.qty), harga = Number(i.harga), omzet = harga * qty;
    var penjual = p.skema === "Persentase"
      ? Math.round(harga * Number(p.persen_penjual) / 100) * qty
      : (Number(p.nominal_penjual) || 0) * qty;
    var kapster = Number(i.komisi) || 0;
    rows.push({
      id: t.id,
      time: fmtTanggal_(new Date(t.waktu), "d MMM HH.mm"),
      waktu: new Date(t.waktu).getTime(),
      product: i.nama, qty: qty, unitPrice: harga, totalOmzet: omzet,
      barber: i.kapster, seller: p.penjual || "-",
      barberShare: kapster, sellerShare: penjual, eastvilleShare: omzet - kapster - penjual,
      status: t.status === "BATAL" ? "Batal" : "Lunas",
      voidReason: t.void_alasan || undefined,
      voidBy: t.void_oleh || undefined,
      voidAt: t.void_waktu ? fmtTanggal_(new Date(t.void_waktu), "d MMM HH.mm") : undefined
    });
  });
  rows.sort(function (a, b) { return b.waktu - a.waktu; });
  return ok_(rows);
}

// ============================================================
// BACKUP - salinan sheet bisnis di dalam spreadsheet yang sama (sheet tersembunyi "BAK_...").
// Sengaja tanpa DriveApp: scope Drive baru memaksa otorisasi ulang dan bisa membuat seluruh web app gagal.
// Melindungi dari salah edit/hapus lewat aplikasi; BUKAN pengganti salinan file di Drive.
// Pemulihan lewat action backup-pulihkan (Owner): menyalin isi BAK_ kembali setelah membuat backup pengaman.
// ============================================================
var BACKUP_SHEETS = ["Layanan", "Produk", "Transaksi", "TransaksiItem", "Pengeluaran", "StokMutasi", "ProdukLog", "Pengaturan", "KomisiKapster"];
var BACKUP_SIMPAN = 5; // jumlah backup terakhir yang dipertahankan

function backupBuat_(user) {
  var ss = getSpreadsheet();
  var stamp = fmtTanggal_(new Date(), "yyyyMMdd_HHmm");
  var baris = 0;
  BACKUP_SHEETS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    baris += Math.max(sh.getLastRow() - 1, 0);
    var salinan = sh.copyTo(ss).setName("BAK_" + stamp + "_" + name);
    salinan.hideSheet();
  });
  // Hapus backup lama di luar batas simpan
  var stamps = backupStamps_();
  stamps.slice(BACKUP_SIMPAN).forEach(function (st) {
    ss.getSheets().forEach(function (sh) {
      if (sh.getName().indexOf("BAK_" + st + "_") === 0) ss.deleteSheet(sh);
    });
  });
  writeAuditLog(user.id, user.nama, "BACKUP", "BAK_" + stamp + " · " + baris + " baris");
  return ok_({ nama: "BAK_" + stamp });
}

/** Stempel waktu backup yang ada, terbaru dulu. */
function backupStamps_() {
  var set = {};
  getSpreadsheet().getSheets().forEach(function (sh) {
    var m = /^BAK_(\d{8}_\d{4})_/.exec(sh.getName());
    if (m) set[m[1]] = true;
  });
  return Object.keys(set).sort().reverse();
}

function backupList_() {
  var ss = getSpreadsheet();
  return backupStamps_().map(function (st) {
    var baris = 0, sheets = 0;
    ss.getSheets().forEach(function (sh) {
      if (sh.getName().indexOf("BAK_" + st + "_") === 0) { sheets++; baris += Math.max(sh.getLastRow() - 1, 0); }
    });
    var p = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/.exec(st);
    return {
      nama: "BAK_" + st,
      dibuat: p[3] + "/" + p[2] + "/" + p[1] + " · " + p[4] + "." + p[5],
      sheet: sheets, baris: baris
    };
  });
}


/**
 * Body: { nama: "BAK_yyyyMMdd_HHmm" }. Mengganti isi sheet bisnis dengan isi backup.
 * Sebelum menimpa, data saat ini disalin dulu jadi backup baru (jaring pengaman).
 * Data akun (Users, Sessions) tidak disentuh.
 */
function backupPulihkan_(body, user) {
  var m = /^BAK_(\d{8}_\d{4})$/.exec((body.nama || "").toString());
  if (!m) return fail_("Nama backup tidak valid.");
  var ss = getSpreadsheet();
  if (backupStamps_()[0] === fmtTanggal_(new Date(), "yyyyMMdd_HHmm")) {
    return fail_("Ada backup yang baru dibuat semenit ini. Tunggu satu menit lalu coba lagi.");
  }
  var sumber = {};
  BACKUP_SHEETS.forEach(function (name) {
    var sh = ss.getSheetByName("BAK_" + m[1] + "_" + name);
    if (sh && sh.getLastRow() > 0) sumber[name] = sh.getDataRange().getValues();
  });
  var daftar = Object.keys(sumber);
  if (!daftar.length) return fail_("Backup tidak ditemukan.");

  // Nilai sumber sudah dibaca ke memori, jadi aman walau backup pengaman menggeser backup lama.
  var pengaman = backupBuat_(user);
  var namaPengaman = JSON.parse(pengaman.getContent()).data.nama;

  daftar.forEach(function (name) {
    var live = ss.getSheetByName(name);
    var vals = sumber[name];
    live.clearContents();
    live.getRange(1, 1, vals.length, vals[0].length).setValues(vals);
    live.getRange(1, 1, 1, vals[0].length).setFontWeight("bold");
  });
  CacheService.getScriptCache().remove("bisnis_schema"); // kolom baru (jika backup lama) ditambah ulang
  ensureSchema_();
  writeAuditLog(user.id, user.nama, "PULIHKAN_BACKUP", m[0] + " · " + daftar.length + " sheet · pengaman " + namaPengaman);
  return ok_({ nama: m[0], sheet: daftar.length, pengaman: namaPengaman });
}

function cariTransaksi_(id) {
  return readTable_(SHEET_TRANSAKSI).filter(function (t) { return t.id === id; })[0];
}

/** Body: { id, alasan }. Stok produk dikembalikan. */
function batalkanTransaksi_(body, user) {
  var alasan = (body.alasan || "").trim();
  if (!alasan) return fail_("Alasan pembatalan wajib diisi.");
  var t = cariTransaksi_(body.id);
  if (!t) return fail_("Transaksi tidak ditemukan.");
  if (t.status === "BATAL") return fail_("Transaksi sudah dibatalkan.");
  if (user.role === "Kasir" && t.dibuat_oleh_id !== user.id) return fail_("Kasir hanya boleh membatalkan transaksinya sendiri.");

  setCell_(SHEET_TRANSAKSI, t._row, "status", "BATAL");
  setCell_(SHEET_TRANSAKSI, t._row, "void_alasan", alasan);
  setCell_(SHEET_TRANSAKSI, t._row, "void_oleh", user.nama + " · " + user.role);
  setCell_(SHEET_TRANSAKSI, t._row, "void_waktu", new Date());

  readTable_(SHEET_TRX_ITEM).forEach(function (i) {
    if (i.trx_id === t.id && i.tipe === "Produk") mutasiStok_(i.ref_id, Number(i.qty), "Batal " + t.id, t.id, user);
  });
  writeAuditLog(user.id, user.nama, "VOID_TRANSAKSI", t.id + " — " + alasan);
  return ok_({ id: t.id, status: "BATAL" });
}

/** Body: { id, alasan }. Stok dikurangi lagi; gagal kalau stok tidak cukup. */
function pulihkanTransaksi_(body, user) {
  var alasan = (body.alasan || "").trim();
  if (!alasan) return fail_("Alasan wajib diisi.");
  var t = cariTransaksi_(body.id);
  if (!t) return fail_("Transaksi tidak ditemukan.");
  if (t.status !== "BATAL") return fail_("Hanya transaksi BATAL yang bisa dipulihkan.");

  var produkMap = {};
  readTable_(SHEET_PRODUK).forEach(function (p) { produkMap[p.kode] = p; });
  var items = readTable_(SHEET_TRX_ITEM).filter(function (i) { return i.trx_id === t.id && i.tipe === "Produk"; });
  for (var k = 0; k < items.length; k++) {
    var p = produkMap[items[k].ref_id];
    if (!p || Number(p.stok) < Number(items[k].qty)) return fail_("Stok " + items[k].nama + " tidak cukup untuk memulihkan transaksi.");
  }
  items.forEach(function (i) { mutasiStok_(i.ref_id, -Number(i.qty), "Pulihkan " + t.id, t.id, user); });

  setCell_(SHEET_TRANSAKSI, t._row, "status", "Lunas");
  ["void_alasan", "void_oleh", "void_waktu"].forEach(function (h) { setCell_(SHEET_TRANSAKSI, t._row, h, ""); });
  writeAuditLog(user.id, user.nama, "PULIHKAN_TRANSAKSI", t.id + " — " + alasan);
  return ok_({ id: t.id, status: "Lunas" });
}


// ============================================================
// PENGELUARAN
// ============================================================
function listPengeluaran_() {
  return readTable_(SHEET_PENGELUARAN).map(function (r) {
    return {
      id: r.id,
      date: fmtTanggal_(new Date(r.tanggal), "d MMM"),
      dateIso: fmtTanggal_(new Date(r.tanggal), "yyyy-MM-dd"),
      category: r.kategori,
      description: r.deskripsi,
      amount: r.jumlah,
      status: r.status,
      cancelReason: r.alasan_batal || undefined,
      createdBy: r.dibuat_oleh
    };
  }).reverse();
}

/** Body: { tanggal: "yyyy-MM-dd", kategori, deskripsi, jumlah } */
function createPengeluaran_(body, user) {
  var jumlah = toInt_(body.jumlah);
  if (jumlah <= 0) return fail_("Jumlah harus lebih dari 0.");
  if (KATEGORI_PENGELUARAN.indexOf(body.kategori) === -1) return fail_("Kategori tidak valid.");
  var deskripsi = (body.deskripsi || "").trim();
  if (!deskripsi) return fail_("Keterangan wajib diisi.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.tanggal || "")) return fail_("Format tanggal harus yyyy-MM-dd.");

  var id = generateId("exp");
  appendObj_(SHEET_PENGELUARAN, {
    id: id, tanggal: body.tanggal, kategori: body.kategori, deskripsi: deskripsi,
    jumlah: jumlah, status: "Aktif", dibuat_oleh: user.nama + " · " + user.role, waktu: new Date()
  });
  writeAuditLog(user.id, user.nama, "PENGELUARAN", id + " " + body.kategori + " Rp " + jumlah);
  return ok_({ id: id });
}

/** Body: { id, alasan } */
function batalkanPengeluaran_(body, user) {
  var alasan = (body.alasan || "").trim();
  if (!alasan) return fail_("Alasan pembatalan wajib diisi.");
  var r = readTable_(SHEET_PENGELUARAN).filter(function (x) { return x.id === body.id; })[0];
  if (!r) return fail_("Pengeluaran tidak ditemukan.");
  if (r.status === "BATAL") return fail_("Sudah dibatalkan.");
  setCell_(SHEET_PENGELUARAN, r._row, "status", "BATAL");
  setCell_(SHEET_PENGELUARAN, r._row, "alasan_batal", alasan);
  writeAuditLog(user.id, user.nama, "BATAL_PENGELUARAN", r.id + " — " + alasan);
  return ok_({ id: r.id });
}


/** Body: { id }. Mengaktifkan kembali pengeluaran yang dibatalkan. */
function aktifkanPengeluaran_(body, user) {
  var r = readTable_(SHEET_PENGELUARAN).filter(function (x) { return x.id === body.id; })[0];
  if (!r) return fail_("Pengeluaran tidak ditemukan.");
  if (r.status !== "BATAL") return fail_("Pengeluaran ini sudah aktif.");
  setCell_(SHEET_PENGELUARAN, r._row, "status", "Aktif");
  setCell_(SHEET_PENGELUARAN, r._row, "alasan_batal", "");
  writeAuditLog(user.id, user.nama, "AKTIFKAN_PENGELUARAN", r.id);
  return ok_({ id: r.id });
}


// ============================================================
// PRODUK & STOK
// ============================================================

/**
 * Body: { produk: { kode, nama, penjual, stok, skema, status, harga, hargaModal,
 *                   shares:{barber,seller,eastville}, nominalShares:{...} }, alasan }
 * kode yang sudah ada = edit (stok tidak diubah di sini; pakai adjust-stok).
 */
function simpanProduk_(body, user) {
  var p = body.produk || {};
  var alasan = (body.alasan || "").trim();
  if (!p.kode || !p.nama) return fail_("Kode dan nama produk wajib diisi.");
  if (["Persentase", "Nominal tetap"].indexOf(p.skema) === -1) return fail_("Skema tidak valid.");
  var s = p.shares || {}, n = p.nominalShares || {};
  if (p.skema === "Persentase" && Math.abs(Number(s.barber) + Number(s.seller) + Number(s.eastville) - 100) > 0.5) {
    return fail_("Total pembagian persentase harus 100%.");
  }
  if (p.skema === "Nominal tetap" && Number(n.barber) + Number(n.seller) + Number(n.eastville) !== Number(p.harga)) {
    return fail_("Total pembagian nominal harus sama dengan harga jual.");
  }

  var baris = {
    kode: p.kode, nama: p.nama, penjual: p.penjual || "", skema: p.skema,
    status: p.status === "Nonaktif" ? "Nonaktif" : "Aktif",
    harga: toInt_(p.harga), harga_modal: toInt_(p.hargaModal),
    persen_kapster: Number(s.barber) || 0, persen_penjual: Number(s.seller) || 0, persen_eastville: Number(s.eastville) || 0,
    nominal_kapster: toInt_(n.barber), nominal_penjual: toInt_(n.seller), nominal_eastville: toInt_(n.eastville)
  };

  var ada = readTable_(SHEET_PRODUK).filter(function (x) { return x.kode === p.kode; })[0];
  if (ada) {
    if (!alasan) return fail_("Alasan perubahan wajib diisi.");
    var beda = [];
    Object.keys(baris).forEach(function (k) {
      if (String(ada[k]) !== String(baris[k])) { beda.push(k + " " + ada[k] + " → " + baris[k]); setCell_(SHEET_PRODUK, ada._row, k, baris[k]); }
    });
    if (beda.length) {
      appendObj_(SHEET_PRODUK_LOG, { waktu: new Date(), kode: p.kode, produk: p.nama, perubahan: beda.join("; "), oleh: user.nama + " · " + user.role, alasan: alasan });
      writeAuditLog(user.id, user.nama, "UBAH_PRODUK", p.kode + ": " + beda.join("; "));
    }
  } else {
    baris.stok = Math.max(0, toInt_(p.stok));
    appendObj_(SHEET_PRODUK, baris);
    if (baris.stok > 0) appendObj_(SHEET_STOK_MUTASI, { waktu: new Date(), kode: p.kode, delta: baris.stok, stok_akhir: baris.stok, alasan: "Stok awal", oleh: user.nama + " · " + user.role });
    appendObj_(SHEET_PRODUK_LOG, { waktu: new Date(), kode: p.kode, produk: p.nama, perubahan: "Produk baru", oleh: user.nama + " · " + user.role, alasan: alasan || "Produk baru" });
    writeAuditLog(user.id, user.nama, "TAMBAH_PRODUK", p.kode);
  }
  return ok_({ kode: p.kode });
}

/** Body: { kode, delta (+/-), alasan } */
function adjustStok_(body, user) {
  var delta = toInt_(body.delta);
  var alasan = (body.alasan || "").trim();
  if (!delta) return fail_("Perubahan stok tidak boleh 0.");
  if (!alasan) return fail_("Alasan wajib diisi.");
  var p = readTable_(SHEET_PRODUK).filter(function (x) { return x.kode === body.kode; })[0];
  if (!p) return fail_("Produk tidak ditemukan.");
  if (Number(p.stok) + delta < 0) return fail_("Stok tidak boleh negatif.");
  mutasiStok_(p.kode, delta, alasan, "", user);
  writeAuditLog(user.id, user.nama, "ADJUST_STOK", p.kode + " " + (delta > 0 ? "+" : "") + delta + " — " + alasan);
  return ok_({ kode: p.kode, stok: Number(p.stok) + delta });
}
