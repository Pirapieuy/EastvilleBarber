import { FormEvent, useEffect, useState } from "react"
import { Icon } from "../../components/common/Icon"
import { Button, CalendarPicker, PageTitle } from "../../components/common/UI"
import { apiKodeDiskon, KodeDiskonRow } from "../../api"
import { ErrorState, LoadingState } from "../../components/common/UI"
import { formatTanggal, tanggalIsoLokal, TANGGAL_MAKS } from "../../utils/tanggal"
import { SearchSelect } from "../../components/common/SearchSelect"
import { ConfirmModal } from "../../components/common/ConfirmModal"

type PromoDiscount = {
  id: string
  kode: string
  nama: string
  persen: number
  jenis: "persen" | "nominal"
  nilai: number
  berlakuSampai: string
  status: "Aktif" | "Nonaktif"
  dipakai: number
}

const dariServer = (r: KodeDiskonRow): PromoDiscount => ({
  id: r.id,
  kode: r.kode,
  nama: r.nama,
  persen: Number(r.persen),
  jenis: r.jenis === "nominal" ? "nominal" : "persen",
  nilai: Number(r.nilai) || Number(r.persen),
  berlakuSampai: r.berlaku_sampai,
  status: r.status,
  dipakai: Number(r.dipakai) || 0,
})

