import { FormEvent, Fragment, useEffect, useState } from "react"
import {
  apiLayanan,
  apiPengaturan,
  getToken,
  LayananRow,
  PengaturanKomisi,
} from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  LoadingState,
  PageTitle,
  rupiah,
  ErrorState,
} from "../../components/common/UI"
import { SearchSelect } from "../../components/common/SearchSelect"
import { ConfirmModal } from "../../components/common/ConfirmModal"

export const KATEGORI_LAYANAN = ["Potong", "Perawatan", "Coloring", "Styling", "Grooming"]

export function parseItemName(rawName: string): { title: string; desc: string | null } {
  if (!rawName) return { title: "", desc: null }
  const parenMatch = rawName.match(/^(.+?)\s*\((.+)\)$/)
  if (parenMatch) {
    return { title: parenMatch[1].trim(), desc: parenMatch[2].trim() }
  }
  const colonMatch = rawName.match(/^([^:]+):\s*(.+)$/)
  if (colonMatch) {
    return { title: colonMatch[1].trim(), desc: colonMatch[2].trim() }
  }
  return { title: rawName.trim(), desc: null }
}

export function normalizeServiceCategory(item: { nama?: string; name?: string; kategori?: string }): string {
  const n = (item.nama || item.name || "").toLowerCase()
  if (
    n.includes("perming") ||
    n.includes("downperm") ||
    n.includes("design perm") ||
    n.includes("conrow") ||
    n.includes("cornrow")
  ) {
    return "Styling"
  }
  if (n.includes("color") || n.includes("highlight")) {
    return "Coloring"
  }
  if (
    n.includes("treatment") ||
    n.includes("creambath") ||
    n.includes("shaving") ||
    n.includes("dandruff") ||
    n.includes("keratin")
  ) {
    return "Perawatan"
  }
  if (
    n.includes("gold service") ||
    n.includes("platinum service") ||
    n.includes("silver service") ||
    n.includes("haircut")
  ) {
    return "Potong"
  }
  return item.kategori || "Potong"
}

export const SERVICE_CATEGORIES = [
  {
    key: "Potong",
    label: "HAIRCUT (POTONG)",
    desc: "Layanan potong rambut & styling standar/premium",
    badge: "Haircut",
    badgeBg: "#eff6ff",
    badgeColor: "#1d4ed8",
    badgeBorder: "#bfdbfe",
  },
  {
    key: "Perawatan",
    label: "TREATMENT (PERAWATAN)",
    desc: "Perawatan rambut, relaksasi creambath & shaving",
    badge: "Treatment",
    badgeBg: "#ecfdf5",
    badgeColor: "#047857",
    badgeBorder: "#a7f3d0",
  },
  {
    key: "Coloring",
    label: "HAIR COLOR (COLORING)",
    desc: "Pewarnaan rambut & highlights (Start From)",
    badge: "Coloring",
    badgeBg: "#fef3c7",
    badgeColor: "#b45309",
    badgeBorder: "#fde68a",
  },
  {
    key: "Styling",
    label: "HAIR STYLING SERVICE (STYLING)",
    desc: "Perming, downperm, styling desain & conrow",
    badge: "Styling",
    badgeBg: "#f5f3ff",
    badgeColor: "#6d28d9",
    badgeBorder: "#ddd6fe",
  },
]

export interface EastvilleServiceDef {
  nama: string
  kategori: string
  harga: number
  startFrom?: boolean
}

