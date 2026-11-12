import { FormEvent, useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, CalendarPicker, PageTitle } from "../../components/common/UI"
import { apiKodeDiskon, KodeDiskonRow } from "../../api"
import { LoadingState } from "../../components/common/UI"

type PromoDiscount = {
  id: string
  kode: string
  nama: string
  persen: number
  berlakuSampai: string
  status: "Aktif" | "Nonaktif"
  dipakai: number
}

const dariServer = (r: KodeDiskonRow): PromoDiscount => ({
  id: r.id,
  kode: r.kode,
  nama: r.nama,
  persen: Number(r.persen),
  berlakuSampai: r.berlaku_sampai,
  status: r.status,
  dipakai: Number(r.dipakai) || 0,
})

export function PromoDiscountsTab() {
  const [promos, setPromos] = useState<PromoDiscount[]>([])
  const [memuat, setMemuat] = useState(true)
  const [gagalMuat, setGagalMuat] = useState("")
  const [menyimpan, setMenyimpan] = useState(false)
  const [kode, setKode] = useState("")

  function muat() {
    setMemuat(true)
    setGagalMuat("")
    apiKodeDiskon
      .list()
      .then((rows) => setPromos(rows.map(dariServer)))
      .catch((e) =>
        setGagalMuat(
          e instanceof Error ? e.message : "Gagal memuat kode diskon.",
        ),
      )
      .finally(() => setMemuat(false))
  }
  useEffect(muat, [])
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
    setKode("")
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
    setKode(p.kode)
    setNama(p.nama)
    setPersen(p.persen)
    setBerlakuSampai(p.berlakuSampai)
    setStatus(p.status)
    setError("")
    setModalOpen(true)
  }

  async function simpanKe(p: Omit<PromoDiscount, "dipakai">) {
    await apiKodeDiskon.simpan({
      id: p.id || undefined,
      kode: p.kode,
      nama: p.nama,
      persen: p.persen,
      berlakuSampai: p.berlakuSampai,
      status: p.status,
    })
    muat()
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const kodeBersih = kode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
    if (kodeBersih.length < 4 || kodeBersih.length > 20) {
      setError("Kode harus 4-20 huruf atau angka, tanpa spasi.")
      return
    }
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
    setMenyimpan(true)
    try {
      await simpanKe({
        id: editingId ?? "",
        kode: kodeBersih,
        nama: nama.trim(),
        persen,
        berlakuSampai,
        status,
      })
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kode.")
    } finally {
      setMenyimpan(false)
    }
  }

  async function toggleStatus(id: string) {
    const p = promos.find((x) => x.id === id)
    if (!p) return
    try {
      await simpanKe({
        ...p,
        status: p.status === "Aktif" ? "Nonaktif" : "Aktif",
      })
    } catch (err) {
      setGagalMuat(
        err instanceof Error ? err.message : "Gagal mengubah status.",
      )
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus kode diskon ini?")) return
    try {
      await apiKodeDiskon.hapus(id)
      muat()
    } catch (err) {
      setGagalMuat(err instanceof Error ? err.message : "Gagal menghapus kode.")
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

      {memuat && <LoadingState message="Memuat kode diskon…" />}
      {gagalMuat && (
        <div className="payment-result danger" role="alert">
          <span>{gagalMuat}</span>
          <Button onClick={muat}>Coba lagi</Button>
        </div>
      )}
      {!memuat && !gagalMuat && promos.length === 0 && (
        <p style={{ color: "var(--slate)", fontSize: 13 }}>
          Belum ada kode diskon. Tekan "Tambah Diskon Event" untuk membuat kode
          pertama.
        </p>
      )}
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
                <small
                  style={{
                    color: "var(--slate)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Kode:{" "}
                  <strong style={{ letterSpacing: "0.04em" }}>{p.kode}</strong>{" "}
                  · dipakai {p.dipakai}x
                </small>
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
              <span>Kode unik</span>
              <input
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={20}
                onChange={(e) => setKode(e.target.value.toUpperCase())}
                placeholder="Contoh: JUMAT15"
                value={kode}
              />
              <small style={{ color: "var(--muted)" }}>
                Kasir mengetik kode ini untuk mendapat diskon.
              </small>
            </label>

            <label>
              <span>Nama promo</span>
              <input
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Promo Jumat Berkah"
                value={nama}
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
              <Button
                className="primary-button"
                disabled={menyimpan}
                type="submit"
              >
                {menyimpan ? "Menyimpan…" : "Simpan Diskon"}
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}
