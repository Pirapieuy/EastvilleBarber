import { TANGGAL_MULAI } from "../../utils/tanggal"
import { FormEvent, useEffect, useState } from "react"
import { apiKasir, apiTransaksi, getToken } from "../../api"
import { getPromoDiscounts } from "../../utils/promoStorage"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import {
  Button,
  CalendarPicker,
  PageTitle,
  rupiah,
} from "../../components/common/UI"

interface ManualItem {
  tipe: "Layanan" | "Produk"
  id: string
  name: string
  price: number
}
const demoItems: ManualItem[] = [
  { tipe: "Layanan", id: "1", name: "Haircut", price: 40000 },
  { tipe: "Layanan", id: "3", name: "Shaving", price: 25000 },
  { tipe: "Layanan", id: "5", name: "Treatment", price: 60000 },
]
const demoKapster = [
  { id: "u-kapster", nama: "Budi Santoso" },
  { id: "u-kapster2", nama: "Zhefitra Ananda" },
]

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function ManualPage() {
  const [items, setItems] = useState<ManualItem[]>(demoItems)
  const [kapster, setKapster] = useState(demoKapster)
  const [live, setLive] = useState(false)
  const [liveError, setLiveError] = useState("")

  const [tanggal, setTanggal] = useState(today)
  const [jam, setJam] = useState("12:00")
  const [note, setNote] = useState("")
  const [kapsterId, setKapsterId] = useState("")
  const [qty, setQty] = useState<Record<string, number>>({})
  const [cari, setCari] = useState("")
  const [diskon, setDiskon] = useState("")
  const [promoId, setPromoId] = useState("")
  const [pin, setPin] = useState("")
  const [method, setMethod] = useState<"Tunai" | "QRIS" | "Gabungan">("Tunai")
  const [cash, setCash] = useState("")
  const [qris, setQris] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!getToken()) {
      setLiveError("belum login ke server (token tidak ada)")
      return
    }
    Promise.all([apiKasir.layanan(), apiKasir.produk(), apiKasir.kapster()])
      .then(([layanan, produk, kap]) => {
        setItems([
          ...layanan
            .filter((l) => l.status === "Aktif")
            .map(
              (l): ManualItem => ({
                tipe: "Layanan",
                id: String(l.id),
                name: l.nama,
                price: l.harga,
              }),
            ),
          ...produk
            .filter((p) => p.status === "Aktif")
            .map(
              (p): ManualItem => ({
                tipe: "Produk",
                id: p.kode,
                name: p.nama,
                price: p.harga,
              }),
            ),
        ])
        setKapster(kap)
        setLive(true)
      })
      .catch((e) => {
        console.error("Gagal memuat data rekap manual:", e)
        setLiveError(e instanceof Error ? e.message : "gagal memuat data")
      })
  }, [])

  // Tidak blocking — form langsung tampil dengan data sementara (demo/cache),
  // data server akan otomatis menggantikan saat selesai dimuat.

  const keyOf = (i: ManualItem) => `${i.tipe}:${i.id}`
  const selected = items.filter((i) => (qty[keyOf(i)] ?? 0) > 0)
  const subtotal = selected.reduce(
    (sum, i) => sum + i.price * (qty[keyOf(i)] ?? 0),
    0,
  )
  const promoAktif = getPromoDiscounts().filter(
    (p) => p.status === "Aktif" && p.berlakuSampai >= tanggal,
  )
  const promo = promoAktif.find((p) => p.id === promoId)
  const diskonNum = promo
    ? Math.round((subtotal * promo.persen) / 100)
    : Math.min(Number(diskon.replace(/\D/g, "")) || 0, subtotal)
  const total = subtotal - diskonNum
  const kapsterAktif = kapsterId || kapster[0]?.id || ""
  const cashNum = Number(cash.replace(/\D/g, "")) || 0
  const qrisNum = Number(qris.replace(/\D/g, "")) || 0
  const paid =
    method === "Tunai" ? cashNum : method === "QRIS" ? total : cashNum + qrisNum
  const cleanNote = note.trim()
  const gagalMuat = Boolean(getToken()) && !live
  const qrisBerlebih = method === "Gabungan" && qrisNum > total
  const kembalian = method === "QRIS" ? 0 : Math.max(0, paid - total)
  const canSave =
    selected.length > 0 &&
    Boolean(kapsterAktif) &&
    cleanNote.length >= 3 &&
    paid >= total &&
    total > 0 &&
    !qrisBerlebih &&
    !gagalMuat &&
    !saving

  const kataKunci = cari.trim().toLowerCase()
  const tampil = (tipe: ManualItem["tipe"]) =>
    items.filter(
      (i) => i.tipe === tipe && i.name.toLowerCase().includes(kataKunci),
    )

  function ubahQty(item: ManualItem, delta: number) {
    setQty((prev) => {
      const next = Math.max(0, (prev[keyOf(item)] ?? 0) + delta)
      return { ...prev, [keyOf(item)]: next }
    })
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    if (!live) {
      setSuccess("Mode demo: nota tidak disimpan ke server.")
      return
    }
    if (
      !window.confirm(
        `Simpan nota ${cleanNote} senilai ${rupiah(total)}? Stok produk akan dipotong.`,
      )
    )
      return
    setSaving(true)
    try {
      const res = await apiTransaksi.manual({
        tanggal,
        jam,
        nomorNota: cleanNote,
        metode: method,
        diskon: diskonNum,
        bayarTunai: method === "QRIS" ? 0 : cashNum,
        bayarQris: method === "Tunai" ? 0 : qrisNum,
        pinOtorisasi: diskonNum > 0 && pin ? pin : undefined,
        items: selected.map((i) => ({
          tipe: i.tipe,
          refId: i.tipe === "Layanan" ? Number(i.id) : i.id,
          qty: qty[keyOf(i)],
          kapsterId: kapsterAktif,
        })),
      })
      setSuccess(
        `Tersimpan sebagai ${res.id} (${rupiah(res.total)})${
          res.lembur ? ", dihitung LEMBUR (komisi 50%)" : ""
        }. Nota ini bertanda MANUAL di Riwayat.`,
      )
      setQty({})
      setDiskon("")
      setPromoId("")
      setPin("")
      setNote("")
      setCash("")
      setQris("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.")
    } finally {
      setSaving(false)
    }
  }

  const daftar = (tipe: ManualItem["tipe"], judul: string) => {
    const rows = tampil(tipe)
    if (rows.length === 0) return null
    return (
      <div className="nota-group">
        <h4>{judul}</h4>
        <div className="nota-items">
          {rows.map((it) => {
            const n = qty[keyOf(it)] ?? 0
            return (
              <div className={`nota-item ${n > 0 ? "active" : ""}`} key={keyOf(it)}>
                <div className="nota-item-info">
                  <strong>{it.name}</strong>
                  <span>{rupiah(it.price)}</span>
                </div>
                {n === 0 ? (
                  <Button
                    className="secondary-button nota-add"
                    onClick={() => ubahQty(it, 1)}
                  >
                    <Icon name="plus" /> Tambah
                  </Button>
                ) : (
                  <div className="nota-stepper">
                    <button
                      aria-label={`Kurangi ${it.name}`}
                      onClick={() => ubahQty(it, -1)}
                      type="button"
                    >
                      −
                    </button>
                    <output aria-live="polite">{n}</output>
                    <button
                      aria-label={`Tambah ${it.name}`}
                      onClick={() => ubahQty(it, 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <form className="content narrow" onSubmit={handleSave}>
      <DemoNotice live={live} error={liveError} />
      <PageTitle
        eyebrow="Transaksi dari buku fisik"
        title="Input Nota Kertas"
      />

      <section className="panel form-panel">
        <h3>1. Data nota</h3>
        <div className="form-grid manual-info-grid">
          <label>
            <span>Nomor nota di buku</span>
            <input
              minLength={3}
              onChange={(e) => setNote(e.target.value.toUpperCase())}
              placeholder="Contoh: BUKU-291026-01"
              required
              value={note}
            />
          </label>
          <label>
            <span>Kapster</span>
            <select
              onChange={(e) => setKapsterId(e.target.value)}
              value={kapsterAktif}
            >
              {kapster.map((k) => (
                <option key={k.id + k.nama} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Tanggal</span>
            <CalendarPicker
              max={today()}
              min={TANGGAL_MULAI}
              value={tanggal}
              onChange={setTanggal}
            />
          </label>
          <label>
            <span>Jam (perkiraan)</span>
            <input
              onChange={(e) => setJam(e.target.value)}
              required
              type="time"
              value={jam}
            />
            <small>Di luar jam kerja dihitung lembur.</small>
          </label>
        </div>
      </section>

      <section className="panel form-panel">
        <div className="section-title">
          <h3>2. Layanan dan produk</h3>
          <span className="nota-count">
            {selected.length > 0 ? `${selected.length} dipilih` : "Belum ada"}
          </span>
        </div>
        <div className="search nota-search">
          <Icon name="search" />
          <input
            aria-label="Cari layanan atau produk"
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari layanan atau produk…"
            value={cari}
          />
        </div>
        {daftar("Layanan", "Layanan")}
        {daftar("Produk", "Produk")}
        {tampil("Layanan").length + tampil("Produk").length === 0 && (
          <p className="nota-empty">Tidak ada yang cocok dengan “{cari}”.</p>
        )}
      </section>

      <section className="panel form-panel">
        <h3>3. Diskon</h3>
        <div className="form-grid manual-info-grid">
          {promoAktif.length > 0 && (
            <label>
              <span>Diskon event (opsional)</span>
              <select
                onChange={(e) => setPromoId(e.target.value)}
                value={promoId}
              >
                <option value="">Tanpa diskon event</option>
                {promoAktif.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({p.persen}%)
                  </option>
                ))}
              </select>
            </label>
          )}
          {!promo && (
            <label>
              <span>Potongan manual (opsional)</span>
              <div className="input-shell">
                <b>Rp</b>
                <input
                  inputMode="numeric"
                  onChange={(e) => setDiskon(e.target.value)}
                  placeholder="0"
                  value={diskon}
                />
              </div>
            </label>
          )}
          {diskonNum > 0 && (
            <label>
              <span>PIN Owner atau Manajer</span>
              <input
                autoComplete="off"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="6 digit"
                type="password"
                value={pin}
              />
              <small>Wajib bila kasir yang menyimpan nota.</small>
            </label>
          )}
        </div>
      </section>

      <section className="panel form-panel">
        <h3>4. Pembayaran</h3>
        <div className="segmented nota-method">
          {(["Tunai", "QRIS", "Gabungan"] as const).map((m) => (
            <Button
              className={method === m ? "active" : ""}
              key={m}
              onClick={() => setMethod(m)}
            >
              {m}
            </Button>
          ))}
        </div>
        <div className="form-grid manual-info-grid">
          {method !== "QRIS" && (
            <label>
              <span>{method === "Gabungan" ? "Dibayar tunai" : "Uang diterima"}</span>
              <div className="input-shell">
                <b>Rp</b>
                <input
                  inputMode="numeric"
                  onChange={(e) => setCash(e.target.value)}
                  placeholder={method === "Gabungan" ? "0" : String(total)}
                  value={cash}
                />
              </div>
            </label>
          )}
          {method === "Gabungan" && (
            <label>
              <span>Dibayar QRIS</span>
              <div className="input-shell">
                <b>Rp</b>
                <input
                  inputMode="numeric"
                  onChange={(e) => setQris(e.target.value)}
                  placeholder="0"
                  value={qris}
                />
              </div>
            </label>
          )}
        </div>
        <dl className="nota-summary">
          <div>
            <dt>Subtotal</dt>
            <dd>{rupiah(subtotal)}</dd>
          </div>
          {diskonNum > 0 && (
            <div>
              <dt>Diskon</dt>
              <dd>− {rupiah(diskonNum)}</dd>
            </div>
          )}
          <div className="nota-summary-total">
            <dt>Total</dt>
            <dd>{rupiah(total)}</dd>
          </div>
          {method !== "QRIS" && cashNum > 0 && total > 0 && (
            <div>
              <dt>Kembalian</dt>
              <dd>{rupiah(kembalian)}</dd>
            </div>
          )}
        </dl>
        {qrisBerlebih && (
          <p className="absensi-error" role="alert">
            Nominal QRIS melebihi total nota.
          </p>
        )}
      </section>

      <div className="sticky-submit">
        <span>
          <b>MANUAL</b> Nota ini ditandai di Riwayat dan laporan.
          {error && <small className="error-text"> {error}</small>}
          {success && <small> {success}</small>}
        </span>
        <Button className="primary-button" disabled={!canSave} type="submit">
          {saving ? "Menyimpan…" : "Simpan Nota"}
        </Button>
      </div>
    </form>
  )
}

export default ManualPage