export const EASTVILLE_PRICELIST: EastvilleServiceDef[] = [
  // HAIRCUT (Potong)
  { nama: "Gold Service (Special Service)", kategori: "Potong", harga: 50000 },
  { nama: "Platinum Service (Cut, Wash & Hot Towel)", kategori: "Potong", harga: 35000 },
  { nama: "Silver Service (Haircut & Styling)", kategori: "Potong", harga: 30000 },
  { nama: "Haircut by Krish", kategori: "Potong", harga: 50000 },

  // TREATMENT (Perawatan)
  { nama: "Keratin Treatment", kategori: "Perawatan", harga: 180000 },
  { nama: "Creambath Express (Massage, Creambath & Styling)", kategori: "Perawatan", harga: 20000 },
  { nama: "Anti Dandruff Treatment (Dandruff Medium Till High Condition)", kategori: "Perawatan", harga: 200000 },
  { nama: "Shaving Service", kategori: "Perawatan", harga: 30000 },

  // HAIR COLOR (Coloring - Start From)
  { nama: "Basic Color: Black, Brown, Blue Black, etc.", kategori: "Coloring", harga: 100000, startFrom: true },
  { nama: "Fashion Color: Silver, White, Pink, Green, etc.", kategori: "Coloring", harga: 200000, startFrom: true },
  { nama: "Highlights Color: Grey, Silver, Blue, etc.", kategori: "Coloring", harga: 150000, startFrom: true },

  // HAIR STYLING SERVICE (Styling)
  { nama: "Korean Perming (Curly/Wavy)", kategori: "Styling", harga: 150000 },
  { nama: "Korean Downperm (Side, Back or Top)", kategori: "Styling", harga: 70000 },
  { nama: "Design Perm (Comma Hair, Quiff, etc.)", kategori: "Styling", harga: 150000 },
  { nama: "Conrow", kategori: "Styling", harga: 150000, startFrom: true },
]

export function isStartFromService(item: { name?: string; nama?: string; customPrice?: boolean | number }): boolean {
  if (Boolean(item.customPrice)) return true
  const n = (item.name || item.nama || "").toLowerCase()
  if (n.includes("start from") || n.includes("mulai dari")) return true
  if (n.includes("basic color")) return true
  if (n.includes("fashion color")) return true
  if (n.includes("highlights color") || n.includes("highlight color") || n.includes("highlight")) return true
  if (n.includes("conrow") || n.includes("cornrow")) return true
  return false
}

export const serviceRows: LayananRow[] = EASTVILLE_PRICELIST.map((p, idx) => ({
  id: idx + 1,
  nama: p.nama,
  kategori: p.kategori,
  harga: p.harga,
  status: "Aktif",
  customPrice: p.startFrom,
}))

const defaultPengaturan: PengaturanKomisi = {
  jamMulai: "10:00",
  jamSelesai: "21:00",
  komisiDefault: 40,
  komisiLembur: 50,
  kapster: [],
}

