import { useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, rupiah } from "../../components/common/UI"
import { apiLayanan, apiPengaturan, getToken, LayananRow, PengaturanKomisi } from "../../api"

export const demoServices: LayananRow[] = [
  { id: 1, nama: "Haircut", harga: 40000, status: "Aktif" },
  { id: 2, nama: "Haircut + Cuci", harga: 50000, status: "Aktif" },
  { id: 3, nama: "Shaving", harga: 25000, status: "Aktif" },
  { id: 4, nama: "Hair Coloring", harga: 120000, status: "Aktif" },
  { id: 5, nama: "Treatment", harga: 60000, status: "Aktif" },
  { id: 6, nama: "Creambath", harga: 75000, status: "Nonaktif" },
]

export function ServicesPage() {
  const [services, setServices] = useState<LayananRow[]>(demoServices)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Semua")

  const [formOpen, setFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<LayananRow | null>(null)
  const [nama, setNama] = useState("")
  const [harga, setHarga] = useState<number>(40000)
  const [status, setStatus] = useState<"Aktif" | "Nonaktif">("Aktif")

  // Pengaturan Jam Kerja & Komisi
  const [pengaturan, setPengaturan] = useState<PengaturanKomisi | null>(null)
  const [jamMulai, setJamMulai] = useState("10:00")
  const [jamSelesai, setJamSelesai] = useState("21:00")
  const [komisiDefault, setKomisiDefault] = useState(40)
  const [komisiLembur, setKomisiLembur] = useState(50)
  const [alasanPengaturan, setAlasanPengaturan] = useState("")
  const [savingPengaturan, setSavingPengaturan] = useState(false)

  async function loadData() {
    if (!getToken()) return
    setLoading(true)
    try {
      const [list, peng] = await Promise.all([
        apiLayanan.list(),
        apiPengaturan.get().catch(() => null),
      ])
      setServices(list)
      if (peng) {
        setPengaturan(peng)
        setJamMulai(peng.jamMulai || "10:00")
        setJamSelesai(peng.jamSelesai || "21:00")
        setKomisiDefault(peng.komisiDefault || 40)
        setKomisiLembur(peng.komisiLembur || 50)
      }
    } catch {
      // Fallback demo data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openCreate() {
    setEditingService(null)
    setNama("")
    setHarga(40000)
    setStatus("Aktif")
    setFormOpen(true)
  }

  function openEdit(s: LayananRow) {
    setEditingService(s)
    setNama(s.nama)
    setHarga(s.harga)
    setStatus(s.status)
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) {
      alert("Nama layanan wajib diisi.")
      return
    }

    try {
      if (editingService) {
        await apiLayanan.update(editingService.id, nama.trim(), Number(harga), status)
        alert("Layanan berhasil diperbarui.")
      } else {
        await apiLayanan.create(nama.trim(), Number(harga))
        alert("Layanan baru berhasil ditambahkan.")
      }
      setFormOpen(false)
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan.")
    }
  }

  async function handleToggle(s: LayananRow) {
    const next = s.status === "Aktif" ? "Nonaktif" : "Aktif"
    if (confirm(`Ubah status layanan "${s.nama}" menjadi ${next}?`)) {
      try {
        await apiLayanan.toggleStatus(s.id, next)
        loadData()
      } catch (err) {
        alert(err instanceof Error ? err.message : "Gagal mengubah status.")
      }
    }
  }

  async function handleSavePengaturan(e: React.FormEvent) {
    e.preventDefault()
    if (!alasanPengaturan.trim()) {
      alert("Wajib mengisi alasan perubahan jam kerja / komisi.")
      return
    }
    setSavingPengaturan(true)
    try {
      await apiPengaturan.simpan({
        jamMulai,
        jamSelesai,
        komisiDefault: Number(komisiDefault),
        komisiLembur: Number(komisiLembur),
        alasan: alasanPengaturan.trim(),
      })
      alert("Pengaturan jam kerja dan komisi berhasil disimpan.")
      setAlasanPengaturan("")
      loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.")
    } finally {
      setSavingPengaturan(false)
    }
  }

  const filtered = services.filter((s) => {
    const matchSearch = s.nama.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "Semua" || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const aktifCount = services.filter((s) => s.status === "Aktif").length
  const nonaktifCount = services.filter((s) => s.status === "Nonaktif").length

  return (
    <div className="content">
      <PageTitle
        eyebrow="Data master"
        title="Layanan dan harga"
        action={
          <Button className="primary-button" onClick={openCreate}>
            <Icon name="plus" /> Tambah layanan
          </Button>
        }
      />

      <div className="master-summary">
        <span>
          <Icon name="cashier" />
          <strong>{aktifCount} layanan aktif</strong>
          <small>{nonaktifCount} layanan nonaktif</small>
        </span>
        <div className="info-banner">
          <Icon name="history" />
          Mengubah harga layanan tidak mengubah nilai transaksi yang sudah tercatat.
        </div>
      </div>

      {/* Kartu Jam Kerja & Komisi */}
      <section className="panel" style={{ marginBottom: 20, padding: 18, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Jam Kerja & Komisi Kapster</h3>
            <small style={{ color: "var(--muted)" }}>Atur jam operasional dan persentase komisi reguler vs lembur</small>
          </div>
          <span className="chip active">Pengaturan Server</span>
        </header>

        <form onSubmit={handleSavePengaturan}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
            <label>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Jam Mulai</span>
              <input
                type="time"
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                required
              />
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Jam Selesai</span>
              <input
                type="time"
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
                required
              />
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Komisi Default (%)</span>
              <input
                type="number"
                min={10}
                max={90}
                value={komisiDefault}
                onChange={(e) => setKomisiDefault(Number(e.target.value))}
                required
              />
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Komisi Lembur (%)</span>
              <input
                type="number"
                min={10}
                max={100}
                value={komisiLembur}
                onChange={(e) => setKomisiLembur(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Alasan perubahan pengaturan</span>
              <input
                placeholder="Misal: Penyesuaian jam buka toko baru..."
                value={alasanPengaturan}
                onChange={(e) => setAlasanPengaturan(e.target.value)}
              />
            </label>
            <Button className="secondary-button" type="submit" disabled={savingPengaturan}>
              {savingPengaturan ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </form>
      </section>

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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="Semua">Semua status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>

        {loading && <p style={{ color: "var(--muted)", margin: "10px 0" }}>Memuat daftar layanan...</p>}

        <div className="service-head">
          <span>Layanan</span>
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
            <strong>{rupiah(service.harga)}</strong>
            <i
              className={`chip ${service.status === "Aktif" ? "lunas" : "manual"}`}
              style={{ cursor: "pointer" }}
              onClick={() => handleToggle(service)}
              title="Klik untuk ubah status"
            >
              {service.status}
            </i>
            <Button
              className="secondary-button"
              onClick={() => openEdit(service)}
            >
              <Icon name="pencil" /> Ubah
            </Button>
          </article>
        ))}
      </section>

      {formOpen && (
        <div className="modal-overlay">
          <form className="simple-modal service-modal" onSubmit={handleSubmit}>
            <header>
              <div>
                <p className="eyebrow">Data layanan</p>
                <h2>{editingService ? "Ubah layanan" : "Tambah layanan"}</h2>
              </div>
              <Button type="button" onClick={() => setFormOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>

            <label>
              <span>Nama layanan</span>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama layanan (contoh: Haircut Premium)"
                required
              />
            </label>

            <label>
              <span>Harga</span>
              <div className="input-shell">
                <b>Rp</b>
                <input
                  type="number"
                  value={harga}
                  onChange={(e) => setHarga(Number(e.target.value))}
                  required
                />
              </div>
            </label>

            <div
              className="toggle-row"
              style={{ cursor: "pointer" }}
              onClick={() => setStatus((s) => (s === "Aktif" ? "Nonaktif" : "Aktif"))}
            >
              <span>
                <strong>Status layanan: {status}</strong>
                <small>Layanan aktif akan muncul di sistem Kasir POS.</small>
              </span>
              <i className={`toggle ${status === "Aktif" ? "on" : ""}`}>
                <b />
              </i>
            </div>

            <div className="info-banner">
              <Icon name="history" /> Harga baru hanya berlaku untuk transaksi setelahnya.
            </div>

            <footer>
              <Button
                className="secondary-button"
                type="button"
                onClick={() => setFormOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan layanan
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

export default ServicesPage
