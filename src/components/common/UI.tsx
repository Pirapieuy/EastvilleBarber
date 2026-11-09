import { CSSProperties, ReactNode } from "react"
import { Icon } from "./Icon"
import { IconName } from "../../types"

export const rupiah = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(value)}`

export function Button({
  children,
  className = "",
  disabled,
  onClick,
  type = "button",
  title,
  style,
  "aria-label": ariaLabel,
}: {
  children?: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: "button" | "submit"
  title?: string
  style?: CSSProperties
  "aria-label"?: string
}) {
  return (
    <button
      className={`button ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
      title={title}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

export function BrandMark({
  onClick,
  isCollapsed = false,
  title,
}: {
  onClick?: () => void
  isCollapsed?: boolean
  title?: string
}) {
  return (
    <div
      className={`brand-mark ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
    >
      <div className="monogram">B</div>
      <div className="brand-text">
        <div className="brand-name">BarberBoss</div>
        <div className="brand-caption">Eastville Barbershop</div>
      </div>
      {onClick && !isCollapsed && (
        <div
          className="sidebar-toggle-indicator"
          title="Klik logo untuk ringkas"
        >
          <Icon name="chevron" />
        </div>
      )}
    </div>
  )
}

export function PageTitle({
  eyebrow,
  title,
  action,
  className = "",
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`page-title ${className}`.trim()}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function LoadingState({
  message,
  compact = false,
}: {
  message: string
  compact?: boolean
}) {
  return (
    <div
      className={`loading-state${compact ? " loading-state-compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="loading-spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export function Kpi({
  icon,
  label,
  tone,
  value,
  detail,
}: {
  icon: IconName
  label: string
  tone: string
  value: string
  detail: string
}) {
  return (
    <article className="kpi">
      <span className={`kpi-icon ${tone}`}>
        <Icon name={icon} />
      </span>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

export { CalendarPicker, MonthPicker } from "./CalendarPicker"
