import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  CalendarPicker,
  LoadingState,
  PageTitle,
} from "../../components/common/UI"
import {
  AbsensiRow,
  apiAbsensi,
  apiAbsensiKapster,
  apiKasir,
  getToken,
} from "../../api"
import { AbsensiStatus } from "../../types"

type View = "list" | "photo"

export function AbsensiKapster({ onNavigate, inline = false, initialKapsterId, initialKapsterName, onComplete }: {
  onNavigate?: (page: string) => void
  inline?: boolean
  initialKapsterId?: string
  initialKapsterName?: string
  onComplete?: (success: boolean) => void
} = {}) {
  const todayIso = new Date().toISOString().slice(0, 10)
  const [tanggal, setTanggal] = useState(todayIso)
  const [kapsters, setKapsters] = useState<{ id: string; nama: string }[]>([])
  const [absensi, setAbsensi] = useState<AbsensiRow[]>([])
  const [riwayatAbsensi, setRiwayatAbsensi] = useState<AbsensiRow[]>([])
  const [activeTab, setActiveTab] = useState<"absensi" | "riwayat">("absensi")
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)
  const [filterTanggalRiwayat, setFilterTanggalRiwayat] = useState("")
  const [cariKapster, setCariKapster] = useState("")
  const [loading, setLoading] = useState(() => Boolean(getToken()))
  const [view, setView] = useState<View>("list")
  const [selectedKapster, setSelectedKapster] = useState<{
    id: string
    nama: string
  } | null>(null)
  const [fotoWajah, setFotoWajah] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<AbsensiStatus>("Hadir")
  const [catatan, setCatatan] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  useEffect(() => {
    if (view !== "photo" || fotoWajah) return
    let active = true
    let stream: MediaStream | null = null
    setCameraReady(false)
    setPhotoError("")
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhotoError("Kamera tidak tersedia. Buka aplikasi melalui HTTPS atau localhost.")
      return
    }
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 800 } },
      audio: false,
    }).then((cameraStream) => {
      stream = cameraStream
      if (!active) {
        cameraStream.getTracks().forEach((track) => track.stop())
        return
      }
      if (videoRef.current) videoRef.current.srcObject = cameraStream
    }).catch((error: unknown) => {
      if (!active) return
      setPhotoError(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Izin kamera ditolak. Izinkan akses kamera di browser lalu coba lagi."
        : "Kamera tidak dapat dibuka. Pastikan kamera tersedia dan tidak sedang dipakai aplikasi lain.")
    })
    return () => {
      active = false
      stream?.getTracks().forEach((track) => track.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [view, fotoWajah])

  const statusByUser = useMemo(() => {
    const map = new Map<string, AbsensiRow>()
    absensi.forEach((row) => {
      const key = `${row.userId}|${row.tanggal}`
      const existing = map.get(key)
      if (!existing || row.waktu > existing.waktu) map.set(key, row)
    })
    return map
  }, [absensi])

  async function loadData() {
    if (!getToken()) return
    setLoading(true)
    try {
      const [k, a] = await Promise.all([
        apiKasir.kapster(),
        apiAbsensi.list({ tanggal }),
      ])
      setKapsters(k)
      setAbsensi(a)
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal memuat data.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tanggal])

  useEffect(() => {
    if (loading || kapsters.length === 0) return
    const requestedId = initialKapsterId || sessionStorage.getItem("eastville-attendance-kapster")
    if (!requestedId) return
    sessionStorage.removeItem("eastville-attendance-kapster")
    const requestedKapster = kapsters.find((kapster) => kapster.id === requestedId)
    if (requestedKapster) openKapster(requestedKapster)
  }, [loading, kapsters])

  useEffect(() => {
    if (activeTab !== "riwayat" || riwayatAbsensi.length > 0) return
    let active = true
    setLoadingRiwayat(true)
    apiAbsensi.list().then((rows) => {
      if (active) setRiwayatAbsensi(rows)
    }).catch((err: unknown) => {
      if (active) setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal memuat riwayat absensi.",
      })
    }).finally(() => {
      if (active) setLoadingRiwayat(false)
    })
    return () => { active = false }
  }, [activeTab, riwayatAbsensi.length])

  const statusFor = useCallback(
    (kapsterId: string) => {
      const row = statusByUser.get(`${kapsterId}|${tanggal}`)
      return row ? row.status as AbsensiStatus : "Tidak Hadir"
    },
    [statusByUser, tanggal],
  )

  function openKapster(kapster: { id: string; nama: string }) {
    setSelectedKapster(kapster)
    setFotoWajah("")
    setPhotoError("")
    setStatus("Hadir")
    setCatatan("")
    setView("photo")
  }

  async function handlePhotoSelected(file?: File) {
    if (!file) return
    const imageUrl = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = imageUrl
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error("Foto tidak dapat dibaca."))
      })
      const scale = Math.min(1, 360 / image.width, 450 / image.height)
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Foto tidak dapat diproses.")
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const compressedPhoto = canvas.toDataURL("image/jpeg", 0.55)
      if (compressedPhoto.length > 45000) {
        throw new Error("Ukuran foto masih terlalu besar. Coba foto ulang.")
      }
      setFotoWajah(compressedPhoto)
      setPhotoError("")
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : "Gagal memproses foto wajah.",
      )
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  async function capturePhoto() {
    const video = videoRef.current
    if (!video || !cameraReady) return
    const canvas = document.createElement("canvas")
    const scale = Math.min(1, 360 / video.videoWidth, 450 / video.videoHeight)
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const context = canvas.getContext("2d")
    if (!context) {
      setPhotoError("Foto tidak dapat diproses. Coba lagi.")
      return
    }
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.55))
    if (!blob) {
      setPhotoError("Foto tidak dapat diproses. Coba lagi.")
      return
    }
    await handlePhotoSelected(new File([blob], "absensi.jpg", { type: "image/jpeg" }))
  }

  async function handleCatat() {
    if (!selectedKapster) return
    setSubmitting(true)
    try {
      await apiAbsensiKapster.catatAbsensiKapster({
        targetUserId: selectedKapster.id,
        tanggal,
        status: "Hadir",
        fotoUrl: fotoWajah,
        catatan: "",
      })
      setToast({
        type: "success",
        message: `Absensi ${selectedKapster.nama} berhasil dicatat (Hadir).`,
      })
      setRiwayatAbsensi([])
      setView("list")
      await loadData()
      if (inline) {
        onComplete?.(true)
        return
      }
      if (sessionStorage.getItem("eastville-return-to-pos") === "1") {
        sessionStorage.removeItem("eastville-return-to-pos")
        onNavigate?.("KasirPOS")
      }
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal mencatat absensi.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  function closeModal() {
    sessionStorage.removeItem("eastville-return-to-pos")
    setView("list")
    setSelectedKapster(null)
    setFotoWajah("")
    setPhotoError("")
    setStatus("Hadir")
    setCatatan("")
    if (inline) onComplete?.(false)
  }

  function dismissToast() {
    setToast(null)
  }

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const STATUS_CONFIG: Record<AbsensiStatus, {
    label: string
    color: string
    bg: string
  }> = {
    Hadir: { label: "Hadir", color: "#15803d", bg: "#ecfdf5" },
    Izin: { label: "Izin", color: "#0f766e", bg: "#ecfdf5" },
    Sakit: { label: "Sakit", color: "#b45309", bg: "#fffbeb" },
    Cuti: { label: "Cuti", color: "#7c3aed", bg: "#faf5ff" },
    "Tidak Hadir": { label: "Belum Hadir", color: "#6b7280", bg: "#f3f4f6" },
  }

  const filteredRiwayat = riwayatAbsensi
    .filter((row) =>
      row.role?.toLocaleLowerCase("id-ID") === "kapster" ||
      kapsters.some((kapster) => kapster.id === row.userId),
    )
    .filter((row) => !filterTanggalRiwayat || row.tanggal === filterTanggalRiwayat)
    .filter((row) => row.nama.toLocaleLowerCase("id-ID").includes(cariKapster.trim().toLocaleLowerCase("id-ID")))
    .sort((a, b) => b.waktu.localeCompare(a.waktu))

  const modalOverlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "rgba(20, 17, 15, 0.62)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  }

  const modalPanelStyle = {
    maxWidth: 440,
    width: "min(92vw, 440px)",
    padding: 20,
    background: "var(--paper)",
    border: "1px solid var(--line)",
    borderRadius: 20,
    boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
  }

  if (loading) {
    if (inline) {
      return (
        <div className="modal-overlay" role="status">
          <div className="modal-panel absensi-modal absensi-loading-panel">
            <div className="absensi-loading-heading">
              <span className="absensi-modal-icon"><Icon name="camera" /></span>
              <div>
                <div className="absensi-loading-title">Absensi Kapster</div>
                <div className="absensi-loading-meta">
                  {initialKapsterName || kapsters.find((kapster) => kapster.id === initialKapsterId)?.nama || "Memuat nama kapster"}
                  <span aria-hidden="true">·</span>
                  {tanggal}
                </div>
              </div>
            </div>
            <div className="absensi-loading-status">
              <LoadingState message="Memuat Absensi" />
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="content">
        <LoadingState message="Memuat data kapster..." />
      </div>
    )
  }

  return (
    <div className={`mobile-content absensi-kasir ${inline ? "absensi-inline" : ""}`}>
      <PageTitle
        eyebrow={todayStr}
        title="Absensi Kapster"
        className="absensi-page-title"
      />

      {toast && (
        <div
          className="toast"
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            padding: "10px 16px",
            borderRadius: 10,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
            background: toast.type === "success" ? "#15803d" : "#dc2626",
          }}
          onClick={dismissToast}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      <div className="absensi-tabs" role="tablist" aria-label="Menu absensi">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "absensi"}
          className={activeTab === "absensi" ? "absensi-tab active" : "absensi-tab"}
          onClick={() => setActiveTab("absensi")}
        >Absensi</button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "riwayat"}
          className={activeTab === "riwayat" ? "absensi-tab active" : "absensi-tab"}
          onClick={() => setActiveTab("riwayat")}
        >Riwayat</button>
      </div>

      <div style={{ padding: "0 16px 20px" }}>
      {activeTab === "absensi" ? <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <CalendarPicker
            value={tanggal}
            onChange={setTanggal}
            compact
            style={{ flex: 1 }}
          />
          <Button
            className="secondary-button"
            onClick={() => setTanggal(todayIso)}
            disabled={tanggal === todayIso}
          >
            <Icon
              name="calendar"
              style={{ width: 14, height: 14, marginRight: 6 }}
            />
            Hari Ini
          </Button>
        </div>

        {kapsters.length === 0 ? (
          <div
            className="panel"
            style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}
          >
            <Icon
              name="user"
              style={{
                width: 32,
                height: 32,
                marginBottom: 10,
                color: "var(--muted)",
              }}
            />
            <div
              style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}
            >
              Belum ada data kapster
            </div>
            <div style={{ fontSize: 13 }}>
              Tambah data kapster melalui Owner atau Manajer.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {kapsters.map((k) => {
              const st = statusFor(k.id)
              const attendance = statusByUser.get(`${k.id}|${tanggal}`)
              const cfg = STATUS_CONFIG[st]
              const hadir = st === "Hadir"
              return (
                <div
                  key={k.id}
                  className="panel absensi-row"
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    cursor: "pointer",
                    border: `1px solid ${hadir ? cfg.color : "var(--line)"}`,
                    background: hadir ? cfg.bg : "var(--paper)",
                  }}
                  onClick={() => openKapster(k)}
                >
                  {attendance?.fotoUrl ? (
                    <img
                      src={attendance.fotoUrl}
                      alt={`Foto absensi ${k.nama}`}
                      style={{
                        width: 46,
                        height: 46,
                        flex: "none",
                        objectFit: "cover",
                        borderRadius: 12,
                      }}
                    />
                  ) : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--ink)",
                        fontSize: 15,
                      }}
                    >
                      {k.nama}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: cfg.color,
                        background: cfg.bg,
                        borderRadius: 20,
                        padding: "3px 10px",
                        marginTop: 8,
                        border: `1px solid ${cfg.color}`,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        width: "fit-content",
                      }}
                    >
                      {cfg.label}
                    </div>
                  </div>
                  <Icon
                    name="chevron"
                    style={{ width: 16, height: 16, color: "var(--muted)" }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </> : (
        <div className="absensi-history-list" role="tabpanel">
          <div className="absensi-history-filters">
            <label className="absensi-history-search">
              <Icon name="search" />
              <input
                type="search"
                value={cariKapster}
                onChange={(event) => setCariKapster(event.target.value)}
                placeholder="Cari nama kapster..."
                aria-label="Cari riwayat berdasarkan nama kapster"
              />
            </label>
            <label className="absensi-history-date">
              <span>Tanggal</span>
              <input
                type="date"
                value={filterTanggalRiwayat}
                onChange={(event) => setFilterTanggalRiwayat(event.target.value)}
                aria-label="Filter riwayat berdasarkan tanggal"
              />
            </label>
          </div>
          {loadingRiwayat ? <LoadingState message="Memuat riwayat absensi..." /> :
            filteredRiwayat.length === 0 ? (
              <div className="panel absensi-history-empty">
                {filterTanggalRiwayat || cariKapster.trim()
                  ? "Tidak ada absensi kapster yang cocok dengan filter ini."
                  : "Belum ada riwayat absensi kapster."}
              </div>
            ) : filteredRiwayat.map((row) => (
              <article className="panel absensi-history-row" key={row.id}>
                {row.fotoUrl ? <img src={row.fotoUrl} alt={`Foto absensi ${row.nama}`} /> :
                  <span className="absensi-history-avatar"><Icon name="calendar" /></span>}
                <div className="absensi-history-info">
                  <strong>{row.nama}</strong>
                  <span>{new Date(`${row.tanggal}T00:00:00`).toLocaleDateString("id-ID", {
                    day: "numeric", month: "long", year: "numeric",
                  })}{row.jam ? ` · ${row.jam}` : ""}</span>
                </div>
                <span className="absensi-history-status">{row.status || row.tipe || "Tercatat"}</span>
              </article>
            ))}
        </div>
      )}
      </div>

      {view === "photo" && selectedKapster && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          style={modalOverlayStyle}
        >
          <div
            className="modal-panel absensi-modal"
            onClick={(e) => e.stopPropagation()}
            style={modalPanelStyle}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                paddingBottom: 16,
                borderBottom: "1px solid var(--line)",
                marginBottom: 16,
              }}
            >
              <span className="absensi-modal-icon"><Icon name="camera" /></span>
              <div className="absensi-modal-heading">
                <div className="absensi-modal-title">Absensi Kapster</div>
                <div className="absensi-modal-subtitle">
                  {selectedKapster.nama} <span aria-hidden="true">·</span> {tanggal}
                </div>
              </div>
            </div>
            {fotoWajah ? (
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <img
                  src={fotoWajah}
                  alt={`Foto wajah ${selectedKapster.nama}`}
                  style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 12 }}
                />
              </div>
            ) : (
              <div className="absensi-camera-wrap">
                <video
                  ref={videoRef}
                  className="absensi-camera-preview"
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={() => setCameraReady(true)}
                  aria-label="Pratinjau kamera wajah kapster"
                />
                {!cameraReady && !photoError && <div className="absensi-camera-message">Menghubungkan kamera…</div>}
                <div className="absensi-camera-guide" aria-hidden="true" />
              </div>
            )}
            {photoError && (
              <p role="alert" className="absensi-error">
                {photoError}
              </p>
            )}
            <div className="absensi-actions">
              {fotoWajah ? (
                <Button
                  className="absensi-primary"
                  onClick={handleCatat}
                  disabled={submitting}
                >
                  {submitting ? "Mengirim…" : "Kirim Absensi"}
                </Button>
              ) : (
                <Button
                  className="absensi-primary"
                  onClick={() => void capturePhoto()}
                  disabled={!cameraReady}
                >
                  <Icon name="camera" />
                  Ambil Foto
                </Button>
              )}
              <div className="absensi-actions-secondary">
                {fotoWajah && (
                  <Button
                    className="secondary-button"
                    onClick={() => setFotoWajah("")}
                    disabled={submitting}
                  >
                    Ambil Ulang
                  </Button>
                )}
                <Button
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Batal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AbsensiKapster
