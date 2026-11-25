import assert from "node:assert/strict"
import { pg, reset, seedTransaksi } from "./helper.ts"
const lap = await import("../functions/api/handlers/laporan.ts")
Deno.test("aktivitas-kapster: tanpa tanggal = semua riwayat (>1000 baris) + kolom tambahan Raga", async () => {
  await reset(); await seedTransaksi(1100)
  const r = await lap.aktivitasKapster({}, { id: "u-kap1", nama: "Kapster Satu", role: "Kapster" } as never) as { data: Record<string, unknown>[] }
  assert.equal(r.data.length, 1100)
  assert.equal(r.data[0].method, "Tunai"); assert.equal(r.data[0].total, 2500); assert.equal(r.data[0].status, "Lunas"); assert.equal(r.data[0].barber, "Kapster Satu")
})
Deno.test("aktivitas-kapster: hanya milik kapster itu", async () => {
  await reset(); await seedTransaksi(3, "u-kap1"); await seedTransaksi(2, "u-kap2", 50)
  const r = await lap.aktivitasKapster({}, { id: "u-kap2", nama: "Dua", role: "Kapster" } as never) as { data: unknown[] }
  assert.equal(r.data.length, 2)
})
