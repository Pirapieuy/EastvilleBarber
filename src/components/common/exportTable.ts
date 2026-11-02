// Ekspor tabel sederhana tanpa pustaka tambahan.
// Excel: berkas .xls berisi tabel HTML (Excel/Sheets membukanya sebagai lembar kerja).
// PDF: jendela cetak berisi tabel; pilih "Simpan sebagai PDF" di dialog cetak browser.

export type Sel = string | number

export interface TabelEkspor {
  /** Nama berkas tanpa ekstensi */
  berkas: string
  judul: string
  /** Baris keterangan di bawah judul, mis. periode */
  keterangan?: string
  kolom: string[]
  baris: Sel[][]
}

const esc = (v: Sel) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

function tabelHtml(t: TabelEkspor) {
  const head = t.kolom.map((k) => `<th>${esc(k)}</th>`).join("")
  const body = t.baris
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")
  return `<table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

export function eksporExcel(t: TabelEkspor) {
  const html = `<html><head><meta charset="utf-8"></head><body><h3>${esc(t.judul)}</h3>${
    t.keterangan ? `<p>${esc(t.keterangan)}</p>` : ""
  }${tabelHtml(t)}</body></html>`
  const blob = new Blob(["﻿", html], { type: "application/vnd.ms-excel;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${t.berkas}.xls`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function eksporPdf(t: TabelEkspor) {
  const w = window.open("", "_blank")
  if (!w) {
    window.alert("Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.")
    return
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(t.judul)}</title>
<style>body{font:12px system-ui,sans-serif;padding:24px;color:#111}h2{margin:0 0 4px}p{margin:0 0 12px;color:#555}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:5px 8px;text-align:left}th{background:#eee}</style>
</head><body><h2>Eastville Barbershop · ${esc(t.judul)}</h2>${t.keterangan ? `<p>${esc(t.keterangan)}</p>` : ""}${tabelHtml(t)}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
}