export function PromoDiscountsTab() {
  const [showHelp, setShowHelp] = useState(false)
  const [promos, setPromos] = useState<PromoDiscount[]>([])
  const [memuat, setMemuat] = useState(true)
  const [gagalMuat, setGagalMuat] = useState("")
  const [menyimpan, setMenyimpan] = useState(false)
  const [kode, setKode] = useState("")
  const [cari, setCari] = useState("")
  const [statusFilter, setStatusFilter] = useState("Semua")

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
  const [deletingPromo, setDeletingPromo] = useState<PromoDiscount | null>(null)

  const [nama, setNama] = useState("")
  const [jenis, setJenis] = useState<"persen" | "nominal">("persen")
  const [nilai, setNilai] = useState<number>(10)
  const [berlakuSampai, setBerlakuSampai] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return tanggalIsoLokal(d)
  })
  const [status, setStatus] = useState<"Aktif" | "Nonaktif">("Aktif")
  const [error, setError] = useState("")

  function openCreate() {
    setEditingId(null)
    setKode("")
    setNama("")
    setJenis("persen")
    setNilai(10)
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    setBerlakuSampai(tanggalIsoLokal(d))
    setStatus("Aktif")
    setError("")
    setModalOpen(true)
  }

  function openEdit(p: PromoDiscount) {
    setEditingId(p.id)
    setKode(p.kode)
    setNama(p.nama)
    setJenis(p.jenis)
    setNilai(p.nilai)
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
      jenis: p.jenis,
      nilai: p.nilai,
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
    if (nilai <= 0 || (jenis === "persen" && nilai > 100)) {
      setError(jenis === "persen" ? "Persentase diskon harus di antara 1% dan 100%." : "Nominal diskon minimal Rp1.")
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
        persen: jenis === "persen" ? nilai : 0,
        jenis,
        nilai,
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

  async function handleDeleteConfirm(promo: PromoDiscount) {
    await apiKodeDiskon.hapus(promo.id)
    muat()
  }

  const todayStr = TANGGAL_MAKS()
  const jumlahAktif = promos.filter(
    (p) => p.status === "Aktif" && p.berlakuSampai >= todayStr,
  ).length
  const filtered = promos.filter((p) => {
    const aktifEfektif = p.status === "Aktif" && p.berlakuSampai >= todayStr
    const q = cari.trim().toLowerCase()
    return (
      (statusFilter === "Semua" ||
        (statusFilter === "Aktif") === aktifEfektif) &&
      (!q ||
        p.nama.toLowerCase().includes(q) ||
        p.kode.toLowerCase().includes(q))
    )
  })

  // Muat pertama / gagal muat tanpa data: hanya spinner atau pesan di tengah (tab ikut disembunyikan CSS)
  if (memuat && promos.length === 0 && !gagalMuat) {
    return (
      <div className="catalog-embedded-view">
        <LoadingState message="Memuat kode diskon…" />
      </div>
    )
  }
  if (gagalMuat && promos.length === 0 && !memuat) {
    return (
      <div className="catalog-embedded-view">
        <ErrorState title="Kode diskon gagal dimuat" message={gagalMuat} onRetry={muat} />
      </div>
    )
  }

  return (
    <div className="catalog-embedded-view">
      <section className="panel service-list promo-list fit-fill">
        <div className="filters">
          <div className="master-summary filters-summary">
            <span>
              <Icon name="cash" />
              <strong>{jumlahAktif} diskon aktif</strong>
              <small>{promos.length - jumlahAktif} nonaktif</small>
              <span className="promo-discount-help-wrap">
                <button
                  className="promo-discount-help"
                  type="button"
                  aria-label="Informasi diskon event"
                  aria-expanded={showHelp}
                  onClick={() => setShowHelp((shown) => !shown)}
                >
                  <Icon name="alert" />
                </button>
                {showHelp && (
                  <span className="promo-discount-tooltip" role="tooltip">
                    Kasir mengetik kode diskon event saat transaksi. Klik Tambah untuk membuat kode baru.
                  </span>
                )}
              </span>
            </span>
          </div>
          <div className="search">
            <Icon name="search" />
            <input
              placeholder="Cari nama atau kode..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>
          <SearchSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Semua">Semua status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </SearchSelect>
          <Button className="primary-button filters-add" onClick={openCreate}>
            <Icon name="plus" /> Tambah
          </Button>
        </div>
        <div className="service-list-scroll">
          <div className="service-head promo-head">
            <span>Diskon</span>
            <span>Potongan</span>
            <span>Masa berlaku</span>
            <span>Kode</span>
            <span>Status</span>
            <span>Aksi</span>
          </div>
          {memuat && <LoadingState message="Memuat kode diskon…" />}
          {gagalMuat && (
            <div className="payment-result danger" role="alert">
              <span>{gagalMuat}</span>
              <Button onClick={muat}>Coba lagi</Button>
            </div>
          )}
          {filtered.map((p) => {
            const isExpired = p.berlakuSampai < todayStr
            const aktifEfektif = p.status === "Aktif" && !isExpired
            return (
              <article
                className={`service-row promo-row ${aktifEfektif ? "" : "inactive"}`}
                key={p.id}
              >
                <span className="service-name">
                  <i>
                    <Icon name="cash" />
                  </i>
                  <strong title={p.nama}>{p.nama}</strong>
                </span>
                <div className="service-details">
                  <span className="promo-value-detail">
                    <small>Potongan</small>
                    <strong>
                      {p.jenis === "nominal"
                        ? `Rp ${p.nilai.toLocaleString("id-ID")} OFF`
                        : `${p.nilai}% OFF`}
                    </strong>
                  </span>
                  <span className="promo-expiry-detail">
                    <small>Masa berlaku</small>
                    <strong>{formatTanggal(p.berlakuSampai)}</strong>
                  </span>
                  <span className="promo-code-detail">
                    <small>Kode</small>
                    <strong>{p.kode}</strong>
                    <em>dipakai {p.dipakai}x</em>
                  </span>
                </div>
                <i
                  className={`chip ${
                    isExpired ? "batal" : p.status === "Aktif" ? "lunas" : "manual"
                  }`}
                >
                  {isExpired ? "Kadaluarsa" : p.status}
                </i>
                <div className="catalog-row-actions">
                  <Button className="secondary-button" onClick={() => openEdit(p)}>
                    <Icon name="pencil" /> Ubah
                  </Button>
                  <Button
                    className="danger-button"
                    onClick={() => setDeletingPromo(p)}
                  >
                    <Icon name="trash" /> Hapus
                  </Button>
                </div>
              </article>
            )
          })}
          {!memuat && !gagalMuat && filtered.length === 0 && (
            <div className="promo-discount-empty">
              {promos.length === 0 ? "Belum ada diskon" : "Tidak ada diskon yang cocok."}
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal promo-discount-modal"
            onSubmit={handleSave}
            style={{ maxWidth: 460 }}
          >
            <header>
              <h2>{editingId ? "Ubah Diskon Event" : "Tambah Diskon Event"}</h2>
              <Button type="button" aria-label="Tutup" onClick={() => setModalOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>

            <div className="promo-modal-body">
              {error && (
                <div
                  style={{
                    padding: "8px 12px",
                    margin: "16px 16px 0",
                    borderRadius: 6,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    fontSize: 12,
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
              </label>

              <label>
                <span>Nama promo</span>
                <input
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Promo Jumat Berkah"
                  value={nama}
                />
              </label>

              <div className="modal-row-2">
                <label>
                  <span>Jenis Diskon</span>
                  <SearchSelect
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value as "persen" | "nominal")}
                  >
                    <option value="persen">Persentase (%)</option>
                    <option value="nominal">Nominal (Rp)</option>
                  </SearchSelect>
                </label>

                <label>
                  <span>Jumlah Diskon ({jenis === "persen" ? "%" : "Rp"})</span>
                  <div className="input-shell">
                    <b>{jenis === "persen" ? "%" : "Rp"}</b>
                    <input
                      max={jenis === "persen" ? 100 : undefined}
                      min={1}
                      required
                      type="number"
                      value={nilai}
                      onChange={(e) => setNilai(Number(e.target.value))}
                    />
                  </div>
                </label>
              </div>

              <label>
                <span>Masa Berlaku Sampai</span>
                <CalendarPicker
                  value={berlakuSampai}
                  onChange={(d) => d && setBerlakuSampai(d)}
                />
              </label>

              <div
                className="toggle-row"
                style={{ cursor: "pointer" }}
                onClick={() => setStatus((s) => s === "Aktif" ? "Nonaktif" : "Aktif")}
              >
                <span>
                  <strong>Status diskon: {status}</strong>
                  <small>Diskon aktif dapat digunakan saat transaksi.</small>
                </span>
                <i className={`toggle ${status === "Aktif" ? "on" : ""}`}><b /></i>
              </div>
            </div>
            <footer>
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

      {deletingPromo && (
        <ConfirmModal
          title={`Hapus Kode Diskon "${deletingPromo.kode}"?`}
          eyebrow="Hapus Diskon"
          message={`Kode diskon "${deletingPromo.nama}" (${deletingPromo.kode}) akan dihapus dan tidak dapat digunakan lagi pada transaksi kasir.`}
          confirmText="Hapus Diskon"
          confirmTone="danger"
          compact
          onClose={() => setDeletingPromo(null)}
          onConfirm={() => handleDeleteConfirm(deletingPromo)}
        />
      )}
    </div>
  )
}
