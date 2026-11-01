import { FormEvent, useEffect, useState } from "react"
import { DemoNotice } from "../../components/common/DemoNotice"
import { ProdukRow, apiProduk, getToken } from "../../api"
import { Icon } from "../../components/common/Icon"
import { Button, PageTitle, rupiah } from "../../components/common/UI"

export function ProductsPage() {
  const [tab, setTab] = useState<"Daftar" | "Riwayat perubahan">("Daftar")
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
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [stockOpen, setStockOpen] = useState(false)
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

  // Dengan token login, data dari backend; tanpa token tetap data demo.
  function loadLive() {
    return Promise.all([apiProduk.list(), apiProduk.log()]).then(([rows, logs]) => {
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
          shares: { barber: p.persen_kapster, seller: p.persen_penjual, eastville: p.persen_eastville },
          nominalShares: { barber: p.nominal_kapster, seller: p.nominal_penjual, eastville: p.nominal_eastville },
        })),
      )
      setChangeLogs(
        (logs as { waktu: string; produk: string; perubahan: string; oleh: string; alasan: string }[]).map((l) => ({
          time: new Date(l.waktu).toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          product: l.produk,
          change: l.perubahan,
          by: l.oleh,
          reason: l.alasan,
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
    loadLive().catch((e) => {
      console.error("Gagal memuat produk:", e)
      setLiveError(e instanceof Error ? e.message : "gagal memuat data")
    })
  }, [])
  const [changeLogs, setChangeLogs] = useState([
    {
      time: "29 Okt 10.15",
      product: "Free Style Dust",
      change: "Komisi capster 8% → 10%",
      by: "Ardi Pradana · Owner",
      reason: "Penyesuaian kesepakatan komisi baru",
    },
    {
      time: "28 Okt 16.40",
      product: "Water Based Pomade",
      change: "Status Non-aktif → Aktif",
      by: "Dian Setiawan · Manajer",
      reason: "Stok baru diterima dari pemasok",
    },
    {
      time: "27 Okt 09.22",
      product: "Miracle Treatment",
      change: "Bagian Pemasok Rp 35rb → Rp 40rb",
      by: "Ardi Pradana · Owner",
      reason: "Penyesuaian harga pemasok",
    },
  ])

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
    setFormOpen(true)
  }

  function openEdit(prod: (typeof productsList)[number]) {
    setEditingCode(prod.code)
    setFormData({ ...prod })
    setChangeReason("")
    setFormOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.code || !formData.seller) return
    if (live) {
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
        )
        await loadLive()
        setFormOpen(false)
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Gagal menyimpan.")
      }
      return
    }
    if (editingCode) {
      setProductsList((list) =>
        list.map((p) => (p.code === editingCode ? { ...formData } : p)),
      )
      if (changeReason) {
        setChangeLogs((logs) => [
          {
            time: "Baru saja",
            product: formData.name,
            change: `Update skema ${formData.scheme} · ${formData.status}`,
            by: "Owner atau Manajer",
            reason: changeReason,
          },
          ...logs,
        ])
      }
    } else {
      setProductsList((list) => [{ ...formData }, ...list])
      setChangeLogs((logs) => [
        {
          time: "Baru saja",
          product: formData.name,
          change: `Produk baru · ${formData.scheme}, ${formData.status}`,
          by: "Owner atau Manajer",
          reason: changeReason || "Penambahan produk baru",
        },
        ...logs,
      ])
    }
    setFormOpen(false)
  }

  // Ada token = data asli sedang dimuat: jangan tampilkan data dummy dulu.
  const loading = Boolean(getToken()) && !live && !liveError
  if (loading) {
    return (
      <div className="content">
        <p>Memuat produk...</p>
      </div>
    )
  }

  return (
    <div className="content">
      <DemoNotice live={live} error={liveError} />
      <PageTitle
        eyebrow="Data master & komisi"
        title="Produk"
        action={
          <div className="page-actions">
            <Button
              className="secondary-button"
              onClick={() => setStockOpen(true)}
            >
              <Icon name="plus" /> Pembelian stok
            </Button>
            <Button className="primary-button" onClick={openCreate}>
              <Icon name="plus" /> Tambah produk
            </Button>
          </div>
        }
      />
      <div className="segmented page-segment">
        <Button
          className={tab === "Daftar" ? "active" : ""}
          onClick={() => setTab("Daftar")}
        >
          Daftar produk
        </Button>
        <Button
          className={tab === "Riwayat perubahan" ? "active" : ""}
          onClick={() => setTab("Riwayat perubahan")}
        >
          <span>Riwayat perubahan komisi</span>
          <span className="tab-count-badge">{changeLogs.length}</span>
        </Button>
      </div>
      {tab === "Daftar" ? (
        <section className="panel product-admin-list">
          <div className="filters">
            <div className="search">
              <Icon name="search" />
              <input placeholder="Cari nama atau kode..." />
            </div>
            <select>
              <option>Semua status</option>
              <option>Aktif</option>
              <option>Non-aktif</option>
            </select>
          </div>
          <div className="product-admin-head">
            <span>Produk</span>
            <span>Pemasok</span>
            <span>Stok</span>
            <span>Skema komisi</span>
            <span>Status</span>
            <span>Aksi</span>
          </div>
          {productsList.map((product) => (
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
              <span>{product.seller}</span>
              <span className={product.stock <= 3 ? "stock-low" : ""}>
                {product.stock} unit
              </span>
              <span className="scheme-tag">
                {product.scheme === "Persentase"
                  ? `Persen (${product.shares.barber}% · ${product.shares.seller}% · ${product.shares.eastville}%)`
                  : `Nominal (C:${rupiah(product.nominalShares.barber)} · S:${rupiah(product.nominalShares.seller)} · E:${rupiah(product.nominalShares.eastville)})`}
              </span>
              <i
                className={`chip ${
                  product.status === "Aktif" ? "lunas" : "batal"
                }`}
              >
                {product.status === "Aktif" ? "Aktif" : "Non-aktif"}
              </i>
              <Button
                className="secondary-button"
                onClick={() => openEdit(product)}
              >
                Ubah
              </Button>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel change-log">
          <div className="change-log-head">
            <span>Waktu</span>
            <span>Produk</span>
            <span>Perubahan</span>
            <span>Oleh</span>
            <span>Alasan</span>
          </div>
          {changeLogs.map((row, idx) => (
            <article key={idx}>
              <span>{row.time}</span>
              <strong>{row.product}</strong>
              <span>{row.change}</span>
              <span>{row.by}</span>
              <small>{row.reason}</small>
            </article>
          ))}
        </section>
      )}
      {formOpen && (
        <div className="modal-overlay">
          <form className="product-modal" onSubmit={handleSave}>
            <header>
              <div>
                <p className="eyebrow">Pengaturan produk</p>
                <h2>
                  {editingCode
                    ? "Edit Data Produk & Komisi"
                    : "Tambah Produk Baru"}
                </h2>
              </div>
              <Button onClick={() => setFormOpen(false)}>
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
                  <small className="valid-text">Kode unik produk</small>
                </label>
                <label>
                  <span>Nama Pemasok</span>
                  <input
                    required
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
                <div className="status-toggle-field">
                  <span>Status produk</span>
                  <div className="status-toggle-switch">
                    <button
                      type="button"
                      className={`status-btn ${formData.status === "Aktif" ? "active" : ""}`}
                      onClick={() =>
                        setFormData({ ...formData, status: "Aktif" })
                      }
                    >
                      <i className="status-dot green" /> Aktif
                    </button>
                    <button
                      type="button"
                      className={`status-btn ${formData.status === "Nonaktif" ? "inactive" : ""}`}
                      onClick={() =>
                        setFormData({ ...formData, status: "Nonaktif" })
                      }
                    >
                      <i className="status-dot gray" /> Non-aktif
                    </button>
                  </div>
                </div>
              </div>

              <div className="scheme-panel">
                <span className="form-label">Skema komisi</span>
                <div className="commission-radio-group">
                  <label
                    className={`commission-radio-card ${formData.scheme === "Persentase" ? "selected" : ""}`}
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
                    className={`commission-radio-card ${formData.scheme === "Nominal tetap" ? "selected" : ""}`}
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
                      <small>
                        Nilai tetap per unit produk terjual
                      </small>
                    </div>
                  </label>
                </div>

                {formData.scheme === "Persentase" ? (
                  <>
                    <div className="share-inputs">
                      <label>
                        <span>Bagian Capster</span>
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
                      Contoh jual 1 unit {rupiah(formData.price)} → Capster:{" "}
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
                      <span>Bagian Capster</span>
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
                      Contoh jual 1 unit {rupiah(formData.price)} → Capster:{" "}
                      {rupiah(formData.nominalShares.barber)} · Seller:{" "}
                      {rupiah(formData.nominalShares.seller)} · Eastville:{" "}
                      {rupiah(formData.nominalShares.eastville)}
                    </div>
                  </div>
                )}
              </div>
              <label>
                <span>Alasan Perubahan Komisi</span>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Tuliskan alasan penyesuaian komisi untuk jejak audit log..."
                />
              </label>
            </div>
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setFormOpen(false)}
                type="button"
              >
                Batal
              </Button>
              <Button
                className="primary-button"
                disabled={
                  formData.scheme === "Persentase" && shareTotal !== 100
                }
                type="submit"
              >
                Simpan produk
              </Button>
            </footer>
          </form>
        </div>
      )}
      {stockOpen && (
        <div className="modal-overlay">
          <form
            className="simple-modal"
            onSubmit={async (event) => {
              event.preventDefault()
              if (live) {
                const code = stockCode || productsList[0]?.code
                try {
                  await apiProduk.adjustStok(
                    code,
                    Number(stockQty),
                    `Pembelian stok${stockNote ? ` · ${stockNote}` : ""}`,
                  )
                  await loadLive()
                } catch (err) {
                  window.alert(err instanceof Error ? err.message : "Gagal menambah stok.")
                  return
                }
              }
              setStockOpen(false)
            }}
          >
            <header>
              <h2>Catat pembelian stok</h2>
              <Button onClick={() => setStockOpen(false)}>
                <Icon name="close" />
              </Button>
            </header>
            <label>
              <span>Produk</span>
              <select
                value={stockCode || productsList[0]?.code}
                onChange={(e) => setStockCode(e.target.value)}
              >
                {productsList.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Jumlah masuk</span>
              <input
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
            <footer>
              <Button
                className="secondary-button"
                onClick={() => setStockOpen(false)}
              >
                Batal
              </Button>
              <Button className="primary-button" type="submit">
                Tambah stok
              </Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  )
}

export default ProductsPage
