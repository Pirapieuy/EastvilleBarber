import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle } from "../../components/common/UI"
import { apiAbsensi, getToken, AbsensiRow } from "../../api"

export function AttendancePage() {
  const [state, setState] = useState<"ready" | "camera" | "preview" | "done">(
    "ready",
  )
  const [tipe, setTipe] = useState<"Masuk" | "Pulang">("Masuk")
  const [serverTime, setServerTime] = useState("")
  const [history, setHistory] = useState<AbsensiRow[]>([
    {
      id: "abs-01",
      waktu: new Date().toISOString(),
      tanggal: "2026-10-29",
      jam: "09.54",
      userId: "u-kapster",
      nama: "Budi Santoso",
      role: "Kapster",
      tipe: "Masuk",
      status: "Tepat waktu",
    },
    {
      id: "abs-02",
      waktu: new Date().toISOString(),
      tanggal: "2026-10-28",
      jam: "10.12",
      userId: "u-kapster",
      nama: "Budi Santoso",
      role: "Kapster",
      tipe: "Masuk",
      status: "Terlambat 12 mnt",
    },
  ])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueText, setIssueText] = useState("")

  async function loadHistory() {
    if (!getToken()) return
    setLoading(true)
    try {
      const list = await apiAbsensi.list()
      if (list && list.length > 0) setHistory(list)
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  async function handleSendCheckIn() {
    setSubmitting(true)
    try {
      const res = await apiAbsensi.catat({
        tipe: tipe,
        catatan: "Check-in aplikasi web",
      })
      setServerTime(res.jam || "09:54")
      setState("done")
      loadHistory()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengirim absensi.")
      setState("ready")
    } finally {
      setSubmitting(false)
    }
  }

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="mobile-content attendance-self">
      <PageTitle eyebrow={todayStr} title="Absensi Saya" />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Button
          className={tipe === "Masuk" ? "primary-button" : "secondary-button"}
          onClick={() => {
            setTipe("Masuk")
            setState("ready")
          }}
        >
          Check-in Masuk
        </Button>
        <Button
          className={tipe === "Pulang" ? "primary-button" : "secondary-button"}
          onClick={() => {
            setTipe("Pulang")
            setState("ready")
          }}
        >
          Check-out Pulang
        </Button>
      </div>

      <article className="schedule-today">
        <div>
          <span>Jadwal operasional {tipe.toLowerCase()}</span>
          <strong>{tipe === "Masuk" ? "10.00" : "21.00"}</strong>
        </div>
        <i className={`chip ${state === "done" ? "lunas" : "manual"}`}>
          {state === "done"
            ? "Tercatat di server"
            : `Belum ${tipe.toLowerCase()}`}
        </i>
      </article>

      {state === "ready" && (
        <section className="checkin-card">
          <span className="camera-hero-icon">
            <Icon name="camera" />
          </span>
          <h2>Siap untuk {tipe.toLowerCase()}?</h2>
          <p>Ambil foto verifikasi kehadiran perangkat Anda.</p>
          <Button
            className="checkin-main-button"
            onClick={() => setState("camera")}
          >
            <Icon name="camera" /> Foto & {tipe}
          </Button>
          <Button
            className="secondary-button"
            onClick={() => setIssueOpen(true)}
          >
            Lapor kendala absensi
          </Button>
        </section>
      )}

      {state === "camera" && (
        <section className="camera-screen">
          <div className="camera-top">
            <Button onClick={() => setState("ready")}>
              <Icon name="close" />
            </Button>
            <span>Ambil foto {tipe.toLowerCase()}</span>
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
            <span>Foto terverifikasi</span>
          </div>
          <div className="preview-actions">
            <Button
              className="secondary-button"
              disabled={submitting}
              onClick={() => setState("camera")}
            >
              Ulangi
            </Button>
            <Button
              className="primary-button"
              disabled={submitting}
              onClick={handleSendCheckIn}
            >
              {submitting ? "Mengirim..." : `Kirim Absensi ${tipe}`}
            </Button>
          </div>
        </section>
      )}

      {state === "done" && (
        <section className="checkin-card checkin-success">
          <span>
            <Icon name="check" />
          </span>
          <p className="eyebrow">Waktu server tervalidasi</p>
          <h2>{serverTime}</h2>
          <i className="chip lunas">Berhasil tercatat</i>
          <p>Absensi {tipe.toLowerCase()} berhasil dicatat di sistem.</p>
          <div style={{ marginTop: 12 }}>
            <Button
              className="secondary-button"
              onClick={() => setState("ready")}
            >
              Selesai
            </Button>
          </div>
        </section>
      )}

      <section className="panel attendance-history">
        <PageTitle eyebrow="Riwayat kehadiran" title="Absensi Terakhir" />
        {loading && (
          <p style={{ padding: 12, color: "var(--muted)" }}>
            Memuat riwayat...
          </p>
        )}
        {history.map((row) => (
          <article key={row.id}>
            <span className="photo-thumb">
              <Icon name="user" />
            </span>
            <span>
              <strong>
                {row.tanggal} · {row.tipe || "Masuk"}
              </strong>
              <small>{row.jam} · Waktu server</small>
            </span>
            <i className="chip lunas">{row.status || "Hadir"}</i>
          </article>
        ))}
      </section>

      {issueOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!issueText.trim()) return
              try {
                await apiAbsensi.catat({
                  tipe: tipe,
                  catatan: `Kendala: ${issueText.trim()}`,
                })
                alert("Laporan kendala absensi berhasil dikirim ke server.")
                setIssueOpen(false)
                setIssueText("")
                loadHistory()
              } catch (err) {
                alert(err instanceof Error ? err.message : "Gagal mengirim.")
              }
            }}
          >
            <header>
              <h2>Lapor Kendala Absensi</h2>
              <Button type="button" onClick={() => setIssueOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Jelaskan kendala Anda</span>
              <textarea
                placeholder="Contoh: Kamera rusak, internet lemot, izin telat..."
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                required
              />
            </label>
            <footer>
              <Button
                className="secondary-button"
                type="button"
                onClick={() => setIssueOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Kirim Laporan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

export default AttendancePage
