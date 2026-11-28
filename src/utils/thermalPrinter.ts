/**
 * Thermal Printer via QZ Tray (ESC/POS)
 *
 * Mengirim perintah ESC/POS langsung ke printer thermal USB
 * tanpa dialog print browser. Memerlukan QZ Tray yang terinstal
 * dan berjalan di komputer kasir.
 *
 * Download QZ Tray: https://qz.io/download/
 */

import type { CartLine } from "../pages/shared/CashierPage"

// ---------- QZ Tray type stubs ----------

interface QZWebSocket {
  connect(): Promise<void>
  disconnect(): Promise<void>
  isActive(): boolean
}

interface QZConfig {
  // opaque printer config
}

interface QZ {
  websocket: QZWebSocket & {
    connect(): Promise<void>
    disconnect(): Promise<void>
    isActive(): boolean
  }
  configs: {
    create(printer: string | null): QZConfig
  }
  print(config: QZConfig, data: unknown[]): Promise<void>
  printers: {
    find(): Promise<string[]>
    find(query: string): Promise<string>
  }
}

declare global {
  interface Window {
    qz?: QZ
  }
}

// ---------- State ----------

let qz: QZ | null = null
let printerConfig: QZConfig | null = null
const PRINTER_NAME = "GEZHI" // akan dicari substring-nya

// ---------- Connection ----------

/** Cek apakah QZ Tray tersedia dan terhubung */
export function isQzReady(): boolean {
  return Boolean(qz && qz.websocket.isActive())
}

/** Hubungkan ke QZ Tray. Panggil sekali saat app dimuat. */
export async function connectQz(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !window.qz) {
    return { ok: false, error: "QZ Tray belum terpasang. Download di qz.io/download" }
  }

  qz = window.qz

  if (qz.websocket.isActive()) {
    return { ok: true }
  }

  try {
    await qz.websocket.connect()
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("already")) return { ok: true }
    return { ok: false, error: `Gagal terhubung ke QZ Tray: ${msg}` }
  }
}

/** Cari printer thermal yang namanya mengandung PRINTER_NAME */
async function findPrinter(): Promise<string> {
  if (!qz) throw new Error("QZ Tray belum terhubung")

  const all = await qz.printers.find()
  const match = all.find((p: string) =>
    p.toUpperCase().includes(PRINTER_NAME),
  )
  if (!match) {
    throw new Error(
      `Printer "${PRINTER_NAME}" tidak ditemukan. Printer yang tersedia: ${all.join(", ") || "(kosong)"}`,
    )
  }
  return match
}

function getConfig(): QZConfig {
  if (!qz) throw new Error("QZ Tray belum terhubung")
  if (!printerConfig) {
    throw new Error("Printer belum dipilih. Panggil setupPrinter() dulu.")
  }
  return printerConfig
}

export async function setupPrinter(): Promise<{
  ok: boolean
  printer?: string
  error?: string
}> {
  try {
    const conn = await connectQz()
    if (!conn.ok) return conn

    const printer = await findPrinter()
    printerConfig = qz!.configs.create(printer)
    return { ok: true, printer }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

// ---------- ESC/POS Helpers ----------

const ESC = "\x1B"
const GS = "\x1D"

const CMD = {
  INIT: ESC + "@",
  CENTER: ESC + "a\x01",
  LEFT: ESC + "a\x00",
  RIGHT: ESC + "a\x02",
  BOLD_ON: ESC + "E\x01",
  BOLD_OFF: ESC + "E\x00",
  DOUBLE_WIDTH: GS + "!\x10",
  DOUBLE_HEIGHT: GS + "!\x01",
  DOUBLE_BOTH: GS + "!\x11",
  NORMAL_SIZE: GS + "!\x00",
  CUT: GS + "V\x00",
  PARTIAL_CUT: GS + "V\x01",
  FEED_3: ESC + "d\x03",
  FEED_5: ESC + "d\x05",
  LINE_SPACING_DEFAULT: ESC + "2",
} as const

/** Buat garis pemisah */
function hr(cols: number): string {
  return "-".repeat(cols) + "\n"
}

/** Format baris key-value rata kiri-kanan */
function kvLine(key: string, val: string, cols: number): string {
  const space = cols - key.length - val.length
  if (space < 1) return key + " " + val + "\n"
  return key + " ".repeat(space) + val + "\n"
}

/** Format angka ribuan Indonesia */
function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n)
}

/** Format tanggal Indonesia */
function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ---------- Receipt Data ----------

export interface ReceiptData {
  cart: CartLine[]
  subtotal: number
  discount: number
  total: number
  method: "Tunai" | "QRIS" | "Gabungan"
  cash: number
  qris: number
  change: number
  barber?: string
  invoice?: string
  tanggal?: string | Date
  catatan?: string
  contoh?: boolean
}

// ---------- Build ESC/POS ----------

