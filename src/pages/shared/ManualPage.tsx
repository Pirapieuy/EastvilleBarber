import { TANGGAL_MULAI } from "../../utils/tanggal"
import { FormEvent, useEffect, useState } from "react"
import { apiKasir, apiKodeDiskon, apiTransaksi, getToken } from "../../api"
import { DemoNotice } from "../../components/common/DemoNotice"
import { Icon } from "../../components/common/Icon"
import { SearchSelect } from "../../components/common/SearchSelect"
import {
  Button,
  CalendarPicker,
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
  const [kodeInput, setKodeInput] = useState("")
  const [kodeError, setKodeError] = useState("")
  const [kodeChecking, setKodeChecking] = useState(false)
  const [promo, setPromo] = useState<{
    kode: string
    nama: string
    persen: number
  } | null>(null)
  const [promoList, setPromoList] = useState<
    { id: string; kode: string; nama: string; persen: number; berlakuSampai: string }[]
  >([])
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
    apiKodeDiskon
      .list()
      .then((rows) =>
        setPromoList(
          rows
            .filter((r) => r.status === "Aktif")
            .map((r) => ({
              id: r.id,
              kode: r.kode,
              nama: r.nama,
              persen: Number(r.persen),
              berlakuSampai: r.berlaku_sampai,
            })),
        ),
      )
      .catch(() => setPromoList([]))
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
  const notaOk = cleanNote.length >= 3
  const adaItem = selected.length > 0
  const pecahanCepat = Array.from(
    new Set(
      [10000, 20000, 50000, 100000]
        .map((k) => Math.ceil(total / k) * k)
        .concat([50000, 100000, 150000, 200000]),
    ),
  )
    .filter((n) => n > total)
    .sort((a, b) => a - b)
    .slice(0, 5)
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

  async function terapkanKode() {
    const kode = kodeInput.trim().toUpperCase()
    if (!kode) return
    setKodeChecking(true)
    setKodeError("")
    try {
      const lokal = promoList.find(
        (p) => p.kode.toUpperCase() === kode && p.berlakuSampai >= tanggal,
      )
      const hasil = lokal ?? (await apiKasir.cekKode(kode))
      setPromo({ kode: hasil.kode, nama: hasil.nama, persen: hasil.persen })
      setKodeInput("")
    } catch (e) {
      setKodeError(
        e instanceof Error ? e.message : "Kode tidak dapat diperiksa. Coba lagi.",
      )
    } finally {
      setKodeChecking(false)
    }
  }

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
        kodeDiskon: promo ? promo.kode : undefined,
        pinOtorisasi: !promo && diskonNum > 0 && pin ? pin : undefined,
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
      setPromo(null)
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
                    className={`secondary-button nota-add ${it.tipe === "Produk" ? "nota-add-product" : "nota-add-service"}`}
                    aria-label={`Tambah ${it.name}`}
                    onClick={() => ubahQty(it, 1)}
                  >
                    <Icon name="plus" />
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
    <form className="content narrow manual-page" onSubmit={handleSave}>
      <DemoNotice live={live} error={liveError} />

      <section className="panel form-panel">
        <h3>Data nota</h3>
        <div className="form-grid manual-info-grid">
          <label>
            <span>
              Nomor nota di buku <b className="req-mark">*</b>
            </span>
            <input
              minLength={3}
              onChange={(e) => setNote(e.target.value.toUpperCase())}
              placeholder="Contoh: BUKU-291026-01"
              required
              value={note}
            />
          </label>
          <div className="form-grid-field">
            <span>Kapster</span>
            <SearchSelect
              aria-label="Kapster"
              onChange={(e) => setKapsterId(e.target.value)}
              value={kapsterAktif}
            >
              {kapster.map((k) => (
                <option key={k.id + k.nama} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="form-grid-field manual-date-field">
            <span>Tanggal</span>
            <CalendarPicker
              max={today()}
              min={TANGGAL_MULAI}
              showToday={false}
              value={tanggal}
              onChange={setTanggal}
            />
          </div>
          <label>
            <span>Jam</span>
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

      {notaOk && (
      <section className="panel form-panel">
        <div className="section-title">
          <h3>Layanan dan produk <b className="req-mark">*</b></h3>
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
        <div className="nota-catalog-columns">
          {daftar("Layanan", "Layanan")}
          {daftar("Produk", "Produk")}
          {tampil("Layanan").length + tampil("Produk").length === 0 && (
            <p className="nota-empty">Tidak ada yang cocok dengan “{cari}”.</p>
          )}
        </div>
      </section>
      )}

      {notaOk && adaItem && (
      <div className="manual-checkout-grid">
      <section className="panel form-panel manual-discount-panel">
        <h3>Diskon</h3>
        <div className="form-grid manual-info-grid">
          {promo ? (
            <div className="discount-applied manual-discount-applied">
              <span>
                <b>{promo.kode}</b> · {promo.nama} ({promo.persen}%)
              </span>
              <Button onClick={() => setPromo(null)} title="Batalkan kode">
                <Icon name="trash" /> Hapus
              </Button>
            </div>
          ) : (
            <div className="cart-discount-panel">
              <label>
                <span>Kode diskon</span>
                <div className="input-shell">
                  <Icon name="receipt" />
                  <input
                    autoCapitalize="characters"
                    autoComplete="off"
                    onChange={(e) => {
                      setKodeInput(e.target.value.toUpperCase())
                      setKodeError("")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        void terapkanKode()
                      }
                    }}
                    placeholder="Contoh: JUMAT15"
                    value={kodeInput}
                  />
                </div>
              </label>
              <Button
                className="primary-button"
                disabled={!kodeInput.trim() || kodeChecking || subtotal <= 0}
                onClick={() => void terapkanKode()}
              >
                {kodeChecking ? "Memeriksa…" : "Terapkan"}
              </Button>
              {kodeError && (
                <small className="cart-error" role="alert">
                  {kodeError}
                </small>
              )}
            </div>
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
          {diskonNum > 0 && !promo && (
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

      <section className="panel form-panel manual-payment-panel">
        <h3>Pembayaran</h3>
        <div className="method-grid manual-method-grid">
          {(["Tunai", "QRIS", "Gabungan"] as const).map((m) => (
            <Button
              className={method === m ? "active" : ""}
              key={m}
              style={{
                minHeight: 44,
                padding: "6px 4px",
                justifyContent: "center",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => setMethod(m)}
            >
              <Icon name={m === "QRIS" ? "qris" : "cash"} />
              <strong>{m}</strong>
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
          {method === "Tunai" && total > 0 && (
            <div className="quick-cash manual-quick-cash">
              <Button
                className={cashNum === total ? "active" : ""}
                onClick={() => setCash(String(total))}
              >
                Uang pas
              </Button>
              {pecahanCepat.map((n) => (
                <Button
                  className={cashNum === n ? "active" : ""}
                  key={n}
                  onClick={() => setCash(String(n))}
                >
                  {rupiah(n)}
                </Button>
              ))}
            </div>
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
        {method === "QRIS" && (
          <p className="manual-qris-notice" role="note">
            Pastikan pembayaran QRIS berhasil sebelum menyimpan nota.
          </p>
        )}
        {method !== "QRIS" && total > 0 && paid < total && (
          <p className="manual-payment-warning" role="alert">
            Uang yang diterima belum mencukupi total pembayaran.
          </p>
        )}
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
      </div>
      )}

      <div className="sticky-submit">
        <span>
          {adaItem && notaOk ? (
            <>
              Total <b className="submit-total">{rupiah(total)}</b>
            </>
          ) : (
            !success &&
            (notaOk
              ? "Pilih minimal satu layanan atau produk."
              : "Isi nomor nota dulu untuk melanjutkan.")
          )}
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
