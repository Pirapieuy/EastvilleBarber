// Padanan handleForgotPin, handleResetPin, handleListUsers, handleCreateUser,
// handleUpdateUser, handleToggleUserStatus di Kode.js.
import { ApiError, db, gagal, hashPin, ok, tanggalIso, tulisAudit, wajibRole } from "../util.ts"

const ROLE_VALID = ["Owner", "Kasir", "Kapster"]
/** true bila setelah `id` berhenti jadi Owner aktif masih ada Owner aktif lain. */
async function adaOwnerLain(id: string) {
  const { data } = await db.from("users").select("id").eq("role", "Owner").eq("status", "Aktif").neq("id", id).limit(1)
  return !!data?.length
}
const enam = (s: string) => /^\d{6}$/.test(s)

// Reset PIN lewat email DIMATIKAN: dulu token reset dikirim langsung ke browser, sehingga siapa pun yang tahu
// email seorang user bisa mengganti PIN-nya tanpa membuka kotak masuk. PIN yang lupa diganti Owner dari menu Tim
// (update-user dengan newPin). Pesan ini tampil apa adanya di layar "Lupa PIN".
const PESAN_RESET = "Reset PIN lewat email belum diaktifkan. Minta Owner mengganti PIN Anda di menu Tim."

export async function forgotPin(_body: Record<string, string>) {
  return gagal(PESAN_RESET)
}

export async function resetPin(_body: Record<string, string>) {
  return gagal(PESAN_RESET)
}

export async function listUsers(body: Record<string, string>) {
  await wajibRole(body.token, ["Owner"])
  const { data } = await db.from("users").select("id,nama,username,role,cabang,email,status,dibuat").order("dibuat")
  return ok(
    (data ?? [])
      .filter((u) => u.status !== "Dihapus")
      .map((u) => ({ ...u, dibuat: tanggalIso(new Date(u.dibuat)) })),
  )
}

export async function createUser(body: Record<string, string>) {
  const admin = await wajibRole(body.token, ["Owner"])
  const nama = (body.nama || "").trim()
  const username = (body.username || "").trim().toLowerCase()
  const pin = (body.pin || "").trim()
  const role = (body.role || "").trim()
  const cabang = (body.cabang || "Patihan").trim()
  const email = (body.email || "").trim().toLowerCase()
  if (!nama) return gagal("Nama lengkap wajib diisi.")
  if (!username) return gagal("Username wajib diisi.")
  if (!enam(pin)) return gagal("PIN awal harus 6 digit angka.")
  if (!ROLE_VALID.includes(role)) return gagal("Peran tidak valid. Pilih Owner, Kasir, atau Kapster.")
  if (!email || !email.includes("@")) return gagal("Email reset PIN tidak valid.")

  const { data: semua } = await db.from("users").select("id,username,email")
  for (const r of semua ?? []) {
    if (r.username.toLowerCase() === username) return gagal(`Username '${username}' sudah digunakan.`)
    if ((r.email || "").toLowerCase() === email) return gagal(`Email '${email}' sudah dipakai akun lain.`)
  }
  const dipakai = new Set((semua ?? []).map((r) => r.id.toLowerCase()))
  const dasar = "u-" + username.replace(/[^a-z0-9]/g, "-").slice(0, 15)
  let id = dasar, n = 2
  while (dipakai.has(id.toLowerCase())) id = dasar + n++

  const { data: baru, error } = await db.from("users").insert({
    id, nama, username, pin_hash: await hashPin(pin), role, cabang, email, status: "Aktif",
  }).select("dibuat").single()
  if (error) throw new ApiError(error.message)
  await tulisAudit(admin.id, admin.nama, "TAMBAH_USER", `Menambah anggota tim baru: ${nama} (${role})`)
  return ok({ id, nama, username, role, cabang, email, status: "Aktif", dibuat: tanggalIso(new Date(baru.dibuat)) },
    "Anggota tim berhasil ditambahkan.")
}

