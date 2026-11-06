import { FormEvent, useEffect, useState } from "react"
import { apiLayanan, apiPengaturan, getToken, LayananRow, PengaturanKomisi } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, LoadingState, PageTitle, rupiah } from "../../components/common/UI"

export const KATEGORI_LAYANAN = ["Potong", "Grooming", "Coloring", "Perawatan"]

export const serviceRows: LayananRow[] = [
  { id: 1, nama: "Haircut", kategori: "Potong", harga: 40000, status: "Aktif" },
  { id: 2, nama: "Haircut + Cuci", kategori: "Potong", harga: 50000, status: "Aktif" },
  { id: 3, nama: "Shaving", kategori: "Grooming", harga: 25000, status: "Aktif" },
  { id: 4, nama: "Hair Coloring", kategori: "Coloring", harga: 120000, status: "Aktif" },
  { id: 5, nama: "Treatment", kategori: "Perawatan", harga: 60000, status: "Aktif" },
  { id: 6, nama: "Creambath", kategori: "Perawatan", harga: 75000, status: "Nonaktif" },
]

const defaultPengaturan: PengaturanKomisi = {
  jamMulai: "10:00",
  jamSelesai: "21:00",
  komisiDefault: 40,
  komisiLembur: 50,
  kapster: [],
}

export function ServicesPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [rows, setRows] = useState<LayananRow[]>(serviceRows)
  const [pengaturan, setPengaturan] = useState<PengaturanKomisi>(defaultPengaturan)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Semua")
  const [kategoriFilter, setKategoriFilter] = useState("Semua")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LayananRow | null>(null)
  const [nama, setNama] = useState("")
  const [harga, setHarga] = useState("")
  const [kategori, setKategori] = useState("Potong")
  const [aktif, setAktif] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

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
    setKategori(service?.kategori || "Potong")
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
    const kembar = rows.some((r) => r.id !== editing?.id && r.nama.trim().toLowerCase() === nama.trim().toLowerCase())
    if (kembar) return setFormError("Nama layanan sudah ada.")
    if (editing?.status === "Aktif" && status === "Nonaktif") {
      if (!window.confirm(`Nonaktifkan "${editing.nama}"? Layanan tidak akan muncul di Kasir.`)) return
    }
    if (live) {
      setSaving(true)
      setFormError("")
      try {
        await apiLayanan.simpan({ id: editing?.id, nama: nama.trim(), harga: hargaAngka, status, kategori })
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Gagal menyimpan.")
        setSaving(false)
        return
      }
      // Simpan sudah berhasil; kegagalan muat ulang tidak boleh terbaca sebagai gagal simpan.
      setFormOpen(false)
      setSaving(false)
      loadLive().catch(() => setLiveError("Tersimpan, tetapi daftar gagal dimuat ulang. Muat ulang halaman."))
      return
    }
    const baru: LayananRow = {
      id: editing?.id ?? Date.now(),
      nama: nama.trim(),
      harga: hargaAngka,
      status,
      kategori,
    }
    setRows((prev) => (editing ? prev.map((r) => (r.id === editing.id ? baru : r)) : [...prev, baru]))
    setFormOpen(false)
  }

  const aktifCount = rows.filter((r) => r.status === "Aktif").length
  const filtered = rows
    .filter(
      (r) =>
        r.nama.toLowerCase().includes(search.toLowerCase()) &&
        (statusFilter === "Semua" || r.status === statusFilter) &&
        (kategoriFilter === "Semua" || r.kategori === kategoriFilter),
    )
    .sort((a, b) => a.nama.localeCompare(b.nama))
  const kapsterPribadi = pengaturan.kapster.filter((k) => k.persen !== null).length

  if (Boolean(getToken()) && !live && liveError) {
    return (
      <div className="content">
        <DemoNotice live={live} error={liveError} />
        <p>Data layanan gagal dimuat: {liveError}</p>
        <Button className="primary-button" onClick={() => setReloadKey((k) => k + 1)}>
          Coba lagi
        </Button>
      </div>
    )
  }

  // Ada token = data asli sedang dimuat: jangan tampilkan data dummy dulu.
  if (Boolean(getToken()) && !live && !liveError) {
    return (
      <div className="content">
        <LoadingState message="Memuat layanan..." />
      </div>
    )
  }

  return (
    <div className={embedded ? "catalog-embedded-view" : "content"}>
      <DemoNotice live={live} error={liveError} />
      {!embedded && (
        <PageTitle
          eyebrow="Data master"
          title="Layanan & Harga"
        />
      )}
      <div className="services-status-bar">
        <div className="master-summary">
          <span>
            <Icon name="cashier" />
            <strong>{aktifCount} layanan aktif</strong>
            <small>{rows.length - aktifCount} nonaktif</small>
          </span>
        </div>
        <Button className="primary-button" onClick={() => openForm(null)}>
          <Icon name="plus" /> Tambah layanan
        </Button>
      </div>

      <section className="panel service-list">
        <div className="filters">
          <div className="search">
            <Icon name="search" />
            <input
              placeholder="Cari layanan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)}>
            <option value="Semua">Semua kategori</option>
            {KATEGORI_LAYANAN.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="Semua">Semua status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>
        <div className="service-head">
          <span>Layanan</span>
          <span>Kategori</span>
          <span>Komisi kapster (default)</span>
          <span>Harga</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>
        {filtered.map((service) => (
          <article
            className={`service-row ${service.status === "Aktif" ? "" : "inactive"}`}
            key={service.id}
          >
            <span className="service-name">
              <i>
                <Icon name="cashier" />
              </i>
              <strong>{service.nama}</strong>
            </span>
            <span>{service.kategori || "-"}</span>
            <span>
              {pengaturan.komisiDefault}% · lembur {pengaturan.komisiLembur}%
            </span>
            <strong>{rupiah(service.harga)}</strong>
            <i className={`chip ${service.status === "Aktif" ? "lunas" : "manual"}`}>
              {service.status}
            </i>
            <Button className="secondary-button" onClick={() => openForm(service)}>
              <Icon name="pencil" /> Ubah
            </Button>
          </article>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--slate)" }}>
            Tidak ada layanan yang cocok.
          </div>
        )}
      </section>
      {formOpen && (
        <div className="modal-overlay">
          <form className="simple-modal service-modal" onSubmit={handleSave}>
            <header>
              <div>
                <p className="eyebrow">Data layanan</p>
                <h2>{editing ? "Ubah layanan" : "Tambah layanan"}</h2>
              </div>
              <Button onClick={() => setFormOpen(false)} type="button">
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
            <label>
              <span>Kategori</span>
              <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                {KATEGORI_LAYANAN.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
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
            <div className="toggle-row">
              <span>
                <strong>Status layanan</strong>
                <small>Layanan aktif muncul pada halaman Kasir.</small>
              </span>
              <Button
                aria-label={aktif ? "Nonaktifkan layanan" : "Aktifkan layanan"}
                onClick={() => setAktif(!aktif)}
                type="button"
              >
                <i className={`toggle ${aktif ? "on" : ""}`}>
                  <b />
                </i>
              </Button>
            </div>
            <div className="info-banner">
              <Icon name="history" /> Harga baru hanya berlaku untuk transaksi
              setelahnya.
            </div>
            {formError && <small className="pin-helper">{formError}</small>}
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setFormOpen(false)}
                type="button"
              >
                Batal
              </Button>
              <Button className="primary-button" disabled={saving} type="submit">
                {saving ? "Menyimpan..." : "Simpan layanan"}
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

export default ServicesPage