function buildReceipt(data: ReceiptData, size: "58" | "80"): string[] {
  const cols = size === "58" ? 32 : 48
  const lines: string[] = []

  lines.push(CMD.INIT)
  lines.push(CMD.LINE_SPACING_DEFAULT)

  // Header
  lines.push(CMD.CENTER)
  lines.push(CMD.BOLD_ON)
  lines.push(CMD.DOUBLE_BOTH)
  lines.push("EASTVILLE\n")
  lines.push(CMD.NORMAL_SIZE)
  lines.push("BARBERSHOP\n")
  lines.push(CMD.BOLD_OFF)

  if (data.contoh) {
    lines.push(CMD.BOLD_ON)
    lines.push("*** CONTOH (DEMO) ***\n")
    lines.push(CMD.BOLD_OFF)
  }

  lines.push("\n")
  lines.push(CMD.LEFT)
  lines.push(hr(cols))

  // Info
  const tanggalStr = data.tanggal ? fmtDate(data.tanggal) : fmtDate(new Date())
  lines.push(kvLine("Tanggal", tanggalStr, cols))
  lines.push(kvLine("No. nota", data.invoice ?? "-", cols))

  const barberName =
    data.barber ||
    Array.from(new Set(data.cart.map((l) => l.barber).filter(Boolean))).join(", ") ||
    "-"
  lines.push(kvLine("Kapster", barberName, cols))
  lines.push(hr(cols))

  // Items
  const multipleBarbers =
    new Set(data.cart.map((line) => line.barber).filter(Boolean)).size > 1

  for (const line of data.cart) {
    const name =
      line.name +
      (multipleBarbers && line.barber ? ` (${line.barber})` : "")
    lines.push(CMD.BOLD_ON)
    lines.push(name + "\n")
    lines.push(CMD.BOLD_OFF)

    const qtyPrice = `  ${line.qty} x ${fmt(line.price)}`
    const lineTotal = fmt(line.price * line.qty)
    lines.push(kvLine(qtyPrice, lineTotal, cols))
  }

  lines.push(hr(cols))

  // Totals
  lines.push(kvLine("Subtotal", fmt(data.subtotal), cols))
  if (data.discount > 0) {
    lines.push(kvLine("Diskon", "- " + fmt(data.discount), cols))
  }

  lines.push(CMD.BOLD_ON)
  lines.push(CMD.DOUBLE_HEIGHT)
  lines.push(kvLine("TOTAL", "Rp " + fmt(data.total), cols))
  lines.push(CMD.NORMAL_SIZE)
  lines.push(CMD.BOLD_OFF)

  lines.push(hr(cols))

  // Payment
  lines.push(kvLine("Metode", data.method, cols))
  if (data.method !== "QRIS") {
    const label = data.method === "Gabungan" ? "Tunai Diterima" : "Tunai"
    lines.push(kvLine(label, fmt(data.cash), cols))
  }
  if (data.method !== "Tunai") {
    lines.push(kvLine("QRIS", fmt(data.qris), cols))
  }
  if (data.change > 0) {
    lines.push(kvLine("Kembalian", fmt(data.change), cols))
  }

  // Catatan
  if (data.catatan) {
    lines.push(hr(cols))
    lines.push("Catatan:\n")
    lines.push(data.catatan + "\n")
  }

  lines.push(hr(cols))

  // Footer
  lines.push(CMD.CENTER)
  lines.push(CMD.BOLD_ON)
  lines.push("TERIMA KASIH\n")
  lines.push(CMD.BOLD_OFF)
  lines.push("Sudah mempercayakan gaya\n")
  lines.push("Anda kepada Eastville.\n")
  lines.push("\n")
  lines.push("@eastvillebarbershop\n")

  // Feed & cut
  lines.push(CMD.FEED_5)
  lines.push(CMD.PARTIAL_CUT)

  return lines
}

// ---------- Public API ----------

/**
 * Cetak struk langsung ke printer thermal via QZ Tray.
 * Fallback ke window.print() jika QZ tidak tersedia.
 */
export async function printThermal(
  data: ReceiptData,
  size: "58" | "80" = "58",
): Promise<{ ok: boolean; fallback?: boolean; error?: string }> {
  // Jika QZ Tray tidak siap, coba setup dulu
  if (!isQzReady()) {
    const setup = await setupPrinter()
    if (!setup.ok) {
      // Fallback ke browser print
      window.print()
      return { ok: true, fallback: true, error: setup.error }
    }
  }

  try {
    const config = getConfig()
    const escposData = buildReceipt(data, size)
    await qz!.print(config, escposData)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Fallback ke browser print
    window.print()
    return { ok: true, fallback: true, error: `Printer thermal error: ${msg}. Menggunakan browser print.` }
  }
}

/**
 * Status printer untuk ditampilkan di UI
 */
export function getPrinterStatus(): {
  connected: boolean
  label: string
} {
  if (!qz) {
    return { connected: false, label: "QZ Tray tidak terdeteksi" }
  }
  if (!qz.websocket.isActive()) {
    return { connected: false, label: "QZ Tray terputus" }
  }
  if (!printerConfig) {
    return { connected: false, label: "Printer belum disiapkan" }
  }
  return { connected: true, label: "Printer thermal siap" }
}
