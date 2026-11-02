// ============================================================
// EASTVILLE BARBERSHOP - Backend Core & Tim B (Google Apps Script)
// ============================================================
// File ini di-maintain oleh Tim B (Fitra).
// Menangani: Autentikasi (Login, Session, Keamanan PIN, Reset PIN),
// Manajemen Karyawan/User, Layanan CRUD, Gaji & Kasbon, Laporan, Absensi Foto.
// Aksi operasional kasir/transaksi/stok diarahkan ke Bisnis.js (Rania).
// ============================================================

// ---- KONFIGURASI ----
var SPREADSHEET_ID = "1Hsvc_RlfCYqd6BB6t9nvpa9k408ig0Rx-nOHEpVIXe0";
var SHEET_USERS = "Users";
var SHEET_SESSIONS = "Sessions";
var SHEET_AUDIT = "AuditLog";
var SHEET_KASBON = "Kasbon";
var SHEET_GAJI = "Gaji";
var SHEET_ABSENSI = "Absensi";

// ---- UTILITAS ----

/**
 * Ambil spreadsheet
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Ambil sheet berdasarkan nama
 */
function getSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error("Sheet '" + name + "' tidak ditemukan. Jalankan fungsi setupSheets() dulu.");
  }
  return sheet;
}

/**
 * Generate ID unik sederhana
 */
function generateId(prefix) {
  var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  var id = prefix + "-";
  for (var i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Generate session token aman memakai UUID
 */
function generateToken() {
  return Utilities.getUuid() + "-" + Utilities.getUuid();
}

/**
 * Hash string memakai SHA-256 (hex lowercase)
 */
function sha256Hex_(str) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  var hash = "";
  for (var i = 0; i < rawHash.length; i++) {
    var byte = rawHash[i];
    if (byte < 0) byte += 256;
    var hex = byte.toString(16);
    if (hex.length === 1) hex = "0" + hex;
    hash += hex;
  }
  return hash;
}

/**
 * Hash PIN dengan Salt (format: salt$hash).
 * Jika salt tidak diberikan, akan di-generate salt acak 16 karakter.
 */
function hashPin(pin, salt) {
  salt = salt || Utilities.getUuid().replace(/-/g, "").slice(0, 16);
  var hash = sha256Hex_(salt + ":" + pin);
  return salt + "$" + hash;
}

/**
 * Verifikasi PIN: mendukung hash baru dengan salt (salt$hash)
 * maupun hash lama tanpa salt demi backward compatibility.
 */
function verifyPin(pin, storedHash) {
  if (!storedHash) return false;
  storedHash = storedHash.toString().trim();
  if (storedHash.indexOf("$") !== -1) {
    var parts = storedHash.split("$");
    var salt = parts[0];
    var expected = parts[1];
    return sha256Hex_(salt + ":" + pin) === expected;
  }
  // Fallback hash legacy (unsalted)
  return sha256Hex_(pin) === storedHash;
}

/**
 * Buat response JSON
 */
function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Tulis log audit
 */
function writeAuditLog(userId, userName, action, detail, alasan) {
  try {
    var sheet = getSheet(SHEET_AUDIT);
    sheet.appendRow([
      new Date(),           // Waktu
      userId || "",         // User ID
      userName || "",       // Nama User
      action || "",         // Aksi
      detail || "",         // Detail
      alasan || ""          // Alasan
    ]);
  } catch (e) {
    Logger.log("Audit log error: " + e.message);
  }
}

/**
 * Format tanggal YYYY-MM-DD
 */
function formatDateIso_(d) {
  var date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  var y = date.getFullYear();
  var m = ("0" + (date.getMonth() + 1)).slice(-2);
  var day = ("0" + date.getDate()).slice(-2);
  return y + "-" + m + "-" + day;
}

/**
 * Format jam HH:mm
 */
function formatTimeHhmm_(d) {
  var date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return typeof d === "string" ? d : "";
  var h = ("0" + date.getHours()).slice(-2);
  var m = ("0" + date.getMinutes()).slice(-2);
  return h + ":" + m;
}

/**
 * Validasi session token & ambil profil user
 */
function getUserFromToken_(token) {
  if (!token) return null;
  var ss = getSpreadsheet();
  var sessionsSheet = ss.getSheetByName(SHEET_SESSIONS);
  if (!sessionsSheet) return null;
  var sData = sessionsSheet.getDataRange().getValues();
  var userId = null;
  var now = new Date();
  for (var i = 1; i < sData.length; i++) {
    if (sData[i][0] === token && sData[i][4] === "Aktif") {
      var expireTime = new Date(sData[i][3]);
      if (now <= expireTime) {
        userId = sData[i][1];
      }
      break;
    }
  }
  if (!userId) return null;

  var usersSheet = ss.getSheetByName(SHEET_USERS);
  if (!usersSheet) return null;
  var uData = usersSheet.getDataRange().getValues();
  for (var j = 1; j < uData.length; j++) {
    if (uData[j][0] === userId) {
      return {
        id: uData[j][0],
        nama: uData[j][1],
        username: uData[j][2],
        pinHash: uData[j][3],
        role: uData[j][4],
        cabang: uData[j][5],
        email: uData[j][6],
        status: uData[j][7]
      };
    }
  }
  return null;
}

/**
 * Pastikan sheet-sheet bagian Tim B tersedia di spreadsheet
 */
function ensureTimBSheets_() {
  var ss = getSpreadsheet();
  var timBSheets = {
    Kasbon: ["id", "tanggal", "user_id", "nama", "role", "jumlah", "status", "catatan", "dibuat_oleh", "lunas_waktu"],
    Gaji: ["id", "periode", "user_id", "nama", "role", "total_komisi", "total_kasbon", "gaji_bersih", "status", "tanggal_bayar", "dibayar_oleh", "catatan"],
    Absensi: ["id", "waktu", "tanggal", "jam", "user_id", "nama", "role", "tipe", "foto_url", "status", "catatan"]
  };
  Object.keys(timBSheets).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
    }
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, timBSheets[name].length).setValues([timBSheets[name]]).setFontWeight("bold");
    }
  });
}