export function ServicesPage({ embedded = false }: {
  embedded?: boolean
} = {}) {
  const [rows, setRows] = useState<LayananRow[]>(serviceRows)
  const [pengaturan, setPengaturan] =
    useState<PengaturanKomisi>(defaultPengaturan)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Semua")
  const [kategoriFilter, setKategoriFilter] = useState("Semua")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LayananRow | null>(null)
  const [deletingService, setDeletingService] = useState<LayananRow | null>(
    null,
  )
  const [nama, setNama] = useState("")
  const [harga, setHarga] = useState("")
  const [kategori, setKategori] = useState("Potong")
  const [aktif, setAktif] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmSync, setConfirmSync] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState("")
  const [syncSuccess, setSyncSuccess] = useState("")

  // Dengan token login, data dari backend; tanpa token tetap data demo.
  function loadLive() {
    return Promise.all([
      apiLayanan.list(),
      apiPengaturan.get().catch(() => null),
    ]).then(([layanan, peng]) => {
      setRows(layanan)
      if (peng) setPengaturan(peng)
      setLive(true)
    })
  }

  async function handleSyncPricelist() {
    setSyncing(true)
    setSyncProgress("Menyiapkan sinkronisasi...")
    try {
      if (live) {
        const current = await apiLayanan.list()
        const resmiNames = new Set(
          EASTVILLE_PRICELIST.map((p) => p.nama.toLowerCase()),
        )
        // 1. Bersihkan / nonaktifkan layanan lama yang bukan pricelist resmi
        for (const old of current) {
          if (!resmiNames.has(old.nama.toLowerCase())) {
            setSyncProgress(`Membersihkan layanan lama: ${old.nama}...`)
            try {
              await apiLayanan.hapus(old.id, "Penyelarasan pricelist resmi Eastville")
            } catch {
              await apiLayanan.simpan({
                id: old.id,
                nama: old.nama,
                harga: old.harga,
                kategori: old.kategori || "Potong",
                status: "Nonaktif",
              })
            }
          }
        }
        // 2. Tambah / perbarui 15 layanan resmi
        for (let i = 0; i < EASTVILLE_PRICELIST.length; i++) {
          const p = EASTVILLE_PRICELIST[i]
          setSyncProgress(`Menyimpan ${p.nama} (${i + 1}/${EASTVILLE_PRICELIST.length})...`)
          const match = current.find(
            (c) => c.nama.toLowerCase() === p.nama.toLowerCase(),
          )
          try {
            await apiLayanan.simpan({
              id: match?.id,
              nama: p.nama,
              harga: p.harga,
              kategori: p.kategori,
              status: "Aktif",
            })
          } catch (e) {
            console.warn(`Gagal simpan ${p.nama}:`, e)
          }
        }
        await loadLive()
      } else {
        // Mode demo / tanpa backend: langsung set rows ke 15 layanan resmi
        setRows(serviceRows)
      }
      setSyncSuccess("Pricelist berhasil disinkronkan dengan 15 layanan resmi Eastville!")
      setTimeout(() => setSyncSuccess(""), 4000)
    } catch (err) {
      alert("Gagal sinkronisasi: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSyncing(false)
      setSyncProgress("")
      setConfirmSync(false)
    }
  }

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    setLiveError("")
    loadLive().catch((e) => {
      console.error("Gagal memuat layanan:", e)
      setLiveError(e instanceof Error ? e.message : "gagal memuat data")
    })
  }, [reloadKey])

  function openForm(service: LayananRow | null) {
    setEditing(service)
    setNama(service?.nama ?? "")
    setHarga(String(service?.harga ?? 40000))
    setKategori(service ? normalizeServiceCategory(service) : "Potong")
    setAktif(service ? service.status === "Aktif" : true)
    setFormError("")
    setFormOpen(true)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    const hargaAngka = Number(harga.replace(/\D/g, "")) || 0
    const status = aktif ? "Aktif" : "Nonaktif"
    if (saving) return
    if (!nama.trim()) return setFormError("Nama layanan wajib diisi.")
    if (hargaAngka < 1) return setFormError("Harga harus lebih dari 0.")
    const kembar = rows.some(
      (r) =>
        r.id !== editing?.id &&
        r.nama.trim().toLowerCase() === nama.trim().toLowerCase(),
    )
    if (kembar) return setFormError("Nama layanan sudah ada.")
    if (live) {
      setSaving(true)
      setFormError("")
      try {
        await apiLayanan.simpan({
          id: editing?.id,
          nama: nama.trim(),
          harga: hargaAngka,
          status,
          kategori,
        })
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Gagal menyimpan.")
        setSaving(false)
        return
      }
      // Simpan sudah berhasil; kegagalan muat ulang tidak boleh terbaca sebagai gagal simpan.
      setFormOpen(false)
      setSaving(false)
      loadLive().catch(() =>
        setLiveError(
          "Tersimpan, tetapi daftar gagal dimuat ulang. Muat ulang halaman.",
        ),
      )
      return
    }
    const baru: LayananRow = {
      id: editing?.id ?? Date.now(),
      nama: nama.trim(),
      harga: hargaAngka,
      status,
      kategori,
    }
    setRows((prev) =>
      editing
        ? prev.map((r) => (r.id === editing.id ? baru : r))
        : [...prev, baru],
    )
    setFormOpen(false)
  }

  async function handleDeleteConfirm(service: LayananRow, alasan: string) {
    if (live) {
      await apiLayanan.hapus(service.id, alasan.trim())
      await loadLive()
    } else {
      setRows((prev) => prev.filter((row) => row.id !== service.id))
    }
  }

  const aktifCount = rows.filter((r) => r.status === "Aktif").length
  const isOldPricelist =
    live &&
    rows.length > 0 &&
    !rows.some(
      (r) =>
        r.nama.toLowerCase().includes("gold service") ||
        r.nama.toLowerCase().includes("platinum service") ||
        r.nama.toLowerCase().includes("keratin treatment"),
    )
  function getPricelistIndex(nama: string) {
    const clean = nama.toLowerCase()
    const idx = EASTVILLE_PRICELIST.findIndex(
      (p) =>
        clean.includes(p.nama.toLowerCase()) ||
        p.nama.toLowerCase().includes(clean),
    )
    return idx >= 0 ? idx : 999
  }

  const filtered = rows.filter((r) => {
    const normCat = normalizeServiceCategory(r)
    return (
      r.nama.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === "Semua" || r.status === statusFilter) &&
      (kategoriFilter === "Semua" || normCat === kategoriFilter)
    )
  })

  const allCategoryKeys = Array.from(
    new Set([
      ...SERVICE_CATEGORIES.map((c) => c.key),
      ...filtered.map((r) => normalizeServiceCategory(r)),
    ]),
  )

  const groupedCategories = allCategoryKeys
    .map((catKey) => {
      const meta = SERVICE_CATEGORIES.find((c) => c.key === catKey) || {
        key: catKey,
        label: `${catKey.toUpperCase()} (${catKey})`,
        desc: `Layanan kategori ${catKey}`,
        badge: catKey,
        badgeBg: "var(--bone)",
        badgeColor: "var(--ink)",
        badgeBorder: "var(--line)",
      }
      const items = filtered
        .filter((r) => normalizeServiceCategory(r) === catKey)
        .sort((a, b) => {
          const idxA = getPricelistIndex(a.nama)
          const idxB = getPricelistIndex(b.nama)
          if (idxA !== idxB) return idxA - idxB
          return a.nama.localeCompare(b.nama)
        })
      return { meta, items }
    })
    .filter((g) => g.items.length > 0)
  const kapsterPribadi = pengaturan.kapster.filter(
    (k) => k.persen !== null,
  ).length

  if (Boolean(getToken()) && !live && liveError) {
    return (
      <div className={embedded ? "catalog-embedded-view" : "content"}>
        <ErrorState
          title="Data layanan gagal dimuat"
          message={liveError}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    )
  }

  // Ada token = data asli sedang dimuat: jangan tampilkan data dummy dulu.
  if (Boolean(getToken()) && !live && !liveError) {
    return (
      <div className={embedded ? "catalog-embedded-view" : "content"}>
        <LoadingState message="Memuat layanan..." />
      </div>
    )
  }

  return (
    <div className={embedded ? "catalog-embedded-view" : "content"}>
      <DemoNotice live={live} error={liveError} />
      {!embedded && <PageTitle eyebrow="Data master" title="Layanan & Harga" />}
      {syncSuccess && (
        <div
          style={{
            padding: "10px 16px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            borderRadius: 8,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <Icon name="check" /> {syncSuccess}
        </div>
      )}
      {isOldPricelist && (
        <div
          style={{
            padding: "12px 18px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 10,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#b45309", display: "flex", fontSize: 20 }}>
              <Icon name="alert" />
            </span>
            <div>
              <strong style={{ color: "#92400e", display: "block", fontSize: 14 }}>
                Pricelist Database Belum Disinkronkan
              </strong>
              <span style={{ color: "#b45309", fontSize: 13 }}>
                Database masih menampilkan 5 layanan sampel lama. Tekan tombol di samping untuk menyinkronkan 15 layanan resmi Eastville ke database.
              </span>
            </div>
          </div>
          <Button
            className="primary-button"
            style={{
              background: "#b45309",
              borderColor: "#b45309",
              color: "#fff",
              padding: "8px 16px",
              whiteSpace: "nowrap",
            }}
            onClick={() => setConfirmSync(true)}
            disabled={syncing}
          >
            <Icon name="restore" /> {syncing ? syncProgress || "Menyinkronkan..." : "Singkronkan Pricelist Sekarang"}
          </Button>
        </div>
      )}
      <section className="panel service-list fit-fill">
        <div className="filters">
          <div className="master-summary filters-summary">
            <span>
              <Icon name="cashier" />
              <strong>{aktifCount} layanan aktif</strong>
              <small>{rows.length - aktifCount} nonaktif</small>
            </span>
          </div>
          <div className="search">
            <Icon name="search" />
            <input
              placeholder="Cari layanan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <SearchSelect
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
          >
            <option value="Semua">Semua kategori</option>
            {KATEGORI_LAYANAN.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </SearchSelect>
          <SearchSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Semua">Semua status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </SearchSelect>
          <Button
            className="secondary-button"
            style={{ whiteSpace: "nowrap" }}
            onClick={() => setConfirmSync(true)}
            disabled={syncing}
            title="Singkronkan dengan 15 pricelist asli Eastville"
          >
            <Icon name="restore" /> {syncing ? syncProgress || "Menyinkronkan..." : "Singkronkan Pricelist"}
          </Button>
          <Button
            className="primary-button filters-add"
            onClick={() => openForm(null)}
          >
            <Icon name="plus" /> Tambah
          </Button>
        </div>
        <div className="service-list-scroll">
        <div className="service-head">
          <span>Layanan</span>
          <span>Kategori</span>
          <span>Komisi kapster</span>
          <span>Harga</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>
        {groupedCategories.length === 0 ? (
          <div
            style={{
              padding: "36px 14px",
              textAlign: "center",
              color: "var(--slate)",
            }}
          >
            Tidak ada layanan yang cocok dengan pencarian atau filter.
          </div>
        ) : (
          groupedCategories.map((group) => (
            <Fragment key={`cat-grp-${group.meta.key}`}>
              <div className="service-category-header">
                <div className="service-category-info">
                  <strong className="service-category-title">
                    {group.meta.label}
                  </strong>
                  <span className="service-category-desc">
                    {group.meta.desc}
                  </span>
                </div>
                <span className="service-category-count">
                  {group.items.length} layanan
                </span>
              </div>

              {group.items.map((service) => {
                const { title: itemTitle, desc: itemDesc } = parseItemName(
                  service.nama,
                )
                const isStartFrom = isStartFromService(service)
                const normCat = normalizeServiceCategory(service)

                return (
                  <article
                    className={`service-row ${
                      service.status === "Aktif" ? "" : "inactive"
                    }`}
                    key={service.id}
                  >
                    <span className="service-name">
                      <i>
                        <Icon name="cashier" />
                      </i>
                      <span className="service-name-content">
                        <span className="service-name-title-row">
                          <strong>{itemTitle}</strong>
                          {isStartFrom && (
                            <span className="catalog-badge-startfrom">
                              Start From
                            </span>
                          )}
                        </span>
                        {itemDesc && (
                          <small
                            className="service-name-desc"
                            title={itemDesc}
                          >
                            {itemDesc}
                          </small>
                        )}
                      </span>
                    </span>
                    <div className="service-details">
                      <span className="service-category-detail">
                        <small>Kategori</small>
                        <strong>{normCat}</strong>
                      </span>
                      <span className="service-commission-detail">
                        <span className="service-commission-values">
                          <span>
                            <small>Komisi kapster</small>
                            <strong>{pengaturan.komisiDefault}%</strong>
                          </span>
                          <span>
                            <small>Komisi lembur</small>
                            <strong>{pengaturan.komisiLembur}%</strong>
                          </span>
                        </span>
                      </span>
                      <span className="service-price-detail">
                        <small>Harga layanan</small>
                        <strong>
                          {isStartFrom
                            ? `Mulai ${rupiah(service.harga)}`
                            : rupiah(service.harga)}
                        </strong>
                      </span>
                    </div>
                    <i
                      className={`chip ${
                        service.status === "Aktif" ? "lunas" : "manual"
                      }`}
                    >
                      {service.status}
                    </i>
                    <div className="catalog-row-actions">
                      <Button
                        className="secondary-button"
                        onClick={() => openForm(service)}
                      >
                        <Icon name="pencil" /> Ubah
                      </Button>
                      <Button
                        className="danger-button"
                        onClick={() => setDeletingService(service)}
                      >
                        <Icon name="trash" /> Hapus
                      </Button>
                    </div>
                  </article>
                )
              })}
            </Fragment>
          ))
        )}
        </div>
      </section>
      {formOpen && (
        <div className="modal-overlay">
          <form className="simple-modal service-modal" onSubmit={handleSave}>
            <header>
              <div>
                <p className="eyebrow">Data layanan</p>
                <h2>{editing ? "Ubah layanan" : "Tambah layanan"}</h2>
              </div>
              <Button type="button" aria-label="Tutup" onClick={() => setFormOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Nama layanan</span>
              <input
                placeholder="Nama layanan"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
            </label>
            <div className="modal-row-2">
            <label>
                <span>Kategori</span>
                <SearchSelect
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                >
                  {KATEGORI_LAYANAN.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </SearchSelect>
              </label>
              <label>
                <span>Harga</span>
                <div className="input-shell">
                  <b>Rp</b>
                  <input
                    inputMode="numeric"
                    required
                    value={harga}
                    onChange={(e) => setHarga(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </label>
            </div>
            <div
              className="toggle-row"
              style={{ cursor: "pointer" }}
              onClick={() => setAktif(!aktif)}
            >
              <span>
                <strong>Status layanan: {aktif ? "Aktif" : "Nonaktif"}</strong>
                <small>Layanan aktif muncul pada halaman Kasir.</small>
              </span>
              <i className={`toggle ${aktif ? "on" : ""}`}><b /></i>
            </div>
            <div className="info-banner">
              <Icon name="history" /> Harga baru hanya berlaku untuk transaksi
              setelahnya.
            </div>
            {formError && <small className="pin-helper">{formError}</small>}
            <footer>
              <Button
                className="primary-button"
                disabled={saving}
                type="submit"
              >
                {saving ? "Menyimpan..." : "Simpan layanan"}
              </Button>
            </footer>
          </form>
        </div>
      )}
      {deletingService && (
        <ConfirmModal
          title={`Hapus Layanan "${deletingService.nama}"?`}
          eyebrow="Hapus Layanan"
          warning="Layanan yang dihapus tidak akan muncul lagi di Kasir. Riwayat transaksi lama tetap aman."
          compact
          requireReason
          reasonLabel="Alasan Penghapusan"
          reasonPlaceholder="Contoh: Menu layanan sudah tidak disediakan..."
          confirmText="Hapus Layanan"
          confirmTone="danger"
          onClose={() => setDeletingService(null)}
          onConfirm={(alasan) => handleDeleteConfirm(deletingService, alasan)}
        />
      )}
      {confirmSync && (
        <ConfirmModal
          title="Singkronkan Pricelist Asli Eastville?"
          eyebrow="Pricelist Resmi Eastville"
          message="Tindakan ini akan menyelaraskan 15 layanan aktif sesuai pricelist resmi Eastville Barbershop (Haircut, Treatment, Hair Color, Hair Styling Service). Layanan lama yang berbeda akan dinonaktifkan."
          confirmText={syncing ? syncProgress || "Menyinkronkan..." : "Ya, Singkronkan"}
          confirmTone="primary"
          compact
          onClose={() => !syncing && setConfirmSync(false)}
          onConfirm={handleSyncPricelist}
        />
      )}
    </div>
  )
}

export default ServicesPage