export async function updateUser(body: Record<string, string>) {
  const admin = await wajibRole(body.token, ["Owner"])
  const id = (body.id || "").trim()
  const nama = (body.nama || "").trim()
  const username = (body.username || "").trim().toLowerCase()
  const role = (body.role || "").trim()
  const cabang = (body.cabang || "Patihan").trim()
  const email = (body.email || "").trim().toLowerCase()
  const newPin = (body.newPin || "").trim()
  if (!id) return gagal("ID user wajib diisi.")
  if (!nama) return gagal("Nama lengkap wajib diisi.")
  if (!username) return gagal("Username wajib diisi.")
  if (!ROLE_VALID.includes(role)) return gagal("Peran tidak valid.")
  if (!email || !email.includes("@")) return gagal("Email reset PIN tidak valid.")
  if (newPin && !enam(newPin)) return gagal("PIN baru harus 6 digit angka.")

  const { data: semua } = await db.from("users").select("id,username,email")
  let ada = false
  for (const r of semua ?? []) {
    if (r.id === id) { ada = true; continue }
    if (r.username.toLowerCase() === username) return gagal(`Username '${username}' sudah digunakan oleh akun lain.`)
    if ((r.email || "").toLowerCase() === email) return gagal(`Email '${email}' sudah dipakai akun lain.`)
  }
  if (!ada) return gagal("User tidak ditemukan.")
  const { data: lama } = await db.from("users").select("role").eq("id", id).maybeSingle()
  if (lama?.role === "Owner" && role !== "Owner" && !(await adaOwnerLain(id)))
    return gagal("Tidak bisa mengubah peran: ini satu-satunya Owner aktif.")
  if (id === admin.id && role !== lama?.role) return gagal("Anda tidak dapat mengubah peran akun Anda sendiri.")
  const ubah: Record<string, string> = { nama, username, role, cabang, email }
  if (newPin) ubah.pin_hash = await hashPin(newPin)
  await db.from("users").update(ubah).eq("id", id)
  await tulisAudit(admin.id, admin.nama, "UPDATE_USER", `Mengubah data user: ${nama} (${id})`)
  return ok(undefined, "Data anggota tim berhasil diperbarui.")
}

export async function toggleUserStatus(body: Record<string, string>) {
  const admin = await wajibRole(body.token, ["Owner"])
  const id = (body.id || "").trim()
  const status = body.status === "Aktif" ? "Aktif" : "Nonaktif"
  if (!id) return gagal("ID user wajib diisi.")
  if (id === admin.id && status === "Nonaktif") return gagal("Anda tidak dapat menonaktifkan akun Anda sendiri.")
  const { data: t } = await db.from("users").select("nama,role,status").eq("id", id).maybeSingle()
  if (!t || t.status === "Dihapus") return gagal("User tidak ditemukan.")
  if (status === "Nonaktif" && t.role === "Owner" && !(await adaOwnerLain(id)))
    return gagal("Tidak bisa menonaktifkan satu-satunya Owner aktif.")
  await db.from("users").update({ status }).eq("id", id)
  if (status === "Nonaktif") await db.from("sessions").update({ status: "Nonaktif" }).eq("user_id", id).eq("status", "Aktif")
  await tulisAudit(admin.id, admin.nama, "TOGGLE_USER_STATUS", `Status user ${t.nama} diubah jadi: ${status}`)
  return ok(undefined, `Status ${t.nama} berhasil diubah menjadi ${status}.`)
}

export async function deleteUser(body: Record<string, string>) {
  const admin = await wajibRole(body.token, ["Owner"])
  const id = (body.id || "").trim()
  const alasan = (body.alasan || "").trim()
  if (!id) return gagal("ID anggota wajib diisi.")
  if (alasan.length < 5)
    return gagal("Alasan penghapusan wajib diisi (minimal 5 karakter).")
  if (id === admin.id) return gagal("Anda tidak dapat menghapus akun sendiri.")

  const { data: target } = await db.from("users")
    .select("id,nama,role,status")
    .eq("id", id)
    .maybeSingle()
  if (!target || target.status === "Dihapus") return gagal("Anggota tidak ditemukan.")
  if (target.role === "Owner") return gagal("Akun Owner tidak dapat dihapus.")

  const { error } = await db.from("users").update({ status: "Dihapus" }).eq("id", id)
  if (error) throw new ApiError(error.message)
  await db.from("sessions").update({ status: "Nonaktif" }).eq("user_id", id)
  await tulisAudit(
    admin.id,
    admin.nama,
    "HAPUS_USER",
    `Menghapus anggota tim: ${target.nama} (${id})`,
    alasan,
  )
  return ok(undefined, `Anggota ${target.nama} berhasil dihapus.`)
}