// ============================================================
// SETUP - Jalankan sekali untuk membuat struktur sheet awal
// ============================================================

function setupSheets() {
  var ss = getSpreadsheet();

  // ---- Sheet Users ----
  var usersSheet = ss.getSheetByName(SHEET_USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_USERS);
  }
  usersSheet.getRange(1, 1, 1, 9).setValues([[
    "id", "nama", "username", "pin_hash", "role", "cabang", "email", "status", "dibuat"
  ]]).setFontWeight("bold");

  // Data demo (PIN: 123456 memakai salt baru)
  var pinHash = hashPin("123456");
  var demoData = [
    ["u-owner",   "Ardi Pradana",  "ardi.owner",   pinHash, "Owner",   "Semua cabang", "ardi@eastville.id",  "Aktif", new Date()],
    ["u-manajer", "Dian Setiawan", "dian.manajer",  pinHash, "Manajer", "Patihan",      "dian@eastville.id",  "Aktif", new Date()],
    ["u-kasir",   "Siti Rahma",    "siti.kasir",    pinHash, "Kasir",   "Patihan",      "siti@eastville.id",  "Aktif", new Date()],
    ["u-kapster", "Budi Santoso",  "budi.kapster",  pinHash, "Kapster", "Patihan",      "budi@eastville.id",  "Aktif", new Date()],
    ["u-kapster2","Zhefitra Ananda", "zhefitra.ananda", pinHash, "Kapster", "Patihan", "zhefitra@eastville.id", "Aktif", new Date()]
  ];
  if (usersSheet.getLastRow() <= 1) {
    usersSheet.getRange(2, 1, demoData.length, 9).setValues(demoData);
  }

  // ---- Sheet Sessions ----
  var sessionsSheet = ss.getSheetByName(SHEET_SESSIONS);
  if (!sessionsSheet) {
    sessionsSheet = ss.insertSheet(SHEET_SESSIONS);
  }
  if (sessionsSheet.getLastRow() === 0) {
    sessionsSheet.getRange(1, 1, 1, 5).setValues([[
      "token", "user_id", "login_time", "expire_time", "status"
    ]]).setFontWeight("bold");
  }

  // ---- Sheet AuditLog ----
  var auditSheet = ss.getSheetByName(SHEET_AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(SHEET_AUDIT);
  }
  if (auditSheet.getLastRow() === 0) {
    auditSheet.getRange(1, 1, 1, 6).setValues([[
      "waktu", "user_id", "nama_user", "aksi", "detail", "alasan"
    ]]).setFontWeight("bold");
  }

  ensureTimBSheets_();
  Logger.log("Setup selesai! Sheet Users, Sessions, AuditLog, Kasbon, Gaji, dan Absensi sudah siap.");
}

// ============================================================
// WEB APP HANDLER - Menerima request dari frontend
// ============================================================

