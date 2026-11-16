// Padanan handleCreateLayanan / handleUpdateLayanan / handleToggleLayanan di Kode.js.
import { db, gagal, ok, tulisAudit, wajibRole } from "../util.ts"

export async function createLayanan(body: Record<string, string>) {
  const u = await wajibRole(body.token, ["Owner"])
  const nama = (body.nama || "").trim()
  const harga = parseInt(body.harga, 10)
  if (!nama) return gagal("Nama layanan wajib diisi.")
  if (isNaN(harga) || harga < 0) return gagal("Harga layanan harus angka valid.")
  const { data, error } = await db.from("layanan").insert({ nama, harga, status: "Aktif" }).select("id").single()
  if (error) throw new Error(error.message)
  await tulisAudit(u.id, u.nama, "TAMBAH_LAYANAN", `Menambah layanan: ${nama} (Rp ${harga})`)
  return ok({ id: data.id, nama, harga, status: "Aktif" }, "Layanan berhasil ditambahkan.")
}

export async function updateLayanan(body: Record<string, string>) {
  const u = await wajibRole(body.token, ["Owner"])
  const id = parseInt(body.id, 10)
  const nama = (body.nama || "").trim()
  const harga = parseInt(body.harga, 10)
  const status = body.status === "Nonaktif" ? "Nonaktif" : "Aktif"
  if (isNaN(id)) return gagal("ID layanan tidak valid.")
  if (!nama) return gagal("Nama layanan wajib diisi.")
  if (isNaN(harga) || harga < 0) return gagal("Harga layanan tidak valid.")
  const { data } = await db.from("layanan").update({ nama, harga, status }).eq("id", id).select("id")
  if (!data?.length) return gagal("Layanan tidak ditemukan.")
  await tulisAudit(u.id, u.nama, "UPDATE_LAYANAN", `Mengubah layanan: ${nama} (Rp ${harga}, ${status})`)
  return ok(undefined, "Layanan berhasil diperbarui.")
}

export async function toggleLayanan(body: Record<string, string>) {
  const u = await wajibRole(body.token, ["Owner"])
  const id = parseInt(body.id, 10)
  const status = body.status === "Nonaktif" ? "Nonaktif" : "Aktif"
  const { data } = await db.from("layanan").update({ status }).eq("id", id).select("id")
  if (!data?.length) return gagal("Layanan tidak ditemukan.")
  await tulisAudit(u.id, u.nama, "TOGGLE_LAYANAN", `Status layanan ID ${id} diubah jadi: ${status}`)
  return ok(undefined, "Status layanan berhasil diubah.")
}
