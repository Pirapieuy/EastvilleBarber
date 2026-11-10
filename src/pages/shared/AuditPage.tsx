import { useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarPicker,
  LoadingState,
  PageTitle,
} from "../../components/common/UI"
import { apiAudit, AuditLogRow, getToken } from "../../api"

const DEMO_LOGS: string[][] = [
  [
    "29 Okt 2026, 10:42",
    "Ardi Santoso",
    "Ubah komisi",
    "Free Style Dust",
    "8% → 10%",
    "Kesepakatan baru",
  ],
  ["29 Okt 2026, 10:24", "Tata", "Login", "Akun Tata", "Berhasil", "—"],
  [
    "29 Okt 2026, 09:54",
    "Ardi Santoso",
    "Buka foto absensi",
    "Seva",
    "29 Okt 2026",
    "Pemeriksaan harian",
  ],
  [
    "29 Okt 2026, 09:12",
    "Tata",
    "Batalkan transaksi",
    "INV-291026-0082",
    "Rp 110.000",
    "Salah input",
  ],
  [
    "28 Okt 2026, 18:40",
    "Seva",
    "Pulihkan transaksi",
    "INV-281026-0077",
    "Rp 70.000",
    "Transaksi valid",
  ],
  [
    "28 Okt 2026, 16:20",
    "Ardi Santoso",
    "Bayar gaji",
    "Tata",
    "Rp 1.700.000",
    "Periode 16–31",
  ],
]

const AKSI_MAP: Record<string, string> = {
  LOGIN: "Login",
  LOGOUT: "Logout",
  LOGIN_GAGAL: "Login Gagal",
  LOCKOUT: "Akun Terkunci",
  FORGOT_PIN: "Lupa PIN",
  RESET_PIN: "Reset PIN",
  TRANSAKSI: "Transaksi",
  REKAP_MANUAL: "Rekap Manual",
  VOID_TRANSAKSI: "Batal Transaksi",
  PULIHKAN_TRANSAKSI: "Pulihkan Transaksi",
  PENGELUARAN: "Pengeluaran",
  BATAL_PENGELUARAN: "Batal Pengeluaran",
  AKTIFKAN_PENGELUARAN: "Aktif Pengeluaran",
  TAMBAH_PRODUK: "Tambah Produk",
  UBAH_PRODUK: "Ubah Produk",
  ADJUST_STOK: "Sesuaikan Stok",
  TAMBAH_LAYANAN: "Tambah Layanan",
  UBAH_LAYANAN: "Ubah Layanan",
  TOGGLE_LAYANAN: "Status Layanan",
  UBAH_KOMISI_KAPSTER: "Ubah Komisi",
  UBAH_PENGATURAN: "Ubah Pengaturan",
  TAMBAH_USER: "Tambah Tim",
  UPDATE_USER: "Ubah Tim",
  TOGGLE_USER_STATUS: "Status Tim",
  TAMBAH_KASBON: "Kasbon",
  LUNASI_KASBON: "Lunasi Kasbon",
  BAYAR_GAJI: "Bayar Gaji",
  ABSENSI: "Absensi",
  BACKUP: "Backup",
  PULIHKAN_BACKUP: "Pulihkan Backup",
}

function AuditFilterSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", closeOutside)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOutside)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  return (
    <div className={`audit-filter${open ? " open" : ""}`} ref={rootRef}>
      <button
        aria-expanded={open}
        className="audit-filter-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{value}</span>
        <i aria-hidden="true" />
      </button>
      {open && (
        <div className="audit-filter-menu" role="group" aria-label={value}>
          {options.map((option) => (
            <button
              aria-pressed={value === option}
              className={`audit-filter-option${value === option ? " selected" : ""}`}
              key={option}
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              type="button"
            >
              <span>{option}</span>
              {value === option && <b aria-hidden="true">✓</b>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function parseAuditRow(row: AuditLogRow): string[] {
  let waktuStr = ""

  // 1. Jika ada ISO timestamp lengkap (e.g. "2026-11-02T08:32:42.138Z")
  if (row.waktu && typeof row.waktu === "string" && row.waktu.includes("T")) {
    const d = new Date(row.waktu)
    if (!isNaN(d.getTime())) {
      const tglStr = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      const jamStr = d
        .toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(".", ":")
      waktuStr = `${tglStr}, ${jamStr}`
    }
  }

  // 2. Jika ada tanggal format YYYY-MM-DD dan jam
  if (!waktuStr && row.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(row.tanggal)) {
    const d = new Date(row.tanggal + "T12:00:00")
    const tglStr = !isNaN(d.getTime())
      ? d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : row.tanggal
    const jamClean = row.jam ? row.jam.replace(".", ":") : ""
    waktuStr = jamClean ? `${tglStr}, ${jamClean}` : tglStr
  }

  // 3. Jika waktu adalah format string seperti "2 Nov 15.32" (jangan di-new Date agar tidak jadi 2015)
  if (!waktuStr && row.waktu) {
    // Jika mengandung tahun 202x
    if (row.waktu.includes("202")) {
      waktuStr = String(row.waktu)
    } else {
      // Tambahkan tahun 2026 agar lengkap
      const thn =
        row.tanggal && row.tanggal.length >= 4
          ? row.tanggal.slice(0, 4)
          : "2026"
      const parts = String(row.waktu).split(" ")
      if (parts.length >= 3) {
        // e.g. "2 Nov 15.32" -> "2 Nov 2026, 15:32"
        waktuStr = `${parts[0]} ${parts[1]} ${thn}, ${parts[2].replace(".", ":")}`
      } else {
        waktuStr = `${String(row.waktu)}, ${thn}`
      }
    }
  }

  const aksiLabel = AKSI_MAP[row.aksi] || row.aksi

  let objek = "—"
  let detail = row.detail || "—"

  if (row.detail) {
    if (row.detail.startsWith("INV-")) {
      const sp = row.detail.split(" ")
      objek = sp[0]
      detail = sp.slice(1).join(" ") || "—"
    } else if (row.detail.startsWith("BAK_")) {
      const sp = row.detail.split(" ")
      objek = sp[0]
      detail = sp.slice(1).join(" ") || "—"
    } else if (row.detail.includes(": ")) {
      const sp = row.detail.split(": ")
      objek = sp[0]
      detail = sp.slice(1).join(": ")
    }
  }

  const userName = row.namaUser || row.pengguna || row.userId || "—"

  return [
    waktuStr || "—",
    userName,
    aksiLabel,
    objek,
    detail,
    row.alasan || "—",
  ]
}

export function AuditPage() {
  const [realLogs, setRealLogs] = useState<AuditLogRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterDate, setFilterDate] = useState("")
  const [filterAksi, setFilterAksi] = useState("Semua jenis aksi")
  const [filterUser, setFilterUser] = useState("Semua pengguna")

  useEffect(() => {
    if (!getToken()) return
    setLoading(true)
    apiAudit
      .list()
      .then((data) => {
        setRealLogs(data || [])
      })
      .catch((err) => {
        console.warn("Gagal memuat jejak audit backend:", err)
        setRealLogs(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const userList = useMemo(() => {
    if (!realLogs) return []
    const set = new Set<string>()
    realLogs.forEach((r) => {
      const name = r.namaUser || r.pengguna || r.userId
      if (name) set.add(name)
    })
    return Array.from(set).sort()
  }, [realLogs])

  const rowsToDisplay: string[][] = useMemo(() => {
    if (!realLogs) {
      return DEMO_LOGS
    }

    return realLogs
      .filter((r) => {
        if (filterDate && r.tanggal !== filterDate) return false
        if (filterAksi !== "Semua jenis aksi") {
          const label = AKSI_MAP[r.aksi] || r.aksi
          if (
            !label.toLowerCase().includes(filterAksi.toLowerCase()) &&
            !r.aksi.toLowerCase().includes(filterAksi.toLowerCase())
          ) {
            return false
          }
        }
        if (filterUser !== "Semua pengguna") {
          const name = r.namaUser || r.pengguna || r.userId
          if (name !== filterUser) return false
        }
        return true
      })
      .map(parseAuditRow)
  }, [realLogs, filterDate, filterAksi, filterUser])

  return (
    <div className="content">
      <PageTitle eyebrow="Khusus Owner" title="Jejak audit" />
      <section className="panel audit-list">
        <div className="filters">
          <CalendarPicker
            value={filterDate}
            onChange={setFilterDate}
            allowClear
            clearLabel="Semua Tanggal"
            placeholder="Semua Tanggal"
          />
          <AuditFilterSelect
            value={filterAksi}
            onChange={setFilterAksi}
            options={[
              "Semua jenis aksi",
              "Login",
              "Transaksi",
              "Pengeluaran",
              "Gaji",
              "Kasbon",
              "Absensi",
              "Produk",
              "Layanan",
              "Komisi",
              "Backup",
            ]}
          />
          <AuditFilterSelect
            value={filterUser}
            onChange={setFilterUser}
            options={["Semua pengguna", ...userList]}
          />
          {filterDate && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setFilterDate("")}
            >
              Reset Tanggal
            </button>
          )}
        </div>

        <div className="audit-head">
          <span>Waktu</span>
          <span>Pengguna</span>
          <span>Aksi</span>
          <span>Objek</span>
          <span>Detail</span>
          <span>Alasan</span>
        </div>

        {loading ? (
          <div style={{ padding: 14 }}>
            <LoadingState message="Memuat jejak audit dari server..." compact />
          </div>
        ) : rowsToDisplay.length === 0 ? (
          <div style={{ padding: "24px 14px", color: "var(--slate)" }}>
            Tidak ada jejak audit yang cocok dengan filter.
          </div>
        ) : (
          rowsToDisplay.map((row, idx) => (
            <article className="audit-row" key={`${row[0]}-${row[1]}-${idx}`}>
              {row.map((value, index) => (
                <span
                  data-label={["Waktu", "Pengguna", "Aksi", "Objek", "Detail", "Alasan"][index]}
                  key={`${value}-${index}`}
                >
                  <span className={index === 2 ? "audit-action" : undefined}>
                    {value}
                  </span>
                </span>
              ))}
            </article>
          ))
        )}
      </section>
    </div>
  )
}

export default AuditPage
