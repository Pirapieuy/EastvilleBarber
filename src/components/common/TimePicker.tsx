import { useEffect, useRef, useState } from "react"
import { Icon } from "./Icon"

const pad = (n: number) => String(n).padStart(2, "0")
const JAM = Array.from({ length: 24 }, (_, i) => pad(i))
const MENIT = Array.from({ length: 60 }, (_, i) => pad(i))

export interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  align?: "left" | "right"
}

// Pemilih jam bergaya sama dengan CalendarPicker; nilai berformat "HH:MM".
export function TimePicker({ value, onChange, align = "left" }: TimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const jamRef = useRef<HTMLButtonElement>(null)
  const menitRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  const [h, m] = (value || "00:00").split(":")
  const jam = pad(Number(h) || 0)
  const menit = pad(Number(m) || 0)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Saat dibuka, gulirkan kolom ke nilai yang sedang dipilih.
  useEffect(() => {
    if (!open) return
    jamRef.current?.scrollIntoView({ block: "center" })
    menitRef.current?.scrollIntoView({ block: "center" })
  }, [open])

  return (
    <div ref={containerRef} className="calendar-picker-wrapper time-picker">
      <button
        type="button"
        className="secondary-button calendar-picker-btn"
        onClick={() => setOpen((o) => !o)}
        title="Pilih jam"
      >
        <Icon name="clock" />
        <span className="calendar-picker-text">
          {jam}.{menit}
        </span>
      </button>

      {open && (
        <div className={`calendar-picker-popup time-picker-popup align-${align}`}>
          <section className="panel time-picker-panel">
            <div className="time-picker-cols">
              <div className="time-picker-col" role="listbox" aria-label="Jam">
                <small>Jam</small>
                <div className="time-picker-list">
                  {JAM.map((j) => (
                    <button
                      className={j === jam ? "active" : ""}
                      key={j}
                      onClick={() => onChange(`${j}:${menit}`)}
                      ref={j === jam ? jamRef : undefined}
                      type="button"
                    >
                      {j}
                    </button>
                  ))}
                </div>
              </div>
              <div className="time-picker-col" role="listbox" aria-label="Menit">
                <small>Menit</small>
                <div className="time-picker-list">
                  {MENIT.map((mm) => (
                    <button
                      className={mm === menit ? "active" : ""}
                      key={mm}
                      onClick={() => onChange(`${jam}:${mm}`)}
                      ref={mm === menit ? menitRef : undefined}
                      type="button"
                    >
                      {mm}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              className="secondary-button time-picker-done"
              onClick={() => setOpen(false)}
              type="button"
            >
              Selesai
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
