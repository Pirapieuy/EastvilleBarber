import assert from "node:assert/strict"
import { pg, reset } from "./helper.ts"
const usr = await import("../functions/api/handlers/user.ts")
Deno.test("forgot-pin tidak membocorkan token dan tidak membuat token reset", async () => {
  await reset()
  const r = await usr.forgotPin({ email: "o@x.id" }) as { success: boolean; data?: unknown }
  assert.equal(r.success, false); assert.equal(r.data, undefined)
  assert.equal((await pg.query<{ n: number }>(`select count(*)::int n from reset_pin`)).rows[0].n, 0)
})
Deno.test("reset-pin ditolak walau token lama masih ada di tabel", async () => {
  await reset()
  await pg.exec(`insert into reset_pin values ('rst-lama','o@x.id', now()+interval '10 min')`)
  const r = await usr.resetPin({ email: "o@x.id", resetToken: "rst-lama", newPin: "123456" }) as { success: boolean }
  assert.equal(r.success, false)
  assert.equal((await pg.query<{ h: string }>(`select pin_hash h from users where id='u-owner'`)).rows[0].h, "x", "PIN tidak berubah")
})
