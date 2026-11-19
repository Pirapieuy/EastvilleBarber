import { useState } from "react"
import { Button } from "./UI"
import { Icon } from "./Icon"

export interface ConfirmModalProps {
  title: string
  message?: string
  warning?: string
  eyebrow?: string
  confirmText?: string
  cancelText?: string
  confirmTone?: "danger" | "primary"
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  minReasonLength?: number
  onClose: () => void
  onConfirm: (reason: string) => void | Promise<void>
}

export function ConfirmModal({
  title,
  message,
  warning,
  eyebrow = "Konfirmasi Tindakan",
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  confirmTone = "danger",
  requireReason = false,
  reasonLabel = "Alasan",
  reasonPlaceholder = "Tuliskan alasan tindakan ini...",
  minReasonLength = 3,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const canSubmit = !requireReason || reason.trim().length >= minReasonLength

  async function handleConfirm() {
    if (!canSubmit || busy) return
    setError("")
    setBusy(true)
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tindakan gagal diproses.")
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-overlay modal-centered"
      onClick={() => {
        if (!busy) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <section
        className="reason-dialog confirm-custom-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(460px, calc(100% - 32px))",
          borderRadius: 16,
          background: "var(--paper)",
          boxShadow: "0 16px 48px rgb(20 17 15 / 28%)",
          overflow: "hidden",
          margin: "auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "18px 20px 14px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <p
              className="eyebrow"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: confirmTone === "danger" ? "var(--oxblood)" : "var(--brass-dark)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: "0 0 4px 0",
              }}
            >
              {eyebrow}
            </p>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--ink)", lineHeight: 1.3 }}>
              {title}
            </h2>
          </div>
          <Button
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            style={{ width: 34, height: 34, minWidth: 34, padding: 0 }}
          >
            <Icon name="close" />
          </Button>
        </header>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {warning && (
            <div
              className="info-banner"
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgb(180 83 9 / 10%)",
                border: "1px solid rgb(180 83 9 / 25%)",
                color: "#92400e",
                fontSize: 12.5,
                lineHeight: 1.4,
              }}
            >
              <Icon name="alert" />
              <span>{warning}</span>
            </div>
          )}

          {message && (
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--slate)", lineHeight: 1.5 }}>
              {message}
            </p>
          )}

          {requireReason && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6, margin: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                {reasonLabel} <span style={{ color: "var(--oxblood)" }}>*</span>
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                disabled={busy}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--bone)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              {minReasonLength > 0 && reason.trim().length < minReasonLength && (
                <small style={{ fontSize: 11, color: "var(--slate)" }}>
                  Minimal {minReasonLength} karakter.
                </small>
              )}
            </label>
          )}

          {error && (
            <div
              className="info-banner"
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--oxblood-soft)",
                color: "var(--oxblood)",
                fontSize: 12,
              }}
            >
              <Icon name="alert" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <footer
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px 16px",
            borderTop: "1px solid var(--line)",
            background: "var(--paper)",
          }}
        >
          <Button className="secondary-button" onClick={onClose} disabled={busy}>
            {cancelText}
          </Button>
          <Button
            className={confirmTone === "danger" ? "danger-button" : "primary-button"}
            disabled={!canSubmit || busy}
            onClick={handleConfirm}
          >
            {busy ? "Memproses..." : confirmText}
          </Button>
        </footer>
      </section>
    </div>
  )
}