function doGet(e) {
  return jsonResponse({
    success: true,
    message: "Eastville Barbershop API aktif",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    switch (action) {
      // ---- AUTENTIKASI ----
      case "login":
        return handleLogin(body);
      case "logout":
        return handleLogout(body);
      case "verify-session":
        return handleVerifySession(body);
      case "forgot-pin":
        return handleForgotPin(body);
      case "reset-pin":
        return handleResetPin(body);

      // ---- MANAJEMEN ANGGOTA TIM / USER (TIM B) ----
      case "list-users":
        return handleListUsers(body);
      case "create-user":
        return handleCreateUser(body);
      case "update-user":
        return handleUpdateUser(body);
      case "toggle-user-status":
        return handleToggleUserStatus(body);

      // ---- LAYANAN CRUD (TIM B) ----
      case "create-layanan":
        return handleCreateLayanan(body);
      case "update-layanan":
        return handleUpdateLayanan(body);
      case "toggle-layanan":
        return handleToggleLayanan(body);

      // ---- GAJI & KASBON (TIM B) ----
      case "list-kasbon":
        return handleListKasbon(body);
      case "create-kasbon":
        return handleCreateKasbon(body);
      case "lunasi-kasbon":
        return handleLunasiKasbon(body);
      case "hitung-gaji":
        return handleHitungGaji(body);
      case "bayar-gaji":
        return handleBayarGaji(body);
      case "list-gaji":
        return handleListGaji(body);

      // ---- LAPORAN RINGKASAN (TIM B) ----
      case "ringkasan-laporan":
        return handleRingkasanLaporan(body);

      // ---- ABSENSI FOTO (TIM B) ----
      case "catat-absensi":
        return handleCatatAbsensi(body);
      case "list-absensi":
        return handleListAbsensi(body);

      default:
        // Action bisnis (kasir, transaksi, pengeluaran, stok) ada di Bisnis.js (Tim A)
        if (typeof routeBisnis === "function") {
          var bisnis = routeBisnis(action, body);
          if (bisnis) return bisnis;
        }
        return jsonResponse({
          success: false,
          error: "Aksi tidak dikenal: " + action
        });
    }
  } catch (err) {
    return jsonResponse({
      success: false,
      error: "Terjadi kesalahan server: " + err.message
    });
  }
}

// ============================================================
// HANDLER FUNGSI LOGIN & AUTENTIKASI (DENGAN LOCKOUT & SALT)
// ============================================================

function handleLogin(body) {
  var username = (body.username || "").trim().toLowerCase();
  var pin = (body.pin || "").trim();

  if (!username) {
    return jsonResponse({ success: false, error: "Username wajib diisi." });
  }
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return jsonResponse({ success: false, error: "PIN harus 6 digit angka." });
  }

  // Cek lockout gagal login (maksimal 5x salah, terkunci 5 menit)
  var cache = CacheService.getScriptCache();
  var lockKey = "lock_" + username;
  var failKey = "fail_" + username;
  if (cache.get(lockKey)) {
    return jsonResponse({
      success: false,
      error: "Akun terkunci sementara karena 5 kali salah PIN. Silakan coba lagi dalam 5 menit."
    });
  }

  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var user = null;
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][2].toString().toLowerCase() === username) {
      user = {
        id:       data[i][0],
        nama:     data[i][1],
        username: data[i][2],
        pinHash:  data[i][3],
        role:     data[i][4],
        cabang:   data[i][5],
        email:    data[i][6],
        status:   data[i][7]
      };
      rowIndex = i;
      break;
    }
  }

  if (!user) {
    return jsonResponse({
      success: false,
      error: "Username tidak ditemukan."
    });
  }

  if (user.status !== "Aktif") {
    return jsonResponse({
      success: false,
      error: "Akun Anda sudah dinonaktifkan. Hubungi Owner."
    });
  }

  // Verifikasi PIN memakai verifyPin (mendukung salt baru & fallback legacy)
  if (!verifyPin(pin, user.pinHash)) {
    var fails = parseInt(cache.get(failKey) || "0", 10) + 1;
    if (fails >= 5) {
      cache.put(lockKey, "locked", 300); // Kunci 5 menit
      cache.remove(failKey);
      writeAuditLog(user.id, user.nama, "LOCKOUT", "Akun terkunci 5 menit setelah 5x salah PIN: " + username);
      return jsonResponse({
        success: false,
        error: "Akun terkunci sementara karena 5 kali salah PIN. Silakan coba lagi dalam 5 menit."
      });
    } else {
      cache.put(failKey, fails.toString(), 300);
      var sisa = 5 - fails;
      writeAuditLog(user.id, user.nama, "LOGIN_GAGAL", "PIN salah untuk username: " + username + " (percobaan " + fails + "/5)");
      return jsonResponse({
        success: false,
        error: "PIN salah. Sisa percobaan: " + sisa + " kali."
      });
    }
  }

  // Login berhasil: reset counter gagal
  cache.remove(failKey);
  cache.remove(lockKey);

  // Jika hash di sheet masih versi legacy tanpa salt, upgrade otomatis ke salted hash!
  if (user.pinHash.toString().indexOf("$") === -1) {
    try {
      sheet.getRange(rowIndex + 1, 4).setValue(hashPin(pin));
    } catch (e) {
      Logger.log("Upgrade hash info: " + e.message);
    }
  }

  var token = generateToken();
  var now = new Date();
  var expire = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 jam

  var sessionsSheet = getSheet(SHEET_SESSIONS);
  sessionsSheet.appendRow([token, user.id, now, expire, "Aktif"]);

  writeAuditLog(user.id, user.nama, "LOGIN", "Login berhasil dari role: " + user.role);

  return jsonResponse({
    success: true,
    message: "Login berhasil!",
    data: {
      token: token,
      user: {
        id:       user.id,
        name:     user.nama,
        username: user.username,
        role:     user.role,
        branch:   user.cabang
      }
    }
  });
}

function handleLogout(body) {
  var token = (body.token || "").trim();
  if (!token) {
    return jsonResponse({ success: false, error: "Token wajib diisi." });
  }

  var sheet = getSheet(SHEET_SESSIONS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      sheet.getRange(i + 1, 5).setValue("Logout");
      var userId = data[i][1];
      writeAuditLog(userId, "", "LOGOUT", "Logout berhasil");
      return jsonResponse({
        success: true,
        message: "Logout berhasil."
      });
    }
  }

  return jsonResponse({
    success: false,
    error: "Session tidak ditemukan."
  });
}

function handleVerifySession(body) {
  var token = (body.token || "").trim();
  if (!token) {
    return jsonResponse({ success: false, error: "Token wajib diisi." });
  }

  var user = getUserFromToken_(token);
  if (!user) {
    return jsonResponse({
      success: false,
      error: "Session tidak valid atau sudah kadaluarsa."
    });
  }

  return jsonResponse({
    success: true,
    data: {
      user: {
        id:       user.id,
        name:     user.nama,
        username: user.username,
        role:     user.role,
        branch:   user.cabang
      }
    }
  });
}

