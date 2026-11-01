import { useEffect, useState } from "react"
import { apiBackup, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle } from "../../components/common/UI"

interface BackupRow {
  nama: string
  dibuat: string
  sheet: number
  baris: number
}

const demoBackups: BackupRow[] = [
  { nama: "BAK_20261029_0200", dibuat: "29/10/2026 · 02.00", sheet: 9, baris: 480 },
]

export function BackupPage() {
  const [backups, setBackups] = useState<BackupRow[]>(demoBackups)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [backingUp, setBackingUp] = useState(false)
  const [message, setMessage] = useState("")

  function loadLive() {
    return apiBackup.list().then((rows) => {
      setBackups(rows)
      setLive(true)
    })
  }
  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    loadLive().catch((e) => {
      console.error("Gagal memuat daftar backup:", e)
      setLiveError(e instanceof Error ? e.message : "gagal memuat data")
    })
  }, [])

  async function startBackup() {
    setMessage("")
    if (!live) return setMessage("Mode demo: backup tidak dibuat.")
    setBackingUp(true)
    try {
      const res = await apiBackup.buat()
      await loadLive()
      setMessage(`Backup ${res.nama} berhasil dibuat.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Backup gagal.")
    } finally {
      setBackingUp(false)
    }
  }

  if (Boolean(getToken()) && !live && !liveError) {
    return (
      <div className="content">
        <p>Memuat backup...</p>
      </div>
    )
  }

  const terakhir = backups[0]

  return (
    <div className="content">
      <DemoNotice live={live} error={liveError} />
      <PageTitle eyebrow="Keamanan data" title="Backup" />
      <section className="backup-status-grid">
        <article className="backup-hero">
          <span className="backup-icon">
            <Icon name="restore" />
          </span>
          <div>
            <small>Cara kerja</small>
            <h2>Backup manual</h2>
            <p>Disimpan sebagai sheet tersembunyi di spreadsheet yang sama; 5 backup terakhir dipertahankan.</p>
          </div>
        </article>
        <article className="panel last-backup">
          <small>Backup terakhir</small>
          <strong>{terakhir ? terakhir.dibuat : "Belum ada"}</strong>
          {terakhir && (
            <span>
              <Icon name="check" /> {terakhir.sheet} sheet · {terakhir.baris} baris
            </span>
          )}
        </article>
      </section>
      <section className="panel backup-actions-card">
        <div>
          <p className="eyebrow">Backup manual</p>
          <h2>Buat salinan terbaru</h2>
          <p>
            Menyalin data layanan, produk, transaksi, pengeluaran, stok, dan pengaturan komisi. Data akun
            tidak ikut.
          </p>
          {message && <small>{message}</small>}
        </div>
        <Button className="primary-button" onClick={startBackup} disabled={backingUp}>
          <Icon name={backingUp ? "clock" : "plus"} />
          {backingUp ? "Membuat backup..." : "Backup sekarang"}
        </Button>
      </section>
      <section className="panel backup-list">
        <PageTitle eyebrow="Arsip tersimpan" title="Daftar backup" />
        <div className="backup-head">
          <span>Nama backup</span>
          <span>Dibuat</span>
          <span>Isi</span>
          <span>Status</span>
          <span />
        </div>
        {backups.map((row) => (
          <article className="backup-row" key={row.nama}>
            <span>
              <Icon name="file" />
              <strong>{row.nama}</strong>
            </span>
            <span>{row.dibuat}</span>
            <span>{row.baris} baris</span>
            <i className="chip lunas">Siap</i>
            <span />
          </article>
        ))}
        {backups.length === 0 && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--slate)" }}>
            Belum ada backup.
          </div>
        )}
      </section>
      <div className="info-banner">
        <Icon name="alert" /> Pemulihan dilakukan manual: buka sheet tersembunyi BAK_... di Google Sheets
        (klik kanan tab sheet &gt; Tampilkan), lalu salin isinya ke sheet aslinya. Pemulihan otomatis sengaja tidak
        disediakan supaya data tidak tertimpa tanpa pengawasan.
      </div>
    </div>
  )
}

export default BackupPage
