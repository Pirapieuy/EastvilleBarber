// Pengganti @supabase/supabase-js untuk uji: query builder ala PostgREST di atas PGlite (Postgres asli).
// Meniru batas max_rows = 1000 milik PostgREST (hosted Supabase) supaya bug pemotongan data terlihat.
import { PGlite } from "npm:@electric-sql/pglite@0.2.17"

export const MAX_ROWS = 1000
export const pg = new PGlite()
let siap: Promise<void> | null = null
export function init(schemaSql: string) {
  siap ??= (async () => {
    await pg.exec(`create role service_role; create role anon; create role authenticated;
      create schema if not exists storage;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`)
    await pg.exec(schemaSql)
  })()
  return siap
}

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null"
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
  return `'${String(v).replace(/'/g, "''")}'`
}
const id = (c: string) => `"${c}"`
const pkCache: Record<string, string> = {}
async function pkOf(t: string) {
  if (!pkCache[t]) {
    const r = await pg.query<{ a: string }>(
      `select a.attname a from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey)
       where i.indrelid='public.${t}'::regclass and i.indisprimary limit 1`)
    pkCache[t] = r.rows[0].a
  }
  return pkCache[t]
}
function norm(res: { rows: Record<string, unknown>[]; fields: { name: string; dataTypeID: number }[] }) {
  const tipe: Record<string, number> = Object.fromEntries(res.fields.map((f) => [f.name, f.dataTypeID]))
  return res.rows.map((r) => {
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r)) {
      if (v instanceof Date) o[k] = v.toISOString()
      else if ((tipe[k] === 1700 || tipe[k] === 20) && v !== null) o[k] = Number(v)
      else o[k] = v
    }
    return o
  })
}

class Q {
  op = "select"; cols = "*"; where: string[] = []; ord: string[] = []; lim: number | null = null
  from_: number | null = null; to_: number | null = null; mode: "one" | "maybe" | null = null
  payload: any; ret = false; conflict = ""
  constructor(public t: string) {}
  select(c = "*") { if (this.op === "select") this.cols = c; else this.ret = true; return this }
  insert(p: unknown) { this.op = "insert"; this.payload = p; return this }
  update(p: unknown) { this.op = "update"; this.payload = p; return this }
  upsert(p: unknown, o?: { onConflict?: string }) { this.op = "upsert"; this.payload = p; this.conflict = o?.onConflict ?? ""; return this }
  delete() { this.op = "delete"; return this }
  eq(c: string, v: unknown) { this.where.push(`${id(c)} = ${lit(v)}`); return this }
  neq(c: string, v: unknown) { this.where.push(`${id(c)} <> ${lit(v)}`); return this }
  gt(c: string, v: unknown) { this.where.push(`${id(c)} > ${lit(v)}`); return this }
  gte(c: string, v: unknown) { this.where.push(`${id(c)} >= ${lit(v)}`); return this }
  lt(c: string, v: unknown) { this.where.push(`${id(c)} < ${lit(v)}`); return this }
  lte(c: string, v: unknown) { this.where.push(`${id(c)} <= ${lit(v)}`); return this }
  like(c: string, v: string) { this.where.push(`${id(c)} like ${lit(v)}`); return this }
  ilike(c: string, v: string) { this.where.push(`${id(c)} ilike ${lit(v)}`); return this }
  in(c: string, a: unknown[]) { this.where.push(a.length ? `${id(c)} in (${a.map(lit).join(",")})` : "false"); return this }
  is(c: string, v: unknown) { this.where.push(`${id(c)} is ${v === null ? "null" : lit(v)}`); return this }
  not(c: string, op: string, v: unknown) {
    const sql: Record<string, string> = { is: "is not", like: "not like", ilike: "not ilike", eq: "<>", in: "not in" }
    this.where.push(`${id(c)} ${sql[op] ?? "is not"} ${op === "is" && v === null ? "null" : lit(v)}`); return this
  }
  or(s: string) {
    this.where.push("(" + s.split(",").map((p) => {
      const [c, op, ...v] = p.split("."); return `${id(c)} ${op === "eq" ? "=" : op} ${lit(v.join("."))}`
    }).join(" or ") + ")"); return this
  }
  order(c: string, o?: { ascending?: boolean }) { this.ord.push(`${id(c)} ${o?.ascending === false ? "desc" : "asc"}`); return this }
  limit(n: number) { this.lim = n; return this }
  range(a: number, b: number) { this.from_ = a; this.to_ = b; return this }
  maybeSingle() { this.mode = "maybe"; return this }
  single() { this.mode = "one"; return this }
  async exec() {
    await siap
    const w = this.where.length ? " where " + this.where.join(" and ") : ""
    try {
      let sql: string
      if (this.op === "select") {
        let n = this.lim ?? MAX_ROWS, off = 0
        if (this.from_ !== null) { off = this.from_; n = this.to_! - this.from_ + 1 }
        n = Math.min(n, MAX_ROWS)
        sql = `select ${this.cols} from ${this.t}${w}${this.ord.length ? " order by " + this.ord.join(",") : ""} limit ${n} offset ${off}`
      } else if (this.op === "delete") {
        sql = `delete from ${this.t}${w}${this.ret ? " returning *" : ""}`
      } else if (this.op === "update") {
        const set = Object.entries(this.payload).map(([k, v]) => `${id(k)} = ${lit(v)}`).join(", ")
        sql = `update ${this.t} set ${set}${w}${this.ret ? " returning *" : ""}`
      } else {
        const rows: any[] = Array.isArray(this.payload) ? this.payload : [this.payload]
        if (!rows.length) return { data: [], error: null }
        const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
        const vals = rows.map((r) => "(" + cols.map((c) => lit(r[c])).join(",") + ")").join(",")
        sql = `insert into ${this.t} (${cols.map(id).join(",")}) values ${vals}`
        if (this.op === "upsert") {
          const pk = this.conflict || await pkOf(this.t)
          sql += ` on conflict (${pk}) do update set ${cols.filter((c) => c !== pk).map((c) => `${id(c)} = excluded.${id(c)}`).join(", ")}`
        }
        if (this.ret) sql += " returning *"
      }
      const res = await pg.query<Record<string, unknown>>(sql)
      const rows = norm(res as never)
      if (this.mode) {
        if (rows.length > 1 && this.mode === "maybe") return { data: null, error: { message: "multiple rows", code: "PGRST116" } }
        return { data: rows[0] ?? null, error: null }
      }
      return { data: this.op === "select" || this.ret ? rows : null, error: null }
    } catch (e) {
      const x = e as { message: string; code?: string }
      return { data: null, error: { message: x.message, code: x.code } }
    }
  }
  then(a: (v: unknown) => unknown, b?: (e: unknown) => unknown) { return this.exec().then(a, b) }
}
export function createClient() {
  return {
    from: (t: string) => new Q(t),
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      await siap
      try {
        const a = Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}`).join(", ")
        const res = await pg.query<Record<string, unknown>>(`select ${fn}(${a}) as r`)
        const v = (res.rows[0] as { r: unknown }).r
        return { data: v, error: null }
      } catch (e) { const x = e as { message: string; code?: string }; return { data: null, error: { message: x.message, code: x.code } } }
    },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "http://x/foto.jpg" } }) }) },
  }
}
