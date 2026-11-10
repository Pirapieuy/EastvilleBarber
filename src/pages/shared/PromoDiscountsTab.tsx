import { FormEvent, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, CalendarPicker, PageTitle } from "../../components/common/UI"
import {
  getPromoDiscounts,
  PromoDiscount,
  savePromoDiscounts,
} from "../../utils/promoStorage"

export function PromoDiscountsTab() {
  const [promos, setPromos] = useState<PromoDiscount[]>(() =>
    getPromoDiscounts(),
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [nama, setNama] = useState("")
  const [persen, setPersen] = useState<number>(10)
  const [berlakuSampai, setBerlakuSampai] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().split("T")[0]
  })
  const [status, setStatus] = useState<"Aktif" | "Nonaktif">("Aktif")
  const [error, setError] = useState("")

  function openCreate() {
    setEditingId(null)
    setNama("")
    setPersen(10)
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    setBerlakuSampai(d.toISOString().split("T")[0])
    setStatus("Aktif")
    setError("")
    setModalOpen(true)
  }

  function openEdit(p: PromoDiscount) {
    setEditingId(p.id)
    setNama(p.nama)
    setPersen(p.persen)
    setBerlakuSampai(p.berlakuSampai)
    setStatus(p.status)
    setError("")
    setModalOpen(true)
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!nama.trim()) {
      setError("Masukkan keterangan atau nama promo diskon.")
      return
    }
    if (persen <= 0 || persen > 100) {
      setError("Persentase diskon harus di antara 1% dan 100%.")
      return
    }
    if (!berlakuSampai) {
      setError("Pilih tanggal batas masa berlaku diskon.")
      return
    }

    let updated: PromoDiscount[]
    if (editingId) {
      updated = promos.map((p) =>
        p.id === editingId
          ? { ...p, nama: nama.trim(), persen, berlakuSampai, status }
          : p,
      )
    } else {
      const newPromo: PromoDiscount = {
        id: `prm-${Date.now()}`,
        nama: nama.trim(),
        persen,
        berlakuSampai,
        status,
      }
      updated = [newPromo, ...promos]
    }

    setPromos(updated)
    savePromoDiscounts(updated)
    setModalOpen(false)
  }

  function toggleStatus(id: string) {
    const updated = promos.map((p) =>
      p.id === id
        ? {
            ...p,
            status: (p.status === "Aktif"
              ? "Nonaktif"
              : "Aktif") as "Aktif" | "Nonaktif",
          }
        : p,
    )
    setPromos(updated)
    savePromoDiscounts(updated)
  }

  function handleDelete(id: string) {
    if (window.confirm("Hapus promo diskon event ini?")) {
      const updated = promos.filter((p) => p.id !== id)
      setPromos(updated)
      savePromoDiscounts(updated)
    }
  }

  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button className="primary-button" onClick={openCreate}>
          <Icon name="plus" /> Tambah Diskon Event
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {promos.map((p) => {
          const isExpired = p.berlakuSampai < todayStr
          return (
            <article
              key={p.id}
              style={{
                borderRadius: 10,
                border: "1px solid var(--line)",
                background: "var(--paper)",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <strong style={{ fontSize: 16, color: "var(--ink)" }}>
                    {p.nama}
                  </strong>
                  <span
                    className={`chip ${
                      isExpired
                        ? "batal"
                        : p.status === "Aktif"
                          ? "lunas"
                          : "manual"
                    }`}
                  >
                    {isExpired ? "Kadaluarsa" : p.status}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "var(--brass-dark, #b45309)",
                    margin: "4px 0",
                  }}
                >
                  {p.persen}% OFF
                </div>
                <small style={{ color: "var(--muted)", display: "block" }}>
                  Masa berlaku:{" "}
                  <strong>
                    {new Date(p.berlakuSampai + "T00:00:00").toLocaleDateString(
                      "id-ID",
                      { day: "numeric", month: "long", year: "numeric" },
                    )}
                  </strong>
                </small>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 10,
                  borderTop: "1px solid var(--line)",
                  gap: 8,
                }}
              >
                <Button
                  className="text-button"
                  onClick={() => toggleStatus(p.id)}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  {p.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    className="secondary-button"
                    onClick={() => openEdit(p)}
                    style={{ fontSize: 12, padding: "4px 10px" }}
                  >
                    Edit
                  </Button>
                  <Button
                    className="text-button"
                    onClick={() => handleDelete(p.id)}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      color: "#dc2626",
                    }}
                  >
                    <Icon name="trash" />
                  </Button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={handleSave}
            style={{ maxWidth: 460 }}
          >
            <header>
              <h2>{editingId ? "Edit Diskon Event" : "Tambah Diskon Event"}</h2>
              <Button type="button" onClick={() => setModalOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>

            {error && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: 12,
                  marginBottom: 10,
                }}
              >
                <Icon name="alert" /> {error}
              </div>
            )}

            <label>
              <span>Masa Berlaku Sampai</span>
              <CalendarPicker
                value={berlakuSampai}
                onChange={setBerlakuSampai}
              />
            </label>

            <label>
              <span>Jumlah Diskon (%)</span>
              <div className="input-shell">
                <b>%</b>
                <input
                  max={100}
                  min={1}
                  required
                  type="number"
                  value={persen}
                  onChange={(e) => setPersen(Number(e.target.value))}
                />
              </div>
            </label>

            <label>
              <span>Masa Berlaku Sampai</span>
              <CalendarPicker
                value={berlakuSampai}
                onChange={(d) => d && setBerlakuSampai(d)}
              />
            </label>

            <label>
              <span>Status</span>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "Aktif" | "Nonaktif")
                }
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </label>

            <footer>
              <Button
                className="secondary-button"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Simpan Diskon
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}