function handleForgotPin(body) {
  var email = (body.email || "").trim().toLowerCase();
  if (!email || email.indexOf("@") === -1) {
    return jsonResponse({ success: false, error: "Email tidak valid." });
  }

  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var foundUser = null;

  for (var i = 1; i < data.length; i++) {
    if (data[i][6].toString().toLowerCase() === email) {
      foundUser = {
        id: data[i][0],
        nama: data[i][1],
        email: data[i][6]
      };
      break;
    }
  }

  if (!foundUser) {
    return jsonResponse({
      success: false,
      error: "Email tidak terdaftar di sistem Eastville."
    });
  }

  // Buat resetToken acak dan simpan di cache selama 15 menit (900 detik)
  var resetToken = "rst-" + Utilities.getUuid().replace(/-/g, "").slice(0, 16);
  var cache = CacheService.getScriptCache();
  cache.put("rst_" + resetToken, foundUser.email.toLowerCase(), 900);

  writeAuditLog(foundUser.id, foundUser.nama, "FORGOT_PIN", "Permintaan reset PIN via email: " + email);

  return jsonResponse({
    success: true,
    message: "Tautan reset PIN telah dibuat (berlaku 15 menit).",
    data: {
      resetToken: resetToken,
      email: foundUser.email
    }
  });
}

function handleResetPin(body) {
  var email = (body.email || "").trim().toLowerCase();
  var newPin = (body.newPin || "").trim();
  var resetToken = (body.resetToken || "").trim();

  if (!email) {
    return jsonResponse({ success: false, error: "Email wajib diisi." });
  }
  if (!resetToken) {
    return jsonResponse({ success: false, error: "Token reset PIN wajib diisi." });
  }
  if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    return jsonResponse({ success: false, error: "PIN baru harus 6 digit angka." });
  }

  var cache = CacheService.getScriptCache();
  var cachedEmail = cache.get("rst_" + resetToken);
  if (!cachedEmail || cachedEmail.toLowerCase() !== email) {
    return jsonResponse({
      success: false,
      error: "Token reset PIN tidak valid atau sudah kadaluarsa (berlaku 15 menit)."
    });
  }

  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][6].toString().toLowerCase() === email) {
      var newHash = hashPin(newPin);
      sheet.getRange(i + 1, 4).setValue(newHash);

      cache.remove("rst_" + resetToken);
      writeAuditLog(data[i][0], data[i][1], "RESET_PIN", "PIN berhasil diubah via token reset untuk email: " + email);

      return jsonResponse({
        success: true,
        message: "PIN berhasil diubah! Silakan login dengan PIN baru."
      });
    }
  }

  return jsonResponse({
    success: false,
    error: "User dengan email tersebut tidak ditemukan."
  });
}

// ============================================================
// TIM B: MANAJEMEN KARYAWAN / TIM (USERS)
// ============================================================

function handleListUsers(body) {
  var user = getUserFromToken_(body.token);
  if (!user) {
    return jsonResponse({ success: false, error: "Session tidak valid. Silakan login lagi.", code: "UNAUTHORIZED" });
  }
  if (user.role !== "Owner" && user.role !== "Manajer") {
    return jsonResponse({ success: false, error: "Akses ditolak. Hanya Owner dan Manajer yang dapat melihat daftar tim.", code: "FORBIDDEN" });
  }

  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    list.push({
      id: data[i][0],
      nama: data[i][1],
      username: data[i][2],
      role: data[i][4],
      cabang: data[i][5],
      email: data[i][6],
      status: data[i][7],
      dibuat: data[i][8] instanceof Date ? formatDateIso_(data[i][8]) : (data[i][8] || "")
    });
  }
  return jsonResponse({ success: true, data: list });
}

function handleCreateUser(body) {
  var user = getUserFromToken_(body.token);
  if (!user) {
    return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });
  }
  if (user.role !== "Owner") {
    return jsonResponse({ success: false, error: "Hanya Owner yang dapat menambah anggota tim baru.", code: "FORBIDDEN" });
  }

  var nama = (body.nama || "").trim();
  var username = (body.username || "").trim().toLowerCase();
  var pin = (body.pin || "").trim();
  var role = (body.role || "").trim();
  var cabang = (body.cabang || "Patihan").trim();
  var email = (body.email || "").trim().toLowerCase();

  if (!nama) return jsonResponse({ success: false, error: "Nama lengkap wajib diisi." });
  if (!username) return jsonResponse({ success: false, error: "Username wajib diisi." });
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return jsonResponse({ success: false, error: "PIN awal harus 6 digit angka." });
  }
  if (["Owner", "Manajer", "Kasir", "Kapster"].indexOf(role) === -1) {
    return jsonResponse({ success: false, error: "Peran tidak valid. Pilih Owner, Manajer, Kasir, atau Kapster." });
  }
  if (!email || email.indexOf("@") === -1) {
    return jsonResponse({ success: false, error: "Email reset PIN tidak valid." });
  }

  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2].toString().toLowerCase() === username) {
      return jsonResponse({ success: false, error: "Username '" + username + "' sudah digunakan." });
    }
  }

  var id = "u-" + username.replace(/[^a-z0-9]/g, "-").slice(0, 15);
  var pinHash = hashPin(pin);
  var now = new Date();

  sheet.appendRow([id, nama, username, pinHash, role, cabang, email, "Aktif", now]);
  writeAuditLog(user.id, user.nama, "TAMBAH_USER", "Menambah anggota tim baru: " + nama + " (" + role + ")");

  return jsonResponse({
    success: true,
    message: "Anggota tim berhasil ditambahkan.",
    data: {
      id: id,
      nama: nama,
      username: username,
      role: role,
      cabang: cabang,
      email: email,
      status: "Aktif",
      dibuat: formatDateIso_(now)
    }
  });
}

