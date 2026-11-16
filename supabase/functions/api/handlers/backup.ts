// Padanan backup-* di Bisnis.js. Snapshot disimpan di tabel `backup` (lihat schema.sql).
import { db, fmtDdMmYy, gagal, jamHhmm, ok, tulisAudit, type Pengguna } from "../util.ts"

type B = Record<string, any> // deno-lint-ignore-line no-explicit-any
const SIMPAN = 5
const NAMA_VALID = /^BAK_(\d{8})_(\d{4})$/

function stempel() {
  const now = new Date()
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
  return `BAK_${p.replace(/-/g, "")}_${jamHhmm(now).replace(":", "")}`
}

export async function backupBuat(_b: B, user: Pengguna) {
  const nama = stempel()
  const { data: ada } = await db.from("backup").select("nama").eq("nama", nama).maybeSingle()
  if (ada) return gagal(`Backup sudah dibuat pada menit ini (${nama.slice(4)}). Tunggu satu menit lalu coba lagi.`)
  const { data, error } = await db.rpc("buat_backup", { p_nama: nama, p_simpan: SIMPAN })
  if (error) throw new Error(error.message)
  await tulisAudit(user.id, user.nama, "BACKUP", `${nama} · ${data.baris} baris`)
  return ok({ nama })
}

export async function backupList() {
  const { data } = await db.from("backup").select("nama,sheet,baris").order("nama", { ascending: false })
  return ok((data ?? []).map((b) => {
    const m = NAMA_VALID.exec(b.nama)!
    const s = m[1], j = m[2]
    return { nama: b.nama, dibuat: `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)} · ${j.slice(0, 2)}.${j.slice(2)}`, sheet: b.sheet, baris: b.baris }
  }))
}

export async function backupHapus(body: B, user: Pengguna) {
  const nama = String(body.nama ?? "")
  if (!NAMA_VALID.test(nama)) return gagal("Nama backup tidak valid.")
  const { data } = await db.from("backup").delete().eq("nama", nama).select("nama")
  if (!data?.length) return gagal("Backup tidak ditemukan.")
  await tulisAudit(user.id, user.nama, "BACKUP_HAPUS", nama)
  return ok({ nama })
}

export async function backupUnduh(body: B) {
  const nama = String(body.nama ?? "")
  if (!NAMA_VALID.test(nama)) return gagal("Nama backup tidak valid.")
  const { data } = await db.from("backup").select("data").eq("nama", nama).maybeSingle()
  if (!data) return gagal("Backup tidak ditemukan.")
  // Bentuk sama dengan GAS: {tabel: [[header...], [baris...], ...]}
  const sheets: Record<string, unknown[][]> = {}
  for (const [tabel, rows] of Object.entries(data.data as Record<string, B[]>)) {
    const kolom = rows.length ? Object.keys(rows[0]) : []
    sheets[tabel] = [kolom, ...rows.map((r) => kolom.map((k) => r[k] ?? ""))]
  }
  return ok({ nama, sheets })
}

export async function backupPulihkan(body: B, user: Pengguna) {
  const nama = String(body.nama ?? "")
  if (!NAMA_VALID.test(nama)) return gagal("Nama backup tidak valid.")
  const { data: ada } = await db.from("backup").select("nama").eq("nama", nama).maybeSingle()
  if (!ada) return gagal("Backup tidak ditemukan.")
  const pengaman = stempel()
  if (pengaman === nama) return gagal("Ada backup yang baru dibuat semenit ini. Tunggu satu menit lalu coba lagi.")
  const { error: e1 } = await db.rpc("buat_backup", { p_nama: pengaman, p_simpan: SIMPAN + 1 })
  if (e1) return gagal("Backup pengaman gagal dibuat, pemulihan dibatalkan: " + e1.message)
  const { data: jml, error } = await db.rpc("pulihkan_backup", { p_nama: nama })
  if (error) return gagal("Pemulihan gagal, data tidak diubah: " + error.message)
  await tulisAudit(user.id, user.nama, "PULIHKAN_BACKUP", `${nama} · ${jml} sheet · pengaman ${pengaman}`)
  return ok({ nama, sheet: jml, pengaman })
}
