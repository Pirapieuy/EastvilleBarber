import { useCallback, useEffect, useMemo, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, CalendarPicker } from "../../components/common/UI"
import { apiAbsensi, apiAbsensiKapster, apiKasir, getToken } from "../../api"
import { AbsensiRow, AbsensiStatus } from "../../types"

type View = "list" | "pin" | "status"

export function AbsensiKapster() {
  const todayIso = new Date().toISOString().slice(0, 10)
  const [tanggal, setTanggal] = useState(todayIso)
  const [kapsters, setKapsters] = useState<{ id: string nama: string }[]>([])
  const [absensi, setAbsensi] = useState<AbsensiRow[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>("list")
  const [selectedKapster, setSelectedKapster] = useState<{
    id: string
    nama: string
  } | null>(null)
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [status, setStatus] = useState<AbsensiStatus>("Hadir")
  const [catatan, setCatatan] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

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

  const statusFor = useCallback(
    (kapsterId: string) => {
      const row = statusByUser.get(`${kapsterId}|${tanggal}`)
      return row ? row.status as AbsensiStatus : "Tidak Hadir"
    },
    [statusByUser, tanggal],
  )

  function openPin(kapster: { id: string nama: string }) {
    setSelectedKapster(kapster)
    setPin("")
    setPinError("")
    setStatus("Hadir")
    setCatatan("")
    setView("pin")
  }

  async function handlePinSubmit() {
    if (!selectedKapster) return
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPinError("PIN harus 6 digit angka.")
      return
    }
    setSubmitting(true)
    setPinError("")
    try {
      await apiAbsensiKapster.verifikasiPinKapster(selectedKapster.id, pin)
      setView("status")
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "PIN salah.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCatat() {
    if (!selectedKapster) return
    setSubmitting(true)
    try {
      await apiAbsensiKapster.catatAbsensiKapster({
        targetUserId: selectedKapster.id,
        tanggal,
        status,
        catatan,
      })
      setToast({
        type: "success",
        message: `Absensi ${selectedKapster.nama} berhasil dicatat (${status}).`,
      })
      setView("list")
      await loadData()
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
    setView("list")
    setSelectedKapster(null)
    setPin("")
    setPinError("")
    setStatus("Hadir")
    setCatatan("")
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
    "Tidak Hadir": { label: "Tidak Hadir", color: "#6b7280", bg: "#f3f4f6" },
  }

  const modalOverlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "rgba(20, 17, 15, 0.45)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  }

  const modalPanelStyle = {
    maxWidth: 340,
    width: "min(90vw, 340px)",
    background: "#fff",
    border: "1px solid var(--line)",
    borderRadius: 16,
    boxShadow: "0 24px 48px rgba(0,0,0,0.30)",
  }

  return (
    <div className="mobile-content absensi-kasir">
      <PageTitle eyebrow={todayStr} title="Absensi Kapster" />

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

      <div style={{ padding: "0 16px 20px" }}>
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

        {loading ? (
          <div
            style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}
          >
            <span
              className="loading-spinner"
              style={{ display: "inline-block", marginRight: 8 }}
            />
            Memuat data kapster…
          </div>
        ) : kapsters.length === 0 ? (
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
                  onClick={() => openPin(k)}
                >
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
      </div>

      {/* PIN modal - unik & berwarna seperti kartu */}
      {view === "pin" && selectedKapster && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          style={{
            ...modalOverlayStyle,
            background:
              "radial-gradient(circle at 30% 30%, #fef3c7 0%, rgba(20,17,15,0.55) 60%)",
          }}
        >
          <div
            className="modal-panel absensi-modal pin-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              ...modalPanelStyle,
              background: "linear-gradient(135deg, #fff 0%, #fef3c7 100%)",
              border: "2px solid #d97706",
              borderRadius: 24,
              boxShadow:
                "0 30px 60px rgba(0,0,0,0.35), 0 0 0 20px rgba(255,255,255,0.6)",
            }}
          >
            {/* Kartu ikon barbershop di atas */}
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 24,
                background: "#f59e0b",
                margin: "0 auto -24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 24px rgba(245,158,11,0.35)",
                border: "4px solid #fff",
              }}
            >
              <Icon
                name="user"
                style={{ width: 34, height: 34, color: "#fff" }}
              />
            </div>
            <div
              style={{
                textAlign: "center",
                paddingTop: 28,
                paddingBottom: 20,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: "#92400e",
                  fontSize: 17,
                  letterSpacing: 0.2,
                  marginBottom: 6,
                }}
              >
                Verifikasi PIN Kapster
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#78350f",
                  lineHeight: 1.5,
                }}
              >
                Masukkan PIN {selectedKapster.nama} untuk memverifikasi
                identitas sebelum absensi
              </div>
            </div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                color: "#92400e",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              PIN (6 digit)
            </label>
            <div
              className="input-shell"
              style={{ position: "relative", marginBottom: 6 }}
            >
              <Icon
                name="lock"
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 18,
                  height: 18,
                  color: "#d97706",
                }}
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 52px",
                  fontSize: 24,
                  letterSpacing: 16,
                  textAlign: "center",
                  border: `2px solid ${pinError ? "#dc2626" : "#d97706"}`,
                  borderRadius: 14,
                  fontFamily: "inherit",
                  background: "#fff",
                  color: "#78350f",
                  outline: "none",
                }}
              />
            </div>
            {pinError && (
              <div
                style={{
                  color: "#dc2626",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                {pinError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                className="secondary-button"
                onClick={closeModal}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: 14,
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#78350f",
                  background: "#fff",
                  border: "2px solid #f59e0b",
                  borderRadius: 14,
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handlePinSubmit}
                disabled={submitting || pin.length !== 6}
                style={{
                  flex: 1,
                  padding: 14,
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#fff",
                  background: "#b45309",
                  border: "2px solid #b45309",
                  borderRadius: 14,
                  boxShadow: "0 8px 16px rgba(180,83,9,0.35)",
                }}
              >
                Verifikasi PIN
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status picker modal */}
      {view === "status" && selectedKapster && (
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
                gap: 10,
                paddingBottom: 12,
                borderBottom: "1px solid var(--line)",
                marginBottom: 14,
              }}
            >
              <Icon
                name="calendar"
                style={{ width: 20, height: 20, color: "var(--ink)" }}
              />
              <div>
                <div
                  style={{ fontWeight: 700, color: "var(--ink)", fontSize: 16 }}
                >
                  Pilih Status Absensi
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}
                >
                  {selectedKapster.nama} ·{" "}
                  {new Date(tanggal + "T00:00:00").toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,1fr)",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {["Hadir", "Izin", "Sakit", "Cuti"].map((s) => {
                const cfg = STATUS_CONFIG[(s as AbsensiStatus)]
                const active = status === s
                return (
                  <Button
                    key={s}
                    className={active ? "primary-button" : "secondary-button"}
                    onClick={() => setStatus(s as AbsensiStatus)}
                    style={{
                      padding: "12px 10px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: active ? "#fff" : cfg.color,
                      background: active ? cfg.color : cfg.bg,
                      border: `1px solid ${cfg.color}`,
                      borderRadius: 12,
                      gap: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {s}
                  </Button>
                )
              })}
            </div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              Catatan (opsional)
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="Mis. Izin keluarga, Sakit demam, dll."
              style={{
                width: "100%",
                padding: 12,
                fontSize: 14,
                border: "1px solid var(--line)",
                borderRadius: 12,
                fontFamily: "inherit",
                background: "#fff",
                color: "var(--ink)",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Button
                className="secondary-button"
                onClick={closeModal}
                disabled={submitting}
                style={{ flex: 1, padding: 12, fontWeight: 700 }}
              >
                Batal
              </Button>
              <Button
                onClick={handleCatat}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: 12,
                  fontWeight: 700,
                  background: "#15803d",
                  border: "1px solid #15803d",
                  color: "#fff",
                }}
              >
                Simpan Absensi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AbsensiKapster
