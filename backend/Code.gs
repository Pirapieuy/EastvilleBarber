// ============================================================
// EASTVILLE BARBERSHOP - Backend Login (Google Apps Script)
// ============================================================
// File ini di-copy paste ke Google Apps Script Editor
// Google Sheets digunakan sebagai database
// ============================================================

// ---- KONFIGURASI ----
// Ganti dengan ID Google Sheets kamu
// ID ada di URL: https://docs.google.com/spreadsheets/d/{ID_INI}/edit
var SPREADSHEET_ID = "GANTI_DENGAN_ID_SPREADSHEET_KAMU";
var SHEET_USERS = "Users";
var SHEET_SESSIONS = "Sessions";
var SHEET_AUDIT = "AuditLog";

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
 * Generate session token
 */
function generateToken() {
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var token = "";
  for (var i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Hash PIN sederhana (SHA-256)
 * CATATAN: Untuk project sekolah ini cukup. Untuk produksi gunakan bcrypt.
 */
function hashPin(pin) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin);
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
function writeAuditLog(userId, userName, action, detail) {
  try {
    var sheet = getSheet(SHEET_AUDIT);
    sheet.appendRow([
      new Date(),           // Waktu
      userId,               // User ID
      userName,             // Nama User
      action,               // Aksi (LOGIN, LOGOUT, RESET_PIN, dll)
      detail,               // Detail
      ""                    // Alasan (kosong untuk login)
    ]);
  } catch (e) {
    // Jangan gagalkan operasi utama kalau audit gagal
    Logger.log("Audit log error: " + e.message);
  }
}


// ============================================================
// SETUP - Jalankan sekali untuk membuat struktur sheet
// ============================================================

/**
 * Jalankan fungsi ini SEKALI untuk membuat sheet & data awal.
 * Caranya: buka Apps Script Editor > pilih fungsi setupSheets > klik Run
 */
function setupSheets() {
  var ss = getSpreadsheet();

  // ---- Sheet Users ----
  var usersSheet = ss.getSheetByName(SHEET_USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_USERS);
  }
  // Header
  usersSheet.getRange(1, 1, 1, 9).setValues([[
    "id", "nama", "username", "pin_hash", "role", "cabang", "email", "status", "dibuat"
  ]]);
  // Bold header
  usersSheet.getRange(1, 1, 1, 9).setFontWeight("bold");

  // Data demo (PIN semua: 123456)
  var pinHash = hashPin("123456");
  var demoData = [
    ["u-owner",   "Ardi Pradana",  "ardi.owner",   pinHash, "Owner",   "Semua cabang", "ardi@eastville.id",  "Aktif", new Date()],
    ["u-manajer", "Dian Setiawan", "dian.manajer",  pinHash, "Manajer", "Patihan",      "dian@eastville.id",  "Aktif", new Date()],
    ["u-kasir",   "Siti Rahma",    "siti.kasir",    pinHash, "Kasir",   "Patihan",      "siti@eastville.id",  "Aktif", new Date()],
    ["u-kapster", "Budi Santoso",  "budi.kapster",  pinHash, "Kapster", "Patihan",      "budi@eastville.id",  "Aktif", new Date()]
  ];
  usersSheet.getRange(2, 1, demoData.length, 9).setValues(demoData);

  // ---- Sheet Sessions ----
  var sessionsSheet = ss.getSheetByName(SHEET_SESSIONS);
  if (!sessionsSheet) {
    sessionsSheet = ss.insertSheet(SHEET_SESSIONS);
  }
  sessionsSheet.getRange(1, 1, 1, 5).setValues([[
    "token", "user_id", "login_time", "expire_time", "status"
  ]]);
  sessionsSheet.getRange(1, 1, 1, 5).setFontWeight("bold");

  // ---- Sheet AuditLog ----
  var auditSheet = ss.getSheetByName(SHEET_AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(SHEET_AUDIT);
  }
  auditSheet.getRange(1, 1, 1, 6).setValues([[
    "waktu", "user_id", "nama_user", "aksi", "detail", "alasan"
  ]]);
  auditSheet.getRange(1, 1, 1, 6).setFontWeight("bold");

  Logger.log("Setup selesai! Sheet Users, Sessions, dan AuditLog sudah dibuat.");
}


// ============================================================
// WEB APP HANDLER - Menerima request dari frontend
// ============================================================

/**
 * Handle GET request (untuk test apakah API aktif)
 */