function handleUpdateUser(body) {
  var user = getUserFromToken_(body.token);
  if (!user) {
    return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });
  }
  if (user.role !== "Owner") {
    return jsonResponse({ success: false, error: "Hanya Owner yang dapat mengubah data anggota tim.", code: "FORBIDDEN" });
  }

  var id = (body.id || "").trim();
  var nama = (body.nama || "").trim();
  var username = (body.username || "").trim().toLowerCase();
  var role = (body.role || "").trim();
  var cabang = (body.cabang || "Patihan").trim();
  var email = (body.email || "").trim().toLowerCase();
  var newPin = (body.newPin || "").trim();

  if (!id) return jsonResponse({ success: false, error: "ID user wajib diisi." });
  if (!nama) return jsonResponse({ success: false, error: "Nama lengkap wajib diisi." });
  if (!username) return jsonResponse({ success: false, error: "Username wajib diisi." });
  if (["Owner", "Manajer", "Kasir", "Kapster"].indexOf(role) === -1) {
    return jsonResponse({ success: false, error: "Peran tidak valid." });
  }
  if (!email || email.indexOf("@") === -1) {
    return jsonResponse({ success: false, error: "Email reset PIN tidak valid." });
  }
  if (newPin && (newPin.length !== 6 || !/^\d{6}$/.test(newPin))) {
    return jsonResponse({ success: false, error: "PIN baru harus 6 digit angka." });
  }

  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var targetRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      targetRow = i + 1;
    } else if (data[i][2].toString().toLowerCase() === username) {
      return jsonResponse({ success: false, error: "Username '" + username + "' sudah digunakan oleh akun lain." });
    }
  }

  if (targetRow === -1) {
    return jsonResponse({ success: false, error: "User tidak ditemukan." });
  }

  sheet.getRange(targetRow, 2).setValue(nama);
  sheet.getRange(targetRow, 3).setValue(username);
  sheet.getRange(targetRow, 5).setValue(role);
  sheet.getRange(targetRow, 6).setValue(cabang);
  sheet.getRange(targetRow, 7).setValue(email);

  if (newPin) {
    sheet.getRange(targetRow, 4).setValue(hashPin(newPin));
  }

  writeAuditLog(user.id, user.nama, "UPDATE_USER", "Mengubah data user: " + nama + " (" + id + ")");

  return jsonResponse({
    success: true,
    message: "Data anggota tim berhasil diperbarui."
  });
}

function handleToggleUserStatus(body) {
  var user = getUserFromToken_(body.token);
  if (!user) {
    return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });
  }
  if (user.role !== "Owner") {
    return jsonResponse({ success: false, error: "Hanya Owner yang dapat mengubah status anggota tim.", code: "FORBIDDEN" });
  }

  var id = (body.id || "").trim();
  var status = body.status === "Aktif" ? "Aktif" : "Nonaktif";

  if (!id) return jsonResponse({ success: false, error: "ID user wajib diisi." });
  if (id === user.id && status === "Nonaktif") {
    return jsonResponse({ success: false, error: "Anda tidak dapat menonaktifkan akun Anda sendiri." });
  }

  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var targetRow = -1;
  var targetName = "";

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      targetRow = i + 1;
      targetName = data[i][1];
      break;
    }
  }

  if (targetRow === -1) {
    return jsonResponse({ success: false, error: "User tidak ditemukan." });
  }

  sheet.getRange(targetRow, 8).setValue(status);
  writeAuditLog(user.id, user.nama, "TOGGLE_USER_STATUS", "Status user " + targetName + " diubah jadi: " + status);

  return jsonResponse({
    success: true,
    message: "Status " + targetName + " berhasil diubah menjadi " + status + "."
  });
}

// ============================================================
// TIM B: LAYANAN CRUD (PRICELIST)
// ============================================================

function handleCreateLayanan(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });
  if (user.role !== "Owner" && user.role !== "Manajer") {
    return jsonResponse({ success: false, error: "Akses ditolak.", code: "FORBIDDEN" });
  }

  var nama = (body.nama || "").trim();
  var harga = parseInt(body.harga, 10);

  if (!nama) return jsonResponse({ success: false, error: "Nama layanan wajib diisi." });
  if (isNaN(harga) || harga < 0) return jsonResponse({ success: false, error: "Harga layanan harus angka valid." });

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Layanan") || ss.insertSheet("Layanan");
  var data = sheet.getDataRange().getValues();
  var maxId = 0;
  for (var i = 1; i < data.length; i++) {
    var rowId = parseInt(data[i][0], 10);
    if (!isNaN(rowId) && rowId > maxId) maxId = rowId;
  }
  var nextId = maxId + 1;
  sheet.appendRow([nextId, nama, harga, "Aktif"]);

  writeAuditLog(user.id, user.nama, "TAMBAH_LAYANAN", "Menambah layanan: " + nama + " (Rp " + harga + ")");

  return jsonResponse({
    success: true,
    message: "Layanan berhasil ditambahkan.",
    data: { id: nextId, nama: nama, harga: harga, status: "Aktif" }
  });
}

