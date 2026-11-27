// Padanan getPengaturan_, komisiOverride_, hhmm_, parseHhmm_, isLembur_, bentukPengaturan_ di Bisnis.js.
import { db } from "./util.ts"

export const PENGATURAN_DEFAULT: Record<string, number> = {
  jam_mulai: 1000, jam_selesai: 2100, komisi_default: 40, komisi_lembur: 50,
}
export type Pengaturan = typeof PENGATURAN_DEFAULT

export async function getPengaturan(): Promise<Pengaturan> {
  const p = { ...PENGATURAN_DEFAULT }
  const { data } = await db.from("pengaturan").select("key,value")
  for (const r of data ?? [])
    if (r.key in p && r.value !== "" && r.value !== null) p[r.key] = Number(r.value)
  return p
}

export async function komisiOverride(): Promise<Record<string, number>> {
  const m: Record<string, number> = {}
  const { data } = await db.from("komisi_kapster").select("user_id,persen")
  for (const r of data ?? []) if (r.persen !== null) m[r.user_id] = Number(r.persen)
  return m
}

export const hhmm = (n: number) => ("0000" + n).slice(-4).replace(/(\d\d)(\d\d)/, "$1:$2")
export function parseHhmm(str: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((str || "").toString().trim())
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null
  return Number(m[1]) * 100 + Number(m[2])
}
/** true kalau jam (HHMM) di luar [jam_mulai, jam_selesai). */
export const isLembur = (hhmmNow: number, p: Pengaturan) =>
  !(hhmmNow >= p.jam_mulai && hhmmNow < p.jam_selesai)

export async function bentukPengaturan() {
  const [p, ov, { data: kap }] = await Promise.all([
    getPengaturan(), komisiOverride(),
    db.from("users").select("id,nama").eq("role", "Kapster").eq("status", "Aktif"),
  ])
  return {
    jamMulai: hhmm(p.jam_mulai), jamSelesai: hhmm(p.jam_selesai),
    komisiDefault: p.komisi_default, komisiLembur: p.komisi_lembur,
    kapster: (kap ?? []).map((u) => ({ id: u.id, nama: u.nama, persen: ov[u.id] === undefined ? null : ov[u.id] })),
  }
}
