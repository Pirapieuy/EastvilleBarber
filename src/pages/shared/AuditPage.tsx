import { useEffect, useState } from "react"
import { apiAudit, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { PageTitle } from "../../components/common/UI"

const demoLogs: string[][] = [
  ["29 Okt 10.42", "Ardi Santoso", "Ubah komisi", "Free Style Dust", "8% → 10%", "Kesepakatan baru"],
  ["29 Okt 10.24", "Tata", "Login", "Akun Tata", "Berhasil", "—"],
  ["29 Okt 09.12", "Tata", "Batalkan transaksi", "INV-291026-0082", "Rp 110.000", "Salah input"],
]

export function AuditPage() {
  const [rows, setRows] = useState<string[][]>(demoLogs)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [tanggal, setTanggal] = useState("")
  const [aksi, setAksi] = useState("Semua jenis aksi")
  const [pengguna, setPengguna] = useState("Semua pengguna")

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    apiAudit
      .list({ dari: tanggal || undefined, sampai: tanggal || undefined })
      .then((d) => {
        setRows(d.map((r) => [r.waktu, r.pengguna || "—", r.aksi, "—", r.detail || "—", r.alasan || "—"]))
        setLive(true)
        setLiveError("")
      })
      .catch((e) => {
        console.error("Gagal memuat jejak audit:", e)
        setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
  }, [tanggal])

  const daftarAksi = Array.from(new Set(rows.map((r) => r[2]))).sort()
  const daftarUser = Array.from(new Set(rows.map((r) => r[1]))).sort()
  const logs = rows.filter(
    (r) => (aksi === "Semua jenis aksi" || r[2] === aksi) && (pengguna === "Semua pengguna" || r[1] === pengguna),
  )

  if (Boolean(getToken()) && !live && !liveError) {
    return (
      <div className="content">
        <p>Memuat jejak audit...</p>
      </div>
    )
  }

  return (
    <div className="content">
      <DemoNotice live={live} error={liveError} />
      <PageTitle eyebrow="Khusus Owner" title="Jejak audit" />
      <div className="append-only-note">
        <Icon name="lock" />
        <span>
          <strong>Log hanya-tambah</strong>Data tidak dapat diubah atau dihapus.
        </span>
      </div>
      <section className="panel audit-list">
        <div className="filters">
          <div className="input-shell">
            <Icon name="calendar" />
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <select value={aksi} onChange={(e) => setAksi(e.target.value)}>
            <option>Semua jenis aksi</option>
            {daftarAksi.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select value={pengguna} onChange={(e) => setPengguna(e.target.value)}>
            <option>Semua pengguna</option>
            {daftarUser.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div className="audit-head">
          <span>Waktu</span>
          <span>Pengguna</span>
          <span>Aksi</span>
          <span>Objek</span>
          <span>Detail</span>
          <span>Alasan</span>
        </div>
        {logs.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--slate)" }}>
            Tidak ada catatan pada filter ini.
          </div>
        )}
        {logs.map((row, i) => (
          <article className="audit-row" key={`${row.join("-")}-${i}`}>
            {row.map((value, index) => (
              <span
                className={index === 2 ? "audit-action" : ""}
                key={`${value}-${index}`}
              >
                {value}
              </span>
            ))}
          </article>
        ))}
      </section>
    </div>
  )
}

export default AuditPage
