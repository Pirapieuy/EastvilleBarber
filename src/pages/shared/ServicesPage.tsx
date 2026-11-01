import { FormEvent, useEffect, useState } from "react"
import { apiLayanan, apiPengaturan, getToken, LayananRow, PengaturanKomisi } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, rupiah } from "../../components/common/UI"

export const serviceRows: LayananRow[] = [
  { id: 1, nama: "Haircut", harga: 40000, status: "Aktif" },
  { id: 2, nama: "Haircut + Cuci", harga: 50000, status: "Aktif" },
  { id: 3, nama: "Shaving", harga: 25000, status: "Aktif" },
  { id: 4, nama: "Hair Coloring", harga: 120000, status: "Aktif" },
  { id: 5, nama: "Treatment", harga: 60000, status: "Aktif" },
  { id: 6, nama: "Creambath", harga: 75000, status: "Nonaktif" },
]

const demoPengaturan: PengaturanKomisi = {
  jamMulai: "10:00",
  jamSelesai: "21:00",
  komisiDefault: 40,
  komisiLembur: 50,
  kapster: [],
}

export function ServicesPage() {
  const [rows, setRows] = useState<LayananRow[]>(serviceRows)
  const [pengaturan, setPengaturan] = useState<PengaturanKomisi>(demoPengaturan)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Semua")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LayananRow | null>(null)
  const [nama, setNama] = useState("")
  const [harga, setHarga] = useState("")
  const [aktif, setAktif] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const [jamMulai, setJamMulai] = useState(demoPengaturan.jamMulai)
  const [jamSelesai, setJamSelesai] = useState(demoPengaturan.jamSelesai)
  const [komisiDefault, setKomisiDefault] = useState(String(demoPengaturan.komisiDefault))
  const [komisiLembur, setKomisiLembur] = useState(String(demoPengaturan.komisiLembur))
  const [alasan, setAlasan] = useState("")
  const [komisiMsg, setKomisiMsg] = useState("")
  const [komisiSaving, setKomisiSaving] = useState(false)

  function isiForm(p: PengaturanKomisi) {
    setPengaturan(p)
    setJamMulai(p.jamMulai)
    setJamSelesai(p.jamSelesai)
    setKomisiDefault(String(p.komisiDefault))
    setKomisiLembur(String(p.komisiLembur))
  }

  // Dengan token login, data dari backend; tanpa token tetap data demo.
  function loadLive() {
    return Promise.all([apiLayanan.list(), apiPengaturan.get()]).then(([layanan, peng]) => {
      setRows(layanan)
      isiForm(peng)
      setLive(true)
    })
  }
  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    loadLive().catch((e) => {
      console.error("Gagal memuat layanan:", e)
      setLiveError(e instanceof Error ? e.message : "gagal memuat data")
    })
  }, [])

  function openForm(service: LayananRow | null) {
    setEditing(service)
    setNama(service?.nama ?? "")
    setHarga(String(service?.harga ?? 40000))
    setAktif(service ? service.status === "Aktif" : true)
    setFormError("")
    setFormOpen(true)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    const hargaAngka = Number(harga.replace(/\D/g, "")) || 0
    const status = aktif ? "Aktif" : "Nonaktif"
    if (!nama.trim()) return setFormError("Nama layanan wajib diisi.")
    if (live) {
      setSaving(true)
      setFormError("")
      try {
        await apiLayanan.simpan({ id: editing?.id, nama: nama.trim(), harga: hargaAngka, status })
        await loadLive()
        setFormOpen(false)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Gagal menyimpan.")
      } finally {
        setSaving(false)
      }
      return
    }
    const baru: LayananRow = {
      id: editing?.id ?? Date.now(),
      nama: nama.trim(),
      harga: hargaAngka,
      status,
    }
    setRows((prev) => (editing ? prev.map((r) => (r.id === editing.id ? baru : r)) : [...prev, baru]))
    setFormOpen(false)
  }

  async function handleSaveKomisi(event: FormEvent) {
    event.preventDefault()
    setKomisiMsg("")
    const baru: PengaturanKomisi = {
      ...pengaturan,
      jamMulai,
      jamSelesai,
      komisiDefault: Number(komisiDefault),
      komisiLembur: Number(komisiLembur),
    }
    if (!live) {
      isiForm(baru)
      return setKomisiMsg("Tersimpan sementara (mode demo).")
    }
    setKomisiSaving(true)
    try {
      const hasil = await apiPengaturan.simpan({
        jamMulai,
        jamSelesai,
        komisiDefault: baru.komisiDefault,
        komisiLembur: baru.komisiLembur,
        alasan,
      })
      isiForm(hasil)
      setAlasan("")
      setKomisiMsg("Tersimpan. Berlaku untuk transaksi berikutnya.")
    } catch (err) {
      setKomisiMsg(err instanceof Error ? err.message : "Gagal menyimpan.")
    } finally {
      setKomisiSaving(false)
    }
  }

  const aktifCount = rows.filter((r) => r.status === "Aktif").length
  const filtered = rows.filter(
    (r) =>
      r.nama.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === "Semua" || r.status === statusFilter),
  )

  // Ada token = data asli sedang dimuat: jangan tampilkan data dummy dulu.
  if (Boolean(getToken()) && !live && !liveError) {
    return (
      <div className="content">
        <p>Memuat layanan...</p>
      </div>
    )
  }

  return (
    <div className="content">
      <DemoNotice live={live} error={liveError} />
      <PageTitle
        eyebrow="Data master"
        title="Layanan dan harga"
        action={
          <Button className="primary-button" onClick={() => openForm(null)}>
            <Icon name="plus" /> Tambah layanan
          </Button>
        }
      />
      <div className="master-summary">
        <span>
          <Icon name="cashier" />
          <strong>{aktifCount} layanan aktif</strong>
          <small>{rows.length - aktifCount} layanan nonaktif</small>
        </span>
        <div className="info-banner">
          <Icon name="history" />
          Mengubah harga tidak mengubah transaksi lama.
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 16, padding: 16 }}>
        <form onSubmit={handleSaveKomisi}>
          <p className="eyebrow">Jam kerja &amp; komisi</p>
          <p style={{ color: "var(--slate)", fontSize: 12, margin: "4px 0 12px" }}>
            Transaksi di luar jam kerja otomatis memakai komisi lembur. Komisi per kapster
            diatur di halaman Tim.
          </p>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Jam mulai</span>
              <input required type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Jam selesai</span>
              <input required type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Komisi layanan (%)</span>
              <input
                max={100}
                min={0}
                required
                type="number"
                value={komisiDefault}
                onChange={(e) => setKomisiDefault(e.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Komisi lembur (%)</span>
              <input
                max={100}
                min={0}
                required
                type="number"
                value={komisiLembur}
                onChange={(e) => setKomisiLembur(e.target.value)}
              />
            </label>
          </div>
          {live && (
            <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
              <span>Alasan perubahan</span>
              <input
                placeholder="Wajib diisi saat menyimpan"
                required
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
              />
            </label>
          )}
          <div style={{ alignItems: "center", display: "flex", gap: 12, marginTop: 12 }}>
            <Button className="primary-button" disabled={komisiSaving} type="submit">
              {komisiSaving ? "Menyimpan..." : "Simpan pengaturan"}
            </Button>
            {komisiMsg && <small>{komisiMsg}</small>}
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
        <div className="service-head">
          <span>Layanan</span>
          <span>Komisi kapster</span>
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
              <span>Harga</span>
              <div className="input-shell">
                <b>Rp</b>
                <input
                  inputMode="numeric"
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
