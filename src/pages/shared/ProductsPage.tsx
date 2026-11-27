import { FormEvent, useEffect, useState } from "react"
import { DemoNotice } from "../../components/common/DemoNotice"
import { ProdukRow, apiProduk, getToken } from "../../api"
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

const STOK_MENIPIS = 1

export function ProductsPage({ embedded = false }: {
  embedded?: boolean
} = {}) {
  const [productsList, setProductsList] = useState([
    {
      code: "HP-FSD-01",
      name: "Free Style Dust",
      seller: "HAIRPRO Official",
      stock: 3,
      scheme: "Persentase" as "Persentase" | "Nominal tetap",
      status: "Aktif" as "Aktif" | "Nonaktif",
      price: 70000,
      costPrice: 42000,
      shares: { barber: 10, seller: 60, eastville: 30 },
      nominalShares: { barber: 7000, seller: 42000, eastville: 21000 },
    },
    {
      code: "HP-HPP-02",
      name: "Hair Paste Pomade",
      seller: "HAIRPRO Official",
      stock: 8,
      scheme: "Nominal tetap" as "Persentase" | "Nominal tetap",
      status: "Aktif" as "Aktif" | "Nonaktif",
      price: 70000,
      costPrice: 40000,
      shares: { barber: 14.3, seller: 57.1, eastville: 28.6 },
      nominalShares: { barber: 10000, seller: 40000, eastville: 20000 },
    },
    {
      code: "HP-WBP-03",
      name: "Water Based Pomade",
      seller: "Mitra Grooming",
      stock: 5,
      scheme: "Persentase" as "Persentase" | "Nominal tetap",
      status: "Aktif" as "Aktif" | "Nonaktif",
      price: 70000,
      costPrice: 42000,
      shares: { barber: 10, seller: 60, eastville: 30 },
      nominalShares: { barber: 7000, seller: 42000, eastville: 21000 },
    },
    {
      code: "HP-MT-04",
      name: "Miracle Treatment",
      seller: "Mitra Grooming",
      stock: 0,
      scheme: "Nominal tetap" as "Persentase" | "Nominal tetap",
      status: "Nonaktif" as "Aktif" | "Nonaktif",
      price: 70000,
      costPrice: 40000,
      shares: { barber: 14.3, seller: 57.1, eastville: 28.6 },
      nominalShares: { barber: 10000, seller: 40000, eastville: 20000 },
    },
  ])
  const [cari, setCari] = useState("")
  const [statusFilter, setStatusFilter] = useState("Semua status")
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [stockOpen, setStockOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<
    (typeof productsList)[number] | null
  >(null)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    seller: "",
    stock: 0,
    scheme: "Persentase" as "Persentase" | "Nominal tetap",
    status: "Aktif" as "Aktif" | "Nonaktif",
    price: 70000,
    costPrice: 42000,
    shares: { barber: 10, seller: 60, eastville: 30 },
    nominalShares: { barber: 7000, seller: 42000, eastville: 21000 },
  })
  const [changeReason, setChangeReason] = useState("")
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")
  const [stockCode, setStockCode] = useState("")
  const [stockQty, setStockQty] = useState("10")
  const [stockNote, setStockNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [stockError, setStockError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  // Dengan token login, data dari backend; tanpa token tetap data demo.
  function loadLive() {
    return apiProduk.list().then((rows) => {
        setProductsList(
          rows.map((p: ProdukRow) => ({
            code: p.kode,
            name: p.nama,
            seller: p.penjual,
            stock: p.stok,
            scheme: p.skema,
            status: p.status,
            price: p.harga,
            costPrice: p.harga_modal,
            shares: {
              barber: p.persen_kapster,
              seller: p.persen_penjual,
              eastville: p.persen_eastville,
            },
            nominalShares: {
              barber: p.nominal_kapster,
              seller: p.nominal_penjual,
              eastville: p.nominal_eastville,
            },
          })),
        )
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
      console.error("Gagal memuat produk:", e)
      setLiveError(e instanceof Error ? e.message : "gagal memuat data")
    })
  }, [reloadKey])
  const nominalTotal =
    formData.nominalShares.barber +
    formData.nominalShares.seller +
    formData.nominalShares.eastville
  const shareTotal =
    formData.shares.barber + formData.shares.seller + formData.shares.eastville

  function openCreate() {
    setEditingCode(null)
    setFormData({
      code: `HP-${Date.now().toString().slice(-4)}`,
      name: "",
      seller: "",
      stock: 10,
      scheme: "Persentase",
      status: "Aktif",
      price: 70000,
      costPrice: 42000,
      shares: { barber: 10, seller: 60, eastville: 30 },
      nominalShares: { barber: 7000, seller: 42000, eastville: 21000 },
    })
    setChangeReason("")
    setFormError("")
    setFormOpen(true)
  }

  function openEdit(prod: typeof productsList[number]) {
    setEditingCode(prod.code)
    setFormData({ ...prod })
    setChangeReason("")
    setFormError("")
    setFormOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setFormError("")
    if (!formData.name.trim() || !formData.code.trim()) {
      return setFormError("Nama dan kode produk wajib diisi.")
    }
    if (!(formData.price > 0))
      return setFormError("Harga jual harus lebih dari 0.")
    if (formData.costPrice < 0 || formData.stock < 0)
      return setFormError("Harga modal dan stok tidak boleh negatif.")
    if (
      formData.scheme === "Nominal tetap" &&
      nominalTotal !== formData.price
    ) {
      return setFormError(
        `Total pembagian nominal (${rupiah(nominalTotal)}) harus sama dengan harga jual (${rupiah(formData.price)}).`,
      )
    }
    if (live && editingCode && !changeReason.trim()) {
      return setFormError("Alasan perubahan wajib diisi saat mengubah produk.")
    }
    if (editingCode) {
      // Data sedang diedit
    }
    if (live) {
      setSaving(true)
      try {
        await apiProduk.simpan(
          {
            kode: formData.code,
            nama: formData.name,
            penjual: formData.seller,
            stok: formData.stock,
            skema: formData.scheme,
            status: formData.status,
            harga: formData.price,
            hargaModal: formData.costPrice,
            shares: formData.shares,
            nominalShares: formData.nominalShares,
          },
          changeReason,
          !editingCode,
        )
        await loadLive()
        setFormOpen(false)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Gagal menyimpan.")
      } finally {
        setSaving(false)
      }
      return
    }
    if (editingCode) {
      setProductsList((list) =>
        list.map((p) => (p.code === editingCode ? { ...formData } : p)),
      )
    } else {
      setProductsList((list) => [{ ...formData }, ...list])
    }
    setFormOpen(false)
  }

  async function handleDeleteConfirm(
    product: (typeof productsList)[number],
    alasan: string,
  ) {
    if (live) {
      await apiProduk.hapus(product.code, alasan.trim())
      await loadLive()
    } else {
      setProductsList((list) =>
        list.filter((item) => item.code !== product.code),
      )
    }
  }

  // Ada token = data asli sedang dimuat: jangan tampilkan data dummy dulu.
  const loading = Boolean(getToken()) && !live && !liveError
  if (loading) {
    return (
      <div className={embedded ? "catalog-embedded-view" : "content"}>
        <LoadingState message="Memuat produk..." />
      </div>
    )
  }

  if (getToken() && !live && liveError) {
    return (
      <div className={embedded ? "catalog-embedded-view" : "content"}>
        <ErrorState
          title="Data produk gagal dimuat"
          message={liveError}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    )
  }

  const daftar = productsList
    .filter((p) => {
      const q = cari.trim().toLowerCase()
      return (
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q)) &&
        (statusFilter === "Semua status" ||
          (statusFilter === "Aktif"
            ? p.status === "Aktif"
            : p.status !== "Aktif"))
      )
    })
    .sort(
      (a, b) =>
        // produk aktif di atas, nonaktif di bawah; sisanya urut nama
        Number(a.status !== "Aktif") - Number(b.status !== "Aktif") ||
        a.name.localeCompare(b.name),
    )

  return (
    <div className={embedded ? "catalog-embedded-view" : "content"}>
      <DemoNotice live={live} error={liveError} />
      <section className="panel product-admin-list fit-fill">
          <div className="filters">
            <div className="master-summary filters-summary">
              <span>
                <Icon name="product" />
                <strong>
                  {productsList.filter((product) => product.status === "Aktif").length} produk aktif
                </strong>
                <small>
                  {productsList.filter((product) => product.status !== "Aktif").length} nonaktif
                </small>
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
              <option>Semua status</option>
              <option>Aktif</option>
              <option>Non-aktif</option>
            </SearchSelect>
            <Button
              className="secondary-button filters-restok"
              onClick={() => {
                setStockError("")
                setStockOpen(true)
              }}
            >
              <Icon name="plus" /> Restok
            </Button>
            <Button className="primary-button filters-add" onClick={openCreate}>
              <Icon name="plus" /> Tambah
            </Button>
          </div>
          <div
            className={`product-admin-scroll ${
              daftar.length === 0 ? "is-empty" : ""
            }`}
          >
          <div className="product-admin-head">
            <span>Produk</span>
            <span>Pemasok</span>
            <span>Stok</span>
            <span>Skema komisi</span>
            <span>Status</span>
            <span>Aksi</span>
          </div>
          {daftar.length === 0 ? (
            <div className="product-empty-state">
              {productsList.length === 0
                ? "Belum ada produk yang ditambahkan."
                : "Tidak ada produk yang cocok dengan pencarian atau filter."}
            </div>
          ) : (
            daftar.map((product) => (
            <article className="product-admin-row" key={product.code}>
              <span>
                <i>
                  <Icon name="product" />
                </i>
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.code}</small>
                </span>
              </span>
              <div className="product-admin-details">
                <span className="product-seller-detail">
                  <small>Pemasok</small>
                  <strong>{product.seller || "-"}</strong>
                </span>
                <span className="product-stock-detail">
                  <small>Stok</small>
                  <strong className={product.stock <= STOK_MENIPIS ? "stock-low" : ""}>
                    {product.stock} unit
                  </strong>
                </span>
                <span className="product-scheme-detail">
                  <span className="product-share-values">
                    <span>
                      <small>Kapster</small>
                      <strong>
                        {product.scheme === "Persentase"
                          ? `${product.shares.barber}%`
                          : rupiah(product.nominalShares.barber)}
                      </strong>
                    </span>
                    <span>
                      <small>Pemasok</small>
                      <strong>
                        {product.scheme === "Persentase"
                          ? `${product.shares.seller}%`
                          : rupiah(product.nominalShares.seller)}
                      </strong>
                    </span>
                    <span>
                      <small>Eastville</small>
                      <strong>
                        {product.scheme === "Persentase"
                          ? `${product.shares.eastville}%`
                          : rupiah(product.nominalShares.eastville)}
                      </strong>
                    </span>
                  </span>
                </span>
              </div>
              <i
                className={`chip ${
                  product.status === "Aktif" ? "lunas" : "batal"
                }`}
              >
                {product.status === "Aktif" ? "Aktif" : "Non-aktif"}
              </i>
              <div className="catalog-row-actions">
                <Button
                  className="secondary-button"
                  onClick={() => openEdit(product)}
                >
                  <Icon name="pencil" /> Ubah
                </Button>
                <Button
                  className="danger-button"
                  onClick={() => setDeletingProduct(product)}
                >
                  <Icon name="trash" /> Hapus
                </Button>
              </div>
            </article>
            ))
          )}
          </div>
      </section>
      {formOpen && (
        <div className="modal-overlay">
          <form className="product-modal" onSubmit={handleSave}>
            <header>
              <div>
                <p className="eyebrow">Pengaturan produk</p>
                <h2>
                  {editingCode
                    ? "Ubah Data Produk & Komisi"
                    : "Tambah Produk Baru"}
                </h2>
              </div>
              <Button type="button" aria-label="Tutup" onClick={() => setFormOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <div className="product-modal-body">
              <div className="form-grid">
                <label>
                  <span>Nama produk</span>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Contoh: Free Style Dust"
                  />
                </label>
                <label>
                  <span>Kode produk</span>
                  <input
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="Contoh: HP-FSD-01"
                  />
                </label>
                <label>
                  <span>Nama pemasok (opsional)</span>
                  <input
                    value={formData.seller}
                    onChange={(e) =>
                      setFormData({ ...formData, seller: e.target.value })
                    }
                    placeholder="Contoh: HAIRPRO Official"
                  />
                </label>
                <label>
                  <span>Harga jual</span>
                  <input
                    min={1}
                    required
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>Harga modal</span>
                  <input
                    min={0}
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        costPrice: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>Stok produk</span>
                  <input
                    disabled={Boolean(editingCode) && live}
                    min={0}
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <div
                  className="toggle-row product-status-toggle"
                  style={{ cursor: "pointer" }}
                  onClick={() => setFormData({
                    ...formData,
                    status: formData.status === "Aktif" ? "Nonaktif" : "Aktif",
                  })}
                >
                  <span>
                    <strong>Status produk: {formData.status}</strong>
                    <small>Produk aktif muncul pada halaman Kasir.</small>
                  </span>
                  <i className={`toggle ${formData.status === "Aktif" ? "on" : ""}`}>
                    <b />
                  </i>
                </div>
              </div>

              <div className="scheme-panel">
                <span className="form-label">Skema komisi</span>
                <div className="commission-radio-group">
                  <label
                    className={`commission-radio-card ${
                      formData.scheme === "Persentase" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="commissionScheme"
                      checked={formData.scheme === "Persentase"}
                      onChange={() =>
                        setFormData({ ...formData, scheme: "Persentase" })
                      }
                    />
                    <span className="radio-circle" />
                    <div>
                      <strong>Persentase</strong>
                      <small>
                        Bagi hasil proporsional dari omzet penjualan
                      </small>
                    </div>
                  </label>
                  <label
                    className={`commission-radio-card ${
                      formData.scheme === "Nominal tetap" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="commissionScheme"
                      checked={formData.scheme === "Nominal tetap"}
                      onChange={() =>
                        setFormData({ ...formData, scheme: "Nominal tetap" })
                      }
                    />
                    <span className="radio-circle" />
                    <div>
                      <strong>Nominal Tetap</strong>
                      <small>Nilai tetap per unit produk terjual</small>
                    </div>
                  </label>
                </div>

                {formData.scheme === "Persentase" ? (
                  <>
                    <div className="share-inputs">
                      <label>
                        <span>Bagian Kapster</span>
                        <div className="input-shell">
                          <input
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shares: {
                                  ...formData.shares,
                                  barber: Number(e.target.value),
                                },
                              })
                            }
                            type="number"
                            value={formData.shares.barber}
                          />
                          <b>%</b>
                        </div>
                      </label>
                      <label>
                        <span>Bagian Pemasok</span>
                        <div className="input-shell">
                          <input
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shares: {
                                  ...formData.shares,
                                  seller: Number(e.target.value),
                                },
                              })
                            }
                            type="number"
                            value={formData.shares.seller}
                          />
                          <b>%</b>
                        </div>
                      </label>
                      <label>
                        <span>Bagian Eastville</span>
                        <div className="input-shell">
                          <input
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                shares: {
                                  ...formData.shares,
                                  eastville: Number(e.target.value),
                                },
                              })
                            }
                            type="number"
                            value={formData.shares.eastville}
                          />
                          <b>%</b>
                        </div>
                      </label>
                    </div>
                    <div
                      className={`share-bar ${
                        shareTotal === 100 ? "" : "invalid"
                      }`}
                    >
                      <i style={{ width: `${formData.shares.barber}%` }} />
                      <b style={{ width: `${formData.shares.seller}%` }} />
                      <em style={{ width: `${formData.shares.eastville}%` }} />
                    </div>
                    <span
                      className={
                        shareTotal === 100 ? "valid-text" : "error-text"
                      }
                    >
                      {shareTotal === 100
                        ? "Total 100% OK"
                        : `Total ${shareTotal}% · harus 100%`}
                    </span>
                    <div className="commission-preview">
                      Contoh jual 1 unit {rupiah(formData.price)} → Kapster:{" "}
                      {rupiah(
                        Math.round(
                          (formData.price * formData.shares.barber) / 100,
                        ),
                      )}{" "}
                      · Seller:{" "}
                      {rupiah(
                        Math.round(
                          (formData.price * formData.shares.seller) / 100,
                        ),
                      )}{" "}
                      · Eastville:{" "}
                      {rupiah(
                        Math.round(
                          (formData.price * formData.shares.eastville) / 100,
                        ),
                      )}
                    </div>
                  </>
                ) : (
                  <div className="nominal-scheme">
                    <label>
                      <span>Bagian Kapster</span>
                      <input
                        type="number"
                        placeholder="Rp per unit"
                        value={formData.nominalShares.barber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nominalShares: {
                              ...formData.nominalShares,
                              barber: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Bagian Pemasok</span>
                      <input
                        type="number"
                        placeholder="Rp per unit"
                        value={formData.nominalShares.seller}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nominalShares: {
                              ...formData.nominalShares,
                              seller: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Bagian Eastville</span>
                      <input
                        type="number"
                        placeholder="Rp per unit"
                        value={formData.nominalShares.eastville}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nominalShares: {
                              ...formData.nominalShares,
                              eastville: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <div className="nominal-summary-note">
                      Total pembagian:{" "}
                      {rupiah(
                        formData.nominalShares.barber +
                          formData.nominalShares.seller +
                          formData.nominalShares.eastville,
                      )}{" "}
                      (Harga jual: {rupiah(formData.price)})
                    </div>
                    <div className="commission-preview">
                      Contoh jual 1 unit {rupiah(formData.price)} → Kapster:{" "}
                      {rupiah(formData.nominalShares.barber)} · Seller:{" "}
                      {rupiah(formData.nominalShares.seller)} · Eastville:{" "}
                      {rupiah(formData.nominalShares.eastville)}
                    </div>
                  </div>
                )}
              </div>
              <label>
                <span>
                  Alasan Perubahan Komisi{editingCode && live ? " (wajib)" : ""}
                </span>
                <textarea
                  required={Boolean(editingCode) && live}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Tuliskan alasan penyesuaian komisi untuk jejak audit log..."
                />
              </label>
            </div>
            {formError && (
              <div className="info-banner" role="alert">
                <Icon name="alert" />
                {formError}
              </div>
            )}
            <footer>
              <Button
                className="primary-button"
                disabled={
                  saving ||
                  (formData.scheme === "Persentase" && shareTotal !== 100)
                }
                type="submit"
              >
                {saving ? "Menyimpan..." : "Simpan produk"}
              </Button>
            </footer>
          </form>
        </div>
      )}
      {stockOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal stock-modal"
            onSubmit={async (event) => {
              event.preventDefault()
              if (saving) return
              setStockError("")
              const qty = Math.trunc(Number(stockQty))
              const code = stockCode || productsList[0]?.code
              if (!code) return setStockError("Pilih produk dulu.")
              if (!qty || qty < 1)
                return setStockError("Jumlah masuk harus lebih dari 0.")
              if (live) {
                setSaving(true)
                try {
                  await apiProduk.adjustStok(
                    code,
                    qty,
                    `Restok${stockNote ? ` · ${stockNote}` : ""}`,
                  )
                  // Stok sudah bertambah; gagal muat ulang tidak boleh terbaca sebagai gagal restok
                  await loadLive().catch(() => {})
                } catch (err) {
                  setStockError(
                    err instanceof Error ? err.message : "Gagal menambah stok.",
                  )
                  return
                } finally {
                  setSaving(false)
                }
              } else {
                setProductsList((list) =>
                  list.map((p) =>
                    p.code === code ? { ...p, stock: p.stock + qty } : p,
                  ),
                )
              }
              setStockOpen(false)
            }}
          >
            <header>
              <h2>Restok produk</h2>
              <Button type="button" aria-label="Tutup" onClick={() => setStockOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Produk</span>
              <SearchSelect
                value={stockCode || productsList[0]?.code}
                onChange={(e) => setStockCode(e.target.value)}
              >
                {productsList.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </SearchSelect>
            </label>
            <label>
              <span>Jumlah masuk</span>
              <input
                min={1}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                type="number"
              />
            </label>
            <label>
              <span>Pemasok</span>
              <input
                value={stockNote}
                onChange={(e) => setStockNote(e.target.value)}
                placeholder="Nama pemasok atau konsinyasi"
              />
            </label>
            {stockError && (
              <div className="info-banner" role="alert">
                <Icon name="alert" />
                {stockError}
              </div>
            )}
            <footer>
              <Button
                className="primary-button"
                disabled={saving}
                type="submit"
              >
                {saving ? "Menyimpan..." : "Tambah stok"}
              </Button>
            </footer>
          </form>
        </div>
      )}
      {deletingProduct && (
        <ConfirmModal
          compact
          title={`Hapus Produk "${deletingProduct.name}"?`}
          eyebrow="Hapus Produk"
          warning={`Produk (${deletingProduct.code}) tidak akan muncul lagi di Kasir. Riwayat penjualan lama tetap aman.`}
          requireReason
          reasonLabel="Alasan Penghapusan"
          reasonPlaceholder="Contoh: Stok sudah diskontinu / tidak dijual lagi..."
          confirmText="Hapus Produk"
          confirmTone="danger"
          onClose={() => setDeletingProduct(null)}
          onConfirm={(alasan) =>
            handleDeleteConfirm(deletingProduct, alasan)
          }
        />
      )}
    </div>
  )
}

export default ProductsPage