function doGet(e) {
  return jsonResponse({
    success: true,
    message: "Eastville Barbershop API aktif",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle POST request (login, logout, reset PIN, dll)
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    switch (action) {
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
      default:
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
// HANDLER FUNGSI LOGIN
// ============================================================

/**
 * Login - verifikasi username + PIN
 * Body: { action: "login", username: "...", pin: "123456" }
 */
function handleLogin(body) {
  var username = (body.username || "").trim().toLowerCase();
  var pin = (body.pin || "").trim();

  // Validasi input
  if (!username) {
    return jsonResponse({ success: false, error: "Username wajib diisi." });
  }
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return jsonResponse({ success: false, error: "PIN harus 6 digit angka." });
  }

  // Cari user di sheet
  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var user = null;
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) { // mulai dari 1, skip header
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

  // User tidak ditemukan
  if (!user) {
    return jsonResponse({
      success: false,
      error: "Username tidak ditemukan."
    });
  }

  // User nonaktif
  if (user.status !== "Aktif") {
    return jsonResponse({
      success: false,
      error: "Akun Anda sudah dinonaktifkan. Hubungi Owner."
    });
  }

  // Verifikasi PIN
  var inputHash = hashPin(pin);
  if (inputHash !== user.pinHash) {
    // Catat percobaan gagal di audit
    writeAuditLog(user.id, user.nama, "LOGIN_GAGAL", "PIN salah untuk username: " + username);
    return jsonResponse({
      success: false,
      error: "PIN salah. Silakan coba lagi."
    });
  }

  // Login berhasil - buat session
  var token = generateToken();
  var now = new Date();
  var expire = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 jam

  var sessionsSheet = getSheet(SHEET_SESSIONS);
  sessionsSheet.appendRow([token, user.id, now, expire, "Aktif"]);

  // Catat di audit log
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


// ============================================================
// HANDLER FUNGSI LOGOUT
// ============================================================

/**
 * Logout - hapus session
 * Body: { action: "logout", token: "..." }
 */
function handleLogout(body) {
  var token = (body.token || "").trim();

  if (!token) {
    return jsonResponse({ success: false, error: "Token wajib diisi." });
  }

  var sheet = getSheet(SHEET_SESSIONS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      // Set status jadi "Logout"
      sheet.getRange(i + 1, 5).setValue("Logout");

      // Cari nama user untuk audit
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


// ============================================================
// HANDLER VERIFIKASI SESSION
// ============================================================

/**
 * Verifikasi apakah session masih aktif
 * Body: { action: "verify-session", token: "..." }
 */
function handleVerifySession(body) {
  var token = (body.token || "").trim();

  if (!token) {
    return jsonResponse({ success: false, error: "Token wajib diisi." });
  }

  var sessionsSheet = getSheet(SHEET_SESSIONS);
  var sessionsData = sessionsSheet.getDataRange().getValues();
  var session = null;

  for (var i = 1; i < sessionsData.length; i++) {
    if (sessionsData[i][0] === token && sessionsData[i][4] === "Aktif") {
      session = {
        userId:  sessionsData[i][1],
        expire:  sessionsData[i][3]
      };
      break;
    }
  }

  if (!session) {
    return jsonResponse({
      success: false,
      error: "Session tidak valid atau sudah logout."
    });
  }

  // Cek expired
  if (new Date() > new Date(session.expire)) {
    return jsonResponse({
      success: false,
      error: "Session sudah kadaluarsa. Silakan login lagi."
    });
  }

  // Ambil data user
  var usersSheet = getSheet(SHEET_USERS);
  var usersData = usersSheet.getDataRange().getValues();

  for (var j = 1; j < usersData.length; j++) {
    if (usersData[j][0] === session.userId) {
      return jsonResponse({
        success: true,
        data: {
          user: {
            id:       usersData[j][0],
            name:     usersData[j][1],
            username: usersData[j][2],
            role:     usersData[j][4],
            branch:   usersData[j][5]
          }
        }
      });
    }
  }

  return jsonResponse({
    success: false,
    error: "User tidak ditemukan."
  });
}


// ============================================================
// HANDLER LUPA PIN
// ============================================================

/**
 * Lupa PIN - cek email terdaftar
 * Body: { action: "forgot-pin", email: "..." }
 *
 * CATATAN: Di project sekolah ini, kita simulasi saja.
 * Di dunia nyata, ini akan mengirim email reset link.
 */
function handleForgotPin(body) {
  var email = (body.email || "").trim().toLowerCase();

  if (!email || email.indexOf("@") === -1) {
    return jsonResponse({ success: false, error: "Email tidak valid." });
  }

  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();
  var found = false;
  var userId = "";
  var userName = "";

  for (var i = 1; i < data.length; i++) {
    if (data[i][6].toString().toLowerCase() === email) {
      found = true;
      userId = data[i][0];
      userName = data[i][1];
      break;
    }
  }

  if (!found) {
    return jsonResponse({
      success: false,
      error: "Email tidak terdaftar di sistem."
    });
  }

  // Catat di audit
  writeAuditLog(userId, userName, "FORGOT_PIN", "Permintaan reset PIN via email: " + email);

  // Di project sekolah: simulasi berhasil
  // Di dunia nyata: kirim email pakai MailApp.sendEmail()
  return jsonResponse({
    success: true,
    message: "Tautan reset PIN telah dikirim ke " + email,
    data: {
      // Token reset (di dunia nyata ini dikirim via email, bukan di response)
      // Untuk simulasi project sekolah, kita kembalikan di sini
      resetToken: generateId("rst")
    }
  });
}


// ============================================================
// HANDLER RESET PIN
// ============================================================

/**
 * Reset PIN - ubah PIN user
 * Body: { action: "reset-pin", email: "...", newPin: "654321" }
 */
function handleResetPin(body) {
  var email = (body.email || "").trim().toLowerCase();
  var newPin = (body.newPin || "").trim();

  if (!email) {
    return jsonResponse({ success: false, error: "Email wajib diisi." });
  }
  if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    return jsonResponse({ success: false, error: "PIN baru harus 6 digit angka." });
  }

  var sheet = getSheet(SHEET_USERS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][6].toString().toLowerCase() === email) {
      // Update PIN hash di kolom 4 (index 3, tapi range 1-based jadi kolom 4)
      var newHash = hashPin(newPin);
      sheet.getRange(i + 1, 4).setValue(newHash);

      writeAuditLog(data[i][0], data[i][1], "RESET_PIN", "PIN berhasil diubah via email: " + email);

      return jsonResponse({
        success: true,
        message: "PIN berhasil diubah! Silakan login dengan PIN baru."
      });
    }
  }

  return jsonResponse({
    success: false,
    error: "Email tidak ditemukan."
  });
}