function handleUpdateLayanan(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });
  if (user.role !== "Owner" && user.role !== "Manajer") {
    return jsonResponse({ success: false, error: "Akses ditolak.", code: "FORBIDDEN" });
  }

  var id = parseInt(body.id, 10);
  var nama = (body.nama || "").trim();
  var harga = parseInt(body.harga, 10);
  var status = body.status === "Nonaktif" ? "Nonaktif" : "Aktif";

  if (isNaN(id)) return jsonResponse({ success: false, error: "ID layanan tidak valid." });
  if (!nama) return jsonResponse({ success: false, error: "Nama layanan wajib diisi." });
  if (isNaN(harga) || harga < 0) return jsonResponse({ success: false, error: "Harga layanan tidak valid." });

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Layanan");
  if (!sheet) return jsonResponse({ success: false, error: "Sheet Layanan tidak ditemukan." });
  var data = sheet.getDataRange().getValues();
  var targetRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (parseInt(data[i][0], 10) === id) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) return jsonResponse({ success: false, error: "Layanan tidak ditemukan." });

  sheet.getRange(targetRow, 2).setValue(nama);
  sheet.getRange(targetRow, 3).setValue(harga);
  sheet.getRange(targetRow, 4).setValue(status);

  writeAuditLog(user.id, user.nama, "UPDATE_LAYANAN", "Mengubah layanan: " + nama + " (Rp " + harga + ", " + status + ")");

  return jsonResponse({ success: true, message: "Layanan berhasil diperbarui." });
}

function handleToggleLayanan(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });
  if (user.role !== "Owner" && user.role !== "Manajer") {
    return jsonResponse({ success: false, error: "Akses ditolak.", code: "FORBIDDEN" });
  }

  var id = parseInt(body.id, 10);
  var status = body.status === "Nonaktif" ? "Nonaktif" : "Aktif";

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Layanan");
  if (!sheet) return jsonResponse({ success: false, error: "Sheet Layanan tidak ditemukan." });
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (parseInt(data[i][0], 10) === id) {
      sheet.getRange(i + 1, 4).setValue(status);
      writeAuditLog(user.id, user.nama, "TOGGLE_LAYANAN", "Status layanan ID " + id + " diubah jadi: " + status);
      return jsonResponse({ success: true, message: "Status layanan berhasil diubah." });
    }
  }

  return jsonResponse({ success: false, error: "Layanan tidak ditemukan." });
}

// ============================================================
// TIM B: GAJI & KASBON (PAYROLL & CASH ADVANCE)
// ============================================================

function handleListKasbon(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Kasbon");
  if (!sheet) return jsonResponse({ success: true, data: [] });

  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    if (user.role === "Kapster" && data[i][2] !== user.id) continue;

    list.push({
      id: data[i][0],
      tanggal: data[i][1] instanceof Date ? formatDateIso_(data[i][1]) : (data[i][1] || ""),
      userId: data[i][2],
      nama: data[i][3],
      role: data[i][4],
      jumlah: parseInt(data[i][5], 10) || 0,
      status: data[i][6],
      catatan: data[i][7] || "",
      dibuatOleh: data[i][8] || "",
      lunasWaktu: data[i][9] ? (data[i][9] instanceof Date ? formatDateIso_(data[i][9]) : data[i][9]) : ""
    });
  }
  return jsonResponse({ success: true, data: list.reverse() });
}

function handleCreateKasbon(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });

  var userId = (body.userId || user.id).trim();
  var nama = (body.nama || user.nama).trim();
  var role = (body.role || user.role).trim();
  var jumlah = parseInt(body.jumlah, 10);
  var catatan = (body.catatan || "").trim();
  var tanggal = body.tanggal || formatDateIso_(new Date());

  if (user.role === "Kapster" && userId !== user.id) {
    return jsonResponse({ success: false, error: "Kapster hanya dapat mengajukan kasbon untuk dirinya sendiri.", code: "FORBIDDEN" });
  }

  if (isNaN(jumlah) || jumlah <= 0) {
    return jsonResponse({ success: false, error: "Jumlah kasbon harus angka lebih dari 0." });
  }

  ensureTimBSheets_();
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Kasbon");
  var id = "ksb-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8);

  sheet.appendRow([id, tanggal, userId, nama, role, jumlah, "Aktif", catatan, user.nama, ""]);
  writeAuditLog(user.id, user.nama, "TAMBAH_KASBON", "Kasbon baru untuk " + nama + " sebesar Rp " + jumlah);

  return jsonResponse({
    success: true,
    message: "Kasbon berhasil dicatat.",
    data: { id: id, tanggal: tanggal, userId: userId, nama: nama, role: role, jumlah: jumlah, status: "Aktif", catatan: catatan }
  });
}

function handleLunasiKasbon(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });
  if (user.role !== "Owner" && user.role !== "Manajer") {
    return jsonResponse({ success: false, error: "Akses ditolak.", code: "FORBIDDEN" });
  }

  var id = (body.id || "").trim();
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Kasbon");
  if (!sheet) return jsonResponse({ success: false, error: "Sheet Kasbon tidak ditemukan." });

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.getRange(i + 1, 7).setValue("Lunas");
      sheet.getRange(i + 1, 10).setValue(new Date());
      writeAuditLog(user.id, user.nama, "LUNASI_KASBON", "Melunasi kasbon ID " + id);
      return jsonResponse({ success: true, message: "Kasbon berhasil dilunasi." });
    }
  }

  return jsonResponse({ success: false, error: "Kasbon tidak ditemukan." });
}

