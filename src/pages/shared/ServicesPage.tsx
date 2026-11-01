import { useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, rupiah } from "../../components/common/UI"

export const serviceRows = [
  {
    name: "Haircut",
    category: "Potong",
    price: 40000,
    active: true,
  },
  {
    name: "Haircut + Cuci",
    category: "Potong",
    price: 50000,
    active: true,
  },
  {
    name: "Shaving",
    category: "Grooming",
    price: 25000,
    active: true,
  },
  {
    name: "Hair Coloring",
    category: "Coloring",
    price: 120000,
    active: true,
  },
  {
    name: "Treatment",
    category: "Perawatan",
    price: 60000,
    active: true,
  },
  {
    name: "Creambath",
    category: "Perawatan",
    price: 75000,
    active: false,
  },
]

export function ServicesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<typeof serviceRows[number] | null>(null)

  return (
    <div className="content">
      <PageTitle
        eyebrow="Data master"
        title="Layanan dan harga"
        action={
          <Button
            className="primary-button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Icon name="plus" /> Tambah layanan
          </Button>
        }
      />
      <div className="master-summary">
        <span>
          <Icon name="cashier" />
          <strong>5 layanan aktif</strong>
          <small>1 layanan nonaktif</small>
        </span>
        <div className="info-banner">
          <Icon name="history" />
          Mengubah harga tidak mengubah transaksi lama.
        </div>
      </div>
      <section className="panel service-list">
        <div className="filters">
          <div className="search">
            <Icon name="search" />
            <input placeholder="Cari layanan..." />
          </div>
          <select>
            <option>Semua kategori</option>
            <option>Potong</option>
            <option>Perawatan</option>
          </select>
          <select>
            <option>Semua status</option>
            <option>Aktif</option>
            <option>Nonaktif</option>
          </select>
        </div>
        <div className="service-head">
          <span>Layanan</span>
          <span>Kategori</span>
          <span>Harga</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>
        {serviceRows.map((service) => (
          <article
            className={`service-row ${service.active ? "" : "inactive"}`}
            key={service.name}
          >
            <span className="service-name">
              <i>
                <Icon name="cashier" />
              </i>
              <strong>{service.name}</strong>
            </span>
            <span>{service.category}</span>
            <strong>{rupiah(service.price)}</strong>
            <i className={`chip ${service.active ? "lunas" : "manual"}`}>
              {service.active ? "Aktif" : "Nonaktif"}
            </i>
            <Button
              className="secondary-button"
              onClick={() => {
                setEditing(service)
                setFormOpen(true)
              }}
            >
              <Icon name="pencil" /> Ubah
            </Button>
          </article>
        ))}
      </section>
      {formOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal service-modal"
            onSubmit={(event) => {
              event.preventDefault()
              setFormOpen(false)
            }}
          >
            <header>
              <div>
                <p className="eyebrow">Data layanan</p>
                <h2>{editing ? "Ubah layanan" : "Tambah layanan"}</h2>
              </div>
              <Button onClick={() => setFormOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Nama layanan</span>
              <input
                defaultValue={editing?.name ?? ""}
                placeholder="Nama layanan"
              />
            </label>
            <label>
              <span>Kategori</span>
              <select defaultValue={editing?.category ?? "Potong"}>
                <option>Potong</option>
                <option>Grooming</option>
                <option>Coloring</option>
                <option>Perawatan</option>
              </select>
            </label>
            <label>
              <span>Harga</span>
              <div className="input-shell">
                <b>Rp</b>
                <input defaultValue={editing?.price ?? 40000} />
              </div>
            </label>
            <div className="toggle-row">
              <span>
                <strong>Status layanan</strong>
                <small>Layanan aktif muncul pada halaman Kasir.</small>
              </span>
              <i className="toggle on">
                <b />
              </i>
            </div>
            <div className="info-banner">
              <Icon name="history" /> Harga baru hanya berlaku untuk transaksi
              setelahnya.
            </div>
            <footer>
              <Button
                className="secondary-button"
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
