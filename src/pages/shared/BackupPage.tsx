import { useEffect, useState } from "react"
import { apiBackup, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, LoadingState, PageTitle,
  ErrorState,
} from "../../components/common/UI"
import { ConfirmModal } from "../../components/common/ConfirmModal"

interface BackupRow {
  nama: string
  dibuat: string
  sheet: number
  baris: number
}

const demoBackups: BackupRow[] = [
  {
    nama: "BAK_20261029_0200",
    dibuat: "29/10/2026 · 02.00",
    sheet: 9,
    baris: 480,
  },
]

export function BackupPage() {
  const [showBackupHelp, setShowBackupHelp] = useState(false)
  const [backups, setBackups] = useState<BackupRow[]>(
    getToken() ? [] : demoBackups,
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [busyNama, setBusyNama] = useState("")
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [backingUp, setBackingUp] = useState(false)
  const [message, setMessage] = useState("")
  const [restore, setRestore] = useState<0 | 1 | 2>(0)
  const [target, setTarget] = useState("")
  const [deletingBackup, setDeletingBackup] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  async function doRestore() {
    setMessage("")
    if (!live) {
      setRestore(0)
      return setMessage("Mode demo: tidak ada data yang dipulihkan.")
    }
    setRestoring(true)
    try {
      const res = await apiBackup.pulihkan(target)
      await loadLive()
      setMessage(
        `Data dipulihkan dari ${res.nama} (${res.sheet} sheet). Kondisi sebelumnya disimpan di ${res.pengaman}.`,
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Pemulihan gagal.")
    } finally {
      setRestoring(false)
      setRestore(0)
    }
  }

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
    setLiveError("")
    loadLive().catch((e) => {
      console.error("Gagal memuat daftar backup:", e)
      setLiveError(e instanceof Error ? e.message : "gagal memuat data")
    })
  }, [reloadKey])

  async function handleConfirmDeleteBackup(nama: string) {
    setMessage("")
    if (!live) {
      setBackups((curr) => curr.filter((b) => b.nama !== nama))
      return setMessage(`Mode demo: ${nama} dihapus dari daftar lokal.`)
    }
    setBusyNama(nama)
    try {
      await apiBackup.hapus(nama)
      await loadLive()
      setMessage(`${nama} dihapus.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal menghapus backup.")
    } finally {
      setBusyNama("")
    }
  }

  async function unduh(nama: string) {
    setMessage("")
    if (!live) {
      const demoData = {
        backup: nama,
        timestamp: new Date().toISOString(),
        keterangan: "File cadangan demo (offline)",
      }
      const blob = new Blob([JSON.stringify(demoData, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${nama}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      return setMessage(`Mode demo: file cadangan ${nama}.json diunduh.`)
    }
    setBusyNama(nama)
    try {
      const res = await apiBackup.unduh(nama)
      const blob = new Blob([JSON.stringify(res, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${nama}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal mengunduh backup.")
    } finally {
      setBusyNama("")
    }
  }

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
        <LoadingState message="Memuat backup..." />
      </div>
    )
  }

  if (Boolean(getToken()) && !live && liveError) {
    return (
      <div className="content">
        <ErrorState
          title="Daftar backup gagal dimuat"
          message={liveError}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    )
  }

  const terakhir = backups[0]

  return (
    <div className="content fit-page">
      <DemoNotice live={live} error={liveError} />
      <section className="backup-status-grid">
        <article className="backup-hero">
          <span className="backup-icon">
            <Icon name="restore" />
          </span>
          <div>
            <small>Cara kerja</small>
            <h2>Backup manual</h2>
            <p>
              Cadangan tersimpan aman secara otomatis di sistem; 5 arsip data
              terakhir dipertahankan.
            </p>
          </div>
        </article>
        <article className="panel last-backup">
          <small>Backup terakhir</small>
          <strong>{terakhir ? terakhir.dibuat : "Belum ada"}</strong>
          {terakhir && (
            <span>
              <Icon name="check" /> {terakhir.sheet} sheet · {terakhir.baris}{" "}
              baris
            </span>
          )}
        </article>
      </section>
      <section className="panel backup-actions-card">
        <div>
          <p className="eyebrow">Backup manual</p>
          <h2 className="backup-title-with-tip">
            Backup data
            <button
              className="backup-help-tip"
              type="button"
              aria-label="Informasi backup data"
              aria-expanded={showBackupHelp}
              onClick={() => setShowBackupHelp((shown) => !shown)}
            >
              <Icon name="alert" />
              {showBackupHelp && (
                <span role="tooltip">
                  Backup mencakup data layanan, produk, transaksi, pengeluaran,
                  stok, dan pengaturan komisi. Data akun tidak ikut dicadangkan.
                </span>
              )}
            </button>
          </h2>
          {message && <small>{message}</small>}
        </div>
        <Button
          className="primary-button"
          onClick={startBackup}
          disabled={backingUp}
        >
          <Icon name={backingUp ? "clock" : "plus"} />
          {backingUp ? "Membuat backup..." : "Backup sekarang"}
        </Button>
      </section>
      <section className="panel backup-list fit-fill">
        <PageTitle eyebrow="Arsip tersimpan" title="Daftar backup" />
        <div className="backup-table-scroll">
          <div className="backup-head">
            <span>Nama backup</span>
            <span className="desktop-col">Dibuat</span>
            <span className="desktop-col">Isi</span>
            <span className="desktop-col">Status</span>
            <span style={{ textAlign: "right" }}>Aksi</span>
          </div>
          {backups.map((row) => (
            <article className="backup-row" key={row.nama}>
              <div className="backup-info-cell">
                <span className="backup-file-name">
                  <Icon name="file" />
                  <strong>{row.nama}</strong>
                </span>
                <small className="backup-date-sub">
                  {row.dibuat} · {row.baris} baris
                </small>
              </div>
              <span className="desktop-col">{row.dibuat}</span>
              <span className="desktop-col">{row.baris} baris</span>
              <i className="chip lunas desktop-col">Siap</i>
              <div className="backup-action-cell">
                <Button
                  className="secondary-button"
                  disabled={busyNama === row.nama || restoring}
                  onClick={() => unduh(row.nama)}
                  title={`Unduh file backup ${row.nama}.json`}
                >
                  <Icon name="download" />
                  {busyNama === row.nama ? "..." : "Unduh"}
                </Button>
                <Button
                  className="restore-danger-button"
                  disabled={busyNama === row.nama || restoring}
                  onClick={() => {
                    setTarget(row.nama)
                    setRestore(1)
                  }}
                  title={`Pulihkan data dari ${row.nama}`}
                >
                  <Icon name="restore" /> Pulihkan
                </Button>
                <Button
                  className="backup-delete-btn"
                  disabled={busyNama === row.nama || restoring}
                  onClick={() => setDeletingBackup(row.nama)}
                  title={`Hapus ${row.nama}`}
                >
                  <Icon name="trash" /> Hapus
                </Button>
              </div>
            </article>
          ))}
          {backups.length === 0 && (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "var(--slate)",
              }}
            >
              Belum ada backup.
            </div>
          )}
        </div>
      </section>
      <div className="info-banner">
        <Icon name="alert" /> Pulihkan mengganti data layanan, produk,
        transaksi, pengeluaran, stok, dan pengaturan komisi dengan isi backup.
        Sebelumnya sistem otomatis membuat backup baru dari kondisi saat ini
        sebagai pengaman. Data akun tidak ikut.
      </div>
      {restore > 0 && (
        <div className="modal-overlay">
          <section className="restore-confirm">
            <span className="restore-danger-icon">
              <Icon name="alert" />
            </span>
            <p className="eyebrow">Konfirmasi {restore} dari 2</p>
            <h2>
              {restore === 1 ? "Pulihkan dari backup?" : `Pulihkan ${target}?`}
            </h2>
            <p>
              {restore === 1
                ? "Data saat ini akan diganti dengan isi backup terpilih."
                : "Ini tindakan terakhir. Kondisi saat ini disimpan dulu sebagai backup baru, jadi masih bisa dikembalikan."}
            </p>
            <div>
              <Button
                className="secondary-button"
                disabled={restoring}
                onClick={() => setRestore(0)}
              >
                Batal
              </Button>
              <Button
                className="restore-danger-button"
                disabled={restoring}
                onClick={() => (restore === 1 ? setRestore(2) : doRestore())}
              >
                {restoring
                  ? "Memulihkan..."
                  : restore === 1
                    ? "Lanjutkan"
                    : "Ya, pulihkan"}
              </Button>
            </div>
          </section>
        </div>
      )}

      {deletingBackup && (
        <ConfirmModal
          compact
          title={`Hapus Backup "${deletingBackup}"?`}
          eyebrow="Hapus File Backup"
          warning="File backup yang dihapus tidak dapat dipulihkan kembali."
          confirmText="Hapus Backup"
          confirmTone="danger"
          onClose={() => setDeletingBackup(null)}
          onConfirm={() => handleConfirmDeleteBackup(deletingBackup)}
        />
      )}
    </div>
  )
}

export default BackupPage
