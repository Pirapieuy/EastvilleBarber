// Bukti dua temuan audit serah terima: harga modal bocor ke Kasir/Kapster, absensi Hadir untuk tanggal depan.
import assert from "node:assert/strict"
import { pg, reset, T } from "./helper.ts"
const prd = await import("../functions/api/handlers/produk.ts")
const kat = await import("../functions/api/handlers/katalog.ts")
const sdm = await import("../functions/api/handlers/sdm.ts")
const owner = { id: "u-owner", nama: "Owner", role: "Owner" } as never
const kasir = { id: "u-kasir", nama: "Kasir", role: "Kasir" } as never
const kapster = { id: "u-kap1", nama: "Kapster Satu", role: "Kapster" } as never

Deno.test("AU1 list-produk: harga modal dan bagi hasil hanya untuk Owner", async () => {
  await reset()
  await prd.simpanProduk({ produk: { kode: "P1", nama: "Pomade", penjual: "Eastville", stok: 5, skema: "Persentase", status: "Aktif",
    harga: 50000, hargaModal: 30000, shares: { barber: 10, seller: 0, eastville: 90 }, nominalShares: { barber: 0, seller: 0, eastville: 0 } }, alasan: "", baru: true }, owner)
  const lihat = async (u: never) => ((await kat.listProduk(u)) as { data: Record<string, unknown>[] }).data[0]
  const o = await lihat(owner)
  assert.equal(o.harga_modal, 30000)
  for (const u of [kasir, kapster]) {
    const p = await lihat(u)
    assert.equal(p.harga, 50000)
    assert.equal(p.stok, 5)
    for (const k of ["harga_modal", "persen_eastville", "persen_penjual", "persen_kapster", "nominal_eastville"])
      assert.equal(k in p, false, `${k} tidak boleh terlihat oleh ${(u as { role: string }).role}`)
  }
})

Deno.test("AU2 absensi Hadir untuk tanggal yang belum tiba ditolak", async () => {
  await reset()
  const foto = "data:image/jpeg;base64,/9j/4AAQ"
  const r = await sdm.catatAbsensiKapster({ token: T.kasir, targetUserId: "u-kap1", tanggal: "2099-01-01", status: "Hadir", fotoUrl: foto }) as { success: boolean; error?: string }
  assert.equal(r.success, false)
  assert.match(r.error ?? "", /belum tiba/)
  assert.equal(Number((await pg.query<{ n: number }>(`select count(*)::int n from absensi`)).rows[0].n), 0)
})
