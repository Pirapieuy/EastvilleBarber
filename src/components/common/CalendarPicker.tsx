import { useEffect, useRef, useState } from "react"
import { Icon } from "./Icon"

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]
const HARI_SINGKAT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
const pad = (n: number) => String(n).padStart(2, "0")

export interface CalendarPickerProps {
  value: string
  onChange: (date: string) => void
  min?: string
  max?: string
  align?: "left" | "right"
  allowClear?: boolean
  clearLabel?: string
  placeholder?: string
  compact?: boolean
  style?: React.CSSProperties
}

export function CalendarPicker({
  value,
  onChange,
  min,
  max,
  align = "left",
  allowClear = false,
  clearLabel = "Semua Tanggal",
  placeholder = "Pilih tanggal",
  compact = false,
  style,
}: CalendarPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const todayIso = new Date().toISOString().slice(0, 10)
  const initialDate = value || todayIso
  const [calYear, setCalYear] = useState(() => {
    const y = parseInt(initialDate.slice(0, 4), 10)
    return isNaN(y) ? new Date().getFullYear() : y
  })
  const [calMonth, setCalMonth] = useState(() => {
    const m = parseInt(initialDate.slice(5, 7), 10) - 1
    return isNaN(m) ? new Date().getMonth() : m
  })

  useEffect(() => {
    if (value && value.length >= 10) {
      const y = parseInt(value.slice(0, 4), 10)
      const m = parseInt(value.slice(5, 7), 10) - 1
      if (!isNaN(y) && !isNaN(m)) {
        setCalYear(y)
        setCalMonth(m)
      }
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const startOffset = (firstDayOfMonth + 6) % 7

  function handlePrevMonth(e: React.MouseEvent) {
    e.stopPropagation()
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear((y) => y - 1)
    } else {
      setCalMonth((m) => m - 1)
    }
  }

  function handleNextMonth(e: React.MouseEvent) {
    e.stopPropagation()
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear((y) => y + 1)
    } else {
      setCalMonth((m) => m + 1)
    }
  }

  function handleSelectDate(day: number) {
    const iso = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`
    onChange(iso)
    setOpen(false)
  }

  function handleJumpToday(e: React.MouseEvent) {
    e.stopPropagation()
    const now = new Date()
    setCalMonth(now.getMonth())
    setCalYear(now.getFullYear())
    onChange(todayIso)
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("")
    setOpen(false)
  }

  let formatted = placeholder
  if (value) {
    const d = new Date(value.includes("T") ? value : `${value}T00:00:00`)
    if (!isNaN(d.getTime())) {
      formatted = d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    }
  }

  return (
    <div
      ref={containerRef}
      className="calendar-picker-wrapper"
      style={{ position: "relative", ...style }}
    >
      <button
        type="button"
        className="secondary-button calendar-picker-btn"
        onClick={() => setOpen((o) => !o)}
        title="Pilih tanggal"
      >
        <Icon name="calendar" />
        <span className="calendar-picker-text">{formatted}</span>
      </button>

      {open && (
        <div className={`calendar-picker-popup align-${align}`}>
          <section
            className="panel"
            style={{ padding: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <strong style={{ fontSize: 13 }}>
                {NAMA_BULAN[calMonth]} {calYear}
              </strong>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: "4px 8px" }}
                  onClick={handlePrevMonth}
                >
                  <Icon name="chevron" />
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: "4px 8px", transform: "rotate(180deg)" }}
                  onClick={handleNextMonth}
                >
                  <Icon name="chevron" />
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                gap: 2,
                textAlign: "center",
                fontSize: 10,
                marginBottom: 6,
              }}
            >
              {HARI_SINGKAT.map((h) => (
                <div key={h}>{h}</div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                gap: 2,
              }}
            >
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const curIso = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`
                const sel = curIso === value
                const tod = curIso === todayIso
                const disabled = Boolean(
                  (max && curIso > max) || (min && curIso < min),
                )
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectDate(day)}
                    style={{
                      height: 30,
                      borderRadius: 6,
                      border: sel
                        ? "1px solid var(--ink)"
                        : "1px solid transparent",
                      background: sel
                        ? "var(--ink)"
                        : tod
                          ? "rgba(200,150,62,0.12)"
                          : "transparent",
                      color: sel
                        ? "#fff"
                        : disabled
                          ? "var(--muted)"
                          : "var(--ink)",
                      fontSize: 11,
                      fontWeight: sel || tod ? 700 : 500,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 6,
              }}
            >
              {allowClear ? (
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={handleClear}
                >
                  {clearLabel}
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "4px 8px", fontSize: 11 }}
                onClick={handleJumpToday}
              >
                Hari Ini
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export function MonthPicker({
  value,
  onChange,
  min,
  max,
  style,
}: {
  value: string
  onChange: (val: string) => void
  min?: string
  max?: string
  style?: React.CSSProperties
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const [year, setYear] = useState(() => {
    const y = parseInt(value?.slice(0, 4) || "", 10)
    return isNaN(y) ? new Date().getFullYear() : y
  })

  const currentMonthIdx = parseInt(value?.slice(5, 7) || "", 10) - 1

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const formatted =
    !isNaN(currentMonthIdx) && currentMonthIdx >= 0 && currentMonthIdx < 12
      ? `${NAMA_BULAN[currentMonthIdx]} ${year}`
      : value || "Pilih bulan"

  return (
    <div
      ref={containerRef}
      className="calendar-picker-wrapper"
      style={{ position: "relative", ...style }}
    >
      <button
        type="button"
        className="secondary-button calendar-picker-btn"
        onClick={() => setOpen((o) => !o)}
        title="Pilih bulan"
      >
        <Icon name="calendar" />
        <span className="calendar-picker-text">{formatted}</span>
      </button>

      {open && (
        <div className="calendar-picker-popup align-left">
          <section
            className="panel"
            style={{ padding: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <strong style={{ fontSize: 13 }}>Tahun {year}</strong>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: "4px 8px" }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setYear((y) => y - 1)
                  }}
                >
                  <Icon name="chevron" />
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: "4px 8px", transform: "rotate(180deg)" }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setYear((y) => y + 1)
                  }}
                >
                  <Icon name="chevron" />
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6,
              }}
            >
              {NAMA_BULAN.map((nama, idx) => {
                const isoMonth = `${year}-${pad(idx + 1)}`
                const isSelected = isoMonth === value
                const isDisabled = Boolean(
                  (max && isoMonth > max.slice(0, 7)) ||
                    (min && isoMonth < min.slice(0, 7)),
                )
                return (
                  <button
                    key={nama}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      onChange(isoMonth)
                      setOpen(false)
                    }}
                    style={{
                      height: 34,
                      borderRadius: 6,
                      border: isSelected
                        ? "1px solid var(--ink)"
                        : "1px solid var(--line)",
                      background: isSelected ? "var(--ink)" : "transparent",
                      color: isSelected ? "#fff" : "var(--ink)",
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.35 : 1,
                    }}
                  >
                    {nama.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
