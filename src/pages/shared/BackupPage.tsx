import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle } from "../../components/common/UI"

export function BackupPage() {
  const [backingUp, setBackingUp] = useState(false)
  const [restore, setRestore] = useState<0 | 1 | 2>(0)

  function startBackup() {
    setBackingUp(true)
    window.setTimeout(() => setBackingUp(false), 1600)
  }

  return (
    <div className="content">
      <PageTitle eyebrow="Keamanan data" title="Backup" />
      <section className="backup-status-grid">
        <article className="backup-hero">
          <span className="backup-icon">
            <Icon name="restore" />
          </span>
          <div>
            <small>Status backup otomatis</small>
            <h2>Aktif · tiap 2 minggu</h2>
            <p>Backup berikutnya dijadwalkan 12 Nov 2026.</p>
          </div>
          <i className="chip lunas">Terjadwal</i>
        </article>
        <article className="panel last-backup">
          <small>Backup terakhir</small>
          <strong>29 Okt 2026 · 02.00</strong>
          <span>
            <Icon name="check" /> Berhasil diverifikasi
          </span>
        </article>
      </section>
      <section className="panel backup-actions-card">
        <div>
          <p className="eyebrow">Backup manual</p>
          <h2>Buat salinan terbaru</h2>
          <p>Simpan salinan seluruh Sheet dan pengaturan aplikasi sekarang.</p>
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
      <section className="panel backup-list">
        <PageTitle eyebrow="Arsip tersimpan" title="Daftar backup" />
        <div className="backup-head">
          <span>Nama backup</span>
          <span>Dibuat</span>
          <span>Ukuran</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>
        {[
          ["BarberBoss_2026-10-29", "29 Okt 2026 · 02.00", "4,8 MB"],
          ["BarberBoss_2026-10-15", "15 Okt 2026 · 02.00", "4,5 MB"],
          ["BarberBoss_2026-10-01", "1 Okt 2026 · 02.00", "4,2 MB"],
        ].map((row) => (
          <article className="backup-row" key={row[0]}>
            <span>
              <Icon name="file" />
              <strong>{row[0]}</strong>
            </span>
            <span>{row[1]}</span>
            <span>{row[2]}</span>
            <i className="chip lunas">Siap</i>
            <Button
              className="restore-danger-button"
              onClick={() => setRestore(1)}
            >
              <Icon name="restore" /> Pulihkan
            </Button>
          </article>
        ))}
      </section>
      {restore > 0 && (
        <div className="modal-overlay">
          <section className="restore-confirm">
            <span className="restore-danger-icon">
              <Icon name="alert" />
            </span>
            <p className="eyebrow">Konfirmasi {restore} dari 2</p>
            <h2>
              {restore === 1 ? "Pulihkan dari backup?" : "Konfirmasi terakhir"}
            </h2>
            <p>
              {restore === 1
                ? "Data saat ini akan diganti dengan isi backup terpilih."
                : "Tindakan ini berisiko dan tidak dapat dibatalkan secara otomatis."}
            </p>
            {restore === 2 && (
              <label>
                <span>Ketik PULIHKAN untuk melanjutkan</span>
                <input placeholder="PULIHKAN" />
              </label>
            )}
            <div>
              <Button
                className="secondary-button"
                onClick={() => setRestore(0)}
              >
                Batal
              </Button>
              <Button
                className="restore-danger-button"
                onClick={() => setRestore(restore === 1 ? 2 : 0)}
              >
                {restore === 1 ? "Lanjutkan" : "Pulihkan sekarang"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default BackupPage