function handleHitungGaji(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });

  var targetUserId = (body.userId || user.id).trim();
  if (user.role === "Kapster" && targetUserId !== user.id) {
    return jsonResponse({ success: false, error: "Akses ditolak.", code: "FORBIDDEN" });
  }

  var ss = getSpreadsheet();
  ensureTimBSheets_();

  // Hitung total komisi dari TransaksiItem yang transaksinya "Selesai"
  var itemSheet = ss.getSheetByName("TransaksiItem");
  var trxSheet = ss.getSheetByName("Transaksi");
  var statusTrxMap = {};
  if (trxSheet) {
    var trxData = trxSheet.getDataRange().getValues();
    for (var t = 1; t < trxData.length; t++) {
      statusTrxMap[trxData[t][0]] = trxData[t][11]; // status transaksi
    }
  }

  var totalKomisi = 0;
  var countTrx = 0;
  var detailKomisi = [];
  if (itemSheet) {
    var itemData = itemSheet.getDataRange().getValues();
    for (var i = 1; i < itemData.length; i++) {
      var trxId = itemData[i][0];
      var kapsterId = itemData[i][6];
      var komisi = parseInt(itemData[i][8], 10) || 0;
      if (kapsterId === targetUserId && statusTrxMap[trxId] === "Selesai") {
        totalKomisi += komisi;
        countTrx++;
        detailKomisi.push({
          trxId: trxId,
          item: itemData[i][3],
          komisi: komisi
        });
      }
    }
  }

  // Hitung kasbon aktif
  var kasbonSheet = ss.getSheetByName("Kasbon");
  var totalKasbon = 0;
  var kasbonList = [];
  if (kasbonSheet) {
    var kData = kasbonSheet.getDataRange().getValues();
    for (var k = 1; k < kData.length; k++) {
      if (kData[k][2] === targetUserId && kData[k][6] === "Aktif") {
        var jml = parseInt(kData[k][5], 10) || 0;
        totalKasbon += jml;
        kasbonList.push({
          id: kData[k][0],
          tanggal: kData[k][1] instanceof Date ? formatDateIso_(kData[k][1]) : kData[k][1],
          jumlah: jml,
          catatan: kData[k][7]
        });
      }
    }
  }

  var gajiBersih = Math.max(0, totalKomisi - totalKasbon);

  return jsonResponse({
    success: true,
    data: {
      userId: targetUserId,
      totalKomisi: totalKomisi,
      totalKasbon: totalKasbon,
      gajiBersih: gajiBersih,
      transaksiSelesai: countTrx,
      kasbonAktif: kasbonList
    }
  });
}

function handleBayarGaji(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });
  if (user.role !== "Owner" && user.role !== "Manajer") {
    return jsonResponse({ success: false, error: "Hanya Owner dan Manajer yang dapat memproses pembayaran gaji.", code: "FORBIDDEN" });
  }

  var targetUserId = (body.userId || "").trim();
  var targetNama = (body.nama || "").trim();
  var role = (body.role || "Kapster").trim();
  var periode = (body.periode || formatDateIso_(new Date()).slice(0, 7)).trim();
  var totalKomisi = parseInt(body.totalKomisi, 10) || 0;
  var totalKasbon = parseInt(body.totalKasbon, 10) || 0;
  var gajiBersih = parseInt(body.gajiBersih, 10) || Math.max(0, totalKomisi - totalKasbon);
  var catatan = (body.catatan || "").trim();

  if (!targetUserId || !targetNama) {
    return jsonResponse({ success: false, error: "User penerima gaji wajib diisi." });
  }

  ensureTimBSheets_();
  var ss = getSpreadsheet();
  var gajiSheet = ss.getSheetByName("Gaji");
  var id = "gji-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8);
  var now = new Date();

  gajiSheet.appendRow([
    id, periode, targetUserId, targetNama, role, totalKomisi, totalKasbon, gajiBersih, "Dibayar", now, user.nama, catatan
  ]);

  // Otomatis lunasi kasbon aktif untuk user ini
  var kasbonSheet = ss.getSheetByName("Kasbon");
  if (kasbonSheet) {
    var kData = kasbonSheet.getDataRange().getValues();
    for (var k = 1; k < kData.length; k++) {
      if (kData[k][2] === targetUserId && kData[k][6] === "Aktif") {
        kasbonSheet.getRange(k + 1, 7).setValue("Lunas");
        kasbonSheet.getRange(k + 1, 10).setValue(now);
      }
    }
  }

  writeAuditLog(user.id, user.nama, "BAYAR_GAJI", "Membayar gaji periode " + periode + " untuk " + targetNama + " sebesar Rp " + gajiBersih);

  return jsonResponse({
    success: true,
    message: "Pembayaran gaji untuk " + targetNama + " berhasil dicatat.",
    data: { id: id, gajiBersih: gajiBersih, status: "Dibayar" }
  });
}

function handleListGaji(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Gaji");
  if (!sheet) return jsonResponse({ success: true, data: [] });

  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    if (user.role === "Kapster" && data[i][2] !== user.id) continue;

    list.push({
      id: data[i][0],
      periode: data[i][1],
      userId: data[i][2],
      nama: data[i][3],
      role: data[i][4],
      totalKomisi: parseInt(data[i][5], 10) || 0,
      totalKasbon: parseInt(data[i][6], 10) || 0,
      gajiBersih: parseInt(data[i][7], 10) || 0,
      status: data[i][8],
      tanggalBayar: data[i][9] instanceof Date ? formatDateIso_(data[i][9]) : (data[i][9] || ""),
      dibayarOleh: data[i][10] || "",
      catatan: data[i][11] || ""
    });
  }
  return jsonResponse({ success: true, data: list.reverse() });
}

// ============================================================
// TIM B: LAPORAN RINGKASAN
// ============================================================

