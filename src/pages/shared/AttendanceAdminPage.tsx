import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle } from "../../components/common/UI"
import { AppUser, Role } from "../../types"

export function AttendanceAdminPage({
  currentUser,
  role,
  title,
}: {
  currentUser?: AppUser
  role?: Role
  title?: string
} = {}) {
  const [tab, setTab] = useState<"Jadwal" | "Riwayat" | "Koreksi">("Jadwal")
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const isManager = (role ?? currentUser?.role) === "Manajer"
  const pageTitle = title ?? (isManager ? "Absensi Tim" : "Absensi Admin")

  return (
    <div className="content">
      <PageTitle
        eyebrow={isManager ? "Manajer" : "Owner"}
        title={pageTitle}
      />
      <div className="segmented page-segment">
        {(["Jadwal", "Riwayat", "Koreksi"] as const).map((value) => (
          <Button
            className={tab === value ? "active" : ""}
            key={value}
            onClick={() => setTab(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      {tab === "Jadwal" && (
        <section className="panel schedule-grid-card">
          <div className="schedule-toolbar">
            <Button className="secondary-button">
              <Icon name="back" />
            </Button>
            <strong>27 Okt – 2 Nov 2026</strong>
            <Button className="secondary-button">
              <Icon name="arrow" />
            </Button>
            <Button className="primary-button">
              <Icon name="plus" /> Atur jadwal
            </Button>
          </div>
          <div className="week-grid">
            <div className="week-head">
              <span>Kapster</span>
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            {[
              [
                "Seva",
                "10.00",
                "10.00",
                "10.00",
                "10.00",
                "Libur",
                "08.00",
                "08.00",
              ],
              [
                "Tata",
                "08.00",
                "08.00",
                "Libur",
                "08.00",
                "08.00",
                "10.00",
                "10.00",
              ],
              [
                "Faisal",
                "10.00",
                "Libur",
                "10.00",
                "10.00",
                "10.00",
                "08.00",
                "08.00",
              ],
              [
                "Fadhil",
                "08.00",
                "08.00",
                "08.00",
                "Libur",
                "08.00",
                "10.00",
                "10.00",
              ],
              [
                "Ferdi",
                "10.00",
                "10.00",
                "08.00",
                "08.00",
                "Libur",
                "10.00",
                "08.00",
              ],
            ].map((row) => (
              <div className="week-row" key={row[0]}>
                <strong>{row[0]}</strong>
                {row.slice(1).map((time, index) => (
                  <button
                    className={time === "Libur" ? "off" : ""}
                    key={`${row[0]}-${index}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "Riwayat" && (
        <section className="panel attendance-admin-list">
          <div className="filters">
            <div className="input-shell">
              <Icon name="calendar" />
              <input defaultValue="2026-10-29" type="date" />
            </div>
            <select>
              <option>Semua kapster</option>
            </select>
            <select>
              <option>Semua status</option>
            </select>
          </div>
          {[
            ["Seva", "10.00", "09.54", "Tepat waktu"],
            ["Tata", "08.00", "08.07", "Terlambat 7 mnt"],
            ["Faisal", "10.00", "10.12", "Dikoreksi"],
          ].map((row) => (
            <article key={row[0]}>
              <Button
                className="photo-thumb"
                onClick={() => setPhotoOpen(true)}
              >
                <Icon name="user" />
              </Button>
              <span>
                <strong>{row[0]}</strong>
              </span>
              <span>
                <small>Jadwal</small>
                <strong>{row[1]}</strong>
              </span>
              <span>
                <small>Check-in</small>
                <strong>{row[2]}</strong>
              </span>
              <i
                className={`chip ${
                  row[3].startsWith("Terlambat") || row[3] === "Dikoreksi"
                    ? "manual"
                    : "lunas"
                }`}
              >
                {row[3]}
              </i>
            </article>
          ))}
        </section>
      )}
      {tab === "Koreksi" && (
        <section className="correction-grid">
          <article className="panel correction-card">
            <span className="alert-icon">
              <Icon name="camera" />
            </span>
            <div>
              <strong>Faisal</strong>
              <small>29 Okt 2026 · Kamera tidak dapat dibuka</small>
              <p>Sudah mencoba izin kamera tetapi halaman tetap hitam.</p>
            </div>
            <Button
              className="primary-button"
              onClick={() => setCorrectionOpen(true)}
            >
              Koreksi
            </Button>
          </article>
          <article className="panel correction-card">
            <span className="alert-icon">
              <Icon name="alert" />
            </span>
            <div>
              <strong>Fadhil</strong>
              <small>28 Okt 2026 · Internet mati</small>
              <p>Check-in dilaporkan setelah koneksi kembali.</p>
            </div>
            <Button
              className="primary-button"
              onClick={() => setCorrectionOpen(true)}
            >
              Koreksi
            </Button>
          </article>
        </section>
      )}
      {correctionOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={(event) => {
              event.preventDefault()
              setCorrectionOpen(false)
            }}
          >
            <header>
              <h2>Koreksi absensi</h2>
              <Button onClick={() => setCorrectionOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="old-new">
              <span>
                <small>Nilai lama</small>
                <strong>Belum check-in</strong>
              </span>
              <Icon name="arrow" />
              <span>
                <small>Nilai baru</small>
                <strong>Hadir · 10.04</strong>
              </span>
            </div>
            <label>
              <span>Waktu aktual</span>
              <input defaultValue="10:04" type="time" />
            </label>
            <label>
              <span>Status</span>
              <select>
                <option>Tepat waktu</option>
                <option>Terlambat</option>
              </select>
            </label>
            <label>
              <span>Alasan koreksi</span>
              <textarea placeholder="Tuliskan dasar koreksi..." required />
            </label>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setCorrectionOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan koreksi
              </Button>
            </footer>
          </form>
        </div>
      )}
      {photoOpen && (
        <div className="modal-overlay photo-modal">
          <section>
            <Button onClick={() => setPhotoOpen(false)}>
              <Icon name="close" />
            </Button>
            <div>
              <Icon name="user" />
            </div>
            <h3>Seva</h3>
            <p>Waktu server 09.54 · Jadwal 10.00</p>
          </section>
        </div>
      )}
    </div>
  )
}

export default AttendanceAdminPage
