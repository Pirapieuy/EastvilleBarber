// Satu pintu masuk untuk semua aksi, bentuk permintaan/respons sama dengan Apps Script:
// POST {action, token, ...} -> {success, data | error, code}.
import { ApiError, gagal } from "./util.ts"
import { login, logout, verifySession } from "./handlers/auth.ts"

// deno-lint-ignore no-explicit-any
type Handler = (body: any) => Promise<unknown>
const rute: Record<string, Handler> = {
  login,
  logout,
  "verify-session": verifySession,
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}
const balas = (o: unknown) =>
  new Response(JSON.stringify(o), { headers: { ...CORS, "Content-Type": "application/json" } })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method === "GET")
    return balas({ success: true, message: "Eastville Barbershop API aktif (Supabase)" })
  try {
    const body = JSON.parse(await req.text())
    const handler = rute[body.action]
    if (!handler) return balas(gagal("Aksi tidak dikenal: " + body.action))
    return balas(await handler(body))
  } catch (e) {
    if (e instanceof ApiError) return balas(gagal(e.message, e.code))
    console.error(e)
    return balas(gagal("Terjadi kesalahan server: " + (e as Error).message))
  }
})