function handleRingkasanLaporan(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });
  if (user.role !== "Owner" && user.role !== "Manajer") {
    return jsonResponse({ success: false, error: "Akses ditolak.", code: "FORBIDDEN" });
  }

  var dari = (body.dari || "").trim(); // YYYY-MM-DD
  var sampai = (body.sampai || "").trim(); // YYYY-MM-DD

  var ss = getSpreadsheet();
  var trxSheet = ss.getSheetByName("Transaksi");
  var expSheet = ss.getSheetByName("Pengeluaran");

  var totalOmset = 0;
  var totalDiskon = 0;
  var totalBayarTunai = 0;
  var totalBayarQris = 0;
  var totalKomisi = 0;
  var countTrx = 0;
  var daily = {};

  if (trxSheet) {
    var tData = trxSheet.getDataRange().getValues();
    for (var i = 1; i < tData.length; i++) {
      var status = tData[i][11];
      if (status !== "Selesai") continue;

      var tgl = tData[i][2] instanceof Date ? formatDateIso_(tData[i][2]) : (tData[i][2] || "").toString();
      if (dari && tgl < dari) continue;
      if (sampai && tgl > sampai) continue;

      var total = parseInt(tData[i][7], 10) || 0;
      var diskon = parseInt(tData[i][6], 10) || 0;
      var tunai = parseInt(tData[i][8], 10) || 0;
      var qris = parseInt(tData[i][9], 10) || 0;
      var komisi = parseInt(tData[i][10], 10) || 0;

      totalOmset += total;
      totalDiskon += diskon;
      totalBayarTunai += tunai;
      totalBayarQris += qris;
      totalKomisi += komisi;
      countTrx++;

      if (!daily[tgl]) {
        daily[tgl] = { tanggal: tgl, omset: 0, tunai: 0, qris: 0, count: 0 };
      }
      daily[tgl].omset += total;
      daily[tgl].tunai += tunai;
      daily[tgl].qris += qris;
      daily[tgl].count++;
    }
  }

  var totalPengeluaran = 0;
  var pengeluaranKategori = {};
  if (expSheet) {
    var eData = expSheet.getDataRange().getValues();
    for (var j = 1; j < eData.length; j++) {
      var expStatus = eData[j][5];
      if (expStatus !== "Aktif") continue;

      var eTgl = eData[j][1] instanceof Date ? formatDateIso_(eData[j][1]) : (eData[j][1] || "").toString();
      if (dari && eTgl < dari) continue;
      if (sampai && eTgl > sampai) continue;

      var jumlah = parseInt(eData[j][4], 10) || 0;
      var kat = eData[j][2] || "Lain-lain";

      totalPengeluaran += jumlah;
      pengeluaranKategori[kat] = (pengeluaranKategori[kat] || 0) + jumlah;
    }
  }

  var sisaOwner = totalOmset - totalPengeluaran - totalKomisi;

  return jsonResponse({
    success: true,
    data: {
      totalOmset: totalOmset,
      totalDiskon: totalDiskon,
      totalBayarTunai: totalBayarTunai,
      totalBayarQris: totalBayarQris,
      totalKomisi: totalKomisi,
      totalPengeluaran: totalPengeluaran,
      sisaOwner: sisaOwner,
      jumlahTransaksi: countTrx,
      pengeluaranKategori: pengeluaranKategori,
      harian: Object.values(daily)
    }
  });
}

// ============================================================
// TIM B: ABSENSI FOTO
// ============================================================

function handleCatatAbsensi(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });

  var tipe = body.tipe === "Pulang" ? "Pulang" : "Masuk";
  var fotoUrl = (body.fotoUrl || "").trim();
  var catatan = (body.catatan || "").trim();
  var now = new Date();
  var tglStr = formatDateIso_(now);
  var jamStr = formatTimeHhmm_(now);

  ensureTimBSheets_();
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Absensi");
  var id = "abs-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8);

  sheet.appendRow([
    id, now, tglStr, jamStr, user.id, user.nama, user.role, tipe, fotoUrl, "Hadir", catatan
  ]);

  writeAuditLog(user.id, user.nama, "ABSENSI", "Absensi " + tipe + " pada " + jamStr);

  return jsonResponse({
    success: true,
    message: "Absensi " + tipe + " berhasil dicatat.",
    data: {
      id: id,
      waktu: now,
      tanggal: tglStr,
      jam: jamStr,
      nama: user.nama,
      tipe: tipe,
      status: "Hadir"
    }
  });
}

function handleListAbsensi(body) {
  var user = getUserFromToken_(body.token);
  if (!user) return jsonResponse({ success: false, error: "Session tidak valid.", code: "UNAUTHORIZED" });

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Absensi");
  if (!sheet) return jsonResponse({ success: true, data: [] });

  var targetTanggal = (body.tanggal || "").trim();
  var targetUserId = (body.userId || "").trim();

  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var rowUserId = data[i][4];
    var rowTgl = data[i][2] instanceof Date ? formatDateIso_(data[i][2]) : (data[i][2] || "").toString();

    // Kapster hanya melihat absensinya sendiri
    if (user.role === "Kapster" && rowUserId !== user.id) continue;
    if (targetUserId && rowUserId !== targetUserId) continue;
    if (targetTanggal && rowTgl !== targetTanggal) continue;

    var rowJam = data[i][3] instanceof Date ? formatTimeHhmm_(data[i][3]) : (data[i][3] || "").toString();

    list.push({
      id: data[i][0],
      waktu: data[i][1] instanceof Date ? data[i][1].toISOString() : (data[i][1] || ""),
      tanggal: rowTgl,
      jam: rowJam,
      userId: rowUserId,
      nama: data[i][5],
      role: data[i][6],
      tipe: data[i][7],
      fotoUrl: data[i][8] || "",
      status: data[i][9],
      catatan: data[i][10] || ""
    });
  }

  return jsonResponse({ success: true, data: list.reverse() });
}
