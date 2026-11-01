import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle } from "../../components/common/UI"

export function AttendancePage() {
  const [state, setState] = useState<"ready" | "camera" | "preview" | "done">(
    "ready",
  )
  const [issueOpen, setIssueOpen] = useState(false)

  return (
    <div className="mobile-content attendance-self">
      <PageTitle eyebrow="Rabu, 29 Oktober 2026" title="Absensi Saya" />
      <article className="schedule-today">
        <div>
          <span>Jadwal masuk hari ini</span>
          <strong>10.00</strong>
        </div>
        <i className={`chip ${state === "done" ? "lunas" : "manual"}`}>
          {state === "done" ? "Tepat waktu" : "Belum check-in"}
        </i>
      </article>
      {state === "ready" && (
        <section className="checkin-card">
          <span className="camera-hero-icon">
            <Icon name="camera" />
          </span>
          <h2>Siap untuk check-in?</h2>
          <p>Foto harus diambil langsung dari kamera perangkat.</p>
          <Button
            className="checkin-main-button"
            onClick={() => setState("camera")}
          >
            <Icon name="camera" /> Check-in
          </Button>
          <Button
            className="secondary-button"
            onClick={() => setIssueOpen(true)}
          >
            Lapor kendala
          </Button>
        </section>
      )}
      {state === "camera" && (
        <section className="camera-screen">
          <div className="camera-top">
            <Button onClick={() => setState("ready")}>
              <Icon name="close" />
            </Button>
            <span>Ambil foto check-in</span>
          </div>
          <div className="camera-view">
            <div className="face-frame">
              <Icon name="user" />
            </div>
            <p>Posisikan wajah di dalam bingkai</p>
          </div>
          <Button className="shutter" onClick={() => setState("preview")}>
            <i />
          </Button>
        </section>
      )}
      {state === "preview" && (
        <section className="checkin-card photo-preview">
          <div className="captured-photo">
            <Icon name="user" />
            <span>Pratinjau foto</span>
          </div>
          <div className="preview-actions">
            <Button
              className="secondary-button"
              onClick={() => setState("camera")}
            >
              Ulangi
            </Button>
            <Button className="primary-button" onClick={() => setState("done")}>
              Kirim foto
            </Button>
          </div>
        </section>
      )}
      {state === "done" && (
        <section className="checkin-card checkin-success">
          <span>
            <Icon name="check" />
          </span>
          <p className="eyebrow">Waktu dari server</p>
          <h2>09.54</h2>
          <i className="chip lunas">Tepat waktu</i>
          <p>Check-in berhasil untuk jadwal masuk pukul 10.00.</p>
        </section>
      )}
      <section className="panel attendance-history">
        <PageTitle eyebrow="Riwayat pribadi" title="Absensi terakhir" />
        {[
          ["29 Okt 2026", "09.54", "Tepat waktu"],
          ["28 Okt 2026", "10.12", "Terlambat 12 mnt"],
          ["27 Okt 2026", "09.48", "Tepat waktu"],
        ].map((row) => (
          <article key={row[0]}>
            <span className="photo-thumb">
              <Icon name="user" />
            </span>
            <span>
              <strong>{row[0]}</strong>
              <small>{row[1]} · waktu server</small>
            </span>
            <i
              className={`chip ${
                row[2].startsWith("Terlambat") ? "manual" : "lunas"
              }`}
            >
              {row[2]}
            </i>
          </article>
        ))}
      </section>
      {issueOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(event) => {
              event.preventDefault()
              setIssueOpen(false)
            }}
          >
            <header>
              <h2>Lapor kendala absensi</h2>
              <Button onClick={() => setIssueOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Jenis kendala</span>
              <select>
                <option>Kamera rusak atau tidak dapat dibuka</option>
                <option>HP mati</option>
                <option>Internet bermasalah</option>
              </select>
            </label>
            <label>
              <span>Penjelasan</span>
              <textarea placeholder="Jelaskan kendala yang terjadi..." />
            </label>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setIssueOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Kirim laporan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

export default AttendancePage
