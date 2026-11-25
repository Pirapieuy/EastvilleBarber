// Padanan handleLogin / handleLogout / handleVerifySession di Kode.js.
import {
  buatToken, db, gagal, hashPin, ok, penggunaDariToken, tulisAudit, verifyPin,
} from "../util.ts"

const PESAN_KUNCI =
  "Akun terkunci sementara karena 5 kali salah PIN. Silakan coba lagi dalam 5 menit."

const profil = (u: { id: string; nama: string; username: string; role: string; cabang: string }) => ({
  id: u.id, name: u.nama, username: u.username, role: u.role, branch: u.cabang,
})

export async function login(body: Record<string, string>) {
  const username = (body.username || "").trim().toLowerCase()
  const pin = (body.pin || "").trim()
  if (!username) return gagal("Username wajib diisi.")
  if (!/^\d{6}$/.test(pin)) return gagal("PIN harus 6 digit angka.")

  const { data: cek } = await db.from("login_gagal").select("*").eq("username", username).maybeSingle()
  if (cek?.kunci_sampai && new Date(cek.kunci_sampai) > new Date()) return gagal(PESAN_KUNCI)

  const { data: user, error: errUser } = await db.from("users").select("*").ilike("username", username).maybeSingle()
  if (errUser) throw new Error("DB: " + errUser.message)

  // Username tak dikenal dan PIN salah diperlakukan sama (pesan, hitungan percobaan, kunci), supaya
  // orang luar tidak bisa menebak username mana yang terdaftar. Status akun baru dibuka bila PIN benar.
  const benar = !!user && (await verifyPin(pin, user!.pin_hash))
  if (!benar) {
    const baru = cek && Date.now() - new Date(cek.terakhir).getTime() < 300_000
    const jumlah = (baru ? cek!.jumlah : 0) + 1
    if (jumlah >= 5) {
      await db.from("login_gagal").upsert({
        username, jumlah: 0, terakhir: new Date().toISOString(),
        kunci_sampai: new Date(Date.now() + 300_000).toISOString(),
      })
      if (user) await tulisAudit(user.id, user.nama, "LOCKOUT", "Akun terkunci 5 menit setelah 5x salah PIN: " + username)
      return gagal(PESAN_KUNCI)
    }
    await db.from("login_gagal").upsert({
      username, jumlah, terakhir: new Date().toISOString(), kunci_sampai: null,
    })
    if (user) await tulisAudit(user.id, user.nama, "LOGIN_GAGAL",
      `PIN salah untuk username: ${username} (percobaan ${jumlah}/5)`)
    return gagal(`Username atau PIN salah. Sisa percobaan: ${5 - jumlah} kali.`)
  }
  if (user!.status !== "Aktif") return gagal("Akun Anda sudah dinonaktifkan. Hubungi Owner.")

  await db.from("login_gagal").delete().eq("username", username)
  // hash lama tanpa salt di-upgrade otomatis
  if (!String(user!.pin_hash).includes("$"))
    await db.from("users").update({ pin_hash: await hashPin(pin) }).eq("id", user!.id)

  // sesi yang sudah lewat 1 hari dari kadaluarsa atau sudah logout dibuang agar tabel tidak menggunung
  await db.from("sessions").delete().lt("expire_time", new Date(Date.now() - 86_400_000).toISOString())
  const token = buatToken()
  await db.from("sessions").insert({
    token, user_id: user!.id, expire_time: new Date(Date.now() + 8 * 3600_000).toISOString(),
  })
  await tulisAudit(user!.id, user!.nama, "LOGIN", "Login berhasil dari role: " + user!.role)
  return ok({ token, user: profil(user!) }, "Login berhasil!")
}

export async function logout(body: Record<string, string>) {
  const token = (body.token || "").trim()
  if (!token) return gagal("Token wajib diisi.")
  const { data: s } = await db.from("sessions").select("user_id").eq("token", token).maybeSingle()
  if (!s) return gagal("Session tidak ditemukan.")
  await db.from("sessions").update({ status: "Logout" }).eq("token", token)
  await tulisAudit(s.user_id, "", "LOGOUT", "Logout berhasil")
  return ok(undefined, "Logout berhasil.")
}

export async function verifySession(body: Record<string, string>) {
  const token = (body.token || "").trim()
  if (!token) return gagal("Token wajib diisi.")
  const u = await penggunaDariToken(token)
  if (!u) return gagal("Session tidak valid atau sudah kadaluarsa.")
  return ok({ user: profil(u) })
}
