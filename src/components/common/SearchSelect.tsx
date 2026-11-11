import {
  Children,
  isValidElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import "./SearchSelect.css"

interface Opsi {
  value: string
  label: string
  disabled: boolean
}

interface SearchSelectProps {
  value: string
  onChange: (event: { target: { value: string } }) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  placeholder?: string
  "aria-label"?: string
}

function teksDari(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(teksDari).join("")
  if (isValidElement<{ children?: ReactNode }>(node))
    return teksDari(node.props.children)
  return ""
}

// Pengganti <select>: tulis <option> seperti biasa, tetapi daftar bisa dicari.
export function SearchSelect({
  value,
  onChange,
  children,
  className = "",
  disabled,
  placeholder = "Pilih…",
  "aria-label": ariaLabel,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [cari, setCari] = useState("")
  const [aktif, setAktif] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  const opsi = useMemo<Opsi[]>(() => {
    const hasil: Opsi[] = []
    Children.forEach(children, (c) => {
      if (!isValidElement<{ value?: string; disabled?: boolean; children?: ReactNode }>(c)) return
      const label = teksDari(c.props.children)
      hasil.push({
        value: c.props.value ?? label,
        label,
        disabled: Boolean(c.props.disabled),
      })
    })
    return hasil
  }, [children])

  const kata = cari.trim().toLowerCase()
  const tampil = opsi.filter((o) => o.label.toLowerCase().includes(kata))
  const terpilih = opsi.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const luar = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", luar)
    return () => document.removeEventListener("pointerdown", luar)
  }, [open])

  function tutup() {
    setOpen(false)
    setCari("")
  }

  function pilih(o: Opsi) {
    if (o.disabled) return
    onChange({ target: { value: o.value } })
    tutup()
  }

  return (
    <div
      className={`search-select${open ? " open" : ""} ${className}`}
      ref={root}
    >
      {open ? (
        <input
          autoFocus
          aria-label={ariaLabel ?? "Cari pilihan"}
          className="search-select-trigger search-select-input"
          onChange={(e) => {
            setCari(e.target.value)
            setAktif(0)
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") tutup()
            else if (e.key === "ArrowDown") {
              e.preventDefault()
              setAktif((i) => Math.min(tampil.length - 1, i + 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setAktif((i) => Math.max(0, i - 1))
            } else if (e.key === "Enter") {
              e.preventDefault()
              if (tampil[aktif]) pilih(tampil[aktif])
            }
          }}
          placeholder={terpilih?.label ?? "Ketik untuk mencari…"}
          value={cari}
        />
      ) : (
        <button
          aria-expanded={false}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className="search-select-trigger"
          disabled={disabled}
          onClick={() => {
            setAktif(Math.max(0, opsi.findIndex((o) => o.value === value)))
            setOpen(true)
          }}
          type="button"
        >
          <span>{terpilih?.label ?? placeholder}</span>
          <i aria-hidden="true" />
        </button>
      )}
      {open && (
        <div className="search-select-menu">
          <div className="search-select-list" role="listbox">
            {tampil.length === 0 && (
              <p className="search-select-empty">Tidak ada yang cocok.</p>
            )}
            {tampil.map((o, i) => (
              <button
                aria-selected={o.value === value}
                className={`search-select-option${
                  o.value === value ? " selected" : ""
                }${i === aktif ? " active" : ""}`}
                disabled={o.disabled}
                key={o.value + i}
                onClick={() => pilih(o)}
                role="option"
                type="button"
              >
                <span>{o.label}</span>
                {o.value === value && <b aria-hidden="true">✓</b>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchSelect
